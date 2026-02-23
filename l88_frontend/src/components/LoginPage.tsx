/**
 * Login page — minimalist fullscreen login form with glassmorphism.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, User, Lock, Sparkles, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(username, password);
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-mesh">
            {/* Decorative background elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500 opacity-20 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500 opacity-20 blur-[120px] rounded-full animate-pulse" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                className="relative z-10 w-full max-w-[440px] px-6"
            >
                <div className="glass rounded-[40px] p-10 md:p-12 shadow-2xl overflow-hidden group">
                    <div className="relative z-20">
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex flex-col items-center mb-10"
                        >
                            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-2xl flex items-center justify-center shadow-lg mb-6 transform rotate-12 group-hover:rotate-0 transition-transform duration-500">
                                <Sparkles className="text-white w-8 h-8" />
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Welcome</h1>
                            <p className="text-slate-500 font-medium">L88 Scientific Intelligence</p>
                        </motion.div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                                className="space-y-2"
                            >
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Username</label>
                                <div className="relative group/input">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-indigo-600 transition-colors">
                                        <User size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full bg-white/50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-slate-900"
                                        placeholder="Username"
                                        required
                                        autoFocus
                                    />
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 }}
                                className="space-y-2"
                            >
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Password</label>
                                <div className="relative group/input">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-indigo-600 transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-white/50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-slate-900"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </motion.div>

                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="text-red-500 text-xs font-semibold bg-red-50 p-3 rounded-xl border border-red-100 text-center"
                                    >
                                        {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <motion.button
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                whileHover={{ scale: 1.02, translateY: -2 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={loading || !username || !password}
                                className="w-full bg-slate-950 text-white rounded-2xl py-4 font-bold shadow-xl shadow-slate-200 flex items-center justify-center space-x-2 hover:bg-slate-900 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>Sign In</span>
                                        <ChevronRight size={18} />
                                    </>
                                )}
                            </motion.button>
                        </form>

                        <div className="mt-8 text-center">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                                Agentic RAG Platform • v2.0
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Bottom branding */}
            <div className="absolute bottom-8 text-slate-400 text-[10px] font-bold tracking-[0.3em] uppercase opacity-50">
                Science • Intelligence • Discovery
            </div>
        </div>
    );
}
