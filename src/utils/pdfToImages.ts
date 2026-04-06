// Build legacy : évite l'usage de Map.prototype.getOrInsertComputed
// (proposition TC39 non supportée par tous les navigateurs stables)
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

// Worker chargé depuis CDN — version synchronisée avec le paquet installé
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/legacy/build/pdf.worker.min.mjs`

// Convertit un PDF en dataURLs PNG (une par page)
export async function pdfToImages(dataUrl: string): Promise<string[]> {
  // Extraire les bytes base64
  const base64 = dataUrl.split(',')[1]
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise
  const images: string[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    // Rendu haute résolution adapté à l'écran (retina) : scale 3 min, 4 sur écrans HD
    const scale = Math.max(3, Math.min(4, (window.devicePixelRatio || 1) + 1))
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')
    if (!ctx) continue

    // pdfjs-dist v5 : passer `canvas` directement (plus besoin de canvasContext)
    await page.render({ canvas, viewport }).promise
    images.push(canvas.toDataURL('image/jpeg', 0.92))
  }

  return images
}
