// Single source of truth for converting SVG markup attributes into their
// React equivalents. Two adapters sit on this interface: the build pipeline
// (scripts/svg-to-jsx.ts emits JSX strings for generated components) and the
// runtime network fallback (svg-to-react.ts builds React nodes from fetched
// SVGs). Sharing the rule guarantees an icon renders identically whether it
// shipped in the bundle or arrived over the wire.

export function toReactAttributeName(name: string): string {
  if (name === 'class') return 'className'
  if (name === 'tabindex') return 'tabIndex'
  if (name.startsWith('aria-') || name.startsWith('data-')) return name
  return name.replace(/[:-]([a-z])/g, (_, letter: string) =>
    letter.toUpperCase(),
  )
}

export function styleStringToObject(style: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const rule of style.split(';')) {
    const [rawProperty, ...rawValue] = rule.split(':')
    const property = rawProperty?.trim()
    const value = rawValue.join(':').trim()
    if (!property || !value) continue
    // CSS custom properties pass through verbatim — camelising
    // "--brand-color" would mangle it into "-BrandColor".
    const reactProperty = property.startsWith('--')
      ? property
      : property.replace(/-([a-z])/g, (_, letter: string) =>
          letter.toUpperCase(),
        )
    result[reactProperty] = value
  }
  return result
}
