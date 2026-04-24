if (action === 'criar_pre_registro') {
  const { name, email } = payload;

  // Verifica se já existe
  const existing = await sbFetch(`/profiles?email=eq.${encodeURIComponent(email)}&limit=1`);
  if (Array.isArray(existing) && existing.length > 0) {
    return res.status(400).json({ error: 'Já existe um cadastro com este e-mail.' });
  }

  // Gera UUID temporário — será substituído quando o aluno fizer o primeiro acesso
  const tempId = crypto.randomUUID();

  const result = await sbFetch('/profiles', 'POST', {
    id: tempId,
    email,
    name,
    active: false,
    blocked: false,
    status: 'pre_registro'
  });

  if (result?.error) throw new Error(result.error.message || JSON.stringify(result.error));
  return res.status(200).json({ ok: true });
}
