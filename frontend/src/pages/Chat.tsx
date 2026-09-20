import React, { useState, useEffect, useRef } from 'react';
import type { Persona, Conversation, Message } from '../types';
import { apiRequest } from '../lib/api';
import {
  Send,
  Terminal,
  Plus,
  Trash2,
  Edit2,
  Bot,
  User as UserIcon,
  Loader2,
  AlertCircle,
  MessageSquare,
  Cpu
} from 'lucide-react';

import { PromptInspectorModal } from '../components/prompt/PromptInspectorModal';

const renderInlineFormattedText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-200/80 text-indigo-700 font-mono text-xs">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={index} className="italic text-slate-700">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
};

const renderFormattedMessage = (content: string, isUser: boolean) => {
  if (isUser) {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  const paragraphs = content.split(/\n\n+/);
  return (
    <div className="space-y-2.5">
      {paragraphs.map((para, pIdx) => {
        const lines = para.split('\n');

        const isBulletList = lines.every((line) => line.trim().startsWith('- ') || line.trim().startsWith('* '));
        if (isBulletList && lines.length > 0) {
          return (
            <ul key={pIdx} className="space-y-1.5 my-1 list-disc list-inside">
              {lines.map((l, lIdx) => (
                <li key={lIdx} className="text-slate-800">
                  {renderInlineFormattedText(l.replace(/^[-*]\s+/, ''))}
                </li>
              ))}
            </ul>
          );
        }

        const isNumberedList = lines.every((line) => /^\d+\.\s+/.test(line.trim()));
        if (isNumberedList && lines.length > 0) {
          return (
            <ol key={pIdx} className="space-y-1.5 my-1 list-decimal list-inside">
              {lines.map((l, lIdx) => (
                <li key={lIdx} className="text-slate-800">
                  {renderInlineFormattedText(l.replace(/^\d+\.\s+/, ''))}
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={pIdx} className="leading-relaxed">
            {lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {renderInlineFormattedText(line)}
                {lIdx < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
};

interface ChatProps {
  initialPersonaId?: string;
  onNavigateToBuilder: () => void;
}

export const Chat: React.FC<ChatProps> = ({ initialPersonaId, onNavigateToBuilder }) => {

  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [activeModelInfo, setActiveModelInfo] = useState<{ provider: string; model: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load active local model info
  useEffect(() => {
    apiRequest<any>('/models/status')
      .then((status) => {
        setActiveModelInfo({ provider: status.active_provider, model: status.active_model });
      })
      .catch(() => {});
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Load personas
  useEffect(() => {
    apiRequest<Persona[]>('/personas')
      .then((data) => {
        setPersonas(data);
        if (data.length > 0) {
          const matched = initialPersonaId
            ? data.find((p) => p.id === initialPersonaId) || data[0]
            : data[0];
          setSelectedPersona(matched);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingInitial(false));
  }, [initialPersonaId]);

  // Load conversations when selected persona changes
  useEffect(() => {
    if (!selectedPersona) return;
    loadConversations(selectedPersona.id);
  }, [selectedPersona]);

  const loadConversations = async (personaId: string) => {
    try {
      const convs = await apiRequest<Conversation[]>(`/conversations?persona_id=${personaId}`);
      setConversations(convs);
      if (convs.length > 0) {
        setActiveConversation(convs[0]);
      } else {
        // Start a default conversation if none exist
        startNewConversation(personaId, false);
      }
    } catch (err) {
      console.error('Failed to load conversations', err);
    }
  };

  const startNewConversation = async (personaId: string, setActive = true): Promise<Conversation | null> => {
    try {
      const newConv = await apiRequest<Conversation>('/conversations', {
        method: 'POST',
        body: JSON.stringify({
          persona_id: personaId,
          title: `Chat with ${selectedPersona?.name || 'Persona'}`,
        }),
      });
      setConversations((prev) => [newConv, ...prev]);
      if (setActive) {
        setActiveConversation(newConv);
        setMessages([]);
      }
      return newConv;
    } catch (err: any) {
      setError(err.message || 'Could not start new conversation');
      return null;
    }
  };

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    setError(null);
    apiRequest<Message[]>(`/conversations/${activeConversation.id}/messages`)
      .then(setMessages)
      .catch((err: any) => setError(err.message || 'Failed to load messages'))
      .finally(() => setLoadingMessages(false));
  }, [activeConversation]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || sending) return;

    let targetConv = activeConversation;
    if (!targetConv && selectedPersona) {
      targetConv = await startNewConversation(selectedPersona.id, true);
    }
    if (!targetConv) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    setError(null);

    // Optimistically render user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: targetConv.id,
      role: 'user',
      content: userText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setSending(true);

    try {
      const assistantMsg = await apiRequest<Message>(
        `/conversations/${targetConv.id}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ content: userText }),
        }
      );
      setMessages((prev) => [...prev.filter((m) => m.id !== tempUserMsg.id), tempUserMsg, assistantMsg]);
    } catch (err: any) {
      setError(err.message || "We couldn't generate a response. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleDeleteConversation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this conversation?')) return;
    try {
      await apiRequest(`/conversations/${id}`, { method: 'DELETE' });
      const updated = conversations.filter((c) => c.id !== id);
      setConversations(updated);
      if (activeConversation?.id === id) {
        setActiveConversation(updated.length > 0 ? updated[0] : null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete conversation');
    }
  };

  const handleRenameConversation = async (id: string, currentTitle: string) => {
    const newTitle = prompt('Enter new conversation title:', currentTitle);
    if (!newTitle || !newTitle.trim() || newTitle === currentTitle) return;
    try {
      const updated = await apiRequest<Conversation>(`/conversations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      setConversations((prev) => prev.map((c) => (c.id === id ? updated : c)));
      if (activeConversation?.id === id) {
        setActiveConversation(updated);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to rename conversation');
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (personas.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center max-w-lg mx-auto mt-12">
        <Bot className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h2 className="text-base font-semibold text-slate-900 mb-1">No Personas Available</h2>
        <p className="text-sm text-slate-500 mb-5">
          You need to create at least one AI persona before starting a conversation.
        </p>
        <button
          onClick={onNavigateToBuilder}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg"
        >
          <Plus className="w-4 h-4" />
          <span>Create Persona</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-6.5rem)] bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Left Chat Sidebar (Conversations List) */}
      <div className="w-72 border-r border-slate-200 flex flex-col bg-slate-50/70 shrink-0">
        {/* Persona Selector Dropdown */}
        <div className="p-3 border-b border-slate-200">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Active Persona
          </label>
          <select
            id="chat-persona-select"
            value={selectedPersona?.id || ''}
            onChange={(e) => {
              const p = personas.find((item) => item.id === e.target.value);
              if (p) setSelectedPersona(p);
            }}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.role})
              </option>
            ))}
          </select>
        </div>

        {/* New Chat Button */}
        <div className="p-3 border-b border-slate-100">
          <button
            id="new-chat-btn"
            onClick={() => selectedPersona && startNewConversation(selectedPersona.id, true)}
            className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-6">No chats yet</p>
          ) : (
            conversations.map((conv) => {
              const isActive = activeConversation?.id === conv.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConversation(conv)}
                  className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-900 font-semibold border border-indigo-200/60'
                      : 'text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate flex-1 min-w-0">
                    <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className="truncate">{conv.title}</span>
                  </div>
                  <div className="hidden group-hover:flex items-center space-x-1 shrink-0 ml-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRenameConversation(conv.id, conv.title);
                      }}
                      className="p-1 hover:text-slate-900 text-slate-400"
                      title="Rename"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(conv.id);
                      }}
                      className="p-1 hover:text-rose-600 text-slate-400"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Chat Header */}
        <div className="h-14 border-b border-slate-200 px-6 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">{selectedPersona?.name}</h2>
              <p className="text-xs text-slate-500">{selectedPersona?.role}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {activeModelInfo && (
              <span
                className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                  activeModelInfo.provider === 'ollama'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}
                title="Free & Local Model Engine (No API key required)"
              >
                <Cpu className="w-3 h-3" />
                <span>{activeModelInfo.provider === 'ollama' ? `Local Ollama (${activeModelInfo.model})` : 'Offline Engine'}</span>
              </span>
            )}
            <button
              id="chat-view-prompt-btn"
              onClick={() => setIsInspectorOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors"
            >
              <Terminal className="w-3.5 h-3.5 text-indigo-600" />
              <span>System Prompt</span>
            </button>
          </div>
        </div>

        {/* Message stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600 mb-3 shadow-2xs">
                <Bot className="w-6 h-6 stroke-[1.5]" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">
                Chat with {selectedPersona?.name}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">
                {selectedPersona?.description || `Ready to assist you with ${selectedPersona?.role?.toLowerCase() || 'guidance and feedback'}.`}
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {[
                  "Introduce yourself and what you do",
                  "What's your advice for writing clean, scalable code?",
                  "Help me brainstorm an approach for a new feature",
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInputMessage(prompt);
                    }}
                    className="text-xs px-3 py-1.5 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-slate-600 border border-slate-200 transition-colors text-left"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold ${
                      isUser
                        ? 'bg-slate-900 text-white'
                        : 'bg-indigo-600 text-white shadow-2xs'
                    }`}
                  >
                    {isUser ? <UserIcon className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>
                  <div
                    className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                      isUser
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-800 border border-slate-200/80'
                    }`}
                  >
                    {renderFormattedMessage(msg.content, isUser)}
                  </div>
                </div>
              );
            })
          )}

          {sending && (
            <div className="flex items-start space-x-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="bg-slate-100 rounded-xl px-4 py-2.5 text-xs text-slate-600 border border-slate-200/80 flex items-center space-x-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>{selectedPersona?.name || 'Assistant'} is typing...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-slate-200 bg-white shrink-0">
          <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
            <div className="flex-1 relative">
              <textarea
                id="chat-message-input"
                rows={1}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask ${selectedPersona?.name || 'persona'} anything...`}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none max-h-32 transition-colors"
              />
            </div>
            <button
              type="submit"
              id="chat-send-btn"
              disabled={!inputMessage.trim() || sending}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-2xs disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>

      {/* System Prompt Inspector Modal */}
      {selectedPersona && (
        <PromptInspectorModal
          personaId={selectedPersona.id}
          personaName={selectedPersona.name}
          currentPrompt={selectedPersona.system_prompt}
          currentVersion={selectedPersona.current_version}
          isOpen={isInspectorOpen}
          onClose={() => setIsInspectorOpen(false)}
        />
      )}
    </div>
  );
};
