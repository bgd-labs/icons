import { lazy, Suspense } from 'react'
import Gallery from './Gallery'
import { useRoute } from './router'

const Contribute = lazy(() => import('./Contribute'))
const Docs = lazy(() => import('./Docs'))
const IconDetail = lazy(() => import('./IconDetail'))

export default function App() {
  const route = useRoute()

  return (
    <Suspense
      fallback={
        <main className="p-8" role="status">
          Loading…
        </main>
      }
    >
      <RouteContent route={route} />
    </Suspense>
  )
}

function RouteContent({ route }: { route: ReturnType<typeof useRoute> }) {
  switch (route.name) {
    case 'icon':
      return <IconDetail type={route.type} id={route.id} />
    case 'docs':
      return <Docs />
    case 'contribute':
      return <Contribute />
    default:
      return <Gallery />
  }
}
