import React, { useEffect, useState, useCallback } from "react";
import {
  Container, Typography, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Paper, Button, TextField, Box, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
  MenuItem,
} from "@mui/material";
import axios from "axios";
import { Traspaso } from "../Types";

const BASE = "https://ato-appservidor-nvxt.onrender.com";

const ESTADOS = ["pendiente", "aprobado", "rechazado"];

const TraspasosAdmin = () => {
  const [traspasos, setTraspasos]         = useState<Traspaso[]>([]);
  const [modulos, setModulos]             = useState<string[]>([]);

  // filtros
  const [buscarFolio, setBuscarFolio]     = useState("");
  const [fechaDesde, setFechaDesde]       = useState("");
  const [fechaHasta, setFechaHasta]       = useState("");
  const [filtroOrigen, setFiltroOrigen]   = useState("");
  const [filtroDestino, setFiltroDestino] = useState("");
  const [filtroEstado, setFiltroEstado]   = useState("");

  // diálogos de confirmación
  const [confirmAprobar, setConfirmAprobar]   = useState<Traspaso | null>(null);
  const [confirmRechazar, setConfirmRechazar] = useState<Traspaso | null>(null);
  const [confirmEliminar, setConfirmEliminar] = useState<Traspaso | null>(null);

  const token  = localStorage.getItem("token");
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const cargarModulos = async () => {
    try {
      const res = await axios.get(`${BASE}/registro/modulos`, config);
      setModulos(res.data.map((m: any) => m.nombre));
    } catch {
      // silent
    }
  };

  const buildUrl = useCallback((folio: string) => {
    const params = new URLSearchParams();
    params.set("incluir_archivados", "true");
    if (folio.trim())          params.set("folio", folio.trim());
    if (fechaDesde)            params.set("fecha_desde", fechaDesde);
    if (fechaHasta)            params.set("fecha_hasta", fechaHasta);
    if (filtroOrigen)          params.set("modulo_origen", filtroOrigen);
    if (filtroDestino)         params.set("modulo_destino", filtroDestino);
    if (filtroEstado)          params.set("estado", filtroEstado);
    return `${BASE}/traspasos/traspasos?${params.toString()}`;
  }, [fechaDesde, fechaHasta, filtroOrigen, filtroDestino, filtroEstado]);

  const cargarTraspasos = useCallback(async (folio: string) => {
    try {
      const res = await axios.get(buildUrl(folio), config);
      setTraspasos(res.data);
    } catch {
      setTraspasos([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildUrl]);

  // debounce solo en folio
  useEffect(() => {
    const t = setTimeout(() => cargarTraspasos(buscarFolio), 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscarFolio]);

  // filtros no-folio aplican inmediatamente
  useEffect(() => {
    cargarTraspasos(buscarFolio);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaDesde, fechaHasta, filtroOrigen, filtroDestino, filtroEstado]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargarModulos(); }, []);

  const limpiarFiltros = () => {
    setBuscarFolio("");
    setFechaDesde("");
    setFechaHasta("");
    setFiltroOrigen("");
    setFiltroDestino("");
    setFiltroEstado("");
  };

  const hayFiltros =
    buscarFolio || fechaDesde || fechaHasta || filtroOrigen || filtroDestino || filtroEstado;

  const actualizarEstado = async (id: number, estado: "aprobado" | "rechazado") => {
    try {
      await axios.put(`${BASE}/traspasos/traspasos/${id}`, { estado }, config);
      cargarTraspasos(buscarFolio);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al actualizar traspaso");
    }
  };

  const eliminarTraspaso = async (t: Traspaso) => {
    try {
      await axios.delete(`${BASE}/traspasos/traspasos/${t.id}`, config);
      setTraspasos((prev) => prev.filter((x) => x.id !== t.id));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al eliminar traspaso");
    }
  };

  const archivar = async (id: number) => {
    try {
      await axios.put(`${BASE}/traspasos/traspasos/${id}/ocultar`, {}, config);
      setTraspasos((prev) => prev.filter((x) => x.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al archivar");
    }
  };

  const formatearFecha = (fecha: string) =>
    new Date(fecha).toLocaleString("es-MX", {
      timeZone: "America/Mexico_City",
      dateStyle: "short",
      timeStyle: "short",
    });

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>Solicitudes de Traspaso</Typography>

      {/* ── Filtros ── */}
      <Box display="flex" gap={2} mb={2} flexWrap="wrap" alignItems="center">
        <TextField
          label="Folio (T-X)"
          value={buscarFolio}
          onChange={(e) => setBuscarFolio(e.target.value)}
          size="small"
          sx={{ width: 160 }}
        />
        <TextField
          label="Fecha desde"
          type="date"
          value={fechaDesde}
          onChange={(e) => setFechaDesde(e.target.value)}
          size="small"
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />
        <TextField
          label="Fecha hasta"
          type="date"
          value={fechaHasta}
          onChange={(e) => setFechaHasta(e.target.value)}
          size="small"
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />
        <TextField
          select
          label="Módulo origen"
          value={filtroOrigen}
          onChange={(e) => setFiltroOrigen(e.target.value)}
          size="small"
          sx={{ width: 170 }}
        >
          <MenuItem value="">Todos</MenuItem>
          {modulos.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
        </TextField>
        <TextField
          select
          label="Módulo destino"
          value={filtroDestino}
          onChange={(e) => setFiltroDestino(e.target.value)}
          size="small"
          sx={{ width: 170 }}
        >
          <MenuItem value="">Todos</MenuItem>
          {modulos.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
        </TextField>
        <TextField
          select
          label="Estado"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          size="small"
          sx={{ width: 150 }}
        >
          <MenuItem value="">Todos</MenuItem>
          {ESTADOS.map((e) => <MenuItem key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</MenuItem>)}
        </TextField>
        {hayFiltros && (
          <Button size="small" variant="outlined" onClick={limpiarFiltros}>
            Limpiar filtros
          </Button>
        )}
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Folio</TableCell>
              <TableCell>Producto</TableCell>
              <TableCell align="center">Cant.</TableCell>
              <TableCell>Origen</TableCell>
              <TableCell>Destino</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell align="center">Acciones</TableCell>
              <TableCell align="center">Archivar</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {traspasos.map((t) => (
              <TableRow key={t.id}>
                <TableCell sx={{ fontWeight: 700 }}>{t.folio ?? "—"}</TableCell>
                <TableCell>{t.producto}</TableCell>
                <TableCell align="center">{t.cantidad}</TableCell>
                <TableCell>{t.modulo_origen}</TableCell>
                <TableCell>{t.modulo_destino}</TableCell>
                <TableCell>
                  <Chip
                    label={t.estado}
                    color={
                      t.estado === "aprobado" ? "success"
                      : t.estado === "rechazado" ? "error"
                      : "warning"
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>{formatearFecha(t.fecha)}</TableCell>
                <TableCell align="center">
                  {t.estado === "pendiente" ? (
                    <Box display="flex" gap={0.5}>
                      <Button
                        size="small"
                        color="success"
                        variant="contained"
                        onClick={() => setConfirmAprobar(t)}
                      >
                        Aprobar
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        onClick={() => setConfirmRechazar(t)}
                      >
                        Rechazar
                      </Button>
                    </Box>
                  ) : (
                    <Button
                      size="small"
                      color="error"
                      onClick={() => setConfirmEliminar(t)}
                    >
                      Eliminar
                    </Button>
                  )}
                </TableCell>
                <TableCell align="center">
                  <Button
                    size="small"
                    variant="text"
                    color="inherit"
                    onClick={() => {
                      if (window.confirm(`¿Archivar el traspaso ${t.folio ?? t.id}? Ya no aparecerá en la lista.`)) {
                        archivar(t.id);
                      }
                    }}
                  >
                    Archivar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {traspasos.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  {hayFiltros
                    ? "No se encontraron traspasos con esos criterios."
                    : "No hay solicitudes"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Confirmar Aprobar */}
      <Dialog open={!!confirmAprobar} onClose={() => setConfirmAprobar(null)}>
        <DialogTitle>Aprobar traspaso {confirmAprobar?.folio}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Confirmas la aprobación del traspaso <strong>{confirmAprobar?.folio}</strong>?<br />
            {confirmAprobar?.cantidad} uds. de <strong>{confirmAprobar?.producto}</strong>{" "}
            de <strong>{confirmAprobar?.modulo_origen}</strong> → <strong>{confirmAprobar?.modulo_destino}</strong>.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmAprobar(null)}>Cancelar</Button>
          <Button
            color="success"
            variant="contained"
            onClick={() => {
              if (confirmAprobar) actualizarEstado(confirmAprobar.id, "aprobado");
              setConfirmAprobar(null);
            }}
          >
            Aprobar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmar Rechazar */}
      <Dialog open={!!confirmRechazar} onClose={() => setConfirmRechazar(null)}>
        <DialogTitle>Rechazar traspaso {confirmRechazar?.folio}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Rechazar el traspaso <strong>{confirmRechazar?.folio}</strong> de{" "}
            {confirmRechazar?.cantidad} uds. de <strong>{confirmRechazar?.producto}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRechazar(null)}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (confirmRechazar) actualizarEstado(confirmRechazar.id, "rechazado");
              setConfirmRechazar(null);
            }}
          >
            Rechazar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmar Eliminar */}
      <Dialog open={!!confirmEliminar} onClose={() => setConfirmEliminar(null)}>
        <DialogTitle>Eliminar traspaso {confirmEliminar?.folio}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmEliminar?.estado === "aprobado" ? (
              <>
                <strong>⚠ Este traspaso ya fue aprobado.</strong> Eliminarlo revertirá el movimiento
                de inventario: {confirmEliminar?.cantidad} uds. de{" "}
                <strong>{confirmEliminar?.producto}</strong> regresarán de{" "}
                <strong>{confirmEliminar?.modulo_destino}</strong> a{" "}
                <strong>{confirmEliminar?.modulo_origen}</strong>.
                <br /><br />
                Folio: <strong>{confirmEliminar?.folio}</strong>. Esta acción no se puede deshacer.
              </>
            ) : (
              <>
                ¿Eliminar el traspaso <strong>{confirmEliminar?.folio}</strong>? Esta acción no se puede deshacer.
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmEliminar(null)}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (confirmEliminar) eliminarTraspaso(confirmEliminar);
              setConfirmEliminar(null);
            }}
          >
            Eliminar definitivamente
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TraspasosAdmin;
