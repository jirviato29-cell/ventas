import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";
import { authH } from "../components/MisDatosPerfil";
import { mensajeError } from "../components/MisSolicitudesVacaciones";
import { refrescarNoLeidos } from "../components/useNoLeidos";

// Pantalla de RH y encargados: solo SU columna (RH o Encargado) de las solicitudes que les tocan.
// Qué solicitudes y qué columna lo decide el backend (GET/PATCH /aprobaciones); aquí no hay reglas.
// Sin permiso, el backend responde 403 y la página regresa al inicio.

const API = "/api";
const VERDE = "#15803D";
const ROJO = "#B91C1C";
const AZUL = "#0D2B6B";

type NivelRevisor = "rh" | "encargado";

interface NivelRevision {
  nivel: NivelRevisor;
  aprobado: boolean | null;
  por: string | null;
  at: string | null;
}

export interface SolicitudRevision {
  id: number;
  clave: string;
  nombre_completo: string | null;
  modulo: string | null;
  tipo: string | null;
  fecha_inicio: string; // "YYYY-MM-DD"
  fecha_fin: string;
  dias: number | null;
  niveles: NivelRevision[];
}

const TEXTO_NIVEL: Record<NivelRevisor, string> = { rh: "RH", encargado: "Encargado" };

const fechaCorta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const textoRango = (inicio: string, fin: string) =>
  inicio === fin ? fechaCorta(inicio) : `${fechaCorta(inicio)} – ${fechaCorta(fin)}`;
const numero = (n: number) => n.toLocaleString("es-MX", { maximumFractionDigits: 1 });
const textoTipo = (tipo: string | null) => (tipo === "dia_extra" ? "Día extra" : "Vacaciones");
const momento = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "";

const celdaEncabezadoSx = { fontSize: 13, px: 1, whiteSpace: "nowrap" };
const celdaSx = { fontSize: 13, px: 1, py: 0.75 };

const RevisarSolicitudes: React.FC = () => {
  const celular = useMediaQuery("(max-width:600px)");
  const [solicitudes, setSolicitudes] = useState<SolicitudRevision[]>([]);
  const [cargando, setCargando] = useState(true);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupada, setOcupada] = useState<number | null>(null);
  // Celdas ya marcadas que se abrieron para cambiar la decisión ("id-nivel")
  const [editando, setEditando] = useState<Set<string>>(new Set());

  useEffect(() => {
    let vivo = true;
    axios
      .get<SolicitudRevision[]>(`${API}/aprobaciones/solicitudes`, { headers: authH() })
      .then((r) => vivo && setSolicitudes(r.data))
      .catch((e) => {
        if (!vivo) return;
        if (axios.isAxiosError(e) && e.response?.status === 403) setSinPermiso(true);
        else setError("No se pudieron cargar las solicitudes.");
      })
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, []);

  const cerrarEdicion = (id: number, nivel: NivelRevisor) =>
    setEditando((prev) => {
      const nuevo = new Set(prev);
      nuevo.delete(`${id}-${nivel}`);
      return nuevo;
    });

  const marcar = async (id: number, nivel: NivelRevisor, aprobado: boolean) => {
    setOcupada(id);
    try {
      const { data } = await axios.patch<SolicitudRevision>(
        `${API}/aprobaciones/${id}`,
        { nivel, aprobado },
        { headers: authH() }
      );
      setSolicitudes((prev) => prev.map((s) => (s.id === id ? data : s)));
      cerrarEdicion(id, nivel);
      refrescarNoLeidos();
    } catch (e) {
      // 409: ya la autorizó o rechazó Gerencia (o la cancelaron); se quita de la lista
      if (axios.isAxiosError(e) && e.response?.status === 409) {
        setSolicitudes((prev) => prev.filter((s) => s.id !== id));
        setAviso("Esta solicitud ya no está pendiente.");
      } else {
        setAviso(mensajeError(e, "No se pudo guardar la decisión."));
      }
    } finally {
      setOcupada(null);
    }
  };

  // Un nivel: botones ✓ ✗; ya marcado, el chip (clic para cambiar la decisión)
  const celdaNivel = (s: SolicitudRevision, n: NivelRevision) => {
    const abierta = editando.has(`${s.id}-${n.nivel}`);
    const texto = TEXTO_NIVEL[n.nivel];
    if (n.aprobado != null && !abierta) {
      return (
        <Tooltip title={`${n.aprobado ? "Aprobó" : "Rechazó"}: ${n.por ?? "Sin nombre"} · ${momento(n.at)} · clic para cambiar`} arrow>
          <Chip
            size="small"
            label={n.aprobado ? "Aprobó" : "Rechazó"}
            onClick={() => setEditando((prev) => new Set(prev).add(`${s.id}-${n.nivel}`))}
            sx={{
              fontWeight: 600,
              fontSize: 12,
              height: 24,
              bgcolor: n.aprobado ? "#DCFCE7" : "#FDE2E2",
              color: n.aprobado ? VERDE : ROJO,
              border: `1px solid ${n.aprobado ? "#16A34A" : ROJO}`,
            }}
          />
        </Tooltip>
      );
    }
    return (
      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
        <IconButton
          size="small"
          aria-label={`Aprobar ${texto}`}
          disabled={ocupada === s.id}
          onClick={() => marcar(s.id, n.nivel, true)}
          sx={{ color: VERDE, border: `1px solid ${VERDE}`, p: "3px" }}
        >
          <CheckIcon sx={{ fontSize: 18 }} />
        </IconButton>
        <IconButton
          size="small"
          aria-label={`Rechazar ${texto}`}
          disabled={ocupada === s.id}
          onClick={() => marcar(s.id, n.nivel, false)}
          sx={{ color: ROJO, border: `1px solid ${ROJO}`, p: "3px" }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
        {abierta && (
          <Button size="small" onClick={() => cerrarEdicion(s.id, n.nivel)} sx={{ minWidth: 0, fontSize: 11, px: 0.5 }}>
            Dejar
          </Button>
        )}
      </Box>
    );
  };

  if (sinPermiso) return <Navigate to="/" replace />;

  // Columnas que marca esta persona (RH, Encargado o las dos), en orden fijo
  const niveles = (["rh", "encargado"] as NivelRevisor[]).filter((nv) =>
    solicitudes.some((s) => s.niveles.some((n) => n.nivel === nv))
  );
  const faltan = solicitudes.filter((s) => s.niveles.some((n) => n.aprobado == null)).length;

  return (
    <Container maxWidth="lg" sx={{ py: 2, px: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" sx={{ fontWeight: 800, color: AZUL }}>
        Solicitudes por revisar
      </Typography>
      <Typography sx={{ fontSize: 14, color: "#475569", mb: 2 }}>
        Vacaciones y días extra pendientes que te toca revisar.
        {!cargando && solicitudes.length > 0 && ` Te faltan ${faltan} de ${solicitudes.length}.`}
      </Typography>

      {cargando && (
        <Box sx={{ textAlign: "center", py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      {!cargando && !error && solicitudes.length === 0 && (
        <Alert severity="success">No tienes solicitudes pendientes por revisar.</Alert>
      )}

      {!cargando && solicitudes.length > 0 && celular && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {solicitudes.map((s) => (
            <Paper key={s.id} variant="outlined" sx={{ p: 1.5, borderLeft: `4px solid ${AZUL}` }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, alignItems: "baseline" }}>
                <Typography sx={{ fontWeight: 800, fontSize: 15 }}>{s.clave}</Typography>
                <Typography sx={{ fontSize: 12, color: "#64748b" }}>{s.modulo ?? "Sin módulo"}</Typography>
              </Box>
              {s.nombre_completo && <Typography sx={{ fontSize: 12, color: "#64748b" }}>{s.nombre_completo}</Typography>}
              <Typography sx={{ fontSize: 14, mt: 0.5 }}>
                {textoTipo(s.tipo)} · {textoRango(s.fecha_inicio, s.fecha_fin)}
                {s.dias != null && ` · ${numero(s.dias)} ${s.dias === 1 ? "día" : "días"}`}
              </Typography>
              {s.niveles.map((n) => (
                <Box key={n.nivel} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#f97316" }}>{TEXTO_NIVEL[n.nivel]}</Typography>
                  {celdaNivel(s, n)}
                </Box>
              ))}
            </Paper>
          ))}
        </Box>
      )}

      {!cargando && solicitudes.length > 0 && !celular && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={celdaEncabezadoSx}>ID</TableCell>
                <TableCell sx={celdaEncabezadoSx}>Nombre</TableCell>
                <TableCell sx={celdaEncabezadoSx}>Módulo</TableCell>
                <TableCell sx={celdaEncabezadoSx}>Tipo</TableCell>
                <TableCell sx={celdaEncabezadoSx}>Fechas</TableCell>
                <TableCell sx={celdaEncabezadoSx} align="center">Días</TableCell>
                {niveles.map((nv) => (
                  <TableCell key={nv} sx={celdaEncabezadoSx} align="center">
                    {TEXTO_NIVEL[nv]}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {solicitudes.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell sx={{ ...celdaSx, fontWeight: 700 }}>{s.clave}</TableCell>
                  <TableCell sx={celdaSx}>{s.nombre_completo ?? ""}</TableCell>
                  <TableCell sx={celdaSx}>{s.modulo ?? "—"}</TableCell>
                  <TableCell sx={celdaSx}>{textoTipo(s.tipo)}</TableCell>
                  <TableCell sx={{ ...celdaSx, whiteSpace: "nowrap" }}>{textoRango(s.fecha_inicio, s.fecha_fin)}</TableCell>
                  <TableCell sx={celdaSx} align="center">{s.dias != null ? numero(s.dias) : "—"}</TableCell>
                  {niveles.map((nv) => {
                    const n = s.niveles.find((x) => x.nivel === nv);
                    return (
                      <TableCell key={nv} sx={celdaSx} align="center">
                        {n ? celdaNivel(s, n) : <Typography sx={{ fontSize: 12, color: "#94a3b8" }}>—</Typography>}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Snackbar open={!!aviso} autoHideDuration={5000} onClose={() => setAviso(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity="warning" onClose={() => setAviso(null)} sx={{ width: "100%" }}>
          {aviso}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default RevisarSolicitudes;
