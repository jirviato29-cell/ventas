import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Checkbox,
  CircularProgress,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import axios from "axios";

const API = "https://ato-appservidor-nvxt.onrender.com";
const token = () => localStorage.getItem("token") ?? "";
const authH = () => ({ Authorization: `Bearer ${token()}` });

const GRIS = "#94a3b8";

type Estado = "pendientes" | "realizadas" | "todas";

interface PortabilidadItem {
  id: number;
  fecha: string;
  hora: string;
  tipo_chip: string;
  numero_telefono: string;
  curp: string | null;
  iccid: string | null;
  nip: string | null;
  asesor: string | null;
  modulo: string | null;
  portabilidad_realizada: boolean;
  fecha_portabilidad: string | null;
}

/** "14:30:00.123456" -> "14:30". El backend manda segundos y microsegundos. */
const formatHora = (hora: string | null) => (hora ? hora.slice(0, 5) : "—");

/**
 * "2026-09-03" -> "03/09/2026". Se corta la cadena en vez de usar Date porque
 * `new Date("2026-09-03")` se interpreta como UTC y en Mexico retrocede un dia.
 */
const formatFecha = (fecha: string | null) => {
  if (!fecha) return "—";
  const [a, m, d] = fecha.slice(0, 10).split("-");
  return a && m && d ? `${d}/${m}/${a}` : fecha;
};

/** "2026-09-03T11:34:52" -> "03/09/2026 11:34". Mismo motivo: sin Date. */
const formatFechaHora = (valor: string | null) => {
  if (!valor) return "—";
  const [fecha, resto] = valor.split("T");
  return `${formatFecha(fecha)} ${(resto ?? "").slice(0, 5)}`.trim();
};

const VACIO: Record<Estado, string> = {
  pendientes: "No hay portabilidades pendientes.",
  realizadas: "No hay portabilidades realizadas.",
  todas: "No hay portabilidades registradas.",
};

const cellSx = { py: 1, px: 1.5, fontSize: 13 };

const Guion: React.FC = () => <Box sx={{ color: GRIS }}>—</Box>;

const COLUMNAS = [
  "Fecha",
  "Hora",
  "Asesor",
  "Módulo",
  "Tipo",
  "Número",
  "CURP",
  "ICCID",
  "NIP",
  "¿Realizada?",
  "Fecha realizada",
];

const PortabilidadesPage: React.FC = () => {
  const [estado, setEstado] = useState<Estado>("pendientes");
  const [filas, setFilas] = useState<PortabilidadItem[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardandoId, setGuardandoId] = useState<number | null>(null);

  const cargar = useCallback(async (filtro: Estado) => {
    setCargando(true);
    setError(null);
    try {
      const { data } = await axios.get<PortabilidadItem[]>(
        `${API}/ventas/portabilidades?estado=${filtro}`,
        { headers: authH() }
      );
      setFilas(data);
    } catch (err: any) {
      setFilas([]);
      if (err?.response?.status === 403) {
        setError("No tienes permiso para ver esta página.");
        return;
      }
      const detail = err?.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : "No se pudieron cargar las portabilidades. Intenta de nuevo."
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar(estado);
  }, [estado, cargar]);

  // Al marcar se recarga la lista: con el filtro en Pendientes la fila
  // desaparece, que es justo lo que se espera al terminar el tramite.
  const alternarRealizada = async (fila: PortabilidadItem) => {
    setGuardandoId(fila.id);
    setError(null);
    try {
      await axios.patch(
        `${API}/ventas/portabilidades/${fila.id}`,
        { realizada: !fila.portabilidad_realizada },
        { headers: authH() }
      );
      await cargar(estado);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setError("No tienes permiso para modificar portabilidades.");
      } else {
        const detail = err?.response?.data?.detail;
        setError(
          typeof detail === "string" ? detail : "No se pudo guardar el cambio. Intenta de nuevo."
        );
      }
    } finally {
      setGuardandoId(null);
    }
  };

  return (
    <Container sx={{ mt: 4, mb: 6 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Portabilidades
      </Typography>

      <ToggleButtonGroup
        size="small"
        exclusive
        value={estado}
        onChange={(_, v) => { if (v) setEstado(v as Estado); }}
        sx={{ mb: 2, mt: 1 }}
      >
        <ToggleButton value="pendientes">Pendientes</ToggleButton>
        <ToggleButton value="realizadas">Realizadas</ToggleButton>
        <ToggleButton value="todas">Todas</ToggleButton>
      </ToggleButtonGroup>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {filas.length} {filas.length === 1 ? "portabilidad" : "portabilidades"}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {cargando && (
        <Box display="flex" alignItems="center" gap={1} sx={{ color: "text.secondary" }}>
          <CircularProgress size={20} />
          <Typography variant="body2">Cargando...</Typography>
        </Box>
      )}

      {!cargando && !error && filas.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          {VACIO[estado]}
        </Typography>
      )}

      {!cargando && filas.length > 0 && (
        <TableContainer component={Paper} variant="outlined" sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {COLUMNAS.map((h) => (
                  <TableCell
                    key={h}
                    align={h === "¿Realizada?" ? "center" : "left"}
                    sx={{ ...cellSx, fontWeight: 700, whiteSpace: "nowrap" }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filas.map((f) => (
                <TableRow key={f.id} hover>
                  <TableCell sx={{ ...cellSx, whiteSpace: "nowrap" }}>
                    {formatFecha(f.fecha)}
                  </TableCell>
                  <TableCell sx={{ ...cellSx, whiteSpace: "nowrap" }}>
                    {formatHora(f.hora)}
                  </TableCell>
                  <TableCell sx={{ ...cellSx, fontWeight: 600, whiteSpace: "nowrap" }}>
                    {f.asesor || <Guion />}
                  </TableCell>
                  <TableCell sx={cellSx}>{f.modulo || <Guion />}</TableCell>
                  <TableCell sx={cellSx}>{f.tipo_chip}</TableCell>
                  <TableCell sx={{ ...cellSx, whiteSpace: "nowrap" }}>
                    {f.numero_telefono}
                  </TableCell>
                  <TableCell sx={cellSx}>{f.curp || <Guion />}</TableCell>
                  <TableCell sx={cellSx}>{f.iccid || <Guion />}</TableCell>
                  <TableCell sx={cellSx}>{f.nip || <Guion />}</TableCell>
                  <TableCell align="center" sx={cellSx}>
                    <Checkbox
                      size="small"
                      checked={f.portabilidad_realizada}
                      disabled={guardandoId === f.id}
                      onChange={() => alternarRealizada(f)}
                    />
                  </TableCell>
                  <TableCell sx={{ ...cellSx, whiteSpace: "nowrap" }}>
                    {formatFechaHora(f.fecha_portabilidad)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
};

export default PortabilidadesPage;
