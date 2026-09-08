/// <reference types="node" />
import { Buffer } from 'node:buffer'
import { generateKeyPairSync, verify } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConflictError, createAppJwt, openPr } from '../src/github'

afterEach(() => vi.unstubAllGlobals())

describe('GitHub App keys', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  })

  it.each(['pkcs1', 'pkcs8'] as const)(
    'signs valid JWTs using %s PEM',
    async (type) => {
      const pem = privateKey.export({ format: 'pem', type }).toString()
      for (const key of [pem, pem.replace(/\n/g, '\\n')]) {
        const jwt = await createAppJwt('123', key)
        const [header, payload, signature] = jwt.split('.')
        expect(
          verify(
            'RSA-SHA256',
            Buffer.from(`${header}.${payload}`),
            publicKey,
            Buffer.from(signature, 'base64url'),
          ),
        ).toBe(true)
        expect(
          JSON.parse(Buffer.from(payload, 'base64url').toString()).iss,
        ).toBe('123')
      }
    },
  )
})

describe('contribution retries', () => {
  const input = {
    owner: 'owner',
    repo: 'icons',
    branch: 'contribute/token-example',
    title: 'Add Example',
    body: 'Example contribution',
    files: [
      { path: 'assets/tokens/example.json', content: '{"name":"Éxample"}\n' },
    ],
    conflictPaths: ['assets/tokens/example.json'],
  }

  function github({
    mismatch = false,
    state = '',
    failPr = false,
    refExists = true,
  } = {}) {
    let branchExists = false
    let prExists = state !== ''
    let fail = failPr
    const fetch = vi.fn(async (url: string, init: RequestInit) => {
      const { pathname: path, searchParams } = new URL(url)
      const method = init.method
      const response = (body: unknown, status = 200) =>
        Response.json(body, { status })
      if (path.includes('/contents/')) {
        if (searchParams.get('ref') === 'main') return response({}, 404)
        return response({
          encoding: 'base64',
          content: Buffer.from(
            mismatch ? 'different' : input.files[0].content,
          ).toString('base64'),
        })
      }
      if (path.endsWith('/git/ref/heads/main'))
        return response({ object: { sha: 'base' } })
      if (path.includes('/git/ref/heads/contribute/'))
        return response({ object: { sha: 'commit' } }, refExists ? 200 : 404)
      if (path.endsWith('/git/commits/base'))
        return response({ tree: { sha: 'base-tree' } })
      if (path.endsWith('/git/refs')) {
        if (branchExists || state || mismatch || !refExists)
          return response({}, 422)
        branchExists = true
        return response({})
      }
      if (path.endsWith('/pulls')) {
        if (method === 'GET')
          return response(
            prExists
              ? [
                  {
                    state: state || 'open',
                    html_url: 'https://example.com/pr/1',
                  },
                ]
              : [],
          )
        if (fail) {
          fail = false
          return response({}, 503)
        }
        prExists = true
        return response({ html_url: 'https://example.com/pr/1' })
      }
      return response({ sha: 'created' })
    })
    vi.stubGlobal('fetch', fetch)
    return fetch
  }

  it('recovers after PR creation fails, then returns the existing PR on another retry', async () => {
    const fetch = github({ failPr: true })
    await expect(openPr(input, 'token')).rejects.toThrow('503')
    await expect(openPr(input, 'token')).resolves.toBe(
      'https://example.com/pr/1',
    )
    await expect(openPr(input, 'token')).resolves.toBe(
      'https://example.com/pr/1',
    )
    expect(
      fetch.mock.calls.filter(
        ([url, init]) => url.endsWith('/pulls') && init.method === 'POST',
      ),
    ).toHaveLength(2)
    expect(
      fetch.mock.calls.some(
        ([, init]) => init.method === 'PATCH' || init.method === 'DELETE',
      ),
    ).toBe(false)
  })

  it('rejects retries with different file contents', async () => {
    const fetch = github({ mismatch: true })
    await expect(openPr(input, 'token')).rejects.toBeInstanceOf(ConflictError)
    expect(
      fetch.mock.calls.some(
        ([url, init]) => url.endsWith('/pulls') && init.method === 'POST',
      ),
    ).toBe(false)
  })

  it('does not reopen a reviewed contribution', async () => {
    github({ state: 'closed' })
    await expect(openPr(input, 'token')).rejects.toThrow('already reviewed')
  })

  it('does not misclassify unrelated ref validation failures as existing contributions', async () => {
    github({ refExists: false })
    await expect(openPr(input, 'token')).rejects.toThrow('422')
  })
})
