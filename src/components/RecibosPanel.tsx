import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
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
import DeleteIcon from '@mui/icons-material/Delete';
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
  cancelada?: boolean;
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
  const [cancelando, setCancelando] = useState<string | null>(null);

  const rol = localStorage.getItem('rol');
  const puedeCancelar = rol === 'encargado' || rol === 'admin';

  const cancelarRecibo = async (recibo: Recibo) => {
    if (recibo.items.every((i) => i.cancelada)) {
      alert('Este recibo ya está cancelado.');
      return;
    }

    const confirmado = window.confirm(
      '¿Cancelar este recibo? Se cancelarán todos sus productos y el inventario regresará. Esta acción no se puede deshacer.'
    );
    if (!confirmado) return;

    setCancelando(recibo.folio);
    for (const item of recibo.items) {
      try {
        await axios.put(`${API}/ventas/ventas/${item.id}/cancelar`, {}, config);
      } catch (err: any) {
        const detail = err?.response?.data?.detail;
        alert(`Error al cancelar producto "${item.producto}": ${typeof detail === 'string' ? detail : 'Error desconocido'}`);
      }
    }
    setCancelando(null);
    alert('Recibo cancelado');
    cargar(busquedaFolio || undefined);
  };

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

  // suppress unused-state warning — expandido reserved for future use
  void expandido; void setExpandido;

  const recibosAccesorios = recibos.filter(
    (r) => (r.items[0]?.tipo_producto ?? '').toLowerCase() === 'accesorios'
  );
  const recibosTelefonos = recibos.filter((r) => {
    const tp = (r.items[0]?.tipo_producto ?? '').toLowerCase();
    return tp.includes('telefono') || tp.includes('teléfono');
  });
  const totalAccesorios = recibosAccesorios.reduce((s, r) => s + r.total, 0);
  const totalTelefonos = recibosTelefonos.reduce((s, r) => s + r.total, 0);

  const tablaRecibos = (lista: Recibo[], bgHead: string) => (
    <TableContainer component={Paper} sx={{ mb: 3 }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: bgHead }}>
            <TableCell sx={{ fontWeight: 700 }}>Folio</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Vendedor</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Producto</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="center">Cant.</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="right">Precio</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="right">Total</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="center">Estado</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="center">Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lista.map((recibo) => {
            const cancelado = recibo.items.every((i) => i.cancelada === true);
            const primer = recibo.items[0];
            return (
              <React.Fragment key={recibo.folio}>
                {recibo.items.map((item, idx) => (
                  <TableRow
                    key={item.id}
                    sx={{
                      opacity: cancelado ? 0.6 : 1,
                      ...(idx === 0 ? { '& > td': { borderTop: '2px solid #e2e8f0' } } : {}),
                    }}
                  >
                    {idx === 0 ? (
                      <>
                        <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>
                          {folioDisplay(recibo.folio)}
                          {cancelado && (
                            <Chip label="CANCELADO" size="small" color="error" sx={{ ml: 1, height: 18, fontSize: 10 }} />
                          )}
                        </TableCell>
                        <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>
                          {primer.empleado?.username ?? '—'}
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell />
                        <TableCell />
                      </>
                    )}
                    <TableCell sx={{ fontSize: 13 }}>{item.producto}</TableCell>
                    <TableCell sx={{ fontSize: 13 }} align="center">{item.cantidad}</TableCell>
                    <TableCell sx={{ fontSize: 13 }} align="right">{fmt(item.precio_unitario)}</TableCell>
                    {idx === 0 ? (
                      <>
                        <TableCell sx={{ fontWeight: 600, fontSize: 13 }} align="right">{fmt(recibo.total)}</TableCell>
                        <TableCell align="center">
                          <Typography sx={{ color: cancelado ? '#ef4444' : '#22c55e', fontWeight: 600, fontSize: 12 }}>
                            {cancelado ? 'Cancelada' : 'Activa'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton size="small" onClick={() => reimprimir(recibo)} sx={{ color: 'text.secondary' }}>
                            <PrintIcon fontSize="small" />
                          </IconButton>
                          {puedeCancelar && (
                            <IconButton
                              size="small"
                              color="error"
                              disabled={cancelando === recibo.folio || cancelado}
                              onClick={() => cancelarRecibo(recibo)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell />
                        <TableCell />
                        <TableCell />
                      </>
                    )}
                  </TableRow>
                ))}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );

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

      {/* ── Spinner ── */}
      {cargando && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {/* ── Contador ── */}
      {!cargando && recibos.length > 0 && (
        <Paper sx={{ p: 1.5, mb: 2, display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="body2">
            Accesorios: <strong>{fmt(totalAccesorios)}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">|</Typography>
          <Typography variant="body2">
            Teléfonos: <strong>{fmt(totalTelefonos)}</strong>
          </Typography>
        </Paper>
      )}

      {/* ── Tablas ── */}
      {!cargando && (
        <>
          {/* ACCESORIOS */}
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#f97316', letterSpacing: 1 }}>
            ACCESORIOS
          </Typography>
          {recibosAccesorios.length === 0 ? (
            <Typography color="text.secondary" sx={{ mb: 3, fontSize: 13 }}>
              Sin ventas de accesorios.
            </Typography>
          ) : (
            tablaRecibos(recibosAccesorios, '#fff7ed')
          )}

          {/* TELÉFONOS */}
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#0d1e3a', letterSpacing: 1 }}>
            TELÉFONOS
          </Typography>
          {recibosTelefonos.length === 0 ? (
            <Typography color="text.secondary" sx={{ mb: 3, fontSize: 13 }}>
              Sin ventas de teléfonos.
            </Typography>
          ) : (
            tablaRecibos(recibosTelefonos, '#eff6ff')
          )}
        </>
      )}
    </Box>
  );
}
