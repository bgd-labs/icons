// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
// WETH's full art defines a clipPath — the generated component must give
// every mounted instance its own ids. (If the asset ever loses its clipPath,
// swap in any token whose _full.svg carries a <defs> id.)
import WethIconFull from '../generated/tokens/weth.full'
// MEGA's full art defines no ids — the id-free fast path (no useId call).
import MegaIconFull from '../generated/tokens/mega.full'

afterEach(cleanup)

// SVG id lookups (url(#...)) are document-global and take the FIRST match:
// two mounted copies of one icon sharing ids means one copy's refs resolve
// into the other — and when that other sits in a hidden subtree (a closed
// drawer, a display:none panel), the visible icon clips to nothing.
describe('generated components parameterize resource ids per instance', () => {
  it('two instances of the same icon get distinct ids, each self-referencing', () => {
    const { container } = render(
      <>
        <WethIconFull data-testid="a" />
        <WethIconFull data-testid="b" />
      </>,
    )
    const svgs = Array.from(container.querySelectorAll('svg'))
    expect(svgs).toHaveLength(2)

    const details = svgs.map((svg) => {
      const clip = svg.querySelector('clipPath')
      const ref = svg.querySelector('[clip-path]')?.getAttribute('clip-path')
      return { id: clip?.id, ref }
    })

    for (const { id, ref } of details) {
      expect(id).toBeTruthy()
      // Each instance references its OWN clipPath.
      expect(ref).toBe(`url(#${id})`)
      // The prefix must stay CSS-url safe: React's useId delimiters
      // (":" / "«»") are stripped by the generated sanitize.
      expect(id).toMatch(/^[a-zA-Z0-9_-]+$/)
      // The asset-level SVGO prefix is still part of the id.
      expect(id).toContain('weth_full__')
    }
    expect(details[0].id).not.toBe(details[1].id)
  })

  it('id-free icons render without useId plumbing artifacts', () => {
    const { container } = render(<MegaIconFull />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg!.querySelectorAll('[id]')).toHaveLength(0)
  })
})
