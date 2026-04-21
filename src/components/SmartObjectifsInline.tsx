import { memo, useState } from 'react'

interface SmartObjectifItem {
  id: number
  titre: string
  cible: string
  dateCible: string
}

interface SmartObjectifsInlineProps {
  objectifs: SmartObjectifItem[]
  onChange: (objectifs: SmartObjectifItem[]) => void
}

export const SmartObjectifsInline = memo(function SmartObjectifsInline({ objectifs, onChange }: SmartObjectifsInlineProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [titre, setTitre] = useState('')
  const [cible, setCible] = useState('')
  const [dateCible, setDateCible] = useState('')

  const handleAdd = () => {
    if (!titre.trim()) return
    onChange([...objectifs, { id: Date.now(), titre: titre.trim(), cible: cible.trim(), dateCible }])
    setTitre('')
    setCible('')
    setDateCible('')
    setShowAdd(false)
  }

  const removeObj = (id: number) => onChange(objectifs.filter(o => o.id !== id))

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.82rem',
    border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)',
    marginBottom: 6, boxSizing: 'border-box', color: 'var(--text-main)',
    background: '#FDFCFA',
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4l2 2"/>
          </svg>
        </div>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-dark)' }}>Objectifs SMART</div>
      </div>

      {/* Liste des objectifs existants */}
      {objectifs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {objectifs.map(obj => (
            <div key={obj.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '0.6rem 0.75rem',
              background: '#FDFCFA', border: '1px solid var(--border-color)',
              borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2, flexShrink: 0 }}>
                <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--primary-dark)' }}>{obj.titre}</div>
                {obj.cible && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{obj.cible}</div>}
                {obj.dateCible && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>Cible : {obj.dateCible}</div>}
              </div>
              <button onClick={() => removeObj(obj.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 2, flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Formulaire d'ajout */}
      {showAdd ? (
        <div style={{ background: '#FDFCFA', border: '1px solid var(--border-color)', borderRadius: 12, padding: '0.75rem', marginBottom: 6, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <input value={titre} onChange={e => setTitre(e.target.value)}
            placeholder="Objectif (ex: Récupérer la flexion complète)"
            style={fieldStyle} />
          <input value={cible} onChange={e => setCible(e.target.value)}
            placeholder="Cible mesurable (ex: Flexion > 120° à J30)"
            style={fieldStyle} />
          <input type="date" value={dateCible} onChange={e => setDateCible(e.target.value)}
            style={{ ...fieldStyle, marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleAdd} disabled={!titre.trim()}
              style={{
                flex: 1, padding: '0.5rem', borderRadius: 10, border: 'none',
                background: titre.trim() ? 'var(--primary)' : 'var(--secondary)',
                color: titre.trim() ? 'white' : 'var(--text-muted)',
                fontWeight: 700, fontSize: '0.82rem',
                cursor: titre.trim() ? 'pointer' : 'not-allowed',
                boxShadow: titre.trim() ? '0 2px 6px rgba(45,90,75,0.2)' : 'none',
              }}>
              Ajouter
            </button>
            <button onClick={() => setShowAdd(false)}
              style={{ padding: '0.5rem 0.85rem', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)}
          style={{
            width: '100%', padding: '0.55rem', borderRadius: 10,
            border: '1.5px solid var(--border-color)',
            background: '#FDFCFA', color: 'var(--primary)',
            fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
          <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>+</span> Ajouter un objectif
        </button>
      )}
    </div>
  )
})
