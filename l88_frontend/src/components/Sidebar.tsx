/**
 * Sidebar — Matches reference design exactly.
 * Session list, new session modal, user/dark mode controls at bottom.
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, MessageSquare, LogOut, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import type { Session } from '../types';
import { cn } from '../lib/cn';

interface Props {
    sessions: Session[];
    currentId: string | null;
    onSelect: (s: Session) => void;
    onDelete: (id: string) => void;
    onCreate: (name: string, withDocs: boolean) => void;
    onTriggerUpload: () => void;
}

export default function Sidebar({ sessions, currentId, onSelect, onDelete, onCreate, onTriggerUpload }: Props) {
    const { user, logout, effectiveRole, setEffectiveRole } = useAuth();
    const [showModal, setShow] = useState(false);
    const [name, setName] = useState('');
    const isAdmin = effectiveRole === 'admin';

    const handleCreate = (withDocs: boolean) => {
        if (!name.trim()) return;
        onCreate(name.trim(), withDocs);
        setName('');
        setShow(false);
    };

    return (
        <>
            <aside className="w-64 border-r border-neutral-100 dark:border-neutral-900 flex flex-col bg-neutral-50/30 dark:bg-neutral-950/30">
                {/* Header */}
                <div className="p-6 flex items-center justify-between">
                    <h1 className="text-xl font-semibold tracking-tight text-black dark:text-white">L88</h1>
                    <div className="flex items-center space-x-1">
                        {isAdmin && (
                            <button
                                onClick={() => setShow(true)}
                                className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-full transition-colors cursor-pointer"
                            >
                                <Plus size={20} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Session list */}
                <nav className="flex-1 overflow-y-auto px-3 space-y-1">
                    {sessions.map(s => (
                        <button
                            key={s.id}
                            onClick={() => onSelect(s)}
                            className={cn(
                                "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center group cursor-pointer",
                                currentId === s.id
                                    ? "bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200 dark:border-neutral-800 font-medium"
                                    : "hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-500 dark:text-neutral-400"
                            )}
                        >
                            <MessageSquare size={16} className="mr-3 opacity-60 shrink-0" />
                            <span className="truncate flex-1">{s.name}</span>
                            {isAdmin && (
                                <Trash2
                                    size={14}
                                    className="opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity shrink-0 cursor-pointer"
                                    onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                                />
                            )}
                        </button>
                    ))}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-neutral-100 dark:border-neutral-900">
                    <div className="mb-4 px-3">
                        <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">Logged in as</p>
                        <select
                            value={effectiveRole || ''}
                            onChange={e => setEffectiveRole(e.target.value as any)}
                            className="w-full bg-transparent text-xs font-medium focus:outline-none cursor-pointer dark:text-white"
                        >
                            <option value="admin" className="dark:bg-black">{user?.username} (Admin)</option>
                            <option value="chat" className="dark:bg-black">{user?.username} (Chat)</option>
                            <option value="read_only" className="dark:bg-black">{user?.username} (Read Only)</option>
                        </select>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center w-full px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                    >
                        <LogOut size={16} className="mr-3" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* ── New Session Modal ── */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShow(false)}
                            className="absolute inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-md bg-white dark:bg-neutral-950 rounded-3xl shadow-2xl p-8 border border-neutral-100 dark:border-neutral-900"
                        >
                            <h3 className="text-xl font-semibold mb-6 text-black dark:text-white">New Session</h3>
                            <input
                                autoFocus
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Session name"
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl py-3 px-4 mb-8 focus:outline-none focus:border-black dark:focus:border-white transition-all text-black dark:text-white"
                                onKeyDown={e => e.key === 'Enter' && handleCreate(false)}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => handleCreate(false)}
                                    className="py-3 px-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-all text-black dark:text-white cursor-pointer"
                                >
                                    Skip Upload
                                </button>
                                <button
                                    onClick={() => handleCreate(true)}
                                    className="py-3 px-4 rounded-2xl bg-black dark:bg-white text-white dark:text-black text-sm font-medium hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                                >
                                    Upload Docs
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
