import { useEffect, useState } from "react";

// Contador de chats de WhatsApp que esperan al asesor (globito verde del menú). Solo admin.
// Una consulta cada 60 s, en pausa con la pestaña oculta. Usa fetch (no axios) para que un
// 401 de este contador NO dispare el cierre de sesión forzado del interceptor.

export interface ResumenChats {
  con_asesor: number;
  pendientes: number;
  no_leidos: number;
  bot_activo: boolean;
}

export const URL_RESUMEN_CHATS = "/api/bot-whatsapp/admin/resumen";
const INTERVALO_MS = 60_000;

export const useResumenChats = (habilitado: boolean): ResumenChats | null => {
  const [resumen, setResumen] = useState<ResumenChats | null>(null);

  useEffect(() => {
    if (!habilitado) {
      setResumen(null);
      return;
    }
    let detenido = false;
    const pedir = () => {
      if (detenido || document.visibilityState === "hidden") return;
      const token = localStorage.getItem("token");
      if (!token) return;
      fetch(URL_RESUMEN_CHATS, { headers: { Authorization: `Bearer ${token}` } })
        .then(async (r) => {
          if (r.status === 401 || r.status === 403) {
            detenido = true;
            return;
          }
          if (r.ok) setResumen((await r.json()) as ResumenChats);
        })
        .catch(() => undefined);
    };
    pedir();
    const id = window.setInterval(pedir, INTERVALO_MS);
    document.addEventListener("visibilitychange", pedir);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", pedir);
    };
  }, [habilitado]);

  return resumen;
};
