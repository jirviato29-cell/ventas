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
  const [fActivacion, setFActivacion] = useState<string>(""); // "", "activado", "no_activado"
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

  const cambiarActivacion = async (eq: any) => {
    try {
      const nuevo = !eq.activado;
      await axios.post(`${BASE}/equipos_telcel/activar/${eq.id}`, { activado: nuevo }, config);
      // Actualiza en memoria sin recargar todo
      setEquipos(prev => prev.map(x => x.id === eq.id ? { ...x, activado: nuevo } : x));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al cambiar activación");
    }
  };

  const equiposVisibles = equipos.filter(eq => {
    if (fActivacion === "activado") return eq.activado === true;
    if (fActivacion === "no_activado") return eq.activado === false;
    return true;
  });

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

          <Select
            value={fActivacion}
            onChange={(e) => setFActivacion(e.target.value)}
            displayEmpty
            size="small"
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="activado">Activados</MenuItem>
            <MenuItem value="no_activado">No activados</MenuItem>
          </Select>

          <Button variant="contained" onClick={cargarEquipos}>
            Buscar
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table size="small" sx={{ '& td, & th': { border: '1px solid #e0e0e0' } }}>
            <TableHead>
              <TableRow>
                <TableCell>IMEI</TableCell>
                <TableCell>Clave</TableCell>
                <TableCell>Producto</TableCell>
                <TableCell>Módulo</TableCell>
                <TableCell>Estatus</TableCell>
                <TableCell>Fecha almacén</TableCell>
                <TableCell>Fecha surtido</TableCell>
                <TableCell>Fecha venta</TableCell>
                <TableCell>Activación</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cargando ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : equiposVisibles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    Sin resultados
                  </TableCell>
                </TableRow>
              ) : (
                equiposVisibles.map((eq) => (
                  <TableRow key={eq.id}>
                    <TableCell>{eq.imei}</TableCell>
                    <TableCell>{eq.clave}</TableCell>
                    <TableCell>{eq.producto}</TableCell>
                    <TableCell>{eq.modulo_nombre || "—"}</TableCell>
                    <TableCell>{eq.estatus}</TableCell>
                    <TableCell>{eq.fecha_compra ? String(eq.fecha_compra).split(' ')[0] : "—"}</TableCell>
                    <TableCell>{eq.fecha_salida ? String(eq.fecha_salida).split(' ')[0] : "—"}</TableCell>
                    <TableCell>{eq.fecha_venta ? String(eq.fecha_venta).split(' ')[0] : "—"}</TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => cambiarActivacion(eq)}
                        sx={{ backgroundColor: eq.activado ? '#2e7d32' : '#9e9e9e', '&:hover': { backgroundColor: eq.activado ? '#1b5e20' : '#757575' } }}
                      >
                        {eq.activado ? 'Activado' : 'No activado'}
                      </Button>
                    </TableCell>
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
