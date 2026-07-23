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
