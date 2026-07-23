// GitHub App auth + PR creation over the REST API — zero dependencies.
// The Worker's only credential is the App's private key (a wrangler secret);
// everything else is short-lived installation tokens minted per request.
//
// Blast radius by design: the App is scoped to Contents:RW + Pull requests:RW
// on ONE repository, so a stolen key can only push branches and open PRs on
// bgd-labs/icons — the same things a maintainer reviews before merge.

export class GitHubError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'GitHubError'
    this.status = status
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function pemToDer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/\\n/g, '\n') // secrets pasted with literal \n
    .replace(/-----[^-]+-----/g, '')
    .replace(/\s+/g, '')
  const bin = atob(body)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

// RS256 JWT for GitHub App authentication (10 min expiry, per docs).
export async function createAppJwt(
  appId: string,
  privateKeyPem: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const enc = new TextEncoder()
  const header = b64url(
    enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })),
  )
  const payload = b64url(
    enc.encode(
      JSON.stringify({ iat: now - 60, exp: now + 9 * 60, iss: appId }),
    ),
  )
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(privateKeyPem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    enc.encode(`${header}.${payload}`),
  )
  return `${header}.${payload}.${b64url(sig)}`
}

async function gh<T>(
  token: string,
  method: string,
  path: string,
  body?: unknown,
  allow404 = false,
): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28',
      'user-agent': 'bgd-icons-contribute-worker',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (allow404 && res.status === 404) return undefined as T
  if (!res.ok) {
    const text = await res.text()
    throw new GitHubError(
      `GitHub ${method} ${path} → ${res.status}: ${text.slice(0, 300)}`,
      res.status,
    )
  }
  return (await res.json()) as T
}

export async function getInstallationToken(
  appJwt: string,
  installationId: string,
): Promise<string> {
  const json = await gh<{ token: string }>(
    appJwt,
    'POST',
    `/app/installations/${installationId}/access_tokens`,
  )
  return json.token
}

export interface PrFile {
  path: string
  content: string
}

export interface PrInput {
  owner: string
  repo: string
  branch: string
  title: string
  body: string
  files: PrFile[]
  /** Paths that must NOT already exist on main (id-collision check). */
  conflictPaths: string[]
}

// Creates branch → tree → commit → ref → PR in one go. Throws ConflictError
// for "already exists / already pending" situations (mapped to 409 by the
// caller) and GitHubError for everything else.
export async function openPr(input: PrInput, token: string): Promise<string> {
  const { owner, repo } = input

  for (const p of input.conflictPaths) {
    const existing = await gh<unknown>(
      token,
      'GET',
      `/repos/${owner}/${repo}/contents/${p}?ref=main`,
      undefined,
      true,
    )
    if (existing !== undefined) {
      throw new ConflictError(
        `An icon with this id already exists (${p}) — suggest an update in a regular issue instead`,
      )
    }
  }

  const ref = await gh<{ object: { sha: string } }>(
    token,
    'GET',
    `/repos/${owner}/${repo}/git/ref/heads/main`,
  )
  const baseSha = ref.object.sha
  const baseCommit = await gh<{ tree: { sha: string } }>(
    token,
    'GET',
    `/repos/${owner}/${repo}/git/commits/${baseSha}`,
  )

  const treeEntries = await Promise.all(
    input.files.map(async (f) => {
      const blob = await gh<{ sha: string }>(
        token,
        'POST',
        `/repos/${owner}/${repo}/git/blobs`,
        { content: f.content, encoding: 'utf-8' },
      )
      return {
        path: f.path,
        mode: '100644' as const,
        type: 'blob' as const,
        sha: blob.sha,
      }
    }),
  )

  const tree = await gh<{ sha: string }>(
    token,
    'POST',
    `/repos/${owner}/${repo}/git/trees`,
    { base_tree: baseCommit.tree.sha, tree: treeEntries },
  )
  const commit = await gh<{ sha: string }>(
    token,
    'POST',
    `/repos/${owner}/${repo}/git/commits`,
    { message: input.title, tree: tree.sha, parents: [baseSha] },
  )

  try {
    await gh(token, 'POST', `/repos/${owner}/${repo}/git/refs`, {
      ref: `refs/heads/${input.branch}`,
      sha: commit.sha,
    })
  } catch (e) {
    if (e instanceof GitHubError && e.status === 422) {
      throw new ConflictError(
        'A contribution for this id is already pending review',
      )
    }
    throw e
  }

  const pr = await gh<{ html_url: string }>(
    token,
    'POST',
    `/repos/${owner}/${repo}/pulls`,
    {
      title: input.title,
      head: input.branch,
      base: 'main',
      body: input.body,
      maintainer_can_modify: true,
    },
  )
  return pr.html_url
}
