import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import {
    Settings,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Loader2,
    UserCheck
} from 'lucide-react';
import { supabase } from '../src/lib/supabaseClient';
import Layout from '../components/Layout';

interface Profile {
    id: string;
    email: string;
    role: string;
    is_admin: boolean;
    created_at: string;
}

export default function AdminDashboard() {
    const [selectedRow, setSelectedRow] = useState<string | null>(null);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('');
    type Toast = { id: string; type: 'success' | 'error'; message: string };
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [showInvite, setShowInvite] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<string>('user');
    const [inviteIsAdmin, setInviteIsAdmin] = useState(false);
    const [page, setPage] = useState(0);
    const [limit, setLimit] = useState(20);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        fetchProfiles();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, limit, roleFilter, query]);

    const fetchProfiles = async () => {
        try {
            setLoading(true);
            let sel = supabase
                .from('profiles')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false });

            if (query.trim()) {
                const q = `%${query.trim()}%`;
                sel = sel.or(`email.ilike.${q},role.ilike.${q}`);
            }
            if (roleFilter) sel = sel.eq('role', roleFilter);

            const from = page * limit;
            const to = from + limit - 1;
            sel = sel.range(from, to);

            const { data, error, count } = await sel;
            if (error) throw error as any;
            setProfiles((data as any[]) || []);
            setTotal(count ?? 0);
        } catch (error) {
            console.error('Error fetching profiles:', error);
        } finally {
            setLoading(false);
        }
    };

    const enqueueToast = (t: Omit<Toast, 'id'>) => {
        const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        setToasts((prev) => [...prev, { id, ...t }]);
        setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 2400);
    };

    const filtered = useMemo(() => profiles, [profiles]);

    const updateRole = async (id: string, role: string) => {
        const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
        if (error) { enqueueToast({ type: 'error', message: error.message }); return; }
        enqueueToast({ type: 'success', message: 'Role updated' });
        setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, role } : p)));
    };

    const toggleAdmin = async (id: string, next: boolean) => {
        const { error } = await supabase.from('profiles').update({ is_admin: next }).eq('id', id);
        if (error) { enqueueToast({ type: 'error', message: error.message }); return; }
        enqueueToast({ type: 'success', message: next ? 'Granted admin' : 'Revoked admin' });
        setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, is_admin: next } : p)));
    };

    const handleAddMember = () => {
        setShowInvite(true);
    };

    return (
        <Layout>
            <Head>
                <title>Admin Dashboard</title>
            </Head>

            {/* Table Header */}
            <div className="flex items-center justify-between mb-8 px-4">
                <h2 className="text-2xl font-bold text-slate-800">Users & Members</h2>
                <div className="flex gap-3">
                    <div className="hidden md:flex items-center gap-2">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search email or role..."
                            className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg">
                            <option value="">All roles</option>
                            <option value="admin">admin</option>
                            <option value="moderator">moderator</option>
                            <option value="user">user</option>
                        </select>
                    </div>
                    <button onClick={() => setShowFilters(!showFilters)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
                        Filter
                    </button>
                    <button onClick={handleAddMember} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all hover:-translate-y-0.5">
                        + Add Member
                    </button>
                </div>
            </div>

            {showFilters && (
                <div className="mx-4 mb-6 rounded-xl border border-slate-200 p-4 bg-slate-50 flex flex-col md:flex-row gap-3">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by email, role..."
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    />
                    <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg">
                        <option value="">All roles</option>
                        <option value="admin">admin</option>
                        <option value="moderator">moderator</option>
                        <option value="user">user</option>
                    </select>
                    <button onClick={() => { setQuery(''); setRoleFilter(''); }} className="px-3 py-2 text-sm rounded-lg border border-slate-200">Reset</button>
                </div>
            )}

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Header Row */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        <div className="col-span-1"></div>
                        <div className="col-span-4">User</div>
                        <div className="col-span-3">Role</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-2 text-right">Actions</div>
                    </div>

                    {filtered.map((profile) => {
                        const isSelected = selectedRow === profile.id;
                        return (
                            <div
                                key={profile.id}
                                onClick={() => setSelectedRow(profile.id)}
                                className={`
                  group grid grid-cols-12 gap-4 px-6 py-4 items-center rounded-2xl cursor-pointer transition-all duration-300 border border-transparent
                  ${isSelected
                                        ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 scale-[1.02] z-10'
                                        : 'bg-slate-50 hover:bg-white hover:shadow-lg hover:border-slate-100'
                                    }
                `}
                            >
                                <div className="col-span-1">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold uppercase
                    ${isSelected ? 'bg-white/20 text-white' : 'bg-white text-blue-600 shadow-sm'}
                  `}>
                                        {profile.email ? profile.email.charAt(0) : 'U'}
                                    </div>
                                </div>
                                <div className="col-span-4 font-medium truncate">
                                    {profile.email || 'No Email'}
                                    <div className={`text-xs font-normal mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                        ID: {profile.id.slice(0, 8)}...
                                    </div>
                                </div>
                                <div className="col-span-3">
                                    <select
                                        value={profile.role || ''}
                                        onChange={(e) => updateRole(profile.id, e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        className={`px-3 py-1 rounded-full text-xs font-medium capitalize border ${isSelected ? 'bg-white/20 text-white border-white/40' : 'bg-white text-slate-600 border-slate-200'}`}
                                    >
                                        <option value="">(none)</option>
                                        <option value="user">user</option>
                                        <option value="moderator">moderator</option>
                                        <option value="admin">admin</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <div className="flex items-center gap-2">
                                        <label className="flex items-center gap-2 text-sm cursor-pointer" onClick={(e)=>e.stopPropagation()}>
                                            <input type="checkbox" checked={!!profile.is_admin} onChange={(e)=>toggleAdmin(profile.id, e.target.checked)} className="w-4 h-4" />
                                            <span className={`${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>{profile.is_admin ? 'Admin' : 'Member'}</span>
                                        </label>
                                        <label className="flex items-center gap-2 text-sm cursor-pointer" onClick={(e)=>e.stopPropagation()}>
                                            <input type="checkbox" checked={(profile as any).deactivated ?? false} onChange={async (e)=>{
                                                try {
                                                    const { error } = await supabase.from('profiles').update({ deactivated: e.target.checked }).eq('id', profile.id);
                                                    if (error) throw error;
                                                    enqueueToast({ type: 'success', message: e.target.checked ? 'Deactivated' : 'Reactivated' });
                                                    setProfiles((prev)=>prev.map(p=>p.id===profile.id? { ...p, deactivated: e.target.checked } as any : p));
                                                } catch (err:any) {
                                                    const msg = String(err?.message ?? err);
                                                    if (msg.toLowerCase().includes('column') && msg.toLowerCase().includes('does not exist')) {
                                                        enqueueToast({ type: 'error', message: 'profiles.deactivated column missing' });
                                                    } else {
                                                        enqueueToast({ type: 'error', message: msg });
                                                    }
                                                }
                                            }} className="w-4 h-4" />
                                            <span className={`${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>Deactivated</span>
                                        </label>
                                        <label className="flex items-center gap-2 text-sm cursor-pointer" onClick={(e)=>e.stopPropagation()}>
                                            <input type="checkbox" checked={(profile as any).banned ?? false} onChange={async (e)=>{
                                                try {
                                                    const { error } = await supabase.from('profiles').update({ banned: e.target.checked }).eq('id', profile.id);
                                                    if (error) throw error;
                                                    enqueueToast({ type: 'success', message: e.target.checked ? 'Banned' : 'Unbanned' });
                                                    setProfiles((prev)=>prev.map(p=>p.id===profile.id? { ...p, banned: e.target.checked } as any : p));
                                                } catch (err:any) {
                                                    const msg = String(err?.message ?? err);
                                                    if (msg.toLowerCase().includes('column') && msg.toLowerCase().includes('does not exist')) {
                                                        enqueueToast({ type: 'error', message: 'profiles.banned column missing' });
                                                    } else {
                                                        enqueueToast({ type: 'error', message: msg });
                                                    }
                                                }
                                            }} className="w-4 h-4" />
                                            <span className={`${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>Banned</span>
                                        </label>
                                    </div>
                                </div>
                                <div className="col-span-2 flex justify-end gap-2">
                                    <button onClick={(e)=>{e.stopPropagation(); toggleAdmin(profile.id, !profile.is_admin);}} className={`p-2 rounded-lg transition-colors ${isSelected ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-200 text-slate-400'}`} title={profile.is_admin ? 'Revoke admin' : 'Grant admin'}>
                                        <UserCheck size={18} />
                                    </button>
                                    <button className={`p-2 rounded-lg transition-colors ${isSelected ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-200 text-slate-400'}`}>
                                        <ChevronDown size={18} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {profiles.length === 0 && (
                        <div className="text-center py-12 text-slate-400">
                            No users found.
                        </div>
                    )}
                </div>
            )}

            {/* Pagination */}
            <div className="flex items-center justify-center mt-12 gap-2">
                <button disabled={page===0} onClick={()=>setPage(p=>Math.max(0,p-1))} className={`p-2 rounded ${page===0? 'text-slate-300' : 'text-slate-400 hover:text-blue-600'}`}>
                    <ChevronLeft size={20} />
                </button>
                <span className="text-sm text-slate-500">Page {page+1} of {Math.max(1, Math.ceil(total/limit))}</span>
                <button disabled={(page+1) >= Math.max(1, Math.ceil(total/limit))} onClick={()=>setPage(p=>p+1)} className={`p-2 rounded ${((page+1) >= Math.max(1, Math.ceil(total/limit)))? 'text-slate-300' : 'text-slate-400 hover:text-blue-600'}`}>
                    <ChevronRight size={20} />
                </button>
                <select value={limit} onChange={(e)=>{ setPage(0); setLimit(parseInt(e.target.value||'20',10)); }} className="ml-4 px-2 py-1 text-sm bg-white border border-slate-200 rounded">
                    <option value={10}>10 / page</option>
                    <option value={20}>20 / page</option>
                    <option value={50}>50 / page</option>
                    <option value={100}>100 / page</option>
                </select>
            </div>
            {/* Toasts */}
            <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
                {toasts.map(t => (
                    <div key={t.id} className={`px-4 py-2 rounded-lg shadow text-sm animate-[fadeIn_.2s_ease-out] ${t.type==='success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                        {t.message}
                    </div>
                ))}
            </div>

            {/* Invite Modal */}
            {showInvite && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Invite Member</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Email</label>
                                <input type="email" value={inviteEmail} onChange={(e)=>setInviteEmail(e.target.value)} placeholder="name@example.com" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Role</label>
                                    <select value={inviteRole} onChange={(e)=>setInviteRole(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg">
                                        <option value="user">user</option>
                                        <option value="moderator">moderator</option>
                                        <option value="admin">admin</option>
                                    </select>
                                </div>
                                <label className="flex items-center gap-2 mt-6">
                                    <input type="checkbox" checked={inviteIsAdmin} onChange={(e)=>setInviteIsAdmin(e.target.checked)} className="w-4 h-4" />
                                    <span className="text-sm text-slate-600">Grant Admin</span>
                                </label>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <button onClick={() => setShowInvite(false)} className="px-3 py-2 rounded-lg border border-slate-200">Cancel</button>
                            <button
                                onClick={async ()=>{
                                    try {
                                        const email = inviteEmail.trim();
                                        if (!email) { enqueueToast({ type: 'error', message: 'Email required' }); return; }
                                        const resp = await fetch('/api/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, role: inviteRole, is_admin: inviteIsAdmin }) });
                                        const json = await resp.json();
                                        if (!resp.ok) throw new Error(json?.error || 'Invite failed');
                                        enqueueToast({ type: 'success', message: 'Invite sent' });
                                        setShowInvite(false);
                                        setInviteEmail(''); setInviteRole('user'); setInviteIsAdmin(false);
                                        // Refresh list next tick
                                        fetchProfiles();
                                    } catch (e:any) {
                                        enqueueToast({ type: 'error', message: String(e?.message ?? e) });
                                    }
                                }}
                                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                                Send Invite
                            </button>
                        </div>
                        <p className="mt-3 text-xs text-slate-500">Requires SUPABASE_SERVICE_ROLE set on the server and a "profiles" table to upsert role/admin (optional).</p>
                    </div>
                </div>
            )}
        </Layout>
    );
}
