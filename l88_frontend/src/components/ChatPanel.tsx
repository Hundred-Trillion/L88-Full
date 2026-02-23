/**
 * ChatPanel — Noctis v1 Minimalist Interface.
 * Bubble-free, tiered messaging, terminal-style input.
 */

import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { motion, AnimatePresence } from 'motion';
import {
    Send, Upload, Globe, FileText, ChevronDown,
    ChevronUp, Sparkles, MessageSquare, BookOpen,
    AlertCircle, Terminal, Command
} from 'lucide-react';
import { cn } from '../lib/cn';
import type { Message, Session } from '../types';

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

export default function ChatPanel({
    session, messages, isLoading, onSend, onUpload, webMode, onToggleWeb, selectedDocCount
}: Props) {
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSend = () => {
        if (!input.trim() || isLoading) return;
        onSend(input.trim());
        setInput('');
    };

    return (
        <main className="flex-1 flex flex-col bg-noctis-main relative overflow-hidden">
            {/* Header */}
            <header className="h-16 flex items-center justify-between px-10 border-b border-zinc-900 z-10">
                <div className="flex items-center space-x-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Terminal</span>
                    <div className="h-1 w-1 rounded-full bg-zinc-800" />
                    <span className="text-[10px] font-bold text-zinc-300 truncate max-w-[200px]">
                        {session?.name || 'Initialization Required'}
                    </span>
                </div>

                <div className="flex items-center space-x-6">
                    <button
                        onClick={onToggleWeb}
                        className={cn(
                            "flex items-center space-x-2 px-3 py-1.5 rounded-full transition-all border",
                            webMode
                                ? "bg-white text-black border-white"
                                : "bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-500"
                        )}
                    >
                        <Globe size={11} strokeWidth={2.5} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Global Link</span>
                    </button>
                    <div className="h-4 w-px bg-zinc-900" />
                    <div className="flex items-center space-x-2 text-zinc-500">
                        <BookOpen size={12} />
                        <span className="text-[10px] font-bold tracking-tight">{selectedDocCount} Sources</span>
                    </div>
                </div>
            </header>

            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-10 pt-10 pb-32 space-y-12 custom-scrollbar"
            >
                {messages.length === 0 && !isLoading && (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 pointer-events-none">
                        <span className="text-[10px] font-black uppercase tracking-[1em] mb-4">Noctis v0.1</span>
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-px bg-zinc-100" />
                            <div className="w-2 h-2 rounded-full border border-zinc-100" />
                            <div className="w-12 h-px bg-zinc-100" />
                        </div>
                    </div>
                )}

                {messages.map((m, idx) => (
                    <div key={m.id} className="animate-zen">
                        {m.role === 'user' ? (
                            <div className="flex flex-col items-end space-y-3">
                                <div className="flex items-center space-x-3 text-zinc-500 text-[9px] font-black uppercase tracking-widest">
                                    <span>User</span>
                                    <div className="w-4 h-px bg-zinc-800" />
                                </div>
                                <div className="max-w-[80%] text-right text-zinc-900 dark:text-zinc-100 text-sm font-bold leading-relaxed tracking-tight">
                                    {m.content}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col space-y-4">
                                <div className="flex items-center space-x-3 text-zinc-500 text-[9px] font-black uppercase tracking-widest">
                                    <div className="w-4 h-px bg-zinc-800" />
                                    <span>Noctis</span>
                                    {m.confident === false && <AlertCircle size={10} className="text-red-500" />}
                                </div>

                                {m.reasoning && (
                                    <div className="pl-7 border-l-2 border-zinc-100 dark:border-zinc-900 py-1 italic text-zinc-500 text-xs">
                                        {m.reasoning}
                                    </div>
                                )}

                                <div className="pl-7 text-zinc-900 dark:text-zinc-200 text-sm leading-relaxed tracking-tight">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                    >
                                        {m.content || ''}
                                    </ReactMarkdown>
                                </div>

                                {m.citations && m.citations.length > 0 && (
                                    <div className="pl-7 mt-6">
                                        <CitationDropdown citations={m.citations} />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {isLoading && (
                    <div className="flex flex-col space-y-3 pl-7 animate-pulse">
                        <div className="flex items-center space-x-2 text-[9px] font-black uppercase tracking-widest text-zinc-600">
                            <div className="w-4 h-px bg-zinc-900" />
                            <span>Processing</span>
                        </div>
                        <div className="w-8 h-1 bg-zinc-800 rounded-full" />
                    </div>
                )}
            </div>

            {/* Input Bar */}
            <div className="absolute bottom-0 left-0 right-0 p-10 pt-0 bg-gradient-to-t from-noctis-main via-noctis-main to-transparent">
                <div className="max-w-4xl mx-auto flex items-end space-x-4 p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-2xl shadow-sm focus-within:border-zinc-700 transition-all">
                    <button
                        onClick={() => fileRef.current?.click()}
                        className="p-2 text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
                    >
                        <Upload size={18} />
                    </button>

                    <input
                        type="file"
                        ref={fileRef}
                        className="hidden"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) onUpload(f);
                        }}
                    />

                    <textarea
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        rows={1}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="System Command..."
                        className="flex-1 bg-transparent py-2 resize-none outline-none text-sm font-bold placeholder:text-zinc-600 dark:placeholder:text-zinc-800 text-zinc-900 dark:text-white"
                    />

                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className={cn(
                            "p-2 rounded-xl transition-all",
                            input.trim() ? "text-black dark:text-white" : "text-zinc-800"
                        )}
                    >
                        <Command size={18} />
                    </button>
                </div>
                <div className="mt-4 flex justify-center">
                    <span className="text-[8px] font-bold text-zinc-700 uppercase tracking-[0.5em]">Authored by L88 Laboratories</span>
                </div>
            </div>
        </main>
    );
}

function CitationDropdown({ citations }: { citations: any[] }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="inline-block">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center space-x-2 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-zinc-400 transition-all group"
            >
                <BookOpen size={10} className="text-zinc-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white">Evidence</span>
                {open ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {citations.map((c, i) => (
                                <div key={i} className="p-4 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-900 rounded-xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2 text-zinc-900 dark:text-zinc-400">
                                            <FileText size={10} />
                                            <span className="text-[9px] font-black uppercase tracking-tight truncate max-w-[120px]">{c.filename}</span>
                                        </div>
                                        <span className="text-[9px] font-bold text-zinc-500 uppercase">P. {c.page}</span>
                                    </div>
                                    <p className="text-[10px] leading-relaxed text-zinc-600 dark:text-zinc-400 line-clamp-3">
                                        "{c.excerpt}"
                                    </p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
