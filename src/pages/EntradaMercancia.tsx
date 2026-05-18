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
import { Delete, Add, Print, Save, Inventory2 } from "@mui/icons-material";
import Autocomplete from "@mui/material/Autocomplete";
import axios from "axios";

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

const EntradaMercancia = () => {
  const token = localStorage.getItem("token");
  const config = { headers: { Authorization: `Bearer ${token}` } };

  // Módulos
  const [modulos, setModulos] = useState<any[]>([]);
  const [moduloSeleccionado, setModuloSeleccionado] = useState<number | "">("");
  const [moduloNombre, setModuloNombre] = useState("");

  // Flujo
  const [modalAbierto, setModalAbierto] = useState(false);
  const [entradaActiva, setEntradaActiva] = useState(false);
  const [folioGuardado, setFolioGuardado] = useState<string | null>(null);

  // Encargado
  const [encargado, setEncargado] = useState<EncargadoInfo | null>(null);
  const [loadingEncargado, setLoadingEncargado] = useState(false);

  // Búsqueda
  const [busquedaEntrada, setBusquedaEntrada] = useState("");
  const [productoEntrada, setProductoEntrada] = useState<any | null>(null);
  const [opcionesProductos, setOpcionesProductos] = useState<any[]>([]);
  const [loadingBusqueda, setLoadingBusqueda] = useState(false);

  // Entrada
  const [cantidadEntrada, setCantidadEntrada] = useState("");
  const [entradaLista, setEntradaLista] = useState<ItemEntrada[]>([]);
  const [guardandoEntrada, setGuardandoEntrada] = useState(false);
  const [existenciaActual, setExistenciaActual] = useState<number>(0);

  const inputCantidadRef = useRef<HTMLInputElement>(null);
  const inputBusquedaRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    cargarModulos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <Box sx={{ p: 3 }}>
      {/* Estilos de impresión */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 32px; }
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

      {/* ── Estado inicial: botón "Nueva entrada" ── */}
      {!entradaActiva && !folioGuardado && (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight={320}
          gap={2}
          className="no-print"
        >
          <Box
            sx={{
              p: 4,
              borderRadius: 3,
              border: "2px dashed #e2e8f0",
              textAlign: "center",
              maxWidth: 420,
            }}
          >
            <Inventory2 sx={{ fontSize: 56, color: "#cbd5e1", mb: 1.5 }} />
            <Typography variant="h6" color="text.primary" fontWeight={600} mb={1}>
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
              sx={{
                px: 5,
                py: 1.5,
                fontSize: "1rem",
                fontWeight: 700,
                borderRadius: 2,
              }}
            >
              Nueva entrada
            </Button>
          </Box>
        </Box>
      )}

      {/* ── Documento: cabecera + contenido ── */}
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
            sx={{
              p: 3,
              mb: 3,
              borderLeft: "4px solid #f97316",
              borderRadius: 2,
            }}
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

          {/* ── Buscador de productos (solo en modo edición) ── */}
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

              {/* Panel del producto seleccionado */}
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

          {/* ── Tabla de productos ── */}
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

          {/* ── Botones de acción ── */}
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
    </Box>
  );
};

export default EntradaMercancia;
