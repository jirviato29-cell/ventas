import React, { useEffect, useState } from "react";
import {
  Box, Typography, TextField, Button, Paper, Alert, Table, TableHead,
  TableRow, TableCell, TableBody, Divider
} from "@mui/material";
import Grid from "@mui/material/Grid";
import axios from "axios";

export const InventarioTelefonosGeneral = () => {
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [precio, setPrecio] = useState("");
  const [mensaje, setMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);
  const [telefonos, setTelefonos] = useState<any[]>([]);

  const token = localStorage.getItem("token");
  const config = {
    headers: { Authorization: `Bearer ${token}` },
  };

  const cargarInventario = async () => {
    try {
      const res = await axios.get(`https://ato-appservidor-nvxt.onrender.com/inventario_telefonos/general`, config);
      setTelefonos(res.data);
    } catch (err) {
      console.error("Error al cargar inventario", err);
    }
  };

  const crearTelefono = async () => {
    try {
      await axios.post(`https://ato-appservidor-nvxt.onrender.com/inventario_telefonos/general`, {
        marca,
        modelo,
        cantidad: parseInt(cantidad),
        precio: parseFloat(precio),
      }, config);

      setMensaje({ tipo: "success", texto: "Teléfono agregado correctamente" });
      setMarca("");
      setModelo("");
      setCantidad("");
      setPrecio("");
      cargarInventario();
    } catch (err: any) {
      setMensaje({
        tipo: "error",
        texto: err?.response?.data?.detail || "Error al guardar",
      });
    }
  };

  useEffect(() => {
    cargarInventario();
  }, []);

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5" gutterBottom>📱 Inventario General de Teléfonos</Typography>
      <Paper sx={{ p: 3, mb: 4 }}>
        {mensaje && <Alert severity={mensaje.tipo}>{mensaje.texto}</Alert>}
        <Grid container spacing={2}>
          <Grid item xs={6}><TextField fullWidth label="Marca" value={marca} onChange={(e) => setMarca(e.target.value)} /></Grid>
          <Grid item xs={6}><TextField fullWidth label="Modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} /></Grid>
          <Grid item xs={6}><TextField fullWidth type="number" label="Cantidad" value={cantidad} onChange={(e) => setCantidad(e.target.value)} /></Grid>
          <Grid item xs={6}><TextField fullWidth type="number" label="Precio" value={precio} onChange={(e) => setPrecio(e.target.value)} /></Grid>
          <Grid item xs={12}><Button fullWidth variant="contained" onClick={crearTelefono}>Agregar Teléfono</Button></Grid>
        </Grid>
      </Paper>

      <Typography variant="h6">📋 Lista de Teléfonos</Typography>
      <Divider sx={{ my: 1 }} />
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Marca</TableCell>
            <TableCell>Modelo</TableCell>
            <TableCell>Cantidad</TableCell>
            <TableCell>Precio</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {telefonos.map((t) => (
            <TableRow key={t.id}>
              <TableCell>{t.marca}</TableCell>
              <TableCell>{t.modelo}</TableCell>
              <TableCell>{t.cantidad}</TableCell>
              <TableCell>${t.precio.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};

export default InventarioTelefonosGeneral;
