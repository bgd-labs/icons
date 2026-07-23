// SSR smoke check: everything documented must render under
// react-dom/server.renderToString without a DOM and without throwing.
// No JSX — this runs as plain node, the way a custom SSR server would.
import assert from 'node:assert/strict'
import { createElement as h } from 'react'
import { renderToString } from 'react-dom/server'

import { Icon, IconProvider } from '@bgd-labs/icons-react'
import { EthIcon } from '@bgd-labs/icons-react/tokens'
import { FrameWrapper } from '@bgd-labs/icons-react/frames'
import { Web3Icon } from '@bgd-labs/icons-react/compat'

// Eager icon (bundle: true): full SVG markup straight out of the server.
const eager = renderToString(h(Icon, { value: 'eth' }))
assert.ok(eager.includes('<svg'), 'eager icon renders an svg on the server')
assert.ok(
  eager.includes('aria-label="Ether"'),
  'eager icon carries its aria-label',
)

// Lazy icon: the server emits the placeholder (the lazy chunk only loads on
// the client); the render must not throw and must produce visible markup.
const lazy = renderToString(h(Icon, { value: 'sushi' }))
assert.ok(
  lazy.includes('<svg'),
  'lazy icon renders a placeholder svg on the server',
)
assert.ok(
  lazy.includes('<circle'),
  'placeholder contains the letter badge circle',
)

// mono variant
const mono = renderToString(h(EthIcon, { mono: true }))
assert.ok(mono.includes('currentColor'), 'mono variant uses currentColor')

// Direct import: single svg root, SSR-safe with zero client machinery.
const direct = renderToString(h(EthIcon, { size: 24 }))
assert.ok(direct.startsWith('<svg'), 'direct import renders a bare svg root')
assert.ok(direct.includes('width="24"'))

// Frames
const framed = renderToString(
  h(FrameWrapper, { frame: 'stk', size: 48 }, h(Icon, { value: 'eth' })),
)
assert.ok(framed.includes('<svg'), 'framed icon renders')

// Compat surface
const compat = renderToString(h(Web3Icon, { symbol: 'ETH' }))
assert.ok(compat.includes('<svg'), 'Web3Icon renders')

// Unknown value without a provider: placeholder, never a network fetch.
const unknown = renderToString(h(Icon, { value: 'definitely-unknown-xyz' }))
assert.ok(unknown.includes('<svg'), 'unknown icon renders the placeholder')

// Unknown value WITH the github fallback enabled: on the server the lazy
// fallback component suspends, so the placeholder is emitted — no fetch, no
// throw.
const withProvider = renderToString(
  h(
    IconProvider,
    { enableFallback: true, branch: 'v0.0.0-fixture' },
    h(Icon, { value: 'definitely-unknown-xyz' }),
  ),
)
assert.ok(withProvider.includes('<svg'), 'fallback path SSRs the placeholder')

console.log('ssr: ok')
