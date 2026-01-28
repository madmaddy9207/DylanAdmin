import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE as string;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Missing server env vars' });
  }
  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    if (req.method === 'POST') {
      const { action, id, data } = req.body as { action: 'insert' | 'update' | 'delete' | 'moderation'; id?: string; data?: any };
      if (!action) return res.status(400).json({ error: 'Missing action' });

      if (action === 'insert') {
        if (!data) return res.status(400).json({ error: 'Missing data' });
        const { error } = await admin.from('songs').insert([data]);
        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json({ ok: true });
      }

      if (action === 'update') {
        if (!id || !data) return res.status(400).json({ error: 'Missing id or data' });
        const { error } = await admin.from('songs').update(data).eq('id', id);
        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json({ ok: true });
      }

      if (action === 'delete') {
        if (!id) return res.status(400).json({ error: 'Missing id' });
        const { error } = await admin.from('songs').delete().eq('id', id);
        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json({ ok: true });
      }

      if (action === 'moderation') {
        if (!id || !data) return res.status(400).json({ error: 'Missing id or data' });
        const { error } = await admin.from('songs').update(data).eq('id', id);
        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (e: any) {
    console.error('Songs API error:', e);
    return res.status(500).json({ error: e?.message ?? 'Unknown error' });
  }
}
