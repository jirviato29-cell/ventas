import React, { useEffect, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import axios from "axios";

const API = "https://ato-appservidor-nvxt.onrender.com";
const token = () => localStorage.getItem("token") ?? "";
const authH = () => ({ Authorization: `Bearer ${token()}` });

const FONT = "Inter, system-ui, sans-serif";

interface DiaBES {
  fecha: string;
  apertura: boolean;
  cierre: boolean;
  hora_entrada: string | null;
  hora_salida: string | null;
  duracion_minutos: number | null;
  cumple: boolean | null;
}

interface SemanaBESData {
  dias: DiaBES[];
  hoy: string;
}

const DIAS_NOMBRE = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const nombreDia = (fechaISO: string) => {
  const [y, m, d] = fechaISO.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DIAS_NOMBRE[dt.getDay()]} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
};

// Solo fecha "DD/MM" reutilizando el helper existente (parte tras el espacio).
const soloFecha = (iso: string) => nombreDia(iso).split(" ")[1];

interface Props {
  /** Cambia el valor para forzar una recarga desde el padre. */
  recargar?: number;
}

export default function SemanaBES({ recargar = 0 }: Props) {
  const [data, setData] = useState<SemanaBESData | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vivo = true;
    const cargar = async () => {
      try {
        const r = await axios.get<SemanaBESData>(`${API}/capturas-telcel/mi-semana`, {
          headers: authH(),
        });
        if (vivo) setData(r.data);
      } catch {
        if (vivo) setData(null);
      } finally {
        if (vivo) setCargando(false);
      }
    };
    cargar();
    return () => { vivo = false; };
  }, [recargar]);

  // Constantes de presentacion (solo nombran numeros antes hardcodeados en texto).
  const BONO = 100;
  const META = 6;

  const diasCumplidos = data
    ? data.dias.filter((d) => d.cumple === true).length
    : 0;
  const faltan = Math.max(0, META - diasCumplidos);
  const avancePct = Math.min(100, (diasCumplidos / META) * 100);

  const rango =
    data && data.dias.length > 0
      ? `${soloFecha(data.dias[0].fecha)} – ${soloFecha(data.dias[data.dias.length - 1].fecha)}`
      : "";

  return (
    <Box sx={{ border: "1px solid #e2e8f0", borderRadius: "14px", overflow: "hidden", bgcolor: "#fff", fontFamily: FONT }}>
      {/* ── Header ── */}
      <Box
        sx={{
          px: "16px",
          py: "13px",
          borderBottom: "1px solid #eef2f7",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <AccessTimeIcon sx={{ fontSize: 18, color: "#64748b" }} />
          <Typography sx={{ fontFamily: FONT, fontSize: 13.5, fontWeight: 800, color: "#0f172a" }}>
            Mi semana BES
          </Typography>
        </Box>
        {rango && (
          <Typography sx={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: "#94a3b8", fontVariantNumeric: "tabular-nums" }}>
            {rango}
          </Typography>
        )}
      </Box>

      {cargando ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : !data ? (
        <Box sx={{ py: 4, textAlign: "center", color: "#94a3b8", fontSize: 13, fontFamily: FONT }}>
          No se pudo cargar.
        </Box>
      ) : (
        <>
          {/* ── Barra de avance hacia el bono ── */}
          <Box
            sx={{
              m: "10px 16px",
              p: "11px 14px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #1e2a4a, #16213e)",
              color: "#fff",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: "9px" }}>
              <Typography sx={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: "#FFB27A", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Avance hacia el bono
              </Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: "#cbd5e1", whiteSpace: "nowrap" }}>
                <Box component="b" sx={{ fontSize: 20, fontWeight: 900, color: "#fff", fontVariantNumeric: "tabular-nums" }}>
                  {diasCumplidos}
                </Box>{" "}
                / {META} días
              </Typography>
            </Box>

            <Box sx={{ height: 10, borderRadius: "999px", background: "rgba(255,255,255,.14)", overflow: "hidden" }}>
              <Box sx={{ height: "100%", borderRadius: "999px", width: `${avancePct}%`, background: "linear-gradient(90deg,#34D399,#10B981)" }} />
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: "9px", fontSize: 11.5 }}>
              <Typography sx={{ fontFamily: FONT, fontSize: 11.5, color: "#cbd5e1" }}>
                Te {faltan === 1 ? "falta" : "faltan"}{" "}
                <Box component="b" sx={{ color: "#fff", fontWeight: 800 }}>
                  {faltan} {faltan === 1 ? "día" : "días"}
                </Box>{" "}
                con 6 hrs+
              </Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: 11.5, fontWeight: 800, color: "#34D399", fontVariantNumeric: "tabular-nums" }}>
                Bono ${BONO}
              </Typography>
            </Box>
          </Box>

          {/* ── Lista de días ── */}
          <Box sx={{ p: "2px 16px 10px" }}>
            {data.dias.map((d) => {
              const esHoy = d.fecha === data.hoy;
              const esFuturo = d.fecha > data.hoy;
              const tieneDatos = d.hora_entrada != null || d.hora_salida != null;
              // Si todavia no subio la captura BES de hoy se le recuerda,
              // aunque el dia ya tenga datos capturados en ZEliCheck.
              const algo = d.apertura || d.cierre;
              // HOY manda sobre todo. Despues manda cumple, no el origen del
              // dato: un dia capturado a mano vale igual que uno con foto.
              // cumple null CON datos = entrada sin salida en dia pasado,
              // o sea un dia perdido, va en rojo.
              const estado: "today" | "pending" | "ok" | "bad" =
                  esHoy                ? "today"
                : esFuturo             ? "pending"
                : d.cumple === true    ? "ok"
                : d.cumple === false   ? "bad"
                : tieneDatos           ? "bad"
                :                        "pending";

              const rowBg =
                estado === "ok" ? "#f0fdf6" : estado === "bad" ? "#fef5f5" : estado === "today" ? "#fff7ed" : "transparent";
              const rowBorder =
                estado === "ok" ? "#bbf7d0" : estado === "bad" ? "#fecaca" : estado === "today" ? "#fed7aa" : "transparent";
              const ckBg =
                estado === "ok" ? "#16a34a" : estado === "bad" ? "#dc2626" : estado === "today" ? "#FF6600" : "#e2e8f0";
              const hrsColor =
                estado === "ok" ? "#16a34a" : estado === "bad" ? "#dc2626" : estado === "today" ? "#0f172a" : "#cbd5e1";
              const dnameColor = estado === "pending" ? "#64748b" : "#0f172a";

              return (
                <Box
                  key={d.fecha}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "26px 1fr auto auto auto",
                    alignItems: "center",
                    gap: "10px",
                    p: "4px 10px",
                    borderRadius: "10px",
                    border: "1px solid",
                    bgcolor: rowBg,
                    borderColor: rowBorder,
                    boxShadow: estado === "today" ? "inset 0 0 0 1px #fdba74" : "none",
                    mt: "2px",
                  }}
                >
                  {/* check */}
                  <Box sx={{ width: 22, height: 22, borderRadius: "7px", display: "grid", placeItems: "center", bgcolor: ckBg }}>
                    {estado === "ok" && <CheckIcon sx={{ fontSize: 14, color: "#fff" }} />}
                    {estado === "bad" && <CloseIcon sx={{ fontSize: 14, color: "#fff" }} />}
                    {estado === "today" && <PriorityHighIcon sx={{ fontSize: 14, color: "#fff" }} />}
                    {estado === "pending" && <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "#94a3b8" }} />}
                  </Box>

                  {/* día */}
                  <Box sx={{ minWidth: 0 }}>
                    <Typography component="span" sx={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: dnameColor }}>
                      {nombreDia(d.fecha)}
                      {estado === "today" && (
                        <Box
                          component="span"
                          sx={{ fontFamily: FONT, fontSize: 8, fontWeight: 900, color: "#fff", bgcolor: "#FF6600", px: "5px", py: "1px", borderRadius: "999px", letterSpacing: "0.5px", ml: "6px", verticalAlign: "middle" }}
                        >
                          HOY
                        </Box>
                      )}
                    </Typography>
                    {estado === "today" && !algo && (
                      <Typography sx={{ fontFamily: FONT, display: "block", fontSize: 10, fontWeight: 600, color: "#94a3b8" }}>
                        Falta tu captura BES
                      </Typography>
                    )}
                  </Box>

                  {/* entrada */}
                  <Box sx={{ textAlign: "center", minWidth: 52 }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: 8.5, fontWeight: 700, color: "#b6bfca", letterSpacing: "0.4px", textTransform: "uppercase" }}>
                      Entrada
                    </Typography>
                    <Typography sx={{ fontFamily: FONT, fontSize: 11.5, color: "#475569", fontVariantNumeric: "tabular-nums" }}>
                      {d.hora_entrada || "—"}
                    </Typography>
                  </Box>

                  {/* salida */}
                  <Box sx={{ textAlign: "center", minWidth: 52 }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: 8.5, fontWeight: 700, color: "#b6bfca", letterSpacing: "0.4px", textTransform: "uppercase" }}>
                      Salida
                    </Typography>
                    <Typography sx={{ fontFamily: FONT, fontSize: 11.5, color: "#475569", fontVariantNumeric: "tabular-nums" }}>
                      {d.hora_salida || "—"}
                    </Typography>
                  </Box>

                  {/* horas */}
                  <Typography sx={{ fontFamily: FONT, fontSize: 13, fontWeight: 800, fontVariantNumeric: "tabular-nums", minWidth: 46, textAlign: "right", color: hrsColor }}>
                    {d.duracion_minutos != null ? (d.duracion_minutos / 60).toFixed(2) : "—"}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </>
      )}
    </Box>
  );
}
