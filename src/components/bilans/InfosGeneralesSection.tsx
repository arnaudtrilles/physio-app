import { createContext, useContext } from 'react'
import { DictableInput, DictableTextarea } from '../VoiceMic'
import { inputStyle, lblStyle } from './bilanSections'

type GeneralInfoField = 'profession' | 'sport' | 'famille' | 'chirurgie' | 'notes'

export type GeneralInfoCtx = {
  profession: string
  sport: string
  famille: string
  chirurgie: string
  notes: string
  updateField: (field: GeneralInfoField, value: string) => void
}

const GeneralInfoContext = createContext<GeneralInfoCtx | null>(null)

export const GeneralInfoProvider = GeneralInfoContext.Provider

export function useGeneralInfo(): GeneralInfoCtx {
  const ctx = useContext(GeneralInfoContext)
  if (!ctx) {
    return {
      profession: '', sport: '', famille: '', chirurgie: '', notes: '',
      updateField: () => {},
    }
  }
  return ctx
}

export function InfosGeneralesSection() {
  const { profession, sport, famille, chirurgie, notes, updateField } = useGeneralInfo()
  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <label style={lblStyle}>Activité professionnelle</label>
        <DictableInput
          value={profession}
          onChange={e => updateField('profession', e.target.value)}
          placeholder="Ex : employé de bureau, ouvrier, retraité…"
          inputStyle={inputStyle}
        />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={lblStyle}>Activité physique / sportive</label>
        <DictableInput
          value={sport}
          onChange={e => updateField('sport', e.target.value)}
          placeholder="Ex : course à pied 3×/sem, sédentaire…"
          inputStyle={inputStyle}
        />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={lblStyle}>Antécédents familiaux</label>
        <DictableTextarea
          value={famille}
          onChange={e => updateField('famille', e.target.value)}
          placeholder="Diabète, hypertension, pathologie similaire dans la famille…"
          rows={2}
          textareaStyle={inputStyle}
        />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={lblStyle}>Antécédents chirurgicaux</label>
        <DictableTextarea
          value={chirurgie}
          onChange={e => updateField('chirurgie', e.target.value)}
          placeholder="Opérations passées (date + nature)…"
          rows={2}
          textareaStyle={inputStyle}
        />
      </div>
      <div style={{ marginBottom: 4 }}>
        <label style={lblStyle}>Notes complémentaires</label>
        <DictableTextarea
          value={notes}
          onChange={e => updateField('notes', e.target.value)}
          placeholder="Précisions utiles non couvertes ailleurs…"
          rows={2}
          textareaStyle={inputStyle}
        />
      </div>
    </div>
  )
}
