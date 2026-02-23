/**
 * ChatPanel — premium conversational interface for L88.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Globe, Plus, AlertTriangle, ChevronDown, ChevronUp, FileText, Sparkles, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { cn } from '../lib/cn';
import type { Message, Session, Citation } from '../types';

interface Props {
    session: Session | null;
    messages: Message[];
    isLoading: boolean;
    onSend: (query: string) => void;
    onUpload: (file: File) => void;
    webMode: boolean;
    onToggleWeb: () => void;
    selectedDocCount: number;
}

/* ── Citation Dropdown Component ── */
function CitationDropdown({ citations }: { citations: Citation[] }) {
    const [open, setOpen] = useState(false);

    if (!citations || citations.length === 0) return null;

    return (
        <div className="mt-6 border-t border-slate-100 pt-4">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors"
            >
                <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center">
                    <FileText size={12} />
                </div>
                <span>Analysis Sources ({citations.length})</span>
                {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: -10 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4"
                    >
                        {citations.map((c, i) => (
                            <div
                                key={c.id || i}
                                className="bg-slate-50 border border-slate-100/80 rounded-2xl p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                        <span className="text-[10px] font-bold text-slate-900 truncate max-w-[120px]">
                                            {c.doc_filename}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100">
                                        p.{c.page}
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-3 italic">
                                    "{c.chunk_text}"
                                </p>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ── Main Chat Panel ── */
export default function ChatPanel({
    session, messages, isLoading, onSend, onUpload, webMode, onToggleWeb, selectedDocCount,
}: Props) {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = () => {
        if (!input.trim() || isLoading || !session) return;
        onSend(input.trim());
        setInput('');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        for (const f of Array.from(files)) onUpload(f);
        e.target.value = '';
    };

    return (
        <main className="flex-1 flex flex-col relative bg-white overflow-hidden">
            {/* Glossy Header */}
            <header className="h-20 glass border-b border-white/60 flex items-center justify-between px-10 sticky top-0 z-20">
                <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
                        <Terminal size={18} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">{session?.name || 'L88 Assistant'}</h2>
                        <div className="flex items-center space-x-2 mt-0.5">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {session?.session_type === 'rag' ? 'Analytical RAG' : 'Neural Core'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        onClick={onToggleWeb}
                        className={cn(
                            "flex items-center space-x-2 px-4 py-2 rounded-2xl text-[10px] font-bold tracking-widest uppercase transition-all duration-300 border",
                            webMode
                                ? "bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-900/10"
                                : "bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600"
                        )}
                    >
                        <Globe size={14} className={cn(webMode && "animate-pulse")} />
                        <span>Intelligence Engine</span>
                    </button>
                    <div className="w-px h-6 bg-slate-100 mx-1" />
                    <div className="flex -space-x-2">
                        {[1, 2].map((i) => (
                            <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200" />
                        ))}
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-900 flex items-center justify-center text-[10px] text-white font-bold">
                            +{selectedDocCount}
                        </div>
                    </div>
                </div>
            </header>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-10 space-y-12">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-8 max-w-lg mx-auto">
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-24 h-24 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-[32px] flex items-center justify-center shadow-2xl relative"
                        >
                            <Sparkles className="text-white w-10 h-10" />
                            <div className="absolute inset-0 bg-indigo-500 rounded-[32px] animate-ping opacity-10" />
                        </motion.div>
                        <div className="space-y-3">
                            <h3 className="text-2xl font-bold text-slate-900">How can I assist you today?</h3>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                Upload scientific documents or start a conversation to leverage L88's advanced neuro-symbolic reasoning.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 w-full">
                            {['Summarize Paper', 'Fact Check'].map(text => (
                                <button key={text} className="px-6 py-4 rounded-3xl border border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-600 hover:bg-white hover:border-slate-200 hover:shadow-lg transition-all">
                                    {text}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        key={msg.id || idx}
                        className={cn(
                            "max-w-4xl mx-auto flex flex-col",
                            msg.role === 'user' ? "items-end" : "items-start"
                        )}
                    >
                        <div className={cn(
                            "text-sm leading-relaxed relative",
                            msg.role === 'user'
                                ? "bg-slate-900 text-white px-6 py-4 rounded-[32px] rounded-tr-none shadow-xl shadow-slate-900/10 max-w-[80%] font-medium"
                                : "w-full bg-slate-50/50 border border-slate-100 rounded-[40px] p-8 md:p-10 shadow-sm"
                        )}>
                            {msg.role === 'assistant' ? (
                                <div className="space-y-6">
                                    <div className="markdown-body">
                                        <Markdown>{msg.content}</Markdown>
                                    </div>
                                    <CitationDropdown citations={msg.citations || []} />
                                </div>
                            ) : (
                                msg.content
                            )}
                        </div>
                    </motion.div>
                ))}

                {isLoading && (
                    <div className="max-w-4xl mx-auto w-full flex items-center space-x-3 text-slate-400 font-medium py-4 px-10">
                        <div className="flex space-x-1">
                            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-indigo-300 rounded-full" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest">Reasoning...</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Floating Dock Input */}
            <div className="p-8 relative">
                <div className="max-w-4xl mx-auto relative group">
                    <div className="absolute inset-0 bg-indigo-500/5 blur-2xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    <div className="relative glass rounded-[36px] p-2 pr-4 shadow-2xl border border-white/60 flex items-end">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={!session}
                            className="p-4 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-[28px] transition-all disabled:opacity-20"
                        >
                            <Plus size={24} />
                        </button>

                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder={session ? "Ask L88 Vision anything..." : "Select a session to start"}
                            disabled={!session}
                            className="flex-1 bg-transparent border-none py-4 px-2 focus:ring-0 transition-all resize-none min-h-[60px] max-h-40 text-slate-900 font-medium placeholder-slate-400 text-sm"
                            rows={1}
                        />

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading || !session}
                            className="mb-1 p-4 bg-slate-950 text-white rounded-[28px] shadow-xl shadow-slate-950/20 disabled:opacity-20 hover:bg-slate-900 transition-all"
                        >
                            <Send size={20} className="rotate-[-10deg]" />
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf"
                onChange={handleFileChange}
            />
        </main>
    );
}
