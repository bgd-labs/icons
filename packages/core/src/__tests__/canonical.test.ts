import { describe, expect, it } from 'vitest'
import { canonicalize } from '../internal/canonical'
import {
  buildIdentityIndexes,
  lookupIdentity,
  normalizeAlias,
} from '../internal/identity'

describe('canonicalize', () => {
  it('strips a trailing maturity date to the stable stem', () => {
    expect(canonicalize('ptusde31jul2025')).toBe('ptusde')
    expect(canonicalize('pteusde29may2025')).toBe('pteusde')
    expect(canonicalize('pteusde14aug2025')).toBe('pteusde')
    expect(canonicalize('ptsrusde2apr2026')).toBe('ptsrusde')
    expect(canonicalize('ptusde15jan2026')).toBe('ptusde')
  })

  it('is idempotent (no date left to strip)', () => {
    expect(canonicalize(canonicalize('ptusde31jul2025'))).toBe('ptusde')
  })

  it('leaves real tokens that merely resemble the shape untouched', () => {
    // No 3-letter month -> not a date, never trimmed.
    for (const id of ['aave', 'ampl', 'aethx', 'usdc', 'eth', 'pteusde']) {
      expect(canonicalize(id)).toBe(id)
    }
    // Trailing digits without a month name are not dates.
    expect(canonicalize('token2025')).toBe('token2025')
    expect(canonicalize('uni3')).toBe('uni3')
  })
})

describe('normalizeAlias + canonicalization', () => {
  it('collapses every spelling/maturity of a PT family to one key', () => {
    const keys = [
      'PT-USDe-31JUL2025',
      'PT-USDe-25SEP2025',
      'PT-USDe-9APR2026', // a maturity nobody enumerated
      'pt_usde_27nov2025',
    ].map((s) => normalizeAlias(s))
    expect(new Set(keys)).toEqual(new Set(['ptusde']))
  })

  it('resolves a never-seen future maturity through one authored alias', () => {
    // Author writes a single `ptusde` alias on the base icon; every dated
    // form normalises onto it — including maturities minted after release.
    const indexes = buildIdentityIndexes([
      {
        type: 'token',
        id: 'pteusde',
        symbol: 'PT-eUSDe',
        aliases: ['ptusde'],
      },
    ])
    const hit = lookupIdentity('PT-USDe-7MAY2026', indexes)
    expect(hit).toEqual({ id: 'pteusde', type: 'token' })
    // The base id with its own future maturity resolves with no alias at all.
    expect(lookupIdentity('PT-eUSDe-14AUG2025', indexes)).toEqual({
      id: 'pteusde',
      type: 'token',
    })
  })
})
