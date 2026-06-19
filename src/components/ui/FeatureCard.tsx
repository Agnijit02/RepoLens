'use client'

import type { ReactNode } from 'react'
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react'

interface FeatureCardProps {
  title: string
  icon: ReactNode
  status?: 'loading' | 'ready' | 'error'
  accentColor?: string
  children: ReactNode
  style?: React.CSSProperties
}

export function FeatureCard({
  title,
  icon,
  status = 'ready',
  accentColor = '#7c3aed',
  children,
  style,
}: FeatureCardProps) {
  return (
    <div
      className="glass-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: `${accentColor}22`,
              border: `1px solid ${accentColor}40`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: accentColor,
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
        </div>

        <StatusIcon status={status} />
      </div>

      {/* Body */}
      <div style={{ padding: 20, flex: 1, overflow: 'auto' }}>
        {children}
      </div>
    </div>
  )
}

function StatusIcon({ status }: { status: 'loading' | 'ready' | 'error' }) {
  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12 }}>
        <Clock size={13} className="spin" />
        Analysing…
      </div>
    )
  }
  if (status === 'error') {
    return <AlertCircle size={16} color="var(--red)" />
  }
  return <CheckCircle2 size={16} color="var(--green)" />
}
