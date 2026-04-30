import type { BilanRecord } from '../../types'
import { ZoneIcon, ZONE_PICKER_ITEMS } from '../shared/ZonePicker'

type IdentityFormData = {
  nom: string
  prenom: string
  dateNaissance: string
  sexe: '' | 'masculin' | 'feminin'
}

type PatientMode = 'new' | 'existing'

type IdentityStepProps = {
  formData: IdentityFormData
  updateField: (field: 'nom' | 'prenom' | 'dateNaissance', value: string) => void
  onSelectSexe: (sexe: 'masculin' | 'feminin') => void
  onPickExistingPatient: (patient: { nom: string; prenom: string; dateNaissance: string }) => void
  patientMode: PatientMode
  setPatientMode: (mode: PatientMode) => void
  selectedBodyZone: string | null
  setShowZonePopup: (open: boolean) => void
  stepProgress: number
  db: BilanRecord[]
  onBack: () => void
  onQuit: () => void
  onNext: () => void
}

export function IdentityStep({
  formData,
  updateField,
  onSelectSexe,
  onPickExistingPatient,
  patientMode,
  setPatientMode,
  selectedBodyZone,
  setShowZonePopup,
  stepProgress,
  db,
  onBack,
  onQuit,
  onNext,
}: IdentityStepProps) {
  return (
    <div className="identity-screen fade-in">
      <header className="screen-header">
        <button className="btn-back" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 className="title-section">Identité du patient</h2>
        <button onClick={onQuit} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', flexShrink: 0 }} aria-label="Quitter le bilan">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </header>
      <div className="progress-bar-wrap"><div className="progress-bar-fill" style={{ width: `${stepProgress}%` }} /></div>
      <div className="scroll-area">
        <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 'var(--radius-xl)', padding: '0.4rem', marginBottom: '1.5rem', width: '100%', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)' }}>
          {(['new', 'existing'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setPatientMode(mode)}
              style={{ flex: 1, padding: '0.6rem', borderRadius: 'var(--radius-lg)', background: patientMode === mode ? '#ffffff' : 'transparent', color: patientMode === mode ? 'var(--primary-dark)' : 'var(--text-muted)', fontWeight: patientMode === mode ? 600 : 400, boxShadow: patientMode === mode ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}
            >
              {mode === 'new' ? 'Nouveau patient' : 'Patient existant'}
            </button>
          ))}
        </div>

        {patientMode === 'existing' && (
          <div className="form-group" style={{ background: 'var(--secondary)', padding: '1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '1.1rem', color: 'var(--primary-dark)', fontWeight: 600 }}>Pour quel patient ?</label>
            <select
              className="input-luxe"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  try {
                    const val = JSON.parse(e.target.value)
                    onPickExistingPatient({ nom: val.nom, prenom: val.prenom, dateNaissance: val.dateNaissance })
                  } catch { /* select value is self-generated JSON */ }
                }
              }}
            >
              <option value="" disabled>-- Dossiers récents --</option>
              {Array.from(new Map(db.map(r => [`${(r.nom || '').toUpperCase()} ${r.prenom}`, r])).values()).map(r => (
                <option key={r.id} value={JSON.stringify({ nom: r.nom, prenom: r.prenom, dateNaissance: r.dateNaissance })}>
                  {(r.nom || '').toUpperCase()} {r.prenom}
                </option>
              ))}
            </select>
            {formData.nom && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--surface)', borderRadius: 'var(--radius-md)', color: 'var(--primary)', fontWeight: 600, border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Dossier actif : {(formData.nom || '').toUpperCase()} {formData.prenom}
              </div>
            )}
          </div>
        )}

        {patientMode === 'new' && (
          <>
            <div className="form-group">
              <label>Nom</label>
              <input type="text" placeholder="Ex: Dupont" className="input-luxe" value={formData.nom} onChange={e => updateField('nom', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Prénom</label>
              <input type="text" placeholder="Ex: Jean" className="input-luxe" value={formData.prenom} onChange={e => updateField('prenom', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Date de naissance</label>
              <input type="date" className="input-luxe" value={formData.dateNaissance} onChange={e => updateField('dateNaissance', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Sexe <span style={{ color: 'var(--danger)' }}>*</span></label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {([
                  { value: 'masculin', label: 'Masculin' },
                  { value: 'feminin', label: 'Féminin' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onSelectSexe(opt.value)}
                    style={{ flex: 1, padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-full)', border: formData.sexe === opt.value ? '2px solid var(--primary)' : '1.5px solid var(--border-color)', background: formData.sexe === opt.value ? 'var(--secondary)' : 'var(--input-bg)', color: formData.sexe === opt.value ? 'var(--primary-dark)' : 'var(--text-muted)', fontWeight: formData.sexe === opt.value ? 600 : 400, fontSize: '0.88rem', cursor: 'pointer' }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div style={{ marginTop: '1.5rem' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-dark)', display: 'block', marginBottom: 8 }}>Zone du bilan</label>
          <button
            onClick={() => setShowZonePopup(true)}
            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 16, border: selectedBodyZone ? '2px solid var(--primary)' : '1.5px solid var(--border-color)', background: selectedBodyZone ? 'var(--info-soft)' : 'var(--input-bg)', color: selectedBodyZone ? 'var(--primary-dark)' : 'var(--text-muted)', fontWeight: selectedBodyZone ? 600 : 400, fontSize: '0.92rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, boxShadow: selectedBodyZone ? '0 2px 8px rgba(45,90,75,0.12)' : '0 1px 4px rgba(0,0,0,0.06)', transition: 'all 0.18s' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {selectedBodyZone && (
                <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ZoneIcon zone={selectedBodyZone} size={16} color="white" />
                </span>
              )}
              {selectedBodyZone ? ZONE_PICKER_ITEMS.find(z => z.zone === selectedBodyZone)?.label ?? selectedBodyZone : 'Sélectionner une zone…'}
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
      </div>

      <div className="fixed-bottom">
        <button
          className="btn-primary-luxe"
          disabled={!selectedBodyZone}
          style={{ opacity: selectedBodyZone ? 1 : 0.5 }}
          onClick={onNext}
        >
          Étape suivante
        </button>
      </div>
    </div>
  )
}
