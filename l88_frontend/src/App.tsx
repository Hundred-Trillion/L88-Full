/**
 * App — Root Orchestrator for L88 Vision.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import RightPanel from './components/RightPanel';
import type { Session, Document, Message } from './types';
import * as api from './services/api';

function Dashboard() {
    const { user } = useAuth();

    /* ── State ── */
    const [sessions, setSessions] = useState<Session[]>([]);
    const [currentSession, setCurrentSession] = useState<Session | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    /* ── Load sessions on mount ── */
    useEffect(() => {
        api.getSessions().then(data => {
            setSessions(data);
            if (data.length > 0 && !currentSession) setCurrentSession(data[0]);
        }).catch(() => { });
    }, []);

    /* ── Load session data when session changes ── */
    const loadSessionData = useCallback(async (id: string) => {
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
    }, [currentSession?.id]);

    useEffect(() => {
        if (currentSession) loadSessionData(currentSession.id);
        else { setMessages([]); setDocuments([]); }
    }, [currentSession?.id, loadSessionData]);

    /* ── Handlers ── */
    const handleCreateSession = async (name: string, webMode: boolean) => {
        try {
            const s = await api.createSession(name, webMode);
            setSessions(prev => [s, ...prev]);
            setCurrentSession(s);
        } catch { }
    };

    const handleDeleteSession = async (id: string) => {
        try {
            await api.deleteSession(id);
            const updated = sessions.filter(s => s.id !== id);
            setSessions(updated);
            if (currentSession?.id === id) setCurrentSession(updated[0] || null);
        } catch { }
    };

    const handleSend = async (query: string) => {
        if (!currentSession) return;
        const userMsg: Message = {
            id: crypto.randomUUID(),
            session_id: currentSession.id,
            role: 'user',
            content: query,
            confident: true,
            reasoning: null,
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);
        try {
            const res = await api.sendMessage(currentSession.id, query);
            const assistantMsg: Message = {
                id: crypto.randomUUID(),
                session_id: currentSession.id,
                role: 'assistant',
                content: res.answer,
                confident: res.confident,
                reasoning: res.reasoning,
                created_at: new Date().toISOString(),
                citations: res.citations || [],
            };
            setMessages(prev => [...prev, assistantMsg]);
        } catch (err: any) {
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                session_id: currentSession.id,
                role: 'assistant',
                content: `⚠ Error: ${err.message}`,
                confident: false,
                reasoning: null,
                created_at: new Date().toISOString(),
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpload = async (file: File) => {
        if (!currentSession) return;
        try {
            await api.uploadDocument(currentSession.id, file);
            const docs = await api.getDocuments(currentSession.id);
            setDocuments(docs);
        } catch { }
    };

    const handleToggleDoc = async (docId: string, selected: boolean) => {
        if (!currentSession) return;
        try {
            await api.toggleDocument(currentSession.id, docId, selected);
            setDocuments(prev =>
                prev.map(d => d.id === docId ? { ...d, selected } : d)
            );
        } catch { }
    };

    const handleDeleteDoc = async (docId: string) => {
        if (!currentSession) return;
        try {
            await api.deleteDocument(currentSession.id, docId);
            setDocuments(prev => prev.filter(d => d.id !== docId));
        } catch { }
    };

    const handleToggleWeb = async () => {
        if (!currentSession) return;
        const updated = { ...currentSession, web_mode: !currentSession.web_mode };
        setCurrentSession(updated);
        setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
    };

    const selectedDocCount = documents.filter(d => d.selected).length;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans"
        >
            <Sidebar
                sessions={sessions}
                currentId={currentSession?.id || null}
                onSelect={setCurrentSession}
                onDelete={handleDeleteSession}
                onCreate={handleCreateSession}
            />

            <ChatPanel
                session={currentSession}
                messages={messages}
                isLoading={isLoading}
                onSend={handleSend}
                onUpload={handleUpload}
                webMode={currentSession?.web_mode || false}
                onToggleWeb={handleToggleWeb}
                selectedDocCount={selectedDocCount}
            />

            <RightPanel
                sessionId={currentSession?.id || null}
                documents={documents}
                onToggleDoc={handleToggleDoc}
                onDeleteDoc={handleDeleteDoc}
                onDocsChanged={() => currentSession && loadSessionData(currentSession.id)}
            />
        </motion.div>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <AuthGate />
        </AuthProvider>
    );
}

function AuthGate() {
    const { isAuthenticated } = useAuth();

    return (
        <AnimatePresence mode="wait">
            {isAuthenticated ? (
                <Dashboard key="dashboard" />
            ) : (
                <LoginPage key="login" />
            )}
        </AnimatePresence>
    );
}
