import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  CheckCircle2,
  RefreshCw,
  Store,
  UserCheck,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { translations } from '../../i18n/translations';
import { backendService, getOrCreateSecretoDispositivo } from '../../services/backend';
import { Idioma, InvitacionInfo } from '../../types';

interface Props {
  token: string;
  lang: Idioma;
  onBackToHome: () => void;
}

export const GuestRegistration: React.FC<Props> = ({
  token,
  lang,
  onBackToHome,
}) => {
  const t = translations[lang];

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitationInfo, setInvitationInfo] = useState<InvitacionInfo | null>(null);
  const [guestName, setGuestName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [registeredQR, setRegisteredQR] = useState<string | null>(null);
  const [registeredName, setRegisteredName] = useState<string | null>(null);
  const [invitadoId, setInvitadoId] = useState<string | null>(null);

  const fetchGuestQr = async (id: string, sec: string) => {
    if (!id || !sec) return;
    try {
      const qrRes = await backendService.qrDispositivo('INVITADO', id, sec);
      if (qrRes && qrRes.ok) {
        const qrText = qrRes.data?.QR || qrRes.QR || qrRes.qr_acceso || qrRes.data?.qr_acceso;
        if (qrText) {
          setRegisteredQR(String(qrText));
          if (qrRes.NombreCompleto || qrRes.nombre) {
            setRegisteredName(qrRes.NombreCompleto || qrRes.nombre);
          }
          if (qrRes.NumeroStand || qrRes.stand) {
            setInvitationInfo((prev) =>
              prev
                ? { ...prev, stand: qrRes.NumeroStand || qrRes.stand }
                : { valida: true, registrado: true, stand: qrRes.NumeroStand || qrRes.stand }
            );
          }
        }
      } else {
        setError(qrRes?.error || (lang === 'de' ? 'Zugriff abgelaufen oder ungültig' : 'Acceso de invitado no válido o revocado'));
      }
    } catch {
      // ignore temporary network hiccups on auto-renewal
    }
  };

  useEffect(() => {
    const initGuest = async () => {
      const storedInvitadoId = localStorage.getItem('wm_guest_invitado_id');
      const storedSecreto = localStorage.getItem('wm_guest_secreto');
      const storedNombre = localStorage.getItem('wm_guest_nombre');

      setLoading(true);
      setError(null);

      // SITUACIÓN B: Invitado ya activado (tiene credenciales guardadas en este dispositivo)
      if (storedInvitadoId && storedSecreto) {
        setInvitadoId(storedInvitadoId);
        if (storedNombre) setRegisteredName(storedNombre);
        try {
          const qrRes = await backendService.qrDispositivo('INVITADO', storedInvitadoId, storedSecreto);
          if (qrRes && qrRes.ok) {
            const qrText = qrRes.data?.QR || qrRes.QR || qrRes.qr_acceso || qrRes.data?.qr_acceso;
            if (qrText) {
              setRegisteredQR(String(qrText));
              const name = qrRes.data?.NombreCompleto || qrRes.NombreCompleto || qrRes.data?.nombre || qrRes.nombre || storedNombre || 'Invitado';
              setRegisteredName(name);
              localStorage.setItem('wm_guest_nombre', name);
              const stand = qrRes.data?.NumeroStand || qrRes.NumeroStand || qrRes.data?.stand || qrRes.stand;
              if (stand) {
                setInvitationInfo({ valida: true, registrado: true, stand: String(stand) });
              }
            } else {
              throw new Error(qrRes.error || (lang === 'de' ? 'QR-Code nicht verfügbar' : 'Código QR no disponible'));
            }
          } else {
            const realError = qrRes?.error || (lang === 'de' ? 'Zugriff abgelaufen oder ungültig' : 'Acceso de invitado no válido o revocado');
            throw new Error(realError);
          }
        } catch (err: any) {
          setError(err.message || (lang === 'de' ? 'Zugriff abgelaufen oder ungültig' : 'Acceso de invitado no válido o revocado'));
        } finally {
          setLoading(false);
        }
        return;
      }

      // SITUACIÓN A: Invitado nuevo (tiene TokenInvitacion sin utilizar)
      if (token) {
        try {
          const info = await backendService.consultarInvitacion(token);
          setInvitationInfo(info);

          if (!info.valida) {
            setError(info.error || t.guestInvalidToken);
          } else if (info.registrado) {
            const invitadoIdToUse = info.invitado_id || info.InvitadoID || token;
            const secretoToUse = getOrCreateSecretoDispositivo(String(invitadoIdToUse));

            setInvitadoId(String(invitadoIdToUse));
            localStorage.setItem('wm_guest_invitado_id', String(invitadoIdToUse));
            localStorage.setItem('wm_guest_secreto', secretoToUse);

            await fetchGuestQr(String(invitadoIdToUse), secretoToUse);
            setRegisteredName(info.nombre_invitado || storedNombre || 'Invitado');
          } else {
            setRegisteredQR(null);
          }
        } catch (err: any) {
          setError(err.message || t.guestInvalidToken);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
        setError(
          t.activateFirst ||
            (lang === 'de'
              ? 'Bitte aktivieren Sie Ihre Einladung zuerst über den per WhatsApp erhaltenen Link.'
              : 'Activa primero tu invitación mediante el enlace recibido por WhatsApp.')
        );
      }
    };

    initGuest();
  }, [token, lang]);

  // QR automatic renewal every 25 seconds and on visibility/focus changes
  const invitadoIdRef = useRef(invitadoId);
  invitadoIdRef.current = invitadoId;

  useEffect(() => {
    if (!registeredQR) return;

    const interval = setInterval(() => {
      const id = invitadoIdRef.current || localStorage.getItem('wm_guest_invitado_id');
      const sec = localStorage.getItem('wm_guest_secreto');
      if (id && sec) {
        fetchGuestQr(id, sec);
      }
    }, 25000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const id = invitadoIdRef.current || localStorage.getItem('wm_guest_invitado_id');
        const sec = localStorage.getItem('wm_guest_secreto');
        if (id && sec) {
          fetchGuestQr(id, sec);
        }
      }
    };

    const handleFocus = () => {
      const id = invitadoIdRef.current || localStorage.getItem('wm_guest_invitado_id');
      const sec = localStorage.getItem('wm_guest_secreto');
      if (id && sec) {
        fetchGuestQr(id, sec);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [registeredQR]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || !token) return;

    setSubmitting(true);
    setError(null);

    try {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const secreto = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');

      const res = await backendService.activarInvitado(token, guestName.trim(), secreto);
      if (!res.ok) {
        const errStr = res.error || '';
        if (errStr.includes('otro dispositivo') || errStr.includes('dispositivo') || errStr.includes('ocupado') || errStr.includes('vinculado')) {
          throw new Error(
            lang === 'de'
              ? 'Diese Einladung wurde bereits auf einem anderen Gerät aktiviert.'
              : 'Esta invitación ya fue activada en otro dispositivo o teléfono.'
          );
        }
        throw new Error(errStr || (lang === 'de' ? 'Registrierung fehlgeschlagen' : 'No se pudo completar el registro'));
      }

      const newInvitadoId = res.invitado_id || res.InvitadoID || res.id || token;
      setInvitadoId(String(newInvitadoId));
      localStorage.setItem('wm_guest_invitado_id', String(newInvitadoId));
      localStorage.setItem('wm_guest_secreto', secreto);
      localStorage.setItem('wm_guest_nombre', guestName.trim());
      setRegisteredName(guestName.trim());

      await fetchGuestQr(String(newInvitadoId), secreto);
    } catch (err: any) {
      setError(err.message || (lang === 'de' ? 'Fehler bei der Registrierung' : 'Error al registrar invitado'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-white">
      <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 p-6 sm:p-8 shadow-sm text-gray-900">
        {/* Loading state */}
        {loading && (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-red-700 animate-spin mx-auto mb-3" />
            <p className="text-gray-700 text-sm font-semibold">{t.loading}</p>
          </div>
        )}

        {/* Error / Invalid Token */}
        {!loading && error && !registeredQR && (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 text-red-700 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {lang === 'de' ? 'Einladungshinweis' : 'Aviso de Invitación'}
            </h3>
            <p className="text-xs text-gray-600 mb-6 leading-relaxed">
              {error}
            </p>
            <div className="space-y-2">
              <button
                onClick={onBackToHome}
                className="w-full py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold transition"
              >
                {t.back}
              </button>
              <a
                href="https://wa.me/75593587?text=Hola,%20tengo%20un%20problema%20con%20mi%20pase%20de%20invitado%20en%20el%20Weihnachtsmarkt."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5"
              >
                <span>{t.contactAdmin || 'Contactar al Administrador'}</span>
              </a>
            </div>
          </div>
        )}

        {/* Registered State with QR (Mi pase de invitado) */}
        {!loading && registeredQR && (
          <div className="text-center py-2">
            <div className="w-14 h-14 rounded-full bg-green-50 border border-green-200 text-green-700 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-red-700">
              {t.myGuestPassTitle || 'Mi pase de invitado'}
            </span>
            <h3 className="text-xl font-bold text-gray-900 mt-0.5 mb-1">
              {t.guestSuccessTitle}
            </h3>
            <p className="text-xs text-gray-600 mb-6 max-w-xs mx-auto">
              {t.guestSuccessText}
            </p>

            {/* QR Code */}
            <div className="p-4 bg-white rounded-2xl shadow-xs border border-gray-200 inline-block mb-4">
              <QRCodeSVG value={registeredQR} size={220} level="H" includeMargin={false} />
            </div>

            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 mb-6 text-xs text-gray-700 space-y-1.5 text-left">
              <div className="flex justify-between">
                <span className="text-gray-500">{t.guestName}:</span>
                <span className="font-bold text-gray-900">{registeredName}</span>
              </div>
              {invitationInfo?.stand && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{t.standNumber}:</span>
                  <span className="font-mono text-red-700 font-bold">#{invitationInfo.stand}</span>
                </div>
              )}
            </div>

            <button
              onClick={onBackToHome}
              className="w-full py-2.5 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-semibold transition shadow-sm"
            >
              {t.navHome}
            </button>
          </div>
        )}

        {/* Registration Form State */}
        {!loading && !error && !registeredQR && invitationInfo?.valida && (
          <div>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-red-50 text-red-700 border border-red-100 flex items-center justify-center mx-auto mb-3">
                <UserPlus className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                {t.guestPortalTitle}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {t.guestPortalSubtitle}
              </p>
            </div>

            {/* Stand badge info */}
            {invitationInfo.stand && (
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 mb-5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-red-700" />
                  <span className="text-gray-800 font-semibold">
                    {t.standNumber} #{invitationInfo.stand}
                  </span>
                </div>
                {invitationInfo.cliente && (
                  <span className="text-gray-500">{invitationInfo.cliente}</span>
                )}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  {t.fullName} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.guestNamePlaceholder}
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-300 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold text-xs shadow-sm transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{t.loading}</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>{t.registerGuestButton}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
