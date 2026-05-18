import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  MenuItem,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Divider,
  Alert,
  Chip,
} from "@mui/material";
import { Delete, Add, Print, Save, Inventory2, Visibility, Search } from "@mui/icons-material";
import Autocomplete from "@mui/material/Autocomplete";
import axios from "axios";

// ── Interfaces de entrada activa ──────────────────────────────────────────────

interface ItemEntrada {
  producto_id: number;
  producto: string;
  clave: string;
  cantidad: number;
  existencia_actual: number;
}

interface EncargadoInfo {
  usuario_id: number;
  username: string;
  nombre_completo: string;
}

// ── Interfaces de historial ───────────────────────────────────────────────────

interface ProductoDetalle {
  clave: string;
  producto: string;
  cantidad: number;
}

interface EntradaHistorial {
  id: number;
  folio: string;
  fecha: string;
  modulo_id: number;
  modulo_nombre: string;
  usuario_id: number;
  usuario_username: string;
  usuario_nombre: string;
  productos: ProductoDetalle[];
}

const EntradaMercancia = () => {
  const token = localStorage.getItem("token");
  const config = { headers: { Authorization: `Bearer ${token}` } };

  // ── Módulos ──────────────────────────────────────────────────────────────────
  const [modulos, setModulos] = useState<any[]>([]);
  const [moduloSeleccionado, setModuloSeleccionado] = useState<number | "">("");
  const [moduloNombre, setModuloNombre] = useState("");

  // ── Flujo entrada activa ──────────────────────────────────────────────────────
  const [modalAbierto, setModalAbierto] = useState(false);
  const [entradaActiva, setEntradaActiva] = useState(false);
  const [folioGuardado, setFolioGuardado] = useState<string | null>(null);

  // ── Encargado ────────────────────────────────────────────────────────────────
  const [encargado, setEncargado] = useState<EncargadoInfo | null>(null);
  const [loadingEncargado, setLoadingEncargado] = useState(false);

  // ── Búsqueda de producto ─────────────────────────────────────────────────────
  const [busquedaEntrada, setBusquedaEntrada] = useState("");
  const [productoEntrada, setProductoEntrada] = useState<any | null>(null);
  const [opcionesProductos, setOpcionesProductos] = useState<any[]>([]);
  const [loadingBusqueda, setLoadingBusqueda] = useState(false);

  // ── Lista de entrada activa ───────────────────────────────────────────────────
  const [cantidadEntrada, setCantidadEntrada] = useState("");
  const [entradaLista, setEntradaLista] = useState<ItemEntrada[]>([]);
  const [guardandoEntrada, setGuardandoEntrada] = useState(false);
  const [existenciaActual, setExistenciaActual] = useState<number>(0);

  // ── Historial ─────────────────────────────────────────────────────────────────
  const [historialFiltroFolio, setHistorialFiltroFolio] = useState("");
  const [historialFiltroFechaDesde, setHistorialFiltroFechaDesde] = useState("");
  const [historialFiltroFechaHasta, setHistorialFiltroFechaHasta] = useState("");
  const [historialFiltroModulo, setHistorialFiltroModulo] = useState<number | "">("");
  const [historialResultados, setHistorialResultados] = useState<EntradaHistorial[]>([]);
  const [historialCargando, setHistorialCargando] = useState(false);
  const [entradaDetalle, setEntradaDetalle] = useState<EntradaHistorial | null>(null);
  const [modalDetalle, setModalDetalle] = useState(false);
  const [modoImpresionDetalle, setModoImpresionDetalle] = useState(false);

  const inputCantidadRef = useRef<HTMLInputElement>(null);
  const inputBusquedaRef = useRef<HTMLInputElement>(null);

  // ── Efectos ──────────────────────────────────────────────────────────────────

  const cargarModulos = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/registro/modulos`,
        config
      );
      setModulos(res.data);
    } catch {
      alert("Error al cargar módulos");
    }
  };

  const buscarHistorial = async (
    filtros: {
      folio?: string;
      fecha_desde?: string;
      fecha_hasta?: string;
      modulo_id?: number | "";
    } = {}
  ) => {
    setHistorialCargando(true);
    try {
      const params: { folio?: string; fecha_desde?: string; fecha_hasta?: string; modulo_id?: number } = {};
      const f = filtros;
      const folio = f.folio !== undefined ? f.folio : historialFiltroFolio;
      const desde = f.fecha_desde !== undefined ? f.fecha_desde : historialFiltroFechaDesde;
      const hasta = f.fecha_hasta !== undefined ? f.fecha_hasta : historialFiltroFechaHasta;
      const mod = f.modulo_id !== undefined ? f.modulo_id : historialFiltroModulo;

      if (folio.trim()) params.folio = folio.trim();
      if (desde) params.fecha_desde = desde;
      if (hasta) params.fecha_hasta = hasta;
      if (mod) params.modulo_id = mod as number;

      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/inventario/inventario/entradas`,
        { params, ...config }
      );
      setHistorialResultados(res.data);
    } catch (err) {
      console.error("[EntradaMercancia] error en historial:", err);
    } finally {
      setHistorialCargando(false);
    }
  };

  useEffect(() => {
    cargarModulos();
    buscarHistorial({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const formatFecha = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "America/Mexico_City",
      });
    } catch {
      return isoString;
    }
  };

  // ── Funciones de entrada activa ───────────────────────────────────────────────

  const obtenerEncargado = async (moduloId: number) => {
    setLoadingEncargado(true);
    setEncargado(null);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/modulos/${moduloId}/encargado`,
        config
      );
      setEncargado(res.data);
    } catch (err) {
      if ((err as any)?.response?.status !== 404) {
        console.error("[EntradaMercancia] error obteniendo encargado:", err);
      }
    } finally {
      setLoadingEncargado(false);
    }
  };

  const confirmarModulo = async () => {
    if (!moduloSeleccionado) return;
    const modulo = modulos.find((m) => m.id === moduloSeleccionado);
    setModuloNombre(modulo?.nombre ?? "");
    setModalAbierto(false);
    setEntradaActiva(true);
    setFolioGuardado(null);
    setEntradaLista([]);
    await obtenerEncargado(moduloSeleccionado as number);
  };

  const nuevaEntrada = () => {
    setEntradaActiva(false);
    setEntradaLista([]);
    setFolioGuardado(null);
    setEncargado(null);
    setModuloSeleccionado("");
    setModuloNombre("");
    setProductoEntrada(null);
    setBusquedaEntrada("");
    setModalAbierto(true);
  };

  const buscarProductosEntrada = async (texto: string) => {
    setBusquedaEntrada(texto);
    if (!texto || texto.length < 2) { setOpcionesProductos([]); return; }
    if (!moduloSeleccionado) return;
    try {
      setLoadingBusqueda(true);
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/inventario/inventario/buscar-autocomplete`,
        { params: { modulo_id: moduloSeleccionado, q: texto }, ...config }
      );
      setOpcionesProductos(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBusqueda(false);
    }
  };

  const obtenerExistenciaModulo = async (clave: string) => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/inventario/inventario/modulo/${moduloSeleccionado}/existencia`,
        { params: { clave }, ...config }
      );
      return res.data.existencia_actual;
    } catch {
      return 0;
    }
  };

  const agregarEntrada = () => {
    if (!moduloSeleccionado) { alert("Selecciona un módulo"); return; }
    if (!productoEntrada) { alert("Selecciona un producto"); return; }
    const cantidad = parseInt(cantidadEntrada, 10);
    if (isNaN(cantidad) || cantidad <= 0) { alert("Cantidad inválida"); return; }

    setEntradaLista((prev) => {
      const index = prev.findIndex((p) => p.clave === productoEntrada.clave);
      const nuevoItem: ItemEntrada = {
        producto_id: productoEntrada.id,
        producto: productoEntrada.producto,
        clave: productoEntrada.clave,
        cantidad,
        existencia_actual: existenciaActual,
      };
      if (index !== -1) {
        const copy = [...prev];
        copy[index].cantidad += cantidad;
        return copy;
      }
      return [...prev, nuevoItem];
    });

    setProductoEntrada(null);
    setCantidadEntrada("");
    setBusquedaEntrada("");
    setTimeout(() => {
      inputBusquedaRef.current?.focus();
    }, 100);
  };

  const guardarEntradaMercancia = async () => {
    if (!moduloSeleccionado) { alert("Selecciona un módulo"); return; }
    if (entradaLista.length === 0) { alert("No hay productos en la lista"); return; }

    setGuardandoEntrada(true);
    try {
      const payload = {
        modulo_id: moduloSeleccionado,
        productos: entradaLista.map((p) => ({
          producto_id: p.producto_id,
          cantidad: p.cantidad,
        })),
      };
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/inventario/inventario/entrada_mercancia`,
        payload,
        config
      );
      if (res.data.ok) {
        setFolioGuardado(res.data.folio);
        setEntradaActiva(false);
      } else {
        alert("Error inesperado");
      }
    } catch {
      alert("Error al guardar entrada");
    } finally {
      setGuardandoEntrada(false);
    }
  };

  // ── Impresión de detalle histórico ────────────────────────────────────────────

  const imprimirEntradaDetalle = () => {
    setModalDetalle(false);
    setModoImpresionDetalle(true);
    setTimeout(() => {
      window.print();
      window.onafterprint = () => {
        setModoImpresionDetalle(false);
        window.onafterprint = null;
      };
    }, 200);
  };

  // ── Derived state ────────────────────────────────────────────────────────────

  // Sort centralizado antes del render — el servidor devuelve sin orden garantizado
  const opcionesOrdenadas = [...opcionesProductos].sort((a, b) =>
    a.clave.localeCompare(b.clave, "es", { numeric: true, sensitivity: "base" })
  );
  if (opcionesOrdenadas.length > 0) {
    console.log("[EntradaMercancia] opciones:", opcionesOrdenadas.map((o) => o.clave));
  }

  const nombreEncargado = encargado?.nombre_completo ?? "Sin encargado asignado";
  const fechaHoy = new Date().toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const mostrarDocumento = entradaActiva || folioGuardado !== null;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ p: 3 }}>
      {/* Estilos de impresión */}
      <style>{`
        .print-detalle { display: none; }
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 32px; }
          .print-detalle { display: block !important; }
          .print-detalle, .print-detalle * { visibility: visible; }
          .print-detalle { position: absolute; left: 0; top: 0; width: 100%; padding: 32px; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Encabezado de página */}
      <Box display="flex" alignItems="center" gap={1.5} mb={3}>
        <Inventory2 sx={{ color: "#f97316", fontSize: 28 }} />
        <Typography variant="h5" fontWeight={700} color="text.primary">
          Entrada de mercancía
        </Typography>
      </Box>

      {/* ── Estado inicial: Nueva entrada + Historial ── */}
      {!entradaActiva && !folioGuardado && (
        <Box className="no-print">
          {/* Botón Nueva entrada */}
          <Box display="flex" justifyContent="center" mb={4}>
            <Box
              sx={{
                p: 4,
                borderRadius: 3,
                border: "2px dashed #e2e8f0",
                textAlign: "center",
                maxWidth: 420,
                width: "100%",
              }}
            >
              <Inventory2 sx={{ fontSize: 48, color: "#cbd5e1", mb: 1.5 }} />
              <Typography variant="h6" color="text.primary" fontWeight={600} mb={0.5}>
                Sin entrada activa
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Inicia una nueva entrada de mercancía seleccionando el módulo destino.
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<Add />}
                onClick={nuevaEntrada}
                sx={{ px: 5, py: 1.5, fontSize: "1rem", fontWeight: 700, borderRadius: 2 }}
              >
                Nueva entrada
              </Button>
            </Box>
          </Box>

          {/* Historial de entradas */}
          <Paper elevation={0} sx={{ borderRadius: 2, overflow: "hidden" }}>
            {/* Cabecera del historial */}
            <Box
              sx={{
                px: 2.5,
                py: 2,
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Inventory2 sx={{ color: "#f97316", fontSize: 20 }} />
              <Typography variant="subtitle1" fontWeight={700}>
                Historial de entradas
              </Typography>
            </Box>

            {/* Filtros */}
            <Box
              sx={{
                px: 2.5,
                py: 2,
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                gap: 2,
                flexWrap: "wrap",
                alignItems: "flex-end",
              }}
            >
              <TextField
                label="Folio"
                size="small"
                value={historialFiltroFolio}
                onChange={(e) => setHistorialFiltroFolio(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") buscarHistorial(); }}
                sx={{ width: 120 }}
                placeholder="ej. E1"
              />
              <TextField
                label="Desde"
                type="date"
                size="small"
                value={historialFiltroFechaDesde}
                onChange={(e) => setHistorialFiltroFechaDesde(e.target.value)}
                sx={{ width: 160 }}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Hasta"
                type="date"
                size="small"
                value={historialFiltroFechaHasta}
                onChange={(e) => setHistorialFiltroFechaHasta(e.target.value)}
                sx={{ width: 160 }}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                select
                label="Módulo"
                size="small"
                value={historialFiltroModulo}
                onChange={(e) =>
                  setHistorialFiltroModulo(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
                sx={{ width: 180 }}
              >
                <MenuItem value="">Todos</MenuItem>
                {modulos.map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.nombre}
                  </MenuItem>
                ))}
              </TextField>
              <Button
                variant="contained"
                startIcon={
                  historialCargando ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <Search />
                  )
                }
                onClick={() => buscarHistorial()}
                disabled={historialCargando}
              >
                Buscar
              </Button>
              {(historialFiltroFolio || historialFiltroFechaDesde || historialFiltroFechaHasta || historialFiltroModulo) && (
                <Button
                  size="small"
                  color="inherit"
                  sx={{ color: "text.secondary" }}
                  onClick={() => {
                    setHistorialFiltroFolio("");
                    setHistorialFiltroFechaDesde("");
                    setHistorialFiltroFechaHasta("");
                    setHistorialFiltroModulo("");
                    buscarHistorial({
                      folio: "",
                      fecha_desde: "",
                      fecha_hasta: "",
                      modulo_id: "",
                    });
                  }}
                >
                  Limpiar
                </Button>
              )}
            </Box>

            {/* Tabla de resultados */}
            {historialCargando ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress size={32} />
              </Box>
            ) : historialResultados.length === 0 ? (
              <Box py={4} textAlign="center">
                <Typography variant="body2" color="text.secondary">
                  No hay entradas para los filtros seleccionados.
                </Typography>
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Folio</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Módulo</TableCell>
                    <TableCell>Usuario</TableCell>
                    <TableCell align="right">Productos</TableCell>
                    <TableCell align="center" sx={{ width: 60 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historialResultados.map((entrada) => (
                    <TableRow
                      key={entrada.id}
                      hover
                      sx={{ cursor: "pointer" }}
                      onClick={() => {
                        setEntradaDetalle(entrada);
                        setModalDetalle(true);
                      }}
                    >
                      <TableCell sx={{ fontWeight: 700, color: "#f97316" }}>
                        {entrada.folio}
                      </TableCell>
                      <TableCell>{formatFecha(entrada.fecha)}</TableCell>
                      <TableCell>{entrada.modulo_nombre}</TableCell>
                      <TableCell sx={{ color: "#64748b" }}>
                        {entrada.usuario_nombre}
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${entrada.productos.length} art.`}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEntradaDetalle(entrada);
                            setModalDetalle(true);
                          }}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Box>
      )}

      {/* ── Print-only: detalle histórico ── */}
      {modoImpresionDetalle && entradaDetalle && (
        <Box className="print-detalle">
          <Paper
            elevation={0}
            sx={{ p: 3, mb: 3, borderLeft: "4px solid #f97316", borderRadius: 2 }}
          >
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="flex-start"
              flexWrap="wrap"
              gap={2}
            >
              <Box>
                <Typography
                  variant="overline"
                  sx={{ color: "#64748b", letterSpacing: 2, fontSize: "0.7rem" }}
                >
                  Entrada de mercancía
                </Typography>
                <Typography
                  variant="h3"
                  fontWeight={800}
                  sx={{ color: "#f97316", lineHeight: 1.1 }}
                >
                  {entradaDetalle.folio}
                </Typography>
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  FECHA
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {formatFecha(entradaDetalle.fecha)}
                </Typography>
              </Box>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box display="flex" gap={5} flexWrap="wrap">
              <Box>
                <Typography
                  variant="caption"
                  sx={{ color: "#64748b", letterSpacing: 1, fontWeight: 700 }}
                  display="block"
                >
                  MÓDULO DESTINO
                </Typography>
                <Typography variant="body1" fontWeight={700}>
                  {entradaDetalle.modulo_nombre}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  sx={{ color: "#64748b", letterSpacing: 1, fontWeight: 700 }}
                  display="block"
                >
                  USUARIO
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {entradaDetalle.usuario_nombre}
                </Typography>
              </Box>
            </Box>
          </Paper>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Clave</TableCell>
                <TableCell>Producto</TableCell>
                <TableCell align="right">Cantidad</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entradaDetalle.productos.map((p, idx) => (
                <TableRow key={idx}>
                  <TableCell sx={{ fontWeight: 600, color: "#f97316" }}>
                    {p.clave}
                  </TableCell>
                  <TableCell>{p.producto}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {p.cantidad}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {/* ── Documento activo: cabecera + contenido ── */}
      {mostrarDocumento && (
        <Box className="print-area">
          {/* Alerta de éxito */}
          {folioGuardado && (
            <Alert
              severity="success"
              sx={{ mb: 3, fontWeight: 500 }}
              className="no-print"
            >
              Entrada <strong>{folioGuardado}</strong> guardada correctamente.
            </Alert>
          )}

          {/* Cabecera tipo documento */}
          <Paper
            elevation={0}
            sx={{ p: 3, mb: 3, borderLeft: "4px solid #f97316", borderRadius: 2 }}
          >
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="flex-start"
              flexWrap="wrap"
              gap={2}
            >
              <Box>
                <Typography
                  variant="overline"
                  sx={{ color: "#64748b", letterSpacing: 2, fontSize: "0.7rem" }}
                >
                  Entrada de mercancía
                </Typography>
                {folioGuardado ? (
                  <Typography
                    variant="h3"
                    fontWeight={800}
                    sx={{ color: "#f97316", lineHeight: 1.1 }}
                  >
                    {folioGuardado}
                  </Typography>
                ) : (
                  <Typography
                    variant="h5"
                    fontWeight={600}
                    sx={{ color: "#94a3b8", fontStyle: "italic" }}
                  >
                    Folio pendiente
                  </Typography>
                )}
              </Box>
              <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  FECHA
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {fechaHoy}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box display="flex" gap={5} flexWrap="wrap">
              <Box>
                <Typography
                  variant="caption"
                  sx={{ color: "#64748b", letterSpacing: 1, fontWeight: 700 }}
                  display="block"
                >
                  MÓDULO DESTINO
                </Typography>
                <Typography variant="body1" fontWeight={700} color="text.primary">
                  {moduloNombre}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  sx={{ color: "#64748b", letterSpacing: 1, fontWeight: 700 }}
                  display="block"
                >
                  ENCARGADO
                </Typography>
                {loadingEncargado ? (
                  <CircularProgress size={16} sx={{ mt: 0.5 }} />
                ) : (
                  <Typography
                    variant="body1"
                    fontWeight={500}
                    color={encargado ? "text.primary" : "text.secondary"}
                    fontStyle={encargado ? "normal" : "italic"}
                  >
                    {nombreEncargado}
                  </Typography>
                )}
              </Box>
            </Box>
          </Paper>

          {/* Buscador de productos (solo edición) */}
          {entradaActiva && (
            <Box mb={3} className="no-print">
              <Autocomplete
                options={opcionesOrdenadas}
                filterOptions={(x) => x}
                loading={loadingBusqueda}
                value={productoEntrada}
                inputValue={busquedaEntrada}
                onChange={async (_, value) => {
                  setProductoEntrada(value);
                  if (!value) return;
                  const existencia = await obtenerExistenciaModulo(value.clave);
                  setExistenciaActual(existencia);
                  setTimeout(() => { inputCantidadRef.current?.focus(); }, 100);
                }}
                onInputChange={(_, value) => { buscarProductosEntrada(value); }}
                getOptionLabel={(option) => `${option.clave} - ${option.producto}`}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Buscar producto (clave o nombre)"
                    fullWidth
                    inputRef={inputBusquedaRef}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && opcionesOrdenadas.length > 0) {
                        e.preventDefault();
                        const primero = opcionesOrdenadas[0];
                        setProductoEntrada(primero);
                        obtenerExistenciaModulo(primero.clave).then(setExistenciaActual);
                        setTimeout(() => { inputCantidadRef.current?.focus(); }, 100);
                      }
                    }}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingBusqueda && <CircularProgress size={20} />}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />

              {productoEntrada && (
                <Paper
                  elevation={0}
                  sx={{
                    mt: 2,
                    p: 2.5,
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    flexWrap: "wrap",
                    backgroundColor: "rgba(249,115,22,0.04)",
                    border: "1px solid rgba(249,115,22,0.2)",
                  }}
                >
                  <Box flex={1} minWidth={180}>
                    <Typography variant="body2" color="text.secondary" mb={0.5}>
                      Producto seleccionado
                    </Typography>
                    <Typography variant="body1" fontWeight={700} color="text.primary">
                      {productoEntrada.clave} — {productoEntrada.producto}
                    </Typography>
                    <Chip
                      size="small"
                      label={`Existencia: ${existenciaActual}`}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <TextField
                      label="Cantidad"
                      type="number"
                      value={cantidadEntrada}
                      inputRef={inputCantidadRef}
                      onChange={(e) => setCantidadEntrada(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); agregarEntrada(); }
                      }}
                      sx={{ width: 130 }}
                      size="small"
                    />
                    <Button
                      variant="contained"
                      color="secondary"
                      startIcon={<Add />}
                      onClick={agregarEntrada}
                    >
                      Agregar
                    </Button>
                  </Box>
                </Paper>
              )}
            </Box>
          )}

          {/* Tabla de productos de la entrada activa */}
          {entradaLista.length > 0 && (
            <Paper elevation={0} sx={{ borderRadius: 2, overflow: "hidden", mb: 3 }}>
              <Box
                sx={{
                  px: 2.5,
                  py: 1.5,
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Typography variant="subtitle1" fontWeight={700}>
                  Productos
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {entradaLista.length} artículo{entradaLista.length !== 1 ? "s" : ""}
                </Typography>
              </Box>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Clave</TableCell>
                    <TableCell>Producto</TableCell>
                    <TableCell align="right">Cantidad</TableCell>
                    <TableCell align="right">Existencia actual</TableCell>
                    {entradaActiva && (
                      <TableCell align="center" className="no-print">
                        Acc.
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entradaLista.map((p, idx) => (
                    <TableRow key={idx}>
                      <TableCell sx={{ fontWeight: 600, color: "#f97316" }}>
                        {p.clave}
                      </TableCell>
                      <TableCell>{p.producto}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {p.cantidad}
                      </TableCell>
                      <TableCell align="right" sx={{ color: "#64748b" }}>
                        {p.existencia_actual}
                      </TableCell>
                      {entradaActiva && (
                        <TableCell align="center" className="no-print">
                          <IconButton
                            size="small"
                            onClick={() =>
                              setEntradaLista((prev) => prev.filter((_, i) => i !== idx))
                            }
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}

          {/* Botones de acción */}
          <Box display="flex" gap={2} flexWrap="wrap" className="no-print">
            {entradaActiva && entradaLista.length > 0 && (
              <Button
                variant="contained"
                startIcon={
                  guardandoEntrada ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <Save />
                  )
                }
                onClick={guardarEntradaMercancia}
                disabled={guardandoEntrada}
                sx={{
                  backgroundColor: "#16a34a",
                  "&:hover": { backgroundColor: "#15803d" },
                  fontWeight: 700,
                  px: 4,
                }}
              >
                {guardandoEntrada ? "Guardando…" : "Guardar entrada"}
              </Button>
            )}

            {folioGuardado && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<Print />}
                  onClick={() => window.print()}
                >
                  Imprimir
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={nuevaEntrada}
                >
                  Nueva entrada
                </Button>
              </>
            )}
          </Box>
        </Box>
      )}

      {/* ── Modal: selección de módulo ── */}
      <Dialog
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          Seleccionar módulo
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Elige el módulo destino para esta entrada de mercancía.
          </Typography>
          <TextField
            select
            label="Módulo"
            value={moduloSeleccionado}
            onChange={(e) =>
              setModuloSeleccionado(
                e.target.value === "" ? "" : Number(e.target.value)
              )
            }
            fullWidth
            size="small"
          >
            {modulos.map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.nombre}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setModalAbierto(false)}
            color="inherit"
            sx={{ color: "text.secondary" }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={confirmarModulo}
            disabled={!moduloSeleccionado}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Modal: detalle de entrada histórica ── */}
      <Dialog
        open={modalDetalle}
        onClose={() => setModalDetalle(false)}
        maxWidth="md"
        fullWidth
      >
        {entradaDetalle && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Box display="flex" alignItems="baseline" gap={2} flexWrap="wrap">
                <Typography
                  variant="h4"
                  fontWeight={800}
                  sx={{ color: "#f97316", lineHeight: 1 }}
                >
                  {entradaDetalle.folio}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Detalle de entrada
                </Typography>
              </Box>
            </DialogTitle>

            <DialogContent>
              {/* Mini cabecera informativa */}
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mb: 2,
                  backgroundColor: "rgba(249,115,22,0.04)",
                  border: "1px solid rgba(249,115,22,0.15)",
                  borderRadius: 2,
                }}
              >
                <Box display="flex" gap={4} flexWrap="wrap">
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: "#64748b", letterSpacing: 1, fontWeight: 700 }}
                      display="block"
                    >
                      MÓDULO
                    </Typography>
                    <Typography variant="body1" fontWeight={700}>
                      {entradaDetalle.modulo_nombre}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: "#64748b", letterSpacing: 1, fontWeight: 700 }}
                      display="block"
                    >
                      USUARIO
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {entradaDetalle.usuario_nombre}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: "#64748b", letterSpacing: 1, fontWeight: 700 }}
                      display="block"
                    >
                      FECHA
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {formatFecha(entradaDetalle.fecha)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: "#64748b", letterSpacing: 1, fontWeight: 700 }}
                      display="block"
                    >
                      PRODUCTOS
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {entradaDetalle.productos.length} artículo{entradaDetalle.productos.length !== 1 ? "s" : ""}
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              {/* Tabla de productos del detalle */}
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Clave</TableCell>
                    <TableCell>Producto</TableCell>
                    <TableCell align="right">Cantidad</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entradaDetalle.productos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ color: "#64748b", py: 3 }}>
                        Sin detalle de productos disponible.
                      </TableCell>
                    </TableRow>
                  ) : (
                    entradaDetalle.productos.map((p, idx) => (
                      <TableRow key={idx}>
                        <TableCell sx={{ fontWeight: 600, color: "#f97316" }}>
                          {p.clave || "—"}
                        </TableCell>
                        <TableCell>{p.producto}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {p.cantidad}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<Print />}
                onClick={imprimirEntradaDetalle}
              >
                Imprimir
              </Button>
              <Button
                variant="contained"
                onClick={() => setModalDetalle(false)}
              >
                Cerrar
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default EntradaMercancia;
