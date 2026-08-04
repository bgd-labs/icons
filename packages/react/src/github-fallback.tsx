import { useEffect, useId, useMemo, useState } from 'react'
import type { ReactNode, SVGProps } from 'react'
import { resolve } from '@bgd-labs/icons/resolve'
import { useIconConfig } from './icon-provider'
import { svgTextToReact } from './svg-to-react'
import type { SvgReactContent } from './svg-to-react'
import type { IconType } from './types'

// Module-level SVG cache, keyed by URL. null = negative cache (tried & failed).
// `content` memoises the converted React description so repeated mounts of
// the same fallback icon reuse one sanitize/parse pass instead of re-running
// it per instance. React elements are immutable, so sharing one
// SvgReactContent across many component instances is safe — but ONLY for
// id-free SVGs: converted content that defines resource ids carries one
// instance's id prefix and is never cached (see cachedContentFor).
interface CacheEntry {
  value: string | null
  ts: number
  content?: SvgReactContent
}

const svgCache = new Map<string, CacheEntry>()
const MAX_CACHE = 200
const NEGATIVE_CACHE_TTL_MS = 60_000
const FETCH_TIMEOUT_MS = 8_000

// Pure read — safe from the render phase (getCachedContent runs in a
// useMemo). An expired negative entry is reported as absent but NOT deleted
// here; fetchSvg purges it in event/effect context, and stragglers are
// bounded by FIFO eviction anyway.
function cacheEntry(url: string): CacheEntry | undefined {
  const entry = svgCache.get(url)
  if (entry === undefined) return undefined
  // Successful entries never expire (until FIFO eviction)
  if (entry.value !== null) return entry
  // Negative entries expire after TTL
  if (Date.now() - entry.ts > NEGATIVE_CACHE_TTL_MS) return undefined
  return entry
}

function cacheGet(url: string): string | null | undefined {
  const entry = cacheEntry(url)
  return entry === undefined ? undefined : entry.value
}

function cacheSet(url: string, value: string | null) {
  // Map preserves insertion order, so the first key is the oldest. Only a
  // NEW key grows the cache; overwriting an existing key (negative ->
  // positive) keeps its original position.
  if (!svgCache.has(url) && svgCache.size >= MAX_CACHE) {
    const oldest = svgCache.keys().next().value
    if (oldest !== undefined) svgCache.delete(oldest)
  }
  svgCache.set(url, { value, ts: Date.now() })
}

// Memoise the converted content on a positive cache entry. Only non-null
// conversions are stored (SSR returns null when DOMParser is missing — never
// cache that), and only when the SVG defines no resource ids: ids get the
// caller's per-instance prefix baked in, so that conversion belongs to one
// mount and each instance converts its own copy. Returns the converted
// content, or null when unconvertible.
function cachedContentFor(
  url: string,
  text: string,
  idPrefix: string,
): SvgReactContent | null {
  const entry = svgCache.get(url)
  if (entry && entry.content) return entry.content
  const content = svgTextToReact(text, idPrefix)
  if (content && entry && !content.hasIds) entry.content = content
  return content
}

type AssetType = 'tokens' | 'chains' | 'brands'

function toAssetType(type: IconType): AssetType {
  if (type === 'token') return 'tokens'
  if (type === 'chain') return 'chains'
  return 'brands'
}

function inferType(id: string, explicitType?: IconType): AssetType | null {
  if (explicitType) return toAssetType(explicitType)
  // Ask the resolution module (token-first per ADR-0001) rather than
  // probing the metadata maps per type.
  const hit = resolve(id)
  return hit ? toAssetType(hit.type) : null
}

function buildUrl(
  baseUrl: string,
  branch: string,
  type: AssetType,
  id: string,
  variant: string,
): string {
  return `${baseUrl}/${branch}/assets/${type}/${id}_${variant}.svg`
}

// One network request per URL no matter how many components want it: a
// token list rendering 50 rows of the same unknown asset must not fire 50
// fetches. The shared request is never aborted by any single component —
// unmounted callers just ignore the settled value — and carries its own
// timeout instead of a caller signal.
const inFlight = new Map<string, Promise<string | null>>()

function fetchSvg(url: string): Promise<string | null> {
  const cached = cacheGet(url)
  if (cached !== undefined) return Promise.resolve(cached)
  // A live entry would have been returned above, so anything still stored
  // under this URL is an expired negative entry — purge it here (event/
  // effect context) so the refreshed entry re-enters FIFO order cleanly.
  svgCache.delete(url)

  let pending = inFlight.get(url)
  if (pending) return pending

  pending = (async () => {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS)
    try {
      const res = await fetch(url, { signal: ac.signal })
      if (!res.ok) {
        // A definitive miss (404 etc.) is negative-cached for the TTL.
        cacheSet(url, null)
        return null
      }
      const text = await res.text()
      cacheSet(url, text)
      return text
    } catch {
      // Timeouts and network errors are transient — do NOT negative-cache
      // them, so the next attempt (remount or TTL retry) reaches the
      // network again.
      return null
    } finally {
      clearTimeout(timer)
      inFlight.delete(url)
    }
  })()

  inFlight.set(url, pending)
  return pending
}

interface ResolvedSvg {
  url: string
  text: string
}

async function resolveSvg(
  baseUrl: string,
  branch: string,
  id: string,
  type: AssetType | null,
  variant: string,
): Promise<ResolvedSvg | null> {
  // An empty id (input that canonicalized to nothing) has no asset URL —
  // never fetch `.../tokens/_full.svg`. Treated as a miss (renders fallback).
  if (!id) return null
  if (type) {
    const url = buildUrl(baseUrl, branch, type, id, variant)
    const text = await fetchSvg(url)
    return text === null ? null : { url, text }
  }

  // Unknown type — probe all three and keep token-first result ordering.
  const types: AssetType[] = ['tokens', 'chains', 'brands']
  const urls = types.map((t) => buildUrl(baseUrl, branch, t, id, variant))
  const results = await Promise.all(urls.map((url) => fetchSvg(url)))
  const index = results.findIndex((result) => result !== null)
  return index === -1 ? null : { url: urls[index], text: results[index]! }
}

export interface GithubFallbackProps extends Omit<
  SVGProps<SVGSVGElement>,
  'ref'
> {
  id: string
  /** The original user-supplied value, used for the accessible name. */
  rawValue?: string | number
  iconType?: IconType
  mono?: boolean
  size?: number | string
  fallback?: ReactNode
}

interface FallbackState {
  key: string
  content: SvgReactContent | null
  failed: boolean
}

function getCachedContent(
  baseUrl: string,
  branch: string,
  type: AssetType | null,
  id: string,
  variant: string,
  idPrefix: string,
): SvgReactContent | null {
  if (!type) return null
  const url = buildUrl(baseUrl, branch, type, id, variant)
  const cached = cacheGet(url)
  return typeof cached === 'string'
    ? cachedContentFor(url, cached, idPrefix)
    : null
}

export function GithubFallback({
  id,
  rawValue,
  iconType,
  mono = false,
  size = 32,
  fallback,
  ...props
}: GithubFallbackProps) {
  const variant = mono ? 'mono' : 'full'
  const { baseUrl, branch } = useIconConfig()
  // Per-instance prefix for the SVG's resource ids: without it two mounts
  // of the same fetched SVG collide on document-global url(#...) lookups.
  // The sanitize strips React's useId delimiters, unsafe in CSS url() tokens.
  const idPrefix = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  // Resolve the asset type once per render (pure, cheap-ish lookup) and
  // thread it through both the cache-read and the fetch path so core
  // `resolve` runs at most once.
  const type = inferType(id, iconType)
  const requestKey = `${baseUrl}|${branch}|${iconType ?? 'auto'}|${id}|${variant}`
  const cachedContent = useMemo(
    () => getCachedContent(baseUrl, branch, type, id, variant, idPrefix),
    [baseUrl, branch, type, id, variant, idPrefix],
  )
  const [state, setState] = useState<FallbackState>(() => ({
    key: requestKey,
    content: cachedContent,
    failed: false,
  }))
  const currentState =
    state.key === requestKey
      ? state
      : {
          key: requestKey,
          content: cachedContent,
          failed: false,
        }

  useEffect(() => {
    if (currentState.content || currentState.failed) return

    let cancelled = false
    resolveSvg(baseUrl, branch, id, type, variant).then((resolved) => {
      if (cancelled) return
      if (!resolved) {
        setState({ key: requestKey, content: null, failed: true })
        return
      }
      // Convert once and memoise on the cache entry so other mounts of the
      // same URL reuse it (id-free SVGs only — see cachedContentFor). A null
      // conversion (unparseable text) is negative-cached so other mounts
      // don't re-attempt the parse; transient network misses never reach
      // here (resolved is null).
      const content = cachedContentFor(resolved.url, resolved.text, idPrefix)
      if (!content) cacheSet(resolved.url, null)
      setState({
        key: requestKey,
        content,
        failed: !content,
      })
    })

    return () => {
      cancelled = true
    }
  }, [
    baseUrl,
    branch,
    currentState.failed,
    currentState.content,
    id,
    idPrefix,
    requestKey,
    type,
    variant,
  ])

  // A failure is not forever: long-lived components (dashboards) get one
  // retry per negative-cache window. Clearing `failed` re-arms the fetch
  // effect; within-TTL retries are absorbed by the negative cache, so the
  // network sees at most one request per URL per TTL.
  useEffect(() => {
    if (!currentState.failed) return
    const timer = setTimeout(() => {
      setState((s) =>
        s.key === requestKey && s.failed
          ? { key: requestKey, content: null, failed: false }
          : s,
      )
    }, NEGATIVE_CACHE_TTL_MS)
    return () => clearTimeout(timer)
  }, [currentState.failed, requestKey])

  if (currentState.failed) return <>{fallback ?? null}</>
  if (!currentState.content) return <>{fallback ?? null}</>

  const monoProps = mono ? { fill: 'currentColor' } : {}

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={currentState.content.viewBox}
      role="img"
      aria-label={rawValue !== undefined ? String(rawValue) : id}
      {...monoProps}
      {...props}
    >
      {currentState.content.node}
    </svg>
  )
}
