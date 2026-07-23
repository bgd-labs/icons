// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { FrameWrapper } from '../frames'

describe('FrameWrapper', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('composites the base icon into a known frame', () => {
    const { container } = render(
      <FrameWrapper frame="a">
        <span data-testid="base" />
      </FrameWrapper>,
    )
    expect(container.querySelector('[data-testid="base"]')).not.toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
    expect(console.warn).not.toHaveBeenCalled()
  })

  it('fills the slot with a whole-pixel size for a numeric frame size', () => {
    const Probe = ({ size }: { size?: number | string }) => (
      <span data-testid="base" data-size={String(size)} />
    )
    const { container } = render(
      <FrameWrapper frame="a" size={32}>
        <Probe />
      </FrameWrapper>,
    )
    // Math.floor(32 * 0.8125) = 26
    expect(
      container
        .querySelector('[data-testid="base"]')
        ?.getAttribute('data-size'),
    ).toBe('26')
  })

  it('floors a fractional slot size to a whole pixel (Safari sub-pixel clip)', () => {
    const Probe = ({ size }: { size?: number | string }) => (
      <span data-testid="base" data-size={String(size)} />
    )
    const { container } = render(
      <FrameWrapper frame="a" size={56}>
        <Probe />
      </FrameWrapper>,
    )
    // 56 * 0.8125 = 45.5 -> Math.floor -> 45. A fractional inner size makes
    // Safari sub-pixel-clip a sliver off one edge, so the floor is load-bearing
    // (and every other tested size happens to be integral before flooring).
    expect(
      container
        .querySelector('[data-testid="base"]')
        ?.getAttribute('data-size'),
    ).toBe('45')
  })

  it('respects an explicit size set on the child', () => {
    const Probe = ({ size }: { size?: number | string }) => (
      <span data-testid="base" data-size={String(size)} />
    )
    const { container } = render(
      <FrameWrapper frame="a">
        <Probe size={24} />
      </FrameWrapper>,
    )
    expect(
      container
        .querySelector('[data-testid="base"]')
        ?.getAttribute('data-size'),
    ).toBe('24')
  })

  it('warns and renders the base icon unframed for an unknown frame', () => {
    const { container } = render(
      <FrameWrapper frame="not-a-frame">
        <span data-testid="base" />
      </FrameWrapper>,
    )
    expect(container.querySelector('[data-testid="base"]')).not.toBeNull()
    expect(container.querySelector('svg')).toBeNull()
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Unknown frame: "not-a-frame"'),
    )
  })
})
