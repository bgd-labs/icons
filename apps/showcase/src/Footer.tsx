import { BGD_LABS_URL, REPO_URL } from './links'
import { href } from './router'

const linkClass =
  'text-xs text-gray-400 font-medium hover:text-gray-800 transition-colors'

function Dot() {
  return <div className="size-1 bg-stone-200 rounded-full" />
}

/**
 * Shared footer nav. It doubles as the site's only navigation, so the internal
 * routes (Docs, Contribute) live here alongside the external links — and both
 * pages get the same, correct set.
 */
export function Footer() {
  return (
    <div className="border-t border-gray-100">
      <div className="container max-w-5xl border-x border-gray-100 mx-auto py-3 px-4 flex items-center justify-center gap-3 flex-wrap">
        <a href={BGD_LABS_URL} className={linkClass}>
          BGD Labs
        </a>
        <Dot />
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className={linkClass}
        >
          GitHub
        </a>
        <Dot />
        <a href={href({ name: 'docs' })} className={linkClass}>
          Docs
        </a>
        <Dot />
        <a href={href({ name: 'contribute' })} className={linkClass}>
          Contribute
        </a>
      </div>
    </div>
  )
}
