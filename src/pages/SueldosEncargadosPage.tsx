import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import "dayjs/locale/es";
import axios from "axios";

const API = process.env.REACT_APP_API_URL ?? "";
const token = () => localStorage.getItem("token") ?? "";
const authH = () => ({ Authorization: `Bearer ${token()}` });

const MODULOS = [
  "M1", "M2", "VI", "MF", "AL", "DR", "HA", "VL",
  "R1", "GI", "PS", "WA", "SA", "Uni", "U2", "RO",
];

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ProductoResumen {
  nombre: string;
  tipo: string;
  cantidad: number;
  neto: number;
  porcentaje_label: string;
  comision: number;
}

interface SueldoResponse {
  modulo: string;
  fecha_inicio: string;
  fecha_fin: string;
  porcentaje_modulo: number;
  productos: ProductoResumen[];
  sueldo_total: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtMXN = (n: number) =>
  "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtPct = (label: string) => (label === "$10 fijo" ? "$10" : label);

/** Calcula el ciclo vigente (viernes→jueves) según la hora de Ciudad de México. */
function calcularCicloActual() {
  // Obtener la fecha actual en zona horaria Mexico City como "YYYY-MM-DD"
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
  }).format(new Date());

  // Parsear como fecha LOCAL (no UTC) para que .day() devuelva el día correcto.
  // dayjs("YYYY-MM-DD") interpreta la cadena como UTC midnight, lo que en CDT
  // (UTC-5) desplaza al día anterior. new Date(y, m-1, d) usa tiempo local.
  const [y, m, d] = todayStr.split("-").map(Number);
  const today = dayjs(new Date(y, m - 1, d));

  // day(): 0=dom 1=lun 2=mar 3=mié 4=jue 5=vie 6=sáb
  const daysBack = (today.day() - 5 + 7) % 7; // días desde el último viernes
  const inicio = today.subtract(daysBack, "day");
  const fin = inicio.add(6, "day");

  console.log(
    "[CICLO] hoy:", todayStr,
    "| day():", today.day(),
    "| daysBack:", daysBack,
    "| inicio:", inicio.format("YYYY-MM-DD"),
    "| fin:", fin.format("YYYY-MM-DD")
  );

  return {
    fechaInicioStr: inicio.format("YYYY-MM-DD"),
    fechaFinStr: fin.format("YYYY-MM-DD"),
    label: `${inicio.locale("es").format("D MMM")} → ${fin.locale("es").format("D MMM")}`,
  };
}

// ── Componente ────────────────────────────────────────────────────────────────

const SueldosEncargadosPage: React.FC = () => {
  const ciclo = useMemo(() => calcularCicloActual(), []);

  const [moduloSel, setModuloSel] = useState<string | null>(null);
  const [datos, setDatos] = useState<SueldoResponse | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarDatos = useCallback(
    async (modulo: string, inicio: string, fin: string) => {
      setCargando(true);
      setError(null);
      try {
        const { data } = await axios.get<SueldoResponse>(
          `${API}/sueldos/encargados?modulo=${encodeURIComponent(modulo)}&fecha_inicio=${inicio}&fecha_fin=${fin}`,
          { headers: authH() }
        );
        setDatos(data);
      } catch {
        setError("No se pudo cargar el sueldo. Verifica la conexión o el módulo seleccionado.");
        setDatos(null);
      } finally {
        setCargando(false);
      }
    },
    []
  );

  useEffect(() => {
    if (moduloSel) {
      cargarDatos(moduloSel, ciclo.fechaInicioStr, ciclo.fechaFinStr);
    } else {
      setDatos(null);
      setError(null);
    }
  }, [moduloSel, ciclo.fechaInicioStr, ciclo.fechaFinStr, cargarDatos]);

  return (
    <Box sx={{ p: 3, maxWidth: 960, mx: "auto" }}>
      <Typography variant="h5" fontWeight={700} color="#1e293b" mb={3}>
        Sueldos Encargados
      </Typography>

      {/* ── Filtros ─────────────────────────────────────────────────── */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        {/* Ciclo calculado automáticamente */}
        <Typography fontWeight={600} color="#f97316" fontSize={15} mb={2}>
          Ciclo actual:&nbsp;{ciclo.label}
        </Typography>

        {/* Botones de módulo */}
        <Box display="flex" flexWrap="wrap" gap={1}>
          {MODULOS.map((m) => {
            const activo = moduloSel === m;
            return (
              <Button
                key={m}
                size="small"
                variant={activo ? "contained" : "outlined"}
                onClick={() => setModuloSel(m)}
                sx={{
                  borderColor: "#f97316",
                  color: activo ? "#fff" : "#f97316",
                  bgcolor: activo ? "#f97316" : "transparent",
                  fontWeight: 700,
                  minWidth: 0,
                  px: 1.5,
                  "&:hover": {
                    bgcolor: activo ? "#ea6c00" : "rgba(249,115,22,0.08)",
                    borderColor: "#f97316",
                  },
                }}
              >
                {m}
              </Button>
            );
          })}
        </Box>
      </Paper>

      {/* ── Estados ─────────────────────────────────────────────────── */}
      {cargando && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress sx={{ color: "#f97316" }} />
        </Box>
      )}

      {!cargando && error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* ── Cuadro 1: Resumen de productos ──────────────────────────── */}
      {!cargando && datos && (
        <Box>
          {/* Sueldo total */}
          <Box
            display="flex"
            justifyContent="flex-end"
            alignItems="center"
            gap={2}
            mb={2}
            sx={{
              bgcolor: "#fff7ed",
              border: "1px solid #fed7aa",
              borderRadius: 2,
              px: 3,
              py: 1.5,
            }}
          >
            <Typography fontWeight={600} color="#9a3412" fontSize={15}>
              Sueldo del encargado
            </Typography>
            <Typography fontWeight={800} color="#ea580c" fontSize={22}>
              {fmtMXN(datos.sueldo_total)}
            </Typography>
          </Box>

          <Typography variant="h6" fontWeight={700} color="#1e293b" mb={1.5}>
            Resumen de productos — {datos.modulo}&nbsp;·&nbsp;
            <Box component="span" color="#64748b" fontWeight={400} fontSize={14}>
              {ciclo.label}
            </Box>
          </Typography>

          <TableContainer component={Paper} elevation={1} sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {["Producto", "Cantidad", "Neto", "%", "Comisión"].map((h) => (
                    <TableCell
                      key={h}
                      align={h === "Producto" ? "left" : "right"}
                      sx={{
                        fontWeight: 700,
                        fontSize: 12,
                        color: "#f97316",
                        borderBottom: "2px solid #e2e8f0",
                        whiteSpace: "nowrap",
                        py: "6px",
                        px: "10px",
                      }}
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {datos.productos.map((p, idx) => (
                  <TableRow
                    key={p.nombre}
                    sx={{ bgcolor: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}
                  >
                    <TableCell sx={{ fontSize: 12, py: "5px", px: "10px" }}>
                      {p.nombre}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: 12, py: "5px", px: "10px" }}>
                      {p.cantidad}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: 12, py: "5px", px: "10px" }}>
                      {fmtMXN(p.neto)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontSize: 12, py: "5px", px: "10px", color: "#64748b" }}
                    >
                      {fmtPct(p.porcentaje_label)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontSize: 12, py: "5px", px: "10px", fontWeight: 600 }}
                    >
                      {fmtMXN(p.comision)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
};

export default SueldosEncargadosPage;
