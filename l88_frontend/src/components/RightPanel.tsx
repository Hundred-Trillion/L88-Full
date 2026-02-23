/**
 * RightPanel — Noctis v1 Knowledge Ledger.
 * Achromatic, document-centric, analysis focus.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    Check, Library, FileText, Download, Users, Plus,
    Trash2, BookOpen, Activity, ChevronRight, Save, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/cn';
import type { Document, ScratchPad } from '../types';
import * as api from '../services/api';

interface Props {
    sessionId: string | null;
    documents: Document[];
    onToggleDoc: (id: string, selected: boolean) => void;
    onDeleteDoc: (id: string) => void;
    onDocsChanged: () => void;
    isIngesting?: boolean;
    ingestionStep?: 'Parsing' | 'Chunking' | 'Indexing' | null;
}

export default function RightPanel({
    sessionId, documents, onToggleDoc, onDeleteDoc, onDocsChanged,
    isIngesting, ingestionStep
}: Props) {
    const [view, setView] = useState<'library' | 'notes'>('library');
    const [scratchpad, setScratchpad] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (sessionId && view === 'notes') {
            api.getScratchPad(sessionId).then(res => setScratchpad(res.content));
        }
    }, [sessionId, view]);

    const handleSaveNotes = async () => {
        if (!sessionId) return;
        setIsSaving(true);
        try {
            await api.updateScratchPad(sessionId, scratchpad);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <aside className="w-80 h-screen flex flex-col bg-noctis-main border-l border-zinc-900 z-20 overflow-hidden">
            {/* Navigation Tabs */}
            <div className="flex border-b border-zinc-900 bg-zinc-950/20">
                <button
                    onClick={() => setView('library')}
                    className={cn(
                        "flex-1 py-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all",
                        view === 'library' ? "text-white" : "text-zinc-600 hover:text-zinc-400"
                    )}
                >
                    Ledger
                </button>
                <div className="w-px h-10 bg-zinc-900 self-center" />
                <button
                    onClick={() => setView('notes')}
                    className={cn(
                        "flex-1 py-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all",
                        view === 'notes' ? "text-white" : "text-zinc-600 hover:text-zinc-400"
                    )}
                >
                    Analysis
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-8 custom-scrollbar relative">
                <AnimatePresence mode="wait">
                    {view === 'library' ? (
                        <motion.div
                            key="library"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-10"
                        >
                            {/* Ingestion Progress */}
                            {isIngesting && (
                                <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-4 animate-zen">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Ingestion</span>
                                        <div className="flex items-center space-x-1">
                                            <div className={cn("w-1 h-1 rounded-full", ingestionStep === 'Parsing' ? 'bg-white' : 'bg-zinc-800')} />
                                            <div className={cn("w-1 h-1 rounded-full", ingestionStep === 'Chunking' ? 'bg-white' : 'bg-zinc-800')} />
                                            <div className={cn("w-1 h-1 rounded-full", ingestionStep === 'Indexing' ? 'bg-white' : 'bg-zinc-800')} />
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <Activity size={12} className="text-white animate-pulse" />
                                        <span className="text-[10px] font-bold text-zinc-300 uppercase leading-none tracking-tight">
                                            {ingestionStep}...
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Documents List */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-600">Assets</h3>
                                    <span className="text-[9px] font-bold text-zinc-800">{documents.length} Total</span>
                                </div>

                                {documents.length === 0 ? (
                                    <div className="py-20 flex flex-col items-center justify-center space-y-4 opacity-10">
                                        <Library size={32} strokeWidth={1} />
                                        <span className="text-[10px] font-black tracking-widest uppercase">Void</span>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {documents.map((doc) => (
                                            <div
                                                key={doc.id}
                                                className={cn(
                                                    "group p-3 border rounded-xl transition-all cursor-pointer relative",
                                                    doc.selected
                                                        ? "bg-zinc-900/40 border-zinc-800"
                                                        : "bg-transparent border-transparent hover:border-zinc-900"
                                                )}
                                                onClick={() => onToggleDoc(doc.id, !doc.selected)}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center space-x-3 min-w-0">
                                                        <div className={cn(
                                                            "w-2 h-2 rounded-full border",
                                                            doc.selected ? "bg-white border-white" : "border-zinc-800"
                                                        )} />
                                                        <span className="text-[11px] font-bold text-zinc-300 truncate tracking-tight">{doc.filename}</span>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onDeleteDoc(doc.id); }}
                                                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-500 transition-all"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                                <div className="flex items-center space-x-3 px-5 text-[8px] font-bold text-zinc-600 uppercase tracking-widest">
                                                    <span>{doc.page_count} Pages</span>
                                                    <span className="opacity-20">/</span>
                                                    <span>{doc.chunk_count} Chunks</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="notes"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-full flex flex-col space-y-6"
                        >
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-600">Analysis Logs</h3>
                                <button
                                    onClick={handleSaveNotes}
                                    disabled={isSaving}
                                    className="p-1.5 text-zinc-500 hover:text-white transition-colors"
                                >
                                    <Save size={14} className={isSaving ? 'animate-pulse' : ''} />
                                </button>
                            </div>

                            <textarea
                                value={scratchpad}
                                onChange={(e) => setScratchpad(e.target.value)}
                                placeholder="Commence analysis narrative..."
                                className="flex-1 w-full bg-transparent resize-none outline-none text-sm font-medium leading-relaxed text-zinc-200 placeholder:text-zinc-800 overflow-y-auto custom-scrollbar"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Persistence Bar */}
            <div className="p-6 border-t border-zinc-900 bg-zinc-950/20">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em]">State Pipeline</span>
                        <span className="text-[10px] font-bold text-zinc-300">Synchronized</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                        <div className="w-1 h-1 rounded-full bg-emerald-500" />
                        <span className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Active</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
