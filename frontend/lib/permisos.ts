/**
 * Matriz de roles y permisos (sección 2 de la especificación).
 *
 * La matriz vive aquí como valor por defecto editable desde /admin/roles. Cuando el backend
 * exponga el módulo de permisos, esta constante pasa a ser el fallback de la respuesta.
 */

export type ClaveRol =
  | "super_admin"
  | "admin"
  | "comite"
  | "analista"
  | "asesor"
  | "cobranza"
  | "propietario"
  | "cliente"
  | "pagador"
  | "auditor";

/** Nivel de acceso de un rol sobre un módulo. */
export type NivelPermiso = "total" | "lectura" | "parcial" | "propio" | "ninguno";

export interface DefinicionRol {
  clave: ClaveRol;
  nombre: string;
  descripcion: string;
  /** Los roles externos no entran al backoffice: ven su propio portal. */
  externo: boolean;
}

export const ROLES: DefinicionRol[] = [
  {
    clave: "super_admin",
    nombre: "Super Administrador",
    descripcion: "Dueño de la plataforma. Acceso total, incluida configuración del motor, roles y facturación.",
    externo: false,
  },
  {
    clave: "admin",
    nombre: "Administrador",
    descripcion: "Gestión operativa diaria: solicitudes, propiedades, reportes. Sin configuración crítica del motor.",
    externo: false,
  },
  {
    clave: "comite",
    nombre: "Comité de Riesgo / Crédito",
    descripcion: "Revisa y decide manualmente los casos en estudio. Puede aprobar excepciones documentadas.",
    externo: false,
  },
  {
    clave: "analista",
    nombre: "Analista de Riesgo",
    descripcion: "Revisa documentos, valida información, ejecuta consultas a centrales de riesgo y deja conceptos.",
    externo: false,
  },
  {
    clave: "asesor",
    nombre: "Asesor Comercial",
    descripcion: "Atiende clientes, ayuda a completar solicitudes y hace seguimiento del pipeline de leads.",
    externo: false,
  },
  {
    clave: "cobranza",
    nombre: "Gestor de Cobranza",
    descripcion: "Seguimiento de pagos de canon una vez activo el contrato. (Fase 2)",
    externo: false,
  },
  {
    clave: "propietario",
    nombre: "Propietario",
    descripcion: "Rol externo. Publica inmuebles, ve leads y el veredicto de los candidatos, sin detalle financiero.",
    externo: true,
  },
  {
    clave: "cliente",
    nombre: "Cliente / Arrendatario",
    descripcion: "Rol externo. Se autoconsulta, sube documentos y ve el estado de su propia solicitud.",
    externo: true,
  },
  {
    clave: "pagador",
    nombre: "Pagador / Facturación",
    descripcion: "Gestiona cobros, pasarela de pagos y conciliación de transacciones.",
    externo: false,
  },
  {
    clave: "auditor",
    nombre: "Observador / Auditor",
    descripcion: "Solo lectura, para inversionistas, auditoría o soporte externo.",
    externo: false,
  },
];

export interface ModuloPermiso {
  clave: string;
  nombre: string;
  grupo: "Operación" | "Catálogos" | "Riesgo" | "Gobierno";
  /** Ruta del panel a la que corresponde el módulo, si aplica. */
  href?: string;
}

export const MODULOS: ModuloPermiso[] = [
  { clave: "dashboard", nombre: "Dashboard ejecutivo", grupo: "Operación", href: "/admin" },
  { clave: "solicitudes", nombre: "Solicitudes – lista y detalle", grupo: "Operación", href: "/admin/solicitudes" },
  { clave: "decision_manual", nombre: "Aprobar / rechazar manualmente", grupo: "Operación" },
  { clave: "propiedades", nombre: "Propiedades – gestión", grupo: "Catálogos", href: "/admin/propiedades" },
  { clave: "leads", nombre: "Leads / CRM", grupo: "Operación", href: "/admin/leads" },
  { clave: "contratos", nombre: "Contratos y firma", grupo: "Operación", href: "/admin/contratos" },
  { clave: "reportes", nombre: "Reportes", grupo: "Operación", href: "/admin/reportes" },
  { clave: "motor", nombre: "Motor de decisión (árbol / reglas)", grupo: "Riesgo", href: "/admin/motor" },
  { clave: "politicas", nombre: "Políticas de crédito / arrendamiento", grupo: "Riesgo", href: "/admin/politicas" },
  { clave: "formularios", nombre: "Configuración de formularios", grupo: "Gobierno", href: "/admin/formularios" },
  { clave: "usuarios", nombre: "Usuarios, roles y permisos", grupo: "Gobierno", href: "/admin/roles" },
  { clave: "pagos", nombre: "Pasarela de pagos / facturación", grupo: "Gobierno", href: "/admin/pagos" },
  { clave: "notificaciones", nombre: "Notificaciones", grupo: "Gobierno", href: "/admin/notificaciones" },
  { clave: "configuracion", nombre: "Configuración general (marca, dominio)", grupo: "Gobierno", href: "/admin/configuracion" },
  { clave: "auditoria", nombre: "Auditoría / logs", grupo: "Gobierno", href: "/admin/auditoria" },
];

export type MatrizPermisos = Record<string, Record<ClaveRol, NivelPermiso>>;

function fila(valores: Partial<Record<ClaveRol, NivelPermiso>>): Record<ClaveRol, NivelPermiso> {
  const base = {} as Record<ClaveRol, NivelPermiso>;
  for (const rol of ROLES) base[rol.clave] = "ninguno";
  return { ...base, ...valores };
}

/** Valores de referencia de la sección 2 — punto de partida, ajustable en el panel. */
export const MATRIZ_POR_DEFECTO: MatrizPermisos = {
  dashboard: fila({ super_admin: "total", admin: "total", comite: "total", auditor: "lectura" }),
  solicitudes: fila({
    super_admin: "total",
    admin: "total",
    comite: "total",
    analista: "total",
    asesor: "total",
    cobranza: "lectura",
    propietario: "propio",
    cliente: "propio",
    auditor: "lectura",
  }),
  decision_manual: fila({ super_admin: "total", admin: "total", comite: "total" }),
  propiedades: fila({ super_admin: "total", admin: "total", asesor: "parcial", propietario: "propio" }),
  leads: fila({ super_admin: "total", admin: "total", asesor: "total" }),
  contratos: fila({ super_admin: "total", admin: "total", comite: "lectura", cobranza: "parcial", propietario: "propio", cliente: "propio", auditor: "lectura" }),
  reportes: fila({
    super_admin: "total",
    admin: "total",
    comite: "total",
    analista: "parcial",
    asesor: "parcial",
    propietario: "propio",
    auditor: "lectura",
  }),
  motor: fila({ super_admin: "total" }),
  politicas: fila({ super_admin: "total", comite: "lectura", analista: "lectura" }),
  formularios: fila({ super_admin: "total" }),
  usuarios: fila({ super_admin: "total" }),
  pagos: fila({ super_admin: "total", admin: "lectura", pagador: "total", auditor: "lectura" }),
  notificaciones: fila({ super_admin: "total", admin: "parcial" }),
  configuracion: fila({ super_admin: "total" }),
  auditoria: fila({ super_admin: "total", admin: "lectura", auditor: "lectura" }),
};

export const ETIQUETAS_NIVEL: Record<NivelPermiso, string> = {
  total: "Acceso total",
  lectura: "Solo lectura",
  parcial: "Parcial",
  propio: "Solo lo propio",
  ninguno: "Sin acceso",
};

/** Símbolo compacto para la tabla, siguiendo la notación del documento (✔ · ). */
export const SIMBOLOS_NIVEL: Record<NivelPermiso, string> = {
  total: "✔",
  lectura: "L",
  parcial: "P",
  propio: "M",
  ninguno: "·",
};

export const NIVELES: NivelPermiso[] = ["total", "lectura", "parcial", "propio", "ninguno"];

/**
 * Los roles del backend actual (`analista`, `consulta`, …) no cubren toda la matriz del
 * documento. Este mapa traduce el rol de sesión al rol de la matriz para poder resolver
 * permisos en el frontend sin esperar al backend.
 */
const EQUIVALENCIAS_SESION: Record<string, ClaveRol> = {
  super_admin: "super_admin",
  admin: "admin",
  analista: "analista",
  asesor: "asesor",
  consulta: "auditor",
  solicitante: "cliente",
};

export function rolDeMatriz(rolSesion: string | null | undefined): ClaveRol {
  if (!rolSesion) return "cliente";
  return EQUIVALENCIAS_SESION[rolSesion] ?? "cliente";
}

export function permisoDe(matriz: MatrizPermisos, modulo: string, rol: ClaveRol): NivelPermiso {
  return matriz[modulo]?.[rol] ?? "ninguno";
}

export function puedeVer(matriz: MatrizPermisos, modulo: string, rol: ClaveRol): boolean {
  return permisoDe(matriz, modulo, rol) !== "ninguno";
}
