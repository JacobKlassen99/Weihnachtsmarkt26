import React from 'react';
import {
  Calendar,
  KeyRound,
  LayoutDashboard,
  LogOut,
  QrCode,
  Store,
} from 'lucide-react';
import { translations } from '../i18n/translations';
import { Idioma } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

export type NavView = 'public' | 'client' | 'porteria' | 'admin' | 'guest';

interface Props {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  lang: Idioma;
  onLangChange: (lang: Idioma) => void;
  gestionActiva?: string;
  adminLoggedIn?: boolean;
  onAdminLogout?: () => void;
}

export const Navbar: React.FC<Props> = ({
  currentView,
  onNavigate,
  lang,
  onLangChange,
  gestionActiva = 'GES-2026',
  adminLoggedIn = false,
  onAdminLogout,
}) => {
  const t = translations[lang];

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200 text-gray-900 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Logo & Title */}
          <button
            onClick={() => onNavigate('public')}
            className="flex items-center gap-2.5 text-left transition group"
          >
            <div className="w-9 h-9 rounded-xl bg-red-700 flex items-center justify-center shadow-xs">
              <img src="/icon.svg" alt="Weihnachtsmarkt" className="w-6 h-6 object-contain" />
            </div>
            <div>
              <span className="font-bold text-base sm:text-lg text-red-700 tracking-tight block leading-tight">
                {t.appName}
              </span>
              <span className="text-[11px] text-gray-500 font-normal hidden sm:block">
                {t.tagline}
              </span>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-200">
            <button
              onClick={() => onNavigate('public')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                currentView === 'public'
                  ? 'bg-red-700 text-white shadow-xs'
                  : 'text-gray-700 hover:text-red-700 hover:bg-white'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              {t.navHome}
            </button>

            <button
              onClick={() => onNavigate('client')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                currentView === 'client'
                  ? 'bg-red-700 text-white shadow-xs'
                  : 'text-gray-700 hover:text-red-700 hover:bg-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              {t.navClient}
            </button>

            <button
              onClick={() => onNavigate('porteria')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                currentView === 'porteria'
                  ? 'bg-red-700 text-white shadow-xs'
                  : 'text-gray-700 hover:text-red-700 hover:bg-white'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              {t.navGate}
            </button>

            <button
              onClick={() => onNavigate('admin')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                currentView === 'admin'
                  ? 'bg-red-700 text-white shadow-xs'
                  : 'text-gray-700 hover:text-red-700 hover:bg-white'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              {t.navAdmin}
            </button>
          </nav>

          {/* Action buttons: Language, Install & Logout */}
          <div className="flex items-center gap-2.5">
            {/* Language Switcher */}
            <div className="flex items-center bg-gray-100 border border-gray-200 rounded-lg p-0.5">
              <button
                onClick={() => onLangChange('es')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                  lang === 'es'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Español"
              >
                ES
              </button>
              <button
                onClick={() => onLangChange('de')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                  lang === 'de'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Deutsch"
              >
                DE
              </button>
            </div>

            {/* PWA Install Button */}
            <PWAInstallButton lang={lang} />

            {/* Admin Logout button if logged in */}
            {adminLoggedIn && currentView === 'admin' && (
              <button
                onClick={onAdminLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:text-red-700 bg-gray-100 hover:bg-red-50 border border-gray-200 hover:border-red-200 transition"
                title={t.logout}
              >
                <LogOut className="w-3.5 h-3.5 text-red-700" />
                <span className="hidden sm:inline">{t.logout}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 px-2 py-1.5 flex items-center justify-around shadow-sm">
        <button
          onClick={() => onNavigate('public')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg transition ${
            currentView === 'public'
              ? 'text-red-700 font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Store className="w-5 h-5 mb-0.5" />
          <span className="text-[11px]">{t.navHome}</span>
        </button>

        <button
          onClick={() => onNavigate('client')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg transition ${
            currentView === 'client'
              ? 'text-red-700 font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <KeyRound className="w-5 h-5 mb-0.5" />
          <span className="text-[11px]">{t.navClient}</span>
        </button>

        <button
          onClick={() => onNavigate('porteria')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg transition ${
            currentView === 'porteria'
              ? 'text-red-700 font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <QrCode className="w-5 h-5 mb-0.5" />
          <span className="text-[11px]">{t.navGate}</span>
        </button>

        <button
          onClick={() => onNavigate('admin')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg transition ${
            currentView === 'admin'
              ? 'text-red-700 font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[11px]">{t.navAdmin}</span>
        </button>
      </nav>
    </>
  );
};
