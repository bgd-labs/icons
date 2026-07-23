// CJS consumer smoke check: the `require` condition of every subpath must
// resolve under real node CJS resolution. Jest setups and older toolchains
// still take this path.
'use strict'
const assert = require('node:assert/strict')

const { getMeta, listIcons } = require('@bgd-labs/icons')
const { resolve } = require('@bgd-labs/icons/resolve')
const { getTokenSvg } = require('@bgd-labs/icons/svg')
const { ethFull } = require('@bgd-labs/icons/svg/tokens')

const { Icon, IconProvider } = require('@bgd-labs/icons-react')
const { EthIcon } = require('@bgd-labs/icons-react/tokens')
const { EthereumIcon } = require('@bgd-labs/icons-react/chains')
const { MetamaskIcon } = require('@bgd-labs/icons-react/brands')
const { FrameWrapper } = require('@bgd-labs/icons-react/frames')
const { Web3Icon } = require('@bgd-labs/icons-react/compat')

assert.equal(getMeta('eth')?.name, 'Ether')
assert.deepEqual(resolve(1), { id: 'ethereum', type: 'chain' })
assert.ok(getTokenSvg('eth')?.startsWith('<svg'))
assert.ok(ethFull.startsWith('<svg'))
assert.ok(listIcons().length > 0)

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

console.log('cjs-require: ok')
