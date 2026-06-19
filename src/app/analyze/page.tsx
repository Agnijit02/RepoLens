'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  GitBranch, Search, Code2, Brain, BarChart3, Map, Network,
  ArrowLeft, ExternalLink, Loader2, AlertCircle, RefreshCw,
} from 'lucide-react'
import type {
  SSEEvent,
  EntryPointResult,
  ProjectTypeResult,
  BusinessLogicModule,
  FileRankingResult,
  TourStop,
} from '@/lib/types'

import { EntryPointCard }    from '@/components/features/EntryPointCard'
import { ProjectTypeCard }   from '@/components/features/ProjectTypeCard'
import { BusinessLogicCard } from '@/components/features/BusinessLogicCard'
import { FileRankingCard }   from '@/components/features/FileRankingCard'
import { RepoSummaryCard }   from '@/components/features/RepoSummaryCard'
import { RepoTour }          from '@/components/RepoTour'
import { MonacoViewer }      from '@/components/MonacoViewer'
import { CardSkeleton, ProgressSkeleton } from '@/components/ui/LoadingSkeleton'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface AnalysisState {
  stage:        string
  progress:     number
  detail:       string
  entryPoint?:  EntryPointResult
  projectType?: ProjectTypeResult
  businessLogic?: { modules: BusinessLogicModule[] }
  fileRanking?: FileRankingResult
  tour?:        { stops: TourStop[] }
  aiSummaries:  Record<string, Record<string, string>>   // stopId → key → text
  done:         boolean
  error?:       string
  totalTime?:   number
}

// ─────────────────────────────────────────────────────────────────────────────
// Tabs
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',  label: 'Overview',       icon: <GitBranch size={13} /> },
  { id: 'tour',      label: 'Repository Tour', icon: <Map size={13} /> },
  { id: 'type',      label: 'Project Type',    icon: <Code2 size={13} /> },
  { id: 'logic',     label: 'Business Logic',  icon: <Brain size={13} /> },
  { id: 'ranking',   label: 'File Ranking',    icon: <BarChart3 size={13} /> },
]

// ─────────────────────────────────────────────────────────────────────────────
// Analysis Page (wrapped in Suspense for useSearchParams)
// ─────────────────────────────────────────────────────────────────────────────

function AnalysisPageInner() {
  const params = useSearchParams()
  const router = useRouter()
  const url    = params.get('url') ?? ''

  const [state, setState] = useState<AnalysisState>({
    stage: 'idle', progress: 0, detail: '', aiSummaries: {}, done: false,
  })
  const [tab, setTab] = useState<string>('overview')

  // Monaco file viewer
  const [openFile, setOpenFile] = useState<{ path: string; content: string } | null>(null)

  const esRef = useRef<EventSource | null>(null)
  const started = useRef(false)

  // ── Start SSE stream ────────────────────────────────────────────────────
  useEffect(() => {
    if (!url || started.current) return
    started.current = true

    console.log('[RepoLens] Connecting to analysis stream for:', url)
    const es = new EventSource(`/api/stream?url=${encodeURIComponent(url)}`)
    esRef.current = es

    es.onopen = () => {
      console.log('[RepoLens] SSE stream connection established.')
    }

    es.onmessage = (event) => {
      const data: SSEEvent = JSON.parse(event.data)
      console.log('[RepoLens] Stream event received:', data.type, data)
      handleEvent(data)
    }
    es.onerror = () => {
      // EventSource fires onerror when the server closes the connection (normal end-of-stream).
      // Only treat it as a real error if readyState is CONNECTING (0) and we haven't received 'done'.
      if (es.readyState === EventSource.CLOSED) return  // normal close — ignore
      setState(s => {
        if (s.done) return s  // already finished — server just closed the socket
        return { ...s, error: 'Connection error — the stream was interrupted.', done: true }
      })
      es.close()
    }

    return () => { 
      console.log('[RepoLens] Cleaning up analysis stream.')
      es.close()
      esRef.current = null 
      started.current = false
    }
  }, [url])

  function handleEvent(event: SSEEvent) {
    setState(prev => {
      const next = { ...prev }

      switch (event.type) {
        case 'stage':
          next.stage    = event.stage
          next.progress = event.progress
          next.detail   = event.detail ?? ''
          break

        case 'feature':
          if (event.feature === 'entryPoint')    { next.entryPoint    = event.result; setTab('entry') }
          if (event.feature === 'projectType')   { next.projectType   = event.result }
          if (event.feature === 'businessLogic') { next.businessLogic = event.result }
          if (event.feature === 'fileRanking')   { next.fileRanking   = event.result }
          if (event.feature === 'tour')          { next.tour          = event.result }
          break

        case 'ai_summary': {
          const stopKey = String(event.stopId)
          next.aiSummaries = {
            ...prev.aiSummaries,
            [stopKey]: {
              ...(prev.aiSummaries[stopKey] ?? {}),
              [event.key]: event.summary,
            },
          }
          break
        }

        case 'done':
          next.done      = true
          next.stage     = 'complete'
          next.progress  = 100
          next.detail    = 'Analysis complete'
          next.totalTime = event.totalTime
          esRef.current?.close()
          break

        case 'error':
          next.error = event.message
          next.done  = true
          esRef.current?.close()
          break
      }

      return next
    })
  }

  // ── Open file in Monaco ─────────────────────────────────────────────────
  async function handleFileOpen(filePath: string) {
    try {
      const res = await fetch(`/api/file?url=${encodeURIComponent(url)}&path=${encodeURIComponent(filePath)}`)
      if (!res.ok) throw new Error(await res.text())
      const content = await res.text()
      setOpenFile({ path: filePath, content })
    } catch (err) {
      console.error('Failed to load file:', err)
    }
  }

  // ── Reload / re-analyze ─────────────────────────────────────────────────
  function handleReload() {
    // Close any existing connection
    esRef.current?.close()
    esRef.current = null
    started.current = false

    // Reset state
    setState({ stage: 'idle', progress: 0, detail: '', aiSummaries: {}, done: false })
    setOpenFile(null)

    // Restart the stream after a tick (let React flush the state reset)
    setTimeout(() => {
      if (!url) return
      started.current = true
      console.log('[RepoLens] Re-analyzing:', url)
      const es = new EventSource(`/api/stream?url=${encodeURIComponent(url)}`)
      esRef.current = es

      es.onmessage = (event) => {
        const data: SSEEvent = JSON.parse(event.data)
        console.log('[RepoLens] Stream event received:', data.type, data)
        handleEvent(data)
      }
      es.onerror = () => {
        if (es.readyState === EventSource.CLOSED) return
        setState(s => {
          if (s.done) return s
          return { ...s, error: 'Connection error — the stream was interrupted.', done: true }
        })
        es.close()
      }
    }, 50)
  }

  // ── Derived data ────────────────────────────────────────────────────────
  const { owner, repo } = parseUrl(url)
  const isLoading       = !state.done
  const allReady        = state.done && !state.error
  const hasResults      = !!(state.entryPoint || state.projectType)

  // Auto-switch to overview once all data is loaded
  useEffect(() => {
    if (state.done && !state.error) setTab('overview')
  }, [state.done, state.error])

  // Scroll auto-hide for nav bar
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)
  const lastScrollY = useRef(0)

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const currentScrollY = e.currentTarget.scrollTop
    if (currentScrollY > lastScrollY.current && currentScrollY > 60) {
      // scrolling down
      setIsHeaderVisible(false)
    } else {
      // scrolling up
      setIsHeaderVisible(true)
    }
    lastScrollY.current = currentScrollY
  }

  return (
    <>
      {/* Background - dark black for glass effect */}
      <div className="analyze-bg" />
      <div className="analyze-bg-glow" />

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* ── Top bar (Glass Effect) ─────────────────────────────────── */}
        <div style={{
          overflow: 'hidden',
          maxHeight: isHeaderVisible ? 120 : 0,
          opacity: isHeaderVisible ? 1 : 0,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          flexShrink: 0,
        }}>
          <header className="glass-nav" style={{
            padding: '14px 28px',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button
                onClick={() => router.push('/')}
                style={{
                  background: 'none', border: 'none',
                  cursor: 'pointer', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center',
                  padding: 6, borderRadius: 6,
                  transition: 'color 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <ArrowLeft size={16} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: 'var(--accent-grad)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <GitBranch size={14} color="#fff" />
                </div>
                <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em' }}>
                  Repo<span className="gradient-text">Lens</span>
                </span>
              </div>

              <div style={{ height: 18, width: 1, background: 'var(--border-subtle)' }} />

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{owner}</span>
                  <span style={{ color: 'var(--text-muted)' }}>/</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--violet-light)' }}>{repo}</span>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--text-muted)', display: 'flex' }}
                  >
                    <ExternalLink size={12} />
                  </a>
                </div>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 1 }}>
                  {url}
                </div>
              </div>
            </div>

            {/* Status + Reload */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {isLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                  <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                  {state.detail || 'Analysing…'}
                </div>
              )}
              {state.done && !state.error && (
                <span className="badge badge-high">
                  ✓ Complete {state.totalTime ? `${(state.totalTime / 1000).toFixed(1)}s` : ''}
                </span>
              )}
              {state.error && (
                <span className="badge badge-low">
                  <AlertCircle size={10} /> Error
                </span>
              )}
              {state.done && (
                <button
                  id="reload-analysis-btn"
                  className="btn-ghost"
                  onClick={handleReload}
                  style={{ fontSize: 12, padding: '4px 10px' }}
                >
                  <RefreshCw size={12} /> Re-analyze
                </button>
              )}
            </div>
          </header>
        </div>

        {/* ── Progress strip ───────────────────────────────────────────── */}
        {isLoading && (
          <div style={{ padding: '12px 28px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(6,8,12,0.8)' }}>
            <ProgressSkeleton label={state.detail || state.stage} progress={state.progress} />
          </div>
        )}

        {/* ── Error banner ─────────────────────────────────────────────── */}
        {state.error && (
          <div style={{
            margin: 28,
            padding: '16px 20px',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--red)' }}>
              <AlertCircle size={16} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Analysis failed</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{state.error}</div>
              </div>
            </div>
            <button className="btn-ghost" onClick={() => router.push('/')}>
              <RefreshCw size={12} /> Try again
            </button>
          </div>
        )}

        {/* ── Tab bar (full width) ──────────────────────────────────── */}
        <div style={{ padding: '12px 28px 0', flexShrink: 0 }}>
          <div className="tab-bar" style={{ width: '100%' }}>
            {TABS.map(t => (
              <button
                key={t.id}
                className={`tab ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
                id={`tab-${t.id}`}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {t.icon}
                {t.label}
                {/* Ready dot */}
                {isReady(t.id, state) && (
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: 'var(--green)', flexShrink: 0,
                  }} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Main content ─────────────────────────────────────────────── */}
        <main
          style={{ flex: 1, padding: '20px 28px 40px', overflow: 'auto' }}
          onScroll={handleScroll}
        >
          {tab === 'overview' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
              gap: 16,
            }}>
              <RepoSummaryCard summary={state.aiSummaries['0']?.repo_summary} repoUrl={url} />
              {!state.projectType  ? <CardSkeleton /> : <ProjectTypeCard  result={state.projectType} />}
              {!state.businessLogic ? <CardSkeleton /> : <BusinessLogicCard modules={state.businessLogic.modules} aiSummaries={state.aiSummaries['4']} onFileOpen={handleFileOpen} />}
              {!state.fileRanking  ? <CardSkeleton /> : <FileRankingCard   result={state.fileRanking} onFileOpen={handleFileOpen} />}
            </div>
          )}

          {tab === 'type' && (
            state.projectType
              ? <ProjectTypeCard result={state.projectType} />
              : <CardSkeleton />
          )}

          {tab === 'logic' && (
            state.businessLogic
              ? <BusinessLogicCard modules={state.businessLogic.modules} aiSummaries={state.aiSummaries['4']} onFileOpen={handleFileOpen} />
              : <CardSkeleton />
          )}

          {tab === 'ranking' && (
            state.fileRanking
              ? <FileRankingCard result={state.fileRanking} onFileOpen={handleFileOpen} />
              : <CardSkeleton />
          )}

          {tab === 'tour' && (
            state.tour
              ? (
                <div style={{ height: 'calc(100vh - 240px)' }}>
                  <RepoTour
                    stops={state.tour.stops}
                    aiSummaries={state.aiSummaries}
                    onFileOpen={handleFileOpen}
                  />
                </div>
              )
              : <CardSkeleton />
          )}
        </main>
      </div>

      {/* ── Monaco viewer drawer ─────────────────────────────────────────── */}
      {openFile && (
        <MonacoViewer
          filePath={openFile.path}
          content={openFile.content}
          onClose={() => setOpenFile(null)}
        />
      )}

      {/* Spin keyframe */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function isReady(tabId: string, state: AnalysisState): boolean {
  switch (tabId) {
    case 'type':    return !!state.projectType
    case 'logic':   return !!state.businessLogic
    case 'ranking': return !!state.fileRanking
    case 'tour':    return !!state.tour
    case 'overview':return !!state.entryPoint
    default: return false
  }
}

function parseUrl(url: string): { owner: string; repo: string } {
  const match = url.replace(/\.git$/, '').match(/(?:github|gitlab|bitbucket)\.(?:com|org)[/:]([^/]+)\/([^/]+)/)
  return { owner: match?.[1] ?? '—', repo: match?.[2] ?? '—' }
}

// ─────────────────────────────────────────────────────────────────────────────
// Export with Suspense boundary (required for useSearchParams in App Router)
// ─────────────────────────────────────────────────────────────────────────────

export default function AnalyzePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--violet)' }} />
      </div>
    }>
      <AnalysisPageInner />
    </Suspense>
  )
}
