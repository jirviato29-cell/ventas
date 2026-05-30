import React, { useEffect, useState } from "react";
import {
  Container, TextField, Button, Typography, MenuItem,
  Table, TableHead, TableRow, TableCell, TableBody, Paper, TableContainer, Box,
  Chip, Alert, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
} from "@mui/material";
import axios from "axios";
import { Traspaso } from "../Types";
import Autocomplete from "@mui/material/Autocomplete";

const BASE = "https://ato-appservidor.onrender.com";

const TraspasosEncargado = () => {
  const [producto, setProducto]   = useState("");
  const [cantidad, setCantidad]   = useState("");
  const [destino, setDestino]     = useState("");
  const [modulos, setModulos]     = useState<string[]>([]);
  const [traspasos, setTraspasos] = useState<Traspaso[]>([]);
  const [productos, setProductos] = useState<string[]>([]);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const [confirmAprobar, setConfirmAprobar]   = useState<Traspaso | null>(null);
  const [confirmRechazar, setConfirmRechazar] = useState<Traspaso | null>(null);

  const token        = localStorage.getItem("token");
  const propioModulo = localStorage.getItem("modulo") || "";
  const config       = { headers: { Authorization: `Bearer ${token}` } };

  const cargarModulos = async () => {
    const res = await axios.get(`${BASE}/registro/modulos`, config);
    const nombres: string[] = res.data.map((m: any) => m.nombre);
    setModulos(nombres.filter((n) => n !== propioModulo));
  };

  const cargarTraspasos = async () => {
    const res = await axios.get(`${BASE}/traspasos/traspasos`, config);
    setTraspasos(res.data);
  };

  const cargarProductos = async () => {
    const res = await axios.get(
      `${BASE}/inventario/inventario/general/productos-nombres`,
      config
    );
    setProductos(res.data);
  };

  const solicitarTraspaso = async () => {
    setErrorForm(null);
    const cant = parseInt(cantidad, 10);
    if (!producto) { setErrorForm("Selecciona un producto"); return; }
    if (!cantidad || isNaN(cant) || cant <= 0) { setErrorForm("La cantidad debe ser mayor a 0"); return; }
    if (!destino) { setErrorForm("Selecciona un módulo destino"); return; }
    if (destino === propioModulo) { setErrorForm("El módulo destino debe ser diferente al tuyo"); return; }

    try {
      await axios.post(
        `${BASE}/traspasos/traspasos`,
        { producto, cantidad: cant, modulo_destino: destino },
        config
      );
      setProducto("");
      setCantidad("");
      setDestino("");
      cargarTraspasos();
    } catch (err: any) {
      setErrorForm(err.response?.data?.detail || "Error al solicitar traspaso");
    }
  };

  const actualizarEstado = async (id: number, nuevoEstado: "aprobado" | "rechazado") => {
    try {
      await axios.put(`${BASE}/traspasos/traspasos/${id}`, { estado: nuevoEstado }, config);
      cargarTraspasos();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al actualizar traspaso");
    }
  };

  const formatearFecha = (fecha: string) =>
    new Date(fecha).toLocaleString("es-MX", {
      timeZone: "America/Mexico_City",
      dateStyle: "short",
      timeStyle: "short",
    });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargarModulos(); cargarTraspasos(); cargarProductos(); }, []);

  const traspacosSalientes  = traspasos.filter((t) => t.modulo_origen === propioModulo);
  const traspasosEntrantes  = traspasos.filter(
    (t) => t.modulo_destino === propioModulo && t.estado === "pendiente",
  );
  const traspasosResueltos  = traspasos
    .filter((t) => t.modulo_destino === propioModulo && t.estado !== "pendiente")
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>Solicitar Traspaso</Typography>

      {errorForm && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorForm(null)}>
          {errorForm}
        </Alert>
      )}

      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <Autocomplete
          options={productos}
          value={producto}
          onChange={(_, v) => setProducto(v || "")}
          renderInput={(params) => <TextField {...params} label="Producto" />}
          sx={{ minWidth: 250 }}
        />
        <TextField
          label="Cantidad"
          type="number"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          inputProps={{ min: 1 }}
          sx={{ width: 120 }}
        />
        <TextField
          select
          label="Módulo Destino"
          value={destino}
          onChange={(e) => setDestino(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          {modulos.map((m) => (
            <MenuItem key={m} value={m}>{m}</MenuItem>
          ))}
        </TextField>
        <Button
          variant="contained"
          onClick={solicitarTraspaso}
          disabled={!producto || !cantidad || !destino}
        >
          Enviar
        </Button>
      </Box>

      {/* ── Mis Solicitudes (salientes: modulo_origen == propioModulo) ── */}
      <Typography variant="h6" gutterBottom>Mis Solicitudes</Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Folio</TableCell>
              <TableCell>Producto</TableCell>
              <TableCell>Cantidad</TableCell>
              <TableCell>Destino</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Fecha</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {traspacosSalientes.map((t) => (
              <TableRow key={t.id}>
                <TableCell sx={{ fontWeight: 600 }}>{t.folio ?? "—"}</TableCell>
                <TableCell>{t.producto}</TableCell>
                <TableCell>{t.cantidad}</TableCell>
                <TableCell>{t.modulo_destino}</TableCell>
                <TableCell>
                  <Chip
                    label={t.estado}
                    color={
                      t.estado === "aprobado" ? "success"
                      : t.estado === "rechazado" ? "error"
                      : "warning"
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>{formatearFecha(t.fecha)}</TableCell>
              </TableRow>
            ))}
            {traspacosSalientes.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">No hay solicitudes</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Traspasos por aprobar (entrantes pendientes: modulo_destino == propioModulo) ── */}
      {traspasosEntrantes.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Traspasos por aprobar
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Folio</TableCell>
                  <TableCell>Producto</TableCell>
                  <TableCell align="center">Cant.</TableCell>
                  <TableCell>Origen</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {traspasosEntrantes.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell sx={{ fontWeight: 600 }}>{t.folio ?? "—"}</TableCell>
                    <TableCell>{t.producto}</TableCell>
                    <TableCell align="center">{t.cantidad}</TableCell>
                    <TableCell>{t.modulo_origen}</TableCell>
                    <TableCell>{formatearFecha(t.fecha)}</TableCell>
                    <TableCell align="center">
                      <Box display="flex" gap={0.5} justifyContent="center">
                        <Button size="small" color="success" variant="contained"
                          onClick={() => setConfirmAprobar(t)}>
                          Aprobar
                        </Button>
                        <Button size="small" color="error" variant="outlined"
                          onClick={() => setConfirmRechazar(t)}>
                          Rechazar
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* ── Historial de traspasos resueltos (entrantes aprobados/rechazados) ── */}
      {traspasosResueltos.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Historial de traspasos resueltos
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Folio</TableCell>
                  <TableCell>Producto</TableCell>
                  <TableCell align="center">Cant.</TableCell>
                  <TableCell>Origen</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Fecha</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {traspasosResueltos.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell sx={{ fontWeight: 600 }}>{t.folio ?? "—"}</TableCell>
                    <TableCell>{t.producto}</TableCell>
                    <TableCell align="center">{t.cantidad}</TableCell>
                    <TableCell>{t.modulo_origen}</TableCell>
                    <TableCell>
                      <Chip
                        label={t.estado}
                        color={t.estado === "aprobado" ? "success" : "error"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatearFecha(t.fecha)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Confirmar Aprobar */}
      <Dialog open={!!confirmAprobar} onClose={() => setConfirmAprobar(null)}>
        <DialogTitle>Aprobar traspaso {confirmAprobar?.folio}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Confirmas la aprobación de <strong>{confirmAprobar?.folio}</strong>?<br />
            {confirmAprobar?.cantidad} uds. de <strong>{confirmAprobar?.producto}</strong>{" "}
            de <strong>{confirmAprobar?.modulo_origen}</strong> → <strong>{confirmAprobar?.modulo_destino}</strong>.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmAprobar(null)}>Cancelar</Button>
          <Button color="success" variant="contained" onClick={() => {
            if (confirmAprobar) actualizarEstado(confirmAprobar.id, "aprobado");
            setConfirmAprobar(null);
          }}>Aprobar</Button>
        </DialogActions>
      </Dialog>

      {/* Confirmar Rechazar */}
      <Dialog open={!!confirmRechazar} onClose={() => setConfirmRechazar(null)}>
        <DialogTitle>Rechazar traspaso {confirmRechazar?.folio}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Rechazar <strong>{confirmRechazar?.folio}</strong>?{" "}
            {confirmRechazar?.cantidad} uds. de <strong>{confirmRechazar?.producto}</strong>.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRechazar(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={() => {
            if (confirmRechazar) actualizarEstado(confirmRechazar.id, "rechazado");
            setConfirmRechazar(null);
          }}>Rechazar</Button>
        </DialogActions>
      </Dialog>

    </Container>
  );
};

export default TraspasosEncargado;
