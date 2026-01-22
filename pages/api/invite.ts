import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE as string;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  try {
    if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: 'Missing server env vars' });

    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { email, role, is_admin, password, reason } = req.body as { email?: string; role?: string; is_admin?: boolean; password?: string; reason?: string };
    if (!email) return res.status(400).json({ error: 'Email is required' });
    let userId: string | undefined;
    if (password) {
      // Create user with password
      const { data: created, error: createErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (createErr) return res.status(400).json({ error: createErr.message });
      userId = created.user?.id;
      // Upsert profile
      try {
        if (userId) {
          const { error: upErr } = await admin.from('profiles').upsert({ id: userId, email, role: role ?? null, is_admin: !!is_admin, invited: false }, { onConflict: 'id' });
          if (upErr) console.warn('profiles upsert error:', upErr.message);
        }
      } catch (e: any) {
        console.warn('profiles upsert exception:', e?.message ?? e);
      }
      // Optional reason log
      try {
        await admin.from('invite_logs').insert({ email, action: 'create_user', reason: reason ?? null });
      } catch (_) {}
      return res.status(200).json({ ok: true, created: true });
    } else {
      // Invite flow
      const { data: invite, error: invErr } = await admin.auth.admin.inviteUserByEmail(email);
      if (invErr) return res.status(400).json({ error: invErr.message });
      try {
        userId = invite?.user?.id;
        if (userId) {
          const { error: upErr } = await admin.from('profiles').upsert({ id: userId, email, role: role ?? null, is_admin: !!is_admin, invited: true }, { onConflict: 'id' });
          if (upErr) console.warn('profiles upsert error:', upErr.message);
        }
      } catch (e: any) {
        console.warn('profiles upsert exception:', e?.message ?? e);
      }
      // Optional reason log
      try {
        await admin.from('invite_logs').insert({ email, action: 'invite', reason: reason ?? null });
      } catch (_) {}
      return res.status(200).json({ ok: true, invited: true });
    }
  } catch (e: any) {
    // Log full error server-side for debugging 500s
    console.error('Invite API error:', e);
    return res.status(500).json({ error: e?.message ?? 'Unknown error' });
  }
}
