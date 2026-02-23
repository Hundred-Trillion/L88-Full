/**
 * Auth context — stores JWT + current user in React context.
 *
 * Wraps the entire app. Provides login/logout + current user to all children.
 */

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { login as apiLogin, setToken, getToken } from '../services/api';

interface AuthState {
    user: User | null;
    token: string | null;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within an AuthProvider");
    return context;
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

    const login = async (username: string, password: string) => {
        const data = await apiLogin(username, password);
        setTokenState(data.access_token);
        setUser(data.user);
        localStorage.setItem('l88_user', JSON.stringify(data.user));
    };

    const logout = () => {
        setToken(null);
        setTokenState(null);
        setUser(null);
        localStorage.removeItem('l88_user');
    };

    const value = React.useMemo(() => ({
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token
    }), [user, token]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
