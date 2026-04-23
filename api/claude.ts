import type { VercelRequest, VercelResponse } from '@vercel/node'

export const config = { maxDuration: 60 }

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' })
  }

  try {
    const { systemPrompt, userPrompt, maxTokens = 8192, model = 'claude-sonnet-4-6' } = req.body

    if (!userPrompt) return res.status(400).json({ error: 'userPrompt is required' })

    const body = JSON.stringify({
      model,
      max_tokens: maxTokens,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages: [{ role: 'user', content: userPrompt }],
    })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 55_000)

    let apiRes: Response
    try {
      apiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body,
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    const responseText = await apiRes.text()

    if (!apiRes.ok) {
      let message = responseText
      try {
        const parsed = JSON.parse(responseText)
        message = parsed?.error?.message || responseText
      } catch { /* keep raw */ }
      return res.status(apiRes.status).json({ error: message.slice(0, 500) })
    }

    let data: { content?: Array<{ type: string; text?: string }> }
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      return res.status(502).json({ error: `Invalid JSON from Anthropic: ${(e as Error).message}` })
    }

    const result = data?.content?.find(c => c.type === 'text')?.text ?? ''
    if (!result) return res.status(502).json({ error: 'Empty response from Claude' })

    return res.status(200).json({ result, model })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Claude proxy error:', message)
    return res.status(500).json({ error: message })
  }
}
