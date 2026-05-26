import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import axios from "axios";

const API = process.env.REACT_APP_API_URL ?? "";
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` });

interface CicloGuardado {
  id: number;
  etiqueta: string;
  fecha_inicio: string;
  fecha_fin: string;
  datos: EmpleadoCiclo[];
}

interface EmpleadoCiclo {
  empleado: string;
  nombre_completo: string;
  usuario_ids?: number[];
  horas_extra_redondeo: number | null;
  pago: number | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const CrearNominaDialog: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const [etiqueta, setEtiqueta] = useState("");
  const [ciclos, setCiclos] = useState<CicloGuardado[]>([]);
  const [cicloId, setCicloId] = useState<number | "">("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEtiqueta("");
    setCicloId("");
    setError(null);
    axios
      .get<CicloGuardado[]>(`${API}/admin/ciclos-guardados?concepto=horas_extras`, { headers: authH() })
      .then(({ data }) => setCiclos(data))
      .catch(() => setCiclos([]));
  }, [open]);

  const cicloSel = ciclos.find((c) => c.id === cicloId) ?? null;

  const empleados: EmpleadoCiclo[] = cicloSel?.datos ?? [];

  const totalPreview = empleados.reduce((s, e) => s + (e.pago ?? 0), 0);

  const guardar = async () => {
    if (!etiqueta.trim()) { setError("La etiqueta no puede estar vacía"); return; }
    setGuardando(true);
    setError(null);
    try {
      const datos = empleados.map((e) => ({
        empleado: e.empleado,
        nombre_completo: e.nombre_completo,
        usuario_ids: e.usuario_ids ?? [],
        pago_horas_extras: e.pago ?? 0,
        pago_total: e.pago ?? 0,
      }));
      await axios.post(
        `${API}/admin/nominas`,
        {
          etiqueta: etiqueta.trim(),
          ciclo_horas_extras_id: cicloId !== "" ? cicloId : undefined,
          datos,
        },
        { headers: authH() }
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
      <DialogTitle sx={{ fontWeight: 700 }}>Crear Nómina</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TextField
          label="Etiqueta"
          value={etiqueta}
          onChange={(e) => setEtiqueta(e.target.value)}
          fullWidth
          size="small"
          sx={{ mb: 2 }}
          placeholder="Ej. Nómina Mayo Semana 4"
        />

        <TextField
          select
          label="Ciclo de Horas Extras"
          value={cicloId}
          onChange={(e) => setCicloId(Number(e.target.value))}
          fullWidth
          size="small"
          sx={{ mb: 3 }}
        >
          <MenuItem value="">(Sin ciclo)</MenuItem>
          {ciclos.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.etiqueta} — {c.fecha_inicio} → {c.fecha_fin}
            </MenuItem>
          ))}
        </TextField>

        {cicloSel && empleados.length > 0 && (
          <>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>
              Preview — {cicloSel.etiqueta}
            </Typography>
            <Table size="small" sx={{ mb: 1 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "#f8fafc" }}>
                  {["Empleado", "Nombre completo", "H. Extra", "$ Pago H. Extras"].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, color: "#f97316", fontSize: 11 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {empleados.map((e, i) => {
                  const he = e.horas_extra_redondeo;
                  const heColor = he == null ? undefined : he > 0 ? "#16a34a" : he < 0 ? "#ef4444" : undefined;
                  const heLabel = he == null ? "—" : `${he > 0 ? "+" : ""}${he}h`;
                  return (
                  <TableRow key={i}>
                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{e.empleado}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{e.nombre_completo}</TableCell>
                    <TableCell sx={{ fontSize: 12, fontWeight: 600, color: heColor }}>{heLabel}</TableCell>
                    <TableCell sx={{ fontSize: 12, fontWeight: 700, color: (e.pago ?? 0) >= 0 ? "#16a34a" : "#ef4444" }}>
                      {(e.pago ?? 0) >= 0 ? "+" : ""}${Math.abs(e.pago ?? 0).toFixed(2)}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Box display="flex" justifyContent="flex-end" pr={1}>
              <Typography variant="body2" fontWeight={700}>
                Total: <span style={{ color: "#f97316" }}>${totalPreview.toFixed(2)}</span>
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={guardando}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={guardar}
          disabled={!etiqueta.trim() || guardando}
          startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          sx={{ bgcolor: "#f97316", "&:hover": { bgcolor: "#ea6b0a" } }}
        >
          Guardar Nómina
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CrearNominaDialog;
