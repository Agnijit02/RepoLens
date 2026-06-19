'use client'

import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Play, Pause,
  Map, Globe, GitBranch, Brain, Package, Network,
  Settings, Terminal, Share2
} from 'lucide-react'
import type { TourStop, ProjectTypeResult } from '@/lib/types'
import { DirectoryTree } from '@/components/ui/DirectoryTree'
import { getBasename } from '@/lib/pathUtils'

interface RepoTourProps {
  stops: TourStop[]
  aiSummaries?: Record<string, Record<string, string>>   // stopId → key → summary
  onFileOpen?: (path: string) => void
}

const STOP_ICONS = [Globe, GitBranch, Map, Brain, Package, Network, Settings, Terminal]

export function RepoTour({ stops, aiSummaries = {}, onFileOpen }: RepoTourProps) {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(1)

  const total = stops.length

  const go = useCallback((idx: number) => {
    setDirection(idx > current ? 1 : -1)
    setCurrent(Math.max(0, Math.min(total - 1, idx)))
  }, [current, total])

  const prev = () => go(current - 1)
  const next = () => go(current + 1)

  // Keyboard navigation
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft')  prev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  // URL hash sync
  useEffect(() => {
    window.location.hash = `#tour/${current + 1}`
  }, [current])

  const stop = stops[current]
  if (!stop) return null

  const Icon = STOP_ICONS[current] ?? Map

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg-card)',
        borderRadius: 16,
        border: '1px solid var(--border-muted)',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--accent-grad)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff',
          }}>
            <Map size={15} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Repository Tour</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              Stop {current + 1} of {total}
            </div>
          </div>
        </div>
      </div>

      {/* ── Progress dots ────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '10px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}
      >
        {/* Progress bar */}
        <div style={{ flex: 1, maxWidth: 300, marginRight: 12 }}>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${((current + 1) / total) * 100}%` }} />
          </div>
        </div>

        {stops.map((s, i) => (
          <button
            key={s.id}
            className={`tour-step-dot ${i === current ? 'active' : ''}`}
            onClick={() => go(i)}
            title={s.title}
            style={{ border: 'none', cursor: 'pointer', flexShrink: 0 }}
          />
        ))}
      </div>

      {/* ── Stop Content ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            initial={{ x: direction * 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -60, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            style={{ padding: 24, height: '100%' }}
          >
            {/* Stop header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'var(--accent-grad)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', flexShrink: 0,
              }}>
                <Icon size={20} />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  {stop.title}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                  {stop.subtitle}
                </div>
              </div>
            </div>

            {/* Render stop content */}
            <StopContent stop={stop} aiSummaries={aiSummaries} onFileOpen={onFileOpen} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          borderTop: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}
      >
        <button
          className="btn-ghost"
          onClick={prev}
          disabled={current === 0}
          style={{ opacity: current === 0 ? 0.4 : 1 }}
        >
          <ChevronLeft size={14} /> Previous
        </button>

        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Use ← → keys to navigate
        </span>

        <button
          className="btn-ghost"
          onClick={next}
          disabled={current === total - 1}
          style={{ opacity: current === total - 1 ? 0.4 : 1 }}
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Stop content renderers
// ─────────────────────────────────────────────────────────────────────────────

function StopContent({
  stop,
  aiSummaries,
  onFileOpen,
}: {
  stop: TourStop
  aiSummaries: Record<string, Record<string, string>>
  onFileOpen?: (path: string) => void
}) {
  switch (stop.type) {
    case 'overview': return <OverviewStop data={stop.data} />
    case 'entry-point': return <EntryPointStop data={stop.data} aiSummaries={aiSummaries[2] ?? {}} onFileOpen={onFileOpen} />
    case 'structure': return <StructureStop data={stop.data} onFileOpen={onFileOpen} />
    case 'business-logic': return <BusinessLogicStop data={stop.data} aiSummaries={aiSummaries[4] ?? {}} onFileOpen={onFileOpen} />
    case 'dependencies': return <DepsStop data={stop.data} aiSummaries={aiSummaries[5] ?? {}} />
    case 'relationships': return <RelationsStop data={stop.data} />
    case 'config': return <ConfigStop data={stop.data} />
    case 'how-to-run': return <HowToRunStop data={stop.data} />
    default: return null
  }
}

function StatBox({ value, label }: { value: string | number; label: string }) {
  return (
    <div style={{
      padding: '14px 18px', background: 'var(--bg-elevated)',
      border: '1px solid var(--border-subtle)', borderRadius: 10,
    }}>
      <div style={{ fontSize: 26, fontWeight: 800, background: 'var(--accent-grad)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
    </div>
  )
}

function OverviewStop({ data }: { data: any }) {
  const { metadata, projectType, stats } = data
  return (
    <div>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20 }}>
        {metadata.description || `${metadata.name} is a ${projectType.primaryType} project built with ${projectType.framework || 'unknown technologies'}.`}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        <StatBox value={stats.files.toLocaleString()} label="Source files" />
        <StatBox value={stats.lines.toLocaleString()} label="Lines of code" />
        <StatBox value={stats.languages} label="Languages" />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <span className="badge badge-info">{projectType.primaryType}</span>
        {projectType.framework && <span className="badge badge-neutral">{projectType.framework}</span>}
        {projectType.secondaryTypes.map((t: string) => <span key={t} className="badge badge-neutral">{t}</span>)}
      </div>
    </div>
  )
}

function EntryPointStop({ data, aiSummaries, onFileOpen }: { data: any; aiSummaries: Record<string, string>; onFileOpen?: (p: string) => void }) {
  const { result } = data
  const summary = aiSummaries.entryPoint
  const basename = result.primaryFile?.split(/[/\\]/).pop() ?? '—'
  return (
    <div>
      <div
        onClick={() => result.primaryFile && onFileOpen?.(result.primaryFile)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', background: 'var(--bg-elevated)',
          border: '1px solid var(--border-muted)', borderRadius: 10,
          marginBottom: 16, cursor: result.primaryFile ? 'pointer' : 'default',
        }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600, color: 'var(--violet-light)' }}>{basename}</span>
      </div>
      {summary && (
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>{summary}</p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {result.signalsFired?.slice(0, 4).map((s: any, i: number) => (
          <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
            <span style={{ color: 'var(--green)', flexShrink: 0 }}>✓</span>
            <span style={{ color: 'var(--text-secondary)' }}>{s.name} — <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{s.description}</span></span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StructureStop({ data, onFileOpen }: { data: any; onFileOpen?: (p: string) => void }) {
  return (
    <div style={{ fontFamily: 'var(--font-mono)' }}>
      <DirectoryTree
        nodes={data.tree}
        onFileClick={n => onFileOpen?.(n.absolutePath)}
        folderDescriptions={data.folderDescriptions}
      />
    </div>
  )
}

function BusinessLogicStop({ data, aiSummaries, onFileOpen }: { data: any; aiSummaries: Record<string, string>; onFileOpen?: (p: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.modules?.slice(0, 4).map((mod: any) => (
        <div key={mod.directory} style={{ padding: '12px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{mod.label}</div>
          {aiSummaries[mod.directory] && <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>{aiSummaries[mod.directory]}</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {mod.files?.slice(0, 4).map((f: any) => (
              <span key={f.path} onClick={() => onFileOpen?.(f.path)} style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 6px', background: 'var(--bg-hover)', borderRadius: 3, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                {getBasename(f.path)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function DepsStop({ data, aiSummaries }: { data: any; aiSummaries: Record<string, string> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.topDeps?.map(({ name, version }: { name: string; version: string }) => (
        <div key={name} style={{ padding: '10px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13 }}>{name}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{version}</span>
          </div>
          {aiSummaries[name] && <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{aiSummaries[name]}</p>}
        </div>
      ))}
    </div>
  )
}

function RelationsStop({ data }: { data: any }) {
  const { nodes, links } = data.graph
  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🕸️</div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
        {nodes?.length ?? 0} nodes · {links?.length ?? 0} connections
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
        The full interactive D3 force graph is available in the Relationships tab.
        Switch there to explore import connections visually.
      </p>
    </div>
  )
}

function ConfigStop({ data }: { data: any }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.files?.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No infrastructure files detected.</p>}
      {data.files?.map((f: any) => (
        <div key={f.path} style={{ padding: 14, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 12 }}>{f.path}</span>
            <span className="badge badge-neutral">{f.purpose}</span>
          </div>
          <pre className="code-block" style={{ fontSize: 10, maxHeight: 120, overflow: 'auto' }}>{f.preview}</pre>
        </div>
      ))}
    </div>
  )
}

function CmdBox({ label, cmd }: { label: string; cmd?: string }) {
  if (!cmd) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span className="section-label">{label}</span>
      <pre className="code-block" style={{ fontSize: 12, padding: '10px 14px' }}>$ {cmd}</pre>
    </div>
  )
}

function HowToRunStop({ data }: { data: any }) {
  const { install, dev, build, test, otherScripts } = data
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <CmdBox label="Install dependencies" cmd={install} />
      <CmdBox label="Start dev server" cmd={dev} />
      {build && <CmdBox label="Build for production" cmd={build} />}
      {test && <CmdBox label="Run tests" cmd={test} />}
      {Object.entries(otherScripts ?? {}).slice(0, 4).map(([key, cmd]) => (
        <CmdBox key={key} label={key} cmd={`npm run ${key}`} />
      ))}
    </div>
  )
}
