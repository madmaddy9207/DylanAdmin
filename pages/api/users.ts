import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE as string;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  try {
    if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: 'Missing server env vars' });
    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const { action, user_id, new_password, reason } = req.body as { action?: string; user_id?: string; new_password?: string; reason?: string };
    if (!action) return res.status(400).json({ error: 'Missing action' });

    if (action === 'reset_password') {
      if (!user_id || !new_password) return res.status(400).json({ error: 'user_id and new_password required' });
      const { error } = await admin.auth.admin.updateUserById(user_id, { password: new_password });
      if (error) return res.status(400).json({ error: error.message });
      try { await admin.from('invite_logs').insert({ user_id, action: 'reset_password', reason: reason ?? null }); } catch (_) {}
      return res.status(200).json({ ok: true });
    }

    if (action === 'delete_user') {
      if (!user_id) return res.status(400).json({ error: 'user_id required' });
      const { error } = await admin.auth.admin.deleteUser(user_id);
      if (error) return res.status(400).json({ error: error.message });
      try { await admin.from('invite_logs').insert({ user_id, action: 'delete_user', reason: reason ?? null }); } catch (_) {}
      try { await admin.from('profiles').delete().eq('id', user_id); } catch (_) {}
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? 'Unknown error' });
  }
}
