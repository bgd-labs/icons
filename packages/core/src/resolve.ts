export type { ResolveResult } from './types'
import { TYPE_ALIASES } from './generated/aliases'
import {
  buildGlobalAliases,
  lookupIdentity,
  toIdCandidate,
} from './internal/identity'
import type { Identity } from './internal/identity'
import type { IconType, ResolveResult } from './types'

export interface ResolveOptions {
  type?: IconType
}

export interface ResolvedOrCandidate {
  id: string
  type?: IconType
  matched: boolean
}

function typedResult<T extends IconType>(
  type: T,
  input: string | number,
): (ResolveResult & { type: T }) | null {
  const hit = lookupIdentity(input, INDEXES, { type })
  return hit ? { id: hit.id, type } : null
}

// The cross-type map is mechanically derivable from the typed maps
// (token-first precedence) instead of being shipped as a second copy of
// every alias entry. It is built lazily on first untyped lookup and
// memoised: apps that only use typed resolvers (resolveToken etc.) never
// touch `indexes.aliases`, so they avoid the O(total aliases) build at
// module init.
let globalAliases: Record<string, Identity> | null = null
const INDEXES = {
  get aliases() {
    return (globalAliases ??= buildGlobalAliases(TYPE_ALIASES))
  },
  typeAliases: TYPE_ALIASES,
}

export function resolve(
  input: string | number,
  options: ResolveOptions = {},
): ResolveResult | null {
  if (options.type) {
    return typedResult(options.type, input)
  }
  return lookupIdentity(input, INDEXES)
}

/**
 * Like `resolve`, but always answers. A hit returns the resolved Identity
 * with `matched: true`. A miss returns a candidate identity — the input
 * normalised by the mechanical-alias rule, typed only when the caller
 * constrained the type — with `matched: false`. Candidates feed placeholder
 * labels and network-fallback URLs without callers re-implementing
 * normalisation.
 */
export function resolveOrCandidate(
  input: string | number,
  options: ResolveOptions = {},
): ResolvedOrCandidate {
  const hit = resolve(input, options)
  if (hit) return { id: hit.id, type: hit.type, matched: true }
  return {
    id: toIdCandidate(input),
    type: options.type,
    matched: false,
  }
}

export function resolveToken(input: string | number) {
  return typedResult('token', input)
}

export function resolveChain(input: string | number) {
  return typedResult('chain', input)
}

export function resolveBrand(input: string | number) {
  return typedResult('brand', input)
}
