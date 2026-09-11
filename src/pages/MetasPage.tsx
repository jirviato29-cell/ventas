import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  LinearProgress,
  Paper,
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
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PrintIcon from "@mui/icons-material/Print";
import axios from "axios";

const API = "https://ato-appservidor-nvxt.onrender.com";
const token = () => localStorage.getItem("token") ?? "";
const authH = () => ({ Authorization: `Bearer ${token()}` });

const VERDE = "#16a34a";
const ROJO = "#dc2626";
const NARANJA = "#f97316";
const GRIS = "#94a3b8";

const REFRESCO_HOY_MS = 2 * 60 * 1000;

// El backend ya filtra por rol: admin y direccion ven todos los modulos,
// los demas solo el suyo. Aqui no se repite esa logica.

interface Escalon {
  nivel: number;
  meta: number;
  bolsa: number;
}

interface ModuloDia {
  modulo_id: number;
  modulo: string;
  fecha: string;
  venta_dia: number;
  nivel: number;
  bolsa: number;
  avance_pct: number | null;
  falta_nivel_1: number;
  escalera: Escalon[];
}

interface RespuestaDia {
  fecha: string;
  modulos: ModuloDia[];
}

interface FilaAsesor {
  modulo_id?: number;
  empleado_id?: number;
  modulo: string;
  fecha: string;
  asesor: string;
  venta_asesor: number;
  tickets: number;
  n_participantes: number;
  venta_dia: number;
  nivel: number;
  bolsa_modulo: number;
  le_toca: number;
  participacion_pct: number | null;
}

interface RespuestaAsesores {
  fecha: string;
  asesores: FilaAsesor[];
}

interface FilaSemana {
  modulo_id?: number;
  empleado_id?: number;
  lunes: string;
  domingo: string;
  paga_el: string | null;
  modulo: string;
  asesor: string;
  dias_trabajados: number;
  dias_con_bolsa: number;
  dias_record: number;
  venta_semana: number;
  a_pagar: number;
}

interface RespuestaSemana {
  lunes: string;
  domingo: string;
  asesores: FilaSemana[];
}

const hoyISO = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

const dinero = (v: number | null | undefined) =>
  `$${Math.round(Number(v ?? 0)).toLocaleString("es-MX")}`;

const porcentaje = (v: number | null | undefined) =>
  v == null ? "—" : `${Number(v).toLocaleString("es-MX", { maximumFractionDigits: 1 })}%`;

/** "2026-09-11" -> "11/09/2026" sin pasar por Date, para no correr el dia por zona horaria. */
const fechaCorta = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
};

const mensajeError = (err: any, generico: string) => {
  if (err?.response?.status === 403) return "No tienes permiso para ver esta página.";
  const detail = err?.response?.data?.detail;
  return typeof detail === "string" ? detail : generico;
};

const cellSx = { py: 1, px: 1.5, fontSize: 13 };

const Cargando: React.FC = () => (
  <Box display="flex" alignItems="center" gap={1} sx={{ color: "text.secondary", mb: 2 }}>
    <CircularProgress size={20} />
    <Typography variant="body2">Cargando...</Typography>
  </Box>
);

const Resumen: React.FC<{ etiqueta: string; valor: string; color?: string }> = ({
  etiqueta,
  valor,
  color,
}) => (
  <Paper variant="outlined" sx={{ flex: 1, minWidth: 180, p: 2, textAlign: "center" }}>
    <Typography variant="h5" fontWeight={800} sx={{ color: color ?? "text.primary" }}>
      {valor}
    </Typography>
    <Typography variant="body2" color="text.secondary">
      {etiqueta}
    </Typography>
  </Paper>
);

// ── HOY ──────────────────────────────────────────────────────────────────────

const TarjetaModulo: React.FC<{ m: ModuloDia }> = ({ m }) => {
  const escalera = [...(m.escalera ?? [])].sort((a, b) => a.nivel - b.nivel);
  const metaNivel1 = Number(escalera.find((e) => e.nivel === 1)?.meta ?? 0);
  const venta = Number(m.venta_dia ?? 0);
  const gano = m.nivel > 0;
  // Barra hacia el nivel 1: se llena en cuanto se alcanza.
  const avanceNivel1 = metaNivel1 > 0 ? Math.min(100, (venta / metaNivel1) * 100) : 0;

  return (
    <Paper sx={{ p: 2, height: "100%", borderTop: `4px solid ${gano ? VERDE : ROJO}` }}>
      <Box display="flex" justifyContent="space-between" alignItems="baseline" gap={1}>
        <Typography variant="h5" fontWeight={800} noWrap>
          {m.modulo}
        </Typography>
        <Typography variant="caption" fontWeight={700} sx={{ color: gano ? VERDE : GRIS }}>
          {gano ? `NIVEL ${m.nivel}` : "SIN NIVEL"}
        </Typography>
      </Box>

      <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5, lineHeight: 1.1 }}>
        {dinero(venta)}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Venta del día
      </Typography>

      <Box sx={{ mt: 1.5 }}>
        <Box display="flex" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">
            Avance al nivel 1
          </Typography>
          <Typography variant="caption" fontWeight={700}>
            {Math.floor(avanceNivel1)}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={avanceNivel1}
          sx={{
            height: 10,
            borderRadius: 5,
            bgcolor: "#e2e8f0",
            "& .MuiLinearProgress-bar": { bgcolor: gano ? VERDE : NARANJA, borderRadius: 5 },
          }}
        />
      </Box>

      <Typography sx={{ mt: 1.5, fontWeight: 800, fontSize: 20, color: gano ? VERDE : ROJO }}>
        {gano ? `Ganando ${dinero(m.bolsa)}` : `Faltan ${dinero(m.falta_nivel_1)}`}
      </Typography>

      {/* Escalera: verde lo alcanzado, borde fuerte en el nivel actual */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0.75, mt: 1.5 }}>
        {escalera.map((e) => {
          const alcanzado = m.nivel >= e.nivel;
          const actual = m.nivel === e.nivel;
          return (
            <Box
              key={e.nivel}
              sx={{
                textAlign: "center",
                borderRadius: 1.5,
                py: 0.75,
                px: 0.5,
                border: `2px solid ${actual ? VERDE : alcanzado ? "#86efac" : "#e2e8f0"}`,
                bgcolor: alcanzado ? "#dcfce7" : "#f8fafc",
                color: alcanzado ? "#14532d" : GRIS,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 0.3,
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                {alcanzado && <CheckCircleIcon sx={{ fontSize: 13, color: VERDE }} />}N{e.nivel}
              </Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{dinero(e.meta)}</Typography>
              <Typography sx={{ fontSize: 11 }}>bolsa {dinero(e.bolsa)}</Typography>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
};

const SeccionHoy: React.FC = () => {
  const [datos, setDatos] = useState<RespuestaDia | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actualizado, setActualizado] = useState<Date | null>(null);

  const cargar = useCallback(async () => {
    try {
      const { data } = await axios.get<RespuestaDia>(`${API}/api/metas/hoy`, {
        headers: authH(),
      });
      setDatos(data);
      setActualizado(new Date());
      setError(null);
    } catch (err: any) {
      // Si falla un refresco se conservan los ultimos datos en pantalla.
      setError(mensajeError(err, "No se pudieron cargar las metas de hoy."));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, REFRESCO_HOY_MS);
    return () => clearInterval(id);
  }, [cargar]);

  const modulos = datos?.modulos ?? [];

  return (
    <>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={1}
        sx={{ mb: 2 }}
      >
        <Typography variant="body2" color="text.secondary">
          {datos ? `Metas del ${fechaCorta(datos.fecha)}` : ""}
        </Typography>
        {actualizado && (
          <Typography variant="caption" color="text.secondary">
            Actualizado a las{" "}
            {actualizado.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })} · se
            refresca cada 2 minutos
          </Typography>
        )}
      </Box>

      {error && (
        <Alert severity={datos ? "warning" : "error"} sx={{ mb: 2 }}>
          {datos ? `${error} Se muestran los últimos datos.` : error}
        </Alert>
      )}

      {cargando && <Cargando />}

      {!cargando && datos && modulos.length === 0 && (
        <Typography color="text.secondary">No hay módulos para mostrar.</Typography>
      )}

      <Grid container spacing={2}>
        {modulos.map((m) => (
          <Grid item key={m.modulo_id} xs={12} sm={6} md={4} lg={3}>
            <TarjetaModulo m={m} />
          </Grid>
        ))}
      </Grid>
    </>
  );
};

// ── ASESORES ─────────────────────────────────────────────────────────────────

const leTocaHeadSx = {
  bgcolor: `${NARANJA} !important`,
  color: "#fff !important",
  fontWeight: 800,
};

const leTocaCellSx = {
  bgcolor: "#fff7ed",
  color: "#c2410c",
  fontWeight: 800,
  fontSize: 15,
};

const SeccionAsesores: React.FC = () => {
  const [fecha, setFecha] = useState<string>(hoyISO);
  const [datos, setDatos] = useState<RespuestaAsesores | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (dia: string) => {
    setCargando(true);
    setError(null);
    try {
      const { data } = await axios.get<RespuestaAsesores>(`${API}/api/metas/asesores`, {
        headers: authH(),
        params: { fecha: dia },
      });
      setDatos(data);
    } catch (err: any) {
      setDatos(null);
      setError(mensajeError(err, "No se pudo cargar la tabla de asesores."));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (fecha) cargar(fecha);
  }, [fecha, cargar]);

  const filas = datos?.asesores ?? [];

  return (
    <>
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

      {cargando && <Cargando />}

      {!cargando && datos && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={cellSx}>Módulo</TableCell>
                <TableCell sx={cellSx}>Asesor</TableCell>
                <TableCell sx={cellSx} align="right">Venta asesor</TableCell>
                <TableCell sx={cellSx} align="right">Tickets</TableCell>
                <TableCell sx={cellSx} align="right">Participantes</TableCell>
                <TableCell sx={cellSx} align="right">Venta módulo</TableCell>
                <TableCell sx={cellSx} align="center">Nivel</TableCell>
                <TableCell sx={cellSx} align="right">Bolsa módulo</TableCell>
                <TableCell sx={cellSx} align="right">Participación</TableCell>
                <TableCell sx={{ ...cellSx, ...leTocaHeadSx }} align="right">
                  Le toca
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ ...cellSx, color: GRIS, py: 3 }}>
                    Sin datos para esta fecha
                  </TableCell>
                </TableRow>
              )}
              {filas.map((f, idx) => (
                <TableRow key={`${f.modulo_id ?? f.modulo}-${f.empleado_id ?? f.asesor}-${idx}`}>
                  <TableCell sx={{ ...cellSx, fontWeight: 700 }}>{f.modulo}</TableCell>
                  <TableCell sx={cellSx}>{f.asesor}</TableCell>
                  <TableCell sx={cellSx} align="right">{dinero(f.venta_asesor)}</TableCell>
                  <TableCell sx={cellSx} align="right">{f.tickets}</TableCell>
                  <TableCell sx={cellSx} align="right">{f.n_participantes}</TableCell>
                  <TableCell sx={cellSx} align="right">{dinero(f.venta_dia)}</TableCell>
                  <TableCell
                    sx={{ ...cellSx, fontWeight: 700, color: f.nivel > 0 ? VERDE : GRIS }}
                    align="center"
                  >
                    {f.nivel}
                  </TableCell>
                  <TableCell sx={cellSx} align="right">{dinero(f.bolsa_modulo)}</TableCell>
                  <TableCell sx={cellSx} align="right">{porcentaje(f.participacion_pct)}</TableCell>
                  <TableCell sx={{ ...cellSx, ...leTocaCellSx }} align="right">
                    {dinero(f.le_toca)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
};

// ── SEMANA ───────────────────────────────────────────────────────────────────

const thPrint: React.CSSProperties = {
  border: "1px solid #000",
  padding: "4px 6px",
  fontSize: 11,
  textAlign: "left",
  background: "#eee",
};

const tdPrint: React.CSSProperties = {
  border: "1px solid #000",
  padding: "4px 6px",
  fontSize: 11,
};

const SeccionSemana: React.FC = () => {
  const [lunes, setLunes] = useState<string>("");
  const [datos, setDatos] = useState<RespuestaSemana | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [impresoEl, setImpresoEl] = useState("");

  // Sin lunes, el backend usa la semana en curso; con cualquier dia lo
  // normaliza a su lunes. El selector toma el lunes que regresa.
  const cargar = useCallback(async (dia: string | null) => {
    setCargando(true);
    setError(null);
    try {
      const { data } = await axios.get<RespuestaSemana>(`${API}/api/metas/semana`, {
        headers: authH(),
        params: dia ? { lunes: dia } : {},
      });
      setDatos(data);
      setLunes(data.lunes);
    } catch (err: any) {
      setDatos(null);
      setError(mensajeError(err, "No se pudo cargar la bolsa de la semana."));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar(null);
  }, [cargar]);

  const cambiarLunes = (valor: string) => {
    setLunes(valor);
    if (valor) cargar(valor);
  };

  const imprimir = () => {
    setImpresoEl(new Date().toLocaleString("es-MX"));
    setTimeout(() => window.print(), 300);
  };

  const filas = datos?.asesores ?? [];
  const totalPagar = filas.reduce((s, f) => s + Number(f.a_pagar ?? 0), 0);
  const pagaEl = filas.find((f) => f.paga_el)?.paga_el ?? null;

  return (
    <>
      {/* Impresion: solo se ve la hoja limpia, en tamaño carta */}
      <style>{`
        .metas-print { display: none; }
        @media print {
          @page { size: letter; margin: 1cm; }
          body * { visibility: hidden; }
          .metas-print, .metas-print * { visibility: visible; }
          .metas-print { display: block !important; position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      <Box display="flex" alignItems="center" gap={2} flexWrap="wrap" sx={{ mb: 3, mt: 1 }}>
        <TextField
          type="date"
          size="small"
          label="Semana (lunes)"
          value={lunes}
          onChange={(e) => cambiarLunes(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={imprimir}
          disabled={cargando || !datos || filas.length === 0}
        >
          Imprimir
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {cargando && <Cargando />}

      {!cargando && datos && (
        <>
          <Box display="flex" gap={2} flexWrap="wrap" sx={{ mb: 3 }}>
            <Resumen
              etiqueta="Semana"
              valor={`${fechaCorta(datos.lunes)} – ${fechaCorta(datos.domingo)}`}
            />
            <Resumen etiqueta="Paga el" valor={fechaCorta(pagaEl)} color={NARANJA} />
            <Resumen etiqueta="Total a pagar" valor={dinero(totalPagar)} color={VERDE} />
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={cellSx}>Módulo</TableCell>
                  <TableCell sx={cellSx}>Asesor</TableCell>
                  <TableCell sx={cellSx} align="right">Días trabajados</TableCell>
                  <TableCell sx={cellSx} align="right">Días con bolsa</TableCell>
                  <TableCell sx={cellSx} align="right">Días récord</TableCell>
                  <TableCell sx={cellSx} align="right">Venta semana</TableCell>
                  <TableCell sx={cellSx} align="right">A pagar</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ ...cellSx, color: GRIS, py: 3 }}>
                      Sin datos para esta semana
                    </TableCell>
                  </TableRow>
                )}
                {filas.map((f, idx) => (
                  <TableRow key={`${f.modulo_id ?? f.modulo}-${f.empleado_id ?? f.asesor}-${idx}`}>
                    <TableCell sx={{ ...cellSx, fontWeight: 700 }}>{f.modulo}</TableCell>
                    <TableCell sx={cellSx}>{f.asesor}</TableCell>
                    <TableCell sx={cellSx} align="right">{f.dias_trabajados}</TableCell>
                    <TableCell sx={cellSx} align="right">{f.dias_con_bolsa}</TableCell>
                    <TableCell sx={cellSx} align="right">{f.dias_record}</TableCell>
                    <TableCell sx={cellSx} align="right">{dinero(f.venta_semana)}</TableCell>
                    <TableCell sx={{ ...cellSx, fontWeight: 800 }} align="right">
                      {dinero(f.a_pagar)}
                    </TableCell>
                  </TableRow>
                ))}
                {filas.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ ...cellSx, fontWeight: 800 }} align="right">
                      TOTAL
                    </TableCell>
                    <TableCell sx={{ ...cellSx, fontWeight: 800, color: VERDE }} align="right">
                      {dinero(totalPagar)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Hoja para entregar en el corte */}
          {filas.length > 0 && (
            <Box className="metas-print" sx={{ color: "#000" }}>
              <Typography sx={{ fontWeight: 800, fontSize: 18 }}>ATO · Bolsa semanal</Typography>
              <Typography sx={{ fontSize: 12 }}>
                Semana del {fechaCorta(datos.lunes)} al {fechaCorta(datos.domingo)}
              </Typography>
              <Box display="flex" gap={4} sx={{ my: 1 }}>
                <Typography sx={{ fontSize: 13 }}>
                  <b>Paga el:</b> {fechaCorta(pagaEl)}
                </Typography>
                <Typography sx={{ fontSize: 13 }}>
                  <b>Total a pagar:</b> {dinero(totalPagar)}
                </Typography>
              </Box>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thPrint}>Módulo</th>
                    <th style={thPrint}>Asesor</th>
                    <th style={{ ...thPrint, textAlign: "right" }}>Días trab.</th>
                    <th style={{ ...thPrint, textAlign: "right" }}>Días c/bolsa</th>
                    <th style={{ ...thPrint, textAlign: "right" }}>Días récord</th>
                    <th style={{ ...thPrint, textAlign: "right" }}>Venta semana</th>
                    <th style={{ ...thPrint, textAlign: "right" }}>A pagar</th>
                    <th style={{ ...thPrint, width: "22%" }}>Firma</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f, idx) => (
                    <tr key={`p-${f.modulo_id ?? f.modulo}-${f.empleado_id ?? f.asesor}-${idx}`}>
                      <td style={tdPrint}>{f.modulo}</td>
                      <td style={tdPrint}>{f.asesor}</td>
                      <td style={{ ...tdPrint, textAlign: "right" }}>{f.dias_trabajados}</td>
                      <td style={{ ...tdPrint, textAlign: "right" }}>{f.dias_con_bolsa}</td>
                      <td style={{ ...tdPrint, textAlign: "right" }}>{f.dias_record}</td>
                      <td style={{ ...tdPrint, textAlign: "right" }}>{dinero(f.venta_semana)}</td>
                      <td style={{ ...tdPrint, textAlign: "right", fontWeight: 700 }}>
                        {dinero(f.a_pagar)}
                      </td>
                      <td style={{ ...tdPrint, height: 26 }} />
                    </tr>
                  ))}
                  <tr>
                    <td style={{ ...tdPrint, fontWeight: 800, textAlign: "right" }} colSpan={6}>
                      TOTAL
                    </td>
                    <td style={{ ...tdPrint, fontWeight: 800, textAlign: "right" }}>
                      {dinero(totalPagar)}
                    </td>
                    <td style={tdPrint} />
                  </tr>
                </tbody>
              </table>
              {impresoEl && (
                <Typography sx={{ mt: 1, fontSize: 10, color: "#555" }}>
                  Impreso el {impresoEl}
                </Typography>
              )}
            </Box>
          )}
        </>
      )}
    </>
  );
};

// ── PAGINA ───────────────────────────────────────────────────────────────────

const MetasPage: React.FC = () => {
  const [tab, setTab] = useState(0);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 6 }}>
      <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
        <EmojiEventsIcon sx={{ color: NARANJA, fontSize: 28 }} />
        <Typography variant="h5" fontWeight={700}>
          Metas
        </Typography>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          mb: 2,
          "& .MuiTab-root": { fontSize: 12, fontWeight: 700, minHeight: 36, padding: "6px 16px" },
          "& .Mui-selected": { color: `${NARANJA} !important` },
          "& .MuiTabs-indicator": { backgroundColor: NARANJA },
        }}
      >
        <Tab label="Hoy" />
        <Tab label="Asesores" />
        <Tab label="Semana" />
      </Tabs>

      {/* Solo se monta la seccion visible: el refresco de Hoy se detiene al salir */}
      {tab === 0 && <SeccionHoy />}
      {tab === 1 && <SeccionAsesores />}
      {tab === 2 && <SeccionSemana />}
    </Container>
  );
};

export default MetasPage;
