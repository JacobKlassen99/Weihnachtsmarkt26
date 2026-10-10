import React, { useState } from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { translations } from '../i18n/translations';

interface Props {
  lang: 'es' | 'de';
  hasUnsavedForms?: boolean;
}

export const UpdateNotification: React.FC<Props> = ({ lang, hasUnsavedForms = false }) => {
  const t = translations[lang];
  const [dismissed, setDismissed] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      if (r) {
        // Check for updates periodically every hour
        setInterval(() => {
          r.update().catch(() => {});
        }, 60 * 60 * 1000);

        // Check when tab becomes visible/active
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            r.update().catch(() => {});
          }
        });
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  if (!needRefresh || dismissed) {
    return null;
  }

  const handleUpdate = () => {
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

    // Apply update and reload
    updateServiceWorker(true);
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold text-xs transition shadow-xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {t.updateNow}
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs transition cursor-pointer"
            >
              {t.close}
            </button>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
