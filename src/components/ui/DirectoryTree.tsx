'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown, Folder, FolderOpen, File } from 'lucide-react'
import type { FileNode } from '@/lib/types'

interface DirectoryTreeProps {
  nodes: FileNode[]
  onFileClick?: (node: FileNode) => void
  depth?: number
  folderDescriptions?: Record<string, string>
}

export function DirectoryTree({
  nodes,
  onFileClick,
  depth = 0,
  folderDescriptions = {},
}: DirectoryTreeProps) {
  return (
    <div style={{ paddingLeft: depth > 0 ? 16 : 0 }}>
      {nodes.map(node => (
        <TreeNode
          key={node.path}
          node={node}
          onFileClick={onFileClick}
          depth={depth}
          folderDescriptions={folderDescriptions}
        />
      ))}
    </div>
  )
}

function TreeNode({
  node,
  onFileClick,
  depth,
  folderDescriptions,
}: {
  node: FileNode
  onFileClick?: (node: FileNode) => void
  depth: number
  folderDescriptions: Record<string, string>
}) {
  const [open, setOpen] = useState(depth < 1)

  const isDir = node.type === 'dir'
  const hasDesc = folderDescriptions[node.path]
  const label = node.path.split('/').pop() ?? node.path

  function handleClick() {
    if (isDir) {
      setOpen(o => !o)
    } else {
      onFileClick?.(node)
    }
  }

  return (
    <>
      <div
        className={`tree-item ${isDir ? 'dir' : 'file'}`}
        onClick={handleClick}
        title={hasDesc ?? node.path}
      >
        {/* Expand chevron for dirs */}
        {isDir ? (
          open
            ? <ChevronDown size={12} style={{ flexShrink: 0 }} />
            : <ChevronRight size={12} style={{ flexShrink: 0 }} />
        ) : (
          <span style={{ width: 12, flexShrink: 0 }} />
        )}

        {/* Icon */}
        {isDir
          ? (open
              ? <FolderOpen size={13} style={{ flexShrink: 0, color: 'var(--amber)' }} />
              : <Folder     size={13} style={{ flexShrink: 0, color: 'var(--amber)' }} />
            )
          : <File size={13} style={{ flexShrink: 0 }} />
        }

        {/* Label */}
        <span className="truncate" style={{ flex: 1 }}>{label}</span>

        {/* Folder description tag */}
        {hasDesc && (
          <span style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            background: 'var(--bg-hover)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 3,
            padding: '1px 5px',
            flexShrink: 0,
            maxWidth: 120,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {hasDesc}
          </span>
        )}
      </div>

      {/* Children */}
      {isDir && open && node.children && (
        <DirectoryTree
          nodes={node.children}
          onFileClick={onFileClick}
          depth={depth + 1}
          folderDescriptions={folderDescriptions}
        />
      )}
    </>
  )
}
