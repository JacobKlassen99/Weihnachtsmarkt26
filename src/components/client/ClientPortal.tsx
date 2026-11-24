import React, { useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  AlertTriangle,
  Copy,
  KeyRound,
  Plus,
  QrCode,
  RefreshCw,
  Share2,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { translations } from '../../i18n/translations';
import { backendService } from '../../services/backend';
import { Idioma, Invitado, MiAlquilerData } from '../../types';

interface Props {
  initialToken?: string;
  lang: Idioma;
  onClearTokenParam?: () => void;
}

const CLIENT_ID_KEY = 'wm_client_alquiler_id';
const CLIENT_SECRET_KEY = 'wm_client_secreto';

function safeGetStorage(key: string): string | null {
  try {
    const val = localStorage.getItem(key);
    return val && val.trim() ? val.trim() : null;
  } catch {
    return null;
  }
}

function safeSetStorage(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return localStorage.getItem(key) === value;
  } catch {
    return false;
  }
}

function getStoredClientCredentials(): { alquilerId: string; secreto: string } | null {
  const alquilerId = safeGetStorage(CLIENT_ID_KEY);
  if (!alquilerId) return null;
  // Read primary client secret; fallback read-only to legacy key if present for backward compatibility
  const secreto =
    safeGetStorage(CLIENT_SECRET_KEY) ||
    safeGetStorage(`wm_secreto_dispositivo_${alquilerId}`);
  if (!secreto) return null;
  return { alquilerId, secreto };
}

function persistClientCredentials(alquilerId: string, secreto: string): boolean {
  const savedId = safeSetStorage(CLIENT_ID_KEY, String(alquilerId).trim());
  const savedSec = safeSetStorage(CLIENT_SECRET_KEY, String(secreto).trim());
  return savedId && savedSec;
}

function extractActivationToken(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    if (trimmed.includes('://') || trimmed.startsWith('#') || trimmed.includes('?')) {
      const normalized =
        trimmed.startsWith('#') || trimmed.startsWith('?')
          ? `https://placeholder.local/${trimmed}`
          : trimmed;
      const url = new URL(normalized);
      const searchToken = url.searchParams.get('token') || url.searchParams.get('cliente');
      if (searchToken) return searchToken.trim();
      if (url.hash && url.hash.includes('?')) {
        const hashParams = new URLSearchParams(url.hash.split('?')[1]);
        const hashToken = hashParams.get('token') || hashParams.get('cliente');
        if (hashToken) return hashToken.trim();
      }
    }
  } catch {
    // Fallback to raw trimmed string
  }
  return trimmed;
}

function resolveAlquilerId(obj: any): string {
  if (!obj || typeof obj !== 'object') return '';
  const candidates = [
    obj?.alquiler?.AlquilerID,
    obj?.alquiler?.alquilerID,
    obj?.alquiler?.alquiler_id,
    obj?.alquiler?.id,
    obj?.data?.alquiler?.AlquilerID,
    obj?.data?.alquiler?.id,
    obj?.data?.AlquilerID,
    obj?.data?.alquilerID,
    obj?.data?.alquiler_id,
    obj?.data?.Alquiler_ID,
    obj?.data?.PersonaID,
    obj?.data?.id,
    obj?.AlquilerID,
    obj?.alquilerID,
    obj?.alquiler_id,
    obj?.Alquiler_ID,
    obj?.PersonaID,
    obj?.id,
  ];
  for (const val of candidates) {
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val).trim();
    }
  }
  return '';
}

function isLikelyNetworkError(err: unknown): boolean {
  const msg = String((err as any)?.message || err || '').toLowerCase();
  return (
    msg.includes('error de red') ||
    msg.includes('sin conexión') ||
    msg.includes('failed to fetch') ||
    msg.includes('load failed') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('error http 5') ||
    msg.includes('página html') ||
    msg.includes('con html') ||
    msg.includes('timeout') ||
    msg.includes('aborted')
  );
}

export const ClientPortal: React.FC<Props> = ({
  initialToken = '',
  lang,
  onClearTokenParam,
}) => {
  const t = translations[lang];

  const [tokenInput, setTokenInput] = useState(initialToken);
  const [activeToken, setActiveToken] = useState(initialToken);
  // Start loading=true (same as Mi Pase) so credential recovery completes before rendering any activation form
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasStoredRetryError, setHasStoredRetryError] = useState(false);
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [rentalData, setRentalData] = useState<MiAlquilerData | null>(null);

  // Invitation creation state
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [personaId, setPersonaId] = useState<string | null>(null);

  const [qrCodeText, setQrCodeText] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState(false);

  const personaIdRef = useRef<string | null>(null);
  const secretoRef = useRef<string | null>(null);
  const hasActiveRentalRef = useRef(false);
  const qrCodeTextRef = useRef<string | null>(null);

  personaIdRef.current = personaId;
  qrCodeTextRef.current = qrCodeText;

  const fetchQrCode = async (
    currentPersonaId: string,
    currentSecreto: string,
    isSilentRenewal: boolean = false
  ) => {
    if (!currentPersonaId || !currentSecreto) return;

    if (!isSilentRenewal) {
      setQrLoading(true);
      setQrError(false);
    }
    try {
      const qrRes = await backendService.qrDispositivo(
        'CLIENTE',
        String(currentPersonaId),
        currentSecreto
      );
      if (qrRes && qrRes.ok) {
        const qrText =
          qrRes.data?.QR || qrRes.QR || qrRes.qr_acceso || qrRes.data?.qr_acceso;
        if (qrText) {
          setQrCodeText(String(qrText));
          setQrError(false);
        } else if (!isSilentRenewal) {
          setQrError(true);
          setQrCodeText(null);
        }
      } else {
        setQrError(true);
        setQrCodeText(null);
      }
    } catch {
      // Ignore transient network hiccups on automatic background renewal (same as Mi Pase)
      if (!isSilentRenewal || !qrCodeTextRef.current) {
        setQrError(true);
        if (!qrCodeTextRef.current) {
          setQrCodeText(null);
        }
      }
    } finally {
      if (!isSilentRenewal) {
        setQrLoading(false);
      }
    }
  };

  const restoreStoredAccess = async (
    alquilerId: string,
    secreto: string,
    isManualRefresh: boolean = false
  ) => {
    const data = await backendService.getMiAlquilerDispositivo(alquilerId, secreto);
    const officialAlquilerId = resolveAlquilerId(data) || alquilerId;

    const persisted = persistClientCredentials(officialAlquilerId, secreto);
    if (!persisted) {
      setStorageBlocked(true);
    }

    personaIdRef.current = String(officialAlquilerId);
    secretoRef.current = secreto;
    hasActiveRentalRef.current = true;

    setPersonaId(String(officialAlquilerId));
    setActiveToken(String(officialAlquilerId));
    setRentalData(data);
    setError(null);
    setHasStoredRetryError(false);
    setShowManualFallback(false);

    // Strip stale activation token from URL once device credentials are verified
    onClearTokenParam?.();

    await fetchQrCode(String(officialAlquilerId), secreto, isManualRefresh);
  };

  const activateClientAccess = async (rawToken: string) => {
    const cleanToken = extractActivationToken(rawToken);
    if (!cleanToken) return;

    setActivating(true);
    setError(null);
    let activatedOnServer = false;
    try {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const secreto = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');

      // Do NOT clear existing localStorage before activarCliente succeeds (same as Mi Pase)
      const actRes = await backendService.activarCliente(cleanToken, secreto);
      if (!actRes || !actRes.ok) {
        const errStr = actRes?.error || '';
        if (
          errStr.includes('otro dispositivo') ||
          errStr.includes('dispositivo') ||
          errStr.includes('ocupado') ||
          errStr.includes('vinculado')
        ) {
          throw new Error(
            lang === 'de'
              ? 'Dieser Zugang wurde bereits auf einem anderen Gerät aktiviert. Bitte wenden Sie sich an den Administrator zum Zurücksetzen.'
              : 'Este acceso ya fue activado en otro dispositivo o teléfono. Contacta al administrador para restablecer el acceso si necesitas cambiar de teléfono.'
          );
        }
        throw new Error(
          errStr || (lang === 'de' ? 'Ungültiger Aktivierungslink' : 'Enlace de activación no válido')
        );
      }

      activatedOnServer = true;
      const activatedId = resolveAlquilerId(actRes);
      const targetId = activatedId || cleanToken;

      // Persist immediately after server activation succeeds (same as Mi Pase)
      const persistedInitial = persistClientCredentials(targetId, secreto);
      setStorageBlocked(!persistedInitial);
      secretoRef.current = secreto;

      const data = await backendService.getMiAlquilerDispositivo(targetId, secreto);
      const officialAlquilerId = resolveAlquilerId(data) || targetId;

      // Upgrade stored ID to official AlquilerID if returned inside rental data
      const persistedFinal = persistClientCredentials(officialAlquilerId, secreto);
      setStorageBlocked(!persistedFinal);

      personaIdRef.current = String(officialAlquilerId);
      secretoRef.current = secreto;
      hasActiveRentalRef.current = true;

      setPersonaId(String(officialAlquilerId));
      setActiveToken(String(officialAlquilerId));
      setRentalData(data);
      setHasStoredRetryError(false);
      setShowManualFallback(false);

      // Clean activation token from URL so reopening Safari does not return to activation link
      onClearTokenParam?.();

      await fetchQrCode(String(officialAlquilerId), secreto, false);
    } catch (err: any) {
      setError(
        err?.message ||
          (lang === 'de' ? 'Ungültiger Aktivierungslink' : 'Enlace de activación no válido')
      );
      if (activatedOnServer) {
        // Activation succeeded and device secret is saved; let user retry fetching data without re-activating
        setHasStoredRetryError(true);
        setShowManualFallback(false);
        onClearTokenParam?.();
      }
      if (!hasActiveRentalRef.current) {
        setRentalData(null);
      }
    } finally {
      setActivating(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Avoid redundant re-check right after activation/restoration clears initialToken
    if (hasActiveRentalRef.current && !initialToken) {
      return;
    }

    let cancelled = false;

    const initClient = async () => {
      const stored = getStoredClientCredentials();

      // SITUACIÓN B (PRIORIDAD): Cliente ya activado en este dispositivo.
      // Igual que Mi Pase, las credenciales guardadas se validan primero contra Google Apps Script,
      // incluso si Safari reabre la pestaña con #cliente?token=... en la URL.
      if (stored) {
        setLoading(true);
        setError(null);
        setHasStoredRetryError(false);
        setShowManualFallback(false);

        try {
          await restoreStoredAccess(stored.alquilerId, stored.secreto, false);
          if (!cancelled) {
            setLoading(false);
          }
          return;
        } catch (err: any) {
          if (cancelled) return;
          const msg =
            err?.message ||
            (lang === 'de'
              ? 'Gespeicherter Zugang konnte nicht überprüft werden'
              : 'No se pudo verificar el acceso guardado en este dispositivo');
          setError(msg);

          if (isLikelyNetworkError(err)) {
            // Keep credentials untouched and let user retry when connection returns
            setHasStoredRetryError(true);
          } else {
            // Backend explicitly rejected stored credentials (e.g. device reset or revoked rental).
            // Allow secure recovery/activation (prefill new initialToken if present).
            setHasStoredRetryError(false);
            if (initialToken) {
              setTokenInput(initialToken);
              setActiveToken(initialToken);
            }
          }
          setLoading(false);
          return;
        }
      }

      // SITUACIÓN A: Sin credenciales guardadas en este dispositivo
      if (initialToken) {
        setTokenInput(initialToken);
        setActiveToken(initialToken);
      }
      setHasStoredRetryError(false);
      setLoading(false);
    };

    initClient();

    return () => {
      cancelled = true;
    };
  }, [initialToken]);

  // QR automatic renewal every 25 seconds and on visibility/focus/pageshow (iOS Safari)
  const hasRental = Boolean(rentalData);

  useEffect(() => {
    if (!hasRental) return;

    const renewQr = () => {
      const stored = getStoredClientCredentials();
      const id = personaIdRef.current || stored?.alquilerId;
      const sec = secretoRef.current || stored?.secreto;
      if (id && sec) {
        fetchQrCode(id, sec, true);
      }
    };

    const interval = setInterval(renewQr, 25000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        renewQr();
      }
    };

    const handlePageShow = () => {
      renewQr();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', renewQr);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', renewQr);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [hasRental]);

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = extractActivationToken(tokenInput);
    if (!cleaned) return;
    setActiveToken(cleaned);
    activateClientAccess(cleaned);
  };

  const handleRetryStoredAccess = async () => {
    const stored = getStoredClientCredentials();
    if (!stored) {
      setHasStoredRetryError(false);
      setShowManualFallback(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await restoreStoredAccess(stored.alquilerId, stored.secreto, false);
    } catch (err: any) {
      setError(
        err?.message ||
          (lang === 'de'
            ? 'Gespeicherter Zugang konnte nicht überprüft werden'
            : 'No se pudo verificar el acceso guardado en este dispositivo')
      );
      setHasStoredRetryError(isLikelyNetworkError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshRental = async () => {
    const stored = getStoredClientCredentials();
    const id = personaIdRef.current || stored?.alquilerId || resolveAlquilerId(rentalData);
    const sec = secretoRef.current || stored?.secreto;
    if (!id || !sec) return;

    setRefreshing(true);
    try {
      await restoreStoredAccess(String(id), sec, true);
    } catch (err: any) {
      setInviteError(
        err?.message ||
          (lang === 'de' ? 'Fehler beim Aktualisieren der Daten' : 'Error al actualizar los datos')
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateInvitation = async () => {
    const stored = getStoredClientCredentials();
    const alquilerId = personaIdRef.current || stored?.alquilerId || resolveAlquilerId(rentalData);
    const secreto = secretoRef.current || stored?.secreto;
    if (!alquilerId || !secreto) return;

    setCreatingInvite(true);
    setInviteError(null);
    try {
      const res = await backendService.crearInvitacion(String(alquilerId), secreto);
      if (!res.ok) {
        setInviteError(
          res.error ||
            res.mensaje ||
            (lang === 'de' ? 'Fehler beim Erstellen der Einladung' : 'No se pudo generar la invitación')
        );
        return;
      }
      // Re-fetch rental data using miAlquilerDispositivo without unmounting view
      await restoreStoredAccess(String(alquilerId), secreto, true);
    } catch (err: any) {
      setInviteError(
        err.message ||
          (lang === 'de' ? 'Fehler beim Erstellen der Einladung' : 'Error al crear invitación')
      );
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

      {/* Initial Session Recovery Loading State (prevents activation form flash) */}
      {loading && !rentalData && (
        <div className="max-w-md mx-auto p-8 rounded-2xl bg-white border border-gray-200 shadow-sm text-center">
          <RefreshCw className="w-8 h-8 text-red-700 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-800">{t.checkingAccess}</p>
        </div>
      )}

      {/* Network Retry State when valid stored credentials exist */}
      {!loading && !rentalData && hasStoredRetryError && !showManualFallback && (
        <div className="max-w-md mx-auto p-6 sm:p-8 rounded-2xl bg-white border border-gray-200 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border border-amber-200">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-900">{t.errorOccurred}</h3>
          <p className="text-xs text-gray-600 leading-relaxed">{t.connectionRetryHint}</p>
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs text-left">
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={handleRetryStoredAccess}
            className="w-full py-2.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-semibold text-xs shadow-sm transition active:scale-95 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t.retry}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowManualFallback(true)}
            className="w-full py-2 rounded-lg text-xs text-gray-600 hover:text-red-700 font-medium transition"
          >
            {t.useAnotherCode}
          </button>
        </div>
      )}

      {/* Token Input Bar or Activation Options only after credential check completes */}
      {!loading && !rentalData && (!hasStoredRetryError || showManualFallback) && (
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
              {/* Primary Option: Activate directly here (browser or installed app, no installation required) */}
              <div className="p-4 rounded-xl bg-red-50/50 border border-red-200 space-y-3 text-left">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 mb-1">{t.optionBrowserTitle}</h4>
                  <p className="text-[11px] text-gray-600 leading-relaxed">{t.optionBrowserDesc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveToken(initialToken);
                    activateClientAccess(initialToken);
                  }}
                  disabled={activating}
                  className="w-full py-2.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-semibold text-xs shadow-sm transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {activating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{t.loading}</span>
                    </>
                  ) : (
                    <span>{t.activateHereButton}</span>
                  )}
                </button>
              </div>

              {/* Optional Secondary Option: Copy code if user prefers using already-installed PWA */}
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
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <div className="p-3.5 mb-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 text-[11px] leading-relaxed text-left">
                <span className="font-bold text-gray-900 block mb-1">
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
                  disabled={activating}
                  className="w-full py-2.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-semibold text-xs shadow-sm transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {activating ? (
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
          {/* Storage Blocked Notice (e.g. Private Browsing mode) */}
          {storageBlocked && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{t.storageBlockedNotice}</span>
            </div>
          )}

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
                  onClick={handleRefreshRental}
                  disabled={refreshing}
                  className="flex items-center gap-1.5 text-gray-700 hover:text-red-700 font-medium"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
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
                    size={260}
                    level="H"
                    includeMargin={true}
                    fgColor="#000000"
                    bgColor="#FFFFFF"
                  />
                </div>
              ) : (qrError || !qrCodeText) && !qrLoading ? (
                <div className="p-6 bg-gray-50 rounded-xl border border-dashed border-gray-300 inline-block mb-3 text-center w-64 h-64 flex flex-col items-center justify-center">
                  <QrCode className="w-8 h-8 text-gray-400 mb-1" />
                  <span className="text-[11px] font-medium text-gray-500 mb-3">
                    {lang === 'de' ? 'QR nicht verfügbar' : 'QR no disponible'}
                  </span>
                  <button
                    onClick={() => {
                      const stored = getStoredClientCredentials();
                      const currentPersonaId =
                        personaIdRef.current || stored?.alquilerId || resolveAlquilerId(rentalData) || activeToken;
                      const currentSecreto = secretoRef.current || stored?.secreto;
                      if (currentPersonaId && currentSecreto) {
                        fetchQrCode(String(currentPersonaId), currentSecreto, false);
                      }
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
