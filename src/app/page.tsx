'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  GitBranch, Search, Zap, Code2, BarChart3, Map, Brain,
  ArrowRight, Github, CheckCircle2, ChevronRight
} from 'lucide-react'


const FEATURES = [
  {
    icon: <Search size={20} />,
    title: 'Entry Point Detection',
    desc: '7 priority-ordered heuristics including package.json, build configs, Dockerfile CMD, and import graph centrality.',
    color: '#7c3aed',
  },
  {
    icon: <Code2 size={20} />,
    title: 'Project Type Detection',
    desc: '9 categories, 20+ frameworks — Frontend, Backend, Full-Stack, CLI, Library, Mobile, ML, DevOps, Monorepo.',
    color: '#06b6d4',
  },
  {
    icon: <Brain size={20} />,
    title: 'Business Logic Detection',
    desc: 'AST-driven scoring on import centrality, symbol export depth, outbound call diversity, and cyclomatic complexity.',
    color: '#7c3aed',
  },
  {
    icon: <BarChart3 size={20} />,
    title: 'Important Files Ranking',
    desc: 'Structural graph signals — in-degree, BFS distance from entry, logic score. No commit history noise.',
    color: '#06b6d4',
  },
  {
    icon: <Map size={20} />,
    title: 'Repository Tour',
    desc: '8-stop guided narrative with AI summaries, interactive import graph, syntax-highlighted code previews.',
    color: '#7c3aed',
  },
  {
    icon: <Zap size={20} />,
    title: 'Gemini AI Pipeline',
    desc: 'Natural language summaries for every module, entry point, and dependency via Gemini 1.5 Flash.',
    color: '#06b6d4',
  },
]

const WORKFLOW_STEPS = [
  {
    num: '01',
    title: 'Clone',
    desc: 'Securely clones the repo via simple-git',
    icon: <GitBranch size={16} />,
  },
  {
    num: '02',
    title: 'Index',
    desc: 'Builds a full repository index with file tree, language stats, and config detection',
    icon: <Search size={16} />,
  },
  {
    num: '03',
    title: 'Parse',
    desc: 'Generates AST and import graph across all source files',
    icon: <Code2 size={16} />,
  },
  {
    num: '04',
    title: 'Analyze',
    desc: 'Runs 5 parallel analyzers — entry point, project type, business logic, file ranking, and tour generation',
    icon: <Brain size={16} />,
  },
  {
    num: '05',
    title: 'Enrich',
    desc: 'Gemini AI generates natural language summaries for every module, dependency, and relationship',
    icon: <Zap size={16} />,
  },
]

export default function HomePage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function validate(value: string): boolean {
    const cleaned = value.trim()
    return /^https?:\/\/(github|gitlab|bitbucket)\.(com|org)\/[\w.-]+\/[\w.-]+/.test(cleaned) ||
           /^git@(github|gitlab|bitbucket)\.(com|org):[\w.-]+\/[\w.-]+/.test(cleaned)
  }

  function handleAnalyze() {
    const trimmed = url.trim()
    if (!trimmed) { setError('Please enter a repository URL'); return }
    if (!validate(trimmed)) { setError('Enter a valid GitHub, GitLab, or Bitbucket URL'); return }

    setError('')
    setLoading(true)
    router.push(`/analyze?url=${encodeURIComponent(trimmed)}`)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleAnalyze()
  }

  return (
    <>
      {/* Animated background */}
      <div className="hero-bg" />
      <div className="hero-grid" />

      <main style={{ minHeight: '100vh', position: 'relative' }}>
        {/* ── Nav (Glass Effect) ──────────────────────────────────────────── */}
        <nav className="glass-nav">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--accent-grad)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <GitBranch size={16} color="#fff" />
            </div>
            <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em' }}>
              Repo<span className="gradient-text">Lens</span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              AST · Import Graph · AI
            </span>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
              style={{ textDecoration: 'none' }}
            >
              <Github size={14} />
              GitHub
            </a>
            <a
              href="https://digitalheroesco.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                textDecoration: 'none',
                background: 'var(--accent-grad)',
                color: '#fff',
                padding: '6px 14px',
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 13,
                marginLeft: 4,
              }}
            >
              Built for Digital Heroes
            </a>
          </div>
        </nav>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '100px 24px 60px',
          maxWidth: 900,
          margin: '0 auto',
        }}>
          {/* Eyebrow */}
          <div className="badge badge-info" style={{ marginBottom: 24 }}>
            <Zap size={10} />
            AST · Import Graph · Gemini AI · SSE Streaming
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(36px, 7vw, 72px)',
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: '-0.04em',
            marginBottom: 20,
          }}>
            Deep code intelligence
            <br />
            for <span className="gradient-text">any repository</span>
          </h1>

          {/* Catchy tagline - replaces the long paragraph */}
          <p style={{
            fontSize: 20,
            color: 'var(--text-secondary)',
            maxWidth: 600,
            lineHeight: 1.6,
            marginBottom: 24,
            fontWeight: 500,
          }}>
            Paste a repo URL. Get full architecture insights in under a minute.
          </p>

          {/* Author Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 48,
            padding: '8px 20px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-muted)',
            borderRadius: 100,
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          }}>
            <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>Agnijit Basu</span>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--text-muted)' }} />
            <a href="mailto:basu.agnijit@gmail.com" style={{ fontSize: 14, color: 'var(--violet-light)', textDecoration: 'none', fontWeight: 500 }}>
              basu.agnijit@gmail.com
            </a>
          </div>

          {/* URL input */}
          <div style={{
            width: '100%',
            maxWidth: 660,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                ref={inputRef}
                id="repo-url-input"
                className="input-url"
                type="text"
                placeholder="https://github.com/owner/repository"
                value={url}
                onChange={e => { setUrl(e.target.value); setError('') }}
                onKeyDown={handleKeyDown}
                style={{ flex: 1 }}
                autoFocus
              />
              <button
                id="analyze-button"
                className="btn-primary"
                onClick={handleAnalyze}
                disabled={loading}
                style={{ flexShrink: 0 }}
              >
                {loading ? (
                  <span style={{ opacity: 0.8 }}>Starting…</span>
                ) : (
                  <>Analyze <ArrowRight size={15} /></>
                )}
              </button>
            </div>

            {error && (
              <p style={{ fontSize: 13, color: 'var(--red)', textAlign: 'left' }}>
                {error}
              </p>
            )}
          </div>
        </section>

        {/* ── How it works (Workflow Section) ────────────────────────────── */}
        <section style={{ padding: '0 24px 80px', maxWidth: 1000, margin: '0 auto' }}>
          <div style={{
            textAlign: 'center',
            marginBottom: 40,
          }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>
              How it <span className="gradient-text">works</span>
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              From URL to full intelligence in 5 steps
            </p>
          </div>

          <div className="workflow-grid">
            {WORKFLOW_STEPS.map((step, i) => (
              <div key={step.num} className="workflow-step" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="workflow-step-header">
                  <div className="workflow-step-num">{step.num}</div>
                  <div className="workflow-step-icon">{step.icon}</div>
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {step.desc}
                </p>
                {i < WORKFLOW_STEPS.length - 1 && (
                  <div className="workflow-connector">
                    <ChevronRight size={14} color="var(--text-muted)" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Feature Cards ─────────────────────────────────────────────── */}
        <section style={{ padding: '0 24px 120px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{
            textAlign: 'center',
            marginBottom: 48,
          }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 12 }}>
              Five intelligence panels
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
              Every panel draws from the same Repository Index — built once, queried by all.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 16,
          }}>
            {FEATURES.map((f, i) => (
              <div key={f.title} className="glass-card" style={{ padding: 24 }}>
                <div style={{
                  width: 40, height: 40,
                  borderRadius: 10,
                  background: `${f.color}22`,
                  border: `1px solid ${f.color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 16,
                  color: f.color,
                }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <footer style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '24px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 13,
          color: 'var(--text-muted)',
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Agnijit Basu</span>
            <a href="mailto:basu.agnijit@gmail.com" style={{ color: 'var(--violet-light)', textDecoration: 'none' }}>
              basu.agnijit@gmail.com
            </a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <span>RepoLens — Deep Code Intelligence</span>
            <span>simple-git · ts-morph · Gemini AI · Next.js</span>
          </div>
        </footer>
      </main>
    </>
  )
}
