import React, { useEffect, useState } from 'react';
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
import { backendService } from '../../services/backend';
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

  useEffect(() => {
    const fetchInfo = async () => {
      if (!token) {
        setLoading(false);
        setError(t.guestInvalidToken);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const info = await backendService.consultarInvitacion(token);
        setInvitationInfo(info);

        if (!info.valida) {
          setError(info.error || t.guestInvalidToken);
        } else if (info.registrado) {
          // If already registered, show the QR
          setRegisteredQR(info.qr_acceso || token);
          setRegisteredName(info.nombre_invitado || 'Invitado');
        }
      } catch (err: any) {
        setError(err.message || t.guestInvalidToken);
      } finally {
        setLoading(false);
      }
    };

    fetchInfo();
  }, [token, lang]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await backendService.registrarInvitado(token, guestName.trim());
      if (!res.ok) {
        throw new Error(res.error || 'No se pudo completar el registro');
      }

      setRegisteredQR(res.qr_acceso || token);
      setRegisteredName(guestName.trim());
    } catch (err: any) {
      setError(err.message || 'Error al registrar invitado');
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
              {lang === 'de' ? 'Ungültige Einladung' : 'Invitación No Válida'}
            </h3>
            <p className="text-xs text-gray-600 mb-6 leading-relaxed">
              {error}
            </p>
            <button
              onClick={onBackToHome}
              className="w-full py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold transition"
            >
              {t.back}
            </button>
          </div>
        )}

        {/* Already or newly Registered State with QR */}
        {!loading && registeredQR && (
          <div className="text-center py-2">
            <div className="w-14 h-14 rounded-full bg-green-50 border border-green-200 text-green-700 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-red-700">
              {t.guestQRTitle}
            </span>
            <h3 className="text-xl font-bold text-gray-900 mt-0.5 mb-1">
              {t.guestSuccessTitle}
            </h3>
            <p className="text-xs text-gray-600 mb-6 max-w-xs mx-auto">
              {t.guestSuccessText}
            </p>

            {/* QR Code */}
            <div className="p-4 bg-white rounded-2xl shadow-xs border border-gray-200 inline-block mb-4">
              <QRCodeSVG value={registeredQR} size={180} level="H" includeMargin={false} />
            </div>

            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 mb-6 text-xs text-gray-700 space-y-1 text-left">
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
