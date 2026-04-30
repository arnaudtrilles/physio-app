export type PlanId = 'basique' | 'pro' | 'cabinet'
export type BillingInterval = 'monthly' | 'annual'

export interface PlanConfig {
  id: PlanId
  name: string
  priceMonthly: number
  priceAnnual: number   // total annuel (≈ 11 mois, 1 mois offert)
  currency: string
  description: string
  features: string[]
  notIncluded?: string[]
  highlighted?: boolean
  productId: string
  priceId: string           // prix mensuel Stripe
  priceIdAnnual?: string    // prix annuel Stripe (à créer plus tard)
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
    priceMonthly: 29,
    priceAnnual: 319,   // 29 × 11 mois — 1 mois offert
    currency: 'CHF',
    description: 'Idéal pour démarrer',
    features: [
      'Bilans initiaux illimités (toutes zones)',
      'Analyse IA par bilan (Claude)',
      'Génération PDF & courriers',
      'Notes de séance',
      'Stockage local sécurisé',
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
    priceMonthly: 49,
    priceAnnual: 539,   // 49 × 11 mois — 1 mois offert
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
      'Fiche d\'exercices IA',
    ],
    ...STRIPE_PLANS.pro,
  },
  {
    id: 'cabinet',
    name: 'Cabinet',
    priceMonthly: 89,
    priceAnnual: 979,   // 89 × 11 mois — 1 mois offert
    currency: 'CHF',
    description: 'Pour les cabinets multi-physios',
    features: [
      'Tout ce qui est inclus dans Pro',
      'Jusqu\'à 3 physiothérapeutes',
      'Dossiers patients partagés',
      'Gestion des membres',
      'Facturation centralisée',
      '+20 CHF/mois par physio supplémentaire',
    ],
    ...STRIPE_PLANS.cabinet,
  },
]
