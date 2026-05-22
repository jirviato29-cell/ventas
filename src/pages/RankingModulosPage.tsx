import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import axios from "axios";
import { obtenerRolDesdeToken } from "../components/Token";

const API = process.env.REACT_APP_API_URL ?? "";
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` });

const COLOR_MIO = "#BA7517";
const COLOR_RESTO = "#F5A623";

interface RankingRow {
  posicion: number;
  codigo_modulo: string;
  promedio_venta_accesorios: number;
  total_accesorios: number;
  contado: number;
  payjoy: number;
  paguitos: number;
  tel_payjoy: number;
  total_tels: number;
  chips: number;
  planes: number;
  productividad: number;
}

const RankingModulosPage: React.FC = () => {
  const navigate = useNavigate();
  const rolToken = obtenerRolDesdeToken();
  const miModulo = localStorage.getItem("modulo") ?? "";
  const moduloNombre = localStorage.getItem("modulo") ?? "";

  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get<RankingRow[]>(`${API}/estadisticas/ranking-modulos`, { headers: authH() })
      .then((res) => setRanking(res.data))
      .catch(() => setError("Error al cargar el ranking. Verifica tu conexión."))
      .finally(() => setLoading(false));
  }, []);

  // Bloqueo Cadenas Comerciales y roles sin acceso — después de hooks
  if (moduloNombre === "Cadenas Comerciales") {
    navigate("/ventas", { replace: true });
    return null;
  }
  if (rolToken && !["asesor", "encargado", "admin", "direccion"].includes(rolToken)) {
    navigate("/ventas", { replace: true });
    return null;
  }

  if (loading) {
    return (
      <Box textAlign="center" py={10}>
        <CircularProgress sx={{ color: "#f97316" }} size={48} />
        <Typography mt={2} color="text.secondary">
          Cargando ranking...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" textAlign="center" mt={6} fontSize={15}>
        {error}
      </Typography>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" fontWeight={800} mb={3}>
        📊 Estadísticas — Ranking de módulos
      </Typography>

      {/* Gráfica de productividad */}
      <Paper
        elevation={0}
        sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 2, border: "1px solid #e2e8f0", mb: 3 }}
      >
        <Typography variant="subtitle1" fontWeight={700} mb={2}>
          Productividad del módulo (mes en curso)
        </Typography>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={ranking} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <XAxis dataKey="codigo_modulo" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [`${v}%`, "Productividad"]} />
            <Bar dataKey="productividad" radius={[4, 4, 0, 0]}>
              {ranking.map((entry) => (
                <Cell
                  key={entry.codigo_modulo}
                  fill={entry.codigo_modulo === miModulo ? COLOR_MIO : COLOR_RESTO}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      {/* Tabla ranking */}
      <Paper
        elevation={0}
        sx={{ borderRadius: 2, border: "1px solid #e2e8f0", overflow: "hidden" }}
      >
        <Box px={2} py={1.5} borderBottom="1px solid #e2e8f0">
          <Typography variant="subtitle1" fontWeight={700}>
            Ranking de módulos
          </Typography>
        </Box>
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 780 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "#f8fafc" }}>
                {[
                  ["#", "center"],
                  ["Módulo", "left"],
                  ["Prom. Acc. $", "right"],
                  ["Total Acc.", "center"],
                  ["Contado", "center"],
                  ["Payjoy", "center"],
                  ["Paguitos", "center"],
                  ["Tel. Payjoy", "center"],
                  ["Total Tels", "center"],
                  ["Chips", "center"],
                  ["Planes", "center"],
                  ["Productividad", "right"],
                ].map(([label, align]) => (
                  <TableCell
                    key={label}
                    align={align as "center" | "left" | "right"}
                    sx={{ fontWeight: 700, color: "#FF6600", fontSize: 11, whiteSpace: "nowrap", py: 1 }}
                  >
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {ranking.map((row) => {
                const esMio = row.codigo_modulo === miModulo;
                return (
                  <TableRow
                    key={row.codigo_modulo}
                    sx={
                      esMio
                        ? { bgcolor: "#fff7ed", borderLeft: "4px solid #f97316" }
                        : { borderTop: "1px solid #f1f5f9" }
                    }
                  >
                    <TableCell align="center" sx={{ fontWeight: esMio ? 800 : 400, fontSize: 12 }}>
                      {row.posicion}
                    </TableCell>
                    <TableCell sx={{ fontWeight: esMio ? 800 : 600, fontSize: 13, whiteSpace: "nowrap" }}>
                      {row.codigo_modulo}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: 12 }}>
                      ${row.promedio_venta_accesorios.toFixed(2)}
                    </TableCell>
                    <TableCell align="center" sx={{ fontSize: 12 }}>
                      {row.total_accesorios}
                    </TableCell>
                    <TableCell align="center" sx={{ fontSize: 12, color: "#22c55e" }}>
                      {row.contado}
                    </TableCell>
                    <TableCell align="center" sx={{ fontSize: 12, color: "#f97316" }}>
                      {row.payjoy}
                    </TableCell>
                    <TableCell align="center" sx={{ fontSize: 12, color: "#3b82f6" }}>
                      {row.paguitos}
                    </TableCell>
                    <TableCell align="center" sx={{ fontSize: 12, color: "#f97316" }}>
                      {row.tel_payjoy}
                    </TableCell>
                    <TableCell align="center" sx={{ fontSize: 12 }}>
                      {row.total_tels}
                    </TableCell>
                    <TableCell align="center" sx={{ fontSize: 12 }}>
                      {row.chips}
                    </TableCell>
                    <TableCell align="center" sx={{ fontSize: 12 }}>
                      {row.planes}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: row.productividad >= 100 ? "#22c55e" : row.productividad >= 70 ? "#f97316" : "#ef4444",
                      }}
                    >
                      {row.productividad.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                );
              })}
              {ranking.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} sx={{ textAlign: "center", color: "#94a3b8", py: 3 }}>
                    Sin datos para el mes actual
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Paper>
    </Box>
  );
};

export default RankingModulosPage;
