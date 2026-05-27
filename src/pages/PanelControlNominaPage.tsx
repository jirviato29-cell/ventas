import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import SearchIcon from "@mui/icons-material/Search";
import axios from "axios";
import { obtenerRolDesdeToken } from "../components/Token";
import Salarios from "./Salarios";

const API = "https://ato-appservidor.onrender.com";
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` });

interface PerfilIncluido {
  id: number;
  codigo: string;
  modulo: string | null;
  sueldo: number;
}

interface GrupoNomina {
  nombre_englobado: string;
  sueldo_base_total: number;
  forma_pago: string | null;
  cuenta_clabe: string | null;
  cuenta_interbancaria: string | null;
  perfiles_incluidos: PerfilIncluido[];
}

interface FormNomina {
  sueldo_base: string;
  forma_pago: string;
  cuenta_clabe: string;
  cuenta_interbancaria: string;
}

const formVacio: FormNomina = {
  sueldo_base: "",
  forma_pago: "",
  cuenta_clabe: "",
  cuenta_interbancaria: "",
};

// ── Sección Marquesina ────────────────────────────────────────────────────────
const SeccionMarquesina: React.FC = () => {
  const [texto, setTexto] = React.useState("");
  const [guardando, setGuardando] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; texto: string } | null>(null);

  React.useEffect(() => {
    fetch(`${API}/config/marquesina`)
      .then((r) => r.json())
      .then((d) => setTexto(d.texto ?? ""))
      .catch(() => {});
  }, []);

  const guardarMq = async () => {
    setGuardando(true);
    setMsg(null);
    try {
      await axios.put(`${API}/config/marquesina`, { texto }, { headers: authH() });
      setMsg({ ok: true, texto: "Guardado correctamente" });
    } catch {
      setMsg({ ok: false, texto: "Error al guardar" });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={700} mb={2}>
        Texto de marquesina
      </Typography>
      <TextField
        multiline
        rows={5}
        fullWidth
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Escribe el mensaje que aparecerá en la marquesina..."
        sx={{ mb: 2 }}
      />
      <Button
        variant="contained"
        onClick={guardarMq}
        disabled={guardando}
        sx={{ bgcolor: "#f97316", "&:hover": { bgcolor: "#ea6b0a" }, mb: msg ? 2 : 3 }}
      >
        {guardando ? "Guardando..." : "Guardar"}
      </Button>
      {msg && (
        <Alert severity={msg.ok ? "success" : "error"} sx={{ mb: 2 }}>
          {msg.texto}
        </Alert>
      )}
      <Typography variant="subtitle2" fontWeight={700} mb={1} color="text.secondary">
        Vista previa
      </Typography>
      {texto.trim() ? (
        <Box
          sx={{
            bgcolor: "#f97316",
            height: 32,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            borderRadius: 1,
          }}
        >
          <Box
            component="span"
            sx={{
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              whiteSpace: "nowrap",
              display: "inline-block",
              animation: "marquee 35s linear infinite",
              "@keyframes marquee": {
                "0%":   { transform: "translateX(100vw)" },
                "100%": { transform: "translateX(-100%)" },
              },
            }}
          >
            {texto}
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            height: 32,
            border: "1px dashed #e2e8f0",
            borderRadius: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography fontSize={12} color="text.secondary">
            Sin texto — la franja estará oculta
          </Typography>
        </Box>
      )}
    </Box>
  );
};

const PanelControlNominaPage: React.FC = () => {
  const navigate = useNavigate();
  const rolToken = obtenerRolDesdeToken();
  const [tabActivo, setTabActivo] = useState(0);

  const [grupos, setGrupos] = useState<GrupoNomina[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [editando, setEditando] = useState<GrupoNomina | null>(null);
  const [form, setForm] = useState<FormNomina>(formVacio);
  const [guardando, setGuardando] = useState(false);
  const [msgGuardado, setMsgGuardado] = useState<{ ok: boolean; texto: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    axios
      .get<GrupoNomina[]>(`${API}/admin/nomina`, { headers: authH() })
      .then((res) =>
        setGrupos(res.data.sort((a, b) => a.nombre_englobado.localeCompare(b.nombre_englobado)))
      )
      .catch(() => setError("Error al cargar nómina. Verifica tu conexión."))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  // All hooks above — guard below
  if (rolToken !== "admin") {
    navigate("/ventas", { replace: true });
    return null;
  }

  const toggleExpand = (nombre: string) => {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(nombre)) next.delete(nombre);
      else next.add(nombre);
      return next;
    });
  };

  const abrirModal = (g: GrupoNomina) => {
    setEditando(g);
    setMsgGuardado(null);
    setForm({
      sueldo_base: g.sueldo_base_total.toFixed(2),
      forma_pago: g.forma_pago ?? "",
      cuenta_clabe: g.cuenta_clabe ?? "",
      cuenta_interbancaria: g.cuenta_interbancaria ?? "",
    });
  };

  const cerrarModal = () => {
    setEditando(null);
    setForm(formVacio);
    setMsgGuardado(null);
  };

  const guardar = async () => {
    if (!editando) return;
    setGuardando(true);
    try {
      await axios.put(
        `${API}/admin/nomina/${encodeURIComponent(editando.nombre_englobado)}`,
        {
          sueldo_base: parseFloat(form.sueldo_base) || 0,
          forma_pago: form.forma_pago || null,
          cuenta_clabe: mostrarCuentas ? (form.cuenta_clabe || null) : null,
          cuenta_interbancaria: mostrarCuentas ? (form.cuenta_interbancaria || null) : null,
        },
        { headers: authH() }
      );
      setMsgGuardado({ ok: true, texto: "Guardado correctamente." });
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      setMsgGuardado({
        ok: false,
        texto: err.response?.data?.detail || "Error al guardar.",
      });
    } finally {
      setGuardando(false);
    }
  };

  const mostrarCuentas = form.forma_pago === "BBVA" || form.forma_pago === "Banco Azteca";

  const gruposFiltrados = grupos
    .filter((g) => /^[AC]\d+/i.test(g.nombre_englobado))
    .filter((g) => g.nombre_englobado.toLowerCase().includes(busqueda.toLowerCase()));

  if (loading) {
    return (
      <Box textAlign="center" py={10}>
        <CircularProgress sx={{ color: "#f97316" }} size={48} />
        <Typography mt={2} color="text.secondary">
          Cargando nómina...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" textAlign="center" mt={6} fontSize={15}>
        {error}
      </Typography>
    );
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" fontWeight={700} mb={2}>
        Panel de Control
      </Typography>

      <Tabs
        value={tabActivo}
        onChange={(_, v) => setTabActivo(v)}
        sx={{ mb: 3, borderBottom: "1px solid #e2e8f0" }}
        TabIndicatorProps={{ sx: { bgcolor: "#f97316" } }}
      >
        <Tab label="Pago de Nómina" />
        <Tab label="Salarios" />
        <Tab label="Marquesina" />
      </Tabs>

      {tabActivo === 1 && <Salarios />}
      {tabActivo === 2 && <SeccionMarquesina />}

      {tabActivo === 0 && (
      <>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Perfiles agrupados por nombre englobado. El sueldo base se asigna al perfil principal; los
        demás quedan en $0.
      </Typography>

      {/* Buscador */}
      <TextField
        placeholder="Buscar por nombre englobado..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        size="small"
        sx={{ mb: 2, maxWidth: 380 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      <Paper elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 2, overflow: "hidden" }}>
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ tableLayout: "fixed", minWidth: 780 }}>
            <colgroup>
              <col style={{ width: "22%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "21%" }} />
              <col style={{ width: "21%" }} />
              <col style={{ width: "12%" }} />
            </colgroup>
            <TableHead>
              <TableRow sx={{ bgcolor: "#f8fafc" }}>
                {[
                  "Nombre englobado",
                  "Sueldo base",
                  "Forma de pago",
                  "Cuenta CLABE",
                  "Cuenta interbancaria",
                  "Acciones",
                ].map((h) => (
                  <TableCell
                    key={h}
                    sx={{ fontWeight: 700, color: "#f97316", fontSize: 11, py: 1 }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {gruposFiltrados.map((g) => (
                <React.Fragment key={g.nombre_englobado}>
                  <TableRow sx={{ borderTop: "1px solid #f1f5f9" }}>
                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>
                      {g.nombre_englobado}
                      {g.perfiles_incluidos.length > 1 && (
                        <Typography
                          component="span"
                          sx={{ ml: 0.75, fontSize: 10, color: "#94a3b8" }}
                        >
                          ({g.perfiles_incluidos.length} perfiles)
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      ${g.sueldo_base_total.toFixed(2)}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{g.forma_pago || "—"}</TableCell>
                    <TableCell
                      sx={{ fontSize: 11, fontFamily: "monospace", wordBreak: "break-all" }}
                    >
                      {g.cuenta_clabe || "—"}
                    </TableCell>
                    <TableCell
                      sx={{ fontSize: 11, fontFamily: "monospace", wordBreak: "break-all" }}
                    >
                      {g.cuenta_interbancaria || "—"}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <IconButton size="small" color="info" onClick={() => abrirModal(g)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => toggleExpand(g.nombre_englobado)}
                        title={`${g.perfiles_incluidos.length} perfil(es)`}
                      >
                        {expandidos.has(g.nombre_englobado) ? (
                          <ExpandLessIcon fontSize="small" />
                        ) : (
                          <ExpandMoreIcon fontSize="small" />
                        )}
                      </IconButton>
                    </TableCell>
                  </TableRow>

                  {/* Fila expandible con perfiles */}
                  <TableRow>
                    <TableCell colSpan={6} sx={{ p: 0, border: "none" }}>
                      <Collapse in={expandidos.has(g.nombre_englobado)} unmountOnExit>
                        <Box
                          sx={{
                            bgcolor: "#f8fafc",
                            px: 4,
                            py: 1.5,
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          <Typography
                            variant="caption"
                            fontWeight={700}
                            color="text.secondary"
                            display="block"
                            mb={0.75}
                          >
                            Perfiles incluidos:
                          </Typography>
                          {g.perfiles_incluidos.map((p) => (
                            <Box
                              key={p.id}
                              sx={{ display: "flex", gap: 3, py: 0.3, alignItems: "center" }}
                            >
                              <Typography
                                variant="caption"
                                fontWeight={600}
                                sx={{ minWidth: 160, fontFamily: "monospace" }}
                              >
                                {p.codigo}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ minWidth: 60 }}
                              >
                                {p.modulo || "—"}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: p.sueldo > 0 ? "#16a34a" : "#94a3b8" }}
                              >
                                ${p.sueldo.toFixed(2)}
                              </Typography>
                              {p.sueldo > 0 && (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    bgcolor: "#dcfce7",
                                    color: "#15803d",
                                    px: 0.75,
                                    py: 0.1,
                                    borderRadius: 0.5,
                                    fontSize: 9,
                                    fontWeight: 700,
                                  }}
                                >
                                  PRINCIPAL
                                </Typography>
                              )}
                            </Box>
                          ))}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}

              {gruposFiltrados.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    sx={{ textAlign: "center", color: "#94a3b8", py: 4, fontSize: 13 }}
                  >
                    {busqueda ? "Sin resultados para esa búsqueda" : "Sin datos de nómina"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      {/* Modal de edición */}
      <Dialog open={editando !== null} onClose={cerrarModal} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 15 }}>
          Editar nómina — {editando?.nombre_englobado}
        </DialogTitle>
        <DialogContent dividers>
          {msgGuardado && (
            <Typography
              fontSize={13}
              mb={1.5}
              color={msgGuardado.ok ? "success.main" : "error"}
            >
              {msgGuardado.texto}
            </Typography>
          )}

          <TextField
            label="Sueldo base"
            type="number"
            value={form.sueldo_base}
            onChange={(e) => setForm((f) => ({ ...f, sueldo_base: e.target.value }))}
            fullWidth
            margin="normal"
            size="small"
            inputProps={{ min: 0, step: 0.01 }}
            helperText="Se asigna al perfil principal. Los demás perfiles del grupo quedan en $0."
          />

          <TextField
            select
            label="Forma de pago"
            value={form.forma_pago}
            onChange={(e) => setForm((f) => ({ ...f, forma_pago: e.target.value }))}
            fullWidth
            margin="normal"
            size="small"
          >
            <MenuItem value="">(Sin forma de pago)</MenuItem>
            <MenuItem value="BBVA">BBVA</MenuItem>
            <MenuItem value="Banco Azteca">Banco Azteca</MenuItem>
            <MenuItem value="Kids">Kids</MenuItem>
          </TextField>

          {mostrarCuentas && (
            <>
              <TextField
                label="CLABE (18-20 caracteres)"
                value={form.cuenta_clabe}
                onChange={(e) => setForm((f) => ({ ...f, cuenta_clabe: e.target.value }))}
                fullWidth
                margin="normal"
                size="small"
                inputProps={{ maxLength: 20 }}
              />
              <TextField
                label="Cuenta interbancaria"
                value={form.cuenta_interbancaria}
                onChange={(e) => setForm((f) => ({ ...f, cuenta_interbancaria: e.target.value }))}
                fullWidth
                margin="normal"
                size="small"
                inputProps={{ maxLength: 20 }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={cerrarModal} color="inherit" disabled={guardando}>
            Cancelar
          </Button>
          <Button
            onClick={guardar}
            variant="contained"
            disabled={guardando}
            sx={{ bgcolor: "#f97316", "&:hover": { bgcolor: "#ea6b0a" } }}
          >
            {guardando ? "Guardando..." : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>
      </>
      )}
    </Box>
  );
};

export default PanelControlNominaPage;
