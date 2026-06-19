import * as fs from 'fs'
import * as path from 'path'
import type { FileNode } from '../types'

interface ImportGraphResult {
  importGraph: Record<string, string[]>
  importedBy:  Record<string, string[]>
}

/**
 * Build a bidirectional import graph from all source files.
 *
 * importGraph[A] = [B, C]   ← A imports B and C
 * importedBy[B]  = [A]      ← B is imported by A
 */
export function buildImportGraph(
  allFiles: FileNode[],
  rootPath: string
): ImportGraphResult {
  const importGraph: Record<string, string[]> = {}
  const importedBy:  Record<string, string[]> = {}

  // Pre-index all file paths for fast resolution
  const allPaths = new Set(allFiles.map(f => f.absolutePath))

  // Basename → possible absolute paths (handles index.ts etc.)
  const byBasename = new Map<string, string[]>()
  for (const file of allFiles) {
    const base = path.basename(file.path, file.extension)
    if (!byBasename.has(base)) byBasename.set(base, [])
    byBasename.get(base)!.push(file.absolutePath)
  }

  // Initialise empty adjacency lists
  for (const file of allFiles) {
    importGraph[file.absolutePath] = []
    importedBy[file.absolutePath]  = []
  }

  for (const file of allFiles) {
    if (file.size > 500_000) continue   // skip huge generated files

    let content: string
    try {
      content = fs.readFileSync(file.absolutePath, 'utf-8')
    } catch {
      continue
    }

    const imports = resolveImports(content, file.extension, file.absolutePath, allPaths, byBasename)

    importGraph[file.absolutePath] = imports
    for (const imp of imports) {
      if (!importedBy[imp]) importedBy[imp] = []
      importedBy[imp].push(file.absolutePath)
    }
  }

  return { importGraph, importedBy }
}

// ─────────────────────────────────────────────────────────────────────────────
// Language-specific import extraction
// ─────────────────────────────────────────────────────────────────────────────

function resolveImports(
  content: string,
  ext: string,
  filePath: string,
  allPaths: Set<string>,
  byBasename: Map<string, string[]>
): string[] {
  const dir = path.dirname(filePath)
  const resolved: string[] = []

  if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext)) {
    // ES module import / dynamic import / require
    const patterns = [
      /(?:^|;|\n)\s*(?:import|export)\s+.*?from\s+['"]([^'"]+)['"]/gm,
      /(?:^|;|\n)\s*(?:const|let|var)\s+\w+\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/gm,
      /import\s*\(\s*['"]([^'"]+)['"]\s*\)/gm,
    ]
    for (const regex of patterns) {
      let match: RegExpExecArray | null
      regex.lastIndex = 0
      while ((match = regex.exec(content)) !== null) {
        const specifier = match[1]
        if (specifier.startsWith('.')) {
          const r = resolveRelative(specifier, dir, allPaths)
          if (r) resolved.push(r)
        }
      }
    }
  } else if (ext === '.py') {
    // from .module import X  |  from ..pkg import Y
    const rel = /^from\s+(\.+)([\w.]*)\s+import/gm
    let match: RegExpExecArray | null
    while ((match = rel.exec(content)) !== null) {
      const dots = match[1].length
      const mod  = match[2] ?? ''
      let base   = dir
      for (let i = 1; i < dots; i++) base = path.dirname(base)
      const candidate = path.join(base, ...mod.split('.').filter(Boolean)) + '.py'
      if (allPaths.has(candidate)) resolved.push(candidate)
      const initCandidate = path.join(base, ...mod.split('.').filter(Boolean), '__init__.py')
      if (allPaths.has(initCandidate)) resolved.push(initCandidate)
    }
  } else if (ext === '.go') {
    // import "./relative/path"
    const rel = /"(\.\/[^"]+)"/g
    let match: RegExpExecArray | null
    while ((match = rel.exec(content)) !== null) {
      const r = resolveRelative(match[1], dir, allPaths)
      if (r) resolved.push(r)
    }
  }

  // Deduplicate
  return [...new Set(resolved)]
}

function resolveRelative(
  specifier: string,
  fromDir: string,
  allPaths: Set<string>
): string | null {
  const base = path.resolve(fromDir, specifier)
  const candidates = [
    base,
    base + '.ts', base + '.tsx', base + '.js', base + '.jsx', base + '.mjs',
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
    path.join(base, 'index.js'),
    path.join(base, 'index.jsx'),
  ]
  for (const c of candidates) {
    if (allPaths.has(c)) return c
  }
  return null
}
