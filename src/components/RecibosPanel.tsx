import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
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

const getIniciales = (username: string): string => {
  const partes = username.split('-');
  const nombre = partes.length > 1 ? partes[partes.length - 1] : username;
  return nombre.slice(0, 2).toUpperCase();
};

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
      const res = await axios.get<VentaRecibo[]>(`${API}/ventas/ventas`, { ...config, params });
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
        total: items.reduce((s, i) => s + (i.total ?? i.precio_unitario * i.cantidad), 0),
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

  void expandido; void setExpandido;

  const recibosAccesorios = recibos.filter(
    (r) => (r.items[0]?.tipo_producto ?? '').toLowerCase() === 'accesorios'
  );
  const recibosTelefonos = recibos.filter((r) => {
    const tp = (r.items[0]?.tipo_producto ?? '').toLowerCase();
    return tp.includes('telefono') || tp.includes('teléfono');
  });
  const totalAccesorios = recibosAccesorios.reduce((s, r) => s + r.total, 0);
  const totalTelefonos  = recibosTelefonos.reduce((s, r) => s + r.total, 0);

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '8px',
      height: 36,
      fontSize: 13,
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: '#FF6600',
        boxShadow: '0 0 0 3px rgba(255,102,0,.15)',
      },
    },
    '& .MuiInputLabel-root.Mui-focused': { color: '#FF6600' },
  };

  const seccion = (lista: Recibo[], titulo: string, color: string) => (
    <Box sx={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', mb: 3, bgcolor: '#fff' }}>

      {/* Section header */}
      <Box sx={{
        px: '18px', py: '12px',
        borderBottom: '1px solid #eef2f7',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Box sx={{ width: 9, height: 9, borderRadius: '3px', bgcolor: color, flexShrink: 0 }} />
          <Typography sx={{ fontSize: 13, fontWeight: 800, color, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
            {titulo}
          </Typography>
        </Box>
        <Box sx={{
          bgcolor: '#f1f5f9', borderRadius: '999px', px: '10px', py: '2px',
          fontSize: '11.5px', color: '#64748b', fontWeight: 600,
        }}>
          {lista.length} recibo{lista.length !== 1 ? 's' : ''}
        </Box>
      </Box>

      {/* Table or empty */}
      {lista.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
          Sin ventas registradas.
        </Box>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter, system-ui, sans-serif' }}>
            <colgroup>
              <col style={{ width: 116 }} />
              <col style={{ width: 150 }} />
              <col />
              <col style={{ width: 58 }} />
              <col style={{ width: 116 }} />
              <col style={{ width: 96 }} />
              <col style={{ width: 78 }} />
            </colgroup>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                {[
                  { label: 'Folio',    align: 'left'   as const },
                  { label: 'Vendedor', align: 'left'   as const },
                  { label: 'Producto', align: 'left'   as const },
                  { label: 'Cant.',    align: 'center' as const },
                  { label: 'Total',    align: 'right'  as const },
                  { label: 'Estado',   align: 'center' as const },
                  { label: 'Acciones', align: 'center' as const },
                ].map((h, i, arr) => (
                  <th key={h.label} style={{
                    padding: '9px 14px',
                    fontSize: 10,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: '#64748b',
                    textAlign: h.align,
                    letterSpacing: '0.4px',
                    whiteSpace: 'nowrap',
                    borderRight: i < arr.length - 1 ? '1px solid #eef2f7' : 'none',
                  }}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map((recibo) => {
                const cancelado = recibo.items.every((i) => i.cancelada === true);
                const primer    = recibo.items[0];
                const username  = primer.empleado?.username ?? '';
                const iniciales = username ? getIniciales(username) : '??';
                const cantTotal = recibo.items.reduce((s, i) => s + i.cantidad, 0);

                const tdBase: React.CSSProperties = {
                  padding: '9px 14px',
                  fontSize: 12.5,
                  borderBottom: '1px solid #f1f5f9',
                  borderRight: '1px solid #eef2f7',
                  verticalAlign: 'middle',
                  background: cancelado ? '#fffafa' : '#fff',
                };
                const tdText: React.CSSProperties = {
                  ...tdBase,
                  color: cancelado ? '#c4757c' : undefined,
                  textDecoration: cancelado ? 'line-through' : undefined,
                };

                return (
                  <tr key={recibo.folio}>
                    {/* Folio */}
                    <td style={{ ...tdText, fontWeight: 800, fontSize: 13, fontVariantNumeric: 'tabular-nums', color: cancelado ? '#c4757c' : '#0f172a' }}>
                      {folioDisplay(recibo.folio)}
                    </td>

                    {/* Vendedor */}
                    <td style={tdBase}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Box sx={{
                          width: 28, height: 28, borderRadius: '8px', flexShrink: 0,
                          bgcolor: cancelado ? '#fde8e8' : '#eef2ff',
                          color: cancelado ? '#c4757c' : '#4338ca',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700,
                        }}>
                          {iniciales}
                        </Box>
                        <Typography sx={{
                          fontSize: 12, fontWeight: 600, lineHeight: 1.3,
                          color: cancelado ? '#c4757c' : '#334155',
                          textDecoration: cancelado ? 'line-through' : 'none',
                        }}>
                          {username || '—'}
                        </Typography>
                      </Box>
                    </td>

                    {/* Producto: nombre + precio alineados en grid 1fr auto */}
                    <td style={tdBase}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 420 }}>
                        {recibo.items.map((item) => (
                          <div key={item.id} style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto',
                            gap: '0 14px',
                            alignItems: 'baseline',
                          }}>
                            <span style={{
                              fontSize: 12.5,
                              color: cancelado ? '#c4757c' : '#334155',
                              textDecoration: cancelado ? 'line-through' : undefined,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {item.producto}
                            </span>
                            <span style={{
                              fontSize: 12.5,
                              fontWeight: 600,
                              fontVariantNumeric: 'tabular-nums',
                              whiteSpace: 'nowrap',
                              color: cancelado ? '#c4757c' : (item.precio_unitario === 0 ? '#cbd5e1' : '#FF6600'),
                              textDecoration: cancelado ? 'line-through' : undefined,
                            }}>
                              {fmt(item.precio_unitario)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Cant. */}
                    <td style={{ ...tdText, textAlign: 'center', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {cantTotal}
                    </td>

                    {/* Total */}
                    <td style={{ ...tdText, textAlign: 'right', fontWeight: 800, fontSize: 13, fontVariantNumeric: 'tabular-nums', color: cancelado ? '#c4757c' : '#0f172a' }}>
                      {fmt(recibo.total)}
                    </td>

                    {/* Estado */}
                    <td style={{ ...tdBase, textAlign: 'center' }}>
                      <Box component="span" sx={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        borderRadius: '999px', px: '9px', py: '3px',
                        fontSize: '10.5px', fontWeight: 700,
                        bgcolor: cancelado ? '#fef2f2' : '#ecfdf5',
                        color: cancelado ? '#b91c1c' : '#047857',
                      }}>
                        <Box component="span" sx={{
                          width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                          bgcolor: cancelado ? '#ef4444' : '#10b981',
                          display: 'inline-block',
                        }} />
                        {cancelado ? 'Cancelada' : 'Activa'}
                      </Box>
                    </td>

                    {/* Acciones */}
                    <td style={{ ...tdBase, textAlign: 'center', borderRight: 'none' }}>
                      <Box sx={{ display: 'flex', gap: '6px', justifyContent: 'center', opacity: cancelado ? 0.4 : 1 }}>
                        <IconButton
                          size="small"
                          title="Reimprimir"
                          onClick={() => reimprimir(recibo)}
                          sx={{
                            width: 28, height: 28, borderRadius: '7px',
                            border: '1px solid #e2e8f0', color: '#64748b',
                            '&:hover': { bgcolor: '#f8fafc' },
                          }}
                        >
                          <PrintIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                        {puedeCancelar && (
                          <IconButton
                            size="small"
                            title="Cancelar recibo"
                            disabled={cancelando === recibo.folio || cancelado}
                            onClick={() => cancelarRecibo(recibo)}
                            sx={{
                              width: 28, height: 28, borderRadius: '7px',
                              border: '1px solid #e2e8f0', color: '#64748b',
                              '&:hover:not(:disabled)': { borderColor: '#fecaca', bgcolor: '#fef2f2', color: '#dc2626' },
                            }}
                          >
                            <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        )}
                      </Box>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ fontFamily: 'Inter, system-ui, sans-serif', maxWidth: 1240, mx: 'auto' }}>

      {/* ── Toolbar: filtros + KPIs ── */}
      <Box sx={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start', mb: 2 }}>

        {/* Filtros */}
        <Box sx={{
          flex: 1, minWidth: 280,
          border: '1px solid #e2e8f0', borderRadius: '12px',
          p: '12px 14px', bgcolor: '#fff',
          display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-end',
        }}>
          <TextField
            label="Fecha"
            type="date"
            size="small"
            value={fecha}
            onChange={(e) => {
              setFecha(e.target.value);
              if (busquedaFolio) { setFolioInput(''); setBusquedaFolio(''); }
            }}
            InputLabelProps={{ shrink: true }}
            disabled={!!busquedaFolio}
            sx={inputSx}
          />
          <TextField
            label="Buscar folio"
            size="small"
            value={folioInput}
            onChange={(e) => setFolioInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleBuscarFolio(); }}
            placeholder="ej. V-123"
            sx={{ ...inputSx, width: 200 }}
          />
          <Button
            variant="contained"
            size="small"
            onClick={handleBuscarFolio}
            startIcon={<SearchIcon sx={{ fontSize: 15 }} />}
            sx={{
              height: 36, borderRadius: '8px', bgcolor: '#FF6600',
              fontWeight: 800, fontSize: 12, textTransform: 'uppercase',
              px: 2, boxShadow: 'none',
              '&:hover': { bgcolor: '#ea5c00', boxShadow: 'none' },
            }}
          >
            Buscar
          </Button>
          {busquedaFolio && (
            <Button
              variant="outlined" size="small"
              onClick={handleLimpiarFolio}
              sx={{ height: 36, borderRadius: '8px', fontSize: 12 }}
            >
              Limpiar
            </Button>
          )}
          {esAdmin && modulos && modulos.length > 0 && (
            <Select
              size="small"
              displayEmpty
              value={moduloId}
              onChange={(e) => setModuloId(e.target.value)}
              sx={{ minWidth: 160, height: 36, borderRadius: '8px', fontSize: 13 }}
            >
              <MenuItem value="">Todos los módulos</MenuItem>
              {modulos.map((m) => (
                <MenuItem key={m.id} value={String(m.id)}>{m.nombre}</MenuItem>
              ))}
            </Select>
          )}
        </Box>

        {/* KPIs */}
        <Box sx={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {([
            { label: 'ACCESORIOS', valor: totalAccesorios, color: '#6A1B9A', bgIcon: '#F3E5F5', letra: 'A' },
            { label: 'TELÉFONOS',  valor: totalTelefonos,  color: '#1565C0', bgIcon: '#E3F2FD', letra: 'T' },
          ] as const).map((kpi) => (
            <Box key={kpi.label} sx={{
              bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
              p: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', minWidth: 170,
            }}>
              <Box sx={{
                width: 38, height: 38, borderRadius: '10px',
                bgcolor: kpi.bgIcon, color: kpi.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 15, flexShrink: 0,
              }}>
                {kpi.letra}
              </Box>
              <Box>
                <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px', lineHeight: 1.3 }}>
                  {kpi.label}
                </Typography>
                <Typography sx={{ fontSize: 19, fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                  {fmt(kpi.valor)}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── Spinner ── */}
      {cargando && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {/* ── Secciones ── */}
      {!cargando && (
        <>
          {seccion(recibosAccesorios, 'Accesorios', '#6A1B9A')}
          {seccion(recibosTelefonos,  'Teléfonos',  '#1565C0')}
        </>
      )}
    </Box>
  );
}
