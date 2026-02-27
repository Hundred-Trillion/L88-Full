/**
 * API service — all HTTP calls to the L88 FastAPI backend.
 *
 * Every authenticated call includes the JWT bearer token.
 * Base URL uses Vite proxy (/auth, /sessions, /admin → localhost:8000).
 */

import type {
    LoginResponse, Session, Document, Message,
    ChatResponse, ScratchPad, SessionMember, SystemStatus,
    User,
} from '../types';

let token: string | null = localStorage.getItem('l88_token');

export function setToken(t: string | null) {
    token = t;
    if (t) localStorage.setItem('l88_token', t);
    else localStorage.removeItem('l88_token');
}

export function getToken() { return token; }

async function request<T>(url: string, opts: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
        ...(opts.headers as Record<string, string> || {}),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!(opts.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, { ...opts, headers });
    if (res.status === 401) {
        setToken(null);
        window.location.reload();
        throw new Error('Session expired');
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || 'Request failed');
    }
    if (res.status === 204) return undefined as T;
    return res.json();
}

/* ── Auth ─────────────────────────────────────────────────── */

/**
 * Backend returns flat fields. We transform into { access_token, user }.
 */
export async function login(username: string, password: string): Promise<{ access_token: string; user: User }> {
    const data = await request<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
    setToken(data.access_token);
    return {
        access_token: data.access_token,
        user: {
            id: data.user_id,
            username: data.username,
            role: data.role as User['role'],
            display_name: data.display_name,
        },
    };
}

/* ── Sessions ─────────────────────────────────────────────── */

export async function getSessions(): Promise<Session[]> {
    return request('/sessions');
}

export async function createSession(name: string, webMode: boolean): Promise<Session> {
    return request('/sessions', {
        method: 'POST',
        body: JSON.stringify({ name, web_mode: webMode }),
    });
}

export async function deleteSession(id: string): Promise<void> {
    return request(`/sessions/${id}`, { method: 'DELETE' });
}

export async function renameSession(id: string, name: string): Promise<Session> {
    return request(`/sessions/${id}/rename`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
    });
}

/* ── Documents ────────────────────────────────────────────── */

export async function getDocuments(sessionId: string): Promise<Document[]> {
    return request(`/sessions/${sessionId}/documents`);
}

export async function uploadDocument(sessionId: string, file: File): Promise<Document> {
    const form = new FormData();
    form.append('file', file);
    return request(`/sessions/${sessionId}/documents`, {
        method: 'POST',
        body: form,
    });
}

export async function deleteDocument(sessionId: string, docId: string): Promise<void> {
    return request(`/sessions/${sessionId}/documents/${docId}`, { method: 'DELETE' });
}

export async function toggleDocument(sessionId: string, docId: string, selected: boolean): Promise<void> {
    return request(`/sessions/${sessionId}/documents/${docId}/select`, {
        method: 'PATCH',
        body: JSON.stringify({ selected }),
    });
}

/* ── Chat ─────────────────────────────────────────────────── */

export async function getMessages(sessionId: string): Promise<Message[]> {
    return request(`/sessions/${sessionId}/messages`);
}

export async function sendMessage(sessionId: string, query: string): Promise<ChatResponse> {
    return request(`/sessions/${sessionId}/chat`, {
        method: 'POST',
        body: JSON.stringify({ query }),
    });
}

/* ── Scratchpad ───────────────────────────────────────────── */

export async function getScratchPad(sessionId: string): Promise<ScratchPad> {
    return request(`/sessions/${sessionId}/scratchpad`);
}

export async function updateScratchPad(sessionId: string, content: string): Promise<ScratchPad> {
    return request(`/sessions/${sessionId}/scratchpad`, {
        method: 'PATCH',
        body: JSON.stringify({ content }),
    });
}

/* ── Members ──────────────────────────────────────────────── */

export async function getMembers(sessionId: string): Promise<SessionMember[]> {
    return request(`/sessions/${sessionId}/members`);
}

export async function addMember(sessionId: string, username: string, role: string): Promise<{ detail: string }> {
    return request(`/sessions/${sessionId}/members`, {
        method: 'POST',
        body: JSON.stringify({ username, role }),
    });
}

export async function removeMember(sessionId: string, userId: number): Promise<{ detail: string }> {
    return request(`/sessions/${sessionId}/members/${userId}`, { method: 'DELETE' });
}

/* ── Admin / Library ──────────────────────────────────────── */

export async function getSystemStatus(): Promise<SystemStatus> {
    return request('/admin/system/status');
}

export async function getAdminUsers() {
    return request('/admin/users');
}

export async function getLibraryDocs(): Promise<Document[]> {
    return request('/admin/library');
}

export async function uploadLibraryDoc(file: File): Promise<Document> {
    const form = new FormData();
    form.append('file', file);
    return request('/admin/library', { method: 'POST', body: form });
}

export async function deleteLibraryDoc(docId: string): Promise<{ detail: string }> {
    return request(`/admin/library/${docId}`, { method: 'DELETE' });
}
