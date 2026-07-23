// One-off migration: give every FULL icon a white circle behind the artwork.
//
// Some full icons already draw a white full-canvas disc as their first shape
// (e.g. link, uni, sushi) so their colored logo sits on a white coin. Others
// open with a colored/gradient disc (ethereum, avax, aave) or, in a few cases,
// no backing shape at all (gnosis, metamask, sonic). This script prepends a
// white r=16 circle as the FIRST child of the clip <g> in every full icon that
// does not already start with a white full-canvas disc — so all full icons have
// a white circle behind them. Behind an opaque colored disc it is invisible;
// behind a bare logo it provides the missing white coin.
//
// Idempotent: re-running skips any icon whose first drawn shape is already a
// white full-canvas disc. The inserted circle is a plain <path> with no id and
// SVGO-canonical geometry, so it survives `pnpm validate` untouched
// (dropFullCanvasBackgrounds only removes full-canvas rects/square-paths, never
// circles).
//
//   tsx scripts/add-white-circle.ts          # apply, mutating assets/
//   tsx scripts/add-white-circle.ts --dry    # report only, write nothing

import { readdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { join } from 'path'

const ASSETS_DIR = join(import.meta.dirname, '..', 'assets')

// The white backing disc: a centered r=16 circle in SVGO-canonical form (the
// exact spelling other icons in the set already use for their badge circle).
const WHITE_CIRCLE =
  '<path fill="#fff" d="M16 32c8.837 0 16-7.163 16-16S24.837 0 16 0 0 7.164 0 16s7.164 16 16 16"/>'

const WHITE_RE = /^(#fff|#ffffff|white)$/i

// Trace a path's on-curve points (absolute + relative commands) and return the
// axis-aligned bounding box of its anchor endpoints. Control points are
// ignored — a circle's four segment endpoints already sit at the 0/32
// extremes, which is all the full-canvas test needs, and skipping control
// points sidesteps the arc-flag parsing hazard. Handles M/L/H/V/C/S/Q/T/A/Z in
// either case; unknown commands are ignored.
function pathBBox(
  d: string,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const segs = d.matchAll(/([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g)
  let cx = 0
  let cy = 0
  let sx = 0
  let sy = 0
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let any = false
  const see = (x: number, y: number) => {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
    any = true
  }
  for (const [, cmdRaw, argStr] of segs) {
    const cmd = cmdRaw as string
    const rel = cmd === cmd.toLowerCase()
    const n = Array.from(
      (argStr as string).matchAll(/-?\d*\.?\d+(?:e[+-]?\d+)?/gi),
      (m) => parseFloat(m[0]),
    )
    const up = cmd.toUpperCase()
    if (up === 'Z') {
      cx = sx
      cy = sy
      continue
    }
    let i = 0
    // step size per implicit repeat, and endpoint extractor
    const stride =
      up === 'H' || up === 'V'
        ? 1
        : up === 'C'
          ? 6
          : up === 'S' || up === 'Q'
            ? 4
            : up === 'A'
              ? 7
              : 2
    while (i + stride <= n.length) {
      if (up === 'H') {
        cx = rel ? cx + n[i] : n[i]
      } else if (up === 'V') {
        cy = rel ? cy + n[i] : n[i]
      } else {
        const ex = n[i + stride - 2]
        const ey = n[i + stride - 1]
        cx = rel ? cx + ex : ex
        cy = rel ? cy + ey : ey
      }
      if (up === 'M' && i === 0) {
        sx = cx
        sy = cy
      }
      see(cx, cy)
      i += stride
    }
  }
  return any ? { minX, minY, maxX, maxY } : null
}

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (entry.endsWith('_full.svg')) out.push(p)
  }
  return out
}

// Is the first drawn shape already a white full-canvas disc? If so, adding
// another white circle behind it is pointless — skip. A shape counts as
// full-canvas when it reaches both the top-left (<= ~0) and bottom-right
// (>= ~32) of the 32x32 viewBox.
function startsWithWhiteDisc(content: string): boolean {
  const gMatch = content.match(/<g\b[^>]*>/)
  if (!gMatch) return false
  const groupFill = gMatch[0].match(/\bfill="([^"]*)"/)?.[1]
  const after = content.slice(gMatch.index! + gMatch[0].length)

  const shape = after.match(/<(path|circle|rect|ellipse)\b[^>]*?\/?>/)
  if (!shape) return false
  const tag = shape[0]
  const kind = shape[1]

  const fill = tag.match(/\bfill="([^"]*)"/)?.[1] ?? groupFill
  if (!fill || !WHITE_RE.test(fill.trim())) return false

  if (kind === 'circle') {
    const r = parseFloat(tag.match(/\br="([^"]*)"/)?.[1] ?? '0')
    return r >= 15.5
  }
  if (kind === 'rect') {
    const w = parseFloat(tag.match(/\bwidth="([^"]*)"/)?.[1] ?? '0')
    const h = parseFloat(tag.match(/\bheight="([^"]*)"/)?.[1] ?? '0')
    return w >= 31.5 && h >= 31.5
  }
  if (kind === 'ellipse') {
    const rx = parseFloat(tag.match(/\brx="([^"]*)"/)?.[1] ?? '0')
    const ry = parseFloat(tag.match(/\bry="([^"]*)"/)?.[1] ?? '0')
    return rx >= 15.5 && ry >= 15.5
  }
  // path: judge by the real bounding box of its traced anchor points. A
  // full-canvas disc reaches the top-left and bottom-right on BOTH axes.
  const d = tag.match(/\bd="([^"]*)"/)?.[1]
  if (!d) return false
  const bb = pathBBox(d)
  if (!bb) return false
  return bb.minX <= 1.5 && bb.minY <= 1.5 && bb.maxX >= 30.5 && bb.maxY >= 30.5
}

function addCircle(content: string): string {
  return content.replace(/(<g\b[^>]*>)/, `$1${WHITE_CIRCLE}`)
}

const dry = process.argv.includes('--dry')
const files = walk(ASSETS_DIR).sort()

let added = 0
let skipped = 0
for (const file of files) {
  const content = readFileSync(file, 'utf-8')
  const rel = file.slice(ASSETS_DIR.length + 1)
  if (startsWithWhiteDisc(content)) {
    skipped++
    continue
  }
  const next = addCircle(content)
  if (next === content) {
    // No <g> to anchor to — should not happen for these assets.
    console.warn(`!! no <g> anchor, unchanged: ${rel}`)
    skipped++
    continue
  }
  if (!dry) writeFileSync(file, next)
  added++
  console.log(`+ ${rel}`)
}

console.log(
  `\n${dry ? '[dry run] ' : ''}${added} icon(s) got a white circle, ${skipped} already had one (${files.length} full icons total).`,
)
