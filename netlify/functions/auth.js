const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body.' }) };
  }

  const { action, email, token, refresh_token } = body;

  // ── SEND MAGIC LINK ──
  if (action === 'send_magic_link') {
    if (!email || !email.includes('@')) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Valid email required.' }) };
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          create_user: true
        })
      });

      if (!res.ok) {
        const err = await res.json();
        return { statusCode: res.status, body: JSON.stringify({ error: err.msg || err.error_description || 'Could not send magic link.' }) };
      }

      return { statusCode: 200, body: JSON.stringify({ sent: true }) };

    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Auth service unavailable.' }) };
    }
  }

  // ── VERIFY OTP TOKEN ──
  if (action === 'verify_otp') {
    if (!email || !token) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email and token required.' }) };
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          type: 'magiclink',
          email: email.trim().toLowerCase(),
          token
        })
      });

      const data = await res.json();
      if (!res.ok) {
        return { statusCode: res.status, body: JSON.stringify({ error: data.error_description || data.msg || 'Invalid or expired link.' }) };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          user: { id: data.user?.id, email: data.user?.email }
        })
      };

    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Verification failed.' }) };
    }
  }

  // ── REFRESH SESSION ──
  if (action === 'refresh') {
    if (!refresh_token) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Refresh token required.' }) };
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ refresh_token })
      });

      const data = await res.json();
      if (!res.ok) {
        return { statusCode: res.status, body: JSON.stringify({ error: 'Session expired. Please sign in again.' }) };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          user: { id: data.user?.id, email: data.user?.email }
        })
      };

    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Session refresh failed.' }) };
    }
  }

  return { statusCode: 400, body: JSON.stringify({ error: 'Unknown action.' }) };
};
