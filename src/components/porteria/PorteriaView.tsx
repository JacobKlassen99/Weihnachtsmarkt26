import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  KeyRound,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  StopCircle,
  Video,
  XCircle,
  ZoomIn,
} from 'lucide-react';
import { translations } from '../../i18n/translations';
import { backendService } from '../../services/backend';
import { Idioma, ScanResult, Usuario } from '../../types';

interface Props {
  sessionToken?: string;
  user?: Usuario | null;
  lang: Idioma;
  onRequireLogin: () => void;
}

export const PorteriaView: React.FC<Props> = ({
  sessionToken,
  user,
  lang,
  onRequireLogin,
}) => {
  const t = translations[lang];

  // Auth & Role check: Only ADMIN and PORTERO can operate the scanner
  const roleUpper = (user?.rol || '').toUpperCase();
  const isAuthorized = Boolean(
    sessionToken && (roleUpper === 'ADMIN' || roleUpper === 'PORTERO' || roleUpper === 'PORTAL')
  );

  const [scanning, setScanning] = useState(false);
  const [startingCamera, setStartingCamera] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Zoom management (Phase 2)
  const [zoomSupported, setZoomSupported] = useState(false);
  const [zoomRange, setZoomRange] = useState<{ min: number; max: number; step: number } | null>(null);
  const [zoomValue, setZoomValue] = useState<number>(0);

  // Cameras
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [backCameras, setBackCameras] = useState<Array<{ id: string; label: string; friendlyLabel: string }>>([]);
  const [activeCamIndex, setActiveCamIndex] = useState<number>(0);

  const qrReaderRef = useRef<Html5Qrcode | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const lastScannedCodeRef = useRef<{ code: string; time: number } | null>(null);
  const isProcessingRef = useRef(false);

  // Audio feedback using Web Audio API
  const playSound = (success: boolean) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (success) {
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      } else {
        osc.frequency.setValueAtTime(220, audioCtx.currentTime); // A3
        osc.frequency.setValueAtTime(164.81, audioCtx.currentTime + 0.15); // E3
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.45);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.45);
      }
    } catch {
      // AudioContext might be blocked until user gesture, ignore safely
    }
  };

  // Helper to extract active video track
  const getActiveVideoTrack = (): MediaStreamTrack | null => {
    if (activeStreamRef.current) {
      const tracks = activeStreamRef.current.getVideoTracks();
      if (tracks.length > 0 && tracks[0].readyState === 'live') {
        return tracks[0];
      }
    }
    const videoEl = document.querySelector('#qr-reader-container video') as HTMLVideoElement | null;
    if (videoEl && videoEl.srcObject) {
      const stream = videoEl.srcObject as MediaStream;
      const tracks = stream.getVideoTracks();
      if (tracks.length > 0) {
        activeStreamRef.current = stream;
        return tracks[0];
      }
    }
    return null;
  };

  // Initialize and apply initial zoom (Phase 2)
  const initializeZoomForTrack = async (track: MediaStreamTrack) => {
    try {
      if (typeof track.getCapabilities === 'function') {
        const capabilities = track.getCapabilities() as any;
        if (capabilities && capabilities.zoom) {
          const min = Number(capabilities.zoom.min);
          const max = Number(capabilities.zoom.max);
          const step = Number(capabilities.zoom.step) || 0.1;

          // Rule:
          // - No auto zoom
          // - Initialize at 0 if supported (e.g. min <= 0)
          // - If min > 0, use the actual real minimum supported by the device
          // - Never apply a value below the device's minimum
          let initial = min;
          if (min <= 0 && max >= 0) {
            initial = 0;
          } else {
            initial = min;
          }

          setZoomSupported(true);
          setZoomRange({ min, max, step });
          setZoomValue(initial);

          // Apply initial constraint to hardware immediately
          try {
            await track.applyConstraints({
              advanced: [{ zoom: initial } as any],
            });
          } catch (cErr) {
            console.warn('Initial zoom constraint apply failed:', cErr);
          }
          return;
        }
      }
    } catch (err) {
      console.warn('Error detecting zoom capabilities:', err);
    }

    // If device doesn't support zoom, keep controls hidden
    setZoomSupported(false);
    setZoomRange(null);
    setZoomValue(0);
  };

  // Apply manual zoom adjustment
  const handleZoomChange = async (targetVal: number) => {
    if (!zoomRange) return;
    const clamped = Math.min(Math.max(targetVal, zoomRange.min), zoomRange.max);
    setZoomValue(clamped);

    const track = getActiveVideoTrack();
    if (track && typeof track.applyConstraints === 'function') {
      try {
        await track.applyConstraints({
          advanced: [{ zoom: clamped } as any],
        });
      } catch (err) {
        console.warn('Manual zoom apply failed:', err);
      }
    }
  };

  // QR Processing logic (Phases 4 & 5)
  const handleProcessCode = async (decodedText: string) => {
    const cleanCode = String(decodedText || '').trim();
    if (!cleanCode) return;

    // Concurrency lock: ignore incoming camera frames while a scan is in progress
    if (isProcessingRef.current) return;

    // Anti-duplicate protection: Ignore identical code scanned within 3 seconds
    // Allows subsequent entries of the same QR without permanently blocking it
    const now = Date.now();
    if (
      lastScannedCodeRef.current &&
      lastScannedCodeRef.current.code === cleanCode &&
      now - lastScannedCodeRef.current.time < 3000
    ) {
      return;
    }
    lastScannedCodeRef.current = { code: cleanCode, time: now };

    if (!sessionToken) {
      const noSessionResult: ScanResult = {
        ok: false,
        autorizado: false,
        statusType: 'error',
        error: t.gateLoginRequired || 'Debes iniciar sesión para operar el escáner.',
        fecha_hora: new Date().toLocaleTimeString(),
      };
      setLastScanResult(noSessionResult);
      playSound(false);
      return;
    }

    isProcessingRef.current = true;
    setProcessing(true);

    try {
      // Send whole unmodified QR code to backend
      const result = await backendService.scan(sessionToken, cleanCode);

      setLastScanResult(result);
      playSound(result.statusType === 'authorized');
      setScanHistory((prev) => [result, ...prev.slice(0, 19)]);
    } catch (err: any) {
      // Network, server or parsing errors are classified as ERROR DE VALIDACIÓN
      const errorMsg = err?.message || 'Error de conexión con el servidor';
      const validationErrorResult: ScanResult = {
        ok: false,
        autorizado: false,
        statusType: 'error',
        error: `ERROR DE VALIDACIÓN: ${errorMsg}`,
        fecha_hora: new Date().toLocaleTimeString(),
      };
      setLastScanResult(validationErrorResult);
      playSound(false);
      setScanHistory((prev) => [validationErrorResult, ...prev.slice(0, 19)]);
    } finally {
      isProcessingRef.current = false;
      setProcessing(false);
    }
  };

  // Start Scanner (Phase 3: only manual trigger by ADMIN or PORTERO)
  const startScanner = async (specificCameraId?: string) => {
    if (startingCamera || scanning) return;
    if (!isAuthorized) {
      setCameraError(
        lang === 'de'
          ? 'Zugriff verweigert: Sie müssen als Einlasskontrolle oder Administrator angemeldet sein.'
          : 'Acceso restringido: Debes iniciar sesión con rol de Administrador o Portero.'
      );
      return;
    }

    setStartingCamera(true);
    setCameraError(null);

    // Reset zoom state on each new camera launch to avoid retaining previous zoom
    setZoomSupported(false);
    setZoomRange(null);
    setZoomValue(0);

    try {
      const elementId = 'qr-reader-container';
      if (!qrReaderRef.current) {
        qrReaderRef.current = new Html5Qrcode(elementId);
      }

      const scannerInstance = qrReaderRef.current;
      if (scannerInstance.isScanning) {
        await scannerInstance.stop().catch(() => {});
      }

      const config = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      // 1. Get available cameras
      let devices: Array<{ id: string; label: string }> = [];
      try {
        devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
        }
      } catch {
        // Permissions will be requested during start()
      }

      // 2. Filter back-facing cameras
      const backs = devices.filter((d) => {
        const label = (d.label || '').toLowerCase();
        return (
          !label.includes('front') &&
          !label.includes('user') &&
          !label.includes('selfie') &&
          !label.includes('delanteria') &&
          !label.includes('delantera')
        );
      });

      const formattedBacks = backs.map((d, index) => ({
        id: d.id,
        label: d.label,
        friendlyLabel: `Cámara trasera ${index + 1}`,
      }));
      setBackCameras(formattedBacks);

      let targetId = specificCameraId;
      if (!targetId && formattedBacks.length > 0) {
        const idx = activeCamIndex < formattedBacks.length ? activeCamIndex : 0;
        targetId = formattedBacks[idx].id;
      }

      let started = false;
      let lastErr: any = null;

      // Try target camera id first
      if (targetId) {
        try {
          await scannerInstance.start(
            targetId,
            config,
            (decodedText) => handleProcessCode(decodedText),
            () => {}
          );
          started = true;
        } catch (err) {
          lastErr = err;
        }
      }

      // Fallback: try other back cameras
      if (!started && formattedBacks.length > 0) {
        for (const cam of formattedBacks) {
          if (cam.id === targetId) continue;
          try {
            await scannerInstance.start(
              cam.id,
              config,
              (decodedText) => handleProcessCode(decodedText),
              () => {}
            );
            started = true;
            break;
          } catch (err) {
            lastErr = err;
          }
        }
      }

      // Fallback: environment facingMode
      if (!started) {
        try {
          await scannerInstance.start(
            { facingMode: 'environment' },
            config,
            (decodedText) => handleProcessCode(decodedText),
            () => {}
          );
          started = true;
        } catch (err) {
          lastErr = err;
        }
      }

      if (!started) {
        throw lastErr || new Error('No se pudo iniciar la cámara trasera.');
      }

      setScanning(true);

      // Inspect active video track for zoom capabilities once hardware starts
      setTimeout(() => {
        const track = getActiveVideoTrack();
        if (track) {
          initializeZoomForTrack(track);
        }
      }, 400);
    } catch (err: any) {
      console.error('Camera start error:', err);
      setCameraError(
        err?.message ||
          (lang === 'de'
            ? 'Kamera konnte nicht gestartet werden. Bitte Berechtigungen prüfen.'
            : 'No se pudo iniciar la cámara. Verifica los permisos del navegador.')
      );
      setScanning(false);
    } finally {
      setStartingCamera(false);
    }
  };

  const switchCamera = async () => {
    if (backCameras.length <= 1) return;
    await stopScanner();
    const nextIndex = (activeCamIndex + 1) % backCameras.length;
    setActiveCamIndex(nextIndex);
    await startScanner(backCameras[nextIndex].id);
  };

  // Complete cleanup and hardware release (Phase 3)
  const stopScanner = async () => {
    // 1. Stop scanner instance
    if (qrReaderRef.current) {
      try {
        if (qrReaderRef.current.isScanning) {
          await qrReaderRef.current.stop();
        }
      } catch (err) {
        console.warn('Error stopping html5-qrcode instance:', err);
      }
    }

    // 2. Explicitly stop all media stream tracks to shut off camera hardware light
    try {
      const videoEl = document.querySelector('#qr-reader-container video') as HTMLVideoElement | null;
      if (videoEl && videoEl.srcObject) {
        const stream = videoEl.srcObject as MediaStream;
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {}
        });
        videoEl.srcObject = null;
      }
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {}
        });
        activeStreamRef.current = null;
      }
    } catch (cleanupErr) {
      console.warn('Error stopping video tracks:', cleanupErr);
    }

    setScanning(false);
    setStartingCamera(false);
    setZoomSupported(false);
    setZoomRange(null);
    setZoomValue(0);
  };

  // Listen for external stop camera events (e.g., logout or navigation away)
  useEffect(() => {
    const handleStopCameraEvent = () => {
      stopScanner();
    };
    window.addEventListener('weihnachtsmarkt-stop-camera', handleStopCameraEvent);

    return () => {
      window.removeEventListener('weihnachtsmarkt-stop-camera', handleStopCameraEvent);
      stopScanner();
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim() || processing) return;
    handleProcessCode(manualCode);
    setManualCode('');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-28 bg-white min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-red-700 tracking-tight">
          {t.gateTitle}
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">
          {t.gateSubtitle}
        </p>
      </div>

      {/* Auth Warning if not logged in */}
      {!sessionToken && (
        <div className="p-4 mb-6 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <KeyRound className="w-6 h-6 text-amber-700 shrink-0" />
            <div>
              <span className="text-xs font-bold text-amber-900 block">
                {lang === 'de' ? 'Anmeldung erforderlich' : 'Inicio de sesión requerido'}
              </span>
              <span className="text-xs text-amber-800">
                {t.gateLoginRequired}
              </span>
            </div>
          </div>
          <button
            onClick={onRequireLogin}
            className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-bold transition active:scale-95 shrink-0 shadow-xs cursor-pointer"
          >
            {t.loginButton}
          </button>
        </div>
      )}

      {/* Role Warning if logged in with wrong role */}
      {sessionToken && !isAuthorized && (
        <div className="p-4 mb-6 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-900 text-xs shadow-xs">
          <ShieldAlert className="w-5 h-5 text-red-700 shrink-0" />
          <div>
            <span className="font-bold block">Acceso denegado</span>
            <span>
              {lang === 'de'
                ? `Ihre Rolle (${user?.rol || 'Benutzer'}) ist für die Einlasskontrolle nicht berechtigt.`
                : `Tu rol (${user?.rol || 'usuario'}) no tiene autorización para operar la portería. Se requiere ADMIN o PORTERO.`}
            </span>
          </div>
        </div>
      )}

      {/* Feedback Banner: ACCESO AUTORIZADO / ACCESO DENEGADO / ERROR DE VALIDACIÓN */}
      {lastScanResult && (
        <div
          className={`p-6 mb-6 rounded-2xl border shadow-sm transition animate-in zoom-in-95 duration-200 ${
            lastScanResult.statusType === 'authorized'
              ? 'bg-green-50 border-green-300 text-green-950'
              : lastScanResult.statusType === 'error'
              ? 'bg-amber-50 border-amber-300 text-amber-950'
              : 'bg-red-50 border-red-300 text-red-950'
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                lastScanResult.statusType === 'authorized'
                  ? 'bg-green-600 text-white'
                  : lastScanResult.statusType === 'error'
                  ? 'bg-amber-600 text-white'
                  : 'bg-red-600 text-white'
              }`}
            >
              {lastScanResult.statusType === 'authorized' ? (
                <ShieldCheck className="w-7 h-7" />
              ) : lastScanResult.statusType === 'error' ? (
                <AlertTriangle className="w-7 h-7" />
              ) : (
                <ShieldAlert className="w-7 h-7" />
              )}
            </div>

            <div className="flex-1">
              <span className="text-xs font-bold uppercase tracking-wider block opacity-90">
                {lastScanResult.statusType === 'authorized'
                  ? t.accessAuthorized
                  : lastScanResult.statusType === 'error'
                  ? (lang === 'de' ? 'VALIDIERUNGSFEHLER' : 'ERROR DE VALIDACIÓN')
                  : t.accessDenied}
              </span>

              <h2 className="text-xl font-extrabold mt-0.5">
                {lastScanResult.statusType === 'authorized'
                  ? lastScanResult.nombre || 'Acceso Autorizado'
                  : lastScanResult.statusType === 'error'
                  ? 'No se pudo verificar el acceso'
                  : 'Acceso Denegado'}
              </h2>

              {/* Authorized Details */}
              {lastScanResult.statusType === 'authorized' && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  {lastScanResult.stand && (
                    <div className="p-2.5 rounded-lg bg-white border border-green-200">
                      <span className="text-gray-500 block text-[10px]">{t.standNumber}:</span>
                      <span className="font-bold text-sm text-gray-900">#{lastScanResult.stand}</span>
                    </div>
                  )}
                  {lastScanResult.tipo && (
                    <div className="p-2.5 rounded-lg bg-white border border-green-200">
                      <span className="text-gray-500 block text-[10px]">{t.actions}:</span>
                      <span className="font-bold text-sm text-gray-900 capitalize">
                        {lastScanResult.tipo === 'cliente' ? t.typeClient : t.typeGuest}
                      </span>
                    </div>
                  )}
                  {lastScanResult.mensaje && (
                    <div className="col-span-2 p-2.5 rounded-lg bg-white/80 border border-green-200 text-green-900 font-medium">
                      {lastScanResult.mensaje}
                    </div>
                  )}
                </div>
              )}

              {/* Denied Details with real motive from server */}
              {lastScanResult.statusType === 'denied' && (
                <div className="mt-2 text-xs text-red-800 bg-white p-3 rounded-lg border border-red-200 space-y-1">
                  <div className="font-bold">Motivo del servidor:</div>
                  <div className="font-semibold">{lastScanResult.motivo || lastScanResult.error || 'Código no autorizado o fuera de fecha.'}</div>
                </div>
              )}

              {/* Validation Error Details */}
              {lastScanResult.statusType === 'error' && (
                <div className="mt-2 text-xs text-amber-900 bg-white p-3 rounded-lg border border-amber-200 space-y-2">
                  <div className="font-medium">{lastScanResult.error || 'Error de red o comunicación con el servidor.'}</div>
                  {String(lastScanResult.error).toLowerCase().includes('sesion') && (
                    <button
                      onClick={onRequireLogin}
                      className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs transition cursor-pointer"
                    >
                      {t.loginButton}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Camera Live Preview & Controls Card */}
      <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-red-700" />
            <h3 className="text-base font-bold text-gray-900">
              {lang === 'de' ? 'Kamera-Scanner' : 'Escáner de Cámara'}
            </h3>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {backCameras.length > 1 && scanning && (
              <button
                onClick={switchCamera}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
                title="Cambiar entre cámaras traseras disponibles"
              >
                <Camera className="w-4 h-4 text-red-700" />
                <span>{`Cambiar cámara (${activeCamIndex + 1}/${backCameras.length})`}</span>
              </button>
            )}

            {!scanning ? (
              <button
                onClick={() => startScanner()}
                disabled={!isAuthorized || startingCamera}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold text-xs shadow-xs transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {startingCamera ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                <span>
                  {startingCamera
                    ? (lang === 'de' ? 'Startet...' : 'Iniciando cámara...')
                    : (lang === 'de' ? 'Kamera öffnen' : 'Abrir cámara')}
                </span>
              </button>
            ) : (
              <button
                onClick={stopScanner}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-900 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
              >
                <StopCircle className="w-4 h-4 text-red-400" />
                <span>{lang === 'de' ? 'Kamera schließen' : 'Cerrar cámara'}</span>
              </button>
            )}
          </div>
        </div>

        {cameraError && (
          <div className="p-4 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="font-bold block mb-0.5">Error de cámara</span>
              <span>{cameraError}</span>
            </div>
            {isAuthorized && (
              <button
                onClick={() => startScanner()}
                className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold text-xs shrink-0 transition shadow-xs cursor-pointer"
              >
                Reintentar
              </button>
            )}
          </div>
        )}

        {/* Zoom Controls (Phase 2): Rendered ONLY when camera is active and device supports zoom */}
        {scanning && zoomSupported && zoomRange && (
          <div className="mb-4 p-3.5 rounded-xl bg-gray-50 border border-gray-200 animate-in fade-in duration-200">
            <div className="flex items-center justify-between gap-2 mb-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-gray-800">
                <ZoomIn className="w-4 h-4 text-red-700" />
                <span>{lang === 'de' ? 'Kamera-Zoom' : 'Zoom de cámara'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-red-700 bg-white px-2 py-0.5 rounded border border-gray-200 text-[11px]">
                  {zoomValue.toFixed(1)}x
                </span>
                <button
                  type="button"
                  onClick={() => handleZoomChange(zoomRange.min <= 0 && zoomRange.max >= 0 ? 0 : zoomRange.min)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 text-[11px] font-medium transition cursor-pointer"
                  title="Restablecer a zoom mínimo"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Mínimo</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleZoomChange(zoomValue - zoomRange.step)}
                disabled={zoomValue <= zoomRange.min}
                className="w-8 h-8 rounded-lg bg-white border border-gray-300 hover:bg-gray-100 flex items-center justify-center text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0 transition active:scale-95"
                title="Reducir zoom"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <input
                type="range"
                min={zoomRange.min}
                max={zoomRange.max}
                step={zoomRange.step}
                value={zoomValue}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                className="flex-1 accent-red-700 cursor-pointer h-2 bg-gray-200 rounded-lg"
              />

              <button
                type="button"
                onClick={() => handleZoomChange(zoomValue + zoomRange.step)}
                disabled={zoomValue >= zoomRange.max}
                className="w-8 h-8 rounded-lg bg-white border border-gray-300 hover:bg-gray-100 flex items-center justify-center text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0 transition active:scale-95"
                title="Aumentar zoom"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Video Mount Point with Live Checking Overlay */}
        <div className="relative">
          <div
            id="qr-reader-container"
            className={`w-full overflow-hidden rounded-xl bg-black border border-gray-300 transition min-h-[300px] ${
              scanning ? 'block' : 'hidden'
            }`}
          />

          {scanning && processing && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs rounded-xl flex flex-col items-center justify-center text-white z-20 animate-in fade-in duration-150">
              <RefreshCw className="w-10 h-10 text-red-500 animate-spin mb-3" />
              <span className="font-extrabold text-sm sm:text-base tracking-wide">
                {lang === 'de' ? 'QR-Code wird geprüft...' : 'Verificando código QR con el servidor...'}
              </span>
              <span className="text-xs text-gray-300 mt-1">
                {lang === 'de' ? 'Bitte warten' : 'Consultando estado en tiempo real'}
              </span>
            </div>
          )}
        </div>

        {!scanning && (
          <div className="text-center py-12 rounded-xl bg-gray-50 border border-dashed border-gray-300">
            <Video className="w-10 h-10 text-gray-400 mx-auto mb-2 opacity-70" />
            <p className="text-xs text-gray-600 max-w-xs mx-auto">
              {isAuthorized
                ? (lang === 'de'
                    ? 'Klicken Sie auf "Kamera öffnen", um den QR-Code-Scanner zu starten.'
                    : 'Presiona "Abrir cámara" para encender el lector de códigos QR.')
                : (lang === 'de'
                    ? 'Nur autorisierte Benutzer können die Kamera verwenden.'
                    : 'Inicia sesión con credenciales de Portero o Administrador para activar la cámara.')}
            </p>
          </div>
        )}

        {/* Manual Code Entry */}
        <div className="mt-5 pt-4 border-t border-gray-200">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder={t.manualCodePlaceholder}
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              disabled={!isAuthorized || processing}
              className="flex-1 px-4 py-2.5 rounded-lg bg-white border border-gray-300 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 font-mono disabled:bg-gray-100 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!isAuthorized || processing || !manualCode.trim()}
              className="px-4 py-2.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-semibold text-xs transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {processing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <span>{t.validateManual}</span>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Recent Scans Session Log */}
      {scanHistory.length > 0 && (
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-red-700" />
            <h3 className="text-sm font-bold text-gray-900">
              {t.recentScansTitle}
            </h3>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {scanHistory.map((scan, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
                  scan.statusType === 'authorized'
                    ? 'bg-green-50/70 border-green-200 text-green-950'
                    : scan.statusType === 'error'
                    ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                    : 'bg-red-50/70 border-red-200 text-red-950'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {scan.statusType === 'authorized' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  ) : scan.statusType === 'error' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold text-gray-900 block">
                      {scan.nombre ||
                        (scan.statusType === 'authorized'
                          ? 'Acceso Válido'
                          : scan.statusType === 'error'
                          ? 'Error de Validación'
                          : 'Acceso Denegado')}
                    </span>
                    {scan.stand ? (
                      <span className="text-[11px] text-gray-600">
                        Stand #{scan.stand} {scan.tipo ? `• ${scan.tipo}` : ''}
                      </span>
                    ) : scan.motivo || scan.error ? (
                      <span className="text-[11px] text-gray-500 line-clamp-1">
                        {scan.motivo || scan.error}
                      </span>
                    ) : null}
                  </div>
                </div>

                <span className="text-[11px] font-mono text-gray-500 shrink-0 ml-2">
                  {scan.fecha_hora}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
