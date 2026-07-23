// Payload shape sent by the showcase contribute route (Contribute.tsx) and
// its structural validation. Everything here is cheap, deterministic string
// checking — the SVG pipeline lives in ./validate.ts, catalogue-level checks
// (alias collisions, cross-type ids) are enforced by `pnpm validate` on the
// opened PR, and the maintainer's review is the final gate.

export type AssetType = 'token' | 'chain' | 'brand'

export interface ContributePayload {
  type: AssetType
  id: string
  name: string
  symbol?: string
  chainId?: number
  aliases: string[]
  brandColor?: string
  fullSvg: string
  monoSvg: string
  turnstileToken?: string
}

const ID_RE = /^[a-z0-9]+$/
const BRAND_COLOR_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i
// Real icons are ~1–5 KB; 128 KB is a generous ceiling that still keeps junk
// payloads out of the GitHub API path.
const MAX_SVG_CHARS = 128 * 1024

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function parseSvg(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  if (value.length === 0 || value.length > MAX_SVG_CHARS) return undefined
  if (!/<svg[\s>]/.test(value)) return undefined
  return value
}

export function parsePayload(raw: unknown): {
  payload?: ContributePayload
  error?: string
} {
  if (typeof raw !== 'object' || raw === null) {
    return { error: 'Body must be a JSON object' }
  }
  const input = raw as Record<string, unknown>

  const type = input.type
  if (type !== 'token' && type !== 'chain' && type !== 'brand') {
    return { error: 'type must be "token", "chain", or "brand"' }
  }

  const id = asOptionalString(input.id)?.toLowerCase()
  if (!id || id.length > 40 || !ID_RE.test(id)) {
    return { error: 'id must be lowercase alphanumeric (^[a-z0-9]+$)' }
  }

  const name = asOptionalString(input.name)
  if (!name || name.length > 100) {
    return { error: 'name is required (max 100 chars)' }
  }

  let symbol: string | undefined
  let chainId: number | undefined
  if (type === 'token') {
    symbol = asOptionalString(input.symbol)
    if (!symbol || symbol.length > 20) {
      return { error: 'symbol is required for tokens (max 20 chars)' }
    }
  }
  if (type === 'chain') {
    chainId =
      typeof input.chainId === 'number'
        ? input.chainId
        : Number(asOptionalString(input.chainId))
    if (!Number.isSafeInteger(chainId) || chainId <= 0) {
      return { error: 'chainId must be a positive integer for chains' }
    }
  }

  let aliases: string[] = []
  if (Array.isArray(input.aliases)) {
    if (input.aliases.length > 10) {
      return { error: 'at most 10 aliases' }
    }
    for (const a of input.aliases) {
      if (typeof a !== 'string' || a.length > 50 || /["\\\n\r]/.test(a)) {
        return { error: 'aliases must be plain strings (max 50 chars)' }
      }
    }
    aliases = input.aliases
      .map((a) => (a as string).trim())
      .filter((a) => a.length > 0)
  }

  const brandColor = asOptionalString(input.brandColor)
  if (brandColor && !BRAND_COLOR_RE.test(brandColor)) {
    return { error: 'brandColor must be #rgb or #rrggbb' }
  }

  const fullSvg = parseSvg(input.fullSvg)
  if (!fullSvg) return { error: 'fullSvg must be an SVG document' }
  const monoSvg = parseSvg(input.monoSvg)
  if (!monoSvg) return { error: 'monoSvg must be an SVG document' }

  return {
    payload: {
      type,
      id,
      name,
      symbol,
      chainId,
      aliases,
      brandColor,
      fullSvg,
      monoSvg,
      turnstileToken: asOptionalString(input.turnstileToken),
    },
  }
}
