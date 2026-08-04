import { ToWords } from 'to-words'
import {
  styleStringToObject,
  toReactAttributeName,
} from '../packages/react/src/svg-attributes'

const toWords = new ToWords()

/**
 * Convert SVG string to JSX-compatible string (for inline React component bodies).
 * Returns the inner content of the SVG (everything between <svg> and </svg>).
 *
 * Attribute conversion uses the same rule as the runtime network fallback
 * (packages/react/src/svg-attributes.ts) so a bundled component and a
 * runtime-fetched SVG of the same asset render identically.
 */
export function svgToJsx(svgString: string): string {
  let jsx = svgString.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ')

  // Convert attribute names (only in `name="value"` position, never inside
  // attribute values) to React props
  jsx = jsx.replace(
    /([a-zA-Z_][\w:.-]*)=("[^"]*")/g,
    (_match, name: string, value: string) =>
      `${toReactAttributeName(name)}=${value}`,
  )

  // Convert inline CSS style strings to React style objects
  jsx = jsx.replace(/style="([^"]*)"/g, (_match, styleStr: string) => {
    const body = Object.entries(styleStringToObject(styleStr))
      .map(([prop, value]) => `${prop}: ${JSON.stringify(value)}`)
      .join(', ')
    return `style={{${body}}}`
  })

  return jsx
}

/**
 * Rewrite SVG resource ids and their references into per-instance
 * expressions. Input is JSX text from svgToJsx(); every id DEFINED in it
 * (SVGO's prefixIds already made these unique per asset, but every rendered
 * instance of the same asset still shares them) becomes `${uidVar}<id>`:
 *
 *   id="x"            ->  id={`${uid}x`}
 *   attr="url(#x)"    ->  attr={`url(#${uid}x)`}   (all occurrences per value)
 *   href="#x"         ->  href={`#${uid}x`}         (also xlinkHref)
 *   style={{p: "url(#x)"}} -> style={{p: `url(#x-with-uid)`}}
 *
 * References to ids not defined in this SVG are left alone. Returns the
 * rewritten JSX plus how many ids were parameterized, so callers can skip
 * the useId() plumbing for the common id-free icon.
 *
 * Why this matters: id lookups for url(#...) are DOCUMENT-global and take
 * the first match, so two mounted copies of one icon share resources — and
 * when the first copy sits in a hidden subtree (a closed drawer, a
 * display:none panel), every visible copy clips/paints to nothing.
 */
export function parameterizeIds(
  jsx: string,
  uidVar = 'uid',
): { jsx: string; idCount: number } {
  const ids = new Set<string>()
  for (const match of jsx.matchAll(/\bid="([^"]+)"/g)) ids.add(match[1])
  if (ids.size === 0) return { jsx, idCount: 0 }

  const substituteRefs = (value: string): { value: string; hit: boolean } => {
    let out = value
    let hit = false
    for (const id of ids) {
      const ref = `url(#${id})`
      if (out.includes(ref)) {
        out = out.split(ref).join(`url(#\${${uidVar}}${id})`)
        hit = true
      }
    }
    return { value: out, hit }
  }

  // Attribute position: name="value". Style objects were already converted
  // to `style={{...}}` by svgToJsx, so their string values never match here.
  let out = jsx.replace(
    /([a-zA-Z_][\w:.-]*)="([^"]*)"/g,
    (match, name: string, value: string) => {
      if (name === 'id' && ids.has(value)) {
        return `id={\`\${${uidVar}}${value}\`}`
      }
      if (
        (name === 'href' || name === 'xlinkHref') &&
        value.startsWith('#') &&
        ids.has(value.slice(1))
      ) {
        return `${name}={\`#\${${uidVar}}${value.slice(1)}\`}`
      }
      const { value: substituted, hit } = substituteRefs(value)
      return hit ? `${name}={\`${substituted}\`}` : match
    },
  )

  // Remaining quoted occurrences are style-object string values (attribute
  // positions were consumed above): swap the string literal for a template.
  out = out.replace(/"([^"]*url\(#[^"]*)"/g, (match, value: string) => {
    const { value: substituted, hit } = substituteRefs(value)
    return hit ? `\`${substituted}\`` : match
  })

  return { jsx: out, idCount: ids.size }
}

/**
 * Extract the inner content between <svg> and </svg> tags.
 */
export function extractSvgInner(svgString: string): string {
  const inner = svgString
    .replace(/<svg[^>]*>/, '')
    .replace(/<\/svg>/, '')
    .trim()
  return inner
}

/**
 * Extract the viewBox from an SVG string.
 */
export function extractViewBox(svgString: string): string | null {
  const match = svgString.match(/viewBox="([^"]+)"/)
  return match ? match[1] : null
}

export function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

function normalizeSymbol(rawName: string): string {
  return rawName
    .split(/(\d+)/)
    .map((part) => {
      if (/^\d+$/.test(part)) {
        // to-words joins multi-word numbers with spaces ("One Thousand") —
        // a space inside an identifier doesn't compile. Also defend against
        // hyphens some locales emit ("Twenty-One").
        return capitalize(toWords.convert(parseInt(part, 10))).replace(
          /[\s-]+/g,
          '',
        )
      }
      return capitalize(part)
    })
    .join('')
}

/**
 * Create a PascalCase React component name from an asset name.
 * Handles numeric prefixes like "1inch" -> "OneInchIcon"
 */
export function createComponentName(
  symbol: string,
  suffix: string = 'Icon',
): string {
  const cleaned = symbol.replace(/[^a-zA-Z0-9]/g, '')
  const normalized = normalizeSymbol(cleaned)
  return normalized + suffix
}
