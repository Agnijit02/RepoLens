'use client'

/** Single shimmer bar — use width/height to control size */
export function SkeletonBar({
  width = '100%',
  height = 14,
  style,
}: {
  width?: string | number
  height?: string | number
  style?: React.CSSProperties
}) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: 4, ...style }}
    />
  )
}

/** Full feature card skeleton */
export function CardSkeleton() {
  return (
    <div className="glass-card" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 8 }} />
        <SkeletonBar width={140} height={14} />
      </div>

      {/* Body */}
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SkeletonBar width="80%" />
        <SkeletonBar width="60%" />
        <SkeletonBar width="90%" />
        <SkeletonBar width="50%" />
        <div style={{ height: 8 }} />
        <SkeletonBar width="70%" />
        <SkeletonBar width="85%" />
      </div>
    </div>
  )
}

/** Progress bar skeleton (used while stream is loading) */
export function ProgressSkeleton({ label, progress }: { label: string; progress: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          color: 'var(--text-muted)',
        }}
      >
        <span>{label}</span>
        <span>{progress}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}
