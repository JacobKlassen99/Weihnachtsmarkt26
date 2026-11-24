export type Idioma = 'es' | 'de';

export type CategoriaStand = 'Comida' | 'Artesanal' | 'Games' | string;

export interface Configuracion {
  NOMBRE_EVENTO: string;
  IDIOMA_PREDETERMINADO: string;
  WHATSAPP_ADMIN: string;
  MONEDA: string;
  MAX_INVITADOS: string;
  GESTION_ACTIVA: string;
  MENSAJE_WHATSAPP_ES: string;
  MENSAJE_WHATSAPP_DE: string;
  FECHA_EVENTO?: string;
  HORARIO_EVENTO?: string;
  UBICACION?: string;
}

export interface Stand {
  id?: string;
  StandID?: string;
  numero: string | number;
  Numero?: string | number;
  nombre?: string;
  Nombre?: string;
  categoria: CategoriaStand;
  Categoria?: CategoriaStand;
  precio: number | string;
  Precio?: number | string;
  estado: 'disponible' | 'ocupado' | 'reservado' | string;
  Estado?: string;
  posicion_x?: number;
  PosicionX?: number;
  posicion_y?: number;
  PosicionY?: number;
  ancho?: number;
  Ancho?: number;
  alto?: number;
  Alto?: number;
  tiene_parrilla?: boolean | string;
  TieneParrilla?: boolean | string;
  parrilla?: boolean | string;
  modalidad?: 'con_parrilla' | 'sin_parrilla' | string;
  descripcion?: string;
  Descripcion?: string;
  cliente_nombre?: string;
  gestion?: string;
}

export interface Solicitud {
  id: string;
  SolicitudID?: string;
  stand: string | number;
  NumeroStand?: string | number;
  categoria: string;
  Categoria?: string;
  nombre: string;
  Nombre?: string;
  NombreCompleto?: string;
  telefono: string;
  Telefono?: string;
  observacion?: string;
  Observacion?: string;
  tiene_parrilla?: boolean | string;
  TieneParrilla?: boolean | string;
  modalidad?: string;
  Modalidad?: string;
  fecha: string;
  FechaSolicitud?: string;
  estado: 'pendiente' | 'confirmada' | 'rechazada' | string;
  Estado?: string;
  gestion?: string;
}

export interface Alquiler {
  id: string;
  AlquilerID?: string;
  stand: string | number;
  NumeroStand?: string | number;
  cliente: string;
  Cliente?: string;
  NombreCompleto?: string;
  nombreCompleto?: string;
  telefono: string;
  Telefono?: string;
  token_cliente: string;
  TokenCliente?: string;
  qr_cliente?: string;
  fecha_alquiler: string;
  FechaAlquiler?: string;
  FechaConfirmacion?: string;
  fechaConfirmacion?: string;
  fecha_confirmacion?: string;
  estado: 'activo' | 'cancelado' | string;
  Estado?: 'ACTIVO' | 'CANCELADO' | string;
  gestion?: string;
  Gestion?: string;
  categoria?: string;
  Categoria?: string;
}

export interface Invitado {
  id: string;
  InvitadoID?: string;
  id_alquiler?: string;
  stand: string | number;
  NumeroStand?: string | number;
  token_invitacion: string;
  TokenInvitacion?: string;
  nombre_invitado?: string;
  NombreInvitado?: string;
  NombreCompleto?: string;
  nombreCompleto?: string;
  qr_invitado?: string;
  estado: 'disponible' | 'registrado' | 'revocado' | 'activo' | 'pendiente' | string;
  Estado?: 'ACTIVO' | 'PENDIENTE' | 'REVOCADO' | string;
  fecha_creacion?: string;
  fecha_registro?: string;
  FechaCreacion?: string;
  FechaRegistro?: string;
  gestion?: string;
}

export interface Acceso {
  id: string;
  AccesoID?: string;
  fecha_hora: string;
  FechaHora?: string;
  nombre: string;
  Nombre?: string;
  NombreCompleto?: string;
  nombreCompleto?: string;
  tipo: 'cliente' | 'invitado' | string;
  Tipo?: string;
  PersonaTipo?: string;
  personaTipo?: string;
  persona_tipo?: string;
  stand: string | number;
  NumeroStand?: string | number;
  resultado?: string;
  Resultado?: string;
  portero?: string;
  Portero?: string;
  RegistradoPor?: string;
  registradoPor?: string;
  registrado_por?: string;
}

export interface Usuario {
  id?: string;
  UsuarioID?: string;
  usuario: string;
  Usuario?: string;
  nombre: string;
  Nombre?: string;
  NombreCompleto?: string;
  nombreCompleto?: string;
  rol: 'admin' | 'portero' | 'ADMIN' | 'PORTERO' | string;
  Rol?: string;
  estado: 'activo' | 'inactivo' | string;
  Activo?: 'SI' | 'NO' | boolean | string;
  activo?: 'SI' | 'NO' | boolean | string;
}

export interface Gestion {
  id: string;
  GestionID?: string;
  nombre: string;
  Nombre?: string;
  anio?: number;
  Anio?: number;
  activa: boolean;
  Activa?: boolean | string;
  fecha_creacion?: string;
  FechaCreacion?: string;
}

export interface PublicData {
  configuracion: Configuracion;
  stands: Stand[];
}

export interface AdminData {
  configuracion: Configuracion;
  stands: Stand[];
  solicitudes: Solicitud[];
  alquileres: Alquiler[];
  invitados: Invitado[];
  accesos: Acceso[];
  usuarios: Usuario[];
  gestiones: Gestion[];
}

export interface ScanResult {
  ok: boolean;
  autorizado?: boolean;
  statusType?: 'authorized' | 'denied' | 'error';
  motivo?: string;
  error?: string;
  mensaje?: string;
  nombre?: string;
  stand?: string | number;
  tipo?: 'cliente' | 'invitado' | string;
  estado?: string;
  fecha_hora?: string;
  raw?: any;
}

export interface MiAlquilerData {
  alquiler: Alquiler;
  stand_info?: Stand;
  qr_acceso: string;
  invitaciones: Invitado[];
  max_invitados: number;
}

export interface InvitacionInfo {
  valida: boolean;
  id?: string;
  invitado_id?: string;
  InvitadoID?: string;
  Invitado_ID?: string;
  stand?: string | number;
  cliente?: string;
  categoria?: string;
  nombre_invitado?: string;
  registrado?: boolean;
  qr_acceso?: string;
  error?: string;
}

export interface LoginResponse {
  ok: boolean;
  data?: {
    token: string;
    usuario: string;
    rol: string;
    nombre: string;
  };
  error?: string;
  token?: string;
  usuario?: Usuario | string;
  rol?: string;
  nombre?: string;
}
