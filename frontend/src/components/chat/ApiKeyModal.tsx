import React, { useState, useEffect } from 'react';
import { X, Key, Check, ExternalLink, ShieldCheck, Sparkles } from 'lucide-react';
import type { BYOKApiKeys } from '../../types';
import { getStoredApiKeys, saveStoredApiKeys } from '../../lib/keys';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeysUpdated?: () => void;
  initialProvider?: string;
}

interface ProviderKeyConfig {
  id: keyof BYOKApiKeys;
  name: string;
  placeholder: string;
  dashboardUrl: string;
  note: string;
}

const PROVIDER_CONFIGS: ProviderKeyConfig[] = [
  {
    id: 'gemini_api_key',
    name: 'Google Gemini',
    placeholder: 'AIzaSy...',
    dashboardUrl: 'https://aistudio.google.com/app/apikey',
    note: 'Free tier available via Google AI Studio',
  },
  {
    id: 'openai_api_key',
    name: 'OpenAI (ChatGPT & DALL-E)',
    placeholder: 'sk-proj-...',
    dashboardUrl: 'https://platform.openai.com/api-keys',
    note: 'Powers GPT-4o, o3-mini, and DALL-E 3',
  },
  {
    id: 'anthropic_api_key',
    name: 'Anthropic Claude',
    placeholder: 'sk-ant-...',
    dashboardUrl: 'https://console.anthropic.com/settings/keys',
    note: 'Powers Claude 3.5 Sonnet & Haiku',
  },
  {
    id: 'deepseek_api_key',
    name: 'DeepSeek',
    placeholder: 'sk-...',
    dashboardUrl: 'https://platform.deepseek.com/api_keys',
    note: 'Ultra low-cost access to DeepSeek V3 and R1',
  },
  {
    id: 'groq_api_key',
    name: 'Groq (High-Speed LPU)',
    placeholder: 'gsk_...',
    dashboardUrl: 'https://console.groq.com/keys',
    note: 'Generous free tier with 500+ tok/s speed',
  },
  {
    id: 'mistral_api_key',
    name: 'Mistral AI',
    placeholder: '...',
    dashboardUrl: 'https://console.mistral.ai/api-keys/',
    note: 'European flagship Mistral Large & Codestral',
  },
  {
    id: 'openrouter_api_key',
    name: 'OpenRouter (Universal)',
    placeholder: 'sk-or-...',
    dashboardUrl: 'https://openrouter.ai/keys',
    note: 'One key for 100+ open and proprietary models',
  },
];

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onKeysUpdated,
  initialProvider,
}) => {
  const [keys, setKeys] = useState<BYOKApiKeys>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setKeys(getStoredApiKeys());
      setSaved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveStoredApiKeys(keys);
    setSaved(true);
    if (onKeysUpdated) onKeysUpdated();
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleKeyChange = (providerKey: keyof BYOKApiKeys, value: string) => {
    setKeys((prev) => ({
      ...prev,
      [providerKey]: value.trim() || undefined,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Custom API Keys (BYOK)
              </h3>
              <p className="text-xs text-slate-500">
                Stored in your browser. Never saved in plaintext on servers.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notice */}
        <div className="px-6 pt-3 pb-1">
          <div className="p-3 bg-emerald-50/80 border border-emerald-200/60 rounded-xl text-xs text-emerald-800 flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />
            <span>
              <strong>Zero Server Storage:</strong> Your keys are saved strictly in your client's encrypted local storage and passed securely via HTTPS headers for chat execution.
            </span>
          </div>
        </div>

        {/* Body inputs */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {PROVIDER_CONFIGS.map((cfg) => {
            const isHighlight =
              initialProvider &&
              cfg.name.toLowerCase().includes(initialProvider.toLowerCase());

            return (
              <div
                key={cfg.id}
                className={`p-3.5 rounded-xl border transition-colors ${
                  isHighlight
                    ? 'border-indigo-300 bg-indigo-50/30 ring-2 ring-indigo-500/10'
                    : 'border-slate-200 bg-slate-50/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-800">
                    {cfg.name}
                  </span>
                  <a
                    href={cfg.dashboardUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 text-[11px] text-indigo-600 hover:text-indigo-700 underline"
                  >
                    <span>Get Key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="password"
                  value={keys[cfg.id] || ''}
                  onChange={(e) => handleKeyChange(cfg.id, e.target.value)}
                  placeholder={cfg.placeholder}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                />
                <p className="mt-1 text-[11px] text-slate-400">{cfg.note}</p>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            id="save-byok-keys-btn"
            onClick={handleSave}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Keys Saved!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Save API Keys</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
