import React, { useEffect, useState, useRef } from 'react';
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
import { backendService, getOrCreateSecretoDispositivo } from '../../services/backend';
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

  const [personaId, setPersonaId] = useState<string | null>(null);

  const [qrCodeText, setQrCodeText] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState(false);

  const fetchQrCode = async (currentPersonaId: string) => {
    const secreto = localStorage.getItem('wm_client_secreto') || getOrCreateSecretoDispositivo(currentPersonaId);
    if (!currentPersonaId || !secreto) return;

    setQrLoading(true);
    setQrError(false);
    try {
      const qrRes = await backendService.qrDispositivo('CLIENTE', String(currentPersonaId), secreto);
      if (qrRes && qrRes.ok) {
        const qrText = qrRes.data?.QR || qrRes.QR || qrRes.qr_acceso || qrRes.data?.qr_acceso;
        if (qrText) {
          setQrCodeText(String(qrText));
          setQrError(false);
        } else {
          setQrError(true);
          setQrCodeText(null);
        }
      } else {
        setQrError(true);
        setQrCodeText(null);
      }
    } catch {
      setQrError(true);
      setQrCodeText(null);
    } finally {
      setQrLoading(false);
    }
  };

  const fetchRental = async (tokenOrId: string, shouldActivate: boolean = false) => {
    if (!tokenOrId) return;
    setLoading(true);
    setError(null);
    try {
      let alquilerId = localStorage.getItem('wm_client_alquiler_id') || '';
      let secreto = localStorage.getItem('wm_client_secreto') || '';

      if (shouldActivate) {
        // Clear previous stored device access so a fresh activation happens with the new token
        localStorage.removeItem('wm_client_alquiler_id');
        localStorage.removeItem('wm_client_secreto');
        alquilerId = '';

        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        secreto = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');

        const actRes = await backendService.activarCliente(tokenOrId, secreto);
        if (actRes && !actRes.ok) {
          const errStr = actRes.error || '';
          if (errStr.includes('otro dispositivo') || errStr.includes('dispositivo') || errStr.includes('ocupado') || errStr.includes('vinculado')) {
            throw new Error(lang === 'de' 
              ? 'Dieser Zugang wurde bereits auf einem anderen Gerät aktiviert. Bitte wenden Sie sich an den Administrator zum Zurücksetzen.'
              : 'Este acceso ya fue activado en otro dispositivo o teléfono. Contacta al administrador para restablecer el acceso si necesitas cambiar de teléfono.');
          }
          throw new Error(errStr || (lang === 'de' ? 'Ungültiger Aktivierungslink' : 'Enlace de activación no válido'));
        }
        if (actRes && actRes.ok) {
          alquilerId = actRes.AlquilerID || actRes.alquiler_id || actRes.id || actRes.data?.AlquilerID || actRes.data?.id || '';
        }
      }

      if (!alquilerId && !shouldActivate) {
        alquilerId = tokenOrId;
      }
      if (!secreto) {
        secreto = getOrCreateSecretoDispositivo(alquilerId || tokenOrId);
      }

      let data: MiAlquilerData;
      if (alquilerId && !shouldActivate) {
        data = await backendService.getMiAlquilerDispositivo(alquilerId, secreto);
      } else if (shouldActivate) {
        const targetId = alquilerId || tokenOrId;
        alquilerId = targetId;
        data = await backendService.getMiAlquilerDispositivo(alquilerId, secreto);
      } else {
        data = await backendService.getMiAlquiler(tokenOrId);
        alquilerId = data.alquiler?.AlquilerID || data.alquiler?.id || tokenOrId;
        secreto = getOrCreateSecretoDispositivo(alquilerId);
      }

      const currentPersonaId = alquilerId || data.alquiler?.AlquilerID || data.alquiler?.id || tokenOrId;
      setPersonaId(String(currentPersonaId));
      setActiveToken(tokenOrId);

      // Save both AlquilerID and SecretoDispositivo persistently together in local storage
      localStorage.setItem('wm_client_alquiler_id', String(currentPersonaId));
      localStorage.setItem('wm_client_secreto', secreto);

      setRentalData(data);
      await fetchQrCode(String(currentPersonaId));
    } catch (err: any) {
      setError(err.message || (lang === 'de' ? 'Ungültiger Aktivierungslink' : 'Enlace de activación no válido'));
      setRentalData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedAlquilerId = localStorage.getItem('wm_client_alquiler_id');
    const storedSecreto = localStorage.getItem('wm_client_secreto');

    if (initialToken) {
      setTokenInput(initialToken);
      setActiveToken(initialToken);
      // Do NOT consume or auto-activate upon opening the link; wait for user confirmation.
    } else if (storedAlquilerId && storedSecreto) {
      setActiveToken(storedAlquilerId);
      fetchRental(storedAlquilerId, false); // Subsequent open: direct fetch via miAlquilerDispositivo, NO activation
    }
  }, [initialToken]);

  // QR automatic renewal every 25 seconds and on visibility/focus changes
  const personaIdRef = useRef(personaId);
  personaIdRef.current = personaId;

  useEffect(() => {
    const interval = setInterval(() => {
      const pId = personaIdRef.current;
      if (pId) {
        fetchQrCode(pId);
      }
    }, 25000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const pId = personaIdRef.current;
        if (pId) {
          fetchQrCode(pId);
        }
      }
    };

    const handleFocus = () => {
      const pId = personaIdRef.current;
      if (pId) {
        fetchQrCode(pId);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    setActiveToken(tokenInput.trim());
    fetchRental(tokenInput.trim(), true);
  };

  const handleCreateInvitation = async () => {
    const alquilerId = personaId || localStorage.getItem('wm_client_alquiler_id') || rentalData?.alquiler?.id || rentalData?.alquiler?.AlquilerID;
    if (!alquilerId) return;
    setCreatingInvite(true);
    setInviteError(null);
    try {
      const secreto = localStorage.getItem('wm_client_secreto') || getOrCreateSecretoDispositivo(String(alquilerId));
      const res = await backendService.crearInvitacion(String(alquilerId), secreto);
      if (!res.ok) {
        setInviteError(res.error || res.mensaje || (lang === 'de' ? 'Fehler beim Erstellen der Einladung' : 'No se pudo generar la invitación'));
        return;
      }
      // Re-fetch rental data using miAlquilerDispositivo
      await fetchRental(String(alquilerId), false);
    } catch (err: any) {
      setInviteError(err.message || (lang === 'de' ? 'Fehler beim Erstellen der Einladung' : 'Error al crear invitación'));
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

      {/* Token Input Bar or Activation Options if no active rental yet */}
      {!rentalData && (
        <div className="max-w-md mx-auto p-6 sm:p-8 rounded-2xl bg-white border border-gray-200 shadow-sm">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-700 flex items-center justify-center mx-auto mb-4 border border-red-100">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">
              {initialToken ? t.activationScreenTitle : t.accessPortal}
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              {initialToken ? t.activationScreenSubtitle : t.enterTokenInstructions}
            </p>
          </div>

          {error && (
            <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              {error}
            </div>
          )}

          {initialToken ? (
            <div className="space-y-4">
              {/* Option 1: Use in installed app */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3 text-left">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 mb-1">{t.optionInstalledAppTitle}</h4>
                  <p className="text-[11px] text-gray-600 leading-relaxed">{t.optionInstalledAppDesc}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={initialToken}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-[11px] text-gray-800 font-mono select-all"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(initialToken, 'init_tok')}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white hover:bg-gray-100 text-gray-700 text-xs border border-gray-300 transition shrink-0 font-medium"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedId === 'init_tok' ? t.codeCopied : t.copyActivationCode}</span>
                  </button>
                </div>
              </div>

              {/* Option 2: Activate here */}
              <div className="p-4 rounded-xl bg-red-50/50 border border-red-200 space-y-3 text-left">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 mb-1">{t.optionBrowserTitle}</h4>
                  <p className="text-[11px] text-gray-600 leading-relaxed">{t.optionBrowserDesc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveToken(initialToken);
                    fetchRental(initialToken, true);
                  }}
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-semibold text-xs shadow-sm transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{t.loading}</span>
                    </>
                  ) : (
                    <span>{t.activateHereButton}</span>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <div className="p-3.5 mb-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed text-left">
                <span className="font-bold block mb-1">
                  {t.pwaNoteTitle}
                </span>
                {t.pwaNoteText}
              </div>

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
                    <span>{lang === 'de' ? 'Aktivierungscode eingeben' : 'Ingresar código de activación'}</span>
                  )}
                </button>
              </form>
            </div>
          )}
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
                  onClick={() => fetchRental(personaId || activeToken, false)}
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
                <span>{t.myAccessQrTitle}</span>
              </div>
              <p className="text-xs text-gray-600 mb-4 max-w-xs">
                {t.personalQRInstructions}
              </p>

              {/* QR Code */}
              {qrLoading && !qrCodeText && (
                <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 inline-block mb-3 text-center w-64 h-64 flex flex-col items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-red-700 animate-spin mb-2" />
                  <span className="text-xs font-semibold text-gray-700">
                    {t.updatingCode}
                  </span>
                </div>
              )}

              {!qrLoading && qrCodeText && !qrError ? (
                <div className="p-4 bg-white rounded-xl shadow-xs border border-gray-200 inline-block mb-3">
                  <QRCodeSVG
                    value={qrCodeText}
                    size={220}
                    level="H"
                    includeMargin={false}
                  />
                  {qrLoading && (
                    <div className="text-[10px] text-red-700 font-semibold mt-1 flex items-center justify-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>{t.updatingCode}</span>
                    </div>
                  )}
                </div>
              ) : (qrError || !qrCodeText) && !qrLoading ? (
                <div className="p-6 bg-gray-50 rounded-xl border border-dashed border-gray-300 inline-block mb-3 text-center w-64 h-64 flex flex-col items-center justify-center">
                  <QrCode className="w-8 h-8 text-gray-400 mb-1" />
                  <span className="text-[11px] font-medium text-gray-500 mb-3">
                    {lang === 'de' ? 'QR nicht verfügbar' : 'QR no disponible'}
                  </span>
                  <button
                    onClick={() => {
                      const currentPersonaId = personaId || rentalData?.alquiler?.id || rentalData?.alquiler?.AlquilerID || activeToken;
                      if (currentPersonaId) fetchQrCode(String(currentPersonaId));
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-semibold transition shadow-xs"
                  >
                    {t.retry}
                  </button>
                </div>
              ) : null}

              <div className="mt-2 text-center">
                <span className="text-sm font-bold text-gray-900 block">
                  {rentalData.alquiler?.cliente || '-'}
                </span>
                <span className="text-xs font-mono text-red-700 font-bold block mt-0.5">
                  Stand #{rentalData.alquiler?.stand}
                </span>
              </div>
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
