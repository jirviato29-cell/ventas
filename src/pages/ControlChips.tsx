import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  MenuItem,
  CircularProgress,
  Paper,
  Alert,
  Chip,
} from "@mui/material";
import { Search, SimCard } from "@mui/icons-material";
import axios from "axios";

const API = "/api";

interface ChipControl {
  clave: string;
  paquete: string;
  numero: string | null;
  iccid: string | null;
  estatus: string;
  estatus_real: string;
  modulo_id: number | null;
  modulo: string | null;
  folio: string | null;
  fecha_surtido: string | null;
  fecha_venta: string | null;
  asesor: string | null;
  tipo_chip: string | null;
}

interface ResumenModulo {
  modulo_id: number | null;
  modulo: string;
  surtidos: number;
  vendidos: number;
  pendientes: number;
}

interface Totales {
  en_bodega: number;
  surtidos: number;
  vendidos: number;
  pendientes: number;
}

interface Filtros {
  modulo_id: number | "";
  estatus: string;
  paquete: string;
  numero: string;
}

const FILTROS_VACIOS: Filtros = { modulo_id: "", estatus: "", paquete: "", numero: "" };

const ESTATUS_CHIP: Record<string, { label: string; bg: string; color: string }> = {
  en_bodega: { label: "En bodega", bg: "#e2e8f0", color: "#334155" },
  surtido: { label: "Surtido", bg: "#ffedd5", color: "#c2410c" },
  vendido: { label: "Vendido", bg: "#dcfce7", color: "#15803d" },
};

const tablaSx = {
  "& th, & td": { border: "1px solid #e2e8f0" },
  "& thead th": { bgcolor: "#f8fafc", fontWeight: 700 },
  "& tbody tr:nth-of-type(even)": { bgcolor: "#fcfcfd" },
};

// Las fechas llegan sin zona (hora de México); se formatean desde el texto
// para que el navegador no las mueva de día.
const formatDia = (s: string | null) => {
  if (!s) return "—";
  const [a, m, d] = s.slice(0, 10).split("-");
  return d && m && a ? `${d}/${m}/${a}` : s;
};
const formatFechaHora = (s: string | null) => {
  if (!s) return "—";
  const hora = s.length >= 16 ? s.slice(11, 16) : "";
  return `${formatDia(s)}${hora ? ` ${hora}` : ""}`;
};

const ordenClave = (a: ChipControl, b: ChipControl) =>
  a.clave.localeCompare(b.clave, undefined, { numeric: true, sensitivity: "base" });

const ControlChips = () => {
  const [modulos, setModulos] = useState<any[]>([]);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);
  const [chips, setChips] = useState<ChipControl[]>([]);
  const [porModulo, setPorModulo] = useState<ResumenModulo[]>([]);
  const [totales, setTotales] = useState<Totales | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (f: Filtros) => {
    setCargando(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {};
      if (f.modulo_id !== "") params.modulo_id = f.modulo_id;
      if (f.estatus) params.estatus = f.estatus;
      if (f.paquete.trim()) params.paquete = f.paquete.trim();
      if (f.numero.trim()) params.numero = f.numero.trim();
      const res = await axios.get(`${API}/inventario/inventario/chips/control`, {
        params,
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setChips(res.data.chips || []);
      setPorModulo(res.data.por_modulo || []);
      setTotales(res.data.totales || null);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(detail ? String(detail) : "Error al cargar el control de chips");
    } finally {
      setCargando(false);
    }
  }, []);

  const cargarModulos = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/registro/modulos`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setModulos(res.data || []);
    } catch {
      setModulos([]);
    }
  }, []);

  useEffect(() => {
    cargarModulos();
    cargar(FILTROS_VACIOS);
  }, [cargar, cargarModulos]);

  const chipsOrdenados = useMemo(() => [...chips].sort(ordenClave), [chips]);

  const buscar = () => cargar(filtros);
  const limpiar = () => {
    setFiltros(FILTROS_VACIOS);
    cargar(FILTROS_VACIOS);
  };
  const alEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); buscar(); }
  };

  const tarjetas = [
    { label: "En bodega", valor: totales?.en_bodega, color: "#64748b" },
    { label: "Surtidos", valor: totales?.surtidos, color: "#f97316" },
    { label: "Vendidos", valor: totales?.vendidos, color: "#16a34a" },
    { label: "Pendientes de vender", valor: totales?.pendientes, color: "#0d1e3a" },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
        <SimCard sx={{ color: "#f97316" }} />
        <Typography variant="h5" fontWeight={700}>Control de Chips</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tarjetas */}
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
        {tarjetas.map((t) => (
          <Paper key={t.label} elevation={0} sx={{ flex: "1 1 180px", p: 2, borderRadius: 2, borderLeft: `4px solid ${t.color}` }}>
            <Typography variant="body2" color="text.secondary">{t.label}</Typography>
            <Typography variant="h4" fontWeight={700} sx={{ color: t.color }}>
              {t.valor ?? (cargando ? "…" : 0)}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* Resumen por módulo */}
      <Paper elevation={0} sx={{ borderRadius: 2, overflow: "hidden", mb: 3, maxWidth: 720 }}>
        <Box sx={{ px: 2.5, py: 1.5, borderBottom: "1px solid #e2e8f0" }}>
          <Typography variant="subtitle1" fontWeight={700}>Resumen por módulo</Typography>
        </Box>
        <Table size="small" sx={tablaSx}>
          <TableHead>
            <TableRow>
              <TableCell>Módulo</TableCell>
              <TableCell align="right">Surtidos</TableCell>
              <TableCell align="right">Vendidos</TableCell>
              <TableCell align="right">Pendientes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {porModulo.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ color: "#94a3b8", py: 2 }}>
                  {cargando ? "Cargando…" : "Sin chips surtidos"}
                </TableCell>
              </TableRow>
            )}
            {porModulo.map((m) => (
              <TableRow key={m.modulo_id ?? "sin-modulo"}>
                <TableCell sx={{ fontWeight: 600 }}>{m.modulo}</TableCell>
                <TableCell align="right">{m.surtidos}</TableCell>
                <TableCell align="right" sx={{ color: "#15803d", fontWeight: 600 }}>{m.vendidos}</TableCell>
                <TableCell align="right" sx={{ color: "#c2410c", fontWeight: 600 }}>{m.pendientes}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Filtros */}
      <Paper elevation={0} sx={{ p: 2, borderRadius: 2, mb: 3, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          select
          size="small"
          label="Módulo"
          value={filtros.modulo_id}
          onChange={(e) => setFiltros((f) => ({ ...f, modulo_id: e.target.value === "" ? "" : Number(e.target.value) }))}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">Todos</MenuItem>
          {modulos.map((m) => (
            <MenuItem key={m.id} value={m.id}>{m.nombre}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Estatus"
          value={filtros.estatus}
          onChange={(e) => setFiltros((f) => ({ ...f, estatus: e.target.value }))}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="en_bodega">En bodega</MenuItem>
          <MenuItem value="surtido">Surtido</MenuItem>
          <MenuItem value="vendido">Vendido</MenuItem>
        </TextField>
        <TextField
          size="small"
          label="Paquete (ej. A16)"
          value={filtros.paquete}
          onChange={(e) => setFiltros((f) => ({ ...f, paquete: e.target.value }))}
          onKeyDown={alEnter}
          sx={{ width: 160 }}
        />
        <TextField
          size="small"
          label="Número"
          value={filtros.numero}
          onChange={(e) => setFiltros((f) => ({ ...f, numero: e.target.value }))}
          onKeyDown={alEnter}
          sx={{ width: 180 }}
        />
        <Button
          variant="contained"
          startIcon={cargando ? <CircularProgress size={16} color="inherit" /> : <Search />}
          onClick={buscar}
          disabled={cargando}
        >
          Buscar
        </Button>
        <Button variant="outlined" onClick={limpiar} disabled={cargando}>
          Limpiar
        </Button>
      </Paper>

      {/* Detalle */}
      <Paper elevation={0} sx={{ borderRadius: 2, overflow: "hidden" }}>
        <Box sx={{ px: 2.5, py: 1.5, borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="subtitle1" fontWeight={700}>Chips</Typography>
          <Typography variant="body2" color="text.secondary">
            {chipsOrdenados.length} chip{chipsOrdenados.length !== 1 ? "s" : ""}
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small" sx={tablaSx}>
            <TableHead>
              <TableRow>
                <TableCell>Clave</TableCell>
                <TableCell>Número</TableCell>
                <TableCell>ICCID</TableCell>
                <TableCell align="center">Estatus</TableCell>
                <TableCell>Módulo</TableCell>
                <TableCell>Folio</TableCell>
                <TableCell>Fecha surtido</TableCell>
                <TableCell>Fecha venta</TableCell>
                <TableCell>Asesor</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {chipsOrdenados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ color: "#94a3b8", py: 3 }}>
                    {cargando ? "Cargando…" : "No hay chips con esos filtros"}
                  </TableCell>
                </TableRow>
              )}
              {chipsOrdenados.map((c) => {
                const est = ESTATUS_CHIP[c.estatus_real] ?? { label: c.estatus_real, bg: "#e2e8f0", color: "#334155" };
                return (
                  <TableRow key={c.clave}>
                    <TableCell sx={{ fontWeight: 600, color: "#f97316", whiteSpace: "nowrap" }}>{c.clave}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{c.numero || "—"}</TableCell>
                    <TableCell sx={{ fontFamily: "monospace" }}>{c.iccid || "—"}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={est.label}
                        size="small"
                        title={c.tipo_chip ? `Tipo: ${c.tipo_chip}` : undefined}
                        sx={{ bgcolor: est.bg, color: est.color, fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell>{c.modulo || "—"}</TableCell>
                    <TableCell>{c.folio || "—"}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{formatFechaHora(c.fecha_surtido)}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDia(c.fecha_venta)}</TableCell>
                    <TableCell>{c.asesor || "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default ControlChips;
