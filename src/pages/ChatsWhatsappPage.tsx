import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  Paper,
  Snackbar,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import RefreshIcon from "@mui/icons-material/Refresh";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import axios from "axios";
import { authH } from "../components/MisDatosPerfil";
import { mensajeError } from "../components/MisSolicitudesVacaciones";
import CatalogoWhatsapp from "../components/CatalogoWhatsapp";

// CHATS WHATSAPP (solo admin): pláticas del bot del 449 102 7916.
// El bot atiende hasta pasar el chat al asesor; aquí se ve todo y se contesta.

const API = "/api/bot-whatsapp/admin";
const VERDE = "#128C7E";
const VERDE_CLARO = "#DCF8C6";
const AZUL = "#1565C0";
const INTERVALO_LISTA_MS = 15_000;
const INTERVALO_CHAT_MS = 8_000;

interface ConvApi {
  id: number;
  wa_id: string;
  nombre: string | null;
  estado: "bot" | "asesor" | "cerrado";
  paso: number;
  datos_completos: boolean;
  no_leidos: number;
  motivo: string | null;
  atendido_por: string | null;
  ultimo_at: string | null;
  ultimo_texto: string;
  ultimo_autor: string | null;
  ventana_abierta: boolean;
}
interface MensajeApi {
  id: number;
  direccion: "entrante" | "saliente";
  autor: "cliente" | "bot" | "asesor";
  tipo: string;
  texto: string | null;
  media_id: string | null;
  estado_envio: string | null;
  fecha: string | null;
}
interface DetalleApi {
  id: number;
  wa_id: string;
  nombre: string | null;
  estado: ConvApi["estado"];
  paso: number;
  datos: Record<string, unknown>;
  datos_completos: boolean;
  atendido_por: string | null;
  ventana_abierta: boolean;
  mensajes: MensajeApi[];
}
type ConfigApi = Record<string, { valor: string; actualizado: string | null }>;

const FILTROS = [
  { valor: "asesor", etiqueta: "Te toca" },
  { valor: "bot", etiqueta: "Bot" },
  { valor: "completos", etiqueta: "Datos completos" },
  { valor: "cerrado", etiqueta: "Cerrados" },
  { valor: "todos", etiqueta: "Todos" },
];

const MOTIVOS: Record<string, string> = {
  datos_completos: "Datos completos: hacer cotización",
  credito: "Pregunta de crédito/buró",
  promocion: "Pide promoción especial",
  precio_o_equipo: "Pregunta precio o equipo",
  caso_especial: "Caso especial",
  persona: "Pidió hablar con una persona",
  fuera_de_zona: "Fuera de zona de entrega",
};

const ETIQUETAS_DATOS: Record<string, string> = {
  equipo: "Equipo",
  tipo_linea: "Tipo de línea",
  presupuesto: "Presupuesto",
  plan: "Plan",
  correo: "Correo",
  tel_casa: "Tel. casa",
  tel_trabajo: "Tel. trabajo",
  referencia_1: "Referencia 1",
  referencia_2: "Referencia 2",
  ciudad: "Ciudad",
  fotos_ine: "Fotos INE",
};

const momento = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const hoy = new Date();
  const mismoDia = d.toDateString() === hoy.toDateString();
  return mismoDia
    ? d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleString("es-MX", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

const telefono = (wa: string) => {
  const t = wa.replace(/^521?/, "");
  return t.length === 10 ? `${t.slice(0, 3)} ${t.slice(3, 6)} ${t.slice(6)}` : wa;
};

const chipEstado = (c: { estado: string; datos_completos: boolean }) => {
  if (c.estado === "asesor")
    return <Chip size="small" icon={<SupportAgentIcon />} label="Te toca" sx={{ bgcolor: "#FFE0B2", fontWeight: 700 }} />;
  if (c.estado === "cerrado") return <Chip size="small" icon={<DoneAllIcon />} label="Cerrado" />;
  return <Chip size="small" icon={<SmartToyIcon />} label="Bot" sx={{ bgcolor: "#E3F2FD" }} />;
};

// Imagen de WhatsApp (INE, etc.): se pide con el token y se muestra como blob
const ImagenWhatsapp: React.FC<{ mediaId: string }> = ({ mediaId }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let liberar: string | null = null;
    let vivo = true;
    axios
      .get(`${API}/media/${encodeURIComponent(mediaId)}`, { headers: authH(), responseType: "blob" })
      .then((r) => {
        if (!vivo) return;
        liberar = URL.createObjectURL(r.data);
        setUrl(liberar);
      })
      .catch(() => vivo && setError(true));
    return () => {
      vivo = false;
      if (liberar) URL.revokeObjectURL(liberar);
    };
  }, [mediaId]);

  if (error) return <Typography variant="caption" color="text.secondary">(Archivo no disponible)</Typography>;
  if (!url) return <CircularProgress size={18} />;
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <Box component="img" src={url} alt="Foto del cliente" sx={{ maxWidth: 240, maxHeight: 240, borderRadius: 1, display: "block", mb: 0.5 }} />
    </a>
  );
};

const ChatsWhatsappPage: React.FC = () => {
  const esCelular = useMediaQuery("(max-width:900px)");
  const [pestana, setPestana] = useState<"chats" | "config" | "catalogo">("chats");
  const [filtro, setFiltro] = useState("asesor");
  const [buscar, setBuscar] = useState("");
  const [lista, setLista] = useState<ConvApi[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [abierto, setAbierto] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<DetalleApi | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);
  const [config, setConfig] = useState<ConfigApi | null>(null);
  const [borrador, setBorrador] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement | null>(null);
  const pendientesAntes = useRef<number | null>(null);

  // ── Lista ──
  const cargarLista = useCallback(async () => {
    try {
      const params: Record<string, string> = { filtro };
      if (buscar.trim()) params.q = buscar.trim();
      const r = await axios.get<ConvApi[]>(`${API}/conversaciones`, { headers: authH(), params });
      setLista(r.data);
    } catch (e) {
      setAviso({ tipo: "error", texto: mensajeError(e, "No se pudieron cargar los chats") });
    } finally {
      setCargandoLista(false);
    }
  }, [filtro, buscar]);

  // Sonido + título cuando llega un cliente nuevo para el asesor
  const revisarPendientes = useCallback(async () => {
    try {
      const r = await axios.get<{ pendientes: number }>(`${API}/resumen`, { headers: authH() });
      const n = r.data.pendientes;
      document.title = n > 0 ? `(${n}) Chats WhatsApp · ATO` : "Chats WhatsApp · ATO";
      if (pendientesAntes.current !== null && n > pendientesAntes.current) {
        try {
          const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.frequency.value = 880;
          g.gain.value = 0.15;
          o.connect(g);
          g.connect(ctx.destination);
          o.start();
          o.stop(ctx.currentTime + 0.35);
        } catch {
          /* sin sonido */
        }
      }
      pendientesAntes.current = n;
    } catch {
      /* el contador no es crítico */
    }
  }, []);

  // ── Detalle ──
  const cargarDetalle = useCallback(async (id: number) => {
    try {
      const r = await axios.get<DetalleApi>(`${API}/conversaciones/${id}`, { headers: authH() });
      setDetalle((antes) => {
        if (antes && antes.id === r.data.id && antes.mensajes.length === r.data.mensajes.length && antes.estado === r.data.estado) return antes;
        return r.data;
      });
    } catch (e) {
      setAviso({ tipo: "error", texto: mensajeError(e, "No se pudo abrir el chat") });
    }
  }, []);

  // ── Configuración ──
  const cargarConfig = useCallback(async () => {
    try {
      const r = await axios.get<ConfigApi>(`${API}/config`, { headers: authH() });
      setConfig(r.data);
      setBorrador(Object.fromEntries(Object.entries(r.data).map(([k, v]) => [k, v.valor])));
    } catch (e) {
      setAviso({ tipo: "error", texto: mensajeError(e, "No se pudo cargar la configuración") });
    }
  }, []);

  useEffect(() => {
    if (pestana !== "chats") return;
    setCargandoLista(true);
    cargarLista();
    revisarPendientes();
    const id = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      cargarLista();
      revisarPendientes();
    }, INTERVALO_LISTA_MS);
    return () => window.clearInterval(id);
  }, [pestana, cargarLista, revisarPendientes]);

  useEffect(() => {
    if (abierto === null) {
      setDetalle(null);
      return;
    }
    cargarDetalle(abierto);
    const id = window.setInterval(() => {
      if (document.visibilityState !== "hidden") cargarDetalle(abierto);
    }, INTERVALO_CHAT_MS);
    return () => window.clearInterval(id);
  }, [abierto, cargarDetalle]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [detalle?.mensajes.length, detalle?.id]);

  useEffect(() => {
    if (pestana === "config" && !config) cargarConfig();
  }, [pestana, config, cargarConfig]);

  useEffect(() => () => {
    document.title = "ATO";
  }, []);

  const enviar = async () => {
    if (!detalle || !texto.trim()) return;
    setEnviando(true);
    try {
      await axios.post(`${API}/conversaciones/${detalle.id}/responder`, { texto }, { headers: authH() });
      setTexto("");
      await cargarDetalle(detalle.id);
      cargarLista();
    } catch (e) {
      setAviso({ tipo: "error", texto: mensajeError(e, "No se pudo enviar") });
      cargarDetalle(detalle.id);
    } finally {
      setEnviando(false);
    }
  };

  const cambiarEstado = async (estado: ConvApi["estado"]) => {
    if (!detalle) return;
    try {
      await axios.post(`${API}/conversaciones/${detalle.id}/estado`, { estado }, { headers: authH() });
      const textos = { bot: "El bot vuelve a contestar este chat", asesor: "Tomaste el chat: el bot ya no contesta", cerrado: "Chat cerrado" };
      setAviso({ tipo: "success", texto: textos[estado] });
      await cargarDetalle(detalle.id);
      cargarLista();
    } catch (e) {
      setAviso({ tipo: "error", texto: mensajeError(e, "No se pudo cambiar el estado") });
    }
  };

  const guardarConfig = async (clave: string, valor: string) => {
    setGuardando(clave);
    try {
      await axios.put(`${API}/config`, { clave, valor }, { headers: authH() });
      setAviso({ tipo: "success", texto: "Guardado. El bot lo usa desde el siguiente mensaje." });
      await cargarConfig();
    } catch (e) {
      setAviso({ tipo: "error", texto: mensajeError(e, "No se pudo guardar") });
    } finally {
      setGuardando(null);
    }
  };

  // ── Vistas ──
  const vistaLista = (
    <Paper variant="outlined" sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Box sx={{ p: 1, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
        {FILTROS.map((f) => (
          <Chip
            key={f.valor}
            label={f.etiqueta}
            size="small"
            onClick={() => setFiltro(f.valor)}
            color={filtro === f.valor ? "primary" : "default"}
            sx={{ fontWeight: 700 }}
          />
        ))}
      </Box>
      <Box sx={{ px: 1, pb: 1, display: "flex", gap: 1 }}>
        <TextField size="small" fullWidth placeholder="Buscar nombre o teléfono" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
        <Tooltip title="Actualizar">
          <IconButton onClick={() => cargarLista()}><RefreshIcon /></IconButton>
        </Tooltip>
      </Box>
      <Divider />
      <Box sx={{ flex: 1, overflowY: "auto" }}>
        {cargandoLista && <Box sx={{ p: 3, textAlign: "center" }}><CircularProgress size={24} /></Box>}
        {!cargandoLista && lista.length === 0 && (
          <Typography sx={{ p: 3, textAlign: "center" }} color="text.secondary">No hay chats en esta vista</Typography>
        )}
        {lista.map((c) => (
          <Box
            key={c.id}
            onClick={() => setAbierto(c.id)}
            sx={{
              p: 1.25,
              cursor: "pointer",
              borderBottom: "1px solid #eee",
              bgcolor: abierto === c.id ? "#F0F4F8" : c.estado === "asesor" && c.no_leidos > 0 ? "#FFF8E1" : "transparent",
              "&:hover": { bgcolor: "#F5F5F5" },
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
              <Typography fontWeight={700} noWrap>{c.nombre || telefono(c.wa_id)}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>{momento(c.ultimo_at)}</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">{telefono(c.wa_id)} · Paso {c.paso}</Typography>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, mt: 0.5 }}>
              <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1 }}>
                {c.ultimo_autor === "bot" ? "🤖 " : c.ultimo_autor === "asesor" ? "Tú: " : ""}
                {c.ultimo_texto}
              </Typography>
              {c.no_leidos > 0 && <Badge badgeContent={c.no_leidos} color="success" sx={{ mr: 1 }} />}
            </Box>
            <Box sx={{ display: "flex", gap: 0.5, mt: 0.5, flexWrap: "wrap" }}>
              {chipEstado(c)}
              {c.datos_completos && <Chip size="small" label="✅ Datos completos" sx={{ bgcolor: "#E8F5E9" }} />}
              {c.estado === "asesor" && c.motivo && c.motivo !== "datos_completos" && (
                <Chip size="small" label={MOTIVOS[c.motivo] || c.motivo} variant="outlined" />
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </Paper>
  );

  const datosCliente = detalle
    ? Object.entries(detalle.datos).filter(([k, v]) => k !== "motivo_asesor" && v !== null && v !== "")
    : [];

  const vistaChat = detalle ? (
    <Paper variant="outlined" sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Box sx={{ p: 1.25, bgcolor: VERDE, color: "#fff", display: "flex", alignItems: "center", gap: 1 }}>
        {esCelular && (
          <IconButton size="small" sx={{ color: "#fff" }} onClick={() => setAbierto(null)}><ArrowBackIcon /></IconButton>
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={700} noWrap>{detalle.nombre || telefono(detalle.wa_id)}</Typography>
          <Typography variant="caption">{telefono(detalle.wa_id)} · Paso {detalle.paso}{detalle.atendido_por ? ` · Atiende ${detalle.atendido_por}` : ""}</Typography>
        </Box>
        {chipEstado(detalle)}
      </Box>

      <Box sx={{ p: 1, display: "flex", gap: 1, flexWrap: "wrap", borderBottom: "1px solid #eee" }}>
        {detalle.estado !== "asesor" && (
          <Button size="small" variant="contained" startIcon={<SupportAgentIcon />} onClick={() => cambiarEstado("asesor")}>Tomar chat</Button>
        )}
        {detalle.estado !== "bot" && (
          <Button size="small" variant="outlined" startIcon={<SmartToyIcon />} onClick={() => cambiarEstado("bot")}>Regresar al bot</Button>
        )}
        {detalle.estado !== "cerrado" && (
          <Button size="small" variant="outlined" color="inherit" startIcon={<DoneAllIcon />} onClick={() => cambiarEstado("cerrado")}>Cerrar</Button>
        )}
      </Box>

      {datosCliente.length > 0 && (
        <Box sx={{ px: 1.5, py: 1, bgcolor: "#FAFAFA", borderBottom: "1px solid #eee" }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary">FICHA DEL CLIENTE</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, columnGap: 2 }}>
            {datosCliente.map(([k, v]) => (
              <Typography key={k} variant="body2"><b>{ETIQUETAS_DATOS[k] || k}:</b> {String(v)}</Typography>
            ))}
          </Box>
        </Box>
      )}

      <Box sx={{ flex: 1, overflowY: "auto", p: 1.5, bgcolor: "#ECE5DD" }}>
        {detalle.mensajes.map((m) => {
          const mio = m.direccion === "saliente";
          const fallo = mio && (m.estado_envio || "").startsWith("error");
          return (
            <Box key={m.id} sx={{ display: "flex", justifyContent: mio ? "flex-end" : "flex-start", mb: 1 }}>
              <Box
                sx={{
                  maxWidth: "80%",
                  bgcolor: fallo ? "#FFEBEE" : mio ? (m.autor === "bot" ? "#E3F2FD" : VERDE_CLARO) : "#fff",
                  borderRadius: 2,
                  px: 1.25,
                  py: 0.75,
                  boxShadow: "0 1px 1px rgba(0,0,0,0.1)",
                }}
              >
                {mio && (
                  <Typography variant="caption" fontWeight={700} sx={{ color: m.autor === "bot" ? AZUL : VERDE }}>
                    {m.autor === "bot" ? "🤖 Bot" : "Asesor"}
                  </Typography>
                )}
                {m.media_id && m.tipo === "image" && <ImagenWhatsapp mediaId={m.media_id} />}
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.texto}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "right" }}>
                  {momento(m.fecha)}
                  {mio && !fallo && m.estado_envio === "read" ? " ✓✓" : mio && !fallo ? " ✓" : ""}
                </Typography>
                {fallo && (
                  <Typography variant="caption" color="error" sx={{ display: "block" }}>No se envió: {m.estado_envio}</Typography>
                )}
              </Box>
            </Box>
          );
        })}
        <div ref={finRef} />
      </Box>

      <Box sx={{ p: 1, display: "flex", gap: 1, alignItems: "flex-end", borderTop: "1px solid #eee" }}>
        {detalle.ventana_abierta ? (
          <>
            <TextField
              fullWidth
              multiline
              maxRows={5}
              size="small"
              placeholder="Escribe tu mensaje al cliente…"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  enviar();
                }
              }}
            />
            <IconButton color="primary" disabled={enviando || !texto.trim()} onClick={enviar}>
              {enviando ? <CircularProgress size={22} /> : <SendIcon />}
            </IconButton>
          </>
        ) : (
          <Alert severity="info" sx={{ flex: 1 }}>
            Pasaron más de 24 horas desde el último mensaje del cliente. WhatsApp no deja escribirle hasta que él vuelva a escribir.
          </Alert>
        )}
      </Box>
    </Paper>
  ) : (
    <Paper variant="outlined" sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Box sx={{ textAlign: "center", color: "text.secondary" }}>
        <WhatsAppIcon sx={{ fontSize: 48, color: VERDE }} />
        <Typography>Elige un chat para verlo</Typography>
      </Box>
    </Paper>
  );

  const campoConfig = (clave: string, titulo: string, ayuda: string, filas: number) => (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Typography fontWeight={700}>{titulo}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{ayuda}</Typography>
      <TextField
        fullWidth
        multiline
        minRows={filas}
        maxRows={20}
        value={borrador[clave] ?? ""}
        onChange={(e) => setBorrador((b) => ({ ...b, [clave]: e.target.value }))}
      />
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {config?.[clave]?.actualizado ? `Último cambio: ${momento(config[clave].actualizado)}` : ""}
        </Typography>
        <Button
          variant="contained"
          disabled={guardando === clave || (borrador[clave] ?? "") === (config?.[clave]?.valor ?? "")}
          onClick={() => guardarConfig(clave, borrador[clave] ?? "")}
        >
          {guardando === clave ? "Guardando…" : "Guardar"}
        </Button>
      </Box>
    </Paper>
  );

  const vistaConfig = !config ? (
    <Box sx={{ p: 4, textAlign: "center" }}><CircularProgress /></Box>
  ) : (
    <Box sx={{ maxWidth: 900 }}>
      <Paper variant="outlined" sx={{ p: 2, mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
        <Box>
          <Typography fontWeight={700}>Bot prendido</Typography>
          <Typography variant="body2" color="text.secondary">
            Apagado: los mensajes se guardan aquí, pero nadie les contesta automático.
          </Typography>
        </Box>
        <Switch
          checked={(config.bot_activo?.valor || "").toLowerCase() === "true"}
          disabled={guardando === "bot_activo"}
          onChange={(e) => guardarConfig("bot_activo", e.target.checked ? "true" : "false")}
        />
      </Paper>
      {campoConfig("ofertas", "Promoción vigente", "Es lo primero que ofrece el bot (equipo, regalo, condiciones). Otros equipos solo los ofrece si el cliente los pide.", 3)}
      {campoConfig("preguntas_frecuentes", "Preguntas frecuentes", "Respuestas que el bot debe dar igual siempre. Una por bloque: PREGUNTA: respuesta.", 8)}
      {campoConfig("reglas_extra", "Reglas extra", "Cosas que el bot debe o no debe decir. Una por renglón, empezando con guion.", 6)}
    </Box>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <WhatsAppIcon sx={{ color: VERDE }} />
        <Typography variant="h6" fontWeight={800}>CHATS WHATSAPP · 449 102 7916</Typography>
      </Box>
      <Tabs value={pestana} onChange={(_, v) => setPestana(v)} sx={{ mb: 1 }}>
        <Tab value="chats" label="Chats" />
        <Tab value="config" label="Configuración del bot" />
        <Tab value="catalogo" label="Catálogo" />
      </Tabs>

      {pestana === "catalogo" ? (
        <CatalogoWhatsapp />
      ) : pestana === "config" ? (
        vistaConfig
      ) : esCelular ? (
        <Box sx={{ height: "calc(100vh - 190px)" }}>{abierto === null ? vistaLista : vistaChat}</Box>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 1.5, height: "calc(100vh - 190px)" }}>
          {vistaLista}
          {vistaChat}
        </Box>
      )}

      <Snackbar open={!!aviso} autoHideDuration={4000} onClose={() => setAviso(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        {aviso ? <Alert severity={aviso.tipo} onClose={() => setAviso(null)}>{aviso.texto}</Alert> : undefined}
      </Snackbar>
    </Container>
  );
};

export default ChatsWhatsappPage;
