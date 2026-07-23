import { cloneElement, createElement, isValidElement } from 'react'
import type { CSSProperties, ReactElement, ReactNode } from 'react'
import { AFrame } from './generated/frames/a'
import { StkFrame } from './generated/frames/stk'
import { StkwaFrame } from './generated/frames/stkwa'
import { WaFrame } from './generated/frames/wa'

const FRAMES: Record<string, typeof AFrame> = {
  a: AFrame,
  stk: StkFrame,
  stkwa: StkwaFrame,
  wa: WaFrame,
}

export interface FrameWrapperProps {
  frame: string
  mono?: boolean
  size?: number | string
  children?: ReactNode
}

const wrapperStyle = (size: number | string): CSSProperties => ({
  position: 'relative',
  width: size,
  height: size,
})

const innerStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

// The icon slot as a fraction of the frame size (26 of 32).
const SLOT_RATIO = 0.8125

const iconContainerStyle: CSSProperties = {
  width: `${SLOT_RATIO * 100}%`,
  height: `${SLOT_RATIO * 100}%`,
}

const frameStyle = (size: number | string): CSSProperties => ({
  position: 'absolute',
  inset: 0,
  width: size,
  height: size,
})

export function FrameWrapper({
  frame,
  mono = false,
  size = 32,
  children,
}: FrameWrapperProps) {
  const FrameSvg = FRAMES[frame]
  if (!FrameSvg) {
    // Bundlers replace process.env.NODE_ENV and dead-code-eliminate this in production
    if (
      typeof process !== 'undefined' &&
      process.env.NODE_ENV !== 'production'
    ) {
      console.warn(
        `[bgd-icons] Unknown frame: "${frame}" (known: ${Object.keys(FRAMES).join(', ')}) — rendering the base icon unframed`,
      )
    }
    return createElement('span', null, children)
  }

  // Fill the slot by default so the base icon doesn't float undersized. Inject
  // a concrete pixel size for a numeric frame size rather than "100%": Safari
  // mis-resolves a percentage-sized SVG here and renders it larger than the
  // slot (the icon overflows / clips). A definite pixel size renders correctly
  // everywhere. A string frame size falls back to "100%". An explicit `size`
  // on the child always wins.
  // Round to a whole pixel — a fractional size (e.g. 56 * 0.8125 = 45.5) makes
  // Safari sub-pixel-clip a sliver off one edge.
  const innerSize: number | string =
    typeof size === 'number' ? Math.floor(size * SLOT_RATIO) : '100%'
  const slotChild =
    isValidElement(children) &&
    (children.props as { size?: number | string }).size == null
      ? cloneElement(children as ReactElement<{ size?: number | string }>, {
          size: innerSize,
        })
      : children

  return createElement(
    'div',
    { style: wrapperStyle(size) },
    createElement(
      'div',
      { style: innerStyle },
      createElement('div', { style: iconContainerStyle }, slotChild),
    ),
    createElement(FrameSvg, { mono, style: frameStyle(size), size }),
  )
}
