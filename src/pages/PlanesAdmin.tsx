import React, { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, CircularProgress, Container,
  Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { Navigate } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx";
import { obtenerRolDesdeToken } from "../components/Token";
import { calcularComision } from "../data/comisionesTabulador";

const BASE   = "https://ato-appservidor-nvxt.onrender.com";
const headSx = { py: "4px", px: "6px", fontSize: 13, fontWeight: 700 };
const cellSx = { py: "2px", px: "6px", fontSize: 13 };
const stickyHeadSx = { ...headSx, position: "sticky" as const, right: 0, background: "#fff", zIndex: 3, boxShadow: "-4px 0 6px -4px rgba(0,0,0,0.15)" };
const stickyCellSx = { ...cellSx, position: "sticky" as const, right: 0, background: "#fff", zIndex: 2, boxShadow: "-4px 0 6px -4px rgba(0,0,0,0.15)" };

interface PlanTarifario {
  id: number;
  fecha: string | null;
  empleado_id: number | null;
  modulo_id: number | null;
  tipo_plan: string | null;
  estatus: string | null;
  categoria: string | null;
  clasificacion: string | null;
  equipo: string | null;
  imei: string | null;
  precio_equipo: number | null;
  plazo: number | null;
  linea: string | null;
  cuenta: string | null;
  pago_inicial: boolean;
  monto_pago_inicial: number | null;
  pagado: boolean | null;
  fecha_pago: string | null;
  contrato_listo: boolean | null;
  venta_pi_id: number | null;
}

const nil = (v: string | number | null | undefined): string =>
  v === null || v === undefined || v === "" ? "-" : String(v);

// Mes de corte: el ULTIMO dia de cada mes cuenta para el mes SIGUIENTE.
// 29/jun -> junio; 30/jun (ultimo de junio) -> julio; 31/jul -> agosto, etc.
// Devuelve null si la fecha es nula o no parseable.
const mesDeCorte = (fechaISO: string | null): { anio: number; mes: number } | null => {
  if (!fechaISO) return null;
  const d = new Date(fechaISO);
  if (isNaN(d.getTime())) return null;
  const anio = d.getFullYear();
  const mes = d.getMonth();
  const dia = d.getDate();
  const ultimoDia = new Date(anio, mes + 1, 0).getDate(); // dias del mes
  if (dia === ultimoDia) {
    const sig = new Date(anio, mes + 1, 1); // primer dia del mes siguiente
    return { anio: sig.getFullYear(), mes: sig.getMonth() };
  }
  return { anio, mes };
};

const PlanesAdmin = () => {
  const rol    = obtenerRolDesdeToken();
  const token  = localStorage.getItem("token");
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const [planes, setPlanes]     = useState<PlanTarifario[]>([]);
  const [claves, setClaves]     = useState<Record<number, string>>({});
  const [modulos, setModulos]   = useState<Record<number, string>>({});
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [editPlan, setEditPlan] = useState<PlanTarifario | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Agrupa por mes de corte. Esta vista muestra JUNIO 2026 (mes 5) y JULIO 2026
  // (mes 6); todo lo demas (otras fechas o sin fecha) cae en "otros".
  const grupos = useMemo(() => {
    const junio: PlanTarifario[] = [];
    const julio: PlanTarifario[] = [];
    const otros: PlanTarifario[] = [];
    for (const p of planes) {
      const c = mesDeCorte(p.fecha);
      if (c && c.anio === 2026 && c.mes === 5) junio.push(p);
      else if (c && c.anio === 2026 && c.mes === 6) julio.push(p);
      else otros.push(p);
    }
    return { junio, julio, otros };
  }, [planes]);

  const cargar = async () => {
    setCargando(true);
    setErrorMsg(null);
    try {
      const r = await axios.get(`${BASE}/planes-tarifarios`, config);
      setPlanes(r.data);
      try {
        const ru = await axios.get(`${BASE}/registro/usuarios`, config);
        const mapa: Record<number, string> = {};
        for (const u of ru.data) {
          if (u.id != null) mapa[u.id] = u.nombre_englobado ?? "";
        }
        setClaves(mapa);
        const rm = await axios.get(`${BASE}/registro/modulos`, config);
        const mapaMod: Record<number, string> = {};
        for (const m of rm.data) {
          if (m.id != null) mapaMod[m.id] = m.nombre ?? "";
        }
        setModulos(mapaMod);
      } catch {
        // si falla, la columna cae al empleado_id numérico
      }
    } catch {
      setErrorMsg("No se pudieron cargar los planes tarifarios.");
    } finally {
      setCargando(false);
    }
  };

  const togglePagado = async (plan: PlanTarifario) => {
    const nuevo = !plan.pagado;
    try {
      await axios.patch(`${BASE}/planes-tarifarios/${plan.id}/pagado?pagado=${nuevo}`, {}, config);
      setPlanes(prev => prev.map(x =>
        x.id === plan.id
          ? { ...x, pagado: nuevo, fecha_pago: nuevo ? new Date().toISOString() : null }
          : x
      ));
    } catch {
      setErrorMsg("No se pudo actualizar el estado de pago.");
    }
  };

  const toggleContrato = async (plan: PlanTarifario) => {
    const nuevo = !plan.contrato_listo;
    try {
      await axios.patch(`${BASE}/planes-tarifarios/${plan.id}/contrato-listo?contrato_listo=${nuevo}`, {}, config);
      setPlanes(prev => prev.map(x =>
        x.id === plan.id ? { ...x, contrato_listo: nuevo } : x
      ));
    } catch {
      setErrorMsg("No se pudo actualizar el estado del contrato.");
    }
  };

  const guardarEdicion = async () => {
    if (!editPlan) return;
    setGuardando(true);
    try {
      const payload = {
        fecha: editPlan.fecha,
        tipo_plan: editPlan.tipo_plan,
        estatus: editPlan.estatus,
        categoria: editPlan.categoria,
        clasificacion: editPlan.clasificacion,
        imei: editPlan.imei,
        precio_equipo: editPlan.precio_equipo,
        plazo: editPlan.plazo,
        linea: editPlan.linea,
        cuenta: editPlan.cuenta,
      };
      const r = await axios.put(`${BASE}/planes-tarifarios/${editPlan.id}`, payload, config);
      setPlanes(prev => prev.map(x => (x.id === editPlan.id ? r.data : x)));
      setEditPlan(null);
    } catch {
      setErrorMsg("No se pudo guardar la edición.");
    } finally {
      setGuardando(false);
    }
  };

  const eliminarPlan = async (plan: PlanTarifario) => {
    const ok = window.confirm(
      `¿Eliminar este plan?\n\nSe regresará el teléfono al inventario y se revertirá el pago inicial del corte. Esta acción no se puede deshacer.`
    );
    if (!ok) return;
    try {
      await axios.delete(`${BASE}/planes-tarifarios/${plan.id}`, config);
      setPlanes(prev => prev.filter(x => x.id !== plan.id));
    } catch {
      setErrorMsg("No se pudo eliminar el plan.");
    }
  };

  const filasDe = (lista: PlanTarifario[]) => lista.map(p => ({
    "Fecha": p.fecha ?? "",
    "Empleado": (p.empleado_id != null ? claves[p.empleado_id] : undefined) ?? (p.empleado_id ?? ""),
    "Módulo": (p.modulo_id != null ? modulos[p.modulo_id] : undefined) ?? (p.modulo_id ?? ""),
    "Tipo plan": p.tipo_plan ?? "",
    "Estatus": p.estatus ?? "",
    "Categoría": p.categoria ?? "",
    "Clasificación": p.clasificacion ?? "",
    "Equipo": p.equipo ?? "",
    "IMEI": p.imei ?? "",
    "Precio equipo": p.precio_equipo ?? "",
    "Plazo": p.plazo ?? "",
    "Línea": p.linea ?? "",
    "Cuenta": p.cuenta ?? "",
    "Pago inicial": p.pago_inicial ? "Sí" : "No",
    "Monto PI": p.monto_pago_inicial ?? 0,
    "Comisión": calcularComision(p.categoria, p.clasificacion, p.tipo_plan) ?? "",
    "Contrato": p.contrato_listo ? "LISTO" : "PENDIENTE",
    "Pagado": p.pagado ? "PAGADO" : "PENDIENTE",
    "Fecha pago": p.fecha_pago ?? "",
  }));

  const exportarExcel = () => {
    const wb = XLSX.utils.book_new();
    const agregarHoja = (nombre: string, lista: PlanTarifario[]) => {
      const ws = XLSX.utils.json_to_sheet(filasDe(lista));
      XLSX.utils.book_append_sheet(wb, ws, nombre);
    };
    agregarHoja("Junio", grupos.junio);
    agregarHoja("Julio", grupos.julio);
    if (grupos.otros.length > 0) agregarHoja("Otros", grupos.otros);
    XLSX.writeFile(wb, `planes_tarifarios_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (rol !== "admin") return <Navigate to="/" replace />;

  // Render de una fila (identico al anterior); reutilizado por las tres tablas.
  const renderFila = (p: PlanTarifario) => (
    <TableRow key={p.id}>
      <TableCell sx={cellSx}>
        {p.fecha ? new Date(p.fecha).toLocaleDateString("es-MX") : "-"}
      </TableCell>
      <TableCell sx={cellSx}>
        {p.empleado_id != null ? (claves[p.empleado_id] || nil(p.empleado_id)) : "-"}
      </TableCell>
      <TableCell sx={cellSx}>
        {p.modulo_id != null ? (modulos[p.modulo_id] || nil(p.modulo_id)) : "-"}
      </TableCell>
      <TableCell sx={cellSx}>{nil(p.tipo_plan)}</TableCell>
      <TableCell sx={cellSx}>{nil(p.estatus)}</TableCell>
      <TableCell sx={cellSx}>{nil(p.categoria)}</TableCell>
      <TableCell sx={cellSx}>{nil(p.clasificacion)}</TableCell>
      <TableCell sx={cellSx}>{nil(p.equipo)}</TableCell>
      <TableCell sx={cellSx}>{nil(p.imei)}</TableCell>
      <TableCell sx={cellSx}>{nil(p.precio_equipo)}</TableCell>
      <TableCell sx={cellSx}>{nil(p.plazo)}</TableCell>
      <TableCell sx={cellSx}>{nil(p.linea)}</TableCell>
      <TableCell sx={cellSx}>{nil(p.cuenta)}</TableCell>
      <TableCell sx={cellSx}>{p.pago_inicial ? "Sí" : "No"}</TableCell>
      <TableCell sx={cellSx}>{nil(p.monto_pago_inicial)}</TableCell>
      <TableCell sx={cellSx}>
        {(() => {
          const c = calcularComision(p.categoria, p.clasificacion, p.tipo_plan);
          return c != null ? `$${c}` : "-";
        })()}
      </TableCell>
      <TableCell sx={cellSx}>
        <Button
          size="small"
          variant={p.contrato_listo ? "contained" : "outlined"}
          color={p.contrato_listo ? "success" : "inherit"}
          onClick={() => toggleContrato(p)}
        >
          {p.contrato_listo ? "Listo" : "Pendiente"}
        </Button>
      </TableCell>
      <TableCell sx={cellSx}>
        <Button
          size="small"
          variant={p.pagado ? "contained" : "outlined"}
          color={p.pagado ? "success" : "inherit"}
          onClick={() => togglePagado(p)}
        >
          {p.pagado ? "Pagado" : "Marcar pagado"}
        </Button>
        {p.pagado && p.fecha_pago && (
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
            {new Date(p.fecha_pago).toLocaleDateString("es-MX")}
          </div>
        )}
      </TableCell>
      <TableCell sx={stickyCellSx}>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title="Editar">
            <IconButton size="small" color="primary" onClick={() => setEditPlan(p)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" color="error" onClick={() => eliminarPlan(p)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </TableCell>
    </TableRow>
  );

  // Encabezado de columnas, compartido por las tres tablas.
  const encabezado = (
    <TableRow>
      <TableCell sx={headSx}>Fecha</TableCell>
      <TableCell sx={headSx}>Empleado ID</TableCell>
      <TableCell sx={headSx}>Módulo ID</TableCell>
      <TableCell sx={headSx}>Tipo plan</TableCell>
      <TableCell sx={headSx}>Estatus</TableCell>
      <TableCell sx={headSx}>Categoría</TableCell>
      <TableCell sx={headSx}>Clasificación</TableCell>
      <TableCell sx={headSx}>Equipo</TableCell>
      <TableCell sx={headSx}>IMEI</TableCell>
      <TableCell sx={headSx}>Precio equipo</TableCell>
      <TableCell sx={headSx}>Plazo</TableCell>
      <TableCell sx={headSx}>Línea</TableCell>
      <TableCell sx={headSx}>Cuenta</TableCell>
      <TableCell sx={headSx}>Pago inicial</TableCell>
      <TableCell sx={headSx}>Monto PI</TableCell>
      <TableCell sx={headSx}>Comisión</TableCell>
      <TableCell sx={headSx}>Contrato</TableCell>
      <TableCell sx={headSx}>Pagado</TableCell>
      <TableCell sx={stickyHeadSx}>Acciones</TableCell>
    </TableRow>
  );

  // Una tabla completa (titulo + contador + misma estructura de columnas/filas).
  const renderTabla = (titulo: string, lista: PlanTarifario[]) => (
    <Paper sx={{ p: 3, overflow: "hidden", mb: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        {titulo} ({lista.length})
      </Typography>
      <TableContainer sx={{ width: "100%", overflowX: "auto" }}>
        <Table size="small" sx={{ minWidth: 1700 }}>
          <TableHead>{encabezado}</TableHead>
          <TableBody>
            {lista.length === 0 ? (
              <TableRow>
                <TableCell colSpan={19} sx={{ ...cellSx, textAlign: "center", color: "#94a3b8" }}>
                  No hay planes registrados
                </TableCell>
              </TableRow>
            ) : (
              lista.map(renderFila)
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );

  return (
    <Container maxWidth={false} sx={{ py: 3, px: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: "#1e293b", flexGrow: 1 }}>
          Planes Tarifarios
        </Typography>
        <Button
          variant="contained"
          startIcon={<FileDownloadIcon />}
          onClick={exportarExcel}
          disabled={planes.length === 0}
        >
          Descargar Excel
        </Button>
      </Box>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      {cargando ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <>
          {renderTabla("JULIO", grupos.julio)}
          {renderTabla("JUNIO", grupos.junio)}
          {grupos.otros.length > 0 && renderTabla("OTROS", grupos.otros)}
        </>
      )}

      <Dialog open={editPlan !== null} onClose={() => setEditPlan(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar plan</DialogTitle>
        <DialogContent>
          {editPlan && (
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mt: 1 }}>
              <TextField label="Equipo (no editable)" value={editPlan.equipo ?? ""} disabled size="small" />
              <TextField label="Monto PI (no editable)" value={editPlan.monto_pago_inicial ?? ""} disabled size="small" />
              <TextField label="Tipo plan" value={editPlan.tipo_plan ?? ""} size="small"
                onChange={e => setEditPlan({ ...editPlan, tipo_plan: e.target.value })} />
              <TextField label="Estatus" value={editPlan.estatus ?? ""} size="small"
                onChange={e => setEditPlan({ ...editPlan, estatus: e.target.value })} />
              <TextField label="Categoría" value={editPlan.categoria ?? ""} size="small"
                onChange={e => setEditPlan({ ...editPlan, categoria: e.target.value })} />
              <TextField label="Clasificación" value={editPlan.clasificacion ?? ""} size="small"
                onChange={e => setEditPlan({ ...editPlan, clasificacion: e.target.value })} />
              <TextField label="IMEI" value={editPlan.imei ?? ""} size="small"
                onChange={e => setEditPlan({ ...editPlan, imei: e.target.value })} />
              <TextField label="Precio equipo" type="number" value={editPlan.precio_equipo ?? ""} size="small"
                onChange={e => setEditPlan({ ...editPlan, precio_equipo: e.target.value === "" ? null : Number(e.target.value) })} />
              <TextField label="Plazo" type="number" value={editPlan.plazo ?? ""} size="small"
                onChange={e => setEditPlan({ ...editPlan, plazo: e.target.value === "" ? null : Number(e.target.value) })} />
              <TextField label="Línea" value={editPlan.linea ?? ""} size="small"
                onChange={e => setEditPlan({ ...editPlan, linea: e.target.value })} />
              <TextField label="Cuenta" value={editPlan.cuenta ?? ""} size="small"
                onChange={e => setEditPlan({ ...editPlan, cuenta: e.target.value })} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditPlan(null)}>Cancelar</Button>
          <Button variant="contained" onClick={guardarEdicion} disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PlanesAdmin;
