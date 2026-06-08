import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, Autocomplete, Box, Button, Checkbox, Chip, CircularProgress, Container,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  Divider, IconButton, MenuItem, Paper, Tab, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tabs, TextField, Typography,
} from "@mui/material";
import {
  AddCircle, CheckCircle, CloudUpload, Delete, Error as ErrorIcon,
  FileDownload, HelpOutline, QueryStats, Refresh, Visibility,
} from "@mui/icons-material";
import axios from "axios";
import * as XLSX from "xlsx";
import { Modulo } from "../Types";

const BASE = "https://ato-appservidor-nvxt.onrender.com";
const headSx = { py: "4px", px: "6px", fontSize: 13, fontWeight: 700 };
const cellSx = { py: "2px", px: "6px", fontSize: 13 };

// ── Types ──────────────────────────────────────────────────────────────────────

interface ItemActualizar {
  clave: string; producto: string;
  cantidad_actual: number; cantidad_nueva: number; diferencia: number;
}
interface ItemCrear    { clave: string; producto: string; cantidad: number; }
interface ItemDecision { clave: string; producto: string; cantidad_actual: number; }
interface ErrorItem    { fila: number; clave: string; motivo: string; }

interface MetadatosConteo {
  archivo_nombre: string; filas_totales: number;
  fila_encabezado: number;
  columna_clave: string; columna_nombre: string; columna_cantidad: string;
  filas_ignoradas_vacias: number; filas_validas: number;
  negativos_convertidos_a_cero: number;
}
interface Preview {
  modulo_id: number; modulo_nombre: string;
  total_filas_excel: number; advertencia_volumen: boolean;
  para_actualizar: ItemActualizar[];
  para_crear: ItemCrear[];
  decidir_caso_por_caso: ItemDecision[];
  errores: ErrorItem[];
  metadatos: MetadatosConteo;
}

interface ConteoItem {
  id: number; clave: string; producto: string;
  cantidad_anterior: number; cantidad_nueva: number;
  accion: string; producto_creado: boolean;
}
interface ConteoListItem {
  id: number; folio: string; modulo: string; fecha: string;
  usuario?: string; archivo_nombre?: string; total_filas?: number;
  productos_actualizados?: number; productos_creados?: number;
  productos_en_cero?: number; estado: string; notas?: string;
}
interface ConteoDetalle extends ConteoListItem { items: ConteoItem[]; }

interface ProductoModulo { id: number; clave: string; producto: string; precio?: number; }
interface FilaCaptura   { id: number; clave: string; producto: string; cantidad: number; }

interface KardexLinea {
  fecha: string; tipo: string;
  entrada: number; salida: number; existencia: number;
}
interface KardexConteoAnterior { folio: string; fecha: string; saldo_inicial: number; }
interface KardexData {
  clave: string; producto: string; modulo: string;
  tiene_comparativo: boolean;
  conteo_anterior: KardexConteoAnterior | null;
  movimientos: KardexLinea[];
  total_entradas: number; total_salidas: number;
  saldo_calculado: number | null;
  contado: number;
  diferencia: number | null;
}

// ── Component ──────────────────────────────────────────────────────────────────

const ConteosFisicos = () => {
  const token  = localStorage.getItem("token");
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const esAdmin = localStorage.getItem("rol") === "admin";

  // Upload
  const [modulos, setModulos]         = useState<Modulo[]>([]);
  const [moduloId, setModuloId]       = useState<number | "">("");
  const [archivo, setArchivo]         = useState<File | null>(null);
  const [dragging, setDragging]       = useState(false);
  const [errorMsg, setErrorMsg]       = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Procesar
  const [procesando, setProcesando]   = useState(false);
  const [preview, setPreview]         = useState<Preview | null>(null);
  const [tabIdx, setTabIdx]           = useState(0);
  const [enCero, setEnCero]           = useState<Set<string>>(new Set());

  // Aplicar
  const [aplicando, setAplicando]     = useState(false);
  const [exitoMsg, setExitoMsg]       = useState<string | null>(null);

  // Historial
  const [historial, setHistorial]     = useState<ConteoListItem[]>([]);
  const [cargandoHist, setCargandoHist] = useState(false);
  const [filtroModulo, setFiltroModulo] = useState("");

  // Detalle modal
  const [detalle, setDetalle]         = useState<ConteoDetalle | null>(null);
  const [modalDetalle, setModalDetalle] = useState(false);
  const [cargandoDet, setCargandoDet] = useState(false);
  const [soloDescuadres, setSoloDescuadres] = useState(false);

  // Revertir
  const [confirmFolio, setConfirmFolio]   = useState<string | null>(null);
  const [revirtiendoFolio, setRevirtiendoFolio] = useState<string | null>(null);

  // Captura manual
  const [modoCaptura, setModoCaptura]     = useState<"excel" | "manual">("excel");
  const [catalogoGeneral, setCatalogoGeneral] = useState<ProductoModulo[]>([]);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false);
  const [busquedaInput, setBusquedaInput]       = useState("");
  const cantInputRef  = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [prodSel, setProdSel]             = useState<ProductoModulo | null>(null);
  const [cantInput, setCantInput]         = useState<string>("");
  const [filasCaptura, setFilasCaptura]   = useState<FilaCaptura[]>([]);

  // Kardex modal
  const [kardexOpen, setKardexOpen]       = useState(false);
  const [kardexLoading, setKardexLoading] = useState(false);
  const [kardexData, setKardexData]       = useState<KardexData | null>(null);

  // Congelar módulo
  const [estadoCongelado, setEstadoCongelado] = useState<{id: number, nombre: string, congelado: boolean}[]>([]);
  const [congelando, setCongelando]           = useState(false);
  const [confirmCongelarOpen, setConfirmCongelarOpen] = useState(false);
  const [descargandoCongelados, setDescargandoCongelados] = useState(false);

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    axios.get(`${BASE}/registro/modulos`, config)
      .then(r => setModulos(r.data))
      .catch(() => {});
    cargarHistorial();
    axios.get(`${BASE}/conteos-fisicos/modulos/estado-congelado`, config)
      .then(r => setEstadoCongelado(r.data))
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (modoCaptura !== "manual" || catalogoGeneral.length > 0) return;
    setCargandoCatalogo(true);
    axios.get(`${BASE}/inventario/inventario/general`, config)
      .then(r => setCatalogoGeneral(r.data))
      .catch(() => {})
      .finally(() => setCargandoCatalogo(false));
  }, [modoCaptura]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ────────────────────────────────────────────────────────────────

  const cargarHistorial = async () => {
    setCargandoHist(true);
    try {
      const r = await axios.get(`${BASE}/conteos-fisicos`, config);
      setHistorial(r.data);
    } catch { /* silencioso */ }
    finally { setCargandoHist(false); }
  };

  const validarArchivo = (file: File): boolean => {
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setErrorMsg("Solo se aceptan archivos .xlsx"); return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("El archivo supera los 10 MB"); return false;
    }
    return true;
  };

  const seleccionarArchivo = (file: File) => {
    setErrorMsg(null);
    if (!validarArchivo(file)) return;
    setArchivo(file);
    setPreview(null);
    setExitoMsg(null);
  };

  const toggleEnCero = (clave: string) => {
    setEnCero(prev => {
      const next = new Set(prev);
      next.has(clave) ? next.delete(clave) : next.add(clave);
      return next;
    });
  };

  const toggleTodos = () => {
    if (!preview) return;
    const todas = preview.decidir_caso_por_caso.map(i => i.clave);
    setEnCero(enCero.size === todas.length ? new Set() : new Set(todas));
  };

  // ── Acciones API ───────────────────────────────────────────────────────────

  const handleProcesar = async () => {
    if (!moduloId || !archivo) return;
    setProcesando(true);
    setErrorMsg(null);
    setPreview(null);
    try {
      const form = new FormData();
      form.append("modulo_id", String(moduloId));
      form.append("archivo", archivo);
      const r = await axios.post(`${BASE}/conteos-fisicos/procesar`, form, config);
      setPreview(r.data);
      setEnCero(new Set());
      setTabIdx(0);
    } catch (e: any) {
      setErrorMsg(e.response?.data?.detail ?? "Error al procesar el archivo");
    } finally { setProcesando(false); }
  };

  const handleAplicar = async () => {
    if (!preview || (!archivo && modoCaptura === "excel")) return;
    setAplicando(true);
    setErrorMsg(null);
    try {
      const body = {
        modulo_id:          preview.modulo_id,
        archivo_nombre:     archivo?.name ?? "captura_manual.xlsx",
        total_filas_excel:  preview.total_filas_excel,
        para_actualizar:    preview.para_actualizar.map(i => ({
          clave: i.clave, producto: i.producto, cantidad_nueva: i.cantidad_nueva,
        })),
        para_crear: preview.para_crear,
        caso_por_caso: preview.decidir_caso_por_caso.map(i => ({
          clave: i.clave, producto: i.producto, poner_en_cero: enCero.has(i.clave),
        })),
      };
      const r = await axios.post(`${BASE}/conteos-fisicos/aplicar`, body, config);
      const d = r.data;
      setExitoMsg(
        `✅ ${d.folio} aplicado — ${d.productos_actualizados} actualizados, ` +
        `${d.productos_creados} creados, ${d.productos_en_cero} puestos en 0`
      );
      setPreview(null);
      setArchivo(null);
      setModuloId("");
      cargarHistorial();
    } catch (e: any) {
      const status  = e.response?.status;
      const detalle = e.response?.data?.detail;
      if (status === 502 || status === 503 || status === 504 || !status) {
        setErrorMsg(
          "El servidor tardó demasiado en responder (timeout). " +
          "Espera unos segundos y vuelve a intentar. " +
          "Si el error persiste, contacta al administrador."
        );
      } else {
        setErrorMsg(
          detalle
            ? `Error ${status}: ${detalle}`
            : `Error inesperado (${status ?? "sin conexión"}) al aplicar el conteo.`
        );
      }
    } finally { setAplicando(false); }
  };

  const handleVerDetalle = async (folio: string) => {
    setCargandoDet(true);
    setDetalle(null);
    setModalDetalle(true);
    setSoloDescuadres(false);
    try {
      const r = await axios.get(`${BASE}/conteos-fisicos/${folio}/detalle`, config);
      setDetalle(r.data);
    } catch { setDetalle(null); }
    finally { setCargandoDet(false); }
  };

  const handleRevertir = async () => {
    if (!confirmFolio) return;
    const folio = confirmFolio;
    setConfirmFolio(null);
    setRevirtiendoFolio(folio);
    try {
      await axios.post(`${BASE}/conteos-fisicos/${folio}/revertir`, {}, config);
      cargarHistorial();
    } catch (e: any) {
      alert(e.response?.data?.detail ?? "Error al revertir el conteo");
    } finally { setRevirtiendoFolio(null); }
  };

  const handleAgregarFila = () => {
    if (!prodSel || !cantInput) return;
    const cant = parseInt(cantInput, 10);
    if (isNaN(cant) || cant < 0) return;
    setFilasCaptura(prev => [...prev, { id: Date.now(), clave: prodSel.clave, producto: prodSel.producto, cantidad: cant }]);
    setProdSel(null);
    setCantInput("");
    setBusquedaInput("");
    setTimeout(() => searchInputRef.current?.focus(), 0);
  };

  const handleEliminarFila = (id: number) => {
    setFilasCaptura(prev => prev.filter(f => f.id !== id));
  };

  const handleProcesarCaptura = async () => {
    if (!moduloId || filasCaptura.length === 0) return;
    setProcesando(true);
    setErrorMsg(null);
    setPreview(null);
    try {
      const agrupado = filasCaptura.reduce<Record<string, { producto: string; cantidad: number }>>((acc, f) => {
        if (acc[f.clave]) { acc[f.clave].cantidad += f.cantidad; }
        else { acc[f.clave] = { producto: f.producto, cantidad: f.cantidad }; }
        return acc;
      }, {});
      const datos = Object.entries(agrupado).map(([clave, { producto, cantidad }]) => [clave, producto, cantidad]);
      const ws = XLSX.utils.aoa_to_sheet(datos);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Conteo");
      const wbout: ArrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const file = new File([blob], "captura_manual.xlsx", { type: blob.type });
      const form = new FormData();
      form.append("modulo_id", String(moduloId));
      form.append("archivo", file);
      const r = await axios.post(`${BASE}/conteos-fisicos/procesar`, form, config);
      setPreview(r.data);
      setTabIdx(0);
    } catch (e: any) {
      setErrorMsg(e.response?.data?.detail ?? "Error al procesar la captura manual");
    } finally {
      setProcesando(false);
    }
  };

  const handleVerKardex = async (clave: string) => {
    if (!detalle) return;
    setKardexData(null);
    setKardexLoading(true);
    setKardexOpen(true);
    try {
      const r = await axios.get(`${BASE}/conteos-fisicos/${detalle.folio}/kardex/${clave}`, config);
      setKardexData(r.data);
    } catch { setKardexData(null); }
    finally { setKardexLoading(false); }
  };

  const handleDescargarExcelKardex = () => {
    if (!kardexData || !detalle) return;
    const encabezado = [
      ["Producto", kardexData.producto, "", "Clave", kardexData.clave, "", "Módulo", kardexData.modulo, "", "Folio", detalle.folio],
      [],
      ["Fecha", "Tipo", "Entrada", "Salida", "Existencia"],
    ];
    const datos = kardexData.movimientos.map(m => [
      new Date(m.fecha).toLocaleString("es-MX"),
      m.tipo,
      m.entrada,
      m.salida,
      m.existencia,
    ]);
    const ws = XLSX.utils.aoa_to_sheet([...encabezado, ...datos]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kardex");
    XLSX.writeFile(wb, `Kardex_${detalle.folio}_${kardexData.clave}.xlsx`);
  };

  const handleDescargarExcel = () => {
    if (!detalle) return;
    const filas = resumenDetalle.items;
    const fechaStr = new Date(detalle.fecha).toLocaleString("es-MX");
    const encabezado = [
      ["Folio", detalle.folio, "", "Módulo", detalle.modulo, "", "Fecha", fechaStr],
      [],
      ["Clave", "Producto", "Anterior", "Nueva", "Diferencia", "Estado"],
    ];
    const datos = filas.map(i => {
      const dif = i.diferencia;
      const estado = dif === 0 ? "Cuadra" : dif < 0 ? "Falta" : "Sobra";
      return [i.clave, i.producto, i.cantidad_anterior, i.cantidad_nueva, dif, estado];
    });
    const ws = XLSX.utils.aoa_to_sheet([...encabezado, ...datos]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Conteo");
    const nombre = `Conteo_${detalle.folio}_${detalle.modulo}.xlsx`;
    XLSX.writeFile(wb, nombre);
  };

  const handleCongelar = async () => {
    if (!moduloId) return;
    setCongelando(true);
    try {
      await axios.post(`${BASE}/conteos-fisicos/modulos/${moduloId}/congelar`, {}, config);
      setEstadoCongelado(prev => prev.map(m => m.id === moduloId ? { ...m, congelado: true } : m));
      setExitoMsg("Módulo congelado. Las ventas están bloqueadas mientras cuentas.");
    } catch {
      setErrorMsg("Error al congelar el módulo.");
    } finally {
      setCongelando(false);
      setConfirmCongelarOpen(false);
    }
  };

  const handleDescongelar = async () => {
    if (!moduloId) return;
    setCongelando(true);
    try {
      await axios.post(`${BASE}/conteos-fisicos/modulos/${moduloId}/descongelar`, {}, config);
      setEstadoCongelado(prev => prev.map(m => m.id === moduloId ? { ...m, congelado: false } : m));
      setExitoMsg("Módulo descongelado. Las ventas están habilitadas.");
    } catch {
      setErrorMsg("Error al descongelar el módulo.");
    } finally {
      setCongelando(false);
    }
  };

  const handleDescargarCongelados = async () => {
    if (!moduloId) return;
    setDescargandoCongelados(true);
    try {
      const r = await axios.get(
        `${BASE}/inventario/inventario/modulo?modulo_id=${moduloId}`,
        config,
      );
      const productos: { clave: string; producto: string; cantidad: number }[] = r.data;
      const nombreModulo = moduloSeleccionado?.nombre ?? String(moduloId);
      const fechaStr = new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" });
      const encabezado = [`Productos congelados - Módulo ${nombreModulo} - Fecha ${fechaStr}`];
      const cabeceras = ["Clave", "Producto", "Existencia actual"];
      const filas = productos.map(p => [p.clave, p.producto, p.cantidad]);
      const ws = XLSX.utils.aoa_to_sheet([encabezado, [], cabeceras, ...filas]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Congelados");
      XLSX.writeFile(wb, `Congelados_${nombreModulo}.xlsx`);
    } catch {
      setErrorMsg("Error al descargar los productos del módulo.");
    } finally {
      setDescargandoCongelados(false);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const moduloSeleccionado = estadoCongelado.find(m => m.id === moduloId);
  const estaCongelado = moduloSeleccionado?.congelado ?? false;

  const totalCambios = preview
    ? preview.para_actualizar.length + preview.para_crear.length + enCero.size
    : 0;
  const hayAlgoQueAplicar = totalCambios > 0;

  const historialFiltrado = filtroModulo
    ? historial.filter(c => c.modulo.toLowerCase().includes(filtroModulo.toLowerCase()))
    : historial;

  const accionColor = (accion: string) => {
    if (accion === "creado")         return "info";
    if (accion === "puesto_en_cero") return "error";
    if (accion === "conservado")     return "default";
    return "success";
  };

  const opcionesBusqueda = useMemo(() => {
    if (busquedaInput.length < 2) return [];
    const q = busquedaInput.toLowerCase();
    const grupoA = catalogoGeneral.filter(p => p.clave.toLowerCase().startsWith(q));
    const grupoB = catalogoGeneral.filter(p => !p.clave.toLowerCase().startsWith(q) && p.producto.toLowerCase().includes(q));
    return [...grupoA, ...grupoB];
  }, [busquedaInput, catalogoGeneral]);

  const resumenDetalle = useMemo(() => {
    if (!detalle) return { cuadran: 0, faltantes: 0, sobrantes: 0, items: [] as (ConteoItem & { diferencia: number })[] };
    const items = detalle.items.map(i => ({
      ...i,
      diferencia: (i.cantidad_nueva ?? 0) - (i.cantidad_anterior ?? 0),
    }));
    return {
      cuadran:   items.filter(i => i.diferencia === 0).length,
      faltantes: items.filter(i => i.diferencia < 0).length,
      sobrantes: items.filter(i => i.diferencia > 0).length,
      items: soloDescuadres ? items.filter(i => i.diferencia !== 0) : items,
    };
  }, [detalle, soloDescuadres]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, color: "#1e293b", mb: 3 }}>
        Conteos Físicos
      </Typography>

      {exitoMsg && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setExitoMsg(null)}>
          {exitoMsg}
        </Alert>
      )}

      {/* ─── SECCIÓN 1: NUEVA IMPORTACIÓN ──────────────────────────────────── */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Nueva importación</Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              size="small"
              variant={modoCaptura === "excel" ? "contained" : "outlined"}
              onClick={() => setModoCaptura("excel")}
              sx={{ fontSize: 12, ...(modoCaptura === "excel" ? { bgcolor: "#f97316", "&:hover": { bgcolor: "#ea6c10" } } : {}) }}
            >
              Subir Excel
            </Button>
            <Button
              size="small"
              variant={modoCaptura === "manual" ? "contained" : "outlined"}
              onClick={() => setModoCaptura("manual")}
              sx={{ fontSize: 12, ...(modoCaptura === "manual" ? { bgcolor: "#f97316", "&:hover": { bgcolor: "#ea6c10" } } : {}) }}
            >
              Captura manual
            </Button>
          </Box>
        </Box>

        <TextField
          select label="Módulo destino" value={moduloId} size="small"
          sx={{ minWidth: 260, mb: 1, display: "block" }}
          onChange={e => { setModuloId(Number(e.target.value)); setPreview(null); setFilasCaptura([]); }}
        >
          {modulos.map(m => <MenuItem key={m.id} value={m.id}>{m.nombre}</MenuItem>)}
        </TextField>

        {moduloId !== "" && esAdmin && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            {estaCongelado ? (
              <>
                <Chip label="CONGELADO" color="error" size="small" />
                <Button size="small" variant="outlined" color="success"
                  disabled={congelando}
                  onClick={handleDescongelar}
                  sx={{ minWidth: 120 }}>
                  {congelando ? <CircularProgress size={14} /> : "Descongelar"}
                </Button>
                <Button size="small" variant="outlined" color="info"
                  disabled={descargandoCongelados}
                  onClick={handleDescargarCongelados}
                  sx={{ minWidth: 170 }}>
                  {descargandoCongelados ? <CircularProgress size={14} /> : "Productos congelados"}
                </Button>
              </>
            ) : (
              <Button size="small" variant="outlined" color="warning"
                disabled={congelando}
                onClick={() => setConfirmCongelarOpen(true)}
                sx={{ minWidth: 150 }}>
                {congelando ? <CircularProgress size={14} /> : "Congelar módulo"}
              </Button>
            )}
          </Box>
        )}

        {modoCaptura === "excel" ? (
          <>
            {/* Drag & Drop Zone */}
            <Box
              sx={{
                border: `2px dashed ${dragging ? "#f97316" : "#94a3b8"}`,
                borderRadius: 2, p: 4, textAlign: "center", cursor: "pointer",
                bgcolor: dragging ? "rgba(249,115,22,0.05)" : "#f8fafc",
                transition: "border-color 0.2s, background-color 0.2s",
                mb: 2, userSelect: "none",
              }}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) seleccionarArchivo(f); }}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef} type="file" accept=".xlsx" hidden
                onChange={e => { const f = e.target.files?.[0]; if (f) seleccionarArchivo(f); e.target.value = ""; }}
              />
              <CloudUpload sx={{ fontSize: 48, color: dragging ? "#f97316" : "#94a3b8", mb: 1 }} />
              {archivo ? (
                <Typography sx={{ fontWeight: 700, color: "#f97316" }}>
                  📄 {archivo.name}{"  "}
                  <span style={{ color: "#64748b", fontWeight: 400 }}>
                    ({(archivo.size / 1024).toFixed(1)} KB)
                  </span>
                </Typography>
              ) : (
                <>
                  <Typography sx={{ fontWeight: 600, color: "#475569" }}>
                    Arrastra tu archivo .xlsx aquí
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    o haz clic para seleccionarlo · máx. 10 MB
                  </Typography>
                </>
              )}
            </Box>

            {errorMsg && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg(null)}>
                {errorMsg}
              </Alert>
            )}

            <Button
              variant="contained"
              disabled={!moduloId || !archivo || procesando}
              onClick={handleProcesar}
              sx={{ bgcolor: "#f97316", "&:hover": { bgcolor: "#ea6c10" } }}
              startIcon={procesando ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {procesando ? "Procesando…" : "Procesar archivo"}
            </Button>
          </>
        ) : (
          <>
            {/* ── Captura manual ── */}
            {!moduloId ? (
              <Alert severity="info" sx={{ mb: 2 }}>Selecciona un módulo destino para continuar.</Alert>
            ) : (
              <>
                <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", mb: 2, flexWrap: "wrap" }}>
                  <Autocomplete
                    options={opcionesBusqueda}
                    getOptionLabel={o => o.clave}
                    filterOptions={(x) => x}
                    autoHighlight
                    value={prodSel}
                    onChange={(_, v) => {
                      setProdSel(v);
                      if (v) setTimeout(() => cantInputRef.current?.focus(), 0);
                    }}
                    inputValue={busquedaInput}
                    onInputChange={(_, val) => setBusquedaInput(val)}
                    loading={cargandoCatalogo}
                    renderInput={params => (
                      <TextField
                        {...params}
                        inputRef={searchInputRef}
                        label="Buscar por clave o nombre"
                        size="small"
                        sx={{ minWidth: 320 }}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {cargandoCatalogo ? <CircularProgress size={14} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                    noOptionsText={cargandoCatalogo ? "Cargando catálogo…" : busquedaInput.length < 2 ? "Escribe al menos 2 caracteres" : "Sin coincidencias"}
                    isOptionEqualToValue={(o, v) => o.clave === v.clave}
                    renderOption={(props, o) => (
                      <li {...props} key={o.clave} style={{ padding: "4px 12px" }}>
                        <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75, width: "100%", overflow: "hidden" }}>
                          <Typography sx={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", flexShrink: 0, color: "#f97316" }}>
                            {o.clave}
                          </Typography>
                          <Typography sx={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#475569" }}>
                            {o.producto}
                          </Typography>
                        </Box>
                      </li>
                    )}
                    slotProps={{ paper: { sx: { minWidth: 460 } } }}
                  />
                  <TextField
                    label="Cantidad" size="small" type="number"
                    value={cantInput}
                    onChange={e => setCantInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleAgregarFila(); }}
                    inputRef={cantInputRef}
                    sx={{ width: 110 }}
                    inputProps={{ min: 0 }}
                  />
                  <Button
                    variant="contained" size="small"
                    disabled={!prodSel || cantInput === "" || parseInt(cantInput, 10) < 0}
                    onClick={handleAgregarFila}
                    startIcon={<AddCircle sx={{ fontSize: 16 }} />}
                    sx={{ bgcolor: "#f97316", "&:hover": { bgcolor: "#ea6c10" }, height: 40 }}
                  >
                    Agregar
                  </Button>
                </Box>

                {filasCaptura.length > 0 && (
                  <>
                    <TableContainer sx={{ mb: 2, maxHeight: 320 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={headSx}>Clave</TableCell>
                            <TableCell sx={headSx}>Producto</TableCell>
                            <TableCell sx={{ ...headSx, textAlign: "right" }}>Cantidad</TableCell>
                            <TableCell sx={headSx}></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filasCaptura.map(f => (
                            <TableRow key={f.id}>
                              <TableCell sx={{ ...cellSx, fontWeight: 700, color: "#f97316" }}>{f.clave}</TableCell>
                              <TableCell sx={cellSx}>{f.producto}</TableCell>
                              <TableCell sx={{ ...cellSx, textAlign: "right", fontWeight: 700 }}>{f.cantidad}</TableCell>
                              <TableCell sx={cellSx}>
                                <IconButton size="small" color="error" onClick={() => handleEliminarFila(f.id)}>
                                  <Delete fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      {filasCaptura.length} línea(s) · {filasCaptura.reduce((s, f) => s + f.cantidad, 0)} unidades · {new Set(filasCaptura.map(f => f.clave)).size} claves únicas
                    </Typography>
                  </>
                )}

                {errorMsg && (
                  <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg(null)}>
                    {errorMsg}
                  </Alert>
                )}

                <Button
                  variant="contained"
                  disabled={!moduloId || filasCaptura.length === 0 || procesando}
                  onClick={handleProcesarCaptura}
                  sx={{ bgcolor: "#f97316", "&:hover": { bgcolor: "#ea6c10" } }}
                  startIcon={procesando ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                  {procesando ? "Procesando…" : `Procesar captura (${filasCaptura.length} productos)`}
                </Button>
              </>
            )}
          </>
        )}
      </Paper>

      {/* ─── SECCIÓN 2: VISTA PREVIA ─────────────────────────────────────── */}
      {preview && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2, flexWrap: "wrap" }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Vista previa — {preview.modulo_nombre}
            </Typography>
            <Chip label={`${preview.total_filas_excel} filas en Excel`} size="small" variant="outlined" />
            {preview.advertencia_volumen && (
              <Chip label="⚠ Archivo grande (>5 000 filas)" color="warning" size="small" />
            )}
          </Box>

          {/* Panel de metadatos del archivo — solo si el backend los devuelve */}
          {preview.metadatos && modoCaptura === "excel" && (
            <>
              <Alert
                severity="info" icon={false}
                sx={{ mb: preview.metadatos.negativos_convertidos_a_cero > 0 ? 1 : 2,
                      py: 0.5, px: 1.5, fontSize: 13 }}
              >
                <strong>{preview.metadatos.archivo_nombre}</strong>
                {" — "}
                {preview.metadatos.filas_validas} productos detectados
                {" · "}
                encabezado en fila {preview.metadatos.fila_encabezado}
                {" · "}
                columnas&nbsp;
                {preview.metadatos.columna_clave}/
                {preview.metadatos.columna_nombre}/
                {preview.metadatos.columna_cantidad}
                {preview.metadatos.filas_ignoradas_vacias > 0 && (
                  <> · {preview.metadatos.filas_ignoradas_vacias} filas vacías ignoradas</>
                )}
              </Alert>

              {preview.metadatos.negativos_convertidos_a_cero > 0 && (
                <Alert severity="warning" icon={false}
                  sx={{ mb: 2, py: 0.5, px: 1.5, fontSize: 13 }}
                >
                  {preview.metadatos.negativos_convertidos_a_cero} producto(s) venían con cantidad
                  negativa — se convertirán a 0 al aplicar.
                </Alert>
              )}
            </>
          )}

          <Tabs
            value={tabIdx}
            onChange={(_, v) => setTabIdx(v)}
            sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
          >
            <Tab label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <CheckCircle sx={{ fontSize: 15, color: "#16a34a" }} />
                Actualizar ({preview.para_actualizar.length})
              </Box>
            } />
            <Tab label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <AddCircle sx={{ fontSize: 15, color: "#2563eb" }} />
                Crear ({preview.para_crear.length})
              </Box>
            } />
            <Tab label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <HelpOutline sx={{ fontSize: 15, color: "#f97316" }} />
                Decidir ({preview.decidir_caso_por_caso.length})
              </Box>
            } />
            <Tab label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <ErrorIcon sx={{ fontSize: 15, color: "#dc2626" }} />
                Errores ({preview.errores.length})
              </Box>
            } />
          </Tabs>

          {/* Tab 0 — Actualizar */}
          {tabIdx === 0 && (
            preview.para_actualizar.length === 0
              ? <Typography color="text.secondary" sx={{ py: 1 }}>Sin productos para actualizar.</Typography>
              : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={headSx}>Clave</TableCell>
                        <TableCell sx={headSx}>Producto</TableCell>
                        <TableCell sx={{ ...headSx, textAlign: "right" }}>Actual</TableCell>
                        <TableCell sx={{ ...headSx, textAlign: "right" }}>Excel</TableCell>
                        <TableCell sx={{ ...headSx, textAlign: "right" }}>Diferencia</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {preview.para_actualizar.map(i => (
                        <TableRow key={i.clave}>
                          <TableCell sx={cellSx}>{i.clave}</TableCell>
                          <TableCell sx={cellSx}>{i.producto}</TableCell>
                          <TableCell sx={{ ...cellSx, textAlign: "right" }}>{i.cantidad_actual}</TableCell>
                          <TableCell sx={{ ...cellSx, textAlign: "right", fontWeight: 600 }}>{i.cantidad_nueva}</TableCell>
                          <TableCell sx={{
                            ...cellSx, textAlign: "right", fontWeight: 700,
                            color: i.diferencia > 0 ? "#16a34a" : i.diferencia < 0 ? "#dc2626" : "#64748b",
                          }}>
                            {i.diferencia > 0 ? `+${i.diferencia}` : i.diferencia}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )
          )}

          {/* Tab 1 — Crear */}
          {tabIdx === 1 && (
            preview.para_crear.length === 0
              ? <Typography color="text.secondary" sx={{ py: 1 }}>Sin productos nuevos para crear.</Typography>
              : (
                <>
                  <Alert severity="info" sx={{ mb: 1 }}>
                    Estos productos se crearán <strong>sin precio</strong>. Edita el precio en Inventario después de importar.
                  </Alert>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={headSx}>Clave</TableCell>
                          <TableCell sx={headSx}>Producto</TableCell>
                          <TableCell sx={{ ...headSx, textAlign: "right" }}>Cantidad</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {preview.para_crear.map(i => (
                          <TableRow key={i.clave}>
                            <TableCell sx={cellSx}>{i.clave}</TableCell>
                            <TableCell sx={cellSx}>{i.producto}</TableCell>
                            <TableCell sx={{ ...cellSx, textAlign: "right", fontWeight: 600 }}>{i.cantidad}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )
          )}

          {/* Tab 2 — Decidir caso por caso */}
          {tabIdx === 2 && (
            preview.decidir_caso_por_caso.length === 0
              ? <Typography color="text.secondary" sx={{ py: 1 }}>No hay productos con stock fuera del Excel.</Typography>
              : (
                <>
                  <Alert severity="warning" sx={{ mb: 1 }}>
                    Estos productos tienen stock en el módulo pero <strong>no aparecen en el Excel</strong>.
                    Marca los que quieras poner en 0. Los desmarcados se conservan tal como están.
                  </Alert>
                  <Box sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                    <Button size="small" variant="outlined" onClick={toggleTodos} sx={{ fontSize: 12 }}>
                      {enCero.size === preview.decidir_caso_por_caso.length ? "Desmarcar todos" : "Seleccionar todos"}
                    </Button>
                    {enCero.size > 0 && (
                      <Chip
                        label={`${enCero.size} para poner en 0`}
                        color="warning" size="small"
                      />
                    )}
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ ...headSx, width: 56 }}>Poner en 0</TableCell>
                          <TableCell sx={headSx}>Clave</TableCell>
                          <TableCell sx={headSx}>Producto</TableCell>
                          <TableCell sx={{ ...headSx, textAlign: "right" }}>Stock actual</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {preview.decidir_caso_por_caso.map(i => (
                          <TableRow key={i.clave} sx={{ bgcolor: enCero.has(i.clave) ? "#fff7ed" : "inherit" }}>
                            <TableCell sx={cellSx}>
                              <Checkbox
                                size="small"
                                checked={enCero.has(i.clave)}
                                onChange={() => toggleEnCero(i.clave)}
                                sx={{ p: 0.5, color: "#f97316", "&.Mui-checked": { color: "#f97316" } }}
                              />
                            </TableCell>
                            <TableCell sx={cellSx}>{i.clave}</TableCell>
                            <TableCell sx={cellSx}>{i.producto}</TableCell>
                            <TableCell sx={{ ...cellSx, textAlign: "right", fontWeight: 600 }}>{i.cantidad_actual}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )
          )}

          {/* Tab 3 — Errores */}
          {tabIdx === 3 && (
            preview.errores.length === 0
              ? <Alert severity="success">Sin errores en el archivo. ✓</Alert>
              : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ ...headSx, width: 60 }}>Fila</TableCell>
                        <TableCell sx={headSx}>Clave</TableCell>
                        <TableCell sx={headSx}>Motivo</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {preview.errores.map((e, idx) => (
                        <TableRow key={idx}>
                          <TableCell sx={{ ...cellSx, fontWeight: 700, color: "#dc2626" }}>{e.fila}</TableCell>
                          <TableCell sx={cellSx}>{e.clave}</TableCell>
                          <TableCell sx={{ ...cellSx, color: "#dc2626" }}>{e.motivo}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )
          )}

          <Divider sx={{ my: 2 }} />

          <Button
            variant="contained" size="large"
            disabled={!hayAlgoQueAplicar || aplicando}
            onClick={handleAplicar}
            sx={{
              bgcolor: "#f97316", "&:hover": { bgcolor: "#ea6c10" },
              "&.Mui-disabled": { bgcolor: "#e2e8f0" },
            }}
            startIcon={aplicando ? <CircularProgress size={18} color="inherit" /> : undefined}
          >
            {aplicando ? "Aplicando…" : `Aplicar importación (${totalCambios} cambios)`}
          </Button>

          {preview.errores.length > 0 && (
            <Typography variant="body2" sx={{ mt: 1, color: "#64748b" }}>
              {preview.errores.length} fila(s) con error serán omitidas.
            </Typography>
          )}
        </Paper>
      )}

      {/* ─── SECCIÓN 3: HISTORIAL ───────────────────────────────────────────── */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Historial de conteos</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TextField
              size="small" placeholder="Filtrar por módulo…"
              value={filtroModulo}
              onChange={e => setFiltroModulo(e.target.value)}
              sx={{ width: 180 }}
              inputProps={{ style: { fontSize: 13 } }}
            />
            <Button
              size="small" startIcon={<Refresh />}
              onClick={cargarHistorial} disabled={cargandoHist}
            >
              Actualizar
            </Button>
          </Box>
        </Box>

        {cargandoHist ? (
          <CircularProgress size={24} />
        ) : historial.length === 0 ? (
          <Typography color="text.secondary">Sin conteos registrados.</Typography>
        ) : (
          <>
            {filtroModulo && (
              <Typography variant="body2" sx={{ mb: 1, color: "#64748b" }}>
                {historialFiltrado.length} de {historial.length} conteos
              </Typography>
            )}
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={headSx}>Folio</TableCell>
                  <TableCell sx={headSx}>Módulo</TableCell>
                  <TableCell sx={headSx}>Fecha</TableCell>
                  <TableCell sx={headSx}>Usuario</TableCell>
                  <TableCell sx={{ ...headSx, textAlign: "right" }}>Act.</TableCell>
                  <TableCell sx={{ ...headSx, textAlign: "right" }}>Cre.</TableCell>
                  <TableCell sx={{ ...headSx, textAlign: "right" }}>Cero</TableCell>
                  <TableCell sx={headSx}>Estado</TableCell>
                  <TableCell sx={headSx}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historialFiltrado.map(c => (
                  <TableRow key={c.id}>
                    <TableCell sx={{ ...cellSx, fontWeight: 700, color: "#f97316" }}>{c.folio}</TableCell>
                    <TableCell sx={cellSx}>{c.modulo}</TableCell>
                    <TableCell sx={cellSx}>
                      {new Date(c.fecha).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
                    </TableCell>
                    <TableCell sx={cellSx}>{c.usuario ?? "—"}</TableCell>
                    <TableCell sx={{ ...cellSx, textAlign: "right" }}>{c.productos_actualizados ?? 0}</TableCell>
                    <TableCell sx={{ ...cellSx, textAlign: "right" }}>{c.productos_creados ?? 0}</TableCell>
                    <TableCell sx={{ ...cellSx, textAlign: "right" }}>{c.productos_en_cero ?? 0}</TableCell>
                    <TableCell sx={cellSx}>
                      <Chip
                        label={c.estado} size="small"
                        color={c.estado === "aplicado" ? "success" : "default"}
                        sx={{ fontSize: 11 }}
                      />
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <Button
                        size="small" startIcon={<Visibility sx={{ fontSize: 14 }} />}
                        onClick={() => handleVerDetalle(c.folio)}
                        sx={{ fontSize: 11, mr: 0.5 }}
                      >
                        Detalle
                      </Button>
                      {c.estado === "aplicado" && (
                        <Button
                          size="small" color="error" variant="outlined"
                          disabled={revirtiendoFolio === c.folio}
                          onClick={() => setConfirmFolio(c.folio)}
                          sx={{ fontSize: 11 }}
                        >
                          {revirtiendoFolio === c.folio ? "Revirtiendo…" : "Revertir"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          </>
        )}
      </Paper>

      {/* ─── MODAL: DETALLE ─────────────────────────────────────────────────── */}
      <Dialog open={modalDetalle} onClose={() => setModalDetalle(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Detalle — {detalle?.folio}
          {detalle && (
            <Typography variant="body2" color="text.secondary">
              {detalle.modulo} · {new Date(detalle.fecha).toLocaleString("es-MX")}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {cargandoDet ? (
            <Box sx={{ textAlign: "center", py: 4 }}><CircularProgress /></Box>
          ) : !detalle ? (
            <Typography>No se pudo cargar el detalle.</Typography>
          ) : (
            <>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
                <Chip label={`${resumenDetalle.cuadran} cuadran`} size="small"
                  sx={{ bgcolor: "#dcfce7", color: "#16a34a", fontWeight: 700 }} />
                <Chip label={`${resumenDetalle.faltantes} faltantes`} size="small"
                  sx={{ bgcolor: "#fee2e2", color: "#dc2626", fontWeight: 700 }} />
                <Chip label={`${resumenDetalle.sobrantes} sobrantes`} size="small"
                  sx={{ bgcolor: "#dbeafe", color: "#2563eb", fontWeight: 700 }} />
                <Button
                  size="small"
                  variant={soloDescuadres ? "contained" : "outlined"}
                  onClick={() => setSoloDescuadres(v => !v)}
                  sx={{ fontSize: 11, ml: "auto" }}
                >
                  {soloDescuadres ? "Ver todos" : "Solo descuadres"}
                </Button>
                <Button
                  size="small" variant="outlined" startIcon={<FileDownload sx={{ fontSize: 14 }} />}
                  onClick={handleDescargarExcel}
                  sx={{ fontSize: 11 }}
                >
                  Descargar Excel
                </Button>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={headSx}>Clave</TableCell>
                      <TableCell sx={headSx}>Producto</TableCell>
                      <TableCell sx={{ ...headSx, textAlign: "right" }}>Anterior</TableCell>
                      <TableCell sx={{ ...headSx, textAlign: "right" }}>Nueva</TableCell>
                      <TableCell sx={{ ...headSx, textAlign: "right" }}>Diferencia</TableCell>
                      <TableCell sx={headSx}>Acción</TableCell>
                      <TableCell sx={headSx}>Kardex</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {resumenDetalle.items.map(i => {
                      const dif = i.diferencia;
                      const difColor = dif === 0 ? "#16a34a" : dif < 0 ? "#dc2626" : "#2563eb";
                      return (
                        <TableRow key={i.id}>
                          <TableCell sx={cellSx}>{i.clave}</TableCell>
                          <TableCell sx={cellSx}>{i.producto}</TableCell>
                          <TableCell sx={{ ...cellSx, textAlign: "right" }}>{i.cantidad_anterior}</TableCell>
                          <TableCell sx={{ ...cellSx, textAlign: "right", fontWeight: 600 }}>{i.cantidad_nueva}</TableCell>
                          <TableCell sx={{ ...cellSx, textAlign: "right", fontWeight: 700, color: difColor }}>
                            {dif > 0 ? `+${dif}` : dif}
                          </TableCell>
                          <TableCell sx={cellSx}>
                            <Chip
                              label={i.accion.replace(/_/g, " ")}
                              size="small"
                              color={accionColor(i.accion) as any}
                              sx={{ fontSize: 11 }}
                            />
                          </TableCell>
                          <TableCell sx={cellSx}>
                            <Button
                              size="small"
                              startIcon={<QueryStats sx={{ fontSize: 14 }} />}
                              onClick={() => handleVerKardex(i.clave)}
                              sx={{ fontSize: 11, color: "#7c3aed" }}
                            >
                              Kardex
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalDetalle(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* ─── MODAL: KARDEX DE PRODUCTO ──────────────────────────────────────── */}
      <Dialog open={kardexOpen} onClose={() => setKardexOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Kardex — {kardexData?.producto ?? "…"}
          {kardexData && (
            <Typography variant="body2" color="text.secondary">
              {kardexData.clave} · {kardexData.modulo}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {kardexLoading ? (
            <Box sx={{ textAlign: "center", py: 4 }}><CircularProgress /></Box>
          ) : !kardexData ? (
            <Typography color="error">No se pudo cargar el kardex.</Typography>
          ) : (
            <>
              {!kardexData.tiene_comparativo && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Este es el primer conteo de este módulo. No hay saldo anterior para comparar.
                  Desde el próximo conteo se podrá comparar contra este.
                </Alert>
              )}

              {kardexData.tiene_comparativo && (
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
                  {[
                    { label: "Saldo anterior", value: kardexData.conteo_anterior?.saldo_inicial ?? 0, color: "#64748b" },
                    { label: "+ Entradas",     value: kardexData.total_entradas,  color: "#16a34a" },
                    { label: "− Salidas",      value: kardexData.total_salidas,   color: "#dc2626" },
                    { label: "= Calculado",    value: kardexData.saldo_calculado ?? 0, color: "#1e293b" },
                    { label: "Contado",        value: kardexData.contado,         color: "#1e293b" },
                    {
                      label: "Diferencia",
                      value: kardexData.diferencia ?? 0,
                      color: (kardexData.diferencia ?? 0) === 0 ? "#16a34a"
                           : (kardexData.diferencia ?? 0) < 0   ? "#dc2626"
                           : "#2563eb",
                    },
                  ].map(({ label, value, color }) => (
                    <Box key={label} sx={{ textAlign: "center", minWidth: 80 }}>
                      <Typography variant="caption" color="text.secondary">{label}</Typography>
                      <Typography sx={{ fontWeight: 700, color, fontSize: 16 }}>
                        {typeof value === "number" && value > 0 && label === "Diferencia" ? `+${value}` : value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}

              <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
                <Button
                  size="small" variant="outlined"
                  startIcon={<FileDownload sx={{ fontSize: 14 }} />}
                  onClick={handleDescargarExcelKardex}
                  sx={{ fontSize: 11 }}
                >
                  Descargar Excel
                </Button>
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={headSx}>Fecha</TableCell>
                      <TableCell sx={headSx}>Tipo</TableCell>
                      <TableCell sx={{ ...headSx, textAlign: "right" }}>Entrada</TableCell>
                      <TableCell sx={{ ...headSx, textAlign: "right" }}>Salida</TableCell>
                      <TableCell sx={{ ...headSx, textAlign: "right" }}>Existencia</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {kardexData.movimientos.map((m, idx) => (
                      <TableRow key={idx}>
                        <TableCell sx={{ ...cellSx, whiteSpace: "nowrap" }}>
                          {new Date(m.fecha).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
                        </TableCell>
                        <TableCell sx={cellSx}>
                          <Chip
                            label={m.tipo.replace(/_/g, " ")} size="small"
                            sx={{
                              fontSize: 10, fontWeight: 700,
                              bgcolor: m.tipo === "VENTA" ? "#fee2e2"
                                     : m.tipo === "ENTRADA" ? "#dcfce7"
                                     : m.tipo === "CANCELACION_VENTA" ? "#dbeafe"
                                     : m.tipo.startsWith("TRASPASO") ? "#fef9c3"
                                     : "#f1f5f9",
                              color: m.tipo === "VENTA" ? "#dc2626"
                                   : m.tipo === "ENTRADA" ? "#16a34a"
                                   : m.tipo === "CANCELACION_VENTA" ? "#2563eb"
                                   : m.tipo.startsWith("TRASPASO") ? "#854d0e"
                                   : "#475569",
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ ...cellSx, textAlign: "right", color: "#16a34a", fontWeight: m.entrada > 0 ? 700 : 400 }}>
                          {m.entrada > 0 ? `+${m.entrada}` : "—"}
                        </TableCell>
                        <TableCell sx={{ ...cellSx, textAlign: "right", color: "#dc2626", fontWeight: m.salida > 0 ? 700 : 400 }}>
                          {m.salida > 0 ? `-${m.salida}` : "—"}
                        </TableCell>
                        <TableCell sx={{ ...cellSx, textAlign: "right", fontWeight: 600 }}>
                          {m.existencia}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setKardexOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* ─── MODAL: CONFIRMAR REVERTIR ──────────────────────────────────────── */}
      <Dialog open={Boolean(confirmFolio)} onClose={() => setConfirmFolio(null)}>
        <DialogTitle sx={{ color: "#dc2626", fontWeight: 700 }}>
          ⚠ Revertir conteo {confirmFolio}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Esta acción restaurará el inventario del módulo al estado <strong>anterior</strong> a este conteo.
            <br /><br />
            Los productos creados en este conteo sin movimientos posteriores
            serán <strong>eliminados del catálogo</strong>.
            <br /><br />
            <strong>Esta acción no se puede deshacer.</strong>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmFolio(null)}>Cancelar</Button>
          <Button onClick={handleRevertir} color="error" variant="contained">
            Sí, revertir
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmCongelarOpen} onClose={() => setConfirmCongelarOpen(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>¿Congelar módulo?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Vas a congelar <strong>{moduloSeleccionado?.nombre}</strong>. Los asesores NO podrán
            vender ni hacer traspasos en este módulo hasta que lo descongeles o apliques el conteo.
            ¿Continuar?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmCongelarOpen(false)}>Cancelar</Button>
          <Button variant="contained" color="error" disabled={congelando} onClick={handleCongelar}>
            {congelando ? <CircularProgress size={16} /> : "Sí, congelar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ConteosFisicos;
