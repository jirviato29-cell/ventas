import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import type { AccesoMiPerfil } from "./useAccesoMiPerfil";

// Contador de MENSAJES sin leer (globito rojo del menú).
// Ligero a propósito: una sola consulta compartida por toda la app, cada 60 s, en pausa con la
// pestaña oculta. Usa fetch (no axios) para que un 401 del contador NO dispare el cierre de sesión
// forzado del interceptor: solo se detiene.
// Quién tiene MENSAJES lo decide el backend (variable MENSAJES_PARA_TODOS en Render): admin, asesor y
// encargado preguntan; con 403 se detienen (una sola consulta por sesión) y el menú no muestra MENSAJES.
// Dirección, contador y demás roles no hacen ninguna petición.

export const INTERVALO_NO_LEIDOS_MS = 60_000;
const URL_NO_LEIDOS = "/api/mensajes/no-leidos";

export interface NoLeidos {
  avisos: number;
  mensajes: number;
  total: number;
  // Solo RH y encargados: solicitudes donde les falta marcar su columna (no viene si no revisa)
  por_revisar?: number;
}

// Quién PREGUNTA; si de verdad tiene MENSAJES lo contesta el backend
export const puedeVerMensajes = (rol: string | null, _usuario?: string | null) =>
  rol === "admin" || rol === "asesor" || rol === "encargado";

// "Ver mis solicitudes" lleva a Mi Perfil: admin, o quien tenga acceso según el backend (useAccesoMiPerfil)
export const puedeVerMisSolicitudes = (rol: string | null, acceso: AccesoMiPerfil) =>
  rol === "admin" || ((rol === "asesor" || rol === "encargado") && acceso === "si");

export type EstadoMensajes = "cargando" | "si" | "no";

// ── Estado compartido (un solo contador aunque el hook se use en varios lugares) ──
let valor: NoLeidos | null = null;
let tokenDelValor: string | null = null;
let ultimo = 0;
let enCurso: Promise<void> | null = null;
let detenidoPara: string | null = null; // token que recibió 401/403: no se vuelve a preguntar con él
const oyentes = new Set<(v: NoLeidos | null) => void>();

const tokenActual = () => localStorage.getItem("token");

const tokenVencido = (token: string) => {
  try {
    const { exp } = jwtDecode<{ exp?: number }>(token);
    return typeof exp === "number" && exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};

const publicar = () => oyentes.forEach((f) => f(valor));

/** Pide el contador ya (p. ej. después de leer o enviar algo en la pantalla de MENSAJES). */
export const refrescarNoLeidos = (): Promise<void> => {
  const token = tokenActual();
  if (!token || token === detenidoPara || tokenVencido(token)) return Promise.resolve();
  if (enCurso) return enCurso;
  enCurso = fetch(URL_NO_LEIDOS, { headers: { Authorization: `Bearer ${token}` } })
    .then(async (r) => {
      if (r.status === 401 || r.status === 403) {
        detenidoPara = token;
        valor = null;
        return;
      }
      if (!r.ok) return; // error pasajero: se queda el último valor
      const datos = (await r.json()) as NoLeidos;
      valor = datos;
      tokenDelValor = token;
    })
    .catch(() => undefined)
    .finally(() => {
      ultimo = Date.now();
      enCurso = null;
      publicar();
    });
  return enCurso;
};

/** Solo para pruebas */
export const reiniciarNoLeidos = () => {
  valor = null;
  tokenDelValor = null;
  ultimo = 0;
  enCurso = null;
  detenidoPara = null;
};

const estadoActual = (habilitado: boolean): EstadoMensajes => {
  const token = tokenActual();
  if (!habilitado || !token || token === detenidoPara || tokenVencido(token)) return "no";
  return valor !== null && tokenDelValor === token ? "si" : "cargando";
};

export const useNoLeidos = (habilitado: boolean): { noLeidos: NoLeidos | null; estado: EstadoMensajes } => {
  const [actual, setActual] = useState<NoLeidos | null>(() =>
    habilitado && tokenDelValor === tokenActual() ? valor : null
  );
  const [estado, setEstado] = useState<EstadoMensajes>(() => estadoActual(habilitado));

  useEffect(() => {
    if (!habilitado) {
      setActual(null);
      setEstado("no");
      return;
    }
    const oyente = (v: NoLeidos | null) => {
      setActual(tokenDelValor === tokenActual() ? v : null);
      setEstado(estadoActual(true));
    };
    oyentes.add(oyente);
    oyente(valor);

    // Solo pregunta si ya pasaron 60 s (o si el valor es de otra sesión) y la pestaña está a la vista
    const revisar = () => {
      if (document.visibilityState === "hidden") return;
      const deOtraSesion = tokenDelValor !== tokenActual();
      if (deOtraSesion || Date.now() - ultimo >= INTERVALO_NO_LEIDOS_MS - 1000) refrescarNoLeidos();
    };
    revisar();
    const id = window.setInterval(revisar, INTERVALO_NO_LEIDOS_MS);
    document.addEventListener("visibilitychange", revisar);
    return () => {
      oyentes.delete(oyente);
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", revisar);
    };
  }, [habilitado]);

  return { noLeidos: actual, estado };
};
