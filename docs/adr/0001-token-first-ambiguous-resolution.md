# Token-first precedence when an alias is ambiguous across types

A handful of icon names exist as both a token and a chain (today: `celo`,
`metis`, `sonic`; more will appear over time). When a caller passes the
bare name to `resolve`, `getMeta`, `getSvg`, or `<Icon>` without a `type`,
the library returns the **token**. Chain-side callers must pass
`type: 'chain'` (or use `resolveChain` / `getChainMeta`) to opt in.

We picked token-first because trading and DeFi surfaces — where users
type tickers — are the dominant consumer of this library. The opposite
default would silently change what every untyped `<Icon value="celo" />`
renders in those UIs. Chain-side consumers are smaller in number and
already tend to know they're dealing with a chain identifier, so the
opt-in is cheap.

## Consequences

- Changing this default is a breaking change for every untyped call site
  with an ambiguous name. Future collisions are governed by the same rule:
  unless we revisit this ADR, the token wins.
- The typed entry points (`resolveChain`, `resolveBrand`,
  `getChainMeta`, etc.) and the `type` option exist specifically so this
  default is never a blocker — there is no name that cannot be resolved
  precisely.
