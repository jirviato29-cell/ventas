import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
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
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import axios from 'axios';

const API = "https://ato-appservidor.onrender.com";
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` });

// ── Types ─────────────────────────────────────────────────────────────────────

interface CM { cantidad: number; monto: number; }
interface EstData {
  mes: string;
  periodo_texto: string;
  resumen_general: { total_ventas_mxn: number; total_telefonos: number; total_chips: number; total_accesorios: number; total_planes: number; };
  telefonos: { total: number; contado: CM; payjoy: CM; paguitos: CM; sin_clasificar: CM; };
  accesorios: { total_unidades: number; monto_total: number; top_5_productos: { producto: string; cantidad: number; monto: number }[]; };
  chips: { total: number; por_tipo: { tipo_chip: string; cantidad: number }[]; por_monto_recarga: { monto: string; cantidad: number }[]; };
  planes: { total: number; por_tramite: { tramite: string; cantidad: number }[]; por_plan: { plan: string; cantidad: number }[]; };
  por_modulo: {
    modulo: string;
    total_mxn: number;
    telefonos_contado: number;
    telefonos_payjoy: number;
    telefonos_paguitos: number;
    telefonos_total: number;
    chips: number;
    accesorios: number;
    planes: number;
    promedio_historico: number;
    meta_proporcional: number;
    productividad_pct: number | null;
    meses_considerados: number;
  }[];
  ventas_por_dia: { dia: number; total: number }[];
  telefonos_por_modulo: { modulo: string; total_telefonos: number; monto_total: number; contado: number; payjoy: number; paguitos: number }[];
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

// ── Component ─────────────────────────────────────────────────────────────────

const EstadisticasPage: React.FC = () => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const [mes, setMes] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [data, setData] = useState<EstData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (mesParam: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data: resp } = await axios.get<EstData>(
        `${API}/direccion/estadisticas`,
        { headers: authH(), params: { mes: mesParam } },
      );
      setData(resp);
    } catch {
      setError('Error al cargar estadísticas. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar(mes);
  }, [mes, cargar]);

  if (!data && !loading && !error) return <CircularProgress sx={{ color: '#FF6600', display: 'block', mx: 'auto', mt: 10 }} size={52} />;

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 2, md: 3 } }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={3}
        flexWrap="wrap"
        gap={1.5}
      >
        <Box>
          <Typography variant="h4" fontWeight={800} lineHeight={1.2}>
            📊 Estadísticas
          </Typography>
          {data && (
            <Typography variant="body2" color="text.secondary" mt={0.3}>
              {data.periodo_texto}
            </Typography>
          )}
        </Box>
        <Box display="flex" alignItems="center" gap={1.5}>
          <TextField
            type="month"
            size="small"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            sx={{
              minWidth: 165,
              '& .MuiOutlinedInput-root:hover fieldset': { borderColor: '#FF6600' },
              '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: '#FF6600' },
            }}
          />
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => cargar(mes)}
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
      </Box>

      {/* ── LOADING ────────────────────────────────────────────────────────── */}
      {loading && (
        <Box textAlign="center" py={10}>
          <CircularProgress sx={{ color: '#FF6600' }} size={52} />
          <Typography mt={2} color="text.secondary">Calculando estadísticas...</Typography>
        </Box>
      )}

      {error && !loading && (
        <Typography color="error" textAlign="center" mt={6} fontSize={15}>
          {error}
        </Typography>
      )}

      {!loading && !error && data && (
        <>
          {/* ── S1: RESUMEN GENERAL ──────────────────────────────────────── */}
          <Grid container spacing={2} mb={3}>
            {[
              {
                label: 'Total facturado',
                value: fmt$(data.resumen_general.total_ventas_mxn),
                icon: '💰',
                gradient: 'linear-gradient(135deg, #15803d 0%, #22c55e 100%)',
              },
              {
                label: 'Teléfonos vendidos',
                value: fmtN(data.resumen_general.total_telefonos),
                icon: '📱',
                gradient: 'linear-gradient(135deg, #c2410c 0%, #f97316 100%)',
              },
              {
                label: 'Chips activados',
                value: fmtN(data.resumen_general.total_chips),
                icon: '📲',
                gradient: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
              },
              {
                label: 'Accesorios vendidos',
                value: fmtN(data.resumen_general.total_accesorios),
                icon: '🎧',
                gradient: 'linear-gradient(135deg, #7e22ce 0%, #a855f7 100%)',
              },
            ].map((card) => (
              <Grid item xs={12} sm={6} md={3} key={card.label}>
                <Paper
                  elevation={0}
                  sx={{
                    p: { xs: 2.5, md: 3 },
                    borderRadius: 2,
                    background: card.gradient,
                    color: 'white',
                    textAlign: 'center',
                    minHeight: 130,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}
                >
                  <Typography fontSize={34} lineHeight={1.1}>{card.icon}</Typography>
                  <Typography
                    fontWeight={800}
                    fontSize={{ xs: 26, md: 30 }}
                    mt={0.5}
                    sx={{ letterSpacing: '-0.5px', lineHeight: 1.1 }}
                  >
                    {card.value}
                  </Typography>
                  <Typography fontSize={12} mt={0.5} sx={{ opacity: 0.88 }}>
                    {card.label}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* ── S2 + S3: TELÉFONOS + CHIPS ───────────────────────────────── */}
          <Grid container spacing={2} mb={3}>

            {/* TELÉFONOS */}
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={cardSx}>
                <Typography variant="h6" fontWeight={700} mb={2}>
                  📱 Teléfonos por tipo de venta
                </Typography>
                <Box display="flex" gap={2} alignItems="flex-start" flexWrap="wrap">

                  {/* Stat sub-cards */}
                  <Box sx={{ flex: 1, minWidth: 160 }}>
                    {[
                      { label: 'Contado', item: data.telefonos.contado, color: '#22c55e' },
                      { label: 'Payjoy', item: data.telefonos.payjoy, color: '#f97316' },
                      { label: 'Paguitos', item: data.telefonos.paguitos, color: '#3b82f6' },
                    ].map(({ label, item, color }) => (
                      <Box
                        key={label}
                        sx={{
                          p: 1.5,
                          mb: 1,
                          borderRadius: 1.5,
                          border: `1.5px solid ${color}33`,
                          bgcolor: `${color}0D`,
                        }}
                      >
                        <Box display="flex" justifyContent="space-between" alignItems="baseline">
                          <Typography fontWeight={700} fontSize={12} color={color}>
                            {label}
                          </Typography>
                          <Typography fontWeight={800} fontSize={24} color={color} lineHeight={1}>
                            {fmtN(item.cantidad)}
                          </Typography>
                        </Box>
                        <Typography fontSize={11} color="text.secondary" mt={0.3}>
                          {fmt$(item.monto)} · {pct(item.cantidad, data.telefonos.total)}
                        </Typography>
                      </Box>
                    ))}
                    {data.telefonos.sin_clasificar.cantidad > 0 && (
                      <Typography fontSize={12} color="warning.dark" mt={0.5}>
                        ⚠️ {fmtN(data.telefonos.sin_clasificar.cantidad)} sin clasificar (
                        {fmt$(data.telefonos.sin_clasificar.monto)})
                      </Typography>
                    )}
                  </Box>

                  {/* Pie chart — desktop only */}
                  {isDesktop && data.telefonos.total > 0 && (
                    <Box sx={{ width: 185, height: 185, flexShrink: 0 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Contado', value: data.telefonos.contado.cantidad },
                              { name: 'Payjoy', value: data.telefonos.payjoy.cantidad },
                              { name: 'Paguitos', value: data.telefonos.paguitos.cantidad },
                              ...(data.telefonos.sin_clasificar.cantidad > 0
                                ? [{ name: 'Sin clasificar', value: data.telefonos.sin_clasificar.cantidad }]
                                : []),
                            ].filter((d) => d.value > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={48}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {PHONE_COLORS.map((color, i) => (
                              <Cell key={i} fill={color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(v: any) => [fmtN(Number(v)), '']}
                            contentStyle={{ fontSize: 12, borderRadius: 8 }}
                          />
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
                  📲 Chips activados —{' '}
                  <span style={{ color: '#3b82f6' }}>{fmtN(data.chips.total)}</span>
                </Typography>
                <Grid container spacing={2}>

                  {/* Por tipo — barras horizontales */}
                  <Grid item xs={12} sm={7}>
                    <p style={sectionLabel}>POR TIPO DE CHIP</p>
                    {(data.chips.por_tipo ?? []).length === 0 && (
                      <Typography fontSize={12} color="text.secondary">Sin datos</Typography>
                    )}
                    {(data.chips.por_tipo ?? []).map((item) => {
                      const barW = data.chips.total > 0
                        ? `${Math.round((item.cantidad / data.chips.total) * 100)}%`
                        : '0%';
                      return (
                        <Box key={item.tipo_chip} mb={0.9}>
                          <Box display="flex" justifyContent="space-between" mb={0.3}>
                            <Typography fontSize={12} noWrap sx={{ maxWidth: 140 }}>
                              {item.tipo_chip}
                            </Typography>
                            <Typography fontSize={12} fontWeight={700}>
                              {fmtN(item.cantidad)}
                            </Typography>
                          </Box>
                          <Box sx={{ height: 6, bgcolor: '#e2e8f0', borderRadius: 3 }}>
                            <Box
                              sx={{ height: 6, bgcolor: '#3b82f6', borderRadius: 3, width: barW, transition: 'width 0.4s' }}
                            />
                          </Box>
                        </Box>
                      );
                    })}
                  </Grid>

                  {/* Por monto de recarga */}
                  <Grid item xs={12} sm={5}>
                    <p style={sectionLabel}>POR MONTO DE RECARGA</p>
                    {(data.chips.por_monto_recarga ?? []).length === 0 && (
                      <Typography fontSize={12} color="text.secondary">Sin datos</Typography>
                    )}
                    {(data.chips.por_monto_recarga ?? []).map((item) => (
                      <Box
                        key={item.monto}
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        mb={0.5}
                        sx={{ py: 0.5, px: 1, bgcolor: '#f8fafc', borderRadius: 1 }}
                      >
                        <Typography fontSize={13} fontWeight={600}>
                          {item.monto}
                        </Typography>
                        <Typography fontSize={13} fontWeight={700} color="#3b82f6">
                          {fmtN(item.cantidad)}
                        </Typography>
                      </Box>
                    ))}
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>

          {/* ── S4 + S5: PLANES + ACCESORIOS ─────────────────────────────── */}
          <Grid container spacing={2} mb={3}>

            {/* PLANES */}
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={cardSx}>
                <Typography variant="h6" fontWeight={700} mb={2}>
                  📋 Planes Telcel —{' '}
                  <span style={{ color: '#f97316' }}>{fmtN(data.planes.total)}</span>
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <p style={sectionLabel}>POR TRÁMITE</p>
                    {(data.planes.por_tramite ?? []).length === 0 && (
                      <Typography fontSize={12} color="text.secondary">Sin datos</Typography>
                    )}
                    {(data.planes.por_tramite ?? []).map((item) => (
                      <Box
                        key={item.tramite}
                        display="flex"
                        justifyContent="space-between"
                        mb={0.5}
                        sx={{ py: 0.5, px: 1, bgcolor: '#f8fafc', borderRadius: 1 }}
                      >
                        <Typography fontSize={11} sx={{ flex: 1, mr: 1, lineHeight: 1.3 }}>
                          {item.tramite}
                        </Typography>
                        <Typography
                          fontSize={13}
                          fontWeight={700}
                          color="#f97316"
                          flexShrink={0}
                        >
                          {fmtN(item.cantidad)}
                        </Typography>
                      </Box>
                    ))}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <p style={sectionLabel}>POR PLAN</p>
                    {(data.planes.por_plan ?? []).length === 0 && (
                      <Typography fontSize={12} color="text.secondary">Sin datos</Typography>
                    )}
                    {(data.planes.por_plan ?? []).map((item) => (
                      <Box
                        key={item.plan}
                        display="flex"
                        justifyContent="space-between"
                        mb={0.5}
                        sx={{ py: 0.5, px: 1, bgcolor: '#f8fafc', borderRadius: 1 }}
                      >
                        <Typography fontSize={12} sx={{ flex: 1, mr: 1 }}>
                          {item.plan}
                        </Typography>
                        <Typography
                          fontSize={13}
                          fontWeight={700}
                          color="#f97316"
                          flexShrink={0}
                        >
                          {fmtN(item.cantidad)}
                        </Typography>
                      </Box>
                    ))}
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* ACCESORIOS */}
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={cardSx}>
                <Typography variant="h6" fontWeight={700} mb={1.5}>
                  🎧 Accesorios
                </Typography>
                <Box display="flex" gap={3} mb={2} flexWrap="wrap">
                  <Box>
                    <Typography fontSize={30} fontWeight={800} color="#a855f7" lineHeight={1.1}>
                      {fmtN(data.accesorios.total_unidades)}
                    </Typography>
                    <Typography fontSize={11} color="text.secondary">
                      unidades vendidas
                    </Typography>
                  </Box>
                  <Box>
                    <Typography fontSize={30} fontWeight={800} color="#a855f7" lineHeight={1.1}>
                      {fmt$(data.accesorios.monto_total)}
                    </Typography>
                    <Typography fontSize={11} color="text.secondary">
                      total en ventas
                    </Typography>
                  </Box>
                </Box>
                <Divider sx={{ mb: 1.5 }} />
                <p style={sectionLabel}>TOP 5 PRODUCTOS MÁS VENDIDOS</p>
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
                        <TableCell sx={{ py: 0.8, pl: 0, fontWeight: 700, color: '#94a3b8', fontSize: 12 }}>
                          {i + 1}
                        </TableCell>
                        <TableCell sx={{ py: 0.8, fontSize: 13 }}>{p.producto}</TableCell>
                        <TableCell align="right" sx={{ py: 0.8, fontWeight: 600, fontSize: 13 }}>
                          {fmtN(p.cantidad)}
                        </TableCell>
                        <TableCell align="right" sx={{ py: 0.8, fontSize: 13, color: '#a855f7', fontWeight: 600 }}>
                          {fmt$(p.monto)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(data.accesorios.top_5_productos ?? []).length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          sx={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, py: 2 }}
                        >
                          Sin datos
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Paper>
            </Grid>
          </Grid>

          {/* ── S6: POR MÓDULO ───────────────────────────────────────────── */}
          <Paper elevation={0} sx={{ ...cardSx, mb: 3 }}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              🏪 Desempeño por módulo
            </Typography>

            {/* Bar chart — desktop only */}
            {isDesktop && (data.por_modulo ?? []).length > 0 && (
              <Box sx={{ height: 280, mb: 3 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.por_modulo ?? []}
                    margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="modulo" tick={{ fontSize: 12 }} />
                    <YAxis
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(v: any) => [fmt$(Number(v)), 'Total MXN']}
                      contentStyle={{ fontSize: 13, borderRadius: 8 }}
                    />
                    <Bar dataKey="total_mxn" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}

            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 900 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    {['Módulo', 'Total MXN', 'Contado', 'Payjoy', 'Paguitos', 'Total Tels', 'Chips', 'Accesorios', 'Planes', 'Productividad'].map((h, i) => (
                      <TableCell
                        key={h}
                        align={i === 0 ? 'left' : 'right'}
                        sx={{ fontWeight: 700, color: '#FF6600', fontSize: 11, whiteSpace: 'nowrap' }}
                      >
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data.por_modulo ?? []).map((mod, idx) => {
                    const isTop = idx === 0;
                    const prodColor =
                      mod.productividad_pct === null
                        ? '#94a3b8'
                        : mod.productividad_pct >= 100
                        ? '#4CAF50'
                        : mod.productividad_pct >= 70
                        ? '#FF9800'
                        : '#F44336';
                    const prodLabel =
                      mod.productividad_pct === null
                        ? 'N/A'
                        : `${mod.productividad_pct.toFixed(1)}%`;
                    const hoy = new Date();
                    const [mesY, mesM] = data.mes.split('-').map(Number);
                    const esMesActual = hoy.getFullYear() === mesY && hoy.getMonth() + 1 === mesM;
                    const diaRef = esMesActual ? hoy.getDate() : new Date(mesY, mesM, 0).getDate();
                    const diasTotales = new Date(mesY, mesM, 0).getDate();
                    const prodTooltip = mod.productividad_pct !== null
                      ? `Promedio últimos ${mod.meses_considerados} meses operativos: ${fmt$(mod.promedio_historico)}\nMeta proporcional al día ${diaRef} de ${diasTotales}: ${fmt$(mod.meta_proporcional)}\nVendido hasta hoy: ${fmt$(mod.total_mxn)}`
                      : 'Sin meses operativos en los últimos 12 meses (mín. 100 ventas/mes)';
                    return (
                      <TableRow key={mod.modulo} hover sx={isTop ? { bgcolor: '#fff7ed' } : {}}>
                        <TableCell sx={{ fontWeight: isTop ? 800 : 600, fontSize: 13, whiteSpace: 'nowrap' }}>
                          {mod.modulo}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: 13, color: '#15803d' }}>
                          {fmt$(mod.total_mxn)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, color: '#22c55e' }}>
                          {fmtN(mod.telefonos_contado)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, color: '#f97316' }}>
                          {fmtN(mod.telefonos_payjoy)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, color: '#3b82f6' }}>
                          {fmtN(mod.telefonos_paguitos)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, fontWeight: 600 }}>
                          {fmtN(mod.telefonos_total)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 12 }}>{fmtN(mod.chips)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 12 }}>{fmtN(mod.accesorios)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 12 }}>{fmtN(mod.planes)}</TableCell>
                        <TableCell align="right">
                          <MuiTooltip
                            title={<span style={{ whiteSpace: 'pre-line', fontSize: 12 }}>{prodTooltip}</span>}
                            arrow
                            placement="left"
                          >
                            <Typography
                              component="span"
                              fontWeight={700}
                              fontSize={12}
                              color={prodColor}
                              sx={{ cursor: 'default' }}
                            >
                              {prodLabel}
                            </Typography>
                          </MuiTooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(data.por_modulo ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} sx={{ textAlign: 'center', color: '#94a3b8', py: 3 }}>
                        Sin datos
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </Paper>

          {/* ── S7: TENDENCIA DEL MES ────────────────────────────────────── */}
          <Paper elevation={0} sx={cardSx}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              📈 Ventas por día — {data.periodo_texto}
            </Typography>

            {/* Line chart — sm and up */}
            <Box sx={{ height: 300, display: { xs: 'none', sm: 'block' } }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.ventas_por_dia ?? []}
                  margin={{ top: 5, right: 25, left: 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="dia"
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Día del mes', position: 'insideBottom', offset: -6, fontSize: 11 }}
                  />
                  <YAxis
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(v: any) => [fmt$(Number(v)), 'Ventas']}
                    labelFormatter={(l) => `Día ${l}`}
                    contentStyle={{ fontSize: 13, borderRadius: 8 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#f97316"
                    strokeWidth={2.5}
                    dot={{ fill: '#f97316', r: 3 }}
                    activeDot={{ r: 7, fill: '#ea580c' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>

            {/* Mobile fallback: top 5 días */}
            <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
              <Typography fontSize={12} color="text.secondary" textAlign="center" mb={1.5}>
                Gráfica disponible en pantallas más grandes
              </Typography>
              <p style={sectionLabel}>TOP 5 DÍAS CON MÁS VENTAS</p>
              {[...(data.ventas_por_dia ?? [])]
                .filter((d) => d.total > 0)
                .sort((a, b) => b.total - a.total)
                .slice(0, 5)
                .map((d) => (
                  <Box
                    key={d.dia}
                    display="flex"
                    justifyContent="space-between"
                    py={0.6}
                    px={1}
                    mb={0.5}
                    sx={{ bgcolor: '#f8fafc', borderRadius: 1 }}
                  >
                    <Typography fontSize={13}>Día {d.dia}</Typography>
                    <Typography fontSize={13} fontWeight={700} color="#f97316">
                      {fmt$(d.total)}
                    </Typography>
                  </Box>
                ))}
            </Box>
          </Paper>

          {/* ── S8: TELÉFONOS POR MÓDULO ─────────────────────────────────── */}
          {(data.telefonos_por_modulo ?? []).length > 0 && (() => {
            const totales = (data.telefonos_por_modulo ?? []).reduce(
              (acc, m) => ({
                total: acc.total + m.total_telefonos,
                monto: acc.monto + m.monto_total,
                contado: acc.contado + m.contado,
                payjoy: acc.payjoy + m.payjoy,
                paguitos: acc.paguitos + m.paguitos,
              }),
              { total: 0, monto: 0, contado: 0, payjoy: 0, paguitos: 0 },
            );
            const topModulo = (data.telefonos_por_modulo ?? [])[0]?.modulo;

            return (
              <Paper elevation={0} sx={{ ...cardSx, mt: 3 }}>
                <Typography variant="h6" fontWeight={700} mb={2}>
                  📱 Ventas de teléfonos por módulo
                </Typography>

                <Grid container spacing={2} alignItems="flex-start">

                  {/* Gráfica apilada — desktop only */}
                  <Grid item xs={12} md={7} sx={{ display: { xs: 'none', md: 'block' } }}>
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={data.telefonos_por_modulo ?? []}
                          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="modulo" tick={{ fontSize: 12 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{ fontSize: 13, borderRadius: 8 }}
                            formatter={(v: any, name: any) => [fmtN(Number(v)), name]}
                          />
                          <Legend wrapperStyle={{ fontSize: 13 }} />
                          <Bar dataKey="contado" name="Contado" fill="#22c55e" stackId="a" />
                          <Bar dataKey="payjoy" name="Payjoy" fill="#f97316" stackId="a" />
                          <Bar
                            dataKey="paguitos"
                            name="Paguitos"
                            fill="#3b82f6"
                            stackId="a"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Grid>

                  {/* Tabla desglose */}
                  <Grid item xs={12} md={5}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f8fafc' }}>
                          {['Módulo', 'Total', 'Contado', 'Payjoy', 'Paguitos', 'Monto $'].map((h, i) => (
                            <TableCell
                              key={h}
                              align={i === 0 ? 'left' : 'right'}
                              sx={{ fontWeight: 700, color: '#FF6600', fontSize: 11, py: 0.8, px: 1 }}
                            >
                              {h}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(data.telefonos_por_modulo ?? []).map((m) => {
                          const isTop = m.modulo === topModulo;
                          return (
                            <TableRow key={m.modulo} hover>
                              <TableCell sx={{ fontWeight: isTop ? 800 : 600, fontSize: 13, py: 0.8, px: 1 }}>
                                {m.modulo}
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: isTop ? 800 : 700, fontSize: 13, color: '#15803d', py: 0.8, px: 1 }}>
                                {fmtN(m.total_telefonos)}
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: isTop ? 700 : 400, fontSize: 12, color: '#22c55e', py: 0.8, px: 1 }}>
                                {fmtN(m.contado)}
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: isTop ? 700 : 400, fontSize: 12, color: '#f97316', py: 0.8, px: 1 }}>
                                {fmtN(m.payjoy)}
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: isTop ? 700 : 400, fontSize: 12, color: '#3b82f6', py: 0.8, px: 1 }}>
                                {fmtN(m.paguitos)}
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: isTop ? 700 : 400, fontSize: 12, py: 0.8, px: 1 }}>
                                {fmt$(m.monto_total)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {/* Fila de totales */}
                        <TableRow sx={{ bgcolor: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                          <TableCell sx={{ fontWeight: 800, fontSize: 12, py: 0.8, px: 1 }}>TOTAL</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, fontSize: 13, color: '#15803d', py: 0.8, px: 1 }}>
                            {fmtN(totales.total)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: '#22c55e', py: 0.8, px: 1 }}>
                            {fmtN(totales.contado)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: '#f97316', py: 0.8, px: 1 }}>
                            {fmtN(totales.payjoy)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: '#3b82f6', py: 0.8, px: 1 }}>
                            {fmtN(totales.paguitos)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, py: 0.8, px: 1 }}>
                            {fmt$(totales.monto)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </Grid>
                </Grid>
              </Paper>
            );
          })()}
        </>
      )}
    </Box>
  );
};

export default EstadisticasPage;
