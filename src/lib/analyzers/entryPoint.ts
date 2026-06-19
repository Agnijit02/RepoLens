import * as fs from 'fs'
import * as path from 'path'
import type { RepositoryIndex, EntryPointResult, EntryPointSignal } from '../types'

/**
 * Detect the repository entry point using priority-ordered heuristics.
 * All analysis is performed on the pre-built RepositoryIndex — no I/O beyond reading the entry file preview.
 */
export function analyzeEntryPoint(index: RepositoryIndex): EntryPointResult {
  const { localPath } = index.metadata
  const pkg = index.configFiles.packageJson
  const signals: EntryPointSignal[] = []
  const votes = new Map<string, number>()

  function vote(file: string, signal: EntryPointSignal) {
    signals.push(signal)
    votes.set(file, (votes.get(file) ?? 0) + 1)
  }

  function exists(absPath: string): boolean {
    return index.allFiles.some(f => f.absolutePath === absPath)
  }

  // ── Priority 1: package.json "main" field ────────────────────────────────
  if (pkg?.main) {
    const resolved = path.resolve(localPath, pkg.main)
    if (exists(resolved)) {
      vote(resolved, {
        name: 'package.json "main"',
        description: `"main": "${pkg.main}"`,
        file: resolved,
      })
    }
  }

  // ── Priority 2: package.json "module" field ──────────────────────────────
  if (pkg?.module) {
    const resolved = path.resolve(localPath, pkg.module)
    if (exists(resolved)) {
      vote(resolved, {
        name: 'package.json "module"',
        description: `"module": "${pkg.module}"`,
        file: resolved,
      })
    }
  }

  // ── Priority 3: scripts.start / scripts.dev command ──────────────────────
  for (const key of ['start', 'dev', 'serve']) {
    const cmd = pkg?.scripts?.[key]
    if (!cmd) continue
    const fileMatch = cmd.match(/(?:node|ts-node|tsx?)\s+([\w./\\-]+\.[jt]sx?)/)
    if (fileMatch) {
      const resolved = path.resolve(localPath, fileMatch[1])
      if (exists(resolved)) {
        vote(resolved, {
          name: `scripts.${key}`,
          description: `"${key}": "${cmd}"`,
          file: resolved,
        })
      }
    }
  }

  // ── Priority 4: Build tool config input field ─────────────────────────────
  const buildConfigs = ['vite.config.ts', 'vite.config.js', 'webpack.config.js',
    'webpack.config.ts', 'rollup.config.js', 'rollup.config.ts']
  for (const cfgName of buildConfigs) {
    const cfgFile = index.allFiles.find(f => path.basename(f.path) === cfgName)
    if (!cfgFile) continue
    try {
      const content = fs.readFileSync(cfgFile.absolutePath, 'utf-8')
      const inputMatch = content.match(/input\s*:\s*['"]([^'"]+)['"]/)
      if (inputMatch) {
        const resolved = path.resolve(localPath, inputMatch[1])
        if (exists(resolved)) {
          vote(resolved, {
            name: `${cfgName} input`,
            description: `input: "${inputMatch[1]}"`,
            file: resolved,
          })
        }
      }
    } catch { /* noop */ }
  }

  // ── Priority 5: Conventional filenames ────────────────────────────────────
  const CONVENTIONAL: Array<[string, string]> = [
    ['index.ts',    'TypeScript entry (root)'],
    ['index.tsx',   'React TSX entry (root)'],
    ['index.js',    'JavaScript entry (root)'],
    ['main.ts',     'Main TypeScript file'],
    ['main.tsx',    'Main React TSX file'],
    ['main.py',     'Python main module'],
    ['app.py',      'Python application entry'],
    ['main.go',     'Go main package'],
    ['main.rs',     'Rust main file'],
    ['Program.cs',  'C# program entry'],
    ['server.ts',   'TypeScript server'],
    ['server.js',   'JavaScript server'],
  ]
  for (const [name, desc] of CONVENTIONAL) {
    const found = index.allFiles.find(
      f => path.basename(f.absolutePath) === name &&
        (f.path === name || f.path.startsWith('src/') || f.path.startsWith('app/'))
    )
    if (found) {
      vote(found.absolutePath, {
        name: `Conventional: ${name}`,
        description: desc,
        file: found.absolutePath,
      })
    }
  }

  // ── Priority 6: Dockerfile CMD / ENTRYPOINT ───────────────────────────────
  if (index.configFiles.dockerfile) {
    const m = index.configFiles.dockerfile.match(
      /(?:CMD|ENTRYPOINT)\s+\["?(?:node|python|go run)"?,?\s*"?([^"'\]]+)"?\]/
    )
    if (m) {
      const resolved = path.resolve(localPath, m[1])
      if (exists(resolved)) {
        vote(resolved, {
          name: 'Dockerfile CMD/ENTRYPOINT',
          description: m[0].trim(),
          file: resolved,
        })
      }
    }
  }

  // ── Priority 7: Highest in-degree (most imported file) ────────────────────
  let maxIn = 0
  let mostImported = ''
  for (const [file, importers] of Object.entries(index.importedBy)) {
    if (importers.length > maxIn) { maxIn = importers.length; mostImported = file }
  }
  if (mostImported && maxIn >= 3) {
    vote(mostImported, {
      name: 'Import centrality',
      description: `Imported by ${maxIn} other files`,
      file: mostImported,
    })
  }

  // ── Determine primary file and confidence ─────────────────────────────────
  let primaryFile = index.entryPointCandidates[0] ?? ''
  let maxVotes = 0
  for (const [file, v] of votes.entries()) {
    if (v > maxVotes) { maxVotes = v; primaryFile = file }
  }

  const confidence: EntryPointResult['confidence'] =
    maxVotes >= 3 ? 'high' : maxVotes >= 2 ? 'medium' : 'low'

  // Read file preview (first 60 lines)
  let preview: string | undefined
  if (primaryFile) {
    try {
      const content = fs.readFileSync(primaryFile, 'utf-8')
      preview = content.split('\n').slice(0, 60).join('\n')
    } catch { /* noop */ }
  }

  const allCandidates = [...new Set([...votes.keys(), ...index.entryPointCandidates])]
  const alternates = allCandidates.filter(c => c !== primaryFile).slice(0, 5)

  return { primaryFile, confidence, signalsFired: signals, alternates, preview }
}
