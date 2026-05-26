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
import PaymentIcon from "@mui/icons-material/Payment";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import axios from "axios";

const API = process.env.REACT_APP_API_URL ?? "";
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` });

const PURPLE = "#7C3AED";
const GREEN  = "#16a34a";

interface ChipDetalle {
  chip_id: number;
  tipo_chip: string;
  numero_telefono: string;
  comision: number;
  fecha_venta: string;
}

interface PendienteItem {
  empleado: string;
  nombre_completo: string;
  usuario_ids: number[];
  chips_count: number;
  total_chips_incubadora: number;
  pago_total: number;
  detalle: ChipDetalle[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const CrearNominaIncubadoraDialog: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const [etiqueta, setEtiqueta] = useState("");
  const [pendientes, setPendientes] = useState<PendienteItem[]>([]);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEtiqueta("");
    setError(null);
    setSeleccionados(new Set());
    setCargando(true);
    axios
      .get<PendienteItem[]>(`${API}/admin/chips-incubadora-pendientes`, { headers: authH() })
      .then(({ data }) => setPendientes(data))
      .catch(() => { setPendientes([]); setError("Error al cargar chips pendientes"); })
      .finally(() => setCargando(false));
  }, [open]);

  const toggleFila = (key: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const todosSeleccionados = pendientes.length > 0 && seleccionados.size === pendientes.length;
  const algunoSeleccionado = seleccionados.size > 0;

  const toggleTodos = () => {
    if (todosSeleccionados) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(pendientes.map((e) => e.empleado)));
    }
  };

  const selArr = pendientes.filter((e) => seleccionados.has(e.empleado));
  const totalChipsSel = selArr.reduce((s, e) => s + e.chips_count, 0);
  const totalPagoSel  = selArr.reduce((s, e) => s + e.pago_total, 0);

  const guardar = async () => {
    if (!etiqueta.trim()) { setError("La etiqueta no puede estar vacía"); return; }
    if (!algunoSeleccionado) { setError("Selecciona al menos un empleado"); return; }
    setGuardando(true);
    setError(null);
    try {
      await axios.post(
        `${API}/admin/nominas-incubadora`,
        { etiqueta: etiqueta.trim(), datos: selArr },
        { headers: authH() },
      );
      onCreated();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Error al guardar la nómina");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, color: PURPLE }}>
        Crear Nómina de Incubadora
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TextField
          label="Etiqueta"
          value={etiqueta}
          onChange={(e) => setEtiqueta(e.target.value)}
          fullWidth
          size="small"
          sx={{ mb: 2 }}
          placeholder="Ej. Incubadora Mayo 2025"
        />

        <Alert
          severity="warning"
          icon={<WarningAmberIcon fontSize="small" />}
          sx={{ mb: 2, fontSize: 13 }}
        >
          Al guardar, los chips de los empleados seleccionados se marcarán como pagados y no aparecerán en futuras nóminas.
        </Alert>

        {cargando ? (
          <Box textAlign="center" py={4}><CircularProgress sx={{ color: PURPLE }} /></Box>
        ) : pendientes.length === 0 ? (
          <Alert severity="info">No hay chips de incubadora pendientes de pago.</Alert>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" mb={1}>
              {pendientes.length} empleado{pendientes.length !== 1 ? "s" : ""} con chips pendientes
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#f5f3ff" }}>
                  <TableCell padding="checkbox" sx={{ bgcolor: "#f5f3ff" }}>
                    <Checkbox
                      size="small"
                      checked={todosSeleccionados}
                      indeterminate={algunoSeleccionado && !todosSeleccionados}
                      onChange={toggleTodos}
                      sx={{ color: PURPLE, "&.Mui-checked": { color: PURPLE }, "&.MuiCheckbox-indeterminate": { color: PURPLE } }}
                    />
                  </TableCell>
                  {["Empleado", "Nombre completo", "# Chips", "Total"].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, color: PURPLE, fontSize: 11 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {pendientes.map((e, i) => {
                  const checked = seleccionados.has(e.empleado);
                  return (
                    <TableRow
                      key={i}
                      hover
                      onClick={() => toggleFila(e.empleado)}
                      sx={{ cursor: "pointer", bgcolor: checked ? "#ede9fe" : i % 2 === 0 ? "#fff" : "#faf5ff" }}
                    >
                      <TableCell padding="checkbox" onClick={(ev) => ev.stopPropagation()}>
                        <Checkbox
                          size="small"
                          checked={checked}
                          onChange={() => toggleFila(e.empleado)}
                          sx={{ color: PURPLE, "&.Mui-checked": { color: PURPLE } }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{e.empleado}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{e.nombre_completo}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{e.chips_count}</TableCell>
                      <TableCell sx={{ fontSize: 12, fontWeight: 700, color: GREEN }}>
                        ${e.pago_total.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          {algunoSeleccionado ? (
            <Typography variant="body2" sx={{ color: PURPLE, fontWeight: 600 }}>
              Seleccionados: {seleccionados.size} empleado{seleccionados.size !== 1 ? "s" : ""} · {totalChipsSel} chip{totalChipsSel !== 1 ? "s" : ""} · ${totalPagoSel.toFixed(2)}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Selecciona al menos un empleado
            </Typography>
          )}
        </Box>
        <Button onClick={onClose} color="inherit" disabled={guardando}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={guardar}
          disabled={!etiqueta.trim() || !algunoSeleccionado || cargando || guardando}
          startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : <PaymentIcon />}
          sx={{ bgcolor: PURPLE, "&:hover": { bgcolor: "#6d28d9" } }}
        >
          Pagar estos
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CrearNominaIncubadoraDialog;
