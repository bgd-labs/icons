#!/usr/bin/env tsx

import { readFileSync, existsSync } from 'fs'
import { resolve, basename, dirname } from 'path'
import { availableParallelism } from 'node:os'
import { Worker } from 'node:worker_threads'
import { fileURLToPath } from 'node:url'
import {
  buildIdentityIndexes,
  normalizeAlias,
} from '../packages/core/src/internal/identity'
import {
  ASSETS_DIR,
  assetSvgPaths,
  listAssetJsonFiles,
  listAssetSvgFiles,
  listFrameDirs,
  loadMetaCatalogue,
  toIdentityAssets,
} from './lib/catalogue'
import type { AssetDirName, MetaCatalogue } from './lib/catalogue'
import {
  assetSvgPrefix,
  setupSvgEnv,
  validateSvgFile,
  type SvgFileTask,
  type ValidationError,
  type ValidationWarning,
} from './lib/validate-svg'

const CHECK_MODE = process.argv.includes('--check')
const MUTATE = !CHECK_MODE

// Below this many SVG files, run the per-file pipeline inline on the main
// thread: at seed scale worker startup costs more than it saves, and the
// single-threaded path is simpler to debug. Above it, shard across a
// worker_threads pool — the per-file work (jsdom parse, DOMPurify, SVGO) is
// CPU-bound and dominates at thousands of assets. The current seed is 12
// assets = 32 SVG files (24 asset + 8 frame); 64 keeps the seed inline with
// generous headroom before the pool ever spins up.
const POOL_THRESHOLD = 64
const POOL_SIZE = Math.max(1, Math.min(availableParallelism() - 1, 8))

const errors: ValidationError[] = []
const warnings: ValidationWarning[] = []

function addError(file: string, message: string, autoFixed = false) {
  errors.push({ file, message, autoFixed })
}

function addWarning(file: string, message: string) {
  warnings.push({ file, message })
}

// Every per-SVG file task collected during the structural pass, fed to the
// inline path or the worker pool at the end. The CPU-bound work lives in
// scripts/lib/validate-svg.ts (shared with the worker entry).
const svgTasks: SvgFileTask[] = []

// --- Metadata Checks (cheap, main-thread) ---

const HEX_COLOR_RE = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
const VALID_ASSET_ID = /^[a-z0-9]+$/

// At bulk-PR scale, metadata typos are guaranteed — "bundel": true silently
// making an icon lazy must be an error, not a mystery.
const COMMON_KEYS = ['name', 'brandColor', 'bundle', 'aliases', 'crossType']
const KNOWN_KEYS: Record<AssetDirName, Set<string>> = {
  tokens: new Set([...COMMON_KEYS, 'symbol']),
  chains: new Set([...COMMON_KEYS, 'chainId']),
  brands: new Set(COMMON_KEYS),
}

function checkUnknownKeys(
  raw: Record<string, unknown>,
  jsonPath: string,
  type: AssetDirName,
) {
  for (const key of Object.keys(raw)) {
    if (!KNOWN_KEYS[type].has(key)) {
      addError(
        jsonPath,
        `Unknown metadata field "${key}" (known fields for ${type}: ${[...KNOWN_KEYS[type]].join(', ')})`,
      )
    }
  }
}

function validateCommonFields(
  raw: Record<string, unknown>,
  jsonPath: string,
  // Chains may author numeric aliases (e.g. testnet chain ids that should
  // resolve to the mainnet icon). They are coerced to strings at load time
  // (see catalogue.ts) so the downstream alias table stays string-keyed.
  allowNumericAliases = false,
) {
  if (raw.aliases !== undefined) {
    if (!Array.isArray(raw.aliases)) {
      addError(jsonPath, '"aliases" must be an array')
    } else {
      for (let i = 0; i < raw.aliases.length; i++) {
        const alias = raw.aliases[i]
        const isString = typeof alias === 'string'
        const isNumber = typeof alias === 'number'
        if (!isString && !(allowNumericAliases && isNumber)) {
          addError(
            jsonPath,
            `aliases[${i}] must be a ${allowNumericAliases ? 'string or number' : 'string'}, got ${typeof alias}`,
          )
          continue
        }
        if (isNumber && (!Number.isInteger(alias) || alias <= 0)) {
          addError(
            jsonPath,
            `aliases[${i}] numeric alias "${alias}" must be a positive integer`,
          )
          continue
        }
        const normalized = normalizeAlias(alias)
        if (normalized === '') {
          addError(
            jsonPath,
            `aliases[${i}] "${alias}" normalises to an empty string — it would never resolve`,
          )
        } else if (isString && /[^\x20-\x7E]/.test(alias)) {
          addWarning(
            jsonPath,
            `aliases[${i}] "${alias}" contains non-ASCII characters that normalise away — it registers as "${normalized}", check that key is intended`,
          )
        }
      }
    }
  }
  if (raw.bundle !== undefined && typeof raw.bundle !== 'boolean') {
    addError(jsonPath, `"bundle" must be a boolean, got ${typeof raw.bundle}`)
  }
  if (raw.crossType !== undefined && typeof raw.crossType !== 'boolean') {
    addError(
      jsonPath,
      `"crossType" must be a boolean, got ${typeof raw.crossType}`,
    )
  }
}

function validateTokenMeta(jsonPath: string) {
  const raw = JSON.parse(readFileSync(jsonPath, 'utf-8'))
  if (!raw.symbol || typeof raw.symbol !== 'string') {
    addError(jsonPath, 'Missing required field "symbol"')
  }
  if (!raw.name || typeof raw.name !== 'string') {
    addError(jsonPath, 'Missing required field "name"')
  }
  if (raw.brandColor && !HEX_COLOR_RE.test(raw.brandColor)) {
    addError(jsonPath, `Invalid brandColor "${raw.brandColor}"`)
  }
  validateCommonFields(raw, jsonPath)
  checkUnknownKeys(raw, jsonPath, 'tokens')
}

function validateChainMeta(jsonPath: string) {
  const raw = JSON.parse(readFileSync(jsonPath, 'utf-8'))
  if (!raw.name || typeof raw.name !== 'string') {
    addError(jsonPath, 'Missing required field "name"')
  }
  if (
    raw.chainId !== undefined &&
    (typeof raw.chainId !== 'number' || raw.chainId <= 0)
  ) {
    addError(jsonPath, `Invalid chainId "${raw.chainId}"`)
  }
  if (raw.brandColor && !HEX_COLOR_RE.test(raw.brandColor)) {
    addError(jsonPath, `Invalid brandColor "${raw.brandColor}"`)
  }
  validateCommonFields(raw, jsonPath, true)
  checkUnknownKeys(raw, jsonPath, 'chains')
}

function validateBrandMeta(jsonPath: string) {
  const raw = JSON.parse(readFileSync(jsonPath, 'utf-8'))
  if (!raw.name || typeof raw.name !== 'string') {
    addError(jsonPath, 'Missing required field "name"')
  }
  if (raw.brandColor && !HEX_COLOR_RE.test(raw.brandColor)) {
    addError(jsonPath, `Invalid brandColor "${raw.brandColor}"`)
  }
  validateCommonFields(raw, jsonPath)
  checkUnknownKeys(raw, jsonPath, 'brands')
}

// --- Directory Validation (structural; queues SVG tasks) ---

// Matches both asset monos ({id}_mono.svg) and frame monos (frames/*/mono.svg).
const MONO_FILE_RE = /(?:_|\/)mono\.svg$/

function validateAssetDir(
  name: AssetDirName,
  metaValidator: (jsonPath: string) => void,
) {
  const jsonPaths = listAssetJsonFiles(name)
  const svgPaths = listAssetSvgFiles(name)

  for (const jsonPath of jsonPaths) {
    const assetName = basename(jsonPath, '.json')
    const { full: fullSvgPath, mono: monoSvgPath } = assetSvgPaths(jsonPath)

    // Validate asset ID format
    if (!VALID_ASSET_ID.test(assetName)) {
      addError(
        jsonPath,
        `Invalid asset ID "${assetName}": must match ${VALID_ASSET_ID} (lowercase alphanumeric)`,
      )
    }

    // Check file pairs
    if (!existsSync(fullSvgPath)) {
      addError(jsonPath, `Missing full SVG: ${assetName}_full.svg`)
    }
    if (!existsSync(monoSvgPath)) {
      addError(jsonPath, `Missing mono SVG: ${assetName}_mono.svg`)
    }

    // Validate metadata
    try {
      metaValidator(jsonPath)
    } catch (e: unknown) {
      addError(
        jsonPath,
        `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
      )
    }
  }

  // Check for orphan SVGs (SVGs without metadata)
  for (const svgPath of svgPaths) {
    const assetName = basename(svgPath).replace(/_(?:full|mono)\.svg$/, '')
    const jsonPath = resolve(dirname(svgPath), `${assetName}.json`)
    if (!existsSync(jsonPath)) {
      addWarning(svgPath, `SVG has no metadata file: ${assetName}.json`)
    }
  }

  // Queue per-SVG content validation (the CPU-bound work) for later.
  for (const svgPath of svgPaths) {
    svgTasks.push({
      svgPath,
      prefix: assetSvgPrefix(svgPath),
      isMono: MONO_FILE_RE.test(svgPath),
    })
  }
}

function validateFrameMeta(frameDir: string, dir: string): string[] {
  const metaPath = resolve(dir, 'meta.json')
  if (!existsSync(metaPath)) return [frameDir]

  let raw: Record<string, unknown>
  try {
    raw = JSON.parse(readFileSync(metaPath, 'utf-8'))
  } catch (e: unknown) {
    addError(
      metaPath,
      `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
    )
    return [frameDir]
  }

  for (const key of Object.keys(raw)) {
    if (key !== 'prefixes') {
      addError(
        metaPath,
        `Unknown frame metadata field "${key}" (known: prefixes)`,
      )
    }
  }
  if (raw.prefixes === undefined) return [frameDir]
  if (
    !Array.isArray(raw.prefixes) ||
    raw.prefixes.some((p) => typeof p !== 'string' || p === '')
  ) {
    addError(metaPath, '"prefixes" must be an array of non-empty strings')
    return [frameDir]
  }
  return raw.prefixes as string[]
}

function validateFrames() {
  const prefixOwners = new Map<string, string>()

  for (const { id: frameDir, dir } of listFrameDirs()) {
    const fullSvg = resolve(dir, 'full.svg')
    const monoSvg = resolve(dir, 'mono.svg')

    if (!existsSync(fullSvg)) {
      addError(dir, `Missing full.svg for frame "${frameDir}"`)
    }
    if (!existsSync(monoSvg)) {
      addError(dir, `Missing mono.svg for frame "${frameDir}"`)
    }

    // meta.json is optional but must be valid when present; prefixes must
    // be unique across frames (the lookup is a flat map).
    for (const prefix of validateFrameMeta(frameDir, dir)) {
      const owner = prefixOwners.get(prefix)
      if (owner !== undefined && owner !== frameDir) {
        addError(
          resolve(dir, 'meta.json'),
          `Frame prefix "${prefix}" already claimed by frame "${owner}"`,
        )
      } else {
        prefixOwners.set(prefix, frameDir)
      }
    }

    // Queue per-SVG content validation for the frame's full/mono SVGs.
    for (const svgFile of ['full.svg', 'mono.svg']) {
      const svgPath = resolve(dir, svgFile)
      if (!existsSync(svgPath)) continue
      svgTasks.push({
        svgPath,
        prefix: `frame_${frameDir}_${svgFile.replace('.svg', '')}`,
        isMono: svgFile === 'mono.svg',
      })
    }
  }
}

// --- Catalogue-level checks (cheap, main-thread) ---

function checkCrossTypeDuplicates(cat: MetaCatalogue) {
  const idToOccurrences = new Map<
    string,
    Array<{ type: string; crossType: boolean }>
  >()

  for (const [type, assets] of [
    ['token', cat.tokens],
    ['chain', cat.chains],
    ['brand', cat.brands],
  ] as const) {
    for (const asset of assets) {
      const occurrences = idToOccurrences.get(asset.id) || []
      occurrences.push({ type, crossType: asset.crossType })
      idToOccurrences.set(asset.id, occurrences)
    }
  }

  for (const [id, occurrences] of idToOccurrences) {
    if (occurrences.length > 1) {
      const types = occurrences.map((o) => o.type)
      const optedIn = occurrences.some((o) => o.crossType)
      if (optedIn) {
        addWarning(
          `assets/*/${id}.json`,
          `Asset ID "${id}" exists in multiple types: ${types.join(', ')} (resolved via type-prefixed keys)`,
        )
      } else {
        addError(
          `assets/*/${id}.json`,
          `Asset ID "${id}" exists in multiple types: ${types.join(', ')}. Set "crossType": true on at least one of the colliding metadata files to acknowledge the collision.`,
        )
      }
    }
  }
}

function checkWithinTypeNormalisationCollisions(cat: MetaCatalogue) {
  for (const [type, assets] of [
    ['token', cat.tokens],
    ['chain', cat.chains],
    ['brand', cat.brands],
  ] as const) {
    const normalisedToIds = new Map<string, string[]>()
    for (const asset of assets) {
      const k = normalizeAlias(asset.id)
      const ids = normalisedToIds.get(k) || []
      ids.push(asset.id)
      normalisedToIds.set(k, ids)
    }
    for (const [k, ids] of normalisedToIds) {
      if (ids.length > 1) {
        addError(
          `assets/${type}s/{${ids.join(',')}}.json`,
          `Multiple ${type} ids normalise to "${k}": ${ids.join(', ')}. The resolver collapses inputs to alphanumeric — choose distinct ids.`,
        )
      }
    }
  }
}

// Build the same identity indexes the generator ships and gate on the
// structured collision records: a same-type collision means the losing
// alias/symbol silently never resolves — and which one loses is decided by
// catalogue order, so it MUST be fixed by the author. Cross-type collisions
// resolve token-first by design (ADR-0001) and surface as warnings.
function checkAliasCollisions(cat: MetaCatalogue) {
  const { collisions } = buildIdentityIndexes(toIdentityAssets(cat))
  for (const { key, kept, dropped } of collisions) {
    const location = `assets/${dropped.type}s/${dropped.id}.json`
    if (kept.type === dropped.type) {
      addError(
        location,
        `Alias "${key}" of ${dropped.type}:${dropped.id} collides with ${kept.type}:${kept.id} and would silently never resolve — remove or change one of them`,
      )
    } else {
      addWarning(
        location,
        `Alias "${key}" of ${dropped.type}:${dropped.id} is shadowed by ${kept.type}:${kept.id} for untyped lookups (token-first, ADR-0001); typed lookups still resolve it`,
      )
    }
  }
}

// --- Per-SVG dispatch: inline vs worker pool ---

// Shard tasks round-robin across `count` buckets — keeps each worker's load
// even regardless of per-file cost variance.
function shard<T>(items: T[], count: number): T[][] {
  const buckets: T[][] = Array.from({ length: count }, () => [])
  items.forEach((item, i) => buckets[i % count].push(item))
  return buckets
}

function runInline(tasks: SvgFileTask[]) {
  setupSvgEnv()
  for (const task of tasks) {
    const r = validateSvgFile(task, MUTATE)
    errors.push(...r.errors)
    warnings.push(...r.warnings)
  }
}

const WORKER_PATH = fileURLToPath(
  new URL('./validate-worker.ts', import.meta.url),
)

function runInWorker(
  tasks: SvgFileTask[],
): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
  return new Promise((resolvePromise, rejectPromise) => {
    // execArgv: ['--import', 'tsx'] makes the worker load tsx's ESM loader so
    // it can execute the .ts entry directly — same TypeScript runtime as the
    // `tsx scripts/validate.ts` parent, no precompile step.
    const worker = new Worker(WORKER_PATH, {
      execArgv: ['--import', 'tsx'],
      workerData: { tasks, mutate: MUTATE },
    })
    worker.once('message', (msg) => resolvePromise(msg))
    worker.once('error', rejectPromise)
    worker.once('exit', (code) => {
      if (code !== 0) {
        rejectPromise(new Error(`validate worker exited with code ${code}`))
      }
    })
  })
}

async function runPooled(tasks: SvgFileTask[]) {
  const shards = shard(tasks, POOL_SIZE).filter((s) => s.length > 0)
  const results = await Promise.all(shards.map(runInWorker))
  for (const res of results) {
    errors.push(...res.errors)
    warnings.push(...res.warnings)
  }
}

// --- Main ---

async function main() {
  console.log(
    `Validating SVG assets${CHECK_MODE ? ' (check mode — no files will be modified)' : ''}...\n`,
  )

  // Structural + metadata checks (main thread), queueing SVG content tasks.
  validateAssetDir('tokens', validateTokenMeta)
  validateAssetDir('chains', validateChainMeta)
  validateAssetDir('brands', validateBrandMeta)
  validateFrames()

  // Catalogue-level checks: cheap, never need SVG bytes. Load meta once.
  let metaCatalogue: MetaCatalogue | null = null
  try {
    metaCatalogue = loadMetaCatalogue()
  } catch {
    // reported by the per-type validators
  }
  if (metaCatalogue) {
    checkCrossTypeDuplicates(metaCatalogue)
    checkWithinTypeNormalisationCollisions(metaCatalogue)
    checkAliasCollisions(metaCatalogue)
  }

  // The CPU-bound per-SVG pipeline: inline at seed scale, pooled at bulk
  // scale. Both paths import the same validateSvgFile — one source of truth.
  if (svgTasks.length < POOL_THRESHOLD) {
    runInline(svgTasks)
  } else {
    console.log(
      `Validating ${svgTasks.length} SVG files across ${Math.min(POOL_SIZE, svgTasks.length)} workers...\n`,
    )
    await runPooled(svgTasks)
  }

  // Output determinism: aggregated errors/warnings come back in worker-finish
  // order (pooled) or queue order (inline). Sort by file path (then message)
  // before printing so the report is identical between both paths and stable
  // across machines.
  const byFile = (
    a: { file: string; message: string },
    b: { file: string; message: string },
  ) => a.file.localeCompare(b.file) || a.message.localeCompare(b.message)
  errors.sort(byFile)
  warnings.sort(byFile)

  report()
}

function report() {
  const autoFixed = errors.filter((e) => e.autoFixed)
  const hardErrors = errors.filter((e) => !e.autoFixed)

  // In check mode, auto-fixed issues are errors (since no writes happened)
  const allErrors = CHECK_MODE ? errors : hardErrors

  if (!CHECK_MODE && autoFixed.length > 0) {
    console.log(`Auto-fixed ${autoFixed.length} issues:`)
    for (const e of autoFixed) {
      const rel = e.file.replace(ASSETS_DIR + '/', '')
      console.log(`  FIXED: ${rel} - ${e.message}`)
    }
    console.log()
  }

  if (warnings.length > 0) {
    console.log(`Warnings (${warnings.length}):`)
    for (const w of warnings) {
      const rel = w.file.replace(ASSETS_DIR + '/', '')
      console.log(`  WARNING: ${rel} - ${w.message}`)
    }
    console.log()
  }

  if (allErrors.length > 0) {
    console.log(`Errors (${allErrors.length}):`)
    for (const e of allErrors) {
      const rel = e.file.replace(ASSETS_DIR + '/', '')
      console.log(`  ERROR: ${rel} - ${e.message}`)
    }
    console.log()
    process.exit(1)
  }

  const totalAssets =
    listAssetJsonFiles('tokens').length +
    listAssetJsonFiles('chains').length +
    listAssetJsonFiles('brands').length

  console.log(`Validation passed. ${totalAssets} assets, 0 errors.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
