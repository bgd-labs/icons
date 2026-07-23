import { canonicalize } from './canonical'
import type { IconMeta, IconType } from '../types'

export interface Identity {
  id: string
  type: IconType
}

export type IdentityKey = `${IconType}:${string}`

export interface IdentityIndexes {
  aliases: Record<string, Identity>
  typeAliases: Record<IconType, Record<string, string>>
}

export interface AliasCollision {
  key: string
  kept: Identity
  dropped: Identity
}

export interface BuiltIdentityIndexes extends IdentityIndexes {
  warnings: string[]
  /**
   * Structured collision records for tooling: same-type collisions
   * (kept.type === dropped.type) are authoring errors — the loser is picked
   * by catalogue order; cross-type collisions are resolved token-first per
   * ADR-0001 and merely informational.
   */
  collisions: AliasCollision[]
}

export interface IdentityAsset {
  id: string
  type: IconType
  aliases?: readonly (string | number)[]
  symbol?: string
  chainId?: number
}

export interface LookupIdentityOptions {
  type?: IconType
}

const TYPE_ORDER: readonly IconType[] = ['token', 'chain', 'brand']

export function normalizeAlias(input: string | number): string {
  const base = String(input)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
  // Collapse open-ended families (e.g. dated maturities) to their stable key
  // before lookup. Applied to both authored keys (at generate time) and the
  // input (at resolve time), so the two always meet on the same key.
  return canonicalize(base)
}

export function toIdCandidate(input: string | number): string {
  return normalizeAlias(input)
}

export function identityKey(identity: Identity): IdentityKey {
  return `${identity.type}:${identity.id}`
}

export function lookupIdentity(
  input: string | number,
  indexes: IdentityIndexes,
  options: LookupIdentityOptions = {},
): Identity | null {
  const key = normalizeAlias(input)
  if (options.type) {
    // Optional chaining: TS confines `type` to IconType, but JS callers pass
    // strings like "tokens" (the asset-dir name) — an unknown type must be a
    // miss, not a TypeError thrown into the consumer's render tree.
    const id = indexes.typeAliases[options.type]?.[key]
    return id ? { id, type: options.type } : null
  }
  return indexes.aliases[key] ?? null
}

export function lookupMeta(
  identity: Identity,
  meta: Record<IdentityKey, IconMeta>,
): IconMeta | null {
  return meta[identityKey(identity)] ?? null
}

/**
 * Derive the cross-type alias map from the per-type maps at module init.
 * Earlier types in TYPE_ORDER win ambiguous keys (token-first, ADR-0001) —
 * the same precedence buildIdentityIndexes applies, so shipping only the
 * typed maps and deriving this one keeps the generated payload halved.
 */
export function buildGlobalAliases(
  typeAliases: Record<IconType, Record<string, string>>,
): Record<string, Identity> {
  const aliases: Record<string, Identity> = {}
  for (const type of TYPE_ORDER) {
    for (const [key, id] of Object.entries(typeAliases[type])) {
      if (!(key in aliases)) aliases[key] = { id, type }
    }
  }
  return aliases
}

export function buildIdentityIndexes(
  assets: readonly IdentityAsset[],
): BuiltIdentityIndexes {
  const aliases: Record<string, Identity> = {}
  const typeAliases: Record<IconType, Record<string, string>> = {
    token: {},
    chain: {},
    brand: {},
  }
  const warnings: string[] = []
  const collisions: AliasCollision[] = []

  function addAlias(key: string, identity: Identity) {
    if (key === '') {
      warnings.push(
        `${identity.type}:${identity.id} has an alias that normalises to an empty string — skipped`,
      )
      return
    }
    const existing = aliases[key]
    if (existing) {
      if (existing.id !== identity.id || existing.type !== identity.type) {
        warnings.push(
          `"${key}" -> ${identity.type}:${identity.id} dropped (already maps to ${existing.type}:${existing.id})`,
        )
        // Same-type collisions are recorded by addTypedAlias (every
        // addAlias call is paired with one); record only cross-type here.
        if (existing.type !== identity.type) {
          collisions.push({ key, kept: existing, dropped: identity })
        }
      }
      return
    }
    aliases[key] = identity
  }

  function addTypedAlias(type: IconType, key: string, id: string) {
    if (key === '') return
    const existing = typeAliases[type][key]
    if (existing && existing !== id) {
      warnings.push(`"${key}" -> ${id} dropped (already maps to ${existing})`)
      collisions.push({
        key,
        kept: { type, id: existing },
        dropped: { type, id },
      })
      return
    }
    typeAliases[type][key] = id
  }

  for (const type of TYPE_ORDER) {
    for (const asset of assets.filter((item) => item.type === type)) {
      const identity = { id: asset.id, type }
      const idKey = normalizeAlias(asset.id)

      addAlias(idKey, identity)
      addTypedAlias(type, idKey, asset.id)

      if (type === 'token' && asset.symbol) {
        const symbolKey = normalizeAlias(asset.symbol)
        addAlias(symbolKey, identity)
        addTypedAlias(type, symbolKey, asset.id)
      }

      if (type === 'chain' && asset.chainId !== undefined) {
        const chainIdKey = normalizeAlias(asset.chainId)
        addAlias(chainIdKey, identity)
        addTypedAlias(type, chainIdKey, asset.id)
      }

      for (const alias of asset.aliases ?? []) {
        const aliasKey = normalizeAlias(alias)
        if (aliasKey === idKey) continue
        addAlias(aliasKey, identity)
        addTypedAlias(type, aliasKey, asset.id)
      }
    }
  }

  return { aliases, typeAliases, warnings, collisions }
}
