import React, { useState, useEffect } from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { translations } from '../i18n/translations';

declare const __BUILD_VERSION__: string;

interface Props {
  lang: 'es' | 'de';
  hasUnsavedForms?: boolean;
}

export const UpdateNotification: React.FC<Props> = ({ lang, hasUnsavedForms = false }) => {
  const t = translations[lang];
  const [dismissed, setDismissed] = useState(false);
  const [newVersionAvailable, setNewVersionAvailable] = useState(false);

  const currentAppVersion = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev';

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      if (r) {
        // Check for updates periodically every 15 seconds
        const interval = setInterval(() => {
          r.update().catch(() => {});
        }, 15 * 1000);

        // Check when tab becomes visible/active or window regains focus
        const handleVisibility = () => {
          if (document.visibilityState === 'visible') {
            r.update().catch(() => {});
          }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('focus', handleVisibility);

        return () => {
          clearInterval(interval);
          document.removeEventListener('visibilitychange', handleVisibility);
          window.removeEventListener('focus', handleVisibility);
        };
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  // Polling version.json every 15 seconds + focus / visibility
  useEffect(() => {
    if (currentAppVersion === 'dev') return;

    const checkVersionJson = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.version && data.version !== currentAppVersion) {
            setNewVersionAvailable(true);
          }
        }
      } catch {
        // ignore network error
      }
    };

    // Check immediately on mount
    checkVersionJson();

    const interval = setInterval(checkVersionJson, 15 * 1000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkVersionJson();
      }
    };

    const handleFocus = () => {
      checkVersionJson();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentAppVersion]);

  const showBanner = (needRefresh || newVersionAvailable) && !dismissed;

  if (!showBanner) {
    return null;
  }

  const handleUpdate = async () => {
    if (hasUnsavedForms) {
      const confirmUpdate = window.confirm(
        lang === 'de'
          ? 'Sie haben ungespeicherte Änderungen in Formularen. Wenn Sie jetzt aktualisieren, könnten diese Daten verloren gehen. Möchten Sie fortfahren?'
          : 'Tienes cambios sin guardar en formularios. Si actualizas ahora, podrías perder esos datos. ¿Deseas continuar de todos modos?'
      );
      if (!confirmUpdate) return;
    }

    // Stop active camera in Portería if scanning
    window.dispatchEvent(new CustomEvent('weihnachtsmarkt-stop-camera'));

    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    } catch {
      // ignore
    }

    // Apply update and reload once when new SW takes control
    updateServiceWorker(true);
  };

  return (
    <aside
      aria-label="Actualización de la aplicación"
      className="fixed top-0 left-0 right-0 z-[100] bg-red-700 text-white shadow-lg border-b border-red-800 transition-all duration-300 animate-in slide-in-from-top duration-300"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="p-2 bg-red-800 text-white rounded-xl shadow-inner shrink-0 hidden sm:flex">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold tracking-tight text-white flex items-center justify-center sm:justify-start gap-1.5">
              <Sparkles className="w-4 h-4 sm:hidden animate-pulse" />
              {t.newVersionTitle || '¡Nueva versión disponible!'}
            </h4>
            <p className="text-xs text-red-100 mt-0.5 leading-relaxed">
              {t.newVersionText || 'Hay una actualización reciente de la aplicación lista para usarse.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-center sm:justify-end">
          <button
            onClick={handleUpdate}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-red-50 text-red-700 font-bold text-xs shadow-md transition transform active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{t.updateNow || 'Actualizar ahora'}</span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="px-3 py-2 rounded-xl bg-red-800 hover:bg-red-900 text-red-100 hover:text-white text-xs font-semibold transition cursor-pointer"
            title="Cerrar aviso temporalmente"
          >
            {t.close || 'Cerrar'}
          </button>
        </div>
      </div>
    </aside>
  );
};
