import createDOMPurify from 'dompurify'
import type { DOMPurify } from 'dompurify'

// `<use>` and `<script>` are blocked by DOMPurify's SVG profile already
// (svgDisallowed in the upstream source); listing them here is defense in
// depth in case a future profile change relaxes that.
const FORBID_TAGS = ['script', 'foreignObject', 'text', 'image', 'style', 'use']

let purifierCache: DOMPurify | null = null

function getPurifier(): DOMPurify | null {
  if (purifierCache) return purifierCache
  if (typeof window === 'undefined') return null
  const p = createDOMPurify(
    window as unknown as Parameters<typeof createDOMPurify>[0],
  )
  // ALLOWED_URI_REGEXP can't be used to restrict href/xlink:href without also
  // killing geometry attrs like cx/cy/r (DOMPurify applies the URI regex to
  // every non-URI-safe attribute value). A scoped hook on this DOMPurify
  // instance lets us reject non-fragment href values without touching the
  // global DOMPurify state — important for consumers who use DOMPurify
  // elsewhere in their app.
  p.addHook('uponSanitizeAttribute', (_node, ev) => {
    const v = typeof ev.attrValue === 'string' ? ev.attrValue : ''
    if (ev.attrName === 'href' || ev.attrName === 'xlink:href') {
      if (!v.startsWith('#')) ev.keepAttr = false
      return
    }
    // A url() referencing anything but a local fragment is a remote fetch
    // (tracking-pixel surface) we never need. It can arrive through style
    // ("fill:url(http://...)") or through url()-capable presentation
    // attributes (fill, stroke, filter, mask, clip-path, marker-*) — none of
    // which DOMPurify URI-checks. Checking every attribute value costs one
    // regex test and can't miss an attribute we forgot to enumerate; legit
    // icons only use fragment refs (url(#gradient)), which the (?!#) keeps.
    if (/url\s*\(\s*['"]?\s*(?!#)/i.test(v)) ev.keepAttr = false
  })
  purifierCache = p
  return p
}

// DOMPurify's string-mode sanitize parses input as HTML, which silently
// drops case-sensitive SVG attributes (viewBox, preserveAspectRatio). Parse
// with image/svg+xml first and sanitize in place to keep the SVG-namespace
// context and attribute case. svg-to-react.ts converts the returned root to
// React nodes from this same DOM — no serialize/re-parse round-trip.
export function sanitizeSvgRoot(svgText: string): SVGSVGElement | null {
  if (typeof DOMParser === 'undefined') return null
  const purifier = getPurifier()
  if (!purifier) return null
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  const root = doc.documentElement
  if (root.nodeName !== 'svg') return null
  purifier.sanitize(root, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS,
    IN_PLACE: true,
  })
  return root as unknown as SVGSVGElement
}
