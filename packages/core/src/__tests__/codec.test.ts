import { describe, expect, it } from 'vitest'
import { decodeMeta, decodeAliases } from '../internal/codec'
import { normalizeAlias } from '../internal/identity'
import type { IconMeta, IconType } from '../types'
import type { IdentityKey } from '../internal/identity'
// The script-side encoder lives outside src/ (it is generate-time only). Vitest
// runs from the repo root so this relative import resolves; the pairing pins
// encode/decode as exact inverses.
import {
  encodeMetaTable,
  encodeAliasTable,
  type MetaRowInput,
} from '../../../../scripts/lib/codec'

// A representative asset set covering the encoding's edge cases:
// - a name with spaces AND punctuation ("PT Ethena eUSDe", "Wrapped (v2)")
// - a token with many aliases
// - a chain with a chainId
// - placeholderColor equal to brandColor (collapsed to empty on the wire)
// - placeholderColor distinct from brandColor (kept verbatim)
// - an empty alias list (only the self-key)

const tokenMetaRows: MetaRowInput[] = [
  // placeholderColor === brandColor -> collapsed
  {
    id: 'aave',
    name: 'Aave',
    brandColor: '#9391f7',
    placeholderColor: '#9391f7',
    symbol: 'AAVE',
  },
  // placeholderColor distinct from brandColor -> kept
  {
    id: 'eth',
    name: 'Ether',
    brandColor: '#9391f7',
    placeholderColor: '#627eea',
    symbol: 'ETH',
  },
  // name with spaces + punctuation
  {
    id: 'pteusde',
    name: 'PT Ethena eUSDe',
    brandColor: '#6366F1',
    placeholderColor: '#6adfc2',
    symbol: 'PT_eUSDe',
  },
  // no brandColor, no placeholderColor
  { id: 'plain', name: 'Wrapped (v2)', symbol: 'PLN' },
  // brandColor present but placeholderColor absent (glyph has no single
  // dominant colour) -> must decode to placeholderColor UNSET, not brandColor
  { id: 'nodom', name: 'No Dominant', brandColor: '#abcdef', symbol: 'ND' },
]

const chainMetaRows: MetaRowInput[] = [
  {
    id: 'ethereum',
    name: 'Ethereum',
    brandColor: '#6281e3',
    placeholderColor: '#627eea',
    chainId: 1,
  },
]

const brandMetaRows: MetaRowInput[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    brandColor: '#3C3C3D',
    placeholderColor: '#d2c1b4',
  },
]

// The hand-built "current-format" equivalents the decoder must reproduce
// exactly (same keys present/absent per icon as the old object literal).
const expectedMeta: Record<IdentityKey, IconMeta> = {
  'token:aave': {
    id: 'aave',
    name: 'Aave',
    type: 'token',
    brandColor: '#9391f7',
    placeholderColor: '#9391f7',
    symbol: 'AAVE',
  },
  'token:eth': {
    id: 'eth',
    name: 'Ether',
    type: 'token',
    brandColor: '#9391f7',
    placeholderColor: '#627eea',
    symbol: 'ETH',
  },
  'token:pteusde': {
    id: 'pteusde',
    name: 'PT Ethena eUSDe',
    type: 'token',
    brandColor: '#6366F1',
    placeholderColor: '#6adfc2',
    symbol: 'PT_eUSDe',
  },
  'token:plain': {
    id: 'plain',
    name: 'Wrapped (v2)',
    type: 'token',
    symbol: 'PLN',
  },
  'token:nodom': {
    id: 'nodom',
    name: 'No Dominant',
    type: 'token',
    brandColor: '#abcdef',
    // placeholderColor intentionally absent — see the row above
    symbol: 'ND',
  },
  'chain:ethereum': {
    id: 'ethereum',
    name: 'Ethereum',
    type: 'chain',
    brandColor: '#6281e3',
    placeholderColor: '#627eea',
    chainId: 1,
  },
  'brand:metamask': {
    id: 'metamask',
    name: 'MetaMask',
    type: 'brand',
    brandColor: '#3C3C3D',
    placeholderColor: '#d2c1b4',
  },
}

describe('META codec round-trip', () => {
  it('decodes to the exact current-format object literal', () => {
    const encoded: Record<IconType, string> = {
      token: encodeMetaTable(tokenMetaRows),
      chain: encodeMetaTable(chainMetaRows),
      brand: encodeMetaTable(brandMetaRows),
    }
    expect(decodeMeta(encoded)).toEqual(expectedMeta)
  })

  it('decodes an empty type table to no entries', () => {
    expect(decodeMeta({ token: '', chain: '', brand: '' })).toEqual({})
  })

  it('rejects field values containing a reserved separator', () => {
    expect(() => encodeMetaTable([{ id: 'bad', name: 'a\x1Fb' }])).toThrow(
      /reserved separator/,
    )
    expect(() => encodeMetaTable([{ id: 'bad', name: 'a\x1Eb' }])).toThrow(
      /reserved separator/,
    )
  })
})

describe('aliases codec round-trip', () => {
  // Final generate-time typed maps INCLUDING self-keys + derived keys, as
  // buildIdentityIndexes would emit them. The encoder drops self-keys; the
  // decoder re-adds them.
  const tokenMap: Record<string, string> = {
    // many aliases for one id
    usdc: 'usdc',
    usdce: 'usdc',
    musdc: 'usdc',
    usdcn: 'usdc',
    // self-key only (empty alias list)
    aave: 'aave',
    // symbol-derived differing from id
    eth: 'eth',
    ether: 'eth',
  }
  const chainMap: Record<string, string> = {
    ethereum: 'ethereum',
    '1': 'ethereum', // chainId-derived
  }
  const brandMap: Record<string, string> = {
    metamask: 'metamask',
  }

  it('decodes to the exact current-format typed maps', () => {
    const encoded: Record<IconType, string> = {
      token: encodeAliasTable(tokenMap),
      chain: encodeAliasTable(chainMap),
      brand: encodeAliasTable(brandMap),
    }
    const decoded = decodeAliases(encoded)
    expect(decoded.token).toEqual(tokenMap)
    expect(decoded.chain).toEqual(chainMap)
    expect(decoded.brand).toEqual(brandMap)
  })

  it('always re-adds the id self-key even with no extra aliases', () => {
    const decoded = decodeAliases({
      token: encodeAliasTable({ aave: 'aave' }),
      chain: '',
      brand: '',
    })
    expect(decoded.token[normalizeAlias('aave')]).toBe('aave')
  })

  it('decodes an empty type table to an empty map', () => {
    const decoded = decodeAliases({ token: '', chain: '', brand: '' })
    expect(decoded).toEqual({ token: {}, chain: {}, brand: {} })
  })

  it('never registers an empty self-key for an id that normalizes to ""', () => {
    // An id that is entirely a date suffix canonicalizes to the empty
    // string. buildIdentityIndexes skips authored empty keys; the decoder
    // must skip the re-derived self-key the same way — otherwise ANY input
    // that normalizes to "" (punctuation, whitespace, emoji) resolves to
    // this asset.
    expect(normalizeAlias('31jul2025')).toBe('')
    const decoded = decodeAliases({
      token: '31jul2025',
      chain: '',
      brand: '',
    })
    expect(decoded.token['']).toBeUndefined()
    expect(Object.keys(decoded.token)).toEqual([])
  })
})
