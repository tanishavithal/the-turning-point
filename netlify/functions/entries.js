const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Helper: get user from access token
async function getUserFromToken(token) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_SERVICE_KEY
    }
  });
  if (!res.ok) return null;
  return res.json();
}

// Helper: Supabase REST call
async function supabase(method, path, body, token) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${token || SUPABASE_SERVICE_KEY}`,
      'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Supabase error ${res.status}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

exports.handler = async (event) => {
  // Auth check — all entry routes require a valid session
  const authHeader = event.headers.authorization || event.headers.Authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Not authenticated.' }) };
  }

  const user = await getUserFromToken(token);
  if (!user?.id) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid session. Please sign in again.' }) };
  }

  const userId = user.id;

  // ── GET ALL ENTRIES ──
  if (event.httpMethod === 'GET') {
    try {
      const entries = await supabase(
        'GET',
        `entries?user_id=eq.${userId}&order=scene_num.desc&select=*`,
        null,
        SUPABASE_SERVICE_KEY
      );
      return {
        statusCode: 200,
        body: JSON.stringify(entries || [])
      };
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Could not load your scenes.' }) };
    }
  }

  if (event.httpMethod === 'POST') {
    let body;
    try { body = JSON.parse(event.body); } catch {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid body.' }) };
    }

    const { action } = body;

    // ── SAVE ENTRY ──
    if (action === 'save_entry') {
      const { entry } = body;
      if (!entry) return { statusCode: 400, body: JSON.stringify({ error: 'Entry data required.' }) };

      try {
        // Get current max scene_num for this user
        const existing = await supabase(
          'GET',
          `entries?user_id=eq.${userId}&select=scene_num&order=scene_num.desc&limit=1`,
          null,
          SUPABASE_SERVICE_KEY
        );

        const nextSceneNum = existing && existing.length > 0 ? existing[0].scene_num + 1 : 1;

        // Format date as the table's text column expects: "12 Jun 2026"
        const dateText = new Date().toLocaleDateString('en-AU', {
          day: 'numeric', month: 'short', year: 'numeric'
        });

        const saved = await supabase('POST', 'entries', {
          user_id: userId,
          scene_num: nextSceneNum,
          date: dateText,
          input_text: entry.inputText,
          chapter_title: entry.chapter_title,
          story_beat: entry.story_beat,
          directors_note: entry.directors_note,
          opportunity: entry.opportunity,
          mood_keywords: entry.mood_keywords || null,
          image_url: entry.image_url || null,
          reflection: entry.reflection || null,
          created_at: new Date().toISOString()
        }, SUPABASE_SERVICE_KEY);

        return {
          statusCode: 200,
          body: JSON.stringify(Array.isArray(saved) ? saved[0] : saved)
        };
      } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Could not save scene.' }) };
      }
    }

    // ── UPDATE REFLECTION ──
    if (action === 'update_reflection') {
      const { entry_id, reflection } = body;
      if (!entry_id) return { statusCode: 400, body: JSON.stringify({ error: 'Entry ID required.' }) };

      try {
        await supabase(
          'PATCH',
          `entries?id=eq.${entry_id}&user_id=eq.${userId}`,
          { reflection },
          SUPABASE_SERVICE_KEY
        );
        return { statusCode: 200, body: JSON.stringify({ updated: true }) };
      } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Could not save reflection.' }) };
      }
    }
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
