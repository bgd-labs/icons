// Hand-written, dependency-free decoder for the compact string tables in
// src/generated/{meta,aliases}.ts. The matching encoder lives in
// scripts/lib/codec.ts and is the single source of truth for the row layout;
// this decoder is deliberately dumb — it never re-derives anything (no
// symbol/chainId alias synthesis), it just splits and reassembles.
//
// Why not ship object literals: a 2k-icon META literal is ~344 kB of JS the
// engine must parse as code at import; the same data as one string + a split
// loop parses far cheaper and keeps the generated module tiny.

import type { IconMeta, IconType } from '../types'
import type { IdentityKey } from './identity'
import { normalizeAlias } from './identity'

// Shared framing characters. FIELD separates fields within a row; ROW
// separates rows within a table. Both are control chars that cannot appear in
// any field value (the encoder throws if they do), so a naive split is safe.
export const FIELD_SEP = '\x1F' // ASCII US (unit separator)
export const ROW_SEP = '\x1E' // ASCII RS (record separator)

// Sentinel for the placeholderColor field meaning "explicitly no placeholder
// colour" (the glyph had no single dominant colour), as distinct from the
// empty field which means "same as brandColor". Needed only when brandColor
// is present: without it, an absent placeholder and a placeholder equal to
// brandColor both encode to empty and both decode to brandColor, so the
// "no dominant colour" state is lost whenever a brandColor exists. A control
// char no real colour value contains (same guarantee as the separators).
export const PLACEHOLDER_ABSENT = '\x00'

// --- META ---
//
// Each row is the fixed field order: id, name, brandColor, placeholderColor,
// symbol, chainId. An empty placeholderColor field means "same as brandColor";
// the PLACEHOLDER_ABSENT sentinel means "no placeholder colour at all".
// Trailing empty fields may be omitted, so a row can be shorter than 6 fields.

export function decodeMeta(
  encoded: Record<IconType, string>,
): Record<IdentityKey, IconMeta> {
  const out: Record<IdentityKey, IconMeta> = {}
  for (const type of Object.keys(encoded) as IconType[]) {
    const table = encoded[type]
    if (table === '') continue
    for (const row of table.split(ROW_SEP)) {
      const f = row.split(FIELD_SEP)
      const id = f[0]
      const name = f[1]
      const brandColor = f[2] ?? ''
      const placeholderRaw = f[3] ?? ''
      const symbol = f[4] ?? ''
      const chainId = f[5] ?? ''

      // Empty field -> equals brandColor (redundancy trimmed on the wire).
      // The PLACEHOLDER_ABSENT sentinel -> genuinely no placeholder colour
      // (decodes to unset, `''` below), which the empty field can't express
      // when brandColor is present.
      const placeholderColor =
        placeholderRaw === PLACEHOLDER_ABSENT
          ? ''
          : placeholderRaw === ''
            ? brandColor
            : placeholderRaw

      const meta: IconMeta = { id, name, type }
      if (brandColor !== '') meta.brandColor = brandColor
      if (placeholderColor !== '') meta.placeholderColor = placeholderColor
      if (symbol !== '') meta.symbol = symbol
      if (chainId !== '') meta.chainId = Number(chainId)

      out[`${type}:${id}`] = meta
    }
  }
  return out
}

// --- ALIASES ---
//
// Each row is `id\x1Falias1\x1Falias2...`. The id's own normalized self-key is
// NOT stored (the decoder always re-adds `normalizeAlias(id) -> id`); every
// other key present in the generate-time typed map is stored verbatim so the
// decode reproduces the exact same final map.

export function decodeAliases(
  encoded: Record<IconType, string>,
): Record<IconType, Record<string, string>> {
  const out: Record<IconType, Record<string, string>> = {
    token: {},
    chain: {},
    brand: {},
  }
  for (const type of Object.keys(encoded) as IconType[]) {
    const table = encoded[type]
    const map = out[type]
    if (table === '') continue
    for (const row of table.split(ROW_SEP)) {
      const f = row.split(FIELD_SEP)
      const id = f[0]
      // Guard the re-derived self-key like buildIdentityIndexes guards
      // authored keys: an id whose normalized form is empty (e.g. an id
      // that is entirely a date suffix) must not register "" as an alias —
      // every garbage input normalizes to "" and would resolve to it.
      const idKey = normalizeAlias(id)
      if (idKey !== '') map[idKey] = id
      for (let i = 1; i < f.length; i++) {
        map[f[i]] = id
      }
    }
  }
  return out
}
