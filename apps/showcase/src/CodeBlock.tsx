import type { ReactNode } from 'react'
import { CopyButton } from './CopyButton'

/**
 * Dark, horizontally-scrollable code block shared by the docs + detail pages.
 * Pass `copyText` to overlay a copy button in the top-right corner.
 */
export function CodeBlock({
  children,
  copyText,
}: {
  children: string
  copyText?: string
}) {
  return (
    <div className="relative">
      <pre className="bg-gray-900 text-gray-100 text-sm p-4 overflow-x-auto">
        <code>{children}</code>
      </pre>
      {copyText != null && (
        <CopyButton
          text={copyText}
          label="Copy"
          className="absolute top-2 right-2 text-xs font-medium px-2.5 py-1 text-gray-400 border border-white/10 bg-gray-900/80 backdrop-blur-sm hover:text-white hover:border-white/25 transition-[color,border-color,scale] active:scale-[0.96] cursor-pointer"
        />
      )}
    </div>
  )
}

/** Inline monospace token for prose. */
export function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="font-mono text-[0.85em] text-gray-800 bg-gray-100 px-1 py-0.5 rounded">
      {children}
    </code>
  )
}
