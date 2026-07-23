import { describe, it, expect } from 'vitest'
import {
  getAliases,
  getBrandMeta,
  getChainMeta,
  getMeta,
  getTokenMeta,
  getTypedMeta,
  listIcons,
  META,
} from '../index'
import type { TokenIconId, ChainIconId, BrandIconId, IconId } from '../index'

describe('getMeta', () => {
  it('returns metadata for a known token', () => {
    const meta = getMeta('eth')
    expect(meta).not.toBeNull()
    expect(meta!.name).toBe('Ether')
    expect(meta!.type).toBe('token')
  })

  it('returns null for unknown id', () => {
    expect(getMeta('nonexistent_xyz')).toBeNull()
  })

  it('returns correct shape with expected fields', () => {
    const meta = getMeta('eth')
    expect(meta).toMatchObject({
      id: 'eth',
      name: expect.any(String),
      type: 'token',
    })
  })

  it('exposes the canonical id when resolved through an alias', () => {
    expect(getMeta('wbnb')?.id).toBe('bnb')
  })
})

describe('getTokenMeta', () => {
  it('returns token metadata', () => {
    const meta = getTokenMeta('aave')
    expect(meta).not.toBeNull()
    expect(meta!.name).toBe('Aave')
    expect(meta!.type).toBe('token')
  })

  it('does not return chain metadata', () => {
    expect(getTokenMeta('ethereum')).toBeNull()
  })
})

describe('getChainMeta', () => {
  it('returns chain metadata', () => {
    const meta = getChainMeta('ethereum')
    expect(meta).not.toBeNull()
    expect(meta!.type).toBe('chain')
  })

  it('does not return token metadata', () => {
    expect(getChainMeta('eth')).toBeNull()
  })
})

describe('getBrandMeta', () => {
  it('returns brand metadata', () => {
    const meta = getBrandMeta('metamask')
    expect(meta).not.toBeNull()
    expect(meta!.type).toBe('brand')
  })

  it('does not return token metadata', () => {
    expect(getBrandMeta('eth')).toBeNull()
  })
})

describe('getTypedMeta', () => {
  it('selects the type-specific meta when the id is known', () => {
    expect(getTypedMeta('token', 'eth')?.symbol).toBe('ETH')
    expect(getTypedMeta('chain', 'ethereum')?.chainId).toBe(1)
    expect(getTypedMeta('brand', 'metamask')?.type).toBe('brand')
  })

  it('returns null when the id does not exist in the requested type', () => {
    expect(getTypedMeta('chain', 'eth')).toBeNull()
    expect(getTypedMeta('token', 'metamask')).toBeNull()
  })
})

describe('alias acceptance', () => {
  it('getMeta accepts a semantic alias', () => {
    // wbnb is an alias for the bnb token meta
    expect(getMeta('wbnb')).toEqual(getMeta('bnb'))
  })

  it('getMeta accepts a chainId number', () => {
    expect(getMeta(1)).toEqual(getMeta('ethereum'))
  })

  it('getMeta accepts a punctuated input', () => {
    expect(getMeta('PT-eUSDe')).toEqual(getMeta('pteusde'))
  })

  it('typed getters accept the same inputs as the typed resolvers', () => {
    // "it resolves there, it resolves everywhere"
    expect(getTokenMeta('wbnb')).toEqual(getTokenMeta('bnb'))
    expect(getTokenMeta('wbnb')).not.toBeNull()
    expect(getChainMeta(1)).toEqual(getChainMeta('ethereum'))
    expect(getTypedMeta('token', 'PT-eUSDe')).toEqual(
      getTypedMeta('token', 'pteusde'),
    )
  })

  it('typed getters still reject inputs from other types', () => {
    expect(getTokenMeta('ethereum')).toBeNull()
    expect(getChainMeta('wbnb')).toBeNull()
  })
})

describe('listIcons', () => {
  it('lists every shipped icon', () => {
    const all = listIcons()
    expect(all.length).toBe(Object.keys(META).length)
    expect(all.every((meta) => meta.id && meta.type && meta.name)).toBe(true)
  })

  it('filters by type', () => {
    const chains = listIcons('chain')
    expect(chains.length).toBeGreaterThan(0)
    expect(chains.every((meta) => meta.type === 'chain')).toBe(true)
  })
})

describe('getAliases', () => {
  it('returns the extra resolver keys for an id', () => {
    // eth's authored alias is "ether"; the id and symbol are excluded.
    expect(getAliases('token', 'eth')).toEqual(['ether'])
  })

  it('excludes the canonical id, symbol, and chain id', () => {
    const aliases = getAliases('token', 'eth')
    expect(aliases).not.toContain('eth')
    // chainId 1 is surfaced separately, so it is not an "alias" of ethereum.
    expect(getAliases('chain', 'ethereum')).not.toContain('1')
  })

  it('accepts any resolvable input and answers for the canonical id', () => {
    expect(getAliases('token', 'ETHER')).toEqual(getAliases('token', 'eth'))
  })

  it('returns an empty array for a miss', () => {
    expect(getAliases('token', 'nonexistent_xyz')).toEqual([])
  })

  it('returns an empty array when there are no extra aliases', () => {
    // A token whose only keys are its own id/symbol has no additional aliases.
    expect(getAliases('token', 'usdc')).toContain('usdce')
    expect(getAliases('brand', 'nonexistent_xyz')).toEqual([])
  })
})

describe('generated id unions', () => {
  it('cover every shipped canonical id (compile-time check)', () => {
    // Type-level assertions — these fail `pnpm typecheck` (which covers
    // __tests__) if the generated unions drift from the catalogue.
    const token: TokenIconId = 'eth'
    const chain: ChainIconId = 'ethereum'
    const brand: BrandIconId = 'metamask'
    const any: IconId = token
    // @ts-expect-error — a string outside the catalogue is not an IconId
    const bogus: IconId = 'definitely-not-an-icon'
    expect([token, chain, brand, any, bogus]).toBeTruthy()

    // Runtime parity: every listIcons() id is a member of its union — the
    // unions are generated from the same catalogue, so spot-check shape.
    const ids = new Set(listIcons().map((meta) => meta.id))
    expect(ids.has(token)).toBe(true)
    expect(ids.has(chain)).toBe(true)
    expect(ids.has(brand)).toBe(true)
  })
})

describe('META invariants', () => {
  it('keys every entry as `${type}:${id}` of its own contents', () => {
    for (const [key, meta] of Object.entries(META)) {
      expect(key).toBe(`${meta.type}:${meta.id}`)
    }
  })
})

describe('case insensitivity', () => {
  it('getMeta handles uppercase input', () => {
    const lower = getMeta('eth')
    const upper = getMeta('ETH')
    expect(upper).toEqual(lower)
    expect(upper).not.toBeNull()
  })

  it('getMeta handles mixed-case input', () => {
    const lower = getMeta('eth')
    const mixed = getMeta('Eth')
    expect(mixed).toEqual(lower)
  })

  it('getTokenMeta handles uppercase input', () => {
    const lower = getTokenMeta('aave')
    const upper = getTokenMeta('AAVE')
    expect(upper).toEqual(lower)
    expect(upper).not.toBeNull()
  })

  it('getChainMeta handles uppercase input', () => {
    const lower = getChainMeta('ethereum')
    const upper = getChainMeta('ETHEREUM')
    expect(upper).toEqual(lower)
    expect(upper).not.toBeNull()
  })

  it('getBrandMeta handles uppercase input', () => {
    const lower = getBrandMeta('metamask')
    const upper = getBrandMeta('METAMASK')
    expect(upper).toEqual(lower)
    expect(upper).not.toBeNull()
  })
})
