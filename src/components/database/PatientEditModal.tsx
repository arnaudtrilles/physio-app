import { useState, useEffect } from 'react'

export interface PatientEditValue {
  nom: string
  prenom: string
  dateNaissance: string
  sexe: '' | 'masculin' | 'feminin'
}

interface PatientEditModalProps {
  initial: PatientEditValue
  onCancel: () => void
  onSave: (next: PatientEditValue) => Promise<void> | void
}

export function PatientEditModal({ initial, onCancel, onSave }: PatientEditModalProps) {
  const [val, setVal] = useState<PatientEditValue>(initial)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string>('')

  useEffect(() => { setVal(initial) }, [initial])

  const trimmedNom = val.nom.trim()
  const trimmedPrenom = val.prenom.trim()
  const canSave = trimmedNom.length >= 1 && trimmedPrenom.length >= 1 && !saving
  const dirty =
    trimmedNom !== initial.nom.trim() ||
    trimmedPrenom !== initial.prenom.trim() ||
    val.dateNaissance !== initial.dateNaissance ||
    val.sexe !== initial.sexe

  const submit = async () => {
    if (!canSave || !dirty) return
    setSaving(true)
    setErr('')
    try {
      await onSave({ ...val, nom: trimmedNom, prenom: trimmedPrenom })
    } catch (e) {
      setErr((e as Error).message || 'Échec de la modification')
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2050, padding: '1.5rem' }}>
      <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '400px', boxShadow: 'var(--shadow-2xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--primary-dark)' }}>Modifier le profil patient</h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Corriger nom, prénom, date de naissance ou sexe
            </p>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '0.85rem' }}>
          <label>Nom</label>
          <input
            type="text"
            className="input-luxe"
            value={val.nom}
            onChange={e => setVal(v => ({ ...v, nom: e.target.value }))}
            autoFocus
          />
        </div>
        <div className="form-group" style={{ marginBottom: '0.85rem' }}>
          <label>Prénom</label>
          <input
            type="text"
            className="input-luxe"
            value={val.prenom}
            onChange={e => setVal(v => ({ ...v, prenom: e.target.value }))}
          />
        </div>
        <div className="form-group" style={{ marginBottom: '0.85rem' }}>
          <label>Date de naissance</label>
          <input
            type="date"
            className="input-luxe"
            value={val.dateNaissance}
            onChange={e => setVal(v => ({ ...v, dateNaissance: e.target.value }))}
          />
        </div>
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label>Sexe</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {([
              { value: 'masculin', label: 'Masculin' },
              { value: 'feminin', label: 'Féminin' },
            ] as const).map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setVal(v => ({ ...v, sexe: opt.value }))}
                style={{
                  flex: 1,
                  padding: '0.6rem 0.85rem',
                  borderRadius: 'var(--radius-full)',
                  border: val.sexe === opt.value ? '2px solid var(--primary)' : '1.5px solid var(--border-color)',
                  background: val.sexe === opt.value ? 'var(--secondary)' : 'var(--input-bg)',
                  color: val.sexe === opt.value ? 'var(--primary-dark)' : 'var(--text-muted)',
                  fontWeight: val.sexe === opt.value ? 600 : 400,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {err && (
          <div style={{ padding: '0.6rem 0.8rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', marginBottom: '0.85rem' }}>
            {err}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onCancel}
            disabled={saving}
            style={{ flex: 1, padding: '0.7rem', borderRadius: 'var(--radius-lg)', background: 'var(--secondary)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontWeight: 600, fontSize: '0.88rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={!canSave || !dirty}
            style={{ flex: 1, padding: '0.7rem', borderRadius: 'var(--radius-lg)', background: (!canSave || !dirty) ? 'var(--border-color)' : 'var(--primary)', border: 'none', color: (!canSave || !dirty) ? 'var(--text-muted)' : 'white', fontWeight: 700, fontSize: '0.88rem', cursor: (!canSave || !dirty) ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
