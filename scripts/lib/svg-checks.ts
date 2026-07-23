// Pure, environment-agnostic SVG checks — no fs, no jsdom, no SVGO, no DOM.
// Extracted from validate-svg.ts so the exact same rules run in three places:
// `pnpm validate` (CI, via validate-svg.ts which adds the jsdom/SVGO steps),
// the contribute submit endpoint (Cloudflare Worker — no DOM available), and
// anywhere else that needs structural SVG validation. Keep this file free of
// runtime-environment imports so it bundles anywhere.

export interface ValidationError {
  file: string
  message: string
  autoFixed?: boolean
}

export interface ValidationWarning {
  file: string
  message: string
}

export interface SvgFileResult {
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

// Tags the runtime sanitizer strips: sanitize-svg.ts FORBID_TAGS plus <use>
// (blocked by DOMPurify's own SVG profile). Named here for actionable error
// messages; in `pnpm validate`, checkRuntimeSanitizerParity is the
// authoritative gate on top of these.
export const FORBIDDEN_TAGS = [
  'script',
  'foreignObject',
  'text',
  'image',
  'style',
  'use',
]

export function checkNoEmbeddedContent(
  svgContent: string,
  filePath: string,
  r: SvgFileResult,
) {
  for (const tag of FORBIDDEN_TAGS) {
    if (new RegExp(`<${tag}[\\s/>]`).test(svgContent)) {
      r.errors.push({
        file: filePath,
        message: `Contains forbidden element: <${tag}>`,
      })
    }
  }

  const eventHandlers = /\son\w+\s*=/i
  if (eventHandlers.test(svgContent)) {
    r.errors.push({
      file: filePath,
      message: 'Contains event handler attributes',
    })
  }

  // Same rule as the runtime sanitizer: href/xlink:href must be a fragment
  // reference (#id). Catches javascript:, data:, http(s), and
  // protocol-relative URLs in either quote style.
  const hrefRe = /(?:xlink:)?href\s*=\s*(?:"([^"]*)"|'([^']*)')/gi
  for (const match of svgContent.matchAll(hrefRe)) {
    const value = match[1] ?? match[2] ?? ''
    if (!value.startsWith('#')) {
      r.errors.push({
        file: filePath,
        message: `Non-fragment href "${value}" (only "#id" references are allowed)`,
      })
    }
  }

  // url(...) must also point at a local fragment — anything else loads an
  // external resource (CSS or paint-server reference).
  const urlRe = /url\(\s*(['"]?)\s*(#?)/gi
  for (const match of svgContent.matchAll(urlRe)) {
    if (match[2] !== '#') {
      r.errors.push({
        file: filePath,
        message: 'Non-fragment url() reference (only "url(#id)" is allowed)',
      })
    }
  }
}

// A wrong viewBox is a hard error, never an auto-fix: rewriting the
// attribute without rescaling the geometry crops or misplaces art exported
// at a different canvas size. The asset must be re-exported at 32x32.
export function checkViewBox(
  svgContent: string,
  filePath: string,
  r: SvgFileResult,
) {
  const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/)
  if (!viewBoxMatch) {
    r.errors.push({
      file: filePath,
      message: 'Missing viewBox attribute (expected "0 0 32 32")',
    })
    return
  }
  const viewBox = viewBoxMatch[1]
  if (viewBox !== '0 0 32 32') {
    r.errors.push({
      file: filePath,
      message: `viewBox is "${viewBox}", expected "0 0 32 32" — re-export the art at 32x32 (auto-rewriting the viewBox would distort it)`,
    })
  }
}

// Every id in shipped content must carry the per-asset prefix that SVGO's
// prefixIds applies — generic ids (clip0_1_2) collide across icons once
// they share a DOM. Independent assertion so a prefixIds config regression
// can't slip through.
export function checkIdsPrefixed(
  content: string,
  prefix: string,
  filePath: string,
  r: SvgFileResult,
) {
  for (const m of content.matchAll(/\bid="([^"]+)"/g)) {
    if (!m[1].startsWith(`${prefix}__`)) {
      r.errors.push({
        file: filePath,
        message: `id "${m[1]}" is not prefixed with "${prefix}__" — unprefixed ids collide across icons in the DOM`,
      })
    }
  }
}
