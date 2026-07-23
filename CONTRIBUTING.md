# Contributing

Thanks for helping improve the icon library. Most contributions are **new or
updated icons**; this guide covers that path plus the basics for code changes.

## Before you start

- Be sure you have the right to contribute the asset. See
  [Icon assets & trademarks](#icon-assets--trademarks) below — every icon PR
  must check the attestation box in the PR template.
- For a brand-new icon you'd like but can't author yourself, open a
  **Request an icon** issue instead of a PR.

## Setup

```bash
pnpm install
pnpm validate   # SVG + metadata checks (auto-fixes most issues)
pnpm build      # validate + generate + build both packages
pnpm test
```

## Adding an icon

Every icon is a **triplet** living under `assets/<type>/`, where `<type>` is
`tokens`, `chains`, or `brands`:

| File            | Purpose                                   |
| --------------- | ----------------------------------------- |
| `<id>_full.svg` | Full-color authored SVG                   |
| `<id>_mono.svg` | Single-color variant using `currentColor` |
| `<id>.json`     | Metadata                                  |

### The id

`<id>` must be **lowercase alphanumeric** (`^[a-z0-9]+$`) and unique within
its type. For tokens it is the symbol lowercased with every non-`[a-z0-9]`
character stripped (`PT-eUSDe` → `pteusde`). For chains and brands it is a
hand-chosen slug following the same character rule.

### SVG rules

Both SVGs must:

- Be **32×32** with `viewBox="0 0 32 32"`.
- Contain **no** `<script>`, `<text>`, `<image>`, `<foreignObject>`, event
  handlers (`on*=`), or external references (`href="http..."`). These are
  rejected by `pnpm validate` and stripped at render time.

The **mono** SVG additionally:

- Must use `currentColor` for all fills/strokes — no hardcoded colors.
- Must have a **transparent background**. Source art exported as a glyph on a
  white backing rect gets the rect dropped by `pnpm validate` — recoloring it
  would render the icon as a solid block.
- Is hand-simplified to read at small sizes (drop fine detail and gradients;
  unify strokes). It is _not_ a mechanical recolor of the full variant.

### Metadata (`<id>.json`)

| Field        | Tokens | Chains | Brands | Notes                                                        |
| ------------ | ------ | ------ | ------ | ------------------------------------------------------------ |
| `name`       | ✓      | ✓      | ✓      | Human-readable display name                                  |
| `symbol`     | ✓      | —      | —      | Display-cased ticker (`eUSDe`)                               |
| `chainId`    | —      | ✓      | —      | Positive integer                                             |
| `brandColor` | opt    | opt    | opt    | `#rrggbb` / `#rgb`                                           |
| `aliases`    | opt    | opt    | opt    | Extra strings that resolve to this id                        |
| `bundle`     | opt    | opt    | opt    | `true` ships the icon eagerly instead of lazily (use rarely) |
| `crossType`  | opt    | opt    | opt    | Set `true` to acknowledge a cross-type id collision          |

Unknown fields are rejected, so typos can't silently change behavior.
(`placeholderColor` in the published metadata is derived from the artwork at
build time — it is not authored.)

Run `pnpm validate` — it auto-fixes mono colors and SVGO optimization and
reports anything it can't fix (wrong viewBox — re-export the art at 32×32 —
plus alias/id collisions, missing fields, bad ids). `pnpm build` runs the
non-mutating `validate:check`, so commit what `pnpm validate` fixes.

## Code changes

- `pnpm lint`, `pnpm format`, `pnpm typecheck`, `pnpm test` must all pass.
- Add a changeset for any consumer-visible change: `pnpm changeset`.
- No `CHANGELOG.md` files are kept (changesets runs with `changelog:
false`) — release notes live on the GitHub releases page.

## Releasing

Maintainers only. Both packages are versioned in lockstep (changesets
`linked`) and published by the Release workflow:

1. Merge PRs with changesets. The Release workflow opens/updates a
   **"chore: version packages"** PR on main.
2. Merge that PR. The workflow re-runs the full check suite on main, then
   publishes, tags, and creates GitHub releases.

Publishing uses **npm trusted publishing (OIDC)** — there is no `NPM_TOKEN`
secret. Publishes only authenticate from the `release.yml` workflow in this
repo, and npm attaches provenance attestations automatically. This requires
pnpm ≥ 11 (see `packageManager`; pnpm 10 cannot do the OIDC exchange) and the
per-package trusted publisher entries on npmjs.com (Settings → Trusted
Publisher → GitHub Actions: repo `bgd-labs/icons`, workflow `release.yml`).

## Icon assets & trademarks

The logos in this repo are the property of their respective owners and are
included for identification (nominative use) only — see the [NOTICE](./NOTICE)
file. By submitting an icon you confirm you have the right to contribute it,
it is a faithful representation of the mark, and you understand it is
distributed under those terms. We do not accept altered, parody, or
unofficial marks.
