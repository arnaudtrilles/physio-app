import { DictableInput, DictableTextarea } from '../VoiceMic'
import { BILAN_ZONE_LABELS, getBilanType } from '../../utils/bilanRouter'

type GeneralInfoFormData = {
  profession: string
  sport: string
  famille: string
  chirurgie: string
  notes: string
}

type GeneralInfoStepProps = {
  formData: GeneralInfoFormData
  updateField: (field: 'profession' | 'sport' | 'famille' | 'chirurgie' | 'notes', value: string) => void
  selectedBodyZone: string | null
  stepProgress: number
  onBack: () => void
  onQuit: () => void
  onStartBilan: () => void
}

const inputBoxStyle = {
  width: '100%',
  padding: '0.6rem 0.85rem',
  fontSize: '0.88rem',
  color: 'var(--text-main)',
  background: 'var(--input-bg)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-xl)',
  boxSizing: 'border-box' as const,
}

export function GeneralInfoStep({
  formData,
  updateField,
  selectedBodyZone,
  stepProgress,
  onBack,
  onQuit,
  onStartBilan,
}: GeneralInfoStepProps) {
  return (
    <div className="general-info-screen fade-in">
      <header className="screen-header">
        <button className="btn-back" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 className="title-section">Infos générales</h2>
        <button onClick={onQuit} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', flexShrink: 0 }} aria-label="Quitter le bilan">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </header>
      <div className="progress-bar-wrap"><div className="progress-bar-fill" style={{ width: `${stepProgress}%` }} /></div>
      <div className="scroll-area">
        <div className="form-group">
          <label>Activité professionnelle</label>
          <DictableInput value={formData.profession} onChange={e => updateField('profession', e.target.value)} placeholder="Ex: Employé de bureau" inputStyle={inputBoxStyle} />
        </div>
        <div className="form-group">
          <label>Activité physique / sportive</label>
          <DictableInput value={formData.sport} onChange={e => updateField('sport', e.target.value)} placeholder="Ex: Course à pied…" inputStyle={inputBoxStyle} />
        </div>
        <div className="form-group">
          <label>Antécédents familiaux</label>
          <DictableTextarea value={formData.famille} onChange={e => updateField('famille', e.target.value)} placeholder="Diabète, hypertension…" rows={2} textareaStyle={inputBoxStyle} />
        </div>
        <div className="form-group">
          <label>Antécédents chirurgicaux</label>
          <DictableTextarea value={formData.chirurgie} onChange={e => updateField('chirurgie', e.target.value)} placeholder="Opérations passées…" rows={2} textareaStyle={inputBoxStyle} />
        </div>
        <div className="form-group">
          <label>Notes complémentaires</label>
          <DictableTextarea value={formData.notes} onChange={e => updateField('notes', e.target.value)} placeholder="Précisions…" rows={2} textareaStyle={inputBoxStyle} />
        </div>
      </div>
      <div className="fixed-bottom">
        <button
          className="btn-primary-luxe"
          disabled={!selectedBodyZone}
          style={{ opacity: selectedBodyZone ? 1 : 0.5 }}
          onClick={onStartBilan}
        >
          {selectedBodyZone
            ? `Commencer le bilan → ${BILAN_ZONE_LABELS[getBilanType(selectedBodyZone)]}`
            : 'Sélectionnez une zone dans l\'étape précédente'}
        </button>
      </div>
    </div>
  )
}
