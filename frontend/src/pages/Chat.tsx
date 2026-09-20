import React, { useState, useEffect, useRef } from 'react';
import type { Persona, Conversation, Message, ModelCatalogItem, BYOKApiKeys } from '../types';
import { apiRequest } from '../lib/api';
import { getStoredApiKeys, getKeyForProvider } from '../lib/keys';
import {
  Send,
  Terminal,
  Plus,
  Bot,
  User as UserIcon,
  Loader2,
  AlertCircle,
  MessageSquare,
  Volume2,
  Image as ImageIcon,
} from 'lucide-react';

import { PromptInspectorModal } from '../components/prompt/PromptInspectorModal';
import { ModelSelectorDropdown } from '../components/chat/ModelSelectorDropdown';
import { ApiKeyModal } from '../components/chat/ApiKeyModal';
import { VoiceAgentControls, speakPersonaText, stopPersonaSpeech } from '../components/chat/VoiceAgentControls';
import { ImageGeneratorModal } from '../components/chat/ImageGeneratorModal';

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
  // Check if content has an embedded image markdown ![caption](url) or direct image URL
  const imgMatch = content.match(/!\[(.*?)\]\((https?:\/\/[^\s)]+)\)/) || content.match(/(https?:\/\/[^\s)]+(?:pollinations\.ai[^\s)]+|\.(?:png|jpg|jpeg|webp)(?:\?[^\s)]*)?))/);

  const cleanText = imgMatch ? content.replace(imgMatch[0], '').trim() : content;

  return (
    <div className="space-y-3">
      {imgMatch && (
        <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm max-w-sm bg-black/5">
          <img
            src={imgMatch[2] || imgMatch[1]}
            alt={imgMatch[1] || 'AI Generated Visual'}
            className="w-full h-auto object-cover hover:opacity-95 transition-opacity cursor-pointer"
            onClick={() => window.open(imgMatch[2] || imgMatch[1], '_blank')}
          />
        </div>
      )}

      {cleanText && (
        isUser ? (
          <div className="whitespace-pre-wrap">{cleanText}</div>
        ) : (
          <div className="space-y-2.5">
            {cleanText.split(/\n\n+/).map((para, pIdx) => {
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
        )
      )}
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
  
  // Modals & Tools
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [keyModalProvider, setKeyModalProvider] = useState<string | undefined>(undefined);

  // BYOK & Model State
  const [keys, setKeys] = useState<BYOKApiKeys>({});
  const [selectedModel, setSelectedModel] = useState<ModelCatalogItem | null>(null);
  const [autoVoiceEnabled, setAutoVoiceEnabled] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load stored keys on mount
  useEffect(() => {
    setKeys(getStoredApiKeys());
  }, []);

  const refreshKeys = () => {
    setKeys(getStoredApiKeys());
  };

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

  const handleSendMessage = async (e?: React.FormEvent, customContent?: string) => {
    if (e) e.preventDefault();
    const contentToSend = (customContent !== undefined ? customContent : inputMessage).trim();
    if (!contentToSend || sending) return;

    let targetConv = activeConversation;
    if (!targetConv && selectedPersona) {
      targetConv = await startNewConversation(selectedPersona.id, true);
    }
    if (!targetConv) return;

    if (customContent === undefined) {
      setInputMessage('');
    }
    setError(null);

    // Optimistically render user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: targetConv.id,
      role: 'user',
      content: contentToSend,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setSending(true);

    const apiKey = selectedModel ? getKeyForProvider(selectedModel.provider, keys) : undefined;

    try {
      const assistantMsg = await apiRequest<Message>(
        `/conversations/${targetConv.id}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({
            content: contentToSend,
            provider: selectedModel?.provider,
            model: selectedModel?.model,
            api_key: apiKey,
          }),
        }
      );
      setMessages((prev) => [...prev.filter((m) => m.id !== tempUserMsg.id), tempUserMsg, assistantMsg]);

      // If voice mode is active, read the persona response aloud
      if (autoVoiceEnabled) {
        speakPersonaText(assistantMsg.content);
      }
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

  const handleInsertImage = (url: string, imagePrompt: string) => {
    const formatted = `![${imagePrompt}](${url})\n\n*Generated Visual:* "${imagePrompt}"`;
    handleSendMessage(undefined, formatted);
  };

  if (loadingInitial) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center space-y-2">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs text-slate-500 font-medium">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (personas.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border border-slate-200">
        <Bot className="w-12 h-12 text-slate-400 mb-3" />
        <h2 className="text-base font-bold text-slate-800">No Personas Created Yet</h2>
        <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
          Create your first AI persona to start focused conversations with dynamic system prompts.
        </p>
        <button
          onClick={onNavigateToBuilder}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs"
        >
          Create Persona
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
      {/* Left Sidebar: Conversations & Persona Selector */}
      <div className="w-64 border-r border-slate-200 flex flex-col bg-slate-50/50 shrink-0">
        {/* Persona Selector Dropdown */}
        <div className="p-3 border-b border-slate-200 bg-white">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Active Persona
          </label>
          <select
            id="chat-persona-select"
            value={selectedPersona?.id || ''}
            onChange={(e) => {
              const p = personas.find((item) => item.id === e.target.value);
              if (p) setSelectedPersona(p);
            }}
            className="w-full text-xs font-semibold py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.role})
              </option>
            ))}
          </select>
        </div>

        {/* Conversation List Header */}
        <div className="px-3 py-2.5 flex items-center justify-between border-b border-slate-100">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider text-[11px]">
            Sessions
          </span>
          <button
            id="chat-new-session-btn"
            onClick={() => selectedPersona && startNewConversation(selectedPersona.id)}
            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-md transition-colors"
            title="Start new conversation"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map((conv) => {
            const isActive = activeConversation?.id === conv.id;
            return (
              <div
                key={conv.id}
                onClick={() => setActiveConversation(conv)}
                className={`group flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-900 font-semibold border border-indigo-200/60 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span className="truncate">{conv.title}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Chat Header */}
        <div className="h-14 border-b border-slate-200 px-5 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">{selectedPersona?.name}</h2>
              <p className="text-xs text-slate-500">{selectedPersona?.role}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Universal Model Selector Dropdown */}
            <ModelSelectorDropdown
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
              onOpenKeyModal={(provider) => {
                setKeyModalProvider(provider);
                setIsKeyModalOpen(true);
              }}
              keys={keys}
            />

            {/* Voice Agent Controls */}
            <VoiceAgentControls
              onTranscript={(transcript) => {
                setInputMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
              }}
              autoVoiceEnabled={autoVoiceEnabled}
              onToggleAutoVoice={() => {
                if (autoVoiceEnabled) stopPersonaSpeech();
                setAutoVoiceEnabled(!autoVoiceEnabled);
              }}
            />

            {/* Image Generator Tool Button */}
            <button
              type="button"
              id="chat-open-image-studio-btn"
              onClick={() => setIsImageModalOpen(true)}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl border border-purple-200/80 shadow-2xs transition-colors"
              title="Generate AI Image"
            >
              <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden sm:inline">Image</span>
            </button>

            {/* System Prompt Inspector Button */}
            <button
              id="chat-view-prompt-btn"
              onClick={() => setIsInspectorOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition-colors"
            >
              <Terminal className="w-3.5 h-3.5 text-indigo-600" />
              <span>Prompt</span>
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
              <h3 className="text-base font-bold text-slate-900">
                Chat with {selectedPersona?.name}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">
                {selectedPersona?.description || `Ready to assist you with ${selectedPersona?.role?.toLowerCase() || 'guidance and feedback'}.`}
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {[
                  "Hey! Tell me a bit about your background and how we can work together.",
                  "What's your frank take on the biggest mistake people make in your field?",
                  "Walk me through a real-world scenario you handled recently.",
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setInputMessage(prompt)}
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
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-semibold ${
                      isUser
                        ? 'bg-slate-900 text-white'
                        : 'bg-indigo-600 text-white shadow-2xs'
                    }`}
                  >
                    {isUser ? <UserIcon className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex flex-col space-y-1 max-w-[75%]">
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        isUser
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-800 border border-slate-200/80 shadow-2xs'
                      }`}
                    >
                      {renderFormattedMessage(msg.content, isUser)}
                    </div>
                    {!isUser && (
                      <div className="flex items-center space-x-2 pl-1">
                        <button
                          type="button"
                          onClick={() => speakPersonaText(msg.content)}
                          className="text-[11px] text-slate-400 hover:text-indigo-600 inline-flex items-center space-x-1"
                          title="Listen to response"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>Speak</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {sending && (
            <div className="flex items-start space-x-3">
              <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="bg-slate-100 rounded-2xl px-4 py-3 text-xs text-slate-600 border border-slate-200/80 flex items-center space-x-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>{selectedPersona?.name || 'Assistant'} is thinking...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
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
                placeholder={`Chat naturally with ${selectedPersona?.name || 'persona'}... (Shift+Enter for newline)`}
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

      {/* BYOK API Key Modal */}
      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        onKeysUpdated={refreshKeys}
        initialProvider={keyModalProvider}
      />

      {/* Image Generator Modal */}
      <ImageGeneratorModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onInsertImageIntoChat={handleInsertImage}
        keys={keys}
      />
    </div>
  );
};
