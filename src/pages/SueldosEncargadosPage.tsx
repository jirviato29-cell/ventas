import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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

interface CicloItem {
  fechaInicioStr: string;
  fechaFinStr: string;
  label: string;
}

interface DiaDiario {
  fecha: string | null;
  label: string;
  equipos: number;
  accesorios: number;
}

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
  desglose_diario: DiaDiario[];
  sueldo_total: number;
}

interface ResumenEmpleadoNomina {
  nombre: string;
  rol: string;
  sueldo_base: number;
  horas_extras_pagadas: number;
  comisiones: number;
  total: number;
}

interface ResumenModuloResponse {
  nomina_inicio: string;
  nomina_fin: string;
  empleados: ResumenEmpleadoNomina[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDiaCorto = (fechaStr: string) => {
  const [y, mo, d] = fechaStr.split("-").map(Number);
  return dayjs(new Date(y, mo - 1, d)).locale("es").format("D-MMM");
};

const fmtMXN = (n: number) =>
  "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtPct = (label: string) => (label === "$10 fijo" ? "$10" : label);

function sortProductos(productos: ProductoResumen[]): ProductoResumen[] {
  return [...productos].sort((a, b) => {
    const rank = (p: ProductoResumen) =>
      p.tipo === "telefono" ? 0 : p.porcentaje_label === "$10 fijo" ? 1 : 2;
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    if (ra === 2) return a.nombre.localeCompare(b.nombre, "es");
    return 0;
  });
}

/**
 * Genera los últimos `count` ciclos cerrados (viernes→jueves).
 * El primero (índice 0) es el ciclo cerrado más reciente.
 * "Cerrado" = el jueves de ese ciclo ya pasó; si hoy es jueves, no cuenta.
 */
function generarCiclos(count: number): CicloItem[] {
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
  }).format(new Date());

  // Parsear como fecha local para evitar el desplazamiento UTC→CDT
  const [y, m, d] = todayStr.split("-").map(Number);
  const today = dayjs(new Date(y, m - 1, d));

  // Jueves más reciente YA PASADO (si hoy es jueves, tomar el de la semana anterior)
  // day() 4 = jueves; (day - 4 + 7) % 7 da 0 cuando hoy es jueves → forzar 7
  const daysToLastThursday = ((today.day() - 4 + 7) % 7) || 7;
  const lastThursday = today.subtract(daysToLastThursday, "day");

  console.log(
    "[CICLO] hoy:", todayStr,
    "| day():", today.day(),
    "| daysToLastThursday:", daysToLastThursday,
    "| fin[0]:", lastThursday.format("YYYY-MM-DD"),
    "| inicio[0]:", lastThursday.subtract(6, "day").format("YYYY-MM-DD"),
  );

  return Array.from({ length: count }, (_, i) => {
    const fin = lastThursday.subtract(i * 7, "day");
    const inicio = fin.subtract(6, "day");
    return {
      fechaInicioStr: inicio.format("YYYY-MM-DD"),
      fechaFinStr: fin.format("YYYY-MM-DD"),
      label: `${inicio.locale("es").format("D MMM")} → ${fin.locale("es").format("D MMM")}`,
    };
  });
}

// ── Componente ────────────────────────────────────────────────────────────────

const SueldosEncargadosPage: React.FC = () => {
  const ciclos = useMemo(() => generarCiclos(8), []);
  const [cicloSelIdx, setCicloSelIdx] = useState(0);
  const [moduloSel, setModuloSel] = useState<string | null>(null);
  const [datos, setDatos] = useState<SueldoResponse | null>(null);
  const [datosResumen, setDatosResumen] = useState<ResumenModuloResponse | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarDatos = useCallback(
    async (modulo: string, inicio: string, fin: string) => {
      setCargando(true);
      setError(null);
      try {
        const [{ data: sueldoData }, { data: resumenData }] = await Promise.all([
          axios.get<SueldoResponse>(
            `${API}/sueldos/encargados?modulo=${encodeURIComponent(modulo)}&fecha_inicio=${inicio}&fecha_fin=${fin}`,
            { headers: authH() }
          ),
          axios.get<ResumenModuloResponse>(
            `${API}/sueldos/resumen-modulo?modulo=${encodeURIComponent(modulo)}`,
            { headers: authH() }
          ),
        ]);
        setDatos(sueldoData);
        setDatosResumen(resumenData);
      } catch {
        setError("No se pudo cargar el sueldo. Verifica la conexión o el módulo seleccionado.");
        setDatos(null);
        setDatosResumen(null);
      } finally {
        setCargando(false);
      }
    },
    []
  );

  useEffect(() => {
    const c = ciclos[cicloSelIdx];
    if (moduloSel) {
      cargarDatos(moduloSel, c.fechaInicioStr, c.fechaFinStr);
    } else {
      setDatos(null);
      setDatosResumen(null);
      setError(null);
    }
  }, [moduloSel, cicloSelIdx, ciclos, cargarDatos]);

  const cicloActual = ciclos[cicloSelIdx];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} color="#1e293b" mb={3}>
        Sueldos Encargados
      </Typography>

      {/* ── Filtros ─────────────────────────────────────────────────── */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        {/* Selector de ciclo */}
        <Box display="flex" alignItems="center" gap={2} mb={2.5} flexWrap="wrap">
          <Typography fontWeight={600} color="#64748b" fontSize={14}>
            Ciclo:
          </Typography>
          <FormControl size="small" sx={{ minWidth: 210 }}>
            <InputLabel sx={{ fontSize: 13 }}>Ciclo</InputLabel>
            <Select
              label="Ciclo"
              value={cicloSelIdx}
              onChange={(e) => setCicloSelIdx(Number(e.target.value))}
              sx={{ fontSize: 13, color: "#f97316", fontWeight: 600 }}
            >
              {ciclos.map((c, i) => (
                <MenuItem key={c.fechaInicioStr} value={i} sx={{ fontSize: 13 }}>
                  {i === 0 ? `${c.label} (último cerrado)` : c.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

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

          {/* ── Cuadros lado a lado (responsive) ───────────────────── */}
          <Box display="flex" gap={2} flexWrap="wrap" alignItems="flex-start">

            {/* Cuadro 1: Resumen de productos — ~50% */}
            <Box sx={{ flex: "2 1 300px", minWidth: 0, overflow: "hidden" }}>
              <Typography variant="h6" fontWeight={700} color="#1e293b" mb={1.5}>
                Resumen de productos — {datos.modulo}&nbsp;·&nbsp;
                <Box component="span" color="#64748b" fontWeight={400} fontSize={14}>
                  {cicloActual.label}
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
                    {sortProductos(datos.productos).map((p, idx) => (
                      <TableRow
                        key={p.nombre}
                        sx={{ bgcolor: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}
                      >
                        <TableCell
                          sx={{
                            fontSize: 12,
                            py: "5px",
                            px: "10px",
                            maxWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
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

            {/* Cuadro 2: Desglose por día — ~25% */}
            <Box sx={{ flex: "1 1 150px", minWidth: 0, overflow: "hidden" }}>
              <Typography variant="h6" fontWeight={700} color="#1e293b" mb={1.5}>
                Ventas por día
              </Typography>

              <TableContainer component={Paper} elevation={1} sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {["Día", "Equipos", "Accesorios"].map((h) => (
                        <TableCell
                          key={h}
                          align={h === "Día" ? "left" : "right"}
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
                    {datos.desglose_diario.map((fila, idx) => {
                      const esTotal = fila.fecha === null;
                      return (
                        <TableRow
                          key={fila.fecha ?? "total"}
                          sx={{
                            bgcolor: esTotal
                              ? "#fff7ed"
                              : idx % 2 === 0
                              ? "#ffffff"
                              : "#f8fafc",
                          }}
                        >
                          <TableCell
                            sx={{
                              fontSize: 12,
                              py: "5px",
                              px: "10px",
                              fontWeight: esTotal ? 700 : 400,
                              color: esTotal ? "#ea580c" : "inherit",
                            }}
                          >
                            {esTotal ? "TOTAL" : fmtDiaCorto(fila.fecha!)}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              fontSize: 12,
                              py: "5px",
                              px: "10px",
                              fontWeight: esTotal ? 700 : 400,
                              color: esTotal ? "#ea580c" : "inherit",
                            }}
                          >
                            {fila.equipos}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              fontSize: 12,
                              py: "5px",
                              px: "10px",
                              fontWeight: esTotal ? 700 : 400,
                              color: esTotal ? "#ea580c" : "inherit",
                            }}
                          >
                            {fmtMXN(fila.accesorios)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* Cuadro 3: Resumen nómina del módulo — ~25% */}
            {datosResumen && (
              <Box sx={{ flex: "1 1 150px", minWidth: 0, overflow: "hidden" }}>
                <Typography variant="h6" fontWeight={700} color="#1e293b" mb={0.5}>
                  Resumen
                </Typography>
                <Typography fontSize={11} color="#94a3b8" mb={1.5}>
                  Semana {fmtDiaCorto(datosResumen.nomina_inicio)}&nbsp;–&nbsp;{fmtDiaCorto(datosResumen.nomina_fin)}
                </Typography>

                <TableContainer component={Paper} elevation={1} sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {["Empleado", "Sueldo base", "Horas extras", "Comisiones", "Total"].map((h) => (
                          <TableCell
                            key={h}
                            align={h === "Empleado" ? "left" : "right"}
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
                      {datosResumen.empleados.map((emp, idx) => {
                        const esEnc = emp.rol === "encargado";
                        return (
                          <TableRow
                            key={emp.nombre}
                            sx={{
                              bgcolor: esEnc
                                ? "#fff7ed"
                                : idx % 2 === 0
                                ? "#ffffff"
                                : "#f8fafc",
                            }}
                          >
                            <TableCell
                              sx={{
                                fontSize: 12,
                                py: "5px",
                                px: "10px",
                                fontWeight: esEnc ? 700 : 400,
                                color: esEnc ? "#ea580c" : "inherit",
                                maxWidth: 0,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {emp.nombre}
                            </TableCell>
                            <TableCell align="right" sx={{ fontSize: 12, py: "5px", px: "10px" }}>
                              {fmtMXN(emp.sueldo_base)}
                            </TableCell>
                            <TableCell align="right" sx={{ fontSize: 12, py: "5px", px: "10px" }}>
                              {fmtMXN(emp.horas_extras_pagadas)}
                            </TableCell>
                            <TableCell align="right" sx={{ fontSize: 12, py: "5px", px: "10px" }}>
                              {fmtMXN(emp.comisiones)}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                fontSize: 12,
                                py: "5px",
                                px: "10px",
                                fontWeight: 600,
                                color: esEnc ? "#ea580c" : "inherit",
                              }}
                            >
                              {fmtMXN(emp.total)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Fila TOTAL */}
                      <TableRow sx={{ bgcolor: "#fff7ed" }}>
                        {(["TOTAL",
                          fmtMXN(datosResumen.empleados.reduce((s, e) => s + e.sueldo_base, 0)),
                          fmtMXN(datosResumen.empleados.reduce((s, e) => s + e.horas_extras_pagadas, 0)),
                          fmtMXN(datosResumen.empleados.reduce((s, e) => s + e.comisiones, 0)),
                          fmtMXN(datosResumen.empleados.reduce((s, e) => s + e.total, 0)),
                        ] as string[]).map((val, i) => (
                          <TableCell
                            key={i}
                            align={i === 0 ? "left" : "right"}
                            sx={{
                              fontSize: 12,
                              py: "5px",
                              px: "10px",
                              fontWeight: 700,
                              color: "#ea580c",
                            }}
                          >
                            {val}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

          </Box>
        </Box>
      )}
    </Box>
  );
};

export default SueldosEncargadosPage;
