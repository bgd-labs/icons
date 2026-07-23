# @bgd-labs/icons

[![npm version](https://img.shields.io/npm/v/@bgd-labs/icons)](https://www.npmjs.com/package/@bgd-labs/icons)
[![license](https://img.shields.io/npm/l/@bgd-labs/icons)](./LICENSE)

Web3 icon library by BGD Labs. Token, chain, and brand icons with metadata and alias resolution.

## Packages

| Package                                     | Description                                                 |
| ------------------------------------------- | ----------------------------------------------------------- |
| [`@bgd-labs/icons`](./packages/core)        | Zero-dependency core: SVG strings, metadata, alias resolver |
| [`@bgd-labs/icons-react`](./packages/react) | React components with lazy loading, frames, and fallbacks   |

## Quick Start

### Core (framework-agnostic)

```bash
npm i @bgd-labs/icons
```

```ts
import { resolve } from '@bgd-labs/icons/resolve'
import { getMeta } from '@bgd-labs/icons'
import { getTokenSvg } from '@bgd-labs/icons/svg'

resolve('eth') // { id: 'eth', type: 'token' }
resolve(1) // { id: 'ethereum', type: 'chain' }
resolve('metamask', { type: 'brand' }) // constrain lookup to one namespace

getMeta('eth') // { id: 'eth', name: 'Ether', type: 'token', brandColor: '#9391f7', ... }

getTokenSvg('eth') // '<svg ...>...</svg>'
getTokenSvg('eth', 'mono') // mono variant with currentColor
```

Generated `TokenIconId` / `ChainIconId` / `BrandIconId` / `IconId` unions
type every shipped canonical id, for exhaustive icon pickers and config maps:

```ts
import type { TokenIconId } from '@bgd-labs/icons'

const featured: TokenIconId[] = ['eth', 'usdc'] // typo -> compile error
```

### React

```bash
npm i @bgd-labs/icons-react
```

```tsx
import { Icon } from '@bgd-labs/icons-react'

<Icon value="eth" />
<Icon value="eth" mono size={48} />
<Icon value={1} type="chain" />
```

See the individual package READMEs for full API documentation:

- [Core API docs](./packages/core/README.md)
- [React API docs](./packages/react/README.md)

## Migrating from `@bgd-labs/react-web3-icons`

This library supersedes `@bgd-labs/react-web3-icons`. A drop-in `Web3Icon`
component mirrors the old API to ease migration:

```tsx
import { Web3Icon } from '@bgd-labs/icons-react/compat'

<Web3Icon symbol="ETH" />
<Web3Icon chainId={1} />
<Web3Icon symbol="ETH" assetTag="stk" />
```

New code should prefer the `<Icon value="..." />` API. See the
[React API docs](./packages/react/README.md#v1-compatibility) for the full
compatibility surface.

## Development

```bash
pnpm install
pnpm build            # validate + generate + build all packages
pnpm typecheck        # run TypeScript checks in all workspaces
pnpm test             # run tests
pnpm lint             # eslint
pnpm format:check     # prettier
pnpm check:package    # publint + arethetypeswrong against the packed output
pnpm check:consumers  # ESM/CJS/SSR/tree-shaking smoke checks (fixtures/consumer)
pnpm stress           # full pipeline + budgets at synthetic bulk scale (~750 assets)
```

To contribute an icon, see [CONTRIBUTING](./CONTRIBUTING.md#adding-an-icon).

## License

The **source code** is licensed under [MIT](./LICENSE).

## Trademarks & icon assets

The **icon assets** in this repository are not covered by the MIT license.
They depict logos and marks of tokens, blockchains, wallets, protocols, and
companies that are the property of their respective owners. BGD Labs claims no
ownership of those marks and grants no rights in them.

The icons are included solely to identify the corresponding asset or project
(nominative use) so applications can render a recognizable icon — their
inclusion implies no affiliation with or endorsement by the trademark holders,
and consumers are responsible for their own compliance with each owner's brand
guidelines. If you are a rights holder and want a mark added, changed, or
removed, please [open an issue](https://github.com/bgd-labs/icons/issues). See
[NOTICE](./NOTICE) for details.
