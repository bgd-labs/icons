# Icons v3

A library that maps loose, user-supplied identifiers (token tickers, chain
names, chain ids, brand names, and historical aliases) to a small set of
canonical icons rendered as SVGs.

## Language

**Alias**:
Any string or number that resolves to a canonical icon. A canonical id is
also an alias for itself (`eth` → `eth`). Multiple aliases may point at the
same canonical id (`wbnb`, `bnb` → `bnb`). Three kinds, two of them derived:

- **Semantic** (authored) — declared per-asset in JSON. Captures human
  intent: wrapper variants (`wbnb` → `bnb`), historical names
  (`matic` → `polygon`).
- **Mechanical** (derived) — produced by normalising the input the same
  way the id is formed: lowercase + strip non-`[a-z0-9]`. So `G-UNI`,
  `g_uni`, `GUNI` all resolve to id `guni` with no per-asset alias entry.
- **Numeric chain id** (derived) — every chain's `chainId` field becomes
  an automatic alias to that chain.

Authors only write semantic aliases. The resolver and build derive the rest.
_Avoid_: symbol (overloaded — see Symbol entry), key, lookup.

**Id**:
The stable, lowercase, alphanumeric-only identifier for a single icon
within its type (`eth`, `ethereum`, `metamask`, `pteusde`). Used as the
lookup key into metadata maps, the basis for file paths, and the input to
generated component names.

For tokens: derived from `symbol` by lowercasing and stripping every
non-`[a-z0-9]` character. Build fails if two assets collapse to the same id.

For chains and brands: a hand-chosen slug that follows the same character
rule (lowercase alphanumeric) but is not mechanically derived — e.g., the
chain whose `name` is `"BNB Smart Chain"` has id `bnb`.
_Avoid_: name, slug, canonical id (redundant).

**Type**:
The category an icon belongs to. A given id is unique within its type but
may collide across types (e.g. `celo` exists as both a token and a chain).
Spelled `type` everywhere — meta field, resolve option, React prop.
The three types are:

- **token** — an ERC20-style asset. Carries a ticker (`symbol`).
- **chain** — a blockchain network. Carries a numeric `chainId`.
- **brand** — anything icon-shaped that isn't a token or chain. The primary
  driver for this category is custom pool/product icons that need to
  differentiate from each other and from the chain icon; wallets, protocol
  logos, and generic company logos fit here too. Curated liberally: any
  consumer ask for an icon that doesn't fit token or chain goes here.

_Avoid_: kind, category, iconType (legacy name from a prior draft).

**Identity**:
The resolved `{ type, id }` pair for one icon after an alias has been
normalised and matched. Identity is the thing every lookup map needs before
it can fetch metadata, SVG strings, React components, placeholders, or
fallback URLs. It carries the token-first ambiguity decision and the
`"{type}:{id}"` composite key rule together.

Identity is shared by runtime lookups and build-time index generation:
the build derives identities from authored assets, and runtime code derives
the same shape from caller input.

**Candidate identity**:
The Identity-shaped answer for an alias that fails to resolve: the input
normalised by the mechanical-alias rule, with `type` null unless the caller
constrained it. Produced by `resolveOrCandidate` (`matched: false`) so that
placeholder labels and network-fallback URLs are built from the same shape
as a real Identity — callers never re-implement normalisation on a miss.
_Avoid_: guess, fallback id, unresolved value.

**Symbol** _(token field)_:
The display-cased ticker of a token, as the issuer writes it (`USDP`,
`eUSDe`, `PT_eUSDe`, `1inch`). Stored on `IconMeta` for tokens only. Used
for prominent UI labels and as a search target. Separator characters
(dashes, underscores, spaces) are issuer-dictated; the project does not
impose a house style because issuers don't follow one.
_Avoid_: ticker (in code — convention says `symbol`), displaySymbol (the
old name for this field).

**Name** _(meta field)_:
A human-readable string, always present on `IconMeta`. For tokens it is the
long descriptive name (`"Pax Dollar"`). For chains and brands it is the
properly-cased display string (`"MetaMask"`, `"BNB Smart Chain"`), which
doubles as the only display label they have.

**Value** _(React prop name)_:
The `<Icon>` prop that carries an alias from caller into the library.
Accepts `string | number`. Replaces the older `symbol` prop name, which
conflicted with the token `symbol` field.

**Full** / **Mono** _(coloring)_:
The two coloring strategies every icon ships in. **Full** is the brand-coloured
authored SVG. **Mono** is a hand-authored single-colour version that uses
`currentColor` so consumers can paint it with CSS. Mono SVGs are not
mechanically derived — they are often visually simplified (less detail,
unified strokes) so they read at small sizes in `currentColor`.

In core APIs and file names this is a string enum (`'full' | 'mono'`); on
the React `<Icon>` component it is a boolean (`mono`). No third coloring
is planned.

**Frame**:
A decorative wrapper SVG with a slot. The base icon is scaled down and
composited into the slot to produce a derivative icon — e.g., an aToken
icon is the underlying token icon inset into the `a` frame. Frames are a
runtime composition, not a pre-rendered asset per (token × frame) pair.
Today's frames are Aave-shaped and may expand to other protocols later:

- **a** — Aave aToken (deposit receipt)
- **stk** — Aave Safety Module staked position
- **wa** — Aave waToken (wrapped/static aToken)
- **stkwa** — staked waToken (combination of `stk` and `wa`)

## IconMeta shape

```ts
interface IconMeta {
  type: 'token' | 'chain' | 'brand'
  name: string // always present
  symbol?: string // tokens only
  chainId?: number // chains only
  brandColor?: string
  placeholderColor?: string
}
```

Invariants (enforced at build time, not in the TS type):

- `symbol` is set iff `type === 'token'`
- `chainId` is set iff `type === 'chain'`
- `name` is the only field consumers can read without branching on `type`

## Resolution defaults

When an alias is ambiguous across types (today: `celo`, `metis`, `sonic`
all exist as both tokens and chains), `resolve` and `<Icon>` return the
**token**. Callers needing chain semantics use `resolve(x, { type: 'chain' })`,
`resolveChain(x)`, or `<Icon value="celo" type="chain" />`.

## Internal lookup key shape

All in-memory lookup maps (`META`, `EAGER_ICONS`, type-aware SVG maps) are
keyed by `"{type}:{id}"`. Flat-by-id keying was rejected because it cannot
represent cross-type collisions (a single key `celo` cannot point at both
the token component and the chain component).

Lazy React components are the one structural exception: they live behind
per-type dispatchers (`generated/lazy/{tokens,chains,brands}.ts`) reached
through a dynamic import, so the type is carried by the shard rather than
the key. Each dispatcher maps the id's first character to a sub-shard
(`generated/lazy/{type}/{char}.ts`, an id -> import-thunk map each), so
the first lazy render downloads one small shard instead of the whole
type's map; types below a fan-out threshold collapse to a single shard.
The shard indirection keeps the O(n) map out of consumers' entry bundles —
`<Icon>` stays O(1) in bundle cost as the icon set grows.

## Network fallback

When `<Icon>` is asked for a value it cannot resolve from the in-memory
maps, it can optionally fetch the SVG from the icons repo on GitHub at
runtime. This is **opt-in**, not the default: consumers must mount
`<IconProvider enableFallback />` to enable it. Without the provider, an
unresolved icon renders the placeholder.

The fallback exists to support cases where a consumer needs an icon the
library hasn't bundled yet but the asset has been merged into the source
repo. It is not a substitute for keeping the npm package up to date.

## Example dialogue

> **Dev:** A user passes `"wbnb"` to `<Icon>`. What happens?
>
> **Domain:** `wbnb` is an alias. The resolver maps it to the id `bnb`
> with type `token`. The component looks up the SVG for `token:bnb`.
>
> **Dev:** What if they pass `1`?
>
> **Domain:** Also an alias — for the chain `ethereum`. Numbers are only
> aliases for chains.
>
> **Dev:** And `"celo"`?
>
> **Domain:** Ambiguous — exists as both a token and a chain. The untyped
> `resolve` returns the token (token-first precedence); callers who want
> the chain pass `{ type: 'chain' }`.
>
> **Dev:** What's the id for `PT-eUSDe`?
>
> **Domain:** `pteusde`. The id is the lowercased, alphanumeric-only form
> of the symbol. The symbol `"PT-eUSDe"` is preserved on the meta for
> display and search.
