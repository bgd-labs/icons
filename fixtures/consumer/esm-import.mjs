// ESM consumer smoke check: every published subpath must resolve and export
// what the docs promise, under real node ESM resolution (no bundler).
import assert from 'node:assert/strict'

import { getMeta, listIcons, META } from '@bgd-labs/icons'
import { resolve, resolveToken } from '@bgd-labs/icons/resolve'
import { getTokenSvg } from '@bgd-labs/icons/svg'
import {
  ethFull,
  getTokenSvg as getTokenSvgDirect,
} from '@bgd-labs/icons/svg/tokens'

import { Icon, IconProvider } from '@bgd-labs/icons-react'
import { EthIcon } from '@bgd-labs/icons-react/tokens'
import { EthereumIcon } from '@bgd-labs/icons-react/chains'
import { MetamaskIcon } from '@bgd-labs/icons-react/brands'
import { FrameWrapper } from '@bgd-labs/icons-react/frames'
import { Web3Icon } from '@bgd-labs/icons-react/compat'

// core
assert.equal(getMeta('eth')?.name, 'Ether')
assert.deepEqual(resolve('wbnb'), { id: 'bnb', type: 'token' })
assert.deepEqual(resolveToken('PT-eUSDe'), { id: 'pteusde', type: 'token' })
assert.ok(getTokenSvg('eth')?.startsWith('<svg'))
assert.ok(ethFull.startsWith('<svg'))
assert.equal(getTokenSvgDirect('eth'), getTokenSvg('eth'))
assert.ok(listIcons().length > 0)
assert.ok(Object.keys(META).length === listIcons().length)

// react — components must at least be callable component types here;
// rendering is covered by ssr.mjs
for (const [name, c] of Object.entries({
  Icon,
  IconProvider,
  EthIcon,
  EthereumIcon,
  MetamaskIcon,
  FrameWrapper,
  Web3Icon,
})) {
  assert.ok(
    typeof c === 'function' || typeof c === 'object',
    `${name} is not a component`,
  )
}

console.log('esm-import: ok')
