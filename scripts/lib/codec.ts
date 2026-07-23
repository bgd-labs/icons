// Generate-time encoder for the compact META / aliases string tables. The
// matching decoder is packages/core/src/internal/codec.ts; this module owns
// the row layout (the single source of truth) and the decoder is deliberately
// dumb. Both are dependency-free.

import {
  FIELD_SEP,
  ROW_SEP,
  PLACEHOLDER_ABSENT,
} from '../../packages/core/src/internal/codec'
import { normalizeAlias } from '../../packages/core/src/internal/identity'
import type { IconType } from '../../packages/core/src/types'

// A field value can never contain the framing characters, or a naive split in
// the decoder would corrupt the row. Names with spaces/punctuation are fine
// (those bytes aren't the separators); only the two control chars are illegal.
function assertNoSeparators(value: string, context: string): void {
  if (value.includes(FIELD_SEP) || value.includes(ROW_SEP)) {
    throw new Error(
      `Cannot encode ${context}: value contains a reserved separator char (\\x1F or \\x1E): ${JSON.stringify(value)}`,
    )
  }
}

// --- META ---

export interface MetaRowInput {
  id: string
  name: string
  brandColor?: string
  placeholderColor?: string
  symbol?: string
  chainId?: number
}

// Fixed field order: id, name, brandColor, placeholderColor, symbol, chainId.
// placeholderColor is emitted empty when equal to brandColor (trims today's
// redundancy). Trailing empty fields are dropped.
export function encodeMetaTable(rows: MetaRowInput[]): string {
  return rows
    .map((r) => {
      const brandColor = r.brandColor ?? ''
      // Three states, faithfully round-tripped:
      //  - absent AND no brandColor -> '' (decodes to unset; nothing to lose)
      //  - absent WITH a brandColor -> sentinel (else '' would decode to the
      //    brandColor, fabricating a placeholder the glyph doesn't have)
      //  - equal to brandColor      -> '' (decoder restores it; saves a field)
      //  - a distinct value         -> kept verbatim
      const placeholder =
        r.placeholderColor === undefined
          ? brandColor === ''
            ? ''
            : PLACEHOLDER_ABSENT
          : r.placeholderColor === brandColor
            ? ''
            : r.placeholderColor
      const symbol = r.symbol ?? ''
      const chainId = r.chainId !== undefined ? String(r.chainId) : ''

      const fields = [r.id, r.name, brandColor, placeholder, symbol, chainId]
      for (const value of fields) assertNoSeparators(value, `meta:${r.id}`)

      // Drop trailing empties.
      let end = fields.length
      while (end > 0 && fields[end - 1] === '') end--
      return fields.slice(0, end).join(FIELD_SEP)
    })
    .join(ROW_SEP)
}

// --- ALIASES ---

// `typedMap` is the final generate-time map for one type (alias -> id),
// INCLUDING the self-keys and the symbol/chainId-derived keys added by
// buildIdentityIndexes. We group by id, drop each id's own normalized
// self-key (the decoder re-adds it), and emit the remaining keys verbatim so
// the decode reproduces the map exactly without re-deriving anything.
export function encodeAliasTable(typedMap: Record<string, string>): string {
  // Preserve first-seen id order so output is deterministic and stable.
  const byId = new Map<string, string[]>()
  const order: string[] = []
  for (const [alias, id] of Object.entries(typedMap)) {
    if (!byId.has(id)) {
      byId.set(id, [])
      order.push(id)
    }
    if (alias !== normalizeAlias(id)) {
      byId.get(id)!.push(alias)
    }
  }
  return order
    .map((id) => {
      const extras = byId.get(id)!
      const fields = [id, ...extras]
      for (const value of fields) assertNoSeparators(value, `alias:${id}`)
      return fields.join(FIELD_SEP)
    })
    .join(ROW_SEP)
}

export type { IconType }
