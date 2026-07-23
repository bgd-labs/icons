# @bgd-labs/icons

Zero-dependency icon metadata, alias resolver, and SVG strings for web3 assets.

## Install

```bash
npm i @bgd-labs/icons
```

## Alias Resolution

Resolve token symbols, chain names, or chain IDs to their canonical identifier.

```ts
import { resolve } from '@bgd-labs/icons/resolve'

resolve('eth') // { id: 'eth', type: 'token' }
resolve('wbnb') // { id: 'bnb', type: 'token' }
resolve(1) // { id: 'ethereum', type: 'chain' }
resolve('PT-eUSDe') // { id: 'pteusde', type: 'token' }
resolve('metamask') // { id: 'metamask', type: 'brand' }
resolve('nope') // null
```

For stricter lookups, use the typed helpers:

```ts
import {
  resolveBrand,
  resolveChain,
  resolveToken,
} from '@bgd-labs/icons/resolve'

resolveToken('eth') // { id: 'eth', type: 'token' }
resolveChain(1) // { id: 'ethereum', type: 'chain' }
resolveBrand('metamask') // { id: 'metamask', type: 'brand' }
```

When you need an answer even on a miss — building placeholder labels or
fallback URLs — `resolveOrCandidate` returns a candidate identity instead of
`null`, normalised with the same rule as real aliases:

```ts
import { resolveOrCandidate } from '@bgd-labs/icons/resolve'

resolveOrCandidate('wbnb')
// { id: 'bnb', type: 'token', matched: true }
resolveOrCandidate('Not-Shipped-Yet')
// { id: 'notshippedyet', type: undefined, matched: false }
resolveOrCandidate('nope', { type: 'chain' })
// { id: 'nope', type: 'chain', matched: false } — keeps your constraint
```

Everything in `@bgd-labs/icons/resolve` is also re-exported from the package
root, so `import { resolve } from '@bgd-labs/icons'` works too.

## Metadata

```ts
import {
  getMeta,
  getTypedMeta,
  getTokenMeta,
  getChainMeta,
  getBrandMeta,
  listIcons,
} from '@bgd-labs/icons'

// Every getter accepts any alias: canonical id, ticker, wrapper variant,
// chainId, or a punctuated/cased string equivalent to any of the above —
// "it resolves there, it resolves everywhere".
getMeta('eth')
// { id: 'eth', name: 'Ether', type: 'token', brandColor: '#9391f7', symbol: 'ETH', ... }
getMeta('wbnb') // same meta as getMeta('bnb') — note meta.id === 'bnb'
getMeta(1) // same meta as getMeta('ethereum')
getMeta('PT-eUSDe') // same meta as getMeta('pteusde')

// Typed helpers constrain the lookup to one namespace.
getTokenMeta('aave')
getTokenMeta('wbnb') // aliases work here too -> bnb meta
getChainMeta('ethereum')
getChainMeta('eth') // null — eth is a token, not a chain
getBrandMeta('metamask')
getTypedMeta('chain', 'ethereum') // explicit type lookup

// Enumerate the shipped set (e.g. for galleries or pickers):
listIcons() // every IconMeta
listIcons('chain') // only chains
```

The `IconMeta` type:

```ts
interface IconMeta {
  id: string // canonical asset id ("bnb" even when resolved via "wbnb")
  name: string
  type: 'token' | 'chain' | 'brand'
  brandColor?: string
  placeholderColor?: string
  symbol?: string
  chainId?: number
}
```

### Typed ids

Generated string-literal unions cover every shipped canonical id — use them
where a typo should be a compile error (icon pickers, config maps):

```ts
import type {
  TokenIconId,
  ChainIconId,
  BrandIconId,
  IconId,
} from '@bgd-labs/icons'

const featured: TokenIconId[] = ['eth', 'usdc']
const perChain: Partial<Record<ChainIconId, string>> = { ethereum: '#627eea' }
```

(`ChainIconId` is the chain's string id — `IconMeta.chainId` is the numeric
chain id.) The resolver functions intentionally keep accepting plain
`string | number`: aliases, tickers, and numeric chain ids are valid inputs
that are not members of these unions.

## SVG Strings

Get raw SVG markup as strings. Useful for server-side rendering or non-React frameworks.

```ts
import {
  getSvg,
  getTypedSvg,
  getTokenSvg,
  getChainSvg,
  getBrandSvg,
} from '@bgd-labs/icons/svg'

// Every getter accepts the same alias forms as `getMeta`.
getSvg('eth') // full-color SVG string
getSvg('eth', 'mono') // mono variant (uses currentColor)
getSvg('ethereum')
getSvg('metamask')
getSvg('wbnb') // same as getSvg('bnb')
getSvg(1) // same as getSvg('ethereum')

// Typed helpers constrain the lookup to one namespace.
getTokenSvg('eth')
getTokenSvg('eth', 'mono')
getTokenSvg('wbnb') // aliases work here too -> bnb SVG
getChainSvg('ethereum')
getBrandSvg('metamask')
getTypedSvg('chain', 'ethereum') // explicit typed lookup
```

> **Bundle size note:** the `get*Svg` functions go through a lookup map that
> retains every icon of that type, so they suit servers and non-bundled
> scripts. In bundled apps that need only a handful of icons, import the
> per-icon named constants instead (`import { ethFull } from
'@bgd-labs/icons/svg/tokens'`) — those tree-shake down to just the strings
> you use.

## Import Paths

| Path                         | Exports                                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@bgd-labs/icons`            | `getMeta`, `getTypedMeta`, `getTokenMeta`, `getChainMeta`, `getBrandMeta`, `getAliases`, `listIcons`, `META`, `identityKey`, resolver re-exports, types |
| `@bgd-labs/icons/resolve`    | `resolve`, `resolveOrCandidate`, `resolveToken`, `resolveChain`, `resolveBrand`                                                                         |
| `@bgd-labs/icons/svg`        | `getSvg`, `getTypedSvg`, `getTokenSvg`, `getChainSvg`, `getBrandSvg`                                                                                    |
| `@bgd-labs/icons/svg/tokens` | Per-icon string constants (`ethFull`, `ethMono`, …) + `getTokenSvg`                                                                                     |
| `@bgd-labs/icons/svg/chains` | Per-icon string constants + `getChainSvg`                                                                                                               |
| `@bgd-labs/icons/svg/brands` | Per-icon string constants + `getBrandSvg`                                                                                                               |

## License

[MIT](./LICENSE)
