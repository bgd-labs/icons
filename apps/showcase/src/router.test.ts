import { describe, expect, it } from 'vitest'
import { href, parseHash } from './router'

describe('hash routing', () => {
  it.each(['%', '%E0%A4%A', '%FF'])('handles malformed encoding %s', (id) => {
    expect(parseHash(`#/icon/token/${id}`)).toEqual({ name: 'gallery' })
  })

  it('round-trips encoded icon identifiers', () => {
    const route = { name: 'icon', type: 'token', id: 'a/b %' } as const
    expect(parseHash(href(route))).toEqual(route)
  })
})
