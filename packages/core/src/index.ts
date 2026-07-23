export type { IconMeta, IconType, IconVariant, ResolveResult } from './types'
export type {
  TokenIconId,
  ChainIconId,
  BrandIconId,
  IconId,
} from './generated/ids'
export type { IdentityKey } from './internal/identity'
export { identityKey } from './internal/identity'
export { META } from './generated/meta'
export {
  resolve,
  resolveOrCandidate,
  resolveToken,
  resolveChain,
  resolveBrand,
} from './resolve'
export type { ResolveOptions, ResolvedOrCandidate } from './resolve'

import { TYPE_ALIASES } from './generated/aliases'
import { META } from './generated/meta'
import { lookupMeta, normalizeAlias } from './internal/identity'
import { resolve } from './resolve'
import type { IconMeta, IconType } from './types'

export function getMeta(input: string | number): IconMeta | null {
  const hit = resolve(input)
  return hit ? lookupMeta(hit, META) : null
}

// Typed getters accept the same inputs as the typed resolvers: canonical
// ids, symbols, chain ids, and authored aliases — "it resolves there, it
// resolves everywhere".
export function getTypedMeta(
  type: IconType,
  id: string | number,
): IconMeta | null {
  const hit = resolve(id, { type })
  return hit ? lookupMeta(hit, META) : null
}

export function getTokenMeta(id: string | number): IconMeta | null {
  return getTypedMeta('token', id)
}

export function getChainMeta(id: string | number): IconMeta | null {
  return getTypedMeta('chain', id)
}

export function getBrandMeta(id: string | number): IconMeta | null {
  return getTypedMeta('brand', id)
}

/** Every shipped icon's metadata, optionally filtered by type. */
export function listIcons(type?: IconType): IconMeta[] {
  const all = Object.values(META)
  return type ? all.filter((meta) => meta.type === type) : all
}

// Reverse of TYPE_ALIASES (key -> id) into (id -> keys). Built lazily and
// memoised: only callers of getAliases pay for it, and only once. The forward
// alias data is the single source of truth — we never ship a second copy.
let aliasesById: Record<IconType, Record<string, string[]>> | null = null
function buildAliasesById(): Record<IconType, Record<string, string[]>> {
  const out: Record<IconType, Record<string, string[]>> = {
    token: {},
    chain: {},
    brand: {},
  }
  for (const type of ['token', 'chain', 'brand'] as const) {
    for (const [key, id] of Object.entries(TYPE_ALIASES[type])) {
      ;(out[type][id] ??= []).push(key)
    }
  }
  return out
}

/**
 * The extra resolver keys that map to an icon — i.e. every alternate string a
 * caller could pass to `resolve`/`getMeta` and land on the same asset, minus
 * the ones already surfaced elsewhere (the canonical id, symbol, and chain id).
 * Keys are the normalised forms the resolver actually matches on (the authored
 * casing/punctuation is not shipped). Accepts any resolvable input; returns
 * `[]` for a miss or when there are no additional aliases.
 */
export function getAliases(type: IconType, input: string | number): string[] {
  const hit = resolve(input, { type })
  if (!hit) return []
  const keys = (aliasesById ??= buildAliasesById())[type]?.[hit.id] ?? []
  const meta = lookupMeta(hit, META)
  const shown = new Set<string>([normalizeAlias(hit.id)])
  if (meta?.symbol) shown.add(normalizeAlias(meta.symbol))
  if (meta?.chainId != null) shown.add(normalizeAlias(meta.chainId))
  return keys.filter((key) => !shown.has(key))
}
