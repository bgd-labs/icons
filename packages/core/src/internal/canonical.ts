// Canonicalization rules: the data table that collapses open-ended symbol
// families to a single resolvable key BEFORE the O(1) alias lookup. Each rule
// is data (a pattern + replacement), not logic — adding a new family's shape
// is one entry here, reviewed and shipped in the same release that adds the
// family's base icon. normalizeAlias() applies every rule once, in order, to
// the already-lowercased/alphanumeric form, so a rule never has to reason
// about case or punctuation.
//
// Why a strip rule and not an alias list: maturity-dated tokens (Pendle PTs,
// dated options) reissue with a new symbol on every roll-over — the varying
// part is unbounded, so it cannot be enumerated as aliases. Its SHAPE is
// uniform across every family, though, so one rule covers all of them and
// every future maturity for free. A rule is only safe to add here when the
// varying part is recognisable by shape alone; per-asset structure belongs in
// `variations`/`aliases`, not here.

export interface CanonicalRule {
  name: string
  description: string
  // Matched against the lowercased, alphanumeric-only form (see
  // normalizeAlias). Anchor to the end so a rule only trims, never reshapes
  // the middle of a key.
  pattern: RegExp
  replacement: string
}

export const CANONICAL_RULES: CanonicalRule[] = [
  {
    name: 'maturity-date-suffix',
    description:
      'Trailing maturity date, e.g. PT-USDe-31JUL2025 -> ptusde, ' +
      'aEthPT-eUSDe-14AUG2025 (after frame handling) -> pteusde. The 3-letter ' +
      'month name keeps this from matching arbitrary trailing digits.',
    pattern: /\d{1,2}(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\d{4}$/,
    replacement: '',
  },
]

/**
 * Apply the canonicalization rules to an already-normalized key (lowercase,
 * alphanumeric). O(rules) with a small fixed rule count — the lookup itself
 * stays a single map get, so the resolver's flat-O(1) contract holds.
 */
export function canonicalize(key: string): string {
  for (const rule of CANONICAL_RULES) {
    key = key.replace(rule.pattern, rule.replacement)
  }
  return key
}
