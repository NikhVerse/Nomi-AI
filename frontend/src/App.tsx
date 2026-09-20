import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Personas } from './pages/Personas';
import { PersonaBuilder } from './pages/PersonaBuilder';
import { Chat } from './pages/Chat';
import { Evaluations } from './pages/Evaluations';
import { Settings } from './pages/Settings';
import type { Persona } from './types';
import { Loader2 } from 'lucide-react';

export const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [activeExtraId, setActiveExtraId] = useState<string | undefined>(undefined);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Initializing Nomi AI...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated routing
  if (!user) {
    if (authView === 'register') {
      return <Register onNavigateToLogin={() => setAuthView('login')} />;
    }
    return <Login onNavigateToRegister={() => setAuthView('register')} />;
  }

  // Navigation handler
  const handleNavigate = (tab: string, extraId?: string) => {
    setActiveTab(tab);
    setActiveExtraId(extraId);
    if (tab !== 'persona-builder') {
      setEditingPersona(null);
    }
  };

  const handleEditPersona = (persona: Persona) => {
    setEditingPersona(persona);
    setActiveTab('persona-builder');
  };

  return (
    <AppLayout activeTab={activeTab} onNavigate={handleNavigate}>
      {activeTab === 'dashboard' && (
        <Dashboard onNavigate={handleNavigate} />
      )}

      {activeTab === 'personas' && (
        <Personas
          onNavigate={handleNavigate}
          onEditPersona={handleEditPersona}
        />
      )}

      {activeTab === 'persona-builder' && (
        <PersonaBuilder
          initialPersona={editingPersona}
          onSaved={() => {
            setEditingPersona(null);
            handleNavigate('personas');
          }}
          onCancel={() => {
            setEditingPersona(null);
            handleNavigate('personas');
          }}
        />
      )}

      {activeTab === 'chat' && (
        <Chat
          initialPersonaId={activeExtraId}
          onNavigateToBuilder={() => handleNavigate('persona-builder')}
        />
      )}

      {activeTab === 'evaluations' && (
        <Evaluations
          initialPersonaId={activeExtraId}
          onNavigateToBuilder={() => handleNavigate('persona-builder')}
        />
      )}

      {activeTab === 'settings' && (
        <Settings />
      )}
    </AppLayout>
  );
};

export default function App() {
  return <AppContent />;
}
