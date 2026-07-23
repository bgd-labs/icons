import { createContext, useContext, useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'

export interface IconContextValue {
  enableFallback?: boolean
  baseUrl?: string
  branch?: string
}

const DEFAULT_BASE_URL = 'https://raw.githubusercontent.com/bgd-labs/icons'
const DEFAULT_BRANCH = 'main'

// The context always holds a fully-resolved value: this default is
// complete and IconProvider always constructs a complete value, so the
// stored shape is Required<IconContextValue>. The public IconContextValue
// (with optionals) stays the provider-props type.
const IconContext = createContext<Required<IconContextValue>>({
  enableFallback: false,
  baseUrl: DEFAULT_BASE_URL,
  branch: DEFAULT_BRANCH,
})

// Tracks whether the implicit-branch warning has fired so we surface it
// once per process, not once per render. Dead-code-eliminated in
// production via the NODE_ENV guard at the call site.
let implicitBranchWarned = false

export function IconProvider({
  children,
  enableFallback = false,
  baseUrl = DEFAULT_BASE_URL,
  branch,
}: IconContextValue & { children: ReactNode }) {
  // The warning is a side effect (console + module-level flag), so it runs
  // in an effect, not the render phase — render must stay pure for
  // StrictMode double-invocation and the React Compiler.
  useEffect(() => {
    if (
      enableFallback &&
      branch === undefined &&
      !implicitBranchWarned &&
      typeof process !== 'undefined' &&
      process.env.NODE_ENV !== 'production'
    ) {
      implicitBranchWarned = true
      console.warn(
        '[bgd-icons] <IconProvider enableFallback /> mounted without an explicit `branch`. ' +
          `Defaulting to "${DEFAULT_BRANCH}" produces version-skewed content at runtime. ` +
          'Pin `branch` to the published tag of @bgd-labs/icons-react that you have installed.',
      )
    }
  }, [enableFallback, branch])
  const value = useMemo(
    () => ({ enableFallback, baseUrl, branch: branch ?? DEFAULT_BRANCH }),
    [enableFallback, baseUrl, branch],
  )

  return <IconContext.Provider value={value}>{children}</IconContext.Provider>
}

export function useIconConfig(): Required<IconContextValue> {
  // The context value is already fully resolved (see IconContext), so this
  // returns it directly — no per-render re-defaulting/allocation.
  return useContext(IconContext)
}
