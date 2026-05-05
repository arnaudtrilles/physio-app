import type { BilanType } from '../../types'
import { TestResultInput, ClusterLaslettInput } from './testInputs'
import { TestInfoButton } from './testInfo/TestInfoButton'

// ─── NoyauTestsFinal ─────────────────────────────────────────────────────────
// Renders the noyau-EBP-aligned tests for the final bilan (BilanSortie).
// Layout matches BilanXxx.tsx noyau testsSpec sections one-to-one (same labels,
// same widgets) and surfaces a discreet "Initial : …" reminder under each test.

type Tests = Record<string, string>

interface Props {
  bilanType: BilanType
  tests: Tests
  setT: (k: string, v: string) => void
  initialTests?: Tests
}

const subtitleStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 8,
}

// ─── Cheville helper (legacy positif/negatif format) ─────────────────────────

function ChevilleTestRow({ k, lbl, tests, setT, initialTests }: {
  k: string; lbl: string; tests: Tests; setT: (k: string, v: string) => void; initialTests?: Tests
}) {
  const current = tests[k] ?? ''
  const initial = initialTests?.[k] ?? ''
  const initLabel = initial === 'positif' ? 'positif' : initial === 'negatif' ? 'négatif' : null
  const initColor = initial === 'positif' ? '#991b1b' : initial === 'negatif' ? '#166534' : 'var(--text-muted)'
  return (
    <div className="oui-non-group" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="oui-non-label">{lbl}<TestInfoButton testKey={k} /></span>
        <div className="oui-non-btns">
          {(['Positif', 'Négatif'] as const).map(v => {
            const stored = v === 'Positif' ? 'positif' : 'negatif'
            return (
              <button
                key={v}
                type="button"
                className={`oui-non-btn${current === stored ? ' active' : ''}`}
                onClick={() => setT(k, current === stored ? '' : stored)}
              >{v}</button>
            )
          })}
        </div>
      </div>
      {initialTests && (
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.3 }}>
          <span style={{ fontWeight: 600 }}>Initial :</span>{' '}
          {initLabel
            ? <span style={{ color: initColor, fontWeight: 700 }}>{initLabel}</span>
            : <span>—</span>}
        </div>
      )}
    </div>
  )
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

export function NoyauTestsFinal({ bilanType, tests, setT, initialTests }: Props) {
  const prev = initialTests ?? {}

  if (bilanType === 'lombaire') {
    return (
      <>
        <ClusterLaslettInput
          value={tests.clusterLaslett ?? ''}
          onChange={v => setT('clusterLaslett', v)}
          previousValue={prev.clusterLaslett}
        />
        {([
          ['proneInstability', 'Prone Instability Test'],
          ['aslr', 'ASLR (Active Straight Leg Raise)'],
        ] as [string, string][]).map(([k, lbl]) => (
          <TestResultInput
            key={k}
            label={lbl}
            testKey={k}
            value={tests[k] ?? ''}
            onChange={v => setT(k, v)}
            previousValue={prev[k]}
          />
        ))}
      </>
    )
  }

  if (bilanType === 'epaule') {
    return (
      <>
        <p style={subtitleStyle}>Rupture de coiffe (lag signs inclus)</p>
        {([
          ['bearHug', 'Bear Hug Test'],
          ['bellyPress', 'Belly Press Test'],
          ['externalRotLagSign', 'External Rotation Lag Sign (ERLS)'],
          ['internalRotLagSign', 'Internal Rotation Lag Sign (IRLS — subscapulaire)'],
        ] as [string, string][]).map(([k, lbl]) => (
          <TestResultInput
            key={k}
            label={lbl}
            testKey={k}
            value={tests[k] ?? ''}
            onChange={v => setT(k, v)}
            previousValue={prev[k]}
          />
        ))}
        <p style={{ ...subtitleStyle, margin: '14px 0 8px' }}>Instabilité</p>
        {([
          ['apprehensionRelocation', 'Apprehension / Relocation Test'],
          ['signeSulcus', 'Test du signe du Sulcus'],
          ['jerkTest', 'Jerk Test'],
        ] as [string, string][]).map(([k, lbl]) => (
          <TestResultInput
            key={k}
            label={lbl}
            testKey={k}
            value={tests[k] ?? ''}
            onChange={v => setT(k, v)}
            previousValue={prev[k]}
          />
        ))}
      </>
    )
  }

  if (bilanType === 'genou') {
    return (
      <>
        {([
          ['thessaly', 'Test de Thessaly (méniscal)'],
          ['noble', 'Test de Noble (TFL/ITB)'],
        ] as [string, string][]).map(([k, lbl]) => (
          <TestResultInput
            key={k}
            label={lbl}
            testKey={k}
            value={tests[k] ?? ''}
            onChange={v => setT(k, v)}
            previousValue={prev[k]}
          />
        ))}
      </>
    )
  }

  if (bilanType === 'hanche') {
    return (
      <>
        {([
          ['faber', 'FABER (Patrick) — imposé JOSPT'],
          ['faddir', 'FADDIR — FAI/nonarthritic'],
        ] as [string, string][]).map(([k, lbl]) => (
          <TestResultInput
            key={k}
            label={lbl}
            testKey={k}
            value={tests[k] ?? ''}
            onChange={v => setT(k, v)}
            previousValue={prev[k]}
          />
        ))}
      </>
    )
  }

  if (bilanType === 'cervical') {
    return (
      <>
        {([
          ['spurling', 'Spurling Test'],
          ['distraction', 'Distraction Test'],
        ] as [string, string][]).map(([k, lbl]) => (
          <TestResultInput
            key={k}
            label={lbl}
            testKey={k}
            value={tests[k] ?? ''}
            onChange={v => setT(k, v)}
            previousValue={prev[k]}
          />
        ))}
      </>
    )
  }

  if (bilanType === 'cheville') {
    return (
      <>
        <p style={subtitleStyle}>Talo-crurale</p>
        <ChevilleTestRow k="altd"           lbl="ALTD — Lig. talo-fibulaire antérieur"     tests={tests} setT={setT} initialTests={initialTests} />
        <ChevilleTestRow k="raltd"          lbl="Reverse ALTD — anterolateral talar palpation" tests={tests} setT={setT} initialTests={initialTests} />
        <ChevilleTestRow k="talarTiltVarus" lbl="Talar Tilt varus — Lig. calcanéo-fibulaire" tests={tests} setT={setT} initialTests={initialTests} />
      </>
    )
  }

  // generique / geriatrique / drainage-lymphatique → no specific noyau tests
  return null
}
