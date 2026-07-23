import { lazy } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'
import type { IconProps } from './icon-props'
import type { IconType, IconVariant } from './types'

// A lazy icon resolves through THREE dynamic imports: the per-type dispatcher
// (first-char key -> shard thunk), the shard file it points at (id ->
// per-variant import thunks), and then the icon chunk itself. Keeping the maps
// behind dynamic imports keeps the O(n) data out of consumers' entry bundles —
// <Icon> stays O(1) in bundle cost no matter how many icons the package ships.
// Dispatchers are split by type so a tokens-only app never pays for the
// chain/brand maps; the per-type map is itself sub-sharded by the id's first
// character so the first lazy render downloads ~one shard (a few kB) rather
// than the whole type's map (tens of kB). Below a fan-out threshold the
// generator collapses a type into a single shard file that every first-char
// key points at, so this code path stays uniform.
//
// The shard maps each id to { full, mono } thunks: a mono-only render only
// ever downloads the mono variant chunk, never the full art (and vice
// versa).

type IconModule = { default: ComponentType<IconProps> }
type Loader = () => Promise<IconModule>
type Shard = {
  ICON_IMPORTS: Record<string, { full: Loader; mono: Loader }>
}
type Dispatcher = {
  SHARD_IMPORTS: Record<string, () => Promise<Shard>>
}

const DISPATCHERS: Record<IconType, () => Promise<Dispatcher>> = {
  token: () => import('./generated/lazy/tokens'),
  chain: () => import('./generated/lazy/chains'),
  brand: () => import('./generated/lazy/brands'),
}

// React resolves a lazy component by identity — recreating it per render
// would refetch and remount. Cache one component per identity+variant for
// the process lifetime (entries are tiny; the icon set is bounded).
const lazyCache = new Map<
  string,
  LazyExoticComponent<ComponentType<IconProps>>
>()

const NullIcon: ComponentType<IconProps> = () => null

// Identity+variant keys that have been shown at least once this session.
// The chunk stays in the module registry (and the lazy component above holds
// its resolved module), so a re-display resolves synchronously — the UI must
// not replay the placeholder/fade-in for an icon the user has already seen.
// Cleared on reload; eager bundling / the immutable HTTP cache cover that.
const shownOnce = new Set<string>()

// Identity+variant keys whose lazy load produced NO glyph — a rejected chunk
// import (stale-chunk 404) or an inconsistent build with no shard/entry for
// the id. NullIcon renders nothing, so without this the Icon fade path would
// fade the placeholder out to a blank box and mark the icon "shown" (skipping
// the placeholder on every later display). The fade path reads this to keep
// the placeholder up instead. A successful (re)load clears the key, so a
// remount-driven retry that succeeds fades in normally.
const failedOnce = new Set<string>()

export function markIconShown(key: string): void {
  shownOnce.add(key)
}

export function hasIconShown(key: string): boolean {
  return shownOnce.has(key)
}

export function hasIconFailed(key: string): boolean {
  return failedOnce.has(key)
}

// Test-only: reset the per-session shown/failed state between tests.
export function __resetShownIcons(): void {
  shownOnce.clear()
  failedOnce.clear()
}

export function getLazyIcon(
  type: IconType,
  id: string,
  variant: IconVariant,
): LazyExoticComponent<ComponentType<IconProps>> {
  const key = `${type}:${id}:${variant}`
  let entry = lazyCache.get(key)
  if (!entry) {
    entry = lazy(async () => {
      try {
        const dispatcher = await DISPATCHERS[type]()
        const shardThunk = dispatcher.SHARD_IMPORTS[id[0]]
        // A missing first-char key means no shard ships this id (eager icon,
        // handled before this path, or an inconsistent build) — render nothing
        // rather than throw into the nearest Suspense boundary.
        if (!shardThunk) {
          failedOnce.add(key)
          return { default: NullIcon }
        }
        const shard = await shardThunk()
        const entryThunks = shard.ICON_IMPORTS[id]
        // Likewise, a missing shard entry resolves to nothing.
        if (!entryThunks) {
          failedOnce.add(key)
          return { default: NullIcon }
        }
        const mod = await entryThunks[variant]()
        // A real glyph loaded — clear any prior failure so a remount-driven
        // retry that now succeeds fades in instead of holding the placeholder.
        failedOnce.delete(key)
        return mod
      } catch (err) {
        // A rejected chunk import (the classic stale-chunk 404 after a
        // redeploy) must not throw into the consumer's error boundary —
        // one flaky icon would unmount their tree. Render nothing, mark the
        // key failed (so the Icon keeps its placeholder rather than fading to
        // a blank box), evict the poisoned lazy component so the next mount
        // retries the import, and surface the cause in dev.
        failedOnce.add(key)
        lazyCache.delete(key)
        if (
          typeof process !== 'undefined' &&
          process.env.NODE_ENV !== 'production'
        ) {
          console.warn(`[bgd-icons] Failed to load icon chunk "${key}":`, err)
        }
        return { default: NullIcon }
      }
    })
    lazyCache.set(key, entry)
  }
  return entry
}
