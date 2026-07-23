// Single source of truth for "the dominant colour of an SVG". Two callers:
// generate.ts derives placeholderColor at build time, and the showcase's
// contribute route suggests a brandColor for pasted SVGs. One algorithm so
// the two cannot drift: attribute-scoped extraction (each painted colour
// counts once), skip-list for whites/blacks/greys, luminance gate,
// frequency-first with a midtone tie-break. Returns undefined when nothing
// survives the filters — callers decide what a missing colour means; this
// module never fabricates one.

const SKIP_COLORS = new Set([
  '#ffffff',
  '#000000',
  '#fff',
  '#000',
  '#f5f5f5',
  '#fafafa',
  '#e5e5e5',
  '#d3d3d3',
  '#808080',
  '#696969',
  '#dcdcdc',
  '#c0c0c0',
])

export function extractColorsFromSvg(svgContent: string): string[] {
  const colors: string[] = []
  // Exactly 3 or 6 hex digits with a boundary guard: a sloppier {3,6}
  // quantifier would mis-capture #RGBA as 4 digits and silently truncate
  // #RRGGBBAA to its first 6.
  const HEX = '#(?:[0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})(?![0-9A-Fa-f])'
  const patterns = [
    new RegExp(`fill="(${HEX})"`, 'g'),
    new RegExp(`stroke="(${HEX})"`, 'g'),
    new RegExp(`stop-color="(${HEX})"`, 'g'),
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(svgContent)) !== null) {
      let color = match[1]
      if (color.length === 4) {
        color =
          '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3]
      }
      colors.push(color.toLowerCase())
    }
  }
  return colors
}

export function colorLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const sRGB = [r, g, b].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
  )
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2]
}

export function dominantColor(svgContent: string): string | undefined {
  const counts = new Map<string, number>()
  for (const c of extractColorsFromSvg(svgContent)) {
    if (!SKIP_COLORS.has(c)) counts.set(c, (counts.get(c) || 0) + 1)
  }

  const candidates = Array.from(counts, ([hex, freq]) => ({
    hex,
    freq,
    lum: colorLuminance(hex),
  })).filter(({ lum }) => lum >= 0.05 && lum <= 0.9)

  candidates.sort(
    (a, b) => b.freq - a.freq || Math.abs(a.lum - 0.5) - Math.abs(b.lum - 0.5),
  )

  return candidates[0]?.hex
}
