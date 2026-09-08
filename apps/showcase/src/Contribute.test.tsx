// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'

const { reset } = vi.hoisted(() => ({ reset: vi.fn() }))
vi.mock('@marsidev/react-turnstile', async () => {
  const { forwardRef, useImperativeHandle } = await import('react')
  return {
    Turnstile: forwardRef(
      ({ onSuccess }: { onSuccess: (token: string) => void }, ref) => {
        useImperativeHandle(ref, () => ({ reset }))
        return (
          <button onClick={() => onSuccess(`token-${reset.mock.calls.length}`)}>
            Verify
          </button>
        )
      },
    ),
  }
})

vi.stubEnv('VITE_SUBMIT_ENDPOINT', 'https://submit.example.com')
vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'test-key')
const { default: Contribute } = await import('./Contribute')
afterAll(() => vi.unstubAllEnvs())
afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('contribution form retries', () => {
  it.each([422, 502, 'network'] as const)(
    'requires a fresh token after %s failure',
    async (failure) => {
      vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
      const fetch = vi
        .fn()
        .mockImplementationOnce(() =>
          failure === 'network'
            ? Promise.reject(new Error('Offline'))
            : Promise.resolve(
                Response.json({ error: 'Try again' }, { status: failure }),
              ),
        )
        .mockResolvedValue(Response.json({ prUrl: 'https://example.com/pr/1' }))
      vi.stubGlobal('fetch', fetch)
      const container = document.createElement('div')
      document.body.appendChild(container)
      const root = createRoot(container)
      try {
        await act(async () => root.render(<Contribute />))
        for (const [placeholder, value] of [
          ['usdc', 'example'],
          ['USD Coin', 'Example'],
          ['USDC', 'EX'],
        ]) {
          const input = [
            ...container.querySelectorAll<HTMLInputElement>('input'),
          ].find((input) => input.getAttribute('placeholder') === placeholder)!
          await act(async () => {
            Object.getOwnPropertyDescriptor(
              HTMLInputElement.prototype,
              'value',
            )!.set!.call(input, value)
            input.dispatchEvent(new Event('input', { bubbles: true }))
          })
        }
        for (const input of container.querySelectorAll<HTMLInputElement>(
          'input[type="file"]',
        )) {
          Object.defineProperty(input, 'files', {
            value: [
              {
                name: 'example.svg',
                text: async () =>
                  '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="8" fill="currentColor"/></svg>',
              },
            ],
          })
          await act(async () => {
            input.dispatchEvent(new Event('change', { bubbles: true }))
          })
        }
        const button = (text: string) =>
          [...container.querySelectorAll('button')].find(
            (b) => b.textContent === text,
          )!
        const submit = button('Submit for review')
        expect(submit.disabled).toBe(true)
        await act(async () => button('Verify').click())
        expect(submit.disabled).toBe(false)
        await act(async () => submit.click())
        expect(reset).toHaveBeenCalledOnce()
        expect(submit.disabled).toBe(true)
        await act(async () => button('Verify').click())
        expect(submit.disabled).toBe(false)
        await act(async () => submit.click())
        expect(fetch).toHaveBeenCalledTimes(2)
        expect(JSON.parse(fetch.mock.calls[0][1].body).turnstileToken).toBe(
          'token-0',
        )
        expect(JSON.parse(fetch.mock.calls[1][1].body).turnstileToken).toBe(
          'token-1',
        )
        expect(container.textContent).toContain('Submitted')
      } finally {
        await act(async () => root.unmount())
        container.remove()
      }
    },
  )
})
