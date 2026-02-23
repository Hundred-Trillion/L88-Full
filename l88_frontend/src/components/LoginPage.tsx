/**
 * LoginPage — Premium aesthetic. Subtle animated grid background,
 * glassmorphic card, refined typography.
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Loader2, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) return;
        setError('');
        setLoading(true);
        try {
            await login(username, password);
        } catch (err: any) {
            setError(err.message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-neutral-50 dark:bg-black transition-colors duration-500 relative overflow-hidden">

            {/* Subtle grid background */}
            <div
                className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(0,0,0,0.3) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0,0,0,0.3) 1px, transparent 1px)
                    `,
                    backgroundSize: '60px 60px',
                }}
            />

            {/* Soft radial glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-neutral-200/40 dark:bg-neutral-800/20 blur-[120px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full max-w-sm mx-4"
            >
                {/* Card */}
                <div className="bg-white/80 dark:bg-neutral-950/60 backdrop-blur-2xl border border-neutral-200/60 dark:border-neutral-800/40 rounded-3xl p-10 shadow-2xl shadow-black/5 dark:shadow-black/40">

                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-black dark:bg-white flex items-center justify-center shadow-lg shadow-black/10 dark:shadow-white/5">
                            <Shield size={24} className="text-white dark:text-black" strokeWidth={1.5} />
                        </div>
                    </div>

                    {/* Brand */}
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white">
                            Welcome to L88
                        </h1>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2 font-medium tracking-wide">
                            Private Knowledge Engine
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={submit} className="space-y-3">
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1.5 font-semibold">
                                Username
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                autoFocus
                                placeholder="Enter username"
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-black dark:focus:border-white focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 transition-all text-black dark:text-white placeholder:text-neutral-300 dark:placeholder:text-neutral-700"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1.5 font-semibold">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Enter password"
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-black dark:focus:border-white focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 transition-all text-black dark:text-white placeholder:text-neutral-300 dark:placeholder:text-neutral-700"
                            />
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-xs text-red-500 text-center font-medium bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 rounded-lg py-2"
                            >
                                {error}
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !username || !password}
                            className="w-full py-3.5 px-4 rounded-xl bg-black dark:bg-white text-white dark:text-black text-sm font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 cursor-pointer mt-2 shadow-lg shadow-black/10 dark:shadow-white/5"
                        >
                            {loading ? (
                                <Loader2 size={16} className="spinner" />
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight size={14} strokeWidth={2.5} />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <div className="text-center mt-8 space-y-2">
                    <p className="text-[10px] text-neutral-300 dark:text-neutral-700 font-medium tracking-widest uppercase">
                        100% Local · Zero Cloud · Fully Private
                    </p>
                    <div className="flex justify-center gap-1">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
