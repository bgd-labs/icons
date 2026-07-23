# React bundle architecture: eager core, per-variant lazy chunks

`<Icon value={...} />` must stay O(1) in entry-bundle cost no matter how
many icons the package ships, while direct imports
(`import { EthIcon }`) must tree-shake down to exactly one icon. These
two requirements rule out both "everything eager" (entry grows with the
catalogue) and "everything behind one lazy map" (the map itself is O(n)).

The architecture has three tiers:

1. **Eager set.** A small, explicitly flagged set (`bundle: true` in
   metadata) ships in `EAGER_ICONS`, keyed `"type:id"` (ADR-0002), in
   the main entry — popular icons render synchronously.
2. **Lazy shards.** Everything else resolves through three dynamic
   imports: a per-type dispatcher (first character → shard thunk), a
   sub-shard (id → per-variant import thunks), then the icon chunk
   itself. Types below a fan-out threshold collapse to a single shard,
   keeping the code path uniform. The O(n) maps never enter the entry
   bundle.
3. **Per-variant chunks.** Each icon is emitted as `{id}.full.tsx` and
   `{id}.mono.tsx`; a mono-only render downloads only mono art. The
   combined `{Id}Icon` component for direct imports statically imports
   both variants.

Tree-shaking is part of the contract, not a hope: generated components
annotate `forwardRef` calls as `/* @__PURE__ */` and gate `displayName`
behind `process.env.NODE_ENV`, and a consumer fixture
(`pnpm check:consumers`) fails the build if a single-icon import drags a
second icon's path data into the bundle.

## Consequences

- Adding icons grows only shard chunks; entry bundles and the eager set
  are unaffected unless an asset is explicitly flagged `bundle: true`
  (used rarely, by convention).
- Frames are statically imported (never lazy) — they are few and shared.
- A failed lazy chunk (stale deploy 404) renders nothing with a dev
  warning instead of throwing into the consumer's error boundary; the
  poisoned entry is evicted so the next mount retries.
- If a type's shard map ever grows heavy, sub-shard further inside the
  generator without touching the public API.
