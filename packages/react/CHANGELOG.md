# @bgd-labs/icons-react

## 0.6.2

### Patch Changes

- d6354ae: Namespace SVG resource ids per mounted instance. Icon SVGs carry static ids (SVGO's per-asset prefix, e.g. `weth_full__clip0_…`), so two mounted copies of the same icon shared clipPath/gradient ids — and since `url(#…)` resolves document-wide to the first match, a copy sitting in a hidden subtree (a closed drawer, a `display:none` panel) hijacked the references of every visible copy and blanked it. Generated components that define ids now derive a per-instance prefix from `useId()` (SSR-stable, sanitized to CSS-url-safe characters) and bake it into ids and every `url(#)`/`href` reference; id-free icons are emitted unchanged, with no `useId` call. The GitHub network fallback applies the same prefixing at conversion time, and only shares its cached converted content across mounts for id-free SVGs.

## 0.6.1

### Patch Changes

- b0731e7: Fix light halo around the MEGA token icon: rebuild the full variant so the perimeter is a single edge (black disc under an inner gray disc) instead of a background disc with a nearly-coincident ring clipped on top.
- Updated dependencies [b0731e7]
  - @bgd-labs/icons@0.6.1

## 0.6.0

### Minor Changes

- 9e59c81: Add MegaETH (MEGA) token icon as `mega`, avoiding an ID collision with the `megaeth` chain.

### Patch Changes

- Updated dependencies [9e59c81]
  - @bgd-labs/icons@0.6.0

## 0.5.0

### Minor Changes

- 8f5771e: Release 0.5.0

### Patch Changes

- Updated dependencies [8f5771e]
  - @bgd-labs/icons@0.5.0
