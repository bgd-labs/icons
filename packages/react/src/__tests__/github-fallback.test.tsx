// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, waitFor } from '@testing-library/react'

// github-fallback.tsx owns a module-level cache (FIFO + negative-cache TTL),
// an in-flight dedupe map and content memoisation. All of that state is
// process-global, so every test must start from a clean module graph:
// vi.resetModules() + a fresh dynamic import gives each test its own cache.
// IconProvider is re-imported from the SAME freshly-loaded graph so the
// React context instance the fallback reads from matches the one we render.
type GithubFallbackModule = typeof import('../github-fallback')
type IconProviderModule = typeof import('../icon-provider')
type IndexModule = typeof import('../index')

interface FreshModules {
  GithubFallback: GithubFallbackModule['GithubFallback']
  IconProvider: IconProviderModule['IconProvider']
}

async function loadFresh(): Promise<FreshModules> {
  vi.resetModules()
  const fallbackMod = await import('../github-fallback')
  const providerMod = await import('../icon-provider')
  return {
    GithubFallback: fallbackMod.GithubFallback,
    IconProvider: providerMod.IconProvider,
  }
}

const BASE = 'https://icons.test'
const BRANCH = 'main'

function svg(viewBox = '0 0 40 40', fill = '#abcdef'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><circle cx="8" cy="8" r="8" fill="${fill}"/></svg>`
}

function okResponse(text: string) {
  return { ok: true, status: 200, text: async () => text }
}

function notFoundResponse() {
  return { ok: false, status: 404, text: async () => 'Not Found' }
}

// Render a fallback inside a fresh provider. `Comp`/`Provider` come from
// loadFresh() so the context wiring is internally consistent.
function renderFallback(
  { GithubFallback, IconProvider }: FreshModules,
  props: Record<string, unknown>,
  providerProps: Record<string, unknown> = {},
) {
  return render(
    <IconProvider
      baseUrl={BASE}
      branch={BRANCH}
      enableFallback
      {...providerProps}
    >
      <GithubFallback {...(props as { id: string })} />
    </IconProvider>,
  )
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('GithubFallback — rendering', () => {
  it('renders the fetched SVG: wrapper svg with fetched viewBox, aria-label from rawValue, size', async () => {
    const mods = await loadFresh()
    const fetchSpy = vi.fn().mockResolvedValue(okResponse(svg('0 0 48 48')))
    vi.stubGlobal('fetch', fetchSpy)

    const { container } = renderFallback(mods, {
      id: 'asset-a',
      iconType: 'token',
      rawValue: 'Raw Name',
      size: 64,
    })

    await waitFor(() => {
      expect(container.querySelector('svg')).not.toBeNull()
    })
    const el = container.querySelector('svg')!
    expect(el.getAttribute('viewBox')).toBe('0 0 48 48')
    expect(el.getAttribute('aria-label')).toBe('Raw Name')
    expect(el.getAttribute('width')).toBe('64')
    expect(el.getAttribute('height')).toBe('64')
    expect(el.getAttribute('role')).toBe('img')
    // child content from the fetched body made it through conversion
    expect(el.querySelector('circle')).not.toBeNull()
  })

  it('falls back to id for aria-label when rawValue is absent', async () => {
    const mods = await loadFresh()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse(svg())))

    const { container } = renderFallback(mods, {
      id: 'asset-noraw',
      iconType: 'token',
    })

    await waitFor(() => expect(container.querySelector('svg')).not.toBeNull())
    expect(container.querySelector('svg')!.getAttribute('aria-label')).toBe(
      'asset-noraw',
    )
  })

  it('mono adds fill="currentColor" on the wrapper', async () => {
    const mods = await loadFresh()
    const fetchSpy = vi.fn().mockResolvedValue(okResponse(svg()))
    vi.stubGlobal('fetch', fetchSpy)

    const { container } = renderFallback(mods, {
      id: 'asset-mono',
      iconType: 'token',
      mono: true,
    })

    await waitFor(() => expect(container.querySelector('svg')).not.toBeNull())
    expect(container.querySelector('svg')!.getAttribute('fill')).toBe(
      'currentColor',
    )
    // mono fetches the _mono.svg variant URL
    expect(fetchSpy.mock.calls[0]?.[0]).toBe(
      `${BASE}/${BRANCH}/assets/tokens/asset-mono_mono.svg`,
    )
  })
})

describe('GithubFallback — dedupe & cache', () => {
  it('in-flight dedupe: N concurrent mounts of the same URL → exactly 1 fetch', async () => {
    const mods = await loadFresh()
    const fetchSpy = vi.fn().mockResolvedValue(okResponse(svg()))
    vi.stubGlobal('fetch', fetchSpy)

    const { container } = render(
      <mods.IconProvider baseUrl={BASE} branch={BRANCH} enableFallback>
        {Array.from({ length: 5 }, (_, i) => (
          <mods.GithubFallback key={i} id="shared" iconType="token" />
        ))}
      </mods.IconProvider>,
    )

    await waitFor(() =>
      expect(container.querySelectorAll('svg').length).toBe(5),
    )
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('positive cache: mount → unmount → remount renders immediately with no second fetch', async () => {
    const mods = await loadFresh()
    const fetchSpy = vi.fn().mockResolvedValue(okResponse(svg('0 0 50 50')))
    vi.stubGlobal('fetch', fetchSpy)

    const first = renderFallback(mods, { id: 'cached', iconType: 'token' })
    await waitFor(() =>
      expect(first.container.querySelector('svg')).not.toBeNull(),
    )
    first.unmount()
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    // Remount: the initial useState reads from the positive cache synchronously,
    // so content is present on the very first render (no effect-driven fetch).
    const second = renderFallback(mods, { id: 'cached', iconType: 'token' })
    expect(second.container.querySelector('svg')).not.toBeNull()
    expect(second.container.querySelector('svg')!.getAttribute('viewBox')).toBe(
      '0 0 50 50',
    )
    // Let any effects flush; still exactly one fetch total.
    await act(async () => {})
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('content memoisation: a second mount reuses cached content without re-fetch', async () => {
    const mods = await loadFresh()
    const fetchSpy = vi.fn().mockResolvedValue(okResponse(svg()))
    vi.stubGlobal('fetch', fetchSpy)

    const a = renderFallback(mods, { id: 'memo', iconType: 'token' })
    await waitFor(() => expect(a.container.querySelector('svg')).not.toBeNull())
    const b = renderFallback(mods, { id: 'memo', iconType: 'token' })
    expect(b.container.querySelector('svg')).not.toBeNull()
    await act(async () => {})
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})

describe('GithubFallback — negative cache & errors', () => {
  it('404 negative-caches: second mount within TTL does not refetch and shows fallback', async () => {
    const mods = await loadFresh()
    const fetchSpy = vi.fn().mockResolvedValue(notFoundResponse())
    vi.stubGlobal('fetch', fetchSpy)

    const a = renderFallback(mods, {
      id: 'gone',
      iconType: 'token',
      fallback: <span data-testid="fb">x</span>,
    })
    await waitFor(() =>
      expect(a.container.querySelector('[data-testid="fb"]')).not.toBeNull(),
    )
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    a.unmount()

    const b = renderFallback(mods, {
      id: 'gone',
      iconType: 'token',
      fallback: <span data-testid="fb">x</span>,
    })
    // Negative cache makes resolveSvg resolve null synchronously; fallback shows.
    await waitFor(() =>
      expect(b.container.querySelector('[data-testid="fb"]')).not.toBeNull(),
    )
    await act(async () => {})
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('negative cache expires after the 60s TTL: a new mount fetches again', async () => {
    const mods = await loadFresh()
    vi.useFakeTimers()
    const fetchSpy = vi.fn().mockResolvedValue(notFoundResponse())
    vi.stubGlobal('fetch', fetchSpy)

    const a = renderFallback(mods, {
      id: 'ttl',
      iconType: 'token',
      fallback: <span data-testid="fb">x</span>,
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    a.unmount()

    // Advance past the negative-cache TTL (60s).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_001)
    })

    const b = renderFallback(mods, {
      id: 'ttl',
      iconType: 'token',
      fallback: <span data-testid="fb">x</span>,
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    b.unmount()
  })

  it('transient network error (fetch rejects) is NOT negative-cached: next mount refetches', async () => {
    const mods = await loadFresh()
    const fetchSpy = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(okResponse(svg('0 0 70 70')))
    vi.stubGlobal('fetch', fetchSpy)

    const a = renderFallback(mods, {
      id: 'flaky',
      iconType: 'token',
      fallback: <span data-testid="fb">x</span>,
    })
    await waitFor(() =>
      expect(a.container.querySelector('[data-testid="fb"]')).not.toBeNull(),
    )
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    a.unmount()

    // Not negative-cached → the remount reaches the network again and succeeds.
    const b = renderFallback(mods, { id: 'flaky', iconType: 'token' })
    await waitFor(() => expect(b.container.querySelector('svg')).not.toBeNull())
    expect(b.container.querySelector('svg')!.getAttribute('viewBox')).toBe(
      '0 0 70 70',
    )
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('fetch timeout: AbortController fires after 8s, shows fallback, treated as transient', async () => {
    // Load modules under REAL timers — vitest's dynamic import() resolution
    // stalls under fake timers — then switch to fake timers to drive the 8s
    // FETCH_TIMEOUT_MS deterministically.
    const mods = await loadFresh()
    vi.useFakeTimers()
    // A fetch that never settles until its AbortSignal aborts — then rejects
    // (mirrors a real fetch reacting to ac.abort()). `aborted` records WHEN
    // the AbortController fired so we can assert the 8s deadline.
    let aborted = false
    const fetchSpy = vi.fn().mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        const signal = (init as { signal: AbortSignal }).signal
        signal.addEventListener('abort', () => {
          aborted = true
          reject(new DOMException('aborted', 'AbortError'))
        })
      })
    })
    vi.stubGlobal('fetch', fetchSpy)

    const a = renderFallback(mods, {
      id: 'slow',
      iconType: 'token',
      fallback: <span data-testid="fb">x</span>,
    })
    // Just before the timeout: the AbortController has NOT fired yet.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(7_999)
    })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(aborted).toBe(false)
    // Cross the 8s FETCH_TIMEOUT_MS → AbortController aborts → fetch rejects →
    // resolveSvg resolves null → fallback shows.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2)
    })
    expect(aborted).toBe(true)
    expect(a.container.querySelector('[data-testid="fb"]')).not.toBeNull()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    a.unmount()

    // Transient (abort) is not negative-cached: a fresh mount retries.
    const ok = vi.fn().mockResolvedValue(okResponse(svg('0 0 90 90')))
    vi.stubGlobal('fetch', ok)
    const b = renderFallback(mods, { id: 'slow', iconType: 'token' })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(b.container.querySelector('svg')).not.toBeNull()
    expect(b.container.querySelector('svg')!.getAttribute('viewBox')).toBe(
      '0 0 90 90',
    )
    expect(ok).toHaveBeenCalledTimes(1)
    b.unmount()
  })

  it('unparseable body is negative-cached (shows fallback, no refetch within TTL)', async () => {
    const mods = await loadFresh()
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(okResponse('this is not an svg at all'))
    vi.stubGlobal('fetch', fetchSpy)

    const a = renderFallback(mods, {
      id: 'garbage',
      iconType: 'token',
      fallback: <span data-testid="fb">x</span>,
    })
    await waitFor(() =>
      expect(a.container.querySelector('[data-testid="fb"]')).not.toBeNull(),
    )
    expect(a.container.querySelector('svg')).toBeNull()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    a.unmount()

    // Conversion failure negative-caches the URL — no refetch within TTL.
    const b = renderFallback(mods, {
      id: 'garbage',
      iconType: 'token',
      fallback: <span data-testid="fb">x</span>,
    })
    await waitFor(() =>
      expect(b.container.querySelector('[data-testid="fb"]')).not.toBeNull(),
    )
    await act(async () => {})
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})

describe('GithubFallback — type probing', () => {
  it('unknown type probes all three URLs (tokens, chains, brands) token-first', async () => {
    const mods = await loadFresh()
    // 'unknown-thing' does not resolve → type inferred as null → probe all 3.
    // Tokens AND chains both succeed; token-first ordering must win.
    const fetchSpy = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/tokens/'))
        return Promise.resolve(okResponse(svg('0 0 11 11')))
      if (url.includes('/chains/'))
        return Promise.resolve(okResponse(svg('0 0 22 22')))
      return Promise.resolve(notFoundResponse())
    })
    vi.stubGlobal('fetch', fetchSpy)

    const { container } = renderFallback(mods, { id: 'unknown-thing' })
    await waitFor(() => expect(container.querySelector('svg')).not.toBeNull())
    // All three probed
    const urls = fetchSpy.mock.calls.map((c) => c[0] as string)
    expect(urls.some((u) => u.includes('/tokens/'))).toBe(true)
    expect(urls.some((u) => u.includes('/chains/'))).toBe(true)
    expect(urls.some((u) => u.includes('/brands/'))).toBe(true)
    expect(fetchSpy).toHaveBeenCalledTimes(3)
    // Token-first wins despite chains also succeeding.
    expect(container.querySelector('svg')!.getAttribute('viewBox')).toBe(
      '0 0 11 11',
    )
  })

  it('explicit iconType fetches exactly one URL', async () => {
    const mods = await loadFresh()
    const fetchSpy = vi.fn().mockResolvedValue(okResponse(svg()))
    vi.stubGlobal('fetch', fetchSpy)

    const { container } = renderFallback(mods, {
      id: 'pinned',
      iconType: 'chain',
    })
    await waitFor(() => expect(container.querySelector('svg')).not.toBeNull())
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy.mock.calls[0]?.[0]).toBe(
      `${BASE}/${BRANCH}/assets/chains/pinned_full.svg`,
    )
  })
})

describe('GithubFallback — retry re-arm', () => {
  it('re-arms a still-mounted failed component after the TTL window triggers a refetch', async () => {
    const mods = await loadFresh()
    vi.useFakeTimers()
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(notFoundResponse())
      .mockResolvedValue(okResponse(svg('0 0 33 33')))
    vi.stubGlobal('fetch', fetchSpy)

    const { container } = renderFallback(mods, {
      id: 'rearm',
      iconType: 'token',
      fallback: <span data-testid="fb">x</span>,
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    // First attempt failed → fallback shown.
    expect(container.querySelector('[data-testid="fb"]')).not.toBeNull()
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    // The second effect re-arms `failed=false` after NEGATIVE_CACHE_TTL_MS.
    // Advancing past it both expires the negative cache AND clears `failed`,
    // re-running the fetch effect → a second network request that succeeds.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_001)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(container.querySelector('svg')).not.toBeNull()
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })
})

describe('GithubFallback — FIFO eviction', () => {
  it('evicts the oldest entry once the cache exceeds MAX_CACHE (200)', async () => {
    const mods = await loadFresh()
    const fetchSpy = vi.fn().mockResolvedValue(okResponse(svg()))
    vi.stubGlobal('fetch', fetchSpy)

    // Mount the first id, then 200 distinct others, all with explicit type so
    // each is exactly one URL/cache key. After 201 distinct positive entries
    // the first key (oldest) has been FIFO-evicted, so remounting it refetches.
    const firstId = 'evict-000'
    const a = renderFallback(mods, { id: firstId, iconType: 'token' })
    await waitFor(() => expect(a.container.querySelector('svg')).not.toBeNull())
    a.unmount()
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    // 200 more distinct urls → total 201 inserts, evicting evict-000.
    for (let i = 1; i <= 200; i++) {
      const r = renderFallback(mods, {
        id: `evict-${String(i).padStart(3, '0')}`,
        iconType: 'token',
      })
      await waitFor(() =>
        expect(r.container.querySelector('svg')).not.toBeNull(),
      )
      r.unmount()
    }
    expect(fetchSpy).toHaveBeenCalledTimes(201)

    // evict-000 was evicted → remount refetches (cache miss).
    const back = renderFallback(mods, { id: firstId, iconType: 'token' })
    await waitFor(() =>
      expect(back.container.querySelector('svg')).not.toBeNull(),
    )
    expect(fetchSpy).toHaveBeenCalledTimes(202)
  })
})

describe('Icon integration (lazy GithubFallback boundary)', () => {
  it('<IconProvider enableFallback><Icon value="unknown" /></IconProvider> reaches fallback and renders fetched content', async () => {
    vi.resetModules()
    const { Icon, IconProvider } = (await import('../index')) as IndexModule
    const fetchSpy = vi.fn().mockResolvedValue(okResponse(svg('0 0 55 55')))
    vi.stubGlobal('fetch', fetchSpy)

    const { container } = render(
      <IconProvider baseUrl={BASE} branch={BRANCH} enableFallback>
        <Icon value="totally-unknown-xyz" />
      </IconProvider>,
    )

    // The GithubFallback chunk is lazy() in index.tsx — wait for the Suspense
    // boundary to resolve and the fetched content to render.
    await waitFor(
      () => {
        expect(
          container.querySelector('svg[aria-label="totally-unknown-xyz"]'),
        ).not.toBeNull()
      },
      { timeout: 3000 },
    )
    expect(
      container
        .querySelector('svg[aria-label="totally-unknown-xyz"]')!
        .getAttribute('viewBox'),
    ).toBe('0 0 55 55')
    expect(fetchSpy).toHaveBeenCalled()
  })
})

describe('GithubFallback — sanitization (end-to-end)', () => {
  // The sanitizer has unit coverage in sanitize-svg.test.ts, but nothing
  // proved a REMOTE body is sanitized on the way through GithubFallback into
  // the DOM. This drives a hostile fetch response all the way to render — a
  // refactor that rendered fetched text via dangerouslySetInnerHTML (skipping
  // the parse+sanitize) would leave these vectors live and fail here.
  const MALICIOUS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
    <script>window.__pwned = 1</script>
    <circle cx="16" cy="16" r="8" fill="#abcdef" onload="window.__pwned = 2"/>
    <a href="https://evil.example/track"><rect width="4" height="4"/></a>
    <circle cx="8" cy="8" r="2" fill="url(https://evil.example/paint.svg#p)"/>
    <image href="https://evil.example/pixel.png" width="1" height="1"/>
  </svg>`

  it('strips scripts, event handlers, and remote references from fetched SVG', async () => {
    const mods = await loadFresh()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse(MALICIOUS)))

    const { container } = renderFallback(mods, {
      id: 'hostile',
      iconType: 'token',
    })

    await waitFor(() => expect(container.querySelector('svg')).not.toBeNull())
    const html = container.innerHTML

    expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined()
    expect(html).not.toMatch(/<script/i)
    expect(html).not.toMatch(/onload/i)
    expect(html).not.toMatch(/<image/i)
    expect(html).not.toMatch(/evil\.example/) // href AND url() paint server
    // benign geometry still made it through
    expect(container.querySelector('circle[fill="#abcdef"]')).not.toBeNull()
  })

  it('never fetches for an empty id (input that canonicalized to nothing)', async () => {
    const mods = await loadFresh()
    const fetchSpy = vi.fn().mockResolvedValue(okResponse(svg()))
    vi.stubGlobal('fetch', fetchSpy)

    renderFallback(mods, {
      id: '',
      iconType: 'token',
      fallback: <span data-testid="fb">?</span>,
    })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    // No `.../tokens/_full.svg` request for an empty asset id.
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('warns (dev only) when enableFallback is set without an explicit branch', async () => {
    // The implicit-branch warning exists to prevent version-skewed runtime
    // content (branch defaults to "main"). loadFresh() resets modules, so the
    // once-per-process warned flag starts clean each run.
    const { IconProvider, GithubFallback } = await loadFresh()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse(svg())))
    render(
      <IconProvider enableFallback>
        <GithubFallback id="asset-nobranch" iconType="token" />
      </IconProvider>,
    )
    await waitFor(() =>
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('without an explicit `branch`'),
      ),
    )
  })
})
