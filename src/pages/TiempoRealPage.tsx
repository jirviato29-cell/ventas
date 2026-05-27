import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Tooltip as MuiTooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import axios from 'axios';

const API = "https://ato-appservidor.onrender.com";
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` });

// ── Types ─────────────────────────────────────────────────────────────────────

interface CM { cantidad: number; monto: number; }
interface TRData {
  fecha: string;
  fecha_texto: string;
  hora_actual: string;
  horas_transcurridas: number;
  horas_totales: number;
  porcentaje_dia: number;
  resumen_general: { total_ventas_mxn: number; total_telefonos: number; total_chips: number; total_accesorios: number; };
  telefonos: { total: number; contado: CM; payjoy: CM; paguitos: CM; sin_clasificar: CM; };
  chips: { total: number; por_tipo: { tipo_chip: string; cantidad: number }[]; por_monto_recarga: { monto: string; cantidad: number }[]; };
  accesorios: { total_unidades: number; monto_total: number; top_5_productos: { producto: string; cantidad: number; monto: number }[]; };
  lista_telefonos_hoy: { hora: string; modulo: string; asesor: string; producto: string; tipo_venta: string; precio: number; }[];
  por_modulo: {
    modulo: string;
    total_mxn: number;
    telefonos_contado: number;
    telefonos_payjoy: number;
    telefonos_paguitos: number;
    telefonos_total: number;
    chips: number;
    accesorios: number;
    promedio_diario_historico: number;
    meta_proporcional: number;
    productividad_pct: number | null;
    dias_considerados: number;
  }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt$ = (n: number) =>
  `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtN = (n: number) => n.toLocaleString('es-MX');
const pct = (part: number, total: number) =>
  total > 0 ? `${Math.round((part / total) * 100)}%` : '0%';

const PHONE_COLORS = ['#22c55e', '#f97316', '#3b82f6', '#94a3b8'];

const cardSx = {
  p: { xs: 2, md: 2.5 },
  borderRadius: 2,
  border: '1px solid #e2e8f0',
  height: '100%',
};

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: '#94a3b8',
  letterSpacing: '0.05em',
  marginBottom: 6,
};

const tipoChip = (tipo: string) => {
  const t = tipo.toLowerCase();
  if (t === 'contado') return { label: 'Contado', color: '#22c55e', bg: '#f0fdf4' };
  if (t === 'payjoy' || t === 'pajoy') return { label: 'Payjoy', color: '#f97316', bg: '#fff7ed' };
  if (t === 'paguitos') return { label: 'Paguitos', color: '#3b82f6', bg: '#eff6ff' };
  return { label: tipo || '—', color: '#94a3b8', bg: '#f8fafc' };
};

// ── Component ─────────────────────────────────────────────────────────────────

const TiempoRealPage: React.FC = () => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const [data, setData] = useState<TRData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: resp } = await axios.get<TRData>(
        `${API}/direccion/tiempo-real`,
        { headers: authH() },
      );
      setData(resp);
      setLastUpdate(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch {
      setError('Error al cargar datos. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (!data && !loading && !error)
    return <CircularProgress sx={{ color: '#FF6600', display: 'block', mx: 'auto', mt: 10 }} size={52} />;

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 2, md: 3 } }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1.5}>
        <Box>
          <Typography variant="h4" fontWeight={800} lineHeight={1.2}>
            ⚡ Tiempo Real
          </Typography>
          {data && (
            <Typography variant="body2" color="text.secondary" mt={0.3}>
              {data.fecha_texto} · {data.hora_actual}
              {lastUpdate && (
                <span style={{ marginLeft: 8, color: '#94a3b8', fontSize: 11 }}>
                  (actualizado {lastUpdate})
                </span>
              )}
            </Typography>
          )}
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={cargar}
          disabled={loading}
          sx={{
            borderColor: '#FF6600',
            color: '#FF6600',
            fontWeight: 700,
            '&:hover': { bgcolor: '#fff3e0', borderColor: '#FF6600' },
          }}
        >
          Actualizar
        </Button>
      </Box>

      {/* ── BARRA DE PROGRESO DEL DÍA ───────────────────────────────────────── */}
      {data && (
        <Paper elevation={0} sx={{ p: 1.5, mb: 2.5, borderRadius: 2, border: '1px solid #e2e8f0' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.8}>
            <Typography fontSize={13} fontWeight={600}>
              🕐 Llevamos{' '}
              <strong>{data.horas_transcurridas}</strong> de {data.horas_totales} hrs del día laboral (09:00–21:00)
            </Typography>
            <Typography fontSize={13} fontWeight={700} color="#FF6600">
              {data.porcentaje_dia}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(data.porcentaje_dia, 100)}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: '#f1f5f9',
              '& .MuiLinearProgress-bar': { bgcolor: '#FF6600', borderRadius: 4 },
            }}
          />
        </Paper>
      )}

      {/* ── LOADING ────────────────────────────────────────────────────────── */}
      {loading && (
        <Box textAlign="center" py={10}>
          <CircularProgress sx={{ color: '#FF6600' }} size={52} />
          <Typography mt={2} color="text.secondary">Cargando datos en tiempo real...</Typography>
        </Box>
      )}

      {error && !loading && (
        <Typography color="error" textAlign="center" mt={6} fontSize={15}>{error}</Typography>
      )}

      {!loading && !error && data && (
        <>
          {/* ── S1: RESUMEN GENERAL ──────────────────────────────────────── */}
          <Grid container spacing={2} mb={3}>
            {[
              { label: 'Total facturado hoy', value: fmt$(data.resumen_general.total_ventas_mxn), icon: '💰', gradient: 'linear-gradient(135deg, #15803d 0%, #22c55e 100%)' },
              { label: 'Teléfonos vendidos hoy', value: fmtN(data.resumen_general.total_telefonos), icon: '📱', gradient: 'linear-gradient(135deg, #c2410c 0%, #f97316 100%)' },
              { label: 'Chips activados hoy', value: fmtN(data.resumen_general.total_chips), icon: '📲', gradient: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)' },
              { label: 'Accesorios vendidos hoy', value: fmtN(data.resumen_general.total_accesorios), icon: '🎧', gradient: 'linear-gradient(135deg, #7e22ce 0%, #a855f7 100%)' },
            ].map((card) => (
              <Grid item xs={12} sm={6} md={3} key={card.label}>
                <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 2, background: card.gradient, color: 'white', textAlign: 'center', minHeight: 130, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Typography fontSize={34} lineHeight={1.1}>{card.icon}</Typography>
                  <Typography fontWeight={800} fontSize={{ xs: 26, md: 30 }} mt={0.5} sx={{ letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                    {card.value}
                  </Typography>
                  <Typography fontSize={12} mt={0.5} sx={{ opacity: 0.88 }}>{card.label}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* ── S2 + S3: TELÉFONOS + CHIPS ───────────────────────────────── */}
          <Grid container spacing={2} mb={3}>

            {/* TELÉFONOS */}
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={cardSx}>
                <Typography variant="h6" fontWeight={700} mb={2}>📱 Teléfonos por tipo de venta</Typography>
                <Box display="flex" gap={2} alignItems="flex-start" flexWrap="wrap">
                  <Box sx={{ flex: 1, minWidth: 160 }}>
                    {[
                      { label: 'Contado', item: data.telefonos.contado, color: '#22c55e' },
                      { label: 'Payjoy', item: data.telefonos.payjoy, color: '#f97316' },
                      { label: 'Paguitos', item: data.telefonos.paguitos, color: '#3b82f6' },
                    ].map(({ label, item, color }) => (
                      <Box key={label} sx={{ p: 1.5, mb: 1, borderRadius: 1.5, border: `1.5px solid ${color}33`, bgcolor: `${color}0D` }}>
                        <Box display="flex" justifyContent="space-between" alignItems="baseline">
                          <Typography fontWeight={700} fontSize={12} color={color}>{label}</Typography>
                          <Typography fontWeight={800} fontSize={24} color={color} lineHeight={1}>{fmtN(item.cantidad)}</Typography>
                        </Box>
                        <Typography fontSize={11} color="text.secondary" mt={0.3}>
                          {fmt$(item.monto)} · {pct(item.cantidad, data.telefonos.total)}
                        </Typography>
                      </Box>
                    ))}
                    {data.telefonos.sin_clasificar.cantidad > 0 && (
                      <Typography fontSize={12} color="warning.dark" mt={0.5}>
                        ⚠️ {fmtN(data.telefonos.sin_clasificar.cantidad)} sin clasificar ({fmt$(data.telefonos.sin_clasificar.monto)})
                      </Typography>
                    )}
                  </Box>
                  {isDesktop && data.telefonos.total > 0 && (
                    <Box sx={{ width: 185, height: 185, flexShrink: 0 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Contado', value: data.telefonos.contado.cantidad },
                              { name: 'Payjoy', value: data.telefonos.payjoy.cantidad },
                              { name: 'Paguitos', value: data.telefonos.paguitos.cantidad },
                              ...(data.telefonos.sin_clasificar.cantidad > 0 ? [{ name: 'Sin clasificar', value: data.telefonos.sin_clasificar.cantidad }] : []),
                            ].filter((d) => d.value > 0)}
                            cx="50%" cy="50%" innerRadius={48} outerRadius={80} paddingAngle={2} dataKey="value"
                          >
                            {PHONE_COLORS.map((color, i) => <Cell key={i} fill={color} />)}
                          </Pie>
                          <Tooltip formatter={(v: any) => [fmtN(Number(v)), '']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* CHIPS */}
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={cardSx}>
                <Typography variant="h6" fontWeight={700} mb={2}>
                  📲 Chips activados — <span style={{ color: '#3b82f6' }}>{fmtN(data.chips.total)}</span>
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={7}>
                    <p style={sectionLabel}>POR TIPO DE CHIP</p>
                    {(data.chips.por_tipo ?? []).length === 0 && <Typography fontSize={12} color="text.secondary">Sin datos</Typography>}
                    {(data.chips.por_tipo ?? []).map((item) => {
                      const barW = data.chips.total > 0 ? `${Math.round((item.cantidad / data.chips.total) * 100)}%` : '0%';
                      return (
                        <Box key={item.tipo_chip} mb={0.9}>
                          <Box display="flex" justifyContent="space-between" mb={0.3}>
                            <Typography fontSize={12} noWrap sx={{ maxWidth: 140 }}>{item.tipo_chip}</Typography>
                            <Typography fontSize={12} fontWeight={700}>{fmtN(item.cantidad)}</Typography>
                          </Box>
                          <Box sx={{ height: 6, bgcolor: '#e2e8f0', borderRadius: 3 }}>
                            <Box sx={{ height: 6, bgcolor: '#3b82f6', borderRadius: 3, width: barW, transition: 'width 0.4s' }} />
                          </Box>
                        </Box>
                      );
                    })}
                  </Grid>
                  <Grid item xs={12} sm={5}>
                    <p style={sectionLabel}>POR MONTO DE RECARGA</p>
                    {(data.chips.por_monto_recarga ?? []).length === 0 && <Typography fontSize={12} color="text.secondary">Sin datos</Typography>}
                    {(data.chips.por_monto_recarga ?? []).map((item) => (
                      <Box key={item.monto} display="flex" justifyContent="space-between" alignItems="center" mb={0.5} sx={{ py: 0.5, px: 1, bgcolor: '#f8fafc', borderRadius: 1 }}>
                        <Typography fontSize={13} fontWeight={600}>{item.monto}</Typography>
                        <Typography fontSize={13} fontWeight={700} color="#3b82f6">{fmtN(item.cantidad)}</Typography>
                      </Box>
                    ))}
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>

          {/* ── S4: LISTA DE TELÉFONOS HOY ───────────────────────────────── */}
          <Paper elevation={0} sx={{ ...cardSx, mb: 3 }}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              📱 Teléfonos vendidos hoy{' '}
              <span style={{ color: '#f97316' }}>({fmtN(data.lista_telefonos_hoy.length)})</span>
            </Typography>
            {data.lista_telefonos_hoy.length === 0 ? (
              <Typography fontSize={14} color="text.secondary" textAlign="center" py={4}>
                Aún no hay teléfonos vendidos hoy
              </Typography>
            ) : (
              <Box sx={{ maxHeight: 500, overflowY: 'auto', overflowX: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                      {['Hora', 'Asesor', 'Módulo', 'Modelo', 'Tipo', 'Precio'].map((h, i) => (
                        <TableCell key={h} align={i >= 5 ? 'right' : 'left'} sx={{ fontWeight: 700, color: '#FF6600', fontSize: 11, whiteSpace: 'nowrap', bgcolor: '#f8fafc' }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.lista_telefonos_hoy.map((tel, i) => {
                      const tc = tipoChip(tel.tipo_venta);
                      return (
                        <TableRow key={i} hover>
                          <TableCell sx={{ fontSize: 12, fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>{tel.hora}</TableCell>
                          <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{tel.asesor}</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{tel.modulo}</TableCell>
                          <TableCell sx={{ fontSize: 12, maxWidth: 200 }}>{tel.producto}</TableCell>
                          <TableCell>
                            <Box component="span" sx={{ display: 'inline-block', px: 1, py: 0.2, borderRadius: 1, bgcolor: tc.bg, color: tc.color, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                              {tc.label}
                            </Box>
                          </TableCell>
                          <TableCell align="right" sx={{ fontSize: 13, fontWeight: 700, color: '#15803d', whiteSpace: 'nowrap' }}>{fmt$(tel.precio)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Paper>

          {/* ── S5: ACCESORIOS ───────────────────────────────────────────── */}
          <Paper elevation={0} sx={{ ...cardSx, mb: 3 }}>
            <Typography variant="h6" fontWeight={700} mb={1.5}>🎧 Accesorios</Typography>
            <Box display="flex" gap={3} mb={2} flexWrap="wrap">
              <Box>
                <Typography fontSize={30} fontWeight={800} color="#a855f7" lineHeight={1.1}>{fmtN(data.accesorios.total_unidades)}</Typography>
                <Typography fontSize={11} color="text.secondary">unidades vendidas</Typography>
              </Box>
              <Box>
                <Typography fontSize={30} fontWeight={800} color="#a855f7" lineHeight={1.1}>{fmt$(data.accesorios.monto_total)}</Typography>
                <Typography fontSize={11} color="text.secondary">total en ventas</Typography>
              </Box>
            </Box>
            <Divider sx={{ mb: 1.5 }} />
            <p style={sectionLabel}>TOP 5 PRODUCTOS MÁS VENDIDOS HOY</p>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ py: 0.5, fontSize: 11, color: '#94a3b8', pl: 0, fontWeight: 600 }}>#</TableCell>
                  <TableCell sx={{ py: 0.5, fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Producto</TableCell>
                  <TableCell align="right" sx={{ py: 0.5, fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Cant.</TableCell>
                  <TableCell align="right" sx={{ py: 0.5, fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Monto</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data.accesorios.top_5_productos ?? []).map((p, i) => (
                  <TableRow key={p.producto} hover>
                    <TableCell sx={{ py: 0.8, pl: 0, fontWeight: 700, color: '#94a3b8', fontSize: 12 }}>{i + 1}</TableCell>
                    <TableCell sx={{ py: 0.8, fontSize: 13 }}>{p.producto}</TableCell>
                    <TableCell align="right" sx={{ py: 0.8, fontWeight: 600, fontSize: 13 }}>{fmtN(p.cantidad)}</TableCell>
                    <TableCell align="right" sx={{ py: 0.8, fontSize: 13, color: '#a855f7', fontWeight: 600 }}>{fmt$(p.monto)}</TableCell>
                  </TableRow>
                ))}
                {(data.accesorios.top_5_productos ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, py: 2 }}>Sin datos</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>

          {/* ── S6: DESEMPEÑO POR MÓDULO ─────────────────────────────────── */}
          <Paper elevation={0} sx={cardSx}>
            <Typography variant="h6" fontWeight={700} mb={2}>🏪 Desempeño por módulo — hoy</Typography>

            {isDesktop && (data.por_modulo ?? []).length > 0 && (
              <Box sx={{ height: 260, mb: 3 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.por_modulo ?? []} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="modulo" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => [fmt$(Number(v)), 'Total MXN']} contentStyle={{ fontSize: 13, borderRadius: 8 }} />
                    <Bar dataKey="total_mxn" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}

            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 820 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    {['Módulo', 'Total MXN', 'Contado', 'Payjoy', 'Paguitos', 'Total Tels', 'Chips', 'Accesorios', 'Productividad'].map((h, i) => (
                      <TableCell key={h} align={i === 0 ? 'left' : 'right'} sx={{ fontWeight: 700, color: '#FF6600', fontSize: 11, whiteSpace: 'nowrap' }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data.por_modulo ?? []).map((mod, idx) => {
                    const isTop = idx === 0;
                    const prodColor =
                      mod.productividad_pct === null ? '#94a3b8'
                      : mod.productividad_pct >= 100 ? '#4CAF50'
                      : mod.productividad_pct >= 70 ? '#FF9800'
                      : '#F44336';
                    const prodLabel = mod.productividad_pct === null ? 'N/A' : `${mod.productividad_pct.toFixed(1)}%`;
                    const hrRef = data.horas_transcurridas;
                    const prodTooltip = mod.productividad_pct !== null
                      ? `Promedio diario histórico (${mod.dias_considerados} meses op.): ${fmt$(mod.promedio_diario_historico)}\nMeta proporcional (${hrRef} de 12 hrs): ${fmt$(mod.meta_proporcional)}\nVendido hasta ahora: ${fmt$(mod.total_mxn)}`
                      : 'Sin meses operativos en los últimos 6 meses (mín. 100 ventas/mes)';
                    return (
                      <TableRow key={mod.modulo} hover sx={isTop ? { bgcolor: '#fff7ed' } : {}}>
                        <TableCell sx={{ fontWeight: isTop ? 800 : 600, fontSize: 13, whiteSpace: 'nowrap' }}>{mod.modulo}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: 13, color: '#15803d' }}>{fmt$(mod.total_mxn)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, color: '#22c55e' }}>{fmtN(mod.telefonos_contado)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, color: '#f97316' }}>{fmtN(mod.telefonos_payjoy)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, color: '#3b82f6' }}>{fmtN(mod.telefonos_paguitos)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, fontWeight: 600 }}>{fmtN(mod.telefonos_total)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 12 }}>{fmtN(mod.chips)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 12 }}>{fmtN(mod.accesorios)}</TableCell>
                        <TableCell align="right">
                          <MuiTooltip
                            title={<span style={{ whiteSpace: 'pre-line', fontSize: 12 }}>{prodTooltip}</span>}
                            arrow
                            placement="left"
                          >
                            <Typography component="span" fontWeight={700} fontSize={12} color={prodColor} sx={{ cursor: 'default' }}>
                              {prodLabel}
                            </Typography>
                          </MuiTooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Fila TOTAL */}
                  {(data.por_modulo ?? []).length > 0 && (() => {
                    const tot = (data.por_modulo ?? []).reduce(
                      (a, m) => ({
                        mxn: a.mxn + m.total_mxn,
                        contado: a.contado + m.telefonos_contado,
                        payjoy: a.payjoy + m.telefonos_payjoy,
                        paguitos: a.paguitos + m.telefonos_paguitos,
                        tels: a.tels + m.telefonos_total,
                        chips: a.chips + m.chips,
                        acc: a.acc + m.accesorios,
                      }),
                      { mxn: 0, contado: 0, payjoy: 0, paguitos: 0, tels: 0, chips: 0, acc: 0 },
                    );
                    return (
                      <TableRow sx={{ bgcolor: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                        <TableCell sx={{ fontWeight: 800, fontSize: 12 }}>TOTAL</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, fontSize: 13, color: '#15803d' }}>{fmt$(tot.mxn)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: '#22c55e' }}>{fmtN(tot.contado)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: '#f97316' }}>{fmtN(tot.payjoy)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: '#3b82f6' }}>{fmtN(tot.paguitos)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>{fmtN(tot.tels)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>{fmtN(tot.chips)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>{fmtN(tot.acc)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, color: '#94a3b8' }}>—</TableCell>
                      </TableRow>
                    );
                  })()}

                  {(data.por_modulo ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} sx={{ textAlign: 'center', color: '#94a3b8', py: 3 }}>Sin datos</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default TiempoRealPage;
