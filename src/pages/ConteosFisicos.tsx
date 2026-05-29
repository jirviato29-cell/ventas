import React, { useEffect, useRef, useState } from "react";
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, Container,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  Divider, MenuItem, Paper, Tab, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tabs, TextField, Typography,
} from "@mui/material";
import {
  AddCircle, CheckCircle, CloudUpload, Error as ErrorIcon,
  HelpOutline, Refresh, Visibility,
} from "@mui/icons-material";
import axios from "axios";
import { Modulo } from "../Types";

const BASE = "https://ato-appservidor.onrender.com";
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

// ── Component ──────────────────────────────────────────────────────────────────

const ConteosFisicos = () => {
  const token  = localStorage.getItem("token");
  const config = { headers: { Authorization: `Bearer ${token}` } };

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

  // Detalle modal
  const [detalle, setDetalle]         = useState<ConteoDetalle | null>(null);
  const [modalDetalle, setModalDetalle] = useState(false);
  const [cargandoDet, setCargandoDet] = useState(false);

  // Revertir
  const [confirmFolio, setConfirmFolio]   = useState<string | null>(null);
  const [revirtiendoFolio, setRevirtiendoFolio] = useState<string | null>(null);

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    axios.get(`${BASE}/registro/modulos`, config)
      .then(r => setModulos(r.data))
      .catch(() => {});
    cargarHistorial();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!preview || !archivo) return;
    setAplicando(true);
    setErrorMsg(null);
    try {
      const body = {
        modulo_id:          preview.modulo_id,
        archivo_nombre:     archivo.name,
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
      setErrorMsg(e.response?.data?.detail ?? "Error al aplicar el conteo");
    } finally { setAplicando(false); }
  };

  const handleVerDetalle = async (folio: string) => {
    setCargandoDet(true);
    setDetalle(null);
    setModalDetalle(true);
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

  // ── Derived ────────────────────────────────────────────────────────────────

  const totalCambios = preview
    ? preview.para_actualizar.length + preview.para_crear.length + enCero.size
    : 0;
  const hayAlgoQueAplicar = totalCambios > 0;

  const accionColor = (accion: string) => {
    if (accion === "creado")         return "info";
    if (accion === "puesto_en_cero") return "error";
    if (accion === "conservado")     return "default";
    return "success";
  };

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
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Nueva importación
        </Typography>

        <TextField
          select label="Módulo destino" value={moduloId} size="small"
          sx={{ minWidth: 260, mb: 2, display: "block" }}
          onChange={e => { setModuloId(Number(e.target.value)); setPreview(null); }}
        >
          {modulos.map(m => <MenuItem key={m.id} value={m.id}>{m.nombre}</MenuItem>)}
        </TextField>

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

          {/* Panel de metadatos del archivo */}
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
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Historial de conteos</Typography>
          <Button
            size="small" startIcon={<Refresh />}
            onClick={cargarHistorial} disabled={cargandoHist}
          >
            Actualizar
          </Button>
        </Box>

        {cargandoHist ? (
          <CircularProgress size={24} />
        ) : historial.length === 0 ? (
          <Typography color="text.secondary">Sin conteos registrados.</Typography>
        ) : (
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
                {historial.map(c => (
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
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headSx}>Clave</TableCell>
                    <TableCell sx={headSx}>Producto</TableCell>
                    <TableCell sx={{ ...headSx, textAlign: "right" }}>Anterior</TableCell>
                    <TableCell sx={{ ...headSx, textAlign: "right" }}>Nueva</TableCell>
                    <TableCell sx={headSx}>Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detalle.items.map(i => (
                    <TableRow key={i.id}>
                      <TableCell sx={cellSx}>{i.clave}</TableCell>
                      <TableCell sx={cellSx}>{i.producto}</TableCell>
                      <TableCell sx={{ ...cellSx, textAlign: "right" }}>{i.cantidad_anterior}</TableCell>
                      <TableCell sx={{ ...cellSx, textAlign: "right", fontWeight: 600 }}>{i.cantidad_nueva}</TableCell>
                      <TableCell sx={cellSx}>
                        <Chip
                          label={i.accion.replace(/_/g, " ")}
                          size="small"
                          color={accionColor(i.accion) as any}
                          sx={{ fontSize: 11 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalDetalle(false)}>Cerrar</Button>
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
    </Container>
  );
};

export default ConteosFisicos;
