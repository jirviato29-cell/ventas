import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";
import dayjs, { Dayjs } from "dayjs";
import { NominaEmpleado, NominaPeriodo } from "../Types";
import { obtenerRolDesdeToken } from "../components/Token";

// ── Utilidades de semana ──────────────────────────────────────────────────────

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const calcularLunes = (ref: Dayjs = dayjs()): Dayjs => {
  const offset = (ref.day() + 6) % 7;
  return ref.subtract(offset, "day").startOf("day");
};

const formatoSemana = (lunes: Dayjs): string => {
  const domingo = lunes.add(6, "day");
  const m1 = MESES[lunes.month()];
  const m2 = MESES[domingo.month()];
  if (lunes.month() === domingo.month())
    return `${lunes.date()} – ${domingo.date()} ${m2} ${domingo.year()}`;
  return `${lunes.date()} ${m1} – ${domingo.date()} ${m2} ${domingo.year()}`;
};

// ─────────────────────────────────────────────────────────────────────────────

type EdicionEmpleado = {
  sueldo_base: number;
  horas_extra: number;
  precio_hora_extra: number;
  sanciones: number;
  comisiones_pendientes: number;
  horas_faltantes: number;
};

const Nomina = () => {
  const token   = localStorage.getItem("token");
  const esAdmin = obtenerRolDesdeToken() === "admin";

  // ── Selector de semana ────────────────────────────────────────────────────
  const [semanaInicio, setSemanaInicio] = useState<Dayjs>(calcularLunes());

  // Fechas derivadas automáticamente (no son estado)
  const inicioA = semanaInicio.format("YYYY-MM-DD");
  const finA    = semanaInicio.add(6, "day").format("YYYY-MM-DD");
  const inicioC = semanaInicio.subtract(9, "day").format("YYYY-MM-DD");
  const finC    = semanaInicio.subtract(3, "day").format("YYYY-MM-DD");

  // ── Estado principal ──────────────────────────────────────────────────────
  const [periodo,  setPeriodo]  = useState<NominaPeriodo | null>(null);
  const [nomina,   setNomina]   = useState<NominaEmpleado[]>([]);
  const [loading,  setLoading]  = useState(false);

  // edicion: valores locales por empleado (se inicializan desde historial o desde nomina)
  const [edicion, setEdicion] = useState<Record<number, EdicionEmpleado>>({});

  const [resumenEmpleado,      setResumenEmpleado]      = useState<any>(null);
  const [tabActiva,            setTabActiva]            = useState(0);
  const [grupoSeleccionado,    setGrupoSeleccionado]    = useState<"A" | "C" | "">("");
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<NominaEmpleado | null>(null);

  // ── Historial ─────────────────────────────────────────────────────────────
  const [modoHistorial,     setModoHistorial]     = useState(false);
  const [semanasGuardadas,  setSemanasGuardadas]  = useState<string[]>([]);
  const [semanaHistorial,   setSemanaHistorial]   = useState<string>("");
  const [nominaHistorial,   setNominaHistorial]   = useState<any[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // ── Guardar nómina ────────────────────────────────────────────────────────
  const [guardando, setGuardando] = useState(false);
  const [alerta,    setAlerta]    = useState<{ tipo: "success" | "error"; texto: string } | null>(null);

  // ── Derivados ─────────────────────────────────────────────────────────────
  const asesores   = nomina.filter(e => e.username.startsWith("A")).sort((a, b) => a.username.localeCompare(b.username));
  const encargados = nomina.filter(e => e.username.startsWith("C")).sort((a, b) => a.username.localeCompare(b.username));
  const empleadosGrupo = nomina.filter(e =>
    grupoSeleccionado === "A" ? e.username.startsWith("A") :
    grupoSeleccionado === "C" ? e.username.startsWith("C") : false
  );

  // ── Helpers ───────────────────────────────────────────────────────────────

  const edicionDesdeEmpleado = (e: NominaEmpleado): EdicionEmpleado => ({
    sueldo_base:           e.sueldo_base           ?? 0,
    horas_extra:           e.horas_extra           ?? 0,
    precio_hora_extra:     e.precio_hora_extra     ?? 0,
    sanciones:             e.sanciones             ?? 0,
    comisiones_pendientes: e.comisiones_pendientes ?? 0,
    horas_faltantes:       0,
  });

  const calcularTotalFila = (e: NominaEmpleado): number => {
    const ed       = edicion[e.usuario_id];
    const sueldo   = ed?.sueldo_base           ?? e.sueldo_base           ?? 0;
    const comis    = e.comisiones || 0;
    const horas    = ed?.horas_extra           ?? e.horas_extra           ?? 0;
    const precio   = ed?.precio_hora_extra     ?? e.precio_hora_extra     ?? 0;
    const sanc     = ed?.sanciones             ?? e.sanciones             ?? 0;
    const comP     = ed?.comisiones_pendientes ?? e.comisiones_pendientes ?? 0;
    const hFalt    = ed?.horas_faltantes       ?? 0;
    return sueldo + comis + horas * precio + comP - sanc - hFalt * precio;
  };

  // ── API ───────────────────────────────────────────────────────────────────

  const fetchPeriodoActivo = async () => {
    try {
      const res = await axios.get(
        `https://ato-appservidor.onrender.com/nomina/periodo/activo`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPeriodo(res.data);
    } catch (err: any) {
      if (err.response?.status === 404) { setPeriodo(null); setNomina([]); }
      else console.error("Error al obtener periodo activo:", err);
    }
  };

  /**
   * Carga comisiones actuales y, si existe historial guardado para la semana,
   * inicializa edicion desde historial. Si no, inicializa desde valores del empleado.
   * NO persiste nada en la BD.
   */
  const fetchNominaSemana = async () => {
    setLoading(true);
    try {
      // 1. Comisiones actuales
      const resNomina = await axios.get<NominaEmpleado[]>(
        `https://ato-appservidor.onrender.com/nomina/resumen`,
        {
          params: { inicio_a: inicioA, fin_a: finA, inicio_c: inicioC, fin_c: finC },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const empleadosData = resNomina.data;
      setNomina(empleadosData);

      // 2. Intentar cargar historial guardado para esta semana
      try {
        const resHistorial = await axios.get<any[]>(
          `https://ato-appservidor.onrender.com/nomina/historial`,
          { params: { semana_inicio: inicioA }, headers: { Authorization: `Bearer ${token}` } }
        );

        if (resHistorial.data && resHistorial.data.length > 0) {
          // Construir edicion desde historial
          const nueva: Record<number, EdicionEmpleado> = {};
          for (const h of resHistorial.data) {
            nueva[h.usuario_id] = {
              sueldo_base:           h.sueldo_base           ?? 0,
              horas_extra:           h.horas_extra           ?? 0,
              precio_hora_extra:     h.precio_hora_extra     ?? 0,
              sanciones:             h.sanciones             ?? 0,
              comisiones_pendientes: h.comisiones_pendientes ?? 0,
              horas_faltantes:       h.horas_faltantes       ?? 0,
            };
          }
          // Empleados sin registro en historial usan valores actuales
          for (const e of empleadosData) {
            if (!nueva[e.usuario_id]) nueva[e.usuario_id] = edicionDesdeEmpleado(e);
          }
          setEdicion(nueva);
          return;
        }
      } catch {
        // Si el historial falla (ej. tabla vacía), continuamos con valores del empleado
      }

      // 3. Sin historial: inicializar desde valores actuales del empleado
      const nueva: Record<number, EdicionEmpleado> = {};
      for (const e of empleadosData) nueva[e.usuario_id] = edicionDesdeEmpleado(e);
      setEdicion(nueva);

    } catch (err) {
      console.error("Error al obtener resumen de nómina:", err);
      setNomina([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchResumenEmpleado = async (usuarioId: number, grupo: "A" | "C") => {
    const inicio = grupo === "A" ? inicioA : inicioC;
    const fin    = grupo === "A" ? finA    : finC;
    try {
      const res = await axios.get(
        `https://ato-appservidor.onrender.com/nomina/resumen/empleado/${usuarioId}`,
        {
          params: { fecha_inicio: inicio, fecha_fin: fin },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setResumenEmpleado(res.data);
    } catch (err) {
      console.error("Error al obtener resumen del empleado", err);
      setResumenEmpleado(null);
    }
  };

  const activarPeriodoNomina = async (inicio: Dayjs, fin: Dayjs) => {
    try {
      const res = await axios.post(
        `https://ato-appservidor.onrender.com/nomina/periodo/activar`,
        { fecha_inicio: inicio.format("YYYY-MM-DD"), fecha_fin: fin.format("YYYY-MM-DD") },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPeriodo(res.data);
      fetchNominaSemana();
    } catch (err) {
      console.error("Error al activar periodo de nómina:", err);
    }
  };

  const cerrarNomina = async () => {
    try {
      await axios.post(
        `https://ato-appservidor.onrender.com/nomina/cerrar`, {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPeriodo(null); setNomina([]);
    } catch (err) { console.error("Error al cerrar nómina:", err); }
  };

  const descargarNominaExcel = async () => {
    try {
      const res = await axios.get(
        `https://ato-appservidor.onrender.com/nomina/descargar`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { semana_inicio: inicioA },
          responseType: "blob",
        }
      );
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href  = url;
      link.setAttribute("download", `nomina_${inicioA}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) { console.error("Error al descargar nómina:", err); }
  };

  // ── Historial ─────────────────────────────────────────────────────────────

  const fetchSemanasGuardadas = async () => {
    try {
      const res = await axios.get(
        `https://ato-appservidor.onrender.com/nomina/historial/semanas`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSemanasGuardadas(res.data);
    } catch (err) { console.error("Error al cargar semanas:", err); }
  };

  const fetchHistorialSemana = async (semana: string) => {
    setCargandoHistorial(true);
    try {
      const res = await axios.get(
        `https://ato-appservidor.onrender.com/nomina/historial`,
        { params: { semana_inicio: semana }, headers: { Authorization: `Bearer ${token}` } }
      );
      setNominaHistorial(res.data);
    } catch (err) {
      console.error("Error al cargar historial:", err);
      setNominaHistorial([]);
    } finally {
      setCargandoHistorial(false);
    }
  };

  /**
   * Guarda todos los empleados (A y C) en nomina_historial para la semana actual.
   * Es el ÚNICO punto de persistencia de esta pantalla.
   */
  const guardarNomina = async () => {
    setGuardando(true);
    setAlerta(null);
    try {
      const empleados = nomina.map(e => {
        const ed     = edicion[e.usuario_id] ?? edicionDesdeEmpleado(e);
        const horas  = ed.horas_extra;
        const precio = ed.precio_hora_extra;
        const sueldo = ed.sueldo_base;
        const sanc   = ed.sanciones;
        const comP   = ed.comisiones_pendientes;
        const hFalt  = ed.horas_faltantes;

        const acc             = e.comisiones_accesorios ?? 0;
        const tel             = e.comisiones_telefonos  ?? 0;
        const chips           = e.comisiones_chips       ?? 0;
        const comisiones_total = e.comisiones ?? 0;
        const sinDesglose     = (acc + tel + chips) === 0 && comisiones_total > 0;

        return {
          usuario_id:            e.usuario_id,
          username:              e.username,
          grupo:                 e.username.startsWith("A") ? "A" : "C",
          comisiones_accesorios: acc,
          comisiones_telefonos:  tel,
          comisiones_chips:      sinDesglose ? comisiones_total : chips,
          comisiones_total,
          sueldo_base:           sueldo,
          horas_extra:           horas,
          precio_hora_extra:     precio,
          pago_horas_extra:      horas * precio,
          sanciones:             sanc,
          comisiones_pendientes: comP,
          horas_faltantes:       hFalt,
          total_pagar:           calcularTotalFila(e),
        };
      });

      const pascual = empleados.find(e => e.username === "C18-PASCUAL");
      if (pascual) console.log("[guardarNomina] payload C18-PASCUAL:", JSON.stringify(pascual, null, 2));

      await axios.post(
        `https://ato-appservidor.onrender.com/nomina/historial`,
        {
          semana_inicio:       inicioA,
          semana_fin:          finA,
          comisiones_inicio_a: inicioA,
          comisiones_fin_a:    finA,
          comisiones_inicio_c: inicioC,
          comisiones_fin_c:    finC,
          empleados,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAlerta({ tipo: "success", texto: `Nómina "${formatoSemana(semanaInicio)}" guardada correctamente` });
    } catch (err: any) {
      console.error("❌ Error al guardar nómina — status:", err?.response?.status);
      console.error("❌ Response data:", err?.response?.data);
      console.error("❌ Error completo:", err);
      const detalle = err?.response?.data?.detail;
      const msg = typeof detalle === "string"
        ? detalle
        : Array.isArray(detalle)
          ? detalle.map((d: any) => `${d.loc?.join(".")}: ${d.msg}`).join(" | ")
          : "Error al guardar la nómina";
      setAlerta({ tipo: "error", texto: msg });
    } finally {
      setGuardando(false);
    }
  };

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => { fetchPeriodoActivo(); }, []); // eslint-disable-line

  useEffect(() => {
    if (periodo) fetchNominaSemana();
  }, [periodo, semanaInicio]); // eslint-disable-line

  // ── Render helpers ────────────────────────────────────────────────────────

  const setEd = (uid: number, campo: keyof EdicionEmpleado, valor: number) =>
    setEdicion(prev => ({ ...prev, [uid]: { ...prev[uid], [campo]: valor } }));

  const renderTabla = (titulo: string, data: NominaEmpleado[], soloLectura = false, labelComPendientes = "Com. pendientes") => (
    <Paper sx={{ p: 2, mb: 4 }}>
      <Typography variant="h6" mb={2}>{titulo}</Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Empleado</TableCell>
            <TableCell align="right">Comisiones</TableCell>
            <TableCell align="right">Sueldo base</TableCell>
            <TableCell align="right">Horas extra</TableCell>
            <TableCell align="right">Pago horas</TableCell>
            <TableCell align="right">Sanciones</TableCell>
            <TableCell align="right">{labelComPendientes}</TableCell>
            <TableCell align="right">Hrs faltantes</TableCell>
            <TableCell align="right">Desc. hrs falt.</TableCell>
            <TableCell align="right">Total</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map(e => {
            const ed      = edicion[e.usuario_id];
            const hFalt   = ed?.horas_faltantes ?? 0;
            const precioH = ed?.precio_hora_extra ?? e.precio_hora_extra ?? 0;
            const descFalt = hFalt * precioH;
            return (
              <TableRow
                key={e.usuario_id}
                hover
                sx={{ cursor: "pointer" }}
                onClick={() => {
                  setEmpleadoSeleccionado(e);
                  fetchResumenEmpleado(e.usuario_id, e.username.startsWith("A") ? "A" : "C");
                }}
              >
                <TableCell>{e.username}</TableCell>

                {/* Comisiones — solo lectura */}
                <TableCell align="right">${e.comisiones}</TableCell>

                {/* Sueldo base — editable */}
                <TableCell align="right">
                  {!soloLectura ? (
                    <TextField size="small" type="number" sx={{ width: 90 }}
                      value={ed?.sueldo_base ?? e.sueldo_base ?? 0}
                      onClick={ev => ev.stopPropagation()}
                      onChange={ev => setEd(e.usuario_id, "sueldo_base", Number(ev.target.value))}
                    />
                  ) : (`$${e.sueldo_base}`)}
                </TableCell>

                {/* Horas extra — editable */}
                <TableCell align="right">
                  {!soloLectura ? (
                    <TextField size="small" type="number" sx={{ width: 80 }}
                      value={ed?.horas_extra ?? 0}
                      onClick={ev => ev.stopPropagation()}
                      onChange={ev => setEd(e.usuario_id, "horas_extra", Number(ev.target.value))}
                    />
                  ) : (e.horas_extra)}
                </TableCell>

                {/* Pago horas — calculado, solo lectura */}
                <TableCell align="right">
                  ${((ed?.horas_extra ?? e.horas_extra ?? 0) * precioH).toFixed(2)}
                </TableCell>

                {/* Sanciones — editable */}
                <TableCell align="right">
                  {!soloLectura ? (
                    <TextField size="small" type="number" sx={{ width: 80 }}
                      value={ed?.sanciones ?? e.sanciones ?? 0}
                      onClick={ev => ev.stopPropagation()}
                      onChange={ev => setEd(e.usuario_id, "sanciones", Number(ev.target.value))}
                    />
                  ) : (e.sanciones ?? 0)}
                </TableCell>

                {/* Com. pendientes — editable */}
                <TableCell align="right">
                  {!soloLectura ? (
                    <TextField size="small" type="number" sx={{ width: 80 }}
                      value={ed?.comisiones_pendientes ?? e.comisiones_pendientes ?? 0}
                      onClick={ev => ev.stopPropagation()}
                      onChange={ev => setEd(e.usuario_id, "comisiones_pendientes", Number(ev.target.value))}
                    />
                  ) : (e.comisiones_pendientes ?? 0)}
                </TableCell>

                {/* Hrs faltantes — editable */}
                <TableCell align="right">
                  {!soloLectura ? (
                    <TextField size="small" type="number" sx={{ width: 80 }}
                      value={hFalt}
                      onClick={ev => ev.stopPropagation()}
                      onChange={ev => setEd(e.usuario_id, "horas_faltantes", Number(ev.target.value))}
                    />
                  ) : hFalt}
                </TableCell>

                {/* Desc. hrs falt. — solo lectura */}
                <TableCell align="right" sx={{ color: descFalt > 0 ? "error.main" : "text.secondary" }}>
                  {descFalt > 0 ? `-$${descFalt.toFixed(2)}` : "$0.00"}
                </TableCell>

                <TableCell align="right">
                  <strong>${calcularTotalFila(e).toFixed(2)}</strong>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Paper>
  );

  const renderTablaHistorial = (titulo: string, data: any[]) => (
    <Paper sx={{ p: 2, mb: 4 }}>
      <Typography variant="h6" mb={2}>{titulo}</Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Empleado</TableCell>
            <TableCell align="right">Comisiones</TableCell>
            <TableCell align="right">Sueldo base</TableCell>
            <TableCell align="right">Horas extra</TableCell>
            <TableCell align="right">Pago horas</TableCell>
            <TableCell align="right">Sanciones</TableCell>
            <TableCell align="right">Com. pendientes</TableCell>
            <TableCell align="right">Hrs faltantes</TableCell>
            <TableCell align="right">Desc. hrs falt.</TableCell>
            <TableCell align="right">Total</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map(e => {
            const descFalt = (e.horas_faltantes ?? 0) * (e.precio_hora_extra ?? 0);
            return (
              <TableRow key={e.id ?? e.usuario_id}>
                <TableCell>{e.username}</TableCell>
                <TableCell align="right">${e.comisiones_total}</TableCell>
                <TableCell align="right">${e.sueldo_base}</TableCell>
                <TableCell align="right">{e.horas_extra}</TableCell>
                <TableCell align="right">${e.pago_horas_extra}</TableCell>
                <TableCell align="right">${e.sanciones}</TableCell>
                <TableCell align="right">${e.comisiones_pendientes}</TableCell>
                <TableCell align="right">{e.horas_faltantes ?? 0}</TableCell>
                <TableCell align="right" sx={{ color: "error.main" }}>
                  {descFalt > 0 ? `-$${descFalt.toFixed(2)}` : "-"}
                </TableCell>
                <TableCell align="right">
                  <strong>${Number(e.total_pagar).toFixed(2)}</strong>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Paper>
  );

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <Box display="flex" gap={3} alignItems="flex-start" sx={{ height: "100vh" }}>

      {/* PANEL IZQUIERDO — oculto en modo historial */}
      {!modoHistorial && (
        <Paper sx={{ p: 2, width: 300, height: "100%", overflowY: "auto", flexShrink: 0 }}>
          <Typography variant="h6" gutterBottom>Detalle del empleado</Typography>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Grupo</InputLabel>
            <Select
              value={grupoSeleccionado}
              label="Grupo"
              onChange={e => {
                setGrupoSeleccionado(e.target.value as "A" | "C");
                setEmpleadoSeleccionado(null);
                setResumenEmpleado(null);
              }}
            >
              <MenuItem value="A">Grupo A</MenuItem>
              <MenuItem value="C">Grupo C</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }} disabled={!grupoSeleccionado}>
            <InputLabel>Empleado</InputLabel>
            <Select
              value={empleadoSeleccionado?.usuario_id ?? ""}
              label="Empleado"
              onChange={e => {
                const emp = empleadosGrupo.find(x => x.usuario_id === e.target.value);
                if (emp) {
                  setEmpleadoSeleccionado(emp);
                  fetchResumenEmpleado(emp.usuario_id, emp.username.startsWith("A") ? "A" : "C");
                }
              }}
            >
              {empleadosGrupo.map(emp => (
                <MenuItem key={emp.usuario_id} value={emp.usuario_id}>{emp.username}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {!empleadoSeleccionado && (
            <Typography color="text.secondary">Selecciona un empleado</Typography>
          )}

          {empleadoSeleccionado && (
            <>
              {resumenEmpleado && (
                <>
                  <Typography variant="subtitle2" mt={2}>Comisiones</Typography>
                  <Typography>Accesorios: ${resumenEmpleado.accesorios}</Typography>
                  <Typography>Teléfonos: ${resumenEmpleado.telefonos}</Typography>
                  <Typography>Chips: ${resumenEmpleado.chips}</Typography>
                  <Typography fontWeight="bold">Total: ${resumenEmpleado.total_comisiones}</Typography>
                </>
              )}

              <Typography variant="subtitle2" mt={2} mb={1}>Ajustes de nómina</Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                Los cambios se guardan al presionar GUARDAR NÓMINA
              </Typography>

              {[
                { label: "Sueldo base",             campo: "sueldo_base"           as keyof EdicionEmpleado },
                { label: "Horas extra",             campo: "horas_extra"           as keyof EdicionEmpleado },
                { label: "Precio por hora extra",   campo: "precio_hora_extra"     as keyof EdicionEmpleado },
                { label: "Sanciones (−)",           campo: "sanciones"             as keyof EdicionEmpleado },
                { label: "Comisiones pendientes (+)",campo: "comisiones_pendientes" as keyof EdicionEmpleado },
                { label: "Horas faltantes (−)",     campo: "horas_faltantes"       as keyof EdicionEmpleado },
              ].map(({ label, campo }) => (
                <TextField
                  key={campo}
                  label={label}
                  type="number"
                  fullWidth
                  size="small"
                  sx={{ mt: 1 }}
                  value={edicion[empleadoSeleccionado.usuario_id]?.[campo] ?? 0}
                  onChange={ev =>
                    setEd(empleadoSeleccionado.usuario_id, campo, Number(ev.target.value))
                  }
                />
              ))}
            </>
          )}
        </Paper>
      )}

      {/* PANEL DERECHO */}
      <Box flex={1} sx={{ height: "100%", overflowY: "auto" }}>

        {/* ── BARRA SUPERIOR ── */}
        <Box display="flex" alignItems="center" gap={1} mb={1} flexWrap="wrap">
          <IconButton size="small" onClick={() => setSemanaInicio(s => s.subtract(7, "day"))} sx={{ fontSize: 20 }}>
            ‹
          </IconButton>

          <Typography variant="h6" sx={{ minWidth: 240, textAlign: "center" }}>
            {formatoSemana(semanaInicio)}
          </Typography>

          <IconButton size="small" onClick={() => setSemanaInicio(s => s.add(7, "day"))} sx={{ fontSize: 20 }}>
            ›
          </IconButton>

          <TextField
            type="date" size="small"
            value={semanaInicio.format("YYYY-MM-DD")}
            InputLabelProps={{ shrink: true }}
            inputProps={{ title: "Ir a la semana que contiene esta fecha" }}
            onChange={e => { if (e.target.value) setSemanaInicio(calcularLunes(dayjs(e.target.value))); }}
            sx={{ width: 160, ml: 1 }}
          />

          {esAdmin && !modoHistorial && (
            <Button variant="outlined" size="small" sx={{ ml: 2 }}
              onClick={() => { fetchSemanasGuardadas(); setModoHistorial(true); }}
            >
              Ver historial
            </Button>
          )}

          {modoHistorial && (
            <Button variant="outlined" size="small" sx={{ ml: 2 }}
              onClick={() => { setModoHistorial(false); setSemanaHistorial(""); setNominaHistorial([]); }}
            >
              ← Volver a nómina actual
            </Button>
          )}
        </Box>

        {/* Fechas calculadas */}
        {!modoHistorial && (
          <Typography variant="caption" color="text.secondary" display="block" mb={2}>
            Grupo A: {inicioA} – {finA}&nbsp;&nbsp;|&nbsp;&nbsp;Grupo C: {inicioC} – {finC}
          </Typography>
        )}

        {/* ════════════════ MODO HISTORIAL ════════════════ */}
        {modoHistorial && (
          <>
            <FormControl size="small" sx={{ minWidth: 280, mb: 3 }}>
              <InputLabel>Semana guardada</InputLabel>
              <Select
                value={semanaHistorial}
                label="Semana guardada"
                onChange={e => { setSemanaHistorial(e.target.value); fetchHistorialSemana(e.target.value); }}
              >
                {semanasGuardadas.length === 0 && (
                  <MenuItem disabled value="">Sin nóminas guardadas</MenuItem>
                )}
                {semanasGuardadas.map(s => (
                  <MenuItem key={s} value={s}>{formatoSemana(dayjs(s))}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {cargandoHistorial && <Typography color="text.secondary">Cargando...</Typography>}

            {!cargandoHistorial && nominaHistorial.length > 0 && (
              <>
                <Tabs value={tabActiva} onChange={(_, v) => setTabActiva(v)} sx={{ mb: 2 }}>
                  <Tab label="Asesores (A)" />
                  <Tab label="Encargados (C)" />
                </Tabs>
                {tabActiva === 0 && renderTablaHistorial("Asesores (A)", nominaHistorial.filter(e => e.grupo === "A"))}
                {tabActiva === 1 && renderTablaHistorial("Encargados (C)", nominaHistorial.filter(e => e.grupo === "C"))}
              </>
            )}

            {!cargandoHistorial && semanaHistorial && nominaHistorial.length === 0 && (
              <Typography color="text.secondary">No hay datos guardados para esta semana.</Typography>
            )}
          </>
        )}

        {/* ════════════════ MODO NORMAL ════════════════ */}
        {!modoHistorial && (
          <>
            {esAdmin && (
              <TextField
                type="date"
                label={periodo ? "Periodo activo" : "Inicio del periodo"}
                InputLabelProps={{ shrink: true }}
                disabled={!!periodo}
                onChange={e => activarPeriodoNomina(dayjs(e.target.value), dayjs(e.target.value).add(6, "day"))}
                sx={{ mb: 1 }}
              />
            )}

            {!periodo && (
              <Typography color="text.secondary">
                El administrador aún no ha definido el periodo de nómina
              </Typography>
            )}
            {periodo && (
              <Typography color="text.secondary" mb={1}>
                Periodo activo: {periodo.fecha_inicio} → {periodo.fecha_fin}
              </Typography>
            )}

            {periodo && !loading && (
              <>
                <Tabs value={tabActiva} onChange={(_, v) => setTabActiva(v)} sx={{ mb: 2 }}>
                  <Tab label="Asesores (A)" />
                  <Tab label="Encargados (C)" />
                </Tabs>

                {tabActiva === 0 && renderTabla("Asesores (A)", asesores, false, "Comisiones planes tarifarios")}
                {tabActiva === 1 && renderTabla("Encargados (C)", encargados)}

                <Box display="flex" gap={2} mt={2} flexWrap="wrap" alignItems="center">
                  <Button variant="contained" color="error" onClick={cerrarNomina}>
                    Cerrar nómina
                  </Button>
                  <Button variant="outlined" onClick={descargarNominaExcel}>
                    Descargar Excel
                  </Button>
                  <Button
                    variant="contained"
                    size="large"
                    disabled={guardando}
                    onClick={guardarNomina}
                    sx={{
                      bgcolor: "#F57C00",
                      "&:hover": { bgcolor: "#E65100" },
                      "&:disabled": { bgcolor: "#FFCC80", color: "#fff" },
                      color: "#fff",
                      fontWeight: "bold",
                      fontSize: 16,
                      px: 4,
                    }}
                  >
                    {guardando ? "Guardando..." : "GUARDAR NÓMINA"}
                  </Button>
                </Box>

                {alerta && (
                  <Alert severity={alerta.tipo} sx={{ mt: 2 }} onClose={() => setAlerta(null)}>
                    {alerta.texto}
                  </Alert>
                )}
              </>
            )}
          </>
        )}

      </Box>
    </Box>
  );
};

export default Nomina;
