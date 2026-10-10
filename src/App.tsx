import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Gift,
  Heart,
  RefreshCw,
  Sparkles,
  WifiOff,
} from 'lucide-react';
import { AdminView } from './components/admin/AdminView';
import { ClientPortal } from './components/client/ClientPortal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GuestRegistration } from './components/guest/GuestRegistration';
import { Navbar, NavView } from './components/Navbar';
import { PorteriaView } from './components/porteria/PorteriaView';
import { PublicView } from './components/public/PublicView';
import { UpdateNotification } from './components/UpdateNotification';
import { translations } from './i18n/translations';
import { backendService } from './services/backend';
import { Configuracion, Idioma, PublicData, Usuario } from './types';

export default function App() {
  // Navigation & Routing
  const [currentView, setCurrentView] = useState<NavView>('public');
  const [clientTokenParam, setClientTokenParam] = useState<string>('');
  const [guestTokenParam, setGuestTokenParam] = useState<string>('');

  // Language state (default 'es')
  const [lang, setLang] = useState<Idioma>(() => {
    const saved = localStorage.getItem('weihnachtsmarkt_lang');
    return saved === 'de' || saved === 'es' ? saved : 'es';
  });

  // Public Data State
  const [publicData, setPublicData] = useState<PublicData>({
    configuracion: {
      NOMBRE_EVENTO: 'Weihnachtsmarkt',
      IDIOMA_PREDETERMINADO: 'es',
      WHATSAPP_ADMIN: '75593587',
      MONEDA: '$us',
      MAX_INVITADOS: '5',
      GESTION_ACTIVA: 'GES-2026',
      MENSAJE_WHATSAPP_ES:
        'Hola, soy {NOMBRE}. Solicité el Stand {STAND} de la categoría {CATEGORIA} para el Weihnachtsmarkt.',
      MENSAJE_WHATSAPP_DE:
        'Hallo, ich bin {NOMBRE}. Ich habe Stand {STAND} in der Kategorie {CATEGORIA} für den Weihnachtsmarkt angefragt.',
    },
    stands: [],
  });
  const [loadingPublic, setLoadingPublic] = useState(true);
  const [networkError, setNetworkError] = useState<string | null>(null);

  // Admin Session State
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    return (
      sessionStorage.getItem('weihnachtsmarkt_admin_token') ||
      localStorage.getItem('weihnachtsmarkt_admin_token') ||
      null
    );
  });
  const [adminUser, setAdminUser] = useState<Usuario | null>(() => {
    const saved =
      sessionStorage.getItem('weihnachtsmarkt_admin_user') ||
      localStorage.getItem('weihnachtsmarkt_admin_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Online / Offline State
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Unsaved form tracking
  const [hasUnsavedForms, setHasUnsavedForms] = useState(false);

  // Route parser from URL
  const parseRoute = () => {
    const hash = window.location.hash;
    const search = window.location.search;

    const urlParams = new URLSearchParams(search);
    const hashParams = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');

    // Check for guest invitation
    if (hash.startsWith('#invitacion') || urlParams.has('invitacion')) {
      const token =
        hashParams.get('token') ||
        urlParams.get('invitacion') ||
        urlParams.get('token') ||
        '';
      setGuestTokenParam(token);
      setCurrentView('guest');
      return;
    }

    // Check for client portal
    if (hash.startsWith('#cliente') || urlParams.has('cliente') || urlParams.has('token')) {
      const token =
        hashParams.get('token') ||
        urlParams.get('cliente') ||
        urlParams.get('token') ||
        '';
      setClientTokenParam(token);
      setCurrentView('client');
      return;
    }

    // Check for porteria
    if (hash.startsWith('#porteria')) {
      setCurrentView('porteria');
      return;
    }

    // Check for admin
    if (hash.startsWith('#admin')) {
      setCurrentView('admin');
      return;
    }

    // Default: public
    if (!hash || hash === '#/' || hash === '#home' || hash === '#stands') {
      setCurrentView('public');
    }
  };

  useEffect(() => {
    parseRoute();
    window.addEventListener('hashchange', parseRoute);
    return () => window.removeEventListener('hashchange', parseRoute);
  }, []);

  // Online / Offline listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load public data on mount
  const loadPublicData = async (force = false) => {
    setLoadingPublic(true);
    setNetworkError(null);
    try {
      const data = await backendService.getPublicData(force);
      setPublicData(data);
      // If default language configured and user hasn't chosen yet
      if (
        !localStorage.getItem('weihnachtsmarkt_lang') &&
        data.configuracion?.IDIOMA_PREDETERMINADO
      ) {
        const defaultLang = data.configuracion.IDIOMA_PREDETERMINADO as Idioma;
        if (defaultLang === 'es' || defaultLang === 'de') {
          setLang(defaultLang);
        }
      }
    } catch (err: any) {
      console.error('Error fetching public data:', err);
      const detail = err?.message ? ` (${err.message})` : '';
      setNetworkError(
        lang === 'de'
          ? `Verbindung zum Weihnachtsmarkt-Server fehlgeschlagen.${detail}`
          : `Error de conexión con el servidor del Weihnachtsmarkt.${detail}`
      );
    } finally {
      setLoadingPublic(false);
    }
  };

  useEffect(() => {
    loadPublicData();
  }, []);

  const handleLangChange = (newLang: Idioma) => {
    setLang(newLang);
    localStorage.setItem('weihnachtsmarkt_lang', newLang);
  };

  const handleNavigate = (view: NavView) => {
    setCurrentView(view);
    if (view === 'public') window.location.hash = '#home';
    else if (view === 'client') window.location.hash = clientTokenParam ? `#cliente?token=${clientTokenParam}` : '#cliente';
    else if (view === 'porteria') window.location.hash = '#porteria';
    else if (view === 'admin') window.location.hash = '#admin';
    else if (view === 'guest') window.location.hash = guestTokenParam ? `#invitacion?token=${guestTokenParam}` : '#invitacion';
  };

  const handleLoginSuccess = (token: string, user: Usuario) => {
    setSessionToken(token);
    setAdminUser(user);
    sessionStorage.setItem('weihnachtsmarkt_admin_token', token);
    sessionStorage.setItem('weihnachtsmarkt_admin_user', JSON.stringify(user));
    localStorage.setItem('weihnachtsmarkt_admin_token', token);
    localStorage.setItem('weihnachtsmarkt_admin_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setSessionToken(null);
    setAdminUser(null);
    sessionStorage.removeItem('weihnachtsmarkt_admin_token');
    sessionStorage.removeItem('weihnachtsmarkt_admin_user');
    localStorage.removeItem('weihnachtsmarkt_admin_token');
    localStorage.removeItem('weihnachtsmarkt_admin_user');
  };

  const t = translations[lang];

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900 font-sans">
      {/* Offline Indicator Banner */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 shadow-xs sticky top-0 z-50">
          <WifiOff className="w-4 h-4" />
          <span>{t.offlineNotice}</span>
        </div>
      )}

      {/* Network Error Toast if initial fetch fails */}
      {networkError && (
        <div className="bg-red-50 border-b border-red-200 text-red-800 px-4 py-2.5 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{networkError}</span>
          </div>
          <button
            onClick={() => loadPublicData(true)}
            className="px-2.5 py-1 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold text-[11px] shrink-0 transition"
          >
            {t.retry}
          </button>
        </div>
      )}

      {/* Navigation Header */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        lang={lang}
        onLangChange={handleLangChange}
        gestionActiva={publicData.configuracion?.GESTION_ACTIVA || 'GES-2026'}
        adminLoggedIn={Boolean(sessionToken)}
        onAdminLogout={handleLogout}
      />

      {/* Main View Container */}
      <main className="flex-1 bg-white">
        <ErrorBoundary fallbackTitle="Error al cargar esta sección">
          {currentView === 'public' && (
            <PublicView
              config={publicData.configuracion}
              stands={publicData.stands}
              lang={lang}
              loading={loadingPublic}
              onRefresh={() => loadPublicData(true)}
            />
          )}

          {currentView === 'client' && (
            <ClientPortal
              initialToken={clientTokenParam}
              lang={lang}
            />
          )}

          {currentView === 'guest' && (
            <GuestRegistration
              token={guestTokenParam}
              lang={lang}
              onBackToHome={() => handleNavigate('public')}
            />
          )}

          {currentView === 'porteria' && (
            <PorteriaView
              sessionToken={sessionToken || undefined}
              lang={lang}
              onRequireLogin={() => handleNavigate('admin')}
            />
          )}

          {currentView === 'admin' && (
            <AdminView
              sessionToken={sessionToken}
              onLoginSuccess={handleLoginSuccess}
              onLogout={handleLogout}
              lang={lang}
              onHasUnsavedChange={setHasUnsavedForms}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 px-4 text-center text-xs text-gray-500 mb-14 md:mb-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-red-700" />
            <span className="font-bold text-gray-900">
              {publicData.configuracion?.NOMBRE_EVENTO || 'Weihnachtsmarkt'}
            </span>
            <span>•</span>
            <span className="text-red-700 font-mono font-medium">
              {publicData.configuracion?.GESTION_ACTIVA || 'GES-2026'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-gray-500">
            <span>PWA Oficial • Google Sheets Backend</span>
            <span>•</span>
            <span>Netlify Ready</span>
          </div>
        </div>
      </footer>

      {/* PWA Update Notification Banner */}
      <UpdateNotification lang={lang} hasUnsavedForms={hasUnsavedForms} />
    </div>
  );
}
