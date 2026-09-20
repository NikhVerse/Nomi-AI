import React, { useState, useEffect } from 'react';
import { X, Copy, Check, History, Sparkles, Bot, Code2 } from 'lucide-react';
import type { PromptVersion } from '../../types';
import { apiRequest } from '../../lib/api';

interface PromptInspectorModalProps {
  personaId: string;
  personaName: string;
  currentPrompt?: string;
  currentVersion?: number;
  isOpen: boolean;
  onClose: () => void;
}

export const PromptInspectorModal: React.FC<PromptInspectorModalProps> = ({
  personaId,
  personaName,
  currentPrompt,
  currentVersion = 1,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<PromptVersion | null>(null);

  useEffect(() => {
    if (isOpen && personaId) {
      apiRequest<PromptVersion[]>(`/personas/${personaId}/prompt-versions`)
        .then((data) => {
          setVersions(data);
          if (data.length > 0) {
            setSelectedVersion(data[0]);
          }
        })
        .catch(() => {
          // If versions fetch fails, fallback to current prompt
        });
    }
  }, [isOpen, personaId]);

  if (!isOpen) return null;

  const displayPrompt = selectedVersion ? selectedVersion.system_prompt : (currentPrompt || '');
  const displayVersionNumber = selectedVersion ? selectedVersion.version : currentVersion;

  const handleCopy = () => {
    navigator.clipboard.writeText(displayPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">System Prompt Inspector</h2>
              <p className="text-xs text-slate-500 font-medium">{personaName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Version sidebar selector */}
          {versions.length > 1 && (
            <div className="w-full md:w-44 border-r border-slate-200 p-3 bg-slate-50 overflow-y-auto shrink-0">
              <div className="flex items-center space-x-1.5 mb-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <History className="w-3.5 h-3.5" />
                <span>Versions</span>
              </div>
              <div className="space-y-1">
                {versions.map((v) => {
                  const isSelected = selectedVersion?.id === v.id;
                  const isLatest = v.version === versions[0]?.version;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVersion(v)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-medium shadow-xs'
                          : 'text-slate-600 hover:bg-slate-200/60'
                      }`}
                    >
                      <span>v{v.version}</span>
                      {isLatest && (
                        <span className={`text-[11px] px-1.5 py-0.5 rounded ${isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 text-slate-700'}`}>
                          Latest
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Main prompt inspector view */}
          <div className="flex-1 flex flex-col p-5 overflow-hidden">
            {/* Version banner & note */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Version {displayVersionNumber}</span>
                </span>
                <span className="inline-flex items-center space-x-1 text-xs text-slate-500">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Server-compiled <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded text-[11px]">system_instruction</code></span>
                </span>
              </div>
              <button
                onClick={handleCopy}
                id="copy-prompt-btn"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-200 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* System Prompt Code Box */}
            <div className="flex-1 overflow-y-auto dark-scrollbar bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs leading-relaxed border border-slate-800 select-all whitespace-pre-wrap">
              {displayPrompt || 'Compiling prompt...'}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
