import { useState, type ComponentPropsWithoutRef } from 'react'

interface CopyButtonProps extends ComponentPropsWithoutRef<'button'> {
  /** Text written to the clipboard on click. */
  text: string
  /** Idle label. */
  label?: string
  /** Label shown briefly after a successful copy. */
  copiedLabel?: string
}

/**
 * Copies `text` to the clipboard and flips its label to `copiedLabel` for
 * ~1.2s. Unstyled on purpose — pass className/style to skin it.
 *
 * The two labels are stacked in a single grid cell so the button sizes to the
 * wider of them and never reflows its neighbours when the text swaps; they
 * cross-fade (opacity + a hair of scale/blur) rather than hard-cut.
 */
export function CopyButton({
  text,
  label = 'Copy',
  copiedLabel = 'Copied',
  ...rest
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const onClick = () => {
    if (!text) return
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    })
  }

  return (
    <button type="button" onClick={onClick} disabled={!text} {...rest}>
      <span className="grid [grid-template-areas:'stack'] place-items-center">
        <span
          aria-hidden={copied}
          className="[grid-area:stack] transition-[opacity,scale,filter] duration-200 ease-out"
          style={
            copied
              ? { opacity: 0, scale: '0.9', filter: 'blur(2px)' }
              : undefined
          }
        >
          {label}
        </span>
        <span
          aria-hidden={!copied}
          className="[grid-area:stack] transition-[opacity,scale,filter] duration-200 ease-out"
          style={
            copied
              ? undefined
              : { opacity: 0, scale: '0.9', filter: 'blur(2px)' }
          }
        >
          {copiedLabel}
        </span>
      </span>
    </button>
  )
}
