/**
 * App — Root component matching reference design.
 * Three-panel layout:  Sidebar | Chat | RightPanel
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import RightPanel from './components/RightPanel';
import LibraryManager from './components/LibraryManager';
import type { Session, Document, Message } from './types';
import * as api from './services/api';

function Dashboard() {
    const { effectiveRole } = useAuth();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [current, setCurrent] = useState<Session | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [ingesting, setIngesting] = useState(false);
    const [view, setView] = useState<'dashboard' | 'library'>('dashboard');
    const fileRef = useRef<HTMLInputElement>(null);

    /* ── Load sessions ── */
    useEffect(() => {
        api.getSessions().then(data => {
            setSessions(data);
            if (data.length > 0 && !current) setCurrent(data[0]);
        }).catch(() => { });
    }, []);

    /* ── Load session data ── */
    const loadData = useCallback(async (id: string) => {
        try {
            const [msgs, docs] = await Promise.all([
                api.getMessages(id),
                api.getDocuments(id),
            ]);
            setMessages(msgs);
            setDocuments(docs);
        } catch {
            setMessages([]);
            setDocuments([]);
        }
    }, []);

    useEffect(() => {
        if (current) loadData(current.id);
        else { setMessages([]); setDocuments([]); }
    }, [current?.id, loadData]);

    /* ── Sessions ── */
    const handleCreate = async (name: string, withDocs: boolean) => {
        try {
            const s = await api.createSession(name, false);
            setSessions(prev => [s, ...prev]);
            setCurrent(s);
            if (withDocs) {
                setTimeout(() => fileRef.current?.click(), 200);
            }
        } catch { }
    };

    const handleDelete = async (id: string) => {
        try {
            await api.deleteSession(id);
            const next = sessions.filter(s => s.id !== id);
            setSessions(next);
            if (current?.id === id) setCurrent(next[0] || null);
        } catch { }
    };

    const handleRename = async (id: string, name: string) => {
        try {
            const updated = await api.renameSession(id, name);
            setSessions(prev => prev.map(s => s.id === id ? updated : s));
            if (current?.id === id) setCurrent(updated);
        } catch { }
    };

    /* ── Chat ── */
    const handleSend = async (query: string) => {
        if (!current) return;
        const userMsg: Message = {
            id: crypto.randomUUID(),
            role: 'user',
            content: query,
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);
        try {
            const res = await api.sendMessage(current.id, query);
            const asstMsg: Message = {
                id: res.message_id || crypto.randomUUID(),
                role: 'assistant',
                content: res.answer,
                confident: res.confident,
                reasoning: res.reasoning || null,
                created_at: new Date().toISOString(),
                sources: res.sources || [],
            };
            setMessages(prev => [...prev, asstMsg]);
        } catch (err: any) {
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: `Error: ${err.message || 'Something went wrong'}`,
                confident: false,
                reasoning: null,
                created_at: new Date().toISOString(),
            }]);
        } finally {
            setLoading(false);
        }
    };

    /* ── Documents ── */
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || !current) return;
        setIngesting(true);
        try {
            for (const file of Array.from(files)) {
                await api.uploadDocument(current.id, file);
            }
            setDocuments(await api.getDocuments(current.id));
        } finally {
            setIngesting(false);
            e.target.value = '';
        }
    };

    const handleToggleDoc = async (docId: string, sel: boolean) => {
        if (!current) return;
        try {
            await api.toggleDocument(current.id, docId, sel);
            setDocuments(prev => prev.map(d => d.id === docId ? { ...d, selected: sel } : d));
        } catch { }
    };

    const handleDeleteDoc = async (docId: string) => {
        if (!current) return;
        try {
            await api.deleteDocument(current.id, docId);
            setDocuments(prev => prev.filter(d => d.id !== docId));
        } catch { }
    };

    const handleToggleWeb = () => {
        if (!current) return;
        const updated = { ...current, web_mode: !current.web_mode };
        setCurrent(updated);
        setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
    };

    const selectedCount = documents.filter(d => d.selected).length;

    return (
        <div className="flex h-screen w-full bg-white dark:bg-black text-black dark:text-white overflow-hidden font-sans transition-colors duration-300">
            <Sidebar
                sessions={sessions}
                currentId={current?.id || null}
                onSelect={setCurrent}
                onDelete={handleDelete}
                onRename={handleRename}
                onCreate={handleCreate}
                onTriggerUpload={() => fileRef.current?.click()}
                onNavigate={setView}
                currentView={view}
            />

            {view === 'dashboard' ? (
                <>
                    <ChatPanel
                        session={current}
                        messages={messages}
                        isLoading={loading}
                        onSend={handleSend}
                        webMode={current?.web_mode || false}
                        onToggleWeb={handleToggleWeb}
                        selectedDocCount={selectedCount}
                        onUploadClick={() => fileRef.current?.click()}
                    />
                    <RightPanel
                        sessionId={current?.id || null}
                        documents={documents}
                        onToggleDoc={handleToggleDoc}
                        onDeleteDoc={handleDeleteDoc}
                        isIngesting={ingesting}
                    />
                </>
            ) : (
                <LibraryManager onBack={() => setView('dashboard')} />
            )}

            {/* Hidden file input */}
            <input
                type="file"
                ref={fileRef}
                className="hidden"
                multiple
                accept=".pdf"
                onChange={handleFileUpload}
            />
        </div>
    );
}

export default function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <AuthGate />
            </AuthProvider>
        </ThemeProvider>
    );
}

function AuthGate() {
    const { isAuthenticated } = useAuth();
    return (
        <AnimatePresence mode="wait">
            {!isAuthenticated ? (
                <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <LoginPage />
                </motion.div>
            ) : (
                <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="w-full h-full">
                    <Dashboard />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
