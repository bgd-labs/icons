// The asset catalogue: the only module that knows how authored assets are
// laid out on disk (assets/{tokens,chains,brands}/{id}.json + {id}_full.svg
// + {id}_mono.svg, assets/frames/{type}/{full,mono}.svg). validate.ts and
// generate.ts are callers — neither walks the filesystem itself.

import { existsSync, readFileSync, readdirSync } from 'fs'
import { basename, dirname, resolve } from 'path'
import type { IdentityAsset } from '../../packages/core/src/internal/identity'

// ICONS_ASSETS_DIR points the whole pipeline (validate, generate,
// size-limit budgets) at an alternate asset tree — used by scripts/stress.ts
// to run the pipeline against a synthetic catalogue without touching assets/.
export const ASSETS_DIR = process.env.ICONS_ASSETS_DIR
  ? resolve(process.env.ICONS_ASSETS_DIR)
  : resolve(process.cwd(), 'assets')

export type AssetDirName = 'tokens' | 'chains' | 'brands'

// Metadata-only shapes (the {id}.json fields). Identity/alias checks and the
// cross-type duplicate check work off these and never touch the SVG bytes.

export interface TokenMeta {
  id: string // filesystem name (e.g. "eth")
  symbol: string // display symbol (e.g. "ETH")
  name: string
  brandColor?: string
  bundle?: boolean
  // Authored acknowledgement that this id intentionally exists in more than
  // one type (the cross-type duplicate check reads it).
  crossType: boolean
  aliases: string[]
}

export interface ChainMeta {
  id: string
  name: string
  chainId?: number
  brandColor?: string
  bundle?: boolean
  crossType: boolean
  aliases: string[]
}

export interface BrandMeta {
  id: string
  name: string
  brandColor?: string
  bundle?: boolean
  crossType: boolean
  aliases: string[]
}

// Full shapes carry the SVG bytes — only loaders that emit SVG read them.

export interface TokenAsset extends TokenMeta {
  fullSvg: string
  monoSvg: string
}

export interface ChainAsset extends ChainMeta {
  fullSvg: string
  monoSvg: string
}

export interface BrandAsset extends BrandMeta {
  fullSvg: string
  monoSvg: string
}

export interface FrameAsset {
  id: string
  prefixes: string[]
  fullSvg: string
  monoSvg: string
}

/** Everything loaded in a single filesystem pass. */
export interface Catalogue {
  tokens: TokenAsset[]
  chains: ChainAsset[]
  brands: BrandAsset[]
  frames: FrameAsset[]
}

/** Metadata-only catalogue (no SVG bytes read). */
export interface MetaCatalogue {
  tokens: TokenMeta[]
  chains: ChainMeta[]
  brands: BrandMeta[]
}

export function assetDir(name: AssetDirName | 'frames'): string {
  return resolve(ASSETS_DIR, name)
}

// All listings sort explicitly: readdir order is filesystem-dependent
// (APFS vs ext4 differ), and listing order decides generated-file entry
// order AND which asset wins an alias collision — both must be stable
// across machines.

/** Absolute paths of every asset metadata file in a type directory. */
export function listAssetJsonFiles(name: AssetDirName): string[] {
  const dir = assetDir(name)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => resolve(dir, f))
}

/** Absolute paths of every SVG file in a type directory (including orphans). */
export function listAssetSvgFiles(name: AssetDirName): string[] {
  const dir = assetDir(name)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.svg'))
    .sort()
    .map((f) => resolve(dir, f))
}

/** The full/mono SVG paths paired with an asset's metadata file. */
export function assetSvgPaths(jsonPath: string): {
  full: string
  mono: string
} {
  const id = basename(jsonPath, '.json')
  const dir = dirname(jsonPath)
  return {
    full: resolve(dir, `${id}_full.svg`),
    mono: resolve(dir, `${id}_mono.svg`),
  }
}

export function listFrameDirs(): { id: string; dir: string }[] {
  const dir = assetDir('frames')
  if (!existsSync(dir)) return []
  return (
    readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      // Codepoint comparison, like the asset listings above — localeCompare is
      // ICU/locale-sensitive and would let two machines disagree on order.
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
      .map((d) => ({ id: d.name, dir: resolve(dir, d.name) }))
  )
}

function readMeta(jsonPath: string): {
  id: string
  meta: Record<string, unknown>
} {
  return {
    id: basename(jsonPath, '.json'),
    meta: JSON.parse(readFileSync(jsonPath, 'utf-8')),
  }
}

function readSvgPair(jsonPath: string): { fullSvg: string; monoSvg: string } {
  const { full, mono } = assetSvgPaths(jsonPath)
  return {
    fullSvg: readFileSync(full, 'utf-8'),
    monoSvg: readFileSync(mono, 'utf-8'),
  }
}

function tokenMeta(jsonPath: string): TokenMeta {
  const { id, meta } = readMeta(jsonPath)
  return {
    id,
    symbol: meta.symbol as string,
    name: meta.name as string,
    brandColor: meta.brandColor as string | undefined,
    bundle: meta.bundle === true,
    crossType: meta.crossType === true,
    aliases: ((meta.aliases as (string | number)[]) || []).map(String),
  }
}

function chainMeta(jsonPath: string): ChainMeta {
  const { id, meta } = readMeta(jsonPath)
  return {
    id,
    name: meta.name as string,
    chainId: meta.chainId as number | undefined,
    brandColor: meta.brandColor as string | undefined,
    bundle: meta.bundle === true,
    crossType: meta.crossType === true,
    aliases: ((meta.aliases as (string | number)[]) || []).map(String),
  }
}

function brandMeta(jsonPath: string): BrandMeta {
  const { id, meta } = readMeta(jsonPath)
  return {
    id,
    name: meta.name as string,
    brandColor: meta.brandColor as string | undefined,
    bundle: meta.bundle === true,
    crossType: meta.crossType === true,
    aliases: ((meta.aliases as (string | number)[]) || []).map(String),
  }
}

// --- Meta-only loaders (no SVG bytes read) ---

export function loadTokenMetas(): TokenMeta[] {
  return listAssetJsonFiles('tokens').map(tokenMeta)
}

export function loadChainMetas(): ChainMeta[] {
  return listAssetJsonFiles('chains').map(chainMeta)
}

export function loadBrandMetas(): BrandMeta[] {
  return listAssetJsonFiles('brands').map(brandMeta)
}

export function loadMetaCatalogue(): MetaCatalogue {
  return {
    tokens: loadTokenMetas(),
    chains: loadChainMetas(),
    brands: loadBrandMetas(),
  }
}

// --- Full loaders (meta + SVG) ---

export function loadTokens(): TokenAsset[] {
  return listAssetJsonFiles('tokens').map((jsonPath) => ({
    ...tokenMeta(jsonPath),
    ...readSvgPair(jsonPath),
  }))
}

export function loadChains(): ChainAsset[] {
  return listAssetJsonFiles('chains').map((jsonPath) => ({
    ...chainMeta(jsonPath),
    ...readSvgPair(jsonPath),
  }))
}

export function loadBrands(): BrandAsset[] {
  return listAssetJsonFiles('brands').map((jsonPath) => ({
    ...brandMeta(jsonPath),
    ...readSvgPair(jsonPath),
  }))
}

export function loadFrames(): FrameAsset[] {
  return listFrameDirs().map(({ id, dir }) => {
    const metaPath = resolve(dir, 'meta.json')
    const meta = existsSync(metaPath)
      ? JSON.parse(readFileSync(metaPath, 'utf-8'))
      : {}
    return {
      id,
      prefixes: meta.prefixes || [id],
      fullSvg: readFileSync(resolve(dir, 'full.svg'), 'utf-8'),
      monoSvg: readFileSync(resolve(dir, 'mono.svg'), 'utf-8'),
    }
  })
}

export function loadCatalogue(): Catalogue {
  return {
    tokens: loadTokens(),
    chains: loadChains(),
    brands: loadBrands(),
    frames: loadFrames(),
  }
}

// The IdentityAsset[] projection used by both generate.ts (to ship the alias
// maps) and validate.ts (to gate on collisions). Accepts meta-only or full
// shapes — identity never depends on SVG bytes.
export function toIdentityAssets(cat: {
  tokens: TokenMeta[]
  chains: ChainMeta[]
  brands: BrandMeta[]
}): IdentityAsset[] {
  return [
    ...cat.tokens.map((t) => ({
      type: 'token' as const,
      id: t.id,
      symbol: t.symbol,
      aliases: t.aliases,
    })),
    ...cat.chains.map((c) => ({
      type: 'chain' as const,
      id: c.id,
      chainId: c.chainId,
      aliases: c.aliases,
    })),
    ...cat.brands.map((b) => ({
      type: 'brand' as const,
      id: b.id,
      aliases: b.aliases,
    })),
  ]
}
