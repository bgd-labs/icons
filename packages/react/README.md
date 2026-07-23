# @bgd-labs/icons-react

Tree-shakeable React icon components for web3 assets. Built on top of `@bgd-labs/icons`.

## Install

```bash
npm i @bgd-labs/icons-react
```

Peer dependency: `react ^18 || ^19`

## Icon Component

The main `<Icon>` component resolves an alias and renders the matching icon. Frequently used icons are bundled eagerly; others are lazy-loaded via `React.lazy` with a smooth fade-in.

```tsx
import { Icon } from '@bgd-labs/icons-react'

<Icon value="eth" />
<Icon value="eth" mono />
<Icon value="eth" size={48} />
<Icon value="wbnb" />            {/* resolves alias -> bnb */}
<Icon value={1} />               {/* chain ID -> ethereum */}
<Icon value="metamask" type="brand" /> {/* constrain lookup to one namespace */}
```

### Props

| Prop       | Type                            | Default     | Description                                  |
| ---------- | ------------------------------- | ----------- | -------------------------------------------- |
| `value`    | `string \| number`              | required    | Token symbol, chain name, chain ID, or alias |
| `type`     | `'token' \| 'chain' \| 'brand'` | auto        | Explicitly disambiguate overlapping ids      |
| `mono`     | `boolean`                       | `false`     | Render the mono (currentColor) variant       |
| `size`     | `number \| string`              | `32`        | Width and height                             |
| `fallback` | `ReactNode`                     | placeholder | Rendered while loading or when unknown       |

Plus all standard `SVGProps<SVGSVGElement>` — except `ref`: `<Icon>` renders
different root elements depending on the internal path (eager, lazy,
fallback), so a ref has no reliable target and is rejected at the type
level. The [direct-import components](#direct-imports) render a single
`<svg>` root and forward refs properly.

## IconProvider

Without a provider, an unresolved `<Icon>` renders the placeholder (or your
`fallback`) and never makes a network request. Mount the provider only when
you want the runtime GitHub fallback.

```tsx
import { IconProvider } from '@bgd-labs/icons-react'
;<IconProvider enableFallback branch="@bgd-labs/icons-react@0.4.0">
  <App />
</IconProvider>
```

`enableFallback` is **opt-in** (defaults to `false`). When you turn it on,
pin `branch` to the published tag of `@bgd-labs/icons-react` you have
installed — leaving it on the default (`"main"`) means two installs of the
same npm version can render different content depending on when they
fetch. The provider emits a one-time dev warning if you forget.

### Why opt-in?

The fallback can fetch from `raw.githubusercontent.com` at runtime. That
introduces a runtime dependency that isn't visible at install time, leaks
viewed-asset metadata to GitHub, and — with `branch: 'main'` — produces
version-skewed content. Apps that want any of those tradeoffs must say so
explicitly. Apps that don't get a deterministic bundle by default.

## Direct Imports

Import individual icon components for maximum tree-shaking.

```tsx
import { EthIcon } from '@bgd-labs/icons-react/tokens'
import { EthereumIcon } from '@bgd-labs/icons-react/chains'
import { MetamaskIcon } from '@bgd-labs/icons-react/brands'
;<EthIcon mono size={24} />
```

The per-icon components accept the same `mono` / `size` props as `<Icon>`
and forward refs to their `<svg>` root.

## Choosing `<Icon>` vs Direct Imports

| You know the icon… | Use                           | What ships                                                                  |
| ------------------ | ----------------------------- | --------------------------------------------------------------------------- |
| at build time      | `<EthIcon />` (direct import) | Only that icon's SVG — production builds tree-shake the rest of the barrel  |
| only at runtime    | `<Icon value={...} />`        | The resolver + popular icons eagerly; everything else lazy, per-icon chunks |

Rules of thumb:

- **Static UI** (a header logo, a fixed "supported networks" row): direct
  imports. Smallest output, SSR-/RSC-friendly, ref-forwarding.
- **Dynamic values** (user balances, API-driven token lists): `<Icon>`. A
  handful of popular icons render instantly from the eager bundle; the long
  tail lazy-loads its own small chunk and fades in over a placeholder.
- Importing one icon does **not** pull in its neighbors — single-icon
  imports are guarded by a CI fixture that fails if a second icon's path
  data leaks into the bundle. (One nuance: an icon's combined component
  imports both its `full` and `mono` art; if you only ever render one
  variant of a build-time-known icon, that's still two small SVGs.)

## SSR, Next.js, and React Server Components

All entry points render under `react-dom/server` without a DOM. What differs
is the client boundary:

- **`@bgd-labs/icons-react` and `/compat`** are client components — the
  published files carry `"use client"`, so in the Next.js App Router you can
  use `<Icon>` / `<Web3Icon>` directly inside Server Components without
  writing a wrapper. Eager icons SSR their full SVG markup; lazy icons SSR
  the colored placeholder and swap in the real icon after hydration (no
  layout shift — the placeholder is the layout anchor).
- **`/tokens`, `/chains`, `/brands`, and `/frames`** are directive-free pure
  components: rendered inside a Server Component they emit static SVG with
  **zero client JavaScript and zero hydration cost**. Prefer them for
  SEO-critical or above-the-fold icons.
- **`@bgd-labs/icons` (core)** is plain data — `getTokenSvg()` / `getMeta()`
  work anywhere (Node, edge runtimes, workers) and are handy in Route
  Handlers or `next/og` image generation.

For custom SSR servers: `renderToString`/`renderToPipeableStream` need no
special setup. The lazy fade-in styles are injected client-side in an
insertion effect, so server markup is deterministic across renders.

## Production checklist

- Leave the GitHub fallback **off** (the default) unless you accept a
  runtime `raw.githubusercontent.com` dependency — and if you enable it, pin
  `branch` to your installed version tag (see [IconProvider](#iconprovider)).
- Icons known at build time → [direct imports](#direct-imports).
- `mono` icons inherit `currentColor` — set `color` on a parent (or the
  icon itself) rather than `fill`.
- Adding icons to the library? See
  [CONTRIBUTING](https://github.com/bgd-labs/icons/blob/main/CONTRIBUTING.md#adding-an-icon)
  — every asset is a `full`/`mono`/metadata triplet validated by `pnpm validate`.

## Frames

Wrap icons in decorative frames (e.g. staked asset badges).

```tsx
import { FrameWrapper } from '@bgd-labs/icons-react/frames'
import { Icon } from '@bgd-labs/icons-react'
;<FrameWrapper frame="stk" size={48}>
  <Icon value="eth" />
</FrameWrapper>
```

Available frames: `a`, `stk`, `stkwa`, `wa`

## v1 Compatibility

The `Web3Icon` component provides a migration path from `@bgd-labs/react-web3-icons`.

```tsx
import { Web3Icon } from '@bgd-labs/icons-react/compat'

<Web3Icon symbol="ETH" />
<Web3Icon chainId={1} />
<Web3Icon symbol="ETH" mono />
<Web3Icon symbol="ETH" assetTag="stk" />
```

### Props

| Prop        | Type               | Description                                                             |
| ----------- | ------------------ | ----------------------------------------------------------------------- |
| `symbol`    | `string`           | Token ticker (`"ETH"`)                                                  |
| `chainId`   | `number \| string` | Numeric chain id — resolves in the chain namespace                      |
| `walletKey` | `string`           | Wallet brand key — resolves in the brand namespace                      |
| `brandKey`  | `string`           | Brand key — resolves in the brand namespace                             |
| `assetTag`  | `string`           | Wrap the icon in a [frame](#frames) (`'a'`, `'stk'`, `'stkwa'`, `'wa'`) |
| `mono`      | `boolean`          | Render the mono (currentColor) variant                                  |
| `loader`    | `ReactNode`        | Rendered while loading, when unknown, or when no prop is set            |
| `size`      | `number \| string` | Width and height                                                        |

Plus all standard `SVGProps<SVGSVGElement>` except `type`. Exactly one of
`symbol` / `chainId` / `walletKey` / `brandKey` picks the icon (first one
set wins); with none, `Web3Icon` renders `loader`.

## Import Paths

| Path                           | Exports                                                       |
| ------------------------------ | ------------------------------------------------------------- |
| `@bgd-labs/icons-react`        | `Icon`, `IconProvider`, `IconProps`, `IconContextValue` types |
| `@bgd-labs/icons-react/tokens` | Individual token components                                   |
| `@bgd-labs/icons-react/chains` | Individual chain components                                   |
| `@bgd-labs/icons-react/brands` | Individual brand components                                   |
| `@bgd-labs/icons-react/frames` | `FrameWrapper`                                                |
| `@bgd-labs/icons-react/compat` | `Web3Icon`                                                    |

## License

[MIT](./LICENSE)
