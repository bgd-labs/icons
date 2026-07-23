import { href } from './router'

/**
 * Top band shared by every sub-page (detail, docs, contribute). Keeps the
 * bordered max-w-5xl shell aligned with the gallery and gives a single, well-
 * placed way back to the grid.
 */
export function BackBar() {
  return (
    <div className="container max-w-5xl border-x border-gray-100 mx-auto">
      <a
        href={href({ name: 'gallery' })}
        className="group inline-flex items-center gap-2 px-7 py-5 text-sm font-medium text-gray-400 hover:text-gray-800 transition-colors"
      >
        <span
          aria-hidden
          className="transition-transform duration-200 group-hover:-translate-x-0.5"
        >
          ←
        </span>{' '}
        All icons
      </a>
    </div>
  )
}
