exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const { text } = JSON.parse(event.body);

    if (!text || text.trim().length < 50) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Entry too short — keep writing...' })
      };
    }

    // ── STEP 1: Call Claude for reframing ──
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: `You are the creative director of "The Turning Point" — a cinematic journaling experience that helps people see themselves as the protagonist of their own story, not a passive victim of circumstance.

Someone has shared their day or a moment with you. Your job is to reframe it through four lenses. Be specific to what they actually shared — not generic. Be honest, not falsely positive. If something was genuinely hard, acknowledge it — then find what it reveals or opens up.

TONE: Write like a warm, trusted friend who happens to see the world cinematically — not a life coach, not a therapist, not a press release. Conversational and clear. One strong image is better than five layered metaphors. Avoid dense, textbook-style language. The person reading this should feel seen, not confused.

PRONOUNS: Always use second person ("you", "your"). Never use gendered pronouns like she/her or he/him. The protagonist is always "you".

HIDDEN OPPORTUNITY especially: Keep it simple and plain. One or two sentences maximum. No jargon, no metaphor stacking. Just one true, specific thing this moment is opening up. Write it like you're saying it across a coffee table, not presenting at a conference.

DIRECTOR'S NOTE: Three short, punchy, standalone observations. Each sentence does one job:
- First: name something they genuinely did well — specific, not generic praise
- Second: one honest question or redirect — something worth sitting with, not a lecture
- Third: one permission or encouragement — something they're allowed to feel or do

Respond ONLY with a valid JSON object. No markdown, no backticks, no preamble. Just raw JSON:
{
  "chapter_title": "A bold, evocative chapter title. 3-8 words. Book-spine quality. Examples: The Year You Stopped Asking Permission, Learning to Hold the Wheel",
  "story_beat": "2-3 sentences. Describe what happened as a cinematic story beat using second person — YOU are the protagonist. Specific, not generic. Warm and clear, not poetic to the point of confusion.",
  "directors_note": ["Specific, warm sentence about what they did well.", "One honest question or redirect — plain language, not a riddle.", "One clear permission or encouragement."],
  "opportunity": "1-2 plain, warm sentences. What is this moment opening up? Write it simply — like something a good friend would say, not something from a self-help book.",
  "mood_keywords": "2-3 comma-separated keywords that capture the emotional mood of this entry. Examples: resilience hope morning, grief loss quiet, joy celebration light, anxiety transition change"
}`,
        messages: [{ role: 'user', content: text }]
      })
    });

    if (!claudeResponse.ok) {
      const err = await claudeResponse.json();
      throw new Error(err.error?.message || 'API error ' + claudeResponse.status);
    }

    const claudeData = await claudeResponse.json();
    const rawText = claudeData.content[0].text.trim();

    let result;
    try { result = JSON.parse(rawText); }
    catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) result = JSON.parse(match[0]);
      else throw new Error('Could not parse AI response');
    }

    // ── STEP 2: Fetch mood image from Pexels ──
    let imageUrl = null;
    try {
      const keywords = result.mood_keywords || 'cinematic life journey';
      const pexelsResponse = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(keywords)}&per_page=15&orientation=landscape`,
        { headers: { 'Authorization': process.env.PEXELS_API_KEY } }
      );

      if (pexelsResponse.ok) {
        const pexelsData = await pexelsResponse.json();
        if (pexelsData.photos && pexelsData.photos.length > 0) {
          const randomIndex = Math.floor(Math.random() * Math.min(pexelsData.photos.length, 10));
          imageUrl = pexelsData.photos[randomIndex].src.large2x;
        }
      }
    } catch (imgErr) {
      console.log('Image fetch failed:', imgErr.message);
    }

    // ── STEP 3: Generate narration with ElevenLabs ──
    // Build the narration script from the scene
    let audioBase64 = null;
    try {
      const directorNotes = Array.isArray(result.directors_note)
        ? result.directors_note.join(' ')
        : result.directors_note;

      const narrationScript = `${result.chapter_title}. ${result.story_beat} Director's note. ${directorNotes} The hidden opportunity. ${result.opportunity}`;

      const voiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel — warm, cinematic

      const elevenResponse = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': process.env.ELEVENLABS_API_KEY
          },
          body: JSON.stringify({
            text: narrationScript,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.8,
              style: 0.3,
              use_speaker_boost: true
            }
          })
        }
      );

      if (elevenResponse.ok) {
        const audioBuffer = await elevenResponse.arrayBuffer();
        audioBase64 = Buffer.from(audioBuffer).toString('base64');
      } else {
        console.log('ElevenLabs error:', elevenResponse.status);
      }
    } catch (audioErr) {
      console.log('Audio generation failed:', audioErr.message);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ...result, imageUrl, audioBase64 })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
