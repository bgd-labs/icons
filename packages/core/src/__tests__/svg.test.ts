import { describe, it, expect } from 'vitest'
import {
  getBrandSvg,
  getChainSvg,
  getSvg,
  getTokenSvg,
  getTypedSvg,
} from '../svg'
import { listIcons } from '../index'

describe('getTokenSvg', () => {
  it('returns an SVG string for a known token', () => {
    const svg = getTokenSvg('eth')
    expect(svg).not.toBeNull()
    expect(svg).toContain('<svg')
    expect(svg).toContain('viewBox="0 0 32 32"')
  })

  it('returns the mono variant', () => {
    const svg = getTokenSvg('eth', 'mono')
    expect(svg).not.toBeNull()
    expect(svg).toContain('currentColor')
  })

  it('returns null for unknown token', () => {
    expect(getTokenSvg('nonexistent_xyz')).toBeNull()
  })
})

describe('getChainSvg', () => {
  it('returns an SVG string for a known chain', () => {
    const svg = getChainSvg('ethereum')
    expect(svg).not.toBeNull()
    expect(svg).toContain('<svg')
  })

  it('returns null for unknown chain', () => {
    expect(getChainSvg('nonexistent_xyz')).toBeNull()
  })
})

describe('getBrandSvg', () => {
  it('returns an SVG string for a known brand', () => {
    const svg = getBrandSvg('metamask')
    expect(svg).not.toBeNull()
    expect(svg).toContain('<svg')
  })

  it('returns null for unknown brand', () => {
    expect(getBrandSvg('nonexistent_xyz')).toBeNull()
  })
})

describe('getSvg', () => {
  it('returns SVG for a token', () => {
    const svg = getSvg('eth')
    expect(svg).not.toBeNull()
    expect(svg).toContain('<svg')
  })

  it('returns SVG for a chain', () => {
    const svg = getSvg('ethereum')
    expect(svg).not.toBeNull()
    expect(svg).toContain('<svg')
  })

  it('returns SVG for a brand', () => {
    const svg = getSvg('metamask')
    expect(svg).not.toBeNull()
    expect(svg).toContain('<svg')
  })

  it('returns mono variant', () => {
    const svg = getSvg('eth', 'mono')
    expect(svg).not.toBeNull()
    expect(svg).toContain('currentColor')
  })

  it('returns null for unknown id', () => {
    expect(getSvg('nonexistent_xyz')).toBeNull()
  })
})

describe('getTypedSvg', () => {
  it('selects the type-specific SVG when the id is known', () => {
    expect(getTypedSvg('token', 'eth')).toEqual(getTokenSvg('eth'))
    expect(getTypedSvg('chain', 'ethereum')).toEqual(getChainSvg('ethereum'))
    expect(getTypedSvg('brand', 'metamask')).toEqual(getBrandSvg('metamask'))
  })

  it('returns null when the id does not exist in the requested type', () => {
    expect(getTypedSvg('chain', 'eth')).toBeNull()
    expect(getTypedSvg('token', 'metamask')).toBeNull()
  })
})

describe('alias acceptance', () => {
  it('getSvg accepts a semantic alias', () => {
    expect(getSvg('wbnb')).toEqual(getSvg('bnb'))
  })

  it('getSvg accepts a chainId number', () => {
    expect(getSvg(1)).toEqual(getSvg('ethereum'))
  })

  it('getSvg accepts a punctuated input', () => {
    expect(getSvg('PT-eUSDe')).toEqual(getSvg('pteusde'))
  })

  it('typed getters accept the same inputs as the typed resolvers', () => {
    expect(getTokenSvg('wbnb')).toEqual(getTokenSvg('bnb'))
    expect(getTokenSvg('wbnb')).not.toBeNull()
    expect(getChainSvg(1)).toEqual(getChainSvg('ethereum'))
    expect(getTypedSvg('token', 'PT-eUSDe')).toEqual(
      getTypedSvg('token', 'pteusde'),
    )
  })

  it('typed getters still reject inputs from other types', () => {
    expect(getTokenSvg('ethereum')).toBeNull()
    expect(getChainSvg('wbnb')).toBeNull()
  })
})

describe('META ↔ SVG consistency', () => {
  it('ships an SVG (both variants) for every META entry, and vice versa', () => {
    // The invariant most likely to break when the generator changes.
    for (const meta of listIcons()) {
      expect(
        getTypedSvg(meta.type, meta.id, 'full'),
        `${meta.type}:${meta.id} full`,
      ).not.toBeNull()
      expect(
        getTypedSvg(meta.type, meta.id, 'mono'),
        `${meta.type}:${meta.id} mono`,
      ).not.toBeNull()
    }
  })
})

describe('case insensitivity', () => {
  it('getTokenSvg handles uppercase input', () => {
    const lower = getTokenSvg('eth')
    const upper = getTokenSvg('ETH')
    expect(upper).toEqual(lower)
    expect(upper).not.toBeNull()
  })

  it('getTokenSvg handles mixed-case input', () => {
    const lower = getTokenSvg('eth')
    const mixed = getTokenSvg('Eth')
    expect(mixed).toEqual(lower)
  })

  it('getChainSvg handles uppercase input', () => {
    const lower = getChainSvg('ethereum')
    const upper = getChainSvg('ETHEREUM')
    expect(upper).toEqual(lower)
    expect(upper).not.toBeNull()
  })

  it('getBrandSvg handles uppercase input', () => {
    const lower = getBrandSvg('metamask')
    const upper = getBrandSvg('METAMASK')
    expect(upper).toEqual(lower)
    expect(upper).not.toBeNull()
  })

  it('getSvg handles uppercase input', () => {
    const lower = getSvg('eth')
    const upper = getSvg('ETH')
    expect(upper).toEqual(lower)
    expect(upper).not.toBeNull()
  })

  it('getSvg mono variant handles uppercase input', () => {
    const lower = getSvg('eth', 'mono')
    const upper = getSvg('ETH', 'mono')
    expect(upper).toEqual(lower)
    expect(upper).not.toBeNull()
  })
})
