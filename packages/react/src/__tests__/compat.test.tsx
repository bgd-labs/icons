// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { Web3Icon } from '../compat'

describe('Web3Icon', () => {
  it('renders an SVG for a known symbol', () => {
    const { container } = render(<Web3Icon symbol="ETH" />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
  })

  it('renders loader when no input is provided', () => {
    const { container } = render(
      <Web3Icon loader={<span data-testid="loader">Loading</span>} />,
    )
    const span = container.querySelector('[data-testid="loader"]')
    expect(span).not.toBeNull()
  })

  it('treats chainId as a chain lookup', async () => {
    const { container } = render(<Web3Icon chainId={1} />)
    await waitFor(() => expect(container.querySelector('svg')).not.toBeNull())
    // getAttribute, not an [aria-label="Ethereum"] selector: jsdom matches
    // attribute selectors case-INSENSITIVELY, so a selector would also pass if
    // the label regressed from the name "Ethereum" to the id "ethereum".
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe(
      'Ethereum',
    )
  })

  it('renders a frame when assetTag is provided', () => {
    const { container } = render(<Web3Icon symbol="ETH" assetTag="stk" mono />)
    expect(
      Array.from(container.querySelectorAll('svg')).some(
        (node) => node.getAttribute('aria-label') === 'Stk Frame',
      ),
    ).toBe(true)
  })

  it('insets the base icon into the frame slot instead of the outer size', () => {
    const { container } = render(
      <Web3Icon symbol="ETH" assetTag="stk" size={48} />,
    )
    const base = container.querySelector('svg[aria-label="Ether"]')
    // FrameWrapper insets the base icon to the slot: Math.floor(48 * 0.8125) = 39
    expect(base?.getAttribute('width')).toBe('39')

    const frame = Array.from(container.querySelectorAll('svg')).find(
      (node) => node.getAttribute('aria-label') === 'Stk Frame',
    )
    expect(frame?.getAttribute('width')).toBe('48')
  })

  it('keeps the explicit size on the base icon when unframed', () => {
    const { container } = render(<Web3Icon symbol="ETH" size={48} />)
    const base = container.querySelector('svg[aria-label="Ether"]')
    expect(base?.getAttribute('width')).toBe('48')
  })
})
