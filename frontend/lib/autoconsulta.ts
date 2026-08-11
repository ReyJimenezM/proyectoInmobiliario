"use client";

/**
 * Estado del formulario de autoconsulta (sección 4 de la especificación).
 *
 * Todo vive en localStorage para cumplir el "guardado de progreso": el usuario puede cerrar el
 * navegador y retomar donde iba. Cuando exista el endpoint de borradores, `cargar`/`guardar` son
 * los dos únicos puntos que hay que cambiar.
 *
 * Nota sobre el orden de pasos: el documento numera "7 resultado" y "8 pago", pero el propio
 * paso 8 aclara que el cobro ocurre *antes* de la consulta a central de riesgo. La UI sigue esa
 * regla: cobra y después muestra el veredicto.
 */

import type { EntradaMotor, ResultadoMotor } from "./motorLocal";

export const CLAVE_STORAGE = "autoconsulta_v1";

/** Valor del estudio completo. Parametrizable desde /admin/pagos. */
export const COBRO_ESTUDIO = {
  valor: 45000,
  moneda: "COP",
  concepto: "Estudio de arrendamiento con consulta a central de riesgo",
};

export type TipoActividad =
  | "empleado_formal"
  | "empleado_informal"
  | "independiente_formal"
  | "independiente_informal"
  | "pensionado"
  | "rentista";

export const ETIQUETAS_ACTIVIDAD: Record<TipoActividad, string> = {
  empleado_formal: "Empleado formal",
  empleado_informal: "Empleado informal",
  independiente_formal: "Independiente formal",
  independiente_informal: "Independiente informal",
  pensionado: "Pensionado",
  rentista: "Rentista de capital",
};

export interface Preformulario {
  ciudad: string;
  tipo_inmueble: string;
  canon_deseado: number | "";
  propiedad_id: string;
  propiedad_titulo: string;
}

export interface DatosPersonales {
  tipo_documento: string;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  lugar_expedicion: string;
  fecha_expedicion: string;
  genero: string;
  estado_civil: string;
  nivel_educativo: string;
  celular: string;
  correo: string;
}

export interface DatosVivienda {
  tipo_vivienda: string;
  tiempo_vivienda: string;
  motivo_mudanza: string;
  arrendador_nombre: string;
  arrendador_telefono: string;
  numero_ocupantes: number | "";
  tiene_mascotas: boolean;
  mascotas_tipo: string;
  mascotas_cantidad: number | "";
}

export interface DatosEconomicos {
  tipo_actividad: TipoActividad | "";
  /* Empleado */
  cargo: string;
  empresa: string;
  direccion_laboral: string;
  tipo_contrato: string;
  /* Independiente */
  actividad_economica: string;
  nombre_negocio: string;
  direccion_negocio: string;
  /* Pensionado */
  entidad_pagadora: string;
  /* Comunes */
  antiguedad_meses: number | "";
  ingresos_mensuales: number | "";
  otros_ingresos: number | "";
  concepto_otros_ingresos: string;
  gastos_mensuales: number | "";
  obligaciones_financieras: number | "";
  personas_a_cargo: number | "";
}

export interface Referencia {
  nombre: string;
  telefono: string;
  parentesco?: string;
}

export interface DatosReferencias {
  personales: Referencia[];
  familiares: Referencia[];
  comercial: Referencia;
}

export interface Autorizaciones {
  habeas_data_general: boolean;
  consulta_centrales: boolean;
  terminos_condiciones: boolean;
  politica_arrendamiento: boolean;
}

export interface ArchivoCargado {
  nombre: string;
  tamano: number;
  cargado_en: string;
}

export interface DatosPago {
  estado: "pendiente" | "pagado";
  metodo: string;
  referencia: string;
  valor: number;
  pagado_en: string | null;
}

export type RutaRefuerzo = "sin_definir" | "con_codeudor" | "sin_codeudor";

export interface DatosCodeudor {
  nombres: string;
  apellidos: string;
  tipo_documento: string;
  numero_documento: string;
  celular: string;
  correo: string;
  parentesco: string;
  tipo_actividad: TipoActividad | "";
  ingresos_mensuales: number | "";
  obligaciones_financieras: number | "";
}

export interface EstadoAutoconsulta {
  version: 1;
  codigo: string;
  creado_en: string;
  actualizado_en: string;
  paso_maximo: number;
  preformulario: Preformulario;
  personales: DatosPersonales;
  vivienda: DatosVivienda;
  economica: DatosEconomicos;
  referencias: DatosReferencias;
  autorizaciones: Autorizaciones;
  documentos: Record<string, ArchivoCargado>;
  pago: DatosPago;
  ruta: RutaRefuerzo;
  codeudor: DatosCodeudor;
  resultado: ResultadoMotor | null;
}

const REFERENCIA_VACIA: Referencia = { nombre: "", telefono: "" };

export function estadoInicial(): EstadoAutoconsulta {
  const ahora = new Date().toISOString();
  return {
    version: 1,
    codigo: generarCodigo(),
    creado_en: ahora,
    actualizado_en: ahora,
    paso_maximo: 0,
    preformulario: { ciudad: "", tipo_inmueble: "", canon_deseado: "", propiedad_id: "", propiedad_titulo: "" },
    personales: {
      tipo_documento: "Cédula de ciudadanía",
      numero_documento: "",
      nombres: "",
      apellidos: "",
      fecha_nacimiento: "",
      lugar_expedicion: "",
      fecha_expedicion: "",
      genero: "",
      estado_civil: "",
      nivel_educativo: "",
      celular: "",
      correo: "",
    },
    vivienda: {
      tipo_vivienda: "",
      tiempo_vivienda: "",
      motivo_mudanza: "",
      arrendador_nombre: "",
      arrendador_telefono: "",
      numero_ocupantes: "",
      tiene_mascotas: false,
      mascotas_tipo: "",
      mascotas_cantidad: "",
    },
    economica: {
      tipo_actividad: "",
      cargo: "",
      empresa: "",
      direccion_laboral: "",
      tipo_contrato: "",
      actividad_economica: "",
      nombre_negocio: "",
      direccion_negocio: "",
      entidad_pagadora: "",
      antiguedad_meses: "",
      ingresos_mensuales: "",
      otros_ingresos: "",
      concepto_otros_ingresos: "",
      gastos_mensuales: "",
      obligaciones_financieras: "",
      personas_a_cargo: "",
    },
    referencias: {
      personales: [{ ...REFERENCIA_VACIA }, { ...REFERENCIA_VACIA }],
      familiares: [
        { ...REFERENCIA_VACIA, parentesco: "" },
        { ...REFERENCIA_VACIA, parentesco: "" },
      ],
      comercial: { ...REFERENCIA_VACIA },
    },
    autorizaciones: {
      habeas_data_general: false,
      consulta_centrales: false,
      terminos_condiciones: false,
      politica_arrendamiento: false,
    },
    documentos: {},
    pago: { estado: "pendiente", metodo: "", referencia: "", valor: COBRO_ESTUDIO.valor, pagado_en: null },
    ruta: "sin_definir",
    codeudor: {
      nombres: "",
      apellidos: "",
      tipo_documento: "Cédula de ciudadanía",
      numero_documento: "",
      celular: "",
      correo: "",
      parentesco: "",
      tipo_actividad: "",
      ingresos_mensuales: "",
      obligaciones_financieras: "",
    },
    resultado: null,
  };
}

function generarCodigo(): string {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let salida = "AC-";
  for (let i = 0; i < 6; i++) salida += letras[Math.floor(Math.random() * letras.length)];
  return salida;
}

export function cargar(): EstadoAutoconsulta | null {
  if (typeof window === "undefined") return null;
  const crudo = window.localStorage.getItem(CLAVE_STORAGE);
  if (!crudo) return null;
  try {
    const datos = JSON.parse(crudo) as EstadoAutoconsulta;
    return datos.version === 1 ? datos : null;
  } catch {
    return null;
  }
}

export function cargarOCrear(): EstadoAutoconsulta {
  return cargar() ?? estadoInicial();
}

export function guardar(estado: EstadoAutoconsulta): EstadoAutoconsulta {
  const actualizado = { ...estado, actualizado_en: new Date().toISOString() };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(CLAVE_STORAGE, JSON.stringify(actualizado));
  }
  return actualizado;
}

export function limpiar(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(CLAVE_STORAGE);
}

/* ------------------------------------------------------------------ */
/*  Definición de pasos                                                */
/* ------------------------------------------------------------------ */

export interface DefinicionPaso {
  numero: number;
  slug: string;
  titulo: string;
  descripcion: string;
}

export const PASOS: DefinicionPaso[] = [
  { numero: 0, slug: "inicio", titulo: "¿Qué buscas?", descripcion: "Ciudad, tipo de inmueble y presupuesto." },
  { numero: 1, slug: "personales", titulo: "Datos personales", descripcion: "Identidad y datos de contacto." },
  { numero: 2, slug: "vivienda", titulo: "Vivienda actual", descripcion: "Dónde vives hoy y tu referencia de arrendamiento." },
  { numero: 3, slug: "economica", titulo: "Información económica", descripcion: "Actividad, ingresos y obligaciones." },
  { numero: 4, slug: "referencias", titulo: "Referencias", descripcion: "Personales, familiares y comerciales." },
  { numero: 5, slug: "autorizaciones", titulo: "Autorizaciones", descripcion: "Habeas Data y consulta en centrales." },
  { numero: 6, slug: "documentos", titulo: "Documentos", descripcion: "Soportes de identidad e ingresos." },
  { numero: 7, slug: "pago", titulo: "Pago del estudio", descripcion: "Antes de consultar la central de riesgo." },
  { numero: 8, slug: "resultado", titulo: "Resultado", descripcion: "Tu veredicto y los siguientes pasos." },
];

export function pasoPorSlug(slug: string): DefinicionPaso | undefined {
  return PASOS.find((p) => p.slug === slug);
}

/* ------------------------------------------------------------------ */
/*  Documentos requeridos según actividad (sección 4, paso 6)          */
/* ------------------------------------------------------------------ */

export interface RequisitoDocumento {
  clave: string;
  nombre: string;
  ayuda: string;
  obligatorio: boolean;
}

export function documentosRequeridos(economica: DatosEconomicos): RequisitoDocumento[] {
  const base: RequisitoDocumento[] = [
    { clave: "cedula_frente", nombre: "Cédula — cara frontal", ayuda: "Imagen legible, sin recortes.", obligatorio: true },
    { clave: "cedula_reverso", nombre: "Cédula — cara posterior", ayuda: "Imagen legible, sin recortes.", obligatorio: true },
  ];

  const actividad = economica.tipo_actividad;
  if (actividad === "empleado_formal" || actividad === "empleado_informal") {
    base.push({
      clave: "certificado_laboral",
      nombre: "Certificado laboral o 3 desprendibles de nómina",
      ayuda: "Con fecha de expedición no mayor a 30 días.",
      obligatorio: true,
    });
  }

  if (actividad === "independiente_formal" || actividad === "independiente_informal" || actividad === "rentista") {
    base.push({
      clave: "extractos_bancarios",
      nombre: "Extractos bancarios o certificado de ingresos",
      ayuda: "Últimos 3 meses, o certificación de contador con tarjeta profesional.",
      obligatorio: true,
    });
  }

  if (actividad === "pensionado") {
    base.push({
      clave: "resolucion_pension",
      nombre: "Resolución de pensión o desprendible de mesada",
      ayuda: "Expedido por la entidad pagadora.",
      obligatorio: true,
    });
  }

  const ingresos = Number(economica.ingresos_mensuales) || 0;
  if (ingresos >= 15000000) {
    base.push({
      clave: "declaracion_renta",
      nombre: "Declaración de renta",
      ayuda: "Requerida por el nivel de ingresos declarado.",
      obligatorio: true,
    });
  }

  base.push({
    clave: "referencia_arrendamiento",
    nombre: "Soporte de la referencia de arrendamiento anterior",
    ayuda: "Opcional, pero acelera la verificación.",
    obligatorio: false,
  });

  return base;
}

/* ------------------------------------------------------------------ */
/*  Puente hacia el motor                                              */
/* ------------------------------------------------------------------ */

/**
 * Sin integración a central de riesgo, el puntaje se deriva del documento del titular. Es
 * determinista (el mismo documento da siempre el mismo puntaje) para que la demo sea
 * reproducible, y se reemplaza por la respuesta real de la central cuando exista la integración.
 */
export function puntajeSimulado(numeroDocumento: string): number {
  let hash = 0;
  for (let i = 0; i < numeroDocumento.length; i++) {
    hash = (hash * 31 + numeroDocumento.charCodeAt(i)) % 100000;
  }
  return 520 + (hash % 331); // rango 520–850
}

export function reportesNegativosSimulados(numeroDocumento: string): boolean {
  return puntajeSimulado(numeroDocumento) < 600;
}

export function edadDesde(fechaNacimiento: string): number {
  if (!fechaNacimiento) return 0;
  const nacimiento = new Date(fechaNacimiento);
  if (Number.isNaN(nacimiento.getTime())) return 0;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
}

export function construirEntradaMotor(estado: EstadoAutoconsulta): EntradaMotor {
  const doc = estado.personales.numero_documento || "0";
  const ingresos = (Number(estado.economica.ingresos_mensuales) || 0) + (Number(estado.economica.otros_ingresos) || 0);

  return {
    mayor_de_edad: edadDesde(estado.personales.fecha_nacimiento) >= 18,
    documento_valido: estado.personales.numero_documento.trim().length >= 6,
    coincidencia_listas_restrictivas: false,
    canon_mensual: Number(estado.preformulario.canon_deseado) || 0,
    ingresos_titular: ingresos,
    ingresos_codeudor: Number(estado.codeudor.ingresos_mensuales) || 0,
    gastos_fijos: Number(estado.economica.gastos_mensuales) || 0,
    obligaciones_financieras:
      (Number(estado.economica.obligaciones_financieras) || 0) +
      (estado.ruta === "con_codeudor" ? Number(estado.codeudor.obligaciones_financieras) || 0 : 0),
    puntaje_central: puntajeSimulado(doc),
    reportes_negativos_vigentes: reportesNegativosSimulados(doc),
    antiguedad_meses: Number(estado.economica.antiguedad_meses) || 0,
    tipo_actividad: estado.economica.tipo_actividad || "",
    incluye_codeudor: estado.ruta === "con_codeudor",
    continuar_sin_codeudor: estado.ruta === "sin_codeudor",
  };
}

/* ------------------------------------------------------------------ */
/*  Validación por paso                                                */
/* ------------------------------------------------------------------ */

export type ErroresPaso = Record<string, string>;

const OBLIGATORIO = "Este campo es obligatorio.";

export function validarPaso(paso: number, estado: EstadoAutoconsulta): ErroresPaso {
  const errores: ErroresPaso = {};

  if (paso === 0) {
    if (!estado.preformulario.ciudad) errores.ciudad = OBLIGATORIO;
    if (!estado.preformulario.tipo_inmueble) errores.tipo_inmueble = OBLIGATORIO;
    if (!estado.preformulario.canon_deseado) errores.canon_deseado = "Indica el canon que buscas.";
  }

  if (paso === 1) {
    const p = estado.personales;
    if (!p.numero_documento.trim()) errores.numero_documento = OBLIGATORIO;
    if (!p.nombres.trim()) errores.nombres = OBLIGATORIO;
    if (!p.apellidos.trim()) errores.apellidos = OBLIGATORIO;
    if (!p.fecha_nacimiento) errores.fecha_nacimiento = OBLIGATORIO;
    else if (edadDesde(p.fecha_nacimiento) < 18) errores.fecha_nacimiento = "Debes ser mayor de edad para solicitar.";
    if (!p.celular.trim()) errores.celular = OBLIGATORIO;
    else if (!/^3\d{9}$/.test(p.celular.replace(/\s/g, ""))) errores.celular = "Escribe un celular colombiano de 10 dígitos.";
    if (!p.correo.trim()) errores.correo = OBLIGATORIO;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.correo)) errores.correo = "Revisa el formato del correo.";
  }

  if (paso === 2) {
    const v = estado.vivienda;
    if (!v.tipo_vivienda) errores.tipo_vivienda = OBLIGATORIO;
    if (!v.tiempo_vivienda) errores.tiempo_vivienda = OBLIGATORIO;
    if (!v.numero_ocupantes) errores.numero_ocupantes = "Indica cuántas personas habitarán el inmueble.";
    if (v.tipo_vivienda === "arrendada") {
      if (!v.arrendador_nombre.trim()) errores.arrendador_nombre = "La referencia del arrendador es clave para el estudio.";
      if (!v.arrendador_telefono.trim()) errores.arrendador_telefono = OBLIGATORIO;
    }
    if (v.tiene_mascotas && !v.mascotas_tipo.trim()) errores.mascotas_tipo = "Cuéntanos qué mascotas tienes.";
  }

  if (paso === 3) {
    const e = estado.economica;
    if (!e.tipo_actividad) errores.tipo_actividad = OBLIGATORIO;
    if (!e.ingresos_mensuales) errores.ingresos_mensuales = "Necesitamos tus ingresos para calcular la relación canon/ingreso.";
    if (e.antiguedad_meses === "") errores.antiguedad_meses = OBLIGATORIO;
    if (e.gastos_mensuales === "") errores.gastos_mensuales = OBLIGATORIO;
    if (e.obligaciones_financieras === "") errores.obligaciones_financieras = "Si no tienes obligaciones, escribe 0.";

    if (e.tipo_actividad === "empleado_formal" || e.tipo_actividad === "empleado_informal") {
      if (!e.empresa.trim()) errores.empresa = OBLIGATORIO;
      if (!e.cargo.trim()) errores.cargo = OBLIGATORIO;
    }
    if (e.tipo_actividad === "independiente_formal" || e.tipo_actividad === "independiente_informal") {
      if (!e.actividad_economica.trim()) errores.actividad_economica = OBLIGATORIO;
    }
    if (e.tipo_actividad === "pensionado" && !e.entidad_pagadora.trim()) {
      errores.entidad_pagadora = OBLIGATORIO;
    }
  }

  if (paso === 4) {
    estado.referencias.personales.forEach((ref, i) => {
      if (!ref.nombre.trim()) errores[`personal_${i}_nombre`] = OBLIGATORIO;
      if (!ref.telefono.trim()) errores[`personal_${i}_telefono`] = OBLIGATORIO;
    });
    estado.referencias.familiares.forEach((ref, i) => {
      if (!ref.nombre.trim()) errores[`familiar_${i}_nombre`] = OBLIGATORIO;
      if (!ref.telefono.trim()) errores[`familiar_${i}_telefono`] = OBLIGATORIO;
      if (!ref.parentesco?.trim()) errores[`familiar_${i}_parentesco`] = OBLIGATORIO;
    });
    const esIndependiente =
      estado.economica.tipo_actividad === "independiente_formal" ||
      estado.economica.tipo_actividad === "independiente_informal";
    if (esIndependiente && !estado.referencias.comercial.nombre.trim()) {
      errores.comercial_nombre = "Como independiente necesitamos una referencia comercial.";
    }
  }

  if (paso === 5) {
    const a = estado.autorizaciones;
    if (!a.habeas_data_general) errores.habeas_data_general = "Sin esta autorización no podemos tratar tus datos.";
    if (!a.consulta_centrales) errores.consulta_centrales = "La consulta a centrales exige autorización expresa.";
    if (!a.terminos_condiciones) errores.terminos_condiciones = OBLIGATORIO;
    if (!a.politica_arrendamiento) errores.politica_arrendamiento = OBLIGATORIO;
  }

  if (paso === 6) {
    documentosRequeridos(estado.economica)
      .filter((d) => d.obligatorio)
      .forEach((d) => {
        if (!estado.documentos[d.clave]) errores[d.clave] = "Falta cargar este documento.";
      });
  }

  if (paso === 7 && estado.pago.estado !== "pagado") {
    errores.pago = "Necesitamos confirmar el pago antes de consultar la central de riesgo.";
  }

  return errores;
}

export function porcentajeCompletado(estado: EstadoAutoconsulta): number {
  const pasosConDatos = PASOS.filter((p) => p.numero < 8);
  const completos = pasosConDatos.filter((p) => Object.keys(validarPaso(p.numero, estado)).length === 0).length;
  return Math.round((completos / pasosConDatos.length) * 100);
}
