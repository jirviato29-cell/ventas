import React, { useEffect, useState } from "react";
import {
  Box, Button, Chip, CircularProgress, Container,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  MenuItem, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography, Alert,
} from "@mui/material";
import axios from "axios";
import { AjusteInventario, Modulo } from "../Types";

const BASE = "https://ato-appservidor-nvxt.onrender.com";

interface FilaInventario {
  clave: string;
  producto: string;
  cantidad_sistema: number;
  cantidad_nueva: number;
}

const AjustesInventarioPage = () => {
  const [modulos, setModulos]           = useState<Modulo[]>([]);
  const [moduloId, setModuloId]         = useState<number | "">("");
  const [filas, setFilas]               = useState<FilaInventario[]>([]);
  const [filtro, setFiltro]             = useState("");
  const [motivo, setMotivo]             = useState("");
  const [cargando, setCargando]         = useState(false);
  const [guardando, setGuardando]       = useState(false);
  const [errorMsg, setErrorMsg]         = useState<string | null>(null);

  const [historial, setHistorial]       = useState<AjusteInventario[]>([]);
  const [cargandoHist, setCargandoHist] = useState(false);
  const [detalle, setDetalle]           = useState<AjusteInventario | null>(null);

  const [confirmOpen, setConfirmOpen]   = useState(false);
  const [confirmEliminar, setConfirmEliminar] = useState<AjusteInventario | null>(null);

  const token  = localStorage.getItem("token");
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const cargarModulos = async () => {
    const res = await axios.get(`${BASE}/registro/modulos`, config);
    setModulos(res.data);
  };

  const cargarInventario = async (mid: number) => {
    setCargando(true);
    setErrorMsg(null);
    try {
      const res = await axios.get(
        `${BASE}/inventario/inventario/modulo?modulo_id=${mid}`,
        config
      );
      setFilas(
        (res.data as any[]).map((p) => ({
          clave: p.clave,
          producto: p.producto,
          cantidad_sistema: p.cantidad,
          cantidad_nueva: p.cantidad,
        }))
      );
    } catch {
      setErrorMsg("Error al cargar el inventario del módulo");
    } finally {
      setCargando(false);
    }
  };

  const cargarHistorial = async (mid?: number) => {
    setCargandoHist(true);
    try {
      const url = mid
        ? `${BASE}/ajustes/?modulo_id=${mid}`
        : `${BASE}/ajustes/`;
      const res = await axios.get(url, config);
      setHistorial(res.data);
    } catch {
      // silent
    } finally {
      setCargandoHist(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargarModulos(); cargarHistorial(); }, []);

  const handleModuloChange = (id: number) => {
    setModuloId(id);
    setFilas([]);
    setMotivo("");
    setFiltro("");
    cargarInventario(id);
    cargarHistorial(id);
  };

  const setCantidadNueva = (clave: string, valor: string) => {
    const num = parseInt(valor, 10);
    setFilas((prev) =>
      prev.map((f) =>
        f.clave === clave
          ? { ...f, cantidad_nueva: isNaN(num) ? f.cantidad_sistema : Math.max(0, num) }
          : f
      )
    );
  };

  const cambios = filas.filter((f) => f.cantidad_nueva !== f.cantidad_sistema);

  const guardarAjuste = async () => {
    if (!moduloId || cambios.length === 0) return;
    setGuardando(true);
    setErrorMsg(null);
    try {
      await axios.post(
        `${BASE}/ajustes/`,
        {
          modulo_id: moduloId,
          motivo: motivo.trim() || null,
          productos: cambios.map((f) => ({
            clave: f.clave,
            cantidad_nueva: f.cantidad_nueva,
          })),
        },
        config
      );
      setConfirmOpen(false);
      setMotivo("");
      await cargarInventario(moduloId as number);
      await cargarHistorial(moduloId as number);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Error al guardar el ajuste");
      setConfirmOpen(false);
    } finally {
      setGuardando(false);
    }
  };

  const revertirAjuste = async (aj: AjusteInventario) => {
    try {
      await axios.delete(`${BASE}/ajustes/${aj.id}`, config);
      setConfirmEliminar(null);
      if (moduloId) {
        await cargarInventario(moduloId as number);
        await cargarHistorial(moduloId as number);
      } else {
        await cargarHistorial();
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al revertir el ajuste");
    }
  };

  const formatFecha = (f: string) =>
    new Date(f).toLocaleString("es-MX", {
      timeZone: "America/Mexico_City",
      dateStyle: "short",
      timeStyle: "short",
    });

  const filasFiltradas = filas.filter(
    (f) =>
      f.clave.toLowerCase().includes(filtro.toLowerCase()) ||
      f.producto.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>Conteos Físicos / Ajustes de Inventario</Typography>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      {/* ── Selector de módulo ── */}
      <Box display="flex" gap={2} alignItems="center" mb={3} flexWrap="wrap">
        <TextField
          select
          label="Módulo"
          value={moduloId}
          onChange={(e) => handleModuloChange(Number(e.target.value))}
          sx={{ minWidth: 180 }}
          size="small"
        >
          {modulos.map((m) => (
            <MenuItem key={m.id} value={m.id}>{m.nombre}</MenuItem>
          ))}
        </TextField>

        {filas.length > 0 && (
          <TextField
            label="Filtrar producto / clave"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            size="small"
            sx={{ minWidth: 220 }}
          />
        )}
      </Box>

      {/* ── Tabla de captura ── */}
      {cargando && <CircularProgress sx={{ display: "block", mx: "auto", my: 4 }} />}

      {!cargando && filas.length > 0 && (
        <>
          <TableContainer component={Paper} sx={{ mb: 2, maxHeight: 500 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Clave</TableCell>
                  <TableCell>Producto</TableCell>
                  <TableCell align="center">Sistema</TableCell>
                  <TableCell align="center" sx={{ width: 130 }}>Físico</TableCell>
                  <TableCell align="center">Delta</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filasFiltradas.map((f) => {
                  const delta = f.cantidad_nueva - f.cantidad_sistema;
                  return (
                    <TableRow
                      key={f.clave}
                      sx={{ bgcolor: delta !== 0 ? "action.hover" : undefined }}
                    >
                      <TableCell>{f.clave}</TableCell>
                      <TableCell>{f.producto}</TableCell>
                      <TableCell align="center">{f.cantidad_sistema}</TableCell>
                      <TableCell align="center">
                        <TextField
                          type="number"
                          value={f.cantidad_nueva}
                          onChange={(e) => setCantidadNueva(f.clave, e.target.value)}
                          size="small"
                          inputProps={{ min: 0, style: { textAlign: "center", width: 80 } }}
                          sx={{ "& .MuiInputBase-root": { height: 32 } }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        {delta !== 0 && (
                          <Chip
                            label={delta > 0 ? `+${delta}` : String(delta)}
                            color={delta > 0 ? "success" : "error"}
                            size="small"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Box display="flex" gap={2} alignItems="center" mb={4} flexWrap="wrap">
            <Typography variant="body2" color="text.secondary">
              {cambios.length} producto{cambios.length !== 1 ? "s" : ""} con cambio
            </Typography>
            <TextField
              label="Motivo (opcional)"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              size="small"
              sx={{ minWidth: 280 }}
              placeholder="Ej: Conteo físico mensual, faltante..."
            />
            <Button
              variant="contained"
              disabled={cambios.length === 0 || guardando}
              onClick={() => setConfirmOpen(true)}
            >
              Guardar ajuste ({cambios.length} cambios)
            </Button>
          </Box>
        </>
      )}

      {/* ── Historial de ajustes ── */}
      <Typography variant="h6" gutterBottom>Historial de Ajustes</Typography>

      {cargandoHist ? (
        <CircularProgress size={24} />
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Folio</TableCell>
                <TableCell>Módulo</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Usuario</TableCell>
                <TableCell>Motivo</TableCell>
                <TableCell align="center">Productos</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {historial.map((aj) => (
                <TableRow key={aj.id} hover sx={{ cursor: "pointer" }}>
                  <TableCell
                    sx={{ fontWeight: 700, color: "primary.main" }}
                    onClick={() => setDetalle(aj)}
                  >
                    {aj.folio}
                  </TableCell>
                  <TableCell onClick={() => setDetalle(aj)}>{aj.modulo_nombre}</TableCell>
                  <TableCell onClick={() => setDetalle(aj)}>{formatFecha(aj.fecha)}</TableCell>
                  <TableCell onClick={() => setDetalle(aj)}>{aj.usuario_nombre}</TableCell>
                  <TableCell onClick={() => setDetalle(aj)}>{aj.motivo ?? "—"}</TableCell>
                  <TableCell align="center" onClick={() => setDetalle(aj)}>
                    {aj.items.length}
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      size="small"
                      color="error"
                      onClick={() => setConfirmEliminar(aj)}
                    >
                      Revertir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {historial.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">Sin ajustes registrados</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Confirmar guardar ajuste ── */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirmar ajuste de inventario</DialogTitle>
        <DialogContent>
          <DialogContentText component="div">
            <Typography variant="body2" gutterBottom>
              Se registrarán <strong>{cambios.length}</strong> cambio{cambios.length !== 1 ? "s" : ""}{" "}
              en el módulo seleccionado:
            </Typography>
            <Box component="ul" sx={{ pl: 2, mt: 1 }}>
              {cambios.slice(0, 10).map((f) => {
                const d = f.cantidad_nueva - f.cantidad_sistema;
                return (
                  <li key={f.clave} style={{ marginBottom: 2 }}>
                    <strong>{f.clave}</strong> {f.producto}: {f.cantidad_sistema} →{" "}
                    {f.cantidad_nueva}{" "}
                    <span style={{ color: d > 0 ? "green" : "red" }}>
                      ({d > 0 ? "+" : ""}{d})
                    </span>
                  </li>
                );
              })}
              {cambios.length > 10 && (
                <li>...y {cambios.length - 10} más</li>
              )}
            </Box>
            {motivo && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Motivo: <em>{motivo}</em>
              </Typography>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={guardarAjuste}
            disabled={guardando}
          >
            {guardando ? "Guardando…" : "Confirmar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Modal detalle de ajuste ── */}
      <Dialog open={!!detalle} onClose={() => setDetalle(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          Detalle ajuste {detalle?.folio} — {detalle?.modulo_nombre}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {detalle && formatFecha(detalle.fecha)} · {detalle?.usuario_nombre}
            {detalle?.motivo ? ` · ${detalle.motivo}` : ""}
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Clave</TableCell>
                  <TableCell>Producto</TableCell>
                  <TableCell align="center">Antes</TableCell>
                  <TableCell align="center">Después</TableCell>
                  <TableCell align="center">Delta</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detalle?.items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>{it.clave}</TableCell>
                    <TableCell>{it.producto}</TableCell>
                    <TableCell align="center">{it.cantidad_anterior}</TableCell>
                    <TableCell align="center">{it.cantidad_nueva}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={it.delta > 0 ? `+${it.delta}` : String(it.delta)}
                        color={it.delta > 0 ? "success" : "error"}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetalle(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* ── Confirmar revertir ajuste ── */}
      <Dialog open={!!confirmEliminar} onClose={() => setConfirmEliminar(null)}>
        <DialogTitle>Revertir ajuste {confirmEliminar?.folio}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Revertir el ajuste <strong>{confirmEliminar?.folio}</strong> del módulo{" "}
            <strong>{confirmEliminar?.modulo_nombre}</strong>? Esto deshará los {confirmEliminar?.items.length} cambios de inventario.
            Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmEliminar(null)}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => confirmEliminar && revertirAjuste(confirmEliminar)}
          >
            Revertir
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AjustesInventarioPage;
