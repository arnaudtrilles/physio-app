import { memo, useState } from 'react'
import type { SmartObjectif } from '../types'

interface SmartObjectifsProps {
  objectifs: SmartObjectif[]
  patientKey: string
  onUpdate: (objectifs: SmartObjectif[]) => void
  maxObjectifs?: number
}

const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '0.5rem 0.7rem', fontSize: '0.85rem',
  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)',
  marginBottom: 6, boxSizing: 'border-box', color: 'var(--text-main)',
  background: '#FDFCFA',
}

export const SmartObjectifs = memo(function SmartObjectifs({ objectifs, patientKey, onUpdate, maxObjectifs }: SmartObjectifsProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [titre, setTitre] = useState('')
  const [cible, setCible] = useState('')
  const [dateCible, setDateCible] = useState('')
  const [zone, setZone] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitre, setEditTitre] = useState('')
  const [editCible, setEditCible] = useState('')
  const [editDate, setEditDate] = useState('')

  const patientObjectifs = objectifs.filter(o => o.patientKey === patientKey)
  const enCours = patientObjectifs.filter(o => o.status === 'en_cours')
  const termines = patientObjectifs.filter(o => o.status !== 'en_cours')

  const handleAdd = () => {
    if (!titre.trim() || !cible.trim()) return
    const newObj: SmartObjectif = {
      id: Date.now(),
      patientKey,
      zone: zone || 'Général',
      titre: titre.trim(),
      cible: cible.trim(),
      dateCible: dateCible || '',
      status: 'en_cours',
      createdAt: new Date().toLocaleDateString('fr-FR'),
    }
    onUpdate([...objectifs, newObj])
    setTitre('')
    setCible('')
    setDateCible('')
    setZone('')
    setShowAdd(false)
  }

  const updateStatus = (id: number, status: SmartObjectif['status']) => {
    onUpdate(objectifs.map(o => o.id === id ? { ...o, status } : o))
  }

  const removeObj = (id: number) => {
    onUpdate(objectifs.filter(o => o.id !== id))
  }

  const statusColor = (s: SmartObjectif['status']) =>
    s === 'atteint' ? '#166534' : s === 'non_atteint' ? '#881337' : '#64748b'
  const statusBg = (s: SmartObjectif['status']) =>
    s === 'atteint' ? '#dcfce7' : s === 'non_atteint' ? '#fef2f2' : '#f1f5f9'
  const statusLabel = (s: SmartObjectif['status']) =>
    s === 'atteint' ? 'Atteint' : s === 'non_atteint' ? 'Non atteint' : 'En cours'

  const canAdd = maxObjectifs == null || enCours.length < maxObjectifs

  if (patientObjectifs.length === 0 && !showAdd) {
    return canAdd ? (
      <div>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            width: '100%', padding: '0.7rem', borderRadius: 12,
            border: '1.5px solid var(--border-color)',
            background: '#FDFCFA', color: 'var(--primary-dark)',
            fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
          <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span> Ajouter un objectif SMART
        </button>
      </div>
    ) : null
  }

  return (
    <div>
      {/* En cours */}
      {enCours.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
          {enCours.map(obj => (
            <div key={obj.id} style={{
              background: '#FDFCFA', border: '1px solid var(--border-color)',
              borderRadius: 12, padding: '0.7rem',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}>
              {editingId === obj.id ? (
                <div>
                  <input value={editTitre} onChange={e => setEditTitre(e.target.value)} placeholder="Titre"
                    style={fieldStyle} />
                  <input value={editCible} onChange={e => setEditCible(e.target.value)} placeholder="Cible mesurable"
                    style={fieldStyle} />
                  <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                    style={{ ...fieldStyle, marginBottom: 8 }} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => {
                      if (editTitre.trim()) onUpdate(objectifs.map(o => o.id === obj.id ? { ...o, titre: editTitre.trim(), cible: editCible.trim(), dateCible: editDate } : o))
                      setEditingId(null)
                    }} style={{ flex: 1, padding: '0.4rem', borderRadius: 8, border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', boxShadow: '0 1px 4px rgba(45,90,75,0.2)' }}>
                      OK
                    </button>
                    <button onClick={() => setEditingId(null)}
                      style={{ padding: '0.4rem 0.6rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--surface)', color: 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer' }}>
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary-dark)' }}>{obj.titre}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{obj.cible}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {obj.dateCible && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{obj.dateCible}</div>}
                      <button onClick={() => { setEditingId(obj.id); setEditTitre(obj.titre); setEditCible(obj.cible); setEditDate(obj.dateCible) }}
                        style={{ fontSize: '0.62rem', color: 'var(--primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 1 }}>
                        Modifier
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <button onClick={() => updateStatus(obj.id, 'atteint')}
                      style={{ flex: 1, padding: '0.4rem', borderRadius: 8, border: 'none', background: '#166534', color: 'white', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', boxShadow: '0 1px 3px rgba(22,101,52,0.2)' }}>
                      Atteint
                    </button>
                    <button onClick={() => updateStatus(obj.id, 'non_atteint')}
                      style={{ flex: 1, padding: '0.4rem', borderRadius: 8, border: 'none', background: '#881337', color: 'white', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', boxShadow: '0 1px 3px rgba(136,19,55,0.2)' }}>
                      Non atteint
                    </button>
                    <button onClick={() => removeObj(obj.id)}
                      style={{ padding: '0.4rem 0.6rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--surface)', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Terminés */}
      {termines.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
          {termines.map(obj => (
            <div key={obj.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem 0.7rem', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-full)', background: statusBg(obj.status), color: statusColor(obj.status) }}>
                {statusLabel(obj.status)}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: obj.status === 'atteint' ? 'line-through' : 'none', flex: 1 }}>
                {obj.titre}
              </span>
              <button onClick={() => removeObj(obj.id)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showAdd ? (
        <div style={{ background: '#FDFCFA', border: '1px solid var(--border-color)', borderRadius: 12, padding: '0.75rem', marginBottom: 6, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <input value={titre} onChange={e => setTitre(e.target.value)} placeholder="Titre de l'objectif (ex: Récupérer la flexion complète)"
            style={fieldStyle} />
          <input value={cible} onChange={e => setCible(e.target.value)} placeholder="Cible mesurable (ex: Flexion genou > 120° à J30)"
            style={fieldStyle} />
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <input type="date" value={dateCible} onChange={e => setDateCible(e.target.value)}
              style={{ ...fieldStyle, flex: 1, marginBottom: 0 }} />
            <select value={zone} onChange={e => setZone(e.target.value)}
              style={{ ...fieldStyle, flex: 1, marginBottom: 0 }}>
              <option value="">Zone...</option>
              {['Épaule', 'Genou', 'Hanche', 'Cheville', 'Cervical', 'Lombaire', 'Général'].map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleAdd} disabled={!titre.trim() || !cible.trim()}
              style={{
                flex: 1, padding: '0.55rem', borderRadius: 10, border: 'none',
                background: titre.trim() && cible.trim() ? 'var(--primary)' : 'var(--secondary)',
                color: titre.trim() && cible.trim() ? 'white' : 'var(--text-muted)',
                fontWeight: 700, fontSize: '0.85rem',
                cursor: titre.trim() && cible.trim() ? 'pointer' : 'not-allowed',
                boxShadow: titre.trim() && cible.trim() ? '0 2px 6px rgba(45,90,75,0.2)' : 'none',
              }}>
              Ajouter
            </button>
            <button onClick={() => setShowAdd(false)}
              style={{ padding: '0.55rem 1rem', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
              Annuler
            </button>
          </div>
        </div>
      ) : canAdd ? (
        <button onClick={() => setShowAdd(true)}
          style={{
            width: '100%', padding: '0.55rem', borderRadius: 10,
            border: '1.5px solid var(--border-color)',
            background: '#FDFCFA', color: 'var(--primary-dark)',
            fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
          + Ajouter un objectif
        </button>
      ) : null}
    </div>
  )
})
