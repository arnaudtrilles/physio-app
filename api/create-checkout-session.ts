import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { checkRateLimit, getClientIp } from './_ratelimit'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// 5 tentatives de checkout par minute par IP (anti-spam)
const RATE_LIMIT = { maxRequests: 5, windowMs: 60_000 }

// Seuls ces price IDs sont autorisés (liste blanche)
const ALLOWED_PRICE_IDS = new Set([
  'price_1TRt26D0F8LY2YWQPrZLO1cP', // basique mensuel
  'price_1TRt27D0F8LY2YWQic53UwNU', // pro mensuel
  'price_1TRt28D0F8LY2YWQ1irmWUBU', // cabinet mensuel
])

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const ip = getClientIp(req.headers as Record<string, string | string[] | undefined>)
  if (!checkRateLimit(`checkout:${ip}`, RATE_LIMIT)) {
    return res.status(429).json({ error: 'Trop de tentatives. Réessaie dans une minute.' })
  }

  const { priceId, userId, userEmail, successUrl, cancelUrl } = req.body

  if (!priceId || !successUrl || !cancelUrl) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  if (!ALLOWED_PRICE_IDS.has(priceId)) {
    return res.status(400).json({ error: 'Invalid price ID' })
  }

  // Valide que les URLs de retour pointent bien sur notre domaine
  const allowedHosts = ['physio-app-version-finale.vercel.app', 'localhost']
  let successHost: string, cancelHost: string
  try {
    successHost = new URL(successUrl).hostname
    cancelHost = new URL(cancelUrl).hostname
  } catch {
    return res.status(400).json({ error: 'Invalid URL' })
  }
  if (!allowedHosts.some(h => successHost.endsWith(h)) || !allowedHosts.some(h => cancelHost.endsWith(h))) {
    return res.status(400).json({ error: 'Invalid redirect URL' })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      customer_email: userEmail,
      metadata: { userId: userId ?? '' },
      subscription_data: {
        metadata: { userId: userId ?? '' },
      },
    })

    res.status(200).json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe error'
    res.status(500).json({ error: message })
  }
}
