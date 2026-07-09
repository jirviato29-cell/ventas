import React, { useCallback, useEffect, useState } from 'react';
import {
  Container, Box, Typography, TextField, Button, Table, TableHead,
  TableRow, TableCell, TableBody, TableContainer, Paper
} from '@mui/material';
import axios from 'axios';

const VentasTelcel = () => {
  const [ventas, setVentas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [fInicio, setFInicio] = useState("");
  const [fFin, setFFin] = useState("");
  const [fImei, setFImei] = useState("");
  const [fTexto, setFTexto] = useState("");   // buscador cliente por vendedor/modulo
  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const cargar = useCallback(async () => {
    setCargando(true);
    const params = new URLSearchParams();
    if (fInicio) params.append("fecha_inicio", fInicio);
    if (fFin) params.append("fecha_fin", fFin);
    if (fImei) params.append("imei", fImei);
    try {
      const res = await axios.get(
        `https://ato-appservidor-nvxt.onrender.com/ventas/ventas_telcel?${params.toString()}`,
        config
      );
      setVentas(res.data);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al cargar ventas");
    } finally {
      setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fInicio, fFin, fImei]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const clasifLabel = (c: string) =>
    c === 'linea_nueva' ? 'Línea Nueva' : c === 'boletin_63' ? 'Boletín 63' : (c || '—');

  const visibles = ventas.filter((v) =>
    !fTexto ||
    (v.vendedor || '').toLowerCase().includes(fTexto.toLowerCase()) ||
    (v.modulo || '').toLowerCase().includes(fTexto.toLowerCase())
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 3, mb: 5 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
        Ventas de Teléfonos Telcel
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 3 }}>
        <TextField
          label="Desde"
          type="date"
          value={fInicio}
          onChange={(e) => setFInicio(e.target.value)}
          InputLabelProps={{ shrink: true }}
          size="small"
        />
        <TextField
          label="Hasta"
          type="date"
          value={fFin}
          onChange={(e) => setFFin(e.target.value)}
          InputLabelProps={{ shrink: true }}
          size="small"
        />
        <TextField
          label="IMEI"
          value={fImei}
          onChange={(e) => setFImei(e.target.value)}
          size="small"
        />
        <Button variant="contained" onClick={cargar} disabled={cargando}>
          Buscar
        </Button>
        <TextField
          label="Vendedor / Módulo"
          value={fTexto}
          onChange={(e) => setFTexto(e.target.value)}
          size="small"
          sx={{ minWidth: 220 }}
        />
      </Box>

      <TableContainer component={Paper}>
        <Table size="small" sx={{ '& td, & th': { border: '1px solid #e0e0e0' } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Folio</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Fecha</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Hora</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Vendedor</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Módulo</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Producto</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>IMEI</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Clasificación</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Número</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Tipo</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Método</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Precio</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cargando ? (
              <TableRow>
                <TableCell colSpan={12} align="center" sx={{ color: '#888' }}>
                  Cargando...
                </TableCell>
              </TableRow>
            ) : visibles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} align="center" sx={{ color: '#888' }}>
                  Sin resultados
                </TableCell>
              </TableRow>
            ) : (
              visibles.map((v) => (
                <TableRow key={v.id} hover>
                  <TableCell sx={{ fontWeight: 600, color: '#f97316' }}>{v.folio ?? '—'}</TableCell>
                  <TableCell>{v.fecha ?? '—'}</TableCell>
                  <TableCell>{v.hora ?? '—'}</TableCell>
                  <TableCell>{v.vendedor ?? '—'}</TableCell>
                  <TableCell>{v.modulo ?? '—'}</TableCell>
                  <TableCell>{v.producto ?? '—'}</TableCell>
                  <TableCell>{v.imei ?? '—'}</TableCell>
                  <TableCell>{clasifLabel(v.clasificacion)}</TableCell>
                  <TableCell>{v.numero ?? '—'}</TableCell>
                  <TableCell>{v.tipo_venta ?? '—'}</TableCell>
                  <TableCell>{v.metodo_pago ?? '—'}</TableCell>
                  <TableCell align="right">
                    {v.precio != null ? `$${Number(v.precio).toLocaleString('es-MX')}` : '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default VentasTelcel;
