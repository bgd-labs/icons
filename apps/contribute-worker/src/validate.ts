// The submit endpoint's asset pipeline. Mirrors `pnpm validate`'s per-file
// flow (scripts/lib/validate-svg.ts) minus the jsdom-only sanitizer-parity
// gate — a Worker has no DOM. The PR it opens runs the FULL pipeline in CI,
// so nothing this endpoint misses can slip through: worst case is a PR whose
// CI fails, exactly like a hand-written one.
//
// The checks and transforms are the repo's own pure modules, so the bytes
// committed here are byte-for-byte what `pnpm validate` would produce locally
// (SVGO with the same prefix scheme, same mono-color fixes, same background
// dropping).
import {
  dropFullCanvasBackgrounds,
  findHardcodedMonoColors,
  replaceColorsWithCurrentColor,
} from '../../../scripts/lib/mono-colors.ts'
import {
  checkIdsPrefixed,
  checkNoEmbeddedContent,
  checkViewBox,
} from '../../../scripts/lib/svg-checks.ts'
import type { SvgFileResult } from '../../../scripts/lib/svg-checks.ts'
import { optimizeSvg } from '../../../scripts/svg-optimizer.ts'
import type { ContributePayload } from './payload.ts'

export interface ContributionFiles {
  fullSvg: string
  monoSvg: string
  metadataJson: string
  changeset: string
}

export interface Contribution {
  files?: ContributionFiles
  /** Human-readable auto-fix notes, surfaced in the PR body. */
  fixes: string[]
  errors: string[]
}

function processSvg(
  svg: string,
  prefix: string,
  isMono: boolean,
  fixes: string[],
  r: SvgFileResult,
): string {
  const label = `${prefix}.svg`
  checkNoEmbeddedContent(svg, label, r)
  checkViewBox(svg, label, r)
  if (r.errors.length > 0) return svg

  let content: string
  try {
    content = optimizeSvg(svg, prefix)
  } catch (e) {
    r.errors.push({
      file: label,
      message: `SVGO optimization failed: ${e instanceof Error ? e.message : String(e)}`,
    })
    return svg
  }
  checkIdsPrefixed(content, prefix, label, r)

  const withoutBackground = dropFullCanvasBackgrounds(content)
  if (withoutBackground !== content) {
    fixes.push(`dropped full-canvas background shape in ${label}`)
    content = withoutBackground
  }

  if (isMono) {
    const hardcoded = findHardcodedMonoColors(content)
    if (hardcoded.length > 0) {
      fixes.push(
        `replaced ${hardcoded.length} hardcoded color(s) with currentColor in ${label}`,
      )
      content = replaceColorsWithCurrentColor(content)
    }
    if (!content.includes('currentColor')) {
      r.errors.push({
        file: label,
        message: 'Mono SVG does not use currentColor',
      })
    }
  }

  return content
}

// Prettier formats short arrays inline ("aliases": ["a", "b"]) and long ones
// one-per-line. The PR's files must be prettier-clean or CI's format:check
// fails on them, so replicate the 80-column rule for the one variable-length
// field instead of shipping raw JSON.stringify output.
export function formatJsonPrettier(obj: Record<string, unknown>): string {
  const wide = JSON.stringify(obj, null, 2)
  return wide.replace(
    /"([^"]+)": \[\n((?:\s+"[^"]*",?\n)+)\s+\]/g,
    (match, key: string, inner: string) => {
      const items = [...inner.matchAll(/"([^"]*)"/g)].map((m) => `"${m[1]}"`)
      const inline = `"${key}": [${items.join(', ')}]`
      // 2-space indent for a top-level key, 80-column print width.
      return 2 + inline.length <= 80 ? inline : match
    },
  )
}

// Field order mirrors existing assets (see e.g. assets/tokens/usdc.json).
export function formatMetadataJson(p: ContributePayload): string {
  const obj: Record<string, unknown> = {}
  if (p.type === 'token' && p.symbol) obj.symbol = p.symbol
  obj.name = p.name
  if (p.type === 'chain' && p.chainId !== undefined) obj.chainId = p.chainId
  if (p.brandColor) obj.brandColor = p.brandColor
  if (p.aliases.length > 0) obj.aliases = p.aliases
  return formatJsonPrettier(obj) + '\n'
}

export function formatChangeset(p: ContributePayload): string {
  const summary =
    p.type === 'token'
      ? `Add ${p.name} (${p.symbol}) token icon.`
      : `Add ${p.name} ${p.type} icon.`
  // New icons are catalogue additions, not API changes — release as patch.
  return `---\n'@bgd-labs/icons': patch\n'@bgd-labs/icons-react': patch\n---\n\n${summary}\n`
}

export function buildContribution(p: ContributePayload): Contribution {
  const fixes: string[] = []
  const errors: string[] = []

  // Separate result objects so one bad SVG doesn't hide the other's errors.
  const rFull: SvgFileResult = { errors: [], warnings: [] }
  const rMono: SvgFileResult = { errors: [], warnings: [] }

  const fullSvg = processSvg(p.fullSvg, `${p.id}_full`, false, fixes, rFull)
  const monoSvg = processSvg(p.monoSvg, `${p.id}_mono`, true, fixes, rMono)

  for (const e of [...rFull.errors, ...rMono.errors]) {
    errors.push(`${e.file}: ${e.message}`)
  }
  if (errors.length > 0) return { fixes, errors }

  return {
    files: {
      fullSvg,
      monoSvg,
      metadataJson: formatMetadataJson(p),
      changeset: formatChangeset(p),
    },
    fixes,
    errors,
  }
}
