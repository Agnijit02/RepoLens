'use client'

import { getBasename, toRelativePath } from '@/lib/pathUtils'
import { useState } from 'react'
import { Search, ChevronDown, ChevronRight, FileCode } from 'lucide-react'
import { FeatureCard } from '@/components/ui/FeatureCard'
import type { EntryPointResult } from '@/lib/types'

interface Props {
  result: EntryPointResult
  aiSummary?: string
  repoUrl: string
  onFileOpen?: (filePath: string) => void
  style?: React.CSSProperties
}

export function EntryPointCard({ result, aiSummary, repoUrl, onFileOpen, style }: Props) {
  const [showSignals, setShowSignals] = useState(false)
  const [showAlternates, setShowAlternates] = useState(false)

  const fileName = result.primaryFile
    ? getBasename(result.primaryFile)
    : '—'

  const relPath = result.primaryFile
    ? toRelativePath(result.primaryFile)
    : '—'

  return (
    <FeatureCard
      title="Entry Point Detection"
      icon={<Search size={16} />}
      accentColor="#7c3aed"
      style={style}
    >
      {/* Primary file */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div>
          <span className="section-label" style={{ display: 'block', marginBottom: 6 }}>
            Primary Entry File
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileCode size={16} color="var(--violet-light)" />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-primary)',
                cursor: result.primaryFile ? 'pointer' : 'default',
              }}
              onClick={() => result.primaryFile && onFileOpen?.(result.primaryFile)}
              title="Click to open in Monaco editor"
            >
              {fileName}
            </span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
            {relPath}
          </span>
        </div>
      </div>

      {/* AI Summary */}
      {aiSummary && (
        <div
          style={{
            padding: '12px 14px',
            background: 'rgba(124,58,237,0.08)',
            border: '1px solid rgba(124,58,237,0.2)',
            borderRadius: 8,
            fontSize: 13,
            color: 'var(--text-secondary)',
            lineHeight: 1.65,
            marginBottom: 16,
          }}
        >
          <span style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--violet-light)', marginBottom: 6 }}>
            Gemini Summary
          </span>
          {aiSummary}
        </div>
      )}

      {/* Signals fired */}
      {result.signalsFired.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => setShowSignals(s => !s)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', fontSize: 12, padding: 0,
              marginBottom: 8,
            }}
          >
            {showSignals ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            {result.signalsFired.length} detection signal{result.signalsFired.length !== 1 ? 's' : ''} fired
          </button>

          {showSignals && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {result.signalsFired.map((s, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '8px 12px',
                    background: 'var(--bg-elevated)',
                    borderRadius: 6,
                    border: '1px solid var(--border-subtle)',
                    gap: 2,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--violet-light)' }}>{s.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{s.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Alternates */}
      {result.alternates.length > 0 && (
        <div>
          <button
            onClick={() => setShowAlternates(s => !s)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 12, padding: 0,
            }}
          >
            {showAlternates ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            {result.alternates.length} alternate candidate{result.alternates.length !== 1 ? 's' : ''}
          </button>

          {showAlternates && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {result.alternates.map((alt, i) => (
                <div
                  key={i}
                  style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11,
                    color: 'var(--text-muted)', padding: '4px 8px',
                    background: 'var(--bg-elevated)', borderRadius: 4,
                    cursor: 'pointer',
                  }}
                  onClick={() => onFileOpen?.(alt)}
                >
                  {getBasename(alt)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </FeatureCard>
  )
}
