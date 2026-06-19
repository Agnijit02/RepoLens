'use client'

import { useState } from 'react'
import { getBasename } from '@/lib/pathUtils'
import { Brain, ChevronDown, ChevronRight, FileCode } from 'lucide-react'
import { FeatureCard } from '@/components/ui/FeatureCard'
import type { BusinessLogicModule } from '@/lib/types'

interface Props {
  modules: BusinessLogicModule[]
  aiSummaries?: Record<string, string>
  onFileOpen?: (filePath: string) => void
}

const MODULE_COLORS: Record<string, string> = {
  orchestrator: '#7c3aed',
  service:      '#06b6d4',
  model:        '#22c55e',
  utility:      '#f59e0b',
  mixed:        '#8b949e',
}

export function BusinessLogicCard({ modules, aiSummaries = {}, onFileOpen }: Props) {
  const [expanded, setExpanded] = useState<string | null>(modules[0]?.directory ?? null)

  if (!modules.length) {
    return (
      <FeatureCard title="Business Logic Detection" icon={<Brain size={16} />} accentColor="#7c3aed">
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No logic modules detected.</div>
      </FeatureCard>
    )
  }

  return (
    <FeatureCard title="Business Logic Detection" icon={<Brain size={16} />} accentColor="#7c3aed">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {modules.map(mod => {
          const isOpen    = expanded === mod.directory
          const color     = MODULE_COLORS[mod.moduleType] ?? '#8b949e'
          const aiSummary = aiSummaries[mod.directory]
          const maxScore  = modules[0].totalScore || 1
          const pct       = Math.round((mod.totalScore / maxScore) * 100)

          return (
            <div
              key={mod.directory}
              style={{
                background: 'var(--bg-elevated)',
                border: `1px solid ${isOpen ? color + '50' : 'var(--border-subtle)'}`,
                borderRadius: 10,
                overflow: 'hidden',
                transition: 'border-color 0.2s',
              }}
            >
              {/* Module header */}
              <button
                onClick={() => setExpanded(isOpen ? null : mod.directory)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {isOpen ? <ChevronDown size={13} color="var(--text-muted)" /> : <ChevronRight size={13} color="var(--text-muted)" />}

                {/* Type dot */}
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />

                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                      {mod.label}
                    </span>
                    <span style={{ fontSize: 10, color, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                      {mod.moduleType}
                    </span>
                  </div>

                  {/* Score bar */}
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 4, background: 'var(--bg-hover)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.6s' }} />
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                      {mod.files.length} file{mod.files.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* AI Summary */}
                  {aiSummary && (
                    <div style={{
                      padding: '10px 12px',
                      background: `${color}12`,
                      border: `1px solid ${color}30`,
                      borderRadius: 6,
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.6,
                    }}>
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color, display: 'block', marginBottom: 4 }}>
                        AI Summary
                      </span>
                      {aiSummary}
                    </div>
                  )}

                  {/* File list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {mod.files.slice(0, 8).map(f => (
                      <div
                        key={f.path}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '5px 8px',
                          borderRadius: 5,
                          cursor: 'pointer',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        onClick={() => onFileOpen?.(f.path)}
                      >
                        <FileCode size={12} color={color} style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {getBasename(f.path)}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                          {f.exports.length} exports
                        </span>
                        <div style={{ width: 50, height: 3, background: 'var(--bg-hover)', borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
                          <div style={{ height: '100%', width: `${Math.round(f.score * 100)}%`, background: color, borderRadius: 2 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </FeatureCard>
  )
}
