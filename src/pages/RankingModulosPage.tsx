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
const GOLD_BG = "#fff7ed";
const GOLD_BORDER = "3px solid #BA7517";
const HDR_COLOR = "#BA7517";
const HDR_SX = { fontWeight: 700, color: HDR_COLOR, fontSize: 10.5, whiteSpace: "nowrap" as const, py: 0.75, px: 1 };
const CELL_SX = { fontSize: 11, py: 0.6, px: 1 };

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

interface ColDef {
  label: string;
  align?: "left" | "center" | "right";
  render: (row: RankingRow, pos: number) => React.ReactNode;
}

interface TablaRankingProps {
  title: string;
  data: RankingRow[];
  cols: ColDef[];
  miModulo: string;
}

const TablaRanking: React.FC<TablaRankingProps> = ({ title, data, cols, miModulo }) => (
  <Paper elevation={0} sx={{ borderRadius: 2, border: "1px solid #e2e8f0", overflow: "hidden", mb: 3 }}>
    <Box px={2} py={1.5} borderBottom="1px solid #e2e8f0">
      <Typography variant="subtitle2" fontWeight={700} fontSize={13}>
        {title}
      </Typography>
    </Box>
    <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
      <TableHead>
        <TableRow sx={{ bgcolor: "#f8fafc" }}>
          <TableCell align="center" sx={{ ...HDR_SX, width: 32 }}>#</TableCell>
          <TableCell align="left" sx={{ ...HDR_SX, width: 90 }}>Módulo</TableCell>
          {cols.map((c) => (
            <TableCell key={c.label} align={c.align ?? "center"} sx={HDR_SX}>
              {c.label}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {data.map((row, idx) => {
          const esMio = row.codigo_modulo === miModulo;
          return (
            <TableRow
              key={row.codigo_modulo}
              sx={esMio
                ? { bgcolor: GOLD_BG, borderLeft: GOLD_BORDER }
                : { borderTop: "1px solid #f1f5f9" }}
            >
              <TableCell align="center" sx={{ ...CELL_SX, fontWeight: esMio ? 800 : 400 }}>
                {idx + 1}
              </TableCell>
              <TableCell sx={{ ...CELL_SX, fontWeight: esMio ? 800 : 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {row.codigo_modulo}
              </TableCell>
              {cols.map((c) => (
                <TableCell key={c.label} align={c.align ?? "center"} sx={CELL_SX}>
                  {c.render(row, idx + 1)}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
        {data.length === 0 && (
          <TableRow>
            <TableCell colSpan={2 + cols.length} sx={{ textAlign: "center", color: "#94a3b8", py: 2, fontSize: 12 }}>
              Sin datos para el mes actual
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </Paper>
);

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

  const sort = (campo: keyof RankingRow) =>
    [...ranking].sort((a, b) => (b[campo] as number) - (a[campo] as number));

  const rankProductividad = sort("productividad");
  const rankAccesorios = sort("total_accesorios");
  const rankTelefonos = sort("total_tels");
  const rankPlanes = sort("planes");

  const colsProductividad: ColDef[] = [
    { label: "Total Acc.", render: (r) => r.total_accesorios },
    { label: "Total Tels", render: (r) => r.total_tels },
    { label: "Chips", render: (r) => r.chips },
    { label: "Planes", render: (r) => r.planes },
    {
      label: "Productividad",
      align: "right",
      render: (r) => (
        <span style={{ fontWeight: 700, color: r.productividad >= 100 ? "#22c55e" : r.productividad >= 70 ? "#f97316" : "#ef4444" }}>
          {r.productividad.toFixed(1)}%
        </span>
      ),
    },
  ];

  const colsAccesorios: ColDef[] = [
    { label: "Prom. Acc. $", align: "right", render: (r) => `$${r.promedio_venta_accesorios.toFixed(2)}` },
    { label: "Total Acc.", render: (r) => r.total_accesorios },
  ];

  const colsTelefonos: ColDef[] = [
    { label: "Total Tels", render: (r) => r.total_tels },
    { label: "Contado", render: (r) => <span style={{ color: "#22c55e" }}>{r.contado}</span> },
    { label: "Payjoy", render: (r) => <span style={{ color: "#f97316" }}>{r.payjoy}</span> },
    { label: "Paguitos", render: (r) => <span style={{ color: "#3b82f6" }}>{r.paguitos}</span> },
    { label: "Tel. Payjoy", render: (r) => <span style={{ color: "#f97316" }}>{r.tel_payjoy}</span> },
  ];

  const colsPlanes: ColDef[] = [
    { label: "Planes", render: (r) => r.planes },
  ];

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" fontWeight={800} mb={3}>
        Estadísticas — Ranking de módulos
      </Typography>

      {/* Gráfica de productividad */}
      <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 2, border: "1px solid #e2e8f0", mb: 3 }}>
        <Typography variant="subtitle2" fontWeight={700} mb={2} fontSize={13}>
          Productividad del módulo (mes en curso)
        </Typography>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={rankProductividad} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <XAxis dataKey="codigo_modulo" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => [`${v}%`, "Productividad"]} />
            <Bar dataKey="productividad" radius={[4, 4, 0, 0]}>
              {rankProductividad.map((entry) => (
                <Cell
                  key={entry.codigo_modulo}
                  fill={entry.codigo_modulo === miModulo ? COLOR_MIO : COLOR_RESTO}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      <TablaRanking
        title="Ranking por productividad"
        data={rankProductividad}
        cols={colsProductividad}
        miModulo={miModulo}
      />
      <TablaRanking
        title="Ranking por venta de accesorios"
        data={rankAccesorios}
        cols={colsAccesorios}
        miModulo={miModulo}
      />
      <TablaRanking
        title="Ranking por teléfonos"
        data={rankTelefonos}
        cols={colsTelefonos}
        miModulo={miModulo}
      />
      <TablaRanking
        title="Ranking por planes"
        data={rankPlanes}
        cols={colsPlanes}
        miModulo={miModulo}
      />
    </Box>
  );
};

export default RankingModulosPage;
