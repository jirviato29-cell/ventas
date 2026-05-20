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
import { Delete, Add, Print, Save, Inventory2, Visibility, Search, Edit } from "@mui/icons-material";
import Autocomplete from "@mui/material/Autocomplete";
import axios from "axios";
import logoAto from "../ATO.jpeg";

// ── Interfaces de entrada activa ──────────────────────────────────────────────

interface ItemEntrada {
  producto_id: number;
  producto: string;
  clave: string;
  cantidad: number;
  existencia_actual: number;
  tipo_producto?: string;
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
  tipo_producto?: string;
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

interface EditItem {
  producto_id: number;
  clave: string;
  producto: string;
  cantidad: number;
}

// ── Helpers de impresión ─────────────────────────────────────────────────────

interface TicketRow { clave: string; producto: string; cantidad: number; }

const TablaTicket = ({ rows }: { rows: TicketRow[] }) => (
  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9pt", fontFamily: "Arial, Helvetica, sans-serif", marginTop: 4 }}>
    <thead>
      <tr>
        <th style={{ border: "1px solid #888", padding: "3px 6px", textAlign: "left", width: "15%", backgroundColor: "#ececec", fontWeight: 700 }}>Clave</th>
        <th style={{ border: "1px solid #888", padding: "3px 6px", textAlign: "left", width: "55%", backgroundColor: "#ececec", fontWeight: 700 }}>Producto</th>
        <th style={{ border: "1px solid #888", padding: "3px 6px", textAlign: "center", width: "10%", backgroundColor: "#ececec", fontWeight: 700 }}>Cant.</th>
        <th style={{ border: "1px solid #888", padding: "3px 6px", textAlign: "center", width: "20%", backgroundColor: "#ececec", fontWeight: 700 }}>Revisado</th>
      </tr>
    </thead>
    <tbody>
      {rows.map((p, i) => (
        <tr key={i} style={{ backgroundColor: i % 2 === 1 ? "#f7f7f7" : "#ffffff" }}>
          <td style={{ border: "1px solid #ccc", padding: "4px 6px", fontWeight: 600 }}>{p.clave}</td>
          <td style={{ border: "1px solid #ccc", padding: "4px 6px", wordBreak: "break-word" }}>{p.producto}</td>
          <td style={{ border: "1px solid #ccc", padding: "4px 6px", textAlign: "center" }}>{p.cantidad}</td>
          <td style={{ border: "1px solid #ccc", padding: "4px 6px" }}>&nbsp;</td>
        </tr>
      ))}
    </tbody>
  </table>
);

interface TicketProps {
  folio: string;
  fecha: string;
  moduloNombreStr: string;
  encargadoNombre: string;
  productos: (TicketRow & { tipo_producto?: string })[];
}

const TicketImpresion = ({ folio, fecha, moduloNombreStr, encargadoNombre, productos }: TicketProps) => {
  const accesorios = productos.filter((p) => (p.tipo_producto ?? "").toLowerCase() !== "telefono");
  const telefonos  = productos.filter((p) => (p.tipo_producto ?? "").toLowerCase() === "telefono");
  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: "10pt", color: "#000", lineHeight: 1.3 }}>
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <img src={logoAto} alt="ATO" style={{ width: 88, height: "auto", display: "inline-block" }} />
      </div>
      <div style={{ borderBottom: "2px solid #000", paddingBottom: 6, marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <strong style={{ fontSize: "13pt", letterSpacing: 0.5 }}>ENTRADA DE MERCANCÍA</strong>
          <span style={{ fontSize: "10pt", fontWeight: 700 }}>Folio: {folio}</span>
        </div>
        <div style={{ display: "flex", gap: 24, marginTop: 4, fontSize: "9pt" }}>
          <span>Fecha: {fecha}</span>
          <span>Módulo: {moduloNombreStr}</span>
          <span>Encargado: {encargadoNombre}</span>
        </div>
      </div>
      {accesorios.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: "10pt", borderLeft: "3px solid #333", paddingLeft: 6, marginBottom: 4 }}>ACCESORIOS</div>
          <TablaTicket rows={accesorios} />
        </div>
      )}
      {telefonos.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: "10pt", borderLeft: "3px solid #333", paddingLeft: 6, marginBottom: 4 }}>TELÉFONOS</div>
          <TablaTicket rows={telefonos} />
        </div>
      )}
    </div>
  );
};

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
  const [encargadoDetalle, setEncargadoDetalle] = useState<EncargadoInfo | null>(null);

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

  // ── Usuario actual (para is_admin) ────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<any>(null);

  // ── Eliminar entrada ──────────────────────────────────────────────────────────
  const [modalConfirmEliminar, setModalConfirmEliminar] = useState(false);
  const [eliminandoEntrada, setEliminandoEntrada] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);

  // ── Editar entrada ────────────────────────────────────────────────────────────
  const [modalEditar, setModalEditar] = useState(false);
  const [editProductos, setEditProductos] = useState<EditItem[]>([]);
  const [editBusqueda, setEditBusqueda] = useState("");
  const [editOpciones, setEditOpciones] = useState<any[]>([]);
  const [editLoadingBusqueda, setEditLoadingBusqueda] = useState(false);
  const [editProductoSeleccionado, setEditProductoSeleccionado] = useState<any | null>(null);
  const [editCantidadNueva, setEditCantidadNueva] = useState("");
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [errorEditar, setErrorEditar] = useState<string | null>(null);
  const [cargandoEditar, setCargandoEditar] = useState(false);

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
    cargarCurrentUser();
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
        tipo_producto: productoEntrada.tipo_producto,
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

  const imprimirEntradaDetalle = async () => {
    if (!entradaDetalle) return;
    setModalDetalle(false);
    let enc: EncargadoInfo | null = null;
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/modulos/${entradaDetalle.modulo_id}/encargado`,
        config
      );
      enc = res.data ?? null;
    } catch {
      enc = null;
    }
    setEncargadoDetalle(enc);
    setModoImpresionDetalle(true);
    setTimeout(() => {
      window.print();
      window.onafterprint = () => {
        setModoImpresionDetalle(false);
        setEncargadoDetalle(null);
        window.onafterprint = null;
      };
    }, 300);
  };

  // ── Usuario actual ────────────────────────────────────────────────────────────

  const cargarCurrentUser = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/auth/usuarios/me`,
        config
      );
      setCurrentUser(res.data);
    } catch {
      // sin acceso admin — botones no se muestran
    }
  };

  // ── Eliminar entrada ──────────────────────────────────────────────────────────

  const handleEliminar = async () => {
    if (!entradaDetalle) return;
    setEliminandoEntrada(true);
    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/inventario/inventario/entradas/${entradaDetalle.id}`,
        config
      );
      setModalConfirmEliminar(false);
      setModalDetalle(false);
      setEntradaDetalle(null);
      buscarHistorial();
    } catch (err: any) {
      setModalConfirmEliminar(false);
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 400 && detail) {
        setErrorDetalle(String(detail));
      } else if (err?.response?.status === 403) {
        setErrorDetalle("No tienes permisos para eliminar entradas.");
      } else {
        setErrorDetalle("Error al eliminar la entrada.");
      }
    } finally {
      setEliminandoEntrada(false);
    }
  };

  // ── Editar entrada ────────────────────────────────────────────────────────────

  const abrirEditar = async () => {
    if (!entradaDetalle) return;
    setCargandoEditar(true);
    setErrorDetalle(null);
    try {
      const items: EditItem[] = [];
      for (const p of entradaDetalle.productos) {
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/inventario/inventario/buscar-autocomplete`,
          { params: { q: p.clave }, ...config }
        );
        const match = (res.data as any[]).find((r: any) => r.clave === p.clave);
        if (!match) {
          setErrorDetalle(
            `No se encontró el producto con clave '${p.clave}' en el catálogo. Verifica el inventario general.`
          );
          return;
        }
        items.push({ producto_id: match.id, clave: p.clave, producto: p.producto, cantidad: p.cantidad });
      }
      setEditProductos(items);
      setEditBusqueda("");
      setEditOpciones([]);
      setEditProductoSeleccionado(null);
      setEditCantidadNueva("");
      setErrorEditar(null);
      setModalDetalle(false);
      setModalEditar(true);
    } catch {
      setErrorDetalle("Error al cargar los datos para editar. Intenta de nuevo.");
    } finally {
      setCargandoEditar(false);
    }
  };

  const buscarProductosEditar = async (texto: string) => {
    setEditBusqueda(texto);
    if (!texto || texto.length < 2) { setEditOpciones([]); return; }
    try {
      setEditLoadingBusqueda(true);
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/inventario/inventario/buscar-autocomplete`,
        { params: { q: texto }, ...config }
      );
      setEditOpciones(res.data);
    } catch {
      // silent
    } finally {
      setEditLoadingBusqueda(false);
    }
  };

  const agregarProductoEditar = () => {
    if (!editProductoSeleccionado) return;
    const cantidad = parseInt(editCantidadNueva, 10);
    if (isNaN(cantidad) || cantidad <= 0) { alert("Cantidad inválida"); return; }
    setEditProductos((prev) => {
      const index = prev.findIndex((p) => p.producto_id === editProductoSeleccionado.id);
      if (index !== -1) {
        const copy = [...prev];
        copy[index] = { ...copy[index], cantidad: copy[index].cantidad + cantidad };
        return copy;
      }
      return [
        ...prev,
        {
          producto_id: editProductoSeleccionado.id,
          clave: editProductoSeleccionado.clave,
          producto: editProductoSeleccionado.producto,
          cantidad,
        },
      ];
    });
    setEditProductoSeleccionado(null);
    setEditBusqueda("");
    setEditCantidadNueva("");
    setEditOpciones([]);
  };

  const handleGuardarEdicion = async () => {
    if (!entradaDetalle) return;
    if (editProductos.length === 0) {
      setErrorEditar("La entrada debe tener al menos un producto.");
      return;
    }
    setGuardandoEdicion(true);
    setErrorEditar(null);
    try {
      await axios.put(
        `${process.env.REACT_APP_API_URL}/inventario/inventario/entradas/${entradaDetalle.id}`,
        { productos: editProductos.map((p) => ({ producto_id: p.producto_id, cantidad: p.cantidad })) },
        config
      );
      setModalEditar(false);
      setEntradaDetalle(null);
      buscarHistorial();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 400 && detail) {
        setErrorEditar(String(detail));
      } else if (err?.response?.status === 403) {
        setErrorEditar("No tienes permisos para editar entradas.");
      } else {
        setErrorEditar("Error al guardar los cambios.");
      }
    } finally {
      setGuardandoEdicion(false);
    }
  };

  // ── Derived state ────────────────────────────────────────────────────────────

  // Sort centralizado antes del render — el servidor devuelve sin orden garantizado
  const opcionesOrdenadas = [...opcionesProductos].sort((a, b) =>
    a.clave.localeCompare(b.clave, "es", { numeric: true, sensitivity: "base" })
  );
  const editOpcionesOrdenadas = [...editOpciones].sort((a, b) =>
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
        @page { size: letter; margin: 1cm; }
        .print-detalle { display: none; }
        .print-active-ticket { display: none; }
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; }
          .print-active-ticket { display: block !important; visibility: visible; }
          .print-active-ticket * { visibility: visible; }
          .print-detalle { display: block !important; }
          .print-detalle, .print-detalle * { visibility: visible; }
          .print-detalle { position: absolute; left: 0; top: 0; }
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
                        setErrorDetalle(null);
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
                            setErrorDetalle(null);
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
          <TicketImpresion
            folio={entradaDetalle.folio}
            fecha={formatFecha(entradaDetalle.fecha)}
            moduloNombreStr={entradaDetalle.modulo_nombre}
            encargadoNombre={encargadoDetalle?.nombre_completo ?? "-"}
            productos={entradaDetalle.productos}
          />
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

          {/* Ticket compacto — solo impresión */}
          <div className="print-active-ticket">
            <TicketImpresion
              folio={folioGuardado ?? ""}
              fecha={fechaHoy}
              moduloNombreStr={moduloNombre}
              encargadoNombre={encargado?.nombre_completo ?? "-"}
              productos={entradaLista}
            />
          </div>

          {/* Cabecera tipo documento */}
          <Paper
            elevation={0}
            className="no-print"
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
            <Paper elevation={0} className="no-print" sx={{ borderRadius: 2, overflow: "hidden", mb: 3 }}>
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
            {modulos
              .filter((m) =>
                !['v2', 'cadenas c.', 'mi2', 'bo', 'prueba'].includes(
                  m.nombre.trim().toLowerCase()
                )
              )
              .sort((a, b) =>
                a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
              )
              .map((m) => (
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

              {errorDetalle && (
                <Alert severity="error" sx={{ mt: 2 }} onClose={() => setErrorDetalle(null)}>
                  {errorDetalle}
                </Alert>
              )}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
              {currentUser?.is_admin && (
                <>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Delete />}
                    onClick={() => { setErrorDetalle(null); setModalConfirmEliminar(true); }}
                  >
                    Eliminar
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={cargandoEditar ? <CircularProgress size={16} color="inherit" /> : <Edit />}
                    onClick={abrirEditar}
                    disabled={cargandoEditar}
                  >
                    Editar
                  </Button>
                </>
              )}
              <Button
                variant="outlined"
                startIcon={<Print />}
                onClick={imprimirEntradaDetalle}
              >
                Imprimir
              </Button>
              <Button
                variant="contained"
                onClick={() => { setModalDetalle(false); setErrorDetalle(null); }}
              >
                Cerrar
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
      {/* ── Modal: confirmar eliminación ── */}
      <Dialog
        open={modalConfirmEliminar}
        onClose={() => !eliminandoEntrada && setModalConfirmEliminar(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Seguro que quieres eliminar la entrada{" "}
            <strong>{entradaDetalle?.folio}</strong>? Esto ajustará el inventario.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setModalConfirmEliminar(false)}
            color="inherit"
            disabled={eliminandoEntrada}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleEliminar}
            disabled={eliminandoEntrada}
            startIcon={
              eliminandoEntrada ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <Delete />
              )
            }
          >
            {eliminandoEntrada ? "Eliminando…" : "Confirmar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Modal: editar entrada ── */}
      <Dialog
        open={modalEditar}
        onClose={() => !guardandoEdicion && setModalEditar(false)}
        maxWidth="md"
        fullWidth
      >
        {entradaDetalle && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Box display="flex" alignItems="baseline" gap={2} flexWrap="wrap">
                <Typography variant="h5" fontWeight={700}>
                  Editar entrada
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight={800}
                  sx={{ color: "#f97316" }}
                >
                  {entradaDetalle.folio}
                </Typography>
              </Box>
            </DialogTitle>

            <DialogContent>
              {errorEditar && (
                <Alert
                  severity="error"
                  sx={{ mb: 2 }}
                  onClose={() => setErrorEditar(null)}
                >
                  {errorEditar}
                </Alert>
              )}

              {/* Lista editable de productos */}
              <Table size="small" sx={{ mb: 3 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Clave</TableCell>
                    <TableCell>Producto</TableCell>
                    <TableCell align="right" sx={{ width: 130 }}>
                      Cantidad
                    </TableCell>
                    <TableCell align="center" sx={{ width: 56 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {editProductos.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        align="center"
                        sx={{ color: "#64748b", py: 3 }}
                      >
                        Sin productos. Agrega al menos uno.
                      </TableCell>
                    </TableRow>
                  ) : (
                    editProductos.map((p, idx) => (
                      <TableRow key={idx}>
                        <TableCell sx={{ fontWeight: 600, color: "#f97316" }}>
                          {p.clave}
                        </TableCell>
                        <TableCell>{p.producto}</TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            size="small"
                            value={p.cantidad}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (isNaN(val) || val < 1) return;
                              setEditProductos((prev) => {
                                const copy = [...prev];
                                copy[idx] = { ...copy[idx], cantidad: val };
                                return copy;
                              });
                            }}
                            sx={{ width: 100 }}
                            inputProps={{ min: 1 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() =>
                              setEditProductos((prev) =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Agregar producto nuevo */}
              <Divider sx={{ mb: 2 }} />
              <Typography
                variant="subtitle2"
                fontWeight={700}
                mb={1.5}
                color="text.secondary"
              >
                Agregar producto
              </Typography>
              <Autocomplete
                options={editOpcionesOrdenadas}
                filterOptions={(x) => x}
                loading={editLoadingBusqueda}
                value={editProductoSeleccionado}
                inputValue={editBusqueda}
                onChange={(_, value) => setEditProductoSeleccionado(value)}
                onInputChange={(_, value) => buscarProductosEditar(value)}
                getOptionLabel={(option) => `${option.clave} - ${option.producto}`}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Buscar producto (clave o nombre)"
                    size="small"
                    fullWidth
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {editLoadingBusqueda && (
                            <CircularProgress size={16} />
                          )}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
              {editProductoSeleccionado && (
                <Box display="flex" alignItems="center" gap={2} mt={1.5} flexWrap="wrap">
                  <Typography variant="body2" flex={1}>
                    {editProductoSeleccionado.clave} —{" "}
                    {editProductoSeleccionado.producto}
                  </Typography>
                  <TextField
                    label="Cantidad"
                    type="number"
                    size="small"
                    value={editCantidadNueva}
                    onChange={(e) => setEditCantidadNueva(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        agregarProductoEditar();
                      }
                    }}
                    sx={{ width: 110 }}
                    inputProps={{ min: 1 }}
                  />
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<Add />}
                    onClick={agregarProductoEditar}
                    size="small"
                  >
                    Agregar
                  </Button>
                </Box>
              )}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
              <Button
                onClick={() => { if (!guardandoEdicion) setModalEditar(false); }}
                color="inherit"
                disabled={guardandoEdicion}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={handleGuardarEdicion}
                disabled={guardandoEdicion || editProductos.length === 0}
                startIcon={
                  guardandoEdicion ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <Save />
                  )
                }
              >
                {guardandoEdicion ? "Guardando…" : "Guardar cambios"}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

    </Box>
  );
};

export default EntradaMercancia;
