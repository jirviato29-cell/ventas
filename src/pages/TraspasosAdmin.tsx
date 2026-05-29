import React, { useEffect, useState } from "react";
import {
  Container, Typography, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Paper, Button, TextField, Box, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
} from "@mui/material";
import axios from "axios";
import { Traspaso } from "../Types";

const BASE = "https://ato-appservidor.onrender.com";

const TraspasosAdmin = () => {
  const [traspasos, setTraspasos]     = useState<Traspaso[]>([]);
  const [buscarFolio, setBuscarFolio] = useState("");

  // diálogos de confirmación
  const [confirmAprobar, setConfirmAprobar]   = useState<Traspaso | null>(null);
  const [confirmRechazar, setConfirmRechazar] = useState<Traspaso | null>(null);
  const [confirmEliminar, setConfirmEliminar] = useState<Traspaso | null>(null);

  const token  = localStorage.getItem("token");
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const cargarTraspasos = async () => {
    const url = buscarFolio.trim()
      ? `${BASE}/traspasos/traspasos?folio=${buscarFolio.trim()}`
      : `${BASE}/traspasos/traspasos`;
    const res = await axios.get(url, config);
    setTraspasos(res.data);
  };

  const actualizarEstado = async (id: number, estado: "aprobado" | "rechazado") => {
    try {
      await axios.put(`${BASE}/traspasos/traspasos/${id}`, { estado }, config);
      cargarTraspasos();
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(cargarTraspasos, 400); return () => clearTimeout(t); }, [buscarFolio]);

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>Solicitudes de Traspaso</Typography>

      <Box sx={{ mb: 2 }}>
        <TextField
          label="Buscar por folio (T-X)"
          value={buscarFolio}
          onChange={(e) => setBuscarFolio(e.target.value)}
          size="small"
          sx={{ width: 220 }}
        />
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
                <TableCell colSpan={9} align="center">No hay solicitudes</TableCell>
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
