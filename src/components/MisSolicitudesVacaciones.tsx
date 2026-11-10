import React, { useEffect, useState } from "react";
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
  Paper,
  Snackbar,
  Typography,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";
import { authH, Persona, SelectorEmpleado } from "./MisDatosPerfil";

const API = "/api";
const AZUL = "#0A2878";
const VERDE = "#15803D";
const ROJO = "#B91C1C";

const NIVELES = [
  { nivel: "rh", texto: "RH" },
  { nivel: "encargado", texto: "ENCARGADO" },
  { nivel: "gerencia", texto: "GERENCIA" },
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

      <Typography sx={{ fontSize: 12, color: "#64748b", mb: 2 }}>La decisión final es de Gerencia</Typography>

      {!error && solicitudes.length === 0 && (
        <Typography sx={{ color: "#94a3b8", textAlign: "center", py: 6 }}>Sin solicitudes pendientes</Typography>
      )}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {solicitudes.map((s) => {
          const inicio = s.fecha_inicio.slice(0, 10);
          const fin = s.fecha_fin.slice(0, 10);
          const cubre = claveCubre(s.cubre_clave);
          // El backend solo acepta personas con ID englobado, y nadie se cubre a sí mismo
          const opcionesCubre = personas.filter((p) => p.englobado && p.clave !== claveCubre(s.clave));
          return (
            <Paper key={s.id} sx={{ p: 2 }}>
              <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
                <Typography sx={{ fontWeight: 700, color: "#1e293b" }}>
                  {s.nombre_completo?.trim() || "Sin nombre"}
                </Typography>
                <Chip size="small" label={s.clave.trim()} variant="outlined" sx={{ color: AZUL, borderColor: AZUL }} />
              </Box>
              <Typography sx={{ fontSize: 14, color: "#475569", mt: 0.5 }}>
                {inicio === fin ? fechaCorta(inicio) : `${fechaCorta(inicio)} – ${fechaCorta(fin)}`}
                {s.dias != null && ` · ${Number(s.dias)} ${Number(s.dias) === 1 ? "día" : "días"}`}
              </Typography>
              {s.nota?.trim() && (
                <Typography sx={{ fontSize: 13, color: "#64748b", mt: 0.5 }}>{s.nota.trim()}</Typography>
              )}

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
                  gap: 1.5,
                  mt: 2,
                }}
              >
                {NIVELES.map(({ nivel, texto }) => {
                  const valor = s[`aprobado_${nivel}` as const];
                  return (
                    <Box key={nivel} sx={{ border: "1px solid #e2e8f0", borderRadius: "8px", p: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{texto}</Typography>
                        <Box>
                          <IconButton
                            size="small"
                            aria-label={`Aprobar ${texto}`}
                            disabled={ocupada === s.id}
                            onClick={() => pulsarNivel(s, nivel, true)}
                            sx={{ color: VERDE }}
                          >
                            <CheckIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            aria-label={`Rechazar ${texto}`}
                            disabled={ocupada === s.id}
                            onClick={() => pulsarNivel(s, nivel, false)}
                            sx={{ color: ROJO }}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                      {valor != null && (
                        <Chip
                          size="small"
                          label={`${valor ? "Aprobó" : "Rechazó"} ${s[`aprobado_${nivel}_por` as const] ?? ""} · ${momento(
                            s[`aprobado_${nivel}_at` as const]
                          )}`}
                          sx={{
                            mt: 0.5,
                            height: "auto",
                            py: 0.25,
                            fontWeight: 600,
                            bgcolor: valor ? "#DCFCE7" : "#FDE2E2",
                            color: valor ? VERDE : ROJO,
                            "& .MuiChip-label": { whiteSpace: "normal" },
                          }}
                        />
                      )}
                    </Box>
                  );
                })}
              </Box>

              <Box sx={{ mt: 2 }}>
                <SelectorEmpleado
                  personas={opcionesCubre}
                  cargando={cargandoPersonas}
                  seleccion={cubre}
                  onSeleccion={(clave) => guardarCubre(s.id, clave)}
                  etiqueta="¿Quién cubre?"
                  margenInferior={0}
                />
                {cubre && (
                  <Typography sx={{ fontSize: 13, color: "#64748b", mt: 0.5 }}>Cubre: {cubre}</Typography>
                )}
              </Box>
            </Paper>
          );
        })}
      </Box>

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
