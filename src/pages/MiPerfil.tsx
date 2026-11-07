import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Snackbar,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from "@mui/material";
import { Navigate } from "react-router-dom";
import axios from "axios";
import { obtenerRolDesdeToken } from "../components/Token";
import MisDatosPerfil, { SelectorEmpleado, usePersonas } from "../components/MisDatosPerfil";

const AZUL = "#0A2878";
const ROJO_FONDO = "#FDE2E2";
const ROJO_TEXTO = "#B91C1C";

// Periodos en los que no se pueden pedir vacaciones (fechas YYYY-MM-DD, ambos días incluidos).
// Se comparan como texto, así no intervienen horas ni zona horaria.
const PERIODOS_BLOQUEADOS = [
  {
    inicio: "2026-11-13",
    fin: "2026-11-16",
    motivo: "Periodo de ventas del Buen Fin: no se pueden ingresar vacaciones.",
  },
  {
    inicio: "2026-12-07",
    fin: "2027-01-07",
    motivo: "Periodo de ventas navideñas: no se pueden ingresar vacaciones.",
  },
];

const periodoBloqueado = (clave: string) =>
  PERIODOS_BLOQUEADOS.find((p) => clave >= p.inicio && clave <= p.fin);

// Meses del calendario de vacaciones (mes en base 0, como Date): el mes actual y los 5 siguientes.
// Lo ya tomado en meses pasados no sale en el calendario, solo en la tabla de periodos.
const MESES_CALENDARIO = 6;
const mesesCalendario = (hoy: string) => {
  const anio = Number(hoy.slice(0, 4));
  const mes = Number(hoy.slice(5, 7)) - 1;
  return Array.from({ length: MESES_CALENDARIO }, (_, i) => ({
    anio: anio + Math.floor((mes + i) / 12),
    mes: (mes + i) % 12,
  }));
};

const NOMBRES_MES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];

// Clave YYYY-MM-DD en hora local
const claveFecha = (anio: number, mes: number, dia: number) =>
  `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

const hoyLocal = () => new Date().toLocaleDateString("en-CA");

const MAX_DIAS_POR_BLOQUE = 6;
// Días libres mínimos entre bloques: si uno termina el 28 feb, el siguiente puede empezar el 16 mar
const DIAS_ENTRE_BLOQUES = 15;

// Suma n días a una clave YYYY-MM-DD; se calcula en UTC para que no influya la zona horaria
const sumarDias = (clave: string, n: number) => {
  const [anio, mes, dia] = clave.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + n)).toISOString().slice(0, 10);
};

// Periodos de vacaciones guardados (GET /api/vacaciones?clave=...)
type EstadoVacacion = "solicitada" | "autorizada" | "rechazada" | "tomada";

interface VacacionApi {
  id: number;
  clave: string;
  fecha_inicio: string; // "YYYY-MM-DD"
  fecha_fin: string;
  dias: number | null;
  estado: string | null;
  origen: string | null;
  nota: string | null;
}

interface EstiloVacacion {
  texto: string;
  fondo: string;
  borde: string;
  color: string;
  tachado?: boolean;
}

const ESTILO_VACACION: Record<EstadoVacacion, EstiloVacacion> = {
  tomada: { texto: "Tomada", fondo: "#DCFCE7", borde: "#16A34A", color: "#15803D" },
  autorizada: { texto: "Autorizada", fondo: "#DBEAFE", borde: "#60A5FA", color: "#1D4ED8" },
  solicitada: { texto: "Solicitada", fondo: "#FEF9C3", borde: "#EAB308", color: "#A16207" },
  rechazada: { texto: "Rechazada", fondo: "#E2E8F0", borde: "#94A3B8", color: "#475569", tachado: true },
};

// Si dos periodos caen en el mismo día, se pinta el estado más firme
const PRIORIDAD_VACACION: EstadoVacacion[] = ["tomada", "autorizada", "solicitada", "rechazada"];

const estadoVacacion = (estado: string | null): EstadoVacacion | null => {
  const e = estado?.trim().toLowerCase();
  return e && e in ESTILO_VACACION ? (e as EstadoVacacion) : null;
};

// Día YYYY-MM-DD → estado de vacaciones que le toca (ambos extremos del periodo incluidos)
const diasDeVacaciones = (periodos: VacacionApi[]) => {
  const mapa = new Map<string, EstadoVacacion>();
  periodos.forEach((p) => {
    const estado = estadoVacacion(p.estado);
    const inicio = p.fecha_inicio?.slice(0, 10);
    const fin = p.fecha_fin?.slice(0, 10);
    if (!estado || !inicio || !fin || fin < inicio) return;
    // Tope por si viene un rango mal capturado
    for (let d = inicio, n = 0; d <= fin && n < 400; d = sumarDias(d, 1), n++) {
      const previo = mapa.get(d);
      if (!previo || PRIORIDAD_VACACION.indexOf(estado) < PRIORIDAD_VACACION.indexOf(previo)) mapa.set(d, estado);
    }
  });
  return mapa;
};

// "2026-02-10" → "10/02/2026"
const fechaCorta = (clave: string) => `${clave.slice(8, 10)}/${clave.slice(5, 7)}/${clave.slice(0, 4)}`;

const textoDias = (dias: number | null) =>
  dias == null ? "—" : `${Number(dias).toLocaleString("es-MX")} ${Number(dias) === 1 ? "día" : "días"}`;

// Suma los días de los periodos con ese estado
const totalDias = (periodos: VacacionApi[], estado: EstadoVacacion) =>
  periodos.reduce((suma, p) => (estadoVacacion(p.estado) === estado ? suma + Number(p.dias ?? 0) : suma), 0);

const BORDE_TABLA = "#e2e8f0";
const celdaEncabezadoSx = { bgcolor: AZUL, color: "#fff", fontWeight: 700, fontSize: 13, borderColor: AZUL };
const celdaSx = { fontSize: 14, borderRight: `1px solid ${BORDE_TABLA}`, "&:last-of-type": { borderRight: 0 } };

// Las vacaciones se piden con anticipación: el primer día elegible es hoy + 31 días
const DIAS_ANTICIPACION = 31;
const primerDiaDisponible = (hoy: string) => sumarDias(hoy, DIAS_ANTICIPACION);

// "2026-11-19" → "19 de noviembre"
const fechaLarga = (clave: string) =>
  `${Number(clave.slice(8))} de ${NOMBRES_MES[Number(clave.slice(5, 7)) - 1].toLowerCase()}`;

interface Bloque {
  inicio: string;
  fin: string;
  dias: number;
}

// Agrupa los días seleccionados en bloques de días seguidos (un bloque puede cruzar de mes)
const agruparBloques = (seleccionadas: Set<string>): Bloque[] => {
  const bloques: Bloque[] = [];
  Array.from(seleccionadas).sort().forEach((clave) => {
    const ultimo = bloques[bloques.length - 1];
    if (ultimo && clave === sumarDias(ultimo.fin, 1)) {
      ultimo.fin = clave;
      ultimo.dias++;
    } else {
      bloques.push({ inicio: clave, fin: clave, dias: 1 });
    }
  });
  return bloques;
};

// Un bloque ocupa el mes donde empieza y el mes donde termina
const ocupaMes = (b: Bloque, mes: string) => b.inicio.slice(0, 7) === mes || b.fin.slice(0, 7) === mes;
const cruzaDeMes = (b: Bloque) => b.inicio.slice(0, 7) !== b.fin.slice(0, 7);

// "Febrero: 23 al 28 (6 días)", "Marzo: 16 (1 día)" o "Noviembre 30 a Diciembre 5 (6 días)"
const textoBloque = (b: Bloque) => {
  const nombreMes = (clave: string) => NOMBRES_MES[Number(clave.slice(5, 7)) - 1];
  const dia = (clave: string) => Number(clave.slice(8));
  if (b.dias === 1) return `${nombreMes(b.inicio)}: ${dia(b.inicio)} (1 día)`;
  if (cruzaDeMes(b)) {
    return `${nombreMes(b.inicio)} ${dia(b.inicio)} a ${nombreMes(b.fin)} ${dia(b.fin)} (${b.dias} días)`;
  }
  return `${nombreMes(b.inicio)}: ${dia(b.inicio)} al ${dia(b.fin)} (${b.dias} días)`;
};

// ¿Quedan al menos DIAS_ENTRE_BLOQUES días libres entre la fecha y el bloque?
const respetaSeparacion = (clave: string, b: Bloque) =>
  clave > sumarDias(b.fin, DIAS_ENTRE_BLOQUES) || clave < sumarDias(b.inicio, -DIAS_ENTRE_BLOQUES);

interface MesProps {
  anio: number;
  mes: number;
  hoy: string;
  primerDisponible: string;
  seleccionadas: Set<string>;
  vacaciones: Map<string, EstadoVacacion>;
  onToggle: (clave: string) => void;
}

const MesCalendario: React.FC<MesProps> = ({ anio, mes, hoy, primerDisponible, seleccionadas, vacaciones, onToggle }) => {
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  // getDay(): 0 = domingo; lo pasamos a 0 = lunes
  const huecosInicio = (new Date(anio, mes, 1).getDay() + 6) % 7;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography sx={{ fontWeight: 700, color: "#1e293b", textAlign: "center", mb: 1.5 }}>
        {NOMBRES_MES[mes]} {anio}
      </Typography>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5 }}>
        {DIAS_SEMANA.map((d, i) => (
          <Typography
            key={`h-${i}`}
            sx={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: "#64748b", pb: 0.5 }}
          >
            {d}
          </Typography>
        ))}

        {Array.from({ length: huecosInicio }).map((_, i) => (
          <Box key={`v-${i}`} />
        ))}

        {Array.from({ length: diasEnMes }).map((_, i) => {
          const dia = i + 1;
          const clave = claveFecha(anio, mes, dia);
          const pasado = clave < hoy;
          const esHoy = clave === hoy;
          // Entre hoy y el primer día disponible: gris como los pasados, pero al tocarlo sale el aviso
          const sinAnticipacion = !pasado && clave < primerDisponible;
          const noDisponible = pasado || sinAnticipacion;
          const marcado = seleccionadas.has(clave);
          // Un día no disponible queda gris aunque caiga en un periodo bloqueado
          const bloqueado = !noDisponible && !!periodoBloqueado(clave);
          // Vacaciones del empleado elegido: le ganan al gris y al rojo; solo la selección actual va encima
          const vac = marcado ? undefined : vacaciones.get(clave);
          const estiloVac = vac ? ESTILO_VACACION[vac] : null;

          return (
            <Box
              key={clave}
              component="button"
              type="button"
              disabled={pasado}
              aria-disabled={bloqueado || sinAnticipacion || undefined}
              title={estiloVac ? `Vacaciones: ${estiloVac.texto.toLowerCase()}` : undefined}
              onClick={() => onToggle(clave)}
              sx={{
                aspectRatio: "1 / 1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "6px",
                fontSize: 14,
                fontWeight: marcado || esHoy ? 700 : 500,
                fontFamily: "inherit",
                p: 0,
                cursor: pasado ? "default" : bloqueado || sinAnticipacion ? "not-allowed" : "pointer",
                border: esHoy ? `2px solid ${AZUL}` : `1px solid ${estiloVac ? estiloVac.borde : "#e2e8f0"}`,
                bgcolor: marcado
                  ? AZUL
                  : estiloVac
                  ? estiloVac.fondo
                  : bloqueado
                  ? ROJO_FONDO
                  : noDisponible
                  ? "#f1f5f9"
                  : "#fff",
                color: marcado
                  ? "#fff"
                  : estiloVac
                  ? estiloVac.color
                  : bloqueado
                  ? ROJO_TEXTO
                  : noDisponible
                  ? "#cbd5e1"
                  : "#1e293b",
                textDecoration: estiloVac?.tachado ? "line-through" : undefined,
                transition: "background-color 0.15s ease",
                // Solo con mouse: en celular el hover se queda pegado tras tocar
                "@media (hover: hover)": !noDisponible && !marcado && !bloqueado && !estiloVac
                  ? { "&:hover": { bgcolor: "rgba(10,40,120,0.08)" } }
                  : undefined,
              }}
            >
              {dia}
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
};

const MiPerfil = () => {
  const rol = obtenerRolDesdeToken();
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [aviso, setAviso] = useState<string | null>(null);
  const [pestana, setPestana] = useState(0);
  const [empleadoSel, setEmpleadoSel] = useState<string | null>(null);
  const { personas, cargando: cargandoPersonas, error: errorPersonas } = usePersonas(rol === "admin");
  const [periodos, setPeriodos] = useState<VacacionApi[]>([]);
  const [cargandoVac, setCargandoVac] = useState(false);
  const [errorVac, setErrorVac] = useState<string | null>(null);
  const hoy = hoyLocal();

  // Vacaciones del empleado elegido; sin empleado el calendario queda como siempre
  useEffect(() => {
    setPeriodos([]);
    setErrorVac(null);
    setCargandoVac(false);
    if (!empleadoSel || rol !== "admin") return;
    let vivo = true;
    setCargandoVac(true);
    axios
      .get<VacacionApi[]>("/api/vacaciones", {
        params: { clave: empleadoSel },
        headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
      })
      .then((r) => vivo && setPeriodos(r.data))
      .catch(() => vivo && setErrorVac("No se pudieron cargar las vacaciones."))
      .finally(() => vivo && setCargandoVac(false));
    return () => {
      vivo = false;
    };
  }, [empleadoSel, rol]);

  const diasVacaciones = useMemo(() => diasDeVacaciones(periodos), [periodos]);
  // Tabla: de la más reciente a la más vieja
  const periodosTabla = useMemo(
    () =>
      [...periodos].sort((a, b) =>
        a.fecha_inicio === b.fecha_inicio ? b.id - a.id : b.fecha_inicio.localeCompare(a.fecha_inicio)
      ),
    [periodos]
  );
  const primerDisponible = primerDiaDisponible(hoy);

  const toggleDia = (clave: string) => {
    if (clave < hoy) return;
    if (clave < primerDisponible) {
      setAviso(
        `Las vacaciones se piden con 30 días de anticipación. Puedes elegir a partir del ${fechaLarga(primerDisponible)}.`
      );
      return;
    }
    const periodo = periodoBloqueado(clave);
    if (periodo) {
      setAviso(periodo.motivo);
      return;
    }

    const bloques = agruparBloques(seleccionadas);
    const mes = clave.slice(0, 7);

    if (seleccionadas.has(clave)) {
      const propio = bloques.find((b) => clave >= b.inicio && clave <= b.fin)!;
      if (clave !== propio.inicio && clave !== propio.fin) {
        setAviso("Solo puedes quitar el primer o el último día para que sigan siendo seguidos.");
        return;
      }
      setSeleccionadas((prev) => {
        const nuevo = new Set(prev);
        nuevo.delete(clave);
        return nuevo;
      });
      return;
    }

    // Bloque al que el día queda pegado (por el inicio o por el final), si lo hay
    const pegado = bloques.find(
      (b) => clave === sumarDias(b.inicio, -1) || clave === sumarDias(b.fin, 1)
    );
    const otrosBloques = bloques.filter((b) => b !== pegado);
    const bloqueEnMes = otrosBloques.find((b) => ocupaMes(b, mes));

    if (bloqueEnMes) {
      // Si el mes ya tiene un bloque propio, el día debería ir pegado a él; si lo ocupa
      // un bloque que cruza de mes, o el día alarga otro bloque hacia ese mes, ya está lleno
      setAviso(
        pegado || cruzaDeMes(bloqueEnMes)
          ? "Ya tienes vacaciones en este mes. Solo se permite un periodo por mes."
          : "Tus vacaciones deben ser días seguidos."
      );
      return;
    }
    if (pegado && pegado.dias >= MAX_DIAS_POR_BLOQUE) {
      setAviso("Máximo 6 días seguidos por periodo.");
      return;
    }
    if (!otrosBloques.every((b) => respetaSeparacion(clave, b))) {
      setAviso("Debe haber al menos 15 días entre un periodo de vacaciones y otro.");
      return;
    }

    setSeleccionadas((prev) => new Set(prev).add(clave));
  };

  if (rol !== "admin") return <Navigate to="/" replace />;

  const total = seleccionadas.size;
  const bloques = agruparBloques(seleccionadas);

  return (
    <Container sx={{ mt: 4, mb: 6 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, color: "#1e293b", mb: 2 }}>
        Mi Perfil
      </Typography>

      <Tabs
        value={pestana}
        onChange={(_, v) => setPestana(v)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        TabIndicatorProps={{ sx: { bgcolor: AZUL } }}
        sx={{ mb: 3, borderBottom: "1px solid #e2e8f0" }}
      >
        {/* El azul va en el indicador y en cada Tab para ganarle al naranja del tema */}
        {["Mis datos", "Selección de vacaciones", "Mis solicitudes"].map((texto) => (
          <Tab
            key={texto}
            label={texto}
            sx={{ textTransform: "none", fontWeight: 600, "&.Mui-selected": { color: AZUL } }}
          />
        ))}
      </Tabs>

      {pestana === 0 && (
        <MisDatosPerfil
          personas={personas}
          cargando={cargandoPersonas}
          error={errorPersonas}
          seleccion={empleadoSel}
          onSeleccion={setEmpleadoSel}
        />
      )}

      {/* La selección (calendario y empleado) vive en este componente, así que no se pierde al cambiar de pestaña */}
      {pestana === 1 && (
        <>
          <SelectorEmpleado
            personas={personas}
            cargando={cargandoPersonas}
            seleccion={empleadoSel}
            onSeleccion={setEmpleadoSel}
          />
          {errorPersonas && <Alert severity="error" sx={{ mb: 2 }}>{errorPersonas}</Alert>}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
              gap: 2,
            }}
          >
            {mesesCalendario(hoy).map(({ anio, mes }) => (
              <MesCalendario
                key={`${anio}-${mes}`}
                anio={anio}
                mes={mes}
                hoy={hoy}
                primerDisponible={primerDisponible}
                seleccionadas={seleccionadas}
                vacaciones={diasVacaciones}
                onToggle={toggleDia}
              />
            ))}
          </Box>

          <Box sx={{ mt: 1.5, display: "flex", flexWrap: "wrap", gap: 2 }}>
            {[
              { texto: "Seleccionado", fondo: AZUL, borde: AZUL },
              { texto: "No disponible", fondo: "#f1f5f9", borde: "#e2e8f0" },
              { texto: "Periodo bloqueado por ventas", fondo: ROJO_FONDO, borde: ROJO_TEXTO },
              ...PRIORIDAD_VACACION.map((e) => ({
                texto: `Vacaciones ${ESTILO_VACACION[e].texto.toLowerCase()}`,
                fondo: ESTILO_VACACION[e].fondo,
                borde: ESTILO_VACACION[e].borde,
                tachado: ESTILO_VACACION[e].tachado,
              })),
            ].map(({ texto, fondo, borde, tachado }: { texto: string; fondo: string; borde: string; tachado?: boolean }) => (
              <Box key={texto} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box
                  sx={{
                    width: 14,
                    height: 14,
                    borderRadius: "3px",
                    bgcolor: fondo,
                    border: `1px solid ${borde}`,
                    // Rayita diagonal: el tachado de las rechazadas
                    backgroundImage: tachado
                      ? `linear-gradient(to top right, transparent 44%, ${borde} 44%, ${borde} 56%, transparent 56%)`
                      : undefined,
                  }}
                />
                <Typography sx={{ fontSize: 12, color: "#64748b" }}>{texto}</Typography>
              </Box>
            ))}
          </Box>

          {empleadoSel && (
            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontWeight: 700, color: "#1e293b", mb: 1 }}>Periodos de vacaciones</Typography>
              {errorVac && <Alert severity="error" sx={{ mb: 1 }}>{errorVac}</Alert>}
              {/* En celular la tabla se desliza de lado en lugar de cortarse */}
              <TableContainer
                component={Paper}
                sx={{ borderRadius: "12px", border: `1px solid ${BORDE_TABLA}`, overflowX: "auto" }}
              >
                <Table size="small" sx={{ minWidth: 560 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={celdaEncabezadoSx}>Periodo</TableCell>
                      <TableCell align="center" sx={celdaEncabezadoSx}>Días</TableCell>
                      <TableCell align="center" sx={celdaEncabezadoSx}>Estado</TableCell>
                      <TableCell sx={celdaEncabezadoSx}>Nota del Excel</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cargandoVac ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                          <CircularProgress size={24} />
                        </TableCell>
                      </TableRow>
                    ) : periodosTabla.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 3, fontSize: 14, color: "#94a3b8" }}>
                          Sin periodos registrados
                        </TableCell>
                      </TableRow>
                    ) : (
                      periodosTabla.map((p) => {
                        const e = estadoVacacion(p.estado);
                        const estilo = e ? ESTILO_VACACION[e] : null;
                        const inicio = p.fecha_inicio.slice(0, 10);
                        const fin = p.fecha_fin.slice(0, 10);
                        return (
                          <TableRow
                            key={p.id}
                            sx={{
                              "&:nth-of-type(odd)": { bgcolor: "#fff" },
                              "&:nth-of-type(even)": { bgcolor: "#f8fafc" },
                              "@media (hover: hover)": { "&:hover": { bgcolor: "rgba(10,40,120,0.05)" } },
                            }}
                          >
                            <TableCell sx={{ ...celdaSx, fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap" }}>
                              {inicio === fin ? fechaCorta(inicio) : `${fechaCorta(inicio)} – ${fechaCorta(fin)}`}
                            </TableCell>
                            <TableCell align="center" sx={{ ...celdaSx, color: "#475569", whiteSpace: "nowrap" }}>
                              {textoDias(p.dias)}
                            </TableCell>
                            <TableCell align="center" sx={celdaSx}>
                              <Chip
                                size="small"
                                label={estilo?.texto ?? p.estado ?? "Sin estado"}
                                sx={{
                                  fontWeight: 600,
                                  bgcolor: estilo?.fondo ?? "#f1f5f9",
                                  color: estilo?.color ?? "#475569",
                                  border: `1px solid ${estilo?.borde ?? BORDE_TABLA}`,
                                  textDecoration: estilo?.tachado ? "line-through" : undefined,
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ ...celdaSx, fontSize: 13, color: "#64748b" }}>
                              {p.nota?.trim() || "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                    {!cargandoVac && periodosTabla.length > 0 && (
                      <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                        <TableCell sx={{ ...celdaSx, fontWeight: 700, color: "#1e293b", borderBottom: 0 }}>
                          Totales
                        </TableCell>
                        <TableCell
                          colSpan={3}
                          sx={{ ...celdaSx, fontWeight: 700, color: "#1e293b", borderBottom: 0 }}
                        >
                          Tomados: {textoDias(totalDias(periodosTabla, "tomada"))} · Autorizados:{" "}
                          {textoDias(totalDias(periodosTabla, "autorizada"))}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          <Paper sx={{ mt: 2, p: 2, textAlign: "center" }}>
            <Typography sx={{ fontWeight: 700, color: AZUL }}>
              {total} {total === 1 ? "día seleccionado" : "días seleccionados"} en total
            </Typography>
            {bloques.map((b) => (
              <Typography key={b.inicio} sx={{ fontSize: 14, color: "#475569", mt: 0.5 }}>
                {textoBloque(b)}
              </Typography>
            ))}
            <Button
              variant="outlined"
              size="small"
              disabled={total === 0}
              onClick={() => setSeleccionadas(new Set())}
              sx={{ mt: 1.5 }}
            >
              Limpiar selección
            </Button>
          </Paper>
        </>
      )}

      {pestana === 2 && (
        <Typography sx={{ color: "#94a3b8", textAlign: "center", py: 6 }}>Próximamente</Typography>
      )}

      <Snackbar
        open={aviso !== null}
        autoHideDuration={4000}
        // Ignora clickaway: si no, tocar otro día rojo cerraría el aviso que acaba de abrir
        onClose={(_, razon) => razon !== "clickaway" && setAviso(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" variant="filled" onClose={() => setAviso(null)} sx={{ width: "100%" }}>
          {aviso}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default MiPerfil;
