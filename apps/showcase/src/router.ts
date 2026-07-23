import { useEffect, useState } from 'react'

/**
 * Hash routing — works on static Pages with no server rewrite, and matches
 * the existing `#/contribute` convention. No router dependency: just parse
 * `location.hash` and re-render on `hashchange`.
 */
export type Route =
  | { name: 'gallery' }
  | { name: 'icon'; type: string; id: string }
  | { name: 'docs' }
  | { name: 'contribute' }

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').split('?')[0]
  const parts = path.split('/').filter(Boolean)

  if (parts[0] === 'icon' && parts[1] && parts[2]) {
    return { name: 'icon', type: parts[1], id: decodeURIComponent(parts[2]) }
  }
  if (parts[0] === 'docs') return { name: 'docs' }
  if (parts[0] === 'contribute') return { name: 'contribute' }
  return { name: 'gallery' }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export function href(route: Route): string {
  switch (route.name) {
    case 'gallery':
      return '#/'
    case 'icon':
      return `#/icon/${route.type}/${encodeURIComponent(route.id)}`
    case 'docs':
      return '#/docs'
    case 'contribute':
      return '#/contribute'
  }
}
