// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { sanitizeSvgRoot } from '../sanitize-svg'

// String-mode wrapper so these assertions stay string-based. The production
// path converts the returned root straight to React nodes (svg-to-react.ts);
// there is no shipped string serializer.
function sanitizeSvg(svgText: string): string {
  const root = sanitizeSvgRoot(svgText)
  return root ? new XMLSerializer().serializeToString(root) : ''
}

function wrap(inner: string, viewBox = '0 0 32 32') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${inner}</svg>`
}

describe('sanitizeSvgRoot', () => {
  it('keeps benign SVG geometry intact', () => {
    const safe = sanitizeSvg(
      wrap('<circle cx="16" cy="16" r="8" fill="#ff00aa"/>'),
    )
    expect(safe).toMatch(/<circle[^>]*r="8"/)
    expect(safe).toMatch(/fill="#ff00aa"/)
  })

  it('strips <script> tags', () => {
    const dirty = wrap('<script>alert(1)</script><circle r="1"/>')
    const safe = sanitizeSvg(dirty)
    expect(safe).not.toMatch(/<script/i)
    expect(safe).not.toMatch(/alert/)
  })

  it('strips event handler attributes (onload, onerror, onclick)', () => {
    const dirty = wrap(
      '<circle r="1" onclick="alert(1)" onload="alert(2)"/>' +
        '<rect width="1" height="1" onmouseover="x()"/>',
    )
    const safe = sanitizeSvg(dirty)
    expect(safe).not.toMatch(/on(?:click|load|mouseover|error)/i)
    expect(safe).not.toMatch(/alert|x\(\)/)
  })

  it('strips <foreignObject>', () => {
    const dirty = wrap(
      '<foreignObject width="32" height="32">' +
        '<body xmlns="http://www.w3.org/1999/xhtml"><img src=x onerror="alert(1)"/></body>' +
        '</foreignObject>',
    )
    const safe = sanitizeSvg(dirty)
    expect(safe).not.toMatch(/foreignObject/i)
    expect(safe).not.toMatch(/onerror/i)
    expect(safe).not.toMatch(/alert/)
  })

  it('strips <image>, <text>, <style>', () => {
    const dirty = wrap(
      '<image href="x.png"/>' +
        '<text x="0" y="0">hi</text>' +
        '<style>* { fill: red }</style>',
    )
    const safe = sanitizeSvg(dirty)
    expect(safe).not.toMatch(/<image/i)
    expect(safe).not.toMatch(/<text/i)
    expect(safe).not.toMatch(/<style/i)
  })

  it('drops javascript: hrefs', () => {
    const dirty = wrap(
      '<a href="javascript:alert(1)"><circle r="1"/></a>' +
        '<use xlink:href="javascript:alert(2)"/>',
    )
    const safe = sanitizeSvg(dirty)
    expect(safe.toLowerCase()).not.toContain('javascript:')
  })

  it('drops data: hrefs', () => {
    const dirty = wrap(
      '<a href="data:text/html,<script>alert(1)</script>"><circle r="1"/></a>',
    )
    const safe = sanitizeSvg(dirty)
    expect(safe.toLowerCase()).not.toContain('data:')
    expect(safe).not.toMatch(/<script/i)
  })

  it('drops <use> entirely (whether external or fragment ref)', () => {
    // DOMPurify's SVG profile blocks `<use>` as a class — it's a known XSS
    // vector even when restricted to fragments. We accept the stricter rule
    // because our generated SVGs never depend on `<use>`.
    const dirty =
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 32 32">' +
      '<defs><circle id="a" r="1"/></defs>' +
      '<use href="https://evil.example/x.svg#a"/>' +
      '<use xlink:href="//evil.example/x.svg#a"/>' +
      '<use href="#a"/>' +
      '</svg>'
    const safe = sanitizeSvg(dirty)
    expect(safe).not.toMatch(/evil\.example/)
    expect(safe).not.toMatch(/<use/i)
  })

  it('drops animate/set elements that retarget href to a script URI', () => {
    const dirty = wrap(
      '<a href="#safe">' +
        '<animate attributeName="href" values="javascript:alert(1)"/>' +
        '<set attributeName="xlink:href" to="javascript:alert(2)"/>' +
        '<circle r="1"/>' +
        '</a>',
    )
    const safe = sanitizeSvg(dirty)
    expect(safe.toLowerCase()).not.toContain('javascript:')
  })

  // The four tests below exercise the custom uponSanitizeAttribute hook in
  // sanitize-svg.ts — vectors DOMPurify's base SVG profile allows. If the
  // hook is removed or loosened these fail; the earlier tests would not.

  it('drops external http(s) hrefs (base profile allows them)', () => {
    const dirty = wrap(
      '<a href="https://evil.example/track"><circle r="1"/></a>' +
        '<a xlink:href="//evil.example/track2"><rect width="1" height="1"/></a>',
    )
    const safe = sanitizeSvg(dirty)
    expect(safe).not.toMatch(/evil\.example/)
    expect(safe).not.toMatch(/href/i)
  })

  it('keeps fragment-only hrefs', () => {
    const dirty = wrap('<a href="#local"><circle r="1"/></a>')
    const safe = sanitizeSvg(dirty)
    expect(safe).toMatch(/href="#local"/)
  })

  it('drops style attributes referencing a remote url()', () => {
    const dirty = wrap(
      '<circle r="1" style="fill:url(http://evil.example/p.png)"/>' +
        '<rect width="1" height="1" style="fill: url( \'https://evil.example/q.png\' )"/>' +
        '<path d="M0 0" style="fill:url(//evil.example/r.png)"/>',
    )
    const safe = sanitizeSvg(dirty)
    expect(safe).not.toMatch(/evil\.example/)
  })

  it('keeps style attributes referencing a local fragment url()', () => {
    const dirty = wrap(
      '<defs><linearGradient id="g"/></defs>' +
        '<circle r="1" style="fill:url(#g)"/>' +
        '<rect width="1" height="1" style="fill: url( \'#g\' )"/>',
    )
    const safe = sanitizeSvg(dirty)
    expect(safe).toMatch(/url\(\s*['"]?#g/)
  })

  it('drops presentation attributes referencing a remote url() (fill, filter, mask)', () => {
    // Not URI attributes, so DOMPurify's ALLOWED_URI_REGEXP never sees them —
    // but Firefox fetches external paint servers for inline SVG (remote-fetch
    // tracking surface, same class as the style vector above).
    const dirty = wrap(
      '<circle r="1" fill="url(https://evil.example/p.svg#f)"/>' +
        '<rect width="1" height="1" filter="url(//evil.example/f.svg#b)"/>' +
        '<path d="M0 0" mask="url(http://evil.example/m.svg#m)"/>',
    )
    const safe = sanitizeSvg(dirty)
    expect(safe).not.toMatch(/evil\.example/)
  })

  it('keeps fragment url() presentation attributes (gradients are core to real icons)', () => {
    // e.g. the shipped dai icon: fill="url(#dai_full__paint0_linear...)"
    const dirty = wrap(
      '<defs><linearGradient id="paint0"/></defs>' +
        '<circle r="1" fill="url(#paint0)"/>',
    )
    const safe = sanitizeSvg(dirty)
    expect(safe).toMatch(/fill="url\(#paint0\)"/)
  })

  it('returns empty string when the input is not parseable', () => {
    expect(sanitizeSvg('')).toBe('')
  })
})

// parseSvgContent's behaviour now lives behind svgTextToReact — see
// svg-to-react.test.tsx, which asserts the same sanitization guarantees
// against the React output instead of an intermediate string.
