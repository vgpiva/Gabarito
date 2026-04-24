export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, payload } = req.body;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;

  async function sbFetch(path, method = 'GET', body = null) {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'return=representation'
      }
    };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, opts);
    return r.json();
  }

  async function authFetch(path, method = 'GET', body = null) {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
      }
    };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(`${SUPABASE_URL}/auth/v1${path}`, opts);
    return r.json();
  }

  try {
    if (action === 'listar_usuarios') {
      const data = await sbFetch('/profiles?order=created_at.asc');
      return res.status(200).json({ data });
    }

    if (action === 'atualizar_usuario') {
      const { id, ...updates } = payload;
      await sbFetch(`/profiles?id=eq.${id}`, 'PATCH', updates);
      return res.status(200).json({ ok: true });
    }

    if (action === 'criar_usuario') {
      const { email, password, name } = payload;
      const user = await authFetch('/admin/users', 'POST', {
        email, password,
        email_confirm: true,
        user_metadata: { name }
      });
      if (user.error) throw new Error(user.error.message || user.msg);
      await sbFetch('/profiles', 'POST', {
        id: user.id, email, name, active: true, blocked: false
      });
      return res.status(200).json({ ok: true });
    }

    if (action === 'get_settings') {
      const data = await sbFetch('/settings');
      return res.status(200).json({ data });
    }

    if (action === 'save_settings') {
      const { key, value } = payload;
      await sbFetch('/settings', 'POST', { key, value });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Ação desconhecida' });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
