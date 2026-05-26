import React, { useEffect, useMemo, useState } from "react";
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
  datos: EmpleadoCiclo[] | EmpleadoSueldo[];
}

interface EmpleadoCiclo {
  empleado: string;
  nombre_completo: string;
  usuario_ids?: number[];
  horas_extra_redondeo: number | null;
  pago: number | null;
}

interface EmpleadoSueldo {
  empleado: string;
  nombre_completo: string;
  modulo: string;
  usuario_ids: number[];
  sueldo_total: number;
}

interface FilaUnificada {
  empleado: string;
  nombre_completo: string;
  seccion: "asesor" | "encargado" | "cadena";
  sueldo: number;
  horas_extra: number | null;
  pago_he: number;
  accesorios: number;
  telefonos: number;
  chips: number;
  subtotal: number;
  total: number;
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
const CYAN   = "#0891b2";

const fmtMXN = (n: number) =>
  "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CrearNominaDialog: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const [etiqueta, setEtiqueta] = useState("");
  const [ciclos, setCiclos] = useState<CicloGuardado[]>([]);
  const [cicloId, setCicloId] = useState<number | "">("");
  const [ciclosEncargados, setCiclosEncargados] = useState<CicloGuardado[]>([]);
  const [cicloEncargadosId, setCicloEncargadosId] = useState<number | "">("");
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
    setCicloEncargadosId("");
    setError(null);
    setFechaInicioAsesores("");   setFechaFinAsesores("");   setDatosAsesores([]);
    setFechaInicioEncargados(""); setFechaFinEncargados(""); setDatosEncargados([]);
    setFechaInicioCadenas("");    setFechaFinCadenas("");    setDatosCadenas([]);

    axios
      .get<CicloGuardado[]>(`${API}/admin/ciclos-guardados?concepto=horas_extras`, { headers: authH() })
      .then(({ data }) => setCiclos(data))
      .catch(() => setCiclos([]));

    axios
      .get<CicloGuardado[]>(`${API}/admin/ciclos-guardados?concepto=sueldos_encargados`, { headers: authH() })
      .then(({ data }) => setCiclosEncargados(data))
      .catch(() => setCiclosEncargados([]));
  }, [open]);

  const cicloSel   = ciclos.find((c) => c.id === cicloId) ?? null;
  const empleadosHE: EmpleadoCiclo[] = (cicloSel?.datos ?? []) as EmpleadoCiclo[];
  const totalHE    = empleadosHE.reduce((s, e) => s + (e.pago ?? 0), 0);

  const cicloEncargadosSel = ciclosEncargados.find((c) => c.id === cicloEncargadosId) ?? null;

  const totalAsesores   = datosAsesores.reduce((s, e) => s + e.pago_total, 0);
  const totalEncargados = datosEncargados.reduce((s, e) => s + e.pago_total, 0);
  const totalCadenas    = datosCadenas.reduce((s, e) => s + e.pago_total, 0);
  const totalGeneral    = totalHE + totalAsesores + totalEncargados + totalCadenas;

  // ── Tabla unificada ────────────────────────────────────────────────────────
  const tablaUnificada = useMemo((): FilaUnificada[] => {
    const tieneCiclo = cicloSel !== null || cicloEncargadosSel !== null;
    const tieneComisiones = datosAsesores.length > 0 || datosEncargados.length > 0 || datosCadenas.length > 0;
    if (!tieneCiclo && !tieneComisiones) return [];

    const heMap = new Map<string, EmpleadoCiclo>();
    for (const e of (cicloSel?.datos ?? []) as EmpleadoCiclo[]) heMap.set(e.empleado, e);

    const sueldosEncMap = new Map<string, number>();
    for (const e of (cicloEncargadosSel?.datos ?? []) as EmpleadoSueldo[]) {
      sueldosEncMap.set(e.empleado, e.sueldo_total);
    }

    const rows: FilaUnificada[] = [];
    const seen = new Set<string>();

    const buildRow = (e: EmpleadoComision, seccion: FilaUnificada["seccion"]): FilaUnificada => {
      const he = heMap.get(e.empleado);
      const sueldo = seccion === "encargado"
        ? (sueldosEncMap.get(e.empleado) ?? 0)
        : (e.sueldo_base ?? 0);
      const pago_he = he?.pago ?? 0;
      const sub = e.comisiones_accesorios + e.comisiones_telefonos + e.comisiones_chips;
      return {
        empleado: e.empleado,
        nombre_completo: e.nombre_completo,
        seccion,
        sueldo,
        horas_extra: he?.horas_extra_redondeo ?? null,
        pago_he,
        accesorios: e.comisiones_accesorios,
        telefonos: e.comisiones_telefonos,
        chips: e.comisiones_chips,
        subtotal: sub,
        total: sueldo + pago_he + sub,
      };
    };

    const addSection = (arr: EmpleadoComision[], seccion: FilaUnificada["seccion"]) => {
      [...arr].sort((a, b) => a.empleado.localeCompare(b.empleado)).forEach((e) => {
        if (seen.has(e.empleado)) return;
        seen.add(e.empleado);
        rows.push(buildRow(e, seccion));
      });
    };

    addSection(datosAsesores,   "asesor");
    addSection(datosEncargados, "encargado");
    addSection(datosCadenas,    "cadena");

    // Empleados de H.Extras no capturados por comisiones
    for (const e of [...(cicloSel?.datos ?? []) as EmpleadoCiclo[]].sort((a, b) => a.empleado.localeCompare(b.empleado))) {
      if (seen.has(e.empleado)) continue;
      seen.add(e.empleado);
      const sueldo = sueldosEncMap.get(e.empleado) ?? 0;
      const pago_he = e.pago ?? 0;
      const seccion: FilaUnificada["seccion"] = e.empleado.toUpperCase().startsWith("C") ? "cadena" : "asesor";
      rows.push({ empleado: e.empleado, nombre_completo: e.nombre_completo, seccion, sueldo, horas_extra: e.horas_extra_redondeo, pago_he, accesorios: 0, telefonos: 0, chips: 0, subtotal: 0, total: sueldo + pago_he });
    }

    // Encargados del ciclo sueldos no capturados aún
    for (const e of [...(cicloEncargadosSel?.datos ?? []) as EmpleadoSueldo[]].sort((a, b) => a.empleado.localeCompare(b.empleado))) {
      if (seen.has(e.empleado)) continue;
      seen.add(e.empleado);
      const he = heMap.get(e.empleado);
      const pago_he = he?.pago ?? 0;
      rows.push({ empleado: e.empleado, nombre_completo: e.nombre_completo, seccion: "encargado", sueldo: e.sueldo_total, horas_extra: he?.horas_extra_redondeo ?? null, pago_he, accesorios: 0, telefonos: 0, chips: 0, subtotal: 0, total: e.sueldo_total + pago_he });
    }

    return rows;
  }, [cicloSel, cicloEncargadosSel, datosAsesores, datosEncargados, datosCadenas]);

  const totalUnificado = tablaUnificada.reduce((s, r) => s + r.total, 0);

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

      const datos = [...datosHE, ...datosAsesores, ...datosEncargados, ...datosCadenas];

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

  const seccionColor: Record<FilaUnificada["seccion"], string> = {
    asesor: BLUE,
    encargado: GREEN,
    cadena: PURPLE,
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Crear Nómina</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TextField
          label="Etiqueta"
          value={etiqueta}
          onChange={(e) => setEtiqueta(e.target.value)}
          fullWidth size="small" sx={{ mb: 2 }}
          placeholder="Ej. Nómina Mayo Semana 4"
        />

        {/* ── Sección 1: Horas Extras ── */}
        <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 2, p: 2, mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} mb={1.5} sx={{ color: ORANGE }}>
            Horas Extras
          </Typography>
          <TextField
            select label="Ciclo de Horas Extras"
            value={cicloId}
            onChange={(e) => setCicloId(Number(e.target.value))}
            fullWidth size="small" sx={{ mb: cicloSel ? 2 : 0 }}
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

        {/* ── Sección 2: Sueldos Encargados ── */}
        <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 2, p: 2, mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} mb={1.5} sx={{ color: CYAN }}>
            Sueldos Encargados
          </Typography>
          <TextField
            select label="Ciclo de Sueldos Encargados"
            value={cicloEncargadosId}
            onChange={(e) => setCicloEncargadosId(Number(e.target.value) || "")}
            fullWidth size="small"
          >
            <MenuItem value="">(Sin ciclo)</MenuItem>
            {ciclosEncargados.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.etiqueta} — {c.fecha_inicio} → {c.fecha_fin}
              </MenuItem>
            ))}
          </TextField>
          {cicloEncargadosSel && (
            <Typography variant="caption" color="text.secondary" mt={1} display="block">
              {(cicloEncargadosSel.datos as EmpleadoSueldo[]).length} encargado{(cicloEncargadosSel.datos as EmpleadoSueldo[]).length !== 1 ? "s" : ""} ·{" "}
              Total: <strong style={{ color: CYAN }}>
                ${(cicloEncargadosSel.datos as EmpleadoSueldo[]).reduce((s, e) => s + e.sueldo_total, 0).toFixed(2)}
              </strong>
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* ── Secciones 3–5: Comisiones ── */}
        <SeccionComisiones
          grupo="asesores" label="Comisiones Asesores" color={BLUE}
          fechaInicio={fechaInicioAsesores} fechaFin={fechaFinAsesores}
          onFechaInicioChange={setFechaInicioAsesores} onFechaFinChange={setFechaFinAsesores}
          onDatosCalculados={setDatosAsesores} datosCalculados={datosAsesores}
        />
        <SeccionComisiones
          grupo="encargados" label="Comisiones Encargados" color={GREEN}
          fechaInicio={fechaInicioEncargados} fechaFin={fechaFinEncargados}
          onFechaInicioChange={setFechaInicioEncargados} onFechaFinChange={setFechaFinEncargados}
          onDatosCalculados={setDatosEncargados} datosCalculados={datosEncargados}
        />
        <SeccionComisiones
          grupo="cadenas" label="Comisiones Cadenas" color={PURPLE}
          fechaInicio={fechaInicioCadenas} fechaFin={fechaFinCadenas}
          onFechaInicioChange={setFechaInicioCadenas} onFechaFinChange={setFechaFinCadenas}
          onDatosCalculados={setDatosCadenas} datosCalculados={datosCadenas}
        />

        {(cicloSel || datosAsesores.length > 0 || datosEncargados.length > 0 || datosCadenas.length > 0) && (
          <Box display="flex" justifyContent="flex-end" mt={1} pr={1}>
            <Typography variant="body2" fontWeight={700}>
              Subtotal comisiones + HE: <span style={{ color: ORANGE }}>${totalGeneral.toFixed(2)}</span>
            </Typography>
          </Box>
        )}

        {/* ── Tabla Unificada ── */}
        {tablaUnificada.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" fontWeight={700} mb={1} sx={{ color: "#1e293b" }}>
              Tabla Unificada
            </Typography>
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small" sx={{ minWidth: 900 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f8fafc" }}>
                    {["Empleado", "Nombre", "Sueldo", "H.Extra", "$Pago HE", "Accesorios", "Teléfonos", "Chips", "Subtotal", "Total"].map((h) => (
                      <TableCell key={h} align={h === "Empleado" || h === "Nombre" ? "left" : "right"} sx={{ fontWeight: 700, fontSize: 11, color: "#1e293b", whiteSpace: "nowrap", py: "5px", px: "8px" }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tablaUnificada.map((r, i) => {
                    const color = seccionColor[r.seccion];
                    const heColor = r.horas_extra == null ? undefined : r.horas_extra > 0 ? GREEN : r.horas_extra < 0 ? "#ef4444" : undefined;
                    const heLabel = r.horas_extra == null ? "—" : `${r.horas_extra > 0 ? "+" : ""}${r.horas_extra}h`;
                    return (
                      <TableRow key={i} sx={{ bgcolor: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                        <TableCell sx={{ fontSize: 11, fontWeight: 700, color, whiteSpace: "nowrap", py: "4px", px: "8px" }}>{r.empleado}</TableCell>
                        <TableCell sx={{ fontSize: 11, py: "4px", px: "8px", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.nombre_completo}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 11, py: "4px", px: "8px", whiteSpace: "nowrap" }}>{fmtMXN(r.sueldo)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 11, py: "4px", px: "8px", color: heColor, fontWeight: 600, whiteSpace: "nowrap" }}>{heLabel}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 11, py: "4px", px: "8px", whiteSpace: "nowrap" }}>{fmtMXN(r.pago_he)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 11, py: "4px", px: "8px", whiteSpace: "nowrap" }}>{fmtMXN(r.accesorios)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 11, py: "4px", px: "8px", whiteSpace: "nowrap" }}>{fmtMXN(r.telefonos)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 11, py: "4px", px: "8px", whiteSpace: "nowrap" }}>{fmtMXN(r.chips)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 11, py: "4px", px: "8px", whiteSpace: "nowrap" }}>{fmtMXN(r.subtotal)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 11, fontWeight: 700, py: "4px", px: "8px", color: GREEN, whiteSpace: "nowrap" }}>{fmtMXN(r.total)}</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                    <TableCell colSpan={9} sx={{ fontWeight: 700, fontSize: 12, py: "5px", px: "8px" }}>Total nómina</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, py: "5px", px: "8px", color: ORANGE, whiteSpace: "nowrap" }}>{fmtMXN(totalUnificado)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          </>
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
