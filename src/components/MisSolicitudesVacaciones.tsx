import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import axios from "axios";
import { authH, Persona, SelectorEmpleado } from "./MisDatosPerfil";

const API = "/api";
const VERDE = "#15803D";
const ROJO = "#B91C1C";

const NIVELES = [
  { nivel: "rh", texto: "RH" },
  { nivel: "encargado", texto: "Encargado" },
  { nivel: "gerencia", texto: "Gerencia" },
] as const;

type Nivel = typeof NIVELES[number]["nivel"];

type Aprobaciones = { [K in `aprobado_${Nivel}`]: boolean | null } & {
  [K in `aprobado_${Nivel}_por` | `aprobado_${Nivel}_at`]: string | null;
};

interface Solicitud extends Aprobaciones {
  id: number;
  clave: string;
  nombre_completo?: string | null;
  fecha_inicio: string; // "YYYY-MM-DD"
  fecha_fin: string;
  dias: number | null;
  estado: string | null;
  nota: string | null;
  cubre_clave: string | null;
  // Confirmación de quien cubre: null sin respuesta, true confirmó, false no puede
  cubre_confirmado?: boolean | null;
  cubre_confirmado_por?: string | null;
  cubre_confirmado_at?: string | null;
  // Quién cubre cada día (solo si se eligió gente distinta por día; vacío = como siempre, cubre_clave)
  cubre_por_dia?: CubreDia[];
  // "vacaciones" o "dia_extra" (el día extra no usa el saldo de vacaciones)
  tipo?: string | null;
  // Saldo del año de vacaciones (GET /vacaciones/solicitudes); null sin fecha de ingreso
  modulos?: string[];
  dias_corresponden?: number | null;
  ciclo_inicio?: string | null;
  ciclo_fin?: string | null;
  dias_usados?: number | null;
  dias_quedan?: number | null;
}

// Un día de "Cubrir por día": cubre_clave null = "No tengo quién me cubra" ese día
interface CubreDia {
  fecha: string; // "YYYY-MM-DD"
  cubre_clave: string | null;
  confirmado: boolean | null;
  confirmado_por?: string | null;
  confirmado_at?: string | null;
}

const NOMBRE_DIA = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
// "2027-02-08" → "lun 08/02"
const etiquetaDia = (iso: string) => {
  const d = new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))));
  return `${NOMBRE_DIA[d.getUTCDay()]} ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
};

// El detail del backend (409 de empalme, 400 de clave) o, si no hay, el texto dado
export const mensajeError = (e: unknown, porDefecto: string) => {
  const detalle = axios.isAxiosError(e) ? e.response?.data?.detail : null;
  return typeof detalle === "string" ? detalle : porDefecto;
};

const fechaCorta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

const claveCubre = (clave: string | null) => clave?.trim().toUpperCase() || null;

const momento = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

// Para buscar sin importar mayúsculas ni acentos
const sinAcentos = (texto: string) =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();

const numero = (n: number) => n.toLocaleString("es-MX", { maximumFractionDigits: 1 });

const textoDias = (dias: number) => `${numero(dias)} ${dias === 1 ? "día" : "días"}`;

const textoRango = (inicio: string, fin: string) =>
  inicio === fin ? fechaCorta(inicio) : `${fechaCorta(inicio)} – ${fechaCorta(fin)}`;

// Mismo estilo que Gestión de Usuarios y Validación de Chips: los títulos naranjas, la línea
// gris entre filas y el resaltado al pasar el mouse vienen del tema (theme.ts)
const celdaEncabezadoSx = { fontSize: 13, px: 1, whiteSpace: "nowrap" };
const celdaSx = { fontSize: 13, px: 1, py: 0.75 };
const COLUMNAS = 9;
// Fila en rojo cuando empieza en estos días (o ya empezó) y todavía no están los 4 en verde
const DIAS_ALERTA = 7;

// Celda "¿Quién cubre?": amarillo esperando, verde confirmó, rojo no puede
const ESTILO_CUBRE = {
  esperando: { fondo: "#FEF9C3", borde: "#CA8A04", color: "#854D0E", texto: "Esperando respuesta" },
  confirmo: { fondo: "#DCFCE7", borde: "#16A34A", color: VERDE, texto: "Confirmó" },
  noPuede: { fondo: "#FDE2E2", borde: ROJO, color: ROJO, texto: "No puede · elige a otra persona" },
} as const;

const hoyLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const diasEntre = (desde: string, hasta: string) =>
  Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86400000);
// "¿Quién cubre?" más bajo que el Autocomplete normal (letra 13 y menos relleno)
const selectorCompactoSx = {
  "& .MuiAutocomplete-root .MuiInputBase-root": { fontSize: 13, py: "1px" },
  "& .MuiInputLabel-root": { fontSize: 13 },
  "& .MuiInputLabel-root:not(.MuiInputLabel-shrink)": { transform: "translate(14px, 6px) scale(1)" },
};

interface Props {
  personas: Persona[];
  cargandoPersonas: boolean;
}

const MisSolicitudesVacaciones: React.FC<Props> = ({ personas, cargandoPersonas }) => {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [ocupada, setOcupada] = useState<number | null>(null);
  const [decisionGerencia, setDecisionGerencia] = useState<{ solicitud: Solicitud; aprobado: boolean } | null>(null);
  const [busqueda, setBusqueda] = useState("");
  // Celdas ya marcadas que se abrieron para cambiar la decisión ("id-nivel")
  const [editando, setEditando] = useState<Set<string>>(new Set());

  useEffect(() => {
    let vivo = true;
    axios
      .get<Solicitud[]>(`${API}/vacaciones/solicitudes`, { headers: authH() })
      .then((r) => vivo && setSolicitudes(r.data))
      .catch(() => vivo && setError("No se pudieron cargar las solicitudes."))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, []);

  // Una fila por solicitud, por fecha de inicio; el buscador filtra por ID o nombre
  const filas = useMemo(() => {
    const filtro = sinAcentos(busqueda);
    return solicitudes
      .filter(
        (s) =>
          !filtro || sinAcentos(s.clave).includes(filtro) || sinAcentos(s.nombre_completo ?? "").includes(filtro)
      )
      .sort((a, b) =>
        a.fecha_inicio === b.fecha_inicio ? a.id - b.id : a.fecha_inicio.localeCompare(b.fecha_inicio)
      );
  }, [solicitudes, busqueda]);

  const cerrarEdicion = (id: number, nivel: Nivel) =>
    setEditando((prev) => {
      const nuevo = new Set(prev);
      nuevo.delete(`${id}-${nivel}`);
      return nuevo;
    });

  const marcar = async (id: number, nivel: Nivel, aprobado: boolean) => {
    setOcupada(id);
    try {
      const { data } = await axios.patch<Solicitud>(
        `${API}/vacaciones/${id}/aprobacion`,
        { nivel, aprobado },
        { headers: authH() }
      );
      // La respuesta no trae nombre_completo: se conserva el que ya estaba
      setSolicitudes((prev) =>
        data.estado === "solicitada"
          ? prev.map((s) => (s.id === id ? { ...s, ...data } : s))
          : prev.filter((s) => s.id !== id)
      );
      if (data.estado === "autorizada") setExito("Autorizada: ya están RH, Encargado, Gerencia y quien cubre en verde.");
      cerrarEdicion(id, nivel);
    } catch (e) {
      setAviso(mensajeError(e, "No se pudo guardar la decisión."));
    } finally {
      setOcupada(null);
    }
  };

  // Gerencia pide confirmación: su rechazo es inmediato y final
  const pulsarNivel = (s: Solicitud, nivel: Nivel, aprobado: boolean) => {
    if (nivel === "gerencia") setDecisionGerencia({ solicitud: s, aprobado });
    else marcar(s.id, nivel, aprobado);
  };

  const confirmarGerencia = async () => {
    if (!decisionGerencia) return;
    await marcar(decisionGerencia.solicitud.id, "gerencia", decisionGerencia.aprobado);
    setDecisionGerencia(null);
  };

  const guardarCubre = async (id: number, cubre_clave: string | null) => {
    setOcupada(id);
    try {
      const { data } = await axios.patch<Solicitud>(
        `${API}/vacaciones/${id}/cubre`,
        { cubre_clave },
        { headers: authH() }
      );
      setSolicitudes((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
    } catch (e) {
      setAviso(mensajeError(e, "No se pudo guardar quién cubre."));
    } finally {
      setOcupada(null);
    }
  };

  // Por día: cambia quién cubre ESA fecha (solo admin reasigna)
  const guardarCubreDia = async (id: number, fecha: string, cubre_clave: string | null) => {
    setOcupada(id);
    try {
      const { data } = await axios.patch<Solicitud>(
        `${API}/vacaciones/${id}/cubre`,
        { cubre_clave, fecha },
        { headers: authH() }
      );
      setSolicitudes((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
    } catch (e) {
      setAviso(mensajeError(e, "No se pudo guardar quién cubre ese día."));
    } finally {
      setOcupada(null);
    }
  };

  // Reenvía "¿Confirmas que vas a cubrir...?" (sirve para las que ya estaban antes de este flujo).
  // Por día va a una persona (persona) con sus días que siguen sin respuesta.
  const reenviarAviso = async (s: Solicitud, persona?: string) => {
    setOcupada(s.id);
    try {
      await axios.post(`${API}/vacaciones/${s.id}/cubre/recordatorio`, {}, {
        headers: authH(),
        params: persona ? { cubre_clave: persona } : undefined,
      });
      setExito(`Aviso reenviado a ${persona ?? claveCubre(s.cubre_clave)}.`);
    } catch (e) {
      setAviso(mensajeError(e, "No se pudo reenviar el aviso."));
    } finally {
      setOcupada(null);
    }
  };

  // "Confirmar por él": quien cubre avisó por otro medio. Por día, confirma todos los días de esa persona.
  const confirmarPorEl = async (s: Solicitud, persona?: string) => {
    setOcupada(s.id);
    try {
      const { data } = await axios.patch<Solicitud>(
        `${API}/vacaciones/${s.id}/cubre/confirmacion`,
        persona ? { confirmo: true, cubre_clave: persona } : { confirmo: true },
        { headers: authH() }
      );
      setSolicitudes((prev) =>
        data.estado === "solicitada"
          ? prev.map((x) => (x.id === s.id ? { ...x, ...data } : x))
          : prev.filter((x) => x.id !== s.id)
      );
      setExito(
        data.estado === "autorizada"
          ? "Autorizada: ya están RH, Encargado, Gerencia y quien cubre en verde."
          : `Confirmado por ${persona ?? claveCubre(s.cubre_clave)}.`
      );
    } catch (e) {
      setAviso(mensajeError(e, "No se pudo confirmar."));
    } finally {
      setOcupada(null);
    }
  };

  // Debajo del selector: estado de la confirmación y acciones
  const estadoCubre = (s: Solicitud) => {
    if (!claveCubre(s.cubre_clave)) return null;
    const estilo =
      s.cubre_confirmado === true ? ESTILO_CUBRE.confirmo : s.cubre_confirmado === false ? ESTILO_CUBRE.noPuede : ESTILO_CUBRE.esperando;
    const quien = s.cubre_confirmado_por ? ` · ${s.cubre_confirmado_por} · ${momento(s.cubre_confirmado_at ?? null)}` : "";
    return (
      <Box sx={{ mt: 0.5, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.5 }}>
        <Tooltip arrow title={s.cubre_confirmado != null ? `Respondió${quien}` : "Todavía no responde"}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: estilo.color, cursor: "help" }}>{estilo.texto}</Typography>
        </Tooltip>
        {s.cubre_confirmado == null && (
          <Button
            size="small"
            disabled={ocupada === s.id}
            onClick={() => reenviarAviso(s)}
            sx={{ minWidth: 0, fontSize: 11, px: 0.5, py: 0, textTransform: "none" }}
          >
            Reenviar aviso
          </Button>
        )}
        {s.cubre_confirmado !== true && (
          <Button
            size="small"
            disabled={ocupada === s.id}
            onClick={() => confirmarPorEl(s)}
            sx={{ minWidth: 0, fontSize: 11, px: 0.5, py: 0, textTransform: "none", color: VERDE }}
          >
            Confirmar por él
          </Button>
        )}
      </Box>
    );
  };

  // Por día: una fila por fecha con su selector, su estado y sus acciones (por persona)
  const cubrePorDia = (s: Solicitud, opcionesCubre: Persona[]) => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
      {(s.cubre_por_dia ?? []).map((d) => {
        const persona = claveCubre(d.cubre_clave);
        const estilo =
          d.confirmado === true ? ESTILO_CUBRE.confirmo : d.confirmado === false ? ESTILO_CUBRE.noPuede : ESTILO_CUBRE.esperando;
        const quien = d.confirmado_por ? ` · ${d.confirmado_por} · ${momento(d.confirmado_at ?? null)}` : "";
        return (
          <Box key={d.fecha} sx={{ display: "flex", alignItems: "flex-start", gap: 0.75 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#475569", width: 62, flexShrink: 0, pt: "6px" }}>
              {etiquetaDia(d.fecha)}
            </Typography>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <SelectorEmpleado
                personas={opcionesCubre}
                cargando={cargandoPersonas}
                seleccion={persona}
                onSeleccion={(clave) => guardarCubreDia(s.id, d.fecha.slice(0, 10), clave)}
                etiqueta="Cubre"
                margenInferior={0}
              />
              <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.5 }}>
                {persona ? (
                  <Tooltip arrow title={d.confirmado != null ? `Respondió${quien}` : "Todavía no responde"}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: estilo.color, cursor: "help" }}>
                      {estilo.texto}
                    </Typography>
                  </Tooltip>
                ) : (
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#854D0E" }}>Sin quién cubra · elige a alguien</Typography>
                )}
                {persona && d.confirmado == null && (
                  <Button
                    size="small"
                    disabled={ocupada === s.id}
                    onClick={() => reenviarAviso(s, persona)}
                    sx={{ minWidth: 0, fontSize: 11, px: 0.5, py: 0, textTransform: "none" }}
                  >
                    Reenviar aviso
                  </Button>
                )}
                {persona && d.confirmado !== true && (
                  <Button
                    size="small"
                    disabled={ocupada === s.id}
                    onClick={() => confirmarPorEl(s, persona)}
                    sx={{ minWidth: 0, fontSize: 11, px: 0.5, py: 0, textTransform: "none", color: VERDE }}
                  >
                    Confirmar por él
                  </Button>
                )}
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );

  // Celda de un nivel: botones ✓ ✗; ya marcado, el chip (clic para cambiar la decisión)
  const celdaNivel = (s: Solicitud, nivel: Nivel, texto: string) => {
    const valor = s[`aprobado_${nivel}` as const];
    const abierta = editando.has(`${s.id}-${nivel}`);
    if (valor != null && !abierta) {
      const quien = s[`aprobado_${nivel}_por` as const] ?? "Sin nombre";
      return (
        <Tooltip title={`${valor ? "Aprobó" : "Rechazó"}: ${quien} · ${momento(s[`aprobado_${nivel}_at` as const])}`} arrow>
          <Chip
            size="small"
            label={valor ? "Aprobó" : "Rechazó"}
            // Chip compacto para que la columna no crezca
            onClick={() => setEditando((prev) => new Set(prev).add(`${s.id}-${nivel}`))}
            sx={{
              fontWeight: 600,
              fontSize: 12,
              height: 22,
              bgcolor: valor ? "#DCFCE7" : "#FDE2E2",
              color: valor ? VERDE : ROJO,
              border: `1px solid ${valor ? "#16A34A" : ROJO}`,
            }}
          />
        </Tooltip>
      );
    }
    return (
      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0 }}>
        <IconButton
          size="small"
          aria-label={`Aprobar ${texto}`}
          disabled={ocupada === s.id}
          onClick={() => pulsarNivel(s, nivel, true)}
          sx={{ color: VERDE, p: "3px" }}
        >
          <CheckIcon sx={{ fontSize: 18 }} />
        </IconButton>
        <IconButton
          size="small"
          aria-label={`Rechazar ${texto}`}
          disabled={ocupada === s.id}
          onClick={() => pulsarNivel(s, nivel, false)}
          sx={{ color: ROJO, p: "3px" }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
        {abierta && (
          <Button size="small" onClick={() => cerrarEdicion(s.id, nivel)} sx={{ minWidth: 0, fontSize: 11, px: 0.5 }}>
            Dejar
          </Button>
        )}
      </Box>
    );
  };

  // "Le quedan": saldo del año de vacaciones; rojo si esta solicitud no le alcanza
  const celdaQuedan = (s: Solicitud) => {
    if (s.tipo === "dia_extra") {
      return <Typography sx={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.2 }}>No usa saldo</Typography>;
    }
    if (s.dias_quedan == null || s.dias_corresponden == null) {
      return <Typography sx={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.2 }}>Sin fecha de ingreso</Typography>;
    }
    const despues = s.dias_quedan - Number(s.dias ?? 0);
    const anio =
      s.ciclo_inicio && s.ciclo_fin
        ? ` · Año de vacaciones: ${fechaCorta(s.ciclo_inicio)} – ${fechaCorta(s.ciclo_fin)}`
        : "";
    return (
      <Tooltip
        arrow
        title={`Le tocan ${numero(s.dias_corresponden)} · Usados ${numero(s.dias_usados ?? 0)} · Si se autoriza esta, le quedarían ${numero(despues)}${anio}`}
      >
        <Typography
          component="span"
          sx={{ fontSize: 22, fontWeight: 800, lineHeight: 1, color: despues < 0 ? ROJO : VERDE, cursor: "help" }}
        >
          {numero(s.dias_quedan)}
        </Typography>
      </Tooltip>
    );
  };

  const hoy = hoyLocal();

  // Todos los hooks van arriba: este return no puede quedar antes de ninguno
  if (cargando) {
    return (
      <Box sx={{ textAlign: "center", py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
          mb: 2,
        }}
      >
        <TextField
          size="small"
          placeholder="Buscar por nombre o ID"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          sx={{ width: { xs: "100%", sm: 320 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <Typography sx={{ fontSize: 12, color: "#64748b" }}>
          Se autoriza con RH, Encargado, Gerencia y quien cubre en verde · Gerencia ✗ rechaza de inmediato
        </Typography>
      </Box>

      {/* En computadora las columnas se reparten el ancho; solo en celular se desliza de lado */}
      <TableContainer component={Paper} sx={{ width: "100%", overflowX: "auto" }}>
        <Table size="small" sx={{ width: "100%", minWidth: { xs: 960, md: 0 } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={celdaEncabezadoSx}>ID</TableCell>
              <TableCell sx={celdaEncabezadoSx}>Módulo</TableCell>
              <TableCell sx={celdaEncabezadoSx}>Ciclo</TableCell>
              <TableCell align="center" sx={celdaEncabezadoSx}>Días</TableCell>
              {NIVELES.map(({ nivel, texto }) => (
                <TableCell key={nivel} align="center" sx={celdaEncabezadoSx}>{texto}</TableCell>
              ))}
              <TableCell sx={celdaEncabezadoSx}>¿Quién cubre?</TableCell>
              <TableCell align="center" sx={celdaEncabezadoSx}>Le quedan</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMNAS} align="center" sx={{ py: 4, fontSize: 14, color: "#94a3b8" }}>
                  {solicitudes.length === 0 ? "Sin solicitudes pendientes" : "Sin coincidencias"}
                </TableCell>
              </TableRow>
            ) : (
              filas.map((s) => {
                const inicio = s.fecha_inicio.slice(0, 10);
                const fin = s.fecha_fin.slice(0, 10);
                // El backend solo acepta personas con ID englobado, y nadie se cubre a sí mismo
                const opcionesCubre = personas.filter((p) => p.englobado && p.clave !== claveCubre(s.clave));
                // Nada automático al llegar la fecha: solo se marca en rojo para que admin lo resuelva
                const faltan = diasEntre(hoy, inicio);
                const alerta = faltan <= DIAS_ALERTA;
                const porDia = (s.cubre_por_dia ?? []).length > 0;
                // Por día: verde solo si todos confirmaron, rojo si alguien no puede, si no amarillo
                const estiloCubre = porDia
                  ? s.cubre_confirmado === true
                    ? ESTILO_CUBRE.confirmo
                    : s.cubre_confirmado === false
                    ? ESTILO_CUBRE.noPuede
                    : ESTILO_CUBRE.esperando
                  : !claveCubre(s.cubre_clave)
                    ? null
                    : s.cubre_confirmado === true
                    ? ESTILO_CUBRE.confirmo
                    : s.cubre_confirmado === false
                    ? ESTILO_CUBRE.noPuede
                    : ESTILO_CUBRE.esperando;
                return (
                  <TableRow key={s.id} sx={alerta ? { bgcolor: "#FEF2F2", "& > td:first-of-type": { boxShadow: `inset 4px 0 0 ${ROJO}` } } : undefined}>
                    <TableCell sx={{ ...celdaSx, whiteSpace: "nowrap" }}>
                      {/* El nombre completo va en el tooltip */}
                      <Tooltip arrow title={s.nombre_completo?.trim().toUpperCase() || "Sin nombre"}>
                        <Typography component="span" sx={{ fontSize: 13, fontWeight: 700, cursor: "help" }}>
                          {s.clave.trim().toUpperCase()}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ ...celdaSx, color: "#475569" }}>
                      {s.modulos && s.modulos.length > 0 ? s.modulos.join(", ") : "—"}
                    </TableCell>
                    <TableCell sx={{ ...celdaSx, whiteSpace: "nowrap" }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                        {textoRango(inicio, fin)}
                      </Typography>
                      {s.tipo === "dia_extra" && (
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#EF6C00" }}>Día extra</Typography>
                      )}
                      {alerta && (
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: ROJO }}>
                          {faltan > 1
                            ? `Empieza en ${faltan} días sin completar`
                            : faltan === 1
                            ? "Empieza mañana sin completar"
                            : faltan === 0
                            ? "Empieza hoy sin completar"
                            : `Empezó hace ${-faltan} ${faltan === -1 ? "día" : "días"} sin completar`}
                        </Typography>
                      )}
                      {s.nota?.trim() && (
                        <Typography sx={{ fontSize: 12, color: "#64748b", whiteSpace: "normal", maxWidth: 220 }}>
                          {s.nota.trim()}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center" sx={{ ...celdaSx, color: "#475569", whiteSpace: "nowrap" }}>
                      {s.dias != null ? textoDias(Number(s.dias)) : "—"}
                    </TableCell>
                    {NIVELES.map(({ nivel, texto }) => (
                      <TableCell key={nivel} align="center" sx={{ ...celdaSx, whiteSpace: "nowrap" }}>
                        {celdaNivel(s, nivel, texto)}
                      </TableCell>
                    ))}
                    <TableCell
                      sx={{
                        ...celdaSx,
                        width: "22%",
                        minWidth: porDia ? 250 : 170,
                        ...selectorCompactoSx,
                        ...(estiloCubre ? { bgcolor: estiloCubre.fondo, boxShadow: `inset 0 0 0 2px ${estiloCubre.borde}` } : {}),
                      }}
                    >
                      {porDia ? (
                        cubrePorDia(s, opcionesCubre)
                      ) : (
                        <>
                          <SelectorEmpleado
                            personas={opcionesCubre}
                            cargando={cargandoPersonas}
                            seleccion={claveCubre(s.cubre_clave)}
                            onSeleccion={(clave) => guardarCubre(s.id, clave)}
                            etiqueta="Cubre"
                            margenInferior={0}
                          />
                          {estadoCubre(s)}
                        </>
                      )}
                    </TableCell>
                    <TableCell align="center" sx={{ ...celdaSx, minWidth: 80 }}>
                      {celdaQuedan(s)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={decisionGerencia !== null}
        onClose={() => ocupada === null && setDecisionGerencia(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Decisión de Gerencia</DialogTitle>
        <DialogContent>
          {decisionGerencia && (
            <Typography sx={{ color: "#475569" }}>
              ¿{decisionGerencia.aprobado ? "Aprobar" : "Rechazar"} las vacaciones de{" "}
              {decisionGerencia.solicitud.nombre_completo?.trim() || decisionGerencia.solicitud.clave.trim()} del{" "}
              {fechaCorta(decisionGerencia.solicitud.fecha_inicio)} al {fechaCorta(decisionGerencia.solicitud.fecha_fin)}?{" "}
              {decisionGerencia.aprobado
                ? "Quedan autorizadas cuando RH, Encargado, Gerencia y quien cubre estén en verde."
                : "Se rechazan de inmediato. Esta decisión es final."}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={ocupada !== null} onClick={() => setDecisionGerencia(null)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color={decisionGerencia?.aprobado ? "success" : "error"}
            disabled={ocupada !== null}
            onClick={confirmarGerencia}
          >
            {decisionGerencia?.aprobado ? "Aprobar" : "Rechazar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={exito !== null}
        autoHideDuration={4000}
        onClose={() => setExito(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" onClose={() => setExito(null)} sx={{ width: "100%" }}>
          {exito}
        </Alert>
      </Snackbar>

      <Snackbar
        open={aviso !== null}
        autoHideDuration={5000}
        onClose={(_, razon) => razon !== "clickaway" && setAviso(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" variant="filled" onClose={() => setAviso(null)} sx={{ width: "100%" }}>
          {aviso}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MisSolicitudesVacaciones;
