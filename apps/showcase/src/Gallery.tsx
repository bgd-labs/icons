import type { IconMeta, IconType } from '@bgd-labs/icons'
import { listIcons } from '@bgd-labs/icons'
import { Icon } from '@bgd-labs/icons-react'
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Footer } from './Footer'
import { GitHubCorner } from './GitHubCorner'
import { HeaderArt } from './HeaderArt'
import { href } from './router'
import { useInView } from './useInView'

const ALL = listIcons()
const TYPES: (IconType | 'all')[] = ['all', 'token', 'chain', 'brand']

function matches(meta: IconMeta, q: string): boolean {
  if (!q) return true
  const hay = `${meta.id} ${meta.name} ${meta.symbol ?? ''} ${meta.chainId ?? ''}`
  return hay.toLowerCase().includes(q)
}

// Columns are responsive (2 / 3 / 6), so infer the current count from the DOM:
// every card in the first row shares the first card's offsetTop. Lets Up/Down
// jump a whole row without hard-coding the breakpoints.
function columnCount(cards: HTMLElement[]): number {
  if (cards.length < 2) return cards.length
  const top = cards[0].offsetTop
  let cols = 1
  while (cols < cards.length && cards[cols].offsetTop === top) cols++
  return cols
}

function IconCard({ meta }: { meta: IconMeta }) {
  const detailHref = href({ name: 'icon', type: meta.type, id: meta.id })
  // Defer the icon (and its lazy chunk) until the card nears the viewport, so
  // the grid stays cheap at hundreds of icons. Space is reserved either way, so
  // there is no layout shift when the glyph lands.
  const [ref, inView] = useInView<HTMLLIElement>()

  return (
    <li ref={ref}>
      <a
        href={detailHref}
        title={meta.name}
        data-card
        className="group block outline-none"
      >
        <article className="relative aspect-square bg-white flex flex-col items-center py-7 transition-transform active:scale-[0.98] group-focus-visible:ring-2 group-focus-visible:ring-inset group-focus-visible:ring-gray-300">
          <div className="relative my-auto transition-transform duration-200 group-hover:scale-110 group-focus-visible:scale-110">
            {inView ? (
              <Icon value={meta.id} type={meta.type} size={48} />
            ) : (
              <div style={{ width: 48, height: 48 }} aria-hidden />
            )}
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-gray-400 group-hover:text-gray-700 group-focus-visible:text-gray-700">
              {meta.symbol ?? meta.name}
            </div>
          </div>
        </article>
      </a>
    </li>
  )
}

export default function Gallery() {
  const [query, setQuery] = useState('')
  const [type, setType] = useState<IconType | 'all'>('all')
  const inputRef = useRef<HTMLInputElement>(null)
  const gridRef = useRef<HTMLUListElement>(null)

  const q = query.trim().toLowerCase()
  const icons = useMemo(
    () =>
      ALL.filter((m) => (type === 'all' || m.type === type) && matches(m, q)),
    [q, type],
  )

  const cards = () =>
    gridRef.current
      ? [...gridRef.current.querySelectorAll<HTMLAnchorElement>('a[data-card]')]
      : []

  const focusCard = (index: number) => {
    const all = cards()
    all[Math.max(0, Math.min(index, all.length - 1))]?.focus()
  }

  // Arrow keys move focus across the result grid; Enter follows the focused
  // card's link natively. ArrowUp from the first row hands focus back to search.
  const onGridKeyDown = (event: ReactKeyboardEvent<HTMLUListElement>) => {
    const all = cards()
    const current = all.indexOf(document.activeElement as HTMLAnchorElement)
    if (current === -1) return
    const cols = columnCount(all)
    let next: number
    switch (event.key) {
      case 'ArrowRight':
        next = current + 1
        break
      case 'ArrowLeft':
        next = current - 1
        break
      case 'ArrowDown':
        next = current + cols
        break
      case 'ArrowUp':
        if (current < cols) {
          event.preventDefault()
          inputRef.current?.focus()
          return
        }
        next = current - cols
        break
      default:
        return
    }
    event.preventDefault()
    focusCard(next)
  }

  // `/` or ⌘K focuses search; Esc blurs it.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)

      if (
        (event.key === '/' && !typing) ||
        ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')
      ) {
        event.preventDefault()
        inputRef.current?.focus()
      } else if (
        event.key === 'Escape' &&
        document.activeElement === inputRef.current
      ) {
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <main className="flex min-h-screen flex-col bg-gray-50/80">
      <div className="relative container max-w-5xl border-x border-gray-100 px-7 pb-12 pt-16 mx-auto bg-white">
        <GitHubCorner />
        <nav className="absolute left-7 top-6 z-10 flex items-center gap-4 text-sm font-medium">
          <a
            href={href({ name: 'docs' })}
            className="text-gray-400 hover:text-gray-800 transition-colors"
          >
            Docs
          </a>
          <a
            href={href({ name: 'contribute' })}
            className="text-gray-400 hover:text-gray-800 transition-colors"
          >
            Contribute
          </a>
        </nav>
        <HeaderArt
          aria-hidden
          className="w-4/5 h-auto mx-auto -translate-x-1.5"
        />
      </div>
      <div className="border-gray-100 border-y transition-colors duration-200 has-[input:focus]:border-gray-300">
        <div className="relative container max-w-5xl border-x border-gray-100 h-full mx-auto flex items-center gap-4 bg-white">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search by name, symbol, chain id..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              // Step down out of the search field into the results grid.
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                focusCard(0)
              }
            }}
            autoComplete="off"
            spellCheck={false}
            className="placeholder:text-gray-400 grow focus:outline-none px-6 py-4 text-sm"
          />

          {!query && (
            <kbd
              aria-hidden
              className="pointer-events-none hidden select-none items-center rounded border border-gray-200 px-1.5 font-mono text-[11px] leading-5 text-gray-300 sm:flex"
            >
              /
            </kbd>
          )}

          <div
            role="tablist"
            aria-label="Icon type"
            className="flex items-center self-stretch pr-4"
          >
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className={`text-sm font-medium text-gray-300 hover:text-gray-400 capitalize px-3 cursor-pointer transition-[color,scale] active:scale-[0.96] ${type === t ? 'text-gray-700 hover:text-gray-700' : ''}`}
                role="tab"
                aria-selected={type === t}
                onClick={() => setType(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="border-gray-100 border-x container max-w-5xl mx-auto overflow-hidden grow">
        {icons.length === 0 ? (
          <div className="flex items-center justify-center text-gray-400 text-sm py-20">
            <p>
              No icons match <span className="text-gray-600"> “{query}”.</span>
            </p>
          </div>
        ) : (
          <ul
            ref={gridRef}
            onKeyDown={onGridKeyDown}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 -mr-px -mb-px [&>li]:border-gray-100 [&>li]:border-b [&>li]:border-r "
          >
            {icons.map((meta) => (
              <IconCard key={`${meta.type}:${meta.id}`} meta={meta} />
            ))}
          </ul>
        )}
      </div>
      <Footer />
    </main>
  )
}
