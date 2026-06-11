import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  CircularProgress,
  Collapse,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { imprimirTicket } from '../utils/imprimirTicket';

const API = 'https://ato-appservidor-nvxt.onrender.com';

interface VentaRecibo {
  id: number;
  producto: string;
  cantidad: number;
  precio_unitario: number;
  total?: number;
  tipo_producto?: string;
  metodo_pago?: string;
  telefono_cliente?: string;
  folio?: string | null;
  fecha?: string;
  hora?: string;
  modulo?: { id: number; nombre: string } | null;
  empleado?: { username: string } | null;
}

interface Recibo {
  folio: string;
  items: VentaRecibo[];
  total: number;
}

export interface RecibosPanelProps {
  esAdmin?: boolean;
  modulos?: { id: number; nombre: string }[];
}

const fmt = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const hoyLocal = () => new Date().toLocaleDateString('en-CA');

export default function RecibosPanel({ esAdmin, modulos }: RecibosPanelProps) {
  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const [fecha, setFecha] = useState(hoyLocal());
  const [folioInput, setFolioInput] = useState('');
  const [moduloId, setModuloId] = useState<string>('');
  const [recibos, setRecibos] = useState<Recibo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [busquedaFolio, setBusquedaFolio] = useState('');
  const [expandido, setExpandido] = useState<string | null>(null);

  const cargar = async (folio?: string) => {
    setCargando(true);
    try {
      const params: Record<string, string | number> = {};
      if (folio) {
        params.folio = folio;
      } else {
        params.fecha = fecha;
      }
      if (esAdmin && moduloId) params.modulo_id = Number(moduloId);

      const res = await axios.get<VentaRecibo[]>(`${API}/ventas/ventas`, {
        ...config,
        params,
      });

      const ventas = res.data;

      const mapa: Record<string, VentaRecibo[]> = {};
      for (const v of ventas) {
        const clave = v.folio || `sin-folio-${v.id}`;
        if (!mapa[clave]) mapa[clave] = [];
        mapa[clave].push(v);
      }

      const grupos: Recibo[] = Object.entries(mapa).map(([clave, items]) => ({
        folio: clave,
        items,
        total: items.reduce(
          (s, i) => s + (i.total ?? i.precio_unitario * i.cantidad),
          0
        ),
      }));

      grupos.sort((a, b) => {
        const aReal = a.folio.startsWith('sin-folio') ? 1 : 0;
        const bReal = b.folio.startsWith('sin-folio') ? 1 : 0;
        if (aReal !== bReal) return aReal - bReal;
        return b.folio.localeCompare(a.folio);
      });

      setRecibos(grupos);
    } catch (err) {
      console.error('Error cargando recibos:', err);
      setRecibos([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!busquedaFolio) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha, moduloId]);

  const handleBuscarFolio = () => {
    const folio = folioInput.trim();
    setBusquedaFolio(folio);
    cargar(folio || undefined);
  };

  const handleLimpiarFolio = () => {
    setFolioInput('');
    setBusquedaFolio('');
    cargar();
  };

  const reimprimir = (recibo: Recibo) => {
    const primer = recibo.items[0];
    const esTel =
      (primer.tipo_producto ?? '').toLowerCase().includes('telefono') ||
      (primer.tipo_producto ?? '').toLowerCase().includes('teléfono');

    imprimirTicket({
      productos: recibo.items.map((i) => ({
        nombre: i.producto,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
      })),
      total: recibo.total,
      metodoPago: primer.metodo_pago ?? '',
      telefono: primer.telefono_cliente ?? undefined,
      folio: recibo.folio.startsWith('sin-folio') ? undefined : recibo.folio,
      modulo: primer.modulo?.nombre ?? '',
      vendedor: primer.empleado?.username ?? '',
      clasificacion: esTel ? 'Telefono' : 'Accesorios',
    });
  };

  const folioDisplay = (folio: string) =>
    folio.startsWith('sin-folio') ? 'Sin folio' : folio;

  const toggleExpandido = (folio: string) =>
    setExpandido((prev) => (prev === folio ? null : folio));

  return (
    <Box>
      {/* ── Filtros ── */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <TextField
          label="Fecha"
          type="date"
          size="small"
          value={fecha}
          onChange={(e) => {
            setFecha(e.target.value);
            if (busquedaFolio) {
              setFolioInput('');
              setBusquedaFolio('');
            }
          }}
          InputLabelProps={{ shrink: true }}
          disabled={!!busquedaFolio}
        />

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            label="Buscar folio (ej. V-123)"
            size="small"
            value={folioInput}
            onChange={(e) => setFolioInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleBuscarFolio(); }}
            sx={{ width: 200 }}
          />
          <Button variant="contained" size="small" onClick={handleBuscarFolio}>
            Buscar
          </Button>
          {busquedaFolio && (
            <Button variant="outlined" size="small" onClick={handleLimpiarFolio}>
              Limpiar
            </Button>
          )}
        </Box>

        {esAdmin && modulos && modulos.length > 0 && (
          <Select
            size="small"
            displayEmpty
            value={moduloId}
            onChange={(e) => setModuloId(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">Todos los módulos</MenuItem>
            {modulos.map((m) => (
              <MenuItem key={m.id} value={String(m.id)}>
                {m.nombre}
              </MenuItem>
            ))}
          </Select>
        )}
      </Paper>

      {/* ── Contenido ── */}
      {cargando ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : recibos.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
          No hay recibos para mostrar.
        </Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 700 }}>Hora</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Folio</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Módulo</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Productos</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Total</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recibos.map((recibo) => {
                const primer = recibo.items[0];
                const abierto = expandido === recibo.folio;

                return (
                  <React.Fragment key={recibo.folio}>
                    {/* ── Fila resumen ── */}
                    <TableRow
                      hover
                      sx={{ '& > *': { borderBottom: abierto ? 'unset' : undefined } }}
                    >
                      <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>
                        {primer.hora ? primer.hora.slice(0, 5) : '—'}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {folioDisplay(recibo.folio)}
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>
                        {primer.modulo?.nombre ?? '—'}
                      </TableCell>
                      <TableCell align="center" sx={{ color: 'text.secondary', fontSize: 13 }}>
                        {recibo.items.length}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {fmt(recibo.total)}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => toggleExpandido(recibo.folio)}
                          sx={{ color: abierto ? '#f97316' : 'text.secondary' }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => reimprimir(recibo)}
                          sx={{ color: 'text.secondary' }}
                        >
                          <PrintIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>

                    {/* ── Fila detalle expandible ── */}
                    <TableRow>
                      <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                        <Collapse in={abierto} timeout="auto" unmountOnExit>
                          <Box sx={{ px: 3, py: 1.5, bgcolor: '#fafafa', borderBottom: '1px solid #e2e8f0' }}>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Producto</TableCell>
                                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">Cant.</TableCell>
                                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="right">Precio u.</TableCell>
                                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="right">Subtotal</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {recibo.items.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell sx={{ fontSize: 12 }}>{item.producto}</TableCell>
                                    <TableCell sx={{ fontSize: 12 }} align="center">{item.cantidad}</TableCell>
                                    <TableCell sx={{ fontSize: 12 }} align="right">{fmt(item.precio_unitario)}</TableCell>
                                    <TableCell sx={{ fontSize: 12 }} align="right">
                                      {fmt(item.precio_unitario * item.cantidad)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                                {primer.metodo_pago && (
                                  <TableRow>
                                    <TableCell colSpan={4} sx={{ fontSize: 11, color: 'text.secondary', pt: 1 }}>
                                      Pago: {primer.metodo_pago}
                                      {primer.telefono_cliente ? ` · Tel: ${primer.telefono_cliente}` : ''}
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
