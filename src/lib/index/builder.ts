import * as fs from 'fs'
import * as path from 'path'
import type { RepositoryIndex, PackageJson } from '../types'
import { scanFileTree, flattenTree } from './fileTree'
import { buildImportGraph } from './importGraph'
import { buildSymbolTable } from './symbolTable'
import { parseRepoUrl } from '../git'

export interface IndexProgress {
  stage: string
  progress: number   // 0–100
  detail?: string
}

/**
 * Builds the complete RepositoryIndex for a locally cloned repository.
 * Emits progress events via the onProgress callback.
 */
export async function buildRepositoryIndex(
  localPath: string,
  url: string,
  onProgress: (p: IndexProgress) => void
): Promise<RepositoryIndex> {

  // ── 1. File tree ─────────────────────────────────────────────────────────
  onProgress({ stage: 'scanning', progress: 5, detail: 'Scanning file tree…' })
  const fileTree = scanFileTree(localPath, localPath)
  const allFiles = flattenTree(fileTree)
  onProgress({ stage: 'scanning', progress: 15, detail: `Found ${allFiles.length} files` })

  // ── 2. Config files ───────────────────────────────────────────────────────
  onProgress({ stage: 'config', progress: 18, detail: 'Reading configuration files…' })
  const configFiles = extractConfigFiles(localPath)

  // ── 3. Language statistics ────────────────────────────────────────────────
  onProgress({ stage: 'languages', progress: 22, detail: 'Analysing language breakdown…' })
  const languages = computeLanguageStats(allFiles)
  const primaryLanguage = getPrimaryLanguage(languages)

  // ── 4. Import graph ───────────────────────────────────────────────────────
  onProgress({ stage: 'imports', progress: 28, detail: 'Building import graph…' })
  const { importGraph, importedBy } = buildImportGraph(allFiles, localPath)
  onProgress({ stage: 'imports', progress: 60, detail: 'Import graph complete' })

  // ── 5. Symbol table ───────────────────────────────────────────────────────
  onProgress({ stage: 'symbols', progress: 65, detail: 'Extracting exported symbols…' })
  const symbolTable = buildSymbolTable(allFiles)
  onProgress({ stage: 'symbols', progress: 85, detail: 'Symbol table complete' })

  // ── 6. Entry point candidates ─────────────────────────────────────────────
  const entryPointCandidates = findEntryPointCandidates(allFiles, configFiles.packageJson, localPath)

  // ── 7. Metadata ───────────────────────────────────────────────────────────
  const { owner, name } = parseRepoUrl(url)
  let description = ''
  try { description = (configFiles.packageJson)?.description ?? '' } catch { /* noop */ }

  const totalLines = allFiles.reduce((s, f) => s + (f.lineCount ?? 0), 0)

  onProgress({ stage: 'complete', progress: 100, detail: 'Repository Index built ✓' })

  return {
    metadata: {
      url,
      owner,
      name,
      description,
      primaryLanguage,
      clonedAt: new Date(),
      localPath,
    },
    fileTree,
    allFiles,
    importGraph,
    importedBy,
    symbolTable,
    languages,
    configFiles,
    entryPointCandidates,
    totalFiles: allFiles.length,
    totalLines,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function read(rootPath: string, rel: string): string | undefined {
  try { return fs.readFileSync(path.join(rootPath, rel), 'utf-8') } catch { return undefined }
}

function readJson<T>(rootPath: string, rel: string): T | undefined {
  const c = read(rootPath, rel)
  if (!c) return undefined
  try { return JSON.parse(c) as T } catch { return undefined }
}

function extractConfigFiles(rootPath: string): RepositoryIndex['configFiles'] {
  const ciWorkflows: Record<string, string> = {}
  const workflowsDir = path.join(rootPath, '.github', 'workflows')
  if (fs.existsSync(workflowsDir)) {
    for (const f of fs.readdirSync(workflowsDir)) {
      if (f.endsWith('.yml') || f.endsWith('.yaml')) {
        const content = read(rootPath, path.join('.github', 'workflows', f))
        if (content) ciWorkflows[f] = content
      }
    }
  }

  return {
    packageJson:     readJson<PackageJson>(rootPath, 'package.json'),
    goMod:           read(rootPath, 'go.mod'),
    cargoToml:       read(rootPath, 'Cargo.toml'),
    requirementsTxt: read(rootPath, 'requirements.txt'),
    pyprojectToml:   read(rootPath, 'pyproject.toml'),
    dockerfile:      read(rootPath, 'Dockerfile') ?? read(rootPath, 'dockerfile'),
    dockerCompose:   read(rootPath, 'docker-compose.yml') ?? read(rootPath, 'docker-compose.yaml'),
    ciWorkflows,
  }
}

function computeLanguageStats(
  allFiles: ReturnType<typeof flattenTree>
): Record<string, { fileCount: number; lineCount: number }> {
  const EXT_TO_LANG: Record<string, string> = {
    '.ts': 'TypeScript', '.tsx': 'TypeScript',
    '.js': 'JavaScript', '.jsx': 'JavaScript', '.mjs': 'JavaScript', '.cjs': 'JavaScript',
    '.py': 'Python',
    '.go': 'Go',
    '.rs': 'Rust',
    '.java': 'Java',
    '.rb': 'Ruby',
    '.cs': 'C#',
    '.cpp': 'C++', '.cc': 'C++', '.cxx': 'C++', '.h': 'C/C++',
    '.c': 'C',
    '.php': 'PHP',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.scala': 'Scala',
    '.html': 'HTML',
    '.css': 'CSS', '.scss': 'CSS', '.sass': 'CSS', '.less': 'CSS',
    '.json': 'JSON',
    '.yaml': 'YAML', '.yml': 'YAML',
    '.md': 'Markdown',
    '.sh': 'Shell', '.bash': 'Shell',
    '.sql': 'SQL',
  }
  const stats: Record<string, { fileCount: number; lineCount: number }> = {}
  for (const f of allFiles) {
    const lang = EXT_TO_LANG[f.extension] ?? 'Other'
    if (!stats[lang]) stats[lang] = { fileCount: 0, lineCount: 0 }
    stats[lang].fileCount++
    stats[lang].lineCount += f.lineCount ?? 0
  }
  return stats
}

const CODE_LANGS = [
  'TypeScript', 'JavaScript', 'Python', 'Go', 'Rust',
  'Java', 'Ruby', 'C#', 'C++', 'C', 'PHP', 'Swift', 'Kotlin', 'Scala',
]

function getPrimaryLanguage(
  languages: Record<string, { fileCount: number; lineCount: number }>
): string {
  let best = ''
  let bestLines = 0
  for (const lang of CODE_LANGS) {
    const lines = languages[lang]?.lineCount ?? 0
    if (lines > bestLines) { bestLines = lines; best = lang }
  }
  return best || Object.keys(languages)[0] || 'Unknown'
}

function findEntryPointCandidates(
  allFiles: ReturnType<typeof flattenTree>,
  pkg: PackageJson | undefined,
  rootPath: string
): string[] {
  const cands: string[] = []

  if (pkg?.main) {
    const r = path.resolve(rootPath, pkg.main)
    if (allFiles.some(f => f.absolutePath === r)) cands.push(r)
  }
  if (pkg?.module) {
    const r = path.resolve(rootPath, pkg.module)
    if (allFiles.some(f => f.absolutePath === r)) cands.push(r)
  }

  const CONVENTIONAL = [
    'index.ts', 'index.tsx', 'index.js',
    'main.ts', 'main.tsx', 'main.js',
    'app.ts', 'app.tsx', 'app.js',
    'main.py', 'app.py', '__main__.py',
    'main.go', 'cmd/main.go',
    'main.rs', 'src/main.rs',
    'Program.cs', 'src/Program.cs',
    'server.ts', 'server.js',
  ]
  for (const name of CONVENTIONAL) {
    const found = allFiles.find(f =>
      f.path === name || f.path.endsWith('/' + name)
    )
    if (found) cands.push(found.absolutePath)
  }

  return [...new Set(cands)]
}
