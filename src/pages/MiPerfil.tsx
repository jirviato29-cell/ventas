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
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import CelebrationIcon from "@mui/icons-material/Celebration";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import { keyframes } from "@mui/material/styles";
import { Navigate, useSearchParams } from "react-router-dom";
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
// Días de descanso extra: naranja en el cuadro, el calendario, la leyenda y los botones
const NARANJA_EXTRA = "#EF6C00";

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
// "extra" solo pinta el calendario y la leyenda (un día extra no rechazado); el estado de la fila sigue aparte
type CategoriaVacacion = "falta" | "tomada" | "autorizada" | "extra" | "solicitada" | "rechazada";

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
  // Confirmación de quien cubre: null sin respuesta, true confirmó, false no puede
  cubre_confirmado?: boolean | null;
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
const esDiaExtra = (p: VacacionApi) => p.tipo === "dia_extra";

// ── Días de descanso extra: mismas reglas que el backend (app/routers/vacaciones.py) ──
// Fuera de una ventana especial: 20 días de anticipación (primer día = hoy + 21, como vacaciones usa hoy + 31)
const DIAS_ANTICIPACION_EXTRA = 21;
// Ventanas especiales por festivo: se pide sin anticipación (desde mañana). Igual que VENTANAS_DIA_EXTRA del backend.
const VENTANAS_DIA_EXTRA = [
  { fechaFestivo: "2026-11-16", inicio: "2026-11-19", fin: "2026-12-04", soloEntreSemana: true },
];
const esFinDeSemana = (clave: string) => {
  const d = new Date(`${clave}T12:00:00`).getDay();
  return d === 0 || d === 6;
};
const ventanaExtra = (clave: string, festivos: string[]) =>
  VENTANAS_DIA_EXTRA.find((v) => festivos.includes(v.fechaFestivo) && clave >= v.inicio && clave <= v.fin);

// GET /api/vacaciones/dias-extra?clave= (admin) y /api/mi-perfil/dias-extra (piloto)
interface DiaExtraOtorgadoApi {
  id: number;
  fecha_festivo: string;
  vence: string;
  dias: number;
  motivo: string;
  dias_restantes: number;
  vigente: boolean;
}
interface DiasExtraApi {
  clave: string;
  dias_disponibles: number;
  vence: string | null;
  dias_usados: number;
  dias_pendientes: number;
  otorgados: DiaExtraOtorgadoApi[];
}

// Chip de Estado del historial: un descuento va en rojo; una falta, en negro con texto corto
const ESTILO_DESCUENTO: EstiloVacacion = { texto: "Descuento", fondo: "#C62828", borde: "#C62828", color: "#FFFFFF" };

interface EstiloVacacion {
  texto: string;
  fondo: string;
  borde: string;
  color: string;
  tachado?: boolean;
  // Borde punteado: distingue la solicitada (azul claro) de la selección (azul marino)
  punteado?: boolean;
}

// Chips de "Estado" (historial y Mis solicitudes): mismos colores fuertes que el calendario
const ESTILO_VACACION: Record<CategoriaVacacion, EstiloVacacion> = {
  falta: { texto: "Falta injustificada", fondo: "#000000", borde: "#000000", color: "#FFFFFF" },
  tomada: { texto: "Tomada", fondo: "#6A1B9A", borde: "#6A1B9A", color: "#FFFFFF" },
  autorizada: { texto: "Autorizada", fondo: "#2E7D32", borde: "#2E7D32", color: "#FFFFFF" },
  extra: { texto: "Día extra", fondo: NARANJA_EXTRA, borde: NARANJA_EXTRA, color: "#FFFFFF" },
  solicitada: { texto: "Solicitada", fondo: "#F9A825", borde: "#F9A825", color: "#000000", punteado: true },
  rechazada: { texto: "Rechazada", fondo: "#616161", borde: "#616161", color: "#FFFFFF", tachado: true },
};

// Calendario y leyenda: colores sólidos y fuertes (las fichas de "Estado" de las tablas usan ESTILO_VACACION)
const COLOR_SELECCION = "#0D2B6B";
const COLOR_BLOQUEO = "#C62828";

interface ColorDia {
  fondo: string;
  color: string;
  borde: string;
  tachado?: boolean;
  punteado?: boolean;
}

const COLOR_CALENDARIO: Record<CategoriaVacacion, ColorDia> = {
  falta: { fondo: "#000000", color: "#FFFFFF", borde: "#000000" },
  tomada: { fondo: "#6A1B9A", color: "#FFFFFF", borde: "#6A1B9A" },
  autorizada: { fondo: "#2E7D32", color: "#FFFFFF", borde: "#2E7D32" },
  extra: { fondo: NARANJA_EXTRA, color: "#FFFFFF", borde: NARANJA_EXTRA },
  solicitada: { fondo: "#F9A825", color: "#000000", borde: "#3E2723", punteado: true },
  rechazada: { fondo: "#616161", color: "#FFFFFF", borde: "#616161", tachado: true },
};

// Si dos periodos caen en el mismo día, se pinta el estado más firme
const PRIORIDAD_VACACION: CategoriaVacacion[] = ["falta", "tomada", "autorizada", "extra", "solicitada", "rechazada"];

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
    // Un día extra (pedido, autorizado o tomado) va en naranja; si lo rechazaron, como cualquier rechazada
    const base = categoriaVacacion(p, hoy);
    const categoria: CategoriaVacacion | null = base && esDiaExtra(p) && base !== "rechazada" ? "extra" : base;
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

// Suma los días de los periodos de esa categoría (los días extra van aparte: no son vacaciones)
const totalDias = (periodos: VacacionApi[], categoria: CategoriaVacacion, hoy: string) =>
  periodos.reduce(
    (suma, p) =>
      !esDescuento(p) && !esDiaExtra(p) && categoriaVacacion(p, hoy) === categoria ? suma + Number(p.dias ?? 0) : suma,
    0
  );

// Días extra pedidos, autorizados o tomados (sin los rechazados)
const totalDiasExtra = (periodos: VacacionApi[], hoy: string) =>
  periodos.reduce(
    (suma, p) => (esDiaExtra(p) && categoriaVacacion(p, hoy) !== "rechazada" ? suma + Number(p.dias ?? 0) : suma),
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

// Barra de selección: azul marino, rojo del descuento y estilo del botón principal
const NAVY_BARRA = "#0D2B6B";
const ROJO_BARRA = "#C62828";
const BOTON_NAVY = {
  bgcolor: NAVY_BARRA,
  color: "#fff",
  fontWeight: 700,
  boxShadow: "none",
  "&:hover": { bgcolor: "#0a2155", boxShadow: "none" },
};
const BOTON_EXTRA = {
  bgcolor: NARANJA_EXTRA,
  color: "#fff",
  fontWeight: 700,
  boxShadow: "none",
  "&:hover": { bgcolor: "#D65F00", boxShadow: "none" },
};
const MES_CORTO = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const DIA_CORTO = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

// Tarjeta de la barra, en escalera: "ENE" (o "ENE – FEB"), "11 → 15", "lun – vie" y "5 días"
const diaSemanaCorto = (clave: string) => DIA_CORTO[new Date(`${clave}T12:00:00`).getDay()];
const textosTarjetaBloque = (b: Bloque) => {
  const mes = (clave: string) => MES_CORTO[Number(clave.slice(5, 7)) - 1].toUpperCase();
  const dia = (clave: string) => Number(clave.slice(8));
  const unDia = b.dias === 1;
  return {
    meses: cruzaDeMes(b) ? `${mes(b.inicio)} – ${mes(b.fin)}` : mes(b.inicio),
    rango: unDia ? `${dia(b.inicio)}` : `${dia(b.inicio)} → ${dia(b.fin)}`,
    semana: unDia ? diaSemanaCorto(b.inicio) : `${diaSemanaCorto(b.inicio)} – ${diaSemanaCorto(b.fin)}`,
    dias: `${b.dias} ${unDia ? "día" : "días"}`,
  };
};

// Cada tarjeta aparece suave: fade + sube 4 px
const aparecerTarjeta = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
`;

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
  // Modo día extra del piloto: qué días quedan en gris (ventana especial o 20 días); si no, primerDisponible
  sinAnticipacionDe?: (clave: string) => boolean;
  onToggle: (clave: string) => void;
}

// ── Saldo en 3 cuadritos: días que le quedan, años en la empresa y hasta cuándo puede tomarlos ──
// Solo muestra el saldo; el tope de días al seleccionar vive en MiPerfil (motivoSaldo).
const AVISO_CADUCAN = 30;

// Días de hoy a una fecha YYYY-MM-DD (en UTC, para que no influya la zona horaria)
const diasHasta = (desde: string, hasta: string) => {
  const utc = (c: string) => Date.UTC(Number(c.slice(0, 4)), Number(c.slice(5, 7)) - 1, Number(c.slice(8, 10)));
  return Math.round((utc(hasta) - utc(desde)) / 86400000);
};

const TONOS = {
  verde: "#2E7D32",
  morado: "#6A1B9A",
  azul: "#1565C0",
  rojo: "#C62828",
  gris: "#616161",
  naranja: NARANJA_EXTRA,
};

interface CuadroProps {
  tono: keyof typeof TONOS;
  icono: React.ReactNode;
  antes?: string;
  // Número (o fecha) grande en negritas; con grandeEsTexto, una frase un poco más chica
  grande: string;
  grandeEsTexto?: boolean;
  despues: string;
  // El texto de después en su propio renglón (para la fecha y las frases)
  despuesAbajo?: boolean;
}

// Compacto (~80 px de alto): ícono a la izquierda y el texto en una o dos líneas
const CuadroSaldo: React.FC<CuadroProps> = ({ tono, icono, antes, grande, grandeEsTexto, despues, despuesAbajo }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 1.5,
      px: 2,
      py: 1.25,
      boxSizing: "border-box",
      minHeight: 64,
      maxHeight: 80,
      borderRadius: "14px",
      bgcolor: TONOS[tono],
      color: "#fff",
      boxShadow: "0 2px 8px rgba(15,23,42,0.18)",
      transition: "transform 0.18s ease, box-shadow 0.18s ease",
      "@media (hover: hover)": {
        "&:hover": { transform: "translateY(-2px)", boxShadow: "0 6px 16px rgba(15,23,42,0.25)" },
      },
    }}
  >
    <Box
      sx={{
        flexShrink: 0,
        width: 40,
        height: 40,
        borderRadius: "50%",
        bgcolor: "rgba(255,255,255,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {icono}
    </Box>
    <Typography component="div" sx={{ fontSize: 14, lineHeight: 1.25, color: "#fff", minWidth: 0 }}>
      {antes && `${antes} `}
      <Box
        component="span"
        sx={{ fontSize: grandeEsTexto ? 17 : 28, fontWeight: 800, lineHeight: 1.1, letterSpacing: grandeEsTexto ? 0 : "-0.5px" }}
      >
        {grande}
      </Box>
      {despuesAbajo ? <Box sx={{ opacity: 0.92 }}>{despues}</Box> : ` ${despues}`}
    </Typography>
  </Box>
);

interface CuadrosSaldoProps {
  saldo: SaldoApi | null;
  cargando: boolean;
  error: string | null;
  hoy: string;
  // Piloto: "Tienes"; admin viendo a un empleado: "Tiene"
  piloto: boolean;
  // 4º cuadro (naranja): solo si tiene días de descanso extra vigentes
  diasExtra?: DiasExtraApi | null;
}

const CuadrosSaldo: React.FC<CuadrosSaldoProps> = ({ saldo, cargando, error, hoy, piloto, diasExtra }) => {
  if (cargando) {
    return (
      <Box sx={{ mb: 2, textAlign: "center" }}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  if (error) return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>;
  if (!saldo) return null;

  const tienes = piloto ? "Tienes" : "Tiene";
  const a = saldo.actual;
  const extra = diasExtra && diasExtra.dias_disponibles > 0 ? diasExtra : null;
  const rejilla = {
    mb: 2,
    display: "grid",
    gap: 1.5,
    gridTemplateColumns: extra
      ? { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }
      : { xs: "1fr", sm: "repeat(3, 1fr)" },
  };
  const cuadroExtra = extra && (
    <CuadroSaldo
      tono="naranja"
      icono={<EventAvailableIcon />}
      antes={tienes}
      grande={String(extra.dias_disponibles)}
      despues={`${extra.dias_disponibles === 1 ? "día" : "días"} de descanso extra${
        extra.vence ? ` · vence ${fechaCorta(extra.vence)}` : ""
      }`}
    />
  );

  if (!a) {
    return (
      <Box sx={{ ...rejilla, gridTemplateColumns: { xs: "1fr", sm: extra ? "repeat(2, 1fr)" : "1fr" } }}>
        <CuadroSaldo
          tono="gris"
          icono={<CalendarMonthIcon />}
          grande="Sin fecha de ingreso"
          grandeEsTexto
          despues="No se puede calcular"
          despuesAbajo
        />
        {cuadroExtra}
      </Box>
    );
  }

  const primerAnio = a.anios === 0;
  // Último día del año de vacaciones; con 0 años, el día en que cumple su primer año
  const fechaClave = primerAnio ? sumarDias(a.ciclo_fin, 1) : a.ciclo_fin;
  const porCaducar = !primerAnio && diasHasta(hoy, a.ciclo_fin) <= AVISO_CADUCAN;

  return (
    <Box sx={rejilla}>
      {primerAnio ? (
        <CuadroSaldo
          tono="verde"
          icono={<BeachAccessIcon />}
          grande={piloto ? "Aún no cumples tu primer año" : "Aún no cumple su primer año"}
          grandeEsTexto
          despues="todavía sin días de vacaciones"
          despuesAbajo
        />
      ) : (
        <CuadroSaldo
          tono="verde"
          icono={<BeachAccessIcon />}
          antes={tienes}
          grande={numeroDias(a.dias_quedan)}
          despues={a.dias_quedan === 1 ? "día de vacaciones" : "días de vacaciones"}
        />
      )}
      <CuadroSaldo
        tono="morado"
        icono={<CelebrationIcon />}
        antes={tienes}
        grande={String(a.anios)}
        despues={a.anios === 1 ? "año en la empresa" : "años en la empresa"}
      />
      <CuadroSaldo
        tono={porCaducar ? "rojo" : "azul"}
        icono={<CalendarMonthIcon />}
        grande={fechaCorta(fechaClave)}
        despues={
          primerAnio
            ? piloto
              ? "este día cumples tu primer año"
              : "este día cumple su primer año"
            : piloto
            ? "tienes hasta este día para tomarlos"
            : "tiene hasta este día para tomarlos"
        }
        despuesAbajo
      />
      {cuadroExtra}
    </Box>
  );
};

const MesCalendario: React.FC<MesProps> = ({
  anio,
  mes,
  hoy,
  primerDisponible,
  seleccionadas,
  vacaciones,
  modoFalta,
  motivoBloqueo,
  sinAnticipacionDe,
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
          const sinAnticipacion =
            !modoFalta && !pasado && (sinAnticipacionDe ? sinAnticipacionDe(clave) : clave < primerDisponible);
          const noDisponible = pasado || sinAnticipacion;
          const marcado = seleccionadas.has(clave);
          // Un día no disponible queda gris aunque caiga en un periodo bloqueado
          const bloqueado = !modoFalta && !noDisponible && !!motivoBloqueo(clave);
          // Vacaciones del empleado elegido: le ganan al gris y al rojo; solo la selección actual va encima
          const vac = marcado ? undefined : vacaciones.get(clave);
          const estiloVac = vac ? COLOR_CALENDARIO[vac] : null;

          return (
            <Box
              key={clave}
              component="button"
              type="button"
              disabled={pasado}
              aria-disabled={bloqueado || sinAnticipacion || undefined}
              title={vac ? ESTILO_VACACION[vac].texto : undefined}
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
                  : `1px solid ${
                      marcado ? COLOR_SELECCION : estiloVac ? estiloVac.borde : bloqueado ? COLOR_BLOQUEO : "#e2e8f0"
                    }`,
                bgcolor: marcado
                  ? COLOR_SELECCION
                  : estiloVac
                  ? estiloVac.fondo
                  : bloqueado
                  ? COLOR_BLOQUEO
                  : noDisponible
                  ? "#f1f5f9"
                  : "#fff",
                color: marcado
                  ? "#fff"
                  : estiloVac
                  ? estiloVac.color
                  : bloqueado
                  ? "#fff"
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

// Igual que el DELETE del backend: pedida desde Mi Perfil, vacaciones solicitadas o autorizadas
// (aunque ya tengan visto bueno) y faltan 7 días o más para que empiecen ("hoy" en hora de México)
const DIAS_PARA_CANCELAR = 7;
// Suya desde Mi Perfil, vacaciones, solicitada o autorizada: solo entonces aplica el límite de 7 días
const cancelablePorEstado = (p: VacacionApi) =>
  p.origen === "mi_perfil" &&
  (p.tipo === "vacaciones" || p.tipo === "dia_extra") &&
  ["solicitada", "autorizada"].includes(p.estado?.trim().toLowerCase() ?? "");
const sePuedeCancelar = (p: VacacionApi, hoy: string) =>
  cancelablePorEstado(p) && diasHasta(hoy, p.fecha_inicio.slice(0, 10)) >= DIAS_PARA_CANCELAR;

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
                      {esDiaExtra(p) && (
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: NARANJA_EXTRA }}>Día extra</Typography>
                      )}
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
                      {/* Pendiente: se autoriza con RH, Encargado, Gerencia y quien cubre confirmado */}
                      {(p.estado ?? "").trim().toLowerCase() === "solicitada" &&
                        (p.cubre_clave?.trim() ? (
                          <Typography
                            sx={{
                              fontSize: 12,
                              fontWeight: 700,
                              color:
                                p.cubre_confirmado === true ? "#15803D" : p.cubre_confirmado === false ? "#B91C1C" : "#A16207",
                            }}
                          >
                            {p.cubre_confirmado === true
                              ? "Confirmó"
                              : p.cubre_confirmado === false
                              ? "No puede · RH elegirá a otra persona"
                              : `Falta que ${p.cubre_clave.trim()} confirme`}
                          </Typography>
                        ) : (
                          <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#A16207" }}>
                            Falta elegir quién te cubre
                          </Typography>
                        ))}
                    </TableCell>
                    {NIVELES_APROBACION.map(({ nivel }) => (
                      <TableCell key={nivel} align="center" sx={celdaSx}>
                        <ChipAprobacion valor={p[nivel]} />
                      </TableCell>
                    ))}
                    <TableCell align="center" sx={celdaSx}>
                      {sePuedeCancelar(p, hoy) ? (
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          onClick={() => abrirCancelar(p)}
                          sx={{ whiteSpace: "nowrap" }}
                        >
                          Cancelar solicitud
                        </Button>
                      ) : cancelablePorEstado(p) ? (
                        // Solo cuando la razón es el tiempo; rechazadas, tomadas o ajenas a Mi Perfil quedan vacías
                        <Typography sx={{ fontSize: 12, color: "#94a3b8" }}>
                          No cancelable (menos de {DIAS_PARA_CANCELAR} días)
                        </Typography>
                      ) : null}
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
              ¿Cancelar {esDiaExtra(porCancelar) ? "tu día extra" : "tus vacaciones"} del{" "}
              {fechaCorta(porCancelar.fecha_inicio.slice(0, 10))} al{" "}
              {fechaCorta(porCancelar.fecha_fin.slice(0, 10))}? Puedes cancelar hasta {DIAS_PARA_CANCELAR} días antes.
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
  // ?tab=solicitudes (botón de los avisos de MENSAJES) abre "Mis solicitudes"
  const [parametros] = useSearchParams();
  const tabUrl = parametros.get("tab");
  const [pestana, setPestana] = useState(() => (tabUrl === "solicitudes" ? 2 : 0));
  useEffect(() => {
    if (tabUrl === "solicitudes") setPestana(2);
  }, [tabUrl]);
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
  // Días de descanso extra: modo de selección, lo que tiene y el diálogo OTORGAR DÍA EXTRA (admin)
  const [modoExtra, setModoExtra] = useState(false);
  const [diasExtra, setDiasExtra] = useState<DiasExtraApi | null>(null);
  const [otorgarAbierto, setOtorgarAbierto] = useState(false);
  const [festivoOtorgar, setFestivoOtorgar] = useState("");
  const [diasOtorgar, setDiasOtorgar] = useState("1");
  const [motivoOtorgar, setMotivoOtorgar] = useState("");
  const [errorOtorgar, setErrorOtorgar] = useState<string | null>(null);
  // Quitar un otorgamiento puesto por error (solo admin; el backend da 409 si ya se usó)
  const [porQuitar, setPorQuitar] = useState<DiaExtraOtorgadoApi | null>(null);
  const [errorQuitar, setErrorQuitar] = useState<string | null>(null);
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

  // Días extra: se vuelven a pedir con los periodos. Si falla (p. ej. la tabla aún no existe), no hay cuadro ni botón.
  useEffect(() => {
    setDiasExtra(null);
    const consulta = esAdmin
      ? empleadoSel
        ? { url: "/api/vacaciones/dias-extra", params: { clave: empleadoSel } }
        : null
      : miClave
      ? { url: "/api/mi-perfil/dias-extra", params: undefined }
      : null;
    if (!consulta) return;
    let vivo = true;
    axios
      .get<DiasExtraApi>(consulta.url, { params: consulta.params, headers: authH() })
      .then((r) => vivo && setDiasExtra(r.data))
      .catch(() => vivo && setDiasExtra(null));
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
    setModoExtra(false);
  };

  // Al entrar o salir de un modo se empieza de cero (también sale del otro modo)
  const cambiarModoFalta = (activo: boolean) => {
    setModoFalta(activo);
    setModoExtra(false);
    setSeleccionadas(new Set());
  };

  const cambiarModoExtra = (activo: boolean) => {
    setModoExtra(activo);
    setModoFalta(false);
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
              tipo: modoFalta ? "falta_injustificada" : modoExtra ? "dia_extra" : "vacaciones",
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
              // Sin tipo el backend entiende vacaciones (como siempre)
              ...(modoExtra ? { tipo: "dia_extra" } : {}),
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
        const que = modoExtra ? "día extra" : "vacaciones";
        setExito(
          bloquesPorGuardar.length === 1 ? `Tu solicitud de ${que} se envió.` : `Tus solicitudes de ${que} se enviaron.`
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
        ? "No tiene fecha de ingreso; RH debe registrarla."
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

  // ── OTORGAR DÍA EXTRA (solo admin) ──
  const abrirOtorgar = () => {
    setFestivoOtorgar("");
    setDiasOtorgar("1");
    setMotivoOtorgar("");
    setErrorOtorgar(null);
    setOtorgarAbierto(true);
  };
  const diasOtorgarNum = Number(diasOtorgar);
  const otorgarValido =
    festivoOtorgar !== "" && Number.isInteger(diasOtorgarNum) && diasOtorgarNum >= 1 && diasOtorgarNum <= 6 &&
    motivoOtorgar.trim() !== "";
  const guardarOtorgar = async () => {
    if (!empleadoSel || !otorgarValido || enviandoRef.current) return;
    enviandoRef.current = true;
    setGuardando(true);
    setErrorOtorgar(null);
    try {
      await axios.post(
        "/api/vacaciones/dias-extra",
        { clave: empleadoSel, fecha_festivo: festivoOtorgar, dias: diasOtorgarNum, motivo: motivoOtorgar.trim() },
        { headers: authH() }
      );
      setOtorgarAbierto(false);
      setRecargaVac((n) => n + 1);
      setExito(diasOtorgarNum === 1 ? "Día extra otorgado." : "Días extra otorgados.");
    } catch (e) {
      setErrorOtorgar(mensajeError(e, "No se pudieron otorgar los días extra."));
    } finally {
      setGuardando(false);
      enviandoRef.current = false;
    }
  };

  const quitarOtorgado = async () => {
    if (!porQuitar || enviandoRef.current) return;
    enviandoRef.current = true;
    setGuardando(true);
    setErrorQuitar(null);
    try {
      await axios.delete(`/api/vacaciones/dias-extra/${porQuitar.id}`, { headers: authH() });
      setPorQuitar(null);
      setRecargaVac((n) => n + 1);
      setExito("Día extra quitado.");
    } catch (e) {
      setErrorQuitar(
        axios.isAxiosError(e) && e.response?.status === 409
          ? "Ya se usó, no se puede quitar"
          : mensajeError(e, "No se pudo quitar el día extra.")
      );
    } finally {
      setGuardando(false);
      enviandoRef.current = false;
    }
  };

  // ── Selección en modo día extra ──
  // Piloto: ventana especial de su festivo (desde mañana, lun–vie) o 20 días; bloqueos siempre.
  // Admin: cualquier fecha. Para los dos: que le alcancen, dentro de la vigencia y máximo 6 seguidos
  // junto con vacaciones. No cuentan "uno por mes", los 15 días ni el saldo de vacaciones.
  const festivosExtra = (diasExtra?.otorgados ?? []).map((o) => o.fecha_festivo);
  const primerDisponibleExtra = sumarDias(hoy, DIAS_ANTICIPACION_EXTRA);
  const sinAnticipacionExtra = (clave: string) => {
    if (clave <= hoy) return true;
    const ventana = ventanaExtra(clave, festivosExtra);
    if (ventana) return ventana.soloEntreSemana && esFinDeSemana(clave);
    return clave < primerDisponibleExtra;
  };

  const toggleDiaExtra = (clave: string) => {
    if (seleccionadas.has(clave)) {
      const propio = agruparBloques(seleccionadas).find((b) => clave >= b.inicio && clave <= b.fin)!;
      if (clave !== propio.inicio && clave !== propio.fin) {
        setAviso(
          `${esAdmin ? "Solo se puede" : "Solo puedes"} quitar el primer o el último día para que sigan siendo seguidos.`
        );
        return;
      }
      setSeleccionadas((prev) => {
        const nuevo = new Set(prev);
        nuevo.delete(clave);
        return nuevo;
      });
      return;
    }
    if (!esAdmin) {
      if (clave <= hoy) {
        setAviso("Los días extra se piden a partir de mañana.");
        return;
      }
      const motivo = motivoBloqueo(clave);
      if (motivo) {
        setAviso(motivo.replace("vacaciones", "días extra"));
        return;
      }
      const ventana = ventanaExtra(clave, festivosExtra);
      if (ventana) {
        if (ventana.soloEntreSemana && esFinDeSemana(clave)) {
          setAviso(
            `Del ${fechaLarga(ventana.inicio)} al ${fechaLarga(ventana.fin)} el día extra solo se puede de lunes a viernes.`
          );
          return;
        }
      } else if (clave < primerDisponibleExtra) {
        setAviso(
          `Los días extra se piden con 20 días de anticipación. Puedes elegir a partir del ${fechaLarga(
            primerDisponibleExtra
          )}.`
        );
        return;
      }
    }
    const ocupado = diasVacaciones.get(clave);
    if (ocupado && ocupado !== "rechazada") {
      setAviso(`${esAdmin ? "Ya tiene" : "Ya tienes"} un periodo registrado ese día.`);
      return;
    }
    const disponibles = diasExtra?.dias_disponibles ?? 0;
    if (seleccionadas.size + 1 > disponibles) {
      setAviso(
        disponibles === 0
          ? `${esAdmin ? "No tiene" : "No tienes"} días de descanso extra disponibles.`
          : `Solo ${esAdmin ? "le" : "te"} ${disponibles === 1 ? "queda 1 día extra" : `quedan ${disponibles} días extra`}.`
      );
      return;
    }
    const vigente = (diasExtra?.otorgados ?? []).some(
      (o) => o.dias_restantes > 0 && clave >= o.fecha_festivo && clave <= o.vence
    );
    if (!vigente) {
      setAviso("Ese día está fuera de la vigencia de los días extra (del festivo a su vencimiento).");
      return;
    }
    // Máximo 6 seguidos contando las vacaciones y los días extra que ya tiene pegados
    const ocupados = new Set(seleccionadas).add(clave);
    diasVacaciones.forEach((categoria, dia) => {
      if (categoria !== "falta" && categoria !== "rechazada") ocupados.add(dia);
    });
    let desde = clave;
    let hasta = clave;
    while (ocupados.has(sumarDias(desde, -1))) desde = sumarDias(desde, -1);
    while (ocupados.has(sumarDias(hasta, 1))) hasta = sumarDias(hasta, 1);
    if (diasHasta(desde, hasta) + 1 > MAX_DIAS_POR_BLOQUE) {
      setAviso("Máximo 6 días seguidos contando vacaciones y días extra.");
      return;
    }
    setSeleccionadas((prev) => new Set(prev).add(clave));
  };

  // Mismas reglas de selección para admin y piloto (el piloto nunca entra al modo falta)
  const toggleDia = (clave: string) => {
    if (modoExtra) {
      toggleDiaExtra(clave);
      return;
    }
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
        `Las vacaciones se piden con 30 días de anticipación. ${
          esAdmin ? "Se puede elegir" : "Puedes elegir"
        } a partir del ${fechaLarga(primerDisponible)}.`
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
        setAviso(
          `${esAdmin ? "Solo se puede" : "Solo puedes"} quitar el primer o el último día para que sigan siendo seguidos.`
        );
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
      // Admin habla del empleado en tercera persona; el piloto, de sí mismo
      setAviso(
        pegado || cruzaDeMes(bloqueEnMes)
          ? `${esAdmin ? "Ya tiene" : "Ya tienes"} vacaciones en este mes. Solo se permite un periodo por mes.`
          : `${esAdmin ? "Sus" : "Tus"} vacaciones deben ser días seguidos.`
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

  // "· Te/Le quedan Y días" junto al título de la barra: lo que se puede pedir (igual que el tope,
  // ya sin las solicitadas) menos lo seleccionado. Cada bloque cuenta en el año donde empieza.
  // No se muestra en modo falta ni con el diálogo de descuento abierto.
  const quedanSeleccion = (() => {
    if (total === 0 || modoFalta || descuentoAbierto) return null;
    // Modo día extra: lo que le quedaría de días extra (no toca el saldo de vacaciones)
    if (modoExtra) {
      const quedan = Math.max((diasExtra?.dias_disponibles ?? 0) - total, 0);
      const color = quedan > 2 ? "#2E7D32" : quedan > 0 ? "#F9A825" : "#C62828";
      return { quedan, siguiente: null as number | null, color, extra: true };
    }
    if (!saldo?.actual) return null;
    let diasActual = 0;
    let diasSiguiente = 0;
    for (const b of bloques) {
      const anio = anioDeVacaciones(saldo, b.inicio);
      if (anio === saldo.actual) diasActual += b.dias;
      else if (anio && anio === saldo.siguiente) diasSiguiente += b.dias;
    }
    const quedan = Math.max(Math.max(disponiblesDe(saldo.actual), 0) - diasActual, 0);
    const siguiente =
      diasSiguiente > 0 && saldo.siguiente
        ? Math.max(Math.max(disponiblesDe(saldo.siguiente), 0) - diasSiguiente, 0)
        : null;
    const color = quedan > 2 ? "#2E7D32" : quedan > 0 ? "#F9A825" : "#C62828";
    return { quedan, siguiente, color, extra: false };
  })();
  const tieneDiasExtra = (diasExtra?.dias_disponibles ?? 0) > 0;
  // En el diálogo: el empleado elegido (admin) o la propia persona (piloto)
  const personaSel = esAdmin ? personas.find((p) => p.clave === empleadoSel) : miPersona;

  // Historial de vacaciones (pestaña "Mis datos"): el del empleado elegido (admin) o el propio (piloto).
  // No es un hook: es solo el JSX de la tabla.
  const historial = seleccionVista && (
    <Box>
      <Typography sx={{ fontWeight: 700, color: "#1e293b", mb: 1, fontSize: 18 }}>
        {vistaPiloto ? "Mi historial de vacaciones" : "Historial de vacaciones"}
      </Typography>
      {errorVac && <Alert severity="error" sx={{ mb: 1 }}>{errorVac}</Alert>}
      {/* En computadora cabe en su columna (la Nota se corta con …); solo en celular se desliza de lado */}
      <TableContainer
        component={Paper}
        sx={{ borderRadius: "12px", border: `1px solid ${BORDE_TABLA}`, overflowX: "auto" }}
      >
        <Table size="small" sx={{ tableLayout: "fixed", width: "100%", minWidth: { xs: 720, md: 0 } }}>
          <colgroup>
            <col style={{ width: "25%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "13%" }} />
            <col />
            {!vistaPiloto && <col style={{ width: 44 }} />}
          </colgroup>
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
                const esFalta = p.tipo === "falta_injustificada";
                const estilo: EstiloVacacion | null = esDescuento(p)
                  ? ESTILO_DESCUENTO
                  : categoria
                  ? { ...ESTILO_VACACION[categoria], texto: esFalta ? "Falta" : ESTILO_VACACION[categoria].texto }
                  : null;
                const inicio = p.fecha_inicio.slice(0, 10);
                const fin = p.fecha_fin.slice(0, 10);
                const nota = p.nota?.trim();
                return (
                  <TableRow
                    key={p.id}
                    sx={{
                      "&:nth-of-type(odd)": { bgcolor: "#fff" },
                      "&:nth-of-type(even)": { bgcolor: "#f8fafc" },
                      "@media (hover: hover)": { "&:hover": { bgcolor: "rgba(10,40,120,0.05)" } },
                    }}
                  >
                    <TableCell sx={{ ...celdaSx, fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                      {textoPeriodo(inicio, fin)}
                    </TableCell>
                    <TableCell align="center" sx={{ ...celdaSx, fontSize: 13, color: "#475569", whiteSpace: "nowrap" }}>
                      {textoDias(p.dias)}
                    </TableCell>
                    <TableCell align="center" sx={{ ...celdaSx, px: 0.5 }}>
                      <Chip
                        size="small"
                        label={estilo?.texto ?? p.estado ?? "Sin estado"}
                        sx={{
                          maxWidth: "100%",
                          fontWeight: 600,
                          fontSize: 12,
                          bgcolor: estilo?.fondo ?? "#f1f5f9",
                          color: estilo?.color ?? "#475569",
                          border: `1px solid ${estilo?.borde ?? BORDE_TABLA}`,
                          textDecoration: estilo?.tachado ? "line-through" : undefined,
                        }}
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ ...celdaSx, fontSize: 13, color: "#475569" }}>
                      {esFalta ? (
                        "Falta"
                      ) : esDescuento(p) ? (
                        "Descuento"
                      ) : esDiaExtra(p) ? (
                        <Box component="span" sx={{ color: NARANJA_EXTRA, fontWeight: 700 }}>Día extra</Box>
                      ) : (
                        "Vacaciones"
                      )}
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ ...celdaSx, fontSize: 13, color: "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                    >
                      {p.cubre_clave?.trim() || "—"}
                    </TableCell>
                    <TableCell
                      sx={{ ...celdaSx, fontSize: 13, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                    >
                      {/* Si no cabe se corta con …; completa al pasar el mouse */}
                      {nota ? (
                        <Tooltip arrow title={nota}>
                          <span>{nota}</span>
                        </Tooltip>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    {!vistaPiloto && (
                      <TableCell align="center" sx={{ ...celdaSx, px: 0 }}>
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
                <TableCell sx={{ ...celdaSx, fontWeight: 700, color: "#1e293b", borderBottom: 0 }}>Totales</TableCell>
                <TableCell
                  colSpan={columnasTabla - 1}
                  sx={{ ...celdaSx, fontSize: 13, fontWeight: 700, color: "#1e293b", borderBottom: 0 }}
                >
                  Tomados: {textoDias(totalDias(periodosTabla, "tomada", hoy))} · Autorizados:{" "}
                  {textoDias(totalDias(periodosTabla, "autorizada", hoy))}
                  {totalDescuentos(periodosTabla) > 0 && ` · Descuentos: ${textoDias(totalDescuentos(periodosTabla))}`}
                  {totalDiasExtra(periodosTabla, hoy) > 0 && ` · Días extra: ${textoDias(totalDiasExtra(periodosTabla, hoy))}`}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  return (
    // Con el botón flotante del piloto, espacio extra abajo para que no tape la tabla.
    // "Mis solicitudes" y "Panel de control" de admin usan todo el ancho, como Gestión de Usuarios
    <Container
      maxWidth={pestana >= 2 && !vistaPiloto ? false : "lg"}
      sx={{ mt: 4, mb: vistaPiloto && total > 0 && pestana === 1 ? 12 : 6 }}
    >
      {/* Para admin la página es "Vacaciones"; el piloto la ve como "Mis vacaciones" */}
      <Typography variant="h5" sx={{ fontWeight: 700, color: "#1e293b", mb: 2 }}>
        {esAdmin ? "Vacaciones" : "Mis vacaciones"}
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
        <Box
          sx={{
            display: "grid",
            gap: 3,
            alignItems: "start",
            // Sin persona elegida no hay historial: los datos ocupan todo el ancho
            // minmax(0, …): la tabla no ensancha la columna; en celular solo la tabla se desliza de lado
            gridTemplateColumns: { xs: "minmax(0, 1fr)", md: historial ? "minmax(0, 2fr) minmax(0, 3fr)" : "minmax(0, 1fr)" },
          }}
        >
          <MisDatosPerfil
            personas={personasVista}
            cargando={cargandoVista}
            error={errorVista}
            seleccion={seleccionVista}
            onSeleccion={cambiarEmpleado}
            sinSelector={vistaPiloto}
          />
          {historial}
        </Box>
      )}

      {/* La selección (calendario y empleado) vive en este componente, así que no se pierde al cambiar de pestaña */}
      {pestana === 1 && (
        <>
          {/* Barra de acciones arriba del calendario (admin y piloto): se queda fija arriba al bajar */}
          <Paper
            elevation={0}
            sx={{
              position: "sticky",
              top: 8,
              zIndex: 10,
              mb: 2,
              p: 2,
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              // Con muchos botones (admin), bajan de renglón en lugar de apretar el texto
              flexWrap: { sm: "wrap" },
              alignItems: { xs: "stretch", sm: "center" },
              gap: 2,
              bgcolor: "#fff",
              border: `1px solid ${BORDE_TABLA}`,
              borderLeft: `6px solid ${NAVY_BARRA}`,
              borderRadius: 2,
              boxShadow: "0 2px 8px rgba(15,23,42,0.08)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: "1 1 280px", minWidth: 0 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                  borderRadius: "50%",
                  bgcolor: total > 0 ? NAVY_BARRA : "#cbd5e1",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CalendarMonthIcon sx={{ fontSize: 22 }} />
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                {total > 0 ? (
                  <>
                    <Typography sx={{ fontWeight: 700, fontSize: 18, color: "#1e293b", lineHeight: 1.3 }}>
                      {total} {total === 1 ? "día seleccionado" : "días seleccionados"}
                      {quedanSeleccion && (
                        <>
                          {" "}
                          <Box component="span" sx={{ color: quedanSeleccion.color, whiteSpace: "nowrap" }}>
                            · {vistaPiloto ? "Te" : "Le"} quedan {quedanSeleccion.quedan}{" "}
                            {quedanSeleccion.quedan === 1 ? "día" : "días"}
                            {quedanSeleccion.extra ? " extra" : ""}
                          </Box>
                          {quedanSeleccion.siguiente !== null && (
                            <Box component="span" sx={{ fontSize: 13, fontWeight: 500, color: "#64748b", ml: 0.75, whiteSpace: "nowrap" }}>
                              (siguiente año: {quedanSeleccion.siguiente})
                            </Box>
                          )}
                        </>
                      )}
                    </Typography>
                    {/* Una tarjeta por bloque: en fila (con wrap) en computadora, dos columnas en celular */}
                    <Box
                      sx={{
                        mt: 1,
                        gap: "10px",
                        display: { xs: "grid", sm: "flex" },
                        gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))" },
                        flexWrap: { sm: "wrap" },
                      }}
                    >
                      {bloques.map((b) => {
                        const t = textosTarjetaBloque(b);
                        return (
                          <Box
                            key={b.inicio}
                            sx={{
                              bgcolor: "#EEF2FA",
                              borderLeft: `4px solid ${NAVY_BARRA}`,
                              borderRadius: "10px",
                              py: 1,
                              px: 1.5,
                              minWidth: { sm: 120 },
                              boxShadow: "0 1px 4px rgba(15,23,42,0.10)",
                              animation: `${aparecerTarjeta} 150ms ease-out`,
                            }}
                          >
                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: NAVY_BARRA, letterSpacing: 0.5, lineHeight: 1.2 }}>
                              {t.meses}
                            </Typography>
                            <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#1e293b", lineHeight: 1.3 }}>
                              {t.rango}
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: "#64748b", lineHeight: 1.3 }}>{t.semana}</Typography>
                            <Box
                              component="span"
                              sx={{
                                display: "inline-block",
                                mt: 0.75,
                                px: 1,
                                py: 0.25,
                                borderRadius: "999px",
                                bgcolor: NAVY_BARRA,
                                color: "#fff",
                                fontSize: 12,
                                fontWeight: 700,
                              }}
                            >
                              {t.dias}
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  </>
                ) : (
                  <Typography sx={{ fontWeight: 600, fontSize: 16, color: "#64748b" }}>
                    {vistaPiloto ? "Selecciona tus días en el calendario" : "Selecciona los días en el calendario"}
                  </Typography>
                )}
              </Box>
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                flexWrap: { sm: "wrap" },
                justifyContent: { sm: "flex-end" },
                alignItems: { xs: "stretch", sm: "center" },
                gap: 1,
                ml: { sm: "auto" },
              }}
            >
              <Button
                variant="text"
                size="small"
                disabled={total === 0}
                onClick={() => setSeleccionadas(new Set())}
                sx={{ color: "#64748b", fontWeight: 600 }}
              >
                Limpiar
              </Button>
              {vistaPiloto ? (
                <>
                  <Button
                    variant="contained"
                    size="small"
                    disabled={total === 0 || !miClave || modoExtra}
                    onClick={abrirConfirmacion}
                    sx={BOTON_NAVY}
                  >
                    SOLICITAR VACACIONES
                  </Button>
                  {/* Primer toque: entra al modo día extra. Ya en el modo, con días marcados: pide */}
                  {(tieneDiasExtra || modoExtra) && (
                    <Button
                      variant="contained"
                      size="small"
                      disabled={(modoExtra && total === 0) || !miClave}
                      onClick={() => (modoExtra ? abrirConfirmacion() : cambiarModoExtra(true))}
                      sx={BOTON_EXTRA}
                    >
                      PEDIR DÍA EXTRA
                    </Button>
                  )}
                </>
              ) : (
                empleadoSel && (
                  <>
                    <Button
                      variant="contained"
                      size="small"
                      disabled={modoFalta || modoExtra || total === 0}
                      onClick={abrirConfirmacion}
                      sx={BOTON_NAVY}
                    >
                      REGISTRAR VACACIONES
                    </Button>
                    {/* Primer toque: entra al modo falta. Ya en el modo, con días marcados: registra */}
                    <Button
                      variant="contained"
                      size="small"
                      disabled={(modoFalta && total === 0) || modoExtra}
                      onClick={() => (modoFalta ? abrirConfirmacion() : cambiarModoFalta(true))}
                      sx={{ bgcolor: "#000", color: "#fff", fontWeight: 700, boxShadow: "none", "&:hover": { bgcolor: "#333" } }}
                    >
                      REGISTRAR FALTA INJUSTIFICADA
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      disabled={modoFalta || modoExtra}
                      onClick={abrirDescuento}
                      sx={{ color: ROJO_BARRA, borderColor: ROJO_BARRA, fontWeight: 700, "&:hover": { borderColor: ROJO_BARRA, bgcolor: "#fdecea" } }}
                    >
                      REGISTRAR DESCUENTO
                    </Button>
                    {(tieneDiasExtra || modoExtra) && (
                      <Button
                        variant="contained"
                        size="small"
                        disabled={(modoExtra && total === 0) || modoFalta}
                        onClick={() => (modoExtra ? abrirConfirmacion() : cambiarModoExtra(true))}
                        sx={BOTON_EXTRA}
                      >
                        REGISTRAR DÍA EXTRA
                      </Button>
                    )}
                    <Button
                      variant="outlined"
                      size="small"
                      disabled={modoFalta || modoExtra}
                      onClick={abrirOtorgar}
                      sx={{ color: NARANJA_EXTRA, borderColor: NARANJA_EXTRA, fontWeight: 700, "&:hover": { borderColor: NARANJA_EXTRA, bgcolor: "#FFF3E0" } }}
                    >
                      OTORGAR DÍA EXTRA
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
                // En celular no se sale de la pantalla
                maxWidth: "calc(100vw - 32px)",
                whiteSpace: "nowrap",
                zIndex: 1200,
                borderRadius: "999px",
                px: 3,
                py: 1.5,
                fontWeight: 700,
                bgcolor: modoExtra ? NARANJA_EXTRA : AZUL,
                boxShadow: "0 8px 24px rgba(10,40,120,0.35)",
                "&:hover": { bgcolor: modoExtra ? "#D65F00" : "#081f5e" },
              }}
            >
              {modoExtra ? "PEDIR DÍA EXTRA" : "SOLICITAR"} ({total} {total === 1 ? "día" : "días"})
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
              Modo falta injustificada: se puede marcar cualquier día. Al terminar, pulsa REGISTRAR FALTA INJUSTIFICADA.
            </Alert>
          )}

          {modoExtra && (
            <Alert
              severity="warning"
              icon={<EventAvailableIcon fontSize="inherit" />}
              sx={{ mb: 2, bgcolor: "#FFF3E0", color: "#7C2D12", "& .MuiAlert-icon": { color: NARANJA_EXTRA } }}
              action={
                <Button color="inherit" size="small" onClick={() => cambiarModoExtra(false)}>
                  Salir
                </Button>
              }
            >
              {esAdmin
                ? "Modo día extra: se puede marcar cualquier fecha dentro de la vigencia. Al terminar, pulsa REGISTRAR DÍA EXTRA."
                : "Modo día extra: marca los días que quieres pedir. Al terminar, pulsa PEDIR DÍA EXTRA."}
            </Alert>
          )}

          {seleccionVista && (
            <CuadrosSaldo
              saldo={saldo}
              cargando={cargandoSaldo}
              error={errorSaldo}
              hoy={hoy}
              piloto={vistaPiloto}
              diasExtra={diasExtra}
            />
          )}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
              gap: 2,
            }}
          >
            {/* Admin en modo día extra puede capturar fechas pasadas, como en modo falta */}
            {mesesCalendario(hoy, modoFalta || (esAdmin && modoExtra) ? MESES_ATRAS_FALTA : 0).map(({ anio, mes }) => (
              <MesCalendario
                key={`${anio}-${mes}`}
                anio={anio}
                mes={mes}
                hoy={hoy}
                primerDisponible={primerDisponible}
                seleccionadas={seleccionadas}
                vacaciones={diasVacaciones}
                modoFalta={modoFalta || (esAdmin && modoExtra)}
                motivoBloqueo={motivoBloqueo}
                sinAnticipacionDe={vistaPiloto && modoExtra ? sinAnticipacionExtra : undefined}
                onToggle={toggleDia}
              />
            ))}
          </Box>

          <Box sx={{ mt: 1.5, display: "flex", flexWrap: "wrap", gap: 2 }}>
            {[
              { texto: "Seleccionado", fondo: COLOR_SELECCION, borde: COLOR_SELECCION, color: "#fff" },
              { texto: "No disponible", fondo: "#f1f5f9", borde: "#e2e8f0", color: "#cbd5e1" },
              { texto: "Periodo bloqueado por ventas", fondo: COLOR_BLOQUEO, borde: COLOR_BLOQUEO, color: "#fff" },
              ...PRIORIDAD_VACACION.map((e) => ({
                texto:
                  e === "falta" || e === "extra"
                    ? ESTILO_VACACION[e].texto
                    : `Vacaciones ${ESTILO_VACACION[e].texto.toLowerCase()}`,
                ...COLOR_CALENDARIO[e],
              })),
            ].map(
              ({
                texto,
                fondo,
                borde,
                color,
                tachado,
                punteado,
              }: {
                texto: string;
                fondo: string;
                borde: string;
                color: string;
                tachado?: boolean;
                punteado?: boolean;
              }) => (
              <Box key={texto} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: "4px",
                    bgcolor: fondo,
                    border: `${punteado ? "2px dashed" : "1px solid"} ${borde}`,
                    // Rayita diagonal: el tachado de las rechazadas (del color de su número)
                    backgroundImage: tachado
                      ? `linear-gradient(to top right, transparent 44%, ${color} 44%, ${color} 56%, transparent 56%)`
                      : undefined,
                  }}
                />
                <Typography sx={{ fontSize: 12, color: "#64748b" }}>{texto}</Typography>
              </Box>
              )
            )}
          </Box>

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
          {vistaPiloto
            ? modoExtra
              ? "Pedir día extra"
              : "Solicitar vacaciones"
            : modoFalta
            ? "Registrar falta injustificada"
            : modoExtra
            ? "Registrar día extra"
            : "Registrar vacaciones"}
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

      <Dialog open={otorgarAbierto} onClose={() => !guardando && setOtorgarAbierto(false)} fullWidth maxWidth="xs">
        <DialogTitle>Otorgar día extra</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontWeight: 700, color: "#1e293b" }}>
            {personaSel?.nombre || "Sin nombre"} · {personaSel?.idVisible ?? empleadoSel}
          </Typography>
          {(diasExtra?.otorgados.length ?? 0) > 0 && (
            <Box sx={{ mt: 1.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Ya otorgados</Typography>
              {diasExtra!.otorgados.map((o) => (
                <Box
                  key={o.id}
                  sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.25, borderBottom: "1px solid #e2e8f0" }}
                >
                  <Typography sx={{ fontSize: 13, color: "#1e293b", flex: 1, minWidth: 0 }}>
                    Festivo {fechaCorta(o.fecha_festivo)} · {textoDias(o.dias)} · vence {fechaCorta(o.vence)}
                    {!o.vigente && " (vencido)"}
                  </Typography>
                  <Tooltip title="Quitar este día extra">
                    <span>
                      <IconButton
                        size="small"
                        aria-label={`Quitar festivo ${fechaCorta(o.fecha_festivo)}`}
                        disabled={guardando}
                        onClick={() => {
                          setErrorQuitar(null);
                          setPorQuitar(o);
                        }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              ))}
            </Box>
          )}
          <Typography sx={{ fontSize: 13, color: "#64748b", mt: 1 }}>
            Vence un año después del festivo (un día antes del aniversario). No sale del saldo de vacaciones.
          </Typography>
          <TextField
            label="Fecha del festivo"
            type="date"
            value={festivoOtorgar}
            onChange={(e) => {
              const valor = e.target.value;
              setFestivoOtorgar(valor);
              // Motivo sugerido mientras no lo escriban a mano
              if (!motivoOtorgar.trim() || motivoOtorgar.startsWith("Trabajó festivo ")) {
                setMotivoOtorgar(valor ? `Trabajó festivo ${fechaCorta(valor)}` : "");
              }
            }}
            fullWidth
            size="small"
            sx={{ mt: 2 }}
            InputLabelProps={{ shrink: true }}
            inputProps={{ max: hoy }}
          />
          <TextField
            label="Días"
            type="number"
            value={diasOtorgar}
            onChange={(e) => setDiasOtorgar(e.target.value)}
            fullWidth
            size="small"
            sx={{ mt: 2 }}
            inputProps={{ min: 1, max: 6, step: 1 }}
          />
          <TextField
            label="Motivo (obligatorio)"
            value={motivoOtorgar}
            onChange={(e) => setMotivoOtorgar(e.target.value)}
            fullWidth
            size="small"
            sx={{ mt: 2 }}
            inputProps={{ maxLength: 500 }}
          />
          {errorOtorgar && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {errorOtorgar}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={guardando} onClick={() => setOtorgarAbierto(false)}>
            Cancelar
          </Button>
          <Button variant="contained" disabled={guardando || !otorgarValido} onClick={guardarOtorgar} sx={BOTON_EXTRA}>
            {guardando ? "Guardando…" : "Otorgar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={porQuitar !== null} onClose={() => !guardando && setPorQuitar(null)} fullWidth maxWidth="xs">
        <DialogTitle>Quitar día extra</DialogTitle>
        <DialogContent>
          {porQuitar && (
            <Typography sx={{ color: "#475569" }}>
              ¿Quitar {textoDias(porQuitar.dias)} de descanso extra del festivo {fechaCorta(porQuitar.fecha_festivo)} a{" "}
              {personaSel?.nombre || empleadoSel}? Esta acción no se puede deshacer.
            </Typography>
          )}
          {errorQuitar && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {errorQuitar}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={guardando} onClick={() => setPorQuitar(null)}>
            Cancelar
          </Button>
          <Button variant="contained" color="error" disabled={guardando || errorQuitar !== null} onClick={quitarOtorgado}>
            {guardando ? "Quitando…" : "Quitar"}
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
