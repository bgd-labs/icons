// Prepend "use client" to the stateful entries only. The generated icon
// entries (tokens/chains/brands) and frames are pure components, so they
// stay directive-free and RSC apps can render them on the server with zero
// hydration cost. Done as a post-build step because tsup's banner option
// applies to every output of a build, and splitting into two builds would
// duplicate the icon chunks shared between the tokens entry and the lazy
// shards. Cost: sourcemap lines for these four files shift by one.
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

const DIRECTIVE = '"use client";\n'
const CLIENT_ENTRIES = [
  'dist/index.js',
  'dist/index.cjs',
  'dist/compat.js',
  'dist/compat.cjs',
]

for (const entry of CLIENT_ENTRIES) {
  const file = resolve(process.cwd(), entry)
  const src = readFileSync(file, 'utf8')
  if (!src.startsWith(DIRECTIVE)) {
    writeFileSync(file, DIRECTIVE + src)
  }
}
