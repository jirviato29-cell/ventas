import React, { useEffect, useState } from 'react';
import {
  Box, CircularProgress, Container, InputAdornment, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
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
  const [productos, setProductos] = useState<ProductoCatalogo[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [busqueda, setBusqueda]   = useState('');

  const token  = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
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
    cargar();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      <TextField
        placeholder="Buscar por clave o nombre…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        size="small"
        sx={{ mb: 2, minWidth: 300 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

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
                  </TableRow>
                ))}
                {filtrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ color: '#94a3b8', py: 3 }}>
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
    </Container>
  );
};

export default ProductosPage;
