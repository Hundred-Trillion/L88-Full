/**
 * RightPanel — Matches reference design exactly.
 * 3 stacked sections: Documents, Scratch Pad, Members.
 * No tabs. Vertically scrollable.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    FileText, Users, Check, Trash2, Download,
    Plus, Loader2, Library,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Document, SessionMember } from '../types';
import * as api from '../services/api';
import { cn } from '../lib/cn';

interface Props {
    sessionId: string | null;
    documents: Document[];
    onToggleDoc: (id: string, selected: boolean) => void;
    onDeleteDoc: (id: string) => void;
    deletingDocs?: Set<string>;
    isIngesting: boolean;
}

export default function RightPanel({
    sessionId, documents, onToggleDoc, onDeleteDoc, deletingDocs, isIngesting,
}: Props) {
    const { effectiveRole } = useAuth();
    const isAdmin = effectiveRole === 'admin';
    const canToggle = effectiveRole !== 'read_only';
    const _deleting = deletingDocs ?? new Set<string>();

    /* ── Scratch Pad ── */
    const [scratchPad, setScratchPad] = useState('');
    const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => {
        if (!sessionId) return;
        api.getScratchPad(sessionId).then(d => setScratchPad(d?.content || '')).catch(() => { });
    }, [sessionId]);

    const handleScratchChange = (val: string) => {
        setScratchPad(val);
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(async () => {
            if (sessionId) {
                try { await api.updateScratchPad(sessionId, val); } catch { }
            }
        }, 800);
    };

    const downloadScratchPad = () => {
        const blob = new Blob([scratchPad], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `l88-notes-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    /* ── Members ── */
    const [members, setMembers] = useState<SessionMember[]>([]);
    const [newMemberName, setNewMemberName] = useState('');
    const [newMemberRole, setNewMemberRole] = useState<string>('chat');

    useEffect(() => {
        if (!sessionId) return;
        api.getMembers(sessionId).then(setMembers).catch(() => setMembers([]));
    }, [sessionId]);

    const handleAddMember = async () => {
        if (!newMemberName.trim() || !sessionId) return;
        try {
            await api.addMember(sessionId, newMemberName.trim(), newMemberRole);
            setNewMemberName('');
            const updated = await api.getMembers(sessionId);
            setMembers(updated);
        } catch { }
    };

    const handleRemoveMember = async (userId: number) => {
        if (!sessionId) return;
        try {
            await api.removeMember(sessionId, userId);
            setMembers(prev => prev.filter(m => m.user_id !== userId));
        } catch { }
    };

    return (
        <aside className="w-72 border-l border-neutral-100 dark:border-neutral-900 flex flex-col bg-neutral-50/30 dark:bg-neutral-950/30 overflow-y-auto">

            {/* ═══ Documents ═══ */}
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-900">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                        Documents
                    </h2>
                    <Library size={16} className="text-neutral-300 dark:text-neutral-700" />
                </div>

                <div className="space-y-2 overflow-y-auto max-h-[40vh]">
                    {isIngesting && (
                        <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-900">
                            <Loader2 size={12} className="spinner text-neutral-400" />
                            <span className="text-xs text-neutral-500">Processing...</span>
                        </div>
                    )}

                    {documents.length === 0 && !isIngesting && (
                        <p className="text-xs text-neutral-400 dark:text-neutral-600 italic">
                            No documents uploaded
                        </p>
                    )}

                    {documents.map(doc => (
                        <div
                            key={doc.id}
                            onClick={() => canToggle && onToggleDoc(doc.id, !doc.selected)}
                            className={cn(
                                "flex items-center p-2.5 rounded-xl border transition-all group",
                                canToggle ? "cursor-pointer" : "",
                                doc.selected
                                    ? "bg-white dark:bg-neutral-900 border-black/10 dark:border-white/10 shadow-sm"
                                    : "border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-900 opacity-60"
                            )}
                        >
                            <div className={cn(
                                "w-4 h-4 rounded border flex items-center justify-center mr-3 transition-colors shrink-0",
                                doc.selected
                                    ? "bg-black dark:bg-white border-black dark:border-white"
                                    : "border-neutral-300 dark:border-neutral-700"
                            )}>
                                {doc.selected && <Check size={10} className="text-white dark:text-black" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate text-black dark:text-white">
                                    {doc.filename}
                                </p>
                                <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
                                    {doc.page_count}p · {doc.chunk_count} chunks
                                </p>
                            </div>
                            {isAdmin && (
                                _deleting.has(doc.id)
                                    ? <Loader2 size={12} className="spinner shrink-0 ml-1 text-neutral-400" />
                                    : <Trash2
                                        size={12}
                                        className="opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity shrink-0 cursor-pointer ml-1"
                                        onClick={e => { e.stopPropagation(); onDeleteDoc(doc.id); }}
                                    />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══ Scratch Pad ═══ */}
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-900">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                        Scratch Pad
                    </h2>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={downloadScratchPad}
                            className="p-1 text-neutral-400 dark:text-neutral-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                            title="Download notes"
                        >
                            <Download size={14} />
                        </button>
                        <FileText size={16} className="text-neutral-300 dark:text-neutral-700" />
                    </div>
                </div>
                <textarea
                    value={scratchPad}
                    onChange={e => handleScratchChange(e.target.value)}
                    readOnly={!isAdmin}
                    placeholder={isAdmin ? 'Quick notes...' : 'Read only notes'}
                    className="w-full h-32 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-900 rounded-xl p-3 text-xs focus:outline-none focus:border-black dark:focus:border-white transition-all resize-none font-mono text-black dark:text-white disabled:opacity-50"
                />
            </div>

            {/* ═══ Members ═══ */}
            <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                        Members
                    </h2>
                    <Users size={16} className="text-neutral-300 dark:text-neutral-700" />
                </div>

                <div className="space-y-4 flex-1">
                    {members.map(m => (
                        <div key={m.user_id} className="flex items-center justify-between group">
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-black dark:text-white">
                                    {(m.username || '?')[0].toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-black dark:text-white">{m.display_name || m.username}</p>
                                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500 capitalize">
                                        {m.role.replace('_', ' ')}
                                    </p>
                                </div>
                            </div>
                            {isAdmin && (
                                <Trash2
                                    size={12}
                                    className="opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity cursor-pointer"
                                    onClick={() => handleRemoveMember(m.user_id)}
                                />
                            )}
                        </div>
                    ))}

                    {members.length === 0 && (
                        <p className="text-xs text-neutral-400 dark:text-neutral-600 italic">
                            No members
                        </p>
                    )}
                </div>

                {isAdmin && (
                    <div className="mt-auto space-y-2 pt-4">
                        <div className="flex space-x-2">
                            <select
                                value={newMemberRole}
                                onChange={e => setNewMemberRole(e.target.value)}
                                className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-900 rounded-xl py-2 px-2 text-[10px] focus:outline-none focus:border-black dark:focus:border-white transition-all text-black dark:text-white"
                            >
                                <option value="admin">Admin</option>
                                <option value="chat">Chat</option>
                                <option value="read_only">Read Only</option>
                            </select>
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={newMemberName}
                                    onChange={e => setNewMemberName(e.target.value)}
                                    placeholder="Add member..."
                                    className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-900 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-black dark:focus:border-white transition-all text-black dark:text-white"
                                    onKeyDown={e => e.key === 'Enter' && handleAddMember()}
                                />
                                <button
                                    onClick={handleAddMember}
                                    className="absolute right-2 top-1.5 p-1 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-lg cursor-pointer"
                                >
                                    <Plus size={14} className="text-neutral-400" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
