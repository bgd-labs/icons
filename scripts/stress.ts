#!/usr/bin/env tsx

// Scale stress harness: runs the full pipeline (validate -> generate ->
// build -> size-limit) against a synthetic catalogue of hundreds of assets,
// and reports build times, entry sizes, and chunk distribution — proof the
// lazy/shard architecture holds up BEFORE the real bulk icon set lands.
//
// The synthetic tree lives in .stress/assets (real assets/ copied in, then
// synthetic assets layered on top) and the pipeline is pointed at it via
// ICONS_ASSETS_DIR (honoured by scripts/lib/catalogue.ts and .size-limit.cjs).
// Generated code and dist/ ARE overwritten during the run — both are
// disposable build outputs — and restored from the real catalogue in a
// finally block, so the repo is always left in its real state.
//
// Usage: pnpm stress [--tokens 600] [--chains 80] [--brands 60]

import { spawnSync } from 'child_process'
import {
  cpSync,
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
  mkdirSync,
} from 'fs'
import { resolve } from 'path'
import { gzipSync } from 'zlib'
import { bold, cyan, dim, green, padLabel, red } from './lib/ansi'
import { capitalize } from './svg-to-jsx'

const ROOT = resolve(process.cwd())
const REAL_ASSETS = resolve(ROOT, 'assets')
const STRESS_ASSETS = resolve(ROOT, '.stress/assets')
const CORE_DIST = resolve(ROOT, 'packages/core/dist')
const REACT_DIST = resolve(ROOT, 'packages/react/dist')
const REACT_GEN = resolve(ROOT, 'packages/react/src/generated')

// --- CLI args ---

function intArg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`)
  if (i === -1 || i + 1 >= process.argv.length) return fallback
  const n = Number(process.argv[i + 1])
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`--${name} expects a non-negative integer`)
  }
  return n
}

const N_TOKENS = intArg('tokens', 600)
const N_CHAINS = intArg('chains', 80)
const N_BRANDS = intArg('brands', 60)

// --- Deterministic PRNG (fixed seed: identical catalogue every run) ---

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(0x1c0d5)

function pick(chars: string): string {
  return chars[Math.floor(rand() * chars.length)]
}

function randInt(min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1))
}

// --- Synthetic id generation ---
//
// Fixed-length (6 chars) consonant-vowel ids: pronounceable, valid asset ids,
// spread across ~20 first characters (so per-first-char sharding fans out),
// and structurally distinct from their own aliases (id + 2-char suffix can
// never equal another 6-char id).

const CONSONANTS = 'bcdfghjklmnpqrstvwxz'
const VOWELS = 'aeiou'

const usedIds = new Set<string>()
// Real ids from every type dir — synthetic ids must not collide with them
// (a cross-type duplicate would need a crossType acknowledgement).
for (const dir of ['tokens', 'chains', 'brands']) {
  const full = resolve(REAL_ASSETS, dir)
  if (!existsSync(full)) continue
  for (const f of readdirSync(full)) {
    if (f.endsWith('.json')) usedIds.add(f.replace(/\.json$/, ''))
  }
}

function makeId(): string {
  for (;;) {
    let id = ''
    for (let s = 0; s < 3; s++) {
      id += pick(CONSONANTS)
      id += pick(VOWELS)
    }
    if (!usedIds.has(id)) {
      usedIds.add(id)
      return id
    }
  }
}

// --- Synthetic SVG generation ---
//
// Shapes mirror the real assets: a full-bleed circular background plus a
// handful of polygon "glyph" paths. Full variant uses hardcoded hex fills,
// mono uses currentColor only. No id="" attributes, so SVGO's prefixIds has
// nothing to rewrite and the prefix assertion passes trivially.

function randHex(): string {
  const h = Math.floor(rand() * 0xffffff)
    .toString(16)
    .padStart(6, '0')
  return `#${h}`
}

function polygonPath(): string {
  const points = randInt(3, 8)
  const cx = randInt(10, 22)
  const cy = randInt(10, 22)
  const r = randInt(4, 9)
  const coords: string[] = []
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * 2 * Math.PI
    const x = Math.round((cx + r * Math.cos(angle)) * 10) / 10
    const y = Math.round((cy + r * Math.sin(angle)) * 10) / 10
    coords.push(`${x} ${y}`)
  }
  return `M${coords.join('L')}Z`
}

const SVG_OPEN =
  '<svg width="32" height="32" fill="none" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">'
const CIRCLE_D = 'M16 0a16 16 0 1 1 0 32 16 16 0 0 1 0-32'

function fullSvg(): string {
  const paths = [`<path fill="${randHex()}" d="${CIRCLE_D}"/>`]
  const glyphs = randInt(2, 6)
  for (let i = 0; i < glyphs; i++) {
    paths.push(`<path fill="${randHex()}" d="${polygonPath()}"/>`)
  }
  return `${SVG_OPEN}${paths.join('')}</svg>`
}

function monoSvg(): string {
  return `${SVG_OPEN}<path fill="currentColor" d="${CIRCLE_D}"/></svg>`
}

// --- Synthetic catalogue ---

interface SynthCounts {
  eager: number
}

function writeAsset(
  dir: string,
  id: string,
  meta: Record<string, unknown>,
): void {
  writeFileSync(resolve(dir, `${id}.json`), JSON.stringify(meta, null, 2))
  writeFileSync(resolve(dir, `${id}_full.svg`), fullSvg())
  writeFileSync(resolve(dir, `${id}_mono.svg`), monoSvg())
}

function buildSyntheticCatalogue(): SynthCounts {
  rmSync(resolve(ROOT, '.stress'), { recursive: true, force: true })
  mkdirSync(STRESS_ASSETS, { recursive: true })
  // Real assets first: keeps real frames (statically imported by the react
  // entry) and the real eager set in the mix.
  cpSync(REAL_ASSETS, STRESS_ASSETS, { recursive: true })

  let eager = 0
  const types: Array<{
    dir: string
    count: number
    meta: (id: string, i: number, bundle: boolean) => Record<string, unknown>
  }> = [
    {
      dir: 'tokens',
      count: N_TOKENS,
      meta: (id, _i, bundle) => ({
        symbol: id.toUpperCase(),
        name: `${capitalize(id)} Token`,
        aliases: [`${id}x1`, `${id}x2`],
        brandColor: randHex(),
        ...(bundle ? { bundle: true } : {}),
      }),
    },
    {
      dir: 'chains',
      count: N_CHAINS,
      meta: (id, i, bundle) => ({
        name: `${capitalize(id)} Chain`,
        chainId: 1_000_000 + i,
        aliases: [`${id}x1`],
        brandColor: randHex(),
        ...(bundle ? { bundle: true } : {}),
      }),
    },
    {
      dir: 'brands',
      count: N_BRANDS,
      meta: (id, _i, bundle) => ({
        name: `${capitalize(id)} Labs`,
        aliases: [`${id}x1`],
        brandColor: randHex(),
        ...(bundle ? { bundle: true } : {}),
      }),
    },
  ]

  for (const t of types) {
    const dir = resolve(STRESS_ASSETS, t.dir)
    mkdirSync(dir, { recursive: true })
    for (let i = 0; i < t.count; i++) {
      // Every 25th synthetic asset is eager — a realistic "popular icons
      // bundled" ratio that keeps the eager map non-trivial at scale.
      const bundle = i % 25 === 0
      if (bundle) eager++
      const id = makeId()
      writeAsset(dir, id, t.meta(id, i, bundle))
    }
  }

  return { eager }
}

// --- Step runner ---

const STRESS_ENV = { ...process.env, ICONS_ASSETS_DIR: STRESS_ASSETS }

interface StepResult {
  label: string
  ms: number
  status: number
}

const timings: StepResult[] = []

function run(
  label: string,
  cmd: string,
  args: string[],
  opts: { env?: NodeJS.ProcessEnv; allowFailure?: boolean } = {},
): number {
  console.log(`\n${bold(`  ▶ ${label}`)}`)
  const t0 = performance.now()
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: opts.env ?? process.env,
  })
  const ms = Math.round(performance.now() - t0)
  const status = r.status ?? 1
  timings.push({ label, ms, status })
  if (status !== 0 && !opts.allowFailure) {
    throw new Error(`Step "${label}" failed with exit code ${status}`)
  }
  return status
}

// --- Measurement ---

interface SizeInfo {
  raw: number
  gzip: number
}

function sizeOf(path: string): SizeInfo {
  const buf = readFileSync(path)
  return { raw: buf.length, gzip: gzipSync(buf).length }
}

function kb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} kB`
}

function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  const out: string[] = []
  const walk = (d: string) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = resolve(d, entry.name)
      if (entry.isDirectory()) walk(p)
      else out.push(p)
    }
  }
  walk(dir)
  return out
}

function totalBytes(dir: string): number {
  return listFiles(dir).reduce((sum, f) => sum + statSync(f).size, 0)
}

function p95(sorted: number[]): number {
  if (sorted.length === 0) return 0
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95))]
}

// --- Output helpers (shared palette: scripts/lib/ansi.ts) ---

function row(label: string, value: string) {
  console.log(`  ${dim(padLabel(label, 26))} ${value}`)
}

// --- Report ---

function report(synth: SynthCounts, sizeLimitStatus: number) {
  console.log()
  console.log(bold('  @bgd-labs/icons — stress report'))
  console.log()

  row(
    'Synthetic catalogue',
    `${N_TOKENS} tokens, ${N_CHAINS} chains, ${N_BRANDS} brands ${dim(`(+ real seed, ${synth.eager} synthetic eager)`)}`,
  )

  // Shard fan-out actually emitted (counted before restore).
  const shardCounts = (['tokens', 'chains', 'brands'] as const).map((t) => {
    const dir = resolve(REACT_GEN, 'lazy', t)
    return `${t}: ${existsSync(dir) ? readdirSync(dir).length : 0}`
  })
  row('Lazy shard files', shardCounts.join(', '))

  console.log()
  console.log(`  ${cyan('Timings')}`)
  for (const t of timings) {
    row(t.label, `${(t.ms / 1000).toFixed(1)}s`)
  }

  console.log()
  console.log(`  ${cyan('@bgd-labs/icons dist (ESM, raw / gzip)')}`)
  for (const entry of [
    'index.js',
    'resolve.js',
    'svg-tokens.js',
    'svg-chains.js',
    'svg-brands.js',
  ]) {
    const p = resolve(CORE_DIST, entry)
    if (!existsSync(p)) continue
    const s = sizeOf(p)
    row(entry, `${kb(s.raw)} / ${kb(s.gzip)}`)
  }
  row('total dist (all files)', kb(totalBytes(CORE_DIST)))

  console.log()
  console.log(`  ${cyan('@bgd-labs/icons-react dist (ESM, raw / gzip)')}`)
  for (const entry of [
    'index.js',
    'tokens.js',
    'chains.js',
    'brands.js',
    'frames.js',
    'compat.js',
  ]) {
    const p = resolve(REACT_DIST, entry)
    if (!existsSync(p)) continue
    const s = sizeOf(p)
    row(entry, `${kb(s.raw)} / ${kb(s.gzip)}`)
  }

  const chunks = listFiles(REACT_DIST)
    .filter((f) => /(?:^|\/)chunk-[^/]+\.js$/.test(f))
    .map((f) => statSync(f).size)
    .sort((a, b) => a - b)
  const chunkTotal = chunks.reduce((a, b) => a + b, 0)
  row('code-split chunks', `${chunks.length}`)
  if (chunks.length > 0) {
    row(
      'chunk sizes',
      `mean ${kb(chunkTotal / chunks.length)}, p95 ${kb(p95(chunks))}, max ${kb(chunks[chunks.length - 1])}`,
    )
  }
  row('total dist (all files)', kb(totalBytes(REACT_DIST)))

  console.log()
  row(
    'size-limit budgets',
    sizeLimitStatus === 0
      ? green('pass (formula budgets hold at this scale)')
      : red('FAIL — formula constants need attention at this scale'),
  )
  console.log()
}

// --- Main ---

console.log()
console.log(bold('  @bgd-labs/icons — scale stress test'))
console.log(
  `  ${dim(padLabel('Catalogue', 26))} ${N_TOKENS} tokens, ${N_CHAINS} chains, ${N_BRANDS} brands ${dim('(synthetic, on top of the real seed)')}`,
)

const synth = buildSyntheticCatalogue()
let failed = false

// Restore the repo to its real state: regenerate from assets/ and rebuild
// both packages (seed-scale, seconds). Runs at most once (finally OR a
// signal, not both) and is best-effort — every step runs even if an earlier
// one fails, so a single failure can't leave the repo half-restored (real
// generated code but stress-scale dist, or vice versa).
let restored = false
function restore(): void {
  if (restored) return
  restored = true
  const steps: [string, string, string[]][] = [
    [
      'restore: generate (real assets)',
      'pnpm',
      ['exec', 'tsx', 'scripts/generate.ts'],
    ],
    [
      'restore: build @bgd-labs/icons',
      'pnpm',
      ['--filter', '@bgd-labs/icons', 'run', 'build'],
    ],
    [
      'restore: build @bgd-labs/icons-react',
      'pnpm',
      ['--filter', '@bgd-labs/icons-react', 'run', 'build'],
    ],
  ]
  for (const [label, cmd, args] of steps) {
    const status = run(label, cmd, args, { allowFailure: true })
    if (status !== 0) {
      failed = true
      console.error(
        `  ⚠ ${label} failed (exit ${status}) — run \`pnpm generate && pnpm build\` to restore manually`,
      )
    }
  }
}

// Ctrl-C / kill during the multi-minute stress build must not leave generated
// code and dist at stress scale. Restore, then exit with the conventional
// 128+signal code. spawnSync in run() is synchronous, so restore completes
// before exit.
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    console.error(`\n  ${sig} received — restoring real state before exit`)
    restore()
    process.exit(sig === 'SIGINT' ? 130 : 143)
  })
}

try {
  // validate in MUTATE mode: synthetic SVGs go through the same SVGO/
  // sanitizer pipeline real bulk contributions will.
  run('validate (mutate)', 'pnpm', ['exec', 'tsx', 'scripts/validate.ts'], {
    env: STRESS_ENV,
  })
  run('generate', 'pnpm', ['exec', 'tsx', 'scripts/generate.ts'], {
    env: STRESS_ENV,
  })
  // Build the packages directly (not through turbo) so timings are real,
  // never cache hits.
  run('build @bgd-labs/icons', 'pnpm', [
    '--filter',
    '@bgd-labs/icons',
    'run',
    'build',
  ])
  run('build @bgd-labs/icons-react', 'pnpm', [
    '--filter',
    '@bgd-labs/icons-react',
    'run',
    'build',
  ])
  const sizeLimitStatus = run('size-limit', 'pnpm', ['exec', 'size-limit'], {
    env: STRESS_ENV,
    allowFailure: true,
  })

  report(synth, sizeLimitStatus)
} catch (e) {
  failed = true
  console.error(e instanceof Error ? e.message : e)
} finally {
  restore()
}

process.exit(failed ? 1 : 0)
