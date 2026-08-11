/**
 * Motor de decisión ejecutado en el cliente (secciones 3.1 a 3.3 de la especificación).
 *
 * Es la versión de front: replica el árbol para que la autoconsulta pueda mostrar el veredicto
 * y su explicación sin depender del servicio de motor. Los umbrales viven en `PARAMETROS_POR_DEFECTO`
 * y se reciben por parámetro, de modo que cambiar política no exige tocar esta función — es la
 * misma forma que espera el módulo /admin/motor cuando el backend publique una versión.
 */

export type Veredicto =
  | "aprobado"
  | "aprobado_con_condiciones"
  | "en_estudio"
  | "requiere_codeudor"
  | "rechazado";

export type BandaPuntaje = "alto" | "medio" | "bajo";

export interface ParametrosMotor {
  /** Relación canon/ingreso: hasta este valor es zona verde. */
  rci_maximo_verde: number;
  /** Por encima de este valor se rechaza por capacidad. */
  rci_maximo_gris: number;
  /** El canon no debe superar este porcentaje de la capacidad de pago disponible. */
  colchon_capacidad: number;
  /** Puntaje de central de riesgo desde el que la banda es ALTA. */
  puntaje_alto: number;
  /** Puntaje desde el que la banda es MEDIA (debajo es BAJA). */
  puntaje_medio: number;
  /** Puntaje mínimo, más exigente, para la ruta sin codeudor. */
  puntaje_minimo_sin_codeudor: number;
  /** Antigüedad mínima en meses en el empleo o en la actividad económica. */
  antiguedad_minima_meses: number;
  /** Meses de canon exigidos como depósito en la ruta con condiciones. */
  meses_deposito_garantia: number;
}

/**
 * Valores de referencia iniciales del documento. Son un punto de partida: hay que calibrarlos
 * con el apetito de riesgo propio y, cuando exista, con estadística de la cartera.
 */
export const PARAMETROS_POR_DEFECTO: ParametrosMotor = {
  rci_maximo_verde: 0.3,
  rci_maximo_gris: 0.4,
  colchon_capacidad: 0.7,
  puntaje_alto: 720,
  puntaje_medio: 620,
  puntaje_minimo_sin_codeudor: 760,
  antiguedad_minima_meses: 6,
  meses_deposito_garantia: 2,
};

export interface EntradaMotor {
  /** Paso 1: se valida mayoría de edad y coincidencias en listas restrictivas. */
  mayor_de_edad: boolean;
  documento_valido: boolean;
  coincidencia_listas_restrictivas: boolean;
  /** Paso 3: indicadores financieros. */
  canon_mensual: number;
  ingresos_titular: number;
  ingresos_codeudor: number;
  gastos_fijos: number;
  obligaciones_financieras: number;
  /** Paso 2: consulta obligatoria a central de riesgo. */
  puntaje_central: number;
  reportes_negativos_vigentes: boolean;
  /** Contexto de actividad económica. */
  antiguedad_meses: number;
  tipo_actividad: string;
  /** Ruta elegida por el usuario en el paso 7. */
  incluye_codeudor: boolean;
  continuar_sin_codeudor: boolean;
}

export interface NodoEvaluado {
  paso: string;
  titulo: string;
  detalle: string;
  resultado: "ok" | "alerta" | "falla";
}

export interface Indicadores {
  ingresos_totales: number;
  /** canon mensual / ingresos totales mensuales */
  rci: number;
  /** ingresos − gastos fijos − obligaciones financieras */
  capacidad_disponible: number;
  /** canon / capacidad disponible; debe quedar bajo el colchón configurado */
  uso_de_capacidad: number;
  banda_puntaje: BandaPuntaje;
  cubre_canon: boolean;
}

export interface ResultadoMotor {
  veredicto: Veredicto;
  /** Motivo principal, redactado para mostrarse al usuario final. */
  motivo: string;
  indicadores: Indicadores;
  traza: NodoEvaluado[];
  /** Condiciones adicionales cuando el veredicto es "aprobado con condiciones". */
  condiciones: string[];
  /** Qué puede hacer el usuario para mejorar el resultado. */
  sugerencias: string[];
  /** El paso 7 ofrece la ruta de codeudor solo cuando esto es verdadero. */
  ofrece_ruta_codeudor: boolean;
  parametros: ParametrosMotor;
  evaluado_en: string;
}

export function bandaDePuntaje(puntaje: number, p: ParametrosMotor): BandaPuntaje {
  if (puntaje >= p.puntaje_alto) return "alto";
  if (puntaje >= p.puntaje_medio) return "medio";
  return "bajo";
}

export function calcularIndicadores(entrada: EntradaMotor, p: ParametrosMotor): Indicadores {
  const ingresosTotales =
    entrada.ingresos_titular + (entrada.incluye_codeudor ? entrada.ingresos_codeudor : 0);
  const capacidad = ingresosTotales - entrada.gastos_fijos - entrada.obligaciones_financieras;
  const rci = ingresosTotales > 0 ? entrada.canon_mensual / ingresosTotales : 1;
  const uso = capacidad > 0 ? entrada.canon_mensual / capacidad : Infinity;

  return {
    ingresos_totales: ingresosTotales,
    rci,
    capacidad_disponible: capacidad,
    uso_de_capacidad: uso,
    banda_puntaje: bandaDePuntaje(entrada.puntaje_central, p),
    cubre_canon: capacidad > 0 && uso <= p.colchon_capacidad,
  };
}

const PORCENTAJE = (valor: number) => `${(valor * 100).toFixed(1)}%`;

/**
 * Recorre el árbol de la sección 3.3 y devuelve el veredicto junto con la traza de cada nodo.
 * La traza es lo que alimenta el snapshot auditable de `EjecuciónMotor` (sección 7).
 */
export function evaluar(entrada: EntradaMotor, parametros = PARAMETROS_POR_DEFECTO): ResultadoMotor {
  const p = parametros;
  const ind = calcularIndicadores(entrada, p);
  const traza: NodoEvaluado[] = [];
  const sugerencias: string[] = [];

  const salida = (
    veredicto: Veredicto,
    motivo: string,
    extras?: { condiciones?: string[]; ofrece_ruta_codeudor?: boolean }
  ): ResultadoMotor => ({
    veredicto,
    motivo,
    indicadores: ind,
    traza,
    condiciones: extras?.condiciones ?? [],
    sugerencias,
    ofrece_ruta_codeudor: extras?.ofrece_ruta_codeudor ?? false,
    parametros: p,
    evaluado_en: new Date().toISOString(),
  });

  /* --- 1. Validación de datos e identidad --- */
  if (!entrada.documento_valido || !entrada.mayor_de_edad) {
    traza.push({
      paso: "1",
      titulo: "Validación de identidad",
      detalle: !entrada.mayor_de_edad
        ? "El titular no acredita mayoría de edad."
        : "El documento no superó la validación.",
      resultado: "falla",
    });
    return salida("rechazado", "No pudimos validar tu identidad o tu mayoría de edad.");
  }

  if (entrada.coincidencia_listas_restrictivas) {
    traza.push({
      paso: "1",
      titulo: "Listas restrictivas",
      detalle: "Se encontró una coincidencia que debe resolverse antes de continuar.",
      resultado: "falla",
    });
    return salida("rechazado", "Encontramos una coincidencia en listas restrictivas que debemos verificar.");
  }

  traza.push({
    paso: "1",
    titulo: "Validación de datos e identidad",
    detalle: "Documento válido, mayor de edad y sin coincidencias en listas restrictivas.",
    resultado: "ok",
  });

  /* --- 2. Consulta obligatoria a central de riesgo --- */
  traza.push({
    paso: "2",
    titulo: "Consulta a central de riesgo",
    detalle: `Puntaje ${entrada.puntaje_central} — banda ${ind.banda_puntaje.toUpperCase()}. ${
      entrada.reportes_negativos_vigentes ? "Con reportes negativos vigentes." : "Sin reportes negativos vigentes."
    }`,
    resultado: entrada.reportes_negativos_vigentes ? "alerta" : ind.banda_puntaje === "bajo" ? "alerta" : "ok",
  });

  /* --- 3. Indicadores --- */
  traza.push({
    paso: "3",
    titulo: "Relación canon/ingreso y capacidad de pago",
    detalle: `RCI ${PORCENTAJE(ind.rci)} · capacidad disponible ${Math.round(
      ind.capacidad_disponible
    ).toLocaleString("es-CO")} · el canon usa ${
      Number.isFinite(ind.uso_de_capacidad) ? PORCENTAJE(ind.uso_de_capacidad) : "más del 100%"
    } de esa capacidad.`,
    resultado: ind.rci <= p.rci_maximo_verde && ind.cubre_canon ? "ok" : ind.rci <= p.rci_maximo_gris ? "alerta" : "falla",
  });

  if (ind.rci > p.rci_maximo_verde) {
    sugerencias.push(
      `Busca un canon cercano a ${Math.round(ind.ingresos_totales * p.rci_maximo_verde).toLocaleString("es-CO")} para quedar dentro del ${PORCENTAJE(p.rci_maximo_verde)} recomendado.`
    );
  }
  if (!ind.cubre_canon) {
    sugerencias.push("Reduce obligaciones financieras vigentes para liberar capacidad de pago.");
  }

  /* --- 4. Evaluación combinada --- */
  const antiguedadSuficiente = entrada.antiguedad_meses >= p.antiguedad_minima_meses;
  if (!antiguedadSuficiente) {
    sugerencias.push(
      `Tu antigüedad en la actividad (${entrada.antiguedad_meses} meses) está por debajo de los ${p.antiguedad_minima_meses} meses que pide la política.`
    );
  }

  const rutaAlta =
    ind.banda_puntaje === "alto" &&
    ind.rci <= p.rci_maximo_verde &&
    ind.cubre_canon &&
    !entrada.reportes_negativos_vigentes;

  if (rutaAlta && antiguedadSuficiente) {
    traza.push({
      paso: "4",
      titulo: "Evaluación combinada",
      detalle: "Puntaje alto, RCI dentro del rango, capacidad suficiente y sin reportes negativos.",
      resultado: "ok",
    });
    return salida("aprobado", "Cumples todos los criterios de la política vigente.");
  }

  const rutaBaja =
    ind.banda_puntaje === "bajo" || ind.rci > p.rci_maximo_gris || entrada.reportes_negativos_vigentes;

  if (rutaBaja) {
    const motivos: string[] = [];
    if (ind.banda_puntaje === "bajo") motivos.push("el puntaje en central de riesgo está en banda baja");
    if (ind.rci > p.rci_maximo_gris) motivos.push(`la relación canon/ingreso (${PORCENTAJE(ind.rci)}) supera el máximo permitido`);
    if (entrada.reportes_negativos_vigentes) motivos.push("hay reportes negativos vigentes");

    traza.push({
      paso: "4",
      titulo: "Evaluación combinada",
      detalle: `Requiere reforzar la solicitud porque ${motivos.join(", ")}.`,
      resultado: "falla",
    });

    /* 4.a — ruta con codeudor: se recalcula con la capacidad combinada. */
    if (entrada.incluye_codeudor) {
      const cubreCombinado = ind.cubre_canon && ind.rci <= p.rci_maximo_gris;
      traza.push({
        paso: "4.a",
        titulo: "Recálculo con codeudor",
        detalle: `Ingresos combinados ${Math.round(ind.ingresos_totales).toLocaleString("es-CO")} · RCI combinado ${PORCENTAJE(ind.rci)}.`,
        resultado: cubreCombinado ? "ok" : "alerta",
      });

      if (cubreCombinado && !entrada.reportes_negativos_vigentes && ind.banda_puntaje !== "bajo") {
        return salida("aprobado", "Con el codeudor la solicitud alcanza los umbrales de la política.");
      }
      return salida(
        "en_estudio",
        "Con el codeudor la solicitud mejora, pero un analista debe revisarla antes de decidir.",
        { ofrece_ruta_codeudor: false }
      );
    }

    /* 4.b — ruta sin codeudor: exige un puntaje mínimo más alto y condiciones adicionales. */
    if (entrada.continuar_sin_codeudor) {
      const cumpleMinimo = entrada.puntaje_central >= p.puntaje_minimo_sin_codeudor;
      traza.push({
        paso: "4.b",
        titulo: "Ruta sin codeudor",
        detalle: `Puntaje exigido ${p.puntaje_minimo_sin_codeudor}; el titular registra ${entrada.puntaje_central}.`,
        resultado: cumpleMinimo ? "ok" : "falla",
      });

      if (cumpleMinimo) {
        return salida("aprobado_con_condiciones", "Apruebas sin codeudor, sujeto a garantías adicionales.", {
          condiciones: [
            `Depósito de garantía equivalente a ${p.meses_deposito_garantia} meses de canon.`,
            "Póliza de arrendamiento a nombre del titular.",
            "Primer canon anticipado al momento de la firma.",
          ],
        });
      }

      sugerencias.push("Agregar un codeudor con ingresos demostrables es la ruta más rápida para aprobar.");
      return salida(
        "en_estudio",
        `Sin codeudor la política exige un puntaje de al menos ${p.puntaje_minimo_sin_codeudor}. Pasamos tu caso a revisión de un analista.`,
        { ofrece_ruta_codeudor: true }
      );
    }

    sugerencias.push("Agrega un codeudor o continúa solo aceptando condiciones adicionales.");
    return salida("requiere_codeudor", "Necesitamos reforzar tu solicitud para poder aprobarla.", {
      ofrece_ruta_codeudor: true,
    });
  }

  /* Zona gris: puntaje medio, RCI entre los dos umbrales o antigüedad insuficiente. */
  const motivosEstudio: string[] = [];
  if (ind.banda_puntaje === "medio") motivosEstudio.push("puntaje en banda media");
  if (ind.rci > p.rci_maximo_verde && ind.rci <= p.rci_maximo_gris)
    motivosEstudio.push(`RCI en zona gris (${PORCENTAJE(ind.rci)})`);
  if (!antiguedadSuficiente) motivosEstudio.push("antigüedad por debajo del mínimo");
  if (!ind.cubre_canon) motivosEstudio.push("la capacidad disponible queda ajustada frente al canon");

  traza.push({
    paso: "4",
    titulo: "Evaluación combinada",
    detalle: `Caso de zona gris: ${motivosEstudio.join(", ")}.`,
    resultado: "alerta",
  });

  return salida(
    "en_estudio",
    "Tu solicitud entra a revisión de un analista. Te avisamos apenas tengamos la decisión.",
    { ofrece_ruta_codeudor: true }
  );
}

export const ETIQUETAS_VEREDICTO: Record<Veredicto, string> = {
  aprobado: "Aprobado",
  aprobado_con_condiciones: "Aprobado con condiciones",
  en_estudio: "En estudio",
  requiere_codeudor: "Requiere codeudor",
  rechazado: "Rechazado",
};

/** Paleta por veredicto: fondo, texto y anillo, para reutilizar en badges y tarjetas. */
export const ESTILOS_VEREDICTO: Record<Veredicto, string> = {
  aprobado: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  aprobado_con_condiciones: "bg-sky-50 text-sky-700 ring-sky-200",
  en_estudio: "bg-amber-50 text-amber-700 ring-amber-200",
  requiere_codeudor: "bg-violet-50 text-violet-700 ring-violet-200",
  rechazado: "bg-rose-50 text-rose-700 ring-rose-200",
};

/** Estados del pipeline de una solicitud (sección 3.5). */
export const ESTADOS_PIPELINE = [
  "Nueva",
  "Validando datos",
  "Consultando central de riesgo",
  "En estudio",
  "Esperando codeudor",
  "Decisión",
  "Contrato en firma",
  "Contrato activo",
] as const;

export type EstadoPipeline = (typeof ESTADOS_PIPELINE)[number];
