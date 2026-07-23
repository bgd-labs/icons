// Client-side validation for the contribute route — instant feedback only.
// The submit endpoint re-runs the full pipeline (SVGO + runtime-sanitizer
// parity) server-side, and the PR review is the real gate, so this never has
// to be trusted or complete. Reuses the repo's own pure modules so the color
// checks and the suggested brandColor match CI byte-for-byte.
import { findHardcodedMonoColors } from '../../../scripts/lib/mono-colors'
import { dominantColor } from '../../../scripts/lib/dominant-color'

export interface Check {
  level: 'error' | 'warn' | 'ok'
  message: string
}

const FORBIDDEN_TAGS = [
  'script',
  'foreignObject',
  'text',
  'image',
  'style',
  'use',
]

export function checkSvg(content: string, isMono: boolean): Check[] {
  const checks: Check[] = []

  if (!/<svg[\s>]/.test(content)) {
    return [{ level: 'error', message: 'Not an <svg> document' }]
  }

  const vb = content.match(/viewBox="([^"]+)"/)?.[1]
  if (!vb) {
    checks.push({
      level: 'error',
      message: 'Missing viewBox (need "0 0 32 32")',
    })
  } else if (vb !== '0 0 32 32') {
    checks.push({
      level: 'error',
      message: `viewBox is "${vb}" — re-export the art at 32×32`,
    })
  } else {
    checks.push({ level: 'ok', message: 'viewBox 0 0 32 32' })
  }

  for (const tag of FORBIDDEN_TAGS) {
    if (new RegExp(`<${tag}[\\s/>]`).test(content)) {
      checks.push({ level: 'error', message: `Contains forbidden <${tag}>` })
    }
  }

  if (isMono) {
    const hardcoded = findHardcodedMonoColors(content)
    if (hardcoded.length > 0) {
      checks.push({
        level: 'warn',
        message: `${hardcoded.length} hardcoded color(s) — auto-fixed to currentColor on submit (${hardcoded.slice(0, 3).join(', ')})`,
      })
    } else if (!content.includes('currentColor')) {
      checks.push({ level: 'error', message: 'Mono SVG must use currentColor' })
    } else {
      checks.push({ level: 'ok', message: 'uses currentColor' })
    }
  }

  return checks
}

/** Suggested brandColor from the full SVG — same algorithm the build uses. */
export function suggestBrandColor(fullSvg: string): string | undefined {
  try {
    return dominantColor(fullSvg)
  } catch {
    return undefined
  }
}

export const hasError = (checks: Check[]) =>
  checks.some((c) => c.level === 'error')
