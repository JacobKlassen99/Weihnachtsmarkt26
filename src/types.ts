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
  descripcion?: string;
  Descripcion?: string;
  cliente_nombre?: string;
  gestion?: string;
}

export interface Solicitud {
  id: string;
  stand: string | number;
  categoria: string;
  nombre: string;
  telefono: string;
  fecha: string;
  estado: 'pendiente' | 'confirmada' | 'rechazada' | string;
  gestion?: string;
}

export interface Alquiler {
  id: string;
  stand: string | number;
  cliente: string;
  telefono: string;
  token_cliente: string;
  qr_cliente?: string;
  fecha_alquiler: string;
  estado: 'activo' | 'cancelado' | string;
  gestion?: string;
  categoria?: string;
}

export interface Invitado {
  id: string;
  id_alquiler?: string;
  stand: string | number;
  token_invitacion: string;
  nombre_invitado?: string;
  qr_invitado?: string;
  estado: 'disponible' | 'registrado' | 'revocado' | string;
  fecha_creacion?: string;
  fecha_registro?: string;
  gestion?: string;
}

export interface Acceso {
  id: string;
  fecha_hora: string;
  nombre: string;
  tipo: 'cliente' | 'invitado' | string;
  stand: string | number;
  portero?: string;
}

export interface Usuario {
  id?: string;
  UsuarioID?: string;
  usuario: string;
  Usuario?: string;
  nombre: string;
  Nombre?: string;
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
  fecha_creacion?: string;
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
  error?: string;
  mensaje?: string;
  nombre?: string;
  stand?: string | number;
  tipo?: 'cliente' | 'invitado' | string;
  estado?: string;
  fecha_hora?: string;
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
