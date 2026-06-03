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

const API = "https://ato-appservidor-nvxt.onrender.com";
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` });

const ORANGE = "#f97316";
const BLUE   = "#3b82f6";
const GREEN  = "#16a34a";
const PURPLE = "#9333ea";

const fmtMXN = (n: number) =>
  "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface FilaEditada {
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

interface Props {
  nominaId: number | null;
  onClose: () => void;
  onGuardado: () => void;
}

const toFila = (d: Record<string, unknown>): FilaEditada => ({
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

  useEffect(() => {
    if (!nominaId) return;
    setCargando(true);
    setError(null);
    axios
      .get<NominaResponse>(`${API}/admin/nominas/${nominaId}`, { headers: authH() })
      .then(({ data }) => {
        setEtiqueta(data.etiqueta);
        setFilas(data.datos.map(toFila));
      })
      .catch(() => setError("Error al cargar la nómina"))
      .finally(() => setCargando(false));
  }, [nominaId]);

  const setField = (idx: number, campo: keyof FilaEditada, valor: number) =>
    setFilas((prev) => prev.map((f, i) => i === idx ? { ...f, [campo]: valor } : f));

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
        `${API}/admin/nominas/${nominaId}/editar`,
        { etiqueta: etiqueta.trim(), datos },
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
  );
};

export default EditarNominaDialog;
