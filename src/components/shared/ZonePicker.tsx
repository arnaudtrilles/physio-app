export function ZoneIcon({ zone, size = 22, color = 'currentColor' }: { zone: string; size?: number; color?: string }) {
  const s = { width: size, height: size, fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (zone) {
    case 'Épaule': return (
      <svg viewBox="0 0 24 24" {...s}><path d="M12 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/><path d="M12 8v4"/><path d="M8 9c-3 1-5 3.5-5 6"/><path d="M16 9c3 1 5 3.5 5 6"/><path d="M8 9l-2 7"/><path d="M16 9l2 7"/></svg>
    )
    case 'Genou': return (
      <svg viewBox="0 0 24 24" {...s}><path d="M12 2v6"/><ellipse cx="12" cy="11" rx="4" ry="3"/><path d="M12 14v8"/><path d="M9 11c-1.5.5-2 2-1.5 3.5"/><path d="M15 11c1.5.5 2 2 1.5 3.5"/></svg>
    )
    case 'Hanche': return (
      <svg viewBox="0 0 24 24" {...s}><path d="M12 3v5"/><ellipse cx="12" cy="11" rx="6" ry="4"/><path d="M8 14l-3 8"/><path d="M16 14l3 8"/><circle cx="12" cy="11" r="1.5"/></svg>
    )
    case 'Cheville': return (
      <svg viewBox="0 0 24 24" {...s}><path d="M12 2v12"/><path d="M10 14c-2 1-3 3-3 5h10c0-2-1-4-3-5"/><path d="M7 19c-1 0-2 .5-2 2h14c0-1.5-1-2-2-2"/></svg>
    )
    case 'Cervicales': return (
      <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="5" r="3"/><path d="M12 8v14"/><path d="M9 10h6"/><path d="M8 13h8"/><path d="M9 16h6"/></svg>
    )
    case 'Rachis Lombaire': return (
      <svg viewBox="0 0 24 24" {...s}><path d="M12 2v20"/><path d="M8 5h8"/><path d="M7 8h10"/><path d="M6 11h12"/><path d="M7 14h10"/><path d="M8 17h8"/><path d="M9 20h6"/></svg>
    )
    case 'Gériatrie': return (
      <svg viewBox="0 0 24 24" {...s}><circle cx="11" cy="4" r="2.5"/><path d="M11 6.5v6"/><path d="M8 9l-2 5"/><path d="M14 9l2 3"/><path d="M11 12.5l-3 9"/><path d="M11 12.5l2 5"/><path d="M16 12l4 3"/><line x1="20" y1="15" x2="20" y2="22"/></svg>
    )
    case 'Drainage Lymphatique': return (
      <svg viewBox="0 0 24 24" {...s}><path d="M12 2C9 6 7 9 7 12a5 5 0 0 0 10 0c0-3-2-6-5-10z"/><path d="M12 14v6"/><path d="M9 18h6"/></svg>
    )
    default: return (
      <svg viewBox="0 0 24 24" {...s}><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/></svg>
    )
  }
}

export const ZONE_PICKER_ITEMS: Array<{ zone: string; label: string }> = [
  { zone: 'Épaule',          label: 'Épaule' },
  { zone: 'Genou',           label: 'Genou' },
  { zone: 'Hanche',          label: 'Hanche' },
  { zone: 'Cheville',        label: 'Cheville' },
  { zone: 'Cervicales',      label: 'Rachis Cervical' },
  { zone: 'Rachis Lombaire', label: 'Rachis Lombaire' },
  { zone: 'Gériatrie',       label: 'Gériatrie' },
  { zone: 'Drainage Lymphatique', label: 'Drainage Lymphatique' },
  { zone: 'Autre',           label: 'Bilan général' },
]

interface ZonePickerSheetProps {
  title: string
  accent: string
  accentBg: string
  accentBorder: string
  selectedZone?: string | null
  onSelect: (zone: string) => void
  onClose: () => void
}

export function ZonePickerSheet({ title, selectedZone, onSelect, onClose }: ZonePickerSheetProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 2000 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--base-bg)', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 430, boxShadow: '0 -8px 40px rgba(0,0,0,0.15)', padding: '0.5rem 1.1rem 2rem', maxHeight: '85vh', overflow: 'auto', animation: 'slideUp 0.32s cubic-bezier(0.32, 0.72, 0, 1)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-color)' }} />
        </div>
        <div style={{ marginBottom: '1.1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-dark)', letterSpacing: '-0.01em' }}>{title}</h3>
          <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Choisissez la zone anatomique du bilan</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ZONE_PICKER_ITEMS.map(({ zone, label }) => {
            const active = selectedZone === zone
            return (
              <button
                key={zone}
                onClick={() => onSelect(zone)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '0.85rem 1rem',
                  borderRadius: 14,
                  border: active ? '2px solid var(--primary)' : '1.5px solid transparent',
                  background: active ? 'var(--info-soft)' : 'var(--input-bg)',
                  color: active ? 'var(--primary-dark)' : 'var(--text-main)',
                  fontWeight: active ? 600 : 500,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.18s ease',
                  boxShadow: active ? '0 2px 10px rgba(45,90,75,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                  background: active ? 'var(--primary)' : 'var(--secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.18s',
                }}>
                  <ZoneIcon zone={zone} size={22} color={active ? 'white' : 'var(--primary)'} />
                </div>
                <span style={{ flex: 1 }}>{label}</span>
                {active && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
