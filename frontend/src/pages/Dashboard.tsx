import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { Persona } from '../types';
import { apiRequest } from '../lib/api';
import { Plus, Bot, MessageSquare, ArrowRight, Clock, Loader2, Sparkles, Terminal } from 'lucide-react';
import { PromptInspectorModal } from '../components/prompt/PromptInspectorModal';

interface DashboardProps {
  onNavigate: (tab: string, extraId?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [inspectorPersona, setInspectorPersona] = useState<Persona | null>(null);

  useEffect(() => {
    apiRequest<Persona[]>('/personas')
      .then(setPersonas)
      .catch((err) => console.error('Failed to load personas', err))
      .finally(() => setLoading(false));
  }, []);

  const firstName = user?.name ? user.name.split(' ')[0] : 'there';

  const formatLastUpdated = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Persona engineering & system prompt compiler
          </p>
        </div>
        <button
          id="dashboard-create-persona-btn"
          onClick={() => onNavigate('persona-builder')}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Persona</span>
        </button>
      </div>

      {/* Your Personas Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">
            Your Personas
          </h2>
          {personas.length > 0 && (
            <button
              onClick={() => onNavigate('personas')}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center space-x-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-slate-200">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="ml-2 text-sm text-slate-500">Loading your personas...</span>
          </div>
        ) : personas.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              No personas yet
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-5">
              Create your first custom AI persona to get started.
            </p>
            <button
              id="empty-create-persona-btn"
              onClick={() => onNavigate('persona-builder')}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Persona</span>
            </button>
          </div>
        ) : (
          /* Persona Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {personas.map((persona) => (
              <div
                key={persona.id}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-base">
                        {persona.name}
                      </h3>
                      <p className="text-xs font-medium text-indigo-600">
                        {persona.role}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                      v{persona.current_version}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">
                    {persona.description || persona.objective || 'No description provided.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center space-x-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                      <span>{persona.conversation_count} chats</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatLastUpdated(persona.updated_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      onClick={() => onNavigate('chat', persona.id)}
                      className="flex-1 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg text-center transition-colors flex items-center justify-center space-x-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat</span>
                    </button>
                    <button
                      onClick={() => setInspectorPersona(persona)}
                      title="Inspect compiled system prompt"
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors border border-slate-200"
                    >
                      <Terminal className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onNavigate('evaluations', persona.id)}
                      title="Run evaluation tests"
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-indigo-600 rounded-lg transition-colors border border-slate-200"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prompt Inspector Modal */}
      {inspectorPersona && (
        <PromptInspectorModal
          personaId={inspectorPersona.id}
          personaName={inspectorPersona.name}
          currentPrompt={inspectorPersona.system_prompt}
          currentVersion={inspectorPersona.current_version}
          isOpen={!!inspectorPersona}
          onClose={() => setInspectorPersona(null)}
        />
      )}
    </div>
  );
};
