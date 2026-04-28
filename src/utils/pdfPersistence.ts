import type { PatientDocument, PatientDocumentSource } from '../types'

/**
 * Convertit un Blob en base64 pur (sans le préfixe `data:...;base64,`).
 * Utilisé pour stocker les PDF auto-générés dans IndexedDB au format
 * compatible avec PatientDocument.data.
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/**
 * Construit un PatientDocument prêt à être inséré dans le store
 * `physio_patient_docs`. Marque le doc comme `generated: true` et `masked: true`
 * (les PDF auto-générés ne sortent jamais de l'app et ne contiennent que des
 * données déjà connues du dossier — pas besoin du pipeline de caviardage).
 */
export async function buildGeneratedPatientDoc(
  blob: Blob,
  patientKey: string,
  fileName: string,
  source: Exclude<PatientDocumentSource, 'upload'>,
): Promise<PatientDocument> {
  const data = await blobToBase64(blob)
  const id = `gen-${source}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return {
    id,
    patientKey,
    name: fileName,
    mimeType: 'application/pdf',
    data,
    addedAt: new Date().toISOString(),
    masked: true,
    source,
    generated: true,
  }
}

/**
 * Libellé court d'un PatientDocumentSource pour affichage badge.
 */
export function sourceBadgeLabel(source?: PatientDocumentSource): string | null {
  switch (source) {
    case 'bilan': return 'Bilan PDF'
    case 'analyse-ia': return 'Analyse IA'
    case 'evolution': return 'Évolution'
    default: return null
  }
}
