/**
 * Datos de demostración para los módulos que todavía no tienen endpoint en el backend:
 * Leads/CRM, pasarela de pagos, plantillas de notificación, contratos y portal del propietario.
 *
 * Son constantes deterministas a propósito: sin `Math.random` ni `Date.now` en el módulo, para
 * que servidor y cliente rendericen lo mismo. Cuando el backend exponga cada recurso, la pantalla
 * correspondiente solo cambia el origen de `useState(...)` por la llamada a `lib/api`.
 */

import type { Veredicto } from "./motorLocal";

/* ------------------------------------------------------------------ */
/*  Leads / CRM                                                        */
/* ------------------------------------------------------------------ */

export type EstadoLead = "nuevo" | "contactado" | "en_gestion" | "calificado" | "ganado" | "perdido";

export const ESTADOS_LEAD: { clave: EstadoLead; titulo: string }[] = [
  { clave: "nuevo", titulo: "Nuevo" },
  { clave: "contactado", titulo: "Contactado" },
  { clave: "en_gestion", titulo: "En gestión" },
  { clave: "calificado", titulo: "Calificado" },
  { clave: "ganado", titulo: "Ganado" },
  { clave: "perdido", titulo: "Perdido" },
];

export interface Lead {
  id: string;
  tipo: "propietario" | "arrendatario";
  nombre: string;
  telefono: string;
  correo: string;
  ciudad: string;
  interes: string;
  canon_objetivo: number;
  origen: "vitrina" | "simulador" | "referido" | "campaña" | "landing propietarios";
  estado: EstadoLead;
  asesor: string;
  creado_en: string;
  ultima_gestion: string;
  nota: string;
}

export const LEADS: Lead[] = [
  {
    id: "LD-1042",
    tipo: "arrendatario",
    nombre: "Laura Restrepo Vélez",
    telefono: "3104556677",
    correo: "laura.restrepo@correo.com",
    ciudad: "Medellín",
    interes: "Apartamento 2 habitaciones, Laureles",
    canon_objetivo: 2400000,
    origen: "simulador",
    estado: "calificado",
    asesor: "Juan Pablo Cárdenas",
    creado_en: "2026-08-04T09:12:00Z",
    ultima_gestion: "2026-08-08T15:40:00Z",
    nota: "Simuló con canon de 2.4M e ingresos de 9M. Pidió agendar visita el sábado.",
  },
  {
    id: "LD-1041",
    tipo: "propietario",
    nombre: "Inversiones Delgado S.A.S.",
    telefono: "3157788990",
    correo: "contacto@invdelgado.co",
    ciudad: "Bogotá",
    interes: "Portafolio de 6 apartaestudios en Chapinero",
    canon_objetivo: 1800000,
    origen: "landing propietarios",
    estado: "en_gestion",
    asesor: "Marcela Ortiz",
    creado_en: "2026-08-03T14:00:00Z",
    ultima_gestion: "2026-08-07T11:05:00Z",
    nota: "Quiere administración integral. Enviada propuesta comercial, pendiente de respuesta.",
  },
  {
    id: "LD-1040",
    tipo: "arrendatario",
    nombre: "Andrés Felipe Muñoz",
    telefono: "3001122334",
    correo: "af.munoz@correo.com",
    ciudad: "Bogotá",
    interes: "Casa 3 habitaciones, Suba",
    canon_objetivo: 3200000,
    origen: "vitrina",
    estado: "contactado",
    asesor: "Juan Pablo Cárdenas",
    creado_en: "2026-08-06T18:22:00Z",
    ultima_gestion: "2026-08-07T09:15:00Z",
    nota: "Independiente informal. Se le explicó la ruta con codeudor.",
  },
  {
    id: "LD-1039",
    tipo: "arrendatario",
    nombre: "Sofía Camargo Pineda",
    telefono: "3125566778",
    correo: "sofia.camargo@correo.com",
    ciudad: "Cali",
    interes: "Apartaestudio, Granada",
    canon_objetivo: 1500000,
    origen: "campaña",
    estado: "nuevo",
    asesor: "Sin asignar",
    creado_en: "2026-08-09T08:45:00Z",
    ultima_gestion: "2026-08-09T08:45:00Z",
    nota: "Llegó por campaña de agosto. Sin primer contacto todavía.",
  },
  {
    id: "LD-1038",
    tipo: "propietario",
    nombre: "Gloria Elena Sáenz",
    telefono: "3189900112",
    correo: "gsaenz@correo.com",
    ciudad: "Medellín",
    interes: "Casa en Envigado, primera vez que arrienda",
    canon_objetivo: 4100000,
    origen: "referido",
    estado: "ganado",
    asesor: "Marcela Ortiz",
    creado_en: "2026-07-28T10:30:00Z",
    ultima_gestion: "2026-08-05T16:20:00Z",
    nota: "Firmó mandato de administración. Inmueble ya publicado.",
  },
  {
    id: "LD-1037",
    tipo: "arrendatario",
    nombre: "Carlos Iván Beltrán",
    telefono: "3143344556",
    correo: "ci.beltran@correo.com",
    ciudad: "Barranquilla",
    interes: "Local comercial, Alto Prado",
    canon_objetivo: 5600000,
    origen: "vitrina",
    estado: "perdido",
    asesor: "Juan Pablo Cárdenas",
    creado_en: "2026-07-22T13:10:00Z",
    ultima_gestion: "2026-08-01T10:00:00Z",
    nota: "Tomó otro local con un competidor. Motivo: tiempo de respuesta.",
  },
];

/* ------------------------------------------------------------------ */
/*  Pagos y facturación                                                */
/* ------------------------------------------------------------------ */

export type EstadoPago = "aprobado" | "pendiente" | "fallido" | "reversado";

export interface Transaccion {
  id: string;
  referencia_pasarela: string;
  solicitud: string;
  pagador: string;
  documento: string;
  concepto: string;
  valor: number;
  metodo: "PSE" | "Tarjeta de crédito" | "Tarjeta débito" | "Efectivo";
  estado: EstadoPago;
  fecha: string;
  conciliado: boolean;
}

export const TRANSACCIONES: Transaccion[] = [
  {
    id: "TRX-8801",
    referencia_pasarela: "PSE-9f3a12",
    solicitud: "AC-KQTMRD",
    pagador: "Laura Restrepo Vélez",
    documento: "1017234561",
    concepto: "Estudio de arrendamiento",
    valor: 45000,
    metodo: "PSE",
    estado: "aprobado",
    fecha: "2026-08-09T14:22:00Z",
    conciliado: true,
  },
  {
    id: "TRX-8800",
    referencia_pasarela: "TC-77b201",
    solicitud: "AC-PLWMXZ",
    pagador: "Andrés Felipe Muñoz",
    documento: "80233445",
    concepto: "Estudio de arrendamiento",
    valor: 45000,
    metodo: "Tarjeta de crédito",
    estado: "aprobado",
    fecha: "2026-08-09T11:05:00Z",
    conciliado: true,
  },
  {
    id: "TRX-8799",
    referencia_pasarela: "PSE-2c8e40",
    solicitud: "AC-VRTBNH",
    pagador: "Sofía Camargo Pineda",
    documento: "1144556677",
    concepto: "Estudio de arrendamiento",
    valor: 45000,
    metodo: "PSE",
    estado: "pendiente",
    fecha: "2026-08-10T08:31:00Z",
    conciliado: false,
  },
  {
    id: "TRX-8798",
    referencia_pasarela: "TC-31ff09",
    solicitud: "AC-JHGFDS",
    pagador: "Carlos Iván Beltrán",
    documento: "72884411",
    concepto: "Estudio de arrendamiento",
    valor: 45000,
    metodo: "Tarjeta débito",
    estado: "fallido",
    fecha: "2026-08-08T19:47:00Z",
    conciliado: false,
  },
  {
    id: "TRX-8797",
    referencia_pasarela: "PSE-5ab903",
    solicitud: "AC-ZXCVBN",
    pagador: "Diana Marcela Ruiz",
    documento: "52998877",
    concepto: "Estudio de arrendamiento + codeudor",
    valor: 68000,
    metodo: "PSE",
    estado: "aprobado",
    fecha: "2026-08-07T16:12:00Z",
    conciliado: true,
  },
  {
    id: "TRX-8796",
    referencia_pasarela: "PSE-6de114",
    solicitud: "AC-MNBVCX",
    pagador: "Jorge Enrique Palacios",
    documento: "19445566",
    concepto: "Estudio de arrendamiento",
    valor: 45000,
    metodo: "PSE",
    estado: "reversado",
    fecha: "2026-08-05T10:03:00Z",
    conciliado: true,
  },
];

/* ------------------------------------------------------------------ */
/*  Plantillas de notificación                                         */
/* ------------------------------------------------------------------ */

export type CanalNotificacion = "email" | "whatsapp" | "sms";

export interface PlantillaNotificacion {
  id: string;
  evento: string;
  evento_nombre: string;
  canal: CanalNotificacion;
  asunto: string;
  cuerpo: string;
  activa: boolean;
  destinatario: "cliente" | "propietario" | "analista";
}

/** Variables disponibles en las plantillas; se insertan con doble llave. */
export const VARIABLES_PLANTILLA = [
  "{{nombre}}",
  "{{codigo_solicitud}}",
  "{{inmueble}}",
  "{{canon}}",
  "{{veredicto}}",
  "{{condiciones}}",
  "{{enlace}}",
  "{{asesor}}",
];

export const PLANTILLAS: PlantillaNotificacion[] = [
  {
    id: "NT-01",
    evento: "solicitud_creada",
    evento_nombre: "Nueva solicitud",
    canal: "email",
    destinatario: "cliente",
    asunto: "Recibimos tu solicitud {{codigo_solicitud}}",
    cuerpo:
      "Hola {{nombre}},\n\nRecibimos tu solicitud para {{inmueble}} con un canon de {{canon}}. Ya estamos validando tus datos.\n\nPuedes seguir el avance en {{enlace}}.",
    activa: true,
  },
  {
    id: "NT-02",
    evento: "pago_aprobado",
    evento_nombre: "Pago aprobado",
    canal: "whatsapp",
    destinatario: "cliente",
    asunto: "Pago confirmado",
    cuerpo:
      "{{nombre}}, confirmamos tu pago del estudio. Estamos consultando la central de riesgo y en pocos minutos tendrás tu resultado.",
    activa: true,
  },
  {
    id: "NT-03",
    evento: "en_estudio",
    evento_nombre: "Pasa a estudio",
    canal: "email",
    destinatario: "cliente",
    asunto: "Tu solicitud {{codigo_solicitud}} está en estudio",
    cuerpo:
      "Hola {{nombre}},\n\nUn analista está revisando tu caso. Te escribimos apenas tengamos la decisión; normalmente tomamos menos de 24 horas hábiles.",
    activa: true,
  },
  {
    id: "NT-04",
    evento: "requiere_codeudor",
    evento_nombre: "Requiere codeudor",
    canal: "whatsapp",
    destinatario: "cliente",
    asunto: "Necesitamos reforzar tu solicitud",
    cuerpo:
      "{{nombre}}, para aprobar {{inmueble}} necesitamos reforzar tu solicitud. Puedes agregar un codeudor o continuar con condiciones adicionales: {{enlace}}",
    activa: true,
  },
  {
    id: "NT-05",
    evento: "aprobada",
    evento_nombre: "Solicitud aprobada",
    canal: "email",
    destinatario: "cliente",
    asunto: "¡Buenas noticias! Tu solicitud fue aprobada",
    cuerpo:
      "Hola {{nombre}},\n\nTu solicitud para {{inmueble}} quedó {{veredicto}}. {{condiciones}}\n\nEl siguiente paso es la firma del contrato: {{enlace}}",
    activa: true,
  },
  {
    id: "NT-06",
    evento: "rechazada",
    evento_nombre: "Solicitud rechazada",
    canal: "email",
    destinatario: "cliente",
    asunto: "Resultado de tu solicitud {{codigo_solicitud}}",
    cuerpo:
      "Hola {{nombre}},\n\nPor ahora no pudimos aprobar tu solicitud. En {{enlace}} encuentras el detalle de los factores que pesaron y qué puedes mejorar para volver a intentarlo.",
    activa: true,
  },
  {
    id: "NT-07",
    evento: "veredicto_propietario",
    evento_nombre: "Veredicto al propietario",
    canal: "email",
    destinatario: "propietario",
    asunto: "Nuevo candidato evaluado para {{inmueble}}",
    cuerpo:
      "Hola {{nombre}},\n\nUn candidato para {{inmueble}} obtuvo el resultado: {{veredicto}}. Puedes ver el detalle en tu portal: {{enlace}}\n\nNo compartimos información financiera del candidato.",
    activa: true,
  },
  {
    id: "NT-08",
    evento: "contrato_en_firma",
    evento_nombre: "Contrato en firma",
    canal: "sms",
    destinatario: "cliente",
    asunto: "Contrato listo para firmar",
    cuerpo: "{{nombre}}, tu contrato de {{inmueble}} está listo para firma electrónica: {{enlace}}",
    activa: true,
  },
  {
    id: "NT-09",
    evento: "documento_rechazado",
    evento_nombre: "Documento rechazado",
    canal: "whatsapp",
    destinatario: "cliente",
    asunto: "Necesitamos un documento nuevo",
    cuerpo:
      "{{nombre}}, uno de tus documentos no se pudo validar. Cárgalo de nuevo aquí para no frenar tu estudio: {{enlace}}",
    activa: false,
  },
];

/* ------------------------------------------------------------------ */
/*  Contratos                                                          */
/* ------------------------------------------------------------------ */

export type EstadoContrato = "borrador" | "en_firma" | "firmado" | "activo" | "terminado";

export interface Contrato {
  id: string;
  inmueble: string;
  direccion: string;
  arrendatario: string;
  propietario: string;
  canon: number;
  estado: EstadoContrato;
  inicio: string;
  fin: string;
  firmas: { parte: string; nombre: string; firmado: boolean; fecha: string | null }[];
}

export const CONTRATOS: Contrato[] = [
  {
    id: "CT-2026-041",
    inmueble: "Apartamento 302 · Laureles",
    direccion: "Cra 76 #40-22, Medellín",
    arrendatario: "Laura Restrepo Vélez",
    propietario: "Gloria Elena Sáenz",
    canon: 2400000,
    estado: "en_firma",
    inicio: "2026-09-01",
    fin: "2027-08-31",
    firmas: [
      { parte: "Arrendatario", nombre: "Laura Restrepo Vélez", firmado: true, fecha: "2026-08-09T17:20:00Z" },
      { parte: "Propietario", nombre: "Gloria Elena Sáenz", firmado: false, fecha: null },
      { parte: "Arrendadora", nombre: "Raíz Arrendamientos S.A.S.", firmado: false, fecha: null },
    ],
  },
  {
    id: "CT-2026-040",
    inmueble: "Casa 12 · Cedritos",
    direccion: "Calle 140 #12-33, Bogotá",
    arrendatario: "Diana Marcela Ruiz",
    propietario: "Inversiones Delgado S.A.S.",
    canon: 3800000,
    estado: "activo",
    inicio: "2026-07-01",
    fin: "2027-06-30",
    firmas: [
      { parte: "Arrendatario", nombre: "Diana Marcela Ruiz", firmado: true, fecha: "2026-06-24T10:00:00Z" },
      { parte: "Propietario", nombre: "Inversiones Delgado S.A.S.", firmado: true, fecha: "2026-06-25T09:12:00Z" },
      { parte: "Arrendadora", nombre: "Raíz Arrendamientos S.A.S.", firmado: true, fecha: "2026-06-25T14:40:00Z" },
    ],
  },
  {
    id: "CT-2026-039",
    inmueble: "Apartaestudio 801 · Chapinero",
    direccion: "Cra 9 #63-18, Bogotá",
    arrendatario: "Jorge Enrique Palacios",
    propietario: "Inversiones Delgado S.A.S.",
    canon: 1800000,
    estado: "borrador",
    inicio: "2026-09-15",
    fin: "2027-09-14",
    firmas: [
      { parte: "Arrendatario", nombre: "Jorge Enrique Palacios", firmado: false, fecha: null },
      { parte: "Propietario", nombre: "Inversiones Delgado S.A.S.", firmado: false, fecha: null },
      { parte: "Arrendadora", nombre: "Raíz Arrendamientos S.A.S.", firmado: false, fecha: null },
    ],
  },
  {
    id: "CT-2025-118",
    inmueble: "Local 4 · Alto Prado",
    direccion: "Cra 52 #76-40, Barranquilla",
    arrendatario: "Comercializadora Sur",
    propietario: "Gloria Elena Sáenz",
    canon: 5600000,
    estado: "terminado",
    inicio: "2025-08-01",
    fin: "2026-07-31",
    firmas: [
      { parte: "Arrendatario", nombre: "Comercializadora Sur", firmado: true, fecha: "2025-07-25T12:00:00Z" },
      { parte: "Propietario", nombre: "Gloria Elena Sáenz", firmado: true, fecha: "2025-07-26T08:30:00Z" },
      { parte: "Arrendadora", nombre: "Raíz Arrendamientos S.A.S.", firmado: true, fecha: "2025-07-26T15:00:00Z" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Portal del propietario                                             */
/* ------------------------------------------------------------------ */

export type EstadoInmueble = "borrador" | "en_revision" | "disponible" | "reservado" | "arrendado";

export const ETIQUETAS_ESTADO_INMUEBLE: Record<EstadoInmueble, string> = {
  borrador: "Borrador",
  en_revision: "En revisión",
  disponible: "Disponible",
  reservado: "Reservado",
  arrendado: "Arrendado",
};

export interface InmueblePropietario {
  id: string;
  titulo: string;
  direccion: string;
  ciudad: string;
  tipo: string;
  canon: number;
  administracion: number;
  area: number;
  habitaciones: number;
  banos: number;
  acepta_mascotas: boolean;
  estado: EstadoInmueble;
  publicado_en: string;
  visitas: number;
  leads: number;
  imagen: string;
}

export const INMUEBLES_PROPIETARIO: InmueblePropietario[] = [
  {
    id: "IN-501",
    titulo: "Apartamento 302 · Laureles",
    direccion: "Cra 76 #40-22",
    ciudad: "Medellín",
    tipo: "Apartamento",
    canon: 2400000,
    administracion: 320000,
    area: 78,
    habitaciones: 2,
    banos: 2,
    acepta_mascotas: true,
    estado: "reservado",
    publicado_en: "2026-07-12",
    visitas: 486,
    leads: 14,
    imagen: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=60",
  },
  {
    id: "IN-502",
    titulo: "Casa 12 · Envigado",
    direccion: "Calle 37 Sur #28-14",
    ciudad: "Envigado",
    tipo: "Casa",
    canon: 4100000,
    administracion: 0,
    area: 168,
    habitaciones: 4,
    banos: 3,
    acepta_mascotas: true,
    estado: "disponible",
    publicado_en: "2026-08-01",
    visitas: 212,
    leads: 6,
    imagen: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=60",
  },
  {
    id: "IN-503",
    titulo: "Apartaestudio 801 · Chapinero",
    direccion: "Cra 9 #63-18",
    ciudad: "Bogotá",
    tipo: "Apartaestudio",
    canon: 1800000,
    administracion: 240000,
    area: 38,
    habitaciones: 1,
    banos: 1,
    acepta_mascotas: false,
    estado: "arrendado",
    publicado_en: "2026-05-20",
    visitas: 903,
    leads: 27,
    imagen: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=60",
  },
  {
    id: "IN-504",
    titulo: "Local 4 · Alto Prado",
    direccion: "Cra 52 #76-40",
    ciudad: "Barranquilla",
    tipo: "Local comercial",
    canon: 5600000,
    administracion: 480000,
    area: 120,
    habitaciones: 0,
    banos: 2,
    acepta_mascotas: false,
    estado: "en_revision",
    publicado_en: "2026-08-08",
    visitas: 31,
    leads: 1,
    imagen: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=60",
  },
];

/**
 * Lo que ve el propietario de cada candidato. Deliberadamente sin ingresos, score ni RCI:
 * la política define que solo se comparte el veredicto y los datos de convivencia.
 */
export interface CandidatoPropietario {
  id: string;
  inmueble_id: string;
  nombre: string;
  veredicto: Veredicto;
  evaluado_en: string;
  ocupantes: number;
  mascotas: string;
  fecha_deseada: string;
  condiciones: string[];
}

export const CANDIDATOS: CandidatoPropietario[] = [
  {
    id: "CD-901",
    inmueble_id: "IN-501",
    nombre: "Laura R. V.",
    veredicto: "aprobado",
    evaluado_en: "2026-08-09T14:30:00Z",
    ocupantes: 2,
    mascotas: "1 gato",
    fecha_deseada: "2026-09-01",
    condiciones: [],
  },
  {
    id: "CD-902",
    inmueble_id: "IN-501",
    nombre: "Andrés F. M.",
    veredicto: "requiere_codeudor",
    evaluado_en: "2026-08-08T10:10:00Z",
    ocupantes: 3,
    mascotas: "Ninguna",
    fecha_deseada: "2026-09-15",
    condiciones: [],
  },
  {
    id: "CD-903",
    inmueble_id: "IN-502",
    nombre: "Sofía C. P.",
    veredicto: "aprobado_con_condiciones",
    evaluado_en: "2026-08-07T16:45:00Z",
    ocupantes: 1,
    mascotas: "1 perro pequeño",
    fecha_deseada: "2026-08-25",
    condiciones: ["Depósito de 2 meses de canon", "Póliza de arrendamiento"],
  },
  {
    id: "CD-904",
    inmueble_id: "IN-502",
    nombre: "Jorge E. P.",
    veredicto: "en_estudio",
    evaluado_en: "2026-08-10T09:05:00Z",
    ocupantes: 4,
    mascotas: "Ninguna",
    fecha_deseada: "2026-09-01",
    condiciones: [],
  },
  {
    id: "CD-905",
    inmueble_id: "IN-504",
    nombre: "Comercializadora S.",
    veredicto: "rechazado",
    evaluado_en: "2026-08-09T11:22:00Z",
    ocupantes: 0,
    mascotas: "No aplica",
    fecha_deseada: "2026-09-01",
    condiciones: [],
  },
];

/* ------------------------------------------------------------------ */
/*  Constructor de formularios                                         */
/* ------------------------------------------------------------------ */

export type TipoCampo = "texto" | "numero" | "fecha" | "seleccion" | "booleano" | "archivo" | "telefono" | "correo";

export interface CampoFormulario {
  id: string;
  paso: number;
  etiqueta: string;
  tipo: TipoCampo;
  obligatorio: boolean;
  activo: boolean;
  opciones: string[];
  /** Condición de visibilidad: se muestra solo si `campo` tiene alguno de estos valores. */
  condicion: { campo: string; valores: string[] } | null;
  ayuda: string;
}

export const CAMPOS_FORMULARIO: CampoFormulario[] = [
  { id: "ciudad", paso: 0, etiqueta: "Ciudad / municipio", tipo: "seleccion", obligatorio: true, activo: true, opciones: ["Bogotá", "Medellín", "Cali", "Barranquilla"], condicion: null, ayuda: "Dónde busca el inmueble." },
  { id: "tipo_inmueble", paso: 0, etiqueta: "Tipo de inmueble", tipo: "seleccion", obligatorio: true, activo: true, opciones: ["Apartamento", "Casa", "Local", "Oficina", "Bodega"], condicion: null, ayuda: "" },
  { id: "canon_deseado", paso: 0, etiqueta: "Presupuesto de canon", tipo: "numero", obligatorio: true, activo: true, opciones: [], condicion: null, ayuda: "Base del cálculo de RCI." },
  { id: "numero_documento", paso: 1, etiqueta: "Número de documento", tipo: "texto", obligatorio: true, activo: true, opciones: [], condicion: null, ayuda: "" },
  { id: "fecha_nacimiento", paso: 1, etiqueta: "Fecha de nacimiento", tipo: "fecha", obligatorio: true, activo: true, opciones: [], condicion: null, ayuda: "Valida mayoría de edad." },
  { id: "nivel_educativo", paso: 1, etiqueta: "Nivel educativo", tipo: "seleccion", obligatorio: false, activo: true, opciones: ["Bachiller", "Técnico", "Profesional", "Posgrado"], condicion: null, ayuda: "" },
  { id: "tipo_vivienda", paso: 2, etiqueta: "Tipo de vivienda actual", tipo: "seleccion", obligatorio: true, activo: true, opciones: ["Propia", "Familiar", "Arrendada"], condicion: null, ayuda: "" },
  { id: "arrendador_nombre", paso: 2, etiqueta: "Nombre del arrendador actual", tipo: "texto", obligatorio: true, activo: true, opciones: [], condicion: { campo: "tipo_vivienda", valores: ["Arrendada"] }, ayuda: "Referencia clave del negocio." },
  { id: "mascotas_tipo", paso: 2, etiqueta: "Tipo y cantidad de mascotas", tipo: "texto", obligatorio: true, activo: true, opciones: [], condicion: { campo: "tiene_mascotas", valores: ["true"] }, ayuda: "Filtro del inmueble, no del riesgo." },
  { id: "tipo_actividad", paso: 3, etiqueta: "Tipo de actividad económica", tipo: "seleccion", obligatorio: true, activo: true, opciones: ["Empleado formal", "Empleado informal", "Independiente formal", "Independiente informal", "Pensionado", "Rentista"], condicion: null, ayuda: "" },
  { id: "empresa", paso: 3, etiqueta: "Nombre de la empresa", tipo: "texto", obligatorio: true, activo: true, opciones: [], condicion: { campo: "tipo_actividad", valores: ["Empleado formal", "Empleado informal"] }, ayuda: "" },
  { id: "entidad_pagadora", paso: 3, etiqueta: "Entidad pagadora", tipo: "texto", obligatorio: true, activo: true, opciones: [], condicion: { campo: "tipo_actividad", valores: ["Pensionado"] }, ayuda: "" },
  { id: "obligaciones_financieras", paso: 3, etiqueta: "Obligaciones financieras vigentes", tipo: "numero", obligatorio: true, activo: true, opciones: [], condicion: null, ayuda: "Entra al cálculo de capacidad disponible." },
  { id: "referencia_comercial", paso: 4, etiqueta: "Referencia comercial", tipo: "texto", obligatorio: true, activo: true, opciones: [], condicion: { campo: "tipo_actividad", valores: ["Independiente formal", "Independiente informal"] }, ayuda: "" },
  { id: "habeas_data_general", paso: 5, etiqueta: "Autorización de tratamiento de datos (Ley 1581)", tipo: "booleano", obligatorio: true, activo: true, opciones: [], condicion: null, ayuda: "No se puede desactivar: requisito legal." },
  { id: "consulta_centrales", paso: 5, etiqueta: "Autorización de consulta en centrales (Ley 1266)", tipo: "booleano", obligatorio: true, activo: true, opciones: [], condicion: null, ayuda: "Debe ir separada del consentimiento general." },
  { id: "declaracion_renta", paso: 6, etiqueta: "Declaración de renta", tipo: "archivo", obligatorio: false, activo: true, opciones: [], condicion: { campo: "ingresos_mensuales", valores: [">= 15000000"] }, ayuda: "Se pide según nivel de ingresos." },
];

/** Campos que la ley obliga a mantener: el constructor no permite desactivarlos. */
export const CAMPOS_BLOQUEADOS = ["habeas_data_general", "consulta_centrales", "numero_documento", "fecha_nacimiento"];
