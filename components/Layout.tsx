import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
    Search,
    Bell,
    LayoutDashboard,
    Users,
    LogOut,
    Music
} from 'lucide-react';
import { supabase } from '../src/lib/supabaseClient';

export default function Layout({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.reload();
    };

    return (
        <div className="flex h-screen bg-blue-50/50 font-sans text-slate-600">
            {/* Sidebar */}
            <aside className="w-[70px] lg:w-64 bg-blue-600 text-white flex flex-col transition-all duration-300 ease-in-out m-2 lg:m-4 rounded-3xl shadow-2xl shadow-blue-600/20">
                <div className="p-6 flex items-center justify-center lg:justify-start gap-4">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                        <div className="w-4 h-4 bg-white rounded-full"></div>
                    </div>
                    <span className="font-bold text-xl hidden lg:block tracking-tight">Admin</span>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2">
                    <Link href="/">
                        <SidebarItem
                            icon={<LayoutDashboard size={20} />}
                            label="Dashboard"
                            active={router.pathname === '/'}
                        />
                    </Link>
                    <Link href="/lyrics">
                        <SidebarItem
                            icon={<Music size={20} />}
                            label="Lyrics"
                            active={router.pathname === '/lyrics'}
                        />
                    </Link>
                    <Link href="/users">
                        <SidebarItem
                            icon={<Users size={20} />}
                            label="Users"
                            active={router.pathname === '/users'}
                        />
                    </Link>
                </nav>

                <div className="p-4 mt-auto">
                    <button onClick={handleLogout} className="w-full">
                        <SidebarItem icon={<LogOut size={20} />} label="Logout" />
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden py-2 lg:py-4 pr-2 lg:pr-4">
                {/* Header */}
                <header className="h-16 lg:h-20 flex items-center justify-between px-4 lg:px-8 bg-white rounded-t-3xl mx-2 lg:mx-4 mt-2 lg:mt-4 shadow-sm z-10">
                    <div className="flex items-center gap-4 w-1/3">
                        <div className="relative w-full max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
                            <Bell size={20} />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                        <div className="flex items-center gap-3 pl-6 border-l border-slate-100">
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-semibold text-slate-700">Admin</p>
                                <p className="text-xs text-slate-400">Administrator</p>
                            </div>
                            <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full border-2 border-white shadow-md"></div>
                        </div>
                    </div>
                </header>

                {/* Content Body */}
                <div className="flex-1 bg-white mx-2 lg:mx-4 mb-2 lg:mb-4 rounded-b-3xl shadow-sm p-4 lg:p-8 overflow-y-auto relative">
                    {children}
                </div>
            </main>
        </div>
    );
}

function SidebarItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
    return (
        <div className={`
      flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 group
      ${active
                ? 'bg-white/10 text-white shadow-inner'
                : 'text-blue-100 hover:bg-white/5 hover:text-white'
            }
    `}>
            <div className={`transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
                {icon}
            </div>
            <span className="font-medium hidden lg:block">{label}</span>
            {active && (
                <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)] hidden lg:block"></div>
            )}
        </div>
    );
}
