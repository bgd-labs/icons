// Entry for tree-shake.mjs: imports exactly one icon from the barrel.
// The icon must be REFERENCED with a side effect — app builds don't
// preserve entry exports, so a bare re-export would tree-shake to an empty
// chunk and the assertions would test nothing.
import { EthIcon } from '@bgd-labs/icons-react/tokens'

globalThis.__fixtureIcon = EthIcon
