/**
 * Sidebar — premium floating navigation and sessions.
 */

import React, { useState } from 'react';
import { Plus, MessageSquare, Trash2, LogOut, Search, Settings, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/cn';
import { useAuth } from '../context/AuthContext';
import type { Session } from '../types';

interface Props {
    sessions: Session[];
    currentId: string | null;
    onSelect: (s: Session) => void;
    onDelete: (id: string) => void;
    onCreate: (name: string, webMode: boolean) => void;
}

export default function Sidebar({
    sessions, currentId, onSelect, onDelete, onCreate,
}: Props) {
    const { user, logout } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [name, setName] = useState('');

    const handleCreate = (webMode: boolean) => {
        if (!name.trim()) return;
        onCreate(name.trim(), webMode);
        setName('');
        setShowModal(false);
    };

    return (
        <aside className="w-72 h-screen flex flex-col bg-slate-50 border-r border-slate-200/60 relative z-30">
            {/* Logo & Search Area */}
            <div className="p-8 pb-4">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-3 group cursor-pointer">
                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <span className="text-white font-bold text-lg">L</span>
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900">Vision</h1>
                    </div>
                </div>

                <button
                    onClick={() => setShowModal(true)}
                    className="w-full group flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300"
                >
                    <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">New Session</span>
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all">
                        <Plus size={18} />
                    </div>
                </button>
            </div>

            {/* Sessions Scroll Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                <div className="px-4 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Recent Activity</span>
                </div>
                <div className="space-y-1">
                    {sessions.map((s, idx) => (
                        <motion.button
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            key={s.id}
                            onClick={() => onSelect(s)}
                            className={cn(
                                "w-full text-left px-4 py-3 rounded-2xl text-sm transition-all flex items-center group relative overflow-hidden",
                                currentId === s.id
                                    ? "bg-white border border-slate-200/80 shadow-md font-bold text-slate-900"
                                    : "hover:bg-slate-200/50 text-slate-500 hover:text-slate-700"
                            )}
                        >
                            {currentId === s.id && (
                                <motion.div
                                    layoutId="active-indicator"
                                    className="absolute left-0 top-0 bottom-0 w-1 bg-slate-900"
                                />
                            )}
                            <MessageSquare
                                size={16}
                                className={cn("mr-3 shrink-0", currentId === s.id ? "text-slate-900" : "opacity-40")}
                            />
                            <span className="truncate flex-1">{s.name}</span>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2
                                    size={14}
                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                    onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                                />
                            </div>
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* User Profile Section */}
            <div className="p-4 mt-auto">
                <div className="glass rounded-[32px] p-4 flex items-center space-x-3 shadow-xl border border-white/40">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-slate-950 flex items-center justify-center text-white shadow-inner font-bold text-xs ring-2 ring-white">
                            {(user?.display_name || user?.username || '?')[0].toUpperCase()}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">
                            {user?.display_name || user?.username}
                        </p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight truncate">
                            {user?.role?.replace('_', ' ')}
                        </p>
                    </div>
                    <button
                        onClick={logout}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
                        title="Sign out"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowModal(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-md glass rounded-[40px] shadow-2xl p-10 border border-white/60"
                        >
                            <div className="mb-8">
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">Initialize Session</h3>
                                <p className="text-slate-500 font-medium">Define your research parameters</p>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 m-1">Session Name</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Quantum Analysis..."
                                        className="w-full bg-white/50 border border-slate-200 rounded-2xl py-4 px-6 focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-950/5 transition-all outline-none text-slate-900 font-medium"
                                        onKeyDown={(e) => e.key === 'Enter' && handleCreate(false)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4">
                                    <button
                                        onClick={() => handleCreate(false)}
                                        className="py-4 px-6 rounded-2xl bg-white border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95"
                                    >
                                        Chat
                                    </button>
                                    <button
                                        onClick={() => handleCreate(true)}
                                        className="py-4 px-6 rounded-2xl bg-slate-900 text-white text-sm font-bold shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center"
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
