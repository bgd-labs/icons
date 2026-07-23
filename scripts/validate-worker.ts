// Worker entry for the validate.ts pool. One jsdom/DOMPurify environment is
// set up ONCE per worker (setupSvgEnv), then a shard of SVG file tasks is
// validated. In mutate mode each worker writes its own files — shards are
// disjoint by file path, so concurrent writes never touch the same file.
//
// Runs under tsx via `execArgv: ['--import', 'tsx']` (see validate.ts), so this
// .ts file executes directly in the worker with no precompile step.

import { parentPort, workerData } from 'node:worker_threads'
import {
  setupSvgEnv,
  validateSvgFile,
  type SvgFileResult,
  type SvgFileTask,
} from './lib/validate-svg.ts'

interface WorkerData {
  tasks: SvgFileTask[]
  mutate: boolean
}

const { tasks, mutate } = workerData as WorkerData

setupSvgEnv()

const results: SvgFileResult[] = tasks.map((task) =>
  validateSvgFile(task, mutate),
)

// Flatten to two arrays so the parent can concat cheaply; file attribution is
// preserved on every record.
const errors = results.flatMap((res) => res.errors)
const warnings = results.flatMap((res) => res.warnings)

parentPort!.postMessage({ errors, warnings })
