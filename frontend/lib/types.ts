export type Operacion = "venta" | "arriendo";

export type TipoPropiedad =
  | "apartamento"
  | "casa"
  | "apartaestudio"
  | "oficina"
  | "local"
  | "lote"
  | "bodega";

export interface ImagenPropiedad {
  id: string;
  url: string;
  orden: number;
}

export interface Anunciante {
  id: string;
  tipo: "particular" | "inmobiliaria" | "constructora";
  nombre: string;
  telefono_contacto: string | null;
  email: string | null;
  componentes_riesgo: Record<string, number> | null;
  score_riesgo: number | null;
  nivel_riesgo: string | null;
}

export interface PropiedadListItem {
  id: string;
  titulo: string;
  tipo: TipoPropiedad;
  operacion: Operacion;
  precio: string;
  area_m2: string;
  habitaciones: number;
  banos: number;
  ciudad: string;
  zona: string | null;
  barrio: string | null;
  simulador_activo: boolean;
  imagen_principal: string | null;
}

export interface PropiedadListOut {
  resultados: PropiedadListItem[];
  total: number;
  pagina: number;
  tamano_pagina: number;
  total_paginas: number;
}

export interface PropiedadDetail {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: TipoPropiedad;
  operacion: Operacion;
  precio: string;
  valor_admin: string | null;
  area_m2: string;
  habitaciones: number;
  banos: number;
  parqueaderos: number;
  ciudad: string;
  zona: string | null;
  barrio: string | null;
  direccion: string | null;
  estrato: number | null;
  simulador_activo: boolean;
  estado: string;
  imagenes: ImagenPropiedad[];
  anunciante: Anunciante;
  componentes_riesgo: Record<string, number> | null;
  score_riesgo: number | null;
  nivel_riesgo: string | null;
}

export interface FiltrosListado {
  operacion?: Operacion;
  tipo?: TipoPropiedad;
  ciudad?: string;
  zona?: string;
  barrio?: string;
  precio_min?: number;
  precio_max?: number;
  area_min?: number;
  area_max?: number;
  habitaciones_min?: number;
  banos_min?: number;
  orden?: "relevancia" | "precio_asc" | "precio_desc" | "recientes";
  pagina?: number;
  tamano_pagina?: number;
}

export interface SimuladorCompraInput {
  propiedad_id?: string;
  precio: number;
  cuota_inicial: number;
  ingresos_mensuales: number;
  ingresos_mensuales_2?: number;
  plazo_anios: 10 | 15 | 20;
  tasa_ea?: number;
}

export interface SimuladorCompraOutput {
  simulacion_id: string;
  monto_a_financiar: string;
  cuota_mensual_estimada: string;
  ingresos_totales: string;
  relacion_cuota_ingreso: string;
  tasa_ea_usada: string;
  plazo_anios: number;
  semaforo: "verde" | "amarillo" | "rojo";
  mensaje: string;
}

export interface SimuladorArriendoInput {
  propiedad_id?: string;
  canon_mensual: number;
  ingresos_mensuales: number;
  tipo_ingreso: "empleado" | "independiente";
  tiene_codeudor: boolean;
}

export interface SimuladorArriendoOutput {
  simulacion_id: string;
  relacion_canon_ingreso: string;
  semaforo: "verde" | "amarillo" | "rojo";
  mensaje: string;
}

// --- Autenticación ---
export interface RegistroInput {
  email: string;
  password: string;
  nombre_completo: string;
  telefono?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface TokenOutput {
  access_token: string;
  refresh_token: string;
  token_type: string;
  usuario: {
    id: string;
    email: string;
    nombre_completo: string;
    rol: "solicitante" | "analista" | "admin" | "super_admin" | "asesor" | "consulta";
    inmobiliaria_id: string | null;
  };
}

// --- Solicitud (wizard) ---
export type EstadoSolicitud =
  | "borrador"
  | "enviada"
  | "en_evaluacion"
  | "revision_manual"
  | "aprobada"
  | "rechazada"
  | "con_ruta_alterna";

export interface SolicitudOut {
  id: string;
  propiedad_id: string;
  vertical: "compra" | "arriendo";
  estado: EstadoSolicitud;
  datos_personales: Record<string, unknown>;
  datos_laborales: Record<string, unknown>;
  datos_financieros: Record<string, unknown>;
  garantias_referencias: Record<string, unknown>;
  creado_en: string;
  actualizado_en: string;
}

export interface DatosPersonalesInput {
  nombres_apellidos: string;
  tipo_documento: "Cédula de ciudadanía" | "Cédula de extranjería" | "Pasaporte";
  numero_documento: string;
  fecha_nacimiento: string;
  estado_civil: string;
  personas_a_cargo: number;
  telefono: string;
  email: string;
  direccion_residencia: string;
  ciudad_residencia: string;
  tiempo_residencia: string;
  es_propietario: boolean;
}

export interface DatosLaboralesInput {
  tipo_ocupacion: "indefinido" | "termino_fijo" | "independiente" | "pensionado" | "otro";
  empresa?: string;
  cargo?: string;
  antiguedad_cargo_meses: number;
  antiguedad_laboral_anios: number;
  telefono_verificacion?: string;
  actividad_economica?: string;
  sector?: string;
  antiguedad_negocio_meses?: number;
}

export interface DatosFinancierosInput {
  ingresos_mensuales_fijos: number;
  ingresos_variables: number;
  ingresos_otros: number;
  descripcion_ingresos_variables?: string;
  deducciones_nomina: number;
  ingreso_no_verificable: number;
  gastos_mensuales_fijos: number;
  tiene_otros_creditos: boolean;
  otros_creditos: { entidad: string; saldo_aproximado: number; cuota_mensual: number; en_mora: boolean }[];
  tiene_ahorros: boolean;
  monto_ahorros?: number;
  patrimonio_activos: number[];
  patrimonio_pasivos: number[];
  autorizacion_centrales_riesgo: boolean;
}

export interface GarantiasReferenciasInput {
  tiene_codeudor: boolean;
  codeudor?: {
    nombre: string;
    documento: string;
    telefono: string;
    ingresos_declarados: number;
    ingresos_variables: number;
    cuotas_obligaciones: number;
  };
  tiene_poliza: boolean;
  referencia_laboral: { nombre: string; relacion?: string; telefono: string };
  referencia_personal: { nombre: string; relacion?: string; telefono: string };
  referencia_arrendador?: { nombre: string; telefono: string; tiempo_arriendo: string };
  ha_arrendado_antes: boolean;
  mora_en_arriendo_anterior: "ninguna" | "leve" | "grave";
  proceso_restitucion_previo: boolean;
}

export interface DocumentoOut {
  id: string;
  tipo_documento: string;
  estado: "cargado" | "pendiente" | "rechazado";
  cargado_en: string;
}

export interface ChecklistDocumentos {
  requeridos: string[];
  cargados: string[];
}

export interface VariableEvaluadaOut {
  nombre: string;
  peso: number;
  valor_calculado: number | string | null;
  banda: string;
  puntaje_obtenido: number;
  puntaje_ponderado: number;
}

export interface ResultadoSolicitudOut {
  estado: EstadoSolicitud;
  score?: number | null;
  escala_maxima: number;
  decision?: string | null;
  explicacion?: string | null;
  variables_evaluadas: VariableEvaluadaOut[];
  ruta_alterna_disponible: boolean;
  ruta_alterna_sugerencias: string[];
}

// --- Panel administrativo ---
export interface DecisionManualInput {
  decision_final: "aprobada" | "rechazada" | "solicitar_info";
  comentario: string;
}

export interface BandaVariablePolitica {
  etiqueta: string;
  puntaje: number;
  condicion: Record<string, unknown>;
}

export interface VariablePolitica {
  nombre: string;
  peso: number;
  bandas: BandaVariablePolitica[];
}

export interface PoliticaCredito {
  id: string;
  version: number;
  vertical: "compra" | "arriendo";
  variables: VariablePolitica[];
  bandas_decision: { aprobado_min: number; revision_min: number; revision_max: number };
  activa: boolean;
  autor_id: string;
  creado_en: string;
  motivo_cambio: string | null;
}

export interface PoliticaCreditoCrearInput {
  vertical: "compra" | "arriendo";
  variables: VariablePolitica[];
  bandas_decision: { aprobado_min: number; revision_min: number; revision_max: number };
  motivo_cambio: string;
}

export interface DashboardOut {
  total_solicitudes: number;
  solicitudes_por_estado: { estado: string; cantidad: number }[];
  tasa_aprobacion: number;
  tiempo_promedio_evaluacion_horas: number | null;
  distribucion_scores: { rango: string; cantidad: number }[];
}

// --- Fase 2: scoring de propietario/inmueble ---
export const OWNER_COMPS: { clave: string; etiqueta: string; peso: number }[] = [
  { clave: "titularidad", etiqueta: "Titularidad", peso: 25 },
  { clave: "juridica", etiqueta: "Situación jurídica", peso: 20 },
  { clave: "documentacion", etiqueta: "Documentación", peso: 18 },
  { clave: "identidad", etiqueta: "Identidad", peso: 15 },
  { clave: "fraude", etiqueta: "Antifraude", peso: 12 },
  { clave: "historial", etiqueta: "Historial con la inmobiliaria", peso: 5 },
  { clave: "cumplimiento", etiqueta: "Cumplimiento normativo", peso: 5 },
];

export const PROP_COMPS: { clave: string; etiqueta: string; peso: number }[] = [
  { clave: "documentacion", etiqueta: "Documentación", peso: 22 },
  { clave: "titularidad", etiqueta: "Titularidad registral", peso: 22 },
  { clave: "ubicacion", etiqueta: "Ubicación", peso: 12 },
  { clave: "estado", etiqueta: "Estado del inmueble", peso: 12 },
  { clave: "ph", etiqueta: "Propiedad horizontal", peso: 10 },
  { clave: "restricciones", etiqueta: "Restricciones / gravámenes", peso: 12 },
  { clave: "precio", etiqueta: "Coherencia de precio", peso: 5 },
  { clave: "consistencia", etiqueta: "Consistencia declarado vs. documento", peso: 5 },
];

export interface RiesgoOut {
  componentes_riesgo: Record<string, number> | null;
  score_riesgo: number | null;
  nivel_riesgo: string | null;
}

// --- Fase 2: multi-tenant, motor robusto, auditoría ---
export interface Inmobiliaria {
  id: string;
  nombre_legal: string;
  nombre_comercial: string;
  nit: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  logo_url: string | null;
  color_primario: string;
  color_acento: string;
  activa: boolean;
  creado_en: string;
}

export interface InmobiliariaCrearInput {
  nombre_legal: string;
  nombre_comercial: string;
  nit?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  color_primario?: string;
  color_acento?: string;
}

export interface UsuarioStaff {
  id: string;
  email: string;
  nombre_completo: string;
  rol: "solicitante" | "analista" | "admin" | "super_admin" | "asesor" | "consulta";
}

export interface UsuarioStaffCrearInput {
  email: string;
  password: string;
  nombre_completo: string;
  telefono?: string;
  rol: "admin" | "analista" | "asesor" | "consulta";
  inmobiliaria_id: string;
}

export interface ReglaMotor {
  id: string;
  grupo: string;
  tipo: "escala" | "ajuste";
  prioridad: number;
  variable: string;
  operador: string;
  valor: number;
  puntos: number;
  nombre: string;
  descripcion: string;
  activa: boolean;
}

export interface MotorDecisionConfig {
  id: string;
  version: string;
  autor: string;
  pesos: Record<string, number>;
  parametros: Record<string, number>;
  reglas: ReglaMotor[];
  activa: boolean;
  autor_id: string;
  notas: string | null;
  creado_en: string;
}

export interface MotorDecisionCrearInput {
  version: string;
  pesos: Record<string, number>;
  parametros: Record<string, number>;
  reglas: ReglaMotor[];
  notas: string;
}

export interface AuditoriaEntrada {
  id: string;
  entidad_tipo: string;
  entidad_id: string;
  accion: string;
  actor_id: string | null;
  payload_antes: Record<string, unknown> | null;
  payload_despues: Record<string, unknown>;
  timestamp: string;
}

export interface AuditoriaListOut {
  resultados: AuditoriaEntrada[];
  total: number;
  pagina: number;
  tamano_pagina: number;
}
