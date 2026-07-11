import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Container, Typography, TextField, Button,
  Select, MenuItem, FormControl, InputLabel,
  Table, TableHead, TableBody, TableRow, TableCell,
} from "@mui/material";
import axios from "axios";

const BASE = "https://ato-appservidor-nvxt.onrender.com";

const AltaImeis = () => {
  const [modulos, setModulos] = useState<any[]>([]);
  const [moduloId, setModuloId] = useState<string>("");
  const [filas, setFilas] = useState<any[]>([]);
  const [imeis, setImeis] = useState<Record<number, string>>({}); // imei por índice de fila
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState<number | null>(null);
  const [guardandoTodos, setGuardandoTodos] = useState(false);
  const [fActivacion, setFActivacion] = useState<string>(""); // "", "activado", "no_activado"

  const token = localStorage.getItem("token");
  const config = { headers: { Authorization: `Bearer ${token}` } };

  // Cargar la lista de módulos al montar
  useEffect(() => {
    const cargarModulos = async () => {
      try {
        const res = await axios.get(`${BASE}/registro/modulos`, config);
        setModulos(res.data);
      } catch (err: any) {
        alert(err.response?.data?.detail || "Error al cargar los módulos");
      }
    };
    cargarModulos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cargar los teléfonos que faltan por dar de alta IMEI en el módulo elegido
  const cargarFaltantes = useCallback(async () => {
    if (!moduloId) return;
    setCargando(true);
    try {
      const res = await axios.get(
        `${BASE}/equipos_telcel/faltantes-imei/${moduloId}`,
        config
      );
      const ordenadas = [...res.data].sort((a, b) => {
        const aTelcel = (a.producto || '').toUpperCase().includes('TELCEL') ? 0 : 1;
        const bTelcel = (b.producto || '').toUpperCase().includes('TELCEL') ? 0 : 1;
        if (aTelcel !== bTelcel) return aTelcel - bTelcel;
        return (a.producto || '').localeCompare(b.producto || '');
      });
      setFilas(ordenadas);
      const imeisIniciales: Record<number, string> = {};
      ordenadas.forEach((f, idx) => { if (f.imei) imeisIniciales[idx] = f.imei; });
      setImeis(imeisIniciales);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al cargar los teléfonos faltantes");
    } finally {
      setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduloId]);

  // Recargar cuando cambia el módulo
  useEffect(() => {
    cargarFaltantes();
  }, [cargarFaltantes]);

  const darDeAlta = async (idx: number, fila: any) => {
    const imei = (imeis[idx] || "").trim();
    if (!imei) {
      alert("Escribe el IMEI");
      return;
    }
    setGuardando(idx);
    try {
      await axios.post(
        `${BASE}/equipos_telcel/alta-individual`,
        {
          imei,
          clave: fila.clave,
          producto: fila.producto,
          modulo_id: fila.modulo_id,
        },
        config
      );
      // Recargar la lista para que la fila reaparezca ya con su IMEI y bloqueada
      await cargarFaltantes();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al dar de alta el IMEI");
    } finally {
      setGuardando(null);
    }
  };

  const guardarTodos = async () => {
    // Reunir filas con IMEI escrito
    const aGuardar = filas
      .map((fila, idx) => ({ fila, idx, imei: (imeis[idx] || '').trim() }))
      .filter(x => x.imei !== '' && !x.fila.tiene_imei);
    if (aGuardar.length === 0) { alert("No hay IMEIs capturados para guardar"); return; }
    setGuardandoTodos(true);
    try {
      const equipos = aGuardar.map(x => ({
        imei: x.imei,
        clave: x.fila.clave,
        producto: x.fila.producto,
        modulo_id: x.fila.modulo_id,
      }));
      const res = await axios.post(`${BASE}/equipos_telcel/alta-multiple`, { equipos }, config);
      const guardados = res.data.guardados ?? 0;
      const errores = res.data.errores ?? [];
      let msg = `Se guardaron ${guardados} equipos.`;
      if (errores.length > 0) {
        msg += `\nNo se guardaron ${errores.length}:\n` + errores.map((e: any) => `${e.imei || '(vacío)'}: ${e.motivo}`).join('\n');
      }
      alert(msg);
      // Recargar la lista de faltantes (los guardados ya no aparecerán)
      cargarFaltantes();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al guardar los IMEIs");
    } finally {
      setGuardandoTodos(false);
    }
  };

  const cambiarActivacion = async (fila: any, idx: number) => {
    if (!fila.equipo_id) return;
    try {
      const nuevo = !fila.activado;
      await axios.post(`${BASE}/equipos_telcel/activar/${fila.equipo_id}`, { activado: nuevo }, config);
      setFilas(prev => prev.map((f, i) => i === idx ? { ...f, activado: nuevo } : f));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al cambiar activación");
    }
  };

  const filasVisibles = filas.filter(f => {
    if (!f.tiene_imei) return true; // las pendientes siempre se ven
    if (fActivacion === "activado") return f.activado === true;
    if (fActivacion === "no_activado") return f.activado === false;
    return true;
  });

  const cellSx = { border: "1px solid #ccc" };

  return (
    <Container sx={{ mt: 3 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Dar de alta IMEIs
      </Typography>

      <FormControl size="small" sx={{ minWidth: 240, mb: 2 }}>
        <InputLabel id="modulo-label">Módulo</InputLabel>
        <Select
          labelId="modulo-label"
          label="Módulo"
          value={moduloId}
          onChange={(e) => setModuloId(e.target.value)}
        >
          {modulos.map((m) => (
            <MenuItem key={m.id} value={m.id}>
              {m.nombre}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {filas.length > 0 && (
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
          <Select value={fActivacion} onChange={(e) => setFActivacion(e.target.value)} displayEmpty size="small" sx={{ minWidth: 160 }}>
            <MenuItem value="">Activación: Todos</MenuItem>
            <MenuItem value="activado">Activados</MenuItem>
            <MenuItem value="no_activado">No activados</MenuItem>
          </Select>
          <Button variant="contained" color="success" onClick={guardarTodos} disabled={guardandoTodos}>
            {guardandoTodos ? 'Guardando...' : 'Guardar todos los cambios'}
          </Button>
        </Box>
      )}

      {cargando ? (
        <Typography>Cargando...</Typography>
      ) : moduloId && filas.length === 0 ? (
        <Typography>No hay teléfonos pendientes de IMEI en este módulo</Typography>
      ) : filas.length > 0 ? (
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ border: "1px solid #ccc" }}>
            <TableHead>
              <TableRow>
                <TableCell sx={cellSx}>Producto</TableCell>
                <TableCell sx={cellSx}>Clave</TableCell>
                <TableCell sx={cellSx}>IMEI</TableCell>
                <TableCell sx={cellSx}>Acción</TableCell>
                <TableCell sx={cellSx}>Activación</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filasVisibles.map((fila) => {
                const idx = filas.indexOf(fila);
                return (
                <TableRow key={idx}>
                  <TableCell sx={cellSx}>{fila.producto}</TableCell>
                  <TableCell sx={cellSx}>{fila.clave}</TableCell>
                  <TableCell sx={cellSx}>
                    {fila.tiene_imei ? (
                      <span>{fila.imei}</span>
                    ) : (
                      <TextField
                        size="small"
                        value={imeis[idx] || ""}
                        onChange={(e) =>
                          setImeis((prev) => ({ ...prev, [idx]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            darDeAlta(idx, fila);
                          }
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell sx={cellSx}>
                    {fila.tiene_imei ? (
                      <span style={{ color: 'green' }}>Registrado</span>
                    ) : (
                      <Button
                        variant="contained"
                        size="small"
                        disabled={guardando === idx}
                        onClick={() => darDeAlta(idx, fila)}
                      >
                        {guardando === idx ? "..." : "Guardar"}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell sx={cellSx}>
                    {fila.tiene_imei ? (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => cambiarActivacion(fila, idx)}
                        sx={{ backgroundColor: fila.activado ? '#2e7d32' : '#9e9e9e', '&:hover': { backgroundColor: fila.activado ? '#1b5e20' : '#757575' } }}
                      >
                        {fila.activado ? 'Activado' : 'No activado'}
                      </Button>
                    ) : (
                      <span style={{ color: '#999' }}>—</span>
                    )}
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      ) : null}
    </Container>
  );
};

export default AltaImeis;
