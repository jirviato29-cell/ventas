import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Container, Typography, TextField, Button, Select, MenuItem,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Paper,
} from "@mui/material";
import axios from "axios";

const BASE = "https://ato-appservidor-nvxt.onrender.com";

const EquiposTelcel = () => {
  const [subiendo, setSubiendo] = useState(false);

  const [equipos, setEquipos] = useState<any[]>([]);
  const [fEstatus, setFEstatus] = useState("");
  const [fProducto, setFProducto] = useState("");
  const [fInicio, setFInicio] = useState("");
  const [fFin, setFFin] = useState("");
  const [cargando, setCargando] = useState(false);

  const token = localStorage.getItem("token");
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const cargarEquipos = useCallback(async () => {
    setCargando(true);

    const params = new URLSearchParams();
    if (fEstatus) params.append("estatus", fEstatus);
    if (fProducto) params.append("producto", fProducto);
    if (fInicio) params.append("fecha_inicio", fInicio);
    if (fFin) params.append("fecha_fin", fFin);

    try {
      const res = await axios.get(
        `${BASE}/equipos_telcel/?${params.toString()}`,
        config
      );
      setEquipos(res.data);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al cargar equipos");
    } finally {
      setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fEstatus, fProducto, fInicio, fFin]);

  useEffect(() => {
    cargarEquipos();
  }, [cargarEquipos]);

  const manejarArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setSubiendo(true);

    const formData = new FormData();
    formData.append("archivo", archivo);

    try {
      const res = await axios.post(
        `${BASE}/equipos_telcel/upload/`,
        formData,
        {
          headers: {
            ...config.headers,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      let msg = `Carga terminada.\nInsertados: ${res.data.insertados}\nSaltados por repetidos: ${res.data.saltados_repetidos}`;
      if (res.data.rechazados_clave && res.data.rechazados_clave > 0) {
        msg += `\nRechazados por clave no reconocida: ${res.data.rechazados_clave}`;
        msg += `\nClaves no reconocidas: ${res.data.claves_no_reconocidas.join(", ")}`;
      }
      alert(msg);
      cargarEquipos();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al procesar el archivo Excel");
    } finally {
      setSubiendo(false);
      e.target.value = "";
    }
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Carga de Equipos Telcel (IMEI)
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          El Excel debe contener las columnas: <strong>imei</strong>,{" "}
          <strong>clave</strong>, <strong>producto</strong>,{" "}
          <strong>fecha_compra</strong>.
        </Typography>

        <TextField
          type="file"
          inputProps={{ accept: ".xlsx,.xls" }}
          onChange={manejarArchivo}
          disabled={subiendo}
          variant="outlined"
          sx={{ mb: 3 }}
        />

        {/* ── Sección de consulta ─────────────────────────────── */}
        <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
          Equipos registrados
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            alignItems: "center",
            mb: 3,
          }}
        >
          <Select
            value={fEstatus}
            onChange={(e) => setFEstatus(e.target.value)}
            displayEmpty
            size="small"
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="en_bodega">En bodega</MenuItem>
            <MenuItem value="surtido">Surtido</MenuItem>
            <MenuItem value="vendido">Vendido</MenuItem>
          </Select>

          <TextField
            label="Modelo/Producto"
            value={fProducto}
            onChange={(e) => setFProducto(e.target.value)}
            size="small"
          />

          <TextField
            label="Desde"
            type="date"
            value={fInicio}
            onChange={(e) => setFInicio(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />

          <TextField
            label="Hasta"
            type="date"
            value={fFin}
            onChange={(e) => setFFin(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />

          <Button variant="contained" onClick={cargarEquipos}>
            Buscar
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>IMEI</TableCell>
                <TableCell>Clave</TableCell>
                <TableCell>Producto</TableCell>
                <TableCell>Fecha compra</TableCell>
                <TableCell>Estatus</TableCell>
                <TableCell>Módulo</TableCell>
                <TableCell>Fecha salida</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cargando ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : equipos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Sin resultados
                  </TableCell>
                </TableRow>
              ) : (
                equipos.map((eq) => (
                  <TableRow key={eq.id}>
                    <TableCell>{eq.imei}</TableCell>
                    <TableCell>{eq.clave}</TableCell>
                    <TableCell>{eq.producto}</TableCell>
                    <TableCell>{eq.fecha_compra}</TableCell>
                    <TableCell>{eq.estatus}</TableCell>
                    <TableCell>{eq.modulo_nombre || "—"}</TableCell>
                    <TableCell>{eq.fecha_salida ? String(eq.fecha_salida).split(' ')[0] : "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Container>
  );
};

export default EquiposTelcel;
