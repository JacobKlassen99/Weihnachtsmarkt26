import React, { useEffect, useState } from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import { translations } from '../i18n/translations';

interface Props {
  lang: 'es' | 'de';
  hasUnsavedForms?: boolean;
}

export const UpdateNotification: React.FC<Props> = ({ lang, hasUnsavedForms = false }) => {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState<(() => Promise<void>) | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const t = translations[lang];

  useEffect(() => {
    // In development mode, do not register service worker update listeners
    if (import.meta.env.DEV) {
      return;
    }

    // Check if navigator.serviceWorker is supported
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // NEVER automatically reload. Just show notification banner.
                setNeedRefresh(true);
                setUpdateSW(() => async () => {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                });
              }
            });
          }
        });
      }).catch(() => {});
    }
  }, []);

  if (!needRefresh || dismissed) {
    return null;
  }

  // Do not show intrusive blocking modal if user is editing forms; show bottom corner toast
  const handleUpdate = () => {
    if (hasUnsavedForms) {
      const confirmUpdate = window.confirm(
        lang === 'de'
          ? 'Sie haben ungespeicherte Eingaben. Möchten Sie die Seite wirklich aktualisieren?'
          : 'Tienes información sin guardar en el formulario. ¿Deseas actualizar ahora de todos modos?'
      );
      if (!confirmUpdate) return;
    }
    if (updateSW) {
      updateSW();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 z-50 max-w-sm rounded-xl bg-white border border-gray-200 p-4 shadow-xl text-gray-900 animate-in slide-in-from-bottom-5">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-red-50 text-red-700 rounded-lg mt-0.5 border border-red-100">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            {t.newVersionTitle}
          </h4>
          <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
            {t.newVersionText}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleUpdate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold text-xs transition shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {t.updateNow}
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs transition"
            >
              {t.close}
            </button>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-400 hover:text-gray-700 p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
