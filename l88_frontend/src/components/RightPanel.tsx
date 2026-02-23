/**
 * RightPanel — premium control center for sessions.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Check, Library, FileText, Download, Users, Plus, Trash2, BookOpen, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/cn';
import type { Document, ScratchPad, SessionMember } from '../types';
import * as api from '../services/api';

interface Props {
    sessionId: string | null;
    documents: Document[];
    onToggleDoc: (docId: string, selected: boolean) => void;
    onDeleteDoc: (docId: string) => void;
    onDocsChanged: () => void;
}

export default function RightPanel({ sessionId, documents, onToggleDoc, onDeleteDoc, onDocsChanged }: Props) {
    const [scratchPad, setScratchPad] = useState('');
    const [members, setMembers] = useState<SessionMember[]>([]);
    const [newUsername, setNewUsername] = useState('');
    const [newRole, setNewRole] = useState('chat');
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!sessionId) return;
        api.getScratchPad(sessionId).then(sp => setScratchPad(sp.content)).catch(() => setScratchPad(''));
        api.getMembers(sessionId).then(setMembers).catch(() => setMembers([]));
    }, [sessionId]);

    const handleScratchChange = (value: string) => {
        setScratchPad(value);
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
            if (sessionId) api.updateScratchPad(sessionId, value).catch(() => { });
        }, 1000);
    };

    const downloadScratchPad = () => {
        const blob = new Blob([scratchPad], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `l88-notes-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleAddMember = async () => {
        if (!sessionId || !newUsername) return;
        try {
            await api.addMember(sessionId, newUsername, newRole);
            const updated = await api.getMembers(sessionId);
            setMembers(updated);
            setNewUsername('');
        } catch { }
    };

    const selectedCount = documents.filter(d => d.selected).length;

    return (
        <aside className="w-80 h-screen flex flex-col bg-slate-50 border-l border-slate-200/60 relative z-30">
            {/* Knowledge Library */}
            <div className="p-8 pb-4">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Library size={16} />
                        </div>
                        <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Knowledge Library</h2>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded-full">
                        {selectedCount}/{documents.length}
                    </span>
                </div>

                <div className="space-y-2 overflow-y-auto max-h-[30vh] pr-2 custom-scrollbar">
                    {documents.length === 0 && (
                        <div className="py-8 text-center bg-white/50 border border-dashed border-slate-200 rounded-[32px] p-6">
                            <BookOpen size={24} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                                Ready for ingestion
                            </p>
                        </div>
                    )}
                    <AnimatePresence mode="popLayout">
                        {documents.map((doc, idx) => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: idx * 0.05 }}
                                key={doc.id}
                                className={cn(
                                    "flex items-center p-3.5 rounded-2xl border cursor-pointer transition-all group relative overflow-hidden",
                                    doc.selected
                                        ? "bg-white border-slate-200 shadow-md ring-1 ring-slate-900/5"
                                        : "bg-transparent border-transparent hover:bg-slate-200/50 opacity-60"
                                )}
                                onClick={() => onToggleDoc(doc.id, !doc.selected)}
                            >
                                <div className={cn(
                                    "w-5 h-5 rounded-lg border-2 flex items-center justify-center mr-3 transition-all shrink-0",
                                    doc.selected
                                        ? "bg-slate-900 border-slate-900 scale-110"
                                        : "border-slate-300 bg-white"
                                )}>
                                    {doc.selected && <Check size={12} className="text-white" strokeWidth={3} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={cn("text-xs truncate transition-colors", doc.selected ? "font-bold text-slate-900" : "font-medium text-slate-600")}>
                                        {doc.filename}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">
                                        {doc.page_count}p • {doc.chunk_count} chunks
                                    </p>
                                </div>
                                <button
                                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 transition-all ml-2"
                                    onClick={(e) => { e.stopPropagation(); onDeleteDoc(doc.id); }}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* Analysis Notes (Scratch Pad) */}
            <div className="p-8 py-4 border-y border-slate-200/40">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Activity size={16} />
                        </div>
                        <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Analysis Notes</h2>
                    </div>
                    <button
                        onClick={downloadScratchPad}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm"
                    >
                        <Download size={14} />
                    </button>
                </div>
                <div className="relative group">
                    <div className="absolute inset-0 bg-indigo-500/5 blur-xl rounded-[28px] opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    <textarea
                        value={scratchPad}
                        onChange={(e) => handleScratchChange(e.target.value)}
                        placeholder="Neural findings…"
                        className="relative w-full h-32 bg-white/50 border border-slate-200 rounded-[28px] p-4 text-xs focus:bg-white focus:border-slate-900 transition-all resize-none font-mono text-slate-800 leading-relaxed outline-none"
                    />
                </div>
            </div>

            {/* Collaborators */}
            <div className="p-8 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Users size={16} />
                        </div>
                        <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Collaborators</h2>
                    </div>
                </div>

                <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {members.map((m, idx) => (
                        <motion.div
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            key={m.id}
                            className="flex items-center space-x-3 p-1"
                        >
                            <div className="relative">
                                <div className="w-9 h-9 rounded-full bg-slate-950 flex items-center justify-center text-[10px] text-white font-bold ring-2 ring-white shadow-md">
                                    {(m.display_name || m.username || '?')[0].toUpperCase()}
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">{m.display_name || m.username}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                                    {m.role.replace('_', ' ')}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Invite Interface */}
                {sessionId && (
                    <div className="mt-6 pt-6 border-t border-slate-200/60">
                        <div className="glass rounded-[28px] p-2 flex items-center space-x-2 border border-white/60">
                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                <Plus size={14} />
                            </div>
                            <input
                                type="text"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                placeholder="Add researcher..."
                                className="flex-1 bg-transparent border-none py-2 px-1 text-[11px] font-bold text-slate-900 placeholder-slate-400 focus:ring-0"
                            />
                            <button
                                onClick={handleAddMember}
                                disabled={!newUsername}
                                className="w-8 h-8 bg-slate-950 text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-20 shadow-lg shadow-slate-900/10"
                            >
                                <Check size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
