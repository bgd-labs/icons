import Contribute from './Contribute'
import Docs from './Docs'
import Gallery from './Gallery'
import IconDetail from './IconDetail'
import { useRoute } from './router'

export default function App() {
  const route = useRoute()

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
