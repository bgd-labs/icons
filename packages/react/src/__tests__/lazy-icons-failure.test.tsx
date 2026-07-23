// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import { Suspense } from 'react'
import { getLazyIcon, hasIconShown, __resetShownIcons } from '../lazy-icons'
import { Icon } from '../index'

// Simulate the classic stale-chunk failure: the per-type dispatcher module
// 404s after a redeploy. The import rejection must NOT propagate into the
// consumer's error boundary — and the poisoned lazy component must be evicted
// so a later mount can retry. Mocking the dispatcher (the first import in the
// dispatcher -> shard -> chunk chain) exercises a rejection anywhere in that
// chain: the catch in getLazyIcon is shared.
vi.mock('../generated/lazy/tokens', () => {
  throw new Error('Failed to fetch dynamically imported module (chunk 404)')
})

describe('lazy icon chunk failures', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    __resetShownIcons()
  })

  it('renders nothing instead of throwing into the error boundary', async () => {
    const Broken = getLazyIcon('token', 'sushi', 'full')
    const { container } = render(
      <Suspense fallback={<span data-testid="pending" />}>
        <Broken />
      </Suspense>,
    )
    await waitFor(() => {
      // Suspense resolved (no fallback) to the null component — no crash
      expect(container.querySelector('[data-testid="pending"]')).toBeNull()
    })
    expect(container.querySelector('svg')).toBeNull()
  })

  it('evicts the poisoned component so the next mount retries the import', async () => {
    const first = getLazyIcon('token', 'mkr', 'full')
    render(
      <Suspense fallback={null}>
        {(() => {
          const C = first
          return <C />
        })()}
      </Suspense>,
    )
    // Wait for the rejected import to settle and evict the cache entry.
    await waitFor(() => {
      expect(getLazyIcon('token', 'mkr', 'full')).not.toBe(first)
    })
  })

  it('keeps the placeholder up and does not mark the icon shown on chunk failure', async () => {
    // Full <Icon> path: when the chunk 404s, the placeholder must NOT fade out
    // to a blank box, and the icon must NOT be recorded as "shown" (else every
    // later display would skip the placeholder and show nothing).
    const { container } = render(<Icon value="mkr" />)
    const placeholder = container.querySelector(
      '.bgd-icon-placeholder',
    ) as HTMLElement
    expect(placeholder).not.toBeNull()
    expect(placeholder.style.opacity).toBe('1')

    // Let the failing import settle: the overlay mounts (Suspense resolves to
    // the null component) but renders no glyph svg.
    await waitFor(() =>
      expect(container.querySelector('.bgd-icon-fade')).not.toBeNull(),
    )
    expect(container.querySelector('.bgd-icon-fade svg')).toBeNull()

    // Placeholder still fully visible; identity NOT marked shown.
    expect(placeholder.style.opacity).toBe('1')
    expect(hasIconShown('token:mkr:full')).toBe(false)
  })
})
