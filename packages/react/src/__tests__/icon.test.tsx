// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { createRef } from 'react'
import { Icon, IconProvider } from '../index'
import { __resetShownIcons } from '../lazy-icons'
import { EthIcon } from '../generated/tokens/eth'

function svg(viewBox: string, fill = '#ff00aa') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><circle cx="8" cy="8" r="8" fill="${fill}"/></svg>`
}

describe('Icon', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    // The "already shown this session" set is module-global; reset it so the
    // first-display fade assertions below don't depend on test order.
    __resetShownIcons()
  })

  it('renders an SVG for an eager-loaded icon', () => {
    const { container } = render(<Icon value="eth" />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
  })

  it('applies the size prop', () => {
    const { container } = render(<Icon value="eth" size={64} />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('width')).toBe('64')
  })

  it('renders mono variant', () => {
    const { container } = render(<Icon value="eth" mono />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('fill')).toBe('currentColor')
  })

  it('rejects ref on <Icon> at the type level', () => {
    // <Icon> renders different root elements depending on the internal
    // path (eager svg / lazy wrapper / fallback), so a ref has no reliable
    // target — the prop is omitted from IconProps on purpose.
    const ref = createRef<SVGSVGElement>()
    // @ts-expect-error — ref is intentionally unsupported on <Icon>
    const el = <Icon value="eth" ref={ref} />
    expect(el).toBeTruthy()
  })

  it('forwards refs on generated per-icon components', () => {
    const ref = createRef<SVGSVGElement>()
    render(<EthIcon ref={ref} />)
    expect(ref.current).toBeInstanceOf(SVGElement)
    expect(ref.current?.tagName.toLowerCase()).toBe('svg')
  })

  it('renders fallback for unknown icon', () => {
    render(
      <Icon
        value="nonexistent_xyz_999"
        fallback={<span data-testid="fb">?</span>}
      />,
    )
    expect(screen.getByTestId('fb')).not.toBeNull()
  })

  it('renders a placeholder for unknown icons without a custom fallback', () => {
    const { container } = render(<Icon value="nonexistent_xyz_999" />)
    const svg = container.querySelector('svg[aria-label="nonexistentxyz999"]')
    expect(svg).not.toBeNull()
  })

  it('fades the placeholder out once a lazy icon loads (no peek-through under mono)', async () => {
    const { container } = render(<Icon value="mkr" mono />)

    const placeholder = container.querySelector(
      '.bgd-icon-placeholder',
    ) as HTMLElement
    expect(placeholder).not.toBeNull()
    expect(placeholder.style.opacity).toBe('1')

    // Once the lazy chunk resolves, the icon overlays the placeholder and
    // the placeholder fades to invisible — mono icons have transparent
    // regions it would otherwise peek through.
    await waitFor(() => {
      expect(container.querySelector('.bgd-icon-fade svg')).not.toBeNull()
      expect(placeholder.style.opacity).toBe('0')
    })
    expect(placeholder.getAttribute('aria-hidden')).toBe('true')
  })

  it('does not flash a placeholder/fade when re-displaying an already-shown icon', async () => {
    // First display: the lazy chunk loads behind a placeholder + fade.
    const first = render(<Icon value="mkr" mono />)
    await waitFor(() =>
      expect(
        first.container.querySelector('.bgd-icon-fade svg'),
      ).not.toBeNull(),
    )
    first.unmount()

    // Second display of the same identity+variant: the chunk is warm, so it
    // must render straight — no placeholder, no fade overlay, full opacity.
    const second = render(<Icon value="mkr" mono />)
    await waitFor(() =>
      expect(second.container.querySelector('svg')).not.toBeNull(),
    )
    expect(second.container.querySelector('.bgd-icon-placeholder')).toBeNull()
    expect(second.container.querySelector('.bgd-icon-fade')).toBeNull()
  })

  it('renders a consistent <span> root for eager and lazy icons', async () => {
    // Eager (bundled) icon: root is a span carrying className/style; the glyph
    // svg is nested and does NOT receive the className.
    const eager = render(
      <Icon value="eth" className="my-icon" style={{ margin: 8 }} data-x="1" />,
    )
    const eagerRoot = eager.container.firstElementChild as HTMLElement
    expect(eagerRoot.tagName).toBe('SPAN')
    expect(eagerRoot.classList.contains('my-icon')).toBe(true)
    expect(eagerRoot.style.margin).toBe('8px')
    const eagerSvg = eagerRoot.querySelector('svg')!
    expect(eagerSvg).not.toBeNull()
    expect(eagerSvg.classList.contains('my-icon')).toBe(false)
    // Passthrough (non-style) props land on the glyph svg.
    expect(eagerSvg.getAttribute('data-x')).toBe('1')

    // Lazy (code-split) icon: same contract once the chunk resolves.
    const lazy = render(
      <Icon value="mkr" className="my-icon" style={{ margin: 8 }} data-x="1" />,
    )
    const lazyRoot = lazy.container.firstElementChild as HTMLElement
    expect(lazyRoot.tagName).toBe('SPAN')
    expect(lazyRoot.classList.contains('my-icon')).toBe(true)
    expect(lazyRoot.style.margin).toBe('8px')
    await waitFor(() =>
      expect(lazyRoot.querySelector('.bgd-icon-fade svg')).not.toBeNull(),
    )
    const lazySvg = lazyRoot.querySelector('.bgd-icon-fade svg')!
    expect(lazySvg.classList.contains('my-icon')).toBe(false)
    expect(lazySvg.getAttribute('data-x')).toBe('1')
  })

  // Flush effects + a macrotask so the fallback fetch — which fires from a
  // lazy() chunk import + effect, i.e. asynchronously — has a real chance to
  // (wrongly) run. A synchronous-only assertion cannot see it, which made the
  // network-privacy contract effectively untested.
  const flushAsync = () =>
    act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

  it('makes no network request when no IconProvider is mounted', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    render(
      <Icon
        value="definitely-not-bundled-abc"
        type="token"
        fallback={<span data-testid="fb">?</span>}
      />,
    )
    expect(screen.getByTestId('fb')).not.toBeNull()
    await flushAsync()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('makes no network request when IconProvider has enableFallback off', async () => {
    // enableFallback is opt-in (ADR-0003): a provider without it must not
    // fetch. Guards against the default silently flipping to on.
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    render(
      <IconProvider baseUrl="https://icons.test" branch="main">
        <Icon
          value="definitely-not-bundled-abc"
          type="token"
          fallback={<span data-testid="fb">?</span>}
        />
      </IconProvider>,
    )
    expect(screen.getByTestId('fb')).not.toBeNull()
    await flushAsync()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('renders a consistent <span> root on the unknown/placeholder path', () => {
    // The eager and lazy paths are covered above; the unknown path (no
    // provider, no match) must carry className/style on the same span root.
    const { container } = render(
      <Icon
        value="totally-unknown-xyz-000"
        className="my-icon"
        style={{ margin: 8 }}
      />,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.tagName).toBe('SPAN')
    expect(root.classList.contains('my-icon')).toBe(true)
    expect(root.style.margin).toBe('8px')
  })

  it('normalizes unresolved fallback values before building GitHub URLs', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => '',
    })
    vi.stubGlobal('fetch', fetchSpy)

    render(
      <IconProvider baseUrl="https://icons.test" branch="main" enableFallback>
        <Icon
          value="PT-eUSDe-New"
          type="token"
          fallback={<span data-testid="fb">?</span>}
        />
      </IconProvider>,
    )

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    expect(fetchSpy.mock.calls[0]?.[0]).toBe(
      'https://icons.test/main/assets/tokens/pteusdenew_full.svg',
    )
  })

  it('deduplicates concurrent fallback fetches for the same URL', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => svg('0 0 40 40', '#abcdef'),
    })
    vi.stubGlobal('fetch', fetchSpy)

    // Five rows of the same unknown asset — one network request, not five.
    const { container } = render(
      <IconProvider baseUrl="https://icons.test" branch="dedup" enableFallback>
        {Array.from({ length: 5 }, (_, i) => (
          <Icon key={i} value="shared-asset" type="token" />
        ))}
      </IconProvider>,
    )

    await waitFor(() =>
      expect(
        container.querySelectorAll('svg[aria-label="shared-asset"]').length,
      ).toBe(5),
    )
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('reloads fallback SVGs when the value changes', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          text: async () => svg('0 0 48 48', '#111111'),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => svg('0 0 64 64', '#222222'),
        }),
    )

    const { container, rerender } = render(
      <IconProvider baseUrl="https://icons.test" branch="main" enableFallback>
        <Icon value="custom-a" type="token" />
      </IconProvider>,
    )

    await waitFor(() =>
      expect(
        container
          .querySelector('svg[aria-label="custom-a"]')
          ?.getAttribute('viewBox'),
      ).toBe('0 0 48 48'),
    )

    rerender(
      <IconProvider baseUrl="https://icons.test" branch="main" enableFallback>
        <Icon value="custom-b" type="token" />
      </IconProvider>,
    )

    await waitFor(() =>
      expect(
        container
          .querySelector('svg[aria-label="custom-b"]')
          ?.getAttribute('viewBox'),
      ).toBe('0 0 64 64'),
    )
  })

  it('recovers from a failed fallback fetch on the next value', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          text: async () => '',
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => svg('0 0 80 80', '#333333'),
        }),
    )

    const { container, rerender } = render(
      <IconProvider
        baseUrl="https://icons.test"
        branch="recover"
        enableFallback
      >
        <Icon
          value="missing-a"
          type="token"
          fallback={<span data-testid="fb">?</span>}
        />
      </IconProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('fb')).not.toBeNull())

    rerender(
      <IconProvider
        baseUrl="https://icons.test"
        branch="recover"
        enableFallback
      >
        <Icon value="missing-b" type="token" />
      </IconProvider>,
    )

    await waitFor(() =>
      expect(
        container
          .querySelector('svg[aria-label="missing-b"]')
          ?.getAttribute('viewBox'),
      ).toBe('0 0 80 80'),
    )
  })

  it('reloads fallback SVGs when provider config changes', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          text: async () => svg('0 0 96 96', '#444444'),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => svg('0 0 128 128', '#555555'),
        }),
    )

    const { container, rerender } = render(
      <IconProvider baseUrl="https://icons.test" branch="one" enableFallback>
        <Icon value="custom-config" type="token" />
      </IconProvider>,
    )

    await waitFor(() =>
      expect(
        container
          .querySelector('svg[aria-label="custom-config"]')
          ?.getAttribute('viewBox'),
      ).toBe('0 0 96 96'),
    )

    rerender(
      <IconProvider baseUrl="https://icons.test" branch="two" enableFallback>
        <Icon value="custom-config" type="token" />
      </IconProvider>,
    )

    await waitFor(() =>
      expect(
        container
          .querySelector('svg[aria-label="custom-config"]')
          ?.getAttribute('viewBox'),
      ).toBe('0 0 128 128'),
    )
  })
})
