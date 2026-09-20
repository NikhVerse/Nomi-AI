import React, { useState, useEffect, useRef } from 'react';
import type { Persona, Conversation, Message, ModelCatalogItem, BYOKApiKeys } from '../types';
import { apiRequest } from '../lib/api';
import { getStoredApiKeys, getKeyForProvider } from '../lib/keys';
import {
  ArrowUp,
  Plus,
  Bot,
  Loader2,
  AlertCircle,
  MessageSquare,
  Volume2,
  VolumeX,
  Mic,
  Image as ImageIcon,
  Copy,
  Check,
  PanelLeft,
  PanelLeftClose,
  SquarePen,
  Terminal,
  Sparkles,
} from 'lucide-react';

import { PromptInspectorModal } from '../components/prompt/PromptInspectorModal';
import { ModelSelectorDropdown } from '../components/chat/ModelSelectorDropdown';
import { ApiKeyModal } from '../components/chat/ApiKeyModal';
import { speakPersonaText, stopPersonaSpeech } from '../components/chat/VoiceAgentControls';
import { ImageGeneratorModal } from '../components/chat/ImageGeneratorModal';

// --- Code Block Component with Copy Code Button (ChatGPT style) ---
interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl overflow-hidden my-3 border border-neutral-800 bg-[#1e1e1e] text-neutral-100 font-mono text-xs shadow-md">
      <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] text-neutral-400 text-xs border-b border-neutral-800 select-none">
        <span className="font-semibold text-neutral-300 lowercase">{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center space-x-1.5 text-neutral-300 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-sans">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="font-sans">Copy code</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto text-[13px] leading-relaxed text-neutral-200">
        <pre className="font-mono">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

// --- Inline Formatting ---
const renderInlineFormattedText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-neutral-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="px-1.5 py-0.5 mx-0.5 rounded bg-neutral-200/80 text-neutral-900 font-mono text-xs">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={index} className="italic text-neutral-700">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
};

// --- Full Message Content Renderer (Markdown + Code Blocks + Images) ---
const renderMessageContent = (content: string, isUser: boolean) => {
  if (isUser) {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  // Check for embedded image
  const imgMatch =
    content.match(/!\[(.*?)\]\((https?:\/\/[^\s)]+)\)/) ||
    content.match(/(https?:\/\/[^\s)]+(?:pollinations\.ai[^\s)]+|\.(?:png|jpg|jpeg|webp)(?:\?[^\s)]*)?))/);

  const cleanContent = imgMatch ? content.replace(imgMatch[0], '').trim() : content;

  // Split message by code blocks: ```lang ... ```
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(cleanContent)) !== null) {
    // Text before the code block
    if (match.index > lastIndex) {
      const textChunk = cleanContent.substring(lastIndex, match.index);
      elements.push(
        <div key={`text-${lastIndex}`} className="space-y-2.5">
          {renderTextParagraphs(textChunk)}
        </div>
      );
    }

    // The code block itself
    const language = match[1] || 'text';
    const code = match[2].trim();
    elements.push(<CodeBlock key={`code-${match.index}`} language={language} code={code} />);

    lastIndex = match.index + match[0].length;
  }

  // Remaining text chunk after last code block
  if (lastIndex < cleanContent.length) {
    const textChunk = cleanContent.substring(lastIndex);
    elements.push(
      <div key={`text-${lastIndex}`} className="space-y-2.5">
        {renderTextParagraphs(textChunk)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {imgMatch && (
        <div className="rounded-2xl overflow-hidden border border-neutral-200 shadow-sm max-w-sm bg-black/5 my-2">
          <img
            src={imgMatch[2] || imgMatch[1]}
            alt={imgMatch[1] || 'AI Generated Visual'}
            className="w-full h-auto object-cover hover:opacity-95 transition-opacity cursor-pointer"
            onClick={() => window.open(imgMatch[2] || imgMatch[1], '_blank')}
          />
        </div>
      )}
      {elements}
    </div>
  );
};

const renderTextParagraphs = (text: string) => {
  return text.split(/\n\n+/).map((para, pIdx) => {
    const lines = para.split('\n');

    const isBulletList = lines.every((line) => line.trim().startsWith('- ') || line.trim().startsWith('* '));
    if (isBulletList && lines.length > 0) {
      return (
        <ul key={pIdx} className="space-y-1.5 my-2 list-disc list-inside">
          {lines.map((l, lIdx) => (
            <li key={lIdx} className="text-neutral-800 leading-relaxed">
              {renderInlineFormattedText(l.replace(/^[-*]\s+/, ''))}
            </li>
          ))}
        </ul>
      );
    }

    const isNumberedList = lines.every((line) => /^\d+\.\s+/.test(line.trim()));
    if (isNumberedList && lines.length > 0) {
      return (
        <ol key={pIdx} className="space-y-1.5 my-2 list-decimal list-inside">
          {lines.map((l, lIdx) => (
            <li key={lIdx} className="text-neutral-800 leading-relaxed">
              {renderInlineFormattedText(l.replace(/^\d+\.\s+/, ''))}
            </li>
          ))}
        </ol>
      );
    }

    return (
      <p key={pIdx} className="leading-7 text-neutral-800 text-[15px]">
        {lines.map((line, lIdx) => (
          <React.Fragment key={lIdx}>
            {renderInlineFormattedText(line)}
            {lIdx < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </p>
    );
  });
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

  // ChatGPT Sidebar Toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Modals & Tools
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [keyModalProvider, setKeyModalProvider] = useState<string | undefined>(undefined);

  // BYOK & Model State
  const [keys, setKeys] = useState<BYOKApiKeys>({});
  const [selectedModel, setSelectedModel] = useState<ModelCatalogItem | null>(null);
  const [autoVoiceEnabled, setAutoVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Load stored keys on mount
  useEffect(() => {
    setKeys(getStoredApiKeys());
  }, []);

  const refreshKeys = () => {
    setKeys(getStoredApiKeys());
  };

  // Auto-scroll messages only when messages exist
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, sending]);

  // Auto-resize input textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputMessage]);

  // Initialize Speech Recognition for microphone
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          if (currentTranscript.trim()) {
            setInputMessage((prev) => (prev ? `${prev} ${currentTranscript}` : currentTranscript));
          }
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognitionRef.current = recognition;
      } catch (e) {
        console.warn('SpeechRecognition initialization error', e);
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error('Failed to start speech recognition', e);
      }
    }
  };

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

      // If auto-voice mode is active, read the persona response aloud
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

  const copyMessageText = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  if (loadingInitial) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-800" />
          <p className="text-xs text-neutral-500 font-medium tracking-tight">Starting ChatGPT workspace...</p>
        </div>
      </div>
    );
  }

  if (personas.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white">
        <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-800 mb-4 shadow-sm">
          <Bot className="w-7 h-7 stroke-[1.5]" />
        </div>
        <h2 className="text-lg font-bold text-neutral-900 tracking-tight">No Personas Created Yet</h2>
        <p className="text-sm text-neutral-500 max-w-sm mt-1.5 mb-6 leading-relaxed">
          Create your first AI persona to start focused conversations with dynamic system prompts and multi-model routing.
        </p>
        <button
          onClick={onNavigateToBuilder}
          className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-semibold rounded-2xl shadow-sm transition-all"
        >
          Create Persona
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-white text-neutral-900 overflow-hidden font-sans">
      {/* ChatGPT Left Sidebar: Sessions & Persona Picker */}
      <div
        className={`border-r border-neutral-200/80 bg-[#f9f9f9] flex flex-col shrink-0 transition-all duration-200 ease-in-out ${
          isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full overflow-hidden'
        }`}
      >
        {/* Sidebar Top: New Chat & Persona Picker */}
        <div className="p-3 border-b border-neutral-200/60 space-y-2">
          {/* New Chat Button */}
          <button
            id="chat-new-session-btn"
            onClick={() => selectedPersona && startNewConversation(selectedPersona.id)}
            className="w-full flex items-center justify-between px-3 py-2 bg-white hover:bg-neutral-100 border border-neutral-200/80 rounded-xl text-xs font-semibold text-neutral-800 shadow-2xs transition-all"
          >
            <div className="flex items-center space-x-2">
              <SquarePen className="w-4 h-4 text-neutral-600" />
              <span>New chat</span>
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">⌘N</span>
          </button>

          {/* Persona Switcher Dropdown */}
          <div className="pt-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1 px-0.5">
              Active Persona
            </label>
            <select
              id="chat-persona-select"
              value={selectedPersona?.id || ''}
              onChange={(e) => {
                const p = personas.find((item) => item.id === e.target.value);
                if (p) setSelectedPersona(p);
              }}
              className="w-full text-xs font-medium py-1.5 px-2 bg-white border border-neutral-200/80 rounded-lg text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-400"
            >
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <div className="px-2 py-1.5 text-[11px] font-medium text-neutral-400 tracking-wider uppercase">
            Recent Chats
          </div>
          {conversations.map((conv) => {
            const isActive = activeConversation?.id === conv.id;
            return (
              <div
                key={conv.id}
                onClick={() => setActiveConversation(conv)}
                className={`group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-neutral-200/70 text-neutral-900 font-semibold'
                    : 'text-neutral-600 hover:bg-neutral-200/40 hover:text-neutral-900'
                }`}
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-neutral-900' : 'text-neutral-400'}`} />
                  <span className="truncate">{conv.title}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer: System Prompt Inspector */}
        <div className="p-3 border-t border-neutral-200/60">
          <button
            id="chat-view-prompt-btn"
            onClick={() => setIsInspectorOpen(true)}
            className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-200/50 rounded-xl transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-neutral-500" />
            <span className="truncate">System Prompt ({selectedPersona?.name})</span>
          </button>
        </div>
      </div>

      {/* Main Chat Canvas */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
        {/* ChatGPT Minimalist Top Header */}
        <header className="h-14 border-b border-neutral-200/70 bg-white/90 backdrop-blur-md px-4 flex items-center justify-between shrink-0 sticky top-0 z-20">
          <div className="flex items-center space-x-2">
            {/* Sidebar toggle button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors"
              title={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              aria-label="Toggle sidebar"
            >
              {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
            </button>

            {/* Top-Left Model Selector Dropdown (ChatGPT style) */}
            <ModelSelectorDropdown
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
              onOpenKeyModal={(provider) => {
                setKeyModalProvider(provider);
                setIsKeyModalOpen(true);
              }}
              keys={keys}
            />
          </div>

          <div className="flex items-center space-x-2">
            {/* Active Persona Pill */}
            {selectedPersona && (
              <div className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1 bg-neutral-100 hover:bg-neutral-200/80 rounded-full text-xs font-semibold text-neutral-800 transition-colors">
                <Bot className="w-3.5 h-3.5 text-neutral-600" />
                <span>{selectedPersona.name}</span>
                <span className="text-neutral-400 font-normal">({selectedPersona.role})</span>
              </div>
            )}

            {/* AI Image Studio Button */}
            <button
              type="button"
              id="chat-open-image-studio-btn"
              onClick={() => setIsImageModalOpen(true)}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl border border-purple-200/80 transition-colors"
              title="Generate AI Image with Flux / DALL-E 3"
            >
              <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden md:inline">Image Studio</span>
            </button>

            {/* Voice Auto-Read Toggle */}
            <button
              type="button"
              id="toggle-voice-mode-btn"
              onClick={() => {
                if (autoVoiceEnabled) stopPersonaSpeech();
                setAutoVoiceEnabled(!autoVoiceEnabled);
              }}
              className={`p-2 rounded-xl transition-all border ${
                autoVoiceEnabled
                  ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
              }`}
              title={autoVoiceEnabled ? 'Voice Agent active (Reading responses aloud)' : 'Voice Agent muted (Click to enable audio speech)'}
            >
              {autoVoiceEnabled ? (
                <Volume2 className="w-4 h-4 text-white animate-pulse" />
              ) : (
                <VolumeX className="w-4 h-4 text-neutral-400" />
              )}
            </button>

            {/* New Chat Top Right Shortcut */}
            <button
              onClick={() => selectedPersona && startNewConversation(selectedPersona.id)}
              className="p-2 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl transition-colors"
              title="New Chat"
            >
              <SquarePen className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Message Stream Viewport */}
        <div className="flex-1 overflow-y-auto flex flex-col items-center">
          <div className={`w-full max-w-3xl px-4 sm:px-6 pt-6 pb-32 flex flex-col space-y-6 flex-1 ${messages.length === 0 ? 'justify-center' : 'justify-start'}`}>
            {loadingMessages ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-7 h-7 animate-spin text-neutral-400" />
              </div>
            ) : messages.length === 0 ? (
              /* ChatGPT Empty / Welcome State */
              <div className="flex flex-col items-center justify-center text-center my-auto py-6 sm:py-10">
                <div className="w-14 h-14 rounded-full bg-neutral-100 border border-neutral-200/80 flex items-center justify-center text-neutral-800 shadow-2xs mb-4">
                  <Sparkles className="w-7 h-7 stroke-[1.5] text-neutral-700" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
                  What can I help with today?
                </h2>
                <p className="text-sm text-neutral-500 max-w-md mt-2 mb-8 leading-relaxed">
                  Connected to <strong className="text-neutral-800">{selectedPersona?.name}</strong> ({selectedPersona?.role}).{' '}
                  {selectedPersona?.description || 'Ask questions, brainstorm ideas, generate images, or practice scenarios.'}
                </p>

                {/* ChatGPT Prompt Suggestion Cards (2x2) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
                  {[
                    {
                      title: 'Tell me your perspective',
                      desc: `What's the single biggest mistake people make in ${selectedPersona?.role?.toLowerCase() || 'your field'}?`,
                    },
                    {
                      title: 'Walk me through a case',
                      desc: 'Describe a high-stakes challenge you solved recently.',
                    },
                    {
                      title: 'Strategic coaching',
                      desc: 'Give me practical advice on handling tough questions.',
                    },
                    {
                      title: 'Generate an AI visual',
                      desc: 'Create a vibrant concept visual using the AI Image Studio.',
                    },
                  ].map((card, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(undefined, card.desc)}
                      className="p-3.5 rounded-2xl border border-neutral-200/80 bg-white hover:bg-neutral-50 hover:border-neutral-300 text-left transition-all shadow-2xs group cursor-pointer"
                    >
                      <div className="text-xs font-semibold text-neutral-900 group-hover:text-black flex items-center justify-between">
                        <span>{card.title}</span>
                        <ArrowUp className="w-3.5 h-3.5 text-neutral-300 group-hover:text-neutral-700 transition-colors rotate-45" />
                      </div>
                      <p className="text-xs text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                        {card.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Message Thread */
              messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`w-full flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {isUser ? (
                      /* ChatGPT User Message: Right-aligned pill */
                      <div className="bg-[#f4f4f4] text-neutral-900 rounded-[24px] px-5 py-3 max-w-[80%] text-[15px] leading-relaxed select-text shadow-2xs">
                        {renderMessageContent(msg.content, true)}
                      </div>
                    ) : (
                      /* ChatGPT Assistant Message: Left-aligned direct canvas text */
                      <div className="flex items-start gap-4 w-full max-w-full group">
                        {/* Assistant Avatar */}
                        <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-2xs mt-0.5">
                          {selectedPersona?.name ? selectedPersona.name.charAt(0).toUpperCase() : <Bot className="w-4 h-4" />}
                        </div>

                        {/* Message Content & Action Row */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="text-xs font-semibold text-neutral-600 mb-1">
                            {selectedPersona?.name || 'Assistant'}
                          </div>
                          <div className="text-[15px] leading-7 text-neutral-900 select-text">
                            {renderMessageContent(msg.content, false)}
                          </div>

                          {/* Hover Action Row (Copy text & Speak voice) */}
                          <div className="flex items-center space-x-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => copyMessageText(msg.id, msg.content)}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                              title="Copy response"
                            >
                              {copiedMsgId === msg.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => speakPersonaText(msg.content)}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                              title="Read aloud"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Assistant Thinking Indicator */}
            {sending && (
              <div className="flex items-start gap-4 w-full">
                <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-2xs mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="flex items-center space-x-2 py-2 text-neutral-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-neutral-700" />
                  <span>{selectedPersona?.name || 'Assistant'} is typing...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center space-x-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ChatGPT Floating Bottom Input Pill Dock */}
        <div className="sticky bottom-0 w-full bg-gradient-to-t from-white via-white/95 to-transparent pt-3 pb-4 z-20 flex flex-col items-center">
          <div className="w-full max-w-3xl px-4">
            <form
              onSubmit={handleSendMessage}
              className="w-full bg-[#f4f4f4] focus-within:bg-white focus-within:ring-1 focus-within:ring-neutral-300 rounded-[28px] p-2 flex items-end gap-2 border border-neutral-200/70 transition-all shadow-xs"
            >
              {/* Left Action: Image Studio / Add Tool Button */}
              <button
                type="button"
                id="chat-input-add-btn"
                onClick={() => setIsImageModalOpen(true)}
                className="w-8 h-8 rounded-full bg-neutral-200/70 hover:bg-neutral-300 text-neutral-700 flex items-center justify-center transition-colors shrink-0"
                title="Generate AI Image or open tools"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* Center: Auto-resizing Textarea */}
              <textarea
                ref={textareaRef}
                id="chat-message-input"
                rows={1}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${selectedPersona?.name || 'Nomi AI'}...`}
                className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-[15px] text-neutral-900 placeholder-neutral-500 py-1.5 px-2 resize-none min-h-[28px] max-h-44 leading-relaxed"
              />

              {/* Right Action: Voice Speech-to-Text Microphone Button */}
              <button
                type="button"
                id="mic-listen-btn"
                onClick={toggleListening}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/60'
                }`}
                title={isListening ? 'Listening... click to stop' : 'Tap to speak with Voice Agent'}
              >
                <Mic className="w-4 h-4" />
              </button>

              {/* Right Action: ChatGPT Iconic Upward Arrow Send Button */}
              <button
                type="submit"
                id="chat-send-btn"
                disabled={!inputMessage.trim() || sending}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ${
                  inputMessage.trim() && !sending
                    ? 'bg-black text-white hover:bg-neutral-800 shadow-2xs'
                    : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                }`}
                title="Send message"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            </form>

            {/* ChatGPT Disclaimer */}
            <div className="text-[11px] text-neutral-400 text-center mt-2 select-none">
              Nomi AI can make mistakes. Check important info.
            </div>
          </div>
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
