import * as git from 'isomorphic-git'
import http from 'isomorphic-git/http/node'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import * as os from 'os'

/** Temp directory where repos are cloned */
export const REPOS_DIR = path.join(os.tmpdir(), 'repolens', 'repos')

/** Deterministic local path for a given remote URL */
export function getRepoDest(url: string): string {
  const hash = crypto.createHash('sha256').update(url).digest('hex').slice(0, 12)
  return path.join(REPOS_DIR, hash)
}

/**
 * Clone (or update) a repository locally.
 * Returns the absolute path to the cloned directory.
 */
export async function cloneRepo(
  url: string,
  onProgress?: (msg: string) => void
): Promise<string> {
  const normalizedUrl = normalizeUrl(url)
  const dest = getRepoDest(normalizedUrl)

  fs.mkdirSync(REPOS_DIR, { recursive: true })

  if (fs.existsSync(dest)) {
    onProgress?.('Repository already cached — pulling latest changes...')
    try {
      await git.pull({
        fs,
        http,
        dir: dest,
        author: { name: 'RepoLens', email: 'repolens@example.com' },
        singleBranch: true
      })
    } catch {
      // If pull fails (detached HEAD, etc.) just use the existing clone
      onProgress?.('Using existing cached clone.')
    }
    return dest
  }

  onProgress?.(`Cloning ${normalizedUrl}...`)

  await git.clone({
    fs,
    http,
    dir: dest,
    url: normalizedUrl,
    depth: 1,
    singleBranch: true
  })

  onProgress?.('Clone complete.')
  return dest
}

/**
 * Remove a cloned repository from disk.
 * Called after analysis is complete to free space.
 */
export async function cleanupRepo(url: string): Promise<void> {
  const dest = getRepoDest(normalizeUrl(url))
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true })
  }
}

/**
 * Parse owner and repo name from a GitHub/GitLab/Bitbucket URL.
 */
export function parseRepoUrl(url: string): { owner: string; name: string } {
  const cleaned = url.replace(/\.git$/, '').replace(/\/$/, '')
  const match = cleaned.match(/(?:github|gitlab|bitbucket)\.(?:com|org)[/:]([^/]+)\/([^/]+)/)
  return {
    owner: match?.[1] ?? 'unknown',
    name:  match?.[2] ?? 'repo',
  }
}

/** Normalise SSH git URLs to HTTPS */
function normalizeUrl(url: string): string {
  // git@github.com:owner/repo.git → https://github.com/owner/repo.git
  return url.replace(/^git@([\w.]+):/, 'https://$1/')
}
