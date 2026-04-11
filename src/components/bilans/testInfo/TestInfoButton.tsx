import { useState } from 'react'
import { TEST_INFO } from './TEST_INFO'

export function TestInfoButton({ testKey, ariaLabel }: { testKey: string; ariaLabel?: string }) {
  const [open, setOpen] = useState(false)
  const info = TEST_INFO[testKey]
  if (!info) return null

  return (
    <>
      <button
        onClick={e => { e.stopPropagation(); setOpen(true) }}
        title={`En savoir plus : ${info.title}`}
        aria-label={ariaLabel ?? `Infos sur ${info.title}`}
        style={{
          width: 16, height: 16, minWidth: 16,
          borderRadius: '50%',
          border: '1.5px solid var(--primary)',
          background: 'transparent',
          color: 'var(--primary)',
          fontSize: '0.62rem',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
          padding: 0,
          marginLeft: 6,
          verticalAlign: 'middle',
          flexShrink: 0,
          fontFamily: 'Georgia, serif',
          fontStyle: 'italic',
        }}
      >
        i
      </button>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: 'var(--radius-xl)', width: '100%',
              maxWidth: 560, maxHeight: '85vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 24px 64px rgba(15, 23, 42, 0.3)', overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{ padding: '1rem 1.2rem 0.8rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{info.title}</h3>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                style={{ background: 'none', border: 'none', fontSize: '1.3rem', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {/* Body scrollable */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.9rem 1.2rem 1.1rem' }}>
              <Section title="Description" body={info.description} accent="var(--primary)" />
              <Section title="Réalisation" body={info.realisation} accent="#7c3aed" />
              <Section title="Interprétation" body={info.interpretation} accent="#059669" />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Section({ title, body, accent }: { title: string; body: string; accent: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: '0.7rem', fontWeight: 700, color: accent,
        textTransform: 'uppercase', letterSpacing: '0.05em',
        marginBottom: 4,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent, display: 'inline-block' }} />
        {title}
      </div>
      <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-main)', lineHeight: 1.5 }}>{body}</p>
    </div>
  )
}
