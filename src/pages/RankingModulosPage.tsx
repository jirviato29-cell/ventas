import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import ArticleIcon from "@mui/icons-material/Article";
import InsertChartIcon from "@mui/icons-material/InsertChart";
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

interface ColSpec {
  label: string;
  width: string;
  align?: "left" | "center" | "right";
  render: (row: RankingRow, pos: number) => React.ReactNode;
}

interface TablaProps {
  data: RankingRow[];
  cols: ColSpec[];
  miModulo: string;
  headerBg: string;
  headerColor: string;
  icon: React.ReactNode;
  title: string;
}

const PAGE_STYLES = `
  .dash-grid {
    display: grid;
    grid-template-columns: 1.4fr 1fr 0.7fr 0.7fr;
    gap: 12px;
  }
  @media (max-width: 1023px) {
    .dash-grid { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 640px) {
    .dash-grid { grid-template-columns: 1fr; }
  }
  .rank-card {
    background: white;
    border: 0.5px solid #e5e7eb;
    border-radius: 12px;
    overflow: hidden;
  }
  .rank-card-header {
    padding: 9px 12px;
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .rank-table {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
    font-size: 10.5px;
  }
  .rank-table th {
    font-size: 9.5px;
    text-transform: uppercase;
    padding: 5px 4px;
    text-align: center;
    font-weight: 600;
    color: #6b7280;
    border-top: 0.5px solid #e5e7eb;
  }
  .rank-table td {
    padding: 4px;
    text-align: center;
    border-top: 0.5px solid #e5e7eb;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .rank-table tbody tr:nth-child(odd) td {
    background: rgba(0, 0, 0, 0.015);
  }
  .rank-row-mine td {
    background: #faeeda !important;
    color: #633806;
    font-weight: 500;
  }
  .rank-row-mine td:first-child {
    border-left: 3px solid #ba7517;
    padding-left: 1px;
  }
  .medal {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    color: white;
    font-size: 9px;
    font-weight: 700;
    line-height: 16px;
  }
  .medal-1 { background: #ba7517; }
  .medal-2 { background: #888780; }
  .medal-3 { background: #c0805a; }
`;

const Pos: React.FC<{ n: number }> = ({ n }) =>
  n <= 3 ? (
    <span className={`medal medal-${n}`}>{n}</span>
  ) : (
    <span style={{ color: "#9ca3af", fontSize: 9.5 }}>{n}</span>
  );

const Pct: React.FC<{ v: number }> = ({ v }) => (
  <span
    style={{
      fontWeight: 500,
      color: v >= 100 ? "#3b6d11" : v >= 90 ? "#ba7517" : "#a32d2d",
    }}
  >
    {v.toFixed(1)}%
  </span>
);

const TablaRanking: React.FC<TablaProps> = ({
  data,
  cols,
  miModulo,
  headerBg,
  headerColor,
  icon,
  title,
}) => (
  <div className="rank-card">
    <div className="rank-card-header" style={{ background: headerBg }}>
      <span style={{ color: headerColor, display: "flex", alignItems: "center", flexShrink: 0 }}>
        {icon}
      </span>
      <span
        style={{
          color: headerColor,
          fontWeight: 500,
          fontSize: 11.5,
          letterSpacing: 0.1,
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </span>
    </div>
    <table className="rank-table">
      <colgroup>
        {cols.map((c, i) => (
          <col key={i} style={{ width: c.width }} />
        ))}
      </colgroup>
      <thead>
        <tr>
          {cols.map((c) => (
            <th key={c.label} style={{ textAlign: c.align ?? "center" }}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => {
          const esMio = row.codigo_modulo === miModulo;
          const pos = idx + 1;
          return (
            <tr key={row.codigo_modulo} className={esMio ? "rank-row-mine" : ""}>
              {cols.map((c, ci) => (
                <td key={ci} style={{ textAlign: c.align ?? "center" }}>
                  {c.render(row, pos)}
                </td>
              ))}
            </tr>
          );
        })}
        {data.length === 0 && (
          <tr>
            <td
              colSpan={cols.length}
              style={{ textAlign: "center", color: "#94a3b8", padding: "12px 4px", fontSize: 11 }}
            >
              Sin datos
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const RankingModulosPage: React.FC = () => {
  const navigate = useNavigate();
  const rolToken = obtenerRolDesdeToken();
  const miModulo = localStorage.getItem("modulo") ?? "";

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

  // Conditional redirects — all hooks already declared above
  if (miModulo === "Cadenas Comerciales") {
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

  const rankProductividad = [...ranking].sort((a, b) => b.productividad - a.productividad);
  const rankAccesorios = [...ranking].sort(
    (a, b) => b.promedio_venta_accesorios - a.promedio_venta_accesorios
  );
  const rankTelefonos = [...ranking].sort((a, b) => b.total_tels - a.total_tels);
  const rankPlanes = [...ranking].sort((a, b) => b.planes - a.planes);

  const colsProductividad: ColSpec[] = [
    { label: "#", width: "14%", render: (_, pos) => <Pos n={pos} /> },
    { label: "Mód.", width: "18%", align: "left", render: (r) => r.codigo_modulo },
    { label: "Acc.", width: "17%", render: (r) => r.total_accesorios },
    { label: "Tels", width: "16%", render: (r) => r.total_tels },
    { label: "Pl.", width: "14%", render: (r) => r.planes },
    {
      label: "%",
      width: "21%",
      align: "right",
      render: (r) => <Pct v={r.productividad} />,
    },
  ];

  const colsAccesorios: ColSpec[] = [
    { label: "#", width: "18%", render: (_, pos) => <Pos n={pos} /> },
    { label: "Mód.", width: "25%", align: "left", render: (r) => r.codigo_modulo },
    {
      label: "Prom. $",
      width: "35%",
      align: "right",
      render: (r) => `$${Math.round(r.promedio_venta_accesorios).toLocaleString()}`,
    },
    { label: "Total", width: "22%", render: (r) => r.total_accesorios },
  ];

  const colsTelefonos: ColSpec[] = [
    { label: "#", width: "26%", render: (_, pos) => <Pos n={pos} /> },
    { label: "Mód.", width: "38%", align: "left", render: (r) => r.codigo_modulo },
    {
      label: "Total",
      width: "36%",
      render: (r) => <span style={{ fontWeight: 500 }}>{r.total_tels}</span>,
    },
  ];

  const colsPlanes: ColSpec[] = [
    { label: "#", width: "26%", render: (_, pos) => <Pos n={pos} /> },
    { label: "Mód.", width: "38%", align: "left", render: (r) => r.codigo_modulo },
    {
      label: "Pl.",
      width: "36%",
      render: (r) => (
        <span style={{ fontWeight: r.planes >= 1 ? 500 : 400 }}>{r.planes}</span>
      ),
    },
  ];

  return (
    <>
      <style>{PAGE_STYLES}</style>
      <Box sx={{ maxWidth: 1300, mx: "auto", p: { xs: 1.5, md: 2.5 } }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 2.5 }}>
          <InsertChartIcon sx={{ color: "#6b7280", fontSize: 20 }} />
          <Typography fontSize={18} fontWeight={500}>
            Estadísticas
          </Typography>
          <Box
            sx={{
              ml: "auto",
              fontSize: 12,
              bgcolor: "#f3f4f6",
              px: 1.25,
              py: 0.5,
              borderRadius: 1.5,
              color: "#4b5563",
            }}
          >
            Tu módulo:{" "}
            <strong style={{ fontWeight: 500, color: "#92400e" }}>{miModulo}</strong>
          </Box>
        </Box>

        {/* 4-table grid */}
        <div className="dash-grid" style={{ marginBottom: 14 }}>
          <TablaRanking
            data={rankProductividad}
            cols={colsProductividad}
            miModulo={miModulo}
            headerBg="#eaf3de"
            headerColor="#3b6d11"
            icon={<TrendingUpIcon style={{ fontSize: 14 }} />}
            title="Productividad"
          />
          <TablaRanking
            data={rankAccesorios}
            cols={colsAccesorios}
            miModulo={miModulo}
            headerBg="#faeeda"
            headerColor="#854f0b"
            icon={<ShoppingBagIcon style={{ fontSize: 14 }} />}
            title="Accesorios"
          />
          <TablaRanking
            data={rankTelefonos}
            cols={colsTelefonos}
            miModulo={miModulo}
            headerBg="#e6f1fb"
            headerColor="#185fa5"
            icon={<SmartphoneIcon style={{ fontSize: 14 }} />}
            title="Teléfonos"
          />
          <TablaRanking
            data={rankPlanes}
            cols={colsPlanes}
            miModulo={miModulo}
            headerBg="#eeedfe"
            headerColor="#3c3489"
            icon={<ArticleIcon style={{ fontSize: 14 }} />}
            title="Planes"
          />
        </div>

        {/* Chart */}
        <Box
          sx={{
            background: "white",
            border: "0.5px solid #e5e7eb",
            borderRadius: "12px",
            p: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5, mb: 1.5 }}>
            <Typography fontWeight={600} fontSize={12.5}>
              Productividad del módulo
            </Typography>
            <Typography fontSize={10.5} color="#9ca3af" sx={{ ml: "auto" }}>
              % vs histórico ajustado +3%
            </Typography>
          </Box>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={rankProductividad}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <XAxis dataKey="codigo_modulo" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, "Productividad"]} />
              <Bar dataKey="productividad" radius={[4, 4, 0, 0]}>
                {rankProductividad.map((entry) => {
                  let fill: string;
                  if (entry.codigo_modulo === miModulo) fill = "#ba7517";
                  else if (entry.productividad >= 100) fill = "#97c459";
                  else if (entry.productividad >= 90) fill = "#ef9f27";
                  else fill = "#e24b4a";
                  return <Cell key={entry.codigo_modulo} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Box>
    </>
  );
};

export default RankingModulosPage;
