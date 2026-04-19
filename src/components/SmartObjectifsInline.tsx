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

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: '#fffbeb', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4l2 2"/>
          </svg>
        </div>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400e' }}>Objectifs SMART</div>
      </div>

      {/* Liste des objectifs existants */}
      {objectifs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {objectifs.map(obj => (
            <div key={obj.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '0.55rem 0.7rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2, flexShrink: 0 }}>
                <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#92400e' }}>{obj.titre}</div>
                {obj.cible && <div style={{ fontSize: '0.75rem', color: '#b45309' }}>{obj.cible}</div>}
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
        <div style={{ background: 'var(--surface)', border: '1.5px solid #fde68a', borderRadius: 10, padding: '0.7rem', marginBottom: 6 }}>
          <input value={titre} onChange={e => setTitre(e.target.value)}
            placeholder="Objectif (ex: Récupérer la flexion complète)"
            style={{ width: '100%', padding: '0.5rem 0.7rem', fontSize: '0.82rem', border: '1px solid var(--border-color)', borderRadius: 8, marginBottom: 6, boxSizing: 'border-box', color: 'var(--text-main)', background: 'var(--secondary)' }} />
          <input value={cible} onChange={e => setCible(e.target.value)}
            placeholder="Cible mesurable (ex: Flexion > 120° à J30)"
            style={{ width: '100%', padding: '0.5rem 0.7rem', fontSize: '0.82rem', border: '1px solid var(--border-color)', borderRadius: 8, marginBottom: 6, boxSizing: 'border-box', color: 'var(--text-main)', background: 'var(--secondary)' }} />
          <input type="date" value={dateCible} onChange={e => setDateCible(e.target.value)}
            style={{ width: '100%', padding: '0.5rem 0.7rem', fontSize: '0.82rem', border: '1px solid var(--border-color)', borderRadius: 8, marginBottom: 8, boxSizing: 'border-box', color: 'var(--text-main)', background: 'var(--secondary)' }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleAdd} disabled={!titre.trim()}
              style={{ flex: 1, padding: '0.5rem', borderRadius: 8, background: titre.trim() ? 'linear-gradient(135deg, #d97706, #b45309)' : 'var(--secondary)', border: 'none', color: titre.trim() ? 'white' : 'var(--text-muted)', fontWeight: 700, fontSize: '0.82rem', cursor: titre.trim() ? 'pointer' : 'not-allowed' }}>
              Ajouter
            </button>
            <button onClick={() => setShowAdd(false)}
              style={{ padding: '0.5rem 0.85rem', borderRadius: 8, background: 'var(--secondary)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)}
          style={{ width: '100%', padding: '0.5rem', borderRadius: 8, border: '1.5px dashed #fde68a', background: 'transparent', color: '#d97706', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>+</span> Ajouter un objectif
        </button>
      )}
    </div>
  )
})
