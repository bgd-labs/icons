// The contribute submit endpoint. Receives an icon payload from the showcase
// contribute route, validates and normalizes it through the repo's own
// pipeline, and opens a pull request on bgd-labs/icons via a GitHub App.
//
// Trust model: this Worker is UNTRUSTED input in, reviewed PR out. Turnstile
// filters bots, the payload/asset validation filters malformed input, the
// App's narrow permissions cap the blast radius, CI on the PR runs the full
// `pnpm validate` pipeline, and a maintainer's review gates the merge.
import {
  ConflictError,
  createAppJwt,
  getInstallationToken,
  openPr,
} from './github.ts'
import { parsePayload } from './payload.ts'
import type { ContributePayload } from './payload.ts'
import { verifyTurnstile } from './turnstile.ts'
import { buildContribution } from './validate.ts'

interface Env {
  // wrangler secrets
  GITHUB_APP_ID: string
  GITHUB_APP_PRIVATE_KEY: string
  GITHUB_APP_INSTALLATION_ID: string
  TURNSTILE_SECRET_KEY?: string
  // wrangler.toml [vars]
  REPO_OWNER: string
  REPO_NAME: string
  ALLOWED_ORIGINS: string
}

function json(
  body: Record<string, unknown>,
  status: number,
  cors: Record<string, string> | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...cors },
  })
}

function corsFor(
  env: Env,
  origin: string | null,
): Record<string, string> | null {
  const allowed = env.ALLOWED_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  if (!origin || !allowed.includes(origin)) return null
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin',
  }
}

function prBody(p: ContributePayload, fixes: string[]): string {
  const rows: [string, string][] = [['id', `\`${p.id}\``]]
  if (p.symbol) rows.push(['symbol', p.symbol])
  if (p.chainId !== undefined) rows.push(['chainId', String(p.chainId)])
  if (p.aliases.length > 0) rows.push(['aliases', p.aliases.join(', ')])
  if (p.brandColor) rows.push(['brandColor', `\`${p.brandColor}\``])

  const table = [
    '| field | value |',
    '| --- | --- |',
    ...rows.map(([k, v]) => `| ${k} | ${v} |`),
  ].join('\n')

  const fixesSection = fixes.length
    ? `\nAuto-fixes applied by the submit endpoint:\n${fixes.map((f) => `- ${f}`).join('\n')}\n`
    : ''

  return `## New ${p.type} icon: ${p.name}

${table}
${fixesSection}
Submitted via the [showcase contribute page](https://icons.bgdlabs.com/#/contribute). The contributor confirmed they have the right to contribute the mark and that it is a faithful, official representation (no altered, parody, or unofficial marks).

Maintainer checklist:

- [ ] Artwork matches the official mark (full + mono)
- [ ] Metadata is correct (symbol / chainId / aliases / brandColor)
- [ ] CI passes — it runs the full \`pnpm validate\` pipeline on this PR
`
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsFor(env, request.headers.get('origin'))

    if (request.method === 'OPTIONS') {
      return cors
        ? new Response(null, { status: 204, headers: cors })
        : new Response(null, { status: 403 })
    }
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, cors)
    }
    if (!cors) return json({ error: 'Origin not allowed' }, 403, cors)

    let raw: unknown
    try {
      raw = await request.json()
    } catch {
      return json({ error: 'Invalid JSON body' }, 400, cors)
    }

    const { payload, error } = parsePayload(raw)
    if (!payload) return json({ error }, 400, cors)

    // Turnstile is enforced when configured; unset means local dev.
    if (env.TURNSTILE_SECRET_KEY) {
      const ok = await verifyTurnstile(
        env.TURNSTILE_SECRET_KEY,
        payload.turnstileToken ?? '',
        request.headers.get('cf-connecting-ip'),
      )
      if (!ok) {
        return json(
          { error: 'Human check failed — reload the page and try again' },
          403,
          cors,
        )
      }
    }

    const { files, fixes, errors } = buildContribution(payload)
    if (!files) return json({ error: errors.join('; ') }, 422, cors)

    try {
      const appJwt = await createAppJwt(
        env.GITHUB_APP_ID,
        env.GITHUB_APP_PRIVATE_KEY,
      )
      const token = await getInstallationToken(
        appJwt,
        env.GITHUB_APP_INSTALLATION_ID,
      )
      const dir = `${payload.type}s`
      const prUrl = await openPr(
        {
          owner: env.REPO_OWNER,
          repo: env.REPO_NAME,
          branch: `contribute/${payload.type}-${payload.id}`,
          title: `feat: add ${payload.name} ${payload.type} icon`,
          body: prBody(payload, fixes),
          conflictPaths: [`assets/${dir}/${payload.id}.json`],
          files: [
            {
              path: `assets/${dir}/${payload.id}_full.svg`,
              content: files.fullSvg,
            },
            {
              path: `assets/${dir}/${payload.id}_mono.svg`,
              content: files.monoSvg,
            },
            {
              path: `assets/${dir}/${payload.id}.json`,
              content: files.metadataJson,
            },
            {
              path: `.changeset/contribute-${payload.type}-${payload.id}.md`,
              content: files.changeset,
            },
          ],
        },
        token,
      )
      return json({ prUrl }, 200, cors)
    } catch (e) {
      if (e instanceof ConflictError) {
        return json({ error: e.message }, 409, cors)
      }
      console.error('contribute submit failed', e)
      return json(
        { error: 'Failed to open the PR — please report this on GitHub' },
        502,
        cors,
      )
    }
  },
}
