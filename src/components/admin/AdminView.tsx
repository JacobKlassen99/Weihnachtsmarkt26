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
  const loadAdminData = async (token: string, force = false) => {
    setLoadingData(true);
    setDataError(null);
    try {
      const data = await backendService.getAdminData(token, force);
      setAdminData(data);
      if (data.configuracion) {
        setConfigForm(data.configuracion);
      }
    } catch (err: any) {
      if (err.message?.includes('Sesion expirada') || err.message?.includes('expirada')) {
        handleSessionExpired(err.message);
        return;
      }
      setDataError(err.message || 'Error al cargar datos administrativos');
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

    const standNum = String(editingStand.Numero || editingStand.numero || '').trim();
    if (!standNum) {
      setStandModalError(lang === 'de' ? 'Standnummer ist erforderlich' : 'El número de stand es obligatorio');
      return;
    }

    // Check duplicate stand number when creating a new stand
    const standId = editingStand.StandID || editingStand.id;
    const isNewStand = !standId;
    if (isNewStand && adminData?.stands?.some((s) => String(s.Numero || s.numero).trim() === standNum)) {
      setStandModalError(
        lang === 'de'
          ? `Ein Stand mit der Nummer #${standNum} existiert bereits`
          : `Ya existe un stand con el número #${standNum}`
      );
      return;
    }

    const precioVal = Number(editingStand.Precio !== undefined ? editingStand.Precio : editingStand.precio);
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
      const standToSave: Partial<Stand> = {
        StandID: standId || undefined,
        Numero: standNum,
        Nombre: editingStand.Nombre || editingStand.nombre || `Stand ${standNum}`,
        Categoria: (editingStand.Categoria || editingStand.categoria || 'Comida') as CategoriaStand,
        Precio: precioVal,
        Estado: editingStand.Estado || editingStand.estado || 'disponible',
        PosicionX: Number(editingStand.PosicionX ?? editingStand.posicion_x ?? 0),
        PosicionY: Number(editingStand.PosicionY ?? editingStand.posicion_y ?? 0),
        Ancho: Number(editingStand.Ancho ?? editingStand.ancho ?? 1),
        Alto: Number(editingStand.Alto ?? editingStand.alto ?? 1),
        Descripcion: editingStand.Descripcion || editingStand.descripcion || '',
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
      showFeedback(lang === 'de' ? 'Stand erfolgreich in Google Sheets gespeichert' : 'Stand guardado con éxito en Google Sheets', 'success');
      setStandModalOpen(false);
      setStandModalError(null);
      await loadAdminData(token, true);
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

  const copyClientUrl = (alquiler: Alquiler) => {
    const origin = window.location.origin;
    const url = `${origin}/#cliente?token=${encodeURIComponent(alquiler.token_cliente)}`;
    navigator.clipboard.writeText(url);
    setCopiedId(alquiler.id);
    setTimeout(() => setCopiedId(null), 2500);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-28 bg-white text-gray-900">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-md border border-red-200 font-mono">
              {adminData?.configuracion?.GESTION_ACTIVA || 'GES-2026'}
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">
              {t.navAdmin}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => sessionToken && loadAdminData(sessionToken, true)}
            disabled={loadingData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-gray-50 text-gray-700 text-xs border border-gray-300 transition active:scale-95 disabled:opacity-50 shadow-xs"
            title={t.refreshData}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin text-red-700' : ''}`} />
            <span>{t.refreshData}</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-red-50 text-red-700 text-xs border border-gray-300 hover:border-red-200 transition active:scale-95"
            title={t.logout}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.logout}</span>
          </button>
        </div>
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

      {/* Admin Layout: 2-Column Grid on Mobile, Vertical Sidebar on Desktop */}
      <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-8 lg:items-start">
        {/* Navigation Menu (2 Columns on Phone, Vertical Sticky Sidebar on Desktop) */}
        <aside className="mb-6 lg:mb-0">
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5 lg:bg-gray-50/80 lg:p-3 lg:rounded-2xl lg:border lg:border-gray-200 lg:sticky lg:top-20">
            <div className="hidden lg:block pb-2 mb-1 border-b border-gray-200 px-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                {lang === 'de' ? 'Menü' : 'Menú'}
              </span>
            </div>
            {tabs.map((tab, idx) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isLast = idx === tabs.length - 1; // 9th item: Configuración
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as AdminTab)}
                  className={`flex items-center gap-2 px-2.5 sm:px-3 py-3 rounded-xl text-[11px] sm:text-xs font-semibold transition border min-h-[46px] shadow-xs active:scale-98 ${
                    isLast ? 'col-span-2 lg:col-span-1' : ''
                  } ${
                    isActive
                      ? 'bg-red-700 text-white border-red-700 font-bold'
                      : 'bg-white text-gray-700 hover:text-red-700 hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-left leading-tight">{tab.label}</span>
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
      {activeTab === 'stands' && adminData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900">{t.tabStands}</h3>
            <button
              onClick={() => {
                setStandModalError(null);
                setEditingStand({
                  numero: '',
                  nombre: '',
                  categoria: 'Comida',
                  precio: '100',
                  estado: 'disponible',
                  descripcion: '',
                });
                setStandModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-semibold text-xs transition active:scale-95 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.newStand}</span>
            </button>
          </div>

          <div className="rounded-xl bg-white border border-gray-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">{t.standCategory}</th>
                    <th className="p-3">{t.standPrice}</th>
                    <th className="p-3">{t.standStatus}</th>
                    <th className="p-3">{t.standDescription}</th>
                    <th className="p-3 text-right">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {adminData.stands.map((stand) => (
                    <tr key={stand.id || stand.numero} className="hover:bg-gray-50/80 transition">
                      <td className="p-3 font-bold font-mono text-gray-900">#{stand.numero}</td>
                      <td className="p-3">{stand.categoria}</td>
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
                          onClick={() => {
                            setStandModalError(null);
                            setEditingStand(stand);
                            setStandModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 transition shadow-xs"
                          title={t.edit}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {adminData.stands.length === 0 && (
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
        </div>
      )}

      {/* 3. SOLICITUDES TAB */}
      {activeTab === 'solicitudes' && adminData && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-gray-900">{t.tabRequests}</h3>
          <div className="rounded-xl bg-white border border-gray-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="p-3">Stand</th>
                    <th className="p-3">{t.fullName}</th>
                    <th className="p-3">{t.phone}</th>
                    <th className="p-3">{t.requestDate}</th>
                    <th className="p-3">{t.status}</th>
                    <th className="p-3 text-right">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {adminData.solicitudes.map((sol) => (
                    <tr key={sol.id} className="hover:bg-gray-50/80 transition">
                      <td className="p-3 font-mono font-bold text-red-700">#{sol.stand}</td>
                      <td className="p-3 font-semibold text-gray-900">{sol.nombre}</td>
                      <td className="p-3 font-mono">{sol.telefono}</td>
                      <td className="p-3 text-gray-500">{sol.fecha || '-'}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            sol.estado === 'confirmada'
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : sol.estado === 'rechazada'
                              ? 'bg-gray-100 text-gray-600 border border-gray-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {sol.estado}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {sol.estado === 'pendiente' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <a
                              href={`https://wa.me/${sol.telefono.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition shadow-xs"
                              title="WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
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
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[10px]">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {adminData.solicitudes.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        {lang === 'de' ? 'Keine Anfragen vorhanden.' : 'No hay solicitudes registradas.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. ALQUILERES TAB */}
      {activeTab === 'alquileres' && adminData && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-gray-900">{t.tabRentals}</h3>
          <div className="rounded-xl bg-white border border-gray-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="p-3">Stand</th>
                    <th className="p-3">{t.clientName}</th>
                    <th className="p-3">{t.phone}</th>
                    <th className="p-3">{t.rentalDate}</th>
                    <th className="p-3">{t.status}</th>
                    <th className="p-3 text-right">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {adminData.alquileres.map((alq) => (
                    <tr key={alq.id} className="hover:bg-gray-50/80 transition">
                      <td className="p-3 font-mono font-bold text-red-700">#{alq.stand}</td>
                      <td className="p-3 font-semibold text-gray-900">{alq.cliente}</td>
                      <td className="p-3 font-mono">{alq.telefono}</td>
                      <td className="p-3 text-gray-500">{alq.fecha_alquiler || '-'}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            alq.estado === 'activo'
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {alq.estado}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => copyClientUrl(alq)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 transition text-[11px] shadow-xs"
                            title={t.copyClientLink}
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copiedId === alq.id ? t.copied : t.clientLink}</span>
                          </button>
                          {alq.estado === 'activo' && (
                            <button
                              onClick={() => handleCancelRental(alq.id)}
                              disabled={actionInProgress === alq.id}
                              className="p-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition"
                              title={t.cancelRental}
                            >
                              {actionInProgress === alq.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {adminData.alquileres.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        {lang === 'de' ? 'Keine Mietverträge vorhanden.' : 'No hay alquileres confirmados aún.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. INVITADOS TAB */}
      {activeTab === 'invitados' && adminData && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-gray-900">{t.tabGuests}</h3>
          <div className="rounded-xl bg-white border border-gray-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="p-3">Stand</th>
                    <th className="p-3">{t.guestName}</th>
                    <th className="p-3">{t.status}</th>
                    <th className="p-3">{t.registeredOn}</th>
                    <th className="p-3 text-right">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {adminData.invitados.map((inv) => (
                    <tr key={inv.id || inv.token_invitacion} className="hover:bg-gray-50/80 transition">
                      <td className="p-3 font-mono font-bold text-red-700">#{inv.stand}</td>
                      <td className="p-3 font-semibold text-gray-900">
                        {inv.nombre_invitado || t.notRegisteredYet}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            inv.estado === 'registrado'
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : inv.estado === 'revocado'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {inv.estado}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500">{inv.fecha_registro || '-'}</td>
                      <td className="p-3 text-right">
                        {inv.estado !== 'revocado' && (
                          <button
                            onClick={() => handleRevokeGuest(inv.id)}
                            disabled={actionInProgress === inv.id}
                            className="p-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition shadow-xs"
                            title={t.revokeInvitation}
                          >
                            {actionInProgress === inv.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {adminData.invitados.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500">
                        {lang === 'de' ? 'Keine Gäste registriert.' : 'No hay invitados registrados aún.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. ACCESOS TAB */}
      {activeTab === 'accesos' && adminData && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-gray-900">{t.tabAccess}</h3>
          <div className="rounded-xl bg-white border border-gray-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="p-3">{t.time}</th>
                    <th className="p-3">{t.fullName}</th>
                    <th className="p-3">Stand</th>
                    <th className="p-3">{t.actions}</th>
                    <th className="p-3">{t.scannedBy}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {adminData.accesos.map((acc, idx) => (
                    <tr key={acc.id || idx} className="hover:bg-gray-50/80 transition">
                      <td className="p-3 font-mono text-gray-500">{acc.fecha_hora}</td>
                      <td className="p-3 font-semibold text-gray-900">{acc.nombre}</td>
                      <td className="p-3 font-mono font-bold text-red-700">#{acc.stand}</td>
                      <td className="p-3 capitalize">{acc.tipo}</td>
                      <td className="p-3 text-gray-500">{acc.portero || 'Portería'}</td>
                    </tr>
                  ))}
                  {adminData.accesos.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500">
                        {lang === 'de' ? 'Noch keine Scans protokolliert.' : 'No hay entradas escaneadas registradas aún.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. USUARIOS TAB */}
      {activeTab === 'usuarios' && adminData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900">{t.tabUsers}</h3>
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

          <div className="rounded-xl bg-white border border-gray-200 overflow-hidden shadow-xs">
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
                  {adminData.usuarios.map((u) => (
                    <tr key={u.usuario} className="hover:bg-gray-50/80 transition">
                      <td className="p-3 font-mono font-bold text-gray-900">{u.usuario}</td>
                      <td className="p-3">{u.nombre}</td>
                      <td className="p-3 capitalize">{u.rol}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            u.estado === 'activo'
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}
                        >
                          {u.estado}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setPasswordModalError(null);
                              setNewPasswordValue('');
                              setTargetUserToChangePass(u.usuario);
                              setTargetUserIdToChangePass(u.UsuarioID || u.id || (u as any).ID || u.usuario);
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
                  ))}
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
              const gestIdentifier = gest.id || gest.nombre;
              return (
              <div
                key={gestIdentifier}
                className={`p-5 rounded-xl border transition ${
                  gest.activa
                    ? 'bg-red-50/50 border-red-300 shadow-xs'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h4 className="text-base font-bold text-gray-900 font-mono">{gest.nombre}</h4>
                  {gest.activa ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-700 text-white shadow-xs">
                      {t.activeBadge}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleActivateEdition(gest)}
                      disabled={actionInProgress === gestIdentifier}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 border border-gray-300 text-[11px] font-semibold transition active:scale-95 shadow-xs"
                    >
                      {actionInProgress === gestIdentifier && (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      )}
                      <span>{t.activateEdition}</span>
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {lang === 'de' ? 'Erstellt am:' : 'Creada:'} {gest.fecha_creacion || '2026'}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 p-6 text-gray-900 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h3 className="text-base font-bold text-gray-900">
                {editingStand.id ? t.editStand : t.newStand}
              </h3>
              <button
                onClick={() => setStandModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {standModalError && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block">Error al guardar stand:</span>
                  <span className="font-normal">{standModalError}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveStand} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {t.standNumber} *
                </label>
                <input
                  type="text"
                  required
                  value={editingStand.numero}
                  onChange={(e) =>
                    setEditingStand({ ...editingStand, numero: e.target.value })
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
                  placeholder={`Stand ${editingStand.numero || ''}`}
                  value={editingStand.nombre || ''}
                  onChange={(e) =>
                    setEditingStand({ ...editingStand, nombre: e.target.value })
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
                    const isSelected = editingStand.categoria === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() =>
                          setEditingStand({ ...editingStand, categoria: cat.id })
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

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {t.standPrice}
                </label>
                <input
                  type="number"
                  value={editingStand.precio}
                  onChange={(e) =>
                    setEditingStand({ ...editingStand, precio: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {t.standStatus}
                </label>
                <select
                  value={editingStand.estado}
                  onChange={(e) =>
                    setEditingStand({ ...editingStand, estado: e.target.value })
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
                  value={editingStand.descripcion || ''}
                  onChange={(e) =>
                    setEditingStand({ ...editingStand, descripcion: e.target.value })
                  }
                  placeholder="Detalles opcionales"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStandModalOpen(false)}
                  disabled={savingStand}
                  className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition"
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
