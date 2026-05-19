import React, { useState, useEffect, useCallback } from "react";
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
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import type { Dayjs } from "dayjs";
import "dayjs/locale/es";
import axios from "axios";

const API = process.env.REACT_APP_API_URL ?? "";
const token = () => localStorage.getItem("token") ?? "";
const authH = () => ({ Authorization: `Bearer ${token()}` });

const MODULOS = [
  "V2", "Cadenas C.", "MI2", "BO", "M1", "M2", "VI", "MF",
  "AL", "DR", "HA", "VL", "R1", "GI", "PS", "WA", "SA", "Uni", "U2", "RO",
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

const fmtDia = (d: Dayjs) => d.locale("es").format("D MMM");

const fmtMXN = (n: number) =>
  "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtPct = (label: string) => (label === "$10 fijo" ? "$10" : label);

// ── Componente ────────────────────────────────────────────────────────────────

const SueldosEncargadosPage: React.FC = () => {
  const [fechaInicio, setFechaInicio] = useState<Dayjs | null>(null);
  const [moduloSel, setModuloSel] = useState<string | null>(null);
  const [datos, setDatos] = useState<SueldoResponse | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fechaFin = fechaInicio ? fechaInicio.add(6, "day") : null;
  const labelCiclo =
    fechaInicio && fechaFin
      ? `${fmtDia(fechaInicio)} → ${fmtDia(fechaFin)}`
      : null;

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
    if (moduloSel && fechaInicio) {
      const inicio = fechaInicio.format("YYYY-MM-DD");
      const fin = fechaInicio.add(6, "day").format("YYYY-MM-DD");
      cargarDatos(moduloSel, inicio, fin);
    } else {
      setDatos(null);
      setError(null);
    }
  }, [moduloSel, fechaInicio, cargarDatos]);

  return (
    <Box sx={{ p: 3, maxWidth: 960, mx: "auto" }}>
      <Typography variant="h5" fontWeight={700} color="#1e293b" mb={3}>
        Sueldos Encargados
      </Typography>

      {/* ── Filtros ─────────────────────────────────────────────────── */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2.5} flexWrap="wrap">
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
            <DatePicker
              label="Inicio del ciclo (viernes)"
              value={fechaInicio}
              onChange={(val) => setFechaInicio(val)}
              shouldDisableDate={(d) => d.day() !== 5}
              slotProps={{ textField: { size: "small" } }}
            />
          </LocalizationProvider>

          {labelCiclo && (
            <Typography fontWeight={600} color="#f97316" fontSize={15}>
              Ciclo:&nbsp;{labelCiclo}
            </Typography>
          )}
        </Box>

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
          <Typography variant="h6" fontWeight={700} color="#1e293b" mb={1.5}>
            Resumen de productos — {datos.modulo} &nbsp;·&nbsp;{" "}
            <Box component="span" color="#64748b" fontWeight={400} fontSize={14}>
              {labelCiclo}
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

          {/* Sueldo total */}
          <Box
            display="flex"
            justifyContent="flex-end"
            alignItems="center"
            gap={2}
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
        </Box>
      )}
    </Box>
  );
};

export default SueldosEncargadosPage;
