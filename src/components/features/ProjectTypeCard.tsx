'use client'

import { Code2 } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { FeatureCard } from '@/components/ui/FeatureCard'
import type { ProjectTypeResult } from '@/lib/types'

const CATEGORY_ICONS: Record<string, string> = {
  'Frontend':      '🖥️',
  'Backend':       '⚙️',
  'Full-Stack':    '🌐',
  'CLI Tool':      '💻',
  'Library / SDK': '📦',
  'Mobile':        '📱',
  'Data / ML':     '🧠',
  'DevOps / Infra':'🏗️',
  'Monorepo':      '🗂️',
  'Unknown':       '❓',
}

interface Props {
  result: ProjectTypeResult
}

export function ProjectTypeCard({ result }: Props) {
  const pieData = result.languages.map(l => ({
    name: l.language,
    value: l.percentage,
    color: l.color,
  }))

  return (
    <FeatureCard
      title="Project Type Detection"
      icon={<Code2 size={16} />}
      accentColor="#06b6d4"
    >
      {/* Primary type */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
        <div>
          <span className="section-label" style={{ display: 'block', marginBottom: 8 }}>Classification</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28 }}>{CATEGORY_ICONS[result.primaryType] ?? '📁'}</span>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>{result.primaryType}</div>
              {result.framework && (
                <div style={{ fontSize: 13, color: 'var(--cyan)', fontWeight: 500, marginTop: 2 }}>
                  {result.framework}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Secondary badges */}
      {result.secondaryTypes.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          {result.secondaryTypes.map(t => (
            <span key={t} className="badge badge-neutral">{t}</span>
          ))}
        </div>
      )}

      {/* Dependency counts */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            padding: '10px 14px',
            background: 'var(--bg-elevated)',
            borderRadius: 8,
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--cyan)' }}>{result.depCount.prod}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Production deps</div>
        </div>
        <div
          style={{
            padding: '10px 14px',
            background: 'var(--bg-elevated)',
            borderRadius: 8,
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--violet-light)' }}>{result.depCount.dev}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Dev deps</div>
        </div>
      </div>

      {/* Language breakdown */}
      {result.languages.length > 0 && (
        <>
          <span className="section-label" style={{ display: 'block', marginBottom: 12 }}>Language Breakdown</span>

          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {/* Mini pie chart */}
            <div style={{ width: 80, height: 80, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={36} strokeWidth={0}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-muted)',
                      borderRadius: 6,
                      fontSize: 11,
                    }}
                    formatter={(val: any) => [`${val}%`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Language list */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {result.languages.slice(0, 5).map(lang => (
                <div key={lang.language} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="lang-dot" style={{ background: lang.color }} />
                  <span style={{ fontSize: 12, flex: 1, color: 'var(--text-secondary)' }}>{lang.language}</span>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {lang.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </FeatureCard>
  )
}
