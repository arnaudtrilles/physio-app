// Vérifie les variables d'environnement requises au boot (pas en cours de requête).
// À appeler en haut de chaque handler qui en a besoin.

const REQUIRED: Record<string, string[]> = {
  claude: ['ANTHROPIC_API_KEY'],
  transcribe: ['AZURE_OPENAI_ENDPOINT', 'AZURE_OPENAI_KEY', 'AZURE_OPENAI_SOLO_DEPLOYMENT'],
  stripe: ['STRIPE_SECRET_KEY'],
  webhook: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
}

export function validateEnv(context: keyof typeof REQUIRED): void {
  const missing = REQUIRED[context].filter(v => !process.env[v])
  if (missing.length > 0) {
    throw new Error(`[${context}] Missing environment variables: ${missing.join(', ')}`)
  }
}
