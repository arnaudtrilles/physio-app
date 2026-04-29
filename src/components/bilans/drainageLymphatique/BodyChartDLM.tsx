import { useState } from 'react'
import { REGION_LABELS } from './dlmTypes'
import type { BodyRegion } from './dlmTypes'
import { DictableTextarea } from '../../VoiceMic'

// Silhouettes SVG simplifiées — face avant et face arrière. Chaque zone
// cliniquement pertinente pour le DLM est un <path> indépendant taggé avec
// son `BodyRegion`. Le but n'est pas l'anatomie photo-réaliste, mais une
// localisation rapide et sans ambiguïté lors de l'examen.

interface Props {
  /** Régions sélectionnées (toutes faces confondues). */
  regions: BodyRegion[]
  onChangeRegions: (next: BodyRegion[]) => void
  /** Notes texte associées au schéma (caractéristiques, points particuliers). */
  annotations: string
  onChangeAnnotations: (v: string) => void
}

interface RegionPath {
  id: BodyRegion
  d: string
}

// ─── Face avant (anterior view) ─────────────────────────────────────────────
// Coordonnées en viewBox "0 0 200 480", silhouette debout.
const FRONT_REGIONS: RegionPath[] = [
  // Tête / cou / visage — séparées pour pouvoir distinguer les œdèmes faciaux.
  { id: 'tete',   d: 'M100 6 a22 22 0 1 0 0.001 0 z' },
  { id: 'visage', d: 'M85 24 q15 14 30 0 q-2 12 -15 16 q-13 -4 -15 -16 z' },
  { id: 'cou',    d: 'M88 44 h24 v14 h-24 z' },
  // Thorax / abdomen / pelvis
  { id: 'thorax', d: 'M70 60 q30 -8 60 0 v40 h-60 z' },
  { id: 'seinD',  d: 'M76 70 q11 4 14 16 q-4 6 -14 4 z' },
  { id: 'seinG',  d: 'M124 70 q-11 4 -14 16 q4 6 14 4 z' },
  { id: 'abdomen', d: 'M70 100 h60 v50 h-60 z' },
  { id: 'pelvis',  d: 'M68 150 q32 -4 64 0 v22 q-32 6 -64 0 z' },
  { id: 'genital', d: 'M93 168 q7 6 14 0 v8 q-7 4 -14 0 z' },
  // Épaules
  { id: 'epauleD', d: 'M40 56 q15 -2 28 8 v18 q-18 -4 -28 -8 z' },
  { id: 'epauleG', d: 'M132 64 q15 -10 28 -8 v18 q-10 4 -28 8 z' },
  // Bras
  { id: 'brasD', d: 'M40 76 q12 0 22 6 v62 q-14 -2 -22 -6 z' },
  { id: 'brasG', d: 'M138 82 q10 -6 22 -6 v62 q-8 4 -22 6 z' },
  // Avant-bras
  { id: 'avantBrasD', d: 'M40 142 q12 0 22 4 v60 q-14 -2 -22 -6 z' },
  { id: 'avantBrasG', d: 'M138 146 q10 -4 22 -4 v62 q-8 4 -22 6 z' },
  // Mains
  { id: 'mainD', d: 'M36 206 q12 -2 22 0 v22 q-12 4 -22 0 z' },
  { id: 'mainG', d: 'M142 206 q10 -2 22 0 v22 q-10 4 -22 0 z' },
  // Cuisses
  { id: 'cuisseD', d: 'M70 172 q14 8 28 0 v90 q-16 -4 -28 -6 z' },
  { id: 'cuisseG', d: 'M102 172 q14 8 28 0 v84 q-12 -2 -28 6 z' },
  // Genoux
  { id: 'genouD', d: 'M70 262 q14 4 28 -2 v18 q-14 -4 -28 0 z' },
  { id: 'genouG', d: 'M102 260 q14 6 28 2 v18 q-14 -4 -28 0 z' },
  // Mollets
  { id: 'molletD', d: 'M72 280 q12 4 26 -2 v92 q-12 -4 -26 -4 z' },
  { id: 'molletG', d: 'M102 278 q14 6 26 2 v92 q-14 0 -26 4 z' },
  // Chevilles
  { id: 'chevilleD', d: 'M74 372 q12 4 22 -2 v14 q-12 4 -22 0 z' },
  { id: 'chevilleG', d: 'M104 370 q12 6 22 2 v14 q-12 4 -22 0 z' },
  // Pieds
  { id: 'piedD', d: 'M68 386 q14 0 28 0 v18 q-16 4 -28 0 z' },
  { id: 'piedG', d: 'M104 386 q16 0 28 0 v18 q-14 4 -28 0 z' },
]

// ─── Face arrière (posterior view) ──────────────────────────────────────────
// Mêmes id pour épaule/bras/etc. — la face arrière permet de cibler dos/lombaire/fesses.
const BACK_REGIONS: RegionPath[] = [
  { id: 'tete',   d: 'M100 6 a22 22 0 1 0 0.001 0 z' },
  { id: 'cou',    d: 'M88 44 h24 v14 h-24 z' },
  { id: 'dos',    d: 'M70 60 q30 -8 60 0 v60 h-60 z' },
  { id: 'lombaire', d: 'M70 120 h60 v36 h-60 z' },
  { id: 'fesseD', d: 'M70 156 q14 -2 28 0 v22 q-14 6 -28 -2 z' },
  { id: 'fesseG', d: 'M102 156 q14 -2 28 0 v20 q-14 8 -28 2 z' },
  { id: 'epauleD', d: 'M40 56 q15 -2 28 8 v18 q-18 -4 -28 -8 z' },
  { id: 'epauleG', d: 'M132 64 q15 -10 28 -8 v18 q-10 4 -28 8 z' },
  { id: 'brasD', d: 'M40 76 q12 0 22 6 v62 q-14 -2 -22 -6 z' },
  { id: 'brasG', d: 'M138 82 q10 -6 22 -6 v62 q-8 4 -22 6 z' },
  { id: 'avantBrasD', d: 'M40 142 q12 0 22 4 v60 q-14 -2 -22 -6 z' },
  { id: 'avantBrasG', d: 'M138 146 q10 -4 22 -4 v62 q-8 4 -22 6 z' },
  { id: 'mainD', d: 'M36 206 q12 -2 22 0 v22 q-12 4 -22 0 z' },
  { id: 'mainG', d: 'M142 206 q10 -2 22 0 v22 q-10 4 -22 0 z' },
  { id: 'cuisseD', d: 'M70 178 q14 6 28 0 v82 q-16 -4 -28 -6 z' },
  { id: 'cuisseG', d: 'M102 178 q14 6 28 0 v76 q-12 -2 -28 6 z' },
  { id: 'genouD', d: 'M70 260 q14 4 28 -2 v18 q-14 -4 -28 0 z' },
  { id: 'genouG', d: 'M102 254 q14 6 28 2 v18 q-14 -4 -28 0 z' },
  { id: 'molletD', d: 'M72 278 q12 4 26 -2 v94 q-12 -4 -26 -4 z' },
  { id: 'molletG', d: 'M102 272 q14 6 26 2 v94 q-14 0 -26 4 z' },
  { id: 'chevilleD', d: 'M74 372 q12 4 22 -2 v14 q-12 4 -22 0 z' },
  { id: 'chevilleG', d: 'M104 370 q12 6 22 2 v14 q-12 4 -22 0 z' },
  { id: 'piedD', d: 'M68 386 q14 0 28 0 v14 q-16 4 -28 0 z' },
  { id: 'piedG', d: 'M104 386 q16 0 28 0 v14 q-14 4 -28 0 z' },
]

const SILHOUETTE_OUTLINE = 'M100 4 a22 22 0 1 0 0 44 a22 22 0 1 0 0 -44 M88 44 h24 v14 h-24 z M40 56 q15 -2 28 8 q30 -8 64 0 q13 -10 28 -8 v22 q-8 4 -22 6 v62 q-8 4 -22 6 v60 q4 0 6 0 q10 0 22 0 v22 q-10 4 -22 0 q-2 0 -6 0 q-12 -8 -28 -2 v90 q14 6 28 2 v18 q-12 4 -22 -2 v90 q12 4 22 2 v14 q-12 4 -22 0 q14 0 28 0 v18 q-14 4 -28 0 q-14 4 -28 0 v-18 q14 0 28 0 q-12 4 -22 0 v-14 q14 0 22 -2 v-90 q-12 6 -22 2 v-18 q14 4 28 -2 v-90 q-14 -6 -28 2 q-2 0 -6 0 q-12 4 -22 0 v-22 q14 0 22 0 q4 0 6 0 v-60 q-14 -2 -22 -6 v-62 q-14 -2 -22 -6 z'

const FRONT_OUTLINE = 'M100 4 a22 22 0 1 0 0.001 0 z M88 44 h24 v18 h-24 z M40 60 q30 -10 60 -2 q30 -8 60 2 v110 q-2 6 -22 4 v60 q-2 4 -22 6 q-12 -2 -16 -2 v90 q12 4 22 0 v20 q-10 4 -20 0 q-12 0 -20 0 q-2 0 -6 0 q-10 4 -20 0 v-20 q10 4 22 0 v-90 q-4 0 -16 2 q-20 -2 -22 -6 v-60 q-20 2 -22 -4 z'

const BACK_OUTLINE = FRONT_OUTLINE  // même contour global

export function BodyChartDLM({ regions, onChangeRegions, annotations, onChangeAnnotations }: Props) {
  const [view, setView] = useState<'front' | 'back'>('front')
  const set = new Set(regions)

  const toggle = (r: BodyRegion) => {
    const next = new Set(set)
    if (next.has(r)) next.delete(r)
    else next.add(r)
    onChangeRegions(Array.from(next))
  }

  const data = view === 'front' ? FRONT_REGIONS : BACK_REGIONS
  const outline = view === 'front' ? FRONT_OUTLINE : BACK_OUTLINE

  return (
    <div style={{ border: '1px solid var(--border-color)', borderRadius: 12, background: 'var(--surface)', padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary-dark)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Schéma corporel — sélection des régions atteintes
        </div>
        <div style={{ display: 'inline-flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          {(['front', 'back'] as const).map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              style={{
                padding: '4px 12px', fontSize: '0.72rem', fontWeight: 700,
                background: view === v ? 'var(--primary)' : 'transparent',
                color: view === v ? '#fff' : 'var(--text-muted)',
                border: 'none', cursor: 'pointer',
              }}
            >
              {v === 'front' ? 'Face' : 'Dos'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 220px) 1fr', gap: 12, alignItems: 'stretch' }}>
        <svg viewBox="0 0 200 420" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 'auto', maxHeight: 420, background: '#f8fafc', borderRadius: 8 }}>
          {/* Outline neutre */}
          <path d={outline} fill="none" stroke="var(--border-color)" strokeWidth={0.4} />
          {/* Silhouette discrete */}
          <path d={SILHOUETTE_OUTLINE} fill="rgba(148,163,184,0.06)" stroke="var(--border-color)" strokeWidth={0.4} />
          {/* Régions cliquables */}
          {data.map(r => {
            const selected = set.has(r.id)
            return (
              <path
                key={r.id}
                d={r.d}
                fill={selected ? 'rgba(124,58,237,0.55)' : 'rgba(148,163,184,0.10)'}
                stroke={selected ? '#7c3aed' : 'rgba(100,116,139,0.35)'}
                strokeWidth={selected ? 1.2 : 0.4}
                onClick={() => toggle(r.id)}
                style={{ cursor: 'pointer', transition: 'fill 0.15s' }}
              >
                <title>{REGION_LABELS[r.id]}</title>
              </path>
            )
          })}
        </svg>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Régions sélectionnées
          </div>
          {regions.length === 0 && (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Touchez une zone du schéma pour la marquer comme atteinte.
            </div>
          )}
          {regions.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {regions.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggle(r)}
                  style={{
                    padding: '3px 10px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600,
                    background: 'rgba(124,58,237,0.10)', border: '1px solid rgba(124,58,237,0.35)',
                    color: '#6d28d9', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}
                  title="Retirer cette région"
                >
                  {REGION_LABELS[r]}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>
                </button>
              ))}
            </div>
          )}

          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
              Notes / précisions
            </div>
            <DictableTextarea
              value={annotations}
              onChange={e => onChangeAnnotations(e.target.value)}
              rows={4}
              placeholder="Caractéristiques particulières (peau d'orange, fibrose, cicatrices, points pression...). Précisions latérales si différences D/G."
              textareaStyle={{
                width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.82rem',
                color: 'var(--text-main)', background: 'var(--input-bg)',
                border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)',
                resize: 'vertical', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
