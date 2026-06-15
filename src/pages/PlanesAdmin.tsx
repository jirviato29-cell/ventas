import React, { useEffect, useState } from "react";
import {
  Alert, Box, Button, CircularProgress, Container,
  Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { Navigate } from "react-router-dom";
import axios from "axios";
import { obtenerRolDesdeToken } from "../components/Token";
import { calcularComision } from "../data/comisionesTabulador";

const BASE   = "https://ato-appservidor-nvxt.onrender.com";
const headSx = { py: "4px", px: "6px", fontSize: 13, fontWeight: 700 };
const cellSx = { py: "2px", px: "6px", fontSize: 13 };

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

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (rol !== "admin") return <Navigate to="/" replace />;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, color: "#1e293b", mb: 3 }}>
        Planes Tarifarios
      </Typography>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, flexGrow: 1 }}>
            Registros ({planes.length})
          </Typography>
        </Box>

        {cargando ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
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
                  <TableCell sx={headSx}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {planes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={19} sx={{ ...cellSx, textAlign: "center", color: "#94a3b8" }}>
                      No hay planes registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  planes.map(p => (
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
                      <TableCell sx={cellSx}>
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
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

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
