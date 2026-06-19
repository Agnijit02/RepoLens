'use client'

import { getBasename } from '@/lib/pathUtils'
import { BarChart3, ExternalLink } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { FeatureCard } from '@/components/ui/FeatureCard'
import type { FileRankingResult, RankedFile } from '@/lib/types'

interface Props {
  result: FileRankingResult
  onFileOpen?: (filePath: string) => void
}

const EXT_COLORS: Record<string, string> = {
  '.ts':  '#3178c6', '.tsx': '#3178c6',
  '.js':  '#f1e05a', '.jsx': '#f1e05a',
  '.py':  '#3572A5',
  '.go':  '#00ADD8',
  '.rs':  '#dea584',
  '.java':'#b07219',
  '.rb':  '#701516',
}

function ScoreBreakdown({ file }: { file: RankedFile }) {
  const bars = [
    { key: 'Import Centrality',   value: file.importCentrality,    color: '#7c3aed' },
    { key: 'Entry Proximity',     value: file.distanceFromEntry,   color: '#06b6d4' },
    { key: 'Business Logic',      value: file.businessLogicScore,  color: '#22c55e' },
    { key: 'Symbol Exports',      value: file.exportedSymbolCount, color: '#f59e0b' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8, padding: '8px 10px', background: 'var(--bg-hover)', borderRadius: 6 }}>
      {bars.map(b => (
        <div key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 110, flexShrink: 0 }}>{b.key}</span>
          <div style={{ flex: 1, height: 4, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.round(b.value * 100)}%`, background: b.color, borderRadius: 2 }} />
          </div>
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', width: 28, textAlign: 'right' }}>
            {Math.round(b.value * 100)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function FileRankingCard({ result, onFileOpen }: Props) {
  const top10 = result.rankedFiles.slice(0, 10)

  const chartData = top10.map(f => ({
    name: getBasename(f.path),
    score: f.score,
    color: EXT_COLORS[f.extension] ?? '#8b949e',
    file: f,
  }))

  if (!result.rankedFiles.length) {
    return (
      <FeatureCard title="Important Files Ranking" icon={<BarChart3 size={16} />} accentColor="#06b6d4">
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No files to rank.</div>
      </FeatureCard>
    )
  }

  return (
    <FeatureCard title="Important Files Ranking" icon={<BarChart3 size={16} />} accentColor="#06b6d4">
      {/* Bar chart */}
      <div style={{ height: Math.max(120, chartData.length * 28 + 16), marginBottom: 20 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 100, right: 16, top: 4, bottom: 4 }}>
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis
              type="category"
              dataKey="name"
              width={95}
              tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-muted)',
                borderRadius: 6,
                fontSize: 11,
              }}
              formatter={(val: any) => [`Score: ${val}`, '']}
              labelFormatter={(label) => label}
            />
            <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={16}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Ranked list */}
      <span className="section-label" style={{ display: 'block', marginBottom: 10 }}>Top Ranked Files</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {result.rankedFiles.slice(0, 15).map(file => (
          <div
            key={file.path}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 8px',
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            onClick={() => onFileOpen?.(file.path)}
          >
            <span style={{
              width: 22, height: 22,
              borderRadius: 5,
              background: 'var(--bg-elevated)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
              flexShrink: 0,
            }}>
              {file.rank}
            </span>

            <span style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: EXT_COLORS[file.extension] ?? '#8b949e',
            }} />

            <span style={{
              flex: 1, fontFamily: 'var(--font-mono)', fontSize: 11,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              color: 'var(--text-primary)',
            }}>
              {getBasename(file.path)}
            </span>

            {/* Score badge */}
            <span style={{
              fontSize: 11, fontFamily: 'var(--font-mono)',
              color: 'var(--cyan)', fontWeight: 600, flexShrink: 0,
            }}>
              {file.score}
            </span>

            <div style={{ width: 50, height: 4, background: 'var(--bg-hover)', borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
              <div style={{
                height: '100%',
                width: `${file.score}%`,
                background: 'var(--accent-grad)',
                borderRadius: 2,
              }} />
            </div>

            <ExternalLink size={11} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          </div>
        ))}
      </div>
    </FeatureCard>
  )
}
