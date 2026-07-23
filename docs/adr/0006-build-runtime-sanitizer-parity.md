# Build-time validation runs the runtime sanitizer

The library renders SVG markup from two sources: assets bundled at build
time, and — with the opt-in network fallback (ADR-0003) — SVGs fetched
from GitHub at runtime. Fetched SVGs pass through a DOMPurify profile
with custom hooks (fragment-only hrefs, no remote `url(...)` references,
forbidden tags). If bundled assets were validated by a _different_ rule
set, two failure modes open up: an authored asset could sneak a vector
into the package, and an innocent asset could use a construct the
runtime sanitizer strips — rendering subtly broken icons only in
fallback mode, where it's hardest to notice.

So there is exactly one sanitizer: `packages/react/src/sanitize-svg.ts`.
The build-time validator (`pnpm validate`) installs a jsdom environment
and runs every authored SVG through that same function and profile. What
passes CI is guaranteed to survive the runtime path byte-for-byte.

`pnpm validate` is additionally mutating by design: it auto-fixes what
is mechanically fixable (mono colours → `currentColor`, SVGO
optimisation, dropping white backing rects from mono art) and rejects
what needs human judgement (wrong viewBox, alias collisions). CI runs
the non-mutating `validate:check`, so the auto-fixes must be committed.

## Consequences

- No parallel sanitizer implementations to drift: the forbidden-tag
  list, the href rule, and the `url()` rule each have one home. The
  showcase's contribute form reuses the same pure checks for instant
  feedback, but CI remains the gate.
- Authoring feedback happens at contribution time, in the contributor's
  terminal — not in a consumer's browser.
- The cost (jsdom + DOMPurify per SVG at build time) is accepted and
  parallelised with a worker pool; it never ships to consumers.
