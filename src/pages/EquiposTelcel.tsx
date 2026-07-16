import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Container, Typography, TextField, Button, Select, MenuItem,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Paper,
  Autocomplete,
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
  const [fTipo, setFTipo] = useState<string>(""); // "", "TELCEL", "LIBRE"
  const [cargando, setCargando] = useState(false);

  const tipoEquipo = (producto: string): "TELCEL" | "LIBRE" =>
    (producto || "").toUpperCase().startsWith("TELEFONO LIBRE") ? "LIBRE" : "TELCEL";

  const [aImei, setAImei] = useState("");
  const [aProducto, setAProducto] = useState<any | null>(null);
  const [aOpciones, setAOpciones] = useState<any[]>([]);
  const [aBuscando, setABuscando] = useState(false);
  const [aFecha, setAFecha] = useState("");
  const [altaGuardando, setAltaGuardando] = useState(false);

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

  const guardarFechaActivacion = async (eq: any, valor: string) => {
    try {
      await axios.post(`${BASE}/equipos_telcel/fecha-activacion/${eq.id}`, { fecha_activacion: valor || null }, config);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al guardar la fecha de activación");
    }
  };

  const guardarFechaEstatusInicial = async (eq: any, valor: string) => {
    try {
      await axios.post(`${BASE}/equipos_telcel/fecha-estatus-inicial/${eq.id}`, { fecha_estatus_inicial: valor || null }, config);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al guardar la fecha de estatus inicial");
    }
  };

  const buscarProductoAlta = async (texto: string) => {
    if (!texto || texto.length < 2) { setAOpciones([]); return; }
    setABuscando(true);
    try {
      const res = await axios.get(`${BASE}/inventario/buscar?query=${encodeURIComponent(texto)}`, config);
      setAOpciones(res.data || []);
    } catch { setAOpciones([]); }
    finally { setABuscando(false); }
  };

  const darDeAltaBodega = async () => {
    const imei = aImei.trim();
    if (!imei) { alert("Escribe el IMEI"); return; }
    if (!aProducto) { alert("Selecciona el producto"); return; }
    if (!aFecha) { alert("Selecciona la fecha de compra"); return; }
    setAltaGuardando(true);
    try {
      await axios.post(`${BASE}/equipos_telcel/alta-bodega`, {
        imei,
        clave: aProducto.clave,
        producto: aProducto.producto,
        fecha_compra: aFecha,
      }, config);
      alert("Equipo dado de alta en bodega");
      setAImei(""); setAProducto(null); setAOpciones([]); setAFecha("");
      cargarEquipos();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al dar de alta el equipo");
    } finally {
      setAltaGuardando(false);
    }
  };

  const equiposVisibles = equipos.filter(eq => {
    if (fActivacion === "activado" && eq.activado !== true) return false;
    if (fActivacion === "no_activado" && eq.activado !== false) return false;
    if (fTipo && tipoEquipo(eq.producto) !== fTipo) return false;
    return true;
  });

  return (
    <Container maxWidth={false} sx={{ mt: 4 }}>
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

        {/* ── Alta manual de equipo (bodega) ──────────────────── */}
        <Box sx={{ mt: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Alta manual de equipo (bodega)</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField label="IMEI" value={aImei} onChange={(e) => setAImei(e.target.value)} size="small" />
            <Autocomplete
              sx={{ minWidth: 320 }}
              options={aOpciones}
              filterOptions={(x) => x}
              loading={aBuscando}
              value={aProducto}
              getOptionLabel={(p: any) => (p?.clave ? `${p.clave} - ${p.producto}` : (p?.producto || ''))}
              onInputChange={(_, v, reason) => { if (reason === 'input') buscarProductoAlta(v); }}
              onChange={(_, obj) => setAProducto(obj)}
              renderInput={(params) => <TextField {...params} label="Producto (clave o nombre)" size="small" />}
            />
            <TextField label="Fecha de compra" type="date" value={aFecha} onChange={(e) => setAFecha(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
            <Button variant="contained" onClick={darDeAltaBodega} disabled={altaGuardando}>
              {altaGuardando ? 'Guardando...' : 'Dar de alta'}
            </Button>
          </Box>
        </Box>

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

          <Select
            value={fTipo}
            onChange={(e) => setFTipo(e.target.value)}
            displayEmpty
            size="small"
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">Todos (Telcel/Libre)</MenuItem>
            <MenuItem value="TELCEL">Telcel</MenuItem>
            <MenuItem value="LIBRE">Libre</MenuItem>
          </Select>

          <Button variant="contained" onClick={cargarEquipos}>
            Buscar
          </Button>
        </Box>

        <TableContainer component={Paper} sx={{ width: '100%', overflowX: 'auto' }}>
          <Table size="small" sx={{ '& td, & th': { border: '1px solid #e0e0e0' } }}>
            <TableHead>
              <TableRow>
                <TableCell>IMEI</TableCell>
                <TableCell>Producto</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Módulo</TableCell>
                <TableCell>Estatus</TableCell>
                <TableCell>Fecha surtido</TableCell>
                <TableCell>Fecha venta</TableCell>
                <TableCell>Activación</TableCell>
                <TableCell>Fecha activación</TableCell>
                <TableCell>Fecha Estatus inicial</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cargando ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : equiposVisibles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    Sin resultados
                  </TableCell>
                </TableRow>
              ) : (
                equiposVisibles.map((eq) => (
                  <TableRow key={eq.id}>
                    <TableCell>{eq.imei}</TableCell>
                    <TableCell>{eq.producto}</TableCell>
                    <TableCell>
                      <Box
                        component="span"
                        sx={{
                          display: 'inline-block',
                          px: 1,
                          py: '2px',
                          borderRadius: 1,
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#fff',
                          backgroundColor: tipoEquipo(eq.producto) === 'TELCEL' ? '#FF6600' : '#64748b',
                        }}
                      >
                        {tipoEquipo(eq.producto)}
                      </Box>
                    </TableCell>
                    <TableCell>{eq.modulo_nombre || "—"}</TableCell>
                    <TableCell>{eq.estatus}</TableCell>
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
                    <TableCell>
                      <TextField
                        type="date"
                        size="small"
                        value={eq.fecha_activacion || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEquipos(prev => prev.map(x => x.id === eq.id ? { ...x, fecha_activacion: val || null } : x));
                        }}
                        onBlur={(e) => guardarFechaActivacion(eq, e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="date"
                        size="small"
                        value={eq.fecha_estatus_inicial || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEquipos(prev => prev.map(x => x.id === eq.id ? { ...x, fecha_estatus_inicial: val || null } : x));
                        }}
                        onBlur={(e) => guardarFechaEstatusInicial(eq, e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
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
