exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Reframing engine not configured.' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body.' }) };
  }

  const { text } = body;
  if (!text || text.trim().length < 50) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Entry too short to reframe.' }) };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: `You are the creative director of "The Turning Point" — a cinematic journaling experience that helps people see themselves as the protagonist of their own story, not a passive victim of circumstance.

Someone has shared their day or a moment with you. Your job is to reframe it through four lenses, with warmth, depth, and cinematic honesty. Be specific to what they actually shared — not generic. Be honest, not falsely positive. If something was genuinely hard, acknowledge it — then find what it reveals or opens up.

The Director's Note should sound like a trusted friend over coffee — warm, direct, conversational. Not a life coach. Not a press release. One strong observation per sentence, no metaphor stacking.

Respond ONLY with a valid JSON object. No markdown, no backticks, no preamble. Just raw JSON:
{
  "chapter_title": "A bold, evocative chapter title. 3-8 words. Book-spine quality. Examples: The Year She Stopped Asking Permission, Learning to Hold the Wheel",
  "story_beat": "2-3 sentences. Describe what happened as a cinematic story beat — the person is the protagonist. Specific, not generic.",
  "directors_note": "Exactly 3 short sentences separated by newlines. First: what they did well — something specific. Second: one honest redirect or question, direct but not harsh. Third: a permission or encouragement. Each sentence stands alone. Warm, conversational, like a trusted friend.",
  "opportunity": "1-2 plain sentences. What is this moment opening up, even if it doesn't feel like it yet? No jargon. No motivational poster language. Something true and specific.",
  "mood_keywords": "2-3 comma-separated words describing the emotional mood and visual atmosphere of this entry. Choose words that would find a beautiful, evocative photo. Examples: solitude,morning,fog — or resilience,city,rain — or warmth,kitchen,light. No abstract concepts — think cinematic visuals."
}`,
        messages: [{ role: 'user', content: text.trim() }]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: err.error?.message || 'Reframing engine error.' })
      };
    }

    const data = await response.json();
    const rawText = data.content[0].text.trim();

    let result;
    try {
      result = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) result = JSON.parse(match[0]);
      else throw new Error('Could not parse AI response.');
    }

    // Build Unsplash URL from mood keywords
    // Uses the static source URL — free, no API key needed
    if (result.mood_keywords) {
      const keywords = result.mood_keywords
        .split(',')
        .map(k => k.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 3)
        .join(',');
      result.image_url = `https://source.unsplash.com/1200x600/?${encodeURIComponent(keywords)}`;
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Unexpected error.' })
    };
  }
};
