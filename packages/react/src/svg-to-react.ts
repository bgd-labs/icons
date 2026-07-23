import { createElement } from 'react'
import type { ReactNode } from 'react'
import { sanitizeSvgRoot } from './sanitize-svg'
import { styleStringToObject, toReactAttributeName } from './svg-attributes'

export interface SvgReactContent {
  node: ReactNode
  viewBox: string
}

function svgNodeToReact(node: ChildNode, key: string): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent
  if (node.nodeType !== Node.ELEMENT_NODE) return null

  const element = node as Element
  const props: Record<string, unknown> = { key }
  for (const attr of Array.from(element.attributes)) {
    const attrName = toReactAttributeName(attr.name)
    props[attrName] =
      attr.name === 'style' ? styleStringToObject(attr.value) : attr.value
  }

  const children = Array.from(element.childNodes)
    .map((child, index) => svgNodeToReact(child, `${key}-${index}`))
    .filter((child) => child !== null)

  return createElement(element.tagName, props, ...children)
}

/**
 * Sanitize an SVG string and convert its children to React nodes in one
 * pass over a single parsed DOM. Returns the converted children and the
 * root's viewBox; the caller renders its own `<svg>` wrapper so it controls
 * sizing and accessibility attributes.
 *
 * Returns null when the input is not a parseable `<svg>` document (or when
 * no DOM is available, e.g. during SSR).
 */
export function svgTextToReact(svgText: string): SvgReactContent | null {
  const root = sanitizeSvgRoot(svgText)
  if (!root) return null
  const viewBox = root.getAttribute('viewBox') ?? '0 0 32 32'
  const node = Array.from(root.childNodes)
    .map((child, index) => svgNodeToReact(child, String(index)))
    .filter((child) => child !== null)
  return { node, viewBox }
}
