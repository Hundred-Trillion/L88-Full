/* ── Domain types matching L88 backend models ── */

export interface User {
    id: number;
    username: string;
    role: 'owner' | 'admin' | 'chat' | 'read_only';
    display_name: string;
    active: boolean;
}

export interface Session {
    id: string;
    name: string;
    session_type: 'chat' | 'rag' | 'hybrid';
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

export interface Citation {
    id: string;
    message_id: string;
    doc_filename: string;
    page: number;
    chunk_text: string;
    score: number;
}

export interface Message {
    id: string;
    session_id: string;
    role: 'user' | 'assistant';
    content: string;
    confident: boolean;
    reasoning: string | null;
    created_at: string;
    citations?: Citation[];
}

export interface SessionMember {
    id: number;
    session_id: string;
    user_id: number;
    role: string;
    username?: string;
    display_name?: string;
}

export interface ScratchPad {
    id: number;
    session_id: string;
    content: string;
    last_edited_by: number;
    updated_at: string;
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
    user: User;
}

export interface ChatResponse {
    answer: string;
    sources: string[];
    confident: boolean;
    reasoning: string;
    citations: Citation[];
}

export interface SystemStatus {
    ollama_reachable: boolean;
    gpu_model: string;
    cpu_model: string;
    db_tables: number;
    sessions_count: number;
    users_count: number;
}
