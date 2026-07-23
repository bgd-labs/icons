// The per-SVG validation pipeline — the CPU-bound part of `pnpm validate`
// (jsdom DOMParser parse + DOMPurify sanitizer-parity check + SVGO optimize +
// mono auto-fix rewrites). Extracted here as ONE source of truth so the inline
// main-thread path and the worker_threads pool run byte-for-byte the same
// checks. Catalogue-level checks (cross-type duplicates, alias collisions) and
// the cheap structural checks (json/svg pairing, metadata) stay in validate.ts
// on the main thread.

import { readFileSync, writeFileSync } from 'fs'
import { basename } from 'path'
import { JSDOM } from 'jsdom'
import {
  dropFullCanvasBackgrounds,
  findHardcodedMonoColors,
  replaceColorsWithCurrentColor,
} from './mono-colors.ts'
import { optimizeSvg } from '../svg-optimizer.ts'
import { sanitizeSvgRoot } from '../../packages/react/src/sanitize-svg.ts'

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

// A single SVG file to validate, plus the SVGO id-prefix to apply.
export interface SvgFileTask {
  /** Absolute path to the SVG file on disk. */
  svgPath: string
  /** prefixIds prefix + ids-prefixed assertion prefix (asset name or frame_*). */
  prefix: string
  /** Whether checkMonoCurrentColor applies (asset _mono.svg / frame mono.svg). */
  isMono: boolean
}

// jsdom is expensive to construct; set it up ONCE per process (per worker, per
// inline run) — never per file. The runtime sanitizer feature-detects
// window/DOMParser/XMLSerializer at call time, so we install a jsdom
// environment to run the exact same DOMPurify profile that guards
// network-fetched SVGs at runtime.
let jsdomWindow: JSDOM['window'] | null = null

export function setupSvgEnv(): void {
  if (jsdomWindow) return
  jsdomWindow = new JSDOM('').window
  const g = globalThis as Record<string, unknown>
  g.window ??= jsdomWindow
  g.DOMParser ??= jsdomWindow.DOMParser
  g.XMLSerializer ??= jsdomWindow.XMLSerializer
}

// --- SVG content checks (each pushes into a per-file result) ---

// Tags the runtime sanitizer strips: sanitize-svg.ts FORBID_TAGS plus <use>
// (blocked by DOMPurify's own SVG profile). Named here for actionable error
// messages; checkRuntimeSanitizerParity is the authoritative gate.
const FORBIDDEN_TAGS = [
  'script',
  'foreignObject',
  'text',
  'image',
  'style',
  'use',
]

function checkNoEmbeddedContent(
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
function checkViewBox(svgContent: string, filePath: string, r: SvgFileResult) {
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

function checkMonoCurrentColor(
  svgContent: string,
  filePath: string,
  r: SvgFileResult,
): string {
  // A white backing rect/path from the source art must be dropped BEFORE
  // the color pass — recoloring it to currentColor renders the icon as a
  // solid block. Dropped unconditionally: a full-bleed shape is background
  // in any paint, including an already-converted currentColor one.
  const withoutBackground = dropFullCanvasBackgrounds(svgContent)
  if (withoutBackground !== svgContent) {
    r.errors.push({
      file: filePath,
      message:
        'Mono SVG has a full-canvas background shape (would render as a solid block), dropping it',
      autoFixed: true,
    })
    svgContent = withoutBackground
  }
  // Hardcoded paints in any syntax — hex, rgb()/hsl(), named colors —
  // outside <defs> (gradient internals are exempt).
  const hardcoded = findHardcodedMonoColors(svgContent)
  if (hardcoded.length > 0) {
    const sample = hardcoded.slice(0, 3).join(', ')
    const more = hardcoded.length > 3 ? ', …' : ''
    r.errors.push({
      file: filePath,
      message: `Mono SVG has ${hardcoded.length} hardcoded color(s) (${sample}${more}), replacing with currentColor`,
      autoFixed: true,
    })
    svgContent = replaceColorsWithCurrentColor(svgContent)
  }
  if (!svgContent.includes('currentColor')) {
    r.errors.push({
      file: filePath,
      message: 'Mono SVG does not use currentColor',
    })
  }
  return svgContent
}

// Full-colour SVGs carry the same Figma export artifact as mono: a full-canvas
// backing rect/square-path behind the real art. It's invisible on a white page
// but shows as a solid block (e.g. white corners around a circular glyph) on
// any other surface. `dropFullCanvasBackgrounds` only removes full-bleed
// rects/square-paths — intended circular/rounded badges are never matched — so
// it's safe to run on the colour variant unconditionally.
function checkFullCanvasBackground(
  svgContent: string,
  filePath: string,
  r: SvgFileResult,
): string {
  const withoutBackground = dropFullCanvasBackgrounds(svgContent)
  if (withoutBackground !== svgContent) {
    r.errors.push({
      file: filePath,
      message:
        'SVG has a full-canvas background rect/square (export artifact — shows as a solid block on non-white surfaces), dropping it',
      autoFixed: true,
    })
    return withoutBackground
  }
  return svgContent
}

function firstDifference(a: string, b: string): string {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return a.slice(Math.max(0, i - 40), i + 40)
}

// Run the asset through the exact sanitizer that guards network-fetched
// SVGs at runtime. If sanitization would change the markup, the asset
// contains something outside the allowed profile — reject it at build time
// instead of shipping it verbatim inside a generated component.
function checkRuntimeSanitizerParity(
  svgContent: string,
  filePath: string,
  r: SvgFileResult,
) {
  const win = jsdomWindow!
  const parsed = new win.DOMParser().parseFromString(
    svgContent,
    'image/svg+xml',
  ).documentElement
  if (parsed.nodeName !== 'svg') {
    r.errors.push({
      file: filePath,
      message: 'Not parseable as an <svg> document',
    })
    return
  }
  const serializer = new win.XMLSerializer()
  const before = serializer.serializeToString(parsed)
  const root = sanitizeSvgRoot(svgContent)
  const after = root ? serializer.serializeToString(root) : ''
  if (before !== after) {
    r.errors.push({
      file: filePath,
      message: `Runtime sanitizer would strip markup from this SVG (forbidden tag/attribute or non-fragment reference) near: …${firstDifference(before, after)}…`,
    })
  }
}

// Every id in shipped content must carry the per-asset prefix that SVGO's
// prefixIds applies — generic ids (clip0_1_2) collide across icons once
// they share a DOM. Independent assertion so a prefixIds config regression
// can't slip through.
function checkIdsPrefixed(
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

/**
 * The full per-file validation pipeline. CPU-bound (jsdom parse, DOMPurify,
 * SVGO). In mutate mode (`mutate: true`) it writes auto-fixed/optimized
 * content back to disk itself — files are disjoint across shards so concurrent
 * worker writes are safe. In check mode it instead reports "File would be
 * modified". Pure with respect to shared state: returns a fresh result object.
 *
 * `setupSvgEnv()` MUST have been called once in this process first.
 */
export function validateSvgFile(
  task: SvgFileTask,
  mutate: boolean,
): SvgFileResult {
  const { svgPath, prefix, isMono } = task
  const r: SvgFileResult = { errors: [], warnings: [] }

  let content = readFileSync(svgPath, 'utf-8')
  const originalContent = content

  checkNoEmbeddedContent(content, svgPath, r)
  checkViewBox(content, svgPath, r)

  // Run SVGO and check size reduction. A failure is a hard error: id
  // prefixing happens inside SVGO (prefixIds), so un-optimized content
  // would ship generic ids (clip0_1_2) that collide across icons in the
  // DOM — the duplicate-clip-path class of bugs.
  try {
    const optimized = optimizeSvg(content, prefix)
    const reduction = 1 - optimized.length / content.length
    if (reduction > 0.2) {
      r.warnings.push({
        file: svgPath,
        message: `SVGO reduced size by ${Math.round(reduction * 100)}%, consider optimizing before commit`,
      })
    }
    content = optimized
    checkIdsPrefixed(content, prefix, svgPath, r)
    // Mono-color check runs on the OPTIMIZED bytes, not the raw file: SVGO
    // canonicalises quoting and colour syntax (fill='#123' -> fill="#123",
    // black -> #000). Checking the raw bytes let a paint that only differs
    // from the check's expectations by syntax pass, then get normalised by
    // SVGO and shipped by generate before the next validate run caught it.
    if (isMono) content = checkMonoCurrentColor(content, svgPath, r)
    else content = checkFullCanvasBackground(content, svgPath, r)
  } catch (e: unknown) {
    r.errors.push({
      file: svgPath,
      message: `SVGO optimization failed: ${e instanceof Error ? e.message : String(e)}`,
    })
  }

  // Final gate: what ships must survive the runtime sanitizer unchanged
  checkRuntimeSanitizerParity(content, svgPath, r)

  // Write back if changed
  if (content !== originalContent) {
    if (mutate) {
      writeFileSync(svgPath, content)
    } else {
      r.errors.push({
        file: svgPath,
        message: 'File would be modified (run without --check to auto-fix)',
      })
    }
  }

  return r
}

// Helper for building the asset-SVG prefix the way the inline code did.
export function assetSvgPrefix(svgPath: string): string {
  return basename(svgPath).replace(/\.svg$/, '')
}
