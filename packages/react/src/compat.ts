import { createElement } from 'react'
import type { ReactNode, SVGProps } from 'react'
import { Icon } from './index'
import { FrameWrapper } from './frames'
import type { IconType } from './types'

// Drop `type` from the inherited SVG attributes so it can't shadow Icon's
// `type` prop on spread; Web3Icon picks its target type from chainId/brandKey
// internally.
export interface Web3IconProps extends Omit<SVGProps<SVGSVGElement>, 'type'> {
  symbol?: string
  chainId?: number | string
  walletKey?: string
  brandKey?: string
  mono?: boolean
  assetTag?: string
  loader?: ReactNode
  size?: number | string
}

export function Web3Icon({
  symbol,
  chainId,
  walletKey,
  brandKey,
  mono,
  assetTag,
  loader,
  size,
  ...props
}: Web3IconProps) {
  const input = symbol ?? chainId ?? walletKey ?? brandKey
  if (!input) return createElement('span', null, loader ?? null)
  const iconType: IconType | undefined =
    symbol !== undefined
      ? undefined
      : chainId !== undefined
        ? 'chain'
        : brandKey !== undefined
          ? 'brand'
          : walletKey !== undefined
            ? 'brand'
            : undefined

  const icon = createElement(Icon, {
    value: input,
    type: iconType,
    mono,
    fallback: loader,
    // Inside a frame, leave size unset so FrameWrapper fills its slot;
    // otherwise the caller's size applies directly.
    size: assetTag ? undefined : size,
    ...props,
  })

  if (assetTag) {
    return createElement(
      FrameWrapper,
      {
        frame: assetTag,
        mono,
        size,
      },
      icon,
    )
  }

  return icon
}
