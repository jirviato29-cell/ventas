import React, { useEffect, useMemo, useState } from 'react';
import {
  Container, Typography, TextField, Box, Paper, Table, TableHead,
  TableRow, TableCell, TableBody, TableContainer
} from '@mui/material';
import axios from 'axios';

interface ProductoInv {
  id: number;
  clave: string;
  producto: string;
  precio: number;
  cantidad: number;
  tipo_producto: string;
}

interface ComisionItem {
  producto: string;
  cantidad: number;
}

const ListaPrecios = () => {
  const [productos, setProductos] = useState<ProductoInv[]>([]);
  const [comisionMap, setComisionMap] = useState<Map<string, number>>(new Map());
  const [filtro, setFiltro] = useState('');
  const [cargando, setCargando] = useState(true);
  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    const cargar = async () => {
      try {
        const [resInv, resCom] = await Promise.all([
          axios.get('https://ato-appservidor-nvxt.onrender.com/inventario/inventario/general', config),
          axios.get('https://ato-appservidor-nvxt.onrender.com/comisiones/comisiones', config),
        ]);
        setProductos(resInv.data);
        const map = new Map<string, number>();
        (resCom.data as ComisionItem[]).forEach((c) => {
          map.set((c.producto || '').trim().toLowerCase(), c.cantidad);
        });
        setComisionMap(map);
      } catch (e) {
        console.error('Error al cargar lista de precios', e);
      } finally {
        setCargando(false);
      }
    };
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const montoComision = (nombre: string): number | null => {
    const v = comisionMap.get((nombre || '').trim().toLowerCase());
    return v === undefined ? null : v;
  };

  const soloTelefonos = useMemo(
    () => productos.filter((p) => p.tipo_producto === 'telefono'),
    [productos]
  );

  const filtrar = (lista: ProductoInv[]) => {
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

  const formatoPrecio = (n: number) =>
    new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(n);

  const Columna = ({ titulo, data, color }: { titulo: string; data: ProductoInv[]; color: string }) => (
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
          {data.map((p) => {
            const com = montoComision(p.producto);
            return (
              <TableRow key={p.id} hover>
                <TableCell>{limpiarNombre(p.producto)}</TableCell>
                <TableCell align="right">{formatoPrecio(p.precio)}</TableCell>
                <TableCell
                  align="center"
                  sx={{ fontWeight: 700, color: p.cantidad > 0 ? '#2e7d32' : '#c62828' }}
                >
                  {p.cantidad}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: com ? '#1565c0' : '#bbb' }}>
                  {com ? formatoPrecio(com) : '—'}
                </TableCell>
              </TableRow>
            );
          })}
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
