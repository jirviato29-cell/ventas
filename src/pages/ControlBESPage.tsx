import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Paper,
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
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import axios from "axios";

const API = "https://ato-appservidor-nvxt.onrender.com";
const token = () => localStorage.getItem("token") ?? "";
const authH = () => ({ Authorization: `Bearer ${token()}` });

const VERDE = "#16a34a";
const NARANJA = "#FF6600";
const ROJO = "#dc2626";
const AMARILLO = "#ca8a04";
const FONDO_DIFERENCIA = "#fefce8";
const GRIS = "#94a3b8";

interface CapturaItem {
  id: number;
  clave: string;
  hora_entrada: string | null;
  hora_salida: string | null;
  duracion_minutos: number | null;
  foto_url: string;
}

interface PromotorFila {
  usuario_id: number;
  username: string;
  nombre_completo: string;
  apertura: CapturaItem | null;
  cierre: CapturaItem | null;
}

interface ResumenDia {
  fecha: string;
  total: number;
  completos: number;
  parciales: number;
  sin_nada: number;
  promotores: PromotorFila[];
}

const hoyISO = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

const formatDuracion = (minutos: number | null | undefined) => {
  if (minutos == null) return "—";
  return `${Math.floor(minutos / 60)}h ${minutos % 60}m`;
};

/** 0 = no subio nada, 1 = parcial, 2 = completo. Lo pendiente queda arriba. */
const prioridad = (p: PromotorFila) => {
  if (p.apertura && p.cierre) return 2;
  if (p.apertura || p.cierre) return 1;
  return 0;
};

/** La captura de cierre tambien trae hora de entrada: si no coinciden, algo no cuadra. */
const tieneDiferencia = (p: PromotorFila) =>
  !!p.apertura &&
  !!p.cierre &&
  p.apertura.hora_entrada !== p.cierre.hora_entrada;

const cellSx = { py: 1, px: 1.5, fontSize: 13 };

const Guion: React.FC = () => (
  <Box sx={{ color: GRIS, textAlign: "center" }}>—</Box>
);

const Miniatura: React.FC<{
  item: CapturaItem;
  alt: string;
  fallo: boolean;
  onFallo: (id: number) => void;
}> = ({ item, alt, fallo, onFallo }) => (
  <Box display="flex" alignItems="center" justifyContent="center" gap={0.75}>
    {!fallo && (
      <Box
        component="a"
        href={item.foto_url}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ display: "block", lineHeight: 0 }}
      >
        <Box
          component="img"
          src={item.foto_url}
          alt={alt}
          onError={() => onFallo(item.id)}
          sx={{
            width: 48,
            height: 48,
            objectFit: "cover",
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
            display: "block",
          }}
        />
      </Box>
    )}
    <CheckCircleIcon sx={{ fontSize: 18, color: VERDE }} />
  </Box>
);

const Contador: React.FC<{ etiqueta: string; valor: number; color?: string }> = ({
  etiqueta,
  valor,
  color,
}) => (
  <Paper variant="outlined" sx={{ flex: 1, p: 2, textAlign: "center" }}>
    <Typography variant="h4" fontWeight={700} sx={{ color: color ?? "text.primary" }}>
      {valor}
    </Typography>
    <Typography variant="body2" color="text.secondary">
      {etiqueta}
    </Typography>
  </Paper>
);

const ControlBESPage: React.FC = () => {
  const [fecha, setFecha] = useState<string>(hoyISO);
  const [datos, setDatos] = useState<ResumenDia | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fotosFallidas, setFotosFallidas] = useState<Set<number>>(new Set());

  const marcarFallo = useCallback((id: number) => {
    setFotosFallidas((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  const cargar = useCallback(async (dia: string) => {
    setCargando(true);
    setError(null);
    try {
      const { data } = await axios.get<ResumenDia>(
        `${API}/capturas-telcel/resumen-dia?fecha=${dia}`,
        { headers: authH() }
      );
      setDatos(data);
      // Datos frescos: se reintenta cargar las imagenes que antes fallaron
      setFotosFallidas(new Set());
    } catch (err: any) {
      setDatos(null);
      if (err?.response?.status === 403) {
        setError("No tienes permiso para ver esta página.");
        return;
      }
      const detail = err?.response?.data?.detail;
      if (detail && typeof detail === "object" && detail.codigo) {
        setError(detail.mensaje);
      } else {
        setError(
          typeof detail === "string" ? detail : "No se pudo cargar el control. Intenta de nuevo."
        );
      }
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar(fecha);
  }, [fecha, cargar]);

  const filas = datos
    ? [...datos.promotores].sort(
        (a, b) => prioridad(a) - prioridad(b) || a.username.localeCompare(b.username, "es")
      )
    : [];

  const conDiferencia = filas.filter(tieneDiferencia).length;

  return (
    <Container sx={{ mt: 4, mb: 6 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Control BES
      </Typography>

      <TextField
        type="date"
        size="small"
        label="Fecha"
        value={fecha}
        onChange={(e) => setFecha(e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ mb: 3, mt: 1 }}
      />

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

      {!cargando && datos && (
        <>
          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, mb: 3 }}>
            <Contador etiqueta="Total" valor={datos.total} />
            <Contador etiqueta="Completos" valor={datos.completos} color={VERDE} />
            <Contador etiqueta="Parciales" valor={datos.parciales} color={NARANJA} />
            <Contador etiqueta="Sin subir" valor={datos.sin_nada} color={ROJO} />
            <Contador etiqueta="Con diferencia" valor={conDiferencia} color={AMARILLO} />
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  {["ID", "Check In", "Check Out", "Entrada", "Salida", "Duración"].map((h) => (
                    <TableCell
                      key={h}
                      align={h === "ID" ? "left" : "center"}
                      sx={{ ...cellSx, fontWeight: 700, whiteSpace: "nowrap" }}
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filas.map((p) => {
                  const entrada =
                    p.apertura?.hora_entrada ?? p.cierre?.hora_entrada ?? null;
                  const difiere = tieneDiferencia(p);
                  return (
                    <TableRow
                      key={p.usuario_id}
                      hover
                      sx={difiere ? { bgcolor: FONDO_DIFERENCIA } : undefined}
                    >
                      <TableCell sx={{ ...cellSx, fontWeight: 600, whiteSpace: "nowrap" }}>
                        {p.username}
                      </TableCell>
                      <TableCell align="center" sx={cellSx}>
                        {p.apertura ? (
                          <Miniatura
                            item={p.apertura}
                            alt={`Apertura de ${p.username}`}
                            fallo={fotosFallidas.has(p.apertura.id)}
                            onFallo={marcarFallo}
                          />
                        ) : <Guion />}
                      </TableCell>
                      <TableCell align="center" sx={cellSx}>
                        {p.cierre ? (
                          <Miniatura
                            item={p.cierre}
                            alt={`Cierre de ${p.username}`}
                            fallo={fotosFallidas.has(p.cierre.id)}
                            onFallo={marcarFallo}
                          />
                        ) : <Guion />}
                      </TableCell>
                      <TableCell align="center" sx={cellSx}>
                        {entrada ? (
                          <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                            {entrada}
                            {difiere && (
                              <Tooltip
                                title={`La captura de cierre dice ${p.cierre?.hora_entrada}`}
                              >
                                <WarningAmberIcon sx={{ fontSize: 16, color: NARANJA }} />
                              </Tooltip>
                            )}
                          </Box>
                        ) : <Guion />}
                      </TableCell>
                      <TableCell align="center" sx={cellSx}>
                        {p.cierre?.hora_salida ?? <Guion />}
                      </TableCell>
                      <TableCell align="center" sx={cellSx}>
                        {p.cierre?.duracion_minutos != null
                          ? formatDuracion(p.cierre.duracion_minutos)
                          : <Guion />}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Container>
  );
};

export default ControlBESPage;
