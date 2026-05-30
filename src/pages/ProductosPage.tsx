import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Container, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, InputAdornment, MenuItem, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import axios from 'axios';

const BASE = 'https://ato-appservidor.onrender.com';

interface ProductoCatalogo {
  clave: string;
  producto: string;
  precio: number | null;
  tipo_producto: string;
  comision: number | null;
  existencia_real: number;
}

const thSx = { fontWeight: 700, color: '#f97316', bgcolor: '#f8fafc' };

const ProductosPage = () => {
  const [productos, setProductos]         = useState<ProductoCatalogo[]>([]);
  const [cargando, setCargando]           = useState(true);
  const [busqueda, setBusqueda]           = useState('');

  // ── estados editar ────────────────────────────────────────────────────────
  const [editOpen, setEditOpen]           = useState(false);
  const [editProducto, setEditProducto]   = useState<ProductoCatalogo | null>(null);
  const [editPrecio, setEditPrecio]       = useState('');
  const [editComision, setEditComision]   = useState('');
  const [editError, setEditError]         = useState<string | null>(null);
  const [editGuardando, setEditGuardando] = useState(false);

  // ── estados nuevo ─────────────────────────────────────────────────────────
  const [nuevoOpen, setNuevoOpen]           = useState(false);
  const [nuevoClave, setNuevoClave]         = useState('');
  const [nuevoNombre, setNuevoNombre]       = useState('');
  const [nuevoPrecio, setNuevoPrecio]       = useState('');
  const [nuevoTipo, setNuevoTipo]           = useState<'accesorios' | 'telefono'>('accesorios');
  const [nuevoComision, setNuevoComision]   = useState('');
  const [nuevoError, setNuevoError]         = useState<string | null>(null);
  const [nuevoGuardando, setNuevoGuardando] = useState(false);

  const token  = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const cargar = async () => {
    try {
      const res = await axios.get(`${BASE}/inventario/productos-catalogo`, config);
      setProductos(res.data);
    } catch {
      // tabla queda vacía
    } finally {
      setCargando(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargar(); }, []);

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

  // ── nuevo producto ────────────────────────────────────────────────────────
  const detectarTipo = (clave: string): 'accesorios' | 'telefono' => {
    const u = (clave ?? '').toUpperCase();
    return u.startsWith('TELI') || u.startsWith('TETE') ? 'telefono' : 'accesorios';
  };

  const abrirNuevo = () => {
    setNuevoClave(''); setNuevoNombre(''); setNuevoPrecio('');
    setNuevoTipo('accesorios'); setNuevoComision('');
    setNuevoError(null); setNuevoOpen(true);
  };

  const handleCrear = async () => {
    if (!(nuevoClave ?? '').trim()) { setNuevoError('La clave es obligatoria'); return; }
    if (!(nuevoNombre ?? '').trim()) { setNuevoError('El nombre es obligatorio'); return; }
    const precioNum = Number(nuevoPrecio);
    if (!nuevoPrecio.trim() || isNaN(precioNum) || precioNum <= 0) {
      setNuevoError('El precio debe ser un número mayor a 0'); return;
    }
    const comisionTrim = nuevoComision.trim();
    const comisionNum = comisionTrim === '' ? null : Number(comisionTrim);
    if (comisionTrim !== '' && (isNaN(comisionNum as number) || (comisionNum as number) < 0)) {
      setNuevoError('La comisión debe ser un número mayor o igual a 0'); return;
    }
    setNuevoGuardando(true);
    setNuevoError(null);
    try {
      await axios.post(
        `${BASE}/inventario/inventario/general`,
        { clave: nuevoClave.trim(), producto: nuevoNombre.trim(),
          precio: Math.round(precioNum), tipo_producto: nuevoTipo, cantidad: 0 },
        config,
      );
      if (comisionNum !== null) {
        await axios.post(`${BASE}/comisiones/comisiones`,
          { producto: nuevoNombre.trim(), cantidad: comisionNum }, config);
      }
      setNuevoOpen(false);
      await cargar();
    } catch (err: any) {
      setNuevoError(err?.response?.data?.detail || 'Error al crear el producto');
    } finally {
      setNuevoGuardando(false);
    }
  };

  // ── filtro ────────────────────────────────────────────────────────────────
  const q = busqueda.toLowerCase();
  const filtrados = productos.filter(
    (p) =>
      (p.clave ?? '').toLowerCase().includes(q) ||
      (p.producto ?? '').toLowerCase().includes(q),
  );

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Catálogo de Productos
      </Typography>

      <Box display="flex" gap={2} mb={2} alignItems="center" flexWrap="wrap">
        <TextField
          placeholder="Buscar por clave o nombre…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          size="small"
          sx={{ minWidth: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <Button variant="contained" onClick={abrirNuevo}
          sx={{ bgcolor: '#f97316', '&:hover': { bgcolor: '#ea6c0a' }, whiteSpace: 'nowrap' }}>
          + Nuevo producto
        </Button>
      </Box>

      {cargando ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={thSx}>Clave</TableCell>
                  <TableCell sx={thSx}>Producto</TableCell>
                  <TableCell sx={thSx}>Tipo</TableCell>
                  <TableCell sx={thSx} align="right">Precio</TableCell>
                  <TableCell sx={thSx} align="right">Comisión</TableCell>
                  <TableCell sx={thSx} align="right">Existencia real</TableCell>
                  <TableCell sx={thSx} />
                </TableRow>
              </TableHead>
              <TableBody>
                {filtrados.map((p) => (
                  <TableRow key={`${p.clave}-${p.producto}`}>
                    <TableCell sx={{ fontWeight: 600 }}>{p.clave}</TableCell>
                    <TableCell>{p.producto}</TableCell>
                    <TableCell>{p.tipo_producto}</TableCell>
                    <TableCell align="right">
                      {p.precio && p.precio > 0
                        ? `$${p.precio.toLocaleString()}`
                        : <span style={{ color: '#ef4444', fontWeight: 600 }}>Sin precio</span>
                      }
                    </TableCell>
                    <TableCell align="right">
                      {p.comision !== null ? `$${p.comision}` : '—'}
                    </TableCell>
                    <TableCell align="right">{p.existencia_real}</TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => abrirEditor(p)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {filtrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ color: '#94a3b8', py: 3 }}>
                      {busqueda ? 'Sin resultados' : 'Sin productos'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {filtrados.length} producto{filtrados.length !== 1 ? 's' : ''}
            {busqueda ? ` · filtrados de ${productos.length}` : ''}
          </Typography>
        </>
      )}

      {/* ── Dialog editar ── */}
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

      {/* ── Dialog nuevo producto ── */}
      <Dialog open={nuevoOpen} onClose={() => !nuevoGuardando && setNuevoOpen(false)}
        maxWidth="xs" fullWidth>
        <DialogTitle>Nuevo producto</DialogTitle>
        <DialogContent>
          {nuevoError && <Alert severity="error" sx={{ mb: 2 }}>{nuevoError}</Alert>}
          <TextField label="Clave" fullWidth margin="normal"
            value={nuevoClave}
            onChange={(e) => { setNuevoClave(e.target.value); setNuevoTipo(detectarTipo(e.target.value)); }} />
          <TextField label="Nombre (producto)" fullWidth margin="normal"
            value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} />
          <TextField label="Precio ($)" type="number" fullWidth margin="normal"
            value={nuevoPrecio} onChange={(e) => setNuevoPrecio(e.target.value)}
            inputProps={{ min: 1, step: 1 }}
            error={nuevoPrecio !== '' && (isNaN(Number(nuevoPrecio)) || Number(nuevoPrecio) <= 0)}
            helperText="Requerido · mayor a $0" />
          <TextField select label="Tipo de producto" fullWidth margin="normal"
            value={nuevoTipo}
            onChange={(e) => setNuevoTipo(e.target.value as 'accesorios' | 'telefono')}>
            <MenuItem value="accesorios">Accesorios</MenuItem>
            <MenuItem value="telefono">Teléfono</MenuItem>
          </TextField>
          <TextField label="Comisión ($)" type="number" fullWidth margin="normal"
            value={nuevoComision} onChange={(e) => setNuevoComision(e.target.value)}
            inputProps={{ min: 0, step: 0.01 }}
            helperText="Opcional · dejar vacío para sin comisión" />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setNuevoOpen(false)} disabled={nuevoGuardando}>Cancelar</Button>
          <Button variant="contained" onClick={handleCrear} disabled={nuevoGuardando}
            sx={{ bgcolor: '#f97316', '&:hover': { bgcolor: '#ea6c0a' } }}>
            {nuevoGuardando ? 'Guardando…' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

    </Container>
  );
};

export default ProductosPage;
