// ─── Formula-based budgets ────────────────────────────────────────────────────
//
// Each limit is computed as:
//
//   limit = BASE + count × PER_ICON
//
// where `count` is read from assets/ at config-eval time (*.json files per
// type dir; frame types from assets/frames/ subdirs).
//
// Constants are derived from seed-scale brotli measurements (10 tokens /
// 1 chain / 1 brand / 4 frames) with ×2 headroom on the per-icon term:
//
//   Entry                 │ BASE      │ PER_ICON constant    │ count used
//   ──────────────────────┼───────────┼──────────────────────┼───────────────
//   core index            │  3 000 B  │ 30 B × total icons   │ T+C+B
//   core resolve          │  1 500 B  │ 30 B × total icons   │ T+C+B
//   core svg (all)        │    500 B  │ 1500/1000/5000 B     │ T / C / B
//   core svg-tokens       │    500 B  │ 1 500 B × tokens     │ T
//   core svg-chains       │    500 B  │ 1 000 B × chains     │ C
//   core svg-brands       │    500 B  │ 5 000 B × brands     │ B
//   react index           │ 25 600 B  │ 2 000 B × total      │ T+C+B
//   react tokens barrel   │    500 B  │ 1 700 B × tokens     │ T
//   react chains barrel   │    500 B  │ 1 500 B × chains     │ C
//   react brands barrel   │    500 B  │ 5 000 B × brands     │ B
//   react compat          │ 25 600 B  │ 2 000 B × total      │ T+C+B
//   react frames          │    500 B  │ 1 200 B × frame types│ F
//
// Per-icon constants cover:
//   - core index/resolve:  metadata/alias encoded bytes in the ENCODED string
//   - core svg/*:          brotli-compressed raw SVG string payload
//   - react barrels:       forwardRef wrapper + SVG chunk per icon
//   - react index/compat:  async lazy-map entries (two variant chunks each)
//   - react frames:        frame SVG + wrapper machinery per type
//
// A budget failure means one of two things:
//   • BASE exceeded → machinery regression (Icon component, codec, lazy-map
//     infrastructure) — investigate the entry's fixed overhead.
//   • per-icon × count exceeded → per-icon bloat (SVG path inflation, wrapper
//     overhead) — inspect what changed per icon.
//
// When real bulk data lands, tighten these constants; never loosen them to
// make a failure pass.
//
// size-limit accepts strings like "12 kB" or integers in bytes (brotli).
// ─────────────────────────────────────────────────────────────────────────────

'use strict'

const { readdirSync, existsSync } = require('fs')
const { resolve } = require('path')

// ICONS_ASSETS_DIR: same override scripts/lib/catalogue.ts honours — lets
// scripts/stress.ts check the formula budgets against a synthetic catalogue.
const ASSETS = process.env.ICONS_ASSETS_DIR
  ? resolve(process.env.ICONS_ASSETS_DIR)
  : resolve(__dirname, 'assets')

function countJsonFiles(dir) {
  const full = resolve(ASSETS, dir)
  if (!existsSync(full)) return 0
  return readdirSync(full).filter((f) => f.endsWith('.json')).length
}

function countFrameTypes() {
  const full = resolve(ASSETS, 'frames')
  if (!existsSync(full)) return 0
  return readdirSync(full, { withFileTypes: true }).filter((d) =>
    d.isDirectory(),
  ).length
}

const T = countJsonFiles('tokens')
const C = countJsonFiles('chains')
const B = countJsonFiles('brands')
const F = countFrameTypes()
const TOTAL = T + C + B

// BASE values (bytes)
const BASE_META = 3000
const BASE_RESOLVE = 1500
const BASE_SVG = 500
const BASE_REACT_BARREL = 500
const BASE_REACT_MAIN = 25600
const BASE_FRAMES = 500

// PER_ICON constants (bytes brotli)
const PER_ICON_META = 30
const PER_TOKEN_SVG = 1500
const PER_CHAIN_SVG = 1000
const PER_BRAND_SVG = 5000
const PER_TOKEN_REACT = 1700
const PER_CHAIN_REACT = 1500
const PER_BRAND_REACT = 5000
const PER_ICON_REACT_MAIN = 2000
const PER_FRAME_REACT = 1200

function kb(bytes) {
  return `${Math.ceil(bytes / 1024)} kB`
}

module.exports = [
  // --- @bgd-labs/icons (core) ---
  //
  // size-limit sums the entry + every chunk it statically imports.
  // index.js pulls in the alias chunk (shared with resolve) + the encoded
  // metadata string.  resolve.js pulls in only the alias chunk.
  {
    name: '@bgd-labs/icons (full index)',
    path: 'packages/core/dist/index.js',
    limit: kb(BASE_META + PER_ICON_META * TOTAL),
  },
  {
    name: '@bgd-labs/icons/resolve',
    path: 'packages/core/dist/resolve.js',
    limit: kb(BASE_RESOLVE + PER_ICON_META * TOTAL),
  },
  {
    name: '@bgd-labs/icons/svg (all SVGs)',
    path: 'packages/core/dist/svg.js',
    limit: kb(
      BASE_SVG + T * PER_TOKEN_SVG + C * PER_CHAIN_SVG + B * PER_BRAND_SVG,
    ),
  },
  {
    name: '@bgd-labs/icons/svg/tokens',
    path: 'packages/core/dist/svg-tokens.js',
    limit: kb(BASE_SVG + T * PER_TOKEN_SVG),
  },
  {
    name: '@bgd-labs/icons/svg/chains',
    path: 'packages/core/dist/svg-chains.js',
    limit: kb(BASE_SVG + C * PER_CHAIN_SVG),
  },
  {
    name: '@bgd-labs/icons/svg/brands',
    path: 'packages/core/dist/svg-brands.js',
    limit: kb(BASE_SVG + B * PER_BRAND_SVG),
  },

  // --- @bgd-labs/icons-react ---
  // size-limit sums every chunk reachable from the entry, including the
  // async ones (the per-type lazy shards and each icon chunk behind them).
  // These budgets are therefore the worst-case "user rendered every icon"
  // size, not the initial page-load cost: in a real bundler the entry
  // carries only the Icon machinery + eager icons, the id->import shard
  // maps load on first lazy icon of a type, and icon chunks load per icon.
  {
    name: '@bgd-labs/icons-react (Icon component + lazy map)',
    path: 'packages/react/dist/index.js',
    limit: kb(BASE_REACT_MAIN + PER_ICON_REACT_MAIN * TOTAL),
    ignore: ['react', 'react/jsx-runtime', 'react-dom'],
  },
  {
    name: '@bgd-labs/icons-react/tokens',
    path: 'packages/react/dist/tokens.js',
    limit: kb(BASE_REACT_BARREL + T * PER_TOKEN_REACT),
    ignore: ['react', 'react/jsx-runtime', 'react-dom'],
  },
  {
    name: '@bgd-labs/icons-react/chains',
    path: 'packages/react/dist/chains.js',
    limit: kb(BASE_REACT_BARREL + C * PER_CHAIN_REACT),
    ignore: ['react', 'react/jsx-runtime', 'react-dom'],
  },
  {
    name: '@bgd-labs/icons-react/brands',
    path: 'packages/react/dist/brands.js',
    limit: kb(BASE_REACT_BARREL + B * PER_BRAND_REACT),
    ignore: ['react', 'react/jsx-runtime', 'react-dom'],
  },
  {
    name: '@bgd-labs/icons-react/compat',
    path: 'packages/react/dist/compat.js',
    limit: kb(BASE_REACT_MAIN + PER_ICON_REACT_MAIN * TOTAL),
    ignore: ['react', 'react/jsx-runtime', 'react-dom'],
  },
  {
    name: '@bgd-labs/icons-react/frames',
    path: 'packages/react/dist/frames.js',
    limit: kb(BASE_FRAMES + F * PER_FRAME_REACT),
    ignore: ['react', 'react/jsx-runtime', 'react-dom'],
  },
]
