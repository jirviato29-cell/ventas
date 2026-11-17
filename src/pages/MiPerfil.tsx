import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Paper,
  Radio,
  RadioGroup,
  Snackbar,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { Navigate } from "react-router-dom";
import axios from "axios";
import { obtenerRolDesdeToken } from "../components/Token";
import MisDatosPerfil, {
  authH,
  MiPerfilApi,
  Persona,
  personaDesdeMiPerfil,
  SelectorEmpleado,
  usePersonas,
} from "../components/MisDatosPerfil";
import MisSolicitudesVacaciones, { mensajeError } from "../components/MisSolicitudesVacaciones";
import PanelControlVacaciones from "../components/PanelControlVacaciones";
import { esPilotoMiPerfil } from "../data/pilotoMiPerfil";

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
// Lo ya tomado en meses pasados no sale en el calendario, solo en la tabla de periodos;
// el modo falta agrega los meses anteriores, porque una falta se captura después de ocurrir.
const MESES_CALENDARIO = 6;
const MESES_ATRAS_FALTA = 2;
const mesesCalendario = (hoy: string, mesesAtras: number) => {
  const anio = Number(hoy.slice(0, 4));
  const mes = Number(hoy.slice(5, 7)) - 1;
  return Array.from({ length: MESES_CALENDARIO + mesesAtras }, (_, i) => {
    const m = mes + i - mesesAtras;
    return { anio: anio + Math.floor(m / 12), mes: ((m % 12) + 12) % 12 };
  });
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

// ── Piloto: mismas reglas que POST /mi-perfil/vacaciones del backend ──
// "Hoy" en hora de México, como el backend (no la hora de la computadora)
const hoyMexico = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

// Ventas navideñas (7 dic – 7 ene) y Buen Fin (13 – 16 nov), cualquier año
const motivoBloqueoPiloto = (clave: string): string | undefined => {
  const mes = Number(clave.slice(5, 7));
  const dia = Number(clave.slice(8, 10));
  if ((mes === 12 && dia >= 7) || (mes === 1 && dia <= 7)) {
    return "Periodo de ventas navideñas (7 dic – 7 ene): no se pueden pedir vacaciones.";
  }
  if (mes === 11 && dia >= 13 && dia <= 16) {
    return "Periodo de ventas del Buen Fin (13 – 16 nov): no se pueden pedir vacaciones.";
  }
  return undefined;
};

const motivoBloqueoAdmin = (clave: string) => periodoBloqueado(clave)?.motivo;

const MAX_DIAS_POR_BLOQUE = 6;
// Días libres mínimos entre bloques: si uno termina el 28 feb, el siguiente puede empezar el 16 mar
const DIAS_ENTRE_BLOQUES = 15;

// Suma n días a una clave YYYY-MM-DD; se calcula en UTC para que no influya la zona horaria
const sumarDias = (clave: string, n: number) => {
  const [anio, mes, dia] = clave.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + n)).toISOString().slice(0, 10);
};

// Periodos de vacaciones guardados (GET /api/vacaciones?clave=...)
type CategoriaVacacion = "falta" | "tomada" | "autorizada" | "solicitada" | "rechazada";

interface VacacionApi {
  id: number;
  clave: string;
  fecha_inicio: string; // "YYYY-MM-DD"
  fecha_fin: string;
  dias: number | null;
  estado: string | null;
  origen: string | null;
  nota: string | null;
  tipo: string | null;
  cubre_clave: string | null;
  // null = sin revisar; true/false = aprobó/rechazó
  aprobado_rh?: boolean | null;
  aprobado_encargado?: boolean | null;
  aprobado_gerencia?: boolean | null;
}

// Saldo del año de vacaciones (GET /api/vacaciones/saldo y /api/mi-perfil/vacaciones/saldo)
interface SaldoAnioApi {
  anios: number;
  dias_corresponden: number;
  ciclo_inicio: string; // "YYYY-MM-DD", aniversario
  ciclo_fin: string;
  dias_usados: number; // autorizadas/tomadas + descuentos
  dias_solicitados_pendientes: number;
  dias_quedan: number; // corresponden - usados (sin restar las pendientes)
}

interface SaldoApi {
  clave: string;
  // null si no tiene fecha de ingreso
  actual: SaldoAnioApi | null;
  siguiente: SaldoAnioApi | null;
}

// Año de vacaciones (actual o siguiente) donde cae una fecha; null si cae fuera de los dos
const anioDeVacaciones = (saldo: SaldoApi | null, clave: string) =>
  [saldo?.actual, saldo?.siguiente].find((a) => a && clave >= a.ciclo_inicio && clave <= a.ciclo_fin) ?? null;

// Lo que todavía se puede pedir: lo que le queda menos lo que ya está solicitado
const disponiblesDe = (a: SaldoAnioApi) => a.dias_quedan - a.dias_solicitados_pendientes;

const numeroDias = (n: number) => n.toLocaleString("es-MX", { maximumFractionDigits: 1 });

const esDescuento = (p: VacacionApi) => p.tipo === "descuento";

interface EstiloVacacion {
  texto: string;
  fondo: string;
  borde: string;
  color: string;
  tachado?: boolean;
  // Borde punteado: distingue la solicitada (azul claro) de la selección (azul marino)
  punteado?: boolean;
}

// El azul sólido queda reservado para la selección actual; por eso solicitada va en azul claro
const ESTILO_VACACION: Record<CategoriaVacacion, EstiloVacacion> = {
  falta: { texto: "Falta injustificada", fondo: "#000000", borde: "#000000", color: "#FFFFFF" },
  tomada: { texto: "Tomada", fondo: "#EDE9FE", borde: "#8B5CF6", color: "#6D28D9" },
  autorizada: { texto: "Autorizada", fondo: "#DCFCE7", borde: "#16A34A", color: "#15803D" },
  solicitada: { texto: "Solicitada", fondo: "#DBEAFE", borde: "#60A5FA", color: "#1D4ED8", punteado: true },
  rechazada: { texto: "Rechazada", fondo: "#E2E8F0", borde: "#94A3B8", color: "#475569", tachado: true },
};

// Si dos periodos caen en el mismo día, se pinta el estado más firme
const PRIORIDAD_VACACION: CategoriaVacacion[] = ["falta", "tomada", "autorizada", "solicitada", "rechazada"];

// Una autorizada cuyo periodo ya terminó cuenta como tomada
const categoriaVacacion = (p: VacacionApi, hoy: string): CategoriaVacacion | null => {
  if (p.tipo === "falta_injustificada") return "falta";
  const e = p.estado?.trim().toLowerCase();
  if (e === "autorizada") return p.fecha_fin.slice(0, 10) < hoy ? "tomada" : "autorizada";
  return e === "solicitada" || e === "tomada" || e === "rechazada" ? e : null;
};

// Día YYYY-MM-DD → categoría que le toca (ambos extremos del periodo incluidos)
const diasDeVacaciones = (periodos: VacacionApi[], hoy: string) => {
  const mapa = new Map<string, CategoriaVacacion>();
  periodos.forEach((p) => {
    // Un descuento es una fila fechada en el aniversario, no días de vacaciones
    if (esDescuento(p)) return;
    const categoria = categoriaVacacion(p, hoy);
    const inicio = p.fecha_inicio?.slice(0, 10);
    const fin = p.fecha_fin?.slice(0, 10);
    if (!categoria || !inicio || !fin || fin < inicio) return;
    // Tope por si viene un rango mal capturado
    for (let d = inicio, n = 0; d <= fin && n < 400; d = sumarDias(d, 1), n++) {
      const previo = mapa.get(d);
      if (!previo || PRIORIDAD_VACACION.indexOf(categoria) < PRIORIDAD_VACACION.indexOf(previo)) {
        mapa.set(d, categoria);
      }
    }
  });
  return mapa;
};

// "2026-02-10" → "10/02/2026"
const fechaCorta = (clave: string) => `${clave.slice(8, 10)}/${clave.slice(5, 7)}/${clave.slice(0, 4)}`;

const textoPeriodo = (inicio: string, fin: string) =>
  inicio === fin ? fechaCorta(inicio) : `${fechaCorta(inicio)} – ${fechaCorta(fin)}`;

const textoDias = (dias: number | null) =>
  dias == null ? "—" : `${Number(dias).toLocaleString("es-MX")} ${Number(dias) === 1 ? "día" : "días"}`;

// Suma los días de los periodos de esa categoría
const totalDias = (periodos: VacacionApi[], categoria: CategoriaVacacion, hoy: string) =>
  periodos.reduce(
    (suma, p) => (!esDescuento(p) && categoriaVacacion(p, hoy) === categoria ? suma + Number(p.dias ?? 0) : suma),
    0
  );

const totalDescuentos = (periodos: VacacionApi[]) =>
  periodos.reduce((suma, p) => (esDescuento(p) ? suma + Number(p.dias ?? 0) : suma), 0);

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
  vacaciones: Map<string, CategoriaVacacion>;
  modoFalta: boolean;
  // Días en rojo (periodo de ventas): admin usa PERIODOS_BLOQUEADOS; el piloto, la regla de cualquier año
  motivoBloqueo: (clave: string) => string | undefined;
  onToggle: (clave: string) => void;
}

const MesCalendario: React.FC<MesProps> = ({
  anio,
  mes,
  hoy,
  primerDisponible,
  seleccionadas,
  vacaciones,
  modoFalta,
  motivoBloqueo,
  onToggle,
}) => {
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
          // En modo falta no aplica ninguna regla de vacaciones: todos los días se pueden marcar
          const pasado = !modoFalta && clave < hoy;
          const esHoy = clave === hoy;
          // Entre hoy y el primer día disponible: gris como los pasados, pero al tocarlo sale el aviso
          const sinAnticipacion = !modoFalta && !pasado && clave < primerDisponible;
          const noDisponible = pasado || sinAnticipacion;
          const marcado = seleccionadas.has(clave);
          // Un día no disponible queda gris aunque caiga en un periodo bloqueado
          const bloqueado = !modoFalta && !noDisponible && !!motivoBloqueo(clave);
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
              title={estiloVac?.texto}
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
                border: esHoy
                  ? `2px solid ${AZUL}`
                  : estiloVac?.punteado
                  ? `2px dashed ${estiloVac.borde}`
                  : `1px solid ${estiloVac ? estiloVac.borde : "#e2e8f0"}`,
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

// ── Mis solicitudes del piloto: sus periodos y la cancelación de los que aún nadie revisa ──
const NIVELES_APROBACION = [
  { nivel: "aprobado_rh", texto: "RH" },
  { nivel: "aprobado_encargado", texto: "Encargado" },
  { nivel: "aprobado_gerencia", texto: "Gerencia" },
] as const;

// Igual que el DELETE del backend: pedida desde Mi Perfil, solicitada y sin ninguna revisión
const sePuedeCancelar = (p: VacacionApi) =>
  p.origen === "mi_perfil" &&
  p.tipo !== "falta_injustificada" &&
  p.estado?.trim().toLowerCase() === "solicitada" &&
  NIVELES_APROBACION.every(({ nivel }) => p[nivel] == null);

// Mis solicitudes: lo que sigue en solicitada y lo que la persona pidió desde Mi Perfil (para ver en qué quedó)
const esSolicitudPiloto = (p: VacacionApi) =>
  p.tipo !== "falta_injustificada" && (p.estado?.trim().toLowerCase() === "solicitada" || p.origen === "mi_perfil");

const ChipAprobacion: React.FC<{ valor: boolean | null | undefined }> = ({ valor }) => {
  const estilo =
    valor == null
      ? { texto: "Pendiente", fondo: "#f1f5f9", borde: BORDE_TABLA, color: "#64748b" }
      : valor
      ? { texto: "Aprobó", fondo: "#DCFCE7", borde: "#16A34A", color: "#15803D" }
      : { texto: "Rechazó", fondo: ROJO_FONDO, borde: ROJO_TEXTO, color: ROJO_TEXTO };
  return (
    <Chip
      size="small"
      label={estilo.texto}
      sx={{ fontWeight: 600, bgcolor: estilo.fondo, color: estilo.color, border: `1px solid ${estilo.borde}` }}
    />
  );
};

interface SolicitudesPilotoProps {
  periodos: VacacionApi[];
  cargando: boolean;
  error: string | null;
  hoy: string;
  onCancelado: () => void;
}

const SolicitudesPiloto: React.FC<SolicitudesPilotoProps> = ({ periodos, cargando, error, hoy, onCancelado }) => {
  const [porCancelar, setPorCancelar] = useState<VacacionApi | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [errorCancelar, setErrorCancelar] = useState<string | null>(null);
  const solicitudes = useMemo(() => periodos.filter(esSolicitudPiloto), [periodos]);

  const abrirCancelar = (p: VacacionApi) => {
    setErrorCancelar(null);
    setPorCancelar(p);
  };

  const cancelar = async () => {
    if (!porCancelar || cancelando) return;
    setCancelando(true);
    setErrorCancelar(null);
    try {
      await axios.delete(`/api/mi-perfil/vacaciones/${porCancelar.id}`, { headers: authH() });
      setPorCancelar(null);
      onCancelado();
    } catch (e) {
      setErrorCancelar(mensajeError(e, "No se pudo cancelar la solicitud."));
    } finally {
      setCancelando(false);
    }
  };

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {/* En celular la tabla se desliza de lado en lugar de cortarse */}
      <TableContainer
        component={Paper}
        sx={{ borderRadius: "12px", border: `1px solid ${BORDE_TABLA}`, overflowX: "auto" }}
      >
        <Table size="small" sx={{ minWidth: 860 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={celdaEncabezadoSx}>Periodo</TableCell>
              <TableCell align="center" sx={celdaEncabezadoSx}>Días</TableCell>
              <TableCell align="center" sx={celdaEncabezadoSx}>Estado</TableCell>
              <TableCell align="center" sx={celdaEncabezadoSx}>Cubre</TableCell>
              {NIVELES_APROBACION.map(({ nivel, texto }) => (
                <TableCell key={nivel} align="center" sx={celdaEncabezadoSx}>{texto}</TableCell>
              ))}
              <TableCell sx={celdaEncabezadoSx} aria-label="Acciones" />
            </TableRow>
          </TableHead>
          <TableBody>
            {cargando ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : solicitudes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3, fontSize: 14, color: "#94a3b8" }}>
                  Todavía no tienes solicitudes de vacaciones
                </TableCell>
              </TableRow>
            ) : (
              solicitudes.map((p) => {
                const categoria = categoriaVacacion(p, hoy);
                const estilo = categoria ? ESTILO_VACACION[categoria] : null;
                return (
                  <TableRow
                    key={p.id}
                    sx={{
                      "&:nth-of-type(odd)": { bgcolor: "#fff" },
                      "&:nth-of-type(even)": { bgcolor: "#f8fafc" },
                    }}
                  >
                    <TableCell sx={{ ...celdaSx, fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap" }}>
                      {textoPeriodo(p.fecha_inicio.slice(0, 10), p.fecha_fin.slice(0, 10))}
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
                    <TableCell align="center" sx={{ ...celdaSx, color: "#475569", whiteSpace: "nowrap" }}>
                      {p.cubre_clave?.trim() || "—"}
                    </TableCell>
                    {NIVELES_APROBACION.map(({ nivel }) => (
                      <TableCell key={nivel} align="center" sx={celdaSx}>
                        <ChipAprobacion valor={p[nivel]} />
                      </TableCell>
                    ))}
                    <TableCell align="center" sx={celdaSx}>
                      {sePuedeCancelar(p) && (
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          onClick={() => abrirCancelar(p)}
                          sx={{ whiteSpace: "nowrap" }}
                        >
                          Cancelar solicitud
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={porCancelar !== null} onClose={() => !cancelando && setPorCancelar(null)} fullWidth maxWidth="xs">
        <DialogTitle>Cancelar solicitud</DialogTitle>
        <DialogContent>
          {porCancelar && (
            <Typography sx={{ color: "#475569" }}>
              ¿Cancelar tu solicitud de vacaciones del{" "}
              {textoPeriodo(porCancelar.fecha_inicio.slice(0, 10), porCancelar.fecha_fin.slice(0, 10))} (
              {textoDias(porCancelar.dias)})?
            </Typography>
          )}
          {errorCancelar && <Alert severity="error" sx={{ mt: 2 }}>{errorCancelar}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button disabled={cancelando} onClick={() => setPorCancelar(null)}>
            No, regresar
          </Button>
          <Button variant="contained" color="error" disabled={cancelando} onClick={cancelar}>
            {cancelando ? "Cancelando…" : "Sí, cancelar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

type EstadoPiloto = "cargando" | "ok" | "rechazado" | "error";

const MiPerfil = () => {
  const rol = obtenerRolDesdeToken();
  const esAdmin = rol === "admin";
  // Piloto: no admin y con su username en PILOTO_MI_PERFIL. Solo ve SUS datos y solo usa /api/mi-perfil/*.
  const pilotoLocal = !esAdmin && esPilotoMiPerfil(localStorage.getItem("usuario"));
  const [miPersona, setMiPersona] = useState<Persona | null>(null);
  const [estadoPiloto, setEstadoPiloto] = useState<EstadoPiloto>("cargando");
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [aviso, setAviso] = useState<string | null>(null);
  const [pestana, setPestana] = useState(0);
  const [empleadoSel, setEmpleadoSel] = useState<string | null>(null);
  const { personas, cargando: cargandoPersonas, error: errorPersonas } = usePersonas(rol === "admin");
  const [periodos, setPeriodos] = useState<VacacionApi[]>([]);
  const [cargandoVac, setCargandoVac] = useState(false);
  const [errorVac, setErrorVac] = useState<string | null>(null);
  const [recargaVac, setRecargaVac] = useState(0);
  const [modoFalta, setModoFalta] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [erroresRegistro, setErroresRegistro] = useState<string[]>([]);
  const [porBorrar, setPorBorrar] = useState<VacacionApi | null>(null);
  // Diálogo de solicitud del piloto: quién cubre es opcional (si no, admin lo asigna)
  const [cubrePiloto, setCubrePiloto] = useState("");
  const [exito, setExito] = useState<string | null>(null);
  // Saldo del año de vacaciones actual y del siguiente de la persona elegida (admin) o propia (piloto)
  const [saldo, setSaldo] = useState<SaldoApi | null>(null);
  const [cargandoSaldo, setCargandoSaldo] = useState(false);
  const [errorSaldo, setErrorSaldo] = useState<string | null>(null);
  // Diálogo de REGISTRAR DESCUENTO (solo admin)
  const [descuentoAbierto, setDescuentoAbierto] = useState(false);
  const [anioDescuento, setAnioDescuento] = useState<"actual" | "siguiente">("actual");
  const [diasDescuento, setDiasDescuento] = useState("");
  const [notaDescuento, setNotaDescuento] = useState("");
  const [errorDescuento, setErrorDescuento] = useState<string | null>(null);
  // Candado inmediato contra doble clic (el estado tarda un render en deshabilitar el botón)
  const enviandoRef = useRef(false);
  // El admin sigue con la hora de su computadora; el piloto usa la de México, como el backend
  const hoy = esAdmin ? hoyLocal() : hoyMexico();
  const miClave = miPersona?.clave ?? null;

  // Piloto: sus datos salen del token; se vuelve a revisar la lista con el username que regresa el backend
  useEffect(() => {
    if (!pilotoLocal) return;
    let vivo = true;
    setEstadoPiloto("cargando");
    axios
      .get<MiPerfilApi>("/api/mi-perfil", { headers: authH() })
      .then((r) => {
        if (!vivo) return;
        if (!esPilotoMiPerfil(r.data.username)) {
          setEstadoPiloto("rechazado");
          return;
        }
        setMiPersona(personaDesdeMiPerfil(r.data));
        setEstadoPiloto("ok");
      })
      .catch(() => vivo && setEstadoPiloto("error"));
    return () => {
      vivo = false;
    };
  }, [pilotoLocal]);

  // Vacaciones: admin las del empleado elegido; piloto solo las suyas. Sin persona el calendario queda como siempre.
  useEffect(() => {
    setPeriodos([]);
    setErrorVac(null);
    setCargandoVac(false);
    const consulta = esAdmin
      ? empleadoSel
        ? { url: "/api/vacaciones", params: { clave: empleadoSel } }
        : null
      : miClave
      ? { url: "/api/mi-perfil/vacaciones", params: undefined }
      : null;
    if (!consulta) return;
    let vivo = true;
    setCargandoVac(true);
    axios
      .get<VacacionApi[]>(consulta.url, { params: consulta.params, headers: authH() })
      .then((r) => vivo && setPeriodos(r.data))
      .catch(() => vivo && setErrorVac("No se pudieron cargar las vacaciones."))
      .finally(() => vivo && setCargandoVac(false));
    return () => {
      vivo = false;
    };
  }, [empleadoSel, esAdmin, miClave, recargaVac]);

  // Saldo: se vuelve a pedir con los periodos (al guardar, borrar o registrar un descuento)
  useEffect(() => {
    setSaldo(null);
    setErrorSaldo(null);
    setCargandoSaldo(false);
    const consulta = esAdmin
      ? empleadoSel
        ? { url: "/api/vacaciones/saldo", params: { clave: empleadoSel } }
        : null
      : miClave
      ? { url: "/api/mi-perfil/vacaciones/saldo", params: undefined }
      : null;
    if (!consulta) return;
    let vivo = true;
    setCargandoSaldo(true);
    axios
      .get<SaldoApi>(consulta.url, { params: consulta.params, headers: authH() })
      .then((r) => vivo && setSaldo(r.data))
      .catch(() => vivo && setErrorSaldo("No se pudo cargar el saldo de vacaciones."))
      .finally(() => vivo && setCargandoSaldo(false));
    return () => {
      vivo = false;
    };
  }, [empleadoSel, esAdmin, miClave, recargaVac]);

  const diasVacaciones = useMemo(() => diasDeVacaciones(periodos, hoy), [periodos, hoy]);
  // Tabla: de la más reciente a la más vieja
  const periodosTabla = useMemo(
    () =>
      [...periodos].sort((a, b) =>
        a.fecha_inicio === b.fecha_inicio ? b.id - a.id : b.fecha_inicio.localeCompare(a.fecha_inicio)
      ),
    [periodos]
  );
  // Hoy + 31 para los dos; el backend del piloto usa el mismo número
  const primerDisponible = primerDiaDisponible(hoy);
  // Días en rojo: admin con PERIODOS_BLOQUEADOS (como siempre); piloto con la regla de cualquier año del backend
  const motivoBloqueo = esAdmin ? motivoBloqueoAdmin : motivoBloqueoPiloto;

  // Los días marcados son de una persona y un modo: al cambiar cualquiera se empieza de cero
  const cambiarEmpleado = (clave: string | null) => {
    setEmpleadoSel(clave);
    setSeleccionadas(new Set());
    setModoFalta(false);
  };

  const cambiarModoFalta = (activo: boolean) => {
    setModoFalta(activo);
    setSeleccionadas(new Set());
  };

  const abrirConfirmacion = () => {
    setNota("");
    setCubrePiloto("");
    setErroresRegistro([]);
    setConfirmando(true);
  };

  // Un POST por bloque de días seguidos: un rango único cubriría también los días de en medio
  // Admin registra para el empleado elegido; el piloto solicita para sí mismo (la clave sale del token)
  const guardarRegistro = async () => {
    if (esAdmin ? !empleadoSel : !miClave) return;
    if (enviandoRef.current) return;
    enviandoRef.current = true;
    const notaLimpia = nota.trim();
    const cubre = cubrePiloto.trim().toUpperCase();
    const fallidos: Bloque[] = [];
    const errores: string[] = [];
    const bloquesPorGuardar = agruparBloques(seleccionadas);

    setGuardando(true);
    setErroresRegistro([]);
    for (const b of bloquesPorGuardar) {
      try {
        if (esAdmin) {
          await axios.post(
            "/api/vacaciones",
            {
              clave: empleadoSel,
              fecha_inicio: b.inicio,
              fecha_fin: b.fin,
              dias: b.dias,
              tipo: modoFalta ? "falta_injustificada" : "vacaciones",
              nota: notaLimpia || undefined,
            },
            { headers: authH() }
          );
        } else {
          await axios.post(
            "/api/mi-perfil/vacaciones",
            {
              fecha_inicio: b.inicio,
              fecha_fin: b.fin,
              dias: b.dias,
              cubre_clave: cubre || undefined,
              nota: notaLimpia || undefined,
            },
            { headers: authH() }
          );
        }
      } catch (e) {
        fallidos.push(b);
        errores.push(`${textoBloque(b)}: ${mensajeError(e, "No se pudo guardar.")}`);
      }
    }
    setGuardando(false);
    enviandoRef.current = false;

    if (fallidos.length < bloquesPorGuardar.length) setRecargaVac((n) => n + 1);
    if (fallidos.length === 0) {
      setConfirmando(false);
      cambiarModoFalta(false);
      if (!esAdmin) {
        // Ya guardadas: se ven en "Mis solicitudes" con sus aprobaciones
        setPestana(2);
        setExito(
          bloquesPorGuardar.length === 1
            ? "Tu solicitud de vacaciones se envió."
            : "Tus solicitudes de vacaciones se enviaron."
        );
      }
      return;
    }
    // Solo quedan marcados los bloques que fallaron, para no duplicar los ya guardados
    const pendientes = new Set<string>();
    fallidos.forEach((b) => {
      for (let d = b.inicio; d <= b.fin; d = sumarDias(d, 1)) pendientes.add(d);
    });
    setSeleccionadas(pendientes);
    setErroresRegistro(errores);
  };

  const borrarPeriodo = async () => {
    if (!porBorrar) return;
    setGuardando(true);
    try {
      await axios.delete(`/api/vacaciones/${porBorrar.id}`, { headers: authH() });
      setRecargaVac((n) => n + 1);
    } catch (e) {
      setAviso(mensajeError(e, "No se pudo borrar el periodo."));
    } finally {
      setGuardando(false);
      setPorBorrar(null);
    }
  };

  // Sin adelantos: cada bloque cuenta en el año de vacaciones donde empieza (igual que el backend).
  // Si el saldo no cargó, no se bloquea aquí: el backend valida al guardar.
  const motivoSaldo = (nueva: Set<string>): string | null => {
    if (cargandoSaldo || errorSaldo || !saldo) return null;
    if (!saldo.actual) {
      return esAdmin
        ? "No tiene fecha de ingreso; pide a RH que la registre."
        : "No tienes fecha de ingreso; pide a RH que la registre.";
    }
    const porAnio = new Map<SaldoAnioApi, number>();
    for (const b of agruparBloques(nueva)) {
      const anio = anioDeVacaciones(saldo, b.inicio);
      if (!anio) continue;
      if (anio.anios === 0) return esAdmin ? "Aún no cumple su primer año." : "Aún no cumples tu primer año.";
      porAnio.set(anio, (porAnio.get(anio) ?? 0) + b.dias);
    }
    for (const [anio, dias] of Array.from(porAnio.entries())) {
      const disponibles = Math.max(disponiblesDe(anio), 0);
      if (dias > disponibles) {
        return `Solo ${esAdmin ? "le" : "te"} quedan ${numeroDias(disponibles)} ${
          disponibles === 1 ? "día" : "días"
        } en el año de vacaciones ${textoPeriodo(anio.ciclo_inicio, anio.ciclo_fin)}.`;
      }
    }
    return null;
  };

  const abrirDescuento = () => {
    setAnioDescuento("actual");
    setDiasDescuento("");
    setNotaDescuento("");
    setErrorDescuento(null);
    setDescuentoAbierto(true);
  };

  const diasDescuentoNum = Number(diasDescuento);
  const descuentoValido =
    diasDescuento.trim() !== "" && diasDescuentoNum > 0 && diasDescuentoNum <= 999.9 && notaDescuento.trim() !== "";

  const guardarDescuento = async () => {
    if (!empleadoSel || !descuentoValido || enviandoRef.current) return;
    enviandoRef.current = true;
    setGuardando(true);
    setErrorDescuento(null);
    try {
      await axios.post(
        "/api/vacaciones",
        {
          tipo: "descuento",
          clave: empleadoSel,
          anio: anioDescuento,
          dias: diasDescuentoNum,
          nota: notaDescuento.trim(),
        },
        { headers: authH() }
      );
      setDescuentoAbierto(false);
      setRecargaVac((n) => n + 1);
      setExito("Descuento registrado.");
    } catch (e) {
      setErrorDescuento(mensajeError(e, "No se pudo registrar el descuento."));
    } finally {
      setGuardando(false);
      enviandoRef.current = false;
    }
  };

  // Mismas reglas de selección para admin y piloto (el piloto nunca entra al modo falta)
  const toggleDia = (clave: string) => {
    if (modoFalta) {
      setSeleccionadas((prev) => {
        const nuevo = new Set(prev);
        if (!nuevo.delete(clave)) nuevo.add(clave);
        return nuevo;
      });
      return;
    }
    if (clave < hoy) return;
    if (clave < primerDisponible) {
      setAviso(
        // Regla del negocio: "30 días de anticipación"; el cálculo sigue siendo hoy + 31
        `Las vacaciones se piden con 30 días de anticipación. Puedes elegir a partir del ${fechaLarga(primerDisponible)}.`
      );
      return;
    }
    const motivo = motivoBloqueo(clave);
    if (motivo) {
      setAviso(motivo);
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
    const sinSaldo = motivoSaldo(new Set(seleccionadas).add(clave));
    if (sinSaldo) {
      setAviso(sinSaldo);
      return;
    }

    setSeleccionadas((prev) => new Set(prev).add(clave));
  };

  // Todos los hooks van arriba: este return no puede quedar antes de ninguno
  if (!esAdmin && (!pilotoLocal || estadoPiloto === "rechazado")) return <Navigate to="/" replace />;

  const vistaPiloto = !esAdmin;
  const personasVista = esAdmin ? personas : miPersona ? [miPersona] : [];
  const seleccionVista = esAdmin ? empleadoSel : miClave;
  const cargandoVista = esAdmin ? cargandoPersonas : estadoPiloto === "cargando";
  const errorVista = esAdmin
    ? errorPersonas
    : estadoPiloto === "error"
    ? "No se pudieron cargar tus datos."
    : null;
  // Sin la columna de borrar, la tabla del piloto tiene una columna menos
  const columnasTabla = vistaPiloto ? 6 : 7;

  const total = seleccionadas.size;
  const bloques = agruparBloques(seleccionadas);
  // En el diálogo: el empleado elegido (admin) o la propia persona (piloto)
  const personaSel = esAdmin ? personas.find((p) => p.clave === empleadoSel) : miPersona;

  return (
    // Con el botón flotante del piloto, espacio extra abajo para que no tape la tabla.
    // "Mis solicitudes" y "Panel de control" de admin usan todo el ancho, como Gestión de Usuarios
    <Container
      maxWidth={pestana >= 2 && !vistaPiloto ? false : "lg"}
      sx={{ mt: 4, mb: vistaPiloto && total > 0 && pestana === 1 ? 12 : 6 }}
    >
      {/* Para admin la página es "Vacaciones"; el piloto la sigue viendo como "Mi Perfil" */}
      <Typography variant="h5" sx={{ fontWeight: 700, color: "#1e293b", mb: 2 }}>
        {esAdmin ? "Vacaciones" : "Mi Perfil"}
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
        {["Mis datos", "Selección de vacaciones", "Mis solicitudes", ...(esAdmin ? ["Panel de control"] : [])].map((texto) => (
          <Tab
            key={texto}
            label={texto}
            sx={{ textTransform: "none", fontWeight: 600, "&.Mui-selected": { color: AZUL } }}
          />
        ))}
      </Tabs>

      {pestana === 0 && (
        <MisDatosPerfil
          personas={personasVista}
          cargando={cargandoVista}
          error={errorVista}
          seleccion={seleccionVista}
          onSeleccion={cambiarEmpleado}
          sinSelector={vistaPiloto}
        />
      )}

      {/* La selección (calendario y empleado) vive en este componente, así que no se pierde al cambiar de pestaña */}
      {pestana === 1 && (
        <>
          {/* Barra de acciones arriba del calendario (admin y piloto): contador, bloques y botones */}
          <Paper
            sx={{
              mb: 2,
              p: 2,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1.5,
              border: `1px solid ${total > 0 ? AZUL : BORDE_TABLA}`,
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 700, color: AZUL }}>
                {total} {total === 1 ? "día seleccionado" : "días seleccionados"} en total
              </Typography>
              {bloques.map((b) => (
                <Typography key={b.inicio} sx={{ fontSize: 14, color: "#475569", mt: 0.25 }}>
                  {textoBloque(b)}
                </Typography>
              ))}
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              <Button variant="outlined" size="small" disabled={total === 0} onClick={() => setSeleccionadas(new Set())}>
                Limpiar selección
              </Button>
              {vistaPiloto ? (
                <Button variant="contained" size="small" disabled={total === 0 || !miClave} onClick={abrirConfirmacion}>
                  SOLICITAR VACACIONES
                </Button>
              ) : (
                empleadoSel && (
                  <>
                    <Button
                      variant="contained"
                      size="small"
                      disabled={modoFalta || total === 0}
                      onClick={abrirConfirmacion}
                    >
                      REGISTRAR VACACIONES
                    </Button>
                    {/* Primer toque: entra al modo falta. Ya en el modo, con días marcados: registra */}
                    <Button
                      variant="contained"
                      size="small"
                      disabled={modoFalta && total === 0}
                      onClick={() => (modoFalta ? abrirConfirmacion() : cambiarModoFalta(true))}
                      sx={{ bgcolor: "#000", color: "#fff", "&:hover": { bgcolor: "#333" } }}
                    >
                      REGISTRAR FALTA INJUSTIFICADA
                    </Button>
                    <Button variant="outlined" size="small" color="warning" disabled={modoFalta} onClick={abrirDescuento}>
                      REGISTRAR DESCUENTO
                    </Button>
                  </>
                )
              )}
            </Box>
          </Paper>

          {/* Piloto: botón fijo abajo a la derecha, visible aunque baje la pantalla */}
          {vistaPiloto && total > 0 && !confirmando && (
            <Button
              variant="contained"
              disabled={!miClave}
              onClick={abrirConfirmacion}
              sx={{
                position: "fixed",
                right: { xs: 16, sm: 24 },
                bottom: { xs: 16, sm: 24 },
                zIndex: 1200,
                borderRadius: "999px",
                px: 3,
                py: 1.5,
                fontWeight: 700,
                bgcolor: AZUL,
                boxShadow: "0 8px 24px rgba(10,40,120,0.35)",
                "&:hover": { bgcolor: "#081f5e" },
              }}
            >
              SOLICITAR ({total} {total === 1 ? "día" : "días"})
            </Button>
          )}

          {!vistaPiloto && (
            <SelectorEmpleado
              personas={personas}
              cargando={cargandoPersonas}
              seleccion={empleadoSel}
              onSeleccion={cambiarEmpleado}
            />
          )}
          {errorVista && <Alert severity="error" sx={{ mb: 2 }}>{errorVista}</Alert>}

          {modoFalta && (
            <Alert
              severity="warning"
              sx={{ mb: 2 }}
              action={
                <Button color="inherit" size="small" onClick={() => cambiarModoFalta(false)}>
                  Salir
                </Button>
              }
            >
              Modo falta injustificada: puedes marcar cualquier día. Al terminar, pulsa REGISTRAR FALTA INJUSTIFICADA.
            </Alert>
          )}

          {seleccionVista && (
            <Paper sx={{ mb: 2, p: 2, border: `1px solid ${BORDE_TABLA}` }}>
              {cargandoSaldo ? (
                <CircularProgress size={20} />
              ) : errorSaldo ? (
                <Typography sx={{ fontSize: 14, color: ROJO_TEXTO }}>{errorSaldo}</Typography>
              ) : saldo && !saldo.actual ? (
                <Typography sx={{ fontSize: 14, color: "#64748b" }}>
                  Sin fecha de ingreso: no se puede calcular el saldo de vacaciones.
                </Typography>
              ) : saldo?.actual ? (
                <>
                  <Typography sx={{ fontSize: 15, fontWeight: 600, color: "#1e293b" }}>
                    {vistaPiloto ? "Te tocan" : "Le tocan"} {numeroDias(saldo.actual.dias_corresponden)} · Usados{" "}
                    {numeroDias(saldo.actual.dias_usados)} · Solicitados{" "}
                    {numeroDias(saldo.actual.dias_solicitados_pendientes)} ·{" "}
                    <Box
                      component="span"
                      sx={{ fontWeight: 800, color: saldo.actual.dias_quedan < 0 ? ROJO_TEXTO : "#15803D" }}
                    >
                      {vistaPiloto ? "Te quedan" : "Le quedan"} {numeroDias(saldo.actual.dias_quedan)}
                    </Box>{" "}
                    · Año de vacaciones {fechaCorta(saldo.actual.ciclo_inicio)} – {fechaCorta(saldo.actual.ciclo_fin)}
                  </Typography>
                  {saldo.siguiente && (
                    <Typography sx={{ fontSize: 13, color: "#64748b", mt: 0.5 }}>
                      Siguiente año de vacaciones ({fechaCorta(saldo.siguiente.ciclo_inicio)} –{" "}
                      {fechaCorta(saldo.siguiente.ciclo_fin)}): {vistaPiloto ? "te tocan" : "le tocan"}{" "}
                      {numeroDias(saldo.siguiente.dias_corresponden)} · Usados {numeroDias(saldo.siguiente.dias_usados)} ·
                      Solicitados {numeroDias(saldo.siguiente.dias_solicitados_pendientes)} ·{" "}
                      {vistaPiloto ? "Te quedan" : "Le quedan"} {numeroDias(saldo.siguiente.dias_quedan)}
                    </Typography>
                  )}
                </>
              ) : null}
            </Paper>
          )}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
              gap: 2,
            }}
          >
            {mesesCalendario(hoy, modoFalta ? MESES_ATRAS_FALTA : 0).map(({ anio, mes }) => (
              <MesCalendario
                key={`${anio}-${mes}`}
                anio={anio}
                mes={mes}
                hoy={hoy}
                primerDisponible={primerDisponible}
                seleccionadas={seleccionadas}
                vacaciones={diasVacaciones}
                modoFalta={modoFalta}
                motivoBloqueo={motivoBloqueo}
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
                texto: e === "falta" ? ESTILO_VACACION[e].texto : `Vacaciones ${ESTILO_VACACION[e].texto.toLowerCase()}`,
                fondo: ESTILO_VACACION[e].fondo,
                borde: ESTILO_VACACION[e].borde,
                tachado: ESTILO_VACACION[e].tachado,
                punteado: ESTILO_VACACION[e].punteado,
              })),
            ].map(
              ({
                texto,
                fondo,
                borde,
                tachado,
                punteado,
              }: {
                texto: string;
                fondo: string;
                borde: string;
                tachado?: boolean;
                punteado?: boolean;
              }) => (
              <Box key={texto} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box
                  sx={{
                    width: 14,
                    height: 14,
                    borderRadius: "3px",
                    bgcolor: fondo,
                    border: `1px ${punteado ? "dashed" : "solid"} ${borde}`,
                    // Rayita diagonal: el tachado de las rechazadas
                    backgroundImage: tachado
                      ? `linear-gradient(to top right, transparent 44%, ${borde} 44%, ${borde} 56%, transparent 56%)`
                      : undefined,
                  }}
                />
                <Typography sx={{ fontSize: 12, color: "#64748b" }}>{texto}</Typography>
              </Box>
              )
            )}
          </Box>

          {seleccionVista && (
            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontWeight: 700, color: "#1e293b", mb: 1 }}>Periodos de vacaciones</Typography>
              {errorVac && <Alert severity="error" sx={{ mb: 1 }}>{errorVac}</Alert>}
              {/* En celular la tabla se desliza de lado en lugar de cortarse */}
              <TableContainer
                component={Paper}
                sx={{ borderRadius: "12px", border: `1px solid ${BORDE_TABLA}`, overflowX: "auto" }}
              >
                <Table size="small" sx={{ minWidth: 820 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={celdaEncabezadoSx}>Periodo</TableCell>
                      <TableCell align="center" sx={celdaEncabezadoSx}>Días</TableCell>
                      <TableCell align="center" sx={celdaEncabezadoSx}>Estado</TableCell>
                      <TableCell align="center" sx={celdaEncabezadoSx}>Tipo</TableCell>
                      <TableCell align="center" sx={celdaEncabezadoSx}>Cubre</TableCell>
                      <TableCell sx={celdaEncabezadoSx}>Nota</TableCell>
                      {!vistaPiloto && <TableCell sx={celdaEncabezadoSx} aria-label="Acciones" />}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cargandoVac ? (
                      <TableRow>
                        <TableCell colSpan={columnasTabla} align="center" sx={{ py: 3 }}>
                          <CircularProgress size={24} />
                        </TableCell>
                      </TableRow>
                    ) : periodosTabla.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={columnasTabla} align="center" sx={{ py: 3, fontSize: 14, color: "#94a3b8" }}>
                          Sin periodos registrados
                        </TableCell>
                      </TableRow>
                    ) : (
                      periodosTabla.map((p) => {
                        const categoria = categoriaVacacion(p, hoy);
                        const estilo = categoria ? ESTILO_VACACION[categoria] : null;
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
                              {textoPeriodo(inicio, fin)}
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
                            <TableCell align="center" sx={{ ...celdaSx, color: "#475569" }}>
                              {p.tipo === "falta_injustificada" ? "Falta" : esDescuento(p) ? "Descuento" : "Vacaciones"}
                            </TableCell>
                            <TableCell align="center" sx={{ ...celdaSx, color: "#475569", whiteSpace: "nowrap" }}>
                              {p.cubre_clave?.trim() || "—"}
                            </TableCell>
                            <TableCell sx={{ ...celdaSx, fontSize: 13, color: "#64748b" }}>
                              {p.nota?.trim() || "—"}
                            </TableCell>
                            {!vistaPiloto && (
                              <TableCell align="center" sx={celdaSx}>
                                {/* sistema = capturado por admin; ajuste = descuento */}
                                {(p.origen === "sistema" || p.origen === "ajuste") && (
                                  <IconButton
                                    size="small"
                                    aria-label="Borrar periodo"
                                    onClick={() => setPorBorrar(p)}
                                    sx={{ color: ROJO_TEXTO }}
                                  >
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>
                                )}
                              </TableCell>
                            )}
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
                          colSpan={columnasTabla - 1}
                          sx={{ ...celdaSx, fontWeight: 700, color: "#1e293b", borderBottom: 0 }}
                        >
                          Tomados: {textoDias(totalDias(periodosTabla, "tomada", hoy))} · Autorizados:{" "}
                          {textoDias(totalDias(periodosTabla, "autorizada", hoy))}
                          {totalDescuentos(periodosTabla) > 0 &&
                            ` · Descuentos: ${textoDias(totalDescuentos(periodosTabla))}`}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </>
      )}

      {pestana === 2 &&
        (vistaPiloto ? (
          <SolicitudesPiloto
            periodos={periodosTabla}
            cargando={cargandoVac}
            error={errorVista ?? errorVac}
            hoy={hoy}
            onCancelado={() => {
              setExito("Tu solicitud se canceló.");
              setRecargaVac((n) => n + 1);
            }}
          />
        ) : (
          <MisSolicitudesVacaciones personas={personas} cargandoPersonas={cargandoPersonas} />
        ))}

      {pestana === 3 && esAdmin && <PanelControlVacaciones />}

      <Dialog open={confirmando} onClose={() => !guardando && setConfirmando(false)} fullWidth maxWidth="xs">
        <DialogTitle>
          {vistaPiloto ? "Solicitar vacaciones" : modoFalta ? "Registrar falta injustificada" : "Registrar vacaciones"}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontWeight: 700, color: "#1e293b" }}>
            {personaSel?.nombre || "Sin nombre"} · {personaSel?.idVisible ?? empleadoSel}
          </Typography>
          {bloques.map((b) => (
            <Typography key={b.inicio} sx={{ fontSize: 14, color: "#475569", mt: 0.5 }}>
              {textoPeriodo(b.inicio, b.fin)} ({textoDias(b.dias)})
            </Typography>
          ))}
          {vistaPiloto && (
            <TextField
              label="¿Quién te cubre? (opcional)"
              placeholder="A15-CYNNA"
              helperText="ID de la persona que te cubre. Si lo dejas vacío, lo asigna administración."
              value={cubrePiloto}
              onChange={(e) => setCubrePiloto(e.target.value.toUpperCase())}
              fullWidth
              size="small"
              sx={{ mt: 2 }}
              inputProps={{ maxLength: 50 }}
            />
          )}
          <TextField
            label="Nota (opcional)"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            multiline
            minRows={2}
            fullWidth
            size="small"
            sx={{ mt: 2 }}
          />
          {erroresRegistro.map((mensaje) => (
            <Alert key={mensaje} severity="error" sx={{ mt: 2 }}>
              {mensaje}
            </Alert>
          ))}
        </DialogContent>
        <DialogActions>
          <Button disabled={guardando} onClick={() => setConfirmando(false)}>
            Cancelar
          </Button>
          <Button variant="contained" disabled={guardando || total === 0} onClick={guardarRegistro}>
            {guardando ? (vistaPiloto ? "Enviando…" : "Guardando…") : vistaPiloto ? "Solicitar" : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={descuentoAbierto} onClose={() => !guardando && setDescuentoAbierto(false)} fullWidth maxWidth="xs">
        <DialogTitle>Registrar descuento</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontWeight: 700, color: "#1e293b" }}>
            {personaSel?.nombre || "Sin nombre"} · {personaSel?.idVisible ?? empleadoSel}
          </Typography>
          {saldo && !saldo.actual && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              No tiene fecha de ingreso; pide a RH que la registre.
            </Alert>
          )}
          <Typography sx={{ fontSize: 13, color: "#64748b", mt: 2 }}>Año de vacaciones</Typography>
          <RadioGroup
            value={anioDescuento}
            onChange={(e) => setAnioDescuento(e.target.value as "actual" | "siguiente")}
          >
            {(["actual", "siguiente"] as const).map((anio) => {
              const datos = saldo?.[anio];
              return (
                <FormControlLabel
                  key={anio}
                  value={anio}
                  control={<Radio size="small" />}
                  label={
                    <Typography sx={{ fontSize: 14 }}>
                      {anio === "actual" ? "Actual" : "Siguiente"}
                      {datos &&
                        ` (${textoPeriodo(datos.ciclo_inicio, datos.ciclo_fin)}) · le quedan ${numeroDias(
                          datos.dias_quedan
                        )}`}
                    </Typography>
                  }
                />
              );
            })}
          </RadioGroup>
          <TextField
            label="Días"
            type="number"
            value={diasDescuento}
            onChange={(e) => setDiasDescuento(e.target.value)}
            fullWidth
            size="small"
            sx={{ mt: 1 }}
            inputProps={{ min: 0.5, max: 999.9, step: 0.5 }}
          />
          <TextField
            label="Motivo (obligatorio)"
            value={notaDescuento}
            onChange={(e) => setNotaDescuento(e.target.value)}
            multiline
            minRows={2}
            fullWidth
            size="small"
            sx={{ mt: 2 }}
            inputProps={{ maxLength: 500 }}
          />
          {errorDescuento && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {errorDescuento}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={guardando} onClick={() => setDescuentoAbierto(false)}>
            Cancelar
          </Button>
          <Button variant="contained" disabled={guardando || !descuentoValido} onClick={guardarDescuento}>
            {guardando ? "Guardando…" : "Registrar descuento"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={porBorrar !== null} onClose={() => !guardando && setPorBorrar(null)} fullWidth maxWidth="xs">
        <DialogTitle>Borrar periodo</DialogTitle>
        <DialogContent>
          {porBorrar && (
            <Typography sx={{ color: "#475569" }}>
              {esDescuento(porBorrar)
                ? `¿Borrar el descuento de ${textoDias(porBorrar.dias)} del año de vacaciones que empieza el ${fechaCorta(
                    porBorrar.fecha_inicio.slice(0, 10)
                  )}?`
                : `¿Borrar el registro del ${textoPeriodo(
                    porBorrar.fecha_inicio.slice(0, 10),
                    porBorrar.fecha_fin.slice(0, 10)
                  )} (${textoDias(porBorrar.dias)})?`}{" "}
              Esta acción no se puede deshacer.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={guardando} onClick={() => setPorBorrar(null)}>
            Cancelar
          </Button>
          <Button variant="contained" color="error" disabled={guardando} onClick={borrarPeriodo}>
            {guardando ? "Borrando…" : "Borrar"}
          </Button>
        </DialogActions>
      </Dialog>

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

      <Snackbar
        open={exito !== null}
        autoHideDuration={4000}
        onClose={(_, razon) => razon !== "clickaway" && setExito(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" onClose={() => setExito(null)} sx={{ width: "100%" }}>
          {exito}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default MiPerfil;
