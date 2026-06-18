import React, { useEffect, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import axios from "axios";

const API = "https://ato-appservidor-nvxt.onrender.com";

interface Registro {
  entrada: string | null;
  salida: string | null;
  horas: number | null;
  cumple: boolean | null;
}

interface SemanaData {
  registros: Record<string, Record<string, Registro>>;
  dias: string[];
  hoy: string;
}

const DIAS_NOMBRE = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const nombreDia = (fechaISO: string) => {
  const [y, m, d] = fechaISO.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DIAS_NOMBRE[dt.getDay()]} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
};

export default function MiCheckinSemana() {
  const token = localStorage.getItem("token");
  const usuario = localStorage.getItem("usuario") || "";
  const [data, setData] = useState<SemanaData | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const r = await axios.get<SemanaData>(`${API}/checkin/registros/semana`, {
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

  const diasCumplidos = data ? data.dias.reduce((acc, dia) => {
    const reg = (data.registros[dia] || {})[usuario];
    return acc + (reg?.cumple === true ? 1 : 0);
  }, 0) : 0;
  const faltan = Math.max(0, 6 - diasCumplidos);

  const celdaSx = {
    py: "8px", px: "10px", fontSize: 13, border: "1px solid #e2e8f0",
  };

  return (
    <Box sx={{ border: "1px solid #e2e8f0", borderRadius: "14px", overflow: "hidden", bgcolor: "#fff" }}>
      <Box sx={{ px: "16px", py: "12px", borderBottom: "1px solid #eef2f7", bgcolor: "#0D2B6B" }}>
        <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "0.4px" }}>
          MI CHECK IN — SEMANA
        </Typography>
      </Box>

      {!cargando && data && (
        <Box sx={{ px: "16px", py: "10px", borderBottom: "1px solid #eef2f7", display: "flex", alignItems: "center", justifyContent: "space-between", bgcolor: diasCumplidos >= 6 ? "#ecfdf5" : "#fffbeb" }}>
          <Typography sx={{ fontSize: 14, fontWeight: 800, color: diasCumplidos >= 6 ? "#047857" : "#92400e" }}>
            Llevas {diasCumplidos} de 6
          </Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: diasCumplidos >= 6 ? "#047857" : "#b45309" }}>
            {diasCumplidos >= 6 ? "¡Bono asegurado! 🎉" : `Te ${faltan === 1 ? "falta" : "faltan"} ${faltan}`}
          </Typography>
        </Box>
      )}

      {cargando ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : !data ? (
        <Box sx={{ py: 4, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
          No se pudo cargar.
        </Box>
      ) : (
        <Box sx={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
                {["Día", "Entrada", "Salida", "Horas"].map((h) => (
                  <th key={h} style={{ padding: "8px 10px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#64748b", textAlign: "left", border: "1px solid #e2e8f0" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.dias.map((dia) => {
                const reg = (data.registros[dia] || {})[usuario] || null;
                const cumple = reg?.cumple === true;
                const tieneSalida = reg?.salida != null;
                const esHoy = dia === data.hoy;
                let bg = "#fff";
                if (tieneSalida) bg = cumple ? "#ecfdf5" : "#fef2f2";
                const color = tieneSalida ? (cumple ? "#047857" : "#b91c1c") : "#334155";
                return (
                  <tr key={dia} style={{ background: bg }}>
                    <td style={{ ...celdaSx, fontWeight: 700, color }}>
                      {nombreDia(dia)}{esHoy ? " ·hoy" : ""}
                    </td>
                    <td style={{ ...celdaSx, color }}>{reg?.entrada || "—"}</td>
                    <td style={{ ...celdaSx, color }}>{reg?.salida || "—"}</td>
                    <td style={{ ...celdaSx, fontWeight: 700, color }}>
                      {reg?.horas != null ? `${reg.horas.toFixed(2)} h` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Box>
      )}

      <Box sx={{ px: "16px", py: "12px", borderTop: "1px solid #eef2f7", fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: "3px", bgcolor: "#ecfdf5", border: "1px solid #047857" }} />
          <span><b>Verde:</b> cumplió 6 horas o más</span>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: "3px", bgcolor: "#fef2f2", border: "1px solid #b91c1c" }} />
          <span><b>Rojo:</b> no cumplió las 6 horas</span>
        </Box>
        <Box sx={{ pt: 1, borderTop: "1px dashed #e2e8f0" }}>
          <div><b>Bono $100:</b> se gana cumpliendo los 6 días (cada uno con 6 horas o más).</div>
          <div style={{ color: "#b91c1c", marginTop: 4 }}><b>Multa $458</b> por cada día no cumplido (por falta o por no completar las 6 horas).</div>
        </Box>
      </Box>
    </Box>
  );
}
