export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Groq API key not configured on server' });
    return;
  }

  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== 'string' || prompt.length < 100) {
    res.status(400).json({ error: 'Missing or invalid prompt' });
    return;
  }

  // Groq free tier: 12,000 TPM for llama-3.3-70b-versatile.
  // ~4 chars per token. Reserve ~2K tokens for system/prompt template + output headroom.
  // That leaves ~6K tokens (~24K chars) for paper content within the user message.
  // The prompt template itself is ~1,500 tokens, and we request 8,192 output tokens,
  // so we cap the total user message to keep input under ~3,500 tokens (~14K chars).
  const MAX_PROMPT_CHARS = 14000;
  let truncatedPrompt = prompt;
  let wasTruncated = false;

  if (prompt.length > MAX_PROMPT_CHARS) {
    truncatedPrompt = prompt.slice(0, MAX_PROMPT_CHARS) +
      '\n\n[… paper truncated to fit free-tier token limits. For full-length analysis, use Claude or ChatGPT with your own API key. …]';
    wasTruncated = true;
  }

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model:      'llama-3.3-70b-versatile',
        max_tokens: 4096,
        stream:     true,
        messages: [
          { role: 'system', content: 'You are an expert scientific literature analyst.' },
          { role: 'user',   content: truncatedPrompt },
        ],
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.json().catch(() => ({}));
      const msg = err.error?.message || `Groq API returned HTTP ${groqRes.status}`;
      res.status(groqRes.status).json({ error: msg });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (wasTruncated) {
      res.setHeader('X-Paper-Truncated', 'true');
    }

    const reader = groqRes.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }

    res.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal server error' });
    } else {
      res.end();
    }
  }
}
