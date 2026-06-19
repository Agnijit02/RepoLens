import * as fs from 'fs'
import * as path from 'path'
import { getRepoDest } from '@/lib/git'
import { parseRepoUrl } from '@/lib/git'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/file?url=<repo-url>&path=<relative-file-path>
 * Returns the raw content of a file in a cloned repository.
 * Used by the Monaco editor to display file content.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const repoUrl     = searchParams.get('url')?.trim()
  const filePath    = searchParams.get('path')?.trim()

  if (!repoUrl || !filePath) {
    return new Response('Missing ?url= or ?path= parameter', { status: 400 })
  }

  const localRoot = getRepoDest(repoUrl)
  if (!fs.existsSync(localRoot)) {
    return new Response('Repository not found — run analysis first', { status: 404 })
  }

  // Security: prevent path traversal
  const resolvedPath = path.resolve(localRoot, filePath)
  if (!resolvedPath.startsWith(localRoot)) {
    return new Response('Forbidden', { status: 403 })
  }

  let content: string
  try {
    content = fs.readFileSync(resolvedPath, 'utf-8')
  } catch {
    return new Response('File not found', { status: 404 })
  }

  // Guess content-type for Monaco language detection
  const ext = path.extname(filePath).toLowerCase()
  const contentType = EXT_TO_MIME[ext] ?? 'text/plain'

  return new Response(content, {
    headers: {
      'Content-Type':  contentType,
      'Cache-Control': 'no-store',
    },
  })
}

const EXT_TO_MIME: Record<string, string> = {
  '.ts':   'application/typescript',
  '.tsx':  'application/typescript',
  '.js':   'application/javascript',
  '.jsx':  'application/javascript',
  '.mjs':  'application/javascript',
  '.json': 'application/json',
  '.py':   'text/x-python',
  '.go':   'text/x-go',
  '.rs':   'text/x-rust',
  '.java': 'text/x-java',
  '.rb':   'text/x-ruby',
  '.cs':   'text/x-csharp',
  '.cpp':  'text/x-c++src',
  '.c':    'text/x-csrc',
  '.html': 'text/html',
  '.css':  'text/css',
  '.scss': 'text/x-scss',
  '.md':   'text/markdown',
  '.yaml': 'text/yaml',
  '.yml':  'text/yaml',
  '.sh':   'text/x-shellscript',
  '.sql':  'text/x-sql',
  '.toml': 'text/x-toml',
}
