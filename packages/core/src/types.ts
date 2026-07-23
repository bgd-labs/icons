export type IconType = 'token' | 'chain' | 'brand'

export type IconVariant = 'full' | 'mono'

export interface IconMeta {
  /** Canonical asset id (the filesystem name, e.g. "bnb" for the "wbnb" alias). */
  id: string
  name: string
  type: IconType
  brandColor?: string
  placeholderColor?: string
  symbol?: string
  chainId?: number
}

export interface ResolveResult {
  id: string
  type: IconType
}
