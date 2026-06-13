const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

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
      console.error('GET entries error:', err.message);
      return { statusCode: 500, body: JSON.stringify({ error: 'Could not load your scenes.' }) };
    }
  }

  if (event.httpMethod === 'POST') {
    let body;
    try { body = JSON.parse(event.body); } catch {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid body.' }) };
    }

    const { action } = body;

    if (action === 'save_entry') {
      const { entry } = body;
      if (!entry) return { statusCode: 400, body: JSON.stringify({ error: 'Entry data required.' }) };

      try {
        const existing = await supabase(
          'GET',
          `entries?user_id=eq.${userId}&select=scene_num&order=scene_num.desc&limit=1`,
          null,
          SUPABASE_SERVICE_KEY
        );

        const nextSceneNum = existing && existing.length > 0 ? existing[0].scene_num + 1 : 1;

        const dateText = new Date().toLocaleDateString('en-AU', {
          day: 'numeric', month: 'short', year: 'numeric'
        });

        // directors_note arrives as an array — convert to JSON string for the text column
        const directorsNote = Array.isArray(entry.directors_note)
          ? JSON.stringify(entry.directors_note)
          : (entry.directors_note || null);

        // Only send known columns — strip audioBase64, id, sceneNum, imageUrl, dbId etc.
        const payload = {
          user_id: userId,
          scene_num: nextSceneNum,
          date: dateText,
          input_text: entry.inputText || null,
          chapter_title: entry.chapter_title || null,
          story_beat: entry.story_beat || null,
          directors_note: directorsNote,
          opportunity: entry.opportunity || null,
          mood_keywords: entry.mood_keywords || null,
          image_url: entry.image_url || entry.imageUrl || null,
          reflection: entry.reflection || null,
          created_at: new Date().toISOString()
        };

        const saved = await supabase('POST', 'entries', payload, SUPABASE_SERVICE_KEY);

        return {
          statusCode: 200,
          body: JSON.stringify(Array.isArray(saved) ? saved[0] : saved)
        };
      } catch (err) {
        console.error('save_entry error:', err.message);
        return { statusCode: 500, body: JSON.stringify({ error: 'Could not save scene: ' + err.message }) };
      }
    }

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
        console.error('update_reflection error:', err.message);
        return { statusCode: 500, body: JSON.stringify({ error: 'Could not save reflection.' }) };
      }
    }
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
