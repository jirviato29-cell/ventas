import React, { useEffect, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import axios from "axios";

const API = "https://ato-appservidor-nvxt.onrender.com";

const FONT = "Inter, system-ui, sans-serif";

interface SemanaPasada {
  username: string;
  semana_inicio: string;
  semana_fin: string;
  dias_cumplidos: number;
  bono: boolean;
  multa: number;
  dias_detalle?: { fecha: string; cumple: boolean }[];
}

const fmtFecha = (iso: string) => {
  const [, m, d] = iso.split("-").map(Number);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
};

const DIAS_NOMBRE = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// Parseo manual (split por "-") para evitar bugs de zona horaria con new Date(string).
const nombreDiaCorto = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DIAS_NOMBRE[dt.getDay()]} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
};

export default function MiSemanaPasada() {
  const token = localStorage.getItem("token");
  const [data, setData] = useState<SemanaPasada | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const r = await axios.get<SemanaPasada | null>(`${API}/checkin/mi-semana-pasada`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(r.data);
      } catch {
        setData(null);
      } finally {
        setCargando(false);
      }
    };
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (cargando) {
    return (
      <Box sx={{ border: "1px solid #e2e8f0", borderRadius: "14px", p: 3, textAlign: "center", bgcolor: "#fff" }}>
        <CircularProgress size={22} />
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ border: "1px solid #e2e8f0", borderRadius: "14px", p: 3, textAlign: "center", color: "#94a3b8", fontSize: 13, bgcolor: "#fff", fontFamily: FONT }}>
        Aún no hay semana cerrada.
      </Box>
    );
  }

  const gano = data.bono;
  const diasFaltantes = Math.max(0, 6 - data.dias_cumplidos);

  // Derivados SOLO de presentación (no recalculan reglas de negocio).
  const bonoGanado = data.bono ? 100 : 0;
  const anguloVerde = (data.dias_cumplidos / 6) * 360;

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
          <CalendarMonthIcon sx={{ fontSize: 18, color: "#64748b" }} />
          <Typography sx={{ fontFamily: FONT, fontSize: 13.5, fontWeight: 800, color: "#0f172a" }}>
            Semana pasada
          </Typography>
        </Box>
        <Typography sx={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: "#94a3b8", fontVariantNumeric: "tabular-nums" }}>
          {fmtFecha(data.semana_inicio)} – {fmtFecha(data.semana_fin)}
        </Typography>
      </Box>

      {/* ── Anillo de progreso ── */}
      <Box sx={{ px: "16px", pt: "16px", pb: "10px" }}>
        <Box
          sx={{
            width: 132,
            height: 132,
            borderRadius: "50%",
            mx: "auto",
            display: "grid",
            placeItems: "center",
            background: `conic-gradient(#FF6600 0deg ${anguloVerde}deg, #16213e ${anguloVerde}deg 360deg)`,
          }}
        >
          <Box
            sx={{
              width: 104,
              height: 104,
              borderRadius: "50%",
              bgcolor: "#fff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography sx={{ fontFamily: FONT, fontSize: 32, fontWeight: 800, lineHeight: 1, color: data.dias_cumplidos >= 6 ? "#16a34a" : "#dc2626", fontVariantNumeric: "tabular-nums" }}>
              {data.dias_cumplidos}<Box component="span" sx={{ color: "#cbd5e1" }}>/</Box>6
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: 8.5, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.5px", textTransform: "uppercase", mt: "1px" }}>
              Días cumplidos
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ── Chips de días ── */}
      {data.dias_detalle && data.dias_detalle.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center", px: "16px", pb: "14px" }}>
          {data.dias_detalle.map((d) => {
            const [dia, fecha] = nombreDiaCorto(d.fecha).split(" ");
            return (
              <Box
                key={d.fecha}
                sx={{
                  display: "inline-flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "2px",
                  py: "7px",
                  width: 56,
                  borderRadius: "10px",
                  border: "1px solid",
                  bgcolor: d.cumple ? "#eef1f8" : "#fff3ea",
                  borderColor: d.cumple ? "#c7cfe6" : "#ffd0aa",
                  color: d.cumple ? "#16213e" : "#FF6600",
                }}
              >
                <Typography sx={{ fontFamily: FONT, fontSize: 9, fontWeight: 700, letterSpacing: "0.3px", textTransform: "uppercase", color: "inherit" }}>
                  {dia}
                </Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: 11, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "inherit" }}>
                  {fecha}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}

      {/* ── Alerta de resultado ── */}
      <Box sx={{ mx: "16px", mb: "16px" }}>
        {gano ? (
          <Box
            sx={{
              p: "13px 14px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "flex-start",
              gap: "11px",
              bgcolor: "#f0fdf6",
              border: "1px solid #bbf7d0",
            }}
          >
            <Box sx={{ width: 32, height: 32, borderRadius: "9px", display: "grid", placeItems: "center", bgcolor: "#dcfce7", flex: "0 0 auto" }}>
              <EmojiEventsIcon sx={{ fontSize: 18, color: "#15803d" }} />
            </Box>
            <Box>
              <Typography sx={{ fontFamily: FONT, fontSize: 13, fontWeight: 800, lineHeight: 1.2, color: "#15803d" }}>
                ¡Bono conseguido!
              </Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: 11.5, lineHeight: 1.35, mt: "3px", color: "#3f7d57" }}>
                Cumpliste los 6 días y ganaste el bono de $100. ¡Sigue así!
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              p: "13px 14px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "flex-start",
              gap: "11px",
              bgcolor: "#fef5f5",
              border: "1px solid #fecaca",
            }}
          >
            <Box sx={{ width: 32, height: 32, borderRadius: "9px", display: "grid", placeItems: "center", bgcolor: "#fee2e2", flex: "0 0 auto" }}>
              <WarningAmberIcon sx={{ fontSize: 18, color: "#b91c1c" }} />
            </Box>
            <Box>
              <Typography sx={{ fontFamily: FONT, fontSize: 13, fontWeight: 800, lineHeight: 1.2, color: "#b91c1c" }}>
                No alcanzaste el bono
              </Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: 11.5, lineHeight: 1.35, mt: "3px", color: "#9f5b60" }}>
                Te {diasFaltantes === 1 ? "faltó" : "faltaron"}{" "}
                <Box component="b" sx={{ fontWeight: 800 }}>
                  {diasFaltantes} {diasFaltantes === 1 ? "día" : "días"}
                </Box>{" "}
                para el bono. ¡Esta semana recupérate y consíguelo!
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* ── Bono ganado ── */}
      <Box sx={{ mx: "16px", mb: "16px", display: "grid", gridTemplateColumns: "1fr", gap: "8px" }}>
        <Box sx={{ border: "1px solid #eef2f7", borderRadius: "11px", p: "10px 12px" }}>
          <Typography sx={{ fontFamily: FONT, fontSize: 9.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px" }}>
            Bono ganado
          </Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: 16, fontWeight: 900, fontVariantNumeric: "tabular-nums", mt: "2px", color: bonoGanado > 0 ? "#16a34a" : "#94a3b8" }}>
            ${bonoGanado}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
