import { describe, expect, it } from 'vitest'
import { parsePayload } from '../src/payload.ts'
import type { ContributePayload } from '../src/payload.ts'
import {
  buildContribution,
  formatJsonPrettier,
  formatMetadataJson,
} from '../src/validate.ts'

const SVG_NS = 'http://www.w3.org/2000/svg'

const goodFull = `<svg xmlns="${SVG_NS}" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#2775ca"/><path fill="#ffffff" d="M10 10h12v12H10z"/></svg>`
const goodMono = `<svg xmlns="${SVG_NS}" viewBox="0 0 32 32"><path fill="currentColor" d="M10 10h12v12H10z"/></svg>`

function payload(overrides: Record<string, unknown> = {}) {
  return {
    type: 'token',
    id: 'usdc',
    name: 'USD Coin',
    symbol: 'USDC',
    aliases: ['USDC.e'],
    fullSvg: goodFull,
    monoSvg: goodMono,
    ...overrides,
  }
}

describe('parsePayload', () => {
  it('accepts a valid token payload', () => {
    const { payload: p, error } = parsePayload(payload())
    expect(error).toBeUndefined()
    expect(p?.id).toBe('usdc')
    expect(p?.symbol).toBe('USDC')
  })

  it('normalizes id to lowercase', () => {
    const { payload: p } = parsePayload(payload({ id: 'USDC' }))
    expect(p?.id).toBe('usdc')
  })

  it.each([
    ['rejects non-alphanumeric id', { id: 'us-dc' }, 'id'],
    ['rejects empty id', { id: '' }, 'id'],
    ['rejects missing name', { name: '' }, 'name'],
    ['rejects token without symbol', { symbol: '' }, 'symbol'],
    ['rejects bad brandColor', { brandColor: 'red' }, 'brandColor'],
    ['rejects bad type', { type: 'nft' }, 'type'],
  ])('%s', (_label, override, field) => {
    const { error } = parsePayload(payload(override as Record<string, unknown>))
    expect(error).toContain(field)
  })

  it('requires chainId for chains', () => {
    const { error } = parsePayload(
      payload({ type: 'chain', symbol: undefined, chainId: undefined }),
    )
    expect(error).toContain('chainId')
  })

  it('accepts a valid chain payload', () => {
    const { payload: p, error } = parsePayload(
      payload({ type: 'chain', symbol: undefined, chainId: 1 }),
    )
    expect(error).toBeUndefined()
    expect(p?.chainId).toBe(1)
  })

  it('rejects non-SVG content', () => {
    const { error } = parsePayload(payload({ fullSvg: 'not an svg' }))
    expect(error).toContain('fullSvg')
  })

  it('filters empty aliases', () => {
    const { payload: p } = parsePayload(payload({ aliases: ['a', ' ', ''] }))
    expect(p?.aliases).toEqual(['a'])
  })
})

describe('buildContribution', () => {
  function valid(overrides: Partial<ContributePayload> = {}) {
    const { payload: p, error } = parsePayload(payload())
    if (!p) throw new Error(error)
    return buildContribution({ ...p, ...overrides })
  }

  it('produces optimized svgs, metadata, and a changeset', () => {
    const { files, errors } = valid()
    expect(errors).toEqual([])
    expect(files?.fullSvg).toContain('viewBox="0 0 32 32"')
    expect(files?.monoSvg).toContain('currentColor')
    expect(files?.metadataJson).toBe(
      '{\n  "symbol": "USDC",\n  "name": "USD Coin",\n  "aliases": ["USDC.e"]\n}\n',
    )
    expect(files?.changeset).toBe(
      "---\n'@bgd-labs/icons': patch\n'@bgd-labs/icons-react': patch\n---\n\nAdd USD Coin (USDC) token icon.\n",
    )
  })

  it('prefixes ids through SVGO (no cross-icon collisions)', () => {
    const withClip = `<svg xmlns="${SVG_NS}" viewBox="0 0 32 32"><defs><clipPath id="c"><path d="M0 0h32v32H0z"/></clipPath></defs><g clip-path="url(#c)"><circle cx="16" cy="16" r="16" fill="#2775ca"/></g></svg>`
    const { files, errors } = valid({ fullSvg: withClip })
    expect(errors).toEqual([])
    expect(files?.fullSvg).toContain('id="usdc_full__c"')
    expect(files?.fullSvg).toContain('url(#usdc_full__c)')
  })

  it('rejects a wrong viewBox', () => {
    const { errors } = valid({
      fullSvg: goodFull.replace('0 0 32 32', '0 0 24 24'),
    })
    expect(errors.join()).toContain('0 0 24 24')
  })

  it('rejects forbidden elements', () => {
    const { errors } = valid({
      fullSvg: goodFull.replace('</svg>', '<script>alert(1)</script></svg>'),
    })
    expect(errors.join()).toContain('<script>')
  })

  it('rejects non-fragment hrefs', () => {
    const { errors } = valid({
      fullSvg: goodFull.replace(
        '</svg>',
        '<a href="https://evil.example/x"><path d="M1 1h2v2H1z"/></a></svg>',
      ),
    })
    expect(errors.join()).toContain('href')
  })

  it('auto-fixes hardcoded mono colors to currentColor', () => {
    // Non-default colors: SVGO strips fill values equal to the SVG default
    // (black) before the color check, so use colors it keeps.
    const hardcoded = `<svg xmlns="${SVG_NS}" viewBox="0 0 32 32"><path fill="#1a1a1a" d="M6 6h20v20H6z"/><path fill="navy" d="M10 10h12v12H10z"/></svg>`
    const { files, fixes, errors } = valid({ monoSvg: hardcoded })
    expect(errors).toEqual([])
    expect(files?.monoSvg).toContain('currentColor')
    expect(files?.monoSvg).not.toContain('#1a1a1a')
    expect(fixes.some((f) => f.includes('currentColor'))).toBe(true)
  })

  it('rejects a mono svg whose fills SVGO strips to default-black', () => {
    // fill="black" IS the SVG default, so SVGO removes the attribute — no
    // currentColor remains and the icon would not recolor. `pnpm validate`
    // rejects this the same way; the art must be authored with currentColor.
    const black = `<svg xmlns="${SVG_NS}" viewBox="0 0 32 32"><path fill="#000000" d="M6 6h20v20H6z"/></svg>`
    const { errors } = valid({ monoSvg: black })
    expect(errors.join()).toContain('currentColor')
  })

  it('rejects a mono svg that ends up without currentColor', () => {
    const noPaint = `<svg xmlns="${SVG_NS}" viewBox="0 0 32 32"><path fill="none" d="M10 10h12v12H10z"/></svg>`
    const { errors } = valid({ monoSvg: noPaint })
    expect(errors.join()).toContain('currentColor')
  })

  it('collects errors from both svgs at once', () => {
    const bad = goodFull.replace('0 0 32 32', '0 0 24 24')
    const { errors } = valid({ fullSvg: bad, monoSvg: bad })
    expect(errors.some((e) => e.includes('usdc_full'))).toBe(true)
    expect(errors.some((e) => e.includes('usdc_mono'))).toBe(true)
  })
})

describe('formatMetadataJson', () => {
  const base = parsePayload(payload()).payload!

  it('orders fields like existing assets', () => {
    const json = formatMetadataJson({ ...base, brandColor: '#3e73c2' })
    expect(json).toBe(
      '{\n  "symbol": "USDC",\n  "name": "USD Coin",\n  "brandColor": "#3e73c2",\n  "aliases": ["USDC.e"]\n}\n',
    )
  })

  it('writes chain metadata', () => {
    const json = formatMetadataJson({
      ...base,
      type: 'chain',
      symbol: undefined,
      chainId: 1,
      aliases: [],
    })
    expect(json).toBe('{\n  "name": "USD Coin",\n  "chainId": 1\n}\n')
  })
})

describe('formatJsonPrettier', () => {
  it('keeps short arrays inline (prettier-compatible)', () => {
    expect(formatJsonPrettier({ aliases: ['a', 'b'] })).toBe(
      '{\n  "aliases": ["a", "b"]\n}',
    )
  })

  it('wraps long arrays one-per-line (prettier-compatible)', () => {
    const aliases = Array.from({ length: 8 }, (_, i) => `alias-number-${i}`)
    const out = formatJsonPrettier({ aliases })
    expect(out).toContain('"aliases": [\n')
    expect(out).toContain('    "alias-number-0",\n')
  })
})
