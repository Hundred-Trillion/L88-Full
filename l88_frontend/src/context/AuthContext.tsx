/**
 * Auth context — JWT + current user stored in React context.
 * Wraps the entire app. Provides login/logout, user, and role switching.
 */

import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { User } from '../types';
import { login as apiLogin, setToken, getToken } from '../services/api';

type Role = User['role'];

interface AuthState {
    user: User | null;
    token: string | null;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
    effectiveRole: Role | null;
    setEffectiveRole: (role: Role) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(() => {
        try {
            const stored = localStorage.getItem('l88_user');
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });

    const [token, setTokenState] = useState<string | null>(() => getToken());

    const [effectiveRole, setEffectiveRole] = useState<Role | null>(() => {
        try {
            const stored = localStorage.getItem('l88_user');
            return stored ? (JSON.parse(stored) as User).role : null;
        } catch {
            return null;
        }
    });

    const login = async (username: string, password: string) => {
        const data = await apiLogin(username, password);
        setTokenState(data.access_token);
        setUser(data.user);
        setEffectiveRole(data.user.role);
        localStorage.setItem('l88_user', JSON.stringify(data.user));
    };

    const logout = () => {
        setToken(null);
        setTokenState(null);
        setUser(null);
        setEffectiveRole(null);
        localStorage.removeItem('l88_user');
    };

    const value = React.useMemo(() => ({
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        effectiveRole,
        setEffectiveRole,
    }), [user, token, effectiveRole]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
