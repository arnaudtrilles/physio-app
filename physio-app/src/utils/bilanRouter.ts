import type { BilanType } from '../types'

export const ZONE_TO_BILAN: Record<string, BilanType> = {
  // Épaule
  'Épaule Droite':    'epaule',
  'Épaule Gauche':    'epaule',
  'Epaule Droite':    'epaule',
  'Epaule Gauche':    'epaule',
  'Epaule':           'epaule',
  'Épaule':           'epaule',
  'epaule':           'epaule',
  // Genou
  'Genou Droit':      'genou',
  'Genou Gauche':     'genou',
  'Genou':            'genou',
  'genou':            'genou',
  // Hanche
  'Hanche Droite':    'hanche',
  'Hanche Gauche':    'hanche',
  'Hanche':           'hanche',
  'hanche':           'hanche',
  // Cheville
  'Cheville Droite':  'cheville',
  'Cheville Gauche':  'cheville',
  'Cheville':         'cheville',
  'cheville':         'cheville',
  // Cervical
  'Cervicales':       'cervical',
  'Rachis Cervical':  'cervical',
  'Cervical':         'cervical',
  'cervical':         'cervical',
  'Col':              'cervical',
  // Lombaire
  'Lombaires':        'lombaire',
  'Rachis Lombaire':  'lombaire',
  'Lombaire':         'lombaire',
  'lombaire':         'lombaire',
  'Lombalgie':        'lombaire',
}

export const BODY_ZONES = [
  'Épaule',
  'Genou',
  'Hanche',
  'Cheville',
  'Cervicales',
  'Lombaire',
  'Autre',
]

export function getBilanType(zone: string): BilanType {
  if (!zone) return 'generique'
  // Correspondance exacte
  if (ZONE_TO_BILAN[zone]) return ZONE_TO_BILAN[zone]
  // Correspondance insensible à la casse
  const lower = zone.toLowerCase()
  for (const [key, val] of Object.entries(ZONE_TO_BILAN)) {
    if (key.toLowerCase() === lower) return val
  }
  // Correspondance partielle (ex: "Épaule droite" → 'epaule')
  if (lower.includes('epaule') || lower.includes('épaule')) return 'epaule'
  if (lower.includes('genou'))   return 'genou'
  if (lower.includes('hanche'))  return 'hanche'
  if (lower.includes('cheville')) return 'cheville'
  if (lower.includes('cervic') || lower.includes('col')) return 'cervical'
  if (lower.includes('lombaire') || lower.includes('lombaires') || lower.includes('lombalg')) return 'lombaire'
  return 'generique'
}

export const BILAN_ZONE_LABELS: Record<BilanType, string> = {
  epaule:   'Bilan Épaule',
  cheville: 'Bilan Cheville',
  genou:    'Bilan Genou',
  hanche:   'Bilan Hanche',
  cervical: 'Bilan Rachis Cervical',
  lombaire: 'Bilan Rachis Lombaire',
  generique:'Bilan Général',
}
