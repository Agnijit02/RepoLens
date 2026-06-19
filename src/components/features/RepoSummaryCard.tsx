'use client'

import { Sparkles, Tag, Cpu, Layers } from 'lucide-react'
import { FeatureCard } from '@/components/ui/FeatureCard'
import { useMemo } from 'react'

interface Props {
  summary?: string
  repoUrl: string
}

interface StructuredSummary {
  appCategory: string
  whatItDoes: string
  techStack: string[]
  corePurpose: string
}

function parseSummary(raw: string): StructuredSummary | null {
  try {
    // Strip markdown code fences if present
    let cleaned = raw.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '')
    }
    const parsed = JSON.parse(cleaned)
    if (parsed.appCategory && parsed.whatItDoes && parsed.techStack) {
      return parsed as StructuredSummary
    }
    return null
  } catch {
    return null
  }
}

// Category color map for visual flair
const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'E-Commerce':        { bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.35)', text: '#fb923c' },
  'Social Media':      { bg: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.35)', text: '#f472b6' },
  'SaaS Platform':     { bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.35)', text: '#818cf8' },
  'Developer Tool':    { bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.35)',  text: '#4ade80' },
  'Portfolio/Blog':    { bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.35)', text: '#c084fc' },
  'CMS':               { bg: 'rgba(14,165,233,0.15)', border: 'rgba(14,165,233,0.35)', text: '#38bdf8' },
  'Dashboard/Admin':   { bg: 'rgba(20,184,166,0.15)', border: 'rgba(20,184,166,0.35)', text: '#2dd4bf' },
  'Chat/Messaging':    { bg: 'rgba(244,63,94,0.15)',  border: 'rgba(244,63,94,0.35)',  text: '#fb7185' },
  'Streaming Platform':{ bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.35)',  text: '#f87171' },
  'Fintech':           { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.35)', text: '#fbbf24' },
  'Healthcare':        { bg: 'rgba(6,182,212,0.15)',  border: 'rgba(6,182,212,0.35)',  text: '#22d3ee' },
  'Education':         { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.35)', text: '#60a5fa' },
  'Gaming':            { bg: 'rgba(217,70,239,0.15)', border: 'rgba(217,70,239,0.35)', text: '#e879f9' },
  'API Service':       { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.35)', text: '#34d399' },
  'Data Analytics':    { bg: 'rgba(251,146,60,0.15)', border: 'rgba(251,146,60,0.35)', text: '#fdba74' },
  'AI/ML Tool':        { bg: 'rgba(124,58,237,0.15)', border: 'rgba(124,58,237,0.35)', text: '#a78bfa' },
  'Library/Framework': { bg: 'rgba(6,182,212,0.15)',  border: 'rgba(6,182,212,0.35)',  text: '#67e8f9' },
  'Mobile App':        { bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.35)', text: '#c084fc' },
  'CLI Tool':          { bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.35)',  text: '#4ade80' },
  'DSA/Algorithms':    { bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.35)', text: '#fbbf24' },
  'Community Platform':{ bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.35)', text: '#fb923c' },
  'Marketplace':       { bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.35)', text: '#fb923c' },
  'Booking Platform':  { bg: 'rgba(14,165,233,0.15)', border: 'rgba(14,165,233,0.35)', text: '#38bdf8' },
  'Food/Delivery':     { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.35)',  text: '#f87171' },
  'Fitness/Health':    { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.35)', text: '#34d399' },
  'Travel':            { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.35)', text: '#60a5fa' },
  'Real Estate':       { bg: 'rgba(20,184,166,0.15)', border: 'rgba(20,184,166,0.35)', text: '#2dd4bf' },
  'News/Media':        { bg: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.35)', text: '#f472b6' },
}

const DEFAULT_COLOR = { bg: 'rgba(139,148,158,0.15)', border: 'rgba(139,148,158,0.35)', text: '#94a3b8' }

export function RepoSummaryCard({ summary, repoUrl }: Props) {
  const structured = useMemo(() => summary ? parseSummary(summary) : null, [summary])

  return (
    <FeatureCard
      title="Repository AI Summary"
      icon={<Sparkles size={16} />}
      accentColor="#8b5cf6"
      style={{ gridColumn: '1 / -1' }}
    >
      {summary ? (
        structured ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Row 1: Category Badge + What it does */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
              {/* Category badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 20,
                background: (CATEGORY_COLORS[structured.appCategory] ?? DEFAULT_COLOR).bg,
                border: `1px solid ${(CATEGORY_COLORS[structured.appCategory] ?? DEFAULT_COLOR).border}`,
                color: (CATEGORY_COLORS[structured.appCategory] ?? DEFAULT_COLOR).text,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                flexShrink: 0,
              }}>
                <Tag size={11} />
                {structured.appCategory}
              </div>

              {/* One-liner */}
              <div style={{
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--text-primary)',
                lineHeight: 1.5,
                flex: 1,
                minWidth: 200,
              }}>
                {structured.whatItDoes}
              </div>
            </div>

            {/* Row 2: Tech Stack */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 10,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}>
                <Cpu size={12} />
                Tech Stack
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {structured.techStack.map((tech) => (
                  <span key={tech} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '5px 12px',
                    borderRadius: 6,
                    background: 'rgba(124,58,237,0.10)',
                    border: '1px solid rgba(124,58,237,0.25)',
                    color: 'var(--violet-light)',
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '-0.01em',
                  }}>
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* Row 3: Core Purpose */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 8,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}>
                <Layers size={12} />
                Purpose
              </div>
              <div style={{
                fontSize: 14,
                lineHeight: 1.7,
                color: 'var(--text-secondary)',
              }}>
                {structured.corePurpose}
              </div>
            </div>
          </div>
        ) : (
          /* Fallback: plain text if JSON parsing failed */
          <div style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: 'var(--text-primary)',
            whiteSpace: 'pre-wrap',
          }}>
            {summary}
          </div>
        )
      ) : (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' }}>
          Generating repository summary...
        </div>
      )}
    </FeatureCard>
  )
}
