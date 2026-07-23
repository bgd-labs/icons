import { defineConfig } from 'vitest/config'

// Vitest 4 removed workspace-file support (vitest.workspace.ts is silently
// ignored) — projects are declared here instead. DOM tests opt into jsdom
// per file via `// @vitest-environment jsdom`.
export default defineConfig({
  test: {
    projects: ['packages/*', 'apps/*'],
  },
})
