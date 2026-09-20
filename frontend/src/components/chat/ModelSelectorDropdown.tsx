import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Key, ShieldAlert, Zap } from 'lucide-react';
import type { ModelCatalogItem, BYOKApiKeys } from '../../types';
import { apiRequest } from '../../lib/api';
import { getKeyForProvider } from '../../lib/keys';

interface ModelSelectorDropdownProps {
  selectedModel: ModelCatalogItem | null;
  onSelectModel: (model: ModelCatalogItem) => void;
  onOpenKeyModal: (provider?: string) => void;
  keys: BYOKApiKeys;
}

export const ModelSelectorDropdown: React.FC<ModelSelectorDropdownProps> = ({
  selectedModel,
  onSelectModel,
  onOpenKeyModal,
  keys,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [catalog, setCatalog] = useState<ModelCatalogItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiRequest<ModelCatalogItem[]>('/models/catalog')
      .then((data) => {
        setCatalog(data);
        if (!selectedModel && data.length > 0) {
          // Default to free models that require zero keys
          const defaultFree = data.find((m) => !m.requires_key) || data[0];
          onSelectModel(defaultFree);
        }
      })
      .catch((err) => console.error('Failed to load models catalog', err));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasKey = (provider: string) => {
    if (provider === 'builtin_local' || provider === 'ollama') return true;
    return !!getKeyForProvider(provider, keys);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        id="model-selector-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-sm font-semibold text-neutral-800 hover:bg-neutral-100 transition-colors"
      >
        <div className="flex items-center space-x-1.5">
          <Zap className="w-4 h-4 text-indigo-600" />
          <span className="font-bold text-neutral-900 text-sm">
            {selectedModel ? selectedModel.label : 'Select Model'}
          </span>
          {selectedModel && (
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                hasKey(selectedModel.provider)
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                  : 'bg-amber-50 text-amber-700 border border-amber-200/60'
              }`}
            >
              {hasKey(selectedModel.provider) ? 'Ready' : 'Add Key'}
            </span>
          )}
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-2xl shadow-xl bg-white border border-slate-200 ring-1 ring-black/5 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Select AI Model (10+ Providers)
            </span>
            <button
              type="button"
              id="header-open-key-modal-btn"
              onClick={() => {
                setIsOpen(false);
                onOpenKeyModal();
              }}
              className="inline-flex items-center space-x-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700"
            >
              <Key className="w-3 h-3" />
              <span>API Keys</span>
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto p-1.5 space-y-1 divide-y divide-slate-100">
            {catalog.map((item) => {
              const isSelected = selectedModel?.model === item.model;
              const providerHasKey = hasKey(item.provider);

              return (
                <div
                  key={`${item.provider}-${item.model}`}
                  className={`p-2 rounded-xl transition-colors cursor-pointer flex items-start justify-between ${
                    isSelected
                      ? 'bg-indigo-50/70 border border-indigo-200/60'
                      : 'hover:bg-slate-50'
                  }`}
                  onClick={() => {
                    onSelectModel(item);
                    setIsOpen(false);
                  }}
                >
                  <div className="space-y-0.5 pr-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-slate-900">
                        {item.label}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        {item.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      {item.description}
                    </p>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0 mt-0.5">
                    {!providerHasKey && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsOpen(false);
                          onOpenKeyModal(item.provider);
                        }}
                        className="p-1 rounded text-amber-600 hover:bg-amber-50"
                        title="Key required for this model. Click to enter key."
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
