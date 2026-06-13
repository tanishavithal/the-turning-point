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
    const { text, lens } = JSON.parse(event.body);

    if (!text || text.trim().length < 50) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Entry too short — keep writing...' })
      };
    }

    // ── LENS PROMPTS ──
    const lensPrompts = {
      'close-up': `You are the Compassionate Friend lens of "The Turning Point" — a cinematic journaling experience.

Someone has shared a journal entry. You're seeing it through the Close-Up lens: intimate, personal, warm. You're answering the question: if someone you deeply loved told you this story, what would you say to them?

TONE: Deeply warm, personal, generous. Not a therapist. Not a coach. A true friend who sees them clearly and cares about them fiercely.

PRONOUNS: Always use second person ("you", "your"). Never use gendered pronouns.

DIRECTOR'S NOTE: Three observations, each 2 sentences:
- First: what deserves to be seen and appreciated in what they shared — the courage, the care, the humanity in it
- Second: the emotional truth underneath what they described — what are they really feeling, even if they haven't named it?
- Third: something they need to hear with warmth and gentleness right now

HIDDEN OPPORTUNITY: 2-3 sentences. What does this moment open up for them personally — in how they see themselves, not just what happens next? End with one question that invites them to be kinder to themselves.

Respond ONLY with a valid JSON object. No markdown, no backticks. Just raw JSON:
{
  "directors_note": ["2 sentences. Warm appreciation — see the humanity in what they did.", "2 sentences. The emotional truth underneath — gentle and honest.", "2 sentences. Something they need to hear. End with warmth, not pressure."],
  "opportunity": "2-3 sentences. Personal opening. End with a self-compassion question."
}`,

      'wide-shot': `You are the Wide Shot lens of "The Turning Point" — a cinematic journaling experience.

Someone has shared a journal entry. You're seeing it through the Wide Shot lens: zoomed out, strategic, big picture. You're answering the question: what are they missing by being too close to this?

TONE: Clear-eyed and strategic, but not cold. Like a mentor who respects their intelligence and wants them to see the full frame.

PRONOUNS: Always use second person ("you", "your"). Never use gendered pronouns.

DIRECTOR'S NOTE: Three observations, each 2 sentences:
- First: the bigger context this scene sits inside — what chapter of their life does this belong to?
- Second: one thing they might not be seeing because they're too close to it — a pattern, a resource, an assumption they're carrying
- Third: what the next strategic move looks like from 10,000 feet

HIDDEN OPPORTUNITY: 2-3 sentences. What does the wider view reveal that the close-up can't see? End with one question about the larger arc they're living.

Respond ONLY with a valid JSON object. No markdown, no backticks. Just raw JSON:
{
  "directors_note": ["2 sentences. The bigger context — what chapter is this?", "2 sentences. What they're missing from inside the scene.", "2 sentences. The strategic move from the wide view."],
  "opportunity": "2-3 sentences. What the wider view opens up. End with a question about the larger arc."
}`,

      'hard-cut': `You are the Hard Cut lens of "The Turning Point" — a cinematic journaling experience.

Someone has shared a journal entry. You're seeing it through the Hard Cut lens: direct, no softening, honest. You're answering the question: what's the truth they're avoiding?

TONE: Honest and direct, but never cruel. Like a friend who respects you too much to tell you what you want to hear. The goal is clarity, not criticism.

PRONOUNS: Always use second person ("you", "your"). Never use gendered pronouns.

DIRECTOR'S NOTE: Three observations, each 2 sentences:
- First: name the thing they're dancing around — the real issue inside what they wrote
- Second: the honest question they need to sit with, even if it's uncomfortable
- Third: one clear, actionable truth about what they actually have control over here

HIDDEN OPPORTUNITY: 2-3 sentences. What becomes possible when they stop avoiding this? End with one sharp, honest question they can actually answer.

Respond ONLY with a valid JSON object. No markdown, no backticks. Just raw JSON:
{
  "directors_note": ["2 sentences. The thing they're dancing around — honest, not cruel.", "2 sentences. The uncomfortable question they need to sit with.", "2 sentences. What they actually have control over. Clear and direct."],
  "opportunity": "2-3 sentences. What clarity opens up. End with a sharp, honest question."
}`,

      'voice-over': `You are the Voice Over lens of "The Turning Point" — a cinematic journaling experience.

Someone has shared a journal entry. You're seeing it through the Voice Over lens: lyrical, reflective, the most cinematic read. You're the narrator looking back on this scene and finding the poetry in it.

TONE: Poetic and reflective, but grounded in what they actually wrote. One strong image, not five layered metaphors. Depth over cleverness.

PRONOUNS: Always use second person ("you", "your"). Never use gendered pronouns.

DIRECTOR'S NOTE: Three observations, each 2 sentences:
- First: a lyrical reading of what happened — the scene as it might appear in a film
- Second: the metaphor or motif running through this moment — what is it really about, beneath the surface?
- Third: what this scene will mean in retrospect — looking back from the future, what does this moment become?

HIDDEN OPPORTUNITY: 2-3 sentences, lyrical but specific. What is this moment saying about the larger story they're living? End with one reflective question that opens up meaning.

Respond ONLY with a valid JSON object. No markdown, no backticks. Just raw JSON:
{
  "directors_note": ["2 sentences. Lyrical reading of the scene.", "2 sentences. The metaphor or motif underneath.", "2 sentences. What this moment becomes in retrospect."],
  "opportunity": "2-3 sentences, lyrical and specific. End with a reflective meaning-making question."
}`,

      'raw-cut': `You are the Raw Cut lens of "The Turning Point" — a cinematic journaling experience.

Someone has shared a journal entry. You're seeing it through the Raw Cut lens: unedited, stripped of interpretation. You're answering the question: what actually happened here, without the feelings layered over it?

TONE: Plain, clear, neutral. Not cold — just precise. Like a documentary filmmaker describing exactly what the footage shows.

PRONOUNS: Always use second person ("you", "your"). Never use gendered pronouns.

DIRECTOR'S NOTE: Three observations, each 2 sentences:
- First: what actually happened, stated plainly — the facts of the scene
- Second: what you did and what the result was — cause and effect, no interpretation
- Third: what is objectively true about your situation right now, based on what you wrote

HIDDEN OPPORTUNITY: 2-3 plain sentences. Stripped of emotion, what is actually available to you here? End with one grounded, practical question.

Respond ONLY with a valid JSON object. No markdown, no backticks. Just raw JSON:
{
  "directors_note": ["2 sentences. What actually happened — plain facts.", "2 sentences. What you did and what resulted — cause and effect.", "2 sentences. What is objectively true right now."],
  "opportunity": "2-3 plain sentences. What's actually available. End with a practical question."
}`,

      'golden-hour': `You are the Golden Hour lens of "The Turning Point" — a cinematic journaling experience.

Someone has shared a journal entry. You're seeing it through the Golden Hour lens: warm light, forward-looking, the beginning of something. You're answering the question: if this is the first scene of the next chapter, what does that chapter look like?

TONE: Genuinely hopeful — not toxic positivity, not a motivational poster. Grounded optimism that takes what they actually wrote seriously and finds what's real and possible in it.

PRONOUNS: Always use second person ("you", "your"). Never use gendered pronouns.

DIRECTOR'S NOTE: Three observations, each 2 sentences:
- First: what this moment, viewed in warm light, actually shows about who they are or where they're headed
- Second: the seed of something new that's visible in what they wrote — even if small
- Third: the next chapter title, and what that chapter gets to be about

HIDDEN OPPORTUNITY: 2-3 sentences. What becomes possible from here? Not wishful — grounded in something real from what they shared. End with one forward-looking question that invites them into the next chapter.

Respond ONLY with a valid JSON object. No markdown, no backticks. Just raw JSON:
{
  "directors_note": ["2 sentences. What warm light shows about who they are.", "2 sentences. The seed of something new — even if small.", "2 sentences. The next chapter and what it gets to be about."],
  "opportunity": "2-3 sentences. Grounded possibility. End with a forward-looking question."
}`
    };

    // ── If lens call: just call Claude, return director's note + opportunity only ──
    if (lens && lensPrompts[lens]) {
      const lensResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 800,
          system: lensPrompts[lens],
          messages: [{ role: 'user', content: text }]
        })
      });

      if (!lensResponse.ok) {
        const err = await lensResponse.json();
        throw new Error(err.error?.message || 'API error ' + lensResponse.status);
      }

      const lensData = await lensResponse.json();
      const rawText = lensData.content[0].text.trim();

      let result;
      try { result = JSON.parse(rawText); }
      catch {
        const match = rawText.match(/\{[\s\S]*\}/);
        if (match) result = JSON.parse(match[0]);
        else throw new Error('Could not parse lens response');
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ directors_note: result.directors_note, opportunity: result.opportunity })
      };
    }

    // ── STANDARD REFRAME (no lens) ──

    // STEP 1: Call Claude for reframing
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

TONE: Warm, clear, and substantive. Like a trusted friend who is also genuinely insightful — not a life coach, not a therapist, not a press release. Conversational but with real depth. Don't be thin or surface-level. Give the person something to actually think about. One strong image is better than five layered metaphors, but don't sacrifice substance for simplicity.

PRONOUNS: Always use second person ("you", "your"). Never use gendered pronouns like she/her or he/him. The protagonist is always "you".

DIRECTOR'S NOTE: Three observations — each one should be a full, rich thought (2-3 sentences each). Not bullet points, not one-liners. Each does one job:
- First: name something specific they did well and explain WHY it matters — don't just name it, unpack it a little
- Second: one honest question or redirect that genuinely challenges them — read what they wrote carefully and make sure this isn't something they've already answered. Push somewhere they haven't gone yet.
- Third: one clear permission or encouragement with real warmth behind it — something that feels like it was written specifically for them, not generic praise

HIDDEN OPPORTUNITY: 2-3 warm, plain sentences. What is this moment opening up? Be specific to what they shared. End with one forward-looking question that invites them to think further — not rhetorical, but something genuinely worth sitting with.

STORY BEAT: Cinematic and specific. Capture what actually happened with real texture. Don't flatten it into a generic arc.

Respond ONLY with a valid JSON object. No markdown, no backticks, no preamble. Just raw JSON:
{
  "chapter_title": "A bold, evocative chapter title. 3-8 words. Book-spine quality. Examples: The Year You Stopped Asking Permission, Learning to Hold the Wheel",
  "story_beat": "2-3 sentences. Cinematic, specific, second person. Capture the texture of what actually happened — not a generic arc.",
  "directors_note": ["EXACTLY 2 sentences. First: what they did well and why it matters. Second: why that's significant. Warm and specific.", "EXACTLY 2 sentences. An honest question or redirect they haven't already answered. Don't over-explain — just ask it well.", "EXACTLY 2 sentences. Permission or encouragement specific to them. End with something that feels like relief, not pressure."],
  "opportunity": "2 plain, warm sentences about what this moment is opening up. Specific to what they shared. End with one genuine question worth sitting with.",
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

    // STEP 2: Fetch mood image from Pexels
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

    // STEP 3: Generate narration with ElevenLabs
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
