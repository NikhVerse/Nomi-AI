import React, { useState, useEffect } from 'react';
import type { Persona } from '../types';
import { apiRequest } from '../lib/api';
import {
  Plus,
  Search,
  Bot,
  MessageSquare,
  Edit2,
  Trash2,
  Terminal,
  Clock,
  Loader2,
  Sparkles
} from 'lucide-react';
import { PromptInspectorModal } from '../components/prompt/PromptInspectorModal';

interface PersonasProps {
  onNavigate: (tab: string, extraId?: string) => void;
  onEditPersona: (persona: Persona) => void;
}

export const Personas: React.FC<PersonasProps> = ({ onNavigate, onEditPersona }) => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [inspectorPersona, setInspectorPersona] = useState<Persona | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadPersonas = () => {
    setLoading(true);
    apiRequest<Persona[]>('/personas')
      .then(setPersonas)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPersonas();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete persona "${name}"? This action cannot be undone.`)) {
      return;
    }
    setDeletingId(id);
    try {
      await apiRequest(`/personas/${id}`, { method: 'DELETE' });
      setPersonas((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete persona');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = personas.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.role.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Personas
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Create, configure, and inspect custom AI personas and their system instructions.
          </p>
        </div>
        <button
          id="personas-create-btn"
          onClick={() => onNavigate('persona-builder')}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Persona</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search personas by name, role, or keywords..."
          className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
        />
      </div>

      {/* Personas List / Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <span className="ml-2 text-sm text-slate-500">Loading personas...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <Bot className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">
            {search ? 'No matching personas found' : 'No personas yet'}
          </h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-5">
            {search
              ? 'Try modifying your search criteria.'
              : 'Create your first persona and configure its custom system prompt.'}
          </p>
          {!search && (
            <button
              onClick={() => onNavigate('persona-builder')}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Persona</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((persona) => (
            <div
              key={persona.id}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-base">{persona.name}</h3>
                    <p className="text-xs font-medium text-indigo-600">{persona.role}</p>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                    v{persona.current_version}
                  </span>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">
                  {persona.description || persona.objective || 'No description provided.'}
                </p>

                {/* Tone and traits */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">
                    Tone: {persona.tone}
                  </span>
                  {persona.expertise?.slice(0, 2).map((exp) => (
                    <span
                      key={exp}
                      className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md"
                    >
                      {exp}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center space-x-1">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span>{persona.conversation_count} chats</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{new Date(persona.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onNavigate('chat', persona.id)}
                    className="flex-1 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg text-center transition-colors"
                  >
                    Chat
                  </button>
                  <button
                    onClick={() => setInspectorPersona(persona)}
                    title="View System Prompt"
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors border border-slate-200"
                  >
                    <Terminal className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onNavigate('evaluations', persona.id)}
                    title="Run Evaluations"
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-indigo-600 rounded-lg transition-colors border border-slate-200"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEditPersona(persona)}
                    title="Edit Persona"
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors border border-slate-200"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(persona.id, persona.name)}
                    disabled={deletingId === persona.id}
                    title="Delete Persona"
                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors border border-rose-200 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
