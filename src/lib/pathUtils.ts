export function getBasename(filePath: string): string {
  if (!filePath) return ''
  const normalized = filePath.replace(/\\/g, '/')
  const parts = normalized.split('/')
  return parts[parts.length - 1] || filePath
}

export function toRelativePath(filePath: string): string {
  if (!filePath) return ''
  const normalized = filePath.replace(/\\/g, '/')
  // Strip temp clone directories: everything up to repos/<hash>/
  const reposMatch = normalized.match(/repos\/[^/]+\/(.+)$/)
  if (reposMatch) return reposMatch[1]
  // Strip common local path prefixes
  const srcMatch = normalized.match(/(src\/.+)$/)
  if (srcMatch) return srcMatch[1]
  // Fallback: just return filename
  return getBasename(filePath)
}
