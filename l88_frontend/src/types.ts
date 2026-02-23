/* ── Domain types — aligned to L88 backend API contracts ── */

export interface User {
    id: number;
    username: string;
    role: 'owner' | 'admin' | 'chat' | 'read_only';
    display_name: string;
    active?: boolean;
}

export interface Session {
    id: string;
    name: string;
    session_type: 'chat' | 'rag' | 'hybrid' | 'general';
    web_mode: boolean;
    owner_id: number;
    created_at: string;
}

export interface Document {
    id: string;
    session_id: string;
    filename: string;
    page_count: number;
    chunk_count: number;
    selected: boolean;
    uploaded_at: string;
}

/** Matches the shape returned by both POST /chat and GET /messages */
export interface Source {
    filename: string;
    page: number;
    excerpt: string;
    doc_id?: string;
}

export interface Message {
    id: string;
    session_id?: string;
    role: 'user' | 'assistant';
    content: string;
    confident?: boolean;
    reasoning?: string | null;
    context_verdict?: string | null;
    missing_info?: string | null;
    created_at: string;
    sources?: Source[];
}

export interface SessionMember {
    user_id: number;
    username: string;
    display_name: string;
    role: string;
}

export interface ScratchPad {
    id: number;
    session_id: string;
    content: string;
    updated_by?: number;
    updated_at: string;
}

/**
 * Backend returns flat fields, NOT a nested `user` object.
 * See: auth.py LoginResponse
 */
export interface LoginResponse {
    access_token: string;
    token_type: string;
    user_id: number;
    username: string;
    role: string;
    display_name: string;
}

/** POST /sessions/{id}/chat response */
export interface ChatResponse {
    message_id: string;
    answer: string;
    reasoning: string;
    sources: Source[];
    confident: boolean;
    context_verdict: string;
    verdict: string;
    missing_info: string;
}

export interface SystemStatus {
    ollama_reachable: boolean;
    gpu_model: string;
    cpu_model: string;
    db_tables: number;
    sessions_count: number;
    users_count: number;
}
