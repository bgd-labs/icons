// Cloudflare Turnstile verification — the spam gate that keeps bots from
// opening junk PRs. When TURNSTILE_SECRET_KEY is not configured (local dev),
// index.ts skips verification entirely.

interface SiteVerifyResponse {
  success?: boolean
  'error-codes'?: string[]
}

export async function verifyTurnstile(
  secret: string,
  token: string,
  remoteIp: string | null,
): Promise<boolean> {
  if (!token) return false
  const body = new URLSearchParams({ secret, response: token })
  if (remoteIp) body.set('remoteip', remoteIp)
  try {
    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
      },
    )
    if (!res.ok) return false
    const json = (await res.json()) as SiteVerifyResponse
    return json.success === true
  } catch {
    return false
  }
}
