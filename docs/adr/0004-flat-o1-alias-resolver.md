# The alias resolver is a single flat O(1) map

Callers pass loose identifiers: tickers (`wbnb`), chain ids (`1`),
historical names (`matic`), and arbitrary casing/punctuation
(`PT-eUSDe`, `G-UNI`). The resolver maps all of these to a canonical
identity with **one normalisation rule and one map lookup** — no
waterfall of heuristics, no trie, no fuzzy matching.

Three kinds of alias keys feed the map, but only one is authored:

- **Semantic** aliases are declared per-asset in metadata (wrapper
  variants, renames).
- **Mechanical** aliases are free: the input is normalised the same way
  the id is formed (lowercase, strip every non-`[a-z0-9]`), so
  punctuation/case variants need no metadata entry.
- **Numeric chain ids** are derived from each chain's `chainId` field.

The build applies the normalisation rule to every key (including the
canonicalization of open-ended families, e.g. dated maturities, to their
stable key) and emits flat per-type alias maps. The cross-type map is
derived from the typed maps at module init with token-first precedence
(ADR-0001), so the shipped payload holds each alias once. Runtime
`resolve` normalises the input with the identical rule and reads the
map — the two sides meet on the same key by construction.

## Consequences

- Lookup cost and behaviour are predictable: O(1), and the answer for
  any input is inspectable by running the normalisation rule by hand.
- A new class of aliases is only admissible if it is derivable by the
  normalisation rule at build time. Anything requiring per-call
  heuristics (fuzzy matches, Levenshtein, network lookups) is rejected —
  that way lies an unbounded resolver.
- The generated maps ship as compact string tables decoded once at
  module init; the encoding is an implementation detail, the flat-map
  contract is not.
- Ambiguity across types is data, not logic: collisions are resolved
  when the map is built (ADR-0001), never at resolve time.
