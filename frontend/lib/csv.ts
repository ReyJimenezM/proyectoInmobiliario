function escaparCelda(valor: string): string {
  if (/[",\n]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

export function exportCSV(filename: string, headers: string[], rows: string[][]): void {
  const lineas = [headers, ...rows].map((fila) => fila.map(escaparCelda).join(","));
  const contenido = lineas.join("\r\n");
  const blob = new Blob([`﻿${contenido}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}
