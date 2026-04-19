import { useState } from 'react'

interface ExerciceTemplate {
  id: number
  name: string
  zone: string
  markdown: string
  createdAt: string
}

interface ExerciceTemplatesProps {
  currentMarkdown?: string
  onApply: (markdown: string) => void
  onClose: () => void
}

const STORAGE_KEY = 'physio_exercice_templates'

const ZONES = ['Épaule', 'Genou', 'Hanche', 'Cheville', 'Cervical', 'Lombaire', 'Général'] as const

function loadTemplates(): ExerciceTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveTemplates(templates: ExerciceTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
  } catch {
    // Storage full or unavailable
  }
}

export function ExerciceTemplates({ currentMarkdown, onApply, onClose }: ExerciceTemplatesProps) {
  const [templates, setTemplates] = useState<ExerciceTemplate[]>(loadTemplates)
  const [name, setName] = useState('')
  const [zone, setZone] = useState<string>(ZONES[0])
  const [filterZone, setFilterZone] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const filtered = filterZone
    ? templates.filter(t => t.zone === filterZone)
    : templates

  const handleSave = () => {
    if (!name.trim() || !currentMarkdown) return
    const newTemplate: ExerciceTemplate = {
      id: Date.now(),
      name: name.trim(),
      zone,
      markdown: currentMarkdown,
      createdAt: new Date().toISOString(),
    }
    const updated = [newTemplate, ...templates]
    setTemplates(updated)
    saveTemplates(updated)
    setName('')
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2000)
  }

  const handleDelete = (id: number) => {
    const updated = templates.filter(t => t.id !== id)
    setTemplates(updated)
    saveTemplates(updated)
    setConfirmDeleteId(null)
  }

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return ''
    }
  }

  const preview = (md: string) => {
    const clean = md.replace(/[#*_\->`]/g, '').trim()
    return clean.length > 100 ? clean.slice(0, 100) + '...' : clean
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      {/* Bottom sheet */}
      <div
        style={{
          position: 'relative',
          background: 'var(--surface)',
          borderTopLeftRadius: 'var(--radius-xl)',
          borderTopRightRadius: 'var(--radius-xl)',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-2xl)',
          animation: 'slideUp 0.3s ease-out',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border-color)' }} />
        </div>

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px 14px',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Mes modèles d'exercices
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.4rem',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 'var(--radius-md)',
              lineHeight: 1,
            }}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px 20px' }}>
          {/* Save section */}
          {currentMarkdown && (
            <div
              style={{
                margin: '16px 0',
                padding: 16,
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#065f46', marginBottom: 12 }}>
                Sauvegarder comme modèle
              </div>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nom du modèle..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #a7f3d0',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  background: '#fff',
                  color: 'var(--text-main)',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {ZONES.map(z => (
                  <button
                    key={z}
                    onClick={() => setZone(z)}
                    style={{
                      padding: '5px 12px',
                      fontSize: '0.78rem',
                      fontWeight: zone === z ? 700 : 500,
                      borderRadius: 20,
                      border: 'none',
                      cursor: 'pointer',
                      background: zone === z ? '#059669' : '#d1fae5',
                      color: zone === z ? '#fff' : '#065f46',
                      transition: 'all 0.15s',
                    }}
                  >
                    {z}
                  </button>
                ))}
              </div>
              <button
                onClick={handleSave}
                disabled={!name.trim()}
                style={{
                  marginTop: 12,
                  width: '100%',
                  padding: '10px 0',
                  background: name.trim() ? '#059669' : '#a7f3d0',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: name.trim() ? 'pointer' : 'default',
                  transition: 'background 0.15s',
                }}
              >
                {saveSuccess ? '✓ Modèle sauvegardé !' : 'Sauvegarder'}
              </button>
            </div>
          )}

          {/* Filter pills */}
          {templates.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '14px 0 10px' }}>
              <button
                onClick={() => setFilterZone(null)}
                style={{
                  padding: '5px 12px',
                  fontSize: '0.78rem',
                  fontWeight: filterZone === null ? 700 : 500,
                  borderRadius: 20,
                  border: 'none',
                  cursor: 'pointer',
                  background: filterZone === null ? '#059669' : 'var(--secondary)',
                  color: filterZone === null ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.15s',
                }}
              >
                Tous
              </button>
              {ZONES.map(z => {
                const count = templates.filter(t => t.zone === z).length
                if (count === 0) return null
                return (
                  <button
                    key={z}
                    onClick={() => setFilterZone(z)}
                    style={{
                      padding: '5px 12px',
                      fontSize: '0.78rem',
                      fontWeight: filterZone === z ? 700 : 500,
                      borderRadius: 20,
                      border: 'none',
                      cursor: 'pointer',
                      background: filterZone === z ? '#059669' : 'var(--secondary)',
                      color: filterZone === z ? '#fff' : 'var(--text-muted)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {z} ({count})
                  </button>
                )
              })}
            </div>
          )}

          {/* Template list */}
          {filtered.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'var(--text-muted)',
                fontSize: '0.88rem',
              }}
            >
              {templates.length === 0
                ? 'Aucun modèle sauvegardé'
                : 'Aucun modèle pour cette zone'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map(t => (
                <div
                  key={t.id}
                  style={{
                    padding: 14,
                    background: 'var(--surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    transition: 'box-shadow 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)', flex: 1 }}>
                      {t.name}
                    </span>
                    <span
                      style={{
                        padding: '2px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        borderRadius: 12,
                        background: '#d1fae5',
                        color: '#065f46',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t.zone}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                    {formatDate(t.createdAt)}
                  </div>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                      lineHeight: 1.45,
                      marginBottom: 12,
                      padding: '8px 10px',
                      background: 'var(--secondary)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    {preview(t.markdown)}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => {
                        onApply(t.markdown)
                        onClose()
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        background: '#059669',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Utiliser
                    </button>
                    {confirmDeleteId === t.id ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => handleDelete(t.id)}
                          style={{
                            padding: '8px 14px',
                            background: '#dc2626',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Confirmer
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          style={{
                            padding: '8px 14px',
                            background: 'var(--secondary)',
                            color: 'var(--text-muted)',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(t.id)}
                        style={{
                          padding: '8px 14px',
                          background: 'var(--secondary)',
                          color: '#dc2626',
                          border: 'none',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
