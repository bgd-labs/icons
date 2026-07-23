// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { svgTextToReact } from '../svg-to-react'

function wrap(inner: string, viewBox = '0 0 32 32') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${inner}</svg>`
}

function renderContent(svgText: string) {
  const content = svgTextToReact(svgText)
  expect(content).not.toBeNull()
  const { container } = render(
    <svg viewBox={content!.viewBox}>{content!.node}</svg>,
  )
  return container
}

afterEach(cleanup)

describe('svgTextToReact', () => {
  it('returns the converted children and viewBox for a well-formed SVG', () => {
    const content = svgTextToReact(
      wrap('<circle cx="16" cy="16" r="8"/>', '0 0 48 48'),
    )
    expect(content).not.toBeNull()
    expect(content!.viewBox).toBe('0 0 48 48')
  })

  it('falls back to 0 0 32 32 viewBox when missing', () => {
    const content = svgTextToReact(
      '<svg xmlns="http://www.w3.org/2000/svg"><circle r="1"/></svg>',
    )
    expect(content?.viewBox).toBe('0 0 32 32')
  })

  it('returns null when the root element is not <svg>', () => {
    expect(svgTextToReact('<div><circle r="1"/></div>')).toBeNull()
  })

  it('renders geometry with sanitization applied — script tags do not survive', () => {
    const container = renderContent(
      wrap('<script>alert(1)</script><circle cx="16" cy="16" r="8"/>'),
    )
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('circle')?.getAttribute('r')).toBe('8')
  })

  it('converts hyphenated attributes to React props that render back as SVG attributes', () => {
    const container = renderContent(
      wrap('<circle r="8" fill-opacity="0.5" stroke-width="2"/>'),
    )
    const circle = container.querySelector('circle')
    expect(circle?.getAttribute('fill-opacity')).toBe('0.5')
    expect(circle?.getAttribute('stroke-width')).toBe('2')
  })

  it('converts inline style strings to style objects', () => {
    const container = renderContent(wrap('<circle r="8" style="fill: red"/>'))
    const circle = container.querySelector('circle') as SVGCircleElement
    expect(circle.style.fill).toBe('red')
  })

  it('strips event handler attributes', () => {
    const container = renderContent(wrap('<circle r="8" onclick="alert(1)"/>'))
    const circle = container.querySelector('circle')
    expect(circle?.getAttribute('onclick')).toBeNull()
  })

  it('preserves nested structure', () => {
    const container = renderContent(
      wrap('<g fill="#abc"><circle r="4"/><rect width="2" height="2"/></g>'),
    )
    const g = container.querySelector('g')
    expect(g?.getAttribute('fill')).toBe('#abc')
    expect(g?.querySelector('circle')).not.toBeNull()
    expect(g?.querySelector('rect')).not.toBeNull()
  })
})
