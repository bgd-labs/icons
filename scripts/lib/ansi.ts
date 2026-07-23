// Shared terminal output helpers for the CLI scripts (generate.ts, stress.ts).

export function dim(s: string) {
  return `\x1b[2m${s}\x1b[22m`
}
export function bold(s: string) {
  return `\x1b[1m${s}\x1b[22m`
}
export function yellow(s: string) {
  return `\x1b[33m${s}\x1b[39m`
}
export function green(s: string) {
  return `\x1b[32m${s}\x1b[39m`
}
export function red(s: string) {
  return `\x1b[31m${s}\x1b[39m`
}
export function cyan(s: string) {
  return `\x1b[36m${s}\x1b[39m`
}

export function padLabel(label: string, width: number) {
  return label.padEnd(width)
}
