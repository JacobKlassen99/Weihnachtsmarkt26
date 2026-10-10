import {
  AdminData,
  Configuracion,
  InvitacionInfo,
  LoginResponse,
  MiAlquilerData,
  PublicData,
  ScanResult,
  Stand,
  Usuario,
} from '../types';

export const BACKEND_URL =
  'https://script.google.com/macros/s/AKfycbzPYXuXu8FSvtmRVaDywv8OxsDZZX45WfxpNBoPmdF29cnezThtfv2bxRxoELdTjUSz/exec';

// Proxy endpoint for Netlify and Vite development server
export const PROXY_URL = '/api/backend';

// Temporal in-memory cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class BackendService {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly CACHE_TTL_MS = 30000; // 30 seconds cache

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    const now = Date.now();
    if (now - entry.timestamp > this.CACHE_TTL_MS) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  public invalidateCache(prefix?: string): void {
    if (!prefix) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Helper to execute a POST request to Google Apps Script via the backend proxy (/api/backend).
   * Does NOT use silent fallbacks or mode: 'no-cors' so that errors are transparent.
   */
  private async postRequest<T>(payload: Record<string, unknown>): Promise<T> {
    const bodyStr = JSON.stringify(payload);

    let proxyResponse: Response;
    try {
      proxyResponse = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: bodyStr,
      });
    } catch (networkErr: any) {
      throw new Error(
        `Error de red al conectar con ${PROXY_URL}: ${networkErr.message || 'Sin conexión'}`
      );
    }

    const text = await proxyResponse.text();

    if (!proxyResponse.ok) {
      let errorMsg = `Error HTTP ${proxyResponse.status} en ${PROXY_URL}`;
      try {
        const errJson = JSON.parse(text);
        if (errJson.error) errorMsg = errJson.error;
      } catch {
        if (text.includes('<title>') || text.includes('<!DOCTYPE') || text.includes('<html')) {
          const match = text.match(/<title>(.*?)<\/title>/i);
          errorMsg = `El servidor devolvió una página HTML en lugar de JSON (${match ? match[1].trim() : 'Error'}). Verifica que la función /api/backend esté desplegada en Netlify.`;
        }
      }
      throw new Error(errorMsg);
    }

    try {
      const parsed = JSON.parse(text);
      return parsed as T;
    } catch {
      if (text.includes('<title>') || text.includes('<!DOCTYPE') || text.includes('<html')) {
        const match = text.match(/<title>(.*?)<\/title>/i);
        const pageTitle = match ? match[1].trim() : 'Página HTML';
        throw new Error(
          `El servidor respondió con HTML en lugar de JSON (${pageTitle}). La ruta ${PROXY_URL} fue interceptada por el fallback SPA.`
        );
      }
      throw new Error(`Respuesta no válida del servidor: ${text.slice(0, 100)}`);
    }
  }

  // 1. PUBLIC AREA: Obtener stands y configuración del evento
  public async getPublicData(forceRefresh = false): Promise<PublicData> {
    const cacheKey = 'public_data';
    if (!forceRefresh) {
      const cached = this.getCached<PublicData>(cacheKey);
      if (cached) return cached;
    }

    let response: Response;
    try {
      response = await fetch(`${PROXY_URL}?action=public`, {
        method: 'GET',
      });
    } catch (networkErr: any) {
      throw new Error(
        `Error de red al consultar ${PROXY_URL}?action=public: ${networkErr.message || 'Sin conexión'}`
      );
    }

    const text = await response.text();

    if (!response.ok) {
      if (text.includes('<title>') || text.includes('<!DOCTYPE') || text.includes('<html')) {
        const match = text.match(/<title>(.*?)<\/title>/i);
        throw new Error(
          `El servidor devolvió HTML (${match ? match[1].trim() : 'Página HTML'}). Verifica la ruta ${PROXY_URL} en Netlify.`
        );
      }
      throw new Error(`Error en el servidor (${response.status}: ${response.statusText || 'Sin respuesta'})`);
    }

    let result: any;
    try {
      result = JSON.parse(text);
    } catch {
      if (text.includes('<title>') || text.includes('<!DOCTYPE') || text.includes('<html')) {
        const match = text.match(/<title>(.*?)<\/title>/i);
        throw new Error(
          `El servidor respondió con HTML en lugar de JSON (${match ? match[1].trim() : 'Página HTML'}). Verifica el proxy ${PROXY_URL}.`
        );
      }
      throw new Error(`Respuesta no válida del servidor: ${text.slice(0, 100)}`);
    }

    if (!result.ok) {
      throw new Error(result.error || 'No se pudieron cargar los datos del evento');
    }

    const publicData: PublicData = {
      configuracion: result.data?.configuracion || {
        NOMBRE_EVENTO: 'Weihnachtsmarkt',
        IDIOMA_PREDETERMINADO: 'es',
        WHATSAPP_ADMIN: '75593587',
        MONEDA: '$us',
        MAX_INVITADOS: '5',
        GESTION_ACTIVA: 'GES-2026',
        MENSAJE_WHATSAPP_ES:
          'Hola, soy {NOMBRE}. Solicité el Stand {STAND} de la categoría {CATEGORIA} para el Weihnachtsmarkt.',
        MENSAJE_WHATSAPP_DE:
          'Hallo, ich bin {NOMBRE}. Ich habe Stand {STAND} in der Kategorie {CATEGORIA} für den Weihnachtsmarkt angefragt.',
      },
      stands: Array.isArray(result.data?.stands)
        ? result.data.stands.map((s: any) => ({
            ...s,
            id: s.StandID || s.id || '',
            StandID: s.StandID || s.id || '',
            numero: s.Numero !== undefined ? s.Numero : (s.numero ?? ''),
            Numero: s.Numero !== undefined ? s.Numero : (s.numero ?? ''),
            nombre: s.Nombre || s.nombre || '',
            Nombre: s.Nombre || s.nombre || '',
            categoria: s.Categoria || s.categoria || 'Comida',
            Categoria: s.Categoria || s.categoria || 'Comida',
            precio: s.Precio !== undefined ? s.Precio : (s.precio ?? 0),
            Precio: s.Precio !== undefined ? s.Precio : (s.precio ?? 0),
            estado: String(s.Estado || s.estado || 'disponible').toLowerCase(),
            Estado: String(s.Estado || s.estado || 'DISPONIBLE').toUpperCase(),
            posicion_x: Number(s.PosicionX !== undefined ? s.PosicionX : (s.posicion_x ?? 0)),
            PosicionX: Number(s.PosicionX !== undefined ? s.PosicionX : (s.posicion_x ?? 0)),
            posicion_y: Number(s.PosicionY !== undefined ? s.PosicionY : (s.posicion_y ?? 0)),
            PosicionY: Number(s.PosicionY !== undefined ? s.PosicionY : (s.posicion_y ?? 0)),
            ancho: Number(s.Ancho !== undefined ? s.Ancho : (s.ancho ?? 1)),
            Ancho: Number(s.Ancho !== undefined ? s.Ancho : (s.ancho ?? 1)),
            alto: Number(s.Alto !== undefined ? s.Alto : (s.alto ?? 1)),
            Alto: Number(s.Alto !== undefined ? s.Alto : (s.alto ?? 1)),
            descripcion: s.Descripcion || s.descripcion || '',
            Descripcion: s.Descripcion || s.descripcion || '',
          }))
        : [],
    };

    this.setCache(cacheKey, publicData);
    return publicData;
  }

  // 2. SOLICITUD DE ALQUILER (action: 'solicitud', StandID, NombreCompleto, Telefono, Idioma)
  public async submitSolicitud(params: {
    standId?: string;
    stand: string | number;
    categoria: string;
    nombre: string;
    telefono: string;
    observacion?: string;
    idioma?: string;
  }): Promise<{ ok: boolean; error?: string; mensaje?: string; whatsapp_url?: string; [key: string]: any }> {
    const payload: Record<string, unknown> = {
      action: 'solicitud',
      StandID: params.standId ? String(params.standId).trim() : undefined,
      NombreCompleto: String(params.nombre || '').trim(),
      Telefono: String(params.telefono || '').trim(),
      Observacion: String(params.observacion || '').trim(),
      Idioma: String(params.idioma || 'es').trim(),
      stand: params.stand,
      categoria: params.categoria,
      nombre: String(params.nombre || '').trim(),
      telefono: String(params.telefono || '').trim(),
      observacion: String(params.observacion || '').trim(),
      Observaciones: String(params.observacion || '').trim(),
    };

    if (!payload.StandID) {
      delete payload.StandID;
    }

    const res = await this.postRequest<{
      ok: boolean;
      error?: string;
      mensaje?: string;
      whatsapp_url?: string;
      data?: any;
    }>(payload);

    if (res.ok) {
      this.invalidateCache('public_data');
      this.invalidateCache('admin_data');
    }

    return res;
  }

  // 3. ÁREA PRIVADA DEL CLIENTE: miAlquiler
  public async getMiAlquiler(token: string): Promise<MiAlquilerData> {
    const res = await this.postRequest<{ ok: boolean; data?: any; error?: string }>({
      action: 'miAlquiler',
      token,
    });

    if (!res.ok) {
      throw new Error(res.error || 'Enlace de cliente inválido');
    }

    return res.data;
  }

  // 3a. ACTIVAR CLIENTE
  public async activarCliente(clienteToken: string, secretoDispositivo: string): Promise<{ ok: boolean; qr_acceso?: string; error?: string; [key: string]: any }> {
    const res = await this.postRequest<{ ok: boolean; qr_acceso?: string; error?: string; [key: string]: any }>({
      action: 'activarCliente',
      ClienteToken: clienteToken,
      SecretoDispositivo: secretoDispositivo,
    });
    return res;
  }

  // 3b. QR DISPOSITIVO
  public async qrDispositivo(
    personaTipo: 'CLIENTE' | 'INVITADO',
    personaId: string,
    secretoDispositivo: string
  ): Promise<{ ok: boolean; qr_acceso?: string; QR?: string; error?: string; [key: string]: any }> {
    const res = await this.postRequest<{ ok: boolean; qr_acceso?: string; QR?: string; error?: string; [key: string]: any }>({
      action: 'qrDispositivo',
      PersonaTipo: personaTipo,
      PersonaID: personaId,
      SecretoDispositivo: secretoDispositivo,
    });
    return res;
  }

  // 3c. MI ALQUILER DISPOSITIVO
  public async getMiAlquilerDispositivo(alquilerId: string, secretoDispositivo: string): Promise<MiAlquilerData> {
    const res = await this.postRequest<{ ok: boolean; data?: any; error?: string }>({
      action: 'miAlquilerDispositivo',
      AlquilerID: String(alquilerId).trim(),
      SecretoDispositivo: secretoDispositivo,
    });

    if (!res.ok) {
      throw new Error(res.error || 'No se pudo recuperar la información del alquiler con este dispositivo');
    }

    return res.data;
  }

  // 4. CREAR INVITACIÓN (desde área del cliente)
  public async crearInvitacion(
    alquilerId: string,
    secretoDispositivo: string,
    nombreSugerido?: string
  ): Promise<{ ok: boolean; token_invitacion?: string; error?: string; [key: string]: any }> {
    const res = await this.postRequest<{ ok: boolean; token_invitacion?: string; error?: string; [key: string]: any }>({
      action: 'crearInvitacion',
      AlquilerID: String(alquilerId).trim(),
      PersonaID: String(alquilerId).trim(),
      PersonaTipo: 'CLIENTE',
      SecretoDispositivo: secretoDispositivo,
      nombre: nombreSugerido,
    });

    if (res.ok) {
      this.invalidateCache('admin_data');
    }

    return res;
  }

  // 5. INVITADO: Consultar invitación
  public async consultarInvitacion(tokenInvitacion: string): Promise<InvitacionInfo> {
    const res = await this.postRequest<{ ok: boolean; data?: any; error?: string }>({
      action: 'consultarInvitacion',
      token: tokenInvitacion,
    });

    if (!res.ok) {
      return {
        valida: false,
        error: res.error || 'Invitación no disponible',
      };
    }

    return {
      valida: true,
      ...res.data,
    };
  }

  // 6. INVITADO: Registrar invitado / activarInvitado
  public async registrarInvitado(
    tokenInvitacion: string,
    nombreCompleto: string
  ): Promise<{ ok: boolean; error?: string; qr_acceso?: string }> {
    const res = await this.postRequest<{ ok: boolean; error?: string; qr_acceso?: string }>({
      action: 'registrarInvitado',
      token: tokenInvitacion,
      nombre: nombreCompleto,
    });

    if (res.ok) {
      this.invalidateCache('admin_data');
    }

    return res;
  }

  public async activarInvitado(
    tokenInvitacion: string,
    nombreCompleto: string,
    secretoDispositivo: string
  ): Promise<{ ok: boolean; error?: string; qr_acceso?: string; [key: string]: any }> {
    const res = await this.postRequest<{ ok: boolean; error?: string; qr_acceso?: string; [key: string]: any }>({
      action: 'activarInvitado',
      TokenInvitacion: tokenInvitacion,
      NombreCompleto: nombreCompleto,
      SecretoDispositivo: secretoDispositivo,
    });
    if (res.ok) {
      this.invalidateCache('admin_data');
    }
    return res;
  }

  // ACCESO ALQUILER ADMIN
  public async accesoAlquilerAdmin(token: string, alquilerId: string): Promise<{ ok: boolean; data?: any; error?: string }> {
    const res = await this.postRequest<{ ok: boolean; data?: any; error?: string }>({
      action: 'accesoAlquilerAdmin',
      token,
      AlquilerID: String(alquilerId).trim(),
    });
    return res;
  }

  // RESET DISPOSITIVO
  public async resetDispositivo(token: string, personaTipo: 'CLIENTE' | 'INVITADO', personaId: string): Promise<{ ok: boolean; data?: any; error?: string; [key: string]: any }> {
    const res = await this.postRequest<{ ok: boolean; data?: any; error?: string; [key: string]: any }>({
      action: 'resetDispositivo',
      token,
      PersonaTipo: personaTipo,
      PersonaID: String(personaId).trim(),
    });
    if (res.ok) {
      this.invalidateCache('admin_data');
    }
    return res;
  }

  // 7. LOGIN (Administrador y Portero)
  public async login(
    usuario: string,
    password: string
  ): Promise<LoginResponse> {
    const res = await this.postRequest<LoginResponse>({
      action: 'login',
      usuario,
      password,
    });

    // Normalize so data.token, data.rol and flat token/rol are both available
    const rawData = (res.data || {}) as Record<string, any>;
    const rawRoot = res as Record<string, any>;
    const extractedToken =
      rawData.token ||
      rawRoot.token ||
      rawData.token_sesion ||
      rawRoot.token_sesion ||
      rawData.sessionToken ||
      rawRoot.sessionToken ||
      '';

    const extractedRol =
      rawData.rol ||
      rawRoot.rol ||
      (typeof rawRoot.usuario === 'object' && rawRoot.usuario !== null ? rawRoot.usuario.rol : null) ||
      'admin';

    const extractedUsuario =
      (typeof rawData.usuario === 'string' ? rawData.usuario : null) ||
      (typeof rawRoot.usuario === 'string' ? rawRoot.usuario : null) ||
      (typeof rawRoot.usuario === 'object' && rawRoot.usuario !== null ? rawRoot.usuario.usuario : null) ||
      usuario;

    const extractedNombre =
      rawData.nombre ||
      rawRoot.nombre ||
      (typeof rawRoot.usuario === 'object' && rawRoot.usuario !== null ? rawRoot.usuario.nombre : null) ||
      extractedUsuario;

    res.token = extractedToken;
    res.rol = extractedRol;
    res.nombre = extractedNombre;
    res.usuario = extractedUsuario;

    if (!res.data) {
      res.data = {
        token: extractedToken,
        usuario: extractedUsuario,
        rol: extractedRol,
        nombre: extractedNombre,
      };
    } else {
      res.data.token = extractedToken;
      res.data.rol = extractedRol;
      res.data.nombre = extractedNombre;
      res.data.usuario = extractedUsuario;
    }

    return res;
  }

  // 8. ADMIN DATA (Obtener todos los datos administrativos)
  public async getAdminData(token: string, forceRefresh = false): Promise<AdminData> {
    const cacheKey = `admin_data_${token.slice(0, 10)}`;
    if (!forceRefresh) {
      const cached = this.getCached<AdminData>(cacheKey);
      if (cached) return cached;
    }

    const res = await this.postRequest<{ ok: boolean; data?: any; error?: string }>({
      action: 'adminData',
      token,
    });

    if (!res.ok) {
      throw new Error(res.error || 'Sesión expirada o no autorizada');
    }

    const adminData: AdminData = {
      configuracion: res.data?.configuracion || {},
      stands: Array.isArray(res.data?.stands)
        ? res.data.stands.map((s: any) => ({
            ...s,
            id: s.StandID || s.id || '',
            StandID: s.StandID || s.id || '',
            numero: s.Numero !== undefined ? s.Numero : (s.numero ?? ''),
            Numero: s.Numero !== undefined ? s.Numero : (s.numero ?? ''),
            nombre: s.Nombre || s.nombre || '',
            Nombre: s.Nombre || s.nombre || '',
            categoria: s.Categoria || s.categoria || 'Comida',
            Categoria: s.Categoria || s.categoria || 'Comida',
            precio: s.Precio !== undefined ? s.Precio : (s.precio ?? 0),
            Precio: s.Precio !== undefined ? s.Precio : (s.precio ?? 0),
            estado: String(s.Estado || s.estado || 'disponible').toLowerCase(),
            Estado: String(s.Estado || s.estado || 'DISPONIBLE').toUpperCase(),
            posicion_x: Number(s.PosicionX !== undefined ? s.PosicionX : (s.posicion_x ?? 0)),
            PosicionX: Number(s.PosicionX !== undefined ? s.PosicionX : (s.posicion_x ?? 0)),
            posicion_y: Number(s.PosicionY !== undefined ? s.PosicionY : (s.posicion_y ?? 0)),
            PosicionY: Number(s.PosicionY !== undefined ? s.PosicionY : (s.posicion_y ?? 0)),
            ancho: Number(s.Ancho !== undefined ? s.Ancho : (s.ancho ?? 1)),
            Ancho: Number(s.Ancho !== undefined ? s.Ancho : (s.ancho ?? 1)),
            alto: Number(s.Alto !== undefined ? s.Alto : (s.alto ?? 1)),
            Alto: Number(s.Alto !== undefined ? s.Alto : (s.alto ?? 1)),
            descripcion: s.Descripcion || s.descripcion || '',
            Descripcion: s.Descripcion || s.descripcion || '',
          }))
        : [],
      solicitudes: Array.isArray(res.data?.solicitudes)
        ? res.data.solicitudes.map((s: any) => {
            const idVal = s.SolicitudID || s.solicitudID || s.id || s.ID || '';
            const standVal = s.NumeroStand || s.numeroStand || s.stand || s.Stand || '';
            const nomVal = s.NombreCompleto || s.nombreCompleto || s.nombre || s.Nombre || '';
            const telVal = String(s.Telefono ?? s.telefono ?? s.phone ?? '');
            const fechaVal = s.FechaSolicitud || s.fechaSolicitud || s.fecha || s.Fecha || '';
            const estadoVal = String(s.Estado || s.estado || 'pendiente').toLowerCase();
            const catVal = s.Categoria || s.categoria || 'Comida';
            const obsVal = s.Observacion || s.observacion || s.Observaciones || s.observaciones || '';
            return {
              ...s,
              id: idVal,
              SolicitudID: idVal,
              stand: standVal,
              NumeroStand: standVal,
              nombre: nomVal,
              NombreCompleto: nomVal,
              telefono: telVal,
              Telefono: telVal,
              observacion: obsVal,
              Observacion: obsVal,
              fecha: fechaVal,
              FechaSolicitud: fechaVal,
              estado: estadoVal,
              Estado: String(s.Estado || s.estado || 'PENDIENTE').toUpperCase(),
              categoria: catVal,
              Categoria: catVal,
            };
          })
        : [],
      alquileres: Array.isArray(res.data?.alquileres)
        ? res.data.alquileres.map((a: any) => {
            const idVal = a.AlquilerID || a.alquilerID || a.id || a.ID || '';
            const standVal = a.NumeroStand || a.numeroStand || a.stand || a.Stand || '';
            const clienteVal = a.Cliente || a.cliente || a.NombreCompleto || a.nombreCompleto || '';
            const telVal = String(a.Telefono ?? a.telefono ?? '');
            const tokenVal = a.TokenCliente || a.tokenCliente || a.token_cliente || '';
            const fechaVal = a.FechaAlquiler || a.fechaAlquiler || a.fecha_alquiler || a.fecha || '';
            const estadoVal = String(a.Estado || a.estado || 'activo').toLowerCase();
            return {
              ...a,
              id: idVal,
              AlquilerID: idVal,
              stand: standVal,
              NumeroStand: standVal,
              cliente: clienteVal,
              Cliente: clienteVal,
              telefono: telVal,
              Telefono: telVal,
              token_cliente: tokenVal,
              TokenCliente: tokenVal,
              fecha_alquiler: fechaVal,
              FechaAlquiler: fechaVal,
              estado: estadoVal,
              Estado: String(a.Estado || a.estado || 'ACTIVO').toUpperCase(),
            };
          })
        : [],
      invitados: Array.isArray(res.data?.invitados)
        ? res.data.invitados.map((i: any) => {
            const idVal = i.InvitadoID || i.invitadoID || i.id || i.ID || '';
            const standVal = i.NumeroStand || i.numeroStand || i.stand || i.Stand || '';
            const nomVal = i.NombreInvitado || i.nombreInvitado || i.nombre_invitado || i.nombre || '';
            const tokenVal = i.TokenInvitacion || i.tokenInvitacion || i.token_invitacion || '';
            const estadoVal = String(i.Estado || i.estado || 'disponible').toLowerCase();
            const fechaReg = i.FechaRegistro || i.fechaRegistro || i.fecha_registro || '';
            const fechaCre = i.FechaCreacion || i.fechaCreacion || i.fecha_creacion || '';
            return {
              ...i,
              id: idVal,
              InvitadoID: idVal,
              stand: standVal,
              NumeroStand: standVal,
              nombre_invitado: nomVal,
              NombreInvitado: nomVal,
              token_invitacion: tokenVal,
              TokenInvitacion: tokenVal,
              estado: estadoVal,
              Estado: String(i.Estado || i.estado || 'DISPONIBLE').toUpperCase(),
              fecha_registro: fechaReg,
              FechaRegistro: fechaReg,
              fecha_creacion: fechaCre,
              FechaCreacion: fechaCre,
            };
          })
        : [],
      accesos: Array.isArray(res.data?.accesos)
        ? res.data.accesos.map((ac: any) => {
            const idVal = ac.AccesoID || ac.accesoID || ac.id || ac.ID || '';
            const fechaVal = ac.FechaHora || ac.fechaHora || ac.fecha_hora || ac.fecha || '';
            const nomVal = ac.Nombre || ac.nombre || '';
            const tipoVal = String(ac.Tipo || ac.tipo || 'cliente').toLowerCase();
            const standVal = ac.NumeroStand || ac.numeroStand || ac.stand || ac.Stand || '';
            const porteroVal = ac.Portero || ac.portero || '';
            return {
              ...ac,
              id: idVal,
              AccesoID: idVal,
              fecha_hora: fechaVal,
              FechaHora: fechaVal,
              nombre: nomVal,
              Nombre: nomVal,
              tipo: tipoVal,
              Tipo: tipoVal,
              stand: standVal,
              NumeroStand: standVal,
              portero: porteroVal,
              Portero: porteroVal,
            };
          })
        : [],
      gestiones: Array.isArray(res.data?.gestiones)
        ? res.data.gestiones.map((g: any) => {
            const idVal = g.GestionID || g.gestionID || g.id || g.ID || '';
            const nomVal = g.Nombre || g.nombre || '';
            const anioVal = Number(g.Anio || g.anio || 2026);
            const activaVal = Boolean(g.Activa !== undefined ? g.Activa : (g.activa !== undefined ? g.activa : false));
            return {
              ...g,
              id: idVal,
              GestionID: idVal,
              nombre: nomVal,
              Nombre: nomVal,
              anio: anioVal,
              Anio: anioVal,
              activa: activaVal,
              Activa: activaVal,
            };
          })
        : [],
      usuarios: Array.isArray(
        res.data?.usuarios ||
        res.data?.users ||
        res.data?.listaUsuarios ||
        res.data?.lista_usuarios ||
        (res as any).usuarios
      )
        ? (
            res.data?.usuarios ||
            res.data?.users ||
            res.data?.listaUsuarios ||
            res.data?.lista_usuarios ||
            (res as any).usuarios
          ).map((u: any) => {
            const rawActivo = String(u.Activo || u.activo || u.estado || u.status || 'SI').trim().toUpperCase();
            const isActivo = rawActivo === 'SI' || rawActivo === 'ACTIVO' || rawActivo === 'TRUE' || rawActivo === '1' || rawActivo === 'YES';
            return {
              ...u,
              id: u.UsuarioID || u.id || u.ID || u.usuarioID || '',
              UsuarioID: u.UsuarioID || u.id || u.ID || u.usuarioID || '',
              usuario: u.Usuario || u.usuario || u.username || '',
              Usuario: u.Usuario || u.usuario || u.username || '',
              nombre: u.Nombre || u.nombre || u.fullName || u.name || '',
              Nombre: u.Nombre || u.nombre || u.fullName || u.name || '',
              rol: String(u.Rol || u.rol || u.role || 'ADMIN').toUpperCase(),
              Rol: String(u.Rol || u.rol || u.role || 'ADMIN').toUpperCase(),
              Activo: isActivo ? 'SI' : 'NO',
              activo: isActivo ? 'SI' : 'NO',
              estado: isActivo ? 'activo' : 'inactivo',
              PasswordHash: undefined,
              passwordHash: undefined,
              VersionAcceso: u.VersionAcceso || u.versionAcceso || u.version || '',
              FechaCreacion: u.FechaCreacion || u.fechaCreacion || u.fecha_creacion || '',
              FechaActualizacion: u.FechaActualizacion || u.fechaActualizacion || u.fecha_actualizacion || '',
            };
          })
        : [],
    };

    this.setCache(cacheKey, adminData);
    return adminData;
  }

  // 9. GUARDAR STAND (Crear o editar: saveStand_(p))
  public async saveStand(
    token: string,
    stand: Partial<Stand>
  ): Promise<{ ok: boolean; error?: string }> {
    const num = stand.Numero !== undefined ? stand.Numero : (stand.numero !== undefined ? stand.numero : '');
    const numClean = typeof num === 'number' ? num : String(num).trim();
    const standName = String(stand.Nombre || stand.nombre || `Stand ${numClean}`).trim();
    const cat = String(stand.Categoria || stand.categoria || 'Comida').trim();
    const precioNum = Number(stand.Precio !== undefined ? stand.Precio : stand.precio) || 0;
    const est = String(stand.Estado || stand.estado || 'disponible').trim();
    const desc = String(stand.Descripcion !== undefined ? stand.Descripcion : (stand.descripcion || '')).trim();
    const posX = Number(stand.PosicionX !== undefined ? stand.PosicionX : (stand.posicion_x ?? 0)) || 0;
    const posY = Number(stand.PosicionY !== undefined ? stand.PosicionY : (stand.posicion_y ?? 0)) || 0;
    const anchoNum = Number(stand.Ancho !== undefined ? stand.Ancho : (stand.ancho ?? 1)) || 1;
    const altoNum = Number(stand.Alto !== undefined ? stand.Alto : (stand.alto ?? 1)) || 1;

    const payload: Record<string, unknown> = {
      action: 'saveStand',
      token,
      Numero: numClean,
      Nombre: standName,
      Categoria: cat,
      Precio: precioNum,
      Estado: est,
      PosicionX: posX,
      PosicionY: posY,
      Ancho: anchoNum,
      Alto: altoNum,
      Descripcion: desc,
    };

    // StandID only when editing an existing stand
    const standId = stand.StandID || stand.id;
    if (standId) {
      payload.StandID = String(standId).trim();
    }

    const res = await this.postRequest<{ ok: boolean; error?: string }>(payload);

    if (res.ok) {
      this.invalidateCache();
    }

    return res;
  }

  // 10. CONFIRMAR ALQUILER (confirmarAlquiler: SolicitudID)
  public async confirmarAlquiler(
    token: string,
    solicitudId: string
  ): Promise<{ ok: boolean; token_cliente?: string; error?: string }> {
    const res = await this.postRequest<{ ok: boolean; token_cliente?: string; error?: string }>({
      action: 'confirmarAlquiler',
      token,
      SolicitudID: String(solicitudId).trim(),
    });

    if (res.ok) {
      this.invalidateCache();
    }

    return res;
  }

  // 11. RECHAZAR SOLICITUD (rechazarSolicitud: SolicitudID)
  public async rechazarSolicitud(
    token: string,
    solicitudId: string
  ): Promise<{ ok: boolean; error?: string }> {
    const res = await this.postRequest<{ ok: boolean; error?: string }>({
      action: 'rechazarSolicitud',
      token,
      SolicitudID: String(solicitudId).trim(),
    });

    if (res.ok) {
      this.invalidateCache();
    }

    return res;
  }

  // 12. CANCELAR ALQUILER (cancelarAlquiler: AlquilerID)
  public async cancelarAlquiler(
    token: string,
    alquilerId: string
  ): Promise<{ ok: boolean; error?: string }> {
    const res = await this.postRequest<{ ok: boolean; error?: string }>({
      action: 'cancelarAlquiler',
      token,
      AlquilerID: String(alquilerId).trim(),
    });

    if (res.ok) {
      this.invalidateCache();
    }

    return res;
  }

  // 13. REVOCAR INVITADO (revocarInvitado: InvitadoID)
  public async revocarInvitado(
    token: string,
    invitadoId: string
  ): Promise<{ ok: boolean; error?: string }> {
    const res = await this.postRequest<{ ok: boolean; error?: string }>({
      action: 'revocarInvitado',
      token,
      InvitadoID: String(invitadoId).trim(),
    });

    if (res.ok) {
      this.invalidateCache();
    }

    return res;
  }

  // ACCESO ALQUILER ADMIN
  public async accesoAlquilerAdmin(
    token: string,
    alquilerId: string
  ): Promise<{ ok: boolean; data?: any; error?: string; [key: string]: any }> {
    const res = await this.postRequest<{ ok: boolean; data?: any; error?: string; [key: string]: any }>({
      action: 'accesoAlquilerAdmin',
      token,
      AlquilerID: String(alquilerId).trim(),
    });
    return res;
  }

  // RESET DISPOSITIVO
  public async resetDispositivo(
    token: string,
    personaTipo: string,
    personaId: string
  ): Promise<{ ok: boolean; error?: string; [key: string]: any }> {
    const res = await this.postRequest<{ ok: boolean; error?: string; [key: string]: any }>({
      action: 'resetDispositivo',
      token,
      PersonaTipo: String(personaTipo).trim(),
      PersonaID: String(personaId).trim(),
    });
    if (res.ok) {
      this.invalidateCache('admin_data');
    }
    return res;
  }

  // 14. CREAR USUARIO (crearUsuario_(p): Usuario, Password >= 12, Rol "ADMIN"|"PORTERO", Nombre)
  public async crearUsuario(
    token: string,
    usuario: { usuario: string; nombre: string; password: string; rol: string }
  ): Promise<{ ok: boolean; error?: string }> {
    const rolClean = String(usuario.rol || 'ADMIN').trim().toUpperCase();
    const rol = rolClean === 'PORTERO' ? 'PORTERO' : 'ADMIN';

    const res = await this.postRequest<{ ok: boolean; error?: string }>({
      action: 'crearUsuario',
      token,
      Usuario: String(usuario.usuario || '').trim(),
      Password: String(usuario.password || ''),
      Rol: rol,
      Nombre: String(usuario.nombre || '').trim(),
    });

    if (res.ok) {
      this.invalidateCache('admin_data');
    }

    return res;
  }

  // 15. CAMBIAR PASSWORD (cambiarPassword_(p,admin): UsuarioID, Password >= 12)
  public async cambiarPassword(
    token: string,
    usuarioId: string,
    nuevaPassword: string
  ): Promise<{ ok: boolean; error?: string }> {
    const res = await this.postRequest<{ ok: boolean; error?: string }>({
      action: 'cambiarPassword',
      token,
      UsuarioID: String(usuarioId).trim(),
      Password: String(nuevaPassword),
    });

    return res;
  }

  // 16. CAMBIAR ESTADO USUARIO (cambiarEstadoUsuario_(p): UsuarioID, Activo "SI"|"NO")
  public async cambiarEstadoUsuario(
    token: string,
    usuarioId: string,
    activo: 'SI' | 'NO' | boolean | string
  ): Promise<{ ok: boolean; error?: string }> {
    let activoVal = 'SI';
    if (typeof activo === 'boolean') {
      activoVal = activo ? 'SI' : 'NO';
    } else if (typeof activo === 'string') {
      const up = activo.trim().toUpperCase();
      activoVal = up === 'NO' || up === 'INACTIVO' ? 'NO' : 'SI';
    }

    const res = await this.postRequest<{ ok: boolean; error?: string }>({
      action: 'cambiarEstadoUsuario',
      token,
      UsuarioID: String(usuarioId).trim(),
      Activo: activoVal,
    });

    if (res.ok) {
      this.invalidateCache('admin_data');
    }

    return res;
  }

  // 17. GUARDAR CONFIGURACIÓN (setConfig_(p): Clave y Valor individual por operación)
  public async setSingleConfig(
    token: string,
    clave: string,
    valor: string | number
  ): Promise<{ ok: boolean; error?: string }> {
    return await this.postRequest<{ ok: boolean; error?: string }>({
      action: 'setConfig',
      token,
      Clave: String(clave).trim(),
      Valor: String(valor ?? ''),
    });
  }

  // Guarda las claves editables modificadas individualmente y reporta fallos
  public async setConfig(
    token: string,
    config: Partial<Configuracion>,
    previousConfig?: Partial<Configuracion>
  ): Promise<{ ok: boolean; error?: string; errors?: Record<string, string> }> {
    const editableKeys = [
      'NOMBRE_EVENTO',
      'IDIOMA_PREDETERMINADO',
      'WHATSAPP_ADMIN',
      'MONEDA',
      'MAX_INVITADOS',
      'MENSAJE_WHATSAPP_ES',
      'MENSAJE_WHATSAPP_DE',
    ] as const;

    const failedKeys: Record<string, string> = {};

    for (const key of editableKeys) {
      const newVal = (config as any)[key];
      if (newVal === undefined) continue;

      // Si existe configuración previa, omitir claves que no cambiaron
      if (previousConfig && String(newVal) === String((previousConfig as any)[key])) {
        continue;
      }

      try {
        const res = await this.setSingleConfig(token, key, String(newVal));
        if (!res.ok) {
          failedKeys[key] = res.error || `Error al guardar ${key}`;
        }
      } catch (err: any) {
        failedKeys[key] = err.message || `Error de conexión al guardar ${key}`;
      }
    }

    this.invalidateCache();

    const failureCount = Object.keys(failedKeys).length;
    if (failureCount > 0) {
      return {
        ok: false,
        error: `Falló al guardar: ${Object.keys(failedKeys).join(', ')}`,
        errors: failedKeys,
      };
    }

    return { ok: true };
  }

  // 18. NUEVA GESTIÓN ANUAL (nuevaGestion_(p): Anio: número 2026-2100, CopiarStands: boolean)
  public async nuevaGestion(
    token: string,
    gestion: { anio: number | string; copiarStands: boolean }
  ): Promise<{ ok: boolean; error?: string }> {
    const anioNum = Number(gestion.anio);
    const res = await this.postRequest<{ ok: boolean; error?: string }>({
      action: 'nuevaGestion',
      token,
      Anio: anioNum,
      CopiarStands: Boolean(gestion.copiarStands),
    });

    if (res.ok) {
      this.invalidateCache();
    }

    return res;
  }

  // 19. ACTIVAR GESTIÓN (activarGestion_(id): GestionID)
  public async activarGestion(
    token: string,
    gestionId: string
  ): Promise<{ ok: boolean; error?: string }> {
    const cleanId = String(gestionId || '').trim();
    const res = await this.postRequest<{ ok: boolean; error?: string }>({
      action: 'activarGestion',
      token,
      GestionID: cleanId,
    });

    if (res.ok) {
      this.invalidateCache();
    }

    return res;
  }

  // 20. SCAN PORTERÍA
  public async scan(token: string, qr: string): Promise<ScanResult> {
    const res = await this.postRequest<ScanResult>({
      action: 'scan',
      token,
      qr,
    });

    // Invalidate access log cache
    this.invalidateCache('admin_data');

    return res;
  }
}

export function getOrCreateSecretoDispositivo(identifier: string): string {
  const storageKey = `wm_secreto_dispositivo_${identifier}`;
  let secreto = localStorage.getItem(storageKey);
  if (!secreto) {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    secreto = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(storageKey, secreto);
  }
  return secreto;
}

export function getOrCreateDeviceId(token: string): string {
  return getOrCreateSecretoDispositivo(token);
}

export const backendService = new BackendService();

