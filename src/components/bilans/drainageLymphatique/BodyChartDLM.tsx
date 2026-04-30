import { useState, useMemo } from 'react'
import { REGION_LABELS, OEDEME_COLORS, OEDEME_LABELS } from './dlmTypes'
import type { BodyRegion, OedemeType } from './dlmTypes'
import { DictableTextarea } from '../../VoiceMic'

// ─── Cartographie segmentaire ────────────────────────────────────────────────
// Silhouette anatomique avec articulations distinctes — épaule / bras /
// avant-bras / main pour les MS, et cuisse / genou / jambe / pied pour les
// MI. Chaque zone est un path SVG fermé et NON CHEVAUCHANT — les frontières
// articulaires se touchent exactement. ViewBox calibré 220×562 pour que la
// silhouette entière (tête au pied) tienne sans clipping.

interface RegionPath {
  id: BodyRegion
  /** SVG path en viewBox 0 0 220 562. */
  d: string
  /** Position du label central (tap-feedback). */
  cx: number
  cy: number
}

// ─── Pièces communes (face + dos) : tête, cou, membres ──────────────────────
// Tête : ellipse centrée sur la silhouette.
const HEAD: RegionPath = {
  id: 'tete',
  d: 'M 88 40 a 22 26 0 1 0 44 0 a 22 26 0 1 0 -44 0 z',
  cx: 110, cy: 40,
}

const COU: RegionPath = {
  id: 'cou',
  d: 'M 100 66 L 120 66 L 120 82 L 100 82 Z',
  cx: 110, cy: 74,
}

// Membre supérieur droit (MSD = côté gauche du viewer en vue antérieure ET
// postérieure pour cohérence d'usage clinique tablette).
const ARM_D: RegionPath[] = [
  { id: 'epauleD',     d: 'M 28 82 L 72 82 L 70 130 L 32 130 Z',                                 cx: 50, cy: 106 },
  { id: 'brasD',       d: 'M 32 130 L 70 130 L 69 215 L 35 215 Z',                               cx: 50, cy: 172 },
  { id: 'avantBrasD',  d: 'M 35 215 L 69 215 L 66 295 L 38 295 Z',                               cx: 52, cy: 254 },
  { id: 'mainD',       d: 'M 38 295 L 66 295 L 64 322 q -3 13 -13 13 L 41 335 q -8 0 -8 -8 Z',   cx: 51, cy: 314 },
]

// Membre supérieur gauche (mirroir x=110).
const ARM_G: RegionPath[] = [
  { id: 'epauleG',     d: 'M 192 82 L 148 82 L 150 130 L 188 130 Z',                              cx: 170, cy: 106 },
  { id: 'brasG',       d: 'M 188 130 L 150 130 L 151 215 L 185 215 Z',                            cx: 170, cy: 172 },
  { id: 'avantBrasG',  d: 'M 185 215 L 151 215 L 154 295 L 182 295 Z',                            cx: 168, cy: 254 },
  { id: 'mainG',       d: 'M 182 295 L 154 295 L 156 322 q 3 13 13 13 L 179 335 q 8 0 8 -8 Z',    cx: 169, cy: 314 },
]

// Membre inférieur droit.
const LEG_D: RegionPath[] = [
  { id: 'cuisseD', d: 'M 72 285 L 110 285 L 108 385 L 76 385 Z',                                          cx: 91,  cy: 335 },
  { id: 'genouD',  d: 'M 76 385 L 108 385 L 108 415 L 76 415 Z',                                          cx: 92,  cy: 400 },
  { id: 'jambeD',  d: 'M 76 415 L 108 415 L 104 510 L 80 510 Z',                                          cx: 92,  cy: 462 },
  { id: 'piedD',   d: 'M 80 510 L 104 510 L 102 545 q -2 7 -12 7 L 70 552 q -14 0 -14 -12 Z',            cx: 84,  cy: 530 },
]

// Membre inférieur gauche.
const LEG_G: RegionPath[] = [
  { id: 'cuisseG', d: 'M 110 285 L 148 285 L 144 385 L 112 385 Z',                                        cx: 129, cy: 335 },
  { id: 'genouG',  d: 'M 112 385 L 144 385 L 144 415 L 112 415 Z',                                        cx: 128, cy: 400 },
  { id: 'jambeG',  d: 'M 112 415 L 144 415 L 140 510 L 116 510 Z',                                        cx: 128, cy: 462 },
  { id: 'piedG',   d: 'M 140 510 L 116 510 L 118 545 q 2 7 12 7 L 150 552 q 14 0 14 -12 Z',              cx: 136, cy: 530 },
]

// ─── Tronc antérieur ────────────────────────────────────────────────────────
const TRUNK_FRONT: RegionPath[] = [
  { id: 'seinD',   d: 'M 72 82  L 110 82  L 110 120 L 72 120 Z',  cx: 91,  cy: 101 },
  { id: 'seinG',   d: 'M 110 82 L 148 82  L 148 120 L 110 120 Z', cx: 129, cy: 101 },
  { id: 'thorax',  d: 'M 72 120 L 148 120 L 148 165 L 72 165 Z',  cx: 110, cy: 142 },
  { id: 'abdomen', d: 'M 72 165 L 148 165 L 148 230 L 72 230 Z',  cx: 110, cy: 198 },
  { id: 'pelvis',  d: 'M 72 230 L 148 230 L 148 285 L 72 285 Z',  cx: 110, cy: 258 },
]

// ─── Tronc postérieur ───────────────────────────────────────────────────────
const TRUNK_BACK: RegionPath[] = [
  { id: 'dosHaut',  d: 'M 72 82  L 148 82  L 148 165 L 72 165 Z', cx: 110, cy: 124 },
  { id: 'lombaire', d: 'M 72 165 L 148 165 L 148 230 L 72 230 Z', cx: 110, cy: 198 },
  { id: 'fesses',   d: 'M 72 230 L 148 230 L 148 285 L 72 285 Z', cx: 110, cy: 258 },
]

const FRONT_REGIONS: RegionPath[] = [HEAD, COU, ...ARM_D, ...ARM_G, ...TRUNK_FRONT, ...LEG_D, ...LEG_G]
const BACK_REGIONS:  RegionPath[] = [HEAD, COU, ...ARM_D, ...ARM_G, ...TRUNK_BACK,  ...LEG_D, ...LEG_G]

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

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 280px) 1fr', gap: 16, alignItems: 'flex-start' }}>
        <svg
          viewBox="0 0 220 562"
          preserveAspectRatio="xMidYMid meet"
          style={{
            width: '100%', height: 'auto', maxHeight: 580,
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
              placeholder="Préciser : peau d'orange, fibrose, cicatrices, asymétries marquées, atteinte partielle d'un segment…"
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
    case 'tete':         return 'Tête'
    case 'cou':          return 'Cou'
    case 'epauleD':      return 'Ép-D'
    case 'epauleG':      return 'Ép-G'
    case 'brasD':        return 'Bras-D'
    case 'brasG':        return 'Bras-G'
    case 'avantBrasD':   return 'AB-D'
    case 'avantBrasG':   return 'AB-G'
    case 'mainD':        return 'Main-D'
    case 'mainG':        return 'Main-G'
    case 'seinD':        return 'Sein-D'
    case 'seinG':        return 'Sein-G'
    case 'thorax':       return 'Thorax'
    case 'abdomen':      return 'Abdomen'
    case 'pelvis':       return 'Pelvis'
    case 'dosHaut':      return 'Dos'
    case 'lombaire':     return 'Lomb.'
    case 'fesses':       return 'Fesses'
    case 'cuisseD':      return 'Cu-D'
    case 'cuisseG':      return 'Cu-G'
    case 'genouD':       return 'Gx-D'
    case 'genouG':       return 'Gx-G'
    case 'jambeD':       return 'Jb-D'
    case 'jambeG':       return 'Jb-G'
    case 'piedD':        return 'Pd-D'
    case 'piedG':        return 'Pd-G'
  }
}
