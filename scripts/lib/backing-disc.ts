// Guard against a white backing disc peeking out from behind non-round art.
//
// Many full icons sit on a white r=16 disc (the coin). Behind round art the
// disc is hidden; behind off-centre or non-round art (e.g. WETH's offset
// rings) it shows as white slivers that look broken on dark surfaces. The
// check renders the icon with the disc removed and measures how much of the
// disc area is transparent AND connected to the canvas edge — i.e. disc that
// is visible around the outside of the art. Gaps enclosed by the art (the
// inside of avax's triangle, op's letters) don't count: filling those white
// is what the disc is for.

import { Resvg } from '@resvg/resvg-js'
import { basename, dirname } from 'path'
import type { SvgFileResult } from './svg-checks.ts'

const WHITE_DISC =
  '<path fill="#fff" d="M16 32c8.837 0 16-7.163 16-16S24.837 0 16 0 0 7.164 0 16s7.164 16 16 16"/>'

// Icons whose disc is meant to be seen: dark line-art logos that disappear on
// dark surfaces without a light plate (plasma, sonic, mantle), gnosis (the
// disc fills the notch around the owl), and g-uni (the disc backs its "UNI"
// label).
const INTENDED_DISC = new Set([
  'chains/plasma',
  'chains/sonic',
  'chains/mantle',
  'chains/gnosis',
  'tokens/guni',
])

const SIZE = 128
// Fraction of the disc area allowed to show around the art before it reads as
// a sliver. WETH, the motivating case, sat at ~3.7%.
const MAX_EXPOSED = 0.005

function assetKey(svgPath: string): string {
  return `${basename(dirname(svgPath))}/${basename(svgPath).replace(/_full\.svg$/, '')}`
}

// Share of the disc that is transparent in `bare` and reachable from the
// canvas border through transparent pixels.
function exposedDiscFraction(bare: Uint8Array): number {
  const transparent = (p: number) => bare[p * 4 + 3] < 128
  const outside = new Uint8Array(SIZE * SIZE)
  const stack: number[] = []
  const seed = (p: number) => {
    if (!outside[p] && transparent(p)) {
      outside[p] = 1
      stack.push(p)
    }
  }
  for (let i = 0; i < SIZE; i++) {
    seed(i)
    seed((SIZE - 1) * SIZE + i)
    seed(i * SIZE)
    seed(i * SIZE + SIZE - 1)
  }
  while (stack.length) {
    const p = stack.pop()!
    const x = p % SIZE
    const y = (p - x) / SIZE
    if (x > 0) seed(p - 1)
    if (x < SIZE - 1) seed(p + 1)
    if (y > 0) seed(p - SIZE)
    if (y < SIZE - 1) seed(p + SIZE)
  }

  const r = SIZE / 2
  let disc = 0
  let exposed = 0
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      // Skip the anti-aliased rim of the disc itself.
      if (Math.hypot(x + 0.5 - r, y + 0.5 - r) > r - 1) continue
      disc++
      if (outside[y * SIZE + x]) exposed++
    }
  }
  return exposed / disc
}

export function checkBackingDiscHidden(
  svgContent: string,
  filePath: string,
  r: SvgFileResult,
) {
  if (!svgContent.includes(WHITE_DISC)) return
  if (INTENDED_DISC.has(assetKey(filePath))) return

  const bare = new Resvg(svgContent.replace(WHITE_DISC, ''), {
    fitTo: { mode: 'width', value: SIZE },
  }).render().pixels
  const exposed = exposedDiscFraction(new Uint8Array(bare))
  if (exposed > MAX_EXPOSED) {
    r.errors.push({
      file: filePath,
      message: `White backing disc shows around the artwork (${(exposed * 100).toFixed(1)}% of the disc) and looks broken on dark surfaces — remove the <path fill="#fff" d="M16 32c8.837…"/> disc, or add "${assetKey(filePath)}" to INTENDED_DISC in scripts/lib/backing-disc.ts if the logo needs a light plate`,
    })
  }
}
