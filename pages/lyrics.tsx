import React, { useState, useEffect, ChangeEvent, useMemo, useCallback } from 'react';
import Head from 'next/head';
import {
    Plus,
    Save,
    Music,
    Trash2,
    Edit2,
    Loader2,
    X,
    Copy as CopyIcon,
    Search
} from 'lucide-react';
import { supabase } from '../src/lib/supabaseClient';
import Layout from '../components/Layout';

interface Song {
    id: string;
    title: string;
    artist: string | null;
    album: string | null;
    genre: string | null;
    language: string | null;
    lyrics: string | null;
    chords: string | null;
    lyrics_chordpro?: string | null;
    status: string | null;
    featured: boolean;
    created_at: string;
    cover_url?: string | null;
    category_id?: string | null;
    duration?: number | null;
    pending_lyrics?: string | null;
    pending_chords?: string | null;
    lyrics_approved?: boolean | null;
    chords_approved?: boolean | null;
}

export default function LyricsPage() {
    const [songs, setSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [album, setAlbum] = useState('');
    const [genre, setGenre] = useState('');
    const [language, setLanguage] = useState('');
    const [status, setStatus] = useState('draft');
    const [featured, setFeatured] = useState(false);
    const [lyrics, setLyrics] = useState('');
    const [chords, setChords] = useState('');
    const [lyricsChordpro, setLyricsChordpro] = useState('');
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    const [categoryId, setCategoryId] = useState<string>('');
    const [duration, setDuration] = useState<string>('');
    const [lyricsApproved, setLyricsApproved] = useState<boolean>(true);
    const [chordsApproved, setChordsApproved] = useState<boolean>(true);
    const [pendingLyrics, setPendingLyrics] = useState<string>('');
    const [pendingChords, setPendingChords] = useState<string>('');

    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

    const [editId, setEditId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'content' | 'moderation'>('details');
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    type Toast = { id: string; type: 'success' | 'error'; message: string };
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [showCatMgr, setShowCatMgr] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Toast queue helper
    const enqueueToast = (t: Omit<Toast, 'id'>) => {
        const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const toast = { id, ...t } as Toast;
        setToasts((prev) => [...prev, toast]);
        setTimeout(() => {
            setToasts((prev) => prev.filter(x => x.id !== id));
        }, 2400);
    };

    useEffect(() => {
        fetchSongs();
        fetchCategories();
    }, []);

    // Keyboard shortcut: Ctrl/Cmd+S to save
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const isSave = (e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 's');
            if (isSave) {
                e.preventDefault();
                if (isEditing && !isSaving) {
                    // Trigger form submit programmatically
                    const btn = document.getElementById('save-song-btn') as HTMLButtonElement | null;
                    btn?.click();
                }
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isEditing, isSaving]);

    const fetchSongs = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('songs')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching songs:', error);
            } else {
                setSongs(data || []);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('categories')
                .select('id,name')
                .order('name', { ascending: true });
            if (error) {
                // If categories table doesn't exist, keep empty list silently
                console.warn('Categories fetch error:', error.message);
                return;
            }
            setCategories((data as any[]) || []);
        } catch (e: any) {
            console.warn('Categories fetch exception:', e?.message ?? e);
        }
    };

    const resetForm = () => {
        setTitle('');
        setArtist('');
        setAlbum('');
        setGenre('');
        setLanguage('');
        setStatus('draft');
        setFeatured(false);
        setLyrics('');
        setChords('');
        setLyricsChordpro('');
        setCoverUrl(null);
        setCategoryId('');
        setDuration('');
        setLyricsApproved(true);
        setChordsApproved(true);
        setPendingLyrics('');
        setPendingChords('');
        setEditId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title) return;

        try {
            setIsSaving(true);
            const parsedDuration = duration ? Number(duration) : null;
            const songData: any = {
                title,
                artist: artist || null,
                album: album || null,
                genre: genre || null,
                language: language || null,
                status: status || 'draft',
                featured: featured,
                lyrics: lyrics || null,
                chords: chords || null,
                lyrics_chordpro: lyricsChordpro || null,
                cover_url: coverUrl || null,
                category_id: categoryId || null,
                duration: parsedDuration,
                pending_lyrics: pendingLyrics || null,
                pending_chords: pendingChords || null,
                lyrics_approved: lyricsApproved,
                chords_approved: chordsApproved
            };

            if (editId) {
                // Update via server API (service role)
                const resp = await fetch('/api/songs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'update', id: editId, data: songData })
                });
                const json = await resp.json().catch(() => ({}));
                if (!resp.ok) throw new Error(json?.error || 'Update failed');
            } else {
                // Create via server API (service role)
                const resp = await fetch('/api/songs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'insert', data: songData })
                });
                const json = await resp.json().catch(() => ({}));
                if (!resp.ok) throw new Error(json?.error || 'Insert failed');
            }

            // Reset and refresh
            resetForm();
            setIsEditing(false);
            fetchSongs();
            enqueueToast({ type: 'success', message: editId ? 'Song updated' : 'Song created' });
        } catch (error) {
            console.error('Error saving song:', error);
            alert('Error saving song. Check console for details.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (song: Song) => {
        setTitle(song.title);
        setArtist(song.artist || '');
        setAlbum(song.album || '');
        setGenre(song.genre || '');
        setLanguage(song.language || '');
        setStatus(song.status || 'draft');
        setFeatured(song.featured || false);
        setLyrics(song.lyrics || '');
        setChords(song.chords || '');
        setLyricsChordpro(song.lyrics_chordpro || '');
        setCoverUrl(song.cover_url || null);
        setCategoryId(song.category_id || '');
        setDuration(song.duration ? String(song.duration) : '');
        setLyricsApproved(song.lyrics_approved ?? true);
        setChordsApproved(song.chords_approved ?? true);
        setPendingLyrics(song.pending_lyrics || '');
        setPendingChords(song.pending_chords || '');
        setEditId(song.id);
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this song?')) return;
        try {
            const resp = await fetch('/api/songs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', id })
            });
            const json = await resp.json().catch(() => ({}));
            if (!resp.ok) throw new Error(json?.error || 'Delete failed');
            fetchSongs();
            enqueueToast({ type: 'success', message: 'Song deleted' });
        } catch (error) {
            console.error('Error deleting song:', error);
        }
    };

    // Helpers
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
            .then(() => enqueueToast({ type: 'success', message: 'Copied to clipboard' }))
            .catch(() => enqueueToast({ type: 'error', message: 'Copy failed' }));
    };

    const autoResize = (el: HTMLTextAreaElement | null, minHeight = 80) => {
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = Math.max(minHeight, el.scrollHeight) + 'px';
    };

    // Drag-n-drop import for textareas
    const handleLyricsDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setLyrics(String(reader.result ?? ''));
        reader.readAsText(file);
        enqueueToast({ type: 'success', message: 'Lyrics file imported' });
    };
    const handleChordsDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setChords(String(reader.result ?? ''));
        reader.readAsText(file);
        enqueueToast({ type: 'success', message: 'Chords file imported' });
    };

    // Cover drag & drop
    const handleCoverDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        const fileName = `${Date.now()}_${file.name} `;
        const { data, error } = await supabase.storage.from('covers').upload(fileName, file, { upsert: false });
        if (error) {
            enqueueToast({ type: 'error', message: `Cover upload failed: ${error.message} ` });
            return;
        }
        const { data: pub } = supabase.storage.from('covers').getPublicUrl(data.path);
        setCoverUrl(pub.publicUrl);
        enqueueToast({ type: 'success', message: 'Cover uploaded' });
    };

    // Instant moderation updates
    const applyModerationUpdate = async (updates: Record<string, any>) => {
        if (!editId) return;
        const resp = await fetch('/api/songs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'moderation', id: editId, data: updates })
        });
        if (!resp.ok) {
            const json = await resp.json().catch(() => ({}));
            enqueueToast({ type: 'error', message: json?.error || 'Update failed' });
            return false;
        }
        // Refresh local song list and preserve form state changes
        fetchSongs();
        return true;
    };

    const approvePendingLyrics = async () => {
        if (!pendingLyrics) return;
        const ok = await applyModerationUpdate({ lyrics: pendingLyrics, pending_lyrics: null, lyrics_approved: true });
        if (ok) {
            setLyrics(pendingLyrics);
            setPendingLyrics('');
            setLyricsApproved(true);
            enqueueToast({ type: 'success', message: 'Lyrics approved' });
        }
    };

    const rejectPendingLyrics = async () => {
        const ok = await applyModerationUpdate({ pending_lyrics: null, lyrics_approved: false });
        if (ok) {
            setPendingLyrics('');
            setLyricsApproved(false);
            enqueueToast({ type: 'success', message: 'Lyrics rejected' });
        }
    };

    const approvePendingChords = async () => {
        if (!pendingChords) return;
        const ok = await applyModerationUpdate({ chords: pendingChords, pending_chords: null, chords_approved: true });
        if (ok) {
            setChords(pendingChords);
            setPendingChords('');
            setChordsApproved(true);
            enqueueToast({ type: 'success', message: 'Chords approved' });
        }
    };

    const rejectPendingChords = async () => {
        const ok = await applyModerationUpdate({ pending_chords: null, chords_approved: false });
        if (ok) {
            setPendingChords('');
            setChordsApproved(false);
            enqueueToast({ type: 'success', message: 'Chords rejected' });
        }
    };

    // Category CRUD
    const addCategory = async () => {
        const name = newCategoryName.trim();
        if (!name) return;
        const { error } = await supabase.from('categories').insert([{ name }]);
        if (error) { enqueueToast({ type: 'error', message: error.message }); return; }
        setNewCategoryName('');
        fetchCategories();
        enqueueToast({ type: 'success', message: 'Category added' });
    };
    const renameCategory = async (id: string, name: string) => {
        const { error } = await supabase.from('categories').update({ name }).eq('id', id);
        if (error) { enqueueToast({ type: 'error', message: error.message }); return; }
        fetchCategories();
        enqueueToast({ type: 'success', message: 'Category renamed' });
    };
    const deleteCategory = async (id: string) => {
        if (!confirm('Delete this category?')) return;
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) { enqueueToast({ type: 'error', message: error.message }); return; }
        if (categoryId === id) setCategoryId('');
        fetchCategories();
        enqueueToast({ type: 'success', message: 'Category deleted' });
    };

    // Duplicate Song
    const duplicateSong = async (song: Song) => {
        try {
            const newTitle = `Copy of ${song.title} `;
            const insertData: any = {
                title: newTitle,
                artist: song.artist,
                album: song.album,
                genre: song.genre,
                language: song.language,
                status: 'draft',
                featured: false,
                lyrics: song.lyrics,
                chords: song.chords,
                lyrics_chordpro: song.lyrics_chordpro ?? null,
                cover_url: song.cover_url ?? null,
                category_id: song.category_id ?? null,
                duration: song.duration ?? null,
                pending_lyrics: null,
                pending_chords: null,
                lyrics_approved: true,
                chords_approved: true,
            };

            const resp = await fetch('/api/songs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'insert', data: insertData })
            });
            const json = await resp.json().catch(() => ({}));
            if (!resp.ok) throw new Error(json?.error || 'Duplicate failed');
            enqueueToast({ type: 'success', message: 'Song duplicated' });
            fetchSongs();
        } catch (e: any) {
            enqueueToast({ type: 'error', message: String(e?.message ?? e) });
        }
    };
    // Bulk import from JSON file
    const handleMassJsonImport = async (file: File | null) => {
        if (!file) return;
        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            const items: any[] = Array.isArray(parsed) ? parsed : Array.isArray((parsed as any)?.songs) ? (parsed as any).songs : [];
            if (!items.length) { enqueueToast({ type: 'error', message: 'No songs found in JSON' }); return; }
            const resp = await fetch('/api/songs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'bulk_insert', data: items })
            });
            const json = await resp.json().catch(() => ({}));
            if (!resp.ok && resp.status !== 207) throw new Error(json?.error || 'Bulk insert failed');
            const inserted = json?.inserted ?? 0;
            const errors = json?.errors ?? [];
            const skipped = json?.skipped ?? [];
            if (errors.length > 0) {
                const preview = errors.slice(0, 3).map((e: any) => `#${e.index}: ${e.error} `).join(' | ');
                enqueueToast({ type: 'error', message: `Imported ${inserted} with ${errors.length} error(s): ${preview} and skipped ${skipped.length} ` });
            } else if (skipped.length > 0) {
                enqueueToast({ type: 'success', message: `Imported ${inserted} song(s), skipped ${skipped.length} duplicate(s)` });
            } else {
                enqueueToast({ type: 'success', message: `Imported ${inserted} song(s)` });
            }
            fetchSongs();
        } catch (e: any) {
            console.error('Mass JSON import error:', e);
            enqueueToast({ type: 'error', message: String(e?.message ?? e) });
        }
    };

    const isValidUrl = (url: string | null | undefined) => {
        if (!url) return false;
        try {
            // Check for http/https or data URI scheme
            return /^https?:\/\//i.test(url) || /^data:image\//i.test(url);
        } catch (e) {
            return false;
        }
    };

    // Bulk import from CSV file
    const handleMassCsvImport = async (file: File | null) => {
        if (!file) return;
        try {
            const text = await file.text();

            // Robust CSV Parser (State Machine)
            const parseCsv = (input: string) => {
                const rows: string[][] = [];
                let currentRow: string[] = [];
                let currentVal = '';
                let inQuotes = false;

                for (let i = 0; i < input.length; i++) {
                    const char = input[i];
                    const nextChar = input[i + 1];

                    if (char === '"') {
                        if (inQuotes && nextChar === '"') {
                            // Escaped quote: "" -> "
                            currentVal += '"';
                            i++; // Skip next quote
                        } else {
                            // Toggle quote state
                            inQuotes = !inQuotes;
                        }
                    } else if (char === ',' && !inQuotes) {
                        // Field delimiter
                        currentRow.push(currentVal.trim()); // Trim whitespace around value
                        currentVal = '';
                    } else if ((char === '\r' || char === '\n') && !inQuotes) {
                        // Row delimiter
                        if (char === '\r' && nextChar === '\n') {
                            i++; // Skip \n
                        }
                        // End of row
                        currentRow.push(currentVal.trim());
                        // Only add non-empty rows (avoid empty lines at end of file)
                        if (currentRow.length > 0 && currentRow.some(c => c !== '')) {
                            rows.push(currentRow);
                        }
                        currentRow = [];
                        currentVal = '';
                    } else {
                        // Regular character
                        currentVal += char;
                    }
                }

                // Push last row if exists
                if (currentVal || currentRow.length > 0) {
                    currentRow.push(currentVal.trim());
                    if (currentRow.length > 0 && currentRow.some(c => c !== '')) {
                        rows.push(currentRow);
                    }
                }

                return rows;
            };

            const rows = parseCsv(text);

            if (rows.length < 2) {
                enqueueToast({ type: 'error', message: 'CSV file is empty or missing headers' });
                return;
            }

            // Map header index to key
            const headerMap: Record<string, number> = {};
            const rawHeaders = rows[0];
            rawHeaders.forEach((h, i) => {
                headerMap[h.trim().toLowerCase()] = i; // Store lowercase keys
            });

            const songsToInsert: any[] = [];

            for (let i = 1; i < rows.length; i++) {
                const values = rows[i];
                // Helper to get value securely
                const getVal = (key: string) => values[headerMap[key.toLowerCase()]] || '';

                // Mapping
                const songTitle = getVal('song_title');
                if (!songTitle) continue; // Skip empty titles

                const categoryName = getVal('category');
                let categoryId = null;
                if (categoryName) {
                    const cat = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
                    if (cat) categoryId = cat.id;
                }

                // Sanitize URL
                let coverUrlVal = getVal('cover_image_url');
                if (coverUrlVal && !isValidUrl(coverUrlVal)) {
                    coverUrlVal = ''; // Discard invalid URL to prevent 404s
                }

                songsToInsert.push({
                    title: songTitle,
                    cover_url: coverUrlVal || null,
                    artist: getVal('artist_name') || null,
                    album: getVal('album') || null,
                    genre: getVal('genre') || null,
                    category_id: categoryId,
                    lyrics: getVal('lyrics') || null,
                    // Defaults
                    language: 'English',
                    status: 'draft',
                    featured: false,
                    chords: null,
                    lyrics_chordpro: null,
                    duration: null,
                    pending_lyrics: null,
                    pending_chords: null,
                    lyrics_approved: true,
                    chords_approved: true
                });
            }

            if (!songsToInsert.length) {
                enqueueToast({ type: 'error', message: 'No valid songs found in CSV' });
                return;
            }

            const resp = await fetch('/api/songs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'bulk_insert', data: songsToInsert })
            });

            const json = await resp.json().catch(() => ({}));
            if (!resp.ok && resp.status !== 207) throw new Error(json?.error || 'Bulk insert failed');
            const inserted = json?.inserted ?? 0;
            const errors = json?.errors ?? [];
            const skipped = json?.skipped ?? [];

            if (errors.length > 0) {
                const preview = errors.slice(0, 3).map((e: any) => `#${e.index}: ${e.error} `).join(' | ');
                enqueueToast({ type: 'error', message: `Imported ${inserted} with ${errors.length} error(s): ${preview} and skipped ${skipped.length} ` });
            } else if (skipped.length > 0) {
                enqueueToast({ type: 'success', message: `Imported ${inserted} song(s), skipped ${skipped.length} duplicate(s)` });
            } else {
                enqueueToast({ type: 'success', message: `Imported ${inserted} song(s)` });
            }
            fetchSongs();

        } catch (e: any) {
            console.error('CSV import error:', e);
            enqueueToast({ type: 'error', message: String(e?.message ?? e) });
        }
    };

    // Bulk import from JSON file
    // Download JSON template
    const downloadTemplate = () => {
        const template = [
            {
                title: 'Song Title',
                artist: 'Artist Name',
                album: 'Album',
                genre: 'Pop',
                language: 'English',
                status: 'draft',
                featured: false,
                lyrics: 'Lyrics text...',
                chords: 'Chords text...',
                lyrics_chordpro: null,
                cover_url: null,
                category_id: null,
                duration: 210,
                pending_lyrics: null,
                pending_chords: null,
                lyrics_approved: true,
                chords_approved: true
            }
        ];
        const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'songs_template.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    const toggleSelect = (id: string, checked: boolean) => {
        setSelectedIds(prev => {
            const s = new Set(prev);
            if (checked) s.add(id);
            else s.delete(id);
            return Array.from(s);
        });
    };

    const selectAllVisible = () => {
        setSelectedIds(filteredSongs.map(s => s.id));
    };

    const clearSelection = () => setSelectedIds([]);

    const bulkDeleteSelected = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Delete ${selectedIds.length} selected song(s) ? `)) return;
        try {
            const resp = await fetch('/api/songs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'bulk_delete', data: selectedIds })
            });
            const json = await resp.json().catch(() => ({}));
            if (!resp.ok) throw new Error(json?.error || 'Bulk delete failed');
            enqueueToast({ type: 'success', message: `Deleted ${selectedIds.length} song(s)` });
            setSelectedIds([]);
            fetchSongs();
        } catch (e: any) {
            enqueueToast({ type: 'error', message: String(e?.message ?? e) });
        }
    };

    const bulkPublishSelected = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Publish ${selectedIds.length} selected song(s)?`)) return;
        try {
            const resp = await fetch('/api/songs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'bulk_update',
                    data: {
                        ids: selectedIds,
                        updates: { status: 'published' }
                    }
                })
            });
            const json = await resp.json().catch(() => ({}));
            if (!resp.ok) throw new Error(json?.error || 'Bulk publish failed');
            enqueueToast({ type: 'success', message: `Published ${selectedIds.length} song(s)` });
            setSelectedIds([]);
            fetchSongs();
        } catch (e: any) {
            enqueueToast({ type: 'error', message: String(e?.message ?? e) });
        }
    };

    const filteredSongs = useMemo(() => {
        const q = query.trim().toLowerCase();
        return songs.filter(s => {
            const matchesQuery = !q || s.title.toLowerCase().includes(q) || (s.artist ?? '').toLowerCase().includes(q) || (s.genre ?? '').toLowerCase().includes(q);
            const matchesStatus = !statusFilter || (s.status ?? 'draft') === statusFilter;
            return matchesQuery && matchesStatus;
        });
    }, [songs, query, statusFilter]);

    const timeAgo = useCallback((iso: string) => {
        const d = new Date(iso);
        const diff = Date.now() - d.getTime();
        const sec = Math.floor(diff / 1000);
        if (sec < 60) return `${sec}s ago`;
        const min = Math.floor(sec / 60);
        if (min < 60) return `${min}m ago`;
        const hr = Math.floor(min / 60);
        if (hr < 24) return `${hr}h ago`;
        const day = Math.floor(hr / 24);
        if (day < 30) return `${day}d ago`;
        const mo = Math.floor(day / 30);
        if (mo < 12) return `${mo}mo ago`;
        const yr = Math.floor(mo / 12);
        return `${yr}y ago`;
    }, []);

    return (
        <Layout>
            <Head>
                <title>Manage Lyrics</title>
            </Head>

            <div className="flex flex-col gap-8">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Lyrics Library</h2>
                        <p className="text-slate-500 mt-1">Manage, edit, and curate your song collection</p>
                    </div>
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
                        {/* Hidden file input for mass JSON */}
                        <input
                            id="mass-json-input"
                            type="file"
                            accept="application/json"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0] ?? null;
                                e.currentTarget.value = '';
                                handleMassJsonImport(file);
                            }}
                        />
                        {/* Hidden file input for mass CSV */}
                        <input
                            id="mass-csv-input"
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0] ?? null;
                                e.currentTarget.value = '';
                                handleMassCsvImport(file);
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => { (document.getElementById('mass-json-input') as HTMLInputElement)?.click(); }}
                            className="w-full md:w-auto px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                        >
                            Import JSON
                        </button>
                        <button
                            type="button"
                            onClick={() => { (document.getElementById('mass-csv-input') as HTMLInputElement)?.click(); }}
                            className="w-full md:w-auto px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                        >
                            Import CSV
                        </button>
                        <button
                            onClick={() => {
                                setIsEditing(true);
                                resetForm();
                            }}
                            className="w-full md:w-auto px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
                        >
                            <Plus size={18} /> Add Song
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8 items-start">
                    {/* Form Section - Modal Mode */}
                    {isEditing && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                            {/* Overlay click to close */}
                            <div className="absolute inset-0" onClick={() => setIsEditing(false)}></div>

                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] h-full md:h-auto flex flex-col relative animate-in slide-in-from-bottom-4 zoom-in-95 duration-200 z-10 border border-slate-100">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all z-20"
                                >
                                    <X size={20} />
                                </button>

                                <div className="p-6 border-b border-slate-50 shrink-0">
                                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                        {editId ? <Edit2 size={20} className="text-blue-500" /> : <Plus size={20} className="text-blue-500" />}
                                        {editId ? 'Edit Song' : 'New Song'}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">Fill in the details below to {editId ? 'update' : 'create'} a song.</p>
                                </div>
                                <div className="p-6 overflow-y-auto custom-scrollbar">
                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        {/* Tabs */}
                                        <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
                                            {['details', 'content', 'moderation'].map((t) => (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    onClick={() => setActiveTab(t as any)}
                                                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                >
                                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Details Tab */}
                                        {activeTab === 'details' && (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Title</label>
                                                    <input
                                                        type="text"
                                                        value={title}
                                                        onChange={(e) => setTitle(e.target.value)}
                                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                                        placeholder="Song Title"
                                                        required
                                                    />
                                                </div>

                                                {/* Simplified Cover Image */}
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Cover</label>
                                                    <div className="flex gap-3 items-start">
                                                        {isValidUrl(coverUrl) ? (
                                                            <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 border border-slate-200 shadow-sm group relative">
                                                                <img src={coverUrl!} alt="Cover" className="w-full h-full object-cover" />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setCoverUrl(null)}
                                                                    className="absolute inset-0 bg-black/40 bg-backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div
                                                                onClick={() => (document.getElementById('cover-upload') as HTMLInputElement)?.click()}
                                                                className="w-20 h-20 rounded-lg shrink-0 border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 transition-all flex flex-col items-center justify-center cursor-pointer text-slate-400"
                                                            >
                                                                <Plus size={20} />
                                                                <span className="text-[10px] mt-1">Upload</span>
                                                            </div>
                                                        )}
                                                        <div className="flex-1 space-y-2">
                                                            <input
                                                                id="cover-upload"
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={async (e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (!file) return;
                                                                    const fileName = `${Date.now()}_${file.name}`;
                                                                    const { data, error } = await supabase.storage.from('covers').upload(fileName, file);
                                                                    if (!error && data) {
                                                                        const { data: pub } = supabase.storage.from('covers').getPublicUrl(data.path);
                                                                        setCoverUrl(pub.publicUrl);
                                                                    }
                                                                }}
                                                                className="hidden"
                                                            />
                                                            <input
                                                                type="url"
                                                                placeholder="https://..."
                                                                value={coverUrl ?? ''}
                                                                onChange={(e) => setCoverUrl(e.target.value || null)}
                                                                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                                                            />
                                                            <p className="text-[10px] text-slate-400 leading-tight">Upload or paste URL.</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Artist</label>
                                                        <input
                                                            type="text"
                                                            value={artist}
                                                            onChange={(e) => setArtist(e.target.value)}
                                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                                            placeholder="Artist"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Album</label>
                                                        <input
                                                            type="text"
                                                            value={album}
                                                            onChange={(e) => setAlbum(e.target.value)}
                                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                                            placeholder="Album"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Genre</label>
                                                        <input
                                                            type="text"
                                                            value={genre}
                                                            onChange={(e) => setGenre(e.target.value)}
                                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                                            placeholder="Genre"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Language</label>
                                                        <select
                                                            value={language}
                                                            onChange={(e) => setLanguage(e.target.value)}
                                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                                        >
                                                            <option value="">Select...</option>
                                                            <option value="English">English</option>
                                                            <option value="Malayalam">Malayalam</option>
                                                            <option value="Manglish">Manglish</option>
                                                            <option value="Other">Other</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Category</label>
                                                        <select
                                                            value={categoryId}
                                                            onChange={(e) => setCategoryId(e.target.value)}
                                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                                        >
                                                            <option value="">None</option>
                                                            {categories.map(c => (
                                                                <option key={c.id} value={c.id}>{c.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Duration (s)</label>
                                                        <input
                                                            type="number"
                                                            value={duration}
                                                            onChange={(e) => setDuration(e.target.value)}
                                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                                            placeholder="210"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="pt-2 border-t border-slate-100 mt-4">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Status</label>
                                                        <select
                                                            value={status}
                                                            onChange={(e) => setStatus(e.target.value)}
                                                            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-medium"
                                                        >
                                                            <option value="draft">Draft</option>
                                                            <option value="published">Published</option>
                                                            <option value="archived">Archived</option>
                                                        </select>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            id="featured"
                                                            checked={featured}
                                                            onChange={(e) => setFeatured(e.target.checked)}
                                                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-slate-300"
                                                        />
                                                        <label htmlFor="featured" className="text-sm font-medium text-slate-700">Mark as Featured</label>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Content Tab */}
                                        {activeTab === 'content' && (
                                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                <div onDragOver={(e) => e.preventDefault()} onDrop={handleLyricsDrop}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Lyrics</label>
                                                        <button type="button" onClick={() => copyToClipboard(lyrics)} className="text-[10px] text-blue-600 hover:text-blue-700 font-medium">Copy</button>
                                                    </div>
                                                    <textarea
                                                        value={lyrics}
                                                        onChange={(e) => { setLyrics(e.target.value); autoResize(e.target); }}
                                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all h-40 font-mono text-sm leading-relaxed resize-none"
                                                        placeholder="Enter lyrics here..."
                                                    />
                                                </div>

                                                <div onDragOver={(e) => e.preventDefault()} onDrop={handleChordsDrop}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Chords</label>
                                                        <button type="button" onClick={() => copyToClipboard(chords)} className="text-[10px] text-blue-600 hover:text-blue-700 font-medium">Copy</button>
                                                    </div>
                                                    <textarea
                                                        value={chords}
                                                        onChange={(e) => { setChords(e.target.value); autoResize(e.target); }}
                                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all h-32 font-mono text-sm leading-relaxed resize-none"
                                                        placeholder="Enter chords..."
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Moderation Tab */}
                                        {activeTab === 'moderation' && (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            id="lyricsApproved"
                                                            checked={lyricsApproved}
                                                            onChange={(e) => setLyricsApproved(e.target.checked)}
                                                            className="w-5 h-5 text-emerald-500 rounded focus:ring-emerald-500 border-slate-300"
                                                        />
                                                        <label htmlFor="lyricsApproved" className="text-sm font-medium text-slate-700">Lyrics Approved</label>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            id="chordsApproved"
                                                            checked={chordsApproved}
                                                            onChange={(e) => setChordsApproved(e.target.checked)}
                                                            className="w-5 h-5 text-emerald-500 rounded focus:ring-emerald-500 border-slate-300"
                                                        />
                                                        <label htmlFor="chordsApproved" className="text-sm font-medium text-slate-700">Chords Approved</label>
                                                    </div>
                                                </div>

                                                {(pendingLyrics || pendingChords) && (
                                                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                                        <h4 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                                            Pending Changes
                                                        </h4>
                                                        {pendingLyrics && (
                                                            <div className="mb-4">
                                                                <p className="text-xs font-semibold text-amber-700/70 mb-1">New Lyrics</p>
                                                                <div className="bg-white p-2 rounded border border-amber-100 text-xs font-mono max-h-24 overflow-y-auto mb-2 opacity-80">{pendingLyrics}</div>
                                                                <div className="flex gap-2">
                                                                    <button type="button" className="px-3 py-1.5 text-xs font-bold rounded bg-emerald-600 text-white shadow-sm hover:bg-emerald-700" onClick={approvePendingLyrics}>Accept</button>
                                                                    <button type="button" className="px-3 py-1.5 text-xs font-bold rounded bg-white text-slate-600 border border-slate-200 hover:bg-slate-50" onClick={rejectPendingLyrics}>Reject</button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="pt-4 border-t border-slate-100">
                                            <button
                                                type="submit"
                                                disabled={isSaving}
                                                className={`w-full py-3 ${isSaving ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30'} font-bold rounded-xl transition-all flex items-center justify-center gap-2`}
                                            >
                                                <Save size={18} />
                                                {isSaving ? 'Saving...' : (editId ? 'Save Changes' : 'Create Song')}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* List Section */}
                    <div className="col-span-1 transition-all duration-500">
                        {/* Toolbar */}
                        {selectedIds.length > 0 ? (
                            <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center gap-4 px-2 w-full sm:w-auto justify-between sm:justify-start">
                                    <div className="flex items-center gap-2">
                                        <button onClick={clearSelection} className="p-1 hover:bg-blue-500 rounded-full transition-colors"><X size={18} /></button>
                                        <span className="font-bold text-sm">{selectedIds.length} Selected</span>
                                    </div>
                                    <div className="h-6 w-px bg-blue-500 hidden sm:block"></div>
                                    <button onClick={selectAllVisible} className="text-xs font-semibold hover:text-blue-100 transition-colors">Select All</button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={bulkPublishSelected}
                                        className="flex items-center gap-2 px-4 py-2 bg-white text-emerald-600 rounded-xl text-xs font-bold shadow-sm hover:bg-emerald-50 transition-all"
                                    >
                                        <Save size={14} />
                                        Publish Selected
                                    </button>
                                    <button
                                        onClick={bulkDeleteSelected}
                                        className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 rounded-xl text-xs font-bold shadow-sm hover:bg-red-50 transition-all"
                                    >
                                        <Trash2 size={14} />
                                        Delete Selected
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm mb-6 flex flex-col md:flex-row gap-2">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                    <input
                                        type="text"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Search library..."
                                        className="w-full pl-12 pr-4 py-3 bg-transparent text-sm font-medium focus:outline-none text-slate-700 placeholder:text-slate-400"
                                    />
                                </div>
                                <div className="w-px bg-slate-100 hidden md:block my-2"></div>
                                <div className="flex items-center p-1">
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 hover:bg-slate-100 transition-colors cursor-pointer"
                                    >
                                        <option value="">All Statuses</option>
                                        <option value="draft">Drafts</option>
                                        <option value="published">Published</option>
                                        <option value="archived">Archived</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <Loader2 className="w-10 h-10 text-blue-600 animate-spin opacity-50" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                                {filteredSongs.map((song) => {
                                    const isSelected = selectedIds.includes(song.id);
                                    return (
                                        <div
                                            key={song.id}
                                            className={`group bg-white rounded-3xl p-6 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] border transition-all duration-300 relative flex flex-col items-start h-full
                                            ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-100 hover:border-blue-200 hover:shadow-[0_8px_30px_-4px_rgba(59,130,246,0.1)]'}
                                        `}
                                        >
                                            <div className="absolute top-4 left-4 z-10">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => toggleSelect(song.id, e.target.checked)}
                                                    className={`w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-opacity cursor-pointer
                                                    ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                                                `}
                                                />
                                            </div>

                                            <div className="flex items-start justify-between w-full mb-4 pl-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
                                                        {isValidUrl(song.cover_url) ? (
                                                            <img src={song.cover_url!} alt={song.title} className="w-full h-full object-cover rounded-2xl opacity-90" />
                                                        ) : (
                                                            <Music size={24} strokeWidth={2.5} />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-900 text-lg leading-tight line-clamp-1 group-hover:text-blue-700 transition-colors" title={song.title}>{song.title}</h4>
                                                        <p className="text-sm text-slate-500 font-medium mt-0.5 line-clamp-1">{song.artist || 'Unknown Artist'}</p>
                                                    </div>
                                                </div>

                                                {/* Top Actions */}
                                                <div className=" opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4 flex bg-white/90 backdrop-blur-sm rounded-xl border border-slate-100 shadow-sm p-1 z-20">
                                                    <button onClick={() => handleEdit(song)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Edit">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button onClick={() => duplicateSong(song)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Duplicate">
                                                        <CopyIcon size={16} />
                                                    </button>
                                                    <button onClick={() => handleDelete(song.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2 mb-4 text-left w-full pl-1">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${song.status === 'published' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    song.status === 'archived' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                                        'bg-amber-50 text-amber-600 border-amber-100'
                                                    }`}>
                                                    {song.status || 'Draft'}
                                                </span>
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-100">
                                                    {timeAgo(song.created_at)}
                                                </span>
                                                {song.genre && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">{song.genre}</span>}
                                            </div>

                                            {/* Lyrics Preview */}
                                            <div className="w-full flex-1 bg-slate-50/50 rounded-xl p-4 border border-slate-50 overflow-hidden relative group/lyrics transition-colors group-hover:bg-slate-50/80">
                                                <p className="text-xs text-slate-600 font-medium leading-relaxed font-sans opacity-80 whitespace-pre-line line-clamp-4">
                                                    {song.lyrics || song.chords || <span className="italic text-slate-400">No lyrics added yet...</span>}
                                                </p>
                                                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/80 to-transparent"></div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {filteredSongs.length === 0 && !loading && (
                                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-dashed border-slate-200">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                            <Music size={32} className="text-slate-300" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800">No songs found</h3>
                                        <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">Try adjusting your search terms or add a new song to your collection.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Toast Container */}
                <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50 pointer-events-none">
                    {toasts.map(t => (
                        <div key={t.id} className={`pointer-events-auto px-5 py-3 rounded-xl shadow-xl border flex items-center gap-3 animate-in slide-in-from-right-10 duration-300 ${t.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-white border-red-100 text-red-600'}`}>
                            {t.type === 'success' ? <div className="w-2 h-2 bg-white rounded-full"></div> : <div className="w-2 h-2 bg-red-500 rounded-full"></div>}
                            <span className="font-semibold text-sm">{t.message}</span>
                        </div>
                    ))}
                </div>

                {/* Total Count Badge */}
                <div className="fixed bottom-6 left-6 z-40 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-slate-900/90 backdrop-blur text-white px-4 py-2 rounded-full shadow-lg border border-slate-700/50 flex items-center gap-2 text-xs font-bold tracking-wide">
                        <Music size={14} className="text-blue-400" />
                        <span>Total Songs: {songs.length}</span>
                        {filteredSongs.length !== songs.length && (
                            <span className="text-slate-400 font-medium border-l border-slate-700 pl-2 ml-1">Showing: {filteredSongs.length}</span>
                        )}
                    </div>
                </div>
            </div>
        </Layout >
    );
}




