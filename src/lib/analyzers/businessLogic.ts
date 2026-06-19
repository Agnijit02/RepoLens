import * as fs from 'fs'
import * as path from 'path'
import type { RepositoryIndex, BusinessLogicModule, BusinessLogicFile } from '../types'

/** File / path patterns that indicate generated/boilerplate code — excluded from scoring */
const EXCLUDE: RegExp[] = [
  /node_modules/,
  /[/\\](dist|build|\.next|out|coverage|\.turbo|\.cache)[/\\]/,
  /\.(test|spec|stories)\.[jt]sx?$/,
  /\.d\.ts$/,
  /\.(config|setup)\.[jt]s$/,
  /__(tests?|mocks?|fixtures?)__/,
  /[/\\]migrations[/\\]/,
  /[/\\]generated[/\\]/,
]

/**
 * AST-driven business logic detection.
 *
 * Scores each source file on five structural signals derived from the
 * Repository Index, NOT from filename conventions:
 *
 *  1. Import centrality  — how many other files import this file
 *  2. Symbol export depth — re-exports and composition
 *  3. Outbound call diversity — how many distinct modules this file calls
 *  4. Exported symbol count — richer API surface = more logic
 *  5. AST complexity — approximate cyclomatic complexity from keyword counting
 */
export function analyzeBusinessLogic(
  index: RepositoryIndex
): { modules: BusinessLogicModule[] } {
  const sourceExts = new Set([
    '.ts', '.tsx', '.js', '.jsx', '.mjs',
    '.py', '.go', '.rs', '.java', '.rb', '.cs',
  ])

  const candidates = index.allFiles.filter(f =>
    f.type === 'file' &&
    sourceExts.has(f.extension) &&
    !EXCLUDE.some(re => re.test(f.absolutePath))
  )

  if (!candidates.length) return { modules: [] }

  // Compute normalisation denominators
  const maxInDegree  = Math.max(1, ...candidates.map(f => index.importedBy[f.absolutePath]?.length  ?? 0))
  const maxOutDegree = Math.max(1, ...candidates.map(f => index.importGraph[f.absolutePath]?.length  ?? 0))
  const maxExports   = Math.max(1, ...candidates.map(f => index.symbolTable[f.absolutePath]?.length  ?? 0))

  const scoredFiles: BusinessLogicFile[] = []

  for (const file of candidates) {
    const inDegree  = index.importedBy[file.absolutePath]?.length  ?? 0
    const outDegree = index.importGraph[file.absolutePath]?.length ?? 0
    const numExports = index.symbolTable[file.absolutePath]?.length ?? 0

    // Approximate cyclomatic complexity via branch-keyword counting
    let complexity = 0
    try {
      const content = fs.readFileSync(file.absolutePath, 'utf-8')
      const branches = content.match(/\b(if|else|for|while|switch|case|catch|&&|\|\||\?\?)\b/g)
      complexity = Math.min(1, (branches?.length ?? 0) / 60)
    } catch { /* noop */ }

    const importCentrality      = inDegree  / maxInDegree
    const outboundCallDiversity = outDegree / maxOutDegree
    const symbolExportDepth     = numExports / maxExports
    const exportedSymbolCount   = numExports / maxExports
    const astComplexity         = complexity

    const score =
      importCentrality      * 0.30 +
      symbolExportDepth     * 0.20 +
      outboundCallDiversity * 0.20 +
      exportedSymbolCount   * 0.15 +
      astComplexity         * 0.15

    // Only include files with some significance
    if (score > 0.03 || inDegree > 0) {
      scoredFiles.push({
        path: file.absolutePath,
        score,
        importCentrality,
        symbolExportDepth,
        outboundCallDiversity,
        exportedSymbolCount,
        astComplexity,
        exports: index.symbolTable[file.absolutePath] ?? [],
      })
    }
  }

  scoredFiles.sort((a, b) => b.score - a.score)

  // ── Cluster by parent directory ───────────────────────────────────────────
  const byDir = new Map<string, BusinessLogicFile[]>()
  for (const file of scoredFiles.slice(0, 60)) {
    const dir = path.dirname(file.path)
    if (!byDir.has(dir)) byDir.set(dir, [])
    byDir.get(dir)!.push(file)
  }

  const modules: BusinessLogicModule[] = []
  for (const [dir, files] of byDir.entries()) {
    const totalScore = files.reduce((s, f) => s + f.score, 0)
    const avgIn   = files.reduce((s, f) => s + f.importCentrality, 0)      / files.length
    const avgOut  = files.reduce((s, f) => s + f.outboundCallDiversity, 0) / files.length
    const avgExps = files.reduce((s, f) => s + f.exportedSymbolCount, 0)   / files.length

    let moduleType: BusinessLogicModule['moduleType'] = 'mixed'
    if (avgIn > 0.5)                     moduleType = 'orchestrator'
    else if (avgOut > 0.4 && avgIn < 0.3) moduleType = 'service'
    else if (avgExps > 0.4)               moduleType = 'model'
    else if (avgOut < 0.2 && avgIn < 0.2) moduleType = 'utility'

    modules.push({
      directory: dir,
      label:     path.basename(dir) || dir,
      files,
      totalScore,
      moduleType,
    })
  }

  modules.sort((a, b) => b.totalScore - a.totalScore)
  return { modules: modules.slice(0, 12) }
}
