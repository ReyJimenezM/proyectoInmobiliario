import type {
  Anunciante,
  AuditoriaListOut,
  ChecklistDocumentos,
  DashboardOut,
  DatosFinancierosInput,
  DatosLaboralesInput,
  DatosPersonalesInput,
  DecisionManualInput,
  DocumentoOut,
  FiltrosListado,
  GarantiasReferenciasInput,
  ImagenPropiedad,
  Inmobiliaria,
  InmobiliariaCrearInput,
  LoginInput,
  MotorDecisionConfig,
  MotorDecisionCrearInput,
  PoliticaCredito,
  PoliticaCreditoCrearInput,
  PropiedadDetail,
  PropiedadListItem,
  PropiedadListOut,
  RegistroInput,
  ResultadoSolicitudOut,
  RiesgoOut,
  SimuladorArriendoInput,
  SimuladorArriendoOutput,
  SimuladorCompraInput,
  SimuladorCompraOutput,
  SolicitudOut,
  TokenOutput,
  UsuarioStaff,
  UsuarioStaffCrearInput,
} from "./types";
import { obtenerAccessToken } from "./auth";

// En Docker, el servidor de Next.js (SSR) y el navegador del usuario resuelven "backend"
// de forma distinta: el servidor corre dentro de la red de docker-compose y puede usar el
// nombre del servicio, pero el navegador corre en la máquina host y necesita localhost.
// API_INTERNAL_URL (sin prefijo NEXT_PUBLIC_, no se expone al bundle del navegador) cubre
// el caso del servidor; NEXT_PUBLIC_API_URL cubre el navegador. Fuera de Docker ambos
// apuntan a lo mismo.
const API_URL =
  typeof window === "undefined"
    ? process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
    : process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const cuerpo = await res.text();
    throw new ApiError(res.status, cuerpo || `Error ${res.status} al llamar ${path}`);
  }
  return res.json() as Promise<T>;
}

function fetchAutenticado<T>(path: string, init?: RequestInit): Promise<T> {
  const token = obtenerAccessToken();
  return fetchJson<T>(path, {
    ...init,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers },
  });
}

function construirQueryString(filtros: FiltrosListado): string {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== "") {
      params.set(clave, String(valor));
    }
  });
  return params.toString();
}

export async function listarPropiedades(filtros: FiltrosListado): Promise<PropiedadListOut> {
  const qs = construirQueryString(filtros);
  return fetchJson<PropiedadListOut>(`/api/propiedades${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
  });
}

export async function obtenerPropiedad(id: string): Promise<PropiedadDetail> {
  return fetchJson<PropiedadDetail>(`/api/propiedades/${id}`, { cache: "no-store" });
}

export async function simularCompra(input: SimuladorCompraInput): Promise<SimuladorCompraOutput> {
  return fetchJson<SimuladorCompraOutput>("/api/simulador/compra", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function simularArriendo(input: SimuladorArriendoInput): Promise<SimuladorArriendoOutput> {
  return fetchJson<SimuladorArriendoOutput>("/api/simulador/arriendo", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// --- Proyectos nuevos ---
export function listarProyectos(filtros?: { ciudad?: string; tipo?: string }): Promise<any[]> {
  const params = new URLSearchParams();
  if (filtros?.ciudad) params.set("ciudad", filtros.ciudad);
  if (filtros?.tipo) params.set("tipo", filtros.tipo);
  const qs = params.toString();
  return fetchJson<any[]>(`/api/proyectos${qs ? `?${qs}` : ""}`, { cache: "no-store" });
}

export function obtenerProyecto(id: string): Promise<any> {
  return fetchJson<any>(`/api/proyectos/${id}`, { cache: "no-store" });
}

// --- Autenticación ---
export function registrarUsuario(input: RegistroInput): Promise<TokenOutput> {
  return fetchJson<TokenOutput>("/api/auth/registro", { method: "POST", body: JSON.stringify(input) });
}

export function iniciarSesion(input: LoginInput): Promise<TokenOutput> {
  return fetchJson<TokenOutput>("/api/auth/login", { method: "POST", body: JSON.stringify(input) });
}

// --- Solicitudes ---
export function crearSolicitud(propiedadId: string, vertical: "compra" | "arriendo"): Promise<SolicitudOut> {
  return fetchAutenticado<SolicitudOut>("/api/solicitudes", {
    method: "POST",
    body: JSON.stringify({ propiedad_id: propiedadId, vertical }),
  });
}

export function obtenerSolicitud(id: string): Promise<SolicitudOut> {
  return fetchAutenticado<SolicitudOut>(`/api/solicitudes/${id}`);
}

export function guardarDatosPersonales(id: string, datos: DatosPersonalesInput): Promise<SolicitudOut> {
  return fetchAutenticado<SolicitudOut>(`/api/solicitudes/${id}/datos-personales`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}

export function guardarDatosLaborales(id: string, datos: DatosLaboralesInput): Promise<SolicitudOut> {
  return fetchAutenticado<SolicitudOut>(`/api/solicitudes/${id}/datos-laborales`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}

export function guardarDatosFinancieros(id: string, datos: DatosFinancierosInput): Promise<SolicitudOut> {
  return fetchAutenticado<SolicitudOut>(`/api/solicitudes/${id}/datos-financieros`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}

export function guardarGarantiasReferencias(id: string, datos: GarantiasReferenciasInput): Promise<SolicitudOut> {
  return fetchAutenticado<SolicitudOut>(`/api/solicitudes/${id}/garantias-referencias`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}

export function obtenerChecklistDocumentos(id: string): Promise<ChecklistDocumentos> {
  return fetchAutenticado<ChecklistDocumentos>(`/api/solicitudes/${id}/documentos-requeridos`);
}

export function listarDocumentos(id: string): Promise<DocumentoOut[]> {
  return fetchAutenticado<DocumentoOut[]>(`/api/solicitudes/${id}/documentos`);
}

export async function abrirDocumento(solicitudId: string, documentoId: string): Promise<void> {
  const token = obtenerAccessToken();
  const res = await fetch(`${API_URL}/api/solicitudes/${solicitudId}/documentos/${documentoId}/archivo`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new ApiError(res.status, "No se pudo abrir el documento");
  const blob = await res.blob();
  window.open(URL.createObjectURL(blob), "_blank");
}

export async function cargarDocumento(id: string, tipoDocumento: string, archivo: File): Promise<DocumentoOut> {
  const token = obtenerAccessToken();
  const formData = new FormData();
  formData.append("archivo", archivo);

  const res = await fetch(
    `${API_URL}/api/solicitudes/${id}/documentos?tipo_documento=${encodeURIComponent(tipoDocumento)}`,
    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    }
  );
  if (!res.ok) {
    throw new ApiError(res.status, await res.text());
  }
  return res.json() as Promise<DocumentoOut>;
}

export function enviarSolicitud(id: string, aceptaPoliticaDatos: boolean): Promise<ResultadoSolicitudOut> {
  return fetchAutenticado<ResultadoSolicitudOut>(`/api/solicitudes/${id}/enviar`, {
    method: "POST",
    body: JSON.stringify({ acepta_politica_datos: aceptaPoliticaDatos }),
  });
}

export function obtenerResultadoSolicitud(id: string): Promise<ResultadoSolicitudOut> {
  return fetchAutenticado<ResultadoSolicitudOut>(`/api/solicitudes/${id}/resultado`);
}

export function listarSolicitudesAdmin(estado?: string): Promise<SolicitudOut[]> {
  const qs = estado ? `?estado=${estado}` : "";
  return fetchAutenticado<SolicitudOut[]>(`/api/solicitudes${qs}`);
}

// --- Panel administrativo ---
export function tomarDecisionManual(solicitudId: string, input: DecisionManualInput): Promise<unknown> {
  return fetchAutenticado(`/api/admin/solicitudes/${solicitudId}/decision`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listarPoliticas(vertical?: "compra" | "arriendo"): Promise<PoliticaCredito[]> {
  const qs = vertical ? `?vertical=${vertical}` : "";
  return fetchAutenticado<PoliticaCredito[]>(`/api/admin/politicas${qs}`);
}

export function crearVersionPolitica(input: PoliticaCreditoCrearInput): Promise<PoliticaCredito> {
  return fetchAutenticado<PoliticaCredito>("/api/admin/politicas", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function obtenerDashboard(): Promise<DashboardOut> {
  return fetchAutenticado<DashboardOut>("/api/admin/dashboard");
}

export function listarPropiedadesAdmin(): Promise<PropiedadListItem[]> {
  return fetchAutenticado<PropiedadListItem[]>("/api/admin/propiedades");
}

export function listarAnunciantesAdmin(): Promise<Anunciante[]> {
  return fetchAutenticado<Anunciante[]>("/api/admin/anunciantes");
}

export function crearPropiedadAdmin(payload: Record<string, unknown>): Promise<PropiedadDetail> {
  return fetchAutenticado<PropiedadDetail>("/api/propiedades", { method: "POST", body: JSON.stringify(payload) });
}

export function actualizarPropiedadAdmin(id: string, payload: Record<string, unknown>): Promise<PropiedadDetail> {
  return fetchAutenticado<PropiedadDetail>(`/api/propiedades/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function obtenerPropiedadAdmin(id: string): Promise<PropiedadDetail> {
  return fetchAutenticado<PropiedadDetail>(`/api/propiedades/${id}`);
}

export function actualizarRiesgoPropiedad(id: string, componentes: Record<string, number>): Promise<RiesgoOut> {
  return fetchAutenticado<RiesgoOut>(`/api/propiedades/${id}/riesgo`, {
    method: "PATCH",
    body: JSON.stringify({ componentes }),
  });
}

export function actualizarRiesgoAnunciante(id: string, componentes: Record<string, number>): Promise<RiesgoOut> {
  return fetchAutenticado<RiesgoOut>(`/api/admin/anunciantes/${id}/riesgo`, {
    method: "PATCH",
    body: JSON.stringify({ componentes }),
  });
}

export async function subirImagenPropiedad(propiedadId: string, archivo: File): Promise<ImagenPropiedad> {
  const token = obtenerAccessToken();
  const formData = new FormData();
  formData.append("archivo", archivo);

  const res = await fetch(`${API_URL}/api/propiedades/${propiedadId}/imagenes`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json() as Promise<ImagenPropiedad>;
}

export function eliminarImagenPropiedad(propiedadId: string, imagenId: string): Promise<void> {
  return fetchAutenticado<void>(`/api/propiedades/${propiedadId}/imagenes/${imagenId}`, { method: "DELETE" });
}

export function reordenarImagenesPropiedad(propiedadId: string, ordenImagenes: string[]): Promise<ImagenPropiedad[]> {
  return fetchAutenticado<ImagenPropiedad[]>(`/api/propiedades/${propiedadId}/imagenes/orden`, {
    method: "PUT",
    body: JSON.stringify({ orden_imagenes: ordenImagenes }),
  });
}

// --- Fase 2: inmobiliarias (super admin), usuarios, motor, auditoría ---
export function listarInmobiliarias(): Promise<Inmobiliaria[]> {
  return fetchAutenticado<Inmobiliaria[]>("/api/admin/inmobiliarias");
}

export function crearInmobiliaria(input: InmobiliariaCrearInput): Promise<Inmobiliaria> {
  return fetchAutenticado<Inmobiliaria>("/api/admin/inmobiliarias", { method: "POST", body: JSON.stringify(input) });
}

export function actualizarInmobiliaria(id: string, payload: Record<string, unknown>): Promise<Inmobiliaria> {
  return fetchAutenticado<Inmobiliaria>(`/api/admin/inmobiliarias/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function subirLogoInmobiliaria(id: string, archivo: File): Promise<Inmobiliaria> {
  const token = obtenerAccessToken();
  const formData = new FormData();
  formData.append("archivo", archivo);

  const res = await fetch(`${API_URL}/api/admin/inmobiliarias/${id}/logo`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json() as Promise<Inmobiliaria>;
}

export function obtenerInmobiliariaPublica(id: string): Promise<Inmobiliaria> {
  return fetchJson<Inmobiliaria>(`/api/inmobiliarias/${id}`, { cache: "no-store" });
}

export function listarUsuariosInmobiliaria(inmobiliariaId: string): Promise<UsuarioStaff[]> {
  return fetchAutenticado<UsuarioStaff[]>(`/api/admin/inmobiliarias/${inmobiliariaId}/usuarios`);
}

export function crearUsuarioStaff(inmobiliariaId: string, input: UsuarioStaffCrearInput): Promise<UsuarioStaff> {
  return fetchAutenticado<UsuarioStaff>(`/api/admin/inmobiliarias/${inmobiliariaId}/usuarios`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listarVersionesMotor(): Promise<MotorDecisionConfig[]> {
  return fetchAutenticado<MotorDecisionConfig[]>("/api/admin/motor");
}

export function crearVersionMotor(input: MotorDecisionCrearInput): Promise<MotorDecisionConfig> {
  return fetchAutenticado<MotorDecisionConfig>("/api/admin/motor", { method: "POST", body: JSON.stringify(input) });
}

export function listarAuditoria(filtros: {
  entidad_tipo?: string;
  accion?: string;
  pagina?: number;
}): Promise<AuditoriaListOut> {
  const params = new URLSearchParams();
  if (filtros.entidad_tipo) params.set("entidad_tipo", filtros.entidad_tipo);
  if (filtros.accion) params.set("accion", filtros.accion);
  params.set("pagina", String(filtros.pagina ?? 1));
  return fetchAutenticado<AuditoriaListOut>(`/api/admin/auditoria?${params.toString()}`);
}

// --- Portal del solicitante ---
export function consultarEstado(codigo: string, documento: string): Promise<any> {
  return fetch(`${API_URL}/api/solicitudes/estado`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ codigo, documento }),
  }).then((r) => {
    if (!r.ok) throw new ApiError(r.status, "No se encontró la solicitud");
    return r.json();
  });
}

export function listarPropietariosAdmin(): Promise<any[]> {
  return fetchAutenticado<any[]>("/api/admin/propietarios");
}

export function crearPropietarioAdmin(payload: Record<string, unknown>): Promise<any> {
  return fetchAutenticado<any>("/api/admin/propietarios", { method: "POST", body: JSON.stringify(payload) });
}

export function actualizarRiesgoPropietario(id: string, componentes: Record<string, number>): Promise<RiesgoOut> {
  return fetchAutenticado<RiesgoOut>(`/api/admin/propietarios/${id}/riesgo`, {
    method: "PATCH",
    body: JSON.stringify({ componentes }),
  });
}

export function obtenerReportesAdmin(): Promise<any> {
  return fetchAutenticado<any>("/api/admin/reportes");
}

export function revisarDocumentoAdmin(
  solicitudId: string,
  documentoId: string,
  payload: { estado: string; comentario?: string }
): Promise<any> {
  return fetchAutenticado<any>(`/api/solicitudes/${solicitudId}/documentos/${documentoId}/revision`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function agregarComentarioAdmin(solicitudId: string, texto: string): Promise<any> {
  return fetchAutenticado<any>(`/api/solicitudes/${solicitudId}/comentarios`, {
    method: "POST",
    body: JSON.stringify({ texto }),
  });
}

export function listarComentariosAdmin(solicitudId: string): Promise<any[]> {
  return fetchAutenticado<any[]>(`/api/solicitudes/${solicitudId}/comentarios`);
}

export function asignarAnalistaAdmin(solicitudId: string, analistaId: string): Promise<any> {
  return fetchAutenticado<any>(`/api/admin/solicitudes/${solicitudId}/asignar`, {
    method: "PATCH",
    body: JSON.stringify({ analista_id: analistaId }),
  });
}

export function exportarSolicitudesCSV(): Promise<any[]> {
  return fetchAutenticado<any[]>("/api/admin/solicitudes/export");
}

// --- Catálogos maestros (DIVIPOLA, CIIU, operativos) ---
export function obtenerDivipola(): Promise<{ departamentos: { cod: string; nombre: string; municipios: { cod: string; nombre: string }[] }[] }> {
  return fetchJson("/api/catalogos/divipola", { cache: "no-store" });
}

export function buscarCiiu(q: string): Promise<{ codigo: string; descripcion: string; seccion: string; seccion_nombre: string; division: string; division_nombre: string }[]> {
  return fetchJson(`/api/catalogos/ciiu?q=${encodeURIComponent(q)}`, { cache: "no-store" });
}

export function obtenerEstructuraCiiu(): Promise<{ secciones: { codigo: string; nombre: string; divisiones: string }[]; divisiones: { codigo: string; seccion: string; nombre: string; clases_cargadas: number }[]; total_clases: number; total_oficial: number }> {
  return fetchJson("/api/catalogos/ciiu/estructura", { cache: "no-store" });
}

export function obtenerCatalogosOperativos(): Promise<Record<string, string[]>> {
  return fetchJson("/api/catalogos/operativos", { cache: "no-store" });
}

export function actualizarCatalogoOperativo(clave: string, valores: string[]): Promise<Record<string, string[]>> {
  return fetchAutenticado(`/api/admin/catalogos/operativos/${encodeURIComponent(clave)}`, {
    method: "PUT",
    body: JSON.stringify({ valores }),
  });
}

// --- Parametrización operativa ---
export interface ParametrizacionOperativa {
  sla: Record<string, number>;
  auto_asignacion: boolean;
  notificaciones: boolean;
  revision_manual_obligatoria: boolean;
  motivos_rechazo: string[];
}

export function obtenerParametrizacion(): Promise<ParametrizacionOperativa> {
  return fetchAutenticado("/api/admin/parametrizacion");
}

export function guardarParametrizacion(payload: Partial<ParametrizacionOperativa>): Promise<ParametrizacionOperativa> {
  return fetchAutenticado("/api/admin/parametrizacion", { method: "PUT", body: JSON.stringify(payload) });
}

// --- Requisitos documentales configurables ---
export interface DocumentoRequisito {
  id: string;
  nombre: string;
  para: string;
  contiene: string;
  formato: string;
  ejemplo: string;
  sin_validar: string;
  obligatorio: boolean;
}

export interface ReglaRequisito {
  id: string;
  condicion: string;
  valor: string;
  docs: string[];
  activa: boolean;
  autor: string | null;
  fecha: string | null;
}

export interface RequisitosConfig {
  base: DocumentoRequisito[];
  perfiles: Record<string, DocumentoRequisito[]>;
  reglas: ReglaRequisito[];
}

export function obtenerRequisitos(): Promise<RequisitosConfig> {
  return fetchAutenticado("/api/admin/requisitos");
}

export function actualizarDocumentoRequisito(perfil: string, docId: string, payload: Partial<DocumentoRequisito>): Promise<RequisitosConfig> {
  return fetchAutenticado(`/api/admin/requisitos/documentos/${encodeURIComponent(perfil)}/${encodeURIComponent(docId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function actualizarReglaRequisito(reglaId: string, payload: Partial<ReglaRequisito>): Promise<RequisitosConfig> {
  return fetchAutenticado(`/api/admin/requisitos/reglas/${encodeURIComponent(reglaId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// --- Motor de validación / calidad de datos ---
export interface HallazgoValidacion {
  tipo: string;
  tipo_etiqueta: string;
  severidad: number;
  titulo: string;
  detalle: string;
  campos: string[];
  accion: string;
}

export interface CalidadDatoOut {
  campo: string;
  etiqueta: string;
  valor: string | null;
  estado: string;
  estado_etiqueta: string;
  peso: number;
  fuente: string;
}

export interface ValidacionSolicitudOut {
  hallazgos: HallazgoValidacion[];
  calidad: CalidadDatoOut[];
  verificabilidad: number;
  resumen: { errores: number; advertencias: number; verificados: number; total_campos: number };
}

export function validarSolicitudAdmin(solicitudId: string): Promise<ValidacionSolicitudOut> {
  return fetchAutenticado(`/api/admin/solicitudes/${solicitudId}/validacion`);
}
