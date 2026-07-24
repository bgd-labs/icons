import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Turnstile } from '@marsidev/react-turnstile'
import { BackBar } from './BackBar'
import { InlineCode } from './CodeBlock'
import { checkSvg, hasError, suggestBrandColor } from './contribute-validate'
import type { Check } from './contribute-validate'
import { Footer } from './Footer'
import { CONTRIBUTING_URL } from './links'

// A normal, linked route — no secrecy. Opening a PR ships nothing; the
// maintainer's review is the gate, exactly like GitHub's "edit this file → PR"
// flow for any stranger. The submit endpoint stays public; its only real
// concern is spam (junk PRs), handled by Turnstile, not auth.
export const ROUTE = 'contribute'

// Client-side env (both are public by design): the submit endpoint and the
// Turnstile site key. When unset the form still works — the endpoint stub
// just reports that nothing is configured (local dev).
const SUBMIT_ENDPOINT: string | undefined = import.meta.env.VITE_SUBMIT_ENDPOINT
const TURNSTILE_SITE_KEY: string | undefined = import.meta.env
  .VITE_TURNSTILE_SITE_KEY

type AssetType = 'token' | 'chain' | 'brand'

interface SvgSlot {
  name: string
  content: string
}

const field =
  'border border-gray-200 px-3 py-2 text-sm rounded text-gray-800 ' +
  'focus:outline-none focus:border-gray-400 transition-colors'
const fieldLabel = 'text-sm font-medium text-gray-700'

function Label({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={fieldLabel}>{label}</span>
      {children}
    </label>
  )
}

function Dropzone({
  label,
  slot,
  onLoad,
}: {
  label: string
  slot: SvgSlot | null
  onLoad: (s: SvgSlot) => void
}) {
  const read = (file?: File) => {
    if (!file) return
    file.text().then((content) => onLoad({ name: file.name, content }))
  }
  return (
    <label
      className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-200 rounded-md py-8 px-4 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        read(e.dataTransfer.files[0])
      }}
    >
      <input
        type="file"
        accept=".svg,image/svg+xml"
        hidden
        onChange={(e) => read(e.target.files?.[0])}
      />
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <span className="text-xs text-gray-400">
        {slot ? slot.name : 'drop or click'}
      </span>
    </label>
  )
}

function SvgTile({
  svg,
  dark,
  caption,
}: {
  svg: string
  dark?: boolean
  caption?: string
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`size-20 flex items-center justify-center rounded-md border border-gray-100 ${
          dark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
        }`}
        // Raw contributed SVG — 32×32, mono inherits the tile's text color.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {caption && <span className="text-xs text-gray-400">{caption}</span>}
    </div>
  )
}

function CheckList({ checks }: { checks: Check[] }) {
  if (!checks.length) return null
  return (
    <ul className="flex flex-col gap-1 text-xs">
      {checks.map((c, i) => (
        <li
          key={i}
          className={`flex items-start gap-2 ${
            c.level === 'error'
              ? 'text-red-600'
              : c.level === 'warn'
                ? 'text-amber-600'
                : 'text-emerald-600'
          }`}
        >
          <span aria-hidden>
            {c.level === 'error' ? '✗' : c.level === 'warn' ? '!' : '✓'}
          </span>
          <span>{c.message}</span>
        </li>
      ))}
    </ul>
  )
}

export default function Contribute() {
  const [type, setType] = useState<AssetType>('token')
  const [id, setId] = useState('')
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [chainId, setChainId] = useState('')
  const [aliases, setAliases] = useState('')
  const [full, setFull] = useState<SvgSlot | null>(null)
  const [mono, setMono] = useState<SvgSlot | null>(null)
  const [brandColor, setBrandColor] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [prUrl, setPrUrl] = useState<string | null>(null)

  const fullChecks = useMemo(
    () => (full ? checkSvg(full.content, false) : []),
    [full],
  )
  const monoChecks = useMemo(
    () => (mono ? checkSvg(mono.content, true) : []),
    [mono],
  )

  const onFull = (s: SvgSlot) => {
    setFull(s)
    const suggested = suggestBrandColor(s.content)
    if (suggested && !brandColor) setBrandColor(suggested)
  }

  const ready =
    id.trim() &&
    name.trim() &&
    full &&
    mono &&
    !hasError(fullChecks) &&
    !hasError(monoChecks) &&
    (type !== 'token' || symbol.trim()) &&
    (!TURNSTILE_SITE_KEY || turnstileToken)

  const submit = async () => {
    if (!ready || !full || !mono) return
    setSubmitting(true)
    setResult(null)
    setPrUrl(null)
    const payload = {
      type,
      id: id.trim().toLowerCase(),
      name: name.trim(),
      symbol: symbol.trim() || undefined,
      chainId: chainId ? Number(chainId) : undefined,
      aliases: aliases
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
      brandColor: brandColor || undefined,
      fullSvg: full.content,
      monoSvg: mono.content,
      turnstileToken: turnstileToken ?? undefined,
    }
    try {
      // The submit endpoint (apps/contribute-worker) re-validates and opens
      // the PR via the GitHub App. Configured at deploy time.
      const endpoint = SUBMIT_ENDPOINT
      if (!endpoint) {
        setResult(
          'No submit endpoint configured yet — payload is ready though.',
        )
        console.log('contribute payload', payload)
        return
      }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (res.ok) {
        setResult('Submitted — PR opened:')
        setPrUrl(json.prUrl ?? null)
      } else {
        setResult(`Rejected: ${json.error ?? res.statusText}`)
      }
    } catch (e) {
      setResult(`Failed: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col">
      <BackBar />

      <div className="border-t border-gray-100 grow bg-gray-50/80 flex flex-col">
        <div className="container max-w-5xl border-x border-gray-100 mx-auto bg-white grow">
          <div className="max-w-3xl mx-auto px-7 py-12 flex flex-col gap-10">
            <header className="flex flex-col gap-2">
              <h1 className="text-3xl font-semibold text-gray-900">
                Contribute an icon
              </h1>
              <p className="text-gray-500">
                Drop the full + mono SVGs, fill the details, submit. A
                maintainer reviews the PR before it ships.
              </p>
            </header>

            {/* Key rules pulled from CONTRIBUTING.md so contributors see them
                before uploading; the form's live checks enforce the SVG ones. */}
            <aside className="border border-gray-200 rounded-md bg-gray-50/50 p-5 flex flex-col gap-3 text-sm text-gray-600">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-semibold text-gray-900">Guidelines</h2>
                <a
                  href={CONTRIBUTING_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-gray-900 underline underline-offset-2 hover:text-gray-600 whitespace-nowrap"
                >
                  Full guide →
                </a>
              </div>
              <ul className="flex flex-col gap-1.5 list-disc pl-5 marker:text-gray-300 leading-relaxed">
                <li>
                  Both SVGs are{' '}
                  <span className="font-medium text-gray-800">32×32</span> with{' '}
                  <InlineCode>viewBox="0 0 32 32"</InlineCode> and contain no{' '}
                  <InlineCode>{'<script>'}</InlineCode>,{' '}
                  <InlineCode>{'<text>'}</InlineCode>,{' '}
                  <InlineCode>{'<image>'}</InlineCode>, or external references.
                </li>
                <li>
                  The <span className="font-medium text-gray-800">mono</span>{' '}
                  SVG uses <InlineCode>currentColor</InlineCode> for every
                  fill/stroke — hand-simplified to read small, not a mechanical
                  recolor.
                </li>
                <li>
                  The id (filename) is lowercase alphanumeric (
                  <InlineCode>{'^[a-z0-9]+$'}</InlineCode>) and unique within
                  its type.
                </li>
                <li>
                  By submitting you confirm you have the right to contribute the
                  mark and that it is a faithful, official representation — no
                  altered, parody, or unofficial marks.
                </li>
              </ul>
            </aside>

            <div className="grid md:grid-cols-2 gap-x-10 gap-y-6">
              {/* Metadata */}
              <section className="flex flex-col gap-4">
                <Label label="Type">
                  <select
                    className={field}
                    value={type}
                    onChange={(e) => setType(e.target.value as AssetType)}
                  >
                    <option value="token">token</option>
                    <option value="chain">chain</option>
                    <option value="brand">brand</option>
                  </select>
                </Label>
                <Label label="Id (filename, lowercase)">
                  <input
                    className={field}
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder="usdc"
                  />
                </Label>
                <Label label="Name">
                  <input
                    className={field}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="USD Coin"
                  />
                </Label>
                {type === 'token' && (
                  <Label label="Symbol">
                    <input
                      className={field}
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value)}
                      placeholder="USDC"
                    />
                  </Label>
                )}
                {type === 'chain' && (
                  <Label label="Chain id">
                    <input
                      className={field}
                      value={chainId}
                      onChange={(e) => setChainId(e.target.value)}
                      placeholder="1"
                      inputMode="numeric"
                    />
                  </Label>
                )}
                <Label label="Aliases (comma-separated)">
                  <input
                    className={field}
                    value={aliases}
                    onChange={(e) => setAliases(e.target.value)}
                    placeholder="usdce, musdc"
                  />
                </Label>
                <Label label="Brand color">
                  <span className="flex items-center gap-2">
                    <input
                      type="color"
                      className="size-9 rounded border border-gray-200 bg-white p-0.5 cursor-pointer"
                      value={brandColor || '#000000'}
                      onChange={(e) => setBrandColor(e.target.value)}
                    />
                    <input
                      className={`${field} font-mono grow`}
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      placeholder="#6281e3"
                    />
                  </span>
                </Label>
              </section>

              {/* SVG dropzones + previews */}
              <section className="flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <Dropzone label="Full SVG" slot={full} onLoad={onFull} />
                  {full && (
                    <div className="flex justify-center">
                      <SvgTile svg={full.content} caption="full" />
                    </div>
                  )}
                  <CheckList checks={fullChecks} />
                </div>

                <div className="flex flex-col gap-3">
                  <Dropzone label="Mono SVG" slot={mono} onLoad={setMono} />
                  {mono && (
                    <div className="flex justify-center gap-4">
                      <SvgTile svg={mono.content} caption="light" />
                      <SvgTile svg={mono.content} dark caption="dark" />
                    </div>
                  )}
                  <CheckList checks={monoChecks} />
                </div>
              </section>
            </div>

            <div className="flex flex-col gap-4">
              {TURNSTILE_SITE_KEY && (
                <Turnstile
                  siteKey={TURNSTILE_SITE_KEY}
                  onSuccess={setTurnstileToken}
                  onError={() => setTurnstileToken(null)}
                  onExpire={() => setTurnstileToken(null)}
                />
              )}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className="bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded hover:bg-gray-700 transition-[background-color,scale] active:scale-[0.96] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  disabled={!ready || submitting}
                  onClick={submit}
                >
                  {submitting ? 'Submitting…' : 'Submit for review'}
                </button>
                {result && (
                  <p className="text-sm text-gray-500">
                    {result}{' '}
                    {prUrl && (
                      <a
                        href={prUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-gray-900 underline underline-offset-2 hover:text-gray-600"
                      >
                        {prUrl}
                      </a>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
