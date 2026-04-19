import { useState, useRef } from 'react'
import type { BanqueExerciceEntry } from '../types'
import {
  loadBanque,
  saveBanque,
  mergeBanques,
  exportBanqueJSON,
  importBanqueJSON,
} from '../utils/banqueExercices'

const ZONES = ['Épaule', 'Genou', 'Hanche', 'Cheville', 'Cervical', 'Lombaire', 'Général'] as const

interface BanqueExercicesProps {
  onApply?: (markdown: string) => void
  onClose: () => void
  selectMode?: boolean  // true = mode sélection (depuis FicheExercice), false = mode gestion
}

function preview(md: string, maxLen = 110): string {
  return md.replace(/[#*_\->`]/g, '').replace(/\s+/g, ' ').trim().slice(0, maxLen) + (md.length > maxLen ? '…' : '')
}

export function BanqueExercices({ onApply, onClose, selectMode = false }: BanqueExercicesProps) {
  const [banque, setBanque] = useState<BanqueExerciceEntry[]>(loadBanque)
  const [filterZone, setFilterZone] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [tab, setTab] = useState<'exercices' | 'import'>('exercices')
  const importRef = useRef<HTMLInputElement>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const filtered = banque.filter(e => {
    if (filterZone && e.zone !== filterZone) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!e.name.toLowerCase().includes(q) && !e.markdown.toLowerCase().includes(q)) return false
    }
    return true
  })

  const handleDelete = (id: string) => {
    const updated = banque.filter(e => e.id !== id)
    setBanque(updated)
    saveBanque(updated)
    setConfirmDeleteId(null)
  }

  const handleExport = () => {
    const json = exportBanqueJSON(banque)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `banque_exercices_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast(`${banque.length} exercice(s) exporté(s)`)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const raw = ev.target?.result as string
      const imported = importBanqueJSON(raw)
      if (!imported) { showToast('Fichier invalide'); return }
      const merged = mergeBanques(banque, imported)
      const added = merged.length - banque.length
      setBanque(merged)
      saveBanque(merged)
      showToast(`Fusion OK — ${added} nouvel(s) exercice(s) ajouté(s)`)
    }
    reader.readAsText(file)
    if (importRef.current) importRef.current.value = ''
  }

  const zoneCounts = ZONES.reduce((acc, z) => {
    acc[z] = banque.filter(e => e.zone === z).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }} />

      {/* Sheet */}
      <div style={{ position: 'relative', background: 'var(--surface)', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-2xl)', animation: 'slideUp 0.28s ease-out' }}>

        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border-color)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 0' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Banque d'exercices
            </h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {banque.length} exercice{banque.length > 1 ? 's' : ''} · déduplication automatique
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px 8px', lineHeight: 1 }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '12px 20px 0', borderBottom: '1px solid var(--border-color)' }}>
          {(['exercices', 'import'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 16px', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', background: tab === t ? 'var(--primary)' : 'transparent', color: tab === t ? 'white' : 'var(--text-muted)', transition: 'all 0.15s' }}>
              {t === 'exercices' ? '📚 Exercices' : '↕ Import / Export'}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px 24px' }}>

          {tab === 'import' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ padding: 16, background: 'var(--color-info-bg)', border: '1px solid var(--color-info-border)', borderRadius: 12 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-info)', marginBottom: 8 }}>Exporter ma banque</div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
                  Génère un fichier JSON à partager avec Arnaud. Lors du merge, les exercices en commun ne seront pas dupliqués.
                </p>
                <button onClick={handleExport} style={{ width: '100%', padding: '10px 0', background: 'var(--color-info)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
                  Télécharger la banque ({banque.length} exercices)
                </button>
              </div>

              <div style={{ padding: 16, background: 'var(--color-purple-bg)', border: '1px solid var(--color-purple-border)', borderRadius: 12 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-purple)', marginBottom: 8 }}>Importer &amp; fusionner</div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
                  Importe la banque JSON d'Arnaud. La fusion est automatique — les doublons sont détectés par empreinte de contenu.
                </p>
                <input ref={importRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} id="banque-import" />
                <label htmlFor="banque-import" style={{ display: 'block', width: '100%', padding: '10px 0', background: 'var(--color-purple)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', textAlign: 'center' }}>
                  Choisir un fichier JSON à importer
                </label>
              </div>

              <div style={{ padding: 12, background: 'var(--color-gray-bg)', border: '1px solid var(--color-gray-border)', borderRadius: 10 }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
                  <strong>Comment ça marche :</strong><br />
                  1. Arnaud exporte sa banque → envoie le fichier JSON<br />
                  2. Tu importes son JSON ici<br />
                  3. La banque commune est créée automatiquement, sans doublon
                </div>
              </div>
            </div>

          ) : (
            <>
              {/* Search */}
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <input
                  type="search"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher un exercice..."
                  style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1.5px solid var(--border-color)', borderRadius: 10, fontSize: '0.85rem', outline: 'none', background: 'var(--secondary)', color: 'var(--text-main)', boxSizing: 'border-box' }}
                />
                <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>

              {/* Zone filters */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                <button onClick={() => setFilterZone(null)} style={{ padding: '5px 12px', fontSize: '0.78rem', fontWeight: filterZone === null ? 700 : 500, borderRadius: 20, border: 'none', cursor: 'pointer', background: filterZone === null ? 'var(--primary)' : 'var(--secondary)', color: filterZone === null ? 'white' : 'var(--text-muted)', transition: 'all 0.15s' }}>
                  Tous ({banque.length})
                </button>
                {ZONES.filter(z => zoneCounts[z] > 0).map(z => (
                  <button key={z} onClick={() => setFilterZone(z)} style={{ padding: '5px 12px', fontSize: '0.78rem', fontWeight: filterZone === z ? 700 : 500, borderRadius: 20, border: 'none', cursor: 'pointer', background: filterZone === z ? 'var(--primary)' : 'var(--secondary)', color: filterZone === z ? 'white' : 'var(--text-muted)', transition: 'all 0.15s' }}>
                    {z} ({zoneCounts[z]})
                  </button>
                ))}
              </div>

              {/* List */}
              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  {banque.length === 0
                    ? 'Aucun exercice dans la banque.\nIls s\'ajouteront automatiquement à chaque génération IA.'
                    : 'Aucun résultat pour cette recherche.'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filtered.map(entry => (
                    <div key={entry.id} style={{ padding: 14, background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 12, transition: 'box-shadow 0.15s' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', flex: 1, lineHeight: 1.35 }}>{entry.name}</span>
                        <span style={{ padding: '2px 9px', fontSize: '0.7rem', fontWeight: 600, borderRadius: 10, background: 'var(--color-info-bg)', color: 'var(--color-info)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {entry.zone}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        <span>{entry.source === 'ia' ? '🤖 IA' : '✍️ Manuel'}</span>
                        <span>·</span>
                        <span>Utilisé {entry.usageCount}×</span>
                        <span>·</span>
                        <span>{new Date(entry.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <div style={{ fontSize: '0.79rem', color: 'var(--text-muted)', lineHeight: 1.45, padding: '7px 10px', background: 'var(--secondary)', borderRadius: 8, marginBottom: 10 }}>
                        {preview(entry.markdown)}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {selectMode && onApply && (
                          <button onClick={() => { onApply(entry.markdown); onClose() }} style={{ flex: 1, padding: '8px 0', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
                            Insérer
                          </button>
                        )}
                        {confirmDeleteId === entry.id ? (
                          <>
                            <button onClick={() => handleDelete(entry.id)} style={{ flex: 1, padding: '8px 0', background: 'var(--color-danger)', color: 'white', border: 'none', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>Confirmer</button>
                            <button onClick={() => setConfirmDeleteId(null)} style={{ padding: '8px 14px', background: 'var(--secondary)', color: 'var(--text-muted)', border: 'none', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                          </>
                        ) : (
                          <button onClick={() => setConfirmDeleteId(entry.id)} style={{ padding: '8px 14px', background: 'var(--secondary)', color: 'var(--color-danger)', border: 'none', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                            Supprimer
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', background: 'var(--primary-dark)', color: 'white', padding: '10px 20px', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600, zIndex: 10001, whiteSpace: 'nowrap', boxShadow: 'var(--shadow-lg)' }}>
          {toast}
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
