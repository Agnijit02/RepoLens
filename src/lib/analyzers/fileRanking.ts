import * as path from 'path'
import type { RepositoryIndex, FileRankingResult, RankedFile, BusinessLogicFile } from '../types'

/**
 * Rank repository files by structural importance.
 *
 * Scoring model — NO commit history (commit count is a proxy for activity, not importance):
 *
 *  Weight  Signal
 *  ──────  ──────────────────────────────────────────────────────────────────
 *   35%    Import centrality  (in-degree in import graph)
 *   25%    Closeness to entry point  (inverse BFS distance)
 *   20%    Business logic score  (re-used from businessLogic analyzer)
 *   10%    Exported symbol count
 *   10%    File size relative to project median
 */
export function analyzeFileRanking(
  index: RepositoryIndex,
  entryPointFile: string,
  blFiles: BusinessLogicFile[]
): FileRankingResult {

  const blScoreMap = new Map(blFiles.map(f => [f.path, f.score]))

  const SOURCE_EXTS = new Set([
    '.ts', '.tsx', '.js', '.jsx', '.mjs',
    '.py', '.go', '.rs', '.java', '.rb', '.cs', '.cpp', '.c',
  ])

  const candidates = index.allFiles.filter(
    f => f.type === 'file' &&
      SOURCE_EXTS.has(f.extension) &&
      !f.absolutePath.includes('node_modules') &&
      !/(dist|build|\.next|coverage)[/\\]/.test(f.absolutePath)
  )

  if (!candidates.length) return { rankedFiles: [] }

  // Normalisation denominators
  const maxInDegree = Math.max(1, ...candidates.map(f => index.importedBy[f.absolutePath]?.length ?? 0))
  const maxExports  = Math.max(1, ...candidates.map(f => index.symbolTable[f.absolutePath]?.length ?? 0))
  const medianSize  = median(candidates.map(f => f.size))

  // BFS distances from entry point through import graph
  const distances = bfsFwd(entryPointFile, index.importGraph, candidates.map(f => f.absolutePath))
  const maxDist   = Math.max(1, ...Object.values(distances).filter(d => d < Infinity))

  const ranked: RankedFile[] = candidates.map(file => {
    const inDeg     = index.importedBy[file.absolutePath]?.length ?? 0
    const exports   = index.symbolTable[file.absolutePath]?.length ?? 0
    const dist      = distances[file.absolutePath] ?? Infinity
    const blScore   = blScoreMap.get(file.absolutePath) ?? 0

    const importCentrality     = inDeg  / maxInDegree
    const distanceFromEntry    = dist === Infinity ? 0 : 1 - (dist / (maxDist + 1))
    const exportedSymbolCount  = exports / maxExports
    const fileSizeScore        = Math.min(1, file.size / Math.max(1, medianSize * 10))

    const rawScore =
      importCentrality    * 0.35 +
      distanceFromEntry   * 0.25 +
      blScore             * 0.20 +
      exportedSymbolCount * 0.10 +
      fileSizeScore       * 0.10

    return {
      path: file.absolutePath,
      rank: 0,   // set after sort
      score: Math.round(rawScore * 100),
      importCentrality,
      distanceFromEntry,
      businessLogicScore: blScore,
      exportedSymbolCount,
      fileSize: file.size,
      extension: file.extension,
    }
  })

  ranked.sort((a, b) => b.score - a.score)
  ranked.forEach((f, i) => { f.rank = i + 1 })

  return { rankedFiles: ranked.slice(0, 25) }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** BFS forward (following import edges) from a start node */
function bfsFwd(
  start: string,
  graph: Record<string, string[]>,
  nodes: string[]
): Record<string, number> {
  const dist: Record<string, number> = {}
  for (const n of nodes) dist[n] = Infinity
  if (!start || !(start in graph)) return dist

  dist[start] = 0
  const queue = [start]
  while (queue.length) {
    const cur = queue.shift()!
    for (const nb of graph[cur] ?? []) {
      if (dist[nb] === Infinity) {
        dist[nb] = dist[cur] + 1
        queue.push(nb)
      }
    }
  }
  return dist
}

function median(values: number[]): number {
  if (!values.length) return 1
  const s = [...values].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}
