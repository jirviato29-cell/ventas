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
  Divider,
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
import SeccionComisiones, { EmpleadoComision } from "./SeccionComisiones";

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

const ORANGE = "#f97316";
const BLUE   = "#3b82f6";
const GREEN  = "#16a34a";
const PURPLE = "#9333ea";

const CrearNominaDialog: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const [etiqueta, setEtiqueta] = useState("");
  const [ciclos, setCiclos] = useState<CicloGuardado[]>([]);
  const [cicloId, setCicloId] = useState<number | "">("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fechaInicioAsesores,    setFechaInicioAsesores]    = useState("");
  const [fechaFinAsesores,       setFechaFinAsesores]       = useState("");
  const [datosAsesores,          setDatosAsesores]          = useState<EmpleadoComision[]>([]);

  const [fechaInicioEncargados,  setFechaInicioEncargados]  = useState("");
  const [fechaFinEncargados,     setFechaFinEncargados]     = useState("");
  const [datosEncargados,        setDatosEncargados]        = useState<EmpleadoComision[]>([]);

  const [fechaInicioCadenas,     setFechaInicioCadenas]     = useState("");
  const [fechaFinCadenas,        setFechaFinCadenas]        = useState("");
  const [datosCadenas,           setDatosCadenas]           = useState<EmpleadoComision[]>([]);

  useEffect(() => {
    if (!open) return;
    setEtiqueta("");
    setCicloId("");
    setError(null);
    setFechaInicioAsesores("");   setFechaFinAsesores("");   setDatosAsesores([]);
    setFechaInicioEncargados(""); setFechaFinEncargados(""); setDatosEncargados([]);
    setFechaInicioCadenas("");    setFechaFinCadenas("");    setDatosCadenas([]);
    axios
      .get<CicloGuardado[]>(`${API}/admin/ciclos-guardados?concepto=horas_extras`, { headers: authH() })
      .then(({ data }) => setCiclos(data))
      .catch(() => setCiclos([]));
  }, [open]);

  const cicloSel   = ciclos.find((c) => c.id === cicloId) ?? null;
  const empleadosHE: EmpleadoCiclo[] = cicloSel?.datos ?? [];
  const totalHE    = empleadosHE.reduce((s, e) => s + (e.pago ?? 0), 0);

  const totalAsesores   = datosAsesores.reduce((s, e) => s + e.pago_total, 0);
  const totalEncargados = datosEncargados.reduce((s, e) => s + e.pago_total, 0);
  const totalCadenas    = datosCadenas.reduce((s, e) => s + e.pago_total, 0);
  const totalGeneral    = totalHE + totalAsesores + totalEncargados + totalCadenas;

  const guardar = async () => {
    if (!etiqueta.trim()) { setError("La etiqueta no puede estar vacía"); return; }
    setGuardando(true);
    setError(null);
    try {
      const datosHE = empleadosHE.map((e) => ({
        seccion: "horas_extras",
        empleado: e.empleado,
        nombre_completo: e.nombre_completo,
        usuario_ids: e.usuario_ids ?? [],
        horas_extra_redondeo: e.horas_extra_redondeo,
        pago_horas_extras: e.pago ?? 0,
        pago_total: e.pago ?? 0,
      }));

      const datos = [
        ...datosHE,
        ...datosAsesores,
        ...datosEncargados,
        ...datosCadenas,
      ];

      await axios.post(
        `${API}/admin/nominas`,
        {
          etiqueta: etiqueta.trim(),
          ciclo_horas_extras_id: cicloId !== "" ? cicloId : undefined,
          fecha_inicio_asesores:    fechaInicioAsesores   || undefined,
          fecha_fin_asesores:       fechaFinAsesores       || undefined,
          fecha_inicio_encargados:  fechaInicioEncargados  || undefined,
          fecha_fin_encargados:     fechaFinEncargados     || undefined,
          fecha_inicio_cadenas:     fechaInicioCadenas     || undefined,
          fecha_fin_cadenas:        fechaFinCadenas        || undefined,
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

        {/* ── Sección 1: Horas Extras ── */}
        <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 2, p: 2, mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} mb={1.5} sx={{ color: ORANGE }}>
            Horas Extras
          </Typography>
          <TextField
            select
            label="Ciclo de Horas Extras"
            value={cicloId}
            onChange={(e) => setCicloId(Number(e.target.value))}
            fullWidth
            size="small"
            sx={{ mb: cicloSel ? 2 : 0 }}
          >
            <MenuItem value="">(Sin ciclo)</MenuItem>
            {ciclos.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.etiqueta} — {c.fecha_inicio} → {c.fecha_fin}
              </MenuItem>
            ))}
          </TextField>

          {cicloSel && empleadosHE.length > 0 && (
            <>
              <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
                {empleadosHE.length} empleado{empleadosHE.length !== 1 ? "s" : ""} en el ciclo
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f8fafc" }}>
                    {["Empleado", "Nombre completo", "H. Extra", "$ Pago H. Extras"].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 700, color: ORANGE, fontSize: 11 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {empleadosHE.map((e, i) => {
                    const he = e.horas_extra_redondeo;
                    const heColor = he == null ? undefined : he > 0 ? GREEN : he < 0 ? "#ef4444" : undefined;
                    const heLabel = he == null ? "—" : `${he > 0 ? "+" : ""}${he}h`;
                    return (
                      <TableRow key={i} sx={{ bgcolor: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                        <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{e.empleado}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{e.nombre_completo}</TableCell>
                        <TableCell sx={{ fontSize: 12, fontWeight: 600, color: heColor }}>{heLabel}</TableCell>
                        <TableCell sx={{ fontSize: 12, fontWeight: 700, color: (e.pago ?? 0) >= 0 ? GREEN : "#ef4444" }}>
                          {(e.pago ?? 0) >= 0 ? "+" : ""}${Math.abs(e.pago ?? 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <Box display="flex" justifyContent="flex-end" pr={1} mt={0.5}>
                <Typography variant="body2" fontWeight={700}>
                  Subtotal: <span style={{ color: ORANGE }}>${totalHE.toFixed(2)}</span>
                </Typography>
              </Box>
            </>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* ── Secciones 2–4: Comisiones ── */}
        <SeccionComisiones
          grupo="asesores"
          label="Comisiones Asesores"
          color={BLUE}
          fechaInicio={fechaInicioAsesores}
          fechaFin={fechaFinAsesores}
          onFechaInicioChange={setFechaInicioAsesores}
          onFechaFinChange={setFechaFinAsesores}
          onDatosCalculados={setDatosAsesores}
          datosCalculados={datosAsesores}
        />
        <SeccionComisiones
          grupo="encargados"
          label="Comisiones Encargados"
          color={GREEN}
          fechaInicio={fechaInicioEncargados}
          fechaFin={fechaFinEncargados}
          onFechaInicioChange={setFechaInicioEncargados}
          onFechaFinChange={setFechaFinEncargados}
          onDatosCalculados={setDatosEncargados}
          datosCalculados={datosEncargados}
        />
        <SeccionComisiones
          grupo="cadenas"
          label="Comisiones Cadenas"
          color={PURPLE}
          fechaInicio={fechaInicioCadenas}
          fechaFin={fechaFinCadenas}
          onFechaInicioChange={setFechaInicioCadenas}
          onFechaFinChange={setFechaFinCadenas}
          onDatosCalculados={setDatosCadenas}
          datosCalculados={datosCadenas}
        />

        {/* ── Total general ── */}
        {(cicloSel || datosAsesores.length > 0 || datosEncargados.length > 0 || datosCadenas.length > 0) && (
          <Box display="flex" justifyContent="flex-end" mt={1} pr={1}>
            <Typography variant="body1" fontWeight={700}>
              Total general: <span style={{ color: ORANGE }}>${totalGeneral.toFixed(2)}</span>
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={guardando}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={guardar}
          disabled={!etiqueta.trim() || cicloId === "" || guardando}
          startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          sx={{ bgcolor: ORANGE, "&:hover": { bgcolor: "#ea6b0a" } }}
        >
          Guardar Nómina
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CrearNominaDialog;
