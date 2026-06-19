import * as fs from 'fs'
import * as path from 'path'
import type { FileNode } from '../types'

/** Directories that are never interesting for code analysis */
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.nuxt', '.svelte-kit',
  '__pycache__', 'vendor', 'target', '.gradle', '.cache', 'coverage',
  '.nyc_output', 'storybook-static', '.turbo', '.vercel', '.tmp',
  'venv', '.venv', 'env', '.env', '__snapshots__',
])

/** File extensions that carry no code intelligence value */
const SKIP_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.avif', '.bmp', '.tiff',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.mp4', '.mp3', '.wav', '.ogg', '.mov', '.avi', '.webm',
  '.zip', '.tar', '.gz', '.7z', '.rar',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.exe', '.dll', '.so', '.dylib',
  '.map',    // source maps
])

/**
 * Recursively scan a directory and return a hierarchical FileNode tree.
 * Skips binary files, build artefacts, and large lock files.
 */
export function scanFileTree(dirPath: string, rootPath: string): FileNode[] {
  const nodes: FileNode[] = []

  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true })
  } catch {
    return nodes
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    const relativePath = path.relative(rootPath, fullPath).replace(/\\/g, '/')
    const ext = path.extname(entry.name).toLowerCase()

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue
      const children = scanFileTree(fullPath, rootPath)
      nodes.push({
        path: relativePath,
        absolutePath: fullPath,
        type: 'dir',
        size: 0,
        extension: '',
        children,
      })
    } else if (entry.isFile()) {
      if (SKIP_EXTS.has(ext)) continue
      // Skip lock files (they are huge and useless for analysis)
      if (/^(package-lock|yarn\.lock|pnpm-lock|Gemfile\.lock|Cargo\.lock|poetry\.lock)/.test(entry.name)) continue

      let size = 0
      let lineCount = 0
      try {
        const stat = fs.statSync(fullPath)
        size = stat.size
        if (size < 2_000_000) {  // only count lines for files < 2 MB
          const content = fs.readFileSync(fullPath, 'utf-8')
          lineCount = content.split('\n').length
        }
      } catch {
        // binary or unreadable — still include with size 0
      }

      nodes.push({
        path: relativePath,
        absolutePath: fullPath,
        type: 'file',
        size,
        extension: ext,
        lineCount,
      })
    }
  }

  // Directories first, then files, alphabetically within each group
  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
    return a.path.localeCompare(b.path)
  })
}

/** Flatten a hierarchical FileNode tree into a flat array of files only */
export function flattenTree(tree: FileNode[]): FileNode[] {
  const result: FileNode[] = []
  function walk(nodes: FileNode[]) {
    for (const node of nodes) {
      if (node.type === 'file') result.push(node)
      if (node.children) walk(node.children)
    }
  }
  walk(tree)
  return result
}
