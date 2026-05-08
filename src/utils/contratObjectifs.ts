// Les bilans avec section « Contrat kiné » stockent `objectifs` comme tableau
// d'objets `{id, titre, cible, dateCible}` (BilanGenou, Cheville, Hanche,
// Generique, Geriatrique, Cervical, Lombaire), tandis que BilanEpaule stocke
// `contratKine.objectifsSMART` en string déjà jointe. Sans normalisation,
// `String(arrayOfObjects)` produit `"[object Object],[object Object]"` —
// ce qui corrompt silencieusement le PDF, l'IA et les lettres,
// et `.trim()` sur l'array crashait l'app entière (régression Résumé corrigée 2026-05-07).

export function objectifsToString(raw: unknown): string | null {
  if (raw == null) return null
  if (typeof raw === 'string') {
    const t = raw.trim()
    return t || null
  }
  if (Array.isArray(raw)) {
    const lines = raw
      .map(it => {
        if (typeof it === 'string') return it.trim()
        if (it && typeof it === 'object') {
          const o = it as Record<string, unknown>
          const titre = typeof o.titre === 'string' ? o.titre.trim() : ''
          const cible = typeof o.cible === 'string' ? o.cible.trim() : ''
          return cible ? `${titre} — ${cible}`.trim() : titre
        }
        return ''
      })
      .filter(Boolean)
    return lines.length ? lines.join(' · ') : null
  }
  return null
}

// Variante typée qui renvoie chaque objectif individuellement, utile pour
// auto-créer des `SmartObjectif` (App.tsx). Renvoie un tableau vide si rien d'exploitable.
export function objectifsToItems(raw: unknown): Array<{ titre: string; cible: string; dateCible: string }> {
  if (raw == null) return []

  if (typeof raw === 'string') {
    const lines = raw.split(/[\n;]+/).map(l => l.trim()).filter(l => l.length > 3)
    return lines.map(line => ({ titre: line, cible: '', dateCible: '' }))
  }

  if (Array.isArray(raw)) {
    return raw
      .map(it => {
        if (typeof it === 'string') {
          const t = it.trim()
          return t.length > 3 ? { titre: t, cible: '', dateCible: '' } : null
        }
        if (it && typeof it === 'object') {
          const o = it as Record<string, unknown>
          const titre = typeof o.titre === 'string' ? o.titre.trim() : ''
          const cible = typeof o.cible === 'string' ? o.cible.trim() : ''
          const dateCible = typeof o.dateCible === 'string' ? o.dateCible.trim() : ''
          return titre ? { titre, cible, dateCible } : null
        }
        return null
      })
      .filter((o): o is { titre: string; cible: string; dateCible: string } => o !== null)
  }

  return []
}
