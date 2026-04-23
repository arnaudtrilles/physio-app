/**
 * Client pour appeler Claude (Anthropic) via le proxy serverless /api/claude.
 * La clé API reste côté serveur — jamais exposée au client.
 */
export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 8192,
  model = 'claude-sonnet-4-6',
): Promise<string> {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemPrompt, userPrompt, maxTokens, model }),
  })

  const raw = await res.text()

  if (!res.ok) {
    let message = raw
    try {
      const parsed = JSON.parse(raw)
      message = parsed?.error || raw
    } catch { /* keep raw */ }
    throw new Error(`Claude ${res.status}: ${message.slice(0, 300)}`)
  }

  let data: { result?: string }
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error('Réponse Claude invalide (non-JSON)')
  }

  if (!data.result) throw new Error('Réponse Claude vide')
  return data.result
}
