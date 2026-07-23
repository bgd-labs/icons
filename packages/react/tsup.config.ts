import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.tsx',
    tokens: 'src/generated/tokens/index.ts',
    chains: 'src/generated/chains/index.ts',
    brands: 'src/generated/brands/index.ts',
    frames: 'src/frames.ts',
    compat: 'src/compat.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  // "use client" is scoped to the stateful entries (index, compat) as a
  // post-build step — see scripts/use-client.mjs for why it isn't a banner.
  onSuccess: 'node scripts/use-client.mjs',
})
