import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// On GitHub Pages the site is served from a sub-path (`/<repo>/`), so the
// deploy workflow sets BASE_PATH=/icons/. Locally it defaults to '/'.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
})
