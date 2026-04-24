import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, payload } = req.body;

  // Cria cliente com service key — tem acesso total
  const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    if (action === 'listar_usuarios') {
      const { data, error } = await sb
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return res.status(200).json({ data });
    }

    if (action === 'atualizar_usuario') {
      const { id, ...updates } = payload;
      const { error } = await sb.from('profiles').update(updates).eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    if (action === 'criar_usuario') {
      const { email, password, name } = payload;
      const { data, error } = await sb.auth.admin.createUser({
        email, password,
        user_metadata: { name },
        email_confirm: true
      });
      if (error) throw error;
      await sb.from('profiles').insert({
        id: data.user.id, email, name, active: true, blocked: false
      });
      return res.status(200).json({ ok: true });
    }

    if (action === 'get_settings') {
      const { data, error } = await sb.from('settings').select('*');
      if (error) throw error;
      return res.status(200).json({ data });
    }

    if (action === 'save_settings') {
      const { key, value } = payload;
      const { error } = await sb.from('settings').upsert({ key, value });
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Ação desconhecida' });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
