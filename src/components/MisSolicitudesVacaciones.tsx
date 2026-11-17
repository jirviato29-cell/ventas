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
const AZUL = "#0A2878";
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
}

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

const textoDias = (dias: number) => `${dias.toLocaleString("es-MX")} ${dias === 1 ? "día" : "días"}`;

// Mismo estilo que la tabla de "Periodos de vacaciones" de Mi Perfil
const BORDE_TABLA = "#e2e8f0";
const celdaEncabezadoSx = { bgcolor: AZUL, color: "#fff", fontWeight: 700, fontSize: 13, borderColor: AZUL };
const celdaSx = { fontSize: 14, borderRight: `1px solid ${BORDE_TABLA}`, "&:last-of-type": { borderRight: 0 } };
const COLUMNAS = 7;

interface Grupo {
  clave: string;
  nombre: string;
  solicitudes: Solicitud[];
  dias: number;
}

interface Props {
  personas: Persona[];
  cargandoPersonas: boolean;
}

const MisSolicitudesVacaciones: React.FC<Props> = ({ personas, cargandoPersonas }) => {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
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

  // Una persona por grupo; grupos por su solicitud más próxima y, dentro, por fecha
  const grupos = useMemo(() => {
    const filtro = sinAcentos(busqueda);
    const mapa = new Map<string, Grupo>();
    solicitudes.forEach((s) => {
      const clave = claveCubre(s.clave) ?? "";
      const grupo = mapa.get(clave) ?? { clave, nombre: "", solicitudes: [], dias: 0 };
      if (!grupo.nombre && s.nombre_completo?.trim()) grupo.nombre = s.nombre_completo.trim().toUpperCase();
      grupo.solicitudes.push(s);
      grupo.dias += Number(s.dias ?? 0);
      mapa.set(clave, grupo);
    });
    const ordenar = (a: Solicitud, b: Solicitud) =>
      a.fecha_inicio === b.fecha_inicio ? a.id - b.id : a.fecha_inicio.localeCompare(b.fecha_inicio);
    return Array.from(mapa.values())
      .filter((g) => !filtro || sinAcentos(g.nombre).includes(filtro) || sinAcentos(g.clave).includes(filtro))
      .map((g) => ({ ...g, solicitudes: [...g.solicitudes].sort(ordenar) }))
      .sort((a, b) => ordenar(a.solicitudes[0], b.solicitudes[0]));
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
      cerrarEdicion(id, nivel);
    } catch (e) {
      setAviso(mensajeError(e, "No se pudo guardar la decisión."));
    } finally {
      setOcupada(null);
    }
  };

  // Lo que decide Gerencia ya no se puede cambiar, por eso pide confirmación
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
            onClick={() => setEditando((prev) => new Set(prev).add(`${s.id}-${nivel}`))}
            sx={{
              fontWeight: 600,
              bgcolor: valor ? "#DCFCE7" : "#FDE2E2",
              color: valor ? VERDE : ROJO,
              border: `1px solid ${valor ? "#16A34A" : ROJO}`,
            }}
          />
        </Tooltip>
      );
    }
    return (
      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}>
        <IconButton
          size="small"
          aria-label={`Aprobar ${texto}`}
          disabled={ocupada === s.id}
          onClick={() => pulsarNivel(s, nivel, true)}
          sx={{ color: VERDE, border: "1px solid #bbf7d0", p: 0.25 }}
        >
          <CheckIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          aria-label={`Rechazar ${texto}`}
          disabled={ocupada === s.id}
          onClick={() => pulsarNivel(s, nivel, false)}
          sx={{ color: ROJO, border: "1px solid #fecaca", p: 0.25 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
        {abierta && (
          <Button size="small" onClick={() => cerrarEdicion(s.id, nivel)} sx={{ minWidth: 0, fontSize: 11, px: 0.5 }}>
            Dejar
          </Button>
        )}
      </Box>
    );
  };

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
        <Typography sx={{ fontSize: 12, color: "#64748b" }}>La decisión final es de Gerencia</Typography>
      </Box>

      {/* En celular la tabla se desliza de lado en lugar de cortarse */}
      <TableContainer
        component={Paper}
        sx={{ borderRadius: "12px", border: `1px solid ${BORDE_TABLA}`, overflowX: "auto" }}
      >
        <Table size="small" sx={{ minWidth: 1000 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={celdaEncabezadoSx}>Empleado</TableCell>
              <TableCell sx={celdaEncabezadoSx}>Periodo</TableCell>
              <TableCell align="center" sx={celdaEncabezadoSx}>Días</TableCell>
              {NIVELES.map(({ nivel, texto }) => (
                <TableCell key={nivel} align="center" sx={celdaEncabezadoSx}>{texto}</TableCell>
              ))}
              <TableCell sx={celdaEncabezadoSx}>¿Quién cubre?</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {grupos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMNAS} align="center" sx={{ py: 4, fontSize: 14, color: "#94a3b8" }}>
                  {solicitudes.length === 0 ? "Sin solicitudes pendientes" : "Sin coincidencias"}
                </TableCell>
              </TableRow>
            ) : (
              grupos.map((g) => (
                <React.Fragment key={g.clave}>
                  {/* Encabezado del grupo: nombre, ID y resumen */}
                  <TableRow sx={{ bgcolor: "#eef2ff" }}>
                    <TableCell colSpan={COLUMNAS} sx={{ py: 1, borderTop: `2px solid ${AZUL}` }}>
                      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
                        <Typography sx={{ fontWeight: 700, color: "#1e293b", fontSize: 14 }}>
                          {g.nombre || "SIN NOMBRE"}
                        </Typography>
                        <Chip
                          size="small"
                          label={g.clave}
                          variant="outlined"
                          sx={{ color: AZUL, borderColor: AZUL, fontWeight: 600, bgcolor: "#fff" }}
                        />
                        <Typography sx={{ fontSize: 13, color: "#475569" }}>
                          {g.solicitudes.length} {g.solicitudes.length === 1 ? "solicitud" : "solicitudes"} ·{" "}
                          {textoDias(g.dias)}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>

                  {g.solicitudes.map((s, i) => {
                    const inicio = s.fecha_inicio.slice(0, 10);
                    const fin = s.fecha_fin.slice(0, 10);
                    // El backend solo acepta personas con ID englobado, y nadie se cubre a sí mismo
                    const opcionesCubre = personas.filter((p) => p.englobado && p.clave !== claveCubre(s.clave));
                    return (
                      <TableRow
                        key={s.id}
                        sx={{
                          bgcolor: i % 2 === 0 ? "#fff" : "#f8fafc",
                          "@media (hover: hover)": { "&:hover": { bgcolor: "rgba(10,40,120,0.05)" } },
                        }}
                      >
                        {/* Sin repetir el nombre: ya está en el encabezado del grupo */}
                        <TableCell sx={{ ...celdaSx, width: 40 }} />
                        <TableCell sx={{ ...celdaSx, whiteSpace: "nowrap" }}>
                          <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
                            {inicio === fin ? fechaCorta(inicio) : `${fechaCorta(inicio)} – ${fechaCorta(fin)}`}
                          </Typography>
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
                        <TableCell sx={{ ...celdaSx, minWidth: 240 }}>
                          <SelectorEmpleado
                            personas={opcionesCubre}
                            cargando={cargandoPersonas}
                            seleccion={claveCubre(s.cubre_clave)}
                            onSeleccion={(clave) => guardarCubre(s.id, clave)}
                            etiqueta="Cubre"
                            margenInferior={0}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </React.Fragment>
              ))
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
              ¿{decisionGerencia.aprobado ? "Autorizar" : "Rechazar"} las vacaciones de{" "}
              {decisionGerencia.solicitud.nombre_completo?.trim() || decisionGerencia.solicitud.clave.trim()} del{" "}
              {fechaCorta(decisionGerencia.solicitud.fecha_inicio)} al {fechaCorta(decisionGerencia.solicitud.fecha_fin)}?
              Esta decisión es final.
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
            {decisionGerencia?.aprobado ? "Autorizar" : "Rechazar"}
          </Button>
        </DialogActions>
      </Dialog>

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
