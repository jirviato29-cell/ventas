import React, { useEffect, useState } from "react";
import {
  Container, TextField, Button, Typography, MenuItem,
  Table, TableHead, TableRow, TableCell, TableBody, Paper, TableContainer, Box,
  Chip, Alert,
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

  const token        = localStorage.getItem("token");
  const propioModulo = localStorage.getItem("modulo") || "";
  const config       = { headers: { Authorization: `Bearer ${token}` } };

  const cargarModulos = async () => {
    const res = await axios.get(`${BASE}/registro/modulos`, config);
    // C2: filtrar el propio módulo del encargado
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

    // C3 — validar cantidad > 0
    const cant = parseInt(cantidad, 10);
    if (!producto) { setErrorForm("Selecciona un producto"); return; }
    if (!cantidad || isNaN(cant) || cant <= 0) { setErrorForm("La cantidad debe ser mayor a 0"); return; }
    if (!destino) { setErrorForm("Selecciona un módulo destino"); return; }
    // C2 — mismo módulo (también validado en backend, pero mostramos error claro aquí)
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

  const formatearFecha = (fecha: string) =>
    new Date(fecha).toLocaleString("es-MX", {
      timeZone: "America/Mexico_City",
      dateStyle: "short",
      timeStyle: "short",
    });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargarModulos(); cargarTraspasos(); cargarProductos(); }, []);

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
            {traspasos.map((t) => (
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
            {traspasos.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">No hay solicitudes</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default TraspasosEncargado;
