import React, { useEffect, useMemo, useState } from 'react';
import {
  Container, Typography, TextField, Box, Paper, Table, TableHead,
  TableRow, TableCell, TableBody, TableContainer
} from '@mui/material';
import axios from 'axios';

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
  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await axios.get(
          'https://ato-appservidor-nvxt.onrender.com/inventario/productos-catalogo',
          config
        );
        setProductos(res.data);
      } catch (e) {
        console.error('Error al cargar lista de precios', e);
      } finally {
        setCargando(false);
      }
    };
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            </TableRow>
          ))}
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} align="center" sx={{ color: '#888' }}>
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
    </Container>
  );
};

export default ListaPrecios;
