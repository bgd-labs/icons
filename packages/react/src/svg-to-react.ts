import { createElement } from 'react'
import type { ReactNode } from 'react'
import { sanitizeSvgRoot } from './sanitize-svg'
import { styleStringToObject, toReactAttributeName } from './svg-attributes'

export interface SvgReactContent {
  node: ReactNode
  viewBox: string
  /**
   * Whether the SVG defines resource ids (clipPaths, gradients, ...). Id
   * lookups for url(#...) are document-global, so converted content with
   * ids is only correct for the ONE instance whose prefix it carries —
   * callers must not share it across mounts (see github-fallback.tsx).
   */
  hasIds: boolean
}

/**
 * Rewrite fragment references to ids defined in this SVG. Handles
 * `url(#x)` anywhere in a value and whole-value `#x` (href / xlink:href).
 * References to ids the SVG does not define are left alone.
 */
function prefixRefs(value: string, ids: Set<string>, prefix: string): string {
  let out = value
  for (const id of ids) {
    const ref = `url(#${id})`
    if (out.includes(ref)) out = out.split(ref).join(`url(#${prefix}${id})`)
  }
  if (out.startsWith('#') && ids.has(out.slice(1))) {
    out = `#${prefix}${out.slice(1)}`
  }
  return out
}

function svgNodeToReact(
  node: ChildNode,
  key: string,
  ids: Set<string>,
  idPrefix: string,
): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent
  if (node.nodeType !== Node.ELEMENT_NODE) return null

  const element = node as Element
  const props: Record<string, unknown> = { key }
  for (const attr of Array.from(element.attributes)) {
    const attrName = toReactAttributeName(attr.name)
    if (attr.name === 'style') {
      const style = styleStringToObject(attr.value)
      if (ids.size > 0) {
        for (const [prop, value] of Object.entries(style)) {
          if (typeof value === 'string' && value.includes('url(#')) {
            style[prop] = prefixRefs(value, ids, idPrefix)
          }
        }
      }
      props[attrName] = style
    } else if (attrName === 'id' && ids.has(attr.value)) {
      props[attrName] = `${idPrefix}${attr.value}`
    } else if (ids.size > 0 && /[#(]/.test(attr.value)) {
      props[attrName] = prefixRefs(attr.value, ids, idPrefix)
    } else {
      props[attrName] = attr.value
    }
  }

  const children = Array.from(element.childNodes)
    .map((child, index) =>
      svgNodeToReact(child, `${key}-${index}`, ids, idPrefix),
    )
    .filter((child) => child !== null)

  return createElement(element.tagName, props, ...children)
}

/**
 * Sanitize an SVG string and convert its children to React nodes in one
 * pass over a single parsed DOM. Returns the converted children and the
 * root's viewBox; the caller renders its own `<svg>` wrapper so it controls
 * sizing and accessibility attributes.
 *
 * `idPrefix` namespaces every id the SVG defines (and the url(#)/href refs
 * to them) so multiple mounted instances of the same SVG don't collide on
 * document-global id lookups. Pass a per-instance prefix (e.g. derived from
 * useId()) when the same SVG text can be mounted more than once.
 *
 * Returns null when the input is not a parseable `<svg>` document (or when
 * no DOM is available, e.g. during SSR).
 */
export function svgTextToReact(
  svgText: string,
  idPrefix = '',
): SvgReactContent | null {
  const root = sanitizeSvgRoot(svgText)
  if (!root) return null
  const viewBox = root.getAttribute('viewBox') ?? '0 0 32 32'
  const ids = new Set<string>()
  for (const el of Array.from(root.querySelectorAll('[id]'))) {
    ids.add(el.id)
  }
  const node = Array.from(root.childNodes)
    .map((child, index) => svgNodeToReact(child, String(index), ids, idPrefix))
    .filter((child) => child !== null)
  return { node, viewBox, hasIds: ids.size > 0 }
}
