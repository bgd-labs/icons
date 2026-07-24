import type { ReactNode } from 'react'
import { BackBar } from './BackBar'
import { CodeBlock, InlineCode } from './CodeBlock'
import { Footer } from './Footer'
import { CONTRIBUTING_URL } from './links'
import { href } from './router'

const linkCls =
  'text-gray-900 font-medium underline underline-offset-2 hover:text-gray-600'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  )
}

function P({ children }: { children: ReactNode }) {
  return <p className="text-sm text-gray-600 leading-relaxed">{children}</p>
}

function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-2 text-sm text-gray-600 leading-relaxed list-disc pl-5 marker:text-gray-300">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  )
}

function Table({ head, rows }: { head: ReactNode[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            {head.map((h, i) => (
              <th
                key={i}
                className="py-2 pr-4 font-semibold text-gray-900 whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-gray-100 align-top">
              {r.map((c, j) => (
                <td key={j} className="py-2 pr-4 text-gray-600">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Docs as plain JSX — keeps the showcase zero-dependency (no markdown
 * renderer), matching core's zero-dep ethos. The canonical reference is the
 * repo README; this is the quick-start.
 */
export default function Docs() {
  return (
    <main className="flex min-h-screen flex-col">
      <BackBar />

      <div className="border-t border-gray-100 grow bg-gray-50/80 flex flex-col">
        <div className="container max-w-5xl border-x border-gray-100 mx-auto bg-white grow">
          <article className="max-w-2xl mx-auto px-7 py-12 flex flex-col gap-10">
            <header className="flex flex-col gap-2">
              <h1 className="text-3xl font-semibold text-gray-900">Docs</h1>
              <p className="text-gray-500">
                Everything you need to drop web3 icons into your app.
              </p>
            </header>

            <Section title="Install">
              <CodeBlock>pnpm add @bgd-labs/icons-react</CodeBlock>
            </Section>

            <Section title="Render any icon">
              <P>
                <InlineCode>{'<Icon>'}</InlineCode> resolves by canonical id,
                symbol, chain id, or alias. Pass <InlineCode>type</InlineCode>{' '}
                to disambiguate across token / chain / brand.
              </P>
              <CodeBlock>{`import { Icon } from '@bgd-labs/icons-react'

<Icon value="eth" type="token" size={32} />`}</CodeBlock>
            </Section>

            <Section title="Per-icon components (tree-shakeable)">
              <P>
                Import a single icon when you only need a few — unused icons
                drop out of the bundle.
              </P>
              <CodeBlock>{`import { EthIcon } from '@bgd-labs/icons-react/tokens'

<EthIcon size={32} />`}</CodeBlock>
            </Section>

            <Section title="The mono prop">
              <P>
                Every icon ships a full-color and a single-color variant. Add{' '}
                <InlineCode>mono</InlineCode> to render the{' '}
                <InlineCode>currentColor</InlineCode> version — it inherits the
                surrounding text color. There is no{' '}
                <InlineCode>variant</InlineCode> prop.
              </P>
              <CodeBlock>{`<Icon value="eth" type="token" mono />
<span style={{ color: 'rebeccapurple' }}>
  <EthIcon mono />
</span>`}</CodeBlock>
            </Section>

            <Section title="Without React">
              <P>
                The core package is dependency-free and returns raw SVG strings
                — useful for server rendering, emails, or downloads.
              </P>
              <CodeBlock>{`import { getSvg } from '@bgd-labs/icons/svg'
import { listIcons, getMeta } from '@bgd-labs/icons'

getSvg('eth', 'mono')   // → "<svg …>…</svg>" | null
listIcons('token')      // → IconMeta[]
getMeta('wbnb')         // → resolves alias → bnb metadata`}</CodeBlock>
            </Section>

            <hr className="border-gray-100" />

            <P>
              Contributing an icon? The quickest path is the{' '}
              <a href={href({ name: 'contribute' })} className={linkCls}>
                Contribute
              </a>{' '}
              page — drag-drop, opens a PR, no git. To work in the repo
              directly, the steps below cover it; the authoritative guide is{' '}
              <a
                href={CONTRIBUTING_URL}
                target="_blank"
                rel="noreferrer"
                className={linkCls}
              >
                CONTRIBUTING.md
              </a>
              .
            </P>

            <Section title="Adding an icon">
              <P>
                Each icon is a{' '}
                <span className="font-semibold text-gray-800">triplet</span>{' '}
                under <InlineCode>{'assets/<type>/'}</InlineCode> — where{' '}
                <InlineCode>{'<type>'}</InlineCode> is{' '}
                <InlineCode>tokens</InlineCode>, <InlineCode>chains</InlineCode>
                , or <InlineCode>brands</InlineCode>.
              </P>
              <Table
                head={['File', 'Purpose']}
                rows={[
                  [
                    <InlineCode>{'<id>_full.svg'}</InlineCode>,
                    'Full-color authored SVG',
                  ],
                  [
                    <InlineCode>{'<id>_mono.svg'}</InlineCode>,
                    'Single-color variant using currentColor',
                  ],
                  [<InlineCode>{'<id>.json'}</InlineCode>, 'Metadata'],
                ]}
              />
              <P>
                <InlineCode>{'<id>'}</InlineCode> is lowercase alphanumeric (
                <InlineCode>{'^[a-z0-9]+$'}</InlineCode>) and unique within its
                type. For tokens it's the symbol lowercased with
                non-alphanumerics stripped (<InlineCode>PT-eUSDe</InlineCode> →{' '}
                <InlineCode>pteusde</InlineCode>); for chains and brands, a
                hand-chosen slug.
              </P>
            </Section>

            <Section title="SVG rules">
              <P>Both SVGs must:</P>
              <Bullets
                items={[
                  <>
                    Be{' '}
                    <span className="font-semibold text-gray-800">32×32</span>{' '}
                    with <InlineCode>viewBox="0 0 32 32"</InlineCode>.
                  </>,
                  <>
                    Contain no <InlineCode>{'<script>'}</InlineCode>,{' '}
                    <InlineCode>{'<text>'}</InlineCode>,{' '}
                    <InlineCode>{'<image>'}</InlineCode>, event handlers, or
                    external references — these are rejected by{' '}
                    <InlineCode>pnpm validate</InlineCode> and stripped at
                    render time.
                  </>,
                ]}
              />
              <P>
                The <InlineCode>mono</InlineCode> variant additionally uses{' '}
                <InlineCode>currentColor</InlineCode> for every fill/stroke (no
                hardcoded colors) and is hand-simplified to read at small sizes
                — not a mechanical recolor of the full art.
              </P>
            </Section>

            <Section title="Metadata">
              <P>
                <InlineCode>{'<id>.json'}</InlineCode> describes the icon.
                Unknown fields are rejected, so typos can't silently change
                behavior.
              </P>
              <Table
                head={['Field', 'Token', 'Chain', 'Brand', 'Notes']}
                rows={[
                  [
                    <InlineCode>name</InlineCode>,
                    '✓',
                    '✓',
                    '✓',
                    'Display name',
                  ],
                  [
                    <InlineCode>symbol</InlineCode>,
                    '✓',
                    '—',
                    '—',
                    'Ticker, display-cased',
                  ],
                  [
                    <InlineCode>chainId</InlineCode>,
                    '—',
                    '✓',
                    '—',
                    'Positive integer',
                  ],
                  [
                    <InlineCode>brandColor</InlineCode>,
                    'opt',
                    'opt',
                    'opt',
                    '#rrggbb',
                  ],
                  [
                    <InlineCode>aliases</InlineCode>,
                    'opt',
                    'opt',
                    'opt',
                    'Extra ids that resolve here',
                  ],
                  [
                    <InlineCode>bundle</InlineCode>,
                    'opt',
                    'opt',
                    'opt',
                    'Ship eagerly (rare)',
                  ],
                ]}
              />
              <CodeBlock>{`// assets/tokens/aave.json
{
  "symbol": "AAVE",
  "name": "Aave",
  "aliases": ["AAVE.e"],
  "brandColor": "#9391f0"
}`}</CodeBlock>
            </Section>

            <Section title="Regenerating files">
              <P>
                After adding or editing assets, regenerate the derived code.
                Generated output lives in{' '}
                <InlineCode>src/generated/</InlineCode> (gitignored).
              </P>
              <CodeBlock>{`pnpm validate   # SVG + metadata checks; auto-fixes mono colors & SVGO optimization (edits assets/)
pnpm generate   # rebuilds src/generated/ — components, SVG maps, id unions
pnpm build      # non-mutating validate:check + generate, then builds both packages`}</CodeBlock>
              <P>
                <InlineCode>pnpm build</InlineCode> runs the non-mutating{' '}
                <InlineCode>validate:check</InlineCode>, so commit whatever{' '}
                <InlineCode>pnpm validate</InlineCode> auto-fixes first. Then{' '}
                <InlineCode>pnpm test</InlineCode> to verify, and{' '}
                <InlineCode>pnpm changeset</InlineCode> for any consumer-visible
                change.
              </P>
            </Section>
          </article>
        </div>
      </div>

      <Footer />
    </main>
  )
}
