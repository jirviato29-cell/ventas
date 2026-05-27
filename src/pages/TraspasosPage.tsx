import React, { useEffect, useState } from "react";
import {
  Container, TextField, Button, Typography, MenuItem,
  Table, TableHead, TableRow, TableCell, TableBody, Paper, TableContainer, Box,
  Chip
} from "@mui/material";
import axios from "axios";
import { Traspaso } from "../Types";
import Autocomplete from "@mui/material/Autocomplete";


const TraspasosEncargado = () => {
  const [producto, setProducto] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [destino, setDestino] = useState("");
  const [modulos, setModulos] = useState<string[]>([]);
  const [traspasos, setTraspasos] = useState<Traspaso[]>([]);
  const [productos, setProductos] = useState<string[]>([]);


  const token = localStorage.getItem("token");
  const config = {
    headers: { Authorization: `Bearer ${token}` },
  };

  const cargarModulos = async () => {
    const res = await axios.get(`https://ato-appservidor.onrender.com/registro/modulos`, config);
    setModulos(res.data.map((mod: any) => mod.nombre));
  };

  const cargarTraspasos = async () => {
    const res = await axios.get(`https://ato-appservidor.onrender.com/traspasos/traspasos`, config);
    setTraspasos(res.data);

  };
  

  const cargarProductos = async () => {
  const res = await axios.get(
    `https://ato-appservidor.onrender.com/inventario/inventario/general/productos-nombres`,
    config
  );
  setProductos(res.data); // array de strings
};


  const solicitarTraspaso = async () => {
  if (!producto || !cantidad || !destino) {
    alert("Completa todos los campos");
    return;
  }

  try {
    await axios.post(
      `https://ato-appservidor.onrender.com/traspasos/traspasos`,
      {
        producto,
        cantidad: parseInt(cantidad),
        modulo_destino: destino,
      },
      config
    );

    alert("Traspaso solicitado");
    setProducto("");
    setCantidad("");
    setDestino("");
    cargarTraspasos();
  } catch (err: any) {
    alert(err.response?.data?.detail || "Error al solicitar traspaso");
  }
};
const formatearFecha = (fecha: string) =>
  new Date(fecha).toLocaleString("es-MX", {
    timeZone: "America/Mexico_City",
    dateStyle: "short",
    timeStyle: "short",
  })


  useEffect(() => {
    cargarModulos();
    cargarTraspasos();
    cargarProductos();
  }, []);

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>Solicitar Traspaso</Typography>

      <Box display="flex" gap={2} mb={3}>
        <Autocomplete
          options={productos}
          value={producto}
          onChange={(event, newValue) => setProducto(newValue || "")}
          renderInput={(params) => (
            <TextField {...params} label="Producto" />
          )}
          sx={{ minWidth: 250 }}
        />

        <TextField
          label="Cantidad"
          type="number"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
        />
        <TextField
          select
          label="Módulo Destino"
          value={destino}
          onChange={(e) => setDestino(e.target.value)}
        >
          {modulos.map((mod) => (
            <MenuItem key={mod} value={mod}>{mod}</MenuItem>
          ))}
        </TextField>
        <Button variant="contained" onClick={solicitarTraspaso}>Enviar</Button>
      </Box>

      <Typography variant="h6" gutterBottom>Mis Solicitudes</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
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
                <TableCell>{t.producto}</TableCell>
                <TableCell>{t.cantidad}</TableCell>
                <TableCell>{t.modulo_destino}</TableCell>

                <TableCell>
                  <Chip
                    label={t.estado}
                    color={
                    t.estado === "aprobado"
                    ? "success"
                    : t.estado === "rechazado"
                    ? "error"
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
                <TableCell colSpan={5} align="center">No hay solicitudes</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default TraspasosEncargado;