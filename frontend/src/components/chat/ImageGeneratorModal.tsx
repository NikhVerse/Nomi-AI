import React, { useState } from 'react';
import { X, Sparkles, Loader2, Download, Send } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import type { ImageGenerateResponse, BYOKApiKeys } from '../../types';
import { getKeyForProvider } from '../../lib/keys';

interface ImageGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertImageIntoChat: (imageUrl: string, prompt: string) => void;
  keys: BYOKApiKeys;
}

const SAMPLE_IMAGE_PROMPTS = [
  "A futuristic neon hacker workspace with glowing holographic interfaces",
  "Minimalist geometric architecture with sunlight pouring through tall glass panels",
  "A wise fantasy mechanical owl perched on an ancient spellbook in a library",
  "Cozy isometric room with indoor plants, warm lighting, and a sleeping cat",
];

export const ImageGeneratorModal: React.FC<ImageGeneratorModalProps> = ({
  isOpen,
  onClose,
  onInsertImageIntoChat,
  keys,
}) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [provider, setProvider] = useState<'pollinations' | 'dalle'>('pollinations');
  const [loading, setLoading] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<ImageGenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);

    const apiKey = provider === 'dalle' ? getKeyForProvider('openai', keys) : undefined;

    try {
      const res = await apiRequest<ImageGenerateResponse>('/images/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: prompt.trim(),
          provider,
          aspect_ratio: aspectRatio,
          api_key: apiKey,
        }),
      });
      setGeneratedResult(res);
    } catch (err: any) {
      setError(err.message || 'Image generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInsert = () => {
    if (!generatedResult) return;
    onInsertImageIntoChat(generatedResult.url, generatedResult.prompt);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200/60 flex items-center justify-center text-purple-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                AI Image Studio
              </h3>
              <p className="text-xs text-slate-500">
                Generate visuals with free Flux engine or DALL-E 3
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Prompt */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Image Prompt
            </label>
            <textarea
              id="image-prompt-input"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to generate in detail..."
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Quick inspiration prompts */}
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_IMAGE_PROMPTS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setPrompt(sample)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-600 border border-slate-200 transition-colors text-left"
              >
                + {sample.slice(0, 32)}...
              </button>
            ))}
          </div>

          {/* Options: Aspect ratio & Provider */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Aspect Ratio
              </label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="1:1">1:1 Square (1024x1024)</option>
                <option value="16:9">16:9 Landscape</option>
                <option value="9:16">9:16 Story / Portrait</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Generator Engine
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as any)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="pollinations">Flux Engine (Free, 0 Keys)</option>
                <option value="dalle">OpenAI DALL-E 3 (Requires Key)</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          {/* Generated Result Preview */}
          {generatedResult && (
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="relative rounded-lg overflow-hidden border border-slate-200 aspect-square flex items-center justify-center bg-black/5">
                <img
                  src={generatedResult.url}
                  alt={generatedResult.prompt}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium">
                  {generatedResult.provider}
                </span>
                <div className="flex items-center space-x-2">
                  <a
                    href={generatedResult.url}
                    target="_blank"
                    download="nomi-ai-image.jpg"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-200 transition-colors"
                    title="Download Image"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={handleInsert}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send to Chat</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            id="generate-image-submit-btn"
            disabled={!prompt.trim() || loading}
            onClick={handleGenerate}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Image...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Image</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
