import React, { useEffect, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import axios from "axios";

const API = "https://ato-appservidor-nvxt.onrender.com";

interface SemanaPasada {
  username: string;
  semana_inicio: string;
  semana_fin: string;
  dias_cumplidos: number;
  bono: boolean;
  multa: number;
}

const fmtFecha = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
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
      <Box sx={{ border: "1px solid #e2e8f0", borderRadius: "14px", p: 3, textAlign: "center", color: "#94a3b8", fontSize: 13, bgcolor: "#fff" }}>
        Aún no hay semana cerrada.
      </Box>
    );
  }

  const gano = data.bono;
  const diasFaltantes = Math.max(0, 6 - data.dias_cumplidos);

  return (
    <Box sx={{ border: "1px solid #e2e8f0", borderRadius: "14px", overflow: "hidden", bgcolor: "#fff" }}>
      <Box sx={{ px: "16px", py: "12px", borderBottom: "1px solid #eef2f7", bgcolor: "#475569" }}>
        <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "0.4px" }}>
          SEMANA PASADA · {fmtFecha(data.semana_inicio)} al {fmtFecha(data.semana_fin)}
        </Typography>
      </Box>

      <Box sx={{ p: "16px" }}>
        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
          <Box sx={{ flex: 1, textAlign: "center", py: 1.5, borderRadius: "10px", bgcolor: "#f8fafc" }}>
            <Typography sx={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{data.dias_cumplidos}/6</Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Días cumplidos</Typography>
          </Box>
          <Box sx={{ flex: 1, textAlign: "center", py: 1.5, borderRadius: "10px", bgcolor: data.multa > 0 ? "#fef2f2" : "#f8fafc" }}>
            <Typography sx={{ fontSize: 24, fontWeight: 800, color: data.multa > 0 ? "#b91c1c" : "#0f172a" }}>${data.multa}</Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Multa</Typography>
          </Box>
        </Box>

        {gano ? (
          <Box sx={{ p: 2, borderRadius: "10px", bgcolor: "#ecfdf5", border: "1px solid #047857" }}>
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: "#047857", mb: 0.5 }}>🎉 ¡Felicidades!</Typography>
            <Typography sx={{ fontSize: 13, color: "#065f46" }}>
              Cumpliste los 6 días y ganaste el bono de $100. ¡Sigue así!
            </Typography>
          </Box>
        ) : (
          <Box sx={{ p: 2, borderRadius: "10px", bgcolor: "#fef2f2", border: "1px solid #b91c1c" }}>
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: "#b91c1c", mb: 0.5 }}>No alcanzaste el bono</Typography>
            <Typography sx={{ fontSize: 13, color: "#7f1d1d" }}>
              Te {diasFaltantes === 1 ? "faltó" : "faltaron"} {diasFaltantes} {diasFaltantes === 1 ? "día" : "días"} para el bono. ¡Esta semana recupérate y consíguelo!
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
