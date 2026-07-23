# In-memory icon maps are keyed by `"{type}:{id}"`

Every lookup map in the library — `META`, the React `EAGER_ICONS`, the
per-type SVG maps — uses a composite key of `"{type}:{id}"` (e.g.
`"token:celo"`, `"chain:celo"`). The flat-by-id shape that the React
component maps used in the v3 alpha builds is replaced.

The flat-by-id keying cannot represent collisions across types: a single
map slot `celo` can point at either the token component or the chain
component, but not both. In the alpha that resulted in
`<Icon value="celo" type="chain" />` silently rendering the token,
because the React component maps were keyed by id alone. The composite
key makes `type` load-bearing in the data structure rather than a hint
that the resolver eventually discards.

## Consequences

- Lazy-loaded React components are the structural exception: they live
  behind per-type shard dispatchers reached by dynamic import, so the
  type is carried by the shard rather than the key (see CONTEXT.md).
- The generated alias maps live only in `@bgd-labs/icons`; the React
  package imports the core map instead of shipping a second copy.
- The cost is one string concatenation per lookup. The maps remain O(1).
- This shape is now part of the implicit contract for anyone constructing
  keys from outside the public API (e.g. tooling that reads `META`
  directly).
