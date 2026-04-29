import { useState, useMemo } from 'react'
import { REGION_LABELS, OEDEME_COLORS, OEDEME_LABELS } from './dlmTypes'
import type { BodyRegion, OedemeType } from './dlmTypes'
import { DictableTextarea } from '../../VoiceMic'

// ─── Cartographie macro-zones ────────────────────────────────────────────────
// 13 zones cliniquement pertinentes pour le DLM. Chaque zone est un path SVG
// FERMÉ et NON CHEVAUCHANT — c'est la garantie d'une silhouette lisible et
// d'un comportement de sélection sans ambiguïté. Les détails fins (épaule vs
// main, mollet vs cheville…) sont consignés dans les annotations et la
// circométrie, pas dans le tap.

interface RegionPath {
  id: BodyRegion
  /** SVG path en viewBox 0 0 200 480 — silhouette debout. */
  d: string
  /** Position du label central (pour fallback texte). */
  cx: number
  cy: number
}

// Les coordonnées sont calculées pour que les zones se touchent exactement
// le long des frontières communes (pas de gap, pas de chevauchement).

const FRONT_REGIONS: RegionPath[] = [
  // Tête + cou
  { id: 'tete', d: 'M82 6 a18 22 0 1 0 36 0 a18 22 0 1 0 -36 0 z',                        cx: 100, cy: 22 },
  { id: 'cou',  d: 'M88 44 h24 v14 h-24 z',                                                cx: 100, cy: 51 },
  // Bras (entiers — épaule au bout des doigts inclus)
  { id: 'MSD',  d: 'M22 60 q14 -4 30 4 v160 q-14 4 -30 -2 z',                              cx: 36,  cy: 140 },
  { id: 'MSG',  d: 'M148 64 q16 -8 30 -4 v158 q-14 4 -30 0 z',                             cx: 164, cy: 140 },
  // Tronc antérieur — seins, thorax, abdomen, pelvis (tous tuilés)
  { id: 'seinD',   d: 'M52 60 q24 -6 48 0 v22 q-24 6 -48 0 z',                             cx: 76,  cy: 73 },
  { id: 'seinG',   d: 'M100 60 q24 -6 48 0 v22 q-24 6 -48 0 z',                            cx: 124, cy: 73 },
  { id: 'thorax',  d: 'M52 82 h96 v28 h-96 z',                                             cx: 100, cy: 96 },
  { id: 'abdomen', d: 'M52 110 h96 v44 h-96 z',                                            cx: 100, cy: 132 },
  { id: 'pelvis',  d: 'M52 154 h96 v28 q-48 8 -96 0 z',                                    cx: 100, cy: 170 },
  // Jambes (entières — cuisse au pied inclus)
  { id: 'MID',  d: 'M52 182 q24 8 48 0 v260 q-24 4 -48 0 z',                               cx: 76,  cy: 320 },
  { id: 'MIG',  d: 'M100 182 q24 8 48 0 v260 q-24 4 -48 0 z',                              cx: 124, cy: 320 },
]

const BACK_REGIONS: RegionPath[] = [
  // Tête + cou (mêmes paths que face)
  { id: 'tete', d: 'M82 6 a18 22 0 1 0 36 0 a18 22 0 1 0 -36 0 z',                        cx: 100, cy: 22 },
  { id: 'cou',  d: 'M88 44 h24 v14 h-24 z',                                                cx: 100, cy: 51 },
  // Bras (mêmes paths)
  { id: 'MSD',  d: 'M22 60 q14 -4 30 4 v160 q-14 4 -30 -2 z',                              cx: 36,  cy: 140 },
  { id: 'MSG',  d: 'M148 64 q16 -8 30 -4 v158 q-14 4 -30 0 z',                             cx: 164, cy: 140 },
  // Tronc postérieur — dos haut, lombaire, fesses
  { id: 'dosHaut',  d: 'M52 60 h96 v60 h-96 z',                                            cx: 100, cy: 90 },
  { id: 'lombaire', d: 'M52 120 h96 v32 h-96 z',                                           cx: 100, cy: 136 },
  { id: 'fesses',   d: 'M52 152 h96 v32 q-48 8 -96 0 z',                                   cx: 100, cy: 170 },
  // Jambes (mêmes paths)
  { id: 'MID',  d: 'M52 184 q24 8 48 0 v258 q-24 4 -48 0 z',                               cx: 76,  cy: 320 },
  { id: 'MIG',  d: 'M100 184 q24 8 48 0 v258 q-24 4 -48 0 z',                              cx: 124, cy: 320 },
]

interface Props {
  /** Régions sélectionnées (toutes faces confondues). */
  regions: BodyRegion[]
  onChangeRegions: (next: BodyRegion[]) => void
  /** Notes texte associées au schéma (caractéristiques, points particuliers). */
  annotations: string
  onChangeAnnotations: (v: string) => void
  /** Types d'œdème actuellement sélectionnés — pour colorier la sélection. */
  oedemeTypes: OedemeType[]
}

export function BodyChartDLM({ regions, onChangeRegions, annotations, onChangeAnnotations, oedemeTypes }: Props) {
  const [view, setView] = useState<'front' | 'back'>('front')
  const selected = useMemo(() => new Set(regions), [regions])

  // Couleur de sélection : si un seul type d'œdème → sa couleur ; sinon palette
  // mixte (purple, défaut DLM).
  const palette = oedemeTypes.length === 1
    ? OEDEME_COLORS[oedemeTypes[0]]
    : { fg: '#7c3aed', bg: '#f3e8ff', border: '#ddd6fe' }

  const toggle = (r: BodyRegion) => {
    const next = new Set(selected)
    if (next.has(r)) next.delete(r)
    else next.add(r)
    onChangeRegions(Array.from(next))
  }

  const data = view === 'front' ? FRONT_REGIONS : BACK_REGIONS

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
                padding: '4px 14px', fontSize: '0.74rem', fontWeight: 700,
                background: view === v ? palette.fg : 'transparent',
                color: view === v ? '#fff' : 'var(--text-muted)',
                border: 'none', cursor: 'pointer',
              }}
            >
              {v === 'front' ? 'Face' : 'Dos'}
            </button>
          ))}
        </div>
      </div>

      {oedemeTypes.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <span style={{ fontWeight: 600 }}>Couleur :</span>
          {oedemeTypes.length === 1 && (
            <span style={{ color: palette.fg, fontWeight: 700 }}>
              {OEDEME_LABELS[oedemeTypes[0]]}
            </span>
          )}
          {oedemeTypes.length > 1 && (
            <span style={{ fontStyle: 'italic' }}>
              Multi-pathologie — détailler par région dans les annotations
            </span>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 220px) 1fr', gap: 16, alignItems: 'flex-start' }}>
        <svg
          viewBox="0 0 200 460"
          preserveAspectRatio="xMidYMid meet"
          style={{
            width: '100%', height: 'auto', maxHeight: 460,
            background: '#f8fafc', borderRadius: 8,
          }}
        >
          {data.map(r => {
            const isOn = selected.has(r.id)
            return (
              <g
                key={r.id}
                onClick={() => toggle(r.id)}
                style={{ cursor: 'pointer' }}
              >
                <path
                  d={r.d}
                  fill={isOn ? palette.fg : '#e2e8f0'}
                  fillOpacity={isOn ? 0.78 : 1}
                  stroke={isOn ? palette.fg : '#94a3b8'}
                  strokeWidth={isOn ? 1.4 : 0.8}
                  style={{ transition: 'fill 0.15s, fill-opacity 0.15s' }}
                />
                {isOn && (
                  <text
                    x={r.cx}
                    y={r.cy}
                    textAnchor="middle"
                    fontSize="6"
                    fontWeight={700}
                    fill="#fff"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {shortLabel(r.id)}
                  </text>
                )}
                <title>{REGION_LABELS[r.id]}</title>
              </g>
            )
          })}
        </svg>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Régions sélectionnées
          </div>
          {regions.length === 0 ? (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Touchez une zone du schéma pour la marquer comme atteinte. Basculez entre face et dos selon les régions à coder.
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {regions.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggle(r)}
                  style={{
                    padding: '4px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600,
                    background: palette.bg, border: `1px solid ${palette.border}`,
                    color: palette.fg, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
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
              Précisions / topographie fine
            </div>
            <DictableTextarea
              value={annotations}
              onChange={e => onChangeAnnotations(e.target.value)}
              rows={4}
              placeholder="Sous-zones précises (épaule, main, mollet…), peau d'orange, fibrose, cicatrices, asymétries marquées…"
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

// Étiquette courte affichée dans la zone (texte blanc sur sélection).
function shortLabel(r: BodyRegion): string {
  switch (r) {
    case 'tete':     return 'Tête'
    case 'cou':      return 'Cou'
    case 'MSD':      return 'MS-D'
    case 'MSG':      return 'MS-G'
    case 'seinD':    return 'Sein-D'
    case 'seinG':    return 'Sein-G'
    case 'thorax':   return 'Thorax'
    case 'abdomen':  return 'Abdomen'
    case 'pelvis':   return 'Pelvis'
    case 'MID':      return 'MI-D'
    case 'MIG':      return 'MI-G'
    case 'dosHaut':  return 'Dos'
    case 'lombaire': return 'Lombaire'
    case 'fesses':   return 'Fesses'
  }
}
