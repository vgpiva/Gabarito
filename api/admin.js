export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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

    if (action === 'buscar_por_email') {
      const { email } = payload;
      const data = await sbFetch(`/profiles?email=eq.${encodeURIComponent(email)}&limit=1`);
      const profile = Array.isArray(data) ? data[0] : null;
      return res.status(200).json({ data: profile || null });
    }

    if (action === 'criar_pre_registro') {
      const { name, email } = payload;
      // Verifica se já existe
      const existing = await sbFetch(`/profiles?email=eq.${encodeURIComponent(email)}&limit=1`);
      if (Array.isArray(existing) && existing.length > 0) {
        return res.status(400).json({ error: 'Já existe um cadastro com este e-mail.' });
      }
      // Cria só o perfil, sem conta no Auth
      const result = await sbFetch('/profiles', 'POST', {
        email, name, active: false, blocked: false, status: 'pre_registro'
      });
      if (result.error) throw new Error(result.error.message);
      return res.status(200).json({ ok: true });
    }

    if (action === 'ativar_primeiro_acesso') {
      const { email, password, profile_id } = payload;
      // Cria conta no Auth
      const user = await authFetch('/admin/users', 'POST', {
        email, password,
        email_confirm: true
      });
      if (user.error) throw new Error(user.error.message || user.msg);
      // Atualiza perfil com o id do auth e status ativo
      await sbFetch(`/profiles?id=eq.${profile_id}`, 'PATCH', {
        id: user.id,
        active: true,
        blocked: false,
        status: 'ativo'
      });
      return res.status(200).json({ ok: true });
    }

    if (action === 'atualizar_usuario') {
      const { id, ...updates } = payload;
      // Sincroniza status com active/blocked
      if ('active' in updates) {
        updates.status = updates.active ? 'ativo' : 'bloqueado';
      }
      await sbFetch(`/profiles?id=eq.${id}`, 'PATCH', updates);
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
