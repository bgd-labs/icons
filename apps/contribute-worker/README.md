# Contribute worker

The submit endpoint behind the showcase's
[contribute page](https://icons.bgdlabs.com/#/contribute). A Cloudflare
Worker that receives an icon payload, re-validates it with the repo's own
pipeline, and opens a pull request on `bgd-labs/icons` via a GitHub App.

```
browser ──payload + Turnstile token──▶ this Worker
                                        1. verify Turnstile        (spam gate)
                                        2. validate payload + SVGs (scripts/lib,
                                           same bytes `pnpm validate` produces)
                                        3. mint GitHub App installation token
                                        4. branch + commit 4 files + open PR
```

Trust model: Turnstile filters bots, the App is scoped to Contents:RW +
Pull requests:RW on this one repo (stolen key ⇒ only junk branches/PRs), CI
runs the full `pnpm validate` on every opened PR, and a maintainer's review
gates the merge.

Files committed per contribution: `assets/<type>s/<id>_full.svg`,
`assets/<type>s/<id>_mono.svg`, `assets/<type>s/<id>.json`, and a
`.changeset/contribute-<type>-<id>.md` (patch bump for both packages —
new icons are catalogue additions, not API changes).

## One-time setup (~15 min, all browser + 4 CLI commands)

### 1. GitHub App (holds the write credentials)

1. <https://github.com/organizations/bgd-labs/settings/apps/new> (org-level —
   a user-level App works too if installed on the repo):
   - Name: `icons-contribute`
   - Homepage URL: `https://icons.bgdlabs.com/`
   - Webhook: **uncheck "Active"**
   - Repository permissions: **Contents: Read & write**,
     **Pull requests: Read & write**
   - Only on this account → Create
2. On the App page: note the **App ID**, then **Generate a private key**
   (downloads a `.pem`).
3. **Install App** → install on `bgd-labs/icons`. The browser URL after
   installing ends in `/installations/<INSTALLATION_ID>` — note that number.

### 2. Cloudflare

1. Create an account → **Workers & Pages** → the account ID is on the
   overview page's right sidebar.
2. **Turnstile** → Add site: hostname `icons.bgdlabs.com` (and `localhost`
   for dev), widget mode "Managed". Note the **site key** (public) and
   **secret key**.
3. **My Profile → API Tokens** → Create Token → template
   "Edit Cloudflare Workers" → note the token.

### 3. Worker secrets

From `apps/contribute-worker/`:

```bash
pnpm install
pnpm wrangler secret put GITHUB_APP_ID             # App ID from step 1
pnpm wrangler secret put GITHUB_APP_PRIVATE_KEY    # paste the .pem contents
pnpm wrangler secret put GITHUB_APP_INSTALLATION_ID
pnpm wrangler secret put TURNSTILE_SECRET_KEY      # Turnstile SECRET key
```

Then `pnpm run deploy` (or let the `Deploy contribute worker` GitHub workflow
do it — see step 4).

### 4. GitHub repo configuration

On `bgd-labs/icons` → Settings:

- **Secrets and variables → Actions → Secrets**:
  `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (for the deploy workflow)
- **Secrets and variables → Actions → Variables**:
  `CONTRIBUTE_SUBMIT_ENDPOINT` = the Worker's URL
  (e.g. `https://bgd-icons-contribute.<account-subdomain>.workers.dev`),
  `TURNSTILE_SITE_KEY` = the Turnstile **site** key

Re-run the `Deploy showcase` workflow afterwards so the site picks up the
variables.

## Local dev

```bash
pnpm --filter @bgd-labs/icons-contribute-worker dev   # wrangler dev
```

Without secrets, the Worker still runs: Turnstile verification is skipped when
`TURNSTILE_SECRET_KEY` is unset, but GitHub calls need the App secrets —
create `apps/contribute-worker/.dev.vars` (gitignored by wrangler convention)
with the four values from step 3.

Showcase side: `VITE_SUBMIT_ENDPOINT=http://localhost:8787 pnpm dev` in
`apps/showcase/`.

## Tests

Covered by the repo-wide `pnpm test` (vitest project `apps/*`): payload
parsing, the SVG pipeline (SVGO prefixing, mono-color auto-fix, viewBox /
forbidden-content / href rules), and prettier-compatible metadata formatting.

## Notes

- `wrangler.toml` `[vars]` holds non-secret config: target repo and the CORS
  allowlist (`ALLOWED_ORIGINS`).
- The Worker reuses `scripts/lib/mono-colors.ts`, `scripts/lib/svg-checks.ts`,
  and `scripts/svg-optimizer.ts` directly — no duplicated validation logic.
  Changes to those files trigger a redeploy (see the workflow's `paths`).
- The runtime sanitizer-parity check (jsdom) intentionally does not run here;
  it's part of the full `pnpm validate` that CI executes on the opened PR.
