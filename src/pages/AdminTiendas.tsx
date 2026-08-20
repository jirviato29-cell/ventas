import React, { useEffect, useState } from "react";
import {
  Box, Button, Container, Paper, Typography, Alert, Chip,
  Table, TableContainer, TableHead, TableRow, TableCell, TableBody, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress,
  Divider,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import AddIcon from "@mui/icons-material/Add";
import axios from "axios";

const API = "https://ato-appservidor-nvxt.onrender.com";

type Tienda = {
  id: number; nombre: string; activo: boolean;
  cadena_id: number | null; num_tienda: number | null;
  cadena?: { id: number; codigo: string; nombre: string } | null;
};

type Clave = {
  id: number; tienda_id: number; clave: string; en_uso: boolean;
  usuario: string | null; password: string | null;
};

const AdminTiendas: React.FC = () => {
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);

  // Diálogo crear/editar
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Tienda | null>(null);
  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Claves por tienda (chips)
  const [claves, setClaves] = useState<Clave[]>([]);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Edición de claves dentro del modal de tienda
  const [clavesEdit, setClavesEdit] = useState<Record<number, string>>({});
  const [nuevaClave, setNuevaClave] = useState("");
  const [guardandoClave, setGuardandoClave] = useState(false);
  const [errorClave, setErrorClave] = useState<string | null>(null);

  const token = localStorage.getItem("token");
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const cargar = async () => {
    setCargando(true);
    try {
      const [resTiendas, resClaves] = await Promise.all([
        axios.get(`${API}/registro/tiendas?incluir_inactivas=true`, config),
        axios.get(`${API}/registro/claves`, config),
      ]);
      setTiendas(resTiendas.data);
      setClaves(resClaves.data);
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudieron cargar las tiendas" });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const abrirNueva = () => {
    setEditando(null);
    setNombre("");
    setMensaje(null);
    setDialogOpen(true);
  };

  const abrirEditar = (t: Tienda) => {
    setEditando(t);
    setNombre(t.nombre);
    setMensaje(null);
    const suyas = claves.filter((c) => c.tienda_id === t.id);
    setClavesEdit(Object.fromEntries(suyas.map((c) => [c.id, c.clave])));
    setNuevaClave("");
    setErrorClave(null);
    setDialogOpen(true);
  };

  const guardar = async () => {
    const nom = nombre.trim();
    if (!nom) {
      setMensaje({ tipo: "error", texto: "Escribe el nombre de la tienda" });
      return;
    }
    setGuardando(true);
    try {
      if (editando) {
        await axios.put(`${API}/registro/tiendas/${editando.id}`, { nombre: nom }, config);

        // Solo las claves cuyo texto cambió respecto al valor original.
        const cambiadas = Object.entries(clavesEdit).filter(([id, valor]) => {
          const original = claves.find((c) => c.id === Number(id));
          return !!original && !!valor.trim() && valor.trim() !== original.clave;
        });

        const actualizadas: Clave[] = [];
        let falloClave: string | null = null;
        for (const [id, valor] of cambiadas) {
          try {
            const res = await axios.put(
              `${API}/registro/claves/${Number(id)}`,
              { clave: valor.trim() },
              config
            );
            actualizadas.push(res.data);
          } catch (err: any) {
            falloClave = err?.response?.data?.detail ?? "No se pudo guardar la clave";
            break;
          }
        }

        if (actualizadas.length > 0) {
          setClaves((prev) => prev.map((c) => actualizadas.find((a) => a.id === c.id) ?? c));
        }
        if (falloClave) {
          setErrorClave(falloClave);
          return; // deja el modal abierto para corregir
        }

        setMensaje({ tipo: "success", texto: "Tienda actualizada" });
      } else {
        await axios.post(`${API}/registro/tiendas`, { nombre: nom }, config);
        setMensaje({ tipo: "success", texto: "Tienda creada" });
      }
      setDialogOpen(false);
      await cargar();
    } catch (err: any) {
      setMensaje({ tipo: "error", texto: err?.response?.data?.detail || "No se pudo guardar" });
    } finally {
      setGuardando(false);
    }
  };

  const clavesDe = (tiendaId: number) => claves.filter((c) => c.tienda_id === tiendaId);

  const agregarClave = async () => {
    if (!editando || !nuevaClave.trim()) return;
    setGuardandoClave(true);
    setErrorClave(null);
    try {
      const res = await axios.post(
        `${API}/registro/tiendas/${editando.id}/claves`,
        { tienda_id: editando.id, clave: nuevaClave.trim() },
        config
      );
      setClaves((prev) => [...prev, res.data]);
      setClavesEdit((prev) => ({ ...prev, [res.data.id]: res.data.clave }));
      setNuevaClave("");
    } catch (e: any) {
      setErrorClave(e?.response?.data?.detail ?? "No se pudo agregar la clave");
    } finally {
      setGuardandoClave(false);
    }
  };

  const toggleClave = async (c: Clave) => {
    setTogglingId(c.id);
    try {
      const res = await axios.patch(`${API}/registro/claves/${c.id}/uso`, {}, config);
      setClaves((prev) => prev.map((x) => (x.id === c.id ? { ...x, en_uso: res.data.en_uso } : x)));
    } catch (e) {
      console.error("Error al cambiar uso de clave", e);
    } finally {
      setTogglingId(null);
    }
  };

  const alternarActivo = async (t: Tienda) => {
    try {
      await axios.put(`${API}/registro/tiendas/${t.id}`, { activo: !t.activo }, config);
      await cargar();
    } catch (err: any) {
      setMensaje({ tipo: "error", texto: err?.response?.data?.detail || "No se pudo actualizar" });
    }
  };

  return (
    <Container sx={{ mt: 4, mb: 6 }}>
      <Paper sx={{ p: { xs: 2, sm: 4 }, maxWidth: 1100, mx: "auto" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 1 }}>
          <Typography variant="h5">Tiendas (Cadenas)</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={abrirNueva}>
            Nueva tienda
          </Button>
        </Box>

        {mensaje && <Alert severity={mensaje.tipo} sx={{ mb: 2 }}>{mensaje.texto}</Alert>}

        {cargando ? (
          <Box sx={{ textAlign: "center", py: 4 }}><CircularProgress /></Box>
        ) : tiendas.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
            Aún no hay tiendas. Crea la primera con “Nueva tienda”.
          </Typography>
        ) : (
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Cadena</TableCell>
                  <TableCell align="center">N°</TableCell>
                  <TableCell>Claves</TableCell>
                  <TableCell align="center">Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tiendas.map((t) => (
                  <TableRow key={t.id} sx={{ opacity: t.activo ? 1 : 0.55 }}>
                    <TableCell sx={{ fontWeight: 600 }}>{t.nombre}</TableCell>
                    <TableCell>{t.cadena?.codigo ?? "—"}</TableCell>
                    <TableCell align="center">{t.num_tienda ?? "—"}</TableCell>
                    <TableCell>
                      {clavesDe(t.id).length === 0 ? (
                        <Typography variant="caption" color="text.secondary">sin claves</Typography>
                      ) : (
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                          {clavesDe(t.id).map((c) => (
                            <Chip
                              key={c.id}
                              label={c.clave}
                              size="small"
                              onClick={() => toggleClave(c)}
                              sx={{
                                cursor: "pointer",
                                opacity: togglingId === c.id ? 0.5 : 1,
                                pointerEvents: togglingId === c.id ? "none" : "auto",
                                ...(c.en_uso
                                  ? { bgcolor: "#2e7d32", color: "#fff", fontWeight: 700, "&:hover": { bgcolor: "#2e7d32" } }
                                  : { bgcolor: "#e0e0e0", color: "#757575", "&:hover": { bgcolor: "#e0e0e0" } }),
                              }}
                            />
                          ))}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={t.activo ? "Activa" : "Inactiva"}
                        size="small"
                        color={t.activo ? "success" : "default"}
                        variant={t.activo ? "filled" : "outlined"}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Renombrar">
                        <IconButton size="small" onClick={() => abrirEditar(t)}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title={t.activo ? "Desactivar" : "Activar"}>
                        <IconButton size="small" onClick={() => alternarActivo(t)} color={t.activo ? "warning" : "success"}>
                          {t.activo ? <ToggleOnIcon /> : <ToggleOffIcon />}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editando ? "Editar tienda" : "Nueva tienda"}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Nombre de la tienda"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") guardar(); }}
            fullWidth
            margin="dense"
          />

          {editando && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Claves</Typography>

              {clavesDe(editando.id).length === 0 ? (
                <Typography variant="caption" color="text.secondary">
                  Esta tienda no tiene claves.
                </Typography>
              ) : (
                clavesDe(editando.id).map((c) => (
                  <Box key={c.id} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <TextField
                      size="small"
                      fullWidth
                      value={clavesEdit[c.id] ?? ""}
                      onChange={(e) =>
                        setClavesEdit((prev) => ({ ...prev, [c.id]: e.target.value }))
                      }
                    />
                    <Chip
                      size="small"
                      label={c.en_uso ? "En uso" : "Libre"}
                      sx={
                        c.en_uso
                          ? { bgcolor: "#2e7d32", color: "#fff", fontWeight: 700 }
                          : { bgcolor: "#e0e0e0", color: "#757575" }
                      }
                    />
                  </Box>
                ))
              )}

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Agregar clave</Typography>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  value={nuevaClave}
                  onChange={(e) => setNuevaClave(e.target.value)}
                  placeholder="Ej. WAUCCC024"
                />
                <Button
                  variant="outlined"
                  onClick={agregarClave}
                  disabled={!nuevaClave.trim() || guardandoClave}
                >
                  Agregar
                </Button>
              </Box>

              {errorClave && (
                <Typography variant="caption" sx={{ color: "#c62828", display: "block", mt: 1 }}>
                  {errorClave}
                </Typography>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminTiendas;
