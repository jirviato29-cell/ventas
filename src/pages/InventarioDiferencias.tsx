import React, { useEffect, useState } from "react";
import {
  Container, Typography, Table, TableHead, TableRow, TableCell,
  TableBody, Paper, TableContainer, Button
} from "@mui/material";
import axios from "axios";
import { Diferencia } from "../Types";

const DiferenciasInventario = () => {
  const [diferencias, setDiferencias] = useState<Diferencia[]>([]);
  const token = localStorage.getItem("token");
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const cargarDiferencias = async () => {
    try {
      const res = await axios.get(
        `https://ato-appservidor.onrender.com/inventario/reportes/diferencias`,
        config
      );
      setDiferencias(res.data);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al cargar diferencias");
    }
  };

  useEffect(() => {
    cargarDiferencias();
  }, []);

  // Subir un solo Excel
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post(
        `https://ato-appservidor.onrender.com/inventario/fisico/upload`,
        formData,
        {
          headers: {
            ...config.headers,
            "Content-Type": "multipart/form-data"
          }
        }
      );

      alert("Inventario físico cargado correctamente");
      cargarDiferencias();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al subir archivo");
    }
  };

  // Una sola tabla
  const renderTabla = (datos: Diferencia[]) => (
    <TableContainer component={Paper} sx={{ mt: 3 }}>
      <Typography variant="h6" sx={{ m: 2 }}>
        Diferencias de Inventario
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Producto</TableCell>
            <TableCell>Clave</TableCell>
            <TableCell>Tipo</TableCell>
            <TableCell>En Sistema</TableCell>
            <TableCell>Físico</TableCell>
            <TableCell>Diferencia</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {datos.map((item, i) => (
            <TableRow key={i}>
              <TableCell>{item.producto}</TableCell>
              <TableCell>{item.clave}</TableCell>
              <TableCell>{item.tipo}</TableCell>
              <TableCell>{item.sistema}</TableCell>
              <TableCell>{item.fisico}</TableCell>
              <TableCell
                style={{
                  color:
                    item.diferencia === 0
                      ? "black"
                      : item.diferencia > 0
                      ? "green"
                      : "red",
                  fontWeight: "bold"
                }}
              >
                {item.diferencia}
              </TableCell>
            </TableRow>
          ))}
          {datos.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} align="center">
                Sin diferencias
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Reporte de Diferencias
      </Typography>

      <Button variant="contained" onClick={cargarDiferencias} sx={{ mb: 2, mr: 2 }}>
        Refrescar
      </Button>

      {/* Subir inventario físico (unificado) */}
      <Button variant="outlined" component="label" sx={{ mb: 2 }}>
        Subir Excel Inventario
        <input type="file" hidden onChange={handleUpload} />
      </Button>

      {renderTabla(diferencias)}
    </Container>
  );
};

export default DiferenciasInventario;