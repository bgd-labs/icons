import { type MouseEvent, useRef, useState } from 'react'
import { getAliases, getTypedMeta } from '@bgd-labs/icons'
import type { IconType } from '@bgd-labs/icons'
import { getTypedSvg } from '@bgd-labs/icons/svg'
import { Icon } from '@bgd-labs/icons-react'
import { BackBar } from './BackBar'
import { CodeBlock } from './CodeBlock'
import { componentName } from './component-name'
import { CopyButton } from './CopyButton'
import { downloadSvg } from './download'
import { Footer } from './Footer'

const btnBase =
  'text-sm font-medium px-4 py-2 transition-[color,border-color,background-color,scale] ' +
  'active:scale-[0.96] cursor-pointer disabled:opacity-40 disabled:pointer-events-none'
// Secondary: outline. Primary: filled — one obvious entry point among the row.
const btnSecondary = `${btnBase} border border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900`
const btnPrimary = `${btnBase} border border-gray-900 bg-gray-900 text-white hover:bg-gray-700 hover:border-gray-700`

// Preview backdrops. The mono glyph is `currentColor`, so each surface also sets
// a foreground so mono reads correctly against it — this is what lets the page
// demonstrate the whole point of the mono variant.
type Surface = 'light' | 'dark'
const SURFACES: { key: Surface; label: string }[] = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
]
const SURFACE_CLASS: Record<Surface, string> = {
  light: 'bg-white text-gray-900',
  dark: 'bg-gray-900 text-gray-100',
}
const SIZES = [16, 24, 32, 48]

export default function IconDetail({ type, id }: { type: string; id: string }) {
  // Playful: the mono glyph is currentColor, so recolor it as the pointer sweeps
  // across it — hue tracks horizontal position, so the color glides smoothly
  // through the spectrum instead of strobing. Mutate the node directly (ref)
  // rather than via state — mousemove fires constantly and we don't want to
  // re-render the page each time. On leave we clear the inline color so the
  // glyph falls back to the current surface's foreground.
  const monoRef = useRef<HTMLDivElement>(null)
  const paintMono = (e: MouseEvent<HTMLDivElement>) => {
    const el = monoRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const hue = Math.round(Math.min(Math.max(x, 0), 1) * 360)
    el.style.color = `hsl(${hue} 60% 55%)`
  }
  const resetMono = () => {
    if (monoRef.current) monoRef.current.style.color = ''
  }

  const [surface, setSurface] = useState<Surface>('light')

  const meta = getTypedMeta(type as IconType, id)

  if (!meta) {
    return (
      <main className="flex min-h-screen flex-col">
        <BackBar />
        <div className="border-t border-gray-100 grow bg-gray-50/80 flex flex-col">
          <div className="container max-w-5xl border-x border-gray-100 mx-auto flex items-center justify-center py-20 text-sm text-gray-400 grow">
            <p>
              No <code className="text-gray-600">{type}</code> icon named{' '}
              <code className="text-gray-600">{id}</code>.
            </p>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  const t = meta.type
  const fullSvg = getTypedSvg(t, meta.id, 'full') ?? ''
  const monoSvg = getTypedSvg(t, meta.id, 'mono') ?? ''

  // Usage snippets. Lead with the tree-shakeable per-icon component; the
  // dynamic <Icon> resolver is the fallback for runtime-chosen ids.
  const Comp = componentName(meta.id)
  const componentUsage = `import { ${Comp} } from '@bgd-labs/icons-react/${t}s'

<${Comp} />
<${Comp} mono />`
  const dynamicUsage = `import { Icon } from '@bgd-labs/icons-react'

<Icon value="${meta.id}" type="${t}" />
<Icon value="${meta.id}" type="${t}" mono />`

  // Extra strings that also resolve to this icon (beyond id/symbol/chainId).
  const aliases = getAliases(t, meta.id)

  return (
    <main className="flex min-h-screen flex-col">
      <BackBar />

      {/* Hero — large glyph beside the metadata + actions. */}
      <div className="border-y border-gray-100">
        <div className="container max-w-5xl border-x border-gray-100 mx-auto grid md:grid-cols-2">
          {/* Preview: themed stage + size ramp, with a surface toggle footer. */}
          <div className="flex flex-col border-b border-gray-100 md:border-b-0 md:border-r">
            <div
              className={`grow flex flex-col items-center justify-center gap-8 py-14 transition-colors duration-200 ${SURFACE_CLASS[surface]}`}
            >
              <div className="flex items-center justify-center gap-10">
                <div className="flex flex-col items-center gap-3">
                  <Icon value={meta.id} type={t} size={72} />
                  <span className="text-xs font-medium opacity-40">Full</span>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <div
                    ref={monoRef}
                    onMouseMove={paintMono}
                    onMouseLeave={resetMono}
                    className="cursor-crosshair transition-colors duration-100 ease-out"
                    title="Move across the glyph to recolor it"
                  >
                    <Icon value={meta.id} type={t} mono size={72} />
                  </div>
                  <span className="text-xs font-medium opacity-40">Mono</span>
                </div>
              </div>

              {/* Discoverability for the hue-paint above — pointer only, since
                  there's no hover on touch. */}
              <p className="hidden [@media(hover:hover)]:block -mt-3 text-[11px] font-medium opacity-40">
                Hover the mono glyph to recolor it
              </p>

              {/* Size ramp — proves the glyph holds up small. */}
              <div className="flex items-end gap-6">
                {SIZES.map((s) => (
                  <div key={s} className="flex flex-col items-center gap-2">
                    <div className="flex h-12 items-center">
                      <Icon value={meta.id} type={t} size={s} />
                    </div>
                    <span className="text-[10px] font-medium tabular-nums opacity-40">
                      {s}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center border-t border-gray-100 bg-white py-4">
              <div
                className="inline-flex border border-gray-200"
                role="group"
                aria-label="Preview surface"
              >
                {SURFACES.map((s, i) => {
                  const active = surface === s.key
                  return (
                    <button
                      key={s.key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSurface(s.key)}
                      className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                        i > 0 ? 'border-l border-gray-200' : ''
                      } ${
                        active
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      {s.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="p-7 flex flex-col gap-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {meta.name}
              </h1>
              <p className="text-sm font-medium text-gray-400 capitalize">
                {t}
              </p>
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-gray-400 font-medium">id</dt>
              <dd className="text-gray-700 font-mono">{meta.id}</dd>
              {meta.symbol && (
                <>
                  <dt className="text-gray-400 font-medium">symbol</dt>
                  <dd className="text-gray-700">{meta.symbol}</dd>
                </>
              )}
              {meta.chainId != null && (
                <>
                  <dt className="text-gray-400 font-medium">chain id</dt>
                  <dd className="text-gray-700 tabular-nums">{meta.chainId}</dd>
                </>
              )}
              {meta.brandColor && (
                <>
                  <dt className="text-gray-400 font-medium">brand</dt>
                  <dd className="text-gray-700 flex items-center gap-2">
                    <span
                      className="inline-block size-4 rounded-sm border border-gray-200"
                      style={{ background: meta.brandColor }}
                      aria-hidden="true"
                    />
                    <span className="font-mono">{meta.brandColor}</span>
                  </dd>
                </>
              )}
              {aliases.length > 0 && (
                <>
                  <dt className="text-gray-400 font-medium">
                    {aliases.length > 1 ? 'aliases' : 'alias'}
                  </dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {aliases.map((alias) => (
                      <code
                        key={alias}
                        title={`"${alias}" resolves to this icon`}
                        className="font-mono text-xs text-gray-600 bg-gray-100 rounded px-1.5 py-0.5"
                      >
                        {alias}
                      </code>
                    ))}
                  </dd>
                </>
              )}
            </dl>

            <div className="flex flex-wrap gap-2">
              <CopyButton
                className={btnPrimary}
                text={componentUsage}
                label="Copy JSX"
              />
              <CopyButton
                className={btnSecondary}
                text={fullSvg}
                label="Copy SVG"
              />
              <button
                type="button"
                className={btnSecondary}
                onClick={() => downloadSvg(`${meta.id}_full.svg`, fullSvg)}
                disabled={!fullSvg}
              >
                Download full
              </button>
              <button
                type="button"
                className={btnSecondary}
                onClick={() => downloadSvg(`${meta.id}_mono.svg`, monoSvg)}
                disabled={!monoSvg}
              >
                Download mono
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Usage — the inner container fills the remaining height so its
          border-x runs all the way down to the footer. */}
      <div className="grow bg-gray-50/80 flex flex-col">
        <div className="container max-w-5xl border-x border-gray-100 mx-auto p-7 grow">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Usage</h2>

          <p className="text-xs font-medium text-gray-400 mb-1.5">
            Per-icon component — tree-shakeable
          </p>
          <CodeBlock copyText={componentUsage}>{componentUsage}</CodeBlock>

          <p className="text-xs font-medium text-gray-400 mt-5 mb-1.5">
            Dynamic — resolve by id, symbol, or chain id
          </p>
          <CodeBlock copyText={dynamicUsage}>{dynamicUsage}</CodeBlock>

          <p className="text-sm text-gray-500 mt-4">
            Need the raw markup?{' '}
            <code className="text-gray-700 font-mono">
              getSvg('{meta.id}', 'full')
            </code>{' '}
            from{' '}
            <code className="text-gray-700 font-mono">@bgd-labs/icons/svg</code>{' '}
            returns the SVG string — no React required.
          </p>
        </div>
      </div>

      <Footer />
    </main>
  )
}
