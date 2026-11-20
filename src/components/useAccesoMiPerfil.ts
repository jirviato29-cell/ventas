import { useEffect, useState } from "react";

// ¿La persona del token tiene "Mis vacaciones" (Mi Perfil)? Lo decide el backend con
// GET /api/mi-perfil/acceso: el piloto siempre y, con VACACIONES_PARA_TODOS encendida en Render,
// todo asesor/encargado activo. Así el interruptor de Render manda y el frontend no tiene lista fija.
// Una sola consulta por sesión (token), compartida por el menú, Mi Perfil y MENSAJES.
// Solo preguntan asesor y encargado: admin usa su propia vista y los demás roles nunca lo tienen.
// Usa fetch (no axios), igual que el contador de MENSAJES: un 401 aquí no cierra la sesión.

export type AccesoMiPerfil = "cargando" | "si" | "no";

const URL_ACCESO = "/api/mi-perfil/acceso";

let tokenDelValor: string | null = null;
let valor: boolean | null = null;
let enCurso: Promise<void> | null = null;
const oyentes = new Set<() => void>();

const estadoPara = (token: string | null): AccesoMiPerfil => {
  if (!token) return "no";
  if (tokenDelValor !== token || valor === null) return "cargando";
  return valor ? "si" : "no";
};

const preguntar = (token: string) => {
  tokenDelValor = token;
  valor = null;
  const p: Promise<void> = fetch(URL_ACCESO, { headers: { Authorization: `Bearer ${token}` } })
    .then(async (r) => {
      if (tokenDelValor !== token) return;
      if (r.ok) {
        const datos = (await r.json()) as { mis_vacaciones?: boolean };
        valor = datos?.mis_vacaciones === true;
      } else {
        valor = false;
        // Error del servidor (p. ej. Render despertando): no se guarda, se vuelve a preguntar después
        if (r.status >= 500) tokenDelValor = null;
      }
    })
    .catch(() => {
      if (tokenDelValor !== token) return;
      valor = false;
      tokenDelValor = null;
    })
    .finally(() => {
      if (enCurso === p) enCurso = null;
      oyentes.forEach((f) => f());
    });
  enCurso = p;
};

/** Solo para pruebas */
export const reiniciarAccesoMiPerfil = () => {
  tokenDelValor = null;
  valor = null;
  enCurso = null;
};

export const useAccesoMiPerfil = (rol: string | null): AccesoMiPerfil => {
  const pregunta = rol === "asesor" || rol === "encargado";
  const token = pregunta ? localStorage.getItem("token") : null;
  // El valor vive en el módulo (compartido); este estado solo sirve para volver a pintar
  const [, setEstado] = useState<AccesoMiPerfil>(() => estadoPara(token));

  useEffect(() => {
    if (!token) {
      setEstado("no");
      return;
    }
    const oyente = () => setEstado(estadoPara(token));
    oyentes.add(oyente);
    const yaSabe = tokenDelValor === token && (valor !== null || enCurso !== null);
    if (!yaSabe) preguntar(token);
    oyente();
    return () => {
      oyentes.delete(oyente);
    };
  }, [token]);

  // Siempre del valor compartido y del token de este render (nunca el de una sesión anterior)
  return estadoPara(token);
};
