"use client";

const CLAVE_ACCESS = "fincaraiz_access_token";
const CLAVE_REFRESH = "fincaraiz_refresh_token";
const CLAVE_USUARIO = "fincaraiz_usuario";

export interface UsuarioSesion {
  id: string;
  email: string;
  nombre_completo: string;
  rol: "solicitante" | "analista" | "admin" | "super_admin" | "asesor" | "consulta";
  inmobiliaria_id: string | null;
}

export function guardarSesion(accessToken: string, refreshToken: string, usuario: UsuarioSesion): void {
  localStorage.setItem(CLAVE_ACCESS, accessToken);
  localStorage.setItem(CLAVE_REFRESH, refreshToken);
  localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
}

export function obtenerAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CLAVE_ACCESS);
}

export function obtenerUsuarioSesion(): UsuarioSesion | null {
  if (typeof window === "undefined") return null;
  const crudo = localStorage.getItem(CLAVE_USUARIO);
  return crudo ? (JSON.parse(crudo) as UsuarioSesion) : null;
}

export function cerrarSesion(): void {
  localStorage.removeItem(CLAVE_ACCESS);
  localStorage.removeItem(CLAVE_REFRESH);
  localStorage.removeItem(CLAVE_USUARIO);
}

export function estaAutenticado(): boolean {
  return obtenerAccessToken() !== null;
}
