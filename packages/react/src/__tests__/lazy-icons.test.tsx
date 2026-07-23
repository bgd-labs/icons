// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import { Suspense } from 'react'
import { Icon } from '../index'
import { getLazyIcon, __resetShownIcons } from '../lazy-icons'

// Canonical fixtures: `mkr` (Maker) and `sushi` (SushiToken) must stay LAZY
// (bundle:false in assets/tokens); `eth` is the EAGER fixture. If any of these
// changes eager/lazy tier, these tests break — swap in another same-tier icon.

describe('lazy icon shards (dispatcher -> shard file -> chunk)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    __resetShownIcons()
  })

  it('returns a stable component identity per type:id:variant', () => {
    // React resolves lazy components by identity — a fresh component per
    // render would refetch the chunk and remount the subtree.
    expect(getLazyIcon('token', 'mkr', 'full')).toBe(
      getLazyIcon('token', 'mkr', 'full'),
    )
    expect(getLazyIcon('token', 'mkr', 'full')).not.toBe(
      getLazyIcon('token', 'sushi', 'full'),
    )
    // Each variant is its own chunk, so it gets its own cached component.
    expect(getLazyIcon('token', 'mkr', 'full')).not.toBe(
      getLazyIcon('token', 'mkr', 'mono'),
    )
  })

  it('renders a lazy icon through its dispatcher + shard file', async () => {
    const { container } = render(<Icon value="sushi" />)
    await waitFor(() => {
      expect(
        container.querySelector('.bgd-icon-fade svg[aria-label="SushiToken"]'),
      ).not.toBeNull()
    })
  })

  it('resolves aliases to the shard entry of the canonical id', async () => {
    // "1" is the numeric chain id alias for ethereum (eager) — sanity-check
    // an alias that lands on a lazy asset instead.
    const { container } = render(<Icon value="SUSHI" />)
    await waitFor(() => {
      expect(
        container.querySelector('svg[aria-label="SushiToken"]'),
      ).not.toBeNull()
    })
  })

  it('renders nothing (not a crash) for a missing dispatcher key', async () => {
    // First char "q" has no shard thunk in the tokens dispatcher (no lazy token
    // id starts with "q"), so the dispatcher-key-miss branch returns NullIcon.
    // The Icon component never requests unmatched ids; this guards the internal
    // contract directly in case a build ever drifts. NB: keep this a first char
    // with no lazy token — as the catalogue grows, re-pick from the absent set
    // (h/i/n/q/v today) if a "q" token ever ships.
    const Missing = getLazyIcon('token', 'qzz-not-generated', 'full')
    const { container } = render(
      <Suspense fallback={null}>
        <Missing />
      </Suspense>,
    )
    await waitFor(() => {
      // Suspense resolved to the null component — no svg, no error
      expect(container.querySelector('svg')).toBeNull()
    })
  })

  it('renders nothing (not a crash) for a shard-entry miss', async () => {
    // First char "a" HAS a shard thunk (e.g. ampl) but "aardvark" is not in the
    // shard's ICON_IMPORTS — the shard-entry-miss branch returns NullIcon.
    const Missing = getLazyIcon('token', 'aardvark', 'full')
    const { container } = render(
      <Suspense fallback={null}>
        <Missing />
      </Suspense>,
    )
    await waitFor(() => {
      expect(container.querySelector('svg')).toBeNull()
    })
  })

  it('does not consult shards for unmatched values', () => {
    const { container } = render(
      <Icon value="totally-unknown-asset" type="token" />,
    )
    // Placeholder renders synchronously — no suspense wrapper involved
    expect(container.querySelector('.bgd-icon-placeholder')).toBeNull()
    expect(
      container.querySelector('svg[aria-label="totallyunknownasset"]'),
    ).not.toBeNull()
  })
})
