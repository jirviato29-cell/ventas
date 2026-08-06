import React, { useEffect, useState } from "react";
import {
  Box, Button, Container, Paper, Typography, Alert, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import AddIcon from "@mui/icons-material/Add";
import axios from "axios";

const API = "https://ato-appservidor-nvxt.onrender.com";

type Tienda = { id: number; nombre: string; activo: boolean };

const AdminTiendas: React.FC = () => {
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);

  // Diálogo crear/editar
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Tienda | null>(null);
  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);

  const token = localStorage.getItem("token");
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const cargar = async () => {
    setCargando(true);
    try {
      const res = await axios.get(`${API}/registro/tiendas?incluir_inactivas=true`, config);
      setTiendas(res.data);
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
      <Paper sx={{ p: { xs: 2, sm: 4 }, maxWidth: 720, mx: "auto" }}>
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
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell align="center">Estado</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tiendas.map((t) => (
                <TableRow key={t.id} sx={{ opacity: t.activo ? 1 : 0.55 }}>
                  <TableCell sx={{ fontWeight: 600 }}>{t.nombre}</TableCell>
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
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editando ? "Renombrar tienda" : "Nueva tienda"}</DialogTitle>
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
