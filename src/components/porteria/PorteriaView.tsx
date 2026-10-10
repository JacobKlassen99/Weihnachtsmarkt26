import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  CheckCircle2,
  Clock,
  KeyRound,
  QrCode,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  StopCircle,
  XCircle,
} from 'lucide-react';
import { translations } from '../../i18n/translations';
import { backendService } from '../../services/backend';
import { Idioma, ScanResult } from '../../types';

interface Props {
  sessionToken?: string;
  lang: Idioma;
  onRequireLogin: () => void;
}

export const PorteriaView: React.FC<Props> = ({
  sessionToken,
  lang,
  onRequireLogin,
}) => {
  const t = translations[lang];

  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const qrReaderRef = useRef<Html5Qrcode | null>(null);
  const lastScannedCodeRef = useRef<{ code: string; time: number } | null>(null);

  // Play audio beep using Web Audio API
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

  const handleProcessCode = async (decodedText: string) => {
    const cleanCode = decodedText.trim();
    if (!cleanCode) return;

    // Anti-duplicate protection: Ignore identical code scanned within 4 seconds
    const now = Date.now();
    if (
      lastScannedCodeRef.current &&
      lastScannedCodeRef.current.code === cleanCode &&
      now - lastScannedCodeRef.current.time < 4000
    ) {
      return;
    }
    lastScannedCodeRef.current = { code: cleanCode, time: now };

    if (!sessionToken) {
      setLastScanResult({
        ok: false,
        error: t.gateLoginRequired,
      });
      return;
    }

    setProcessing(true);
    try {
      const result = await backendService.scan(sessionToken, cleanCode);
      setLastScanResult(result);
      playSound(result.ok);

      setScanHistory((prev) => [
        { ...result, fecha_hora: new Date().toLocaleTimeString() },
        ...prev.slice(0, 19),
      ]);
    } catch (err: any) {
      const errResult: ScanResult = {
        ok: false,
        error: err.message || 'Error de conexión con el servidor',
        fecha_hora: new Date().toLocaleTimeString(),
      };
      setLastScanResult(errResult);
      playSound(false);
      setScanHistory((prev) => [errResult, ...prev.slice(0, 19)]);
    } finally {
      setProcessing(false);
    }
  };

  const startScanner = async () => {
    setCameraError(null);
    try {
      const elementId = 'qr-reader-container';
      if (!qrReaderRef.current) {
        qrReaderRef.current = new Html5Qrcode(elementId);
      }

      await qrReaderRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleProcessCode(decodedText);
        },
        () => {
          // ignore scan frame error
        }
      );
      setScanning(true);
    } catch (err: any) {
      console.error('Camera start error:', err);
      setCameraError(
        lang === 'de'
          ? 'Kamera konnte nicht gestartet werden. Bitte Berechtigungen prüfen.'
          : 'No se pudo iniciar la cámara. Verifica los permisos del navegador.'
      );
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (qrReaderRef.current && scanning) {
      try {
        await qrReaderRef.current.stop();
      } catch (err) {
        console.error('Error stopping camera:', err);
      }
      setScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      if (qrReaderRef.current && qrReaderRef.current.isScanning) {
        qrReaderRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
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
        <div className="p-4 mb-6 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <KeyRound className="w-5 h-5 text-amber-700 shrink-0" />
            <span className="text-xs text-amber-900 font-medium">
              {t.gateLoginRequired}
            </span>
          </div>
          <button
            onClick={onRequireLogin}
            className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-bold transition active:scale-95 shrink-0 shadow-xs"
          >
            {t.loginButton}
          </button>
        </div>
      )}

      {/* Big Scanner Feedback Banner */}
      {lastScanResult && (
        <div
          className={`p-6 mb-6 rounded-2xl border shadow-sm animate-in zoom-in-95 duration-200 ${
            lastScanResult.ok
              ? 'bg-green-50 border-green-300 text-green-950'
              : 'bg-red-50 border-red-300 text-red-950'
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                lastScanResult.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
              }`}
            >
              {lastScanResult.ok ? (
                <ShieldCheck className="w-7 h-7" />
              ) : (
                <ShieldAlert className="w-7 h-7" />
              )}
            </div>

            <div className="flex-1">
              <span className="text-xs font-bold uppercase tracking-wider block opacity-80">
                {lastScanResult.ok ? t.accessAuthorized : t.accessDenied}
              </span>
              <h2 className="text-xl font-extrabold mt-0.5">
                {lastScanResult.nombre || (lastScanResult.ok ? 'Acceso Válido' : 'Denegado')}
              </h2>

              {lastScanResult.ok ? (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-white border border-green-200">
                    <span className="text-gray-500 block text-[10px]">{t.standNumber}:</span>
                    <span className="font-bold text-sm text-gray-900">#{lastScanResult.stand}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-green-200">
                    <span className="text-gray-500 block text-[10px]">{t.actions}:</span>
                    <span className="font-bold text-sm text-gray-900 capitalize">
                      {lastScanResult.tipo === 'cliente' ? t.typeClient : t.typeGuest}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-red-700 bg-white p-2.5 rounded-lg border border-red-200">
                  {lastScanResult.error || 'Código QR no reconocido o inactivo'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Camera Live Preview & Controls */}
      <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm mb-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-red-700" />
            <h3 className="text-base font-bold text-gray-900">
              {lang === 'de' ? 'Kamera-Scanner' : 'Escáner de Cámara'}
            </h3>
          </div>

          <div>
            {!scanning ? (
              <button
                onClick={startScanner}
                disabled={!sessionToken || processing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold text-xs shadow-xs transition active:scale-95 disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
                <span>{t.cameraPermission}</span>
              </button>
            ) : (
              <button
                onClick={stopScanner}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-800 text-white font-bold text-xs shadow-xs transition active:scale-95"
              >
                <StopCircle className="w-4 h-4" />
                <span>{t.stopCamera}</span>
              </button>
            )}
          </div>
        </div>

        {cameraError && (
          <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
            {cameraError}
          </div>
        )}

        {/* Video Mount Point */}
        <div
          id="qr-reader-container"
          className={`w-full overflow-hidden rounded-xl bg-black border border-gray-300 transition ${
            scanning ? 'min-h-[280px]' : 'hidden'
          }`}
        />

        {!scanning && (
          <div className="text-center py-10 rounded-xl bg-gray-50 border border-dashed border-gray-300">
            <QrCode className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="text-xs text-gray-600 max-w-xs mx-auto">
              {t.scanningInstruction}
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
              className="flex-1 px-4 py-2.5 rounded-lg bg-white border border-gray-300 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 font-mono"
            />
            <button
              type="submit"
              disabled={!sessionToken || processing || !manualCode.trim()}
              className="px-4 py-2.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-semibold text-xs transition active:scale-95 disabled:opacity-50 shadow-xs"
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
                  scan.ok
                    ? 'bg-green-50/60 border-green-200 text-green-950'
                    : 'bg-red-50/60 border-red-200 text-red-950'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {scan.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold text-gray-900 block">
                      {scan.nombre || (scan.ok ? 'Acceso Válido' : 'Acceso Denegado')}
                    </span>
                    {scan.stand && (
                      <span className="text-[11px] text-gray-600">
                        Stand #{scan.stand} • {scan.tipo}
                      </span>
                    )}
                  </div>
                </div>

                <span className="text-[11px] font-mono text-gray-500">
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
