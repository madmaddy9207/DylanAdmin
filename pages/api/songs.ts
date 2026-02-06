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
      const { action, id, data } = req.body as { action: 'insert' | 'update' | 'delete' | 'moderation' | 'bulk_insert' | 'bulk_delete'; id?: string; data?: any };
      if (!action) return res.status(400).json({ error: 'Missing action' });

      if (action === 'insert') {
        if (!data) return res.status(400).json({ error: 'Missing data' });
        const { error } = await admin.from('songs').insert([data]);
        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json({ ok: true });
      }

      if (action === 'bulk_insert') {
        if (!Array.isArray(data) || data.length === 0) return res.status(400).json({ error: 'Missing data array' });

        // 1) Normalize and validate incoming records
        type Input = Record<string, any>;
        type Normalized = {
          title: string;
          artist: string | null;
          album: string | null;
          genre: string | null;
          language: string | null;
          status: string | null;
          featured: boolean;
          lyrics: string | null;
          chords: string | null;
          lyrics_chordpro: string | null;
          cover_url: string | null;
          category_id: string | null;
          duration: number | null;
          pending_lyrics: string | null;
          pending_chords: string | null;
          lyrics_approved: boolean | null;
          chords_approved: boolean | null;
        };

        const normalize = (s: Input): Normalized => {
          // tolerate common alternative keys / typos from user request
          const title = s.title ?? s.Title ?? '';
          const cover_url = s.cover_url ?? s.coverUrl ?? s.cover ?? s['cover image'] ?? null;
          const album = s.album ?? s.albub ?? s.filim ?? s.film ?? null;
          const genre = s.genre ?? s.gener ?? null;
          let artist: string | null = s.artist ?? s.singer ?? null;
          if (!artist && Array.isArray(s.artists)) artist = s.artists.filter(Boolean).join(', ');

          const duration = typeof s.duration === 'number' ? s.duration : (s.duration ? Number(s.duration) : null);
          return {
            title: String(title).trim(),
            artist: artist ? String(artist) : null,
            album: album ? String(album) : null,
            genre: genre ? String(genre) : null,
            language: s.language ?? null,
            status: s.status ?? 'draft',
            featured: !!s.featured,
            lyrics: s.lyrics ?? null,
            chords: s.chords ?? null,
            lyrics_chordpro: s.lyrics_chordpro ?? null,
            cover_url: cover_url ?? null,
            category_id: s.category_id ?? null,
            duration,
            pending_lyrics: s.pending_lyrics ?? null,
            pending_chords: s.pending_chords ?? null,
            lyrics_approved: s.lyrics_approved ?? true,
            chords_approved: s.chords_approved ?? true,
          };
        };

        const normalized: Normalized[] = [];
        const errors: { index: number; error: string }[] = [];
        for (let i = 0; i < data.length; i++) {
          try {
            const n = normalize(data[i] as Input);
            if (!n.title) throw new Error('Missing required field: title');
            // validate minimal expected keys as per manual add
            normalized.push(n);
          } catch (e: any) {
            errors.push({ index: i, error: e?.message ?? 'Invalid record' });
          }
        }

        // 2) Dedupe against existing by title+artist; we consider (case-insensitive)
        const titles = Array.from(new Set(normalized.map(n => n.title))).filter(Boolean);
        let existing: { title: string; artist: string | null }[] = [];
        if (titles.length > 0) {
          const { data: existData } = await admin.from('songs').select('title,artist').in('title', titles);
          existing = (existData ?? []) as any[];
        }
        const isDup = (n: Normalized) => {
          const t = (n.title || '').toLowerCase();
          const a = (n.artist || '').toLowerCase();
          return existing.some(e => (e.title || '').toLowerCase() === t && ((e.artist || '').toLowerCase() === a));
        };

        const toInsert: Normalized[] = [];
        const skipped: { index: number; reason: string }[] = [];
        let cursor = 0;
        // Map back to original indices by walking normalized in order and aligning with data indices that validated
        for (let i = 0; i < data.length; i++) {
          // if this index had validation error, skip mapping
          if (errors.find(e => e.index === i)) continue;
          const n = normalized[cursor++];
          if (!n) continue;
          if (isDup(n)) {
            skipped.push({ index: i, reason: 'Duplicate (title+artist)' });
          } else {
            toInsert.push(n);
          }
        }

        // 3) Insert remaining in batch; if batch fails, fall back one-by-one and accumulate per-record errors
        let inserted = 0;
        if (toInsert.length > 0) {
          const batch = await admin.from('songs').insert(toInsert);
          if (!batch.error) {
            inserted = toInsert.length;
          } else {
            for (let i = 0; i < toInsert.length; i++) {
              const { error } = await admin.from('songs').insert([toInsert[i]]);
              if (error) {
                // find original index: need to locate in data where this normalized came from
                // recompute mapping: walk again
                let originalIndex = -1; let c = 0;
                for (let j = 0; j < data.length; j++) {
                  if (errors.find(e => e.index === j)) continue;
                  const n = normalize(data[j] as Input);
                  if (isDup(n)) continue; // these were skipped, not part of toInsert
                  if (c === i) { originalIndex = j; break; }
                  c++;
                }
                errors.push({ index: originalIndex >= 0 ? originalIndex : i, error: error.message });
              } else {
                inserted++;
              }
            }
          }
        }

        const ok = errors.length === 0 && skipped.length === 0;
        const status = ok ? 200 : 207;
        return res.status(status).json({ ok, inserted, errors, skipped });
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

      if (action === 'bulk_delete') {
        if (!Array.isArray(data) || data.length === 0) return res.status(400).json({ error: 'Missing ids array' });
        const { error } = await admin.from('songs').delete().in('id', data);
        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json({ ok: true, deleted: data.length });
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
