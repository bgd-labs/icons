import { describe, expect, it } from 'vitest'
import {
  buildGlobalAliases,
  buildIdentityIndexes,
  identityKey,
  lookupIdentity,
  lookupMeta,
  normalizeAlias,
  toIdCandidate,
} from '../internal/identity'
import { resolve } from '../resolve'
import { TYPE_ALIASES } from '../generated/aliases'
import type { IconMeta } from '../types'

describe('identity', () => {
  it('normalises aliases and unknown id candidates with the same rule', () => {
    expect(normalizeAlias('PT-eUSDe')).toBe('pteusde')
    expect(normalizeAlias(' pt_eusde ')).toBe('pteusde')
    expect(normalizeAlias(1)).toBe('1')
    expect(toIdCandidate('PT-eUSDe-New')).toBe('pteusdenew')
  })

  it('creates composite identity keys', () => {
    expect(identityKey({ type: 'token', id: 'celo' })).toBe('token:celo')
    expect(identityKey({ type: 'chain', id: 'celo' })).toBe('chain:celo')
  })

  it('builds token-first aliases and typed alias indexes', () => {
    const indexes = buildIdentityIndexes([
      {
        type: 'chain',
        id: 'celo',
        chainId: 42220,
        aliases: ['CELO'],
      },
      {
        type: 'token',
        id: 'celo',
        symbol: 'CELO',
      },
      {
        type: 'brand',
        id: 'metamask',
        aliases: ['Meta Mask'],
      },
    ])

    expect(indexes.aliases.celo).toEqual({ id: 'celo', type: 'token' })
    expect(indexes.typeAliases.chain['42220']).toBe('celo')
    expect(indexes.typeAliases.brand.metamask).toBe('metamask')
    expect(indexes.warnings).toContain(
      '"celo" -> chain:celo dropped (already maps to token:celo)',
    )
  })

  it('looks up identities through global and typed indexes', () => {
    const indexes = buildIdentityIndexes([
      {
        type: 'token',
        id: 'bnb',
        symbol: 'BNB',
        aliases: ['wbnb'],
      },
      {
        type: 'chain',
        id: 'ethereum',
        chainId: 1,
      },
    ])

    expect(lookupIdentity('wbnb', indexes)).toEqual({
      id: 'bnb',
      type: 'token',
    })
    expect(lookupIdentity(1, indexes)).toEqual({
      id: 'ethereum',
      type: 'chain',
    })
    expect(lookupIdentity('ethereum', indexes, { type: 'token' })).toBeNull()
    expect(lookupIdentity(1, indexes, { type: 'chain' })).toEqual({
      id: 'ethereum',
      type: 'chain',
    })
  })

  it('skips aliases that normalise to an empty string', () => {
    const indexes = buildIdentityIndexes([
      {
        type: 'token',
        id: 'usdt',
        symbol: 'USDT',
        aliases: ['₮'],
      },
    ])

    expect(indexes.aliases['']).toBeUndefined()
    expect(indexes.typeAliases.token['']).toBeUndefined()
    expect(indexes.warnings).toContain(
      'token:usdt has an alias that normalises to an empty string — skipped',
    )
  })

  it('derives the cross-type map from typed maps with token-first precedence', () => {
    const built = buildIdentityIndexes([
      { type: 'chain', id: 'celo', chainId: 42220 },
      { type: 'token', id: 'celo', symbol: 'CELO' },
    ])
    const derived = buildGlobalAliases(built.typeAliases)

    expect(derived).toEqual(built.aliases)
    expect(derived.celo).toEqual({ id: 'celo', type: 'token' })
  })

  it('round-trips every shipped alias through resolve', () => {
    // Run the invariant over the real generated data, not a fixture: every
    // typed alias must resolve, both typed and untyped, with no dead keys.
    for (const [type, map] of Object.entries(TYPE_ALIASES)) {
      for (const [alias, id] of Object.entries(map)) {
        expect(alias).not.toBe('')
        expect(
          resolve(alias, { type: type as keyof typeof TYPE_ALIASES }),
          `${type} alias "${alias}"`,
        ).toEqual({ id, type })
        expect(resolve(alias), `global alias "${alias}"`).not.toBeNull()
      }
    }
  })

  it('returns null rather than matching garbage against empty keys', () => {
    expect(resolve('!!!')).toBeNull()
    expect(resolve('')).toBeNull()
    expect(resolve('   ')).toBeNull()
  })

  it('looks up metadata by Identity', () => {
    const meta: Record<string, IconMeta> = {
      'token:eth': {
        id: 'eth',
        name: 'Ether',
        type: 'token',
        symbol: 'ETH',
      },
    }

    expect(lookupMeta({ type: 'token', id: 'eth' }, meta)?.name).toBe('Ether')
    expect(lookupMeta({ type: 'chain', id: 'eth' }, meta)).toBeNull()
  })
})
