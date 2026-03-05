const extractJson = (raw) => {
  if (!raw) return null
  const trimmed = String(raw).trim()
  const withoutFences = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()

  try {
    return JSON.parse(withoutFences)
  } catch {
    const start = withoutFences.indexOf('{')
    const end = withoutFences.lastIndexOf('}')
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(withoutFences.slice(start, end + 1))
      } catch {
        return null
      }
    }
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { inputAssumptions, results } = req.body || {}
    if (!inputAssumptions || !results) {
      return res.status(400).json({ error: 'Missing inputAssumptions or results' })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return res.status(400).json({ error: 'ANTHROPIC_API_KEY is not configured in Vercel env vars' })
    }

    const prompt = `You are a financial simulation report assistant.
Return plain JSON only with this schema:
{
  "executiveSummary": string,
  "riskExplanation": string,
  "actionChecklist": string[],
  "disclaimer": string
}

Context:
- Product: Financial simulation tool, not investment advice
- Market: Australia restaurant franchise first-time operators
- Use the deterministic results below and avoid making up numbers.

Input assumptions:
${JSON.stringify(inputAssumptions, null, 2)}

Computation results:
${JSON.stringify(results, null, 2)}
`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
        max_tokens: 900,
        temperature: 0.2,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return res.status(500).json({ error: `Anthropic error: ${errText}` })
    }

    const data = await response.json()
    const text = data?.content?.[0]?.text || '{}'

    const parsedFromModel = extractJson(text)
    const parsed = parsedFromModel || {
      executiveSummary: text,
      riskExplanation: '',
      actionChecklist: [],
      disclaimer: 'This is a financial simulation tool, not investment advice. Outputs depend on assumptions.',
    }

    return res.status(200).json(parsed)
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to generate report' })
  }
}
