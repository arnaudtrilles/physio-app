export type PlanId = 'basique' | 'pro' | 'cabinet'

export interface PlanConfig {
  id: PlanId
  name: string
  price: number
  currency: string
  description: string
  features: string[]
  notIncluded?: string[]
  productId: string
  priceId: string
  highlighted?: boolean
}

export const STRIPE_PLANS: Record<string, { productId: string; priceId: string }> = {
  basique: {
    productId: 'prod_UQkXji8QlvrcKl',
    priceId: 'price_1TRt26D0F8LY2YWQPrZLO1cP',
  },
  pro: {
    productId: 'prod_UQkXVTxRUYeW6S',
    priceId: 'price_1TRt27D0F8LY2YWQic53UwNU',
  },
  cabinet: {
    productId: 'prod_UQkXzz9j5SmGGQ',
    priceId: 'price_1TRt28D0F8LY2YWQ1irmWUBU',
  },
  cabinet_seat: {
    productId: 'prod_UQkXPK5mZbHwhk',
    priceId: 'price_1TRt29D0F8LY2YWQEJycppQF',
  },
}

export const PLANS: PlanConfig[] = [
  {
    id: 'basique',
    name: 'Basique',
    price: 29,
    currency: 'CHF',
    description: 'Idéal pour démarrer',
    features: [
      'Bilans initiaux illimités',
      'Notes de séance',
      'Lucie IA (assistant vocal)',
      'Génération PDF',
      'Accès mobile uniquement',
    ],
    notIncluded: [
      'Accès desktop',
      'Objectifs SMART',
      'Lettres médecins',
    ],
    ...STRIPE_PLANS.basique,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 49,
    currency: 'CHF',
    description: 'Pour les praticiens exigeants',
    highlighted: true,
    features: [
      'Tout ce qui est inclus dans Basique',
      'Accès desktop complet',
      'Objectifs SMART avec suivi',
      'Lettres aux médecins (IA)',
      'Bilans intermédiaires',
      'Analyse d\'évolution IA',
    ],
    ...STRIPE_PLANS.pro,
  },
  {
    id: 'cabinet',
    name: 'Cabinet',
    price: 89,
    currency: 'CHF',
    description: 'Pour les cabinets multi-physios',
    features: [
      'Tout ce qui est inclus dans Pro',
      'Jusqu\'à 3 physiothérapeutes',
      'Dossiers patients partagés',
      'Gestion des membres du cabinet',
      'Facturation centralisée',
      '+20 CHF/mois par physio supplémentaire',
    ],
    ...STRIPE_PLANS.cabinet,
  },
]
