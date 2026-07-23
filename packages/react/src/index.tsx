import type * as React from 'react'
import { lazy, Suspense, useEffect, useInsertionEffect, useState } from 'react'
import type { ReactNode, SVGProps } from 'react'
import { getMeta, getTypedMeta } from '@bgd-labs/icons'
import { resolveOrCandidate } from '@bgd-labs/icons/resolve'
import { EAGER_ICONS } from './generated/eager-map'
import {
  getLazyIcon,
  hasIconFailed,
  hasIconShown,
  markIconShown,
} from './lazy-icons'
import { useIconConfig } from './icon-provider'
import type { IconType } from './types'

export { IconProvider } from './icon-provider'
export type { IconContextValue } from './icon-provider'

// `type` shadows the inherited `SVGProps['type']` HTML attribute, which we
// never expose anyway. Omitting it makes the prop unambiguously `IconType`.
// `ref` is omitted because <Icon> renders different root elements depending
// on the internal path (eager svg, lazy wrapper, fallback) — there is no
// single element a ref could reliably target, so accepting one would be a
// silent no-op. The generated per-icon components forward refs properly.
export interface IconProps extends Omit<
  SVGProps<SVGSVGElement>,
  'type' | 'ref'
> {
  value: string | number
  type?: IconType
  mono?: boolean
  size?: number | string
  fallback?: ReactNode
}

let styleInjected = false
function ensureStyles() {
  if (styleInjected || typeof document === 'undefined') return
  styleInjected = true
  const s = document.createElement('style')
  s.textContent =
    '@keyframes bgd-icon-fade-in{from{opacity:0}to{opacity:1}}' +
    '.bgd-icon-placeholder{transition:opacity 0.3s ease-out}' +
    // !important is load-bearing: the overlay's animation/opacity are inline
    // styles (overlayStyle), which outrank any class rule in the cascade —
    // without it this media query can never actually disable the fade.
    '@media(prefers-reduced-motion:reduce){.bgd-icon-fade{animation:none!important;opacity:1!important}.bgd-icon-placeholder{transition:none!important}}'
  document.head.appendChild(s)
}

function Placeholder({
  id,
  type,
  size = 32,
  decorative = false,
}: {
  id: string
  type?: IconType
  size?: number | string
  decorative?: boolean
}) {
  const meta = type ? getTypedMeta(type, id) : getMeta(id)
  const color = meta?.placeholderColor ?? meta?.brandColor ?? '#ccc'
  const letter = (meta?.symbol ?? id).charAt(0).toUpperCase()
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      {...(decorative
        ? { 'aria-hidden': true, focusable: false }
        : { role: 'img', 'aria-label': meta?.name ?? id })}
    >
      <circle cx="16" cy="16" r="16" fill={color} opacity={0.25} />
      <text
        x="16"
        y="16"
        dy=".35em"
        textAnchor="middle"
        fill={color}
        fontSize="14"
        fontFamily="system-ui, sans-serif"
        fontWeight="600"
      >
        {letter}
      </text>
    </svg>
  )
}

// Every <Icon> render path returns the same root element: a <span> that
// carries the caller's className/style/handlers, wrapping the glyph svg. One
// root for eager and lazy means the public DOM contract doesn't depend on
// whether an asset happens to be bundled. The svg stays pixel-sized (the
// Safari frame-clip fix forbids a percentage-sized inner svg), so `size` — not
// className — is the sizing API.
function boxStyle(
  size: number | string | undefined,
  userStyle: React.CSSProperties | undefined,
  relative = false,
): React.CSSProperties {
  return {
    display: 'inline-flex',
    ...(size != null ? { width: size, height: size } : null),
    ...userStyle,
    // Lazy icons anchor an absolutely-positioned overlay, so the wrapper must
    // establish a positioning context regardless of the caller's style.
    ...(relative ? { position: 'relative' as const } : null),
  }
}

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'inline-flex',
  opacity: 0,
  animation: 'bgd-icon-fade-in 0.3s ease-out forwards',
}

const LazyGithubFallback = lazy(() =>
  import('./github-fallback').then((m) => ({ default: m.GithubFallback })),
)

// Mounts only when the surrounding Suspense boundary resolves — used to
// learn when the lazy icon is actually on screen.
function NotifyMounted({ onMounted }: { onMounted: () => void }) {
  // Once per mount, deliberately: the component remounts (via the key on
  // FadeInLazyIcon) whenever the icon identity changes, and re-running on a
  // new onMounted identity would re-fire the callback mid-lifecycle.
  useEffect(() => {
    onMounted()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

type LazyIconComponent = ReturnType<typeof getLazyIcon>

// The placeholder is the layout anchor (the lazy icon overlays it), so it
// must stay mounted — but once the icon has loaded it has to fade out.
// Mono icons use currentColor with transparent regions; a placeholder left
// at full opacity peeks through them.
function FadeInLazyIcon({
  Lazy,
  cacheKey,
  placeholder,
  mono,
  size,
  className,
  style,
  ...glyphProps
}: Omit<SVGProps<SVGSVGElement>, 'type' | 'ref'> & {
  Lazy: LazyIconComponent
  cacheKey: string
  placeholder: ReactNode
  mono: boolean
  size?: number | string
}) {
  // Already shown this session: the lazy chunk is warm and resolves
  // synchronously, so a placeholder + fade would be a gratuitous flash on a
  // re-display (list recycle, route change, modal reopen). Render the icon
  // straight, at full opacity. The Suspense boundary is kept only as a
  // safety net — a resolved lazy never shows its fallback.
  // Captured once at mount: marking this icon shown (below) must not flip the
  // current mount out of the fade path mid-animation. A *later* remount reads
  // the now-true flag through its own initializer and takes the instant path.
  const [seen] = useState(() => hasIconShown(cacheKey))
  const [loaded, setLoaded] = useState(seen)
  // Injecting the keyframe/transition styles is a DOM mutation, so it
  // belongs in an effect, not the render phase. Insertion effects run
  // before layout effects read styles — and never on the server.
  useInsertionEffect(ensureStyles, [])
  // The wrapper span is the public root: it carries the caller's
  // className/style and reflects an explicit size, so the layout box stays put
  // (no jump) when the lazy chunk lands. Glyph props go on the inner svg.
  const wrap = boxStyle(size, style, true)

  if (seen) {
    return (
      <span className={className} style={wrap}>
        <Suspense fallback={placeholder}>
          <Lazy mono={mono} size={size} {...glyphProps} />
        </Suspense>
      </span>
    )
  }

  return (
    <span className={className} style={wrap}>
      <span
        className="bgd-icon-placeholder"
        style={{ display: 'inline-flex', opacity: loaded ? 0 : 1 }}
        aria-hidden={loaded || undefined}
      >
        {placeholder}
      </span>
      <Suspense fallback={null}>
        <span className="bgd-icon-fade" style={overlayStyle}>
          <Lazy mono={mono} size={size} {...glyphProps} />
        </span>
        <NotifyMounted
          onMounted={() => {
            // A lazy load that produced no glyph (chunk 404 / inconsistent
            // build) must not fade the placeholder out to a blank box or mark
            // the icon "shown" — leave the placeholder up so a later remount
            // can retry the import.
            if (hasIconFailed(cacheKey)) return
            markIconShown(cacheKey)
            setLoaded(true)
          }}
        />
      </Suspense>
    </span>
  )
}

export function Icon({
  value,
  type: explicitType,
  mono = false,
  size,
  fallback,
  ...props
}: IconProps) {
  const { enableFallback } = useIconConfig()
  const { id, type, matched } = resolveOrCandidate(
    value,
    explicitType ? { type: explicitType } : {},
  )
  const placeholderType = type
  // className/style describe the root box; everything else (size/mono/fill,
  // events, aria-*, data-*) belongs on the glyph svg. Splitting them here
  // keeps the contract identical across every path below.
  const { className, style, ...glyphProps } = props

  // A matched identity is guaranteed to ship in the package: either in the
  // eager map (bundle: true assets) or behind the lazy shards.
  if (matched && type) {
    const lookupKey = `${type}:${id}`
    const Eager = EAGER_ICONS[lookupKey]
    if (Eager) {
      return (
        <span className={className} style={boxStyle(size, style)}>
          <Eager mono={mono} size={size} {...glyphProps} />
        </span>
      )
    }

    // Each variant is its own chunk; toggling mono loads a different chunk,
    // so the variant is part of the key (resets the fade-in/placeholder).
    const variant = mono ? 'mono' : 'full'
    const cacheKey = `${lookupKey}:${variant}`
    return (
      <FadeInLazyIcon
        // Reset the loaded state when the identity or variant changes
        key={cacheKey}
        cacheKey={cacheKey}
        Lazy={getLazyIcon(type, id, variant)}
        placeholder={
          fallback ?? (
            <Placeholder
              id={id}
              type={placeholderType}
              size={size}
              decorative
            />
          )
        }
        mono={mono}
        size={size}
        className={className}
        style={style}
        {...glyphProps}
      />
    )
  }

  // Bundlers replace process.env.NODE_ENV and dead-code-eliminate this in production
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    console.warn(`[bgd-icons] Unknown icon value: "${value}"`)
  }
  if (enableFallback) {
    const placeholder = fallback ?? (
      <Placeholder id={id} type={placeholderType} size={size} />
    )
    return (
      <span className={className} style={boxStyle(size, style)}>
        <Suspense fallback={placeholder}>
          <LazyGithubFallback
            id={id}
            rawValue={value}
            iconType={placeholderType}
            mono={mono}
            size={size}
            fallback={placeholder}
            {...glyphProps}
          />
        </Suspense>
      </span>
    )
  }
  return (
    <span className={className} style={boxStyle(size, style)}>
      {fallback ?? <Placeholder id={id} type={placeholderType} size={size} />}
    </span>
  )
}
