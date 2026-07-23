// Tree-shaking smoke check: a Vite production build that imports ONE icon
// from the tokens barrel must not carry any other icon. Detection is by
// SVG path data — the generated JSX carries each icon's `d` attributes
// verbatim, and path data survives minification (displayName does NOT: it
// is NODE_ENV-gated precisely so production builds can drop it).
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'

import {
  ethFull,
  usdcFull,
  aaveFull,
  uniFull,
  bnbFull,
  linkFull,
} from '@bgd-labs/icons/svg/tokens'

// A distinctive fingerprint per icon: a slice from the MIDDLE of its
// longest path. The first path is often a shared 32x32 circle background
// identical across icons — fingerprinting it produces false positives.
function fingerprint(svg) {
  const ds = [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1])
  const longest = ds.sort((a, b) => b.length - a.length)[0]
  assert.ok(
    longest && longest.length >= 24,
    'icon svg has a path long enough to fingerprint',
  )
  const mid = Math.floor(longest.length / 2)
  return longest.slice(mid - 12, mid + 12)
}

const entry = fileURLToPath(new URL('./tree-shake-entry.mjs', import.meta.url))

const result = await build({
  configFile: false,
  logLevel: 'warn',
  build: {
    write: false,
    minify: true,
    rollupOptions: {
      input: entry,
      // React stays external: this check is about OUR package's import
      // graph, and externalizing keeps the output small enough to grep.
      external: ['react', 'react/jsx-runtime', 'react-dom'],
    },
  },
})

const outputs = Array.isArray(result) ? result : [result]
const code = outputs
  .flatMap((r) => r.output)
  .filter((o) => o.type === 'chunk')
  .map((o) => o.code)
  .join('\n')

assert.ok(code.includes(fingerprint(ethFull)), 'imported icon is in the bundle')

// Every other token must be shaken out — including usdc, which shares a
// dist chunk with eth (both are eager): chunk-mates must still be
// droppable statement-by-statement.
for (const [name, svg] of Object.entries({
  usdc: usdcFull,
  aave: aaveFull,
  uni: uniFull,
  bnb: bnbFull,
  link: linkFull,
})) {
  assert.ok(
    !code.includes(fingerprint(svg)),
    `${name} leaked into a single-icon bundle — barrel tree-shaking is broken`,
  )
}

console.log('tree-shake: ok')
