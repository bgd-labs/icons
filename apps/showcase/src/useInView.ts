import { useEffect, useRef, useState } from 'react'

/**
 * Reports when an element first scrolls near the viewport, then stops watching.
 *
 * The gallery renders one `<Icon>` per asset, and every non-eager icon pulls
 * its own lazy chunk on mount. With hundreds of icons on screen that would fire
 * hundreds of dynamic imports at once. Gating each card on this hook means only
 * the visible rows (plus a screen of pre-load via `rootMargin`) ever load — the
 * grid scales to hundreds without a request storm. Once seen it latches true,
 * so a rendered icon is never torn back down.
 */
export function useInView<T extends Element>(rootMargin = '400px') {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (inView) return
    const el = ref.current
    if (!el) return

    // No IntersectionObserver (old browsers, SSR-ish): render eagerly rather
    // than leave the card blank forever.
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true)
          io.disconnect()
        }
      },
      { rootMargin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [inView, rootMargin])

  return [ref, inView] as const
}
