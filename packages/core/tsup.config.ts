import { defineConfig } from 'tsup'

const entry = {
  index: 'src/index.ts',
  resolve: 'src/resolve.ts',
  svg: 'src/svg.ts',
  'svg-tokens': 'src/generated/svg/tokens.ts',
  'svg-chains': 'src/generated/svg/chains.ts',
  'svg-brands': 'src/generated/svg/brands.ts',
}

// ESM splits so the alias maps, the identity helpers, and the SVG shards
// each exist exactly once in dist — without splitting, every entry inlines
// its own copy and a consumer importing two entries (the react package
// already imports both `.` and `./resolve`) ships the alias map twice.
// CJS stays unsplit: tsup's CJS splitting is experimental, and bundlers —
// where duplication actually hurts — consume the ESM output.
//
// Both configs set `clean: false`: tsup runs an array config's builds
// concurrently (Promise.all), so a per-config `clean: true` would race the
// other config's writes and could delete freshly-emitted output. The build
// script cleans dist once, up front, before tsup runs (see package.json).
export default defineConfig([
  {
    entry,
    format: ['esm'],
    dts: true,
    splitting: true,
    sourcemap: true,
    clean: false,
  },
  {
    entry,
    format: ['cjs'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: false,
  },
])
