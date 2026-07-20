import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import SimCardIcon from '@mui/icons-material/SimCard';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PersonIcon from '@mui/icons-material/Person';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import { Grid } from '@mui/material';
import axios from 'axios';
import { Navigate } from 'react-router-dom';
import { obtenerRolDesdeToken } from '../components/Token';

const HOY = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });

// ─── Style helpers ────────────────────────────────────────────────────────────
const thStyle: React.CSSProperties = {
  padding: 8,
  borderBottom: '1px solid #e2e8f0',
  color: '#f97316',
  fontWeight: 700,
  background: '#f8fafc',
  textAlign: 'left',
};
const tdStyle: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid #e2e8f0' };
const tdR: React.CSSProperties = { ...tdStyle, textAlign: 'right' };

// ─── Comision helpers (mirrored from VentasPage) ──────────────────────────────
const ACC_KEYWORDS: [string, number][] = [
  ['BOCINA', 20], ['CARGADOR', 20],
  ['EX. SMART WATCH', 20], ['SMART WATCH', 20],
  ['FUNDA DE BRAZO', 20], ['FUNDA DE IPAD', 20],
  ['TABLET $2499', 200], ['TABLET', 100],
  ['MANOS LIBRES $749', 20], ['MANOS LIBRES $799', 20], ['MANOS LIBRES $849', 20],
  ['MANOS LIBRES $899', 20], ['MANOS LIBRES $949', 20], ['MANOS LIBRES $999', 20],
  ['MANOS LIBRES $1099', 20], ['MANOS LIBRES $1199', 20], ['MANOS LIBRES $1249', 20],
  ['MANOS LIBRES $1299', 20], ['MANOS LIBRES $1399', 20], ['MANOS LIBRES $1449', 20],
  ['MANOS LIBRES $1499', 20], ['MANOS LIBRES', 10],
  ['FUNDA $160', 10], ['FUNDA', 20],
  ['MICA DE HIDROGEL $399', 20], ['MICA DE HIDROGEL', 10],
  ['MICA $40', 5], ['MICA $99', 5], ['MICA $120', 5], ['MICA', 10],
  ['PROTECTOR $79', 5], ['PROTECTOR $99', 5], ['PROTECTOR $120', 5],
  ['PROTECTOR $130', 5], ['PROTECTOR $149', 5], ['PROTECTOR $169', 5],
  ['PROTECTOR $180', 5], ['PROTECTOR $199', 5],
  ['PROTECTOR $249', 10], ['PROTECTOR $299', 10], ['PROTECTOR $349', 10],
  ['PROTECTOR $399', 15], ['PROTECTOR', 20],
  ['BASE PARA COCHE', 10], ['CABLE USB', 10],
  ['CÁMARA', 10], ['CAMARA', 10],
  ['GAMEBOY', 10], ['GAME BOY', 10],
  ['POWER BANK', 10], ['WEBCAM', 10],
];

const TEL_EXACT_MAP: Record<string, number> = {
  'TELEFONO LIBRE HONOR 200 LITE 256GB': 250,
  'TELEFONO LIBRE HONOR MAGIC 5 LITE 128GB': 200,
  'TELEFONO LIBRE HONOR MAGIC 5 LITE 256GB': 200,
  'TELEFONO LIBRE HONOR X5': 200,
  'TELEFONO LIBRE HONOR X6A 128GB': 200,
  'TELEFONO LIBRE HONOR X6B PLUS 256GB': 200,
  'TELEFONO LIBRE HONOR X7A': 250,
  'TELEFONO LIBRE HONOR X7B 128GB': 100,
  'TELEFONO LIBRE HONOR X7B 256GB': 100,
  'TELEFONO LIBRE HONOR X7C 256GB': 100,
  'TELEFONO LIBRE HONOR X8A 128GB': 200,
  'TELEFONO LIBRE HONOR X9C 256GB': 200,
  'TELEFONO LIBRE IPHONE 12 128GB': 100,
  'TELEFONO LIBRE IPHONE 13 128GB': 100,
  'TELEFONO LIBRE IPHONE 14 128GB': 100,
  'TELEFONO LIBRE IPHONE 15 128GB': 100,
  'TELEFONO LIBRE IPHONE 16 128GB': 100,
  'TELEFONO LIBRE IPHONE 16 PLUS 128GB': 100,
  'TELEFONO LIBRE IPHONE 16 PRO 128GB': 100,
  'TELEFONO LIBRE IPHONE 16E 128GB': 100,
  'TELEFONO LIBRE KODAK KD50': 100,
  'TELEFONO LIBRE MOTOROLA G31 128GB': 100,
  'TELEFONO LIBRE MOTOROLA G85 256GB': 100,
  'TELEFONO LIBRE OPPO A18 128GB': 100,
  'TELEFONO LIBRE OPPO A40 128GB': 100,
  'TELEFONO LIBRE OPPO A78 128GB': 100,
  'TELEFONO LIBRE REALME C11': 200,
  'TELEFONO LIBRE REALME C51': 200,
  'TELEFONO LIBRE RF IPHONE 11 128GB': 100,
  'TELEFONO LIBRE RF IPHONE 11 64GB': 100,
  'TELEFONO LIBRE RF IPHONE 12 128GB': 100,
  'TELEFONO LIBRE RF IPHONE 12 256GB': 100,
  'TELEFONO LIBRE RF IPHONE 12 PRO MAX 128GB': 100,
  'TELEFONO LIBRE RF IPHONE 13 128GB': 100,
  'TELEFONO LIBRE RF IPHONE 13 256GB': 100,
  'TELEFONO LIBRE RF IPHONE 13 PRO MAX 128GB': 100,
  'TELEFONO LIBRE RF IPHONE 13 PRO MAX 256GB': 100,
  'TELEFONO LIBRE RF IPHONE 14 128GB': 100,
  'TELEFONO LIBRE RF IPHONE 14 256GB': 100,
  'TELEFONO LIBRE RF IPHONE 14 PRO 128GB': 100,
  'TELEFONO LIBRE RF IPHONE 14 PRO MAX 256GB': 100,
  'TELEFONO LIBRE RF IPHONE 15 PRO MAX 256GB': 100,
  'TELEFONO LIBRE RF IPHONE 15 PROMAX 256GB': 100,
  'TELEFONO LIBRE SAMSUNG A05S 128GB': 100,
  'TELEFONO LIBRE SAMSUNG A06 128GB': 50,
  'TELEFONO LIBRE SAMSUNG A06 64GB': 50,
  'TELEFONO LIBRE SAMSUNG A16 128GB': 50,
  'TELEFONO LIBRE SAMSUNG A16 256GB': 50,
  'TELEFONO LIBRE SAMSUNG A23 128GB': 200,
  'TELEFONO LIBRE SAMSUNG A25 5G 128GB': 200,
  'TELEFONO LIBRE SAMSUNG A25 5G 256GB': 200,
  'TELEFONO LIBRE SAMSUNG A26 128GB': 50,
  'TELEFONO LIBRE SAMSUNG A35 128GB': 200,
  'TELEFONO LIBRE SAMSUNG A35 256GB': 200,
  'TELEFONO LIBRE SAMSUNG A55 256GB': 200,
  'TELEFONO LIBRE VIVO Y01': 200,
  'TELEFONO LIBRE WIKO T10': 200,
  'TELEFONO LIBRE XIAOMI REDMI 10A 64GB': 100,
  'TELEFONO LIBRE XIAOMI REDMI 13 128GB': 100,
  'TELEFONO LIBRE XIAOMI REDMI 13C 128GB': 100,
  'TELEFONO LIBRE XIAOMI REDMI NOTE 10 PRO 128GB': 200,
  'TELEFONO LIBRE XIAOMI REDMI NOTE 12 PRO 128GB': 200,
  'TELEFONO LIBRE XIAOMI REDMI NOTE 13 128GB': 100,
  'TELEFONO LIBRE ZTE A31': 200,
  'TELEFONO LIBRE ZTE A55': 100,
  'TELEFONO LIBRE ZTE V60 SMART': 100,
  'TELEFONO TELCEL ACER A62 ULTRA': 200,
  'TELEFONO TELCEL HONOR X8A': 100,
  'TELEFONO TELCEL IPHONE 11 64GB': 100,
  'TELEFONO TELCEL IPHONE 12 128GB': 100,
  'TELEFONO TELCEL IPHONE 13 128GB': 100,
  'TELEFONO TELCEL IPHONE 14 128GB': 100,
  'TELEFONO TELCEL IPHONE 15 128GB': 100,
  'TELEFONO TELCEL MOTOROLA EDGE 30 128GB': 100,
  'TELEFONO TELCEL MOTOROLA G24 256GB': 50,
  'TELEFONO TELCEL MOTOROLA G32 128GB': 200,
  'TELEFONO TELCEL MOTOROLA G53': 100,
  'TELEFONO TELCEL NUBIA Z353': 100,
  'TELEFONO TELCEL OPPO A5 256GB': 100,
  'TELEFONO TELCEL OPPO A79 256GB': 100,
  'TELEFONO TELCEL REALME NOTE 60 128GB': 200,
  'TELEFONO TELCEL SAMSUNG A05S 64GB': 100,
  'TELEFONO TELCEL SAMSUNG A06 64GB': 50,
  'TELEFONO TELCEL SAMSUNG A16 128GB': 50,
  'TELEFONO TELCEL SAMSUNG A25': 200,
  'TELEFONO TELCEL SAMSUNG A25 128GB': 50,
  'TELEFONO TELCEL SAMSUNG A35': 100,
  'TELEFONO TELCEL SAMSUNG A35 128GB': 200,
  'TELEFONO TELCEL ZTE A51': 200,
  'TELEFONO TELCEL ZTE A55': 100,
  'TELEFONO TELCEL ZTE V40 PRO': 100,
  'TELEFONO TELCEL ZTE V40 VITA': 100,
  'TELEFONO TELCEL ZTE V60 SMART': 100,
};

const calcComision = (v: any): number => {
  const nombre = (v.producto || '').toUpperCase();
  if (v.tipo_producto === 'telefono') {
    const tipo = (v.tipo_venta || '').toLowerCase();
    const base = TEL_EXACT_MAP[nombre];
    const inMap = base !== undefined;
    if (tipo === 'contado') return inMap ? base : 10;
    if (tipo === 'pajoy') return inMap ? 100 + base : 100;
    if (tipo === 'paguitos') return inMap ? 110 + base : 110;
    return 0;
  }
  if (v.tipo_producto === 'accesorios') {
    for (const [keyword, comision] of ACC_KEYWORDS) {
      if (nombre.includes(keyword)) return comision;
    }
    return 0;
  }
  return 0;
};

const getTotal = (v: any) => v.total ?? (v.precio_unitario || 0) * (v.cantidad || 1);

// ─── CorteVisual (admin / contador) ──────────────────────────────────────────
const CorteVisual = ({ corte, ventas }: { corte: any; ventas: any[] }) => {
  const totalAdicional =
    (corte.adicional_recargas || 0) +
    (corte.adicional_transporte || 0) +
    (corte.adicional_otros || 0) +
    (corte.adicional_mayoreo || 0);
  const totalFinal = (corte.total_sistema || 0) + totalAdicional;
  const totalEfectivo =
    (corte.accesorios_efectivo || 0) + (corte.telefonos_efectivo || 0) + totalAdicional;
  const totalTarjeta = (corte.accesorios_tarjeta || 0) + (corte.telefonos_tarjeta || 0);
  const totalAccesorios = ventas
    .filter((v) => v.tipo_producto === 'accesorios')
    .reduce((s, v) => s + (v.total || 0), 0);

  const th = (label: string) => (
    <th key={label} style={thStyle}>{label}</th>
  );

  return (
    <Box sx={{ mb: 6 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Typography variant="h5">Corte del Día ({corte.fecha})</Typography>
        {corte.enviado && <Chip label="Enviado" color="success" size="small" />}
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6">Ventas de Accesorios</Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography>Efectivo: ${(corte.accesorios_efectivo || 0).toFixed(2)}</Typography>
            <Typography>Tarjeta: ${(corte.accesorios_tarjeta || 0).toFixed(2)}</Typography>
            <Typography fontWeight={600}>Total: ${(corte.accesorios_total || 0).toFixed(2)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6">Ventas de Teléfonos</Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography>Efectivo: ${(corte.telefonos_efectivo || 0).toFixed(2)}</Typography>
            <Typography>Tarjeta: ${(corte.telefonos_tarjeta || 0).toFixed(2)}</Typography>
            <Typography fontWeight={600}>Total: ${(corte.telefonos_total || 0).toFixed(2)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6">Montos Adicionales</Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography>Recargas Telcel: ${(corte.adicional_recargas || 0).toFixed(2)}</Typography>
            <Typography>Recargas YOVOY: ${(corte.adicional_transporte || 0).toFixed(2)}</Typography>
            <Typography>Centro de Pagos: ${(corte.adicional_otros || 0).toFixed(2)}</Typography>
            <Typography>
              Recargas Mayoreo: ${(corte.adicional_mayoreo || 0).toFixed(2)}
              {corte.adicional_mayoreo_para ? ` — ${corte.adicional_mayoreo_para}` : ''}
            </Typography>
            {(corte.salida_efectivo || 0) > 0 && (
              <Typography sx={{ mt: 1 }} color="warning.main">
                Salida Efectivo: ${(corte.salida_efectivo || 0).toFixed(2)}
              </Typography>
            )}
            {corte.nota_salida && (
              <Typography variant="body2" color="text.secondary">Nota: {corte.nota_salida}</Typography>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6">Totales</Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography>Total Sistema: ${(corte.total_sistema || 0).toFixed(2)}</Typography>
            <Typography>Total Adicional: ${totalAdicional.toFixed(2)}</Typography>
            <Typography sx={{ mt: 1 }}>Efectivo: ${totalEfectivo.toFixed(2)}</Typography>
            <Typography>Tarjeta: ${totalTarjeta.toFixed(2)}</Typography>
            <Alert severity="info" sx={{ mt: 2 }}>
              <strong>Total General: ${totalFinal.toFixed(2)}</strong>
            </Alert>
          </Paper>
        </Grid>
      </Grid>

      <Box mt={5}>
        <Typography variant="h6" gutterBottom>Detalle de Ventas Accesorios</Typography>
        <Paper>
          <Box p={2} component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Nombre', 'Producto', 'Cantidad', 'Precio', 'Total', 'Fecha'].map(th)}</tr>
            </thead>
            <tbody>
              {ventas.filter((v) => v.tipo_producto === 'accesorios').map((v) => (
                <tr key={v.id}>
                  <td style={tdStyle}>{v.empleado?.username}</td>
                  <td style={tdStyle}>{v.producto}</td>
                  <td style={tdStyle}>{v.cantidad}</td>
                  <td style={tdStyle}>${v.precio_unitario?.toFixed(2)}</td>
                  <td style={tdStyle}>${v.total?.toFixed(2)}</td>
                  <td style={tdStyle}>{v.fecha}</td>
                </tr>
              ))}
              {ventas.filter((v) => v.tipo_producto === 'accesorios').length === 0 && (
                <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center' }}>Sin ventas</td></tr>
              )}
            </tbody>
          </Box>
        </Paper>
        <Box mt={2} textAlign="right">
          <Typography variant="subtitle1" fontWeight={600}>
            Total Accesorios: ${totalAccesorios.toFixed(2)}
          </Typography>
        </Box>
      </Box>

      <Box mt={5}>
        <Typography variant="h6" gutterBottom>Detalle de Ventas Teléfonos</Typography>
        <Paper>
          <Box p={2} component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Nombre', 'Producto', 'Tipo', 'Precio', 'Fecha'].map(th)}</tr>
            </thead>
            <tbody>
              {ventas.filter((v) => v.tipo_producto === 'telefono').map((v) => (
                <tr key={v.id}>
                  <td style={tdStyle}>{v.empleado?.username}</td>
                  <td style={tdStyle}>{v.producto}</td>
                  <td style={tdStyle}>{v.tipo_venta}</td>
                  <td style={tdStyle}>${v.precio_unitario?.toFixed(2)}</td>
                  <td style={tdStyle}>{new Date(v.fecha).toLocaleDateString()}</td>
                </tr>
              ))}
              {ventas.filter((v) => v.tipo_producto === 'telefono').length === 0 && (
                <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center' }}>Sin ventas</td></tr>
              )}
            </tbody>
          </Box>
        </Paper>
        <Box mt={2} textAlign="right">
          <Typography variant="subtitle1" fontWeight={600}>
            Total Teléfonos: $
            {ventas
              .filter((v) => v.tipo_producto === 'telefono')
              .reduce((s, v) => s + (v.precio_unitario || 0), 0)
              .toFixed(2)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

// ─── CortePage ────────────────────────────────────────────────────────────────
const CortePage = () => {
  const rolToken = useMemo(() => obtenerRolDesdeToken(), []);
  const moduloNombreGlobal = localStorage.getItem('modulo') || '';
  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const API = "https://ato-appservidor-nvxt.onrender.com";

  // ── admin / contador state ────────────────────────────────────────────────
  const [cortesGuardados, setCortesGuardados] = useState<any[]>([]);
  const [modulos, setModulos] = useState<any[]>([]);
  const [filtroModulo, setFiltroModulo] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');

  // ── notificación corte revisado ───────────────────────────────────────────
  const [notifCorte, setNotifCorte] = useState<any | null>(null);

  // ── encargado left-column state ───────────────────────────────────────────
  const [resumen, setResumen] = useState<any>(null);
  const [chips, setChips] = useState<any[]>([]);
  const [corteHoy, setCorteHoy] = useState<any>(null);
  const [recargas, setRecargas] = useState('');
  const [transporte, setTransporte] = useState('');
  const [otros, setOtros] = useState('');
  const [mayoreo, setMayoreo] = useState('');
  const [mayoreoParaQuien, setMayoreoParaQuien] = useState('');
  const [salidaEfectivo, setSalidaEfectivo] = useState('');
  const [notaSalida, setNotaSalida] = useState('');
  const [msgRecargas, setMsgRecargas] = useState('');
  const [msgSalida, setMsgSalida] = useState('');
  const [loadingRecargas, setLoadingRecargas] = useState(false);
  const [loadingSalida, setLoadingSalida] = useState(false);
  const [cajaChicaInput, setCajaChicaInput] = useState('0');
  const [savingCajaChica, setSavingCajaChica] = useState(false);
  const [snackCC, setSnackCC] = useState<{ msg: string; sev: 'success' | 'error' } | null>(null);

  // ── encargado right-column state ──────────────────────────────────────────
  const [fechaDerecha, setFechaDerecha] = useState(HOY);
  const [ventasDerecha, setVentasDerecha] = useState<any[]>([]);
  const [loadingVentas, setLoadingVentas] = useState(false);

  const fetchingFechaRef = useRef('');
  const esHoy = fechaDerecha === HOY;
  const soloLectura = !esHoy;
  const hoyMx = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
  const esCorteDeHoy = fechaDerecha === hoyMx;

  // ── derived: right column ────────────────────────────────────────────────
  const ventasDerechaAcc = ventasDerecha.filter(
    (v) => v.tipo_producto === 'accesorios' && !v.cancelada,
  );
  const ventasDerechaTel = ventasDerecha.filter(
    (v) => v.tipo_producto === 'telefono' && !v.cancelada,
  );
  const todasVentas = [...ventasDerechaAcc, ...ventasDerechaTel];
  const subtotalDerechaAcc = ventasDerechaAcc.reduce((s, v) => s + getTotal(v), 0);
  const subtotalDerechaTel = ventasDerechaTel.reduce((s, v) => s + getTotal(v), 0);
  const comisionDerechaAcc = ventasDerechaAcc.reduce((s, v) => s + calcComision(v), 0);
  const comisionDerechaTel = ventasDerechaTel.reduce((s, v) => s + calcComision(v), 0);

  // ── derived: left column (desglose calculado desde ventasDerecha) ─────────
  const ef_acc = ventasDerechaAcc.filter((v) => v.metodo_pago?.toLowerCase() === 'efectivo').reduce((s, v) => s + getTotal(v), 0);
  const ta_acc = ventasDerechaAcc.filter((v) => v.metodo_pago?.toLowerCase() === 'tarjeta').reduce((s, v) => s + getTotal(v), 0);
  const ef_tel = ventasDerechaTel.filter((v) => v.metodo_pago?.toLowerCase() === 'efectivo').reduce((s, v) => s + getTotal(v), 0);
  const ta_tel = ventasDerechaTel.filter((v) => v.metodo_pago?.toLowerCase() === 'tarjeta').reduce((s, v) => s + getTotal(v), 0);
  const rec = parseFloat(recargas || '0');
  const trans = parseFloat(transporte || '0');
  const otr = parseFloat(otros || '0');
  const may = parseFloat(mayoreo || '0');
  const totalAdicional = rec + trans + otr + may;
  const sal = parseFloat(salidaEfectivo || '0');
  const total_tarjeta = ta_acc + ta_tel;
  const caja_chica = corteHoy?.caja_chica ?? 0;
  const devoluciones = corteHoy?.devoluciones ?? 0;
  const subtotal_efectivo = ef_acc + ef_tel + totalAdicional;
  const total_efectivo_final = subtotal_efectivo - sal - devoluciones + caja_chica;

  const chipsHoy = chips.filter((c) => {
    const fecha = c.fecha ? String(c.fecha).slice(0, 10) : '';
    return fecha === fechaDerecha && !c.cancelada;
  });
  const chipsCount = chipsHoy.length;
  const chipsPorTipo = chipsHoy.reduce((acc: Record<string, number>, c: any) => {
    const tipo = c.tipo_chip || 'Sin tipo';
    acc[tipo] = (acc[tipo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // ── fetch ventas for right column ─────────────────────────────────────────
  const fetchVentasDerecha = async (fecha: string) => {
    setLoadingVentas(true);
    try {
      const res = await axios.get(`${API}/ventas/ventas`, { ...config, params: { fecha } });
      setVentasDerecha(res.data);
    } catch {
      setVentasDerecha([]);
    } finally {
      setLoadingVentas(false);
    }
  };

  // ── fetch corte for a given date and populate fields ─────────────────────
  const fetchCorte = async (fecha: string) => {
    console.log('fetchCorte llamado con fecha:', fecha);
    fetchingFechaRef.current = fecha;
    setRecargas('0');
    setTransporte('0');
    setOtros('0');
    setMayoreo('0');
    setMayoreoParaQuien('');
    setSalidaEfectivo('0');
    setNotaSalida('');
    console.log('reset hecho');
    try {
      const res = await axios.get(`${API}/ventas/cortes/hoy`, { ...config, params: { fecha } });
      console.log('respuesta para fecha:', fecha, 'datos:', res.data);
      if (fetchingFechaRef.current !== fecha) return;
      const c = res.data;
      console.log('seteando estados con datos de:', fecha);
      setCorteHoy(c);
      setRecargas(c?.adicional_recargas != null ? String(c.adicional_recargas) : '0');
      setTransporte(c?.adicional_transporte != null ? String(c.adicional_transporte) : '0');
      setOtros(c?.adicional_otros != null ? String(c.adicional_otros) : '0');
      setMayoreo(c?.adicional_mayoreo != null ? String(c.adicional_mayoreo) : '0');
      setMayoreoParaQuien(c?.adicional_mayoreo_para || '');
      setSalidaEfectivo(c?.salida_efectivo != null ? String(c.salida_efectivo) : '0');
      setNotaSalida(c?.nota_salida || '');
    } catch {
      if (fetchingFechaRef.current !== fecha) return;
      setCorteHoy(null);
      setRecargas('0');
      setTransporte('0');
      setOtros('0');
      setMayoreo('0');
      setMayoreoParaQuien('');
      setSalidaEfectivo('0');
      setNotaSalida('');
    }
  };

  // ── fetch chips by module name ────────────────────────────────────────────
  const fetchChips = async () => {
    const moduloNombre = localStorage.getItem('modulo') || '';
    try {
      const res = await axios.get(`${API}/ventas/venta_chips`, {
        ...config,
        params: moduloNombre ? { modulo_nombre: moduloNombre } : {},
      });
      setChips(Array.isArray(res.data) ? res.data : []);
    } catch {
      setChips([]);
    }
  };

  // ── caja chica helpers ────────────────────────────────────────────────────
  const nextDate = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    const next = new Date(y, m - 1, d + 1);
    const yy = next.getFullYear();
    const mm = String(next.getMonth() + 1).padStart(2, '0');
    const dd = String(next.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  };

  const fetchCajaChica = async (moduloId: number, fechaNext: string) => {
    if (!moduloId || !fechaNext) { setCajaChicaInput('0'); return; }
    try {
      const res = await axios.get(`${API}/caja-chica`, { ...config, params: { modulo_id: moduloId, fecha: fechaNext } });
      setCajaChicaInput(String(res.data.monto ?? 0));
    } catch { setCajaChicaInput('0'); }
  };

  const guardarCajaChica = async () => {
    const monto = parseFloat(cajaChicaInput);
    if (isNaN(monto) || monto < 0) {
      setSnackCC({ msg: 'Monto inválido. Ingresa un número >= 0.', sev: 'error' });
      return;
    }
    const moduloId = corteHoy?.modulo_id;
    if (!moduloId) return;
    setSavingCajaChica(true);
    try {
      await axios.post(`${API}/caja-chica`, { modulo_id: moduloId, fecha: nextDate(fechaDerecha), monto }, config);
      setSnackCC({ msg: `Caja chica guardada: $${monto.toFixed(2)}`, sev: 'success' });
    } catch (err: any) {
      setSnackCC({ msg: err?.response?.data?.detail || 'Error al guardar la caja chica', sev: 'error' });
    } finally { setSavingCajaChica(false); }
  };

  // ── on mount: load all encargado/asesor data ──────────────────────────────
  useEffect(() => {
    if (rolToken !== 'encargado' && rolToken !== 'asesor') return;
    const cargar = async () => {
      const resRes = await axios.get(`${API}/ventas/corte-general`, config).catch(() => ({ data: null }));
      setResumen(resRes.data);
      fetchChips();
      fetchCorte(HOY);
    };
    cargar();
    fetchVentasDerecha(HOY);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolToken]);

  // ── precarga caja chica al cambiar corte o fecha ─────────────────────────
  useEffect(() => {
    if ((rolToken !== 'encargado' && rolToken !== 'asesor') || !corteHoy?.modulo_id) return;
    fetchCajaChica(corteHoy.modulo_id, nextDate(fechaDerecha));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corteHoy?.modulo_id, fechaDerecha]);

  // ── notificación corte revisado (encargado) ──────────────────────────────
  useEffect(() => {
    if (rolToken !== 'encargado' || !corteHoy?.modulo_id) return;
    axios
      .get(`${API}/asistencia/notificaciones?solo_no_leidas=true`, config)
      .then(({ data }) => {
        const n = data.find(
          (x: any) =>
            x.mensaje?.toLowerCase().includes('corte') &&
            x.modulo_id === corteHoy.modulo_id,
        );
        setNotifCorte(n ?? null);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corteHoy?.modulo_id]);

  // ── notificación corte revisado (admin) ──────────────────────────────────
  useEffect(() => {
    if (rolToken !== 'admin') return;
    axios
      .get(`${API}/asistencia/notificaciones?solo_no_leidas=true`, config)
      .then(({ data }) => {
        const n = data.find((x: any) => x.mensaje?.toLowerCase().includes('corte'));
        setNotifCorte(n ?? null);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolToken]);

  const dismissNotifCorte = () => {
    if (!notifCorte) return;
    axios
      .put(`${API}/asistencia/notificaciones/${notifCorte.id}/marcar-leida`, {}, config)
      .catch(() => {});
    setNotifCorte(null);
  };

  // ── admin/contador: modules ───────────────────────────────────────────────
  useEffect(() => {
    if (rolToken !== 'contador' && rolToken !== 'admin') return;
    axios.get(`${API}/registro/modulos`, config).then((r) => setModulos(r.data)).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (rolToken !== 'contador' && rolToken !== 'admin') return;
    if (filtroModulo || filtroFecha) {
      const params: any = {};
      if (filtroFecha) params.fecha = filtroFecha;
      if (filtroModulo) params.modulo_id = filtroModulo;
      axios
        .get(`${API}/ventas/ventas/cortes`, { ...config, params })
        .then((r) => setCortesGuardados(r.data))
        .catch(console.error);
    } else {
      setCortesGuardados([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroModulo, filtroFecha]);

  // ── bloqueo: asesor de Cadenas Comerciales no accede al corte ─────────────
  if (rolToken === 'asesor' && moduloNombreGlobal === 'Cadenas Comerciales') {
    return <Navigate to="/ventas" replace />;
  }

  // ── encargado actions ─────────────────────────────────────────────────────
  const guardarRecargas = async () => {
    console.log('GUARDAR RECARGAS click - payload:', { recargas, transporte, otros, mayoreo, mayoreoParaQuien, fecha: fechaDerecha });
    setLoadingRecargas(true);
    setMsgRecargas('');
    const url = `${API}/ventas/cortes/hoy/recargas`;
    try {
      console.log('enviando a endpoint:', url);
      const res = await axios.patch(
        url,
        { adicional_recargas: rec, adicional_transporte: trans, adicional_otros: otr, adicional_mayoreo: may, adicional_mayoreo_para: mayoreoParaQuien || null },
        config,
      );
      console.log('respuesta guardar:', res.data, res.status);
      setCorteHoy(res.data);
      setMsgRecargas('Recargas guardadas');
    } catch (err: any) {
      console.log('ERROR guardar:', err.response?.data, err.message);
      setMsgRecargas(err?.response?.data?.detail || 'Error al guardar');
    } finally {
      setLoadingRecargas(false);
    }
  };

  const guardarSalida = async () => {
    setLoadingSalida(true);
    setMsgSalida('');
    try {
      const res = await axios.patch(
        `${API}/ventas/cortes/hoy/salida`,
        { salida_efectivo: sal, nota_salida: notaSalida || null },
        config,
      );
      setCorteHoy(res.data);
      setMsgSalida('Salida guardada');
    } catch (err: any) {
      setMsgSalida(err?.response?.data?.detail || 'Error al guardar');
    } finally {
      setLoadingSalida(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ADMIN / CONTADOR VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (rolToken === 'contador' || rolToken === 'admin') {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>Cortes Registrados</Typography>
        {notifCorte && (
          <Alert severity="success" onClose={dismissNotifCorte} sx={{ mb: 2, fontSize: 14 }}>
            {notifCorte.mensaje}
          </Alert>
        )}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Filtrar por módulo</InputLabel>
              <Select
                value={filtroModulo}
                onChange={(e) => setFiltroModulo(e.target.value)}
                label="Filtrar por módulo"
              >
                <MenuItem value="">Todos</MenuItem>
                {modulos.map((m: any) => (
                  <MenuItem key={m.id} value={m.id}>{m.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              type="date"
              label="Filtrar por fecha"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
        {cortesGuardados.length === 0 ? (
          <Typography>No hay cortes registrados.</Typography>
        ) : (
          cortesGuardados.map((corte, i) => (
            <CorteVisual key={i} corte={corte} ventas={corte.ventas || []} />
          ))
        )}
      </Box>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ENCARGADO VIEW — una sola columna
  // ─────────────────────────────────────────────────────────────────────────
  const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '—';

  const lightFieldSx = {
    '& .MuiInputLabel-root': { color: '#777' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#FF6600' },
    '& .MuiOutlinedInput-root': { color: '#222', bgcolor: '#fafafa' },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.18)' },
    '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#FF6600' },
    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#FF6600' },
    '& .MuiInputAdornment-root svg': { color: '#FF6600' },
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 720, mx: 'auto' }}>

      {/* Notificación corte revisado */}
      {notifCorte && (
        <Alert severity="success" onClose={dismissNotifCorte} sx={{ mb: 2, fontSize: 14 }}>
          {notifCorte.mensaje}
        </Alert>
      )}

      {/* Título */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Corte del Día</Typography>
        {!esHoy && <Chip label="CERRADO" color="default" size="small" />}
      </Stack>

      {/* 1 ── Filtro de fecha ───────────────────────────────────────────── */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" gap={1} alignItems="center">
          <TextField
            type="date" size="small" label="Fecha" value={fechaDerecha}
            onChange={(e) => setFechaDerecha(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: 1 }}
          />
          <Button
            variant="contained" size="small"
            sx={{ bgcolor: '#f97316', '&:hover': { bgcolor: '#ea6c0a' }, whiteSpace: 'nowrap' }}
            onClick={() => { fetchVentasDerecha(fechaDerecha); fetchChips(); fetchCorte(fechaDerecha); }}
          >
            Buscar
          </Button>
        </Box>
      </Paper>

      {/* 2 ── Card de Chips ─────────────────────────────────────────────── */}
      <Paper sx={{ mb: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.5, bgcolor: '#f0fdf4', borderBottom: '1px solid #bbf7d0' }}>
          <Typography fontWeight={700} fontSize={14} color="#15803d">
            Chips del día ({chipsCount})
          </Typography>
        </Box>
        {chipsHoy.length === 0 ? (
          <Box px={2} py={2}>
            <Typography variant="body2" color="text.secondary">Sin chips para esta fecha</Typography>
          </Box>
        ) : (
          <>
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Tipo</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(chipsPorTipo).map(([tipo, cantidad]) => (
                  <tr key={tipo}>
                    <td style={tdStyle}>{tipo}</td>
                    <td style={tdR}>{cantidad as number}</td>
                  </tr>
                ))}
              </tbody>
            </Box>
            <Box sx={{ px: 2, py: 1.5, bgcolor: '#f0fdf4', borderTop: '2px solid #bbf7d0', display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" fontWeight={700} color="#15803d">Total chips</Typography>
              <Typography variant="body2" fontWeight={700} color="#15803d">{chipsCount}</Typography>
            </Box>
          </>
        )}
      </Paper>

      {/* 3 ── Card de Teléfonos ─────────────────────────────────────────── */}
      <Paper sx={{ mb: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.5, bgcolor: '#eff6ff', borderBottom: '1px solid #bfdbfe' }}>
          <Typography fontWeight={700} fontSize={14} color="#1d4ed8">
            Teléfonos del día ({ventasDerechaTel.length})
          </Typography>
        </Box>
        {loadingVentas ? (
          <Box display="flex" justifyContent="center" py={3}><CircularProgress size={24} /></Box>
        ) : ventasDerechaTel.length === 0 ? (
          <Box px={2} py={2}>
            <Typography variant="body2" color="text.secondary">Sin teléfonos para esta fecha</Typography>
          </Box>
        ) : (
          <>
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Modelo</th>
                  <th style={thStyle}>Tipo</th>
                  <th style={thStyle}>Método de pago</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Precio</th>
                </tr>
              </thead>
              <tbody>
                {ventasDerechaTel.map((v) => (
                  <tr key={v.id}>
                    <td style={{ ...tdStyle, maxWidth: 220 }}>{v.producto}</td>
                    <td style={tdStyle}>{capitalize(v.tipo_venta || '')}</td>
                    <td style={tdStyle}>{capitalize(v.metodo_pago || '')}</td>
                    <td style={tdR}>${getTotal(v).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </Box>
            <Box sx={{ px: 2, py: 1.5, bgcolor: '#eff6ff', borderTop: '2px solid #bfdbfe', display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" fontWeight={700} color="#1d4ed8">Total teléfonos</Typography>
              <Typography variant="body2" fontWeight={700} color="#1d4ed8">${subtotalDerechaTel.toFixed(2)}</Typography>
            </Box>
          </>
        )}
      </Paper>

      {/* 4 ── Card de Accesorios ────────────────────────────────────────── */}
      <Paper sx={{ mb: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.5, bgcolor: '#fff7ed', borderBottom: '1px solid #fed7aa' }}>
          <Typography fontWeight={700} fontSize={14} color="#c2410c">
            Accesorios del día ({ventasDerechaAcc.length})
          </Typography>
        </Box>
        {loadingVentas ? (
          <Box display="flex" justifyContent="center" py={3}><CircularProgress size={24} /></Box>
        ) : ventasDerechaAcc.length === 0 ? (
          <Box px={2} py={2}>
            <Typography variant="body2" color="text.secondary">Sin accesorios para esta fecha</Typography>
          </Box>
        ) : (
          <>
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Descripción</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Cantidad</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Precio Prom.</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(
                  ventasDerechaAcc.reduce((acc: Record<string, { producto: string; precio: number; cantidad: number; total: number }>, v) => {
                    const key = `${v.producto}||${getTotal(v)}`;
                    if (!acc[key]) acc[key] = { producto: v.producto, precio: getTotal(v), cantidad: 0, total: 0 };
                    acc[key].cantidad += v.cantidad || 1;
                    acc[key].total += getTotal(v);
                    return acc;
                  }, {})
                ).map((g) => (
                  <tr key={g.producto + g.precio}>
                    <td style={{ ...tdStyle, maxWidth: 260 }}>{g.producto}</td>
                    <td style={tdR}>{g.cantidad}</td>
                    <td style={tdR}>${(g.total / g.cantidad).toFixed(2)}</td>
                    <td style={tdR}>${g.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </Box>
            <Box sx={{ px: 2, py: 1.5, bgcolor: '#fff7ed', borderTop: '2px solid #fed7aa', display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" fontWeight={700} color="#c2410c">Total accesorios</Typography>
              <Typography variant="body2" fontWeight={700} color="#c2410c">${subtotalDerechaAcc.toFixed(2)}</Typography>
            </Box>
          </>
        )}
      </Paper>

      {/* 5 ── Montos Adicionales ────────────────────────────────────────── */}
      <Paper sx={{ mb: 2, overflow: 'hidden', borderRadius: 2, bgcolor: 'white' }}>
        <Box sx={{ px: 2, py: 1.5, bgcolor: '#FF6600', display: 'flex', alignItems: 'center', gap: 1 }}>
          <MonetizationOnIcon sx={{ color: 'white', fontSize: 20 }} />
          <Typography fontWeight={700} fontSize={15} color="white" letterSpacing={0.3}>
            MONTOS ADICIONALES
          </Typography>
        </Box>
        <Box sx={{ p: 2 }}>
          <TextField label="Recargas Telcel" type="number" value={recargas}
            onChange={(e) => setRecargas(e.target.value)}
            fullWidth margin="dense" size="small" disabled={soloLectura}
            inputProps={{ min: 0 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><PhoneAndroidIcon fontSize="small" /></InputAdornment> }}
            sx={lightFieldSx} />
          <TextField label="Recargas YOVOY" type="number" value={transporte}
            onChange={(e) => setTransporte(e.target.value)}
            fullWidth margin="dense" size="small" disabled={soloLectura}
            inputProps={{ min: 0 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SimCardIcon fontSize="small" /></InputAdornment> }}
            sx={lightFieldSx} />
          <TextField label="Centro de Pagos" type="number" value={otros}
            onChange={(e) => setOtros(e.target.value)}
            fullWidth margin="dense" size="small" disabled={soloLectura}
            inputProps={{ min: 0 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><AccountBalanceIcon fontSize="small" /></InputAdornment> }}
            sx={{ ...lightFieldSx, mb: 0.5 }} />

          {/* Mayoreo — grupo visual diferenciado */}
          <Box sx={{ border: '1.5px solid #FFD1A9', borderRadius: 2, p: 1.5, mt: 1, mb: 1, bgcolor: '#fff8f3' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#FF6600', letterSpacing: 0.5, mb: 0.5 }}>
              RECARGAS MAYOREO
            </Typography>
            <TextField label="Cantidad" type="number" value={mayoreo}
              onChange={(e) => setMayoreo(e.target.value)}
              fullWidth margin="dense" size="small" disabled={soloLectura}
              inputProps={{ min: 0 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><LocalOfferIcon fontSize="small" /></InputAdornment> }}
              sx={lightFieldSx} />
            <TextField label="Para quién" value={mayoreoParaQuien}
              onChange={(e) => setMayoreoParaQuien(e.target.value)}
              fullWidth margin="dense" size="small" disabled={soloLectura}
              InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon fontSize="small" /></InputAdornment> }}
              sx={lightFieldSx} />
          </Box>

          {/* Total destacado */}
          <Box sx={{ bgcolor: '#fff3e0', border: '1px solid #FFD1A9', borderRadius: 2, px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography fontWeight={600} color="#cc4400" fontSize={13}>Total Montos Adicionales</Typography>
            <Typography fontWeight={800} color="#FF6600" fontSize={22}>${totalAdicional.toFixed(2)}</Typography>
          </Box>

          {msgRecargas && (
            <Alert severity={msgRecargas.toLowerCase().includes('error') ? 'error' : 'success'} sx={{ mb: 1 }}>
              {msgRecargas}
            </Alert>
          )}
          {esHoy && (
            <Button variant="contained" fullWidth
              sx={{ bgcolor: '#FF6600', color: 'white', fontWeight: 700, fontSize: 14, py: 1.5, borderRadius: 2, '&:hover': { bgcolor: '#cc4400' } }}
              onClick={guardarRecargas} disabled={loadingRecargas}>
              {loadingRecargas ? 'Guardando...' : 'GUARDAR RECARGAS'}
            </Button>
          )}
        </Box>
      </Paper>

      {/* 6 ── Salida de Efectivo ─────────────────────────────────────────── */}
      <Paper sx={{ mb: 2, overflow: 'hidden', borderRadius: 2, bgcolor: 'white' }}>
        <Box sx={{ px: 2, py: 1.5, bgcolor: '#b71c1c', display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingDownIcon sx={{ color: 'white', fontSize: 20 }} />
          <Typography fontWeight={700} fontSize={15} color="white" letterSpacing={0.3}>
            SALIDA DE EFECTIVO
          </Typography>
        </Box>
        <Box sx={{ p: 2 }}>
          <TextField label="Monto de salida" type="number" value={salidaEfectivo}
            onChange={(e) => setSalidaEfectivo(e.target.value)}
            fullWidth margin="dense" size="small" disabled={soloLectura}
            inputProps={{ min: 0 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><TrendingDownIcon fontSize="small" sx={{ color: '#b71c1c' }} /></InputAdornment> }}
            sx={{ ...lightFieldSx, '& .MuiInputAdornment-root svg': { color: '#b71c1c' } }} />
          <TextField label="Nota" value={notaSalida}
            onChange={(e) => setNotaSalida(e.target.value)}
            fullWidth margin="dense" size="small" multiline rows={2} disabled={soloLectura}
            sx={lightFieldSx} />
          {msgSalida && (
            <Alert severity={msgSalida.toLowerCase().includes('error') ? 'error' : 'success'} sx={{ mt: 1, mb: 1 }}>
              {msgSalida}
            </Alert>
          )}
          {esHoy && (
            <Button variant="contained" fullWidth
              sx={{ bgcolor: '#FF6600', color: 'white', fontWeight: 700, fontSize: 14, py: 1.5, borderRadius: 2, mt: 1, '&:hover': { bgcolor: '#cc4400' } }}
              onClick={guardarSalida} disabled={loadingSalida}>
              {loadingSalida ? 'Guardando...' : 'GUARDAR SALIDA'}
            </Button>
          )}
        </Box>
      </Paper>

      {/* 7 ── Totales Finales ────────────────────────────────────────────── */}
      <Paper sx={{ mb: 2, overflow: 'hidden', borderRadius: 2, bgcolor: 'white' }}>
        <Box sx={{ px: 2, py: 1.5, bgcolor: '#1a2744', display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptLongIcon sx={{ color: '#FF6600', fontSize: 20 }} />
          <Typography fontWeight={700} fontSize={15} color="white" letterSpacing={0.3}>
            TOTALES FINALES
          </Typography>
        </Box>

        <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#555', border: 'none', py: 1, pl: 2, width: '44%', letterSpacing: 0.5 }}>CONCEPTO</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, color: '#FF6600', border: 'none', py: 1, width: '28%', letterSpacing: 0.5 }}>EFECTIVO</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, color: '#FF6600', border: 'none', py: 1, pr: 2, width: '28%', letterSpacing: 0.5 }}>TARJETA</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow sx={{ bgcolor: 'white' }}>
              <TableCell sx={{ fontSize: 13, border: 'none', py: 1, pl: 2, color: '#333' }}>Accesorios</TableCell>
              <TableCell align="right" sx={{ fontSize: 13, border: 'none', py: 1, color: '#222' }}>${ef_acc.toFixed(2)}</TableCell>
              <TableCell align="right" sx={{ fontSize: 13, border: 'none', py: 1, pr: 2, color: '#222' }}>${ta_acc.toFixed(2)}</TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: '#fafafa' }}>
              <TableCell sx={{ fontSize: 13, border: 'none', py: 1, pl: 2, color: '#333' }}>Teléfonos</TableCell>
              <TableCell align="right" sx={{ fontSize: 13, border: 'none', py: 1, color: '#222' }}>${ef_tel.toFixed(2)}</TableCell>
              <TableCell align="right" sx={{ fontSize: 13, border: 'none', py: 1, pr: 2, color: '#222' }}>${ta_tel.toFixed(2)}</TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: 'white' }}>
              <TableCell sx={{ fontSize: 13, border: 'none', py: 1, pl: 2, color: '#333' }}>Recargas</TableCell>
              <TableCell align="right" sx={{ fontSize: 13, border: 'none', py: 1, color: '#222' }}>${totalAdicional.toFixed(2)}</TableCell>
              <TableCell align="right" sx={{ fontSize: 13, border: 'none', py: 1, pr: 2, color: '#aaa' }}>—</TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: '#fafafa' }}>
              <TableCell sx={{ fontSize: 13, border: 'none', py: 1, pl: 2, color: '#333' }}>Salidas</TableCell>
              <TableCell align="right" sx={{ fontSize: 13, border: 'none', py: 1, color: sal > 0 ? '#d32f2f' : '#222' }}>
                {sal > 0 ? `-$${sal.toFixed(2)}` : `$${sal.toFixed(2)}`}
              </TableCell>
              <TableCell align="right" sx={{ fontSize: 13, border: 'none', py: 1, pr: 2, color: '#aaa' }}>—</TableCell>
            </TableRow>
            {devoluciones > 0 && (
            <TableRow sx={{ bgcolor: '#fafafa' }}>
              <TableCell sx={{ fontSize: 13, border: 'none', py: 1, pl: 2, color: '#333' }}>Devoluciones</TableCell>
              <TableCell align="right" sx={{ fontSize: 13, border: 'none', py: 1, color: '#d32f2f' }}>
                {`-$${devoluciones.toFixed(2)}`}
              </TableCell>
              <TableCell align="right" sx={{ fontSize: 13, border: 'none', py: 1, pr: 2, color: '#aaa' }}>—</TableCell>
            </TableRow>
            )}
            <TableRow sx={{ bgcolor: 'white' }}>
              <TableCell sx={{ fontSize: 13, border: 'none', py: 1, pl: 2, color: '#333' }}>Caja Chica</TableCell>
              <TableCell align="right" sx={{ fontSize: 13, border: 'none', py: 1, color: caja_chica > 0 ? '#1565c0' : '#aaa' }}>${caja_chica.toFixed(2)}</TableCell>
              <TableCell align="right" sx={{ fontSize: 13, border: 'none', py: 1, pr: 2, color: '#aaa' }}>—</TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={3} sx={{ border: 'none', p: 0, borderTop: '2px solid #eee' }} />
            </TableRow>
            <TableRow sx={{ bgcolor: '#e8f5e9' }}>
              <TableCell sx={{ fontWeight: 700, fontSize: 13, border: 'none', py: 1.5, pl: 2, color: '#2e7d32' }}>TOTAL EFECTIVO</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, fontSize: 20, border: 'none', py: 1.5, color: '#2e7d32' }}>${total_efectivo_final.toFixed(2)}</TableCell>
              <TableCell sx={{ border: 'none', bgcolor: '#e8f5e9' }} />
            </TableRow>
            <TableRow sx={{ bgcolor: '#fff3e0' }}>
              <TableCell sx={{ fontWeight: 700, fontSize: 13, border: 'none', py: 1.5, pl: 2, color: '#FF6600' }}>TOTAL TARJETA</TableCell>
              <TableCell sx={{ border: 'none', bgcolor: '#fff3e0' }} />
              <TableCell align="right" sx={{ fontWeight: 800, fontSize: 20, border: 'none', py: 1.5, pr: 2, color: '#FF6600' }}>${total_tarjeta.toFixed(2)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>

      {/* 8 ── Caja chica día siguiente (encargado/asesor, solo corte de hoy) ── */}
      {(rolToken === 'encargado' || rolToken === 'asesor') && esCorteDeHoy && (
        <Paper sx={{ mb: 2, borderRadius: 2, bgcolor: '#f0f4ff', p: 2 }}>
          <Typography fontWeight={700} fontSize={13} color="#1a2744" sx={{ mb: 1.5, letterSpacing: 0.3 }}>
            DEJO PARA MAÑANA EN CAJA CHICA: {nextDate(fechaDerecha).split('-').reverse().join('/')}
          </Typography>
          <TextField
            type="number"
            size="small"
            fullWidth
            label="Monto"
            value={cajaChicaInput}
            onChange={(e) => setCajaChicaInput(e.target.value)}
            inputProps={{ min: 0, step: 0.01 }}
            sx={{ mb: 1.5, bgcolor: 'white', borderRadius: 1 }}
          />
          <Button
            variant="contained"
            fullWidth
            disabled={savingCajaChica}
            onClick={guardarCajaChica}
            sx={{ bgcolor: '#1a2744', color: 'white', fontWeight: 700, fontSize: 13, py: 1.2, borderRadius: 2, '&:hover': { bgcolor: '#0f1a33' } }}
          >
            {savingCajaChica ? 'Guardando...' : 'Guardar caja chica'}
          </Button>
        </Paper>
      )}

      <Snackbar
        open={!!snackCC}
        autoHideDuration={4000}
        onClose={() => setSnackCC(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackCC?.sev ?? 'success'} onClose={() => setSnackCC(null)} sx={{ width: '100%' }}>
          {snackCC?.msg}
        </Alert>
      </Snackbar>

    </Box>
  );
};

export default CortePage;
