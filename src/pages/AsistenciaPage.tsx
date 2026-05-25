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
  DialogContent,
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
import axios from "axios";
import * as XLSX from "xlsx";

const API = process.env.REACT_APP_API_URL ?? "";
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
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

const mesActual = () => {
  const hoy = new Date();
  return { y: hoy.getFullYear(), m: hoy.getMonth() };
};

// ── FotoThumb: miniatura con click para ampliar ───────────────────────────────

const FotoThumb: React.FC<{ url: string | null }> = ({ url }) => {
  const [open, setOpen] = useState(false);
  if (!url) return <span style={{ color: "#94a3b8" }}>—</span>;
  return (
    <>
      <img
        src={url}
        alt="foto"
        style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4, cursor: "pointer" }}
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
  const [historial, setHistorial] = useState<AsistenciaResumen[]>([]);
  const [mes, setMes] = useState(mesActual());
  const [snack, setSnack] = useState<{ msg: string; sev: "success" | "error" | "warning"; autoHide?: boolean } | null>(null);
  const [camaraAbierta, setCamaraAbierta] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pendingRef = useRef<{ tipo: "entrada" | "salida"; lat: number; lng: number } | null>(null);

  const esMovil = isMobileDevice();
  const bloquearCheckIn = !esMovil;

  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const cargarHistorial = useCallback(async () => {
    const { y, m } = mes;
    const desde = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const ultimo = new Date(y, m + 1, 0).getDate();
    const hasta = `${y}-${String(m + 1).padStart(2, "0")}-${ultimo}`;
    try {
      const { data } = await axios.get<AsistenciaResumen[]>(
        `${API}/asistencia/mi-historial?desde=${desde}&hasta=${hasta}`,
        { headers: authH() }
      );
      setHistorial(data.sort((a, b) => b.fecha.localeCompare(a.fecha)));
    } catch {
      // silencioso
    }
  }, [mes]);

  useEffect(() => { cargarHistorial(); }, [cargarHistorial]);

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
      cargarHistorial();
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

  const totalHoras = historial.reduce((s, r) => s + r.horas_trabajadas, 0);
  const meses = Array.from({ length: 12 }, (_, i) => i);
  const anios = [new Date().getFullYear() - 1, new Date().getFullYear()];
  const nombresMes = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

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
            disabled={cargando}
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
            disabled={cargando}
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

      {/* ── Historial ── */}
      <Typography variant="h6" fontWeight={600} mb={1}>Mi historial</Typography>

      <Box display="flex" gap={2} mb={2}>
        <FormControl size="small">
          <InputLabel>Mes</InputLabel>
          <Select
            label="Mes"
            value={mes.m}
            onChange={(e) => setMes((p) => ({ ...p, m: Number(e.target.value) }))}
            sx={{ minWidth: 100 }}
          >
            {meses.map((i) => <MenuItem key={i} value={i}>{nombresMes[i]}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small">
          <InputLabel>Año</InputLabel>
          <Select
            label="Año"
            value={mes.y}
            onChange={(e) => setMes((p) => ({ ...p, y: Number(e.target.value) }))}
            sx={{ minWidth: 90 }}
          >
            {anios.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper} elevation={1}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#f8fafc" }}>
              {["Fecha","Entrada","Foto E","Salida","Foto S","Horas","Estado E","Estado S"].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 700, color: "#FF6600" }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {historial.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ color: "#94a3b8", py: 3 }}>
                  Sin registros para este período
                </TableCell>
              </TableRow>
            )}
            {historial.map((r) => {
              const fueraAlguno = r.dentro_de_zona_entrada === false || r.dentro_de_zona_salida === false;
              return (
                <TableRow key={r.fecha} sx={{ bgcolor: fueraAlguno ? "#fff7ed" : undefined }}>
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
            {historial.length > 0 && (
              <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                <TableCell colSpan={5} sx={{ fontWeight: 700 }}>Total del mes</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{totalHoras.toFixed(2)} h</TableCell>
                <TableCell /><TableCell />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

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
  const [jornadasEdit, setJornadasEdit] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(false);

  const cargarAcumulado = useCallback(async (cicloInicio: string) => {
    if (!cicloInicio) return;
    setCargando(true);
    try {
      const { data } = await axios.get<EmpleadoAcumuladoSemanal[]>(
        `${API}/asistencia/acumulado-semanal?ciclo=${cicloInicio}`,
        { headers: authH() }
      );
      setFilas(data);
      // Inicializar jornadasEdit con el primer perfil de cada grupo
      const seen = new Set<string>();
      const init: Record<string, string> = {};
      for (const f of data) {
        const key = f.nombre_englobado ?? f.username;
        if (!/^[AC]\d+/i.test(key)) continue;
        if (!seen.has(key)) {
          seen.add(key);
          init[key] = f.jornada != null ? String(f.jornada) : "";
        }
      }
      setJornadasEdit(init);
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
      jornadas: (number | null)[];
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
          nombre_completo: f.nombre_completo || f.username,
          diasAgg: {},
        });
      }
      const g = map.get(key)!;
      g.ids.push(f.usuario_id);
      g.jornadas.push(f.jornada);

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
        const vals = g.jornadas.filter((j): j is number => j !== null);
        if (new Set(vals).size > 1) {
          const detail = g.ids.map((id, i) => `id=${id}:${g.jornadas[i]}`).join(", ");
          console.warn(`[JORNADA] ${key}: perfiles con valores distintos antes de unificar → ${detail}`);
        }

        const jornada = g.jornadas[0] ?? null;
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

        return { key, ids: g.ids, nombre_completo: g.nombre_completo, dias, total_horas, jornada, horas_extra };
      });
  }, [filas]);

  const guardarJornada = async (grupo: GrupoAcumulado) => {
    const val = jornadasEdit[grupo.key] ?? "";
    const horas = val === "" ? null : parseFloat(val);
    if (horas !== null && isNaN(horas)) return;
    try {
      await Promise.all(
        grupo.ids.map((uid) =>
          axios.put(
            `${API}/asistencia/jornada`,
            { usuario_id: uid, ciclo: cicloSel, horas: horas ?? 0 },
            { headers: authH() }
          )
        )
      );
      setFilas((prev) =>
        prev.map((f) => {
          if (!grupo.ids.includes(f.usuario_id)) return f;
          const horas_extra =
            horas != null ? Math.round((f.total_horas - horas) * 100) / 100 : null;
          return { ...f, jornada: horas, horas_extra };
        })
      );
    } catch {
      // no-op
    }
  };

  const diasDelCiclo = cicloSel
    ? Array.from({ length: 7 }, (_, i) => {
        const [y, m, d] = cicloSel.split("-").map(Number);
        const dt = new Date(y, m - 1, d + i);
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      })
    : [];

  const COLS = ["Empleado", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom", "Total h", "Jornada", "H. Extra"];

  const cellBase = { py: "4px", px: "6px", fontSize: 11, whiteSpace: "nowrap" as const };
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
          sx={{ overflowX: "auto", overflowY: "auto", maxHeight: 520 }}
        >
          <Table size="small" sx={{ tableLayout: "fixed", minWidth: 820 }}>
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
                  <TableRow key={grupo.key} sx={{ bgcolor: rowBg, height: 36 }}>
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

                    <TableCell align="center" sx={{ ...cellBase, width: 68, p: "2px 4px" }}>
                      <TextField
                        size="small"
                        type="number"
                        value={jornadasEdit[grupo.key] ?? ""}
                        onChange={(e) =>
                          setJornadasEdit((prev) => ({
                            ...prev,
                            [grupo.key]: e.target.value,
                          }))
                        }
                        onBlur={() => {
                          const original = grupo.jornada != null ? String(grupo.jornada) : "";
                          if ((jornadasEdit[grupo.key] ?? "") !== original) {
                            guardarJornada(grupo);
                          }
                        }}
                        inputProps={{ step: "0.5", min: 0, style: { fontSize: 11, padding: "3px 6px" } }}
                        sx={{ width: 60 }}
                      />
                    </TableCell>

                    <TableCell align="center" sx={{ ...cellBase, width: 64 }}>
                      {grupo.horas_extra != null ? (
                        <Box
                          sx={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: grupo.horas_extra < 0 ? "#ef4444" : grupo.horas_extra > 0 ? "#16a34a" : undefined,
                          }}
                        >
                          {grupo.horas_extra > 0 ? "+" : ""}
                          {grupo.horas_extra.toFixed(2)}h
                        </Box>
                      ) : (
                        <Box sx={{ fontSize: 11, color: "#94a3b8" }}>—</Box>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
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
