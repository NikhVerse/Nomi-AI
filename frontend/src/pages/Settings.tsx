import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiRequest } from '../lib/api';
import type { User, ModelStatus, PopularModel } from '../types';
import {
  User as UserIcon,
  Shield,
  Check,
  AlertCircle,
  LogOut,
  Cpu,
  Sparkles,
  Server,
  Cloud,
  Download,
  RefreshCw,
  Zap,
  CheckCircle2
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Model & AI Provider State
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [popularModels, setPopularModels] = useState<PopularModel[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<'ollama' | 'local_openai' | 'builtin_local' | 'gemini'>('ollama');
  const [selectedModel, setSelectedModel] = useState('qwen2.5:0.5b');
  const [selectedHost, setSelectedHost] = useState('http://127.0.0.1:11434');

  const [savingModel, setSavingModel] = useState(false);
  const [modelSuccess, setModelSuccess] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [pullingModel, setPullingModel] = useState<string | null>(null);
  const [pullMessage, setPullMessage] = useState<string | null>(null);

  const loadModelStatus = async () => {
    try {
      const status = await apiRequest<ModelStatus>('/models/status');
      setModelStatus(status);
      setSelectedProvider(status.active_provider);
      setSelectedModel(status.active_model);
      setSelectedHost(status.active_host);
    } catch (err: any) {
      console.error('Failed to load model status:', err);
    }
  };

  const loadPopularModels = async () => {
    try {
      const models = await apiRequest<PopularModel[]>('/models/popular');
      setPopularModels(models);
    } catch (err: any) {
      console.error('Failed to load popular models:', err);
    }
  };

  useEffect(() => {
    loadModelStatus();
    loadPopularModels();
  }, []);

  const handleSaveModelSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingModel(true);
    setModelError(null);
    setModelSuccess(false);

    try {
      const res = await apiRequest<{ success: boolean; active_provider: any; active_model: string }>('/models/select', {
        method: 'POST',
        body: JSON.stringify({
          provider: selectedProvider,
          model: selectedModel.trim(),
          host: selectedHost.trim(),
        }),
      });

      if (res.success) {
        setModelSuccess(true);
        await loadModelStatus();
        setTimeout(() => setModelSuccess(false), 3000);
      }
    } catch (err: any) {
      setModelError(err.message || 'Failed to update AI model configuration.');
    } finally {
      setSavingModel(false);
    }
  };

  const handlePullModel = async (modelName: string) => {
    setPullingModel(modelName);
    setPullMessage(null);
    try {
      await apiRequest('/models/pull', {
        method: 'POST',
        body: JSON.stringify({ model: modelName }),
      });
      setPullMessage(`Download started for ${modelName}. Ollama will prepare it in the background.`);
      setTimeout(() => {
        setPullMessage(null);
        loadModelStatus();
      }, 5000);
    } catch (err: any) {
      setModelError(err.message || `Failed to initiate download for ${modelName}`);
    } finally {
      setPullingModel(null);
    }
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);

    if (!name.trim()) {
      setProfileError('Name cannot be empty.');
      return;
    }

    setSavingProfile(true);
    try {
      const updated = await apiRequest<User>('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim() }),
      });
      updateUser(updated);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile name');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all password fields.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      await apiRequest<User>('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password. Ensure current password is correct.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Settings & AI Models
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure free local AI models, offline simulation, and account preferences
        </p>
      </div>

      {/* AI Model & Local Engine Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Local & Free AI Engine</h2>
              <p className="text-xs text-slate-500">Run 100% free models locally without any API keys</p>
            </div>
          </div>

          {/* Live Status Badge */}
          <div className="flex items-center space-x-2">
            {modelStatus?.ollama.connected ? (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Ollama Connected ({modelStatus.ollama.version})</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                <span>Built-in Offline Ready</span>
              </span>
            )}
            <button
              onClick={loadModelStatus}
              title="Refresh status"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {modelSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>AI model preferences updated. All chats will now use this local configuration.</span>
          </div>
        )}

        {modelError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{modelError}</span>
          </div>
        )}

        {pullMessage && (
          <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs rounded-xl flex items-center space-x-2">
            <Download className="w-4 h-4 shrink-0 animate-bounce" />
            <span>{pullMessage}</span>
          </div>
        )}

        {/* Provider Selector Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 1. Local Ollama */}
          <div
            onClick={() => setSelectedProvider('ollama')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
              selectedProvider === 'ollama'
                ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Cpu className={`w-4 h-4 ${selectedProvider === 'ollama' ? 'text-indigo-600' : 'text-slate-500'}`} />
                <span className="text-xs font-bold text-slate-900">Local Ollama</span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Recommended
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Runs open weights (Llama 3.2, Qwen 2.5, Mistral) on your machine with GPU acceleration. Zero API key needed.
            </p>
          </div>

          {/* 2. Built-in Offline Engine */}
          <div
            onClick={() => setSelectedProvider('builtin_local')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
              selectedProvider === 'builtin_local'
                ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Sparkles className={`w-4 h-4 ${selectedProvider === 'builtin_local' ? 'text-indigo-600' : 'text-slate-500'}`} />
                <span className="text-xs font-bold text-slate-900">Built-in Offline Engine</span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Zero Setup
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Instant natural conversational engine running directly on device. Zero downloads, zero setup, 100% private.
            </p>
          </div>

          {/* 3. Local LM Studio / OpenAI Endpoint */}
          <div
            onClick={() => setSelectedProvider('local_openai')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
              selectedProvider === 'local_openai'
                ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Server className={`w-4 h-4 ${selectedProvider === 'local_openai' ? 'text-indigo-600' : 'text-slate-500'}`} />
                <span className="text-xs font-bold text-slate-900">LM Studio / LocalAI</span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Port 1234
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Connect to LM Studio, vLLM, or Jan serving an OpenAI-compatible endpoint locally. No key required.
            </p>
          </div>

          {/* 4. Google Gemini (Cloud) */}
          <div
            onClick={() => setSelectedProvider('gemini')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
              selectedProvider === 'gemini'
                ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Cloud className={`w-4 h-4 ${selectedProvider === 'gemini' ? 'text-indigo-600' : 'text-slate-500'}`} />
                <span className="text-xs font-bold text-slate-900">Google Gemini</span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Optional
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Google Gemini 2.0 Flash cloud model. Optional if you configure a GEMINI_API_KEY.
            </p>
          </div>
        </div>

        {/* Dynamic Provider Settings Form */}
        <form onSubmit={handleSaveModelSettings} className="space-y-4 pt-2">
          {selectedProvider === 'ollama' && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Ollama Host URL
                  </label>
                  <input
                    type="text"
                    value={selectedHost}
                    onChange={(e) => setSelectedHost(e.target.value)}
                    placeholder="http://127.0.0.1:11434"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Active Model Name
                  </label>
                  <input
                    type="text"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    placeholder="qwen2.5:0.5b or llama3.2:1b"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Popular Models List */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Popular Free Local Models
                </label>
                <div className="space-y-2">
                  {popularModels.map((m) => (
                    <div
                      key={m.name}
                      className="p-3 bg-white border border-slate-200/80 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-slate-900">{m.label}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                            {m.size}
                          </span>
                          {m.recommended && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                              Fast
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 text-xs mt-0.5">{m.description}</p>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setSelectedModel(m.name)}
                          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                            selectedModel === m.name
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {selectedModel === m.name ? 'Selected' : 'Use'}
                        </button>

                        <button
                          type="button"
                          disabled={pullingModel === m.name}
                          onClick={() => handlePullModel(m.name)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 border border-slate-200 transition-colors inline-flex items-center space-x-1"
                          title="Pull model to local Ollama"
                        >
                          <Download className="w-3 h-3" />
                          <span>Pull</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedProvider === 'local_openai' && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Local Server URL
                </label>
                <input
                  type="text"
                  value={selectedHost}
                  onChange={(e) => setSelectedHost(e.target.value)}
                  placeholder="http://127.0.0.1:1234/v1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Default for LM Studio is http://127.0.0.1:1234/v1. Start local server in LM Studio first.
                </p>
              </div>
            </div>
          )}

          {selectedProvider === 'builtin_local' && (
            <div className="p-4 bg-indigo-50/50 border border-indigo-200/60 rounded-xl text-xs text-indigo-900 space-y-1.5">
              <div className="flex items-center space-x-1.5 font-semibold">
                <Zap className="w-4 h-4 text-indigo-600" />
                <span>Zero Installation Offline Mode</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                The built-in engine evaluates personas and runs chats with 100% offline natural dialogue directly in Python. No downloads, no local servers, and no API keys required.
              </p>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingModel}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-60 flex items-center space-x-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{savingModel ? 'Saving...' : 'Apply Model Configuration'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Profile Overview */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
          <UserIcon className="w-4 h-4 text-indigo-600" />
          <span>Profile Information</span>
        </div>

        {profileSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center space-x-2">
            <Check className="w-4 h-4" />
            <span>Profile updated successfully.</span>
          </div>
        )}

        {profileError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{profileError}</span>
          </div>
        )}

        <form onSubmit={handleUpdateName} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 cursor-not-allowed"
            />
            <p className="text-xs text-slate-400 mt-1">Managed by tenant account.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Display Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-400">
              Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
            </span>
            <button
              type="submit"
              disabled={savingProfile}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-60"
            >
              {savingProfile ? 'Saving...' : 'Save Name'}
            </button>
          </div>
        </form>
      </div>

      {/* Password & Security */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
          <Shield className="w-4 h-4 text-indigo-600" />
          <span>Security</span>
        </div>

        {passwordSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center space-x-2">
            <Check className="w-4 h-4" />
            <span>Password updated securely.</span>
          </div>
        )}

        {passwordError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              New Password
            </label>
            <input
              type="password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingPassword}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-60"
            >
              {savingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Logout Option */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Sign Out</h3>
          <p className="text-xs text-slate-500">End your active session on this device.</p>
        </div>
        <button
          onClick={logout}
          className="inline-flex items-center space-x-1.5 px-4 py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
