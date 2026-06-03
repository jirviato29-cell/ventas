import { useEffect, useState } from "react";
import { Box, CircularProgress, Divider, MenuItem, Paper, Table, TableBody, TableCell, TableRow, TextField, Typography } from "@mui/material";
import { MiNominaResponse } from "../Types";
import { obtenerRolDesdeToken } from "../components/Token";

const fmt = (n: number) => `$${Number(n).toFixed(2)}`;

const MESES_CORTOS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const MESES_LARGOS = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const DIAS        = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];

const fmtFecha = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES_CORTOS[m - 1]} ${y}`;
};

// ── Semanas para grupo A (lunes–domingo, pago el miércoles siguiente) ────────
const ANCHOR_LUNES_A = new Date(2026, 3, 20); // lunes 20 Abr 2026

// ── Semanas para grupo C (lunes–domingo, misma lógica, anchor distinto) ──────
const ANCHOR_LUNES_C = new Date(2026, 3, 20); // lunes 20 Abr 2026

interface Semana {
  inicio: Date;
  fin:    Date;
  pago:   Date;
  inicioISO: string;
}

function toISO(d: Date): string {
  return d.toLocaleDateString("en-CA");
}

function fmtDia(d: Date): string {
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`;
}

function getSemanasPagadas(anchor: Date): Semana[] {
  const semanas: Semana[] = [];
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const cursor = new Date(anchor);

  while (true) {
    const inicio = new Date(cursor);
    const fin    = new Date(cursor);
    fin.setDate(fin.getDate() + 6);       // domingo
    const pago = new Date(fin);
    pago.setDate(pago.getDate() + 3);     // miércoles siguiente

    const lunesSiguiente = new Date(cursor);
    lunesSiguiente.setDate(lunesSiguiente.getDate() + 7);
    if (lunesSiguiente > hoy) break;     // semana en curso, aún no cerrada

    semanas.push({ inicio, fin, pago, inicioISO: toISO(inicio) });
    cursor.setDate(cursor.getDate() + 7);
  }

  return semanas.reverse(); // más reciente primero
}

function labelSemana(s: Semana): string {
  const año = s.fin.getFullYear();
  return `${fmtDia(s.inicio)} – ${fmtDia(s.fin)} ${año}  ·  Pago: ${fmtDia(s.pago)}`;
}

function fmtFechaPago(d: Date): string {
  return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES_LARGOS[d.getMonth()]} de ${d.getFullYear()}`;
}
// ─────────────────────────────────────────────────────────────────────────────

export default function NominaEmpleado() {
  const [data,             setData]             = useState<MiNominaResponse | null>(null);
  const [historial,        setHistorial]        = useState<any | null>(null);
  const [loading,          setLoading]          = useState(true);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  const token    = localStorage.getItem("token");
  const username = localStorage.getItem("usuario") || "";
  const esAsesor = obtenerRolDesdeToken() === "asesor";
  const esGrupoA = username.toUpperCase().startsWith("A");
  const esGrupoC = username.toUpperCase().startsWith("C");

  const semanasA = esGrupoA ? getSemanasPagadas(ANCHOR_LUNES_A) : [];
  const semanasC = esGrupoC ? getSemanasPagadas(ANCHOR_LUNES_C) : [];

  const [semanaIdx,  setSemanaIdx]  = useState(0);
  const [semanaIdxC, setSemanaIdxC] = useState(0);

  const semanaSeleccionada  = semanasA[semanaIdx]  ?? null;
  const semanaSeleccionadaC = semanasC[semanaIdxC] ?? null;

  const fetchHistorial = async (semanaInicio?: string) => {
    const headers = { Authorization: `Bearer ${token}` };
    const url = semanaInicio
      ? `https://ato-appservidor-nvxt.onrender.com/nomina/mi-historial?semana_inicio=${semanaInicio}`
      : `https://ato-appservidor-nvxt.onrender.com/nomina/mi-historial`;
    try {
      const res = await fetch(url, { headers });
      if (res.ok) {
        const json = await res.json();
        if (json) setHistorial(json);
        else setHistorial(null);
      } else {
        setHistorial(null);
      }
    } catch (_) {
      setHistorial(null);
    }
  };

  useEffect(() => {
    const cargar = async () => {
      const headers = { Authorization: `Bearer ${token}` };

      try {
        const res = await fetch(`https://ato-appservidor-nvxt.onrender.com/nomina/mi-resumen`, { headers });
        if (res.ok) setData(await res.json());
      } catch (_) {}

      if (esGrupoA && semanasA.length > 0) {
        await fetchHistorial(semanasA[0].inicioISO);
      } else if (esGrupoC && semanasC.length > 0) {
        await fetchHistorial(semanasC[0].inicioISO);
      } else {
        await fetchHistorial();
      }

      setLoading(false);
    };
    cargar();
  }, []); // eslint-disable-line

  const handleSemanaChange = async (idx: number) => {
    setSemanaIdx(idx);
    setLoadingHistorial(true);
    await fetchHistorial(semanasA[idx]?.inicioISO);
    setLoadingHistorial(false);
  };

  const handleSemanaChangeC = async (idx: number) => {
    setSemanaIdxC(idx);
    setLoadingHistorial(true);
    await fetchHistorial(semanasC[idx]?.inicioISO);
    setLoadingHistorial(false);
  };

  if (loading) return (
    <Box display="flex" justifyContent="center" mt={4}>
      <CircularProgress />
    </Box>
  );

  // Valores — prioridad historial, fallback a data
  const sueldoBase     = historial?.sueldo_base             ?? data?.sueldo?.base                  ?? 0;
  const comisAcc       = historial?.comisiones_accesorios   ?? data?.comisiones?.accesorios         ?? 0;
  const comisTel       = historial?.comisiones_telefonos    ?? data?.comisiones?.telefonos           ?? 0;
  const comisChips     = historial?.comisiones_chips        ?? data?.comisiones?.chips               ?? 0;
  const comisTotal     = historial?.comisiones_total        ?? data?.comisiones?.total               ?? 0;
  const horasExtra     = historial?.horas_extra             ?? data?.sueldo?.horas_extra             ?? 0;
  const precioHora     = historial?.precio_hora_extra       ?? 0;
  const pagoHoras      = historial?.pago_horas_extra        ?? data?.sueldo?.pago_horas_extra        ?? 0;
  const comisPlanes    = historial?.comisiones_pendientes   ?? data?.sueldo?.comisiones_pendientes   ?? 0;
  const sanciones      = historial?.sanciones               ?? data?.sueldo?.sanciones               ?? 0;
  const horasFaltantes = historial?.horas_faltantes         ?? 0;
  const descuentoFalt  = horasFaltantes * precioHora;
  const totalPagar     = historial?.total_pagar             ?? data?.total_pagar                     ?? 0;

  const nombre  = historial?.username ?? data?.empleado?.username ?? "";
  const periodo = data ? `${data.periodo.inicio} → ${data.periodo.fin}` : "";
  const rangoComisiones = (historial?.comisiones_inicio && historial?.comisiones_fin)
    ? `Comisiones del ${fmtFecha(historial.comisiones_inicio)} – ${fmtFecha(historial.comisiones_fin)}`
    : null;

  const fechaPago = esGrupoA && semanaSeleccionada
    ? fmtFechaPago(semanaSeleccionada.pago)
    : esGrupoC && semanaSeleccionadaC
      ? fmtFechaPago(semanaSeleccionadaC.pago)
      : "";

  const Fila = ({ label, value, color, bold }: {
    label: string; value: string; color?: string; bold?: boolean;
  }) => (
    <TableRow>
      <TableCell sx={{ color, fontWeight: bold ? "bold" : "normal", border: 0, py: 1 }}>
        {label}
      </TableCell>
      <TableCell align="right" sx={{ color, fontWeight: bold ? "bold" : "normal", border: 0, py: 1 }}>
        {value}
      </TableCell>
    </TableRow>
  );

  return (
    <Box maxWidth={520} mx="auto" p={2.5}>
      <Typography variant="h5" align="center" fontWeight="bold" gutterBottom>
        Mi Nómina
      </Typography>

      {nombre && (
        <Typography align="center" color="text.secondary" mb={rangoComisiones ? 0.5 : 2.5}>
          {nombre}{!esGrupoA && !esGrupoC && periodo ? ` · ${periodo}` : ""}
        </Typography>
      )}
      {rangoComisiones && (
        <Typography align="center" variant="body2" color="text.secondary" mb={2.5}>
          {rangoComisiones}
        </Typography>
      )}

      {/* Selector de semana — grupo A */}
      {esGrupoA && semanasA.length > 0 && (
        <TextField
          select fullWidth size="small" label="Semana"
          value={semanaIdx}
          onChange={(e) => handleSemanaChange(Number(e.target.value))}
          sx={{ mb: 2.5 }}
        >
          {semanasA.map((s, i) => (
            <MenuItem key={s.inicioISO} value={i}>
              {labelSemana(s)}
            </MenuItem>
          ))}
        </TextField>
      )}

      {esGrupoA && semanasA.length === 0 && (
        <Typography align="center" variant="body2" color="text.secondary" mb={2.5}>
          No hay semanas pagadas disponibles aún.
        </Typography>
      )}

      {/* Selector de semana — grupo C */}
      {esGrupoC && semanasC.length > 0 && (
        <TextField
          select fullWidth size="small" label="Semana"
          value={semanaIdxC}
          onChange={(e) => handleSemanaChangeC(Number(e.target.value))}
          sx={{ mb: 2.5 }}
        >
          {semanasC.map((s, i) => (
            <MenuItem key={s.inicioISO} value={i}>
              {labelSemana(s)}
            </MenuItem>
          ))}
        </TextField>
      )}

      {esGrupoC && semanasC.length === 0 && (
        <Typography align="center" variant="body2" color="text.secondary" mb={2.5}>
          No hay semanas pagadas disponibles aún.
        </Typography>
      )}

      {loadingHistorial ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
          <Table size="small">
            <TableBody>

              {/* 1. Sueldo base */}
              <Fila label="Sueldo base" value={fmt(sueldoBase)} />

              <TableRow><TableCell colSpan={2} sx={{ p: 0 }}><Divider /></TableCell></TableRow>

              {/* 2. Comisiones */}
              {!nombre.startsWith("C") && <Fila label="Comisiones accesorios" value={fmt(comisAcc)} />}
              {!nombre.startsWith("C") && <Fila label="Comisiones teléfonos"  value={fmt(comisTel)} />}
              <Fila label={nombre.startsWith("C") ? "Comisión por activaciones" : "Comisiones chips"} value={fmt(comisChips)} />
              <Fila label="Total comisiones" value={fmt(comisTotal)} bold />

              <TableRow><TableCell colSpan={2} sx={{ p: 0 }}><Divider /></TableCell></TableRow>

              {/* 3. Horas extra — solo asesores */}
              {esAsesor && <Fila label={`Horas extra (${horasExtra} hrs × $${precioHora})`} value={fmt(pagoHoras)} />}

              {esAsesor && <TableRow><TableCell colSpan={2} sx={{ p: 0 }}><Divider /></TableCell></TableRow>}

              {/* 4. Comisiones planes tarifarios / Bono Cheking */}
              <Fila label={nombre.startsWith("C") ? "Bono Cheking" : "Comisiones planes tarifarios"} value={fmt(comisPlanes)} />

              <TableRow><TableCell colSpan={2} sx={{ p: 0 }}><Divider /></TableCell></TableRow>

              {/* 5. Sanciones */}
              <Fila
                label="Sanciones"
                value={sanciones > 0 ? `-${fmt(sanciones)}` : fmt(0)}
                color={sanciones > 0 ? "error" : undefined}
              />

              {/* 6. Horas faltantes — solo asesores */}
              {esAsesor && (
                <Fila
                  label="Horas faltantes"
                  value={`${horasFaltantes} hrs`}
                  color={horasFaltantes > 0 ? "error" : undefined}
                />
              )}

              {/* 7. Descuento hrs faltantes — solo asesores */}
              {esAsesor && (
                <Fila
                  label="Descuento hrs faltantes"
                  value={descuentoFalt > 0 ? `-${fmt(descuentoFalt)}` : fmt(0)}
                  color={descuentoFalt > 0 ? "error" : undefined}
                />
              )}

              {/* 8. Total a pagar */}
              <TableRow sx={{ bgcolor: "#f97316" }}>
                <TableCell sx={{ color: "#fff", fontWeight: "bold", fontSize: 16, py: 1.5, border: 0 }}>
                  Total a pagar
                </TableCell>
                <TableCell align="right" sx={{ color: "#fff", fontWeight: "bold", fontSize: 16, py: 1.5, border: 0 }}>
                  {fmt(totalPagar)}
                </TableCell>
              </TableRow>

              {/* 9. Fecha de pago */}
              {fechaPago && (
                <TableRow>
                  <TableCell sx={{ color: "text.secondary", border: 0, py: 1 }}>
                    📅 Fecha de pago
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold", border: 0, py: 1 }}>
                    {fechaPago}
                  </TableCell>
                </TableRow>
              )}

            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}
