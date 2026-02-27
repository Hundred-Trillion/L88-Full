/**
 * LibraryManager — Curate the "miniature internet" (Offline Web).
 * Admin-only view to upload/delete global documents.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Plus, Trash2, ArrowLeft, Loader2, FileText, Calendar, Database } from 'lucide-react';
import { cn } from '../lib/cn';
import * as api from '../services/api';
import type { Document } from '../types';

interface Props {
    onBack: () => void;
}

export default function LibraryManager({ onBack }: Props) {
    const [docs, setDocs] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [processingQueue, setProcessingQueue] = useState<string[]>([]);
    const fileRef = useRef<HTMLInputElement>(null);

    const loadDocs = async () => {
        setLoading(true);
        try {
            const data = await api.getLibraryDocs();
            setDocs(data);
        } catch (err) {
            console.error('Failed to load library docs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDocs();
    }, []);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const fileList = Array.from(files);
        setUploading(true);
        setProcessingQueue(prev => [...prev, ...fileList.map(f => f.name)]);

        try {
            for (const file of fileList) {
                await api.uploadLibraryDoc(file);
                // Remove this specific file from queue and add it to the docs list if not already there
                setProcessingQueue(prev => prev.filter(name => name !== file.name));
                // Reloading docs after each file to show progress
                const fresh = await api.getLibraryDocs();
                setDocs(fresh);
            }
        } catch (err: any) {
            alert(`Upload failed: ${err.message}`);
        } finally {
            setUploading(false);
            setProcessingQueue([]);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const handleDelete = async (docId: string) => {
        if (!confirm('Are you sure you want to delete this document from the global library? This will rebuild the search index.')) return;
        try {
            await api.deleteLibraryDoc(docId);
            setDocs(prev => prev.filter(d => d.id !== docId));
        } catch (err: any) {
            alert(`Delete failed: ${err.message}`);
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-white dark:bg-black overflow-hidden h-full">
            {/* Header */}
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-900 flex items-center justify-between bg-neutral-50/30 dark:bg-neutral-950/30">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-full transition-colors cursor-pointer"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight text-black dark:text-white flex items-center">
                            <Globe size={20} className="mr-2 text-blue-500" />
                            Offline Web Collection
                        </h2>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Curate the global knowledge base for Paramanandha</p>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-medium hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                    >
                        {uploading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Plus size={16} className="mr-2" />}
                        Add Documents
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="animate-spin text-neutral-300" size={32} />
                        <p className="text-sm text-neutral-500">Loading collection...</p>
                    </div>
                ) : (docs.length === 0 && processingQueue.length === 0) ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-6 text-center">
                        <div className="p-6 rounded-full bg-neutral-50 dark:bg-neutral-900 text-neutral-300">
                            <Database size={48} />
                        </div>
                        <div>
                            <h3 className="text-lg font-medium text-black dark:text-white">Collection is empty</h3>
                            <p className="text-sm text-neutral-500 max-w-xs mt-2">
                                Upload PDFs, research papers, or manuals to create your miniature internet.
                            </p>
                        </div>
                        <button
                            onClick={() => fileRef.current?.click()}
                            className="text-sm text-blue-500 hover:underline font-medium cursor-pointer"
                        >
                            Upload your first file
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AnimatePresence>
                            {processingQueue.map((name, i) => (
                                <motion.div
                                    key={`processing-${name}-${i}`}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-950/10 flex items-start space-x-4 animate-pulse relative overflow-hidden"
                                >
                                    <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 shrink-0">
                                        <Loader2 size={20} className="animate-spin" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-medium truncate text-blue-700 dark:text-blue-300">
                                            {name}
                                        </h4>
                                        <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-1 font-mono uppercase tracking-widest">
                                            Parsing & Chunking...
                                        </p>
                                    </div>
                                    <div className="absolute bottom-0 left-0 h-0.5 bg-blue-500 w-full origin-left animate-progress" />
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {docs.map(doc => (
                            <motion.div
                                key={doc.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-4 rounded-2xl border border-neutral-100 dark:border-neutral-900 bg-white dark:bg-neutral-900/50 hover:border-neutral-200 dark:hover:border-neutral-800 transition-all flex items-start space-x-4 group"
                            >
                                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-500 shrink-0">
                                    <FileText size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium truncate text-black dark:text-white" title={doc.filename}>
                                        {doc.filename}
                                    </h4>
                                    <div className="flex items-center space-x-3 mt-1.5 text-[10px] text-neutral-400 font-mono">
                                        <span className="flex items-center">
                                            <Calendar size={10} className="mr-1" />
                                            {new Date(doc.uploaded_at).toLocaleDateString()}
                                        </span>
                                        <span>•</span>
                                        <span>{doc.page_count} pages</span>
                                        <span>•</span>
                                        <span>{doc.chunk_count} chunks</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(doc.id)}
                                    className="p-2 text-neutral-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            <input
                type="file"
                ref={fileRef}
                className="hidden"
                multiple
                accept=".pdf"
                onChange={handleUpload}
            />
        </div>
    );
}
