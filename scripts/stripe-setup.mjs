/**
 * Script de création des produits et prix Stripe pour PhysioScan.
 * Lancer une seule fois : node scripts/stripe-setup.mjs
 * Les prix peuvent être modifiés dans le dashboard Stripe à tout moment
 * (archiver l'ancien prix, créer un nouveau — les abonnements existants ne sont pas affectés).
 */

import Stripe from 'stripe'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Charge .env manuellement (pas de dotenv requis)
try {
  const envFile = readFileSync(resolve(__dirname, '../.env'), 'utf8')
  for (const line of envFile.split('\n')) {
    const [key, ...rest] = line.split('=')
    if (key && rest.length && !process.env[key.trim()]) {
      process.env[key.trim()] = rest.join('=').trim()
    }
  }
} catch {}

const secretKey = process.env.STRIPE_SECRET_KEY
if (!secretKey) {
  console.error('❌ STRIPE_SECRET_KEY manquante dans .env')
  process.exit(1)
}

const stripe = new Stripe(secretKey)

const PLANS = [
  {
    name: 'PhysioScan Basique',
    description: 'Accès mobile — bilans, notes de séance, Lucie IA',
    price: 2900, // centimes CHF
    currency: 'chf',
    interval: 'month',
    metadata: { plan: 'basique' },
  },
  {
    name: 'PhysioScan Pro',
    description: 'Tout Basique + accès desktop, objectifs SMART, lettres médecins',
    price: 4900,
    currency: 'chf',
    interval: 'month',
    metadata: { plan: 'pro' },
  },
  {
    name: 'PhysioScan Cabinet',
    description: 'Jusqu\'à 3 physiothérapeutes — dossiers partagés, gestion multi-membres',
    price: 8900,
    currency: 'chf',
    interval: 'month',
    metadata: { plan: 'cabinet', included_seats: '3' },
  },
  {
    name: 'PhysioScan Cabinet — Siège supplémentaire',
    description: 'Chaque physiothérapeute supplémentaire au-delà de 3',
    price: 2000,
    currency: 'chf',
    interval: 'month',
    metadata: { plan: 'cabinet_seat' },
  },
]

async function main() {
  console.log('🚀 Création des produits Stripe PhysioScan...\n')
  const results = []

  for (const plan of PLANS) {
    // Vérifie si le produit existe déjà (idempotent)
    const existing = await stripe.products.search({
      query: `name:'${plan.name}' AND active:'true'`,
    })

    let product
    if (existing.data.length > 0) {
      product = existing.data[0]
      console.log(`⏭  Produit existant : ${product.name} (${product.id})`)
    } else {
      product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: plan.metadata,
      })
      console.log(`✅ Produit créé : ${product.name} (${product.id})`)
    }

    // Vérifie si le prix existe déjà
    const prices = await stripe.prices.list({ product: product.id, active: true })
    const existingPrice = prices.data.find(p => p.unit_amount === plan.price && p.currency === plan.currency)

    let price
    if (existingPrice) {
      price = existingPrice
      console.log(`   ⏭  Prix existant : ${plan.price / 100} ${plan.currency.toUpperCase()}/mois (${price.id})`)
    } else {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.price,
        currency: plan.currency,
        recurring: { interval: plan.interval },
        metadata: plan.metadata,
      })
      console.log(`   ✅ Prix créé : ${plan.price / 100} ${plan.currency.toUpperCase()}/mois (${price.id})`)
    }

    results.push({ plan: plan.metadata.plan, productId: product.id, priceId: price.id })
  }

  console.log('\n📋 Résumé — colle ces IDs dans src/config/stripePlans.ts :\n')
  console.log('export const STRIPE_PLANS = {')
  for (const r of results) {
    console.log(`  ${r.plan}: {`)
    console.log(`    productId: '${r.productId}',`)
    console.log(`    priceId: '${r.priceId}',`)
    console.log(`  },`)
  }
  console.log('}')
}

main().catch(err => {
  console.error('❌ Erreur :', err.message)
  process.exit(1)
})
