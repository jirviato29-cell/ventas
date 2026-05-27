import React, { useEffect, useMemo, useState } from "react";
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

const API = "https://ato-appservidor.onrender.com";
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` });

const ORANGE = "#f97316";
const BLUE   = "#3b82f6";
const GREEN  = "#16a34a";
const PURPLE = "#9333ea";
const CYAN   = "#0891b2";

const fmtMXN = (n: number) =>
  "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
  modulos_sueldo?: { modulo: string; monto: number }[];
}

interface FilaUnificada {
  empleado: string;
  nombre_completo: string;
  usuario_ids: number[];
  seccion: "asesor" | "encargado" | "cadena";
  sueldo: number;
  horas_extra: number | null;
  pago_he: number;
  accesorios: number;
  telefonos: number;
  chips: number;
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

interface Manuales {
  planes: number;
  pendientes: number;
  bonos: number;
  sanciones: number;
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
  const [ciclosEncargados, setCiclosEncargados] = useState<CicloGuardado[]>([]);
  const [cicloEncargadosId, setCicloEncargadosId] = useState<number | "">("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fechaInicioAsesores,   setFechaInicioAsesores]   = useState("");
  const [fechaFinAsesores,      setFechaFinAsesores]       = useState("");
  const [datosAsesores,         setDatosAsesores]          = useState<EmpleadoComision[]>([]);

  const [fechaInicioEncargados, setFechaInicioEncargados] = useState("");
  const [fechaFinEncargados,    setFechaFinEncargados]     = useState("");
  const [datosEncargados,       setDatosEncargados]        = useState<EmpleadoComision[]>([]);

  const [fechaInicioCadenas,    setFechaInicioCadenas]    = useState("");
  const [fechaFinCadenas,       setFechaFinCadenas]        = useState("");
  const [datosCadenas,          setDatosCadenas]           = useState<EmpleadoComision[]>([]);

  // Incubadora
  const [subModalOpen,   setSubModalOpen]   = useState(false);
  const [gruposInc,      setGruposInc]      = useState<GrupoIncubadora[]>([]);
  const [cargandoChips,  setCargandoChips]  = useState(false);
  const [chipsSelIds,    setChipsSelIds]    = useState<Set<number>>(new Set());

  // Inputs manuales por empleado
  const [manuales, setManuales] = useState<Record<string, Manuales>>({});

  // Valores editados manualmente en la tabla unificada (campo → número)
  const [editados, setEditados] = useState<Record<string, Record<string, number>>>({});

  useEffect(() => {
    if (!open) return;
    setEtiqueta("");
    setCicloId("");
    setCicloEncargadosId("");
    setError(null);
    setFechaInicioAsesores("");   setFechaFinAsesores("");   setDatosAsesores([]);
    setFechaInicioEncargados(""); setFechaFinEncargados(""); setDatosEncargados([]);
    setFechaInicioCadenas("");    setFechaFinCadenas("");    setDatosCadenas([]);
    setSubModalOpen(false);
    setGruposInc([]);
    setChipsSelIds(new Set());
    setManuales({});
    setEditados({});

    axios
      .get<CicloGuardado[]>(`${API}/admin/ciclos-guardados?concepto=horas_extras`, { headers: authH() })
      .then(({ data }) => setCiclos(data))
      .catch(() => setCiclos([]));

    axios
      .get<CicloGuardado[]>(`${API}/admin/ciclos-guardados?concepto=sueldos_encargados`, { headers: authH() })
      .then(({ data }) => setCiclosEncargados(data))
      .catch(() => setCiclosEncargados([]));
  }, [open]);

  const cicloSel           = ciclos.find((c) => c.id === cicloId) ?? null;
  const empleadosHE        = (cicloSel?.datos ?? []) as EmpleadoCiclo[];
  const totalHE            = empleadosHE.reduce((s, e) => s + (e.pago ?? 0), 0);
  const cicloEncargadosSel = ciclosEncargados.find((c) => c.id === cicloEncargadosId) ?? null;

  const totalAsesores   = datosAsesores.reduce((s, e) => s + e.pago_total, 0);
  const totalEncargados = datosEncargados.reduce((s, e) => s + e.pago_total, 0);
  const totalCadenas    = datosCadenas.reduce((s, e) => s + e.pago_total, 0);
  const totalGeneral    = totalHE + totalAsesores + totalEncargados + totalCadenas;

  // Mapa incubadora: empleado → suma comisiones de chips seleccionados
  const incubadoraMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const g of gruposInc) {
      const total = g.detalle.reduce((s, c) => chipsSelIds.has(c.chip_id) ? s + c.comision : s, 0);
      if (total > 0) m[g.empleado] = total;
    }
    return m;
  }, [gruposInc, chipsSelIds]);

  const getM = (emp: string): Manuales =>
    manuales[emp] ?? { planes: 0, pendientes: 0, bonos: 0, sanciones: 0 };

  const setM = (emp: string, campo: keyof Manuales, val: number) =>
    setManuales((prev) => ({ ...prev, [emp]: { ...getM(emp), [campo]: val } }));

  const getValor = (emp: string, campo: string, original: number): number =>
    editados[emp]?.[campo] ?? original;

  const fueEditado = (emp: string, campo: string): boolean =>
    editados[emp]?.[campo] !== undefined;

  const setValor = (emp: string, campo: string, valor: number) =>
    setEditados((prev) => ({
      ...prev,
      [emp]: { ...(prev[emp] ?? {}), [campo]: valor },
    }));

  const editInputSx = (emp: string, campo: string) => ({
    "& input": { textAlign: "right" as const, fontSize: 10, padding: "2px 4px" },
    "& .MuiOutlinedInput-root": {
      borderRadius: 1,
      ...(fueEditado(emp, campo) && {
        "& fieldset": { borderColor: BLUE, borderWidth: 2 },
      }),
    },
    width: 72,
  });

  const manualInputSx = {
    "& input": { textAlign: "right" as const, fontSize: 10, padding: "2px 4px" },
    "& .MuiOutlinedInput-root": { borderRadius: 1 },
    width: 72,
  };

  // Tabla unificada base (sin manuales, sin incubadora — se computan en render)
  const tablaUnificada = useMemo((): FilaUnificada[] => {
    const tieneCiclo = cicloSel !== null || cicloEncargadosSel !== null;
    const tieneComisiones = datosAsesores.length > 0 || datosEncargados.length > 0 || datosCadenas.length > 0;
    if (!tieneCiclo && !tieneComisiones) return [];

    const heMap = new Map<string, EmpleadoCiclo>();
    for (const e of (cicloSel?.datos ?? []) as EmpleadoCiclo[]) heMap.set(e.empleado, e);

    const sueldosEncMap = new Map<string, number>();
    for (const e of (cicloEncargadosSel?.datos ?? []) as EmpleadoSueldo[])
      sueldosEncMap.set(e.empleado, e.sueldo_total);

    const rows: FilaUnificada[] = [];
    const seen = new Set<string>();

    const buildRow = (e: EmpleadoComision, seccion: FilaUnificada["seccion"]): FilaUnificada => {
      const he = heMap.get(e.empleado);
      const sueldo = seccion === "encargado" ? (sueldosEncMap.get(e.empleado) ?? 0) : (e.sueldo_base ?? 0);
      return {
        empleado: e.empleado,
        nombre_completo: e.nombre_completo,
        usuario_ids: e.usuario_ids ?? [],
        seccion,
        sueldo,
        horas_extra: he?.horas_extra_redondeo ?? null,
        pago_he: he?.pago ?? 0,
        accesorios: e.comisiones_accesorios,
        telefonos: e.comisiones_telefonos,
        chips: e.comisiones_chips,
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

    for (const e of [...(cicloSel?.datos ?? []) as EmpleadoCiclo[]].sort((a, b) => a.empleado.localeCompare(b.empleado))) {
      if (seen.has(e.empleado)) continue;
      seen.add(e.empleado);
      const sueldo = sueldosEncMap.get(e.empleado) ?? 0;
      const seccion: FilaUnificada["seccion"] = e.empleado.toUpperCase().startsWith("C") ? "cadena" : "asesor";
      rows.push({ empleado: e.empleado, nombre_completo: e.nombre_completo, usuario_ids: e.usuario_ids ?? [], seccion, sueldo, horas_extra: e.horas_extra_redondeo, pago_he: e.pago ?? 0, accesorios: 0, telefonos: 0, chips: 0 });
    }

    for (const e of [...(cicloEncargadosSel?.datos ?? []) as EmpleadoSueldo[]].sort((a, b) => a.empleado.localeCompare(b.empleado))) {
      if (seen.has(e.empleado)) continue;
      seen.add(e.empleado);
      const he = heMap.get(e.empleado);
      rows.push({ empleado: e.empleado, nombre_completo: e.nombre_completo, usuario_ids: e.usuario_ids ?? [], seccion: "encargado", sueldo: e.sueldo_total, horas_extra: he?.horas_extra_redondeo ?? null, pago_he: he?.pago ?? 0, accesorios: 0, telefonos: 0, chips: 0 });
    }

    return rows;
  }, [cicloSel, cicloEncargadosSel, datosAsesores, datosEncargados, datosCadenas]);

  const totalDeposito = useMemo(() =>
    tablaUnificada.reduce((s, r) => {
      const m         = getM(r.empleado);
      const incub     = incubadoraMap[r.empleado] ?? 0;
      const sueldo_eff  = editados[r.empleado]?.sueldo     ?? r.sueldo;
      const pago_he_eff = editados[r.empleado]?.pago_he    ?? r.pago_he;
      const acces_eff   = editados[r.empleado]?.accesorios ?? r.accesorios;
      const tel_eff     = editados[r.empleado]?.telefonos  ?? r.telefonos;
      const chips_eff   = editados[r.empleado]?.chips      ?? r.chips;
      const incub_eff   = editados[r.empleado]?.incubadora ?? incub;
      const sub = acces_eff + tel_eff + chips_eff + incub_eff + m.planes + m.pendientes + m.bonos;
      return s + (sueldo_eff + pago_he_eff + sub - m.sanciones);
    }, 0),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [tablaUnificada, manuales, incubadoraMap, editados]);

  const handleAbrirSubModal = async () => {
    setSubModalOpen(true);
    if (gruposInc.length > 0 || cargandoChips) return;
    setCargandoChips(true);
    try {
      const { data } = await axios.get<GrupoIncubadora[]>(`${API}/admin/chips-incubadora-pendientes`, { headers: authH() });
      setGruposInc(data);
    } catch {
      setGruposInc([]);
    } finally {
      setCargandoChips(false);
    }
  };

  const toggleGrupo = (g: GrupoIncubadora) => {
    setChipsSelIds((prev) => {
      const next = new Set(prev);
      const allSel = g.detalle.every((c) => prev.has(c.chip_id));
      g.detalle.forEach((c) => (allSel ? next.delete(c.chip_id) : next.add(c.chip_id)));
      return next;
    });
  };

  const guardar = async () => {
    if (!etiqueta.trim()) { setError("La etiqueta no puede estar vacía"); return; }
    if (tablaUnificada.length === 0) { setError("No hay datos en la tabla unificada"); return; }
    setGuardando(true);
    setError(null);
    try {
      const sueldosEncDetalleMap = new Map<string, { modulo: string; monto: number }[]>();
      for (const e of (cicloEncargadosSel?.datos ?? []) as EmpleadoSueldo[]) {
        if (e.modulos_sueldo) sueldosEncDetalleMap.set(e.empleado, e.modulos_sueldo);
      }

      const datos = tablaUnificada.map((r) => {
        const m           = getM(r.empleado);
        const incub       = incubadoraMap[r.empleado] ?? 0;
        const sueldo_eff  = getValor(r.empleado, "sueldo",      r.sueldo);
        const pago_he_eff = getValor(r.empleado, "pago_he",     r.pago_he);
        const acces_eff   = getValor(r.empleado, "accesorios",  r.accesorios);
        const tel_eff     = getValor(r.empleado, "telefonos",   r.telefonos);
        const chips_eff   = getValor(r.empleado, "chips",       r.chips);
        const incub_eff   = getValor(r.empleado, "incubadora",  incub);
        const he_eff      = getValor(r.empleado, "horas_extra", r.horas_extra ?? 0);
        const subtotal    = acces_eff + tel_eff + chips_eff + incub_eff + m.planes + m.pendientes + m.bonos;
        const total       = sueldo_eff + pago_he_eff + subtotal;
        const deposito    = total - m.sanciones;
        return {
          seccion: r.seccion,
          empleado: r.empleado,
          nombre_completo: r.nombre_completo,
          usuario_ids: r.usuario_ids,
          sueldo: sueldo_eff,
          horas_extra: he_eff,
          pago_he: pago_he_eff,
          accesorios: acces_eff,
          telefonos: tel_eff,
          chips: chips_eff,
          incubadora: incub_eff,
          planes: m.planes,
          pendientes: m.pendientes,
          bonos: m.bonos,
          sanciones: m.sanciones,
          subtotal,
          total,
          deposito,
          pago_total: deposito,
          sueldo_detalle: r.seccion === "encargado"
            ? (sueldosEncDetalleMap.get(r.empleado) ?? null)
            : null,
        };
      });

      await axios.post(
        `${API}/admin/nominas`,
        {
          etiqueta: etiqueta.trim(),
          ciclo_horas_extras_id: cicloId !== "" ? cicloId : undefined,
          chip_ids_incubadora: chipsSelIds.size > 0 ? Array.from(chipsSelIds) : undefined,
          fecha_inicio_asesores:   fechaInicioAsesores   || undefined,
          fecha_fin_asesores:      fechaFinAsesores       || undefined,
          fecha_inicio_encargados: fechaInicioEncargados  || undefined,
          fecha_fin_encargados:    fechaFinEncargados      || undefined,
          fecha_inicio_cadenas:    fechaInicioCadenas     || undefined,
          fecha_fin_cadenas:       fechaFinCadenas        || undefined,
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
    asesor: BLUE, encargado: GREEN, cadena: PURPLE,
  };

  const totalIncubadoraSel = Object.values(incubadoraMap).reduce((s, v) => s + v, 0);

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
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

          {/* ── Sección 3: Incubadora ── */}
          <Box sx={{ border: "1px solid #e9d5ff", borderRadius: 2, p: 2, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={1.5} sx={{ color: PURPLE }}>
              Incubadora
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={handleAbrirSubModal}
              disabled={cargandoChips}
              startIcon={cargandoChips ? <CircularProgress size={14} color="inherit" /> : undefined}
              sx={{ borderColor: PURPLE, color: PURPLE, "&:hover": { borderColor: "#7c3aed", bgcolor: "#faf5ff" } }}
            >
              {cargandoChips ? "Cargando chips…" : "Seleccionar chips a pagar"}
            </Button>
            {chipsSelIds.size > 0 && (
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                {chipsSelIds.size} chip{chipsSelIds.size !== 1 ? "s" : ""} seleccionado{chipsSelIds.size !== 1 ? "s" : ""} ·{" "}
                Total: <strong style={{ color: PURPLE }}>{fmtMXN(totalIncubadoraSel)}</strong>
              </Typography>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* ── Secciones 4–6: Comisiones ── */}
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
                    {tablaUnificada.map((r, i) => {
                      const m           = getM(r.empleado);
                      const incub       = incubadoraMap[r.empleado] ?? 0;
                      const sueldo_eff  = getValor(r.empleado, "sueldo",      r.sueldo);
                      const pago_he_eff = getValor(r.empleado, "pago_he",     r.pago_he);
                      const acces_eff   = getValor(r.empleado, "accesorios",  r.accesorios);
                      const tel_eff     = getValor(r.empleado, "telefonos",   r.telefonos);
                      const chips_eff   = getValor(r.empleado, "chips",       r.chips);
                      const incub_eff   = getValor(r.empleado, "incubadora",  incub);
                      const he_eff      = getValor(r.empleado, "horas_extra", r.horas_extra ?? 0);
                      const subtotal    = acces_eff + tel_eff + chips_eff + incub_eff + m.planes + m.pendientes + m.bonos;
                      const deposito    = sueldo_eff + pago_he_eff + subtotal - m.sanciones;
                      const color       = seccionColor[r.seccion];

                      return (
                        <TableRow key={i} sx={{ bgcolor: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                          {/* Empleado — no editable */}
                          <TableCell sx={{ fontSize: 10, fontWeight: 700, color, whiteSpace: "nowrap", py: "3px", px: "6px" }}>
                            {r.empleado}
                          </TableCell>

                          {/* Sueldo */}
                          <TableCell align="right" sx={{ py: "2px", px: "4px" }}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.3 }}>
                              <TextField type="number" size="small"
                                value={sueldo_eff}
                                onChange={(e) => setValor(r.empleado, "sueldo", Number(e.target.value))}
                                sx={editInputSx(r.empleado, "sueldo")}
                                inputProps={{ min: 0 }}
                              />
                              {fueEditado(r.empleado, "sueldo") && <span style={{ fontSize: 9 }}>✏️</span>}
                            </Box>
                          </TableCell>

                          {/* H.Extra */}
                          <TableCell align="right" sx={{ py: "2px", px: "4px" }}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.3 }}>
                              <TextField type="number" size="small"
                                value={he_eff}
                                onChange={(e) => setValor(r.empleado, "horas_extra", Number(e.target.value))}
                                sx={editInputSx(r.empleado, "horas_extra")}
                              />
                              {fueEditado(r.empleado, "horas_extra") && <span style={{ fontSize: 9 }}>✏️</span>}
                            </Box>
                          </TableCell>

                          {/* $Pago HE */}
                          <TableCell align="right" sx={{ py: "2px", px: "4px" }}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.3 }}>
                              <TextField type="number" size="small"
                                value={pago_he_eff}
                                onChange={(e) => setValor(r.empleado, "pago_he", Number(e.target.value))}
                                sx={editInputSx(r.empleado, "pago_he")}
                                inputProps={{ min: 0 }}
                              />
                              {fueEditado(r.empleado, "pago_he") && <span style={{ fontSize: 9 }}>✏️</span>}
                            </Box>
                          </TableCell>

                          {/* Accesorios */}
                          <TableCell align="right" sx={{ py: "2px", px: "4px" }}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.3 }}>
                              <TextField type="number" size="small"
                                value={acces_eff}
                                onChange={(e) => setValor(r.empleado, "accesorios", Number(e.target.value))}
                                sx={editInputSx(r.empleado, "accesorios")}
                                inputProps={{ min: 0 }}
                              />
                              {fueEditado(r.empleado, "accesorios") && <span style={{ fontSize: 9 }}>✏️</span>}
                            </Box>
                          </TableCell>

                          {/* Teléfonos */}
                          <TableCell align="right" sx={{ py: "2px", px: "4px" }}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.3 }}>
                              <TextField type="number" size="small"
                                value={tel_eff}
                                onChange={(e) => setValor(r.empleado, "telefonos", Number(e.target.value))}
                                sx={editInputSx(r.empleado, "telefonos")}
                                inputProps={{ min: 0 }}
                              />
                              {fueEditado(r.empleado, "telefonos") && <span style={{ fontSize: 9 }}>✏️</span>}
                            </Box>
                          </TableCell>

                          {/* Chips */}
                          <TableCell align="right" sx={{ py: "2px", px: "4px" }}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.3 }}>
                              <TextField type="number" size="small"
                                value={chips_eff}
                                onChange={(e) => setValor(r.empleado, "chips", Number(e.target.value))}
                                sx={editInputSx(r.empleado, "chips")}
                                inputProps={{ min: 0 }}
                              />
                              {fueEditado(r.empleado, "chips") && <span style={{ fontSize: 9 }}>✏️</span>}
                            </Box>
                          </TableCell>

                          {/* Incubadora */}
                          <TableCell align="right" sx={{ py: "2px", px: "4px" }}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.3 }}>
                              <TextField type="number" size="small"
                                value={incub_eff}
                                onChange={(e) => setValor(r.empleado, "incubadora", Number(e.target.value))}
                                sx={editInputSx(r.empleado, "incubadora")}
                                inputProps={{ min: 0 }}
                              />
                              {fueEditado(r.empleado, "incubadora") && <span style={{ fontSize: 9 }}>✏️</span>}
                            </Box>
                          </TableCell>

                          {/* Inputs manuales — sin marca visual */}
                          <TableCell align="right" sx={{ py: "2px", px: "4px" }}>
                            <TextField type="number" size="small" value={m.planes}
                              onChange={(e) => setM(r.empleado, "planes", Math.max(0, Number(e.target.value)))}
                              sx={manualInputSx} inputProps={{ min: 0 }} />
                          </TableCell>
                          <TableCell align="right" sx={{ py: "2px", px: "4px" }}>
                            <TextField type="number" size="small" value={m.pendientes}
                              onChange={(e) => setM(r.empleado, "pendientes", Math.max(0, Number(e.target.value)))}
                              sx={manualInputSx} inputProps={{ min: 0 }} />
                          </TableCell>
                          <TableCell align="right" sx={{ py: "2px", px: "4px" }}>
                            <TextField type="number" size="small" value={m.bonos}
                              onChange={(e) => setM(r.empleado, "bonos", Math.max(0, Number(e.target.value)))}
                              sx={manualInputSx} inputProps={{ min: 0 }} />
                          </TableCell>

                          {/* Subtotal — calculado, no editable */}
                          <TableCell align="right" sx={{ fontSize: 10, py: "3px", px: "6px", whiteSpace: "nowrap", fontWeight: 600 }}>
                            {fmtMXN(subtotal)}
                          </TableCell>

                          {/* Sanciones — ya editable, sin marca */}
                          <TableCell align="right" sx={{ py: "2px", px: "4px" }}>
                            <TextField type="number" size="small" value={m.sanciones}
                              onChange={(e) => setM(r.empleado, "sanciones", Math.max(0, Number(e.target.value)))}
                              sx={{
                                "& input": { textAlign: "right" as const, fontSize: 10, padding: "2px 4px", color: "#ef4444" },
                                "& .MuiOutlinedInput-root": { borderRadius: 1 },
                                width: 72,
                              }}
                              inputProps={{ min: 0 }} />
                          </TableCell>

                          {/* Depósito — calculado, no editable */}
                          <TableCell align="right" sx={{ fontSize: 10, py: "3px", px: "6px", whiteSpace: "nowrap", fontWeight: 700, color: ORANGE }}>
                            {fmtMXN(deposito)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                      <TableCell colSpan={13} sx={{ fontWeight: 700, fontSize: 11, py: "5px", px: "6px" }}>Total depósito</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, py: "5px", px: "6px", color: ORANGE, whiteSpace: "nowrap" }}>
                        {fmtMXN(totalDeposito)}
                      </TableCell>
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
            disabled={!etiqueta.trim() || tablaUnificada.length === 0 || guardando}
            startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            sx={{ bgcolor: ORANGE, "&:hover": { bgcolor: "#ea6b0a" } }}
          >
            Guardar Nómina
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Sub-modal: selección de chips de Incubadora ── */}
      <Dialog open={subModalOpen} onClose={() => setSubModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: PURPLE }}>
          Chips de Incubadora Pendientes
        </DialogTitle>
        <DialogContent dividers>
          {cargandoChips ? (
            <Box textAlign="center" py={4}><CircularProgress sx={{ color: PURPLE }} /></Box>
          ) : gruposInc.length === 0 ? (
            <Alert severity="info">No hay chips de incubadora pendientes de pago.</Alert>
          ) : (
            <>
              <Typography variant="caption" color="text.secondary" mb={1} display="block">
                {chipsSelIds.size} chip{chipsSelIds.size !== 1 ? "s" : ""} seleccionado{chipsSelIds.size !== 1 ? "s" : ""}
                {chipsSelIds.size > 0 && (
                  <> · Total: <strong style={{ color: PURPLE }}>{fmtMXN(totalIncubadoraSel)}</strong></>
                )}
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f5f3ff" }}>
                    <TableCell padding="checkbox" />
                    {["Empleado", "Nombre", "# Chips", "Total Comisión"].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 700, color: PURPLE, fontSize: 11 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {gruposInc.map((g, i) => {
                    const seleccionado  = g.detalle.length > 0 && g.detalle.every((c) => chipsSelIds.has(c.chip_id));
                    const indeterminate = !seleccionado && g.detalle.some((c) => chipsSelIds.has(c.chip_id));
                    return (
                      <TableRow key={i} sx={{ bgcolor: i % 2 === 0 ? "#fff" : "#faf5ff" }}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            size="small"
                            checked={seleccionado}
                            indeterminate={indeterminate}
                            onChange={() => toggleGrupo(g)}
                            sx={{ color: PURPLE, "&.Mui-checked": { color: PURPLE }, "&.MuiCheckbox-indeterminate": { color: PURPLE } }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{g.empleado}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{g.nombre_completo}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{g.chips_count}</TableCell>
                        <TableCell sx={{ fontSize: 12, fontWeight: 700, color: PURPLE }}>
                          {fmtMXN(g.total_chips_incubadora)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSubModalOpen(false)} color="inherit">Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => setSubModalOpen(false)}
            sx={{ bgcolor: PURPLE, "&:hover": { bgcolor: "#7c3aed" } }}
          >
            Agregar a la nómina
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CrearNominaDialog;
