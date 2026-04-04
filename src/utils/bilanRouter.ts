import type { BilanType } from '../types'

export const ZONE_TO_BILAN: Record<string, BilanType> = {
  'Épaule Droite':   'epaule',
  'Épaule Gauche':   'epaule',
  'Epaule Droite':   'epaule',
  'Epaule Gauche':   'epaule',
  'Epaule':          'epaule',
  'Épaule':          'epaule',
  'Genou Droit':     'genou',
  'Genou Gauche':    'genou',
  'Genou':           'genou',
  'Hanche Droite':   'hanche',
  'Hanche Gauche':   'hanche',
  'Hanche':          'hanche',
  'Cheville Droite': 'cheville',
  'Cheville Gauche': 'cheville',
  'Cheville':        'cheville',
  'Cervicales':      'cervical',
  'Rachis Cervical': 'cervical',
  'Lombaires':       'lombaire',
  'Rachis Lombaire': 'lombaire',
  'Lombaire':        'lombaire',
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
  return ZONE_TO_BILAN[zone] ?? 'generique'
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
