import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

const API = "https://ato-appservidor-nvxt.onrender.com";

// Rutas donde NO se muestra el modal (si no, no podria hacer check-in)
const RUTAS_LIBRES = ["/mi-asistencia", "/checkin", "/asistencia"];

type EstadoDia = {
  aplica_candado: boolean;
  puede_usar: boolean;
  hizo_checkin: boolean;
  es_descanso: boolean;
  ruta_checkin: string | null;
  fecha: string;
};

const CandadoAsistencia: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const [estado, setEstado] = useState<EstadoDia | null>(null);
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const cacheKey = useCallback(() => {
    const usuario = localStorage.getItem("usuario") || "anon";
    return `candado:${usuario}`;
  }, []);

  const consultar = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await axios.get(`${API}/asistencia/estado-hoy`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: EstadoDia = res.data;
      setEstado(data);
      if (data.puede_usar) {
        sessionStorage.setItem(cacheKey(), data.fecha);
      } else {
        sessionStorage.removeItem(cacheKey());
      }
    } catch (e) {
      // Si falla la red o Render esta dormido, NO bloqueamos a nadie
      setEstado(null);
    }
  }, [cacheKey]);

  useEffect(() => {
    const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
    if (sessionStorage.getItem(cacheKey()) === hoy) {
      setEstado(null); // ya cumplio hoy, no volvemos a preguntar
      return;
    }
    consultar();
  }, [cacheKey, consultar]);

  const marcarDescanso = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setEnviando(true);
    try {
      const res = await axios.post(
        `${API}/asistencia/dia-descanso`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data: EstadoDia = res.data;
      setEstado(data);
      if (data.puede_usar) sessionStorage.setItem(cacheKey(), data.fecha);
    } catch (e) {
      alert("No se pudo registrar. Revisa tu conexion e intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }, [cacheKey]);

  const bloqueado =
    !!estado &&
    estado.aplica_candado &&
    !estado.puede_usar &&
    !RUTAS_LIBRES.includes(location.pathname);

  return (
    <>
      {children}
      {bloqueado && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 13000,
            background: "rgba(15,23,42,0.75)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "28px 24px",
              maxWidth: 380,
              width: "100%",
              textAlign: "center",
              boxShadow: "0 20px 45px rgba(0,0,0,0.35)",
            }}
          >
            <div style={{ fontSize: 44, marginBottom: 8 }}>🔒</div>
            <h2 style={{ margin: "0 0 10px", fontSize: 21, color: "#0f172a" }}>
              Primero registra tu asistencia
            </h2>
            <p style={{ margin: "0 0 22px", fontSize: 15, color: "#475569", lineHeight: 1.5 }}>
              Para poder usar el sistema tienes que hacer tu <b>CHECK-IN</b>.
              Si hoy es tu dia de descanso, marcalo abajo.
            </p>

            <button
              onClick={() => navigate(estado?.ruta_checkin || "/asistencia")}
              style={{
                width: "100%",
                padding: "14px 16px",
                marginBottom: 10,
                border: "none",
                borderRadius: 12,
                background: "#16a34a",
                color: "#fff",
                fontSize: 16,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              HACER CHECK-IN
            </button>

            <button
              onClick={marcarDescanso}
              disabled={enviando}
              style={{
                width: "100%",
                padding: "14px 16px",
                border: "2px solid #f97316",
                borderRadius: 12,
                background: "#fff",
                color: "#f97316",
                fontSize: 16,
                fontWeight: 700,
                cursor: enviando ? "wait" : "pointer",
                opacity: enviando ? 0.6 : 1,
              }}
            >
              {enviando ? "REGISTRANDO..." : "ES MI DIA DE DESCANSO"}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default CandadoAsistencia;
