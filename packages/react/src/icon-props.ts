import type { SVGProps } from 'react'

// The single definition of the per-icon component props. Generated
// components, the lazy shards, and the eager map all import this module —
// duplicating the interface into every generated file let the definitions
// drift and made `dts` chew through thousands of identical declarations.
export interface IconProps extends SVGProps<SVGSVGElement> {
  /** Render the single-colour (currentColor) variant. */
  mono?: boolean
  size?: number | string
}

export type FrameIconProps = IconProps
