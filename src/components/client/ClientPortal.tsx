import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  CheckCircle2,
  Copy,
  KeyRound,
  MessageCircle,
  Plus,
  QrCode,
  RefreshCw,
  Share2,
  ShieldCheck,
  Store,
  Users,
} from 'lucide-react';
import { translations } from '../../i18n/translations';
import { backendService } from '../../services/backend';
import { Idioma, Invitado, MiAlquilerData } from '../../types';

interface Props {
  initialToken?: string;
  lang: Idioma;
}

export const ClientPortal: React.FC<Props> = ({ initialToken = '', lang }) => {
  const t = translations[lang];

  const [tokenInput, setTokenInput] = useState(initialToken);
  const [activeToken, setActiveToken] = useState(initialToken);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rentalData, setRentalData] = useState<MiAlquilerData | null>(null);

  // Invitation creation state
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchRental = async (token: string) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await backendService.getMiAlquiler(token);
      setRentalData(data);
    } catch (err: any) {
      setError(err.message || 'No se pudo cargar la información del stand');
      setRentalData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialToken) {
      setTokenInput(initialToken);
      setActiveToken(initialToken);
      fetchRental(initialToken);
    }
  }, [initialToken]);

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    setActiveToken(tokenInput.trim());
    fetchRental(tokenInput.trim());
  };

  const handleCreateInvitation = async () => {
    if (!activeToken) return;
    setCreatingInvite(true);
    setInviteError(null);
    try {
      const res = await backendService.crearInvitacion(activeToken);
      if (!res.ok) {
        throw new Error(res.error || 'No se pudo generar la invitación');
      }
      // Re-fetch rental data to see updated invitation list
      await fetchRental(activeToken);
    } catch (err: any) {
      setInviteError(err.message || 'Error al crear invitación');
    } finally {
      setCreatingInvite(false);
    }
  };

  const getInvitationUrl = (inviteToken: string) => {
    const origin = window.location.origin;
    return `${origin}/#invitacion?token=${encodeURIComponent(inviteToken)}`;
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const shareViaWhatsApp = (invitacion: Invitado) => {
    const inviteUrl = getInvitationUrl(invitacion.token_invitacion);
    const msg =
      lang === 'de'
        ? `Hallo! Hier ist deine Einladung zum Weihnachtsmarkt für Stand #${invitacion.stand}. Registriere dich hier, um deinen QR-Einlasscode zu erhalten: ${inviteUrl}`
        : `¡Hola! Aquí tienes tu pase de invitado para el Weihnachtsmarkt (Stand #${invitacion.stand}). Confirma tu asistencia para recibir tu código QR de acceso: ${inviteUrl}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const maxInvitados = rentalData?.max_invitados || 5;
  const invitaciones = rentalData?.invitaciones || [];
  const remainingInvites = maxInvitados - invitaciones.length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-red-700 tracking-tight">
          {t.clientPortalTitle}
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">
          {t.clientPortalSubtitle}
        </p>
      </div>

      {/* Token Input Bar if no active rental yet */}
      {!rentalData && (
        <div className="max-w-md mx-auto p-6 sm:p-8 rounded-2xl bg-white border border-gray-200 shadow-sm text-center">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-700 flex items-center justify-center mx-auto mb-4 border border-red-100">
            <KeyRound className="w-6 h-6" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">
            {t.accessPortal}
          </h3>
          <p className="text-xs text-gray-500 mb-6 leading-relaxed">
            {t.enterTokenInstructions}
          </p>

          {error && (
            <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleManualLogin} className="space-y-4">
            <input
              type="text"
              required
              placeholder={t.tokenPlaceholder}
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-300 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 font-mono"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-semibold text-xs shadow-sm transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{t.loading}</span>
                </>
              ) : (
                <span>{t.accessPortal}</span>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Active Rental Content */}
      {rentalData && (
        <div className="space-y-6">
          {/* Top Banner: Stand Info & Entry QR */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stand Info Card */}
            <div className="lg:col-span-2 p-6 sm:p-8 rounded-2xl bg-white border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-red-700">
                      {t.yourStand}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-0.5">
                      Stand #{rentalData.alquiler?.stand}
                    </h2>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-green-50 text-green-700 border border-green-200">
                    {rentalData.alquiler?.estado || t.active}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-6 text-xs">
                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200">
                    <span className="text-gray-500 block mb-1">{t.clientName}</span>
                    <span className="text-gray-900 font-bold text-sm">
                      {rentalData.alquiler?.cliente}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200">
                    <span className="text-gray-500 block mb-1">{t.phone}</span>
                    <span className="text-gray-900 font-bold text-sm font-mono">
                      {rentalData.alquiler?.telefono}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200">
                    <span className="text-gray-500 block mb-1">{t.standCategory}</span>
                    <span className="text-gray-800 font-semibold">
                      {rentalData.alquiler?.categoria || rentalData.stand_info?.categoria || 'General'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200">
                    <span className="text-gray-500 block mb-1">{t.rentalDate}</span>
                    <span className="text-gray-800 font-semibold">
                      {rentalData.alquiler?.fecha_alquiler || 'Confirmado'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                <button
                  onClick={() => fetchRental(activeToken)}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-gray-700 hover:text-red-700 font-medium"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>{t.refreshData}</span>
                </button>
              </div>
            </div>

            {/* Personal Access QR Card */}
            <div className="p-6 sm:p-8 rounded-2xl bg-white border border-gray-200 shadow-sm text-center flex flex-col items-center justify-center">
              <div className="flex items-center gap-1.5 text-red-700 font-bold text-xs uppercase tracking-wider mb-2">
                <ShieldCheck className="w-4 h-4" />
                <span>{t.personalQRTitle}</span>
              </div>
              <p className="text-xs text-gray-600 mb-4 max-w-xs">
                {t.personalQRInstructions}
              </p>

              {/* QR Code */}
              <div className="p-3 bg-white rounded-xl shadow-xs border border-gray-200 inline-block mb-3">
                <QRCodeSVG
                  value={rentalData.qr_acceso || rentalData.alquiler?.qr_cliente || activeToken}
                  size={150}
                  level="H"
                  includeMargin={false}
                />
              </div>

              <span className="text-xs font-mono text-gray-600 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
                Pase Titular • Stand #{rentalData.alquiler?.stand}
              </span>
            </div>
          </div>

          {/* Invitations Section */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-gray-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-200">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-red-700" />
                  <h3 className="text-lg font-bold text-gray-900">
                    {t.invitationsTitle}
                  </h3>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t.invitationsSubtitle}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs text-gray-500 block">{t.invitationsCount}</span>
                  <span className="text-sm font-bold text-gray-900 font-mono">
                    {invitaciones.length} / {maxInvitados}
                  </span>
                </div>

                <button
                  onClick={handleCreateInvitation}
                  disabled={remainingInvites <= 0 || creatingInvite}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white font-semibold text-xs shadow-sm transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {creatingInvite ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>{t.generateInvitation}</span>
                </button>
              </div>
            </div>

            {inviteError && (
              <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                {inviteError}
              </div>
            )}

            {invitaciones.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {invitaciones.map((inv, idx) => {
                  const isRegistered =
                    inv.estado === 'registrado' || Boolean(inv.nombre_invitado);
                  const inviteUrl = getInvitationUrl(inv.token_invitacion);

                  return (
                    <div
                      key={inv.id || inv.token_invitacion || idx}
                      className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xs font-bold text-gray-900 font-mono">
                            Pase #{idx + 1}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isRegistered
                                ? 'bg-green-100 text-green-800 border border-green-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {isRegistered ? t.confirmed : t.pending}
                          </span>
                        </div>

                        <div className="mb-3">
                          <span className="text-xs text-gray-500 block">
                            {t.guestName}:
                          </span>
                          <span className="text-xs font-semibold text-gray-900">
                            {inv.nombre_invitado || t.notRegisteredYet}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-200 flex items-center justify-between gap-2">
                        <button
                          onClick={() => copyToClipboard(inviteUrl, inv.token_invitacion)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-gray-100 text-gray-700 text-xs border border-gray-300 transition active:scale-95 shadow-xs"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>
                            {copiedId === inv.token_invitacion ? t.copied : t.copy}
                          </span>
                        </button>

                        <button
                          onClick={() => shareViaWhatsApp(inv)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs transition active:scale-95 shadow-xs"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500 text-xs">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>{lang === 'de' ? 'Noch keine Einladungen erstellt.' : 'Aún no has generado pases de invitado.'}</p>
                <p className="mt-1">
                  {lang === 'de'
                    ? 'Klicken Sie auf den Button oben, um Ihren ersten Gästepass zu erstellen.'
                    : 'Haz clic en el botón de arriba para crear tu primera invitación.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
