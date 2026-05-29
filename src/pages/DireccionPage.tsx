import React, { useCallback, useEffect, useState } from 'react';
import { obtenerRolDesdeToken } from '../components/Token';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  MenuItem,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import SearchIcon from '@mui/icons-material/Search';
import axios from 'axios';

const HOY = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
const MODULOS_OCULTOS = ['V2', 'Cadenas C.', 'MI2', 'BO', 'prueba'];
// ─── Style helpers ────────────────────────────────────────────────────────────
const thStyle: React.CSSProperties = {
  padding: '1px 5px',
  borderBottom: '1px solid #eef2f7',
  color: '#475569',
  fontWeight: 700,
  background: '#f8fafc',
  textAlign: 'left',
  fontSize: 10,
  lineHeight: 1.2,
  letterSpacing: '0.3px',
  textTransform: 'uppercase',
};
const tdStyle: React.CSSProperties = {
  padding: '2px 5px',
  borderBottom: '1px solid #f1f5f9',
  fontSize: 11,
  lineHeight: 1.2,
  color: '#334155',
};
const tdR: React.CSSProperties  = { ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
const tdN: React.CSSProperties  = { ...tdStyle, color: '#0f172a', fontWeight: 500 };
const tdNR: React.CSSProperties = { ...tdN, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

const getTotal = (v: any) => v.total ?? (v.precio_unitario || 0) * (v.cantidad || 1);
const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—');
const fmt$ = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtFecha = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };

// ─── Section header / footer ──────────────────────────────────────────────────
type SectionConfig = { bg: string; color: string; border: string };

const SECTION_CHIPS:   SectionConfig = { bg: '#E8F5E9', color: '#2E7D32', border: '#C8E6C9' };
const SECTION_TELS:    SectionConfig = { bg: '#E3F2FD', color: '#1565C0', border: '#BBDEFB' };
const SECTION_ACC:     SectionConfig = { bg: '#F3E5F5', color: '#6A1B9A', border: '#E1BEE7' };
const SECTION_MONTOS:  SectionConfig = { bg: '#FEF9C3', color: '#854D0E', border: '#FDE047' };
const SECTION_SALIDA:  SectionConfig = { bg: '#c62828', color: '#ffffff', border: '#c62828' };
const SECTION_TOTALES: SectionConfig = { bg: '#1a2744', color: '#ffffff', border: '#1a2744' };

const secH = (label: string, cfg: SectionConfig, icon?: React.ReactNode) => (
  <Box sx={{ px: '10px', py: '3px', bgcolor: cfg.bg, borderBottom: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', gap: 0.75, minHeight: 24 }}>
    {icon}
    <Typography fontWeight={700} fontSize={11} color={cfg.color} letterSpacing={0.3} lineHeight={1.2}>{label}</Typography>
  </Box>
);
const secF = (label: string, value: React.ReactNode, cfg: SectionConfig) => (
  <Box sx={{ px: '10px', py: '2px', bgcolor: cfg.bg, borderTop: `1px solid ${cfg.border}`, display: 'flex', justifyContent: 'space-between' }}>
    <Typography fontSize={10} fontWeight={700} color={cfg.color}>{label}</Typography>
    <Typography fontSize={10} fontWeight={700} color={cfg.color} sx={{ fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
  </Box>
);

const card = (children: React.ReactNode) => (
  <Box sx={{ bgcolor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
    {children}
  </Box>
);

// ─── Types ────────────────────────────────────────────────────────────────────
interface CortePendiente {
  id: number; modulo_id: number; modulo_nombre: string; fecha: string;
  total_efectivo: number; total_tarjeta: number; total_general: number;
}

// ─────────────────────────────────────────────────────────────────────────────
const DireccionPage: React.FC = () => {
  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const rolToken = obtenerRolDesdeToken();
  const API = "https://ato-appservidor.onrender.com";

  const [pendientes, setPendientes]             = useState<CortePendiente[]>([]);
  const [loadingPendientes, setLoadingPendientes] = useState(false);
  const [modulos, setModulos]                   = useState<any[]>([]);
  const [moduloId, setModuloId]                 = useState('');
  const [fecha, setFecha]                       = useState(HOY);
  const [loading, setLoading]                   = useState(false);
  const [sinCorte, setSinCorte]                 = useState(false);
  const [corte, setCorte]                       = useState<any>(null);
  const [dialogConfirm, setDialogConfirm]       = useState(false);
  const [marcando, setMarcando]                 = useState(false);
  const [snack, setSnack]                       = useState<{ msg: string; sev: 'success' | 'error' } | null>(null);
  const [mostrarDetalle, setMostrarDetalle]     = useState(false);
  const [editandoRecargas, setEditandoRecargas] = useState(false);
  const [editRec, setEditRec]                   = useState('');
  const [editTrans, setEditTrans]               = useState('');
  const [editOtr, setEditOtr]                   = useState('');
  const [editMay, setEditMay]                   = useState('');
  const [cajaChicaInput, setCajaChicaInput]     = useState('0');
  const [savingCajaChica, setSavingCajaChica]   = useState(false);

  const cargarPendientes = useCallback(async () => {
    setLoadingPendientes(true);
    try { const { data } = await axios.get(`${API}/direccion/cortes-pendientes`, config); setPendientes(data); }
    catch { /* silencioso */ }
    finally { setLoadingPendientes(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    cargarPendientes();
    axios.get(`${API}/registro/modulos/todos`, config).then((r) => setModulos(r.data)).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCorte = async (mId: string, f: string) => {
    if (!mId || !f) return;
    setLoading(true); setSinCorte(false); setCorte(null);
    try {
      const res = await axios.get(`${API}/direccion/cortes`, { ...config, params: { modulo_id: Number(mId), fecha: f } });
      if (res.data) setCorte(res.data); else setSinCorte(true);
    } catch { setSinCorte(true); }
    finally { setLoading(false); }
  };

  const nextDate = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    const next = new Date(y, m - 1, d + 1);
    const yy = next.getFullYear();
    const mm = String(next.getMonth() + 1).padStart(2, '0');
    const dd = String(next.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  };

  const fetchCajaChica = async (mId: string, fechaNext: string) => {
    if (!mId || !fechaNext) return;
    try {
      const res = await axios.get(`${API}/caja-chica`, { ...config, params: { modulo_id: Number(mId), fecha: fechaNext } });
      setCajaChicaInput(String(res.data.monto ?? 0));
    } catch { setCajaChicaInput('0'); }
  };

  const guardarCajaChica = async () => {
    const monto = parseFloat(cajaChicaInput);
    if (isNaN(monto) || monto < 0) {
      setSnack({ msg: 'Monto inválido. Ingresa un número >= 0.', sev: 'error' });
      return;
    }
    const fechaNext = nextDate(fecha);
    setSavingCajaChica(true);
    try {
      await axios.post(`${API}/caja-chica`, { modulo_id: Number(moduloId), fecha: fechaNext, monto }, config);
      setSnack({ msg: `Caja chica del ${fmtFecha(fechaNext)} guardada: $${monto.toFixed(2)}`, sev: 'success' });
    } catch {
      setSnack({ msg: 'Error al guardar la caja chica', sev: 'error' });
    } finally { setSavingCajaChica(false); }
  };

  const buscar = () => {
    setMostrarDetalle(true);
    fetchCorte(moduloId, fecha);
    fetchCajaChica(moduloId, nextDate(fecha));
  };
  const abrirCortePendiente = (c: CortePendiente) => {
    const mId = String(c.modulo_id);
    setModuloId(mId); setFecha(c.fecha); setMostrarDetalle(true);
    fetchCorte(mId, c.fecha);
    fetchCajaChica(mId, nextDate(c.fecha));
  };
  const volverAlFiltro = () => { setMostrarDetalle(false); setCorte(null); setSinCorte(false); setCajaChicaInput('0'); };

  const marcarRevisado = async () => {
    if (!corte) return;
    setMarcando(true);
    try {
      const { data } = await axios.put(`${API}/direccion/cortes/${corte.id}/marcar-revisado`, {}, config);
      setCorte((prev: any) => ({ ...prev, ...data }));
      setSnack({ msg: 'Corte marcado como revisado correctamente', sev: 'success' });
      setDialogConfirm(false); cargarPendientes();
    } catch { setSnack({ msg: 'Error al marcar como revisado', sev: 'error' }); }
    finally { setMarcando(false); }
  };

  const guardarRecargas = async () => {
    const parse = (s: string) => {
      if (s === '') return 0;
      const n = parseFloat(s);
      return isNaN(n) || n < 0 ? null : n;
    };
    const r = parse(editRec);
    const t = parse(editTrans);
    const o = parse(editOtr);
    const m = parse(editMay);
    if (r === null || t === null || o === null || m === null) {
      setSnack({ msg: 'Valores inválidos. Ingresa números >= 0.', sev: 'error' });
      return;
    }
    try {
      await axios.put(
        `${API}/direccion/cortes/${corte.id}/editar-recargas`,
        { adicional_recargas: r, adicional_transporte: t, adicional_otros: o, adicional_mayoreo: m },
        config,
      );
      setCorte((prev: any) => ({ ...prev, adicional_recargas: r, adicional_transporte: t, adicional_otros: o, adicional_mayoreo: m }));
      setEditandoRecargas(false);
      setSnack({ msg: 'Recargas actualizadas correctamente', sev: 'success' });
    } catch {
      setSnack({ msg: 'Error al actualizar recargas', sev: 'error' });
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const ventas: any[]  = corte?.ventas ?? [];
  const ventasAcc      = ventas.filter((v) => v.tipo_producto === 'accesorios');
  const ventasTel      = ventas.filter((v) => v.tipo_producto === 'telefono');
  const ef_acc = ventasAcc.filter((v) => v.metodo_pago?.toLowerCase() === 'efectivo').reduce((s: number, v: any) => s + getTotal(v), 0);
  const ta_acc = ventasAcc.filter((v) => v.metodo_pago?.toLowerCase() === 'tarjeta').reduce((s: number, v: any)  => s + getTotal(v), 0);
  const ef_tel = ventasTel.filter((v) => v.metodo_pago?.toLowerCase() === 'efectivo').reduce((s: number, v: any) => s + getTotal(v), 0);
  const ta_tel = ventasTel.filter((v) => v.metodo_pago?.toLowerCase() === 'tarjeta').reduce((s: number, v: any)  => s + getTotal(v), 0);
  const rec  = corte?.adicional_recargas   ?? 0;
  const trans= corte?.adicional_transporte ?? 0;
  const otr  = corte?.adicional_otros      ?? 0;
  const may  = corte?.adicional_mayoreo    ?? 0;
  const totalAdicional        = rec + trans + otr + may;
  const sal                   = corte?.salida_efectivo ?? 0;
  const subtotalAcc           = ventasAcc.reduce((s: number, v: any) => s + getTotal(v), 0);
  const subtotalTel           = ventasTel.reduce((s: number, v: any) => s + getTotal(v), 0);
  const fechaSiguiente        = fecha ? nextDate(fecha) : '';
  const caja_chica            = corte?.caja_chica ?? 0;
  const total_efectivo_final  = ef_acc + ef_tel + totalAdicional - sal + caja_chica;
  const total_tarjeta         = ta_acc + ta_tel;
  const total_general_corte   = total_efectivo_final + total_tarjeta;
  const moduloNombre          = modulos.find((m) => String(m.id) === moduloId)?.nombre ?? '';
  const esCorteReal           = Boolean(corte && corte.id);


  // ── Cards ─────────────────────────────────────────────────────────────────
  const cardChips = card(<>
    {secH(`Chips del día (${corte?.chips_count ?? 0})`, SECTION_CHIPS)}
    {!corte?.chips_por_tipo || Object.keys(corte.chips_por_tipo).length === 0 ? (
      <Box px="12px" py="6px"><Typography fontSize={11} color="text.secondary">Sin chips para esta fecha</Typography></Box>
    ) : (
      <>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={thStyle}>Tipo</th><th style={{ ...thStyle, textAlign: 'right' }}>Cantidad</th></tr></thead>
          <tbody>
            {Object.entries(corte.chips_por_tipo as Record<string, number>).map(([tipo, cantidad]) => (
              <tr key={tipo}><td style={tdN}>{tipo}</td><td style={tdNR}>{cantidad}</td></tr>
            ))}
          </tbody>
        </Box>
        {secF('Total chips', corte.chips_count, SECTION_CHIPS)}
      </>
    )}
  </>);

  const cardTelefonos = card(<>
    {secH(`Teléfonos del día (${ventasTel.length})`, SECTION_TELS)}
    {ventasTel.length === 0 ? (
      <Box px="12px" py="6px"><Typography fontSize={11} color="text.secondary">Sin teléfonos para esta fecha</Typography></Box>
    ) : (
      <>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={thStyle}>Modelo</th><th style={thStyle}>Tipo</th><th style={thStyle}>Método</th><th style={{ ...thStyle, textAlign: 'right' }}>Precio</th></tr></thead>
          <tbody>
            {ventasTel.map((v) => (
              <tr key={v.id}>
                <td style={{ ...tdN, maxWidth: 200 }}>{v.producto}</td>
                <td style={tdStyle}>{capitalize(v.tipo_venta || '')}</td>
                <td style={tdStyle}>{capitalize(v.metodo_pago || '')}</td>
                <td style={tdNR}>${getTotal(v).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </Box>
        {secF('Total teléfonos', `$${subtotalTel.toFixed(2)}`, SECTION_TELS)}
      </>
    )}
  </>);

  const cardAccesorios = card(<>
    {secH(`Accesorios del día (${ventasAcc.length})`, SECTION_ACC)}
    {ventasAcc.length === 0 ? (
      <Box px="12px" py="6px"><Typography fontSize={11} color="text.secondary">Sin accesorios para esta fecha</Typography></Box>
    ) : (
      <>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={thStyle}>Descripción</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Cant.</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>P. Prom.</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
          </tr></thead>
          <tbody>
            {Object.values(
              ventasAcc.reduce((acc: Record<string, { producto: string; precio: number; cantidad: number; total: number }>, v: any) => {
                const key = `${v.producto}||${getTotal(v)}`;
                if (!acc[key]) acc[key] = { producto: v.producto, precio: getTotal(v), cantidad: 0, total: 0 };
                acc[key].cantidad += v.cantidad || 1;
                acc[key].total += getTotal(v);
                return acc;
              }, {})
            ).map((g) => (
              <tr key={g.producto + g.precio}>
                <td style={{ ...tdN, maxWidth: 240 }}>{g.producto}</td>
                <td style={tdNR}>{g.cantidad}</td>
                <td style={tdNR}>${(g.total / g.cantidad).toFixed(2)}</td>
                <td style={tdNR}>${g.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </Box>
        {secF('Total accesorios', `$${subtotalAcc.toFixed(2)}`, SECTION_ACC)}
      </>
    )}
  </>);

  const cardMontos = card(<>
    <Box sx={{ px: '10px', py: '3px', bgcolor: SECTION_MONTOS.bg, borderBottom: `1px solid ${SECTION_MONTOS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <MonetizationOnIcon sx={{ color: '#854D0E', fontSize: 15 }} />
        <Typography fontWeight={700} fontSize={11} color={SECTION_MONTOS.color} letterSpacing={0.3} lineHeight={1.2}>MONTOS ADICIONALES</Typography>
      </Box>
      {!editandoRecargas && esCorteReal && (
        <Button size="small" onClick={() => { setEditRec(String(rec)); setEditTrans(String(trans)); setEditOtr(String(otr)); setEditMay(String(may)); setEditandoRecargas(true); }}
          sx={{ fontSize: 10, py: '1px', px: 1, minHeight: 20, color: '#854D0E', '&:hover': { bgcolor: '#FEF9C3' } }}>
          ✏️ Editar
        </Button>
      )}
    </Box>
    <Box sx={{ px: '10px', py: '4px' }}>
      {editandoRecargas ? (
        <>
          {([
            { label: 'Recargas Telcel', val: editRec,   set: setEditRec   },
            { label: 'Recargas YOVOY',  val: editTrans, set: setEditTrans },
            { label: 'Centro de Pagos', val: editOtr,   set: setEditOtr   },
            { label: 'Mayoreo',         val: editMay,   set: setEditMay   },
          ] as { label: string; val: string; set: (v: string) => void }[]).map(({ label, val, set }) => (
            <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: '3px', borderBottom: '1px solid #f1f5f9' }}>
              <Typography fontSize={11} color="#475569">{label}</Typography>
              <TextField size="small" value={val} onChange={(e) => set(e.target.value)}
                inputProps={{ min: 0, style: { textAlign: 'right', fontSize: 11, padding: '2px 6px' } }}
                sx={{ width: 90, '& .MuiOutlinedInput-root': { height: 26 } }} />
            </Box>
          ))}
          <Box sx={{ display: 'flex', gap: 1, mt: '6px' }}>
            <Button variant="contained" size="small" onClick={guardarRecargas}
              sx={{ flex: 1, bgcolor: '#166534', '&:hover': { bgcolor: '#14532d' }, fontSize: 11, py: '2px', fontWeight: 700 }}>
              Guardar
            </Button>
            <Button variant="outlined" size="small" onClick={() => setEditandoRecargas(false)}
              sx={{ flex: 1, fontSize: 11, py: '2px', color: '#64748b', borderColor: '#cbd5e1' }}>
              Cancelar
            </Button>
          </Box>
        </>
      ) : (
        <>
          {[
            { label: 'Recargas Telcel', val: rec   },
            { label: 'Recargas YOVOY',  val: trans  },
            { label: 'Centro de Pagos', val: otr   },
          ].map(({ label, val }) => (
            <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: '2px', borderBottom: '1px solid #f1f5f9' }}>
              <Typography fontSize={11} color="#475569">{label}</Typography>
              <Typography fontSize={11} fontWeight={600} color="#0f172a" sx={{ fontVariantNumeric: 'tabular-nums' }}>${val.toFixed(2)}</Typography>
            </Box>
          ))}
          <Box sx={{ border: '1px solid #FDE047', borderRadius: '6px', px: '8px', py: '3px', mt: '4px', mb: '4px', bgcolor: '#FEFCE8' }}>
            <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: '#854D0E', letterSpacing: '0.6px', mb: '1px' }}>RECARGAS MAYOREO</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography fontSize={11} color="#475569">Cantidad</Typography>
              <Typography fontSize={11} fontWeight={600} color="#0f172a" sx={{ fontVariantNumeric: 'tabular-nums' }}>${may.toFixed(2)}</Typography>
            </Box>
            {corte?.adicional_mayoreo_para && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography fontSize={11} color="#475569">Para quién</Typography>
                <Typography fontSize={11} fontWeight={600} color="#0f172a">{corte.adicional_mayoreo_para}</Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#FEF9C3', border: '1px solid #FDE047', borderRadius: '6px', px: '8px', py: '3px' }}>
            <Typography fontWeight={600} color="#854D0E" fontSize={11}>Total Adicional</Typography>
            <Typography fontWeight={800} color="#A16207" fontSize={13} sx={{ fontVariantNumeric: 'tabular-nums' }}>${totalAdicional.toFixed(2)}</Typography>
          </Box>
        </>
      )}
    </Box>
  </>);

  const cardSalida = card(<>
    {secH('SALIDA DE EFECTIVO', SECTION_SALIDA, <TrendingDownIcon sx={{ color: '#ffffff', fontSize: 15 }} />)}
    <Box sx={{ px: '10px', py: '4px' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: '2px' }}>
        <Typography fontSize={11} color="#475569">Monto de salida</Typography>
        <Typography fontSize={11} fontWeight={600} color={sal > 0 ? '#b91c1c' : '#0f172a'} sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {sal > 0 ? `-$${sal.toFixed(2)}` : `$${sal.toFixed(2)}`}
        </Typography>
      </Box>
      {corte?.nota_salida && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', py: '2px' }}>
          <Typography fontSize={11} color="#475569">Nota</Typography>
          <Typography fontSize={11} color="#0f172a">{corte.nota_salida}</Typography>
        </Box>
      )}
    </Box>
  </>);

  // Totales — 4 columnas + fila TOTAL navy
  const cardTotales = card(<>
    {secH('TOTALES FINALES', SECTION_TOTALES, <ReceiptLongIcon sx={{ color: '#FF6600', fontSize: 15 }} />)}
    <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
      <TableHead>
        <TableRow sx={{ bgcolor: '#f8fafc' }}>
          {['Concepto', 'Efectivo', 'Tarjeta', 'Total'].map((h, i) => (
            <TableCell key={h} align={i === 0 ? 'left' : 'right'} sx={{
              fontWeight: 700, fontSize: 9.5, color: '#475569', border: 'none',
              py: '4px', letterSpacing: 0.5, textTransform: 'uppercase',
              pl: i === 0 ? '12px' : 0, pr: i === 3 ? '12px' : 0,
              width: i === 0 ? '34%' : '22%',
            }}>{h}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {[
          { label: 'Accesorios', ef: ef_acc, ta: ta_acc, tot: ef_acc + ta_acc, alt: false },
          { label: 'Teléfonos',  ef: ef_tel, ta: ta_tel, tot: ef_tel + ta_tel, alt: true  },
          { label: 'Recargas',   ef: totalAdicional, ta: null, tot: totalAdicional, alt: false },
          { label: 'Salidas',    ef: sal > 0 ? -sal : 0, ta: null, tot: sal > 0 ? -sal : 0, alt: true, red: sal > 0 },
        ].map(({ label, ef, ta, tot, alt, red }: { label: string; ef: number; ta: number | null; tot: number; alt: boolean; red?: boolean }) => (
          <TableRow key={label} sx={{ bgcolor: alt ? '#fafbfc' : 'white' }}>
            <TableCell sx={{ fontSize: 11, border: 'none', py: '4px', pl: '12px', color: '#334155', lineHeight: 1.3 }}>{label}</TableCell>
            <TableCell align="right" sx={{ fontSize: 11, border: 'none', py: '4px', color: red ? '#b91c1c' : '#0f172a', lineHeight: 1.3, fontVariantNumeric: 'tabular-nums' }}>
              {red ? `-$${sal.toFixed(2)}` : `$${ef.toFixed(2)}`}
            </TableCell>
            <TableCell align="right" sx={{ fontSize: 11, border: 'none', py: '4px', color: ta === null ? '#cbd5e1' : '#0f172a', lineHeight: 1.3, fontVariantNumeric: 'tabular-nums' }}>
              {ta === null ? '—' : `$${ta.toFixed(2)}`}
            </TableCell>
            <TableCell align="right" sx={{ fontSize: 11, border: 'none', py: '4px', pr: '12px', color: red ? '#b91c1c' : '#0f172a', lineHeight: 1.3, fontVariantNumeric: 'tabular-nums' }}>
              {red ? `-$${sal.toFixed(2)}` : `$${tot.toFixed(2)}`}
            </TableCell>
          </TableRow>
        ))}
        <TableRow sx={{ bgcolor: '#fafbfc' }}>
          <TableCell sx={{ fontSize: 11, border: 'none', py: '4px', pl: '12px', color: '#334155', lineHeight: 1.3 }}>Caja Chica</TableCell>
          <TableCell align="right" sx={{ fontSize: 11, border: 'none', py: '4px', color: caja_chica > 0 ? '#1565c0' : '#94a3b8', lineHeight: 1.3, fontVariantNumeric: 'tabular-nums' }}>${caja_chica.toFixed(2)}</TableCell>
          <TableCell align="right" sx={{ fontSize: 11, border: 'none', py: '4px', color: '#cbd5e1', lineHeight: 1.3 }}>—</TableCell>
          <TableCell align="right" sx={{ fontSize: 11, border: 'none', py: '4px', pr: '12px', color: caja_chica > 0 ? '#1565c0' : '#94a3b8', lineHeight: 1.3, fontVariantNumeric: 'tabular-nums' }}>${caja_chica.toFixed(2)}</TableCell>
        </TableRow>
        {/* divider */}
        <TableRow><TableCell colSpan={4} sx={{ border: 'none', p: 0, borderTop: '1px solid #e5e7eb' }} /></TableRow>
        {/* Grand total row */}
        <TableRow>
          <TableCell sx={{ bgcolor: '#1a2744', fontWeight: 700, fontSize: 11, border: 'none', py: '7px', pl: '12px', color: '#fff', letterSpacing: '0.5px' }}>TOTAL</TableCell>
          <TableCell align="right" sx={{ bgcolor: '#1a2744', fontWeight: 800, fontSize: 13, border: 'none', py: '7px', color: '#fff', fontVariantNumeric: 'tabular-nums' }}>${total_efectivo_final.toFixed(2)}</TableCell>
          <TableCell align="right" sx={{ bgcolor: '#1a2744', fontWeight: 800, fontSize: 13, border: 'none', py: '7px', color: '#fff', fontVariantNumeric: 'tabular-nums' }}>${total_tarjeta.toFixed(2)}</TableCell>
          <TableCell align="right" sx={{ bgcolor: '#1a2744', fontWeight: 800, fontSize: 14, border: 'none', py: '7px', pr: '12px', color: '#FF8533', fontVariantNumeric: 'tabular-nums' }}>${total_general_corte.toFixed(2)}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </>);

  const sinCorteAlert = (
    <Alert severity="info" sx={{ mb: '12px', py: 0.5, fontSize: 13 }}>
      Sin corte registrado para <strong>{moduloNombre}</strong> el <strong>{fecha}</strong>.
    </Alert>
  );

  // ── Panel detalle ─────────────────────────────────────────────────────────
  const panelDetalle = (corte !== null || sinCorte) ? (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, columnGap: '10px', rowGap: '6px', alignItems: 'start', mb: '6px' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
          {cardChips}{cardTelefonos}{cardAccesorios}
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
          {cardMontos}{cardSalida}
        </Box>
      </Box>

      {/* Totales full-width */}
      {cardTotales}

      {/* Botón MARCAR — solo si hay corte real */}
      {esCorteReal && (
        corte.revisado_direccion ? (
          <Alert severity="success" sx={{ mt: '8px', py: 0.5, fontSize: 12, borderRadius: 1 }}>
            ✅ Revisado por <strong>{corte.revisado_por}</strong>{' '}
            {new Date(corte.revisado_at).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </Alert>
        ) : (
          <Button
            variant="contained" fullWidth onClick={() => setDialogConfirm(true)}
            sx={{ bgcolor: '#166534', '&:hover': { bgcolor: '#14532d' }, fontWeight: 700, fontSize: 12, minHeight: 32, maxHeight: 32, mt: '8px', borderRadius: '6px', letterSpacing: '0.3px' }}
          >
            ✅ MARCAR CORTE COMO REVISADO
          </Button>
        )
      )}

    </>
  ) : null;

  // ── Bloque caja chica (director) — visible aunque no haya corte ──────────
  const bloqueCajaChicaDir = mostrarDetalle && rolToken === 'direccion' ? (
    <Box sx={{ mt: '10px', p: '10px', bgcolor: '#f0f4ff', border: '1px solid #c7d7f9', borderRadius: '8px' }}>
      <Typography fontSize={11} fontWeight={700} color="#1a2744" sx={{ mb: '6px', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
        Caja chica del día {fechaSiguiente ? fmtFecha(fechaSiguiente) : '—'}
      </Typography>
      <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <TextField
          size="small"
          type="number"
          value={cajaChicaInput}
          onChange={(e) => setCajaChicaInput(e.target.value)}
          inputProps={{ min: 0, step: 0.01 }}
          sx={{ flex: 1, '& .MuiOutlinedInput-root': { height: 32, fontSize: 12 }, '& input': { py: '4px !important' } }}
          placeholder="0.00"
        />
        <Button
          variant="contained"
          onClick={guardarCajaChica}
          disabled={savingCajaChica}
          sx={{ bgcolor: '#1a2744', '&:hover': { bgcolor: '#0f1a35' }, fontWeight: 700, fontSize: 11, height: 32, borderRadius: '6px', letterSpacing: '0.3px', flexShrink: 0 }}
        >
          {savingCajaChica ? 'Guardando...' : 'Guardar caja chica'}
        </Button>
      </Box>
    </Box>
  ) : null;

  // ── Filter bar ────────────────────────────────────────────────────────────
  const filterBar = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: '12px', py: '7px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', mb: '8px' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: '4px', flexShrink: 0 }}>
        <FilterAltIcon sx={{ fontSize: 14, color: '#64748b' }} />
        <Typography fontSize={10.5} fontWeight={700} color="#475569" sx={{ letterSpacing: '0.5px', textTransform: 'uppercase' }}>Filtrar</Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
        <Typography fontSize={9.5} fontWeight={600} color="#64748b" sx={{ letterSpacing: '0.4px', textTransform: 'uppercase' }}>Módulo</Typography>
        <FormControl size="small" fullWidth>
          <Select value={moduloId} onChange={(e) => setModuloId(e.target.value)} displayEmpty
            sx={{ height: 32, fontSize: 12.5, '& .MuiSelect-select': { py: '4px !important' } }}>
            <MenuItem value="" disabled><Typography fontSize={12.5} color="#94a3b8">Seleccionar</Typography></MenuItem>
            {modulos.filter((m) => !MODULOS_OCULTOS.includes(m.nombre))
              .sort((a, b) => a.nombre.localeCompare(b.nombre, undefined, { sensitivity: 'base' }))
              .map((m) => <MenuItem key={m.id} value={String(m.id)}><Typography fontSize={12.5}>{m.nombre}</Typography></MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
        <Typography fontSize={9.5} fontWeight={600} color="#64748b" sx={{ letterSpacing: '0.4px', textTransform: 'uppercase' }}>Fecha</Typography>
        <TextField type="date" size="small" value={fecha} onChange={(e) => setFecha(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ '& .MuiOutlinedInput-root': { height: 32, fontSize: 12.5 }, '& input': { py: '4px !important' } }} />
      </Box>

      <Button variant="contained" onClick={buscar} disabled={!moduloId || !fecha || loading}
        startIcon={loading ? <CircularProgress size={14} sx={{ color: 'white' }} /> : <SearchIcon sx={{ fontSize: 15 }} />}
        sx={{ bgcolor: '#FF6600', '&:hover': { bgcolor: '#ea5c00' }, height: 32, px: 2, fontSize: 12, fontWeight: 700, letterSpacing: '0.4px', alignSelf: 'flex-end', whiteSpace: 'nowrap', borderRadius: '6px', flexShrink: 0 }}>
        Buscar
      </Button>
    </Box>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: '#eef0f3', minHeight: '100vh' }}>

      {/* Page header */}
      <Box sx={{ mb: '8px' }}>
        <Typography fontWeight={700} fontSize={22} color="#0f172a" letterSpacing="-0.2px" sx={{ mb: '4px' }}>Revisión de cortes</Typography>
        <Typography fontSize={12.5} color="#64748b">
          Resumen del día por módulo.{' '}
          <Box component="span" sx={{ fontWeight: 600, color: '#0f172a' }}>
            {loadingPendientes ? '…' : `${pendientes.length} corte${pendientes.length !== 1 ? 's' : ''}`}
          </Box>{' '}
          pendientes de validación.
        </Typography>
      </Box>

      {/* Main grid 30/70 */}
      <Box sx={{ display: { xs: 'block', lg: 'grid' }, gridTemplateColumns: { lg: '30% 70%' }, gap: '12px', alignItems: 'start' }}>

        {/* ══ LEFT — Cortes pendientes ══════════════════════════════════ */}
        <Box sx={{ bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', p: '10px', maxHeight: { lg: 'calc(100vh - 90px)' }, overflowY: { lg: 'auto' }, mb: { xs: 3, lg: 0 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '10px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FactCheckIcon sx={{ color: '#FF6600', fontSize: 18 }} />
              <Typography fontWeight={700} fontSize={14} color="#0f172a">Cortes pendientes</Typography>
            </Box>
            <Box sx={{ bgcolor: '#f1f5f9', borderRadius: '999px', px: 1, py: '2px' }}>
              <Typography fontSize={11} fontWeight={600} color="#64748b">{loadingPendientes ? '…' : pendientes.length}</Typography>
            </Box>
          </Box>

          {loadingPendientes ? (
            <Box textAlign="center" py={3}><CircularProgress sx={{ color: '#FF6600' }} size={28} /></Box>
          ) : pendientes.length === 0 ? (
            <Alert severity="success" sx={{ fontSize: 13, py: 0.5 }}>✅ Todos los cortes están revisados al día</Alert>
          ) : (
            <Box sx={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
              {pendientes.map((c, idx) => (
                <Box key={c.id} onClick={() => abrirCortePendiente(c)}
                  sx={{ display: 'flex', alignItems: 'center', px: '14px', py: '10px', minHeight: 52, bgcolor: '#fff', borderBottom: idx < pendientes.length - 1 ? '1px solid #eef2f7' : 'none', cursor: 'pointer', gap: '16px', '&:hover': { bgcolor: '#f8fafc' } }}>
                  <Typography fontWeight={700} fontSize={18} color="#1a1a2e" lineHeight={1}>{c.modulo_nombre}</Typography>
                  <Typography fontSize={14} color="#888" lineHeight={1} sx={{ fontVariantNumeric: 'tabular-nums' }}>{fmtFecha(c.fecha)}</Typography>
                  <Box sx={{ flex: '1 1 auto' }} />
                  <Box sx={{ flexShrink: 0 }}>
                    <Button variant="contained"
                      endIcon={<ArrowForwardIcon sx={{ fontSize: 9 }} />}
                      onClick={(e) => { e.stopPropagation(); abrirCortePendiente(c); }}
                      sx={{ bgcolor: '#FF6600', '&:hover': { bgcolor: '#ea5c00' }, fontWeight: 700, fontSize: 9, py: '1px', px: '6px', minHeight: 18, borderRadius: '3px', whiteSpace: 'nowrap', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                      REVISAR
                    </Button>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* ══ RIGHT — Panel dinámico ═══════════════════════════════════ */}
        <Box sx={{ bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', p: '10px', maxHeight: { lg: 'calc(100vh - 90px)' }, overflowY: { lg: 'auto' } }}>

          {/* MOBILE */}
          <Box sx={{ display: { xs: 'block', lg: 'none' } }}>
            <Divider sx={{ mb: 2 }} />
            {filterBar}
            {(sinCorte || corte?.id === 0) && !loading && sinCorteAlert}
            {panelDetalle}
            {bloqueCajaChicaDir}
          </Box>

          {/* DESKTOP */}
          <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
            {filterBar}

            {!mostrarDetalle ? (
              sinCorte && !loading ? sinCorteAlert : null
            ) : (
              <>
                {/* Detail head */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: '6px', mb: '8px', borderBottom: '1px solid #e2e8f0' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Button startIcon={<ArrowBackIcon sx={{ fontSize: 14 }} />} onClick={volverAlFiltro} size="small"
                      sx={{ color: '#64748b', fontWeight: 500, fontSize: 11.5, textTransform: 'none', py: '4px', px: 1, borderRadius: '6px', '&:hover': { bgcolor: '#f1f5f9', color: '#0f172a' } }}>
                      Volver
                    </Button>
                    {corte && (
                      <>
                        <Typography fontWeight={700} fontSize={15} color="#0f172a">
                          Corte · <Box component="span" sx={{ color: '#FF6600' }}>{moduloNombre}</Box>
                        </Typography>
                        <Typography fontSize={12} color="#64748b" sx={{ fontVariantNumeric: 'tabular-nums' }}>{fmtFecha(corte.fecha)}</Typography>
                      </>
                    )}
                  </Box>
                  {esCorteReal && (
                    corte!.enviado
                      ? <Box sx={{ bgcolor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', fontSize: 10, fontWeight: 700, px: 1, py: '2px', borderRadius: '999px', letterSpacing: '0.4px' }}>ENVIADO</Box>
                      : <Box sx={{ bgcolor: '#fef9c3', color: '#854d0e', border: '1px solid #fde047', fontSize: 10, fontWeight: 700, px: 1, py: '2px', borderRadius: '999px', letterSpacing: '0.4px' }}>BORRADOR</Box>
                  )}
                </Box>

                {loading && <Box textAlign="center" py={4}><CircularProgress sx={{ color: '#FF6600' }} size={28} /></Box>}
                {(sinCorte || corte?.id === 0) && !loading && sinCorteAlert}
                {panelDetalle}
                {bloqueCajaChicaDir}
              </>
            )}
          </Box>
        </Box>
      </Box>

      {/* Dialog */}
      <Dialog open={dialogConfirm} onClose={() => !marcando && setDialogConfirm(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, pb: 1 }}>¿Confirmar revisión?</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <Typography fontSize={14}>¿Confirmas que ya revisaste este corte?</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setDialogConfirm(false)} disabled={marcando} variant="outlined" sx={{ minHeight: 36, flex: 1, fontSize: 13 }}>NO</Button>
          <Button variant="contained" onClick={marcarRevisado} disabled={marcando}
            sx={{ bgcolor: '#166534', '&:hover': { bgcolor: '#14532d' }, minHeight: 36, flex: 1, fontWeight: 700, fontSize: 13 }}>
            {marcando ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'SÍ, CONFIRMAR'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)}>
        <Alert severity={snack?.sev} variant="filled" onClose={() => setSnack(null)} sx={{ width: '100%' }}>{snack?.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default DireccionPage;
