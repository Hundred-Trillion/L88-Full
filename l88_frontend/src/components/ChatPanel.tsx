/**
 * ChatPanel — Matches reference design exactly.
 * Header with session name + web toggle.
 * Messages: user = rounded pill, assistant = markdown.
 * Input bar: rounded-3xl with + button and send.
 * Sources as mono tags.
 * CRITICAL: Parses raw JSON from stored messages.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Globe, Plus, MessageSquare, Loader2, Copy, Check, FileText, Sparkles } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { Session, Message, Source } from '../types';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/cn';

interface Props {
    session: Session | null;
    messages: Message[];
    isLoading: boolean;
    onSend: (msg: string) => void;
    webMode: boolean;
    onToggleWeb: () => void;
    selectedDocCount: number;
    onUploadClick: () => void;
}

/** Parse raw JSON content → { text, sources } */
function extractContent(msg: Message): { text: string; sources: Source[] } {
    let raw = msg.content || '';
    const trimmed = raw.trim();

    // 1. Try to find JSON within the content
    let jsonStr = trimmed;

    // Handle markdown code fences
    if (jsonStr.includes('```')) {
        const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (match) jsonStr = match[1].trim();
    }

    // Find the first { and last } if it's not already a clean JSON string
    if (!jsonStr.startsWith('{')) {
        const start = jsonStr.indexOf('{');
        const end = jsonStr.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
            jsonStr = jsonStr.substring(start, end + 1);
        }
    }

    // 2. Parse and extract answer
    if (jsonStr.startsWith('{') && jsonStr.includes('"answer"')) {
        try {
            const parsed = JSON.parse(jsonStr);
            if (typeof parsed.answer === 'string') {
                return {
                    text: parsed.answer,
                    sources: parsed.sources || msg.sources || [],
                };
            }
        } catch { }
    }
    return { text: raw, sources: msg.sources || [] };
}

export default function ChatPanel({
    session, messages, isLoading, onSend,
    webMode, onToggleWeb, selectedDocCount, onUploadClick,
}: Props) {
    const { effectiveRole } = useAuth();
    const [input, setInput] = useState('');
    const endRef = useRef<HTMLDivElement>(null);
    const canChat = effectiveRole !== 'read_only';
    const canUpload = effectiveRole === 'admin';

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const send = () => {
        if (!input.trim() || !canChat || !session) return;
        onSend(input.trim());
        setInput('');
    };

    return (
        <main className="flex-1 flex flex-col relative bg-white dark:bg-black">
            {/* Header */}
            <header className="h-16 border-b border-neutral-100 dark:border-neutral-900 flex items-center justify-between px-8 shrink-0">
                <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-black dark:text-white">
                        {session?.name || 'Select Session'}
                    </span>
                    {session && (
                        <span className="text-[10px] uppercase tracking-widest text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-900 px-1.5 py-0.5 rounded">
                            {selectedDocCount > 0 ? 'RAG Mode' : 'General Chat'}
                        </span>
                    )}
                </div>
                <div className="flex items-center space-x-4">
                    <button
                        onClick={onToggleWeb}
                        disabled={!session}
                        className={cn(
                            "flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 border cursor-pointer",
                            webMode
                                ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-lg shadow-black/10 dark:shadow-white/5"
                                : "bg-white dark:bg-black text-neutral-400 dark:text-neutral-500 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
                        )}
                    >
                        <Globe size={14} className={cn(webMode && "animate-pulse")} />
                        <span>WEB</span>
                    </button>
                </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-8 py-8 space-y-12">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-neutral-300 dark:text-neutral-700 space-y-4">
                        <div className="w-12 h-12 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex items-center justify-center">
                            <MessageSquare size={24} />
                        </div>
                        <p className="text-sm font-medium">Start a conversation</p>
                    </div>
                )}

                {messages.map(msg => (
                    <MsgBubble key={msg.id} msg={msg} />
                ))}

                {isLoading && (
                    <div className="max-w-3xl mx-auto w-full flex items-center space-x-2 text-neutral-300 dark:text-neutral-700">
                        <div className="w-1.5 h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-1.5 h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                )}

                <div ref={endRef} />
            </div>

            {/* Input Bar */}
            <div className="p-8 pt-0">
                <div className="max-w-3xl mx-auto relative group">
                    <div className="absolute left-4 bottom-4 flex items-center space-x-2 z-10">
                        {canUpload && (
                            <button
                                onClick={onUploadClick}
                                className="p-2 text-neutral-400 dark:text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-xl transition-all cursor-pointer"
                            >
                                <Plus size={20} />
                            </button>
                        )}
                    </div>
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                send();
                            }
                        }}
                        disabled={!canChat || !session}
                        placeholder={
                            !session ? 'Select a session...'
                                : canChat ? 'Ask L88 anything...'
                                    : "You don't have permission to chat"
                        }
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-900 rounded-3xl py-4 pl-14 pr-16 focus:outline-none focus:ring-1 focus:ring-black/5 dark:focus:ring-white/5 focus:border-neutral-300 dark:focus:border-neutral-700 transition-all resize-none min-h-[60px] max-h-40 text-black dark:text-white disabled:opacity-50 text-sm"
                        rows={1}
                    />
                    <button
                        onClick={send}
                        disabled={!input.trim() || isLoading || !canChat || !session}
                        className="absolute right-4 bottom-4 p-2 bg-black dark:bg-white text-white dark:text-black rounded-xl disabled:opacity-20 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                        <Send size={20} />
                    </button>
                </div>
                <div className="max-w-3xl mx-auto mt-3 flex justify-between items-center px-4">
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium uppercase tracking-widest">
                        {selectedDocCount} docs selected
                    </span>
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium uppercase tracking-widest">
                        {webMode ? 'Web Mode Active' : 'Local Mode'}
                    </span>
                </div>
            </div>
        </main>
    );
}

/* Message Bubble */
function MsgBubble({ msg }: { msg: Message }) {
    const isUser = msg.role === 'user';
    const { text, sources } = useMemo(() => extractContent(msg), [msg]);
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "max-w-3xl mx-auto flex flex-col group/msg",
                isUser ? "items-end" : "items-start"
            )}
        >
            <div className={cn(
                "text-sm leading-relaxed relative",
                isUser
                    ? "bg-neutral-100 dark:bg-neutral-900 px-4 py-2.5 rounded-2xl rounded-tr-none text-neutral-800 dark:text-neutral-200"
                    : "w-full"
            )}>
                {isUser ? (
                    text
                ) : (
                    <div className="markdown-body dark:prose-invert">
                        <Markdown
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                        >
                            {text}
                        </Markdown>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                            <div className="flex flex-wrap gap-2 items-center">
                                {sources.length > 0 ? (
                                    sources.map((s, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center space-x-2 px-2 py-1 rounded-lg border border-neutral-100 dark:border-neutral-900 bg-neutral-50 dark:bg-neutral-950 transition-all hover:border-neutral-200 dark:hover:border-neutral-800 group/source"
                                        >
                                            {s.source === 'library' ? (
                                                <span className="flex items-center px-1 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-[8px] font-bold text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 uppercase">
                                                    <Globe size={10} className="mr-1" />
                                                    Web
                                                </span>
                                            ) : (
                                                <span className="flex items-center px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-[8px] font-bold text-neutral-500 border border-neutral-200 dark:border-neutral-800 uppercase">
                                                    <FileText size={10} className="mr-1" />
                                                    Doc
                                                </span>
                                            )}
                                            <span className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 truncate max-w-[120px]" title={s.filename}>
                                                {s.filename}
                                            </span>
                                            {s.page != null && (
                                                <span className="text-[9px] text-neutral-400 font-mono">p.{s.page}</span>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex items-center px-2 py-1 rounded-lg border border-purple-100 dark:border-purple-900/30 bg-purple-50/30 dark:bg-purple-950/10">
                                        <span className="flex items-center px-1 py-0.5 rounded bg-purple-100 dark:bg-purple-900 text-[8px] font-bold text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50 uppercase">
                                            <Sparkles size={10} className="mr-1" />
                                            Training Data
                                        </span>
                                        <span className="ml-2 text-[10px] font-medium text-purple-600/70 dark:text-purple-400/70">Paramanandha Internal Knowledge</span>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleCopy}
                                className="flex items-center space-x-1.5 px-2 py-1 rounded-lg border border-neutral-100 dark:border-neutral-900 bg-neutral-50 dark:bg-neutral-950 text-neutral-400 dark:text-neutral-500 hover:text-black dark:hover:text-white hover:border-neutral-300 dark:hover:border-neutral-700 transition-all opacity-0 group-hover/msg:opacity-100 cursor-pointer text-[10px] font-medium uppercase tracking-wider"
                            >
                                {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                                <span>{copied ? 'Copied' : 'Copy'}</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
