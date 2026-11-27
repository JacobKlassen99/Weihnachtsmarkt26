import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  DollarSign,
  Edit2,
  Flame,
  Gamepad2,
  Gift,
  KeyRound,
  Layers,
  LayoutDashboard,
  Lock,
  LogOut,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Store,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  UtensilsCrossed,
  X,
  XCircle,
} from 'lucide-react';
import { translations } from '../../i18n/translations';
import { backendService } from '../../services/backend';
import {
  Acceso,
  AdminData,
  Alquiler,
  CategoriaStand,
  Configuracion,
  Gestion,
  Idioma,
  Invitado,
  Solicitud,
  Stand,
  Usuario,
} from '../../types';

const formatDateDisplay = (rawDate?: string): string => {
  if (!rawDate) return '-';
  const str = String(rawDate).trim();
  if (!str || str === '-') return '-';

  // Case 1: Already DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (ddmmyyyyMatch) {
    const day = ddmmyyyyMatch[1].padStart(2, '0');
    const month = ddmmyyyyMatch[2].padStart(2, '0');
    const year = ddmmyyyyMatch[3];
    return `${day}/${month}/${year}`;
  }

  // Case 2: ISO YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  const yyyymmddMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (yyyymmddMatch) {
    const year = yyyymmddMatch[1];
    const month = yyyymmddMatch[2].padStart(2, '0');
    const day = yyyymmddMatch[3].padStart(2, '0');
    return `${day}/${month}/${year}`;
  }

  // Case 3: Parse with Date object in Bolivia timezone
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    try {
      const dtfDate = new Intl.DateTimeFormat('es-BO', {
        timeZone: 'America/La_Paz',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const parts = dtfDate.formatToParts(d);
      const day = parts.find((p) => p.type === 'day')?.value || '01';
      const month = parts.find((p) => p.type === 'month')?.value || '01';
      const year = parts.find((p) => p.type === 'year')?.value || '2026';
      return `${day}/${month}/${year}`;
    } catch {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  }

  return str;
};

const formatDateTimeBolivia = (
  rawDate?: string | Date
): { date: string; time: string; full: string } => {
  if (!rawDate) return { date: '-', time: '-', full: '-' };
  const str = String(rawDate).trim();
  if (!str || str === '-') return { date: '-', time: '-', full: '-' };

  // Case A: String already has explicit date and time in DD/MM/YYYY HH:mm:ss or DD-MM-YYYY HH:mm:ss
  const ddmmyyyyWithTime = str.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})[,\sT]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/
  );
  if (ddmmyyyyWithTime) {
    const day = ddmmyyyyWithTime[1].padStart(2, '0');
    const month = ddmmyyyyWithTime[2].padStart(2, '0');
    const year = ddmmyyyyWithTime[3];
    const hour = ddmmyyyyWithTime[4].padStart(2, '0');
    const min = ddmmyyyyWithTime[5].padStart(2, '0');
    const sec = (ddmmyyyyWithTime[6] || '00').padStart(2, '0');
    const date = `${day}/${month}/${year}`;
    const time = `${hour}:${min}:${sec}`;
    return { date, time, full: `${date} — ${time}` };
  }

  // Case B: ISO string WITHOUT 'Z' and WITHOUT offset (e.g. "2026-11-23T20:39:26" or "2026-11-23 20:39:26")
  // Apps Script generated local America/La_Paz time directly! Avoid double timezone shift.
  const isoLocal = str.match(
    /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})[,\sT]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\.\d+)?$/
  );
  if (isoLocal) {
    const year = isoLocal[1];
    const month = isoLocal[2].padStart(2, '0');
    const day = isoLocal[3].padStart(2, '0');
    const hour = isoLocal[4].padStart(2, '0');
    const min = isoLocal[5].padStart(2, '0');
    const sec = (isoLocal[6] || '00').padStart(2, '0');
    const date = `${day}/${month}/${year}`;
    const time = `${hour}:${min}:${sec}`;
    return { date, time, full: `${date} — ${time}` };
  }

  // Case C: Explicit UTC ISO with 'Z' or timezone offset
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    try {
      const dtfDate = new Intl.DateTimeFormat('es-BO', {
        timeZone: 'America/La_Paz',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const dtfTime = new Intl.DateTimeFormat('es-BO', {
        timeZone: 'America/La_Paz',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      const dateParts = dtfDate.formatToParts(d);
      const day = dateParts.find((p) => p.type === 'day')?.value || '01';
      const month = dateParts.find((p) => p.type === 'month')?.value || '01';
      const year = dateParts.find((p) => p.type === 'year')?.value || '2026';

      const timeParts = dtfTime.formatToParts(d);
      const hour = timeParts.find((p) => p.type === 'hour')?.value || '00';
      const min = timeParts.find((p) => p.type === 'minute')?.value || '00';
      const sec = timeParts.find((p) => p.type === 'second')?.value || '00';

      const date = `${day}/${month}/${year}`;
      const time = `${hour}:${min}:${sec}`;
      return { date, time, full: `${date} — ${time}` };
    } catch {
      // fallback
    }
  }

  const onlyDate = formatDateDisplay(str);
  return { date: onlyDate, time: '00:00:00', full: onlyDate };
};

interface Props {
  sessionToken: string | null;
  onLoginSuccess: (token: string, user: Usuario) => void;
  onLogout: () => void;
  lang: Idioma;
  onHasUnsavedChange?: (hasUnsaved: boolean) => void;
}

type AdminTab =
  | 'dashboard'
  | 'stands'
  | 'solicitudes'
  | 'alquileres'
  | 'invitados'
  | 'accesos'
  | 'usuarios'
  | 'gestiones'
  | 'config';

export const AdminView: React.FC<Props> = ({
  sessionToken,
  onLoginSuccess,
  onLogout,
  lang,
  onHasUnsavedChange,
}) => {
  const t = translations[lang];

  // Auth state
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // Admin Data state
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  // Stand Editor Modal
  const [standModalOpen, setStandModalOpen] = useState(false);
  const [editingStand, setEditingStand] = useState<Partial<Stand>>({
    numero: '',
    categoria: 'Comida',
    precio: '100',
    estado: 'disponible',
    descripcion: '',
  });

  // User Editor Modal
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    usuario: '',
    nombre: '',
    password: '',
    rol: 'ADMIN',
  });

  // Password Modal
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [targetUserToChangePass, setTargetUserToChangePass] = useState('');
  const [targetUserIdToChangePass, setTargetUserIdToChangePass] = useState('');
  const [newPasswordValue, setNewPasswordValue] = useState('');

  // New Edition Modal (Anio: 2026-2100)
  const [editionModalOpen, setEditionModalOpen] = useState(false);
  const [newEditionForm, setNewEditionForm] = useState({
    anio: 2027,
    copiarStands: true,
  });

  // Config Form State
  const [configForm, setConfigForm] = useState<Configuracion>({
    NOMBRE_EVENTO: 'Weihnachtsmarkt',
    IDIOMA_PREDETERMINADO: 'es',
    WHATSAPP_ADMIN: '75593587',
    MONEDA: '$us',
    MAX_INVITADOS: '5',
    GESTION_ACTIVA: 'GES-2026',
    MENSAJE_WHATSAPP_ES: '',
    MENSAJE_WHATSAPP_DE: '',
  });

  const [savingConfig, setSavingConfig] = useState(false);
  const [savingStand, setSavingStand] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingEdition, setSavingEdition] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Stand Filters & Search
  const [standSearch, setStandSearch] = useState('');
  const [standCategoryFilter, setStandCategoryFilter] = useState('all');
  const [standGrillFilter, setStandGrillFilter] = useState('all');
  const [standStatusFilter, setStandStatusFilter] = useState('all');

  // Alquileres Filters & Search (Default 'activo')
  const [rentalSearch, setRentalSearch] = useState('');
  const [rentalStatusFilter, setRentalStatusFilter] = useState<'activo' | 'cancelado' | 'todos'>('activo');

  // Invitados Filters & Search
  const [guestSearch, setGuestSearch] = useState('');
  const [guestStatusFilter, setGuestStatusFilter] = useState<'todos' | 'activos' | 'pendientes' | 'revocados'>('todos');

  // Accesos Filters & Search
  const [accessSearch, setAccessSearch] = useState('');
  const [accessTypeFilter, setAccessTypeFilter] = useState<'todos' | 'cliente' | 'invitado'>('todos');
  const [accessDateFilter, setAccessDateFilter] = useState('');

  // Solicitudes Filters & Search
  const [requestSearch, setRequestSearch] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState<'todos' | 'pendiente' | 'confirmada' | 'rechazada'>('todos');

  // Helper to determine if a gestion is active without hardcoded year
  const isGestionActiva = (gest: Gestion): boolean => {
    const rawActiva = gest.activa !== undefined ? gest.activa : gest.Activa;
    if (
      rawActiva === true ||
      String(rawActiva).trim().toUpperCase() === 'SI' ||
      String(rawActiva).trim().toUpperCase() === 'TRUE'
    ) {
      return true;
    }

    const activeCfg = String(
      configForm.GESTION_ACTIVA ||
      adminData?.configuracion?.GESTION_ACTIVA ||
      ''
    ).trim();

    if (!activeCfg) return false;

    const gId = String(gest.id || gest.GestionID || '').trim();
    const gName = String(gest.nombre || gest.Nombre || '').trim();
    const gAnio = String(gest.anio || gest.Anio || '').trim();

    if (gId && gId.toLowerCase() === activeCfg.toLowerCase()) return true;
    if (gName && gName.toLowerCase() === activeCfg.toLowerCase()) return true;
    if (gAnio && gAnio.toLowerCase() === activeCfg.toLowerCase()) return true;

    return false;
  };

  // Modal error states
  const [standModalError, setStandModalError] = useState<string | null>(null);
  const [userModalError, setUserModalError] = useState<string | null>(null);
  const [passwordModalError, setPasswordModalError] = useState<string | null>(null);
  const [editionModalError, setEditionModalError] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  // Get active session token reliably
  const getActiveToken = (): string => {
    return (
      sessionToken ||
      sessionStorage.getItem('weihnachtsmarkt_admin_token') ||
      localStorage.getItem('weihnachtsmarkt_admin_token') ||
      ''
    );
  };

  const handleSessionExpired = (message?: string) => {
    const expiredMsg =
      message ||
      (lang === 'de'
        ? 'Ihre Sitzung ist abgelaufen oder ungültig. Bitte melden Sie sich erneut als Administrator an.'
        : 'Tu sesión ha expirado o no es válida. Por favor vuelve a iniciar sesión como administrador.');
    showFeedback(expiredMsg, 'error');
    setStandModalOpen(false);
    setUserModalOpen(false);
    setPasswordModalOpen(false);
    setEditionModalOpen(false);
    onLogout();
  };

  // Load Admin Data
  const loadAdminData = async (token: string, force = false): Promise<AdminData | null> => {
    setLoadingData(true);
    setDataError(null);
    try {
      const data = await backendService.getAdminData(token, force);
      setAdminData(data);
      if (data.configuracion) {
        setConfigForm(data.configuracion);
      }
      return data;
    } catch (err: any) {
      if (err.message?.includes('Sesion expirada') || err.message?.includes('expirada')) {
        handleSessionExpired(err.message);
        return null;
      }
      setDataError(err.message || 'Error al cargar datos administrativos');
      return null;
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    const token = getActiveToken();
    if (token) {
      loadAdminData(token);
    }
  }, [sessionToken]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim() || !passwordInput) return;

    setLoggingIn(true);
    setLoginError(null);

    try {
      // Do NOT modify or trim password. Send exact password entered.
      const res = await backendService.login(usernameInput.trim(), passwordInput);

      if (!res.ok) {
        throw new Error(res.error || (lang === 'de' ? 'Anmeldung fehlgeschlagen' : 'Inicio de sesión rechazado por el servidor'));
      }

      // Read data.token and data.rol from backend response {ok:true, data:{token, usuario, rol, nombre}}
      const token = res.data?.token || res.token;
      if (!token) {
        throw new Error(res.error || (lang === 'de' ? 'Kein Sitzungstoken erhalten' : 'La respuesta del servidor no incluyó el token de sesión'));
      }

      const rol = res.data?.rol || (typeof res.usuario === 'object' ? res.usuario.rol : res.rol) || 'admin';
      const usuarioNombre = res.data?.usuario || (typeof res.usuario === 'object' ? res.usuario.usuario : res.usuario) || usernameInput.trim();
      const nombreCompleto = res.data?.nombre || (typeof res.usuario === 'object' ? res.usuario.nombre : res.nombre) || usuarioNombre;

      const user: Usuario = {
        usuario: usuarioNombre,
        nombre: nombreCompleto,
        rol: rol,
        estado: 'activo',
      };

      onLoginSuccess(token, user);
      loadAdminData(token, true);
    } catch (err: any) {
      // Display the REAL error message without revealing passwords or tokens
      setLoginError(err.message || (lang === 'de' ? 'Verbindungsfehler zum Server' : 'Error de conexión con el servidor'));
    } finally {
      setLoggingIn(false);
    }
  };

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), type === 'error' ? 7000 : 4000);
  };

  // Actions
  const handleSaveStand = async (e: React.FormEvent) => {
    e.preventDefault();
    setStandModalError(null);

    const token = getActiveToken();
    if (!token) {
      handleSessionExpired('No hay sesión de administrador activa. Por favor inicia sesión.');
      return;
    }

    // Read values edited by user in form, preferring lower case user updates or falling back
    const standNum = String(editingStand.numero !== undefined && editingStand.numero !== '' ? editingStand.numero : (editingStand.Numero || '')).trim();
    if (!standNum) {
      setStandModalError(lang === 'de' ? 'Standnummer ist erforderlich' : 'El número de stand es obligatorio');
      return;
    }

    // Check duplicate stand number
    const standId = editingStand.StandID || editingStand.id;
    if (
      adminData?.stands?.some(
        (s) =>
          String(s.numero !== undefined ? s.numero : s.Numero).trim() === standNum &&
          String(s.StandID || s.id || '') !== String(standId || '')
      )
    ) {
      setStandModalError(
        lang === 'de'
          ? `Ein Stand mit der Nummer #${standNum} existiert bereits`
          : `Ya existe otro stand con el número #${standNum}`
      );
      return;
    }

    const rawPrecio = editingStand.precio !== undefined && editingStand.precio !== '' ? editingStand.precio : editingStand.Precio;
    const precioVal = Number(rawPrecio);
    if (isNaN(precioVal) || precioVal < 0) {
      setStandModalError(
        lang === 'de'
          ? 'Der Preis muss eine gültige Zahl größer oder gleich 0 sein'
          : 'El precio debe ser un número válido mayor o igual a 0'
      );
      return;
    }

    setSavingStand(true);
    try {
      const rawParrilla = editingStand.TieneParrilla !== undefined
        ? editingStand.TieneParrilla
        : editingStand.tiene_parrilla;
      const catVal = String(editingStand.categoria || editingStand.Categoria || 'Comida').trim();
      const isComida = catVal === 'Comida';
      const tieneParrillaStr = isComida
        ? (rawParrilla === 'SI' || rawParrilla === true ? 'SI' : 'NO')
        : 'NO';

      const standName = String(
        editingStand.nombre !== undefined && editingStand.nombre !== ''
          ? editingStand.nombre
          : (editingStand.Nombre || `Stand ${standNum}`)
      ).trim();

      const estVal = String(editingStand.estado || editingStand.Estado || 'disponible').trim();
      const descVal = String(
        editingStand.descripcion !== undefined ? editingStand.descripcion : (editingStand.Descripcion || '')
      ).trim();

      const standToSave: Partial<Stand> = {
        StandID: standId || undefined,
        Numero: standNum,
        numero: standNum,
        Nombre: standName,
        nombre: standName,
        Categoria: catVal as CategoriaStand,
        categoria: catVal as CategoriaStand,
        TieneParrilla: tieneParrillaStr,
        tiene_parrilla: tieneParrillaStr === 'SI',
        Precio: precioVal,
        precio: precioVal,
        Estado: estVal,
        estado: estVal,
        PosicionX: Number(editingStand.PosicionX ?? editingStand.posicion_x ?? 0),
        PosicionY: Number(editingStand.PosicionY ?? editingStand.posicion_y ?? 0),
        Ancho: Number(editingStand.Ancho ?? editingStand.ancho ?? 1),
        Alto: Number(editingStand.Alto ?? editingStand.alto ?? 1),
        Descripcion: descVal,
        descripcion: descVal,
      };

      const res = await backendService.saveStand(token, standToSave);
      if (!res.ok) {
        if (res.error && (res.error.includes('expirada') || res.error.includes('Sesion'))) {
          handleSessionExpired(res.error);
          return;
        }
        let errorMsg = res.error || (lang === 'de' ? 'Fehler beim Speichern des Stands' : 'Error al guardar stand en Google Sheets');
        if (errorMsg.includes('Numero requerido')) {
          errorMsg = lang === 'de'
            ? 'Das Feld Standnummer ist erforderlich'
            : 'El número de stand es requerido por Google Apps Script';
        }
        throw new Error(errorMsg);
      }

      setStandModalOpen(false);
      setStandModalError(null);

      // Verify that values were updated in Google Sheets by querying real backend
      const updatedData = await loadAdminData(token, true);
      if (updatedData && Array.isArray(updatedData.stands)) {
        const savedStand = updatedData.stands.find(
          (s) => (standId && String(s.StandID || s.id || '') === String(standId)) || String(s.Numero || s.numero || '') === String(standNum)
        );

        if (savedStand) {
          const savedPrice = Number(savedStand.Precio !== undefined ? savedStand.Precio : savedStand.precio);
          const savedCat = String(savedStand.Categoria || savedStand.categoria || '');
          const savedNum = String(savedStand.Numero !== undefined ? savedStand.Numero : savedStand.numero);

          if (savedPrice !== precioVal || savedCat !== catVal || savedNum !== standNum) {
            showFeedback(
              lang === 'de'
                ? 'Achtung: Der Server meldete Erfolg, aber die in Google Sheets reflektierten Daten stimmen nicht mit den gespeicherten Werten überein.'
                : 'Atención: El servidor respondió éxito, pero los datos reflejados en Google Sheets no coinciden con los valores guardados.',
              'error'
            );
            return;
          }
        }
      }

      showFeedback(lang === 'de' ? 'Stand erfolgreich in Google Sheets gespeichert' : 'Stand guardado con éxito en Google Sheets', 'success');
    } catch (err: any) {
      const msg = err.message || (lang === 'de' ? 'Fehler beim Speichern des Stands' : 'Error al guardar stand');
      if (msg.includes('expirada') || msg.includes('Sesion') || msg.includes('no autorizada')) {
        handleSessionExpired(msg);
        return;
      }
      setStandModalError(msg);
      showFeedback(msg, 'error');
    } finally {
      setSavingStand(false);
    }
  };

  const openEditStandModal = (stand: Stand) => {
    setStandModalError(null);
    const rawParrilla = stand.TieneParrilla !== undefined ? stand.TieneParrilla : (stand.tiene_parrilla !== undefined ? stand.tiene_parrilla : stand.parrilla);
    const numVal = Number(stand.Numero !== undefined ? stand.Numero : stand.numero);
    const defaultGrill = [6, 8, 11, 14, 15].includes(numVal);
    const hasParrilla = rawParrilla !== undefined && rawParrilla !== ''
      ? String(rawParrilla).trim().toUpperCase() === 'SI' || String(rawParrilla).trim().toUpperCase() === 'TRUE' || rawParrilla === true
      : defaultGrill;

    setEditingStand({
      ...stand,
      id: stand.id || stand.StandID,
      StandID: stand.StandID || stand.id,
      numero: stand.Numero !== undefined ? stand.Numero : (stand.numero ?? ''),
      Numero: stand.Numero !== undefined ? stand.Numero : (stand.numero ?? ''),
      nombre: stand.Nombre || stand.nombre || '',
      Nombre: stand.Nombre || stand.nombre || '',
      categoria: stand.Categoria || stand.categoria || 'Comida',
      Categoria: stand.Categoria || stand.categoria || 'Comida',
      TieneParrilla: hasParrilla ? 'SI' : 'NO',
      tiene_parrilla: hasParrilla,
      precio: stand.Precio !== undefined ? stand.Precio : (stand.precio ?? 100),
      Precio: stand.Precio !== undefined ? stand.Precio : (stand.precio ?? 100),
      estado: String(stand.Estado || stand.estado || 'disponible').toLowerCase(),
      Estado: String(stand.Estado || stand.estado || 'DISPONIBLE').toUpperCase(),
      descripcion: stand.Descripcion || stand.descripcion || '',
      Descripcion: stand.Descripcion || stand.descripcion || '',
      PosicionX: stand.PosicionX !== undefined ? stand.PosicionX : (stand.posicion_x ?? 0),
      PosicionY: stand.PosicionY !== undefined ? stand.PosicionY : (stand.posicion_y ?? 0),
      Ancho: stand.Ancho !== undefined ? stand.Ancho : (stand.ancho ?? 1),
      Alto: stand.Alto !== undefined ? stand.Alto : (stand.alto ?? 1),
    });
    setStandModalOpen(true);
  };

  const handleConfirmRental = async (solicitud: Solicitud) => {
    const token = getActiveToken();
    if (!token) {
      handleSessionExpired();
      return;
    }
    const confirmMsg = t.confirmRentalPrompt.replace('{name}', solicitud.nombre);
    if (!window.confirm(confirmMsg)) return;

    setActionInProgress(solicitud.id);
    try {
      const res = await backendService.confirmarAlquiler(token, solicitud.id);
      if (!res.ok) {
        if (res.error && (res.error.includes('expirada') || res.error.includes('Sesion'))) {
          handleSessionExpired(res.error);
          return;
        }
        throw new Error(res.error || 'Error al confirmar alquiler en Google Sheets');
      }
      showFeedback('Alquiler confirmado con éxito en Google Sheets', 'success');
      await loadAdminData(token, true);
    } catch (err: any) {
      const msg = err.message || 'Error al confirmar alquiler';
      if (msg.includes('expirada') || msg.includes('Sesion') || msg.includes('no autorizada')) {
        handleSessionExpired(msg);
        return;
      }
      showFeedback(msg, 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRejectRequest = async (solicitudId: string) => {
    const token = getActiveToken();
    if (!token) {
      handleSessionExpired();
      return;
    }
    if (!window.confirm(t.rejectRequestPrompt)) return;

    setActionInProgress(solicitudId);
    try {
      const res = await backendService.rechazarSolicitud(token, solicitudId);
      if (!res.ok) {
        if (res.error && (res.error.includes('expirada') || res.error.includes('Sesion'))) {
          handleSessionExpired(res.error);
          return;
        }
        throw new Error(res.error || 'Error al rechazar solicitud en Google Sheets');
      }
      showFeedback('Solicitud rechazada con éxito en Google Sheets', 'success');
      await loadAdminData(token, true);
    } catch (err: any) {
      const msg = err.message || 'Error al rechazar solicitud';
      if (msg.includes('expirada') || msg.includes('Sesion') || msg.includes('no autorizada')) {
        handleSessionExpired(msg);
        return;
      }
      showFeedback(msg, 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCancelRental = async (alquilerId: string) => {
    const token = getActiveToken();
    if (!token) {
      handleSessionExpired();
      return;
    }
    if (!window.confirm(t.cancelRentalPrompt)) return;

    setActionInProgress(alquilerId);
    try {
      const res = await backendService.cancelarAlquiler(token, alquilerId);
      if (!res.ok) {
        if (res.error && (res.error.includes('expirada') || res.error.includes('Sesion'))) {
          handleSessionExpired(res.error);
          return;
        }
        throw new Error(res.error || 'Error al cancelar alquiler en Google Sheets');
      }
      showFeedback('Alquiler cancelado con éxito en Google Sheets', 'success');
      await loadAdminData(token, true);
    } catch (err: any) {
      const msg = err.message || 'Error al cancelar alquiler';
      if (msg.includes('expirada') || msg.includes('Sesion') || msg.includes('no autorizada')) {
        handleSessionExpired(msg);
        return;
      }
      showFeedback(msg, 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRevokeGuest = async (invitadoId: string) => {
    const token = getActiveToken();
    if (!token) {
      handleSessionExpired();
      return;
    }
    if (!window.confirm(t.revokePrompt)) return;

    setActionInProgress(invitadoId);
    try {
      const res = await backendService.revocarInvitado(token, invitadoId);
      if (!res.ok) {
        if (res.error && (res.error.includes('expirada') || res.error.includes('Sesion'))) {
          handleSessionExpired(res.error);
          return;
        }
        throw new Error(res.error || 'Error al revocar invitado en Google Sheets');
      }
      showFeedback('Invitación revocada con éxito en Google Sheets', 'success');
      await loadAdminData(token, true);
    } catch (err: any) {
      const msg = err.message || 'Error al revocar invitado';
      if (msg.includes('expirada') || msg.includes('Sesion') || msg.includes('no autorizada')) {
        handleSessionExpired(msg);
        return;
      }
      showFeedback(msg, 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserModalError(null);

    const token = getActiveToken();
    if (!token) {
      handleSessionExpired('No hay sesión de administrador activa. Por favor inicia sesión.');
      return;
    }

    const usernameClean = newUserForm.usuario.trim();
    const nombreClean = newUserForm.nombre.trim();
    const passwordClean = newUserForm.password;

    if (!usernameClean) {
      setUserModalError(lang === 'de' ? 'Benutzername ist erforderlich' : 'El nombre de usuario es obligatorio');
      return;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(usernameClean)) {
      setUserModalError(
        lang === 'de'
          ? 'Der Benutzername darf nur Buchstaben, Zahlen, Punkte, Bindestriche und Unterstriche enthalten'
          : 'El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos (sin espacios)'
      );
      return;
    }
    if (!nombreClean) {
      setUserModalError(lang === 'de' ? 'Vollständiger Name ist erforderlich' : 'El nombre completo es obligatorio');
      return;
    }
    if (!passwordClean) {
      setUserModalError(lang === 'de' ? 'Passwort ist erforderlich' : 'La contraseña es obligatoria');
      return;
    }
    if (passwordClean.length < 12) {
      setUserModalError(
        lang === 'de'
          ? 'Das Passwort muss mindestens 12 Zeichen lang sein (Sicherheitsanforderung des Servers)'
          : 'La contraseña debe tener al menos 12 caracteres (requisito de seguridad del servidor)'
      );
      return;
    }

    // Check if user already exists locally in loaded admin users
    const userAlreadyExists = adminData?.usuarios?.some(
      (u) => u.usuario.trim().toLowerCase() === usernameClean.toLowerCase()
    );
    if (userAlreadyExists) {
      setUserModalError(
        lang === 'de'
          ? `Der Benutzer "${usernameClean}" existiert bereits im System`
          : `El usuario "${usernameClean}" ya existe en el sistema`
      );
      return;
    }

    const rolUpper = newUserForm.rol.toUpperCase() === 'PORTERO' ? 'PORTERO' : 'ADMIN';

    setSavingUser(true);
    try {
      const res = await backendService.crearUsuario(token, {
        usuario: usernameClean,
        nombre: nombreClean,
        password: passwordClean,
        rol: rolUpper,
      });

      if (!res.ok) {
        if (res.error && (res.error.includes('expirada') || res.error.includes('Sesion'))) {
          handleSessionExpired(res.error);
          return;
        }
        let errorMsg = res.error || (lang === 'de' ? 'Fehler beim Erstellen des Benutzers' : 'Error al crear usuario en Google Sheets');
        if (errorMsg.includes('duplicado') || errorMsg.includes('invalido')) {
          errorMsg = lang === 'de'
            ? `Der Benutzer "${usernameClean}" existiert bereits in Google Sheets oder hat ein ungültiges Format`
            : `El usuario "${usernameClean}" ya existe en Google Sheets o contiene caracteres no permitidos`;
        }
        throw new Error(errorMsg);
      }

      showFeedback(lang === 'de' ? 'Benutzer erfolgreich in Google Sheets erstellt' : 'Usuario creado con éxito en Google Sheets', 'success');
      setUserModalOpen(false);
      setUserModalError(null);
      setNewUserForm({ usuario: '', nombre: '', password: '', rol: 'ADMIN' });
      await loadAdminData(token, true);
    } catch (err: any) {
      const msg = err.message || (lang === 'de' ? 'Fehler beim Erstellen des Benutzers' : 'Error al crear usuario');
      if (msg.includes('expirada') || msg.includes('Sesion') || msg.includes('no autorizada')) {
        handleSessionExpired(msg);
        return;
      }
      setUserModalError(msg);
      showFeedback(msg, 'error');
    } finally {
      setSavingUser(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordModalError(null);

    const token = getActiveToken();
    if (!token) {
      handleSessionExpired('No hay sesión de administrador activa. Por favor inicia sesión.');
      return;
    }

    const targetUserId = targetUserIdToChangePass || targetUserToChangePass;
    if (!targetUserId) {
      setPasswordModalError('Usuario no especificado');
      return;
    }

    if (!newPasswordValue || newPasswordValue.length < 12) {
      setPasswordModalError(
        lang === 'de'
          ? 'Das Passwort muss mindestens 12 Zeichen lang sein (Serveranforderung)'
          : 'La nueva contraseña debe tener al menos 12 caracteres (requisito de seguridad del servidor)'
      );
      return;
    }

    setSavingPassword(true);
    try {
      const res = await backendService.cambiarPassword(
        token,
        targetUserId,
        newPasswordValue
      );
      if (!res.ok) {
        if (res.error && (res.error.includes('expirada') || res.error.includes('Sesion'))) {
          handleSessionExpired(res.error);
          return;
        }
        throw new Error(res.error || (lang === 'de' ? 'Fehler beim Ändern des Passworts' : 'Error al cambiar contraseña en Google Sheets'));
      }
      showFeedback(lang === 'de' ? 'Passwort erfolgreich in Google Sheets geändert' : 'Contraseña actualizada con éxito en Google Sheets', 'success');
      setPasswordModalOpen(false);
      setPasswordModalError(null);
      setNewPasswordValue('');
      await loadAdminData(token, true);
    } catch (err: any) {
      const msg = err.message || (lang === 'de' ? 'Fehler beim Ändern des Passworts' : 'Error al cambiar contraseña');
      if (msg.includes('expirada') || msg.includes('Sesion') || msg.includes('no autorizada')) {
        handleSessionExpired(msg);
        return;
      }
      setPasswordModalError(msg);
      showFeedback(msg, 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleToggleUserStatus = async (user: Usuario) => {
    const token = getActiveToken();
    if (!token) {
      handleSessionExpired();
      return;
    }

    const userId = user.UsuarioID || user.id || (user as any).ID || user.usuario;
    const isActivo = user.Activo === 'SI' || user.activo === 'SI' || user.estado === 'activo' || (user.activo as any) === true;
    const nextActivo: 'SI' | 'NO' = isActivo ? 'NO' : 'SI';

    setActionInProgress(userId);
    try {
      const res = await backendService.cambiarEstadoUsuario(
        token,
        userId,
        nextActivo
      );
      if (!res.ok) {
        if (res.error && (res.error.includes('expirada') || res.error.includes('Sesion'))) {
          handleSessionExpired(res.error);
          return;
        }
        throw new Error(res.error || 'Error al cambiar estado de usuario en Google Sheets');
      }
      showFeedback(
        lang === 'de'
          ? `Benutzerstatus geändert auf ${nextActivo === 'SI' ? 'Aktiv' : 'Inaktiv'}`
          : `Estado de usuario modificado a ${nextActivo === 'SI' ? 'Activo' : 'Inactivo'} en Google Sheets`,
        'success'
      );
      await loadAdminData(token, true);
    } catch (err: any) {
      const msg = err.message || 'Error al cambiar estado';
      if (msg.includes('expirada') || msg.includes('Sesion') || msg.includes('no autorizada')) {
        handleSessionExpired(msg);
        return;
      }
      showFeedback(msg, 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCreateEdition = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditionModalError(null);

    const token = getActiveToken();
    if (!token) {
      handleSessionExpired('No hay sesión de administrador activa. Por favor inicia sesión.');
      return;
    }

    const anioVal = Number(newEditionForm.anio);
    if (!anioVal || isNaN(anioVal) || anioVal < 2026 || anioVal > 2100) {
      setEditionModalError(
        lang === 'de'
          ? 'Das Jahr muss eine Zahl zwischen 2026 und 2100 sein'
          : 'El año debe ser un número numérico entre 2026 y 2100'
      );
      return;
    }

    setSavingEdition(true);
    try {
      const res = await backendService.nuevaGestion(token, {
        anio: anioVal,
        copiarStands: newEditionForm.copiarStands,
      });
      if (!res.ok) {
        if (res.error && (res.error.includes('expirada') || res.error.includes('Sesion'))) {
          handleSessionExpired(res.error);
          return;
        }
        throw new Error(res.error || (lang === 'de' ? 'Fehler beim Erstellen der Ausgabe' : 'Error al crear gestión en Google Sheets'));
      }
      showFeedback(lang === 'de' ? 'Neue Ausgabe erfolgreich erstellt' : `Gestión ${anioVal} creada con éxito en Google Sheets`, 'success');
      setEditionModalOpen(false);
      setEditionModalError(null);
      setNewEditionForm({ anio: anioVal + 1, copiarStands: true });
      await loadAdminData(token, true);
    } catch (err: any) {
      const msg = err.message || (lang === 'de' ? 'Fehler beim Erstellen der Ausgabe' : 'Error al crear gestión');
      if (msg.includes('expirada') || msg.includes('Sesion') || msg.includes('no autorizada')) {
        handleSessionExpired(msg);
        return;
      }
      setEditionModalError(msg);
      showFeedback(msg, 'error');
    } finally {
      setSavingEdition(false);
    }
  };

  const handleActivateEdition = async (gestion: Gestion) => {
    const token = getActiveToken();
    if (!token) {
      handleSessionExpired();
      return;
    }
    const msg = t.activatePrompt.replace('{name}', gestion.nombre);
    if (!window.confirm(msg)) return;

    const gestionId = gestion.GestionID || gestion.id || gestion.nombre;
    setActionInProgress(gestionId);
    try {
      const res = await backendService.activarGestion(token, gestionId);
      if (!res.ok) {
        if (res.error && (res.error.includes('expirada') || res.error.includes('Sesion'))) {
          handleSessionExpired(res.error);
          return;
        }
        throw new Error(res.error || (lang === 'de' ? 'Fehler beim Aktivieren der Ausgabe' : 'Error al activar gestión en Google Sheets'));
      }
      showFeedback(lang === 'de' ? `Ausgabe ${gestion.nombre} erfolgreich aktiviert` : `Gestión ${gestion.nombre} activada con éxito en Google Sheets`, 'success');
      await loadAdminData(token, true);
    } catch (err: any) {
      const msg = err.message || 'Error al activar gestión';
      if (msg.includes('expirada') || msg.includes('Sesion') || msg.includes('no autorizada')) {
        handleSessionExpired(msg);
        return;
      }
      showFeedback(msg, 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigError(null);

    const token = getActiveToken();
    if (!token) {
      handleSessionExpired('No hay sesión de administrador activa. Por favor inicia sesión.');
      return;
    }

    if (!configForm.NOMBRE_EVENTO?.trim()) {
      setConfigError(lang === 'de' ? 'Der Veranstaltungsname ist erforderlich' : 'El nombre del evento es obligatorio');
      return;
    }
    if (!configForm.WHATSAPP_ADMIN?.trim()) {
      setConfigError(lang === 'de' ? 'Die WhatsApp-Nummer des Administrators ist erforderlich' : 'El número de WhatsApp del administrador es obligatorio');
      return;
    }

    setSavingConfig(true);
    try {
      const res = await backendService.setConfig(token, configForm);
      if (!res.ok) {
        if (res.error && (res.error.includes('expirada') || res.error.includes('Sesion'))) {
          handleSessionExpired(res.error);
          return;
        }
        throw new Error(res.error || (lang === 'de' ? 'Fehler beim Speichern der Einstellungen' : 'Error al guardar configuración en Google Sheets'));
      }
      showFeedback(lang === 'de' ? 'Einstellungen erfolgreich in Google Sheets gespeichert' : 'Configuración guardada con éxito en Google Sheets', 'success');
      setConfigError(null);
      await loadAdminData(token, true);
    } catch (err: any) {
      const msg = err.message || (lang === 'de' ? 'Fehler beim Speichern der Einstellungen' : 'Error al guardar configuración');
      if (msg.includes('expirada') || msg.includes('Sesion') || msg.includes('no autorizada')) {
        handleSessionExpired(msg);
        return;
      }
      setConfigError(msg);
      showFeedback(msg, 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  const getValidClientToken = async (alquiler: Alquiler): Promise<string> => {
    let clientToken = alquiler.token_cliente || (alquiler as any).TokenCliente || '';
    if (!clientToken || !String(clientToken).trim()) {
      const token = getActiveToken();
      const alquilerId = alquiler.id || (alquiler as any).AlquilerID;
      if (token && alquilerId) {
        try {
          const res = await backendService.accesoAlquilerAdmin(token, alquilerId);
          if (res.ok) {
            const data = res.data || res;
            clientToken = data.ClienteToken || data.token_cliente || data.TokenActivacion || '';
          }
        } catch {}
      }
    }
    return String(clientToken || '').trim();
  };

  const copyClientUrl = async (alquiler: Alquiler) => {
    const clientToken = await getValidClientToken(alquiler);
    if (!clientToken) {
      showFeedback(
        lang === 'de'
          ? 'Kein Aktivierungs-Token für diesen Kunden verfügbar. Bitte verwenden Sie Gerät zurücksetzen.'
          : 'No hay token de activación disponible para este alquiler. Utiliza Restablecer dispositivo.',
        'error'
      );
      return;
    }
    const origin = window.location.origin;
    const url = `${origin}/#cliente?token=${encodeURIComponent(clientToken)}`;
    navigator.clipboard.writeText(url);
    setCopiedId(alquiler.id);
    setTimeout(() => setCopiedId(null), 2500);
    showFeedback(
      lang === 'de' ? 'Link in Zwischenablage kopiert' : 'Enlace copiado al portapapeles',
      'success'
    );
  };

  const shareClientUrl = async (alquiler: Alquiler) => {
    const clientToken = await getValidClientToken(alquiler);
    if (!clientToken) {
      showFeedback(
        lang === 'de'
          ? 'Kein Aktivierungs-Token für diesen Kunden verfügbar. Bitte verwenden Sie Gerät zurücksetzen.'
          : 'No hay token de activación disponible para este alquiler. Utiliza Restablecer dispositivo.',
        'error'
      );
      return;
    }
    const origin = window.location.origin;
    const url = `${origin}/#cliente?token=${encodeURIComponent(clientToken)}`;
    const title = lang === 'de' ? 'Weihnachtsmarkt - Zugang' : 'Weihnachtsmarkt - Acceso';
    const text =
      lang === 'de'
        ? `Dein Zugang für Stand #${alquiler.stand} beim Weihnachtsmarkt:`
        : `Tu acceso para el Stand #${alquiler.stand} en el Weihnachtsmarkt:`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    navigator.clipboard.writeText(url);
    setCopiedId(alquiler.id);
    setTimeout(() => setCopiedId(null), 2500);
    showFeedback(
      lang === 'de' ? 'Link in Zwischenablage kopiert' : 'Enlace copiado al portapapeles',
      'success'
    );
  };

  const handleResetDevice = async (alquiler: Alquiler) => {
    const token = getActiveToken();
    if (!token) {
      handleSessionExpired();
      return;
    }

    const alquilerId = alquiler.id || (alquiler as any).AlquilerID;
    if (!alquilerId) {
      showFeedback('ID de alquiler no válido', 'error');
      return;
    }

    const confirmMsg =
      lang === 'de'
        ? 'Möchten Sie den Zugriff dieses Kunden zurücksetzen? Sein vorheriger Zugriff funktioniert nicht mehr und Sie müssen ihm einen neuen Link senden.'
        : '¿Quieres restablecer el acceso de este cliente? Su acceso anterior dejará de funcionar y tendrás que enviarle un nuevo enlace.';

    if (!window.confirm(confirmMsg)) return;

    setActionInProgress(alquilerId);
    try {
      const res = await backendService.resetDispositivo(token, 'CLIENTE', alquilerId);
      if (!res.ok) {
        throw new Error(res.error || 'Error al restablecer dispositivo');
      }

      const newToken =
        res.data?.TokenActivacion ||
        res.data?.token_cliente ||
        res.data?.TokenCliente ||
        res.TokenActivacion ||
        res.token_cliente ||
        '';

      if (adminData && newToken) {
        const updatedAlquileres = adminData.alquileres.map((a) =>
          a.id === alquilerId || (a as any).AlquilerID === alquilerId
            ? { ...a, token_cliente: newToken, TokenCliente: newToken }
            : a
        );
        setAdminData({ ...adminData, alquileres: updatedAlquileres });
      }

      showFeedback(
        lang === 'de' ? 'Zugang erfolgreich zurückgesetzt' : 'Acceso restablecido correctamente',
        'success'
      );

      await loadAdminData(token, true);
    } catch (err: any) {
      const msg = err.message || 'Error al restablecer dispositivo';
      if (msg.includes('expirada') || msg.includes('Sesion')) {
        handleSessionExpired(msg);
        return;
      }
      showFeedback(msg, 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  const shareRentalViaWhatsApp = async (alquiler: Alquiler) => {
    const token = getActiveToken();
    if (!token) {
      handleSessionExpired();
      return;
    }

    const alquilerId = alquiler.id || (alquiler as any).AlquilerID;
    if (!alquilerId) {
      showFeedback('ID de alquiler no válido', 'error');
      return;
    }

    setActionInProgress(alquilerId);
    try {
      const res = await backendService.accesoAlquilerAdmin(token, alquilerId);
      if (!res.ok) {
        throw new Error(res.error || 'Error al consultar acceso del alquiler');
      }

      const data = res.data || res;
      const activado = Boolean(data.activado);
      const clienteToken = data.ClienteToken || data.token_cliente || '';
      const clienteNombre = data.cliente || alquiler.cliente || '';
      const standNum = data.NumeroStand || data.stand || alquiler.stand || '';
      const phoneRaw = data.Telefono || alquiler.telefono || '';
      const phone = String(phoneRaw).replace(/\D/g, '');

      if (activado) {
        const msgActivado =
          lang === 'de'
            ? 'Dieser Kunde hat seinen Zugang bereits aktiviert. Wenn er das Telefon gewechselt hat, verwenden Sie Gerät zurücksetzen.'
            : 'Este cliente ya activó su acceso. Si cambió de teléfono, utiliza Restablecer dispositivo.';
        showFeedback(msgActivado, 'error');
        return;
      }

      if (!clienteToken || typeof clienteToken !== 'string' || !clienteToken.trim()) {
        const msgError =
          lang === 'de'
            ? 'Fehler: Kunden-Token ist leer oder nicht verfügbar.'
            : 'Error: El token de cliente está vacío o no está disponible.';
        showFeedback(msgError, 'error');
        return;
      }

      const origin = window.location.origin;
      const clientUrl = `${origin}/#cliente?token=${encodeURIComponent(clienteToken.trim())}`;
      const msg =
        lang === 'de'
          ? `Hallo ${clienteNombre}! Deine Miete für Stand #${standNum} beim Weihnachtsmarkt wurde bestätigt. Aktiviere hier deinen Zugang: ${clientUrl}`
          : `¡Hola ${clienteNombre}! Tu alquiler del Stand #${standNum} en el Weihnachtsmarkt ha sido confirmado. Activa tu acceso privado aquí: ${clientUrl}`;

      if (phone) {
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
      }
      showFeedback(lang === 'de' ? 'WhatsApp-Link erfolgreich vorbereitet' : 'Enlace de WhatsApp preparado con éxito', 'success');
    } catch (err: any) {
      const msg = err.message || 'Error al consultar acceso por WhatsApp';
      if (msg.includes('expirada') || msg.includes('Sesion')) {
        handleSessionExpired(msg);
        return;
      }
      showFeedback(msg, 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  // If NOT logged in, show Login Form
  if (!sessionToken) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-white">
        <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 p-6 sm:p-8 shadow-sm text-gray-900">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 text-red-700 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              {t.adminLoginTitle}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {t.adminLoginSubtitle}
            </p>
          </div>

          {loginError && (
            <div className="p-3 mb-5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                {t.username}
              </label>
              <input
                type="text"
                required
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="usuario"
                className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-300 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                {t.password}
              </label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-300 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700"
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-2.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold text-xs shadow-xs transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loggingIn ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{t.loggingIn}</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>{t.loginButton}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Admin Panel Layout
  const tabs = [
    { id: 'dashboard', label: t.tabDashboard, icon: LayoutDashboard },
    { id: 'stands', label: t.tabStands, icon: Store },
    { id: 'solicitudes', label: t.tabRequests, icon: Clock },
    { id: 'alquileres', label: t.tabRentals, icon: KeyRound },
    { id: 'invitados', label: t.tabGuests, icon: Users },
    { id: 'accesos', label: t.tabAccess, icon: ShieldCheck },
    { id: 'usuarios', label: t.tabUsers, icon: UserCheck },
    { id: 'gestiones', label: t.tabEditions, icon: Calendar },
    { id: 'config', label: t.tabSettings, icon: Settings },
  ] as const;

  // Stats calculation
  const totalStands = adminData?.stands?.length || 0;
  const disponibles = adminData?.stands?.filter((s) => s.estado === 'disponible').length || 0;
  const ocupados = adminData?.stands?.filter((s) => s.estado === 'ocupado').length || 0;
  const solicitudesPendientes =
    adminData?.solicitudes?.filter((s) => s.estado === 'pendiente').length || 0;
  const alquileresActivos =
    adminData?.alquileres?.filter((a) => a.estado === 'activo').length || 0;
  const totalInvitados = adminData?.invitados?.length || 0;
  const totalAccesos = adminData?.accesos?.length || 0;
  // Dynamic active edition year
  const activeGestion = adminData?.gestiones?.find((g) => isGestionActiva(g));
  const activeYear =
    activeGestion?.anio ||
    activeGestion?.Anio ||
    String(
      activeGestion?.nombre ||
      activeGestion?.Nombre ||
      adminData?.configuracion?.GESTION_ACTIVA ||
      configForm.GESTION_ACTIVA ||
      ''
    ).replace(/\D/g, '') ||
    new Date().getFullYear();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-24 bg-white text-gray-900">
      {/* Top Bar: Title, Active Year Badge, and Refresh Button on the same line */}
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5 pb-3 border-b border-gray-200">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-md border border-red-200 font-mono shrink-0">
            {activeYear}
          </span>
          <h1 className="text-lg sm:text-2xl font-extrabold text-gray-900 truncate">
            {t.navAdmin}
          </h1>
        </div>

        <button
          onClick={() => sessionToken && loadAdminData(sessionToken, true)}
          disabled={loadingData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-gray-50 text-gray-700 text-xs border border-gray-300 transition active:scale-95 disabled:opacity-50 shadow-xs shrink-0"
          title={t.refreshData}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin text-red-700' : ''}`} />
          <span>{t.refreshData}</span>
        </button>
      </div>

      {/* Global Floating Action Notification Toast (always visible above all modals) */}
      {actionMessage && (
        <div className="fixed top-5 right-5 z-[99999] max-w-sm sm:max-w-md w-full px-4 sm:px-0 pointer-events-auto">
          <div
            className={`p-4 rounded-xl border text-xs font-semibold flex items-start gap-3 shadow-2xl transition-all transform animate-in slide-in-from-top-4 duration-200 ${
              actionMessage.type === 'success'
                ? 'bg-green-50 border-green-300 text-green-900 shadow-green-950/10'
                : 'bg-red-50 border-red-300 text-red-900 shadow-red-950/10'
            }`}
          >
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 pr-2">
              <p className="font-bold text-xs">
                {actionMessage.type === 'success' ? 'Operación Exitosa' : 'Aviso del Sistema'}
              </p>
              <p className="mt-0.5 text-[11px] font-medium leading-relaxed opacity-95">
                {actionMessage.text}
              </p>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-gray-400 hover:text-gray-700 p-1 rounded-md transition"
              title="Cerrar notificación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Admin Layout: 3x3 Grid on Mobile, Vertical Sidebar on Desktop */}
      <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-8 lg:items-start">
        {/* Navigation Menu (3 Columns x 3 Rows on Phone, Vertical Sticky Sidebar on Desktop) */}
        <aside className="mb-6 lg:mb-0">
          <div className="grid grid-cols-3 lg:grid-cols-1 gap-1.5 sm:gap-2 lg:bg-gray-50/80 lg:p-3 lg:rounded-2xl lg:border lg:border-gray-200 lg:sticky lg:top-20">
            <div className="hidden lg:block pb-2 mb-1 border-b border-gray-200 px-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                {lang === 'de' ? 'Menü' : 'Menú'}
              </span>
            </div>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as AdminTab)}
                  className={`flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-2 px-1.5 py-2 lg:px-3 lg:py-2.5 rounded-xl text-[10px] sm:text-xs font-semibold transition border shadow-xs active:scale-95 text-center lg:text-left ${
                    isActive
                      ? 'bg-red-700 text-white border-red-700 font-bold'
                      : 'bg-white text-gray-700 hover:text-red-700 hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0 mb-0.5 lg:mb-0" />
                  <span className="leading-tight line-clamp-1 lg:line-clamp-none">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Admin Content Area */}
        <div className="min-w-0">
          {/* Loading Bar */}
          {loadingData && !adminData && (
            <div className="text-center py-16">
              <RefreshCw className="w-8 h-8 text-red-700 animate-spin mx-auto mb-3" />
              <p className="text-gray-700 text-xs font-semibold">{t.loading}</p>
            </div>
          )}

      {/* 1. DASHBOARD TAB */}
      {activeTab === 'dashboard' && adminData && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-xs">
              <span className="text-[11px] font-semibold text-gray-500 block mb-1">
                {t.statsStands}
              </span>
              <span className="text-2xl font-black text-gray-900 font-mono">{totalStands}</span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-xs">
              <span className="text-[11px] font-semibold text-green-700 block mb-1">
                {t.statsAvailable}
              </span>
              <span className="text-2xl font-black text-green-700 font-mono">
                {disponibles}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-xs">
              <span className="text-[11px] font-semibold text-gray-600 block mb-1">
                {t.statsOccupied}
              </span>
              <span className="text-2xl font-black text-gray-700 font-mono">{ocupados}</span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-xs">
              <span className="text-[11px] font-semibold text-red-700 block mb-1">
                {t.statsPendingRequests}
              </span>
              <span className="text-2xl font-black text-red-700 font-mono">
                {solicitudesPendientes}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-xs">
              <span className="text-[11px] font-semibold text-gray-500 block mb-1">
                {t.statsActiveRentals}
              </span>
              <span className="text-2xl font-black text-gray-900 font-mono">
                {alquileresActivos}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-xs">
              <span className="text-[11px] font-semibold text-gray-500 block mb-1">
                {t.statsGuests}
              </span>
              <span className="text-2xl font-black text-gray-900 font-mono">
                {totalInvitados}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-xs col-span-2 sm:col-span-1">
              <span className="text-[11px] font-semibold text-red-700 block mb-1">
                {t.statsEntries}
              </span>
              <span className="text-2xl font-black text-red-700 font-mono">
                {totalAccesos}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. STANDS TAB */}
      {activeTab === 'stands' && adminData && (() => {
        const sortedStands = (adminData.stands || [])
          .slice()
          .sort((a, b) => {
            const numA = Number(a.Numero !== undefined ? a.Numero : a.numero) || 0;
            const numB = Number(b.Numero !== undefined ? b.Numero : b.numero) || 0;
            return numA - numB;
          });

        const filteredStands = sortedStands.filter((s) => {
          const num = String(s.Numero !== undefined ? s.Numero : (s.numero ?? '')).toLowerCase();
          const nom = String(s.Nombre || s.nombre || '').toLowerCase();
          const q = standSearch.trim().toLowerCase();
          if (q && !num.includes(q) && !nom.includes(q)) return false;

          const cat = String(s.Categoria || s.categoria || 'Comida').toLowerCase();
          if (standCategoryFilter !== 'all' && cat !== standCategoryFilter.toLowerCase()) return false;

          const rawParrilla = s.TieneParrilla !== undefined ? s.TieneParrilla : s.tiene_parrilla;
          const numVal = Number(s.Numero !== undefined ? s.Numero : s.numero);
          const defaultGrill = [6, 8, 11, 14, 15].includes(numVal);
          const hasParrilla = rawParrilla !== undefined && rawParrilla !== ''
            ? String(rawParrilla).trim().toUpperCase() === 'SI' || String(rawParrilla).trim().toUpperCase() === 'TRUE' || rawParrilla === true
            : defaultGrill;

          if (standGrillFilter === 'con_parrilla' && !hasParrilla) return false;
          if (standGrillFilter === 'sin_parrilla' && hasParrilla) return false;

          const st = String(s.Estado || s.estado || 'disponible').toLowerCase();
          if (standStatusFilter !== 'all') {
            if (standStatusFilter === 'disponible' && st !== 'disponible') return false;
            if (standStatusFilter === 'ocupado' && st !== 'ocupado' && st !== 'alquilado') return false;
            if (standStatusFilter === 'reservado' && st !== 'reservado') return false;
          }

          return true;
        });

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">{t.tabStands}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                  {filteredStands.length} / {adminData.stands.length}
                </span>
              </div>
              <button
                onClick={() => {
                  setStandModalError(null);
                  setEditingStand({
                    numero: '',
                    nombre: '',
                    categoria: 'Comida',
                    TieneParrilla: 'NO',
                    tiene_parrilla: false,
                    precio: '100',
                    estado: 'disponible',
                    descripcion: '',
                  });
                  setStandModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-semibold text-xs transition active:scale-95 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.newStand}</span>
              </button>
            </div>

            {/* Search and Filters Bar */}
            <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-xs space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={standSearch}
                  onChange={(e) => setStandSearch(e.target.value)}
                  placeholder={t.searchStandsPlaceholder || 'Buscar por número o nombre de stand...'}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-red-700"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Category Filter */}
                <select
                  value={standCategoryFilter}
                  onChange={(e) => setStandCategoryFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-700 font-medium focus:outline-none focus:border-red-700"
                >
                  <option value="all">{t.filterAll || 'Todas las categorías'}</option>
                  <option value="Comida">{t.categoryComida || 'Comida'}</option>
                  <option value="Artesanal">{t.categoryArtesanal || 'Artesanal'}</option>
                  <option value="Games">{t.categoryGames || 'Games'}</option>
                </select>

                {/* Grill Filter (applicable for Comida or All) */}
                {(standCategoryFilter === 'all' || standCategoryFilter.toLowerCase() === 'comida') && (
                  <select
                    value={standGrillFilter}
                    onChange={(e) => setStandGrillFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-700 font-medium focus:outline-none focus:border-red-700"
                  >
                    <option value="all">Parrilla: {t.filterGrillAll || 'Todos'}</option>
                    <option value="con_parrilla">{t.filterWithGrill || 'Con parrilla'}</option>
                    <option value="sin_parrilla">{t.filterWithoutGrill || 'Sin parrilla'}</option>
                  </select>
                )}

                {/* Status Filter */}
                <select
                  value={standStatusFilter}
                  onChange={(e) => setStandStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-700 font-medium focus:outline-none focus:border-red-700"
                >
                  <option value="all">Estado: {t.filterAll || 'Todos'}</option>
                  <option value="disponible">{t.available || 'Disponible'}</option>
                  <option value="ocupado">{t.occupied || 'Ocupado / Alquilado'}</option>
                </select>
              </div>
            </div>

            {/* MOBILE COMPACT LIST (ZERO HORIZONTAL SCROLL) */}
            <div className="md:hidden divide-y divide-gray-100 rounded-xl bg-white border border-gray-200 shadow-xs overflow-hidden">
              {filteredStands.map((stand) => {
                const num = stand.Numero !== undefined ? stand.Numero : stand.numero;
                const rawParrilla = stand.TieneParrilla !== undefined ? stand.TieneParrilla : (stand.tiene_parrilla !== undefined ? stand.tiene_parrilla : stand.parrilla);
                const numVal = Number(num);
                const defaultGrill = [6, 8, 11, 14, 15].includes(numVal);
                const hasParrilla = rawParrilla !== undefined && rawParrilla !== ''
                  ? String(rawParrilla).trim().toUpperCase() === 'SI' || String(rawParrilla).trim().toUpperCase() === 'TRUE' || rawParrilla === true
                  : defaultGrill;
                const cat = stand.Categoria || stand.categoria || 'Comida';
                const isComida = cat.toLowerCase() === 'comida';

                // Category colors
                let catBadgeClass = 'bg-yellow-100 text-yellow-800 border-yellow-300';
                if (isComida) {
                  catBadgeClass = hasParrilla
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-sky-100 text-sky-800 border-sky-300';
                } else if (cat.toLowerCase() === 'games') {
                  catBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                }

                const isDisp = (stand.Estado || stand.estado || 'disponible').toLowerCase() === 'disponible';

                return (
                  <div
                    key={stand.id || num}
                    className="p-3 flex items-center justify-between gap-2.5 hover:bg-gray-50/80 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="font-mono font-bold text-red-700 text-sm">#{num}</span>
                        {stand.nombre && (
                          <span className="font-bold text-xs text-gray-900 truncate max-w-[130px]">
                            {stand.nombre}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${catBadgeClass}`}>
                          {cat}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            isDisp
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}
                        >
                          {stand.Estado || stand.estado}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-gray-600">
                        <span className="font-mono font-semibold text-gray-900">
                          {stand.precio} {adminData.configuracion?.MONEDA || '$us'}
                        </span>
                        {isComida && (
                          <span className="text-[11px] text-gray-500">
                            {hasParrilla ? (lang === 'de' ? '• Mit Grill' : '• Con parrilla') : (lang === 'de' ? '• Ohne Grill' : '• Sin parrilla')}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => openEditStandModal(stand)}
                      className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 transition shadow-xs shrink-0"
                      title={t.edit}
                    >
                      <Edit2 className="w-3.5 h-3.5 text-gray-700" />
                    </button>
                  </div>
                );
              })}
              {filteredStands.length === 0 && (
                <div className="p-8 text-center text-gray-500 text-xs">
                  {t.noStandsAvailable}
                </div>
              )}
            </div>

            {/* DESKTOP VIEW (TABLE): Compact, professional and complete */}
            <div className="hidden md:block rounded-xl bg-white border border-gray-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="p-3 w-16">#</th>
                    <th className="p-3">{t.standCategory}</th>
                    <th className="p-3 w-32">{t.standPrice}</th>
                    <th className="p-3 w-32">{t.standStatus}</th>
                    <th className="p-3">{t.standDescription}</th>
                    <th className="p-3 w-20 text-right">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredStands.map((stand) => {
                    const isComida = (stand.categoria || '').toLowerCase() === 'comida';
                    const hasParrilla = String(stand.TieneParrilla).toUpperCase() === 'SI' || stand.tiene_parrilla === true;
                    const num = stand.Numero !== undefined ? stand.Numero : stand.numero;

                    return (
                      <tr key={stand.id || num} className="hover:bg-gray-50/80 transition">
                        <td className="p-3 font-bold font-mono text-gray-900">#{num}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">{stand.categoria}</span>
                            {isComida && (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  hasParrilla
                                    ? 'bg-orange-100 text-orange-800 border border-orange-200'
                                    : 'bg-sky-100 text-sky-800 border border-sky-200'
                                }`}
                              >
                                {hasParrilla ? 'Con parrilla' : 'Sin parrilla'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-mono font-medium">
                          {stand.precio} {adminData.configuracion?.MONEDA || '$us'}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              stand.estado === 'disponible'
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                            }`}
                          >
                            {stand.estado}
                          </span>
                        </td>
                        <td className="p-3 max-w-xs truncate text-gray-500">
                          {stand.descripcion || '-'}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => openEditStandModal(stand)}
                            className="p-1.5 rounded-lg bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 transition shadow-xs"
                            title={t.edit}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredStands.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        {t.noStandsAvailable}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* 3. SOLICITUDES TAB */}
      {activeTab === 'solicitudes' && adminData && (() => {
        // Sort: Pending first, followed by others, ordered by date descending within each group
        const sortedSolicitudes = (adminData.solicitudes || []).slice().sort((a, b) => {
          const aSt = String(a.Estado || a.estado || '').toLowerCase();
          const bSt = String(b.Estado || b.estado || '').toLowerCase();
          const aPending = aSt === 'pendiente';
          const bPending = bSt === 'pendiente';
          if (aPending && !bPending) return -1;
          if (!aPending && bPending) return 1;

          // Inside group, order by date descending
          const timeA = new Date(a.FechaSolicitud || a.fecha || '').getTime() || 0;
          const timeB = new Date(b.FechaSolicitud || b.fecha || '').getTime() || 0;
          return timeB - timeA;
        });

        const filteredSolicitudes = sortedSolicitudes.filter((sol) => {
          const q = requestSearch.trim().toLowerCase();
          const standStr = String(sol.NumeroStand !== undefined ? sol.NumeroStand : sol.stand).toLowerCase();
          const nameStr = String(sol.NombreCompleto || sol.nombre || sol.Nombre || '').toLowerCase();
          const telStr = String(sol.Telefono ?? sol.telefono ?? '').toLowerCase();
          const obsStr = String(sol.Observacion || sol.observacion || '').toLowerCase();

          if (q && !standStr.includes(q) && !nameStr.includes(q) && !telStr.includes(q) && !obsStr.includes(q)) {
            return false;
          }

          const st = String(sol.Estado || sol.estado || 'pendiente').toLowerCase();
          if (requestStatusFilter === 'pendiente' && st !== 'pendiente') return false;
          if (requestStatusFilter === 'confirmada' && st !== 'confirmada') return false;
          if (requestStatusFilter === 'rechazada' && st !== 'rechazada') return false;

          return true;
        });

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">{t.tabRequests}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                  {filteredSolicitudes.length} / {adminData.solicitudes.length}
                </span>
              </div>
            </div>

            {/* Search and Filters Bar */}
            <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-xs space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                  placeholder={t.searchRequestsPlaceholder || 'Buscar por nombre, stand, teléfono o productos...'}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-red-700"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setRequestStatusFilter('todos')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                    requestStatusFilter === 'todos'
                      ? 'bg-red-700 text-white border-red-700 shadow-xs'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                  }`}
                >
                  {t.filterAll || 'Todas'}
                </button>
                <button
                  type="button"
                  onClick={() => setRequestStatusFilter('pendiente')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                    requestStatusFilter === 'pendiente'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                  }`}
                >
                  {t.filterPending || 'Pendientes'}
                </button>
                <button
                  type="button"
                  onClick={() => setRequestStatusFilter('confirmada')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                    requestStatusFilter === 'confirmada'
                      ? 'bg-green-700 text-white border-green-700 shadow-xs'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                  }`}
                >
                  {t.filterConfirmed || 'Confirmadas'}
                </button>
                <button
                  type="button"
                  onClick={() => setRequestStatusFilter('rechazada')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                    requestStatusFilter === 'rechazada'
                      ? 'bg-red-700 text-white border-red-700 shadow-xs'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                  }`}
                >
                  {t.filterRejected || 'Rechazadas'}
                </button>
              </div>
            </div>

            {/* MOBILE COMPACT LIST (ZERO HORIZONTAL SCROLL) */}
            <div className="md:hidden divide-y divide-gray-100 rounded-xl bg-white border border-gray-200 shadow-xs overflow-hidden">
              {filteredSolicitudes.map((sol) => {
                const standNum = sol.NumeroStand !== undefined ? sol.NumeroStand : sol.stand;
                const fullName = (sol.NombreCompleto || sol.nombre || sol.Nombre || '-').trim();
                const phoneStr = String(sol.Telefono ?? sol.telefono ?? '').trim();
                const cleanPhone = phoneStr.replace(/\D/g, '');
                const rawDate = sol.FechaSolicitud || sol.fecha || '';
                const reqDate = formatDateTimeBolivia(rawDate).date;
                const st = String(sol.Estado || sol.estado || 'pendiente').toLowerCase();
                const isPending = st === 'pendiente';
                const isConfirmed = st === 'confirmada';
                const isRejected = st === 'rechazada';
                const obs = (sol.Observacion || sol.observacion || '').trim();

                return (
                  <div key={sol.id} className="p-3.5 space-y-2.5">
                    {/* Header: Stand & Name & Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-red-700 text-sm">#{standNum}</span>
                          <span className="font-bold text-gray-900 text-xs">{fullName}</span>
                        </div>
                        {phoneStr && (
                          <div className="text-[11px] text-gray-500 font-mono mt-0.5 flex items-center gap-1.5">
                            <span>Tel: {phoneStr}</span>
                          </div>
                        )}
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                          isConfirmed
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : isRejected
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {isConfirmed
                          ? (lang === 'de' ? 'BESTÄTIGT' : 'CONFIRMADA')
                          : isRejected
                          ? (lang === 'de' ? 'ABGELEHNT' : 'RECHAZADA')
                          : (lang === 'de' ? 'AUSSTEHEND' : 'PENDIENTE')}
                      </span>
                    </div>

                    {/* Full width observation / description of products */}
                    {obs && (
                      <div className="pt-2 border-t border-gray-100 text-xs text-gray-700 bg-gray-50/80 p-2.5 rounded-lg">
                        <span className="font-semibold text-gray-500 block text-[10px] uppercase mb-0.5">
                          {t.observation || 'Observación / Productos'}:
                        </span>
                        <p className="leading-relaxed whitespace-pre-wrap break-words">{obs}</p>
                      </div>
                    )}

                    {/* Footer: Date and Action Buttons */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[11px] text-gray-500 font-medium">
                        {lang === 'de' ? 'Datum:' : 'Fecha:'} {reqDate}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-xs font-semibold transition active:scale-95 shadow-xs"
                            title="WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        )}

                        {isPending && (
                          <>
                            <button
                              onClick={() => handleConfirmRental(sol)}
                              disabled={actionInProgress === sol.id}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white text-xs font-bold transition active:scale-95 shadow-xs"
                              title={t.confirmRental}
                            >
                              {actionInProgress === sol.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              <span>{lang === 'de' ? 'Bestätigen' : 'Aprobar'}</span>
                            </button>
                            <button
                              onClick={() => handleRejectRequest(sol.id)}
                              disabled={actionInProgress === sol.id}
                              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-700 border border-red-200 transition active:scale-95"
                              title={t.rejectRequest}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredSolicitudes.length === 0 && (
                <div className="p-8 text-center text-gray-500 text-xs">
                  {lang === 'de' ? 'Keine Anfragen gefunden.' : 'No se encontraron solicitudes.'}
                </div>
              )}
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden md:block rounded-xl bg-white border border-gray-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700">
                  <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] tracking-wider border-b border-gray-200">
                    <tr>
                      <th className="p-3">Stand</th>
                      <th className="p-3">{t.fullName}</th>
                      <th className="p-3">{t.phone}</th>
                      <th className="p-3">{t.observation}</th>
                      <th className="p-3">{t.requestDate}</th>
                      <th className="p-3">{t.status}</th>
                      <th className="p-3 text-right">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredSolicitudes.map((sol) => {
                      const standNum = sol.NumeroStand !== undefined ? sol.NumeroStand : sol.stand;
                      const fullName = sol.NombreCompleto || sol.nombre || sol.Nombre || '-';
                      const phoneStr = sol.Telefono ?? sol.telefono ?? '';
                      const cleanPhone = String(phoneStr).replace(/\D/g, '');
                      const rawDate = sol.FechaSolicitud || sol.fecha || '';
                      const reqDate = formatDateTimeBolivia(rawDate).date;
                      const st = String(sol.Estado || sol.estado || 'pendiente').toLowerCase();
                      const isPending = st === 'pendiente';
                      const isConfirmed = st === 'confirmada';
                      const isRejected = st === 'rechazada';

                      return (
                        <tr key={sol.id} className="hover:bg-gray-50/80 transition">
                          <td className="p-3 font-mono font-bold text-red-700">#{standNum}</td>
                          <td className="p-3 font-semibold text-gray-900">{fullName}</td>
                          <td className="p-3 font-mono">{phoneStr ? String(phoneStr) : '-'}</td>
                          <td className="p-3 max-w-xs text-gray-700 break-words">{sol.observacion || sol.Observacion || '-'}</td>
                          <td className="p-3 text-gray-500 font-mono">{reqDate}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                isConfirmed
                                  ? 'bg-green-50 text-green-700 border border-green-200'
                                  : isRejected
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {isConfirmed
                                ? (lang === 'de' ? 'BESTÄTIGT' : 'CONFIRMADA')
                                : isRejected
                                ? (lang === 'de' ? 'ABGELEHNT' : 'RECHAZADA')
                                : (lang === 'de' ? 'AUSSTEHEND' : 'PENDIENTE')}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {cleanPhone && (
                                <a
                                  href={`https://wa.me/${cleanPhone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition shadow-xs"
                                  title="WhatsApp"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {isPending && (
                                <>
                                  <button
                                    onClick={() => handleConfirmRental(sol)}
                                    disabled={actionInProgress === sol.id}
                                    className="p-1.5 rounded-lg bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white transition shadow-xs"
                                    title={t.confirmRental}
                                  >
                                    {actionInProgress === sol.id ? (
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleRejectRequest(sol.id)}
                                    disabled={actionInProgress === sol.id}
                                    className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-700 border border-red-200 transition"
                                    title={t.rejectRequest}
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                              {!isPending && !cleanPhone && (
                                <span className="text-gray-400 text-[10px]">-</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredSolicitudes.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-500">
                          {lang === 'de' ? 'Keine Anfragen vorhanden.' : 'No hay solicitudes registradas.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 4. ALQUILERES TAB */}
      {activeTab === 'alquileres' && adminData && (() => {
        const sortedRentals = (adminData.alquileres || [])
          .slice()
          .sort((a, b) => {
            const aActivo = String(a.Estado || a.estado || '').toLowerCase() === 'activo';
            const bActivo = String(b.Estado || b.estado || '').toLowerCase() === 'activo';
            if (aActivo && !bActivo) return -1;
            if (!aActivo && bActivo) return 1;

            const numA = Number(a.NumeroStand !== undefined ? a.NumeroStand : a.stand) || 0;
            const numB = Number(b.NumeroStand !== undefined ? b.NumeroStand : b.stand) || 0;
            return numA - numB;
          });

        const filteredRentals = sortedRentals.filter((alq) => {
          const q = rentalSearch.trim().toLowerCase();
          const standStr = String(alq.NumeroStand !== undefined ? alq.NumeroStand : alq.stand).toLowerCase();
          const clientStr = String(alq.Cliente || alq.cliente || alq.NombreCompleto || '').toLowerCase();
          const telStr = String(alq.Telefono ?? alq.telefono ?? '').toLowerCase();

          if (q && !standStr.includes(q) && !clientStr.includes(q) && !telStr.includes(q)) return false;

          const st = String(alq.Estado || alq.estado || 'activo').toLowerCase();
          if (rentalStatusFilter === 'activo' && st !== 'activo') return false;
          if (rentalStatusFilter === 'cancelado' && st !== 'cancelado') return false;

          return true;
        });

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">{t.tabRentals}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                  {filteredRentals.length} / {adminData.alquileres.length}
                </span>
              </div>
            </div>

            {/* Search and Filters Bar */}
            <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-xs space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={rentalSearch}
                  onChange={(e) => setRentalSearch(e.target.value)}
                  placeholder={t.searchRentalsPlaceholder || 'Buscar por nombre, teléfono o stand...'}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-red-700"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setRentalStatusFilter('activo')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                    rentalStatusFilter === 'activo'
                      ? 'bg-green-700 text-white border-green-700 shadow-xs'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                  }`}
                >
                  {t.filterActive || 'Activos'}
                </button>
                <button
                  type="button"
                  onClick={() => setRentalStatusFilter('cancelado')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                    rentalStatusFilter === 'cancelado'
                      ? 'bg-red-700 text-white border-red-700 shadow-xs'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                  }`}
                >
                  {t.filterCancelled || 'Cancelados'}
                </button>
                <button
                  type="button"
                  onClick={() => setRentalStatusFilter('todos')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                    rentalStatusFilter === 'todos'
                      ? 'bg-gray-800 text-white border-gray-800 shadow-xs'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                  }`}
                >
                  {t.filterAll || 'Todos'}
                </button>
              </div>
            </div>

            {/* MOBILE COMPACT LIST (ZERO HORIZONTAL SCROLL) */}
            <div className="md:hidden divide-y divide-gray-100 rounded-xl bg-white border border-gray-200 shadow-xs overflow-hidden">
              {filteredRentals.map((alq) => {
                const isActivo = String(alq.Estado || alq.estado || '').toLowerCase() === 'activo';
                const clientName = alq.Cliente || alq.cliente || alq.NombreCompleto || '-';
                const standNum = alq.NumeroStand !== undefined ? alq.NumeroStand : alq.stand;
                const rawDate = alq.FechaConfirmacion || alq.fechaConfirmacion || alq.fecha_confirmacion || alq.FechaAlquiler || alq.fecha_alquiler || '';
                const rentalDateDisplay = formatDateDisplay(rawDate);

                return (
                  <div key={alq.id} className="p-3.5 space-y-2 hover:bg-gray-50/80 transition">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono font-bold text-red-700 text-sm shrink-0">#{standNum}</span>
                        <span className="text-gray-300">—</span>
                        <span className="font-bold text-xs text-gray-900 truncate">{clientName}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border shrink-0 ${
                          isActivo
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-red-100 text-red-800 border-red-200'
                        }`}
                      >
                        {isActivo ? (lang === 'de' ? 'AKTIV' : 'ACTIVO') : (lang === 'de' ? 'STORNIERT' : 'CANCELADO')}
                      </span>
                    </div>

                    <div className="text-xs text-gray-600 space-y-0.5">
                      <div>
                        <span className="text-gray-500 font-medium">{t.phone}: </span>
                        <span className="font-mono text-gray-800">{alq.telefono ? String(alq.telefono) : '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium">{t.rentalDate}: </span>
                        <span className="font-mono text-gray-800">{rentalDateDisplay}</span>
                      </div>
                    </div>

                    {/* Action buttons (only displayed for active rentals) */}
                    {isActivo && (
                      <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center gap-1.5">
                        <button
                          onClick={() => copyClientUrl(alq)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-[11px] font-semibold transition shadow-xs"
                          title={t.copyClientLink}
                        >
                          <Copy className="w-3 h-3 text-gray-500" />
                          <span>{copiedId === alq.id ? t.copied : (t.actionLink || 'Enlace')}</span>
                        </button>
                        <button
                          onClick={() => shareClientUrl(alq)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-[11px] font-semibold transition shadow-xs"
                          title={lang === 'de' ? 'Link teilen' : 'Compartir enlace'}
                        >
                          <Share2 className="w-3 h-3 text-gray-500" />
                          <span>{t.actionShare || 'Compartir'}</span>
                        </button>
                        <button
                          onClick={() => shareRentalViaWhatsApp(alq)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-[11px] font-semibold transition shadow-xs"
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-3 h-3 text-green-600" />
                          <span>WhatsApp</span>
                        </button>
                        <button
                          onClick={() => handleResetDevice(alq)}
                          disabled={actionInProgress === alq.id}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-semibold transition shadow-xs disabled:opacity-50"
                          title={lang === 'de' ? 'Gerät zurücksetzen' : 'Restablecer dispositivo'}
                        >
                          {actionInProgress === alq.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <KeyRound className="w-3 h-3 text-amber-700" />
                          )}
                          <span>{t.actionReset || 'Restablecer'}</span>
                        </button>
                        <button
                          onClick={() => handleCancelRental(alq.id)}
                          disabled={actionInProgress === alq.id}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] font-semibold transition shadow-xs disabled:opacity-50"
                          title={t.cancelRental}
                        >
                          {actionInProgress === alq.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3 text-red-600" />
                          )}
                          <span>{t.actionCancel || 'Cancelar'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredRentals.length === 0 && (
                <div className="p-8 text-center text-gray-500 text-xs">
                  {lang === 'de' ? 'Keine Mietverträge gefunden.' : 'No se encontraron alquileres.'}
                </div>
              )}
            </div>

            {/* DESKTOP VIEW (TABLE): Compact, professional layout */}
            <div className="hidden md:block rounded-xl bg-white border border-gray-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="p-3 w-16">Stand</th>
                    <th className="p-3">{t.clientName}</th>
                    <th className="p-3 w-28">{t.phone}</th>
                    <th className="p-3 w-32">{t.rentalDate}</th>
                    <th className="p-3 w-28">{t.status}</th>
                    <th className="p-3 text-right">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRentals.map((alq) => {
                    const isActivo = String(alq.Estado || alq.estado || '').toLowerCase() === 'activo';
                    const rawDate = alq.FechaConfirmacion || alq.fechaConfirmacion || alq.fecha_confirmacion || alq.FechaAlquiler || alq.fecha_alquiler || '';
                    const rentalDateDisplay = formatDateDisplay(rawDate);
                    const standNum = alq.NumeroStand !== undefined ? alq.NumeroStand : alq.stand;

                    return (
                      <tr key={alq.id} className="hover:bg-gray-50/80 transition">
                        <td className="p-3 font-mono font-bold text-red-700">#{standNum}</td>
                        <td className="p-3 font-semibold text-gray-900">{alq.cliente || alq.Cliente}</td>
                        <td className="p-3 font-mono">{alq.telefono ? String(alq.telefono) : '-'}</td>
                        <td className="p-3 font-mono text-gray-600">{rentalDateDisplay}</td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              isActivo
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : 'bg-red-100 text-red-800 border-red-200'
                            }`}
                          >
                            {isActivo ? (lang === 'de' ? 'AKTIV' : 'ACTIVO') : (lang === 'de' ? 'STORNIERT' : 'CANCELADO')}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {isActivo && (
                              <>
                                <button
                                  onClick={() => copyClientUrl(alq)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 transition text-[11px] shadow-xs"
                                  title={t.copyClientLink}
                                >
                                  <Copy className="w-3 h-3 text-gray-500" />
                                  <span>{copiedId === alq.id ? t.copied : (t.actionLink || 'Enlace')}</span>
                                </button>
                                <button
                                  onClick={() => shareClientUrl(alq)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 transition text-[11px] shadow-xs"
                                  title={lang === 'de' ? 'Link teilen' : 'Compartir enlace'}
                                >
                                  <Share2 className="w-3 h-3 text-gray-500" />
                                  <span>{t.actionShare || 'Compartir'}</span>
                                </button>
                                <button
                                  onClick={() => shareRentalViaWhatsApp(alq)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 transition text-[11px] shadow-xs"
                                  title="WhatsApp"
                                >
                                  <MessageCircle className="w-3 h-3 text-green-600" />
                                  <span>WhatsApp</span>
                                </button>
                                <button
                                  onClick={() => handleResetDevice(alq)}
                                  disabled={actionInProgress === alq.id}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition text-[11px] font-semibold shadow-xs disabled:opacity-50"
                                  title={lang === 'de' ? 'Gerät zurücksetzen' : 'Restablecer dispositivo'}
                                >
                                  {actionInProgress === alq.id ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <KeyRound className="w-3 h-3 text-amber-700" />
                                  )}
                                  <span>{t.actionReset || 'Restablecer'}</span>
                                </button>
                                <button
                                  onClick={() => handleCancelRental(alq.id)}
                                  disabled={actionInProgress === alq.id}
                                  className="p-1 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition"
                                  title={t.cancelRental}
                                >
                                  {actionInProgress === alq.id ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRentals.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        {lang === 'de' ? 'Keine Mietverträge vorhanden.' : 'No hay alquileres registrados.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* 5. INVITADOS TAB */}
      {activeTab === 'invitados' && adminData && (() => {
        // Ordenar numéricamente por número de stand de menor a mayor (#6, #7, #8... #40)
        // y agrupar consecutivamente los invitados del mismo stand
        const sortedGuests = (adminData.invitados || []).slice().sort((a, b) => {
          const rawA = a.NumeroStand !== undefined ? a.NumeroStand : a.stand;
          const rawB = b.NumeroStand !== undefined ? b.NumeroStand : b.stand;
          const matchA = String(rawA ?? '').match(/\d+/);
          const matchB = String(rawB ?? '').match(/\d+/);
          const numA = matchA ? parseInt(matchA[0], 10) : (typeof rawA === 'number' && !isNaN(rawA) ? rawA : 999999);
          const numB = matchB ? parseInt(matchB[0], 10) : (typeof rawB === 'number' && !isNaN(rawB) ? rawB : 999999);

          if (numA !== numB) {
            return numA - numB;
          }

          // Agrupar consecutivamente los invitados del mismo stand
          const nameA = String(
            a.NombreCompleto ||
            (a as any).nombreCompleto ||
            a.nombre_invitado ||
            a.NombreInvitado ||
            ''
          ).trim().toLowerCase();
          const nameB = String(
            b.NombreCompleto ||
            (b as any).nombreCompleto ||
            b.nombre_invitado ||
            b.NombreInvitado ||
            ''
          ).trim().toLowerCase();
          if (nameA && nameB && nameA !== nameB) {
            return nameA.localeCompare(nameB);
          }

          const idA = String(a.id || (a as any).InvitadoID || a.token_invitacion || '');
          const idB = String(b.id || (b as any).InvitadoID || b.token_invitacion || '');
          return idA.localeCompare(idB);
        });

        const filteredGuests = sortedGuests.filter((inv) => {
          const guestName = (
            inv.NombreCompleto ||
            (inv as any).nombreCompleto ||
            inv.nombre_invitado ||
            inv.NombreInvitado ||
            ''
          ).trim().toLowerCase();
          const standStr = String(inv.stand || (inv as any).NumeroStand || '').toLowerCase();
          const q = guestSearch.trim().toLowerCase();

          if (q && !guestName.includes(q) && !standStr.includes(q)) return false;

          const rawStatus = String(inv.estado || inv.Estado || '').toLowerCase().trim();
          const isActivo = rawStatus === 'activo' || rawStatus === 'registrado';
          const isRevocado = rawStatus === 'revocado';
          const isPendiente = !isActivo && !isRevocado;

          if (guestStatusFilter === 'activos' && !isActivo) return false;
          if (guestStatusFilter === 'pendientes' && !isPendiente) return false;
          if (guestStatusFilter === 'revocados' && !isRevocado) return false;

          return true;
        });

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">{t.tabGuests}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                  {filteredGuests.length} / {adminData.invitados.length} {lang === 'de' ? 'Gäste' : 'invitados'}
                </span>
              </div>
            </div>

            {/* Search and Filters Bar */}
            <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-xs space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={guestSearch}
                  onChange={(e) => setGuestSearch(e.target.value)}
                  placeholder={t.searchGuestsPlaceholder || 'Buscar por nombre o stand...'}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-red-700"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setGuestStatusFilter('todos')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                    guestStatusFilter === 'todos'
                      ? 'bg-gray-800 text-white border-gray-800 shadow-xs'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                  }`}
                >
                  {t.filterAll || 'Todos'}
                </button>
                <button
                  type="button"
                  onClick={() => setGuestStatusFilter('activos')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                    guestStatusFilter === 'activos'
                      ? 'bg-green-700 text-white border-green-700 shadow-xs'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                  }`}
                >
                  {t.filterActive || 'Activos'}
                </button>
                <button
                  type="button"
                  onClick={() => setGuestStatusFilter('pendientes')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                    guestStatusFilter === 'pendientes'
                      ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                  }`}
                >
                  {t.filterPending || 'Pendientes'}
                </button>
                <button
                  type="button"
                  onClick={() => setGuestStatusFilter('revocados')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                    guestStatusFilter === 'revocados'
                      ? 'bg-red-700 text-white border-red-700 shadow-xs'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                  }`}
                >
                  {t.filterRevoked || 'Revocados'}
                </button>
              </div>
            </div>

            {/* MOBILE ULTRA-COMPACT LIST: Example #21 | Helena Penner Krahn | ACTIVO \n 05/11/2026 */}
            <div className="md:hidden divide-y divide-gray-100 rounded-xl bg-white border border-gray-200 shadow-xs overflow-hidden">
              {filteredGuests.map((inv) => {
                const guestName = (
                  inv.NombreCompleto ||
                  (inv as any).nombreCompleto ||
                  inv.nombre_invitado ||
                  inv.NombreInvitado ||
                  ''
                ).trim();

                const rawStatus = String(inv.estado || inv.Estado || '').toLowerCase().trim();
                const isActivo = rawStatus === 'activo' || rawStatus === 'registrado';
                const isRevocado = rawStatus === 'revocado';
                const isPendiente = !isActivo && !isRevocado;

                let badgeClass = 'bg-orange-100 text-orange-800 border-orange-200';
                let statusText = lang === 'de' ? 'PENDENT' : 'PENDIENTE';
                if (isActivo) {
                  badgeClass = 'bg-green-100 text-green-800 border-green-200';
                  statusText = lang === 'de' ? 'AKTIV' : 'ACTIVO';
                } else if (isRevocado) {
                  badgeClass = 'bg-red-100 text-red-800 border-red-200';
                  statusText = lang === 'de' ? 'WIDERRUFEN' : 'REVOCADO';
                }

                const displayName = guestName
                  ? guestName
                  : isPendiente
                  ? (t.unregistered || (lang === 'de' ? 'Nicht registriert' : 'Sin registrar'))
                  : '-';

                const dateVal =
                  inv.fecha_registro ||
                  (inv as any).FechaRegistro ||
                  inv.fecha_creacion ||
                  (inv as any).FechaCreacion ||
                  '';
                const displayDate = dateVal ? formatDateDisplay(dateVal) : '';

                const guestKey = inv.id || (inv as any).InvitadoID || inv.token_invitacion;
                const guestId = inv.id || (inv as any).InvitadoID;

                return (
                  <div
                    key={guestKey}
                    className="p-3 flex items-start justify-between gap-2.5 hover:bg-gray-50/80 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap text-xs">
                        <span className="font-mono font-bold text-red-700">#{inv.stand || (inv as any).NumeroStand}</span>
                        <span className="text-gray-300">|</span>
                        <span className={`font-semibold break-words ${guestName ? 'text-gray-900' : 'text-gray-500 italic'}`}>
                          {displayName}
                        </span>
                        <span className="text-gray-300">|</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border tracking-wide uppercase ${badgeClass}`}>
                          {statusText}
                        </span>
                      </div>
                      {displayDate && displayDate !== '-' && (
                        <p className="font-mono text-[11px] text-gray-500 mt-0.5 ml-0.5">
                          {displayDate}
                        </p>
                      )}
                    </div>

                    {!isRevocado && guestId && (
                      <button
                        onClick={() => handleRevokeGuest(guestId)}
                        disabled={actionInProgress === guestId}
                        className="p-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition shadow-xs shrink-0 mt-0.5"
                        title={t.revokeInvitation}
                      >
                        {actionInProgress === guestId ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
              {filteredGuests.length === 0 && (
                <div className="p-8 text-center text-gray-500 text-xs">
                  {lang === 'de' ? 'Keine Gäste gefunden.' : 'No se encontraron invitados.'}
                </div>
              )}
            </div>

            {/* DESKTOP VIEW (TABLE): Spacious layout with full names and formatted dates */}
            <div className="hidden md:block rounded-xl bg-white border border-gray-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="p-3 w-20">Stand</th>
                    <th className="p-3">{t.guestName}</th>
                    <th className="p-3 w-32">{t.status}</th>
                    <th className="p-3 w-36">{t.registeredOn}</th>
                    <th className="p-3 w-20 text-right">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredGuests.map((inv) => {
                    const guestName = (
                      inv.NombreCompleto ||
                      (inv as any).nombreCompleto ||
                      inv.nombre_invitado ||
                      inv.NombreInvitado ||
                      ''
                    ).trim();

                    const rawStatus = String(inv.estado || inv.Estado || '').toLowerCase().trim();
                    const isActivo = rawStatus === 'activo' || rawStatus === 'registrado';
                    const isRevocado = rawStatus === 'revocado';
                    const isPendiente = !isActivo && !isRevocado;

                    let badgeClass = 'bg-orange-100 text-orange-800 border-orange-200';
                    let statusText = lang === 'de' ? 'PENDENT' : 'PENDIENTE';
                    if (isActivo) {
                      badgeClass = 'bg-green-100 text-green-800 border-green-200';
                      statusText = lang === 'de' ? 'AKTIV' : 'ACTIVO';
                    } else if (isRevocado) {
                      badgeClass = 'bg-red-100 text-red-800 border-red-200';
                      statusText = lang === 'de' ? 'WIDERRUFEN' : 'REVOCADO';
                    }

                    const displayName = guestName
                      ? guestName
                      : isPendiente
                      ? (t.unregistered || (lang === 'de' ? 'Nicht registriert' : 'Sin registrar'))
                      : '-';

                    const dateVal =
                      inv.fecha_registro ||
                      (inv as any).FechaRegistro ||
                      inv.fecha_creacion ||
                      (inv as any).FechaCreacion ||
                      '';
                    const displayDate = formatDateDisplay(dateVal);

                    const guestKey = inv.id || (inv as any).InvitadoID || inv.token_invitacion;
                    const guestId = inv.id || (inv as any).InvitadoID;

                    return (
                      <tr key={guestKey} className="hover:bg-gray-50/80 transition">
                        <td className="p-3 font-mono font-bold text-red-700">
                          #{inv.stand || (inv as any).NumeroStand}
                        </td>
                        <td className="p-3">
                          <span
                            className={`text-xs ${
                              guestName
                                ? 'font-bold text-gray-900'
                                : 'font-normal text-gray-500 italic'
                            }`}
                          >
                            {displayName}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wide uppercase ${badgeClass}`}
                          >
                            {statusText}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600 font-mono">{displayDate}</td>
                        <td className="p-3 text-right">
                          {!isRevocado && guestId && (
                            <button
                              onClick={() => handleRevokeGuest(guestId)}
                              disabled={actionInProgress === guestId}
                              className="p-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition shadow-xs inline-flex items-center justify-center"
                              title={t.revokeInvitation}
                            >
                              {actionInProgress === guestId ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredGuests.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500">
                        {lang === 'de' ? 'Keine Gäste registriert.' : 'No hay invitados registrados.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* 6. ACCESOS TAB */}
      {activeTab === 'accesos' && adminData && (() => {
        // Reverse order so the most recent accesses appear first
        const reversedAccesos = (adminData.accesos || []).slice().reverse();

        const filteredAccesos = reversedAccesos.filter((acc) => {
          const nom = String(
            acc.NombreCompleto ||
            (acc as any).nombreCompleto ||
            acc.nombre ||
            acc.Nombre ||
            ''
          ).trim().toLowerCase();
          const standStr = String(acc.NumeroStand !== undefined ? acc.NumeroStand : acc.stand).toLowerCase();
          const q = accessSearch.trim().toLowerCase();

          if (q && !nom.includes(q) && !standStr.includes(q)) return false;

          const rawTipo = String(
            acc.PersonaTipo ||
            (acc as any).personaTipo ||
            acc.tipo ||
            acc.Tipo ||
            ''
          ).trim().toLowerCase();
          const isInvitado = rawTipo.includes('invitad');

          if (accessTypeFilter === 'cliente' && isInvitado) return false;
          if (accessTypeFilter === 'invitado' && !isInvitado) return false;

          if (accessDateFilter) {
            // accessDateFilter is in YYYY-MM-DD
            const rawDate = acc.FechaHora || acc.fecha_hora || '';
            const dt = formatDateTimeBolivia(rawDate);
            const [dYear, dMonth, dDay] = accessDateFilter.split('-');
            const expectedDateStr = `${dDay}/${dMonth}/${dYear}`;
            if (dt.date !== expectedDateStr && !String(rawDate).includes(accessDateFilter)) {
              return false;
            }
          }

          return true;
        });

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">{t.tabAccess}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                  {filteredAccesos.length} / {adminData.accesos.length}
                </span>
              </div>
            </div>

            {/* Search and Filters Bar */}
            <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-xs space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={accessSearch}
                  onChange={(e) => setAccessSearch(e.target.value)}
                  placeholder={t.searchAccessPlaceholder || 'Buscar por nombre o stand...'}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-red-700"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* Type Filter Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setAccessTypeFilter('todos')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                      accessTypeFilter === 'todos'
                        ? 'bg-gray-800 text-white border-gray-800 shadow-xs'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                    }`}
                  >
                    {t.filterAll || 'Todos'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccessTypeFilter('cliente')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                      accessTypeFilter === 'cliente'
                        ? 'bg-red-700 text-white border-red-700 shadow-xs'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                    }`}
                  >
                    {t.filterClients || 'Clientes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccessTypeFilter('invitado')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                      accessTypeFilter === 'invitado'
                        ? 'bg-red-700 text-white border-red-700 shadow-xs'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                    }`}
                  >
                    {t.filterGuests || 'Invitados'}
                  </button>
                </div>

                {/* Date Filter */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={accessDateFilter}
                    onChange={(e) => setAccessDateFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-700 font-medium focus:outline-none focus:border-red-700"
                    title={t.filterByDate || 'Filtrar por fecha'}
                  />
                  {accessDateFilter && (
                    <button
                      type="button"
                      onClick={() => setAccessDateFilter('')}
                      className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs transition"
                      title={t.clearDateFilter || 'Limpiar filtro de fecha'}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* MOBILE COMPACT LIST: Example
                Nombre completo de la persona
                Cliente · Stand #33
                23/11/2026 — 20:39:26
                ACCESO AUTORIZADO
            */}
            <div className="md:hidden divide-y divide-gray-100 rounded-xl bg-white border border-gray-200 shadow-xs overflow-hidden">
              {filteredAccesos.map((acc, idx) => {
                const rawDate = acc.FechaHora || acc.fecha_hora || '';
                const dt = formatDateTimeBolivia(rawDate);
                const nom = (
                  acc.NombreCompleto ||
                  (acc as any).nombreCompleto ||
                  acc.nombre ||
                  acc.Nombre ||
                  '-'
                ).trim();
                const rawTipo = String(
                  acc.PersonaTipo ||
                  (acc as any).personaTipo ||
                  acc.tipo ||
                  acc.Tipo ||
                  'cliente'
                ).toLowerCase();
                const isInvitado = rawTipo.includes('invitad');
                const tipoLabel = isInvitado ? (t.typeGuest || 'Invitado') : (t.typeClient || 'Cliente');
                const standNum = acc.NumeroStand !== undefined ? acc.NumeroStand : acc.stand;
                const resText = (acc.Resultado || acc.resultado || 'ACCESO AUTORIZADO').toUpperCase();
                const isAuth = resText.includes('AUTORIZADO') || resText.includes('EXITO') || resText.includes('OK');

                return (
                  <div key={acc.id || idx} className="p-3.5 space-y-1.5 hover:bg-gray-50/80 transition">
                    <p className="font-bold text-sm text-gray-900 break-words">{nom}</p>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                      <span className="capitalize">{tipoLabel}</span>
                      <span>·</span>
                      <span>Stand <strong className="font-mono text-red-700">#{standNum}</strong></span>
                    </div>
                    <p className="font-mono text-xs text-gray-500">
                      {dt.full}
                    </p>
                    <div>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wide uppercase ${
                          isAuth
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-red-100 text-red-800 border-red-200'
                        }`}
                      >
                        {resText}
                      </span>
                    </div>
                  </div>
                );
              })}
              {filteredAccesos.length === 0 && (
                <div className="p-8 text-center text-gray-500 text-xs">
                  {lang === 'de' ? 'Keine eingetretenen Personen gefunden.' : 'No se encontraron personas ingresadas.'}
                </div>
              )}
            </div>

            {/* DESKTOP VIEW (TABLE): Compact, professional layout */}
            <div className="hidden md:block rounded-xl bg-white border border-gray-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="p-3 w-48">{t.time}</th>
                    <th className="p-3">{t.fullName}</th>
                    <th className="p-3 w-28">Tipo</th>
                    <th className="p-3 w-20">Stand</th>
                    <th className="p-3 w-40">Resultado</th>
                    <th className="p-3 w-32">{t.scannedBy}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAccesos.map((acc, idx) => {
                    const rawDate = acc.FechaHora || acc.fecha_hora || '';
                    const dt = formatDateTimeBolivia(rawDate);
                    const nom = (
                      acc.NombreCompleto ||
                      (acc as any).nombreCompleto ||
                      acc.nombre ||
                      acc.Nombre ||
                      '-'
                    ).trim();
                    const rawTipo = String(
                      acc.PersonaTipo ||
                      (acc as any).personaTipo ||
                      acc.tipo ||
                      acc.Tipo ||
                      'cliente'
                    ).toLowerCase();
                    const isInvitado = rawTipo.includes('invitad');
                    const tipoLabel = isInvitado ? (t.typeGuest || 'Invitado') : (t.typeClient || 'Cliente');
                    const standNum = acc.NumeroStand !== undefined ? acc.NumeroStand : acc.stand;
                    const resText = (acc.Resultado || acc.resultado || 'ACCESO AUTORIZADO').toUpperCase();
                    const isAuth = resText.includes('AUTORIZADO') || resText.includes('EXITO') || resText.includes('OK');
                    const portero = acc.RegistradoPor || (acc as any).registradoPor || acc.Portero || acc.portero || 'Portería';

                    return (
                      <tr key={acc.id || idx} className="hover:bg-gray-50/80 transition">
                        <td className="p-3 font-mono text-gray-600">{dt.full}</td>
                        <td className="p-3 font-semibold text-gray-900">{nom}</td>
                        <td className="p-3 capitalize">{tipoLabel}</td>
                        <td className="p-3 font-mono font-bold text-red-700">#{standNum}</td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wide uppercase ${
                              isAuth
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : 'bg-red-100 text-red-800 border-red-200'
                            }`}
                          >
                            {resText}
                          </span>
                        </td>
                        <td className="p-3 text-gray-500">{portero}</td>
                      </tr>
                    );
                  })}
                  {filteredAccesos.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        {lang === 'de' ? 'Noch keine Personen protokolliert.' : 'No hay personas ingresadas registradas.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* 7. USUARIOS TAB */}
      {activeTab === 'usuarios' && adminData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-gray-900">{t.tabUsers}</h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                {adminData.usuarios.length}
              </span>
            </div>
            <button
              onClick={() => {
                setUserModalError(null);
                setNewUserForm({ usuario: '', nombre: '', password: '', rol: 'admin' });
                setUserModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-semibold text-xs transition active:scale-95 shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{t.newUser}</span>
            </button>
          </div>

          {/* MOBILE COMPACT LIST (ZERO HORIZONTAL SCROLL) */}
          <div className="md:hidden divide-y divide-gray-100 rounded-xl bg-white border border-gray-200 shadow-xs overflow-hidden">
            {adminData.usuarios.map((u) => {
              const userId = u.UsuarioID || u.usuario || u.id;
              const isActivo = u.Activo === 'SI' || u.activo === 'SI' || u.estado === 'activo';
              const fullName = (u.Nombre || u.nombre || u.NombreCompleto || '-').trim();
              const username = u.Usuario || u.usuario;
              const roleStr = String(u.Rol || u.rol || 'ADMIN').toUpperCase();

              return (
                <div key={userId} className="p-3 sm:p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900 text-xs truncate">{fullName}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                          isActivo
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}
                      >
                        {isActivo ? (lang === 'de' ? 'AKTIV' : 'ACTIVO') : (lang === 'de' ? 'INAKTIV' : 'INACTIVO')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500 font-mono">
                      <span>@{username}</span>
                      <span className="text-gray-300">·</span>
                      <span className="font-semibold text-gray-700 uppercase text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">
                        {roleStr}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons always visible on the right */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setPasswordModalError(null);
                        setNewPasswordValue('');
                        setTargetUserToChangePass(u.Usuario || u.usuario);
                        setTargetUserIdToChangePass(u.UsuarioID || u.id || u.usuario);
                        setPasswordModalOpen(true);
                      }}
                      className="p-2 rounded-lg bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 transition shadow-xs active:scale-95"
                      title={t.changePassword}
                    >
                      <KeyRound className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleToggleUserStatus(u)}
                      disabled={actionInProgress === userId}
                      className="p-2 rounded-lg bg-white hover:bg-gray-100 disabled:opacity-50 text-gray-700 border border-gray-200 transition shadow-xs active:scale-95"
                      title={t.toggleStatus}
                    >
                      {actionInProgress === userId ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-red-600" />
                      ) : (
                        <Sliders className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
            {adminData.usuarios.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-xs">
                {lang === 'de' ? 'Keine Benutzer gefunden.' : 'No hay usuarios registrados en esta gestión.'}
              </div>
            )}
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden md:block rounded-xl bg-white border border-gray-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="p-3">{t.username}</th>
                    <th className="p-3">{t.fullName}</th>
                    <th className="p-3">{t.userRole}</th>
                    <th className="p-3">{t.status}</th>
                    <th className="p-3 text-right">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {adminData.usuarios.map((u) => {
                    const isActivo = u.Activo === 'SI' || u.activo === 'SI' || u.estado === 'activo';
                    return (
                      <tr key={u.UsuarioID || u.usuario || u.id} className="hover:bg-gray-50/80 transition">
                        <td className="p-3 font-mono font-bold text-gray-900">{u.Usuario || u.usuario}</td>
                        <td className="p-3 font-medium">{u.Nombre || u.nombre}</td>
                        <td className="p-3 capitalize">{u.Rol || u.rol}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isActivo
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                            }`}
                          >
                            {isActivo ? (lang === 'de' ? 'AKTIV' : 'ACTIVO') : (lang === 'de' ? 'INAKTIV' : 'INACTIVO')}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setPasswordModalError(null);
                                setNewPasswordValue('');
                                setTargetUserToChangePass(u.Usuario || u.usuario);
                                setTargetUserIdToChangePass(u.UsuarioID || u.id || u.usuario);
                                setPasswordModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 transition shadow-xs"
                              title={t.changePassword}
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              disabled={actionInProgress === (u.UsuarioID || u.id || u.usuario)}
                              className="p-1.5 rounded-lg bg-white hover:bg-gray-100 disabled:opacity-50 text-gray-700 border border-gray-200 transition shadow-xs"
                              title={t.toggleStatus}
                            >
                              {actionInProgress === (u.UsuarioID || u.id || u.usuario) ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Sliders className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {adminData.usuarios.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500">
                        {lang === 'de' ? 'Keine Benutzer gefunden.' : 'No hay usuarios registrados en esta gestión.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 8. GESTIONES TAB */}
      {activeTab === 'gestiones' && adminData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900">{t.editionsTitle}</h3>
            <button
              onClick={() => {
                setEditionModalError(null);
                setNewEditionForm({ anio: 2027, copiarStands: true });
                setEditionModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-semibold text-xs transition active:scale-95 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.newEdition}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {adminData.gestiones.map((gest) => {
              const gestIdentifier = gest.id || gest.GestionID || gest.nombre;
              const isActive = isGestionActiva(gest);
              return (
                <div
                  key={gestIdentifier}
                  className={`p-5 rounded-xl border transition ${
                    isActive
                      ? 'bg-emerald-50/70 border-emerald-300 shadow-xs ring-1 ring-emerald-200'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h4 className="text-base font-bold text-gray-900 font-mono">{gest.nombre}</h4>
                      {isActive ? (
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{t.activeEditionBadge || '✓ Gestión activa'}</span>
                        </div>
                      ) : (
                        <span className="inline-block mt-1 text-[11px] text-gray-500 font-medium">
                          {lang === 'de' ? 'Inaktiv' : 'Inactiva'}
                        </span>
                      )}
                    </div>
                    {!isActive && (
                      <button
                        onClick={() => handleActivateEdition(gest)}
                        disabled={actionInProgress === gestIdentifier}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 border border-gray-300 text-xs font-semibold transition active:scale-95 shadow-xs"
                      >
                        {actionInProgress === gestIdentifier && (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        )}
                        <span>{t.activateEdition}</span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                    {lang === 'de' ? 'Erstellt am:' : 'Creada:'} {gest.fecha_creacion || gest.FechaCreacion || '-'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 9. CONFIGURACIÓN TAB */}
      {activeTab === 'config' && adminData && (
        <div className="max-w-3xl rounded-xl bg-white border border-gray-200 p-6 sm:p-8 shadow-xs">
          <h3 className="text-base font-bold text-gray-900 mb-6 pb-3 border-b border-gray-200">
            {t.eventSettingsTitle}
          </h3>

          {configError && (
            <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block">Error al guardar:</span>
                <span className="font-normal">{configError}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  {t.eventName}
                </label>
                <input
                  type="text"
                  value={configForm.NOMBRE_EVENTO}
                  onChange={(e) =>
                    setConfigForm({ ...configForm, NOMBRE_EVENTO: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  {t.whatsappAdmin}
                </label>
                <input
                  type="text"
                  value={configForm.WHATSAPP_ADMIN}
                  onChange={(e) =>
                    setConfigForm({ ...configForm, WHATSAPP_ADMIN: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  {t.currency}
                </label>
                <input
                  type="text"
                  value={configForm.MONEDA}
                  onChange={(e) => setConfigForm({ ...configForm, MONEDA: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  {t.maxGuestsPerStand}
                </label>
                <input
                  type="number"
                  value={configForm.MAX_INVITADOS}
                  onChange={(e) =>
                    setConfigForm({ ...configForm, MAX_INVITADOS: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                {t.whatsappTemplateEs}
              </label>
              <textarea
                rows={2}
                value={configForm.MENSAJE_WHATSAPP_ES}
                onChange={(e) =>
                  setConfigForm({ ...configForm, MENSAJE_WHATSAPP_ES: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                {t.whatsappTemplateDe}
              </label>
              <textarea
                rows={2}
                value={configForm.MENSAJE_WHATSAPP_DE}
                onChange={(e) =>
                  setConfigForm({ ...configForm, MENSAJE_WHATSAPP_DE: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingConfig}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold text-xs shadow-xs transition active:scale-95 disabled:opacity-50"
              >
                {savingConfig ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>{t.saveSettings}</span>
              </button>
            </div>
          </form>
        </div>
      )}
        </div>
      </div>

      {/* MODAL: Stand Editor */}
      {standModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-md max-h-[90vh] flex flex-col rounded-2xl bg-white border border-gray-200 text-gray-900 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 shrink-0">
              <h3 className="text-base font-bold text-gray-900">
                {editingStand.id ? t.editStand : t.newStand}
              </h3>
              <button
                onClick={() => setStandModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStand} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="overflow-y-auto p-4 sm:p-5 flex-1 space-y-3.5">
                {standModalError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-bold block">Error al guardar stand:</span>
                      <span className="font-normal">{standModalError}</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {t.standNumber} *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStand.numero !== undefined ? editingStand.numero : (editingStand.Numero || '')}
                    onChange={(e) =>
                      setEditingStand({ ...editingStand, numero: e.target.value, Numero: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {lang === 'de' ? 'Standname' : 'Nombre del Stand'}
                  </label>
                  <input
                    type="text"
                    placeholder={`Stand ${editingStand.numero || editingStand.Numero || ''}`}
                    value={editingStand.nombre !== undefined ? editingStand.nombre : (editingStand.Nombre || '')}
                    onChange={(e) =>
                      setEditingStand({ ...editingStand, nombre: e.target.value, Nombre: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    {t.standCategory} *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                    {[
                      { id: 'Comida', label: t.categoryComida, icon: UtensilsCrossed },
                      { id: 'Artesanal', label: t.categoryArtesanal, icon: Gift },
                      { id: 'Games', label: t.categoryGames, icon: Gamepad2 },
                    ].map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = (editingStand.categoria || editingStand.Categoria) === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() =>
                            setEditingStand({ ...editingStand, categoria: cat.id, Categoria: cat.id as CategoriaStand })
                          }
                          className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 border shadow-xs min-h-[42px] active:scale-98 ${
                            isSelected
                              ? 'bg-red-700 text-white border-red-700 font-bold'
                              : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-center">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Grill modality when category is Comida */}
                {(editingStand.categoria || editingStand.Categoria || 'Comida') === 'Comida' && (
                  <div className="p-3 rounded-xl bg-orange-50/70 border border-orange-200 space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-800">
                      {lang === 'de' ? 'Grill vorhanden?' : '¿Cuenta con parrilla?'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingStand({
                            ...editingStand,
                            TieneParrilla: 'SI',
                            tiene_parrilla: true,
                          })
                        }
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                          String(editingStand.TieneParrilla).toUpperCase() === 'SI' || editingStand.tiene_parrilla === true
                            ? 'bg-orange-600 text-white border-orange-700 shadow-xs'
                            : 'bg-white hover:bg-orange-50 text-gray-700 border-gray-300'
                        }`}
                      >
                        <Flame className="w-3.5 h-3.5" />
                        <span>{lang === 'de' ? 'Mit Grill' : 'Sí, con parrilla'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setEditingStand({
                            ...editingStand,
                            TieneParrilla: 'NO',
                            tiene_parrilla: false,
                          })
                        }
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                          String(editingStand.TieneParrilla).toUpperCase() !== 'SI' && editingStand.tiene_parrilla !== true
                            ? 'bg-sky-600 text-white border-sky-700 shadow-xs'
                            : 'bg-white hover:bg-sky-50 text-gray-700 border-gray-300'
                        }`}
                      >
                        <UtensilsCrossed className="w-3.5 h-3.5" />
                        <span>{lang === 'de' ? 'Ohne Grill' : 'No, sin parrilla'}</span>
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {t.standPrice}
                  </label>
                  <input
                    type="number"
                    value={editingStand.precio !== undefined ? editingStand.precio : (editingStand.Precio ?? '')}
                    onChange={(e) =>
                      setEditingStand({ ...editingStand, precio: e.target.value, Precio: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {t.standStatus}
                  </label>
                  <select
                    value={editingStand.estado !== undefined ? editingStand.estado : (editingStand.Estado || 'disponible')}
                    onChange={(e) =>
                      setEditingStand({ ...editingStand, estado: e.target.value, Estado: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700"
                  >
                    <option value="disponible">{t.available}</option>
                    <option value="ocupado">{t.occupied}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {t.standDescription}
                  </label>
                  <input
                    type="text"
                    value={editingStand.descripcion !== undefined ? editingStand.descripcion : (editingStand.Descripcion || '')}
                    onChange={(e) =>
                      setEditingStand({ ...editingStand, descripcion: e.target.value, Descripcion: e.target.value })
                    }
                    placeholder="Detalles opcionales"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700"
                  />
                </div>
              </div>

              <div className="px-5 py-3 border-t border-gray-200 bg-gray-50/80 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setStandModalOpen(false)}
                  disabled={savingStand}
                  className="px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-semibold transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={savingStand}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition"
                >
                  {savingStand && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t.save}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: User Editor */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 p-6 text-gray-900 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h3 className="text-base font-bold text-gray-900">{t.newUser}</h3>
              <button
                onClick={() => setUserModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {userModalError && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block">Error al crear usuario:</span>
                  <span className="font-normal">{userModalError}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {t.username} *
                </label>
                <input
                  type="text"
                  required
                  value={newUserForm.usuario}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, usuario: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {t.fullName} *
                </label>
                <input
                  type="text"
                  required
                  value={newUserForm.nombre}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, nombre: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {t.password} * <span className="text-gray-500 font-normal">({lang === 'de' ? 'mind. 12 Zeichen' : 'mínimo 12 caracteres'})</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={12}
                  placeholder="••••••••••••"
                  value={newUserForm.password}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, password: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {t.userRole} *
                </label>
                <select
                  value={newUserForm.rol}
                  onChange={(e) => setNewUserForm({ ...newUserForm, rol: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700"
                >
                  <option value="ADMIN">{t.roleAdmin} (ADMIN)</option>
                  <option value="PORTERO">{t.roleGate} (PORTERO)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  disabled={savingUser}
                  className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition"
                >
                  {savingUser && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{savingUser ? (lang === 'de' ? 'Wird erstellt...' : 'Creando...') : t.create}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Change Password */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-gray-200 p-6 text-gray-900 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h3 className="text-base font-bold text-gray-900">
                {t.changePassword} ({targetUserToChangePass})
              </h3>
              <button
                onClick={() => setPasswordModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordModalError && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block">Error al cambiar contraseña:</span>
                  <span className="font-normal">{passwordModalError}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {t.newPassword} * <span className="text-gray-500 font-normal">({lang === 'de' ? 'mind. 12 Zeichen' : 'mínimo 12 caracteres'})</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={12}
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  disabled={savingPassword}
                  className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition"
                >
                  {savingPassword && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{savingPassword ? (lang === 'de' ? 'Wird gespeichert...' : 'Guardando...') : t.save}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: New Edition */}
      {editionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 p-6 text-gray-900 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h3 className="text-base font-bold text-gray-900">{t.newEdition}</h3>
              <button
                onClick={() => setEditionModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editionModalError && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block">Error al crear gestión:</span>
                  <span className="font-normal">{editionModalError}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateEdition} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {lang === 'de' ? 'Jahr der Ausgabe (2026 - 2100)' : 'Año de la gestión (2026 - 2100)'} *
                </label>
                <input
                  type="number"
                  min={2026}
                  max={2100}
                  required
                  value={newEditionForm.anio}
                  onChange={(e) =>
                    setNewEditionForm({ ...newEditionForm, anio: Number(e.target.value) || 2026 })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700 font-mono"
                />
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={newEditionForm.copiarStands}
                  onChange={(e) =>
                    setNewEditionForm({
                      ...newEditionForm,
                      copiarStands: e.target.checked,
                    })
                  }
                  className="mt-0.5 rounded border-gray-300 text-red-700 focus:ring-0"
                />
                <span>{t.copyPreviousStands}</span>
              </label>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditionModalOpen(false)}
                  disabled={savingEdition}
                  className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={savingEdition}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition"
                >
                  {savingEdition && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{savingEdition ? (lang === 'de' ? 'Wird erstellt...' : 'Creando...') : t.create}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
