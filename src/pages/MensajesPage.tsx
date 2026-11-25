import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CampaignIcon from "@mui/icons-material/Campaign";
import GroupsIcon from "@mui/icons-material/Groups";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { obtenerRolDesdeToken } from "../components/Token";
import { authH } from "../components/MisDatosPerfil";
import { mensajeError } from "../components/MisSolicitudesVacaciones";
import { useAccesoMiPerfil } from "../components/useAccesoMiPerfil";
import {
  INTERVALO_NO_LEIDOS_MS,
  puedeVerMensajes,
  puedeVerMisSolicitudes,
  refrescarNoLeidos,
  useNoLeidos,
} from "../components/useNoLeidos";

// MENSAJES: avisos automáticos (los crea el backend) y conversación empleado <-> administración.
// La bandeja de administración es compartida entre todos los admins.

const AZUL = "#1565C0";
const NARANJA = "#f97316";
const LIMITE = 30;
const TEXTO_MAXIMO = 2000;
// Avisos para RH y encargados: llevan a su pantalla aunque no tengan Mi Perfil
const ENLACE_REVISAR = "/revisar-solicitudes";

interface CoberturaApi {
  vacacion_id: number;
  puede_responder: boolean;
  respuesta: boolean | null;
}
interface AvisoApi {
  id: number;
  tipo: string;
  texto: string;
  enlace: string | null;
  sobre_clave: string | null;
  creado_at: string | null;
  leido_at: string | null;
  // Solo en "¿Confirmas que vas a cubrir...?": botones CONFIRMO / NO PUEDO
  cobertura?: CoberturaApi | null;
}
interface MensajeApi {
  id: number;
  clave: string;
  de_admin: boolean;
  autor: string;
  texto: string;
  creado_at: string | null;
  leido_at: string | null;
}
interface ConversacionApi {
  clave: string;
  nombre: string | null;
  tiene_acceso: boolean;
  ultimo_texto: string | null;
  ultimo_at: string | null;
  ultimo_de_admin: boolean | null;
  // Si el último es mío: cuándo lo abrió la persona (null = todavía no)
  ultimo_leido_at?: string | null;
  no_leidos: number;
}
// GET /mensajes/grupos: personas = a quienes les llega (tienen MENSAJES); en_grupo = todas las del grupo
interface GrupoApi {
  grupo: string;
  titulo: string;
  personas: number;
  claves: string[];
  en_grupo: number;
}

// El backend manda UTC; se muestra en la hora de la computadora
const momento = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
  return d.toLocaleString("es-MX", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

const COLOR_TIPO: Record<string, string> = {
  solicitud_nueva: AZUL,
  solicitud_cancelada: "#64748b",
  solicitud_autorizada: "#2E7D32",
  solicitud_rechazada: "#C62828",
  dia_extra_otorgado: "#EF6C00",
  encargado_aprobo: "#2E7D32",
  cubrir_solicitud: "#7B1FA2",
  cubre_no_puede: "#C62828",
  cobertura_cancelada: "#64748b",
};

// Refresca mientras la pestaña está a la vista (mismo ritmo que el contador)
const useCadaMinuto = (fn: () => void, activo: boolean) => {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!activo) return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== "hidden") ref.current();
    }, INTERVALO_NO_LEIDOS_MS);
    return () => window.clearInterval(id);
  }, [activo]);
};

// ───────────────────────────── Avisos ─────────────────────────────
const ListaAvisos: React.FC<{ esAdmin: boolean; conEnlace: boolean }> = ({ esAdmin, conEnlace }) => {
  const navigate = useNavigate();
  const [respondiendo, setRespondiendo] = useState<number | null>(null);
  const [porNoPoder, setPorNoPoder] = useState<AvisoApi | null>(null);
  const [avisos, setAvisos] = useState<AvisoApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hayMas, setHayMas] = useState(false);
  // Borrar (solo admin): un aviso, o todos los leídos (cuántos = lo que dice el backend)
  const [porBorrar, setPorBorrar] = useState<AvisoApi | null>(null);
  const [leidosPorBorrar, setLeidosPorBorrar] = useState<number | null>(null);
  const [borrando, setBorrando] = useState(false);

  const cargar = useCallback(async (antesDe?: number) => {
    try {
      const r = await axios.get<AvisoApi[]>("/api/mensajes/avisos", {
        headers: authH(),
        params: { limite: LIMITE, ...(antesDe ? { antes_de: antesDe } : {}) },
      });
      setAvisos((prev) => (antesDe ? [...prev, ...r.data] : r.data));
      setHayMas(r.data.length === LIMITE);
      setError(null);
    } catch (e) {
      setError(mensajeError(e, "No se pudieron cargar los avisos."));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);
  // Solo la primera página: los avisos nuevos llegan arriba
  useCadaMinuto(() => {
    if (avisos.length <= LIMITE) cargar();
  }, true);

  const marcarLeido = async (a: AvisoApi) => {
    if (a.leido_at) return;
    try {
      const r = await axios.post<AvisoApi>(`/api/mensajes/avisos/${a.id}/leido`, {}, { headers: authH() });
      setAvisos((prev) => prev.map((x) => (x.id === a.id ? r.data : x)));
      refrescarNoLeidos();
    } catch {
      // Si falla, se queda sin leer; no estorba
    }
  };

  const leerTodos = async () => {
    try {
      await axios.post("/api/mensajes/avisos/leer-todos", {}, { headers: authH() });
      const ahora = new Date().toISOString();
      setAvisos((prev) => prev.map((x) => (x.leido_at ? x : { ...x, leido_at: ahora })));
      refrescarNoLeidos();
    } catch (e) {
      setError(mensajeError(e, "No se pudieron marcar los avisos."));
    }
  };

  // Solo borra el aviso: la solicitud de vacaciones o el día extra no cambian
  const eliminarAviso = async (a: AvisoApi) => {
    setBorrando(true);
    try {
      await axios.delete(`/api/mensajes/avisos/${a.id}`, { headers: authH() });
      setAvisos((prev) => prev.filter((x) => x.id !== a.id));
      setPorBorrar(null);
      refrescarNoLeidos();
    } catch (e) {
      setError(mensajeError(e, "No se pudo eliminar el aviso."));
      setPorBorrar(null);
      cargar();
    } finally {
      setBorrando(false);
    }
  };

  const pedirEliminarLeidos = async () => {
    try {
      const r = await axios.get<{ total: number }>("/api/mensajes/avisos/leidos/total", { headers: authH() });
      setLeidosPorBorrar(r.data.total);
    } catch (e) {
      setError(mensajeError(e, "No se pudieron contar los avisos leídos."));
    }
  };

  const eliminarLeidos = async () => {
    setBorrando(true);
    try {
      await axios.delete("/api/mensajes/avisos/leidos", { headers: authH() });
      setLeidosPorBorrar(null);
      refrescarNoLeidos();
      cargar();
    } catch (e) {
      setError(mensajeError(e, "No se pudieron eliminar los avisos leídos."));
      setLeidosPorBorrar(null);
    } finally {
      setBorrando(false);
    }
  };

  // CONFIRMO / NO PUEDO de "¿Confirmas que vas a cubrir...?"
  const responder = async (a: AvisoApi, confirmo: boolean) => {
    if (!a.cobertura || respondiendo !== null) return;
    setRespondiendo(a.id);
    try {
      await axios.post(`/api/mensajes/cobertura/${a.cobertura.vacacion_id}`, { confirmo }, { headers: authH() });
      const ahora = new Date().toISOString();
      setAvisos((prev) =>
        prev.map((x) =>
          x.cobertura?.vacacion_id === a.cobertura?.vacacion_id
            ? { ...x, leido_at: x.leido_at ?? ahora, cobertura: { ...x.cobertura!, puede_responder: false, respuesta: confirmo } }
            : x
        )
      );
      setPorNoPoder(null);
      refrescarNoLeidos();
    } catch (e) {
      setError(mensajeError(e, "No se pudo guardar tu respuesta."));
      setPorNoPoder(null);
      cargar();
    } finally {
      setRespondiendo(null);
    }
  };

  if (cargando) return <CircularProgress size={28} sx={{ display: "block", mx: "auto", my: 4 }} />;
  const sinLeer = avisos.some((a) => !a.leido_at);

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: "flex", alignItems: "center", mb: 1.5, gap: 1 }}>
        <Typography sx={{ color: "#64748b", fontSize: 14, flex: 1 }}>
          {esAdmin
            ? "Avisos de administración (compartidos entre todos los admins)."
            : "Avisos sobre tus solicitudes y días extra."}
        </Typography>
        <Button size="small" startIcon={<DoneAllIcon />} disabled={!sinLeer} onClick={leerTodos} sx={{ color: AZUL }}>
          Marcar todos como leídos
        </Button>
        {esAdmin && (
          <Button size="small" color="error" startIcon={<DeleteSweepIcon />} onClick={pedirEliminarLeidos}>
            Eliminar leídos
          </Button>
        )}
      </Box>
      {avisos.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center", color: "#64748b" }}>
          <NotificationsNoneIcon sx={{ fontSize: 40, color: "#cbd5e1" }} />
          <Typography>No hay avisos.</Typography>
        </Paper>
      )}
      {avisos.map((a) => {
        const nuevo = !a.leido_at;
        const color = COLOR_TIPO[a.tipo] ?? AZUL;
        return (
          <Paper
            key={a.id}
            variant="outlined"
            onClick={() => marcarLeido(a)}
            sx={{
              p: 1.5,
              mb: 1,
              display: "flex",
              alignItems: { xs: "flex-start", sm: "center" },
              flexDirection: { xs: "column", sm: "row" },
              gap: 1,
              borderLeft: `5px solid ${color}`,
              bgcolor: nuevo ? "#f8fafc" : "#fff",
              cursor: nuevo ? "pointer" : "default",
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: nuevo ? 700 : 400, color: "#1e293b", overflowWrap: "anywhere" }}>
                {nuevo && (
                  <Box
                    component="span"
                    aria-label="sin leer"
                    sx={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", bgcolor: "#d32f2f", mr: 1 }}
                  />
                )}
                {a.texto}
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#94a3b8" }}>{momento(a.creado_at)}</Typography>
            </Box>
            {a.cobertura && (
              <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }} onClick={(ev) => ev.stopPropagation()}>
                {a.cobertura.puede_responder ? (
                  <>
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      disabled={respondiendo !== null}
                      onClick={() => responder(a, true)}
                    >
                      Confirmo
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      disabled={respondiendo !== null}
                      onClick={() => setPorNoPoder(a)}
                    >
                      No puedo
                    </Button>
                  </>
                ) : (
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: a.cobertura.respuesta === true ? "#2E7D32" : a.cobertura.respuesta === false ? "#C62828" : "#94a3b8",
                    }}
                  >
                    {a.cobertura.respuesta === true
                      ? "Confirmado"
                      : a.cobertura.respuesta === false
                      ? "Dijiste que no puedes"
                      : "Ya no aplica"}
                  </Typography>
                )}
              </Box>
            )}
            {a.enlace && (conEnlace || a.enlace === ENLACE_REVISAR) && (
              <Button
                size="small"
                variant="outlined"
                onClick={(ev) => {
                  ev.stopPropagation();
                  marcarLeido(a);
                  navigate(a.enlace as string);
                }}
                sx={{ color: AZUL, borderColor: AZUL, whiteSpace: "nowrap", flexShrink: 0 }}
              >
                {a.enlace === ENLACE_REVISAR ? "Revisar solicitud" : esAdmin ? "Ver solicitudes" : "Ver mis solicitudes"}
              </Button>
            )}
            {esAdmin && !a.cobertura && (
              <IconButton
                size="small"
                aria-label="Eliminar aviso"
                title="Eliminar aviso"
                onClick={(ev) => {
                  ev.stopPropagation();
                  setPorBorrar(a);
                }}
                sx={{ color: "#94a3b8", flexShrink: 0, "&:hover": { color: "#C62828" } }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            )}
          </Paper>
        );
      })}
      {hayMas && (
        <Button fullWidth onClick={() => cargar(avisos[avisos.length - 1]?.id)} sx={{ color: AZUL }}>
          Ver avisos anteriores
        </Button>
      )}

      <Dialog open={porNoPoder !== null} onClose={() => respondiendo === null && setPorNoPoder(null)} fullWidth maxWidth="xs">
        <DialogTitle>No puedo cubrir</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "#475569" }}>
            {porNoPoder?.texto.replace(/^¿Confirmas que vas a cubrir a /, "¿Seguro que no puedes cubrir a ")} Se le avisará a
            administración para que elija a otra persona.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button disabled={respondiendo !== null} onClick={() => setPorNoPoder(null)}>
            Regresar
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={respondiendo !== null}
            onClick={() => porNoPoder && responder(porNoPoder, false)}
          >
            {respondiendo !== null ? "Enviando…" : "No puedo"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={porBorrar !== null} onClose={() => !borrando && setPorBorrar(null)} fullWidth maxWidth="xs">
        <DialogTitle>¿Eliminar este aviso?</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "#1e293b", mb: 1, overflowWrap: "anywhere" }}>{porBorrar?.texto}</Typography>
          <Typography sx={{ color: "#64748b", fontSize: 14 }}>
            Se quita para todos los admins. La solicitud y los días extra no cambian.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button disabled={borrando} onClick={() => setPorBorrar(null)}>
            Cancelar
          </Button>
          <Button variant="contained" color="error" disabled={borrando} onClick={() => porBorrar && eliminarAviso(porBorrar)}>
            {borrando ? "Eliminando…" : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={leidosPorBorrar !== null} onClose={() => !borrando && setLeidosPorBorrar(null)} fullWidth maxWidth="xs">
        <DialogTitle>Eliminar avisos leídos</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "#1e293b" }}>
            {leidosPorBorrar === 0
              ? "No hay avisos leídos para eliminar."
              : `Se van a eliminar ${leidosPorBorrar} ${leidosPorBorrar === 1 ? "aviso leído" : "avisos leídos"}.`}
          </Typography>
          {!!leidosPorBorrar && (
            <Typography sx={{ color: "#64748b", fontSize: 14, mt: 1 }}>
              Los que no se han leído se quedan. Las solicitudes y los días extra no cambian.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={borrando} onClick={() => setLeidosPorBorrar(null)}>
            {leidosPorBorrar === 0 ? "Cerrar" : "Cancelar"}
          </Button>
          {!!leidosPorBorrar && (
            <Button variant="contained" color="error" disabled={borrando} onClick={eliminarLeidos}>
              {borrando ? "Eliminando…" : `Eliminar ${leidosPorBorrar}`}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ───────────────────────────── Chat ─────────────────────────────
interface ChatProps {
  url: string; // GET y POST de la conversación
  soyAdmin: boolean;
  titulo: string;
  puedeEscribir: boolean;
  onCambio?: () => void;
  onVolver?: () => void;
}

const Chat: React.FC<ChatProps> = ({ url, soyAdmin, titulo, puedeEscribir, onCambio, onVolver }) => {
  const [mensajes, setMensajes] = useState<MensajeApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hayAnteriores, setHayAnteriores] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const finRef = useRef<HTMLDivElement | null>(null);
  const bajarRef = useRef(true);
  const cargadoRef = useRef(false);
  // Último id visto: si llega uno nuevo con la conversación abierta, el backend lo marca leído
  // al recargar y hay que actualizar el globito del menú y la lista
  const ultimoIdRef = useRef<number | null>(null);

  const cargar = useCallback(
    async (antesDe?: number) => {
      try {
        const r = await axios.get<MensajeApi[]>(url, {
          headers: authH(),
          params: { limite: LIMITE, ...(antesDe ? { antes_de: antesDe } : {}) },
        });
        if (antesDe) {
          bajarRef.current = false;
          setMensajes((prev) => [...r.data, ...prev]);
        } else {
          setMensajes((prev) => {
            bajarRef.current = prev.length === 0 || prev[prev.length - 1]?.id !== r.data[r.data.length - 1]?.id;
            // Conserva lo anterior que ya se había cargado con "ver anteriores"
            const primero = r.data[0]?.id;
            const viejos = primero ? prev.filter((m) => m.id < primero) : [];
            return [...viejos, ...r.data];
          });
        }
        if (antesDe || !cargadoRef.current) setHayAnteriores(r.data.length === LIMITE);
        setError(null);
        // Al abrir (o si llegó algo nuevo), el backend marca leídos los del otro lado:
        // se actualizan el globito y la lista
        const ultimoId = r.data[r.data.length - 1]?.id ?? null;
        if (!antesDe && (!cargadoRef.current || ultimoId !== ultimoIdRef.current)) {
          refrescarNoLeidos();
          onCambio?.();
        }
        if (!antesDe) ultimoIdRef.current = ultimoId;
        cargadoRef.current = true;
      } catch (e) {
        setError(mensajeError(e, "No se pudo cargar la conversación."));
      } finally {
        setCargando(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [url]
  );

  useEffect(() => {
    setMensajes([]);
    setCargando(true);
    setTexto("");
    bajarRef.current = true;
    cargadoRef.current = false;
    ultimoIdRef.current = null;
    cargar();
  }, [cargar]);
  useCadaMinuto(() => cargar(), true);

  useEffect(() => {
    if (bajarRef.current) finRef.current?.scrollIntoView?.({ block: "end" });
  }, [mensajes]);

  const enviar = async () => {
    const limpio = texto.trim();
    if (!limpio || enviando) return;
    setEnviando(true);
    try {
      const r = await axios.post<MensajeApi>(url, { texto: limpio }, { headers: authH() });
      bajarRef.current = true;
      setMensajes((prev) => [...prev, r.data]);
      setTexto("");
      setError(null);
      onCambio?.();
    } catch (e) {
      setError(mensajeError(e, "No se pudo enviar el mensaje."));
    } finally {
      setEnviando(false);
    }
  };

  const ultimoMioLeido = [...mensajes].reverse().find((m) => m.de_admin === soyAdmin && m.leido_at);

  return (
    <Paper variant="outlined" sx={{ display: "flex", flexDirection: "column", height: { xs: "70vh", md: 560 }, minWidth: 0 }}>
      <Box sx={{ px: 2, py: 1.25, borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 1 }}>
        {onVolver && (
          <IconButton
            size="small"
            onClick={onVolver}
            aria-label="Volver a la lista"
            sx={{ display: { xs: "inline-flex", md: "none" } }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        )}
        <Typography sx={{ fontWeight: 700, color: "#1e293b", overflowWrap: "anywhere" }}>{titulo}</Typography>
      </Box>
      <Box sx={{ flex: 1, overflowY: "auto", px: 2, py: 1.5, bgcolor: "#f8fafc" }}>
        {cargando && <CircularProgress size={24} sx={{ display: "block", mx: "auto", my: 3 }} />}
        {hayAnteriores && !cargando && (
          <Button size="small" fullWidth onClick={() => cargar(mensajes[0]?.id)} sx={{ color: AZUL, mb: 1 }}>
            Ver mensajes anteriores
          </Button>
        )}
        {!cargando && mensajes.length === 0 && (
          <Typography sx={{ color: "#94a3b8", textAlign: "center", mt: 4 }}>
            {soyAdmin ? "Todavía no hay mensajes con esta persona." : "Todavía no hay mensajes. Escribe a administración."}
          </Typography>
        )}
        {mensajes.map((m) => {
          const mio = m.de_admin === soyAdmin;
          return (
            <Box key={m.id} sx={{ display: "flex", justifyContent: mio ? "flex-end" : "flex-start", mb: 1 }}>
              <Box
                sx={{
                  maxWidth: "80%",
                  px: 1.5,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: mio ? AZUL : "#fff",
                  color: mio ? "#fff" : "#1e293b",
                  border: mio ? "none" : "1px solid #e2e8f0",
                }}
              >
                {!mio && (
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: NARANJA }}>{m.autor}</Typography>
                )}
                {soyAdmin && mio && (
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#bfdbfe" }}>{m.autor}</Typography>
                )}
                <Typography sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 15 }}>{m.texto}</Typography>
                <Typography sx={{ fontSize: 11, textAlign: "right", color: mio ? "#dbeafe" : "#94a3b8" }}>
                  {momento(m.creado_at)}
                  {ultimoMioLeido?.id === m.id && " · Leído"}
                </Typography>
              </Box>
            </Box>
          );
        })}
        <div ref={finRef} />
      </Box>
      {error && <Alert severity="error" sx={{ mx: 2, mt: 1 }}>{error}</Alert>}
      <Box sx={{ p: 1.5, borderTop: "1px solid #e2e8f0", display: "flex", gap: 1, alignItems: "flex-end" }}>
        <TextField
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            // Enter envía; Shift+Enter hace salto de línea
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar();
            }
          }}
          placeholder={puedeEscribir ? "Escribe un mensaje…" : "Esta persona todavía no tiene MENSAJES"}
          disabled={!puedeEscribir || enviando}
          multiline
          maxRows={4}
          fullWidth
          size="small"
          inputProps={{ maxLength: TEXTO_MAXIMO, "aria-label": "Mensaje" }}
        />
        <Button
          variant="contained"
          onClick={enviar}
          disabled={!puedeEscribir || enviando || !texto.trim()}
          endIcon={<SendIcon />}
          sx={{ bgcolor: AZUL, "&:hover": { bgcolor: "#0D47A1" }, flexShrink: 0 }}
        >
          Enviar
        </Button>
      </Box>
    </Paper>
  );
};

// ─────────────────── Mensajes de administración ───────────────────
const MensajesAdmin: React.FC = () => {
  const [conversaciones, setConversaciones] = useState<ConversacionApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [todosAbierto, setTodosAbierto] = useState(false);
  const [textoTodos, setTextoTodos] = useState("");
  const [enviandoTodos, setEnviandoTodos] = useState(false);
  const [errorTodos, setErrorTodos] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  // Filtro de la lista: todas o solo las que tienen mensajes sin leer
  const [soloNoLeidos, setSoloNoLeidos] = useState(false);
  // Escribir por grupo (Cadenas / Asesores / Encargados)
  const [grupos, setGrupos] = useState<GrupoApi[]>([]);
  const [grupoAbierto, setGrupoAbierto] = useState<GrupoApi | null>(null);
  const [textoGrupo, setTextoGrupo] = useState("");
  const [enviandoGrupo, setEnviandoGrupo] = useState(false);
  const [errorGrupo, setErrorGrupo] = useState<string | null>(null);
  // El borrador es de UN grupo: al abrir otro grupo se empieza vacío (no mandar a Asesores lo escrito para Cadenas)
  const [borradorDe, setBorradorDe] = useState<string | null>(null);

  const cargarGrupos = useCallback(async () => {
    try {
      const r = await axios.get<GrupoApi[]>("/api/mensajes/grupos", { headers: authH() });
      setGrupos(r.data);
      return r.data;
    } catch {
      return null;
    }
  }, []);

  const cargar = useCallback(async () => {
    cargarGrupos();
    try {
      const r = await axios.get<ConversacionApi[]>("/api/mensajes/conversaciones", { headers: authH() });
      setConversaciones(r.data);
      setError(null);
    } catch (e) {
      setError(mensajeError(e, "No se pudieron cargar las conversaciones."));
    } finally {
      setCargando(false);
    }
  }, [cargarGrupos]);
  useEffect(() => {
    cargar();
  }, [cargar]);
  useCadaMinuto(cargar, true);

  const conAcceso = conversaciones.filter((c) => c.tiene_acceso).length;
  // Primero las que tienen sin leer, luego la más reciente (misma regla que el backend)
  const ordenadas = [...conversaciones].sort(
    (a, b) =>
      Number(b.no_leidos > 0) - Number(a.no_leidos > 0) ||
      (b.ultimo_at ? Date.parse(b.ultimo_at) : 0) - (a.ultimo_at ? Date.parse(a.ultimo_at) : 0) ||
      a.clave.localeCompare(b.clave)
  );
  const conNoLeidos = ordenadas.filter((c) => c.no_leidos > 0).length;
  const visibles = soloNoLeidos ? ordenadas.filter((c) => c.no_leidos > 0) : ordenadas;

  const abrir = (clave: string) => {
    setAbierta(clave);
    // Se quita el color al instante; el backend lo marca al cargar la conversación
    setConversaciones((prev) => prev.map((c) => (c.clave === clave ? { ...c, no_leidos: 0 } : c)));
  };
  const actual = conversaciones.find((c) => c.clave === abierta) ?? null;

  const enviarTodos = async () => {
    const limpio = textoTodos.trim();
    if (!limpio || enviandoTodos) return;
    setEnviandoTodos(true);
    setErrorTodos(null);
    try {
      const r = await axios.post<{ enviados: number }>("/api/mensajes/todos", { texto: limpio }, { headers: authH() });
      setTodosAbierto(false);
      setTextoTodos("");
      setExito(`Mensaje enviado a ${r.data.enviados} ${r.data.enviados === 1 ? "persona" : "personas"}.`);
      cargar();
    } catch (e) {
      setErrorTodos(mensajeError(e, "No se pudo enviar."));
    } finally {
      setEnviandoTodos(false);
    }
  };

  const abrirGrupo = async (g: GrupoApi) => {
    setErrorGrupo(null);
    if (borradorDe !== g.grupo) {
      setTextoGrupo("");
      setBorradorDe(g.grupo);
    }
    setGrupoAbierto(g);
    // Conteo fresco al abrir: el diálogo confirma con el número real
    const frescos = await cargarGrupos();
    const fresco = frescos?.find((x) => x.grupo === g.grupo);
    if (fresco) setGrupoAbierto(fresco);
  };

  const enviarGrupo = async () => {
    const limpio = textoGrupo.trim();
    if (!grupoAbierto || !limpio || enviandoGrupo) return;
    setEnviandoGrupo(true);
    setErrorGrupo(null);
    try {
      const r = await axios.post<{ enviados: number }>(
        `/api/mensajes/grupos/${encodeURIComponent(grupoAbierto.grupo)}`,
        { texto: limpio },
        { headers: authH() },
      );
      setGrupoAbierto(null);
      setTextoGrupo("");
      setExito(`Mensaje enviado a ${r.data.enviados} ${r.data.enviados === 1 ? "persona" : "personas"} (${grupoAbierto.titulo}).`);
      cargar();
    } catch (e) {
      setErrorGrupo(mensajeError(e, "No se pudo enviar."));
    } finally {
      setEnviandoGrupo(false);
    }
  };

  const lista = (
    <Paper variant="outlined" sx={{ height: { xs: "auto", md: 560 }, overflowY: "auto", minWidth: 0 }}>
      <Box sx={{ p: 1.5, borderBottom: "1px solid #e2e8f0" }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<CampaignIcon />}
          onClick={() => {
            setErrorTodos(null);
            setTodosAbierto(true);
          }}
          disabled={conAcceso === 0}
          sx={{ bgcolor: NARANJA, "&:hover": { bgcolor: "#ea580c" } }}
        >
          Escribir a todos
        </Button>
        {grupos.length > 0 && (
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 1, mt: 1 }}>
            {grupos.map((g) => (
              <Button
                key={g.grupo}
                variant="outlined"
                size="small"
                startIcon={<GroupsIcon />}
                onClick={() => abrirGrupo(g)}
                disabled={g.personas === 0}
                title={g.personas === 0 ? `Nadie de ${g.titulo} tiene MENSAJES todavía` : undefined}
                sx={{ color: AZUL, borderColor: "#bfdbfe", fontWeight: 700, fontSize: 12, lineHeight: 1.2, px: 0.5 }}
              >
                {g.titulo} ({g.personas})
              </Button>
            ))}
          </Box>
        )}
        <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
          {[
            { valor: false, texto: "Todos" },
            { valor: true, texto: `No leídos${conNoLeidos ? ` (${conNoLeidos})` : ""}` },
          ].map((f) => (
            <Button
              key={f.texto}
              size="small"
              variant={soloNoLeidos === f.valor ? "contained" : "text"}
              onClick={() => setSoloNoLeidos(f.valor)}
              disableElevation
              sx={{
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 999,
                px: 1.5,
                minWidth: 0,
                ...(soloNoLeidos === f.valor
                  ? { bgcolor: AZUL, "&:hover": { bgcolor: "#0d47a1" } }
                  : { color: "#475569" }),
              }}
            >
              {f.texto}
            </Button>
          ))}
        </Box>
      </Box>
      {cargando && <CircularProgress size={24} sx={{ display: "block", mx: "auto", my: 3 }} />}
      {!cargando && conversaciones.length === 0 && (
        <Typography sx={{ p: 2, color: "#94a3b8" }}>Nadie tiene MENSAJES todavía.</Typography>
      )}
      {!cargando && conversaciones.length > 0 && visibles.length === 0 && (
        <Typography sx={{ p: 2, color: "#94a3b8" }}>No hay conversaciones sin leer.</Typography>
      )}
      {visibles.map((c) => (
        <Box
          key={c.clave}
          role="button"
          tabIndex={0}
          onClick={() => abrir(c.clave)}
          onKeyDown={(e) => e.key === "Enter" && abrir(c.clave)}
          sx={{
            px: 1.5,
            py: 1.25,
            borderBottom: "1px solid #f1f5f9",
            // Sin leer: fondo azul claro con raya azul a la izquierda
            borderLeft: `3px solid ${c.no_leidos > 0 ? AZUL : "transparent"}`,
            cursor: "pointer",
            bgcolor: c.clave === abierta ? "#e3f2fd" : c.no_leidos > 0 ? "#eff6ff" : "transparent",
            "&:hover": { bgcolor: c.clave === abierta ? "#e3f2fd" : c.no_leidos > 0 ? "#dbeafe" : "#f8fafc" },
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: c.no_leidos ? 800 : 600, color: "#1e293b", fontSize: 14 }} noWrap>
              {c.nombre || c.clave} · {c.clave}
            </Typography>
            <Typography sx={{ fontSize: 13, color: c.no_leidos ? "#1e293b" : "#64748b", fontWeight: c.no_leidos ? 600 : 400 }} noWrap>
              {c.ultimo_texto ? `${c.ultimo_de_admin ? "Tú: " : ""}${c.ultimo_texto}` : "Sin mensajes"}
            </Typography>
          </Box>
          <Box sx={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5 }}>
            <Typography sx={{ fontSize: 11, color: c.no_leidos ? AZUL : "#94a3b8", fontWeight: c.no_leidos ? 700 : 400 }}>
              {c.ultimo_de_admin && (
                <Box
                  component="span"
                  sx={{ color: c.ultimo_leido_at ? AZUL : "#94a3b8", fontWeight: 700, mr: 0.75 }}
                  title={c.ultimo_leido_at ? `Visto ${momento(c.ultimo_leido_at)}` : "Todavía no lo abre"}
                >
                  {c.ultimo_leido_at ? "✓✓ Visto" : "✓ Enviado"}
                </Box>
              )}
              {momento(c.ultimo_at)}
            </Typography>
            {c.no_leidos > 0 && (
              <Box
                sx={{
                  minWidth: 20,
                  height: 20,
                  px: 0.75,
                  borderRadius: 999,
                  bgcolor: AZUL,
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                aria-label={`${c.no_leidos} sin leer`}
              >
                {c.no_leidos > 99 ? "99+" : c.no_leidos}
              </Box>
            )}
          </Box>
        </Box>
      ))}
    </Paper>
  );

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0,1fr) minmax(0,2fr)" }, gap: 2 }}>
        {/* En celular: la lista o el chat, uno a la vez */}
        <Box sx={{ display: { xs: actual ? "none" : "block", md: "block" }, minWidth: 0 }}>{lista}</Box>
        <Box sx={{ display: { xs: actual ? "block" : "none", md: "block" }, minWidth: 0 }}>
          {actual ? (
            <Chat
              url={`/api/mensajes/conversaciones/${encodeURIComponent(actual.clave)}`}
              soyAdmin
              titulo={`${actual.nombre || actual.clave} · ${actual.clave}`}
              puedeEscribir={actual.tiene_acceso}
              onCambio={cargar}
              onVolver={() => setAbierta(null)}
            />
          ) : (
            <Paper
              variant="outlined"
              sx={{ height: 560, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}
            >
              Elige una conversación
            </Paper>
          )}
        </Box>
      </Box>

      <Dialog open={todosAbierto} onClose={() => !enviandoTodos && setTodosAbierto(false)} fullWidth maxWidth="sm">
        <DialogTitle>Escribir a todos</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "#475569", mb: 2 }}>
            Le llega a {conAcceso} {conAcceso === 1 ? "persona" : "personas"} con MENSAJES, cada quien en su conversación.
          </Typography>
          <TextField
            value={textoTodos}
            onChange={(e) => setTextoTodos(e.target.value)}
            multiline
            minRows={3}
            fullWidth
            label="Mensaje"
            inputProps={{ maxLength: TEXTO_MAXIMO }}
          />
          {errorTodos && <Alert severity="error" sx={{ mt: 2 }}>{errorTodos}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button disabled={enviandoTodos} onClick={() => setTodosAbierto(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={enviandoTodos || !textoTodos.trim()}
            onClick={enviarTodos}
            sx={{ bgcolor: NARANJA, "&:hover": { bgcolor: "#ea580c" } }}
          >
            {enviandoTodos ? "Enviando…" : "Enviar a todos"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={grupoAbierto !== null} onClose={() => !enviandoGrupo && setGrupoAbierto(null)} fullWidth maxWidth="sm">
        <DialogTitle>Escribir a {grupoAbierto?.titulo.toLowerCase()}</DialogTitle>
        <DialogContent>
          {grupoAbierto && (
            <>
              <Typography sx={{ color: "#1e293b", fontWeight: 700 }}>
                Se enviará a {grupoAbierto.personas} {grupoAbierto.personas === 1 ? "persona" : "personas"}
              </Typography>
              <Typography sx={{ color: "#475569", fontSize: 14, mb: 2 }}>
                Cada quien lo recibe una vez, en su conversación.
                {grupoAbierto.en_grupo > grupoAbierto.personas &&
                  ` Hay ${grupoAbierto.en_grupo} en el grupo; ${grupoAbierto.en_grupo - grupoAbierto.personas} todavía no tienen MENSAJES y no lo recibirán.`}
              </Typography>
            </>
          )}
          <TextField
            value={textoGrupo}
            onChange={(e) => setTextoGrupo(e.target.value)}
            multiline
            minRows={3}
            fullWidth
            label="Mensaje"
            inputProps={{ maxLength: TEXTO_MAXIMO }}
          />
          {errorGrupo && <Alert severity="error" sx={{ mt: 2 }}>{errorGrupo}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button disabled={enviandoGrupo} onClick={() => setGrupoAbierto(null)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={enviandoGrupo || !textoGrupo.trim() || !grupoAbierto || grupoAbierto.personas === 0}
            onClick={enviarGrupo}
            sx={{ bgcolor: NARANJA, "&:hover": { bgcolor: "#ea580c" } }}
          >
            {enviandoGrupo ? "Enviando…" : `Enviar a ${grupoAbierto?.personas ?? 0}`}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={exito !== null} autoHideDuration={4000} onClose={() => setExito(null)}>
        <Alert severity="success" variant="filled" onClose={() => setExito(null)}>
          {exito}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// ───────────────────────────── Página ─────────────────────────────
const MensajesPage: React.FC = () => {
  const rol = obtenerRolDesdeToken();
  const usuario = localStorage.getItem("usuario");
  const esAdmin = rol === "admin";
  // Si de verdad tiene MENSAJES lo contesta el backend (variable MENSAJES_PARA_TODOS)
  const { noLeidos, estado } = useNoLeidos(puedeVerMensajes(rol, usuario));
  const accesoMiPerfil = useAccesoMiPerfil(rol);
  const [pestana, setPestana] = useState(0);

  if (estado === "cargando") {
    return <CircularProgress size={28} sx={{ display: "block", mx: "auto", my: 6 }} />;
  }
  if (estado === "no") {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="info">MENSAJES todavía no está disponible para tu usuario.</Alert>
      </Container>
    );
  }

  const etiqueta = (texto: string, n: number) => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      {texto}
      {n > 0 && <Badge badgeContent={n} color="error" max={99} sx={{ "& .MuiBadge-badge": { position: "static", transform: "none" } }} />}
    </Box>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, color: "#1e293b", mb: 2 }}>
        Mensajes
      </Typography>
      <Tabs
        value={pestana}
        onChange={(_, v) => setPestana(v)}
        TabIndicatorProps={{ sx: { bgcolor: AZUL } }}
        sx={{ mb: 3, borderBottom: "1px solid #e2e8f0" }}
      >
        {[etiqueta("Avisos", noLeidos?.avisos ?? 0), etiqueta("Mensajes", noLeidos?.mensajes ?? 0)].map((l, i) => (
          <Tab key={i} label={l} sx={{ textTransform: "none", fontWeight: 600, "&.Mui-selected": { color: AZUL } }} />
        ))}
      </Tabs>
      {pestana === 0 && <ListaAvisos esAdmin={esAdmin} conEnlace={puedeVerMisSolicitudes(rol, accesoMiPerfil)} />}
      {pestana === 1 &&
        (esAdmin ? (
          <MensajesAdmin />
        ) : (
          <Chat url="/api/mensajes/mi-conversacion" soyAdmin={false} titulo="Administración" puedeEscribir />
        ))}
    </Container>
  );
};

export default MensajesPage;
