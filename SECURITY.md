# Security Policy

## Reporting a vulnerability

Please report security issues privately via GitHub's
[private vulnerability reporting](https://github.com/bgd-labs/icons/security/advisories/new)
(Security → Report a vulnerability on the repository). Do not open a public
issue for a security report.

We aim to acknowledge reports within a few business days.

## Supported versions

Security fixes target the latest published release of `@bgd-labs/icons` and
`@bgd-labs/icons-react`.

## Security model

A few notes on the runtime surface, so reports can be scoped accurately:

- **Core (`@bgd-labs/icons`)** has zero runtime dependencies and performs no
  network or filesystem access. It ships static SVG strings and metadata.

- **SVG sanitization.** The React package renders SVG markup through a
  sanitizer (`sanitizeSvgRoot`) that strips scripts, event handlers, and
  external references before the markup is turned into React elements. The
  same sanitization runs over bundled assets and over anything fetched by
  the network fallback.

- **Network fallback (opt-in).** `<Icon>` can fetch an SVG from the icons
  repository on GitHub at runtime, but **only** when a consumer mounts
  `<IconProvider enableFallback />`. It is disabled by default. When enabled,
  fetched markup is sanitized before rendering, requests time out, and
  failures are negatively cached. Enabling the fallback introduces a runtime
  dependency on `raw.githubusercontent.com` and reveals viewed-asset metadata
  to GitHub; this is documented and intentional, and is the appropriate area
  to scrutinize. See `docs/adr/0003-network-fallback-opt-in.md`.

If you believe sanitization can be bypassed, that is a valid and welcome
report.
