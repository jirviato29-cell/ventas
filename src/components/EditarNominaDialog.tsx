import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import AddIcon from "@mui/icons-material/Add";
import axios from "axios";

const API = "https://ato-appservidor-nvxt.onrender.com";
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` });

const ORANGE = "#f97316";
const BLUE   = "#3b82f6";
const GREEN  = "#16a34a";
const PURPLE = "#9333ea";

const fmtMXN = (n: number) =>
  "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface FilaEditada {
  _original: Record<string, unknown>;
  empleado: string;
  nombre_completo: string;
  usuario_ids: number[];
  seccion: string;
  sueldo: number;
  horas_extra: number;
  pago_he: number;
  accesorios: number;
  telefonos: number;
  chips: number;
  incubadora: number;
  planes: number;
  pendientes: number;
  bonos: number;
  sanciones: number;
}

interface NominaResponse {
  id: number;
  etiqueta: string;
  datos: Record<string, unknown>[];
}

interface ChipDetalle {
  chip_id: number;
  tipo_chip: string;
  numero_telefono: string;
  comision: number;
  fecha_venta: string;
}

interface GrupoIncubadora {
  empleado: string;
  nombre_completo: string;
  usuario_ids: number[];
  chips_count: number;
  total_chips_incubadora: number;
  pago_total: number;
  detalle: ChipDetalle[];
}

interface Props {
  nominaId: number | null;
  onClose: () => void;
  onGuardado: () => void;
}

const toFila = (d: Record<string, unknown>): FilaEditada => ({
  _original:      d,
  empleado:       String(d.empleado       ?? ""),
  nombre_completo: String(d.nombre_completo ?? ""),
  usuario_ids:    Array.isArray(d.usuario_ids) ? (d.usuario_ids as number[]) : [],
  seccion:        String(d.seccion        ?? ""),
  sueldo:         Number(d.sueldo         ?? 0),
  horas_extra:    Number(d.horas_extra    ?? 0),
  pago_he:        Number(d.pago_he        ?? 0),
  accesorios:     Number(d.accesorios     ?? 0),
  telefonos:      Number(d.telefonos      ?? 0),
  chips:          Number(d.chips          ?? 0),
  incubadora:     Number(d.incubadora     ?? 0),
  planes:         Number(d.planes         ?? 0),
  pendientes:     Number(d.pendientes     ?? 0),
  bonos:          Number(d.bonos          ?? 0),
  sanciones:      Number(d.sanciones      ?? 0),
});

const seccionColor: Record<string, string> = {
  asesor: BLUE, encargado: GREEN, cadena: PURPLE,
};

const EditarNominaDialog: React.FC<Props> = ({ nominaId, onClose, onGuardado }) => {
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [etiqueta, setEtiqueta] = useState("");
  const [filas, setFilas] = useState<FilaEditada[]>([]);

  // Incubadora: agregar chips pendientes a una nómina ya guardada
  const [subModalInc, setSubModalInc] = useState(false);
  const [gruposIncPendientes, setGruposIncPendientes] = useState<GrupoIncubadora[]>([]);
  const [cargandoChips, setCargandoChips] = useState(false);
  const [chipsSelIds, setChipsSelIds] = useState<Set<number>>(new Set());
  const [incubadoraBase, setIncubadoraBase] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!nominaId) return;
    setCargando(true);
    setError(null);
    axios
      .get<NominaResponse>(`${API}/admin/nominas/${nominaId}`, { headers: authH() })
      .then(({ data }) => {
        setEtiqueta(data.etiqueta);
        const fs = data.datos.map(toFila);
        setFilas(fs);
        const base: Record<string, number> = {};
        for (const f of fs) base[f.empleado] = f.incubadora;
        setIncubadoraBase(base);
        setChipsSelIds(new Set());
      })
      .catch(() => setError("Error al cargar la nómina"))
      .finally(() => setCargando(false));
  }, [nominaId]);

  const setField = (idx: number, campo: keyof FilaEditada, valor: number) =>
    setFilas((prev) => prev.map((f, i) => i === idx ? { ...f, [campo]: valor } : f));

  const abrirSelectorInc = async () => {
    setSubModalInc(true);
    if (gruposIncPendientes.length > 0 || cargandoChips) return;
    setCargandoChips(true);
    try {
      const { data } = await axios.get<GrupoIncubadora[]>(
        `${API}/admin/chips-incubadora-pendientes`, { headers: authH() },
      );
      setGruposIncPendientes(data);
    } catch {
      setGruposIncPendientes([]);
    } finally {
      setCargandoChips(false);
    }
  };

  const toggleGrupoInc = (g: GrupoIncubadora) => {
    setChipsSelIds((prev) => {
      const next = new Set(prev);
      const allSel = g.detalle.length > 0 && g.detalle.every((c) => prev.has(c.chip_id));
      g.detalle.forEach((c) => (allSel ? next.delete(c.chip_id) : next.add(c.chip_id)));
      return next;
    });
  };

  // Suma (sobre la base original) los chips seleccionados a la columna incubadora
  // de cada empleado. Idempotente: re-aplicar no duplica montos.
  const aplicarIncubadora = () => {
    setFilas((prev) => prev.map((f) => {
      let extra = 0;
      for (const g of gruposIncPendientes) {
        const match =
          g.empleado === f.empleado ||
          (g.usuario_ids?.some((id) => f.usuario_ids.includes(id)) ?? false);
        if (!match) continue;
        extra += g.detalle.reduce((s, c) => (chipsSelIds.has(c.chip_id) ? s + c.comision : s), 0);
      }
      const base = incubadoraBase[f.empleado] ?? f.incubadora;
      return { ...f, incubadora: base + extra };
    }));
    setSubModalInc(false);
  };

  const totalIncubadoraSel = gruposIncPendientes.reduce(
    (s, g) => s + g.detalle.reduce((ss, c) => (chipsSelIds.has(c.chip_id) ? ss + c.comision : ss), 0),
    0,
  );

  const inputSx = {
    "& input": { textAlign: "right" as const, fontSize: 10, padding: "2px 4px" },
    "& .MuiOutlinedInput-root": { borderRadius: 1 },
    width: 72,
  };

  const guardar = async () => {
    if (!nominaId || !etiqueta.trim()) return;
    setGuardando(true);
    setError(null);
    try {
      const datos = filas.map((f) => {
        const subtotal = f.accesorios + f.telefonos + f.chips + f.incubadora + f.planes + f.pendientes + f.bonos;
        const deposito = f.sueldo + f.pago_he + subtotal - f.sanciones;
        return {
          ...f._original,
          empleado:        f.empleado,
          nombre_completo: f.nombre_completo,
          usuario_ids:     f.usuario_ids,
          seccion:         f.seccion,
          sueldo:          f.sueldo,
          horas_extra:     f.horas_extra,
          pago_he:         f.pago_he,
          accesorios:      f.accesorios,
          telefonos:       f.telefonos,
          chips:           f.chips,
          incubadora:      f.incubadora,
          planes:          f.planes,
          pendientes:      f.pendientes,
          bonos:           f.bonos,
          sanciones:       f.sanciones,
          subtotal:        parseFloat(subtotal.toFixed(2)),
          deposito:        parseFloat(deposito.toFixed(2)),
          pago_total:      parseFloat(deposito.toFixed(2)),
        };
      });
      await axios.put(
        `${API}/admin/nominas/${nominaId}/recalcular`,
        {
          etiqueta: etiqueta.trim(),
          datos,
          chip_ids_incubadora: chipsSelIds.size > 0 ? Array.from(chipsSelIds) : undefined,
        },
        { headers: authH() },
      );
      onGuardado();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  const totalDeposito = filas.reduce((s, f) => {
    const sub = f.accesorios + f.telefonos + f.chips + f.incubadora + f.planes + f.pendientes + f.bonos;
    return s + (f.sueldo + f.pago_he + sub - f.sanciones);
  }, 0);

  return (
    <>
    <Dialog open={!!nominaId} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Editar Nómina</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {cargando ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress sx={{ color: ORANGE }} />
          </Box>
        ) : (
          <>
            <TextField
              label="Etiqueta"
              value={etiqueta}
              onChange={(e) => setEtiqueta(e.target.value)}
              fullWidth size="small" sx={{ mb: 2 }}
            />

            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={abrirSelectorInc}
                disabled={cargandoChips}
                startIcon={cargandoChips ? <CircularProgress size={14} color="inherit" /> : <AddIcon />}
                sx={{ borderColor: PURPLE, color: PURPLE, "&:hover": { borderColor: "#7c3aed", bgcolor: "#faf5ff" } }}
              >
                {cargandoChips ? "Cargando chips…" : "Agregar Incubadora"}
              </Button>
              {chipsSelIds.size > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {chipsSelIds.size} chip{chipsSelIds.size !== 1 ? "s" : ""} seleccionado{chipsSelIds.size !== 1 ? "s" : ""} · Total:{" "}
                  <strong style={{ color: PURPLE }}>{fmtMXN(totalIncubadoraSel)}</strong>
                </Typography>
              )}
            </Box>

            {filas.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={4}>
                Esta nómina no tiene datos unificados.
              </Typography>
            ) : (
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 1200 }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: "#f8fafc" }}>
                      {[
                        "Empleado", "Sueldo", "H.Extra", "$Pago HE",
                        "Accesorios", "Teléfonos", "Chips", "Incubadora",
                        "Planes tarifarios", "Com. pendientes", "Bonos",
                        "Subtotal", "Sanciones", "Depósito",
                      ].map((h) => (
                        <TableCell
                          key={h}
                          align={h === "Empleado" ? "left" : "right"}
                          sx={{ fontWeight: 700, fontSize: 10, color: "#1e293b", whiteSpace: "nowrap", py: "5px", px: "6px" }}
                        >
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filas.map((f, i) => {
                      const subtotal = f.accesorios + f.telefonos + f.chips + f.incubadora + f.planes + f.pendientes + f.bonos;
                      const deposito = f.sueldo + f.pago_he + subtotal - f.sanciones;
                      const color    = seccionColor[f.seccion] ?? "#334155";

                      const numCell = (campo: keyof FilaEditada, min = 0) => (
                        <TableCell align="right" sx={{ py: "2px", px: "4px" }}>
                          <TextField
                            type="number" size="small"
                            value={f[campo] as number}
                            onChange={(e) => setField(i, campo, Number(e.target.value))}
                            sx={inputSx}
                            inputProps={{ min }}
                          />
                        </TableCell>
                      );

                      const redCell = (campo: keyof FilaEditada) => (
                        <TableCell align="right" sx={{ py: "2px", px: "4px" }}>
                          <TextField
                            type="number" size="small"
                            value={f[campo] as number}
                            onChange={(e) => setField(i, campo, Number(e.target.value))}
                            sx={{
                              ...inputSx,
                              "& input": { ...inputSx["& input"], color: "#ef4444" },
                            }}
                            inputProps={{ min: 0 }}
                          />
                        </TableCell>
                      );

                      return (
                        <TableRow key={i} sx={{ bgcolor: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                          <TableCell sx={{ fontSize: 10, fontWeight: 700, color, whiteSpace: "nowrap", py: "3px", px: "6px" }}>
                            {f.empleado}
                          </TableCell>
                          {numCell("sueldo")}
                          {numCell("horas_extra")}
                          {numCell("pago_he")}
                          {numCell("accesorios")}
                          {numCell("telefonos")}
                          {numCell("chips")}
                          {numCell("incubadora")}
                          {numCell("planes")}
                          {numCell("pendientes")}
                          {numCell("bonos")}
                          <TableCell align="right" sx={{ fontSize: 10, py: "3px", px: "6px", whiteSpace: "nowrap", fontWeight: 600 }}>
                            {fmtMXN(subtotal)}
                          </TableCell>
                          {redCell("sanciones")}
                          <TableCell align="right" sx={{ fontSize: 10, py: "3px", px: "6px", whiteSpace: "nowrap", fontWeight: 700, color: ORANGE }}>
                            {fmtMXN(deposito)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                      <TableCell colSpan={13} sx={{ fontWeight: 700, fontSize: 11, py: "5px", px: "6px" }}>
                        Total depósito
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, py: "5px", px: "6px", color: ORANGE, whiteSpace: "nowrap" }}>
                        {fmtMXN(totalDeposito)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={guardando}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={guardar}
          disabled={cargando || !etiqueta.trim() || filas.length === 0 || guardando}
          startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          sx={{ bgcolor: ORANGE, "&:hover": { bgcolor: "#ea6b0a" } }}
        >
          Guardar Cambios
        </Button>
      </DialogActions>
    </Dialog>

    <Dialog open={subModalInc} onClose={() => setSubModalInc(false)} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, color: PURPLE }}>Chips de Incubadora Pendientes</DialogTitle>
      <DialogContent dividers>
        {cargandoChips ? (
          <Box textAlign="center" py={4}><CircularProgress sx={{ color: PURPLE }} /></Box>
        ) : gruposIncPendientes.length === 0 ? (
          <Alert severity="info">No hay chips de incubadora pendientes de pago.</Alert>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#f5f3ff" }}>
                <TableCell padding="checkbox" sx={{ bgcolor: "#f5f3ff" }} />
                {["Empleado", "Nombre completo", "# Chips", "Total"].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, color: PURPLE, fontSize: 11 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {gruposIncPendientes.map((g, i) => {
                const checked = g.detalle.length > 0 && g.detalle.every((c) => chipsSelIds.has(c.chip_id));
                const some = g.detalle.some((c) => chipsSelIds.has(c.chip_id));
                return (
                  <TableRow
                    key={i}
                    hover
                    onClick={() => toggleGrupoInc(g)}
                    sx={{ cursor: "pointer", bgcolor: some ? "#ede9fe" : i % 2 === 0 ? "#fff" : "#faf5ff" }}
                  >
                    <TableCell padding="checkbox" onClick={(ev) => ev.stopPropagation()}>
                      <Checkbox
                        size="small"
                        checked={checked}
                        indeterminate={some && !checked}
                        onChange={() => toggleGrupoInc(g)}
                        sx={{ color: PURPLE, "&.Mui-checked": { color: PURPLE }, "&.MuiCheckbox-indeterminate": { color: PURPLE } }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{g.empleado}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{g.nombre_completo}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{g.chips_count}</TableCell>
                    <TableCell sx={{ fontSize: 12, fontWeight: 700, color: GREEN }}>{fmtMXN(g.pago_total)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Box sx={{ flex: 1, minWidth: 160 }}>
          <Typography variant="body2" sx={{ color: PURPLE, fontWeight: 600 }}>
            {chipsSelIds.size} chip{chipsSelIds.size !== 1 ? "s" : ""} · {fmtMXN(totalIncubadoraSel)}
          </Typography>
        </Box>
        <Button onClick={() => setSubModalInc(false)} color="inherit">Cancelar</Button>
        <Button
          variant="contained"
          onClick={aplicarIncubadora}
          disabled={chipsSelIds.size === 0}
          sx={{ bgcolor: PURPLE, "&:hover": { bgcolor: "#6d28d9" } }}
        >
          Agregar a la nómina
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default EditarNominaDialog;
