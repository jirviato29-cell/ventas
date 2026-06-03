import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import dayjs from "dayjs";
import "dayjs/locale/es";
import axios from "axios";

const API = "https://ato-appservidor-nvxt.onrender.com";
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

interface EmpleadoSueldo {
  empleado: string;
  nombre_completo: string;
  modulo: string;
  usuario_ids: number[];
  sueldo_total: number;
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

function generarCiclos(count: number): CicloItem[] {
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
  }).format(new Date());

  const [y, m, d] = todayStr.split("-").map(Number);
  const today = dayjs(new Date(y, m - 1, d));

  const daysToLastThursday = ((today.day() - 4 + 7) % 7) || 7;
  const lastThursday = today.subtract(daysToLastThursday, "day");

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

  // Guardar ciclo
  const [dialogOpen, setDialogOpen] = useState(false);
  const [etiquetaCiclo, setEtiquetaCiclo] = useState("");
  const [guardandoCiclo, setGuardandoCiclo] = useState(false);
  const [snack, setSnack] = useState<{ msg: string; sev: "success" | "error" } | null>(null);

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

  const guardarCiclo = async () => {
    if (!etiquetaCiclo.trim()) return;
    setGuardandoCiclo(true);
    try {
      const ciclo = ciclos[cicloSelIdx];
      const { data: sueldosData } = await axios.get<EmpleadoSueldo[]>(
        `${API}/sueldos/encargados-todos?fecha_inicio=${ciclo.fechaInicioStr}&fecha_fin=${ciclo.fechaFinStr}`,
        { headers: authH() }
      );
      await axios.post(
        `${API}/admin/ciclos-guardados`,
        {
          concepto: "sueldos_encargados",
          etiqueta: etiquetaCiclo.trim(),
          fecha_inicio: ciclo.fechaInicioStr,
          fecha_fin: ciclo.fechaFinStr,
          datos: sueldosData,
        },
        { headers: authH() }
      );
      setDialogOpen(false);
      setEtiquetaCiclo("");
      setSnack({ msg: "Ciclo guardado exitosamente", sev: "success" });
    } catch (err: any) {
      setSnack({ msg: err?.response?.data?.detail || "Error al guardar el ciclo", sev: "error" });
    } finally {
      setGuardandoCiclo(false);
    }
  };

  const cicloActual = ciclos[cicloSelIdx];

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h5" fontWeight={700} color="#1e293b">
          Sueldos Encargados
        </Typography>
        <Button
          variant="outlined"
          startIcon={guardandoCiclo ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          onClick={() => setDialogOpen(true)}
          disabled={guardandoCiclo}
          sx={{
            borderColor: "#f97316", color: "#f97316",
            "&:hover": { borderColor: "#f97316", bgcolor: "rgba(249,115,22,0.08)" },
          }}
        >
          Guardar Ciclo
        </Button>
      </Box>

      {/* ── Dialog etiqueta ─────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Guardar Ciclo de Sueldos Encargados</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={1.5}>
            Ciclo: <strong>{cicloActual.label}</strong>
          </Typography>
          <TextField
            label="Etiqueta"
            value={etiquetaCiclo}
            onChange={(e) => setEtiquetaCiclo(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") guardarCiclo(); }}
            fullWidth size="small"
            placeholder={`Ej. Encargados ${cicloActual.label}`}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit" disabled={guardandoCiclo}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={guardarCiclo}
            disabled={!etiquetaCiclo.trim() || guardandoCiclo}
            startIcon={guardandoCiclo ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ bgcolor: "#f97316", "&:hover": { bgcolor: "#ea6b0a" } }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Filtros ─────────────────────────────────────────────────── */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
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

      {!cargando && datos && (
        <Box>
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

          <Box display="flex" gap={2} flexWrap="wrap" alignItems="flex-start">

            <Box sx={{ flex: "2 1 300px", minWidth: 0 }}>
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
                          sx={{ fontWeight: 700, fontSize: 12, color: "#f97316", borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap", py: "6px", px: "10px" }}
                        >
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortProductos(datos.productos).map((p, idx) => (
                      <TableRow key={p.nombre} sx={{ bgcolor: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                        <TableCell sx={{ fontSize: 12, py: "5px", px: "10px" }}>{p.nombre}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, py: "5px", px: "10px", whiteSpace: "nowrap" }}>{p.cantidad}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, py: "5px", px: "10px", whiteSpace: "nowrap" }}>{fmtMXN(p.neto)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, py: "5px", px: "10px", color: "#64748b", whiteSpace: "nowrap" }}>{fmtPct(p.porcentaje_label)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, py: "5px", px: "10px", fontWeight: 600, whiteSpace: "nowrap" }}>{fmtMXN(p.comision)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            <Box sx={{ flex: "1 1 150px", minWidth: 0 }}>
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
                          sx={{ fontWeight: 700, fontSize: 12, color: "#f97316", borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap", py: "6px", px: "10px" }}
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
                          sx={{ bgcolor: esTotal ? "#fff7ed" : idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}
                        >
                          <TableCell sx={{ fontSize: 12, py: "5px", px: "10px", fontWeight: esTotal ? 700 : 400, color: esTotal ? "#ea580c" : "inherit" }}>
                            {esTotal ? "TOTAL" : fmtDiaCorto(fila.fecha!)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontSize: 12, py: "5px", px: "10px", fontWeight: esTotal ? 700 : 400, color: esTotal ? "#ea580c" : "inherit", whiteSpace: "nowrap" }}>
                            {fila.equipos}
                          </TableCell>
                          <TableCell align="right" sx={{ fontSize: 12, py: "5px", px: "10px", fontWeight: esTotal ? 700 : 400, color: esTotal ? "#ea580c" : "inherit", whiteSpace: "nowrap" }}>
                            {fmtMXN(fila.accesorios)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {datosResumen && (
              <Box sx={{ flex: "1 1 150px", minWidth: 0 }}>
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
                            sx={{ fontWeight: 700, fontSize: 12, color: "#f97316", borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap", py: "6px", px: "10px" }}
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
                            sx={{ bgcolor: esEnc ? "#fff7ed" : idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}
                          >
                            <TableCell sx={{ fontSize: 12, py: "5px", px: "10px", fontWeight: esEnc ? 700 : 400, color: esEnc ? "#ea580c" : "inherit" }}>
                              {emp.nombre}
                            </TableCell>
                            <TableCell align="right" sx={{ fontSize: 12, py: "5px", px: "10px", whiteSpace: "nowrap" }}>{fmtMXN(emp.sueldo_base)}</TableCell>
                            <TableCell align="right" sx={{ fontSize: 12, py: "5px", px: "10px", whiteSpace: "nowrap" }}>{fmtMXN(emp.horas_extras_pagadas)}</TableCell>
                            <TableCell align="right" sx={{ fontSize: 12, py: "5px", px: "10px", whiteSpace: "nowrap" }}>{fmtMXN(emp.comisiones)}</TableCell>
                            <TableCell align="right" sx={{ fontSize: 12, py: "5px", px: "10px", fontWeight: 600, color: esEnc ? "#ea580c" : "inherit", whiteSpace: "nowrap" }}>{fmtMXN(emp.total)}</TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow sx={{ bgcolor: "#fff7ed" }}>
                        {([
                          "TOTAL",
                          fmtMXN(datosResumen.empleados.reduce((s, e) => s + e.sueldo_base, 0)),
                          fmtMXN(datosResumen.empleados.reduce((s, e) => s + e.horas_extras_pagadas, 0)),
                          fmtMXN(datosResumen.empleados.reduce((s, e) => s + e.comisiones, 0)),
                          fmtMXN(datosResumen.empleados.reduce((s, e) => s + e.total, 0)),
                        ] as string[]).map((val, i) => (
                          <TableCell key={i} align={i === 0 ? "left" : "right"} sx={{ fontSize: 12, py: "5px", px: "10px", fontWeight: 700, color: "#ea580c" }}>
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

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)}>
        <Alert severity={snack?.sev} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default SueldosEncargadosPage;
