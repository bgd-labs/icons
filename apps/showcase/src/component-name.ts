// PascalCase React component name for an asset id — mirrors
// `createComponentName` in scripts/svg-to-jsx.ts, which is what codegen uses to
// name the per-icon components (e.g. "1inch" -> "OneInchIcon", "usdt0" ->
// "UsdtZeroIcon"). Kept dependency-free (no `to-words`) to match the zero-dep
// spirit of the packages; the number range below covers every realistic id.
//
// SOURCE OF TRUTH: scripts/svg-to-jsx.ts. If the generator's naming changes,
// change it here too — fixtures/consumer and the Usage snippet depend on it.

const ONES = [
  'Zero',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
]
const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
]

// Title-cased words concatenated (to-words emits "Twenty One"; codegen strips
// the spaces, so we skip straight to "TwentyOne"). US style, no "and".
function numToWords(n: number): string {
  if (n < 20) return ONES[n]
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ONES[n % 10] : '')
  if (n < 1_000)
    return (
      ONES[Math.floor(n / 100)] +
      'Hundred' +
      (n % 100 ? numToWords(n % 100) : '')
    )
  if (n < 1_000_000)
    return (
      numToWords(Math.floor(n / 1_000)) +
      'Thousand' +
      (n % 1_000 ? numToWords(n % 1_000) : '')
    )
  return (
    numToWords(Math.floor(n / 1_000_000)) +
    'Million' +
    (n % 1_000_000 ? numToWords(n % 1_000_000) : '')
  )
}

/** The exported component name for an asset id, e.g. `OneInchIcon`. */
export function componentName(id: string, suffix = 'Icon'): string {
  const normalized = id
    .replace(/[^a-zA-Z0-9]/g, '')
    .split(/(\d+)/)
    .map((part) =>
      /^\d+$/.test(part)
        ? numToWords(parseInt(part, 10))
        : part
          ? part[0].toUpperCase() + part.slice(1)
          : '',
    )
    .join('')
  return normalized + suffix
}
