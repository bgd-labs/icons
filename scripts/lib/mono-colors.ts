// Pure mono-color helpers — zero dependencies, no fs, no SVGO, no DOM. Split
// out of svg-optimizer.ts (which pulls in SVGO) so the same color checks run
// in three places byte-for-byte: `pnpm validate` (CI), the submit endpoint,
// and the showcase contribute route's live client-side feedback. Keep this
// file import-free so it bundles into the browser cleanly.

// Attributes that carry a paint value. `color` is included because setting
// it hardcodes what currentColor resolves to further down the tree.
export const PAINT_ATTRS = [
  'fill',
  'stroke',
  'stop-color',
  'flood-color',
  'lighting-color',
  'color',
] as const

// `(?<![\w-])` anchors the paint-attr name to an attribute boundary. Without
// it, `color` (and `fill` etc.) matches the SUFFIX of a longer attribute —
// `data-fill="#123"` would be flagged and rewritten to `data-fill="currentColor"`.
const PAINT_ATTR_RE = new RegExp(
  `(?<![\\w-])(${PAINT_ATTRS.join('|')})="([^"]*)"`,
  'g',
)
const STYLE_ATTR_RE = /style="([^"]*)"/g

// Paint values a mono SVG may use without hardcoding a color. Everything
// else — hex, rgb()/hsl(), named colors — must become currentColor.
const ALLOWED_MONO_PAINT = new Set([
  'currentcolor',
  'none',
  'transparent',
  'inherit',
])

function isAllowedMonoPaint(value: string): boolean {
  const v = value.trim().toLowerCase()
  return ALLOWED_MONO_PAINT.has(v) || v.startsWith('url(#')
}

function stripDefs(svgContent: string): string {
  return svgContent.replace(/<defs[\s\S]*?<\/defs>/g, '')
}

// The canvas rect as path data, in the two windings SVGO's rect-to-path
// conversion produces (`M0 0h32v32H0z` / `M0 0v32h32V0z`), relative or
// absolute. An EXACT match only — a path with any glyph subpaths never fits.
const CANVAS_PATH_RES = [
  /^M0[\s,]*0[\s,]*[hH]32[\s,]*[vV]32[\s,]*[hH]0[\s,]*(?:[vV]0[\s,]*)?[zZ]$/,
  /^M0[\s,]*0[\s,]*[vV]32[\s,]*[hH]32[\s,]*[vV]0[\s,]*(?:[hH]0[\s,]*)?[zZ]$/,
]

function isCanvasPathTag(tag: string): boolean {
  const d = /\bd="([^"]*)"/.exec(tag)?.[1]?.trim()
  return d !== undefined && CANVAS_PATH_RES.some((re) => re.test(d))
}

function isCanvasRectTag(tag: string): boolean {
  const attrs = Object.fromEntries(
    Array.from(tag.matchAll(/([\w-]+)="([^"]*)"/g), (m) => [m[1], m[2]]),
  )
  // x/y default to 0; a rounded or transformed rect is badge art, not a
  // background, so those never match.
  if (attrs.rx !== undefined || attrs.ry !== undefined) return false
  if (attrs.transform !== undefined) return false
  const num = (v: string | undefined) => (v === undefined ? 0 : parseFloat(v))
  return (
    num(attrs.width) === 32 &&
    num(attrs.height) === 32 &&
    num(attrs.x) === 0 &&
    num(attrs.y) === 0
  )
}

/**
 * Drop rendered shapes that cover the entire 32x32 viewBox. Source mono art
 * is often exported as a dark glyph on a WHITE backing rect; recoloring that
 * rect to currentColor turns the icon into a solid block. A full-bleed
 * background carries no glyph information in either paint, so it is dropped
 * rather than recolored. `<defs>` content (clip paths, masks) is untouched,
 * and badge shapes (rounded rects, circles) are real art — never matched.
 */
export function dropFullCanvasBackgrounds(svgContent: string): string {
  return svgContent
    .split(/(<defs[\s\S]*?<\/defs>)/g)
    .map((part) => {
      if (part.startsWith('<defs')) return part
      return part
        .replace(/<rect\b[^>]*?\/?>/g, (tag) =>
          isCanvasRectTag(tag) ? '' : tag,
        )
        .replace(/<path\b[^>]*?\/?>/g, (tag) =>
          isCanvasPathTag(tag) ? '' : tag,
        )
    })
    .join('')
}

/**
 * Every hardcoded paint a mono SVG carries outside `<defs>`, as
 * human-readable `attr="value"` / `prop: value` strings. Covers paint
 * attributes and inline style declarations in any color syntax (hex,
 * rgb()/hsl(), named colors) — not just hex literals.
 */
export function findHardcodedMonoColors(svgContent: string): string[] {
  const visible = stripDefs(svgContent)
  const found: string[] = []
  for (const m of visible.matchAll(PAINT_ATTR_RE)) {
    if (!isAllowedMonoPaint(m[2])) found.push(`${m[1]}="${m[2]}"`)
  }
  for (const m of visible.matchAll(STYLE_ATTR_RE)) {
    for (const decl of m[1].split(';')) {
      const [prop, ...rest] = decl.split(':')
      const property = prop?.trim() as (typeof PAINT_ATTRS)[number]
      const value = rest.join(':').trim()
      if (!property || !value) continue
      if (PAINT_ATTRS.includes(property) && !isAllowedMonoPaint(value)) {
        found.push(`${property}: ${value}`)
      }
    }
  }
  return found
}

/** Rewrite every hardcoded paint outside `<defs>` to currentColor. */
export function replaceColorsWithCurrentColor(svgContent: string): string {
  const combined = new RegExp(
    `<defs[\\s\\S]*?</defs>|(?<![\\w-])(${PAINT_ATTRS.join('|')})="([^"]*)"|style="([^"]*)"`,
    'g',
  )
  return svgContent.replace(
    combined,
    (match, attr?: string, attrValue?: string, styleValue?: string) => {
      if (match.startsWith('<defs')) return match
      if (attr !== undefined && attrValue !== undefined) {
        return isAllowedMonoPaint(attrValue) ? match : `${attr}="currentColor"`
      }
      const fixed = (styleValue ?? '')
        .split(';')
        .map((decl) => {
          const [prop, ...rest] = decl.split(':')
          const property = prop?.trim() as (typeof PAINT_ATTRS)[number]
          const value = rest.join(':').trim()
          if (!property || !value) return decl
          if (PAINT_ATTRS.includes(property) && !isAllowedMonoPaint(value)) {
            return `${property}: currentColor`
          }
          return decl
        })
        .join(';')
      return `style="${fixed}"`
    },
  )
}
