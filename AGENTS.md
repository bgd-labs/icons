# Icons v3

## Architecture

Monorepo with two packages:

- `@bgd-labs/icons` (core) - Zero dependencies. SVG strings, metadata, resolver.
- `@bgd-labs/icons-react` - React components. Depends on core + React peer dep.

## Key Conventions

- All SVGs must be 32x32 with viewBox="0 0 32 32"
- Mono SVGs use `currentColor` instead of hardcoded colors
- Every asset needs both `_full.svg` and `_mono.svg` variants plus a `.json` metadata file
- Generated code goes in `src/generated/` dirs (gitignored)
- The resolver is a flat O(1) alias map - no waterfall, no trie

## Build Pipeline

1. `pnpm validate` - SVG quality checks, auto-fixes mono colors/optimization (mutates `assets/`)
2. `pnpm generate` - Produces all generated code
3. `pnpm build` - `turbo run build`; validation (`//#validate:check`, non-mutating) and codegen (`//#generate`) are turbo root tasks the build depends on, so unchanged assets are full cache hits
4. Lazy icons are code-split per variant: `{id}.full.tsx` / `{id}.mono.tsx` chunks behind per-type shards; the combined `{Id}Icon` component statically imports both
5. Generated components MUST keep `/* @__PURE__ */` on `forwardRef` calls and the NODE_ENV gate on `displayName` — both are required for consumers' single-icon imports to tree-shake (guarded by `pnpm check:consumers` → fixtures/consumer/tree-shake.mjs)
6. `pnpm stress` runs the whole pipeline + size budgets against ~750 synthetic assets (`ICONS_ASSETS_DIR` env points catalogue.ts and .size-limit.cjs at `.stress/assets`); restores real generated/dist state on exit
7. Core exports generated `TokenIconId`/`ChainIconId`/`BrandIconId`/`IconId` string unions (`src/generated/ids.ts`); resolvers still accept arbitrary `string | number`

## React Prop Conventions

- `mono?: boolean` selects the currentColor variant everywhere (`<Icon mono />`, `<EthIcon mono />`, `FrameWrapper`) — there is no `variant` prop
- `<Icon>` rejects `ref` at the type level (multiple internal render paths); generated per-icon components forward refs

## Asset Naming

- Tokens: `{symbol}_full.svg`, `{symbol}_mono.svg`, `{symbol}.json`
- Chains: `{name}_full.svg`, `{name}_mono.svg`, `{name}.json`
- Brands: `{name}_full.svg`, `{name}_mono.svg`, `{name}.json`
- Frames: `{type}/full.svg`, `{type}/mono.svg`
