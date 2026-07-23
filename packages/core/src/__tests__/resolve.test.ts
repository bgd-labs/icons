import { describe, it, expect } from 'vitest'
import {
  resolve,
  resolveBrand,
  resolveChain,
  resolveOrCandidate,
  resolveToken,
} from '../resolve'

describe('resolve', () => {
  it('resolves a known token alias', () => {
    const result = resolve('eth')
    expect(result).toEqual({ id: 'eth', type: 'token' })
  })

  it('resolves an alias to its canonical id', () => {
    const result = resolve('wbnb')
    expect(result).toEqual({ id: 'bnb', type: 'token' })
  })

  it('resolves case-insensitively', () => {
    expect(resolve('ETH')).toEqual(resolve('eth'))
  })

  it('returns null for unknown input', () => {
    expect(resolve('nonexistent_token_xyz')).toBeNull()
  })

  it('resolves a numeric chain ID', () => {
    const result = resolve(1)
    expect(result).not.toBeNull()
    expect(result!.type).toBe('chain')
  })

  it('resolves a chain name', () => {
    const result = resolve('ethereum')
    expect(result).toEqual({ id: 'ethereum', type: 'chain' })
  })

  it('supports typed resolution through options', () => {
    expect(resolve('metamask', { type: 'brand' })).toEqual({
      id: 'metamask',
      type: 'brand',
    })
  })

  it('treats punctuation- and case-equivalent inputs as the same alias', () => {
    // The id `pteusde` is the canonical normalised form of the symbol
    // `PT-eUSDe`. Callers shouldn't have to know that.
    const canonical = resolve('pteusde')
    expect(canonical).toEqual({ id: 'pteusde', type: 'token' })
    expect(resolve('PT-eUSDe')).toEqual(canonical)
    expect(resolve('pt_eusde')).toEqual(canonical)
    expect(resolve(' pt eusde ')).toEqual(canonical)
  })

  it('derives a numeric alias from every chain.chainId without per-asset config', () => {
    expect(resolve(1)).toEqual({ id: 'ethereum', type: 'chain' })
    expect(resolve('1')).toEqual({ id: 'ethereum', type: 'chain' })
  })

  it('treats an unknown type option as a miss, not a crash', () => {
    // TS confines `type` to IconType, but JS callers pass strings like
    // "tokens" (the asset-dir name). That must resolve to null — a throw
    // here propagates through resolveOrCandidate into <Icon> and unmounts
    // the consumer's tree.
    const bogus = { type: 'tokens' as never }
    expect(resolve('eth', bogus)).toBeNull()
    expect(resolveOrCandidate('eth', bogus)).toEqual({
      id: 'eth',
      type: 'tokens',
      matched: false,
    })
  })
})

describe('resolveOrCandidate', () => {
  it('returns the resolved Identity with matched: true on a hit', () => {
    expect(resolveOrCandidate('wbnb')).toEqual({
      id: 'bnb',
      type: 'token',
      matched: true,
    })
  })

  it('returns a candidate identity with matched: false on a miss', () => {
    const candidate = resolveOrCandidate('Definitely-Not-Bundled_99')
    expect(candidate).toEqual({
      id: 'definitelynotbundled99',
      matched: false,
    })
    expect(candidate.type).toBeUndefined()
  })

  it('keeps the caller-constrained type on a candidate', () => {
    expect(resolveOrCandidate('not-a-real-chain', { type: 'chain' })).toEqual({
      id: 'notarealchain',
      type: 'chain',
      matched: false,
    })
  })

  it('respects typed resolution on a hit', () => {
    expect(resolveOrCandidate('ethereum', { type: 'chain' })).toEqual({
      id: 'ethereum',
      type: 'chain',
      matched: true,
    })
  })

  it('normalises candidates with the same mechanical-alias rule as hits', () => {
    // A hit and a miss of the same shape go through one normalisation rule
    const hit = resolveOrCandidate('PT-eUSDe')
    const miss = resolveOrCandidate('PT-eUSDe-Unknown')
    expect(hit).toEqual({ id: 'pteusde', type: 'token', matched: true })
    expect(miss.id).toBe('pteusdeunknown')
  })

  it('yields an empty candidate id for input that canonicalizes to empty', () => {
    // A pure date-shaped input is entirely consumed by the maturity-date rule.
    // The contract is: empty candidate id, matched false, and NO throw — a new
    // over-stripping canonical rule would surface here rather than silently
    // turning whole input families into empty candidates.
    const c = resolveOrCandidate('31JUL2025')
    expect(c.id).toBe('')
    expect(c.matched).toBe(false)
    expect(c.type).toBeUndefined()
  })
})

describe('typed resolvers', () => {
  it('resolveToken stays within the token namespace', () => {
    expect(resolveToken('eth')).toEqual({ id: 'eth', type: 'token' })
    expect(resolveToken('ethereum')).toBeNull()
  })

  it('resolveChain accepts both the slug and the chainId', () => {
    expect(resolveChain('ethereum')).toEqual({ id: 'ethereum', type: 'chain' })
    expect(resolveChain(1)).toEqual({ id: 'ethereum', type: 'chain' })
  })

  it('resolveBrand resolves brand-only keys', () => {
    expect(resolveBrand('metamask')).toEqual({ id: 'metamask', type: 'brand' })
    expect(resolveBrand('eth')).toBeNull()
  })
})
