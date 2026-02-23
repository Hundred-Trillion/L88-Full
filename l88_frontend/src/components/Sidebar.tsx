/**
 * Sidebar — Noctis v1 Minimalist Navigation.
 * Achromatic, high-contrast, "Zen" design.
 */

import React, { useState } from 'react';
import {
    Plus, MessageSquare, Trash2, LogOut, Sun, Moon,
    Shield, Users, ChevronRight, X, Command
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/cn';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { Session } from '../types';

interface Props {
    sessions: Session[];
    currentId: string | null;
    onSelect: (s: Session) => void;
    onDelete: (id: string) => void;
    onCreate: (name: string, webMode: boolean) => void;
    onAddMember?: (username: string, role: string) => void;
}

export default function Sidebar({
    sessions, currentId, onSelect, onDelete, onCreate, onAddMember
}: Props) {
    const { user, logout, effectiveRole, setEffectiveRole } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [sessionName, setSessionName] = useState('');

    const handleCreate = (webMode: boolean) => {
        if (!sessionName.trim()) return;
        onCreate(sessionName.trim(), webMode);
        setSessionName('');
        setShowCreateModal(false);
    };

    return (
        <aside className="w-64 h-screen flex flex-col bg-noctis-main border-r border-zinc-900 z-30 transition-all duration-500 overflow-hidden">
            {/* Branding */}
            <div className="p-8 pt-10">
                <div className="flex items-center space-x-3 mb-10">
                    <div className="w-8 h-8 bg-zinc-100 dark:bg-white rounded-md flex items-center justify-center">
                        <span className="text-black font-black text-sm">L</span>
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-sm font-black tracking-[0.2em] text-zinc-900 dark:text-white uppercase leading-none">L88</h1>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Noctis v1</span>
                    </div>
                </div>

                <button
                    onClick={() => setShowCreateModal(true)}
                    className="w-full flex items-center justify-between py-3 px-4 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-zinc-400 dark:hover:border-zinc-500 transition-all group"
                >
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">Initialize</span>
                    <Plus size={14} className="text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-900 dark:group-hover:text-white transition-all" />
                </button>
            </div>

            {/* Session Navigation */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 custom-scrollbar">
                <div>
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500 block mb-6 px-2">Investigations</span>
                    <div className="space-y-1">
                        {sessions.map((s) => (
                            <div key={s.id} className="group relative flex items-center">
                                <button
                                    onClick={() => onSelect(s)}
                                    className={cn(
                                        "flex-1 text-left px-3 py-2.5 rounded-md text-[11px] font-bold tracking-tight transition-all truncate",
                                        currentId === s.id
                                            ? "text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-900"
                                            : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                    )}
                                >
                                    {s.name}
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                                    className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-all"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-900">
                    <button
                        onClick={() => setShowMembersModal(true)}
                        className="w-full flex items-center space-x-3 px-3 py-2 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all font-bold text-[10px] uppercase tracking-widest"
                    >
                        <Users size={12} strokeWidth={2.5} />
                        <span>Personnel</span>
                    </button>
                </div>
            </div>

            {/* Footer / Role Switcher */}
            <div className="p-6 pt-0 mt-auto">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-zinc-100 dark:border-zinc-900">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="w-8 h-8 rounded bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-black text-[10px]">
                            {(user?.username || '?')[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-tight truncate">
                                {user?.username}
                            </p>
                            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                                {effectiveRole}
                            </span>
                        </div>
                        <button onClick={logout} className="text-zinc-400 hover:text-red-500 transition-colors">
                            <LogOut size={14} />
                        </button>
                    </div>

                    <div className="flex p-1 bg-zinc-200 dark:bg-zinc-800 rounded-md">
                        {(['admin', 'chat', 'read_only'] as const).map((r) => (
                            <button
                                key={r}
                                onClick={() => setEffectiveRole(r)}
                                className={cn(
                                    "flex-1 py-1 rounded text-[8px] font-black tracking-tighter uppercase transition-all",
                                    effectiveRole === r
                                        ? "bg-white dark:bg-zinc-700 text-black dark:text-white shadow-sm"
                                        : "text-zinc-500"
                                )}
                            >
                                {r.split('_')[0]}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-between mt-6 px-1">
                    <button onClick={toggleTheme} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                        {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
                    </button>
                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.4em]">NOCTIS</span>
                </div>
            </div>

            {/* Create Session Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="bg-noctis-main border border-zinc-800 w-full max-w-sm rounded-xl p-8"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-sm font-black uppercase tracking-[0.3em]">Initialize</h3>
                                <button onClick={() => setShowCreateModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <input
                                    autoFocus
                                    type="text"
                                    value={sessionName}
                                    onChange={(e) => setSessionName(e.target.value)}
                                    placeholder="Label..."
                                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg py-3 px-4 text-xs font-bold outline-none focus:border-zinc-500 transition-all"
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreate(false)}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => handleCreate(false)}
                                        className="py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                        Standard
                                    </button>
                                    <button
                                        onClick={() => handleCreate(true)}
                                        className="py-3 bg-white text-black hover:bg-zinc-200 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                        Discovery
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </aside>
    );
}
