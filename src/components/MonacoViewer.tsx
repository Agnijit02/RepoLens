'use client'

import dynamic from 'next/dynamic'
import { X, Copy, CheckCheck } from 'lucide-react'
import { useState } from 'react'

// Monaco must be loaded client-side only (no SSR)
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

const EXT_TO_LANG: Record<string, string> = {
  '.ts': 'typescript', '.tsx': 'typescript',
  '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript',
  '.py': 'python', '.go': 'go', '.rs': 'rust',
  '.java': 'java', '.rb': 'ruby', '.cs': 'csharp',
  '.cpp': 'cpp', '.c': 'c',
  '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml',
  '.html': 'html', '.css': 'css', '.scss': 'scss',
  '.md': 'markdown', '.sh': 'shell', '.sql': 'sql',
  '.toml': 'ini',
}

/** Extract just the file extension from a path */
function getExtension(filePath: string): string {
  const parts = filePath.split('.')
  return parts.length > 1 ? `.${parts[parts.length - 1].toLowerCase()}` : ''
}

/** Extract the filename from a path */
function getBasename(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  const parts = normalized.split('/')
  return parts[parts.length - 1] || filePath
}

/** Convert an absolute temp path to a clean relative path */
function toRelativePath(filePath: string): string {
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

interface MonacoViewerProps {
  filePath: string       // relative or absolute path for display
  content: string        // file content
  onClose: () => void
}

export function MonacoViewer({ filePath, content, onClose }: MonacoViewerProps) {
  const [copied, setCopied] = useState(false)
  const ext = getExtension(filePath)
  const language = EXT_TO_LANG[ext] ?? 'plaintext'
  const fileName = getBasename(filePath)
  const relPath = toRelativePath(filePath)

  async function handleCopy() {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="drawer-overlay"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="drawer">
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            flexShrink: 0,
          }}
        >
          <div style={{ overflow: 'hidden', flex: 1, display: 'flex', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{fileName}</div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
            <button
              onClick={handleCopy}
              title={copied ? 'Copied!' : 'Copy file contents'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: 6,
                background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
                cursor: 'pointer',
                color: copied ? 'var(--green)' : 'var(--text-muted)',
                transition: 'all 0.15s',
                padding: 0,
              }}
              onMouseEnter={e => { if (!copied) e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { if (!copied) e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              {copied ? <CheckCheck size={13} /> : <Copy size={13} />}
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none',
                cursor: 'pointer', color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center',
                padding: 4, borderRadius: 4,
                transition: 'color 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Monaco Editor */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <MonacoEditor
            height="100%"
            language={language}
            value={content}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: true },
              fontSize: 12.5,
              lineHeight: 20,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontLigatures: true,
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              renderLineHighlight: 'line',
              smoothScrolling: true,
              cursorSmoothCaretAnimation: 'on',
              padding: { top: 12, bottom: 12 },
            }}
          />
        </div>
      </div>
    </>
  )
}

