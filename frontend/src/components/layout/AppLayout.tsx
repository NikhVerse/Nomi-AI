import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard,
  Bot,
  MessageSquare,
  Sparkles,
  Settings,
  LogOut,
  Menu,
  X,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

import { BrandLogo } from '../common/BrandLogo';

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onNavigate: (tab: string, extraId?: string) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, activeTab, onNavigate }) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'personas', label: 'Personas', icon: Bot },
    { id: 'chat', label: 'Conversations', icon: MessageSquare },
    { id: 'evaluations', label: 'Evaluations', icon: Sparkles },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNav = (id: string) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 flex flex-col transition-all duration-200 ease-in-out md:static ${
          mobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
        } ${sidebarCollapsed ? 'md:w-16' : 'md:w-64'}`}
      >
        {/* Brand / Logo & Collapse Toggle */}
        <div className="h-14 px-3.5 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center space-x-2.5 min-w-0">
            <BrandLogo size={28} />
            {!sidebarCollapsed && (
              <span className="font-semibold text-base tracking-tight text-slate-900 truncate">
                Nomi AI
              </span>
            )}
          </div>
          <div className="flex items-center">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden md:flex p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label="Toggle navigation"
            >
              {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
            <button
              className="md:hidden text-slate-500 hover:text-slate-800 p-1"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Action */}
        <div className="p-3">
          <button
            id="sidebar-create-persona-btn"
            onClick={() => handleNav('persona-builder')}
            title="Create Persona"
            className={`w-full flex items-center justify-center space-x-2 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-medium rounded-xl border border-indigo-200/60 transition-colors duration-150 ${
              sidebarCollapsed ? 'px-2' : 'px-3'
            }`}
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Create Persona</span>}
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-2.5 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || (item.id === 'personas' && activeTab === 'persona-builder');
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => handleNav(item.id)}
                title={sidebarCollapsed ? item.label : undefined}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-slate-100 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                } ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User profile & Logout footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-semibold text-xs shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-900 truncate">{user?.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <button
                id="logout-btn"
                onClick={logout}
                title="Sign out"
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header Bar */}
        <header className="md:hidden h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <BrandLogo size={28} />
            <span className="font-semibold text-base text-slate-900">Nomi AI</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 text-slate-600 hover:text-slate-900 rounded-md"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        {/* View Container (Full-bleed for Chat to match ChatGPT, boxed for other tabs) */}
        <main
          className={`flex-1 overflow-hidden ${
            activeTab === 'chat'
              ? 'p-0 bg-white'
              : 'p-4 sm:p-6 lg:p-8 bg-slate-50 overflow-y-auto'
          }`}
        >
          <div className={activeTab === 'chat' ? 'h-full w-full' : 'max-w-6xl mx-auto h-full'}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
