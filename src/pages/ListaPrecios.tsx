import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Container, Typography, TextField, Box, Paper, Table, TableHead,
  TableRow, TableCell, TableBody, TableContainer, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import axios from 'axios';
import { obtenerRolDesdeToken } from '../components/Token';

const BASE = 'https://ato-appservidor-nvxt.onrender.com';

interface ProductoCatalogo {
  clave: string;
  producto: string;
  precio: number | null;
  tipo_producto: string;
  comision: number | null;
  existencia_real: number;
}

const ListaPrecios = () => {
  const [productos, setProductos] = useState<ProductoCatalogo[]>([]);
  const [filtro, setFiltro] = useState('');
  const [cargando, setCargando] = useState(true);

  // ── estados editar ────────────────────────────────────────────────────────
  const [editOpen, setEditOpen]           = useState(false);
  const [editProducto, setEditProducto]   = useState<ProductoCatalogo | null>(null);
  const [editPrecio, setEditPrecio]       = useState('');
  const [editComision, setEditComision]   = useState('');
  const [editError, setEditError]         = useState<string | null>(null);
  const [editGuardando, setEditGuardando] = useState(false);

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const esAdmin = obtenerRolDesdeToken() === 'admin';

  const cargar = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE}/inventario/productos-catalogo`, config);
      setProductos(res.data);
    } catch (e) {
      console.error('Error al cargar lista de precios', e);
    } finally {
      setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const soloTelefonos = useMemo(
    () => productos.filter((p) => p.tipo_producto === 'telefono'),
    [productos]
  );

  const filtrar = (lista: ProductoCatalogo[]) => {
    const f = filtro.trim().toLowerCase();
    if (!f) return lista;
    return lista.filter(
      (p) =>
        p.producto.toLowerCase().includes(f) ||
        (p.clave || '').toLowerCase().includes(f)
    );
  };

  const libres = useMemo(
    () =>
      filtrar(
        soloTelefonos.filter((p) => p.producto.toUpperCase().includes('LIBRE'))
      ).sort((a, b) => a.producto.localeCompare(b.producto)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [soloTelefonos, filtro]
  );

  const telcel = useMemo(
    () =>
      filtrar(
        soloTelefonos.filter((p) => p.producto.toUpperCase().includes('TELCEL'))
      ).sort((a, b) => a.producto.localeCompare(b.producto)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [soloTelefonos, filtro]
  );

  const limpiarNombre = (nombre: string) =>
    nombre.replace(/^TELEFONO LIBRE /i, '').replace(/^TELEFONO TELCEL /i, '');

  const formatoPrecio = (n: number | null) =>
    n === null
      ? '—'
      : new Intl.NumberFormat('es-MX', {
          style: 'currency',
          currency: 'MXN',
          minimumFractionDigits: 0,
        }).format(n);

  // ── editar ────────────────────────────────────────────────────────────────
  const abrirEditor = (p: ProductoCatalogo) => {
    setEditProducto(p);
    setEditPrecio(p.precio != null ? String(p.precio) : '');
    setEditComision(p.comision != null ? String(p.comision) : '');
    setEditError(null);
    setEditOpen(true);
  };

  const handleGuardar = async () => {
    if (!editProducto) return;
    const precioNum = Number(editPrecio);
    if (editPrecio.trim() === '' || isNaN(precioNum) || precioNum < 0) {
      setEditError('El precio debe ser un número mayor o igual a 0');
      return;
    }
    const comisionTrim = editComision.trim();
    const comisionNueva = comisionTrim === '' ? null : Number(comisionTrim);
    if (comisionTrim !== '' && isNaN(comisionNueva as number)) {
      setEditError('La comisión debe ser un número válido');
      return;
    }
    setEditGuardando(true);
    setEditError(null);
    try {
      if (precioNum !== editProducto.precio) {
        await axios.patch(
          `${BASE}/inventario/inventario/general/${encodeURIComponent(editProducto.clave)}/precio`,
          { precio: Math.round(precioNum) },
          config,
        );
      }
      const comisionAntes = editProducto.comision;
      if (comisionAntes === null && comisionNueva !== null) {
        await axios.post(`${BASE}/comisiones/comisiones`,
          { producto: editProducto.producto, cantidad: comisionNueva }, config);
      } else if (comisionAntes !== null && comisionNueva !== null && comisionNueva !== comisionAntes) {
        await axios.put(
          `${BASE}/comisiones/comisiones/${encodeURIComponent(editProducto.producto)}`,
          { cantidad: comisionNueva }, config);
      } else if (comisionAntes !== null && comisionNueva === null) {
        await axios.delete(
          `${BASE}/comisiones/comisiones/${encodeURIComponent(editProducto.producto)}`,
          config);
      }
      setEditOpen(false);
      await cargar();
    } catch (err: any) {
      setEditError(err?.response?.data?.detail || 'Error al guardar');
    } finally {
      setEditGuardando(false);
    }
  };

  const Columna = ({ titulo, data, color }: { titulo: string; data: ProductoCatalogo[]; color: string }) => (
    <TableContainer component={Paper} sx={{ flex: 1, minWidth: 340 }}>
      <Box sx={{ bgcolor: color, color: 'white', px: 2, py: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {titulo} ({data.length})
        </Typography>
      </Box>
      <Table size="small" stickyHeader sx={{ '& td, & th': { border: '1px solid #e0e0e0' } }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Equipo</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="right">Precio</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="center">Existencia</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="right">Comisión</TableCell>
            {esAdmin && <TableCell sx={{ fontWeight: 700 }} align="center" />}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((p) => (
            <TableRow key={p.clave} hover>
              <TableCell>{limpiarNombre(p.producto)}</TableCell>
              <TableCell align="right">{formatoPrecio(p.precio)}</TableCell>
              <TableCell
                align="center"
                sx={{ fontWeight: 700, color: p.existencia_real > 0 ? '#2e7d32' : '#c62828' }}
              >
                {p.existencia_real}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: p.comision ? '#1565c0' : '#bbb' }}>
                {p.comision ? formatoPrecio(p.comision) : '—'}
              </TableCell>
              {esAdmin && (
                <TableCell align="center">
                  <IconButton size="small" onClick={() => abrirEditor(p)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              )}
            </TableRow>
          ))}
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={esAdmin ? 5 : 4} align="center" sx={{ color: '#888' }}>
                Sin resultados
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 3, mb: 5 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
        Lista de Precios
      </Typography>

      <TextField
        fullWidth
        placeholder="Buscar equipo o clave..."
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        sx={{ mb: 3 }}
      />

      {cargando ? (
        <Typography>Cargando...</Typography>
      ) : (
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Columna titulo="Telcel" data={telcel} color="#0d47a1" />
          <Columna titulo="Libre" data={libres} color="#2e7d32" />
        </Box>
      )}

      {esAdmin && (
        <Dialog open={editOpen} onClose={() => { if (!editGuardando) setEditOpen(false); }}
          maxWidth="xs" fullWidth>
          <DialogTitle>
            Editar producto
            <Typography variant="caption" display="block" color="text.secondary" sx={{ fontWeight: 400 }}>
              {editProducto?.clave} — {editProducto?.producto}
            </Typography>
          </DialogTitle>
          <DialogContent>
            {editError && <Alert severity="error" sx={{ mb: 2 }}>{editError}</Alert>}
            <TextField label="Precio ($)" type="number" fullWidth margin="normal"
              value={editPrecio} onChange={(e) => setEditPrecio(e.target.value)}
              inputProps={{ min: 0, step: 1 }}
              error={editPrecio.trim() !== '' && (isNaN(Number(editPrecio)) || Number(editPrecio) < 0)}
              helperText="Requerido · mínimo $0" />
            <TextField label="Comisión ($)" type="number" fullWidth margin="normal"
              value={editComision} onChange={(e) => setEditComision(e.target.value)}
              inputProps={{ min: 0, step: 0.01 }}
              helperText="Dejar vacío para eliminar la comisión" />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditOpen(false)} disabled={editGuardando}>Cancelar</Button>
            <Button variant="contained" onClick={handleGuardar} disabled={editGuardando}
              sx={{ bgcolor: '#f97316', '&:hover': { bgcolor: '#ea6c0a' } }}>
              {editGuardando ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Container>
  );
};

export default ListaPrecios;
