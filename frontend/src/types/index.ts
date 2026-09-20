export interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Persona {
  id: string;
  user_id: string;
  name: string;
  role: string;
  description: string;
  objective: string;
  personality: string[];
  tone: string;
  expertise: string[];
  rules: string[];
  restrictions: string[];
  response_preferences: string[];
  created_at: string;
  updated_at: string;
  conversation_count: number;
  current_version: number;
  system_prompt?: string;
}

export interface PromptVersion {
  id: string;
  persona_id: string;
  version: number;
  system_prompt: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  persona_id: string;
  persona_name?: string;
  persona_role?: string;
  title: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface Evaluation {
  id: string;
  user_id: string;
  persona_id: string;
  test_case: string;
  response: string;
  instruction_adherence: number;
  persona_consistency: number;
  tone_consistency: number;
  relevance: number;
  preference_compliance: number;
  feedback: string;
  created_at: string;
}

export interface OllamaModel {
  name: string;
  size: number;
  modified_at?: string;
}

export interface ModelStatus {
  active_provider: 'ollama' | 'local_openai' | 'builtin_local' | 'gemini';
  active_model: string;
  active_host: string;
  ollama: {
    connected: boolean;
    version: string;
    host: string;
    models: OllamaModel[];
  };
  builtin_local: {
    available: boolean;
    description: string;
  };
  gemini: {
    configured: boolean;
  };
}

export interface PopularModel {
  name: string;
  label: string;
  size: string;
  description: string;
  recommended: boolean;
}

