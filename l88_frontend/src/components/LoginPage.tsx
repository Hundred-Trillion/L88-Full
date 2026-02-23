/**
 * LoginPage — Noctis v1 Entry Portal.
 * Minimalist, high-contrast, security-first aesthetic.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, ArrowRight, Lock, User, Command } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/cn';

export default function LoginPage() {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const success = await login(username, password);
            if (!success) setError('Credential rejection.');
        } catch {
            setError('System synchronization failed.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black overflow-hidden font-sans">
            {/* Branding background indicator */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none p-10">
                <span className="text-[20vw] font-black uppercase tracking-[0.2em]">L88</span>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm px-10 relative z-10"
            >
                {/* Branding */}
                <div className="flex flex-col items-center mb-16 space-y-4">
                    <div className="w-12 h-12 bg-white rounded flex items-center justify-center">
                        <span className="text-black font-black text-xl">L</span>
                    </div>
                    <div>
                        <h1 className="text-sm font-black tracking-[0.6em] text-white uppercase text-center leading-none">L88</h1>
                        <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest text-center mt-2">Noctis v0.1</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-4">
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="IDENTIFIER"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-transparent border-b border-zinc-900 py-3 text-[11px] font-black uppercase tracking-widest text-white outline-none focus:border-white transition-all placeholder:text-zinc-800"
                            />
                            <User size={12} className="absolute right-0 top-3 text-zinc-800 group-focus-within:text-white transition-colors" />
                        </div>

                        <div className="relative group">
                            <input
                                type="password"
                                placeholder="ACCESS KEY"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-transparent border-b border-zinc-900 py-3 text-[11px] font-black uppercase tracking-widest text-white outline-none focus:border-white transition-all placeholder:text-zinc-800"
                            />
                            <Lock size={12} className="absolute right-0 top-3 text-zinc-800 group-focus-within:text-white transition-colors" />
                        </div>
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, x: -4 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center space-x-2 text-red-500"
                            >
                                <Shield size={10} />
                                <span className="text-[9px] font-black uppercase tracking-widest">{error}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={cn(
                            "w-full py-4 bg-white text-black rounded text-[10px] font-black uppercase tracking-[0.4em] transition-all flex items-center justify-center space-x-3",
                            isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-zinc-200"
                        )}
                    >
                        <span>Authorize</span>
                        <Command size={14} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </form>

                <div className="mt-20 flex flex-col items-center space-y-1 text-zinc-800">
                    <span className="text-[8px] font-black uppercase tracking-widest">End-to-End Local Intelligence</span>
                    <div className="h-4 w-px bg-zinc-900" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Station: RTX 4000</span>
                </div>
            </motion.div>
        </div>
    );
}
