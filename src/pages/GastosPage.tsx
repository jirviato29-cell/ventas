import React, { useEffect, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, Collapse,
  Container, Dialog, DialogActions, DialogContent, DialogContentText,
  DialogTitle, Divider, FormControl, Grid, IconButton, InputLabel,
  List, ListItem, ListItemText, MenuItem, Select, Stack, TextField,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PaymentsIcon from "@mui/icons-material/Payments";
import AddCardIcon from "@mui/icons-material/AddCard";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { Navigate } from "react-router-dom";
import axios from "axios";
import { obtenerRolDesdeToken } from "../components/Token";

const BASE = "https://ato-appservidor-nvxt.onrender.com";
const CLAVE_ACCESO = "12022907";

type TipoGasto = "personal" | "iglesia" | "prestamos";

const TIPOS: { value: TipoGasto; label: string }[] = [
  { value: "personal", label: "Personal" },
  { value: "iglesia", label: "Iglesia" },
  { value: "prestamos", label: "Préstamos" },
];

interface Abono {
  id: number;
  monto: number;
  fecha: string | null;
  nota: string | null;
}

interface GastoPendiente {
  id: number;
  concepto: string;
  monto: number;
  total_abonado: number;
  saldo: number;
  abonos: Abono[];
  fecha_registro: string | null;
}

interface GastoPagado {
  id: number;
  concepto: string;
  monto: number;
  fecha_registro: string | null;
  fecha_pago: string | null;
}

interface GrupoGastos {
  pendientes: GastoPendiente[];
  pagados: GastoPagado[];
  total_pendiente: number;
}

interface GastosData {
  personal: GrupoGastos;
  iglesia: GrupoGastos;
  prestamos: GrupoGastos;
  total_general_pendiente: number;
}

const GRUPO_VACIO: GrupoGastos = { pendientes: [], pagados: [], total_pendiente: 0 };
const DATA_VACIA: GastosData = {
  personal: GRUPO_VACIO,
  iglesia: GRUPO_VACIO,
  prestamos: GRUPO_VACIO,
  total_general_pendiente: 0,
};

const fmtMXN = (n: number): string =>
  (n ?? 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

const fmtFecha = (f: string | null): string => {
  if (!f) return "-";
  const d = new Date(f);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("es-MX");
};

const GastosPage: React.FC = () => {
  const rol = obtenerRolDesdeToken();
  const token = localStorage.getItem("token");
  const config = { headers: { Authorization: `Bearer ${token}` } };

  // ── Estado del candado ──────────────────────────────────────────────────
  const [desbloqueado, setDesbloqueado] = useState(false);
  const [claveInput, setClaveInput] = useState("");
  const [claveError, setClaveError] = useState<string | null>(null);

  // ── Estado de datos ─────────────────────────────────────────────────────
  const [data, setData] = useState<GastosData>(DATA_VACIA);
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Formulario de registro / edición ────────────────────────────────────
  const [tipo, setTipo] = useState<TipoGasto>("personal");
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);

  // ── Abono inline ────────────────────────────────────────────────────────
  const [abonoGastoId, setAbonoGastoId] = useState<number | null>(null);
  const [abonoMonto, setAbonoMonto] = useState("");
  const [abonoNota, setAbonoNota] = useState("");

  // ── Colapsables de "Pagados" por tipo ───────────────────────────────────
  const [pagadosAbiertos, setPagadosAbiertos] = useState<Record<TipoGasto, boolean>>({
    personal: false,
    iglesia: false,
    prestamos: false,
  });

  // ── Confirmación de eliminación ─────────────────────────────────────────
  const [gastoAEliminar, setGastoAEliminar] = useState<GastoPendiente | null>(null);

  const cargar = async () => {
    setCargando(true);
    setErrorMsg(null);
    try {
      const res = await axios.get<GastosData>(`${BASE}/gastos`, config);
      setData(res.data);
    } catch {
      setErrorMsg("No se pudieron cargar los gastos.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (desbloqueado) cargar();
  }, [desbloqueado]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────
  const validarClave = () => {
    if (claveInput === CLAVE_ACCESO) {
      setDesbloqueado(true);
      setClaveError(null);
    } else {
      setClaveError("Clave incorrecta");
    }
  };

  const limpiarForm = () => {
    setTipo("personal");
    setConcepto("");
    setMonto("");
    setEditId(null);
  };

  const guardarGasto = async () => {
    const montoNum = Number(monto);
    if (!concepto.trim()) {
      setErrorMsg("El concepto es obligatorio.");
      return;
    }
    if (!montoNum || montoNum <= 0) {
      setErrorMsg("El monto debe ser mayor a 0.");
      return;
    }
    setGuardando(true);
    setErrorMsg(null);
    try {
      const body = { tipo, concepto: concepto.trim(), monto: montoNum };
      if (editId !== null) {
        await axios.put(`${BASE}/gastos/${editId}`, body, config);
      } else {
        await axios.post(`${BASE}/gastos`, body, config);
      }
      limpiarForm();
      await cargar();
    } catch {
      setErrorMsg("No se pudo guardar el gasto.");
    } finally {
      setGuardando(false);
    }
  };

  const iniciarEdicion = (g: GastoPendiente, t: TipoGasto) => {
    setEditId(g.id);
    setTipo(t);
    setConcepto(g.concepto);
    setMonto(String(g.monto));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pagarGasto = async (id: number) => {
    try {
      await axios.post(`${BASE}/gastos/${id}/pagar`, {}, config);
      await cargar();
    } catch {
      setErrorMsg("No se pudo marcar como pagado.");
    }
  };

  const abrirAbono = (id: number) => {
    setAbonoGastoId(id);
    setAbonoMonto("");
    setAbonoNota("");
  };

  const guardarAbono = async (id: number) => {
    const montoNum = Number(abonoMonto);
    if (!montoNum || montoNum <= 0) {
      setErrorMsg("El monto del abono debe ser mayor a 0.");
      return;
    }
    try {
      await axios.post(
        `${BASE}/gastos/${id}/abonos`,
        { monto: montoNum, nota: abonoNota.trim() || undefined },
        config
      );
      setAbonoGastoId(null);
      setAbonoMonto("");
      setAbonoNota("");
      await cargar();
    } catch {
      setErrorMsg("No se pudo registrar el abono.");
    }
  };

  const eliminarGasto = async () => {
    if (!gastoAEliminar) return;
    try {
      await axios.delete(`${BASE}/gastos/${gastoAEliminar.id}`, config);
      setGastoAEliminar(null);
      await cargar();
    } catch {
      setErrorMsg("No se pudo eliminar el gasto.");
      setGastoAEliminar(null);
    }
  };

  // ── Render: protección por rol (después de todos los hooks) ───────────────
  if (rol !== "admin") return <Navigate to="/" replace />;

  // ── Render: candado de clave ──────────────────────────────────────────────
  if (!desbloqueado) {
    return (
      <Box
        sx={{
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 2,
        }}
      >
        <Card sx={{ maxWidth: 360, width: "100%" }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, textAlign: "center" }}>
              🔒 Acceso a Gastos
            </Typography>
            <Stack spacing={2}>
              <TextField
                type="password"
                label="Clave"
                value={claveInput}
                onChange={(e) => setClaveInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") validarClave();
                }}
                error={Boolean(claveError)}
                helperText={claveError ?? " "}
                fullWidth
                autoFocus
              />
              <Button variant="contained" onClick={validarClave} fullWidth>
                Entrar
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // ── Render: contenido desbloqueado ────────────────────────────────────────
  const grupos: { tipo: TipoGasto; label: string; grupo: GrupoGastos }[] = [
    { tipo: "personal", label: "Personal", grupo: data.personal },
    { tipo: "iglesia", label: "Iglesia", grupo: data.iglesia },
    { tipo: "prestamos", label: "Préstamos", grupo: data.prestamos },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 3, px: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, color: "#1e293b", mb: 3 }}>
        Gastos
      </Typography>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      {/* ── Resumen ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {grupos.map(({ tipo: t, label, grupo }) => (
          <Grid item xs={12} sm={6} md={3} key={t}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  {label}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {fmtMXN(grupo.total_pendiente)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  pendiente
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%", bgcolor: "#1e293b", color: "#fff" }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ color: "#cbd5e1" }}>
                Gran Total
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {fmtMXN(data.total_general_pendiente)}
              </Typography>
              <Typography variant="caption" sx={{ color: "#cbd5e1" }}>
                pendiente general
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Formulario ── */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
            {editId !== null ? "Editar gasto" : "Registrar gasto"}
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel id="tipo-label">Tipo</InputLabel>
                <Select
                  labelId="tipo-label"
                  label="Tipo"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoGasto)}
                >
                  {TIPOS.map((t) => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Concepto"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                label="Monto"
                type="number"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  onClick={guardarGasto}
                  disabled={guardando}
                  fullWidth
                >
                  {editId !== null ? "Guardar" : "Registrar"}
                </Button>
                {editId !== null && (
                  <Button variant="outlined" onClick={limpiarForm} disabled={guardando}>
                    Cancelar
                  </Button>
                )}
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ── Loading ── */}
      {cargando ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        grupos.map(({ tipo: t, label, grupo }) => (
          <Card key={t} sx={{ mb: 3 }}>
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 1 }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {label}
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Total: {fmtMXN(grupo.total_pendiente)}
                </Typography>
              </Stack>
              <Divider sx={{ mb: 2 }} />

              {grupo.pendientes.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Sin gastos pendientes.
                </Typography>
              ) : (
                <Stack spacing={2}>
                  {grupo.pendientes.map((g) => (
                    <Card key={g.id} variant="outlined">
                      <CardContent>
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          justifyContent="space-between"
                          spacing={1}
                        >
                          <Box>
                            <Typography sx={{ fontWeight: 700 }}>{g.concepto}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Monto: {fmtMXN(g.monto)} · Abonado: {fmtMXN(g.total_abonado)} ·{" "}
                              <strong>Saldo: {fmtMXN(g.saldo)}</strong>
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Registrado: {fmtFecha(g.fecha_registro)}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1} alignItems="flex-start">
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={<PaymentsIcon />}
                              onClick={() => pagarGasto(g.id)}
                            >
                              Ya se pagó
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<AddCardIcon />}
                              onClick={() => abrirAbono(g.id)}
                            >
                              Abono
                            </Button>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => iniciarEdicion(g, t)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setGastoAEliminar(g)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </Stack>

                        {g.abonos.length > 0 && (
                          <List dense sx={{ mt: 1, bgcolor: "#f8fafc", borderRadius: 1 }}>
                            {g.abonos.map((a) => (
                              <ListItem key={a.id} sx={{ py: 0 }}>
                                <ListItemText
                                  primary={`${fmtMXN(a.monto)} — ${fmtFecha(a.fecha)}`}
                                  secondary={a.nota || undefined}
                                />
                              </ListItem>
                            ))}
                          </List>
                        )}

                        {abonoGastoId === g.id && (
                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1}
                            sx={{ mt: 2 }}
                            alignItems="center"
                          >
                            <TextField
                              size="small"
                              label="Monto abono"
                              type="number"
                              value={abonoMonto}
                              onChange={(e) => setAbonoMonto(e.target.value)}
                            />
                            <TextField
                              size="small"
                              label="Nota (opcional)"
                              value={abonoNota}
                              onChange={(e) => setAbonoNota(e.target.value)}
                            />
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => guardarAbono(g.id)}
                            >
                              Guardar abono
                            </Button>
                            <Button size="small" onClick={() => setAbonoGastoId(null)}>
                              Cancelar
                            </Button>
                          </Stack>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}

              {/* ── Pagados (colapsable) ── */}
              <Box sx={{ mt: 2 }}>
                <Button
                  size="small"
                  onClick={() =>
                    setPagadosAbiertos((prev) => ({ ...prev, [t]: !prev[t] }))
                  }
                  endIcon={pagadosAbiertos[t] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                >
                  Pagados ({grupo.pagados.length})
                </Button>
                <Collapse in={pagadosAbiertos[t]} timeout="auto" unmountOnExit>
                  {grupo.pagados.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Sin gastos pagados.
                    </Typography>
                  ) : (
                    <List dense>
                      {grupo.pagados.map((p) => (
                        <ListItem key={p.id} sx={{ py: 0 }}>
                          <ListItemText
                            primary={`${p.concepto} — ${fmtMXN(p.monto)}`}
                            secondary={`Pagado: ${fmtFecha(p.fecha_pago)}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Collapse>
              </Box>
            </CardContent>
          </Card>
        ))
      )}

      {/* ── Confirmación de eliminación ── */}
      <Dialog open={Boolean(gastoAEliminar)} onClose={() => setGastoAEliminar(null)}>
        <DialogTitle>Eliminar gasto</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Seguro que deseas eliminar "{gastoAEliminar?.concepto}"? Esta acción no se
            puede deshacer y se eliminarán también sus abonos.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGastoAEliminar(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={eliminarGasto}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default GastosPage;
