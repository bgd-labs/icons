import type { IconType, IconVariant } from './types'
import { resolve } from './resolve'
import { getTokenSvg as _getTokenSvg } from './generated/svg/tokens'
import { getChainSvg as _getChainSvg } from './generated/svg/chains'
import { getBrandSvg as _getBrandSvg } from './generated/svg/brands'

export type { IconVariant } from './types'

const TYPED_SVG: Record<IconType, typeof _getTokenSvg> = {
  token: _getTokenSvg,
  chain: _getChainSvg,
  brand: _getBrandSvg,
}

// Typed getters accept the same inputs as the typed resolvers: canonical
// ids, symbols, chain ids, and authored aliases — "it resolves there, it
// resolves everywhere".
export function getTypedSvg(
  type: IconType,
  id: string | number,
  variant: IconVariant = 'full',
): string | null {
  const hit = resolve(id, { type })
  // `?? null` honours the `string | null` contract even when an untyped JS
  // caller passes an invalid variant (the generated getter returns undefined).
  return hit ? (TYPED_SVG[type](hit.id, variant) ?? null) : null
}

export function getTokenSvg(
  id: string | number,
  variant: IconVariant = 'full',
): string | null {
  return getTypedSvg('token', id, variant)
}

export function getChainSvg(
  id: string | number,
  variant: IconVariant = 'full',
): string | null {
  return getTypedSvg('chain', id, variant)
}

export function getBrandSvg(
  id: string | number,
  variant: IconVariant = 'full',
): string | null {
  return getTypedSvg('brand', id, variant)
}

export function getSvg(
  input: string | number,
  variant: IconVariant = 'full',
): string | null {
  const hit = resolve(input)
  return hit ? (TYPED_SVG[hit.type](hit.id, variant) ?? null) : null
}
