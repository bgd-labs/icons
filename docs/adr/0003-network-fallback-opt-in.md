# GitHub network fallback for unknown icons is opt-in

When `<Icon>` is asked for a value the bundle can't resolve, it can fall
back to fetching the SVG from the icons repository on GitHub at runtime.
This fallback is now **opt-in** via
`<IconProvider enableFallback />`. The default is disabled.

The fallback was previously enabled by default. We turned it off because
the previous default broke the library's apparent contract in three ways:

1. It introduced a runtime dependency on raw.githubusercontent.com that
   wasn't visible from the install. CSP-restricted apps would silently
   fail to render some icons.
2. It leaked the user's IP and which assets they viewed to GitHub on
   every miss — meaningful for wallet UIs and other privacy-sensitive
   surfaces.
3. The default `branch: 'main'` meant two installs of the same npm
   version could render different content depending on when each
   fetched. Consumers who keep the fallback enabled should also pin
   `branch` to the published tag so runtime content matches the bundle.

The fallback still ships and is well-engineered (LRU cache, negative
caching, sanitisation, timeout). It just no longer runs unless the
consumer asks for it.

## Consequences

- Apps that relied on the implicit fallback to render assets that were
  merged upstream but not yet released will see those icons fall back to
  the placeholder until the package is updated. That is the intended
  signal.
- A consumer who genuinely wants the fallback mounts
  `<IconProvider enableFallback branch="vX.Y.Z" />` once at the root.
