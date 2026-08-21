import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Switch,
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
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import axios from "axios";
import * as XLSX from "xlsx";

const API = "https://ato-appservidor-nvxt.onrender.com";
const token = () => localStorage.getItem("token") ?? "";
const authH = () => ({ Authorization: `Bearer ${token()}` });

function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  const mobileRegex = /Android|iPhone|iPad|iPod|Mobile|Tablet|Opera Mini|IEMobile/i;
  if (mobileRegex.test(ua)) return true;
  if (navigator.maxTouchPoints && navigator.maxTouchPoints > 1) return true;
  if (window.screen && window.screen.width < 1024) return true;
  if ("ontouchstart" in window) return true;
  return false;
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface AsistenciaResumen {
  fecha: string;
  entrada: string | null;
  salida: string | null;
  horas_trabajadas: number;
  foto_entrada_url: string | null;
  foto_salida_url: string | null;
  dentro_de_zona_entrada: boolean | null;
  dentro_de_zona_salida: boolean | null;
  distancia_metros_entrada: number | null;
  distancia_metros_salida: number | null;
  username?: string;
  modulo_id?: number;
  modulo_nombre?: string;
  lugar_trabajo?: string | null;
}

interface CheckResponse {
  id: number;
  dentro_de_zona: boolean;
  distancia_metros: number | null;
  tipo: string;
}

interface Notificacion {
  id: number;
  usuario_id: number;
  username: string;
  modulo_id: number | null;
  mensaje: string;
  distancia_metros: number | null;
  leida: boolean;
  creada_at: string;
}

interface ModuloConUbicacion {
  id: number;
  nombre: string;
  latitud: number | null;
  longitud: number | null;
  radio_metros: number;
}

interface PromotorConUbicacion {
  id: number;
  username: string;
  lugar_trabajo: string | null;
  latitud_promotor: number | null;
  longitud_promotor: number | null;
  radio_metros_promotor: number;
}

interface UsuarioBasico {
  id: number;
  username: string;
  modulo: { id: number; nombre: string } | null;
}

interface AnomaliaItem {
  usuario_id: number;
  username: string;
  nombre_completo: string;
  modulo_id: number | null;
  modulo_nombre: string | null;
  entrada?: string | null;
  salida?: string | null;
  horas_trabajadas?: number;
}

interface AnomaliasResp {
  fecha: string;
  sin_movimiento: AnomaliaItem[];
  falta_checkin: AnomaliaItem[];
  falta_checkout: AnomaliaItem[];
  menos_de_una_hora: AnomaliaItem[];
  justificaciones?: Record<number, { estado: string; nota: string | null }>;
}

interface CicloSemana {
  inicio: string;
  fin: string;
  label: string;
}

interface DiaResumen {
  entrada: string | null;
  salida: string | null;
  horas: number;
}

interface EmpleadoAcumuladoSemanal {
  usuario_id: number;
  username: string;
  nombre_completo: string;
  nombre_englobado?: string | null;
  dias: Record<string, DiaResumen | null>;
  total_horas: number;
  jornada: number | null;
  horas_extra: number | null;
  jornada_fija?: number | null;
  sueldo_base?: number | null;
}

interface DiaCelda {
  horas: number;
  entrada: string | null;
  salida: string | null;
  multiple: boolean;
}

interface GrupoAcumulado {
  key: string;
  ids: number[];
  nombre_completo: string;
  dias: Record<string, DiaCelda | null>;
  total_horas: number;
  jornada: number | null;
  horas_extra: number | null;
  sueldo_base: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const redondearHorasExtra = (horas: number): number => {
  const enteros = Math.floor(horas);
  const decimal = horas - enteros;
  const minutos = Math.round(decimal * 60);
  if (minutos <= 29) return enteros;
  if (minutos <= 50) return enteros + 0.5;
  return enteros + 1;
};

const formatHora = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City" });
};

const formatFecha = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const formatHora24 = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("es-MX", {
    hour: "2-digit", minute: "2-digit",
    hour12: false, timeZone: "America/Mexico_City",
  });
};

// ── FotoThumb: miniatura con click para ampliar ───────────────────────────────

const FotoThumb: React.FC<{ url: string | null; size?: number }> = ({ url, size = 40 }) => {
  const [open, setOpen] = useState(false);
  if (!url) return <span style={{ color: "#94a3b8" }}>—</span>;
  return (
    <>
      <img
        src={url}
        alt="foto"
        style={{ width: size, height: size, objectFit: "cover", borderRadius: 4, cursor: "pointer" }}
        onClick={() => setOpen(true)}
      />
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md">
        <DialogContent sx={{ p: 1 }}>
          <img src={url} alt="foto grande" style={{ maxWidth: "80vw", maxHeight: "80vh" }} />
        </DialogContent>
      </Dialog>
    </>
  );
};

// ── ZonaChip ─────────────────────────────────────────────────────────────────

const ZonaChip: React.FC<{ dentro: boolean | null }> = ({ dentro }) => {
  if (dentro === null) return <span style={{ color: "#94a3b8" }}>—</span>;
  return dentro ? (
    <Chip icon={<CheckCircleIcon />} label="En zona" color="success" size="small" />
  ) : (
    <Chip icon={<WarningAmberIcon />} label="Fuera" color="warning" size="small" />
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// VISTA ASESOR / ENCARGADO
// ═════════════════════════════════════════════════════════════════════════════

const VistaEmpleado: React.FC = () => {
  const [ahora, setAhora] = useState(new Date());
  const [cargando, setCargando] = useState(false);
  const [snack, setSnack] = useState<{ msg: string; sev: "success" | "error" | "warning"; autoHide?: boolean } | null>(null);
  const [camaraAbierta, setCamaraAbierta] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [estadoHoy, setEstadoHoy] = useState<AsistenciaResumen | null>(null);
  const [cargandoEstado, setCargandoEstado] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pendingRef = useRef<{ tipo: "entrada" | "salida"; lat: number; lng: number } | null>(null);

  const esMovil = isMobileDevice();
  const bloquearCheckIn = !esMovil;

  const yaEntro = !!estadoHoy?.entrada;
  const yaSalio = !!estadoHoy?.salida;

  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const cargarEstadoHoy = useCallback(async () => {
    const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
    try {
      const { data } = await axios.get<AsistenciaResumen[]>(
        `${API}/asistencia/mi-historial?desde=${hoy}&hasta=${hoy}`,
        { headers: authH() }
      );
      setEstadoHoy(data[0] ?? null);
    } catch {
      setEstadoHoy(null);
    } finally {
      setCargandoEstado(false);
    }
  }, []);

  useEffect(() => { cargarEstadoHoy(); }, [cargarEstadoHoy]);

  const cerrarCamara = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamaraAbierta(false);
    setCameraReady(false);
  };

  const handleCheck = (tipo: "entrada" | "salida") => {
    if (!navigator.geolocation) {
      setSnack({ msg: "Tu navegador no soporta geolocalización", sev: "error" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        pendingRef.current = { tipo, lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCamaraAbierta(true);
      },
      () => setSnack({ msg: "Necesitas permitir ubicación para registrar asistencia", sev: "error" })
    );
  };

  const iniciarStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        const vid = videoRef.current;
        vid.srcObject = stream;
        vid.addEventListener(
          "playing",
          () => { if (vid.videoWidth > 0 && vid.videoHeight > 0) setCameraReady(true); },
          { once: true }
        );
        await vid.play();
      }
    } catch (err: any) {
      cerrarCamara();
      if (err.name === "NotAllowedError") {
        setSnack({
          msg: "Cámara bloqueada. Ve a Configuración → Chrome → Cámara y activa el permiso",
          sev: "error",
        });
      } else {
        setSnack({ msg: "No se pudo acceder a la cámara", sev: "error" });
      }
    }
  };

  const tomarFoto = async () => {
    if (!videoRef.current || !pendingRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(video, 0, 0);

    // Detect all-black frame before uploading
    const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
    if (imageData) {
      const { data } = imageData;
      let darkPixels = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] < 20 && data[i + 1] < 20 && data[i + 2] < 20) darkPixels++;
      }
      if (darkPixels / (data.length / 4) > 0.95) {
        setSnack({ msg: "No se capturó bien la foto, intenta de nuevo", sev: "error" });
        return;
      }
    }

    const b64 = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
    const blobSizeBytes = Math.round((b64.length * 3) / 4);
    console.log("[Asistencia] videoWidth:", video.videoWidth, "videoHeight:", video.videoHeight, "blobSize:", blobSizeBytes, "bytes");

    if (blobSizeBytes < 3072) {
      setSnack({ msg: "No se capturó bien la foto, intenta de nuevo", sev: "error" });
      return;
    }

    cerrarCamara();
    setCargando(true);
    try {
      const { tipo, lat, lng } = pendingRef.current;
      const { data } = await axios.post<CheckResponse>(
        `${API}/asistencia/check`,
        { tipo, latitud: lat, longitud: lng, foto_base64: b64 },
        { headers: authH() }
      );

      if (!data.dentro_de_zona) {
        setSnack({
          msg: `Registrado, pero FUERA DE ZONA — a ${Math.round(data.distancia_metros ?? 0)} metros del módulo`,
          sev: "warning",
        });
      } else {
        setSnack({ msg: `${tipo === "entrada" ? "CHECK-IN" : "CHECK-OUT"} registrado ✓`, sev: "success" });
      }
      cargarEstadoHoy();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (detail && typeof detail === "object" && detail.codigo) {
        const sev = detail.codigo === "SIN_CHECKIN" ? "error" : "warning";
        setSnack({ msg: detail.mensaje, sev, autoHide: false });
      } else {
        setSnack({
          msg: typeof detail === "string" ? detail : "Error al registrar asistencia. Intenta de nuevo.",
          sev: "error",
          autoHide: true,
        });
      }
    } finally {
      setCargando(false);
      pendingRef.current = null;
    }
  };

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: 3 }}>
      <Typography variant="h4" fontWeight={700} color="primary" gutterBottom>
        REGISTRO DE ASISTENCIA
      </Typography>
      <Typography variant="h5" sx={{ mb: 3, color: "#64748b", fontFamily: "monospace" }}>
        {ahora.toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        &nbsp;—&nbsp;
        {ahora.toLocaleTimeString("es-MX")}
      </Typography>

      {!bloquearCheckIn ? (
        <Box display="flex" gap={2} mb={4}>
          <Button
            variant="contained"
            size="large"
            disabled={cargando || cargandoEstado || yaEntro}
            onClick={() => handleCheck("entrada")}
            startIcon={<AccessTimeIcon />}
            sx={{
              flex: 1, py: 3, fontSize: 18, fontWeight: 700,
              bgcolor: "#16a34a", "&:hover": { bgcolor: "#15803d" },
            }}
          >
            CHECK-IN (ENTRADA)
          </Button>
          <Button
            variant="contained"
            size="large"
            disabled={cargando || cargandoEstado || !yaEntro || yaSalio}
            onClick={() => handleCheck("salida")}
            startIcon={<AccessTimeIcon />}
            sx={{
              flex: 1, py: 3, fontSize: 18, fontWeight: 700,
              bgcolor: "#FF6600", "&:hover": { bgcolor: "#ea5c00" },
            }}
          >
            CHECK-OUT (SALIDA)
          </Button>
        </Box>
      ) : (
        <Paper elevation={2} sx={{ p: 4, mb: 3, bgcolor: "#FFF3E0", border: "2px solid #FF6600", textAlign: "center" }}>
          <Box sx={{ fontSize: 64, mb: 2 }}>📱</Box>
          <Typography variant="h5" fontWeight={700} color="#FF6600" gutterBottom>
            Solo desde tu celular
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            El registro de asistencia solo está disponible desde tu teléfono o tablet.
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Por favor entra desde tu celular a:
          </Typography>
          <Typography variant="h6" fontWeight={700}>
            https://atosistema.vercel.app
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 2, color: "text.secondary" }}>
            Esto es para validar que estés físicamente en tu módulo con tu propia cámara y GPS.
          </Typography>
        </Paper>
      )}

      {cargandoEstado && (
        <Box display="flex" alignItems="center" gap={1} mb={3} sx={{ color: "text.secondary" }}>
          <CircularProgress size={18} />
          <Typography variant="body2">Consultando tu registro de hoy...</Typography>
        </Box>
      )}

      {yaEntro && (
        <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
          <Typography fontWeight={700} sx={{ color: "#16a34a", mb: 1 }}>
            Ya hiciste tu CHECK-IN
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "120px auto",
              columnGap: 2,
              rowGap: 1.5,
              alignItems: "center",
            }}
          >
            <Typography variant="body2">Entrada: {formatHora(estadoHoy?.entrada ?? null)}</Typography>
            <FotoThumb url={estadoHoy?.foto_entrada_url ?? null} size={72} />

            {yaSalio && (
              <>
                <Typography variant="body2">Salida: {formatHora(estadoHoy?.salida ?? null)}</Typography>
                <FotoThumb url={estadoHoy?.foto_salida_url ?? null} size={72} />

                <Typography variant="body2" sx={{ gridColumn: "1 / -1" }}>
                  Horas trabajadas: {(estadoHoy?.horas_trabajadas ?? 0).toFixed(2)} h
                </Typography>
              </>
            )}
          </Box>

          {yaSalio && (
            <Typography fontWeight={700} sx={{ color: "#16a34a", mt: 2 }}>
              Día completo
            </Typography>
          )}

          {!yaSalio && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              No olvides hacer tu CHECK-OUT al terminar tu turno. Si no lo haces,
              no se cuenta tu asistencia del día y no se te puede pagar.
            </Alert>
          )}
        </Paper>
      )}

      {cargando && <Box textAlign="center" mb={2}><CircularProgress /></Box>}

      {/* Dialog de cámara fullscreen */}
      <Dialog
        fullScreen
        open={camaraAbierta}
        onClose={cerrarCamara}
        TransitionProps={{ onEntered: iniciarStream }}
      >
        <Box
          sx={{
            bgcolor: "#000",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            p: 2,
            position: "relative",
          }}
        >
          <Box sx={{ position: "absolute", top: 16, right: 16 }}>
            <IconButton onClick={cerrarCamara} sx={{ color: "#fff" }}>
              <CloseIcon />
            </IconButton>
          </Box>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: "100%", maxWidth: 480, borderRadius: 8, background: "#111" }}
          />
          <Button
            variant="contained"
            size="large"
            onClick={tomarFoto}
            disabled={!cameraReady}
            sx={{
              bgcolor: "#FF6600", "&:hover": { bgcolor: "#ea5c00" },
              fontSize: 18, fontWeight: 700, px: 6, py: 2,
            }}
          >
            {cameraReady ? "TOMAR FOTO" : "Iniciando cámara…"}
          </Button>
        </Box>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={snack?.autoHide === false ? null : 5000} onClose={() => setSnack(null)}>
        <Alert severity={snack?.sev} variant="filled" onClose={() => setSnack(null)} sx={{ width: "100%", fontSize: 15 }}>
          {snack?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// TAB REGISTROS (admin)
// ═════════════════════════════════════════════════════════════════════════════

const TabRegistros: React.FC = () => {
  const [registros, setRegistros] = useState<AsistenciaResumen[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioBasico[]>([]);
  const [modulos, setModulos] = useState<ModuloConUbicacion[]>([]);
  const [filtros, setFiltros] = useState({
    usuario_id: "", modulo_id: "", desde: "", hasta: "",
  });
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    axios.get<UsuarioBasico[]>(`${API}/registro/usuarios`, { headers: authH() })
      .then(({ data }) => setUsuarios(data)).catch(() => {});
    axios.get<ModuloConUbicacion[]>(`${API}/modulos/con-ubicacion`, { headers: authH() })
      .then(({ data }) => setModulos(data)).catch(() => {});
  }, []);

  const buscar = async () => {
    setCargando(true);
    const params = new URLSearchParams();
    if (filtros.usuario_id) params.set("usuario_id", filtros.usuario_id);
    if (filtros.modulo_id) params.set("modulo_id", filtros.modulo_id);
    if (filtros.desde) params.set("desde", filtros.desde);
    if (filtros.hasta) params.set("hasta", filtros.hasta);
    try {
      const { data } = await axios.get<AsistenciaResumen[]>(
        `${API}/asistencia/admin?${params}`,
        { headers: authH() }
      );
      const ordenarRegistros = (arr: AsistenciaResumen[]) =>
        [...arr].sort((a, b) => {
          const modA = a.modulo_nombre ?? "￿";
          const modB = b.modulo_nombre ?? "￿";
          if (modA !== modB) return modA.localeCompare(modB);
          const entA = a.entrada ? new Date(a.entrada).getTime() : Infinity;
          const entB = b.entrada ? new Date(b.entrada).getTime() : Infinity;
          if (entA !== entB) return entA - entB;
          return (a.username ?? "").localeCompare(b.username ?? "");
        });
      setRegistros(ordenarRegistros(data));
    } finally {
      setCargando(false);
    }
  };

  const exportarExcel = () => {
    const filas = registros.map((r) => ({
      Usuario: r.username ?? "",
      Módulo: r.modulo_nombre ?? "",
      Fecha: formatFecha(r.fecha),
      Entrada: formatHora(r.entrada),
      Salida: formatHora(r.salida),
      "Horas trabajadas": r.horas_trabajadas.toFixed(2),
      Estado:
        r.dentro_de_zona_entrada === false || r.dentro_de_zona_salida === false
          ? "Fuera de zona"
          : "En zona",
    }));
    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Asistencia");
    XLSX.writeFile(wb, `asistencia_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const totalHoras = registros.reduce((s, r) => s + r.horas_trabajadas, 0);

  return (
    <Box>
      {/* Filtros */}
      <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Usuario</InputLabel>
          <Select
            label="Usuario"
            value={filtros.usuario_id}
            onChange={(e) => setFiltros((p) => ({ ...p, usuario_id: e.target.value as string }))}
          >
            <MenuItem value="">Todos</MenuItem>
            {usuarios.map((u) => <MenuItem key={u.id} value={String(u.id)}>{u.username}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Módulo</InputLabel>
          <Select
            label="Módulo"
            value={filtros.modulo_id}
            onChange={(e) => setFiltros((p) => ({ ...p, modulo_id: e.target.value as string }))}
          >
            <MenuItem value="">Todos</MenuItem>
            {modulos.map((m) => <MenuItem key={m.id} value={String(m.id)}>{m.nombre}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField
          size="small" type="date" label="Desde" InputLabelProps={{ shrink: true }}
          value={filtros.desde}
          onChange={(e) => setFiltros((p) => ({ ...p, desde: e.target.value }))}
        />
        <TextField
          size="small" type="date" label="Hasta" InputLabelProps={{ shrink: true }}
          value={filtros.hasta}
          onChange={(e) => setFiltros((p) => ({ ...p, hasta: e.target.value }))}
        />
        <Button variant="contained" onClick={buscar} disabled={cargando}
          sx={{ bgcolor: "#FF6600", "&:hover": { bgcolor: "#ea5c00" } }}>
          BUSCAR
        </Button>
        {registros.length > 0 && (
          <Button variant="outlined" onClick={exportarExcel}>Descargar Excel</Button>
        )}
      </Box>

      {cargando ? (
        <Box textAlign="center" py={4}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} elevation={1}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#f8fafc" }}>
                {["Usuario","Módulo","Lugar","Fecha","Entrada","Foto E","Salida","Foto S","Horas","Estado E","Estado S"].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, color: "#FF6600" }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {registros.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ color: "#94a3b8", py: 3 }}>
                    Usa los filtros y presiona BUSCAR
                  </TableCell>
                </TableRow>
              )}
              {registros.map((r, i) => {
                const fuera = r.dentro_de_zona_entrada === false || r.dentro_de_zona_salida === false;
                return (
                  <TableRow key={i} sx={{ bgcolor: fuera ? "#fff7ed" : undefined }}>
                    <TableCell>{r.username}</TableCell>
                    <TableCell>{r.modulo_nombre}</TableCell>
                    <TableCell sx={{ color: r.lugar_trabajo ? undefined : "#94a3b8" }}>
                      {r.lugar_trabajo ?? "—"}
                    </TableCell>
                    <TableCell>{formatFecha(r.fecha)}</TableCell>
                    <TableCell>{formatHora(r.entrada)}</TableCell>
                    <TableCell><FotoThumb url={r.foto_entrada_url} /></TableCell>
                    <TableCell>{formatHora(r.salida)}</TableCell>
                    <TableCell><FotoThumb url={r.foto_salida_url} /></TableCell>
                    <TableCell>{r.horas_trabajadas.toFixed(2)} h</TableCell>
                    <TableCell><ZonaChip dentro={r.dentro_de_zona_entrada ?? null} /></TableCell>
                    <TableCell><ZonaChip dentro={r.dentro_de_zona_salida ?? null} /></TableCell>
                  </TableRow>
                );
              })}
              {registros.length > 0 && (
                <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                  <TableCell colSpan={8} sx={{ fontWeight: 700 }}>Total general</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{totalHoras.toFixed(2)} h</TableCell>
                  <TableCell /><TableCell />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// TAB ANOMALÍAS / "QUIÉN FALTÓ" (admin)
// ═════════════════════════════════════════════════════════════════════════════

const hoyISOmx = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }); // YYYY-MM-DD

type FilaAnom = AnomaliaItem & { tipo: string };

type EstadoJust = "falta" | "justificada" | "vacaciones";
const ESTADOS: { val: EstadoJust; label: string }[] = [
  { val: "falta", label: "Falta" },
  { val: "justificada", label: "Justificada" },
  { val: "vacaciones", label: "Vacaciones" },
];

const TabAnomalias: React.FC = () => {
  const [modulos, setModulos] = useState<ModuloConUbicacion[]>([]);
  const [fecha, setFecha] = useState<string>(hoyISOmx());
  const [moduloId, setModuloId] = useState<string>("");
  const [data, setData] = useState<AnomaliasResp | null>(null);
  const [cargando, setCargando] = useState(false);
  // estado local por usuario: lo del backend + cambios sin recargar todo
  const [justifs, setJustifs] = useState<Record<number, { estado: string; nota: string }>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    axios.get<ModuloConUbicacion[]>(`${API}/modulos/con-ubicacion`, { headers: authH() })
      .then(({ data }) => setModulos(data)).catch(() => {});
  }, []);

  const buscar = async () => {
    if (!fecha) return;
    setCargando(true);
    const params = new URLSearchParams();
    params.set("fecha", fecha);
    if (moduloId) params.set("modulo_id", moduloId);
    try {
      const { data } = await axios.get<AnomaliasResp>(
        `${API}/asistencia/anomalias?${params}`,
        { headers: authH() }
      );
      setData(data);
      const init: Record<number, { estado: string; nota: string }> = {};
      Object.entries(data.justificaciones ?? {}).forEach(([uid, j]) => {
        init[Number(uid)] = { estado: j.estado ?? "", nota: j.nota ?? "" };
      });
      setJustifs(init);
    } catch {
      setErrorMsg("No se pudieron cargar las anomalías.");
    } finally {
      setCargando(false);
    }
  };

  // une las 4 listas en un solo arreglo; cada persona aparece una vez
  const filas: FilaAnom[] = useMemo(() => {
    if (!data) return [];
    return [
      ...data.sin_movimiento.map((it) => ({ ...it, tipo: "Sin movimiento" })),
      ...data.falta_checkin.map((it) => ({ ...it, tipo: "Falta check-in" })),
      ...data.falta_checkout.map((it) => ({ ...it, tipo: "Falta check-out" })),
      ...data.menos_de_una_hora.map((it) => ({ ...it, tipo: "Menos de 1 hora" })),
    ]
      .filter((it) => it.modulo_nombre !== "BO") // excluir Bodega
      .sort((a, b) => (a.username ?? "").localeCompare(b.username ?? "", "es")); // orden por username A-Z
  }, [data]);

  const setFila = (usuarioId: number, patch: Partial<{ estado: string; nota: string }>) =>
    setJustifs((prev) => {
      const base = prev[usuarioId] ?? { estado: "", nota: "" };
      return { ...prev, [usuarioId]: { ...base, ...patch } };
    });

  const guardar = async (usuarioId: number, estado: string, nota: string) => {
    try {
      await axios.post(
        `${API}/asistencia/justificacion`,
        { usuario_id: usuarioId, fecha, estado, nota },
        { headers: authH() }
      );
      setFila(usuarioId, { estado, nota });
    } catch {
      setErrorMsg("No se pudo guardar la justificación.");
    }
  };

  const borrar = async (usuarioId: number) => {
    try {
      await axios.delete(`${API}/asistencia/justificacion`, {
        headers: authH(),
        params: { usuario_id: usuarioId, fecha },
      });
      setFila(usuarioId, { estado: "", nota: "" });
    } catch {
      setErrorMsg("No se pudo quitar la justificación.");
    }
  };

  const onEstado = (usuarioId: number, estado: EstadoJust) => {
    const actual = justifs[usuarioId]?.estado ?? "";
    const nota = justifs[usuarioId]?.nota ?? "";
    if (actual === estado) {
      borrar(usuarioId); // click en el ya activo -> DELETE
    } else {
      guardar(usuarioId, estado, nota); // POST con ese estado + la nota actual
    }
  };

  const onNotaBlur = (usuarioId: number) => {
    const estado = justifs[usuarioId]?.estado ?? "";
    if (!estado) return; // sin estado puesto, no guardamos solo nota
    guardar(usuarioId, estado, justifs[usuarioId]?.nota ?? "");
  };

  return (
    <Box>
      {/* Filtros */}
      <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
        <TextField
          size="small" type="date" label="Fecha" InputLabelProps={{ shrink: true }}
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Módulo</InputLabel>
          <Select
            label="Módulo"
            value={moduloId}
            onChange={(e) => setModuloId(e.target.value as string)}
          >
            <MenuItem value="">Todos</MenuItem>
            {modulos.map((m) => <MenuItem key={m.id} value={String(m.id)}>{m.nombre}</MenuItem>)}
          </Select>
        </FormControl>
        <Button variant="contained" onClick={buscar} disabled={cargando}
          sx={{ bgcolor: "#FF6600", "&:hover": { bgcolor: "#ea5c00" } }}>
          BUSCAR
        </Button>
      </Box>

      {cargando ? (
        <Box textAlign="center" py={4}><CircularProgress /></Box>
      ) : !data ? (
        <Typography sx={{ color: "#94a3b8" }}>
          Elige una fecha y presiona BUSCAR
        </Typography>
      ) : filas.length === 0 ? (
        <Typography sx={{ color: "#94a3b8" }}>Sin anomalías para esta fecha.</Typography>
      ) : (
        <TableContainer component={Paper} elevation={1}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#f8fafc" }}>
                {["Usuario", "Módulo", "Anomalía", "Check-in", "Check-out", "Estado", "Nota"].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, color: "#FF6600" }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filas.map((it) => {
                const estadoActual = justifs[it.usuario_id]?.estado ?? "";
                return (
                  <TableRow key={it.usuario_id}>
                    <TableCell>{it.username || it.nombre_completo}</TableCell>
                    <TableCell>{it.modulo_nombre ?? "—"}</TableCell>
                    <TableCell>{it.tipo}</TableCell>
                    <TableCell sx={{ color: it.entrada ? undefined : "#94a3b8" }}>
                      {formatHora(it.entrada ?? null)}
                    </TableCell>
                    <TableCell sx={{ color: it.salida ? undefined : "#94a3b8" }}>
                      {formatHora(it.salida ?? null)}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={0.5} flexWrap="wrap">
                        {ESTADOS.map((e) => {
                          const activo = estadoActual === e.val;
                          return (
                            <Button
                              key={e.val}
                              size="small"
                              variant={activo ? "contained" : "outlined"}
                              onClick={() => onEstado(it.usuario_id, e.val)}
                              sx={activo
                                ? { bgcolor: "#FF6600", "&:hover": { bgcolor: "#ea5c00" } }
                                : { color: "#FF6600", borderColor: "#FF6600" }}
                            >
                              {e.label}
                            </Button>
                          );
                        })}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ minWidth: 180 }}>
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="Nota…"
                        value={justifs[it.usuario_id]?.nota ?? ""}
                        onChange={(ev) => setFila(it.usuario_id, { nota: ev.target.value })}
                        onBlur={() => onNotaBlur(it.usuario_id)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Snackbar
        open={!!errorMsg}
        autoHideDuration={4000}
        onClose={() => setErrorMsg(null)}
      >
        <Alert severity="error" variant="filled" onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// TAB CONFIGURAR MÓDULOS (admin)
// ═════════════════════════════════════════════════════════════════════════════

const TabModulos: React.FC = () => {
  const [modulos, setModulos] = useState<ModuloConUbicacion[]>([]);
  const [edicion, setEdicion] = useState<Record<number, Partial<ModuloConUbicacion>>>({});
  const [guardando, setGuardando] = useState<number | null>(null);
  const [snack, setSnack] = useState<string | null>(null);

  useEffect(() => {
    axios.get<ModuloConUbicacion[]>(`${API}/modulos/con-ubicacion`, { headers: authH() })
      .then(({ data }) => setModulos(data)).catch(() => {});
  }, []);

  const campo = (id: number, field: keyof ModuloConUbicacion) =>
    (edicion[id]?.[field] ?? modulos.find((m) => m.id === id)?.[field] ?? "") as string | number;

  const setField = (id: number, field: keyof ModuloConUbicacion, val: string) =>
    setEdicion((p) => ({ ...p, [id]: { ...p[id], [field]: val === "" ? null : Number(val) } }));

  const usarMiUbicacion = (id: number) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setEdicion((p) => ({
          ...p,
          [id]: { ...p[id], latitud: pos.coords.latitude, longitud: pos.coords.longitude },
        })),
      () => alert("No se pudo obtener la ubicación")
    );
  };

  const guardar = async (id: number) => {
    const data = edicion[id];
    if (!data) return;
    setGuardando(id);
    try {
      await axios.put(
        `${API}/modulos/${id}/ubicacion`,
        {
          latitud: data.latitud ?? null,
          longitud: data.longitud ?? null,
          radio_metros: data.radio_metros ?? 100,
        },
        { headers: authH() }
      );
      setSnack("Guardado correctamente");
      setModulos((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...data } : m))
      );
    } catch {
      setSnack("Error al guardar");
    } finally {
      setGuardando(null);
    }
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Configura las coordenadas de cada módulo para validar asistencia por geolocalización.
      </Typography>
      <TableContainer component={Paper} elevation={1}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#f8fafc" }}>
              {["Módulo","Latitud","Longitud","Radio (m)","Acciones"].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 700, color: "#FF6600" }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {modulos.map((m) => (
              <TableRow key={m.id}>
                <TableCell sx={{ fontWeight: 600 }}>{m.nombre}</TableCell>
                <TableCell>
                  <TextField
                    size="small" type="number" sx={{ width: 130 }}
                    value={campo(m.id, "latitud")}
                    onChange={(e) => setField(m.id, "latitud", e.target.value)}
                    inputProps={{ step: "0.000001" }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small" type="number" sx={{ width: 130 }}
                    value={campo(m.id, "longitud")}
                    onChange={(e) => setField(m.id, "longitud", e.target.value)}
                    inputProps={{ step: "0.000001" }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small" type="number" sx={{ width: 90 }}
                    value={campo(m.id, "radio_metros")}
                    onChange={(e) => setField(m.id, "radio_metros", e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={1}>
                    <Button
                      size="small" variant="contained"
                      disabled={guardando === m.id}
                      onClick={() => guardar(m.id)}
                      sx={{ bgcolor: "#FF6600", "&:hover": { bgcolor: "#ea5c00" } }}
                    >
                      {guardando === m.id ? <CircularProgress size={16} /> : "GUARDAR"}
                    </Button>
                    <Button
                      size="small" variant="outlined" startIcon={<LocationOnIcon />}
                      onClick={() => usarMiUbicacion(m.id)}
                    >
                      Mi ubicación
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)}>
        <Alert severity="success" onClose={() => setSnack(null)}>{snack}</Alert>
      </Snackbar>
    </Box>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// TAB CONFIGURAR PROMOTORES (admin)
// ═════════════════════════════════════════════════════════════════════════════

const TabPromotores: React.FC = () => {
  const [promotores, setPromotores] = useState<PromotorConUbicacion[]>([]);
  const [edicion, setEdicion] = useState<Record<number, Partial<PromotorConUbicacion>>>({});
  const [guardando, setGuardando] = useState<number | null>(null);
  const [snack, setSnack] = useState<{ msg: string; sev: "success" | "error" } | null>(null);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    axios.get<PromotorConUbicacion[]>(`${API}/promotores/con-ubicacion`, { headers: authH() })
      .then(({ data }) => {
        const codigoNum = (u: string) => parseInt(u.replace(/^C/, "").split("-")[0], 10) || 0;
        setPromotores(data.sort((a, b) => codigoNum(a.username) - codigoNum(b.username)));
      }).catch(() => {});
  }, []);

  const campo = (id: number, field: keyof PromotorConUbicacion) =>
    (edicion[id]?.[field] ?? promotores.find((p) => p.id === id)?.[field] ?? "") as string | number;

  const setField = (id: number, field: keyof PromotorConUbicacion, val: string) =>
    setEdicion((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: field === "lugar_trabajo" ? val : (val === "" ? null : Number(val)),
      },
    }));

  const usarMiUbicacion = (id: number) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setEdicion((prev) => ({
          ...prev,
          [id]: { ...prev[id], latitud_promotor: pos.coords.latitude, longitud_promotor: pos.coords.longitude },
        })),
      () => alert("No se pudo obtener la ubicación")
    );
  };

  const guardar = async (id: number) => {
    const data = edicion[id];
    if (!data) return;
    const promotor = promotores.find((p) => p.id === id);
    setGuardando(id);
    try {
      await axios.put(
        `${API}/promotores/${id}/ubicacion`,
        {
          lugar_trabajo: data.lugar_trabajo ?? promotor?.lugar_trabajo ?? "",
          latitud_promotor: data.latitud_promotor ?? promotor?.latitud_promotor ?? 0,
          longitud_promotor: data.longitud_promotor ?? promotor?.longitud_promotor ?? 0,
          radio_metros_promotor: data.radio_metros_promotor ?? promotor?.radio_metros_promotor ?? 100,
        },
        { headers: authH() }
      );
      setSnack({ msg: "Guardado correctamente", sev: "success" });
      setPromotores((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
    } catch {
      setSnack({ msg: "Error al guardar", sev: "error" });
    } finally {
      setGuardando(null);
    }
  };

  const filtrados = promotores.filter((p) => {
    const q = busqueda.toLowerCase();
    return (
      p.username.toLowerCase().includes(q) ||
      (p.lugar_trabajo ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" mb={1}>
        Cada promotor trabaja en una tienda diferente (Walmart, Coppel, Chedraui, etc.) y se valida
        su asistencia contra esas coordenadas.
      </Typography>
      <TextField
        size="small"
        placeholder="Buscar por promotor o lugar de trabajo…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        sx={{ mb: 2, width: 320 }}
      />
      <TableContainer component={Paper} elevation={1}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#f8fafc" }}>
              {["Promotor","Lugar de trabajo","Latitud","Longitud","Radio (m)","Acciones"].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 700, color: "#FF6600" }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ color: "#94a3b8", py: 3 }}>
                  Sin promotores encontrados
                </TableCell>
              </TableRow>
            )}
            {filtrados.map((p) => (
              <TableRow key={p.id}>
                <TableCell sx={{ fontWeight: 600 }}>{p.username}</TableCell>
                <TableCell>
                  <TextField
                    size="small" sx={{ width: 180 }}
                    value={campo(p.id, "lugar_trabajo") as string}
                    placeholder="Ej. Walmart Mariano Hidalgo"
                    onChange={(e) => setField(p.id, "lugar_trabajo", e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small" type="number" sx={{ width: 130 }}
                    value={campo(p.id, "latitud_promotor")}
                    onChange={(e) => setField(p.id, "latitud_promotor", e.target.value)}
                    inputProps={{ step: "0.000001" }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small" type="number" sx={{ width: 130 }}
                    value={campo(p.id, "longitud_promotor")}
                    onChange={(e) => setField(p.id, "longitud_promotor", e.target.value)}
                    inputProps={{ step: "0.000001" }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small" type="number" sx={{ width: 90 }}
                    value={campo(p.id, "radio_metros_promotor")}
                    onChange={(e) => setField(p.id, "radio_metros_promotor", e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={1}>
                    <Button
                      size="small" variant="contained"
                      disabled={guardando === p.id}
                      onClick={() => guardar(p.id)}
                      sx={{ bgcolor: "#FF6600", "&:hover": { bgcolor: "#ea5c00" } }}
                    >
                      {guardando === p.id ? <CircularProgress size={16} /> : "GUARDAR"}
                    </Button>
                    <Button
                      size="small" variant="outlined" startIcon={<LocationOnIcon />}
                      onClick={() => usarMiUbicacion(p.id)}
                    >
                      Mi ubicación
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)}>
        <Alert severity={snack?.sev} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// TAB ALERTAS (admin)
// ═════════════════════════════════════════════════════════════════════════════

const TabAlertas: React.FC = () => {
  const [notifs, setNotifs] = useState<Notificacion[]>([]);
  const [soloNoLeidas, setSoloNoLeidas] = useState(true);
  const [cargando, setCargando] = useState(false);
  const rolActual = localStorage.getItem("rol") ?? "";

  const cargar = useCallback(async () => {
    if (!["admin", "direccion", "encargado"].includes(rolActual)) return;
    setCargando(true);
    try {
      const { data } = await axios.get<Notificacion[]>(
        `${API}/asistencia/notificaciones?solo_no_leidas=${soloNoLeidas}`,
        { headers: authH() }
      );
      setNotifs(data);
    } finally {
      setCargando(false);
    }
  }, [soloNoLeidas, rolActual]);

  useEffect(() => { cargar(); }, [cargar]);

  const marcarLeida = async (id: number) => {
    await axios.put(`${API}/asistencia/notificaciones/${id}/marcar-leida`, {}, { headers: authH() });
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <Typography>Solo no leídas</Typography>
        <Switch checked={soloNoLeidas} onChange={(e) => setSoloNoLeidas(e.target.checked)} />
        <Typography color="text.secondary" variant="body2">
          {soloNoLeidas ? "Mostrando no leídas" : "Mostrando todas"}
        </Typography>
      </Box>

      {cargando ? (
        <Box textAlign="center" py={4}><CircularProgress /></Box>
      ) : notifs.length === 0 ? (
        <Alert severity="info">Sin alertas {soloNoLeidas ? "no leídas" : ""}</Alert>
      ) : (
        <Box display="flex" flexDirection="column" gap={2}>
          {notifs.map((n) => (
            <Card
              key={n.id}
              sx={{
                borderLeft: `4px solid ${n.leida ? "#94a3b8" : "#ef4444"}`,
                bgcolor: n.leida ? "#f8fafc" : "#fff1f2",
              }}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                      <NotificationsActiveIcon sx={{ color: n.leida ? "#94a3b8" : "#ef4444" }} />
                      <Typography fontWeight={700}>{n.username}</Typography>
                      {!n.leida && <Chip label="Nueva" color="error" size="small" />}
                    </Box>
                    <Typography variant="body1" mb={0.5}>{n.mensaje}</Typography>
                    {n.distancia_metros && (
                      <Typography variant="body2" color="text.secondary">
                        Distancia: {Math.round(n.distancia_metros)} m
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {new Date(n.creada_at).toLocaleString("es-MX")}
                    </Typography>
                  </Box>
                  {!n.leida && (
                    <Button size="small" variant="outlined" onClick={() => marcarLeida(n.id)}>
                      Marcar leída
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// TAB ACUMULADO SEMANAL (admin)
// ═════════════════════════════════════════════════════════════════════════════

const TabAcumulado: React.FC = () => {
  const [ciclos, setCiclos] = useState<CicloSemana[]>([]);
  const [cicloSel, setCicloSel] = useState<string>("");
  const [filas, setFilas] = useState<EmpleadoAcumuladoSemanal[]>([]);
  const [cargando, setCargando] = useState(false);
  const [descuentosEdit, setDescuentosEdit] = useState<Record<string, string>>({});
  const [horasExtraEdit, setHorasExtraEdit] = useState<Record<string, number>>({});
  const [guardarOpen, setGuardarOpen] = useState(false);
  const [etiqueta, setEtiqueta] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [cicloSnack, setCicloSnack] = useState<{ msg: string; sev: "success" | "error" } | null>(null);

  const cargarAcumulado = useCallback(async (cicloInicio: string) => {
    if (!cicloInicio) return;
    setCargando(true);
    try {
      const { data } = await axios.get<EmpleadoAcumuladoSemanal[]>(
        `${API}/asistencia/acumulado-semanal?ciclo=${cicloInicio}`,
        { headers: authH() }
      );
      setFilas(data);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    axios
      .get<CicloSemana[]>(`${API}/asistencia/ciclos`, { headers: authH() })
      .then(({ data }) => {
        setCiclos(data);
        if (data.length > 0) setCicloSel(data[0].inicio);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (cicloSel) cargarAcumulado(cicloSel);
  }, [cicloSel, cargarAcumulado]);

  // ── Agrupar por nombre_englobado ?? username, filtrar ^[AC]\d+ ───────────────
  const grupos = useMemo((): GrupoAcumulado[] => {
    type Acc = {
      ids: number[];
      jornadas: number[];
      sueldos: number[];
      nombre_completo: string;
      diasAgg: Record<string, { horas: number; count: number; entrada: string | null; salida: string | null }>;
    };
    const map = new Map<string, Acc>();

    for (const f of filas) {
      const key = f.nombre_englobado ?? f.username;
      if (!/^[AC]\d+/i.test(key)) continue;

      if (!map.has(key)) {
        map.set(key, {
          ids: [],
          jornadas: [],
          sueldos: [],
          nombre_completo: f.nombre_completo || f.username,
          diasAgg: {},
        });
      }
      const g = map.get(key)!;
      g.ids.push(f.usuario_id);
      g.jornadas.push(f.jornada_fija ?? 0);
      g.sueldos.push(f.sueldo_base ?? 0);

      for (const [dk, dia] of Object.entries(f.dias)) {
        if (!g.diasAgg[dk]) {
          g.diasAgg[dk] = { horas: 0, count: 0, entrada: null, salida: null };
        }
        if (dia) {
          const d = g.diasAgg[dk];
          d.horas += dia.horas;
          d.count += 1;
          if (d.count === 1) {
            d.entrada = dia.entrada;
            d.salida = dia.salida;
          } else {
            // 2+ perfiles activos este día → no mostrar tiempos individuales
            d.entrada = null;
            d.salida = null;
          }
        }
      }
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, g]) => {
        if (new Set(g.jornadas).size > 1) {
          const detail = g.ids.map((id, i) => `id=${id}:${g.jornadas[i]}`).join(", ");
          console.warn(`[JORNADA_FIJA] ${key}: perfiles con valores distintos antes de unificar → ${detail}`);
        }

        const jornada = g.jornadas[0] > 0 ? g.jornadas[0] : null;
        let total_horas = 0;
        const dias: Record<string, DiaCelda | null> = {};

        for (const [dk, d] of Object.entries(g.diasAgg)) {
          if (d.count === 0) {
            dias[dk] = null;
          } else {
            total_horas += d.horas;
            dias[dk] = {
              horas: Math.round(d.horas * 100) / 100,
              entrada: d.entrada,
              salida: d.salida,
              multiple: d.count > 1,
            };
          }
        }

        total_horas = Math.round(total_horas * 100) / 100;
        const horas_extra =
          jornada !== null
            ? Math.round((total_horas - jornada) * 100) / 100
            : null;

        const sueldo_base = Math.max(0, ...g.sueldos);

        return { key, ids: g.ids, nombre_completo: g.nombre_completo, dias, total_horas, jornada, horas_extra, sueldo_base };
      });
  }, [filas]);

  useEffect(() => {
    const init: Record<string, string> = {};
    grupos.forEach((g) => {
      if (g.horas_extra !== null && g.horas_extra < 0) {
        init[g.key] = String(g.horas_extra);
      }
    });
    setDescuentosEdit(init);
    setHorasExtraEdit({});
  }, [grupos]);

  const getHE = (key: string, original: number | null): number | null =>
    key in horasExtraEdit ? horasExtraEdit[key] : original;

  const heEditada = (key: string): boolean => key in horasExtraEdit;

  const cicloActual = ciclos.find((c) => c.inicio === cicloSel) ?? null;

  const handleGuardarCiclo = async () => {
    if (!cicloActual || !etiqueta.trim()) return;
    setGuardando(true);
    try {
      const datos = grupos.map((g) => {
        const he = getHE(g.key, g.horas_extra);
        const jornada = g.jornada;
        const sueldo = g.sueldo_base;
        let valorRed: number | null = null;
        let pago: number | null = null;
        if (he !== null && jornada !== null && jornada > 0 && sueldo > 0) {
          valorRed = he >= 0
            ? redondearHorasExtra(he)
            : parseFloat(descuentosEdit[g.key] || String(he));
          pago = (sueldo / jornada) * valorRed;
        }
        return {
          empleado: g.key,
          nombre_completo: g.nombre_completo,
          usuario_ids: g.ids,
          jornada: g.jornada,
          sueldo_base: g.sueldo_base,
          total_horas: g.total_horas,
          horas_extra: he,
          horas_extra_redondeo: valorRed,
          pago: pago !== null ? parseFloat(pago.toFixed(2)) : null,
        };
      });
      await axios.post(
        `${API}/admin/ciclos-guardados`,
        {
          concepto: "horas_extras",
          etiqueta: etiqueta.trim(),
          fecha_inicio: cicloActual.inicio,
          fecha_fin: cicloActual.fin,
          datos,
        },
        { headers: authH() }
      );
      setCicloSnack({ msg: "Ciclo guardado correctamente", sev: "success" });
      setGuardarOpen(false);
      setEtiqueta("");
    } catch {
      setCicloSnack({ msg: "Error al guardar el ciclo", sev: "error" });
    } finally {
      setGuardando(false);
    }
  };

  const diasDelCiclo = cicloSel
    ? Array.from({ length: 7 }, (_, i) => {
        const [y, m, d] = cicloSel.split("-").map(Number);
        const dt = new Date(y, m - 1, d + i);
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      })
    : [];

  const COLS = ["Empleado", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom", "Total h", "Jornada", "H. Extra", "Redondeo", "$ Pago"];

  const cellBase = { py: "10px", px: "6px", fontSize: 11, whiteSpace: "nowrap" as const };
  const stickyHead = { position: "sticky" as const, top: 0, zIndex: 2, bgcolor: "#f8fafc" };
  const stickyLeft = { position: "sticky" as const, left: 0, zIndex: 1 };

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <FormControl size="small" sx={{ minWidth: 280 }}>
          <InputLabel>Ciclo</InputLabel>
          <Select
            label="Ciclo"
            value={cicloSel}
            onChange={(e) => setCicloSel(e.target.value as string)}
          >
            {ciclos.map((c) => (
              <MenuItem key={c.inicio} value={c.inicio}>
                {c.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {grupos.length > 0 && !cargando && (
          <Button
            variant="outlined"
            startIcon={<SaveIcon />}
            onClick={() => { setEtiqueta(""); setGuardarOpen(true); }}
            size="small"
          >
            Guardar ciclo
          </Button>
        )}
      </Box>

      {cargando ? (
        <Box textAlign="center" py={4}>
          <CircularProgress />
        </Box>
      ) : grupos.length === 0 ? (
        <Alert severity="info">Sin datos para este ciclo</Alert>
      ) : (
        <TableContainer
          component={Paper}
          elevation={1}
          sx={{ overflowX: "auto" }}
        >
          <Table size="small" sx={{ tableLayout: "fixed", minWidth: 1010 }}>
            <TableHead>
              <TableRow>
                {COLS.map((h) => (
                  <TableCell
                    key={h}
                    align={h === "Empleado" ? "left" : "center"}
                    sx={{
                      ...cellBase,
                      ...stickyHead,
                      ...(h === "Empleado" ? { ...stickyLeft, zIndex: 3, width: 140 } : {}),
                      ...(["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].includes(h) ? { width: 76 } : {}),
                      ...( h === "Total h" ? { width: 60 } : {}),
                      ...( h === "Jornada" ? { width: 68 } : {}),
                      ...( h === "H. Extra" ? { width: 64 } : {}),
                      ...( h === "Redondeo" ? { width: 72 } : {}),
                      ...( h === "$ Pago" ? { width: 72 } : {}),
                      fontWeight: 700,
                      color: "#FF6600",
                      borderBottom: "2px solid #e2e8f0",
                    }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {grupos.map((grupo, idx) => {
                const rowBg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
                return (
                  <TableRow key={grupo.key} sx={{ bgcolor: rowBg }}>
                    <TableCell
                      sx={{
                        ...cellBase,
                        ...stickyLeft,
                        bgcolor: rowBg,
                        fontWeight: 600,
                        width: 140,
                        boxShadow: "2px 0 4px rgba(0,0,0,0.06)",
                      }}
                    >
                      {grupo.key}
                    </TableCell>

                    {diasDelCiclo.map((diaKey) => {
                      const dia = grupo.dias[diaKey];
                      return (
                        <TableCell key={diaKey} align="center" sx={{ ...cellBase, width: 76 }}>
                          {dia ? (
                            <Box lineHeight={1.3}>
                              {!dia.multiple && (
                                <Box sx={{ fontSize: 10, whiteSpace: "nowrap", color: "#1e293b" }}>
                                  {formatHora24(dia.entrada)} ▶ {formatHora24(dia.salida)}
                                </Box>
                              )}
                              <Box sx={{ fontSize: 10, color: "#64748b" }}>
                                {dia.horas.toFixed(2)}h
                              </Box>
                            </Box>
                          ) : (
                            <Box sx={{ fontSize: 11, color: "#94a3b8" }}>Falta</Box>
                          )}
                        </TableCell>
                      );
                    })}

                    <TableCell align="center" sx={{ ...cellBase, width: 60, fontWeight: 700 }}>
                      {grupo.total_horas.toFixed(2)}h
                    </TableCell>

                    <TableCell align="center" sx={{ ...cellBase, width: 68 }}>
                      {grupo.jornada != null
                        ? <Box sx={{ fontSize: 11 }}>{grupo.jornada}h</Box>
                        : <Box sx={{ fontSize: 11, color: "#94a3b8" }}>—</Box>
                      }
                    </TableCell>

                    <TableCell align="center" sx={{ ...cellBase, width: 80, p: "2px 4px" }}>
                      {grupo.horas_extra == null ? (
                        <Box sx={{ fontSize: 11, color: "#94a3b8" }}>—</Box>
                      ) : (
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.3 }}>
                          <TextField
                            type="number"
                            size="small"
                            value={getHE(grupo.key, grupo.horas_extra) ?? ""}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) setHorasExtraEdit((prev) => ({ ...prev, [grupo.key]: val }));
                            }}
                            inputProps={{ step: "0.01", style: { fontSize: 11, padding: "3px 6px" } }}
                            sx={{
                              width: 72,
                              "& .MuiOutlinedInput-root": heEditada(grupo.key)
                                ? { "& fieldset": { borderColor: "#3b82f6", borderWidth: 2 } }
                                : {},
                            }}
                          />
                          {heEditada(grupo.key) && <span style={{ fontSize: 9 }}>✏️</span>}
                        </Box>
                      )}
                    </TableCell>

                    <TableCell align="center" sx={{ ...cellBase, width: 72, p: "2px 4px" }}>
                      {(() => {
                        const heEfectivo = getHE(grupo.key, grupo.horas_extra);
                        if (grupo.jornada == null) {
                          return <Box sx={{ fontSize: 11, color: "#94a3b8" }}>—</Box>;
                        }
                        if (heEfectivo !== null && heEfectivo >= 0) {
                          return (
                            <Box
                              sx={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: redondearHorasExtra(heEfectivo) > 0 ? "#16a34a" : undefined,
                              }}
                            >
                              {redondearHorasExtra(heEfectivo) > 0 ? "+" : ""}
                              {redondearHorasExtra(heEfectivo)}h
                            </Box>
                          );
                        }
                        return (
                          <TextField
                            size="small"
                            type="number"
                            value={descuentosEdit[grupo.key] ?? ""}
                            onChange={(e) =>
                              setDescuentosEdit((prev) => ({ ...prev, [grupo.key]: e.target.value }))
                            }
                            inputProps={{
                              step: "0.01",
                              style: { fontSize: 11, padding: "3px 6px", color: "#ef4444" },
                            }}
                            sx={{ width: 68 }}
                          />
                        );
                      })()}
                    </TableCell>

                    <TableCell align="center" sx={{ ...cellBase, width: 72, p: "2px 4px" }}>
                      {(() => {
                        const he = getHE(grupo.key, grupo.horas_extra);
                        const jornada = grupo.jornada;
                        const sueldo = grupo.sueldo_base;
                        if (jornada == null || jornada === 0 || sueldo === 0 || he == null) {
                          return <Box sx={{ fontSize: 11, color: "#94a3b8" }}>—</Box>;
                        }
                        const valorRed = he >= 0
                          ? redondearHorasExtra(he)
                          : parseFloat(descuentosEdit[grupo.key] || String(he));
                        const pago = (sueldo / jornada) * valorRed;
                        const color = pago > 0 ? "#16a34a" : pago < 0 ? "#ef4444" : undefined;
                        const prefix = pago > 0 ? "+" : pago < 0 ? "-" : "";
                        return (
                          <Box sx={{ fontSize: 11, fontWeight: 700, color }}>
                            {prefix}${Math.abs(pago).toFixed(2)}
                          </Box>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Dialog: guardar ciclo ── */}
      <Dialog open={guardarOpen} onClose={() => setGuardarOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Guardar ciclo</DialogTitle>
        <DialogContent>
          {cicloActual && (
            <Typography variant="body2" color="text.secondary" mb={2}>
              {cicloActual.label}
            </Typography>
          )}
          <TextField
            autoFocus
            label="Etiqueta"
            value={etiqueta}
            onChange={(e) => setEtiqueta(e.target.value)}
            fullWidth
            size="small"
            placeholder="Ej. Semana 21 mayo"
            helperText="Nombre para identificar este ciclo guardado"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGuardarOpen(false)} disabled={guardando}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleGuardarCiclo}
            disabled={!etiqueta.trim() || guardando}
            startIcon={guardando ? <CircularProgress size={16} /> : <SaveIcon />}
            sx={{ bgcolor: "#FF6600", "&:hover": { bgcolor: "#ea5c00" } }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!cicloSnack} autoHideDuration={4000} onClose={() => setCicloSnack(null)}>
        <Alert severity={cicloSnack?.sev} variant="filled" onClose={() => setCicloSnack(null)}>
          {cicloSnack?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// VISTA ADMIN / DIRECCION
// ═════════════════════════════════════════════════════════════════════════════

const VistaAdmin: React.FC = () => {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", p: 3 }}>
      <Typography variant="h4" fontWeight={700} color="primary" gutterBottom>
        REGISTRO DE ASISTENCIA — Administración
      </Typography>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, borderBottom: "1px solid #e2e8f0" }}
        TabIndicatorProps={{ sx: { bgcolor: "#FF6600" } }}
      >
        <Tab label="Registros" />
        <Tab label="Configurar Módulos" />
        <Tab label="Configurar Promotores" />
        <Tab label="Alertas" />
        <Tab label="Acumulado semanal" />
        <Tab label="Quién faltó" />
      </Tabs>

      {tab === 0 && <TabRegistros />}
      {tab === 1 && <TabModulos />}
      {tab === 2 && (
        <Box>
          <Typography variant="h6" fontWeight={600} mb={2}>
            Configura la ubicación de cada promotor de Cadenas
          </Typography>
          <TabPromotores />
        </Box>
      )}
      {tab === 3 && <TabAlertas />}
      {tab === 4 && <TabAcumulado />}
      {tab === 5 && <TabAnomalias />}
    </Box>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════════

const AsistenciaPage: React.FC = () => {
  const rol = localStorage.getItem("rol") ?? "";

  if (rol === "asesor" || rol === "encargado") return <VistaEmpleado />;
  if (rol === "admin" || rol === "direccion") return <VistaAdmin />;

  return (
    <Box textAlign="center" mt={8}>
      <Typography color="error">No tienes permiso para acceder a esta página.</Typography>
    </Box>
  );
};

export default AsistenciaPage;
