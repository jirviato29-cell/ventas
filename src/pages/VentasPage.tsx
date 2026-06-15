import React, { useEffect, useState } from 'react';
import {
  Box, TextField, Button, Typography, Autocomplete, Alert, Paper,
  TableContainer, MenuItem, FormControlLabel, FormControl, FormLabel,
  RadioGroup, Radio, TablePagination, Table, TableHead, TableRow,
  TableCell, TableBody, Divider, Chip, IconButton, Tabs, Tab, useMediaQuery,
  CircularProgress, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SimCardIcon from '@mui/icons-material/SimCard';
import DescriptionIcon from '@mui/icons-material/Description';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import Grid from '@mui/material/Grid';
import axios from 'axios';
import { InventarioGeneral, ProductoEnVenta, Usuario, Venta, VentaChip } from '../Types';
import { useNavigate } from 'react-router-dom';
import { PLANES_CASCADA } from '../data/planesCascada';
import { imprimirTicket } from '../utils/imprimirTicket';
import { calcComision } from '../utils/calcComision';
import RecibosPanel from '../components/RecibosPanel';
import RankingModulos from '../components/RankingModulos';

// ─── helpers ────────────────────────────────────────────────────────────────
const HOY = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }); // "YYYY-MM-DD" zona México
const fmtFecha = (d: string) => { const [y, m, day] = (d || '').split('-'); return day ? `${day}/${m}/${y}` : d || ''; };
const fmtHora  = (h: string) => (h ? h.slice(0, 5) : '');

const thStyle: React.CSSProperties = {
  padding: 8,
  borderBottom: '1px solid #e2e8f0',
  color: '#f97316',
  fontWeight: 700,
  background: '#f8fafc',
  textAlign: 'left',
};
const tdStyle: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid #e2e8f0' };

// ────────────────────────────────────────────────────────────────────────────

const CHIP_OPCIONES_TODAS = [
  { value: 'Chip Equipo',         label: 'Chip Equipo / Promo / ATO' },
  { value: 'Chip Express',        label: 'Chip Express / ATO' },
  { value: 'Portabilidad',        label: 'Portabilidad / ATO' },
  { value: 'Tarjetas PayJoy',     label: 'Tarjetas PayJoy / ATO' },
  { value: 'Chip Cero/Libre',     label: 'Chip Cero / Libre / EKT' },
  { value: 'Chip Preactivado',    label: 'Chip Preactivado / Otras Cadenas' },
  { value: 'Chip Coppel',         label: 'Chip Express Coppel' },
  { value: 'Portabilidad Coppel', label: 'Portabilidad Coppel' },
  { value: 'Porta Otras cadenas', label: 'Portabilidad / EKT / Otras Cadenas' },
  { value: 'Activacion',          label: 'Telefono Activado de Cadenas' },
];

const CHIP_OPCIONES_EKT = [
  { value: 'Activacion',          label: 'Telefono Activado de Cadenas' },
  { value: 'Chip Cero/Libre',     label: 'Chip Cero / Libre / EKT' },
  { value: 'Chip Preactivado',    label: 'Chip Preactivado / Otras Cadenas' },
  { value: 'Porta Otras cadenas', label: 'Portabilidad / EKT / Otras Cadenas' },
];

const CHIP_OPCIONES_COPPEL = [
  { value: 'Activacion',          label: 'Telefono Activado de Cadenas' },
  { value: 'Chip Coppel',         label: 'Chip Express Coppel' },
  { value: 'Portabilidad Coppel', label: 'Portabilidad Coppel' },
];

const CHIP_OPCIONES_OTRAS_CADENAS = [
  { value: 'Activacion',          label: 'Telefono Activado de Cadenas' },
  { value: 'Chip Preactivado',    label: 'Chip Preactivado / Otras Cadenas' },
  { value: 'Porta Otras cadenas', label: 'Portabilidad / EKT / Otras Cadenas' },
];

const CHIP_OPCIONES_POR_CADENA: Record<string, typeof CHIP_OPCIONES_TODAS> = {
  EKT:      CHIP_OPCIONES_EKT,
  COPPEL:   CHIP_OPCIONES_COPPEL,
  CHEDRAUI: CHIP_OPCIONES_OTRAS_CADENAS,
  SUBURBIA: CHIP_OPCIONES_OTRAS_CADENAS,
  AURRERA:  CHIP_OPCIONES_OTRAS_CADENAS,
  SAMS:     CHIP_OPCIONES_OTRAS_CADENAS,
  WALMART:  CHIP_OPCIONES_OTRAS_CADENAS,
};

interface ComisionChip { tipo: string; comision: string; nota?: string; }

const COMISIONES_EKT: ComisionChip[] = [
  { tipo: 'Teléfono Activado de Cadenas',       comision: '$40' },
  { tipo: 'Chip Cero / Libre / EKT',            comision: '$25' },
  { tipo: 'Chip Preactivado / Otras Cadenas',   comision: '$35' },
  { tipo: 'Portabilidad / EKT / Otras Cadenas', comision: '$50' },
  { tipo: 'Tarjetas PayJoy',                    comision: '$50' },
];

const COMISIONES_COPPEL: ComisionChip[] = [
  { tipo: 'Teléfono Activado de Cadenas', comision: 'Depende del valor del equipo' },
  { tipo: 'Chip Express Coppel',          comision: '$15' },
  { tipo: 'Portabilidad Coppel',          comision: '$25' },
];

const COMISIONES_OTRAS_CADENAS: ComisionChip[] = [
  { tipo: 'Teléfono Activado de Cadenas',       comision: '$45' },
  { tipo: 'Chip Preactivado / Otras Cadenas',   comision: '$35' },
  { tipo: 'Portabilidad / EKT / Otras Cadenas', comision: '$50' },
];

const COMISIONES_POR_CADENA: Record<string, ComisionChip[]> = {
  EKT:      COMISIONES_EKT,
  COPPEL:   COMISIONES_COPPEL,
  CHEDRAUI: COMISIONES_OTRAS_CADENAS,
  SUBURBIA: COMISIONES_OTRAS_CADENAS,
  AURRERA:  COMISIONES_OTRAS_CADENAS,
  SAMS:     COMISIONES_OTRAS_CADENAS,
  WALMART:  COMISIONES_OTRAS_CADENAS,
};

// ─── Helpers de ciclos de nómina ─────────────────────────────────────────────

const NOMINA_SYSTEM_START = new Date(2026, 3, 11); // 11 Abr 2026 (sábado)
const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

interface Ciclo { inicio: Date; fin: Date; pago: Date; }

function getCiclos(): Ciclo[] {
  const ciclos: Ciclo[] = [];
  const current = new Date(NOMINA_SYSTEM_START);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  while (true) {
    const inicio = new Date(current);
    const fin = new Date(current);
    fin.setDate(fin.getDate() + 6);
    const pago = new Date(fin);
    pago.setDate(pago.getDate() + 12);
    ciclos.push({ inicio, fin, pago }); // siempre incluir al menos el primer ciclo
    if (pago > hoy) break;              // cada miércoles de pago que pasa habilita el siguiente
    current.setDate(current.getDate() + 7);
  }
  return ciclos.reverse();
}

function fmtDiaMes(d: Date): string {
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`;
}

function labelCiclo(c: Ciclo): string {
  return `${fmtDiaMes(c.inicio)} - ${fmtDiaMes(c.fin)} ${c.fin.getFullYear()} · Pago: ${fmtDiaMes(c.pago)}`;
}

function getEstadoChip(c: VentaChip): { label: string; color: string } {
  if (c.es_incubadora)  return {
    label: c.descripcion_rechazo ? `Incubadora (${c.descripcion_rechazo})` : 'Incubadora',
    color: '#f97316',
  };
  if (c.validado)       return { label: 'Validado',             color: '#16a34a' };
  return                       { label: 'Esperando validación', color: '#64748b' };
}

const FormularioVentaMultiple = () => {
  const moduloLocal = localStorage.getItem('modulo') || '';
  const esCadenas = moduloLocal.toLowerCase().includes('cadena');
  const isMobile = useMediaQuery('(max-width:767px)');

  // ── Estado general ───────────────────────────────────────────────────────
  const [productos, setProductos] = useState<InventarioGeneral[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const ventasTelefonos = ventas.filter((v) => v.tipo_producto === 'telefono');

  const [producto, setProducto] = useState('');
  const [productoClave, setProductoClave] = useState('');
  const [precio, setPrecio] = useState<number | null>(null);
  const [cantidad, setCantidad] = useState<number>(1);
  const [metodoPago, setMetodoPago] = useState('');
  const [telefono, settelefono] = useState('');
  const [carrito, setCarrito] = useState<ProductoEnVenta[]>([]);
  const [montoDividido, setMontoDividido] = useState({ efectivo: '', tarjeta: '' });
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);

  const [tipoVenta, setTipoVenta] = useState<'accesorio' | 'chip' | 'telefono' | 'plan'>(esCadenas ? 'chip' : 'accesorio');
  const [tipoChip, setTipoChip] = useState('');
  const [numero, setNumero] = useState('');
  const [numeroDuplicado, setNumeroDuplicado] = useState(false);
  const [verificandoNumero, setVerificandoNumero] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [recarga, setRecarga] = useState('');
  const [tadDevice, setTadDevice] = useState('');

  const [telefonoMarca, setTelefonoMarca] = useState('');
  const [telefonoModelo, setTelefonoModelo] = useState('');
  const [telefonoClave, setTelefonoClave] = useState('');
  const [telefonoTipo_venta, setTelefonoTipo_venta] = useState('');
  const [telefonoPrecio, setTelefonoPrecio] = useState('');
  const [Chip_casado, setChip_casado] = useState('');

  const [planTipo, setPlanTipo] = useState('');
  const [planEstatus, setPlanEstatus] = useState('');
  const [planCategoria, setPlanCategoria] = useState('');
  const [planClasificacion, setPlanClasificacion] = useState('');
  const [planEquipo, setPlanEquipo] = useState('');
  const [planImei, setPlanImei] = useState('');
  const [planPrecio, setPlanPrecio] = useState('');
  const [planPlazo, setPlanPlazo] = useState('');
  const [planLinea, setPlanLinea] = useState('');
  const [planCuenta, setPlanCuenta] = useState('');
  const [planPagoInicial, setPlanPagoInicial] = useState(false);
  const [planMontoPagoInicial, setPlanMontoPagoInicial] = useState('');
  const [planMetodoPagoInicial, setPlanMetodoPagoInicial] = useState('efectivo');

  const [fecha, setFecha] = useState(HOY);
  const [opcionesTelefonos, setOpcionesTelefonos] = useState<{ clave: string; producto: string }[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [moduloId, setModuloId] = useState<number | null>(null);
  const [rol, setRol] = useState<Usuario['rol'] | null>(localStorage.getItem('rol') as Usuario['rol'] | null);
  const [modulos, setModulos] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const [totalAccesorios, setTotalAccesorios] = useState(0);
  const [totalTelefonos, setTotalTelefonos] = useState(0);
  const [cvip, setcvip] = useState<boolean>(false);
  const [paginaAcc, setPaginaAcc] = useState(0);
  const [paginaTel, setPaginaTel] = useState(0);
  const filasPorPagina = 10;

  // ── Estado asesor ────────────────────────────────────────────────────────
  const [chipsDelDia, setChipsDelDia] = useState<VentaChip[]>([]);
  const [misActivacionesData, setMisActivacionesData] = useState<VentaChip[]>([]);
  const [comisionesHoy, setComisionesHoy] = useState<any>(null);
  const [sinCiclo, setSinCiclo] = useState(false);
  const [tabAsesor, setTabAsesor] = useState(0);
  const [misVentasFecha, setMisVentasFecha] = useState(HOY);
  const [misVentasData, setMisVentasData] = useState<Venta[]>([]);
  const [comisionesMisVentas, setComisionesMisVentas] = useState<any>(null);
  const [catalogoComisiones, setCatalogoComisiones] = useState<{ producto: string; cantidad: number }[]>([]);
  const [nominaCicloIdx, setNominaCicloIdx] = useState(0);
  const [nominaChips, setNominaChips] = useState<VentaChip[]>([]);

  const [editPrecioOpen, setEditPrecioOpen] = useState(false);
  const [editPrecioVenta, setEditPrecioVenta] = useState<Venta | null>(null);
  const [editPrecioValor, setEditPrecioValor] = useState('');
  const [editPrecioError, setEditPrecioError] = useState('');

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  // ── Fetches ──────────────────────────────────────────────────────────────
  const fetchVentas = async () => {
    try {
      const res = await axios.get(`https://ato-appservidor-nvxt.onrender.com/ventas/ventas`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          fecha: fecha || undefined,
          modulo_id: user?.is_admin ? moduloId || undefined : undefined,
        },
      });
      setVentas(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCatalogoComisiones = async () => {
    try {
      const res = await axios.get(`https://ato-appservidor-nvxt.onrender.com/comisiones/comisiones`, config);
      setCatalogoComisiones(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchMisVentas = async (fecha: string) => {
    try {
      const res = await axios.get(`https://ato-appservidor-nvxt.onrender.com/ventas/ventas`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { fecha },
      });
      setMisVentasData(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchComisionesPorFecha = async (fecha: string) => {
    try {
      const res = await axios.get(
        `https://ato-appservidor-nvxt.onrender.com/comisiones/ciclo_por_fechas`,
        { ...config, params: { inicio: fecha, fin: fecha } },
      );
      setComisionesMisVentas(res.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setComisionesMisVentas({ total_accesorios: 0, total_telefonos: 0, ventas_accesorios: [], ventas_telefonos: [] });
      }
    }
  };

  const fetchChipsDelDia = async () => {
    try {
      const res = await axios.get<VentaChip[]>(
        `https://ato-appservidor-nvxt.onrender.com/ventas/venta_chips`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const usuario = localStorage.getItem('usuario') || '';
      const hoy = new Date().toLocaleDateString('en-CA');
      setChipsDelDia(
        res.data.filter((c) => c.fecha === hoy && c.empleado?.username === usuario),
      );
    } catch (err) {
      console.error('Error al cargar chips del día:', err);
    }
  };

  const fetchMisActivaciones = async (fecha: string) => {
    try {
      const res = await axios.get<VentaChip[]>(
        `https://ato-appservidor-nvxt.onrender.com/ventas/venta_chips`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const usuario = localStorage.getItem('usuario') || '';
      setMisActivacionesData(
        res.data.filter((c) => c.fecha === fecha && c.empleado?.username === usuario),
      );
    } catch (err) {
      console.error('Error al cargar mis activaciones:', err);
    }
  };

  const fetchNominaChips = async (inicio: string, fin: string) => {
    try {
      const res = await axios.get<VentaChip[]>(
        `https://ato-appservidor-nvxt.onrender.com/ventas/venta_chips`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const usr = localStorage.getItem('usuario') || '';
      setNominaChips(
        res.data.filter((c) => c.fecha >= inicio && c.fecha <= fin && c.empleado?.username === usr),
      );
    } catch (err) {
      console.error('Error al cargar chips de nómina:', err);
    }
  };

  const fetchComisionesHoy = async () => {
    const hoy = new Date().toLocaleDateString('en-CA');
    try {
      const res = await axios.get(
        `https://ato-appservidor-nvxt.onrender.com/comisiones/ciclo_por_fechas`,
        { ...config, params: { inicio: hoy, fin: hoy } },
      );
      setComisionesHoy(res.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setSinCiclo(true);
        setComisionesHoy({ total_accesorios: 0, total_telefonos: 0, total_chips: 0, total_general: 0, ventas_chips: [], ventas_accesorios: [], ventas_telefonos: [] });
      } else {
        console.error('Error fetching comisiones del día:', err);
      }
    }
  };

  useEffect(() => {
    if (ventas.length > 0) {
      const acc = ventas.filter((v) => v.tipo_producto === 'accesorios' && !v.cancelada);
      setTotalAccesorios(acc.reduce((s, v) => s + v.precio_unitario * v.cantidad, 0));
      const tel = ventas.filter((v) => v.tipo_producto === 'telefono' && !v.cancelada);
      setTotalTelefonos(tel.reduce((s, v) => s + v.precio_unitario * v.cantidad, 0));
    }
  }, [ventas]);

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const res = await axios.get(
          `https://ato-appservidor-nvxt.onrender.com/inventario/inventario/general`,
          config,
        );
        setProductos(res.data);
      } catch (err) {
        console.error('Error al cargar productos:', err);
      }
    };
    fetchProductos();
    fetchCatalogoComisiones();
  }, []);

  useEffect(() => {
    const fetchUserAndModulos = async () => {
      try {
        if (token) {
          const resUser = await axios.get<Usuario>(
            `https://ato-appservidor-nvxt.onrender.com/auth/usuarios/me`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          setUser(resUser.data);
          setRol(resUser.data.rol);
          const resModulos = await axios.get(
            `https://ato-appservidor-nvxt.onrender.com/registro/modulos`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          setModulos(resModulos.data);
        }
      } catch (err) {
        console.error('Error al cargar usuario/modulos:', err);
      }
    };
    fetchUserAndModulos();
  }, []);

  // Para asesor: auto-cargar fecha de hoy y comisiones
  useEffect(() => {
    if (rol === 'asesor') {
      setFecha(HOY);
      fetchComisionesHoy();
      fetchChipsDelDia();
    }
  }, [rol]);

  useEffect(() => {
    fetchVentas();
  }, [fecha, moduloId, user]);

  useEffect(() => {
    if ((rol === 'asesor' || rol === 'encargado') && tabAsesor === 2) {
      if (esCadenas) {
        fetchMisActivaciones(misVentasFecha);
      } else {
        fetchMisVentas(misVentasFecha);
        fetchComisionesPorFecha(misVentasFecha);
      }
    }
  }, [tabAsesor, misVentasFecha, rol]);

  useEffect(() => {
    if ((rol === 'asesor' || rol === 'encargado') && tabAsesor === 3) fetchCatalogoComisiones();
  }, [tabAsesor, rol]);

  useEffect(() => {
    if (rol === 'asesor' && esCadenas && tabAsesor === 4) {
      const ciclos = getCiclos();
      const c = ciclos[nominaCicloIdx] ?? ciclos[0];
      fetchNominaChips(
        c.inicio.toLocaleDateString('en-CA'),
        c.fin.toLocaleDateString('en-CA'),
      );
    }
  }, [tabAsesor, nominaCicloIdx, rol]);

  // ── Acciones ─────────────────────────────────────────────────────────────
  const agregarAlCarrito = () => {
    if (!producto || precio === null || cantidad <= 0) return;
    setCarrito([...carrito, { producto, clave: productoClave, cantidad, precio_unitario: precio, id: 0, nombre: '', tipo_producto: 'accesorios' }]);
    setProducto('');
    setProductoClave('');
    setCantidad(1);
    setPrecio(null);
  };

  const enviarCarrito = async () => {
    if (carrito.length === 0) return;
    const totalCarrito = carrito.reduce((a, p) => a + p.precio_unitario * p.cantidad, 0);

    if (metodoPago === 'dividido') {
      const ef = parseFloat(montoDividido.efectivo);
      const ta = parseFloat(montoDividido.tarjeta);
      if (isNaN(ef) || ef <= 0 || isNaN(ta) || ta <= 0) {
        setMensaje({ tipo: 'error', texto: 'Ambos montos deben ser mayores a $0.' });
        return;
      }
      if (Math.abs(ef + ta - totalCarrito) > 0.01) {
        setMensaje({ tipo: 'error', texto: `La suma ($${(ef + ta).toFixed(2)}) no coincide con el total del carrito ($${totalCarrito.toFixed(2)}).` });
        return;
      }
      const pctEf = ef / totalCarrito;
      const pctTa = ta / totalCarrito;
      const makeItems = (pct: number, skip: boolean) =>
        carrito.map(item => ({
          producto: item.producto,
          cantidad: item.cantidad,
          precio_unitario: Math.round(item.precio_unitario * pct * 100) / 100,
          tipo_producto: item.tipo_producto,
          skip_comision: skip,
        }));
      try {
        const resEf = await axios.post(
          `https://ato-appservidor-nvxt.onrender.com/ventas/ventas/multiples`,
          { productos: makeItems(pctEf, false), telefono_cliente: telefono, metodo_pago: 'efectivo' },
          config,
        );
        const folioCompartido = resEf?.data?.[0]?.folio;

        let okTa = true;
        try {
          await axios.post(
            `https://ato-appservidor-nvxt.onrender.com/ventas/ventas/multiples`,
            { productos: makeItems(pctTa, true), telefono_cliente: telefono, metodo_pago: 'tarjeta', folio: folioCompartido },
            config,
          );
        } catch {
          okTa = false;
          setMensaje({ tipo: 'error', texto: 'Se guardó la parte en efectivo pero falló la parte en tarjeta. Verifica antes de continuar.' });
        }

        if (okTa) {
          setMensaje({ tipo: 'success', texto: 'Venta registrada con éxito.' });
          imprimirTicket({
            productos: carrito.map(p => ({
              nombre: (p as any).producto || p.nombre,
              cantidad: p.cantidad,
              precio_unitario: p.precio_unitario,
            })),
            total: carrito.reduce((a, p) => a + p.precio_unitario * p.cantidad, 0),
            metodoPago,
            montoDividido,
            telefono,
            folio: folioCompartido,
            clasificacion: 'Accesorios',
            modulo: user?.modulo?.nombre || moduloLocal || '',
            vendedor: localStorage.getItem('usuario') || '',
          });
          setCarrito([]); settelefono(''); setMetodoPago(''); setMontoDividido({ efectivo: '', tarjeta: '' });
          if (rol === 'asesor') { fetchVentas(); fetchComisionesHoy(); }
        }
      } catch (errEf: any) {
        const detail = errEf?.response?.data?.detail;
        setMensaje({ tipo: 'error', texto: typeof detail === 'string' ? detail : 'Error al registrar la venta.' });
      }
      return;
    }

    try {
      const res = await axios.post(
        `https://ato-appservidor-nvxt.onrender.com/ventas/ventas/multiples`,
        { productos: carrito, telefono_cliente: telefono, metodo_pago: metodoPago },
        config,
      );
      const folioVenta = res?.data?.[0]?.folio;
      setMensaje({ tipo: 'success', texto: 'Venta registrada con éxito.' });
      imprimirTicket({
        productos: carrito.map(p => ({
          nombre: (p as any).producto || p.nombre,
          cantidad: p.cantidad,
          precio_unitario: p.precio_unitario,
        })),
        total: carrito.reduce((a, p) => a + p.precio_unitario * p.cantidad, 0),
        metodoPago,
        montoDividido,
        telefono,
        folio: folioVenta,
        clasificacion: 'Accesorios',
        modulo: user?.modulo?.nombre || moduloLocal || '',
        vendedor: localStorage.getItem('usuario') || '',
      });
      setCarrito([]); settelefono(''); setMetodoPago(''); setMontoDividido({ efectivo: '', tarjeta: '' });
      if (rol === 'asesor') { fetchVentas(); fetchComisionesHoy(); }
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err?.response?.data?.detail || 'Error al registrar la venta' });
    }
  };

  const cancelarVenta = async (id: number) => {
    if (!window.confirm('¿Estás seguro de cancelar esta venta?')) return;
    try {
      await axios.put(`https://ato-appservidor-nvxt.onrender.com/ventas/ventas/${id}/cancelar`, {}, config);
      alert('Venta cancelada');
      fetchVentas();
      if (rol === 'asesor') fetchComisionesHoy();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al cancelar la venta');
    }
  };

  const abrirEditarPrecio = (v: Venta) => {
    setEditPrecioVenta(v);
    setEditPrecioValor(String(v.precio_unitario));
    setEditPrecioError('');
    setEditPrecioOpen(true);
  };

  const guardarPrecio = async () => {
    if (!editPrecioVenta) return;
    const nuevo = parseFloat(editPrecioValor);
    if (isNaN(nuevo) || nuevo <= 0) {
      setEditPrecioError('El precio debe ser mayor a 0');
      return;
    }
    try {
      await axios.patch(
        `https://ato-appservidor-nvxt.onrender.com/ventas/ventas/${editPrecioVenta.id}/precio`,
        { nuevo_precio: nuevo },
        config,
      );
      setEditPrecioOpen(false);
      fetchVentas();
    } catch (err: any) {
      setEditPrecioError(err.response?.data?.detail || 'Error al editar el precio');
    }
  };

  const verificarNumero = async (num: string) => {
    if (!num.trim()) return;
    setVerificandoNumero(true);
    setNumeroDuplicado(false);
    const url = `https://ato-appservidor-nvxt.onrender.com/ventas/venta_chips/verificar_numero/${encodeURIComponent(num)}`;
    console.log("[verificarNumero] URL:", url);
    try {
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      console.log("[verificarNumero] respuesta:", res.data);
      setNumeroDuplicado(res.data.duplicado === true);
    } catch (err) {
      console.error("[verificarNumero] error:", err);
      setNumeroDuplicado(false);
    } finally {
      setVerificandoNumero(false);
    }
  };

  const handleSubmit = async () => {
    const esPayJoy = tipoChip === 'Tarjetas PayJoy';
    setRegistrando(true);
    try {
      await axios.post(
        `https://ato-appservidor-nvxt.onrender.com/ventas/venta_chips`,
        {
          tipo_chip: tipoChip,
          numero_telefono: esPayJoy ? tadDevice : numero,
          monto_recarga: esPayJoy ? 0 : parseFloat(recarga),
          telefono_cliente: telefono || null,
          cvip: esPayJoy ? false : cvip,
        },
        { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } },
      );
      setMensaje({ tipo: 'success', texto: 'Venta de chip registrada correctamente' });
      setTipoChip(''); setNumero(''); setRecarga(''); settelefono(''); setTadDevice('');
      if (rol === 'asesor') { fetchVentas(); fetchComisionesHoy(); fetchChipsDelDia(); }
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err?.response?.data?.detail || 'Error al registrar la venta' });
    } finally {
      setRegistrando(false);
    }
  };

  const registrarVentaTelefono = async () => {
    if (!telefonoMarca || !telefonoModelo || !telefonoPrecio || !telefonoTipo_venta) {
      setMensaje({ tipo: 'error', texto: 'Faltan datos del teléfono.' });
      return;
    }
    const p = Number(telefonoPrecio);
    if (isNaN(p) || p <= 0) { setMensaje({ tipo: 'error', texto: 'Precio inválido.' }); return; }
    const productoBase = {
      producto: `${telefonoMarca} ${telefonoModelo}`,
      cantidad: 1, tipo_producto: 'telefono', tipo_venta: telefonoTipo_venta,
      chip_casado: Chip_casado || null,
    };
    const resetTel = () => {
      setTelefonoMarca(''); setTelefonoModelo(''); setTelefonoClave(''); setTelefonoTipo_venta('');
      setMetodoPago(''); setTelefonoPrecio(''); setChip_casado(''); settelefono('');
      setMontoDividido({ efectivo: '', tarjeta: '' });
    };

    if (metodoPago === 'dividido') {
      const ef = parseFloat(montoDividido.efectivo);
      const ta = parseFloat(montoDividido.tarjeta);
      if (isNaN(ef) || ef <= 0 || isNaN(ta) || ta <= 0) {
        setMensaje({ tipo: 'error', texto: 'Ambos montos deben ser mayores a $0.' });
        return;
      }
      if (Math.abs(ef + ta - p) > 0.01) {
        setMensaje({ tipo: 'error', texto: 'Los montos divididos deben sumar exactamente el precio del teléfono.' });
        return;
      }
      try {
        const resEf = await axios.post(
          `https://ato-appservidor-nvxt.onrender.com/ventas/ventas`,
          { productos: [{ ...productoBase, precio_unitario: ef, skip_comision: false }], metodo_pago: 'efectivo', telefono_cliente: telefono?.trim() || '' },
          config,
        );
        const folioCompartido = resEf?.data?.[0]?.folio;

        let okTa = true;
        try {
          await axios.post(
            `https://ato-appservidor-nvxt.onrender.com/ventas/ventas`,
            { productos: [{ ...productoBase, precio_unitario: ta, skip_comision: true, skip_inventario: true }], metodo_pago: 'tarjeta', telefono_cliente: telefono?.trim() || '', folio: folioCompartido },
            config,
          );
        } catch {
          okTa = false;
          setMensaje({ tipo: 'error', texto: 'Se guardó la parte en efectivo pero falló la parte en tarjeta. Verifica antes de continuar.' });
        }

        if (okTa) {
          setMensaje({ tipo: 'success', texto: 'Venta de teléfono registrada correctamente' });
          imprimirTicket({
            productos: [{
              nombre: productoBase.producto,
              cantidad: 1,
              precio_unitario: p,
            }],
            total: p,
            metodoPago,
            montoDividido,
            telefono,
            modulo: user?.modulo?.nombre || moduloLocal || '',
            vendedor: localStorage.getItem('usuario') || '',
            folio: folioCompartido,
            clasificacion: 'Telefono',
          });
          resetTel();
          if (rol === 'asesor') { fetchVentas(); fetchComisionesHoy(); }
        }
      } catch (errEf: any) {
        const detail = errEf?.response?.data?.detail;
        setMensaje({ tipo: 'error', texto: typeof detail === 'string' ? detail : 'Error al registrar la venta de teléfono.' });
      }
      return;
    }

    try {
      const res = await axios.post(
        `https://ato-appservidor-nvxt.onrender.com/ventas/ventas`,
        { productos: [{ ...productoBase, precio_unitario: p }], metodo_pago: metodoPago, telefono_cliente: telefono?.trim() || '' },
        config,
      );
      const folioVenta = res?.data?.[0]?.folio;
      setMensaje({ tipo: 'success', texto: 'Venta de teléfono registrada correctamente' });
      imprimirTicket({
        productos: [{
          nombre: productoBase.producto,
          cantidad: 1,
          precio_unitario: p,
        }],
        total: p,
        metodoPago,
        montoDividido,
        telefono,
        modulo: user?.modulo?.nombre || moduloLocal || '',
        vendedor: localStorage.getItem('usuario') || '',
        folio: folioVenta,
        clasificacion: 'Telefono',
      });
      resetTel();
      if (rol === 'asesor') { fetchVentas(); fetchComisionesHoy(); }
    } catch (err: any) {
      let msg = 'Error al registrar la venta de teléfono';
      if (Array.isArray(err?.response?.data?.detail)) msg = err.response.data.detail.map((e: any) => e.msg).join(' | ');
      else if (typeof err?.response?.data?.detail === 'string') msg = err.response.data.detail;
      setMensaje({ tipo: 'error', texto: msg });
    }
  };

  const resetPlan = () => {
    setPlanTipo(''); setPlanEstatus(''); setPlanCategoria(''); setPlanClasificacion('');
    setPlanEquipo(''); setPlanImei(''); setPlanPrecio(''); setPlanPlazo('');
    setPlanLinea(''); setPlanCuenta(''); setPlanPagoInicial(false); setPlanMontoPagoInicial(''); setPlanMetodoPagoInicial('efectivo');
  };

  const registrarPlan = async () => {
    if (!planTipo || !planEstatus || !planCategoria || !planClasificacion) {
      setMensaje({ tipo: 'error', texto: 'Completa Tipo, Estatus, Categoría y Clasificación' });
      return;
    }
    try {
      const payload = {
        tipo_plan: planTipo,
        estatus: planEstatus,
        categoria: planCategoria,
        clasificacion: planClasificacion,
        equipo: planEquipo || null,
        imei: planImei || null,
        precio_equipo: planPrecio ? Number(planPrecio) : null,
        plazo: planPlazo ? Number(planPlazo) : null,
        linea: planLinea || null,
        cuenta: planCuenta || null,
        pago_inicial: planPagoInicial,
        monto_pago_inicial: planPagoInicial && planMontoPagoInicial ? Number(planMontoPagoInicial) : 0,
        metodo_pago_inicial: planPagoInicial ? planMetodoPagoInicial : null,
      };
      await axios.post('https://ato-appservidor-nvxt.onrender.com/planes-tarifarios', payload, config);
      setMensaje({ tipo: 'success', texto: 'Plan registrado correctamente' });
      resetPlan();
      if (rol === 'asesor') { fetchVentas(); }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Error al registrar el plan';
      setMensaje({ tipo: 'error', texto: msg });
    }
  };

  const buscarTelefonos = async (texto: string) => {
    if (!texto || texto.length < 2) { setOpcionesTelefonos([]); return; }
    setBuscando(true);
    try {
      const res = await axios.get(
        `https://ato-appservidor-nvxt.onrender.com/inventario/buscar?query=${encodeURIComponent(texto)}`,
        config,
      );
      setOpcionesTelefonos(res.data);
    } catch { setOpcionesTelefonos([]); }
    finally { setBuscando(false); }
  };

  // ── Cálculos asesor del día ──────────────────────────────────────────────
  const ventasHoyAcc = ventas.filter((v) => v.tipo_producto === 'accesorios' && v.fecha?.startsWith(HOY)).sort((a, b) => a.producto.localeCompare(b.producto, 'es'));
  const ventasHoyTel = ventas.filter((v) => v.tipo_producto === 'telefono' && v.fecha?.startsWith(HOY)).sort((a, b) => a.producto.localeCompare(b.producto, 'es'));
  const chipsHoy = chipsDelDia;

  const comisionAccHoy  = ventasHoyAcc.filter((v) => !v.cancelada).reduce((s, v) => s + calcComision(v, catalogoComisiones), 0);
  const comisionTelHoy  = ventasHoyTel.filter((v) => !v.cancelada).reduce((s, v) => s + calcComision(v, catalogoComisiones), 0);
  const totalComisionHoy = comisionAccHoy + comisionTelHoy;

  const totalPesosAcc = ventasHoyAcc.filter((v) => !v.cancelada).reduce((s, v) => s + v.precio_unitario * v.cantidad, 0);
  const totalPesosTel = ventasHoyTel.filter((v) => !v.cancelada).reduce((s, v) => s + v.precio_unitario * v.cantidad, 0);
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Formulario (compartido) ───────────────────────────────────────────────
  const formulario = localStorage.getItem('rol') !== 'admin' ? (
    <Paper sx={{ borderRadius: 2, p: 0, overflow: 'hidden' }}>
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography sx={{ fontWeight: 700 }}>
          {esCadenas ? 'Activaciones' : 'Registrar Venta'}
        </Typography>
      </Box>

      <Box sx={{ borderTop: '1px solid #eef0f3' }} />

      <Box sx={{ px: 2, pt: 1.2, pb: 2 }}>
      {mensaje && <Alert severity={mensaje.tipo} sx={{ mb: 1.2 }}>{mensaje.texto}</Alert>}

      {!esCadenas && (
        <Grid container spacing={1} sx={{ mb: 1, mt: 0.5 }}>
          {[
            { v: 'accesorio', label: 'Accesorio',     icon: <HeadphonesIcon />, color: '#7c3aed' },
            { v: 'chip',      label: 'Chip',           icon: <SimCardIcon />,    color: '#16a34a' },
            { v: 'telefono',  label: 'Teléfono',       icon: <SmartphoneIcon />, color: '#0891b2' },
            { v: 'plan',      label: 'Plan tarifario', icon: <DescriptionIcon />, color: '#d97706' },
          ].map((t) => (
            <Grid item xs={6} key={t.v}>
              <Box
                onClick={() => { setTipoVenta(t.v as any); setMensaje(null); }}
                sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.8,
                  py: 1, borderRadius: 2.5, cursor: 'pointer', fontWeight: 600, fontSize: 14,
                  border: tipoVenta === t.v ? '2px solid #7c3aed' : '1px solid #e5e7eb',
                  bgcolor: tipoVenta === t.v ? '#f5f3ff' : '#fff',
                  color: tipoVenta === t.v ? '#7c3aed' : '#374151',
                  transition: 'all .15s',
                  userSelect: 'none',
                  '&:hover': { borderColor: '#7c3aed' },
                }}
              >
                <Box component="span" sx={{ color: t.color, display: 'flex' }}>{t.icon}</Box>
                {t.label}
              </Box>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ── Accesorio ── */}
      {!esCadenas && tipoVenta === 'accesorio' && (
        <>
          <Autocomplete<InventarioGeneral>
            options={productos
              .filter((p) => !p.producto.toLowerCase().includes('telefono') && p.cantidad > 0)
              .sort((a, b) => a.producto.localeCompare(b.producto, 'es'))}
            value={productos.find((p) => p.producto === producto) ?? null}
            filterOptions={(opts, { inputValue }) => {
              const q = inputValue.toLowerCase();
              return opts.filter(
                (p) =>
                  (p.clave ?? '').toLowerCase().includes(q) ||
                  p.producto.toLowerCase().includes(q),
              );
            }}
            getOptionLabel={(p) => (p.clave ? `${p.clave} - ${p.producto}` : p.producto)}
            onChange={(_, obj) => {
              if (obj) {
                setProducto(obj.producto);
                setProductoClave(obj.clave ?? '');
                setPrecio(obj.precio);
              } else {
                setProducto('');
                setProductoClave('');
                setPrecio(null);
              }
            }}
            renderInput={(params) => <TextField {...params} label="Producto" fullWidth margin="dense" />}
          />
          <TextField label="Precio Unitario" type="number" value={precio ?? ''} onChange={(e) => setPrecio(e.target.value === '' ? null : Number(e.target.value))} fullWidth margin="dense" />
          <TextField label="Cantidad" type="number" value={cantidad} onChange={(e) => setCantidad(parseInt(e.target.value))} fullWidth margin="dense" />
          <Button variant="outlined" fullWidth onClick={agregarAlCarrito} disabled={!producto || precio === null || cantidad <= 0}
            sx={{ mt: 0.5, borderRadius: 2, border: '1.5px dashed #c4b5fd', bgcolor: '#faf5ff', color: '#7c3aed', fontWeight: 700, py: 0.9, textTransform: 'none', '&:hover': { bgcolor: '#f3e8ff', border: '1.5px dashed #a78bfa' } }}>
            Agregar al Carrito
          </Button>
          <TextField label="Teléfono del cliente" value={telefono} onChange={(e) => settelefono(e.target.value)} fullWidth margin="dense" />
          <Box mt={1}>
            <Typography variant="h6">Carrito</Typography>
            {carrito.length === 0
              ? (
                <Box sx={{ textAlign: 'center', py: 1.5, color: '#9ca3af' }}>
                  <ShoppingBagIcon sx={{ fontSize: 40, color: '#cbd5e1', mb: 0.5 }} />
                  <Typography sx={{ fontSize: 14 }}>No hay productos agregados</Typography>
                </Box>
              )
              : <ul style={{ paddingLeft: 16, margin: 0 }}>{carrito.map((p, i) => (
                  <li key={i} style={{ marginBottom: 2, fontSize: 13 }}>
                    {p.clave ? `${p.clave} - ` : ''}{p.producto} — {p.cantidad} × ${p.precio_unitario.toFixed(2)}
                  </li>
                ))}</ul>}
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc', borderRadius: 2, px: 2, py: 1, mt: 0.5 }}>
            <Typography sx={{ fontWeight: 700, color: '#64748b', fontSize: 13, letterSpacing: 0.5 }}>TOTAL</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: 20 }}>${carrito.reduce((a, p) => a + p.precio_unitario * p.cantidad, 0).toFixed(2)}</Typography>
          </Box>
          <Divider sx={{ my: 1 }} />
          <TextField select label="¿Cómo paga el cliente?" value={metodoPago}
            onChange={(e) => { setMetodoPago(e.target.value); setMontoDividido({ efectivo: '', tarjeta: '' }); }}
            fullWidth margin="dense" required
            error={carrito.length > 0 && !metodoPago}
            helperText={carrito.length > 0 && !metodoPago ? 'Selecciona el método de pago' : ''}>
            <MenuItem value="efectivo">Efectivo 💵</MenuItem>
            <MenuItem value="tarjeta">Tarjeta 💳</MenuItem>
            <MenuItem value="dividido">Dividido 💳💵</MenuItem>
          </TextField>
          {metodoPago === 'dividido' && carrito.length > 0 && (() => {
            const totalCarrito = carrito.reduce((a, p) => a + p.precio_unitario * p.cantidad, 0);
            const efRaw = parseFloat(montoDividido.efectivo);
            const taRaw = parseFloat(montoDividido.tarjeta);
            const ef = isNaN(efRaw) ? 0 : efRaw;
            const ta = isNaN(taRaw) ? 0 : taRaw;
            const eitherZero = (montoDividido.efectivo !== '' && efRaw <= 0) || (montoDividido.tarjeta !== '' && taRaw <= 0);
            const diff = totalCarrito - (ef + ta);
            const sumOk = !eitherZero && Math.abs(diff) < 0.01 && ef > 0 && ta > 0;
            const captionColor = eitherZero ? 'error.main' : sumOk ? 'success.main' : diff > 0 ? 'warning.main' : 'error.main';
            const captionText = eitherZero
              ? 'Para dividir, ambos montos deben ser mayores a $0. Si solo es uno, usa Efectivo o Tarjeta directamente.'
              : sumOk
                ? `✓ Asignado: $${(ef + ta).toFixed(2)} / $${totalCarrito.toFixed(2)}`
                : diff > 0
                  ? `Falta $${diff.toFixed(2)} por asignar (total: $${totalCarrito.toFixed(2)})`
                  : `Te excediste por $${Math.abs(diff).toFixed(2)}`;
            const pctEf = sumOk ? ef / totalCarrito : 0;
            const pctTa = sumOk ? ta / totalCarrito : 0;
            return (
              <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 1, p: 1.5, mb: 1 }}>
                <Box display="flex" gap={1}>
                  <TextField label="Efectivo 💵" type="number" value={montoDividido.efectivo}
                    onChange={(e) => setMontoDividido(m => ({ ...m, efectivo: e.target.value }))}
                    size="small" sx={{ flex: 1 }} />
                  <TextField label="Tarjeta 💳" type="number" value={montoDividido.tarjeta}
                    onChange={(e) => setMontoDividido(m => ({ ...m, tarjeta: e.target.value }))}
                    size="small" sx={{ flex: 1 }} />
                </Box>
                <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: captionColor }}>
                  {captionText}
                </Typography>
                {sumOk && (
                  <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed #e2e8f0' }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b', display: 'block', mb: 0.5 }}>
                      Vista previa del cobro:
                    </Typography>
                    {carrito.map((item, i) => {
                      const totalItem = item.precio_unitario * item.cantidad;
                      return (
                        <Typography key={i} variant="caption" sx={{ display: 'block', color: '#94a3b8', fontSize: 11 }}>
                          • {item.clave ? `${item.clave} - ` : ''}{item.producto}: ${(totalItem * pctEf).toFixed(2)} ef + ${(totalItem * pctTa).toFixed(2)} ta
                        </Typography>
                      );
                    })}
                  </Box>
                )}
              </Box>
            );
          })()}
          <Button variant="contained" fullWidth onClick={enviarCarrito} disabled={carrito.length === 0 || !metodoPago}
            sx={{ mt: 2, borderRadius: 3, bgcolor: '#f97316', color: '#fff', fontWeight: 800, py: 1.5, fontSize: 16, textTransform: 'uppercase', boxShadow: 'none', '&:hover': { bgcolor: '#ea580c' }, '&.Mui-disabled': { bgcolor: '#e5e7eb', color: '#9ca3af' } }}>
            Registrar Venta
          </Button>
        </>
      )}

      {/* ── Chip ── */}
      {(esCadenas || tipoVenta === 'chip') && (
        <>
          <TextField select label="Chip" value={tipoChip} onChange={(e) => { setTipoChip(e.target.value); setTadDevice(''); }} fullWidth margin="normal">
            {(rol === null
              ? []
              : esCadenas
                ? CHIP_OPCIONES_POR_CADENA[sessionStorage.getItem('cadena_seleccionada') || ''] ?? []
                : (rol === 'asesor' || rol === 'encargado')
                  ? CHIP_OPCIONES_TODAS.filter((op) => op.label.endsWith('/ ATO'))
                  : CHIP_OPCIONES_TODAS
            ).map((op) => (
              <MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>
            ))}
          </TextField>
          {tipoChip !== 'Tarjetas PayJoy' && (
            <>
              <TextField
                label="Número" type="tel" value={numero} fullWidth margin="normal"
                onChange={(e) => { setNumero(e.target.value); setNumeroDuplicado(false); }}
                onBlur={() => verificarNumero(numero)}
                error={numeroDuplicado}
                helperText={
                  numeroDuplicado
                    ? 'Este número ya fue registrado'
                    : verificandoNumero
                    ? 'Verificando…'
                    : ''
                }
                InputProps={{ endAdornment: verificandoNumero ? <InputAdornment position="end"><CircularProgress size={16} /></InputAdornment> : undefined }}
              />
              <TextField label="Recarga" type="number" value={recarga} onChange={(e) => setRecarga(e.target.value)} fullWidth margin="normal" />
              <FormControl sx={{ mt: 1 }}>
                <FormLabel>Cliente VIP</FormLabel>
                <RadioGroup row value={cvip} onChange={(e) => setcvip(e.target.value === 'true')}>
                  <FormControlLabel value="true" control={<Radio />} label="Sí" />
                  <FormControlLabel value="false" control={<Radio />} label="No" />
                </RadioGroup>
              </FormControl>
            </>
          )}
          {tipoChip === 'Tarjetas PayJoy' && (
            <TextField label="TAD DEVICE" value={tadDevice} onChange={(e) => setTadDevice(e.target.value)} fullWidth margin="normal" />
          )}
          <Button
            variant="contained" fullWidth onClick={handleSubmit}
            disabled={registrando || !tipoChip || (tipoChip === 'Tarjetas PayJoy' ? !tadDevice : (!numero || !recarga || numeroDuplicado || verificandoNumero))}
            sx={{ mt: 2 }}
          >Registrar Venta de Chip</Button>
        </>
      )}

      {/* ── Teléfono ── */}
      {!esCadenas && tipoVenta === 'telefono' && (
        <>
          <Autocomplete<{ clave: string; producto: string }>
            loading={buscando} options={opcionesTelefonos}
            value={opcionesTelefonos.find((p) => p.producto === `${telefonoMarca} ${telefonoModelo}`.trim()) ?? null}
            filterOptions={(opts, { inputValue }) => {
              const q = inputValue.toLowerCase();
              return opts.filter(
                (p) =>
                  (p.clave ?? '').toLowerCase().includes(q) ||
                  (p.producto ?? '').toLowerCase().includes(q),
              );
            }}
            getOptionLabel={(p) => (p.clave ? `${p.clave} - ${p.producto ?? ''}` : (p.producto ?? ''))}
            onInputChange={(_, v) => buscarTelefonos(v)}
            onChange={(_, obj) => {
              if (obj) {
                const parts = obj.producto.split(' ');
                setTelefonoMarca(parts[0] || '');
                setTelefonoModelo(parts.slice(1).join(' ') || '');
                setTelefonoClave(obj.clave ?? '');
              } else {
                setTelefonoMarca('');
                setTelefonoModelo('');
                setTelefonoClave('');
              }
            }}
            renderInput={(params) => <TextField {...params} label="Teléfono (marca + modelo)" fullWidth margin="normal" />}
          />
          {telefonoMarca && (
            <Typography variant="caption" sx={{ ml: 0.5, color: '#64748b' }}>
              {telefonoClave ? `${telefonoClave} - ` : ''}{telefonoMarca} {telefonoModelo}
            </Typography>
          )}
          <TextField select label="Tipo" value={telefonoTipo_venta} onChange={(e) => setTelefonoTipo_venta(e.target.value)} fullWidth margin="normal">
            <MenuItem value="Contado">Contado</MenuItem>
            <MenuItem value="Pajoy">Pajoy</MenuItem>
            <MenuItem value="Paguitos">Paguitos</MenuItem>
          </TextField>
          <TextField label="Precio" type="number" value={telefonoPrecio} onChange={(e) => setTelefonoPrecio(e.target.value)} fullWidth margin="normal" />
          <TextField label="Chip casado" value={Chip_casado} onChange={(e) => setChip_casado(e.target.value)} fullWidth margin="normal" />
          <Divider sx={{ my: 2 }} />
          <TextField select label="¿Cómo paga el cliente?" value={metodoPago}
            onChange={(e) => { setMetodoPago(e.target.value); setMontoDividido({ efectivo: '', tarjeta: '' }); }}
            fullWidth margin="normal" required>
            <MenuItem value="efectivo">💵 Efectivo</MenuItem>
            <MenuItem value="tarjeta">💳 Tarjeta</MenuItem>
            <MenuItem value="dividido">Dividido 💳💵</MenuItem>
          </TextField>
          {metodoPago === 'dividido' && telefonoPrecio && Number(telefonoPrecio) > 0 && (() => {
            const total = Number(telefonoPrecio);
            const efRaw = parseFloat(montoDividido.efectivo);
            const taRaw = parseFloat(montoDividido.tarjeta);
            const ef = isNaN(efRaw) ? 0 : efRaw;
            const ta = isNaN(taRaw) ? 0 : taRaw;
            const eitherZero = (montoDividido.efectivo !== '' && efRaw <= 0) || (montoDividido.tarjeta !== '' && taRaw <= 0);
            const diff = total - (ef + ta);
            const sumOk = !eitherZero && Math.abs(diff) < 0.01 && ef > 0 && ta > 0;
            const captionColor = eitherZero ? 'error.main' : sumOk ? 'success.main' : diff > 0 ? 'warning.main' : 'error.main';
            const captionText = eitherZero
              ? 'Para dividir, ambos montos deben ser mayores a $0. Si solo es uno, usa Efectivo o Tarjeta directamente.'
              : sumOk
                ? `✓ Asignado: $${(ef + ta).toFixed(2)} / $${total.toFixed(2)}`
                : diff > 0
                  ? `Falta $${diff.toFixed(2)} por asignar (total: $${total.toFixed(2)})`
                  : `Te excediste por $${Math.abs(diff).toFixed(2)}`;
            return (
              <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 1, p: 1.5, mb: 1 }}>
                <Box display="flex" gap={1}>
                  <TextField label="Efectivo 💵" type="number" value={montoDividido.efectivo}
                    onChange={(e) => setMontoDividido(m => ({ ...m, efectivo: e.target.value }))}
                    size="small" sx={{ flex: 1 }} />
                  <TextField label="Tarjeta 💳" type="number" value={montoDividido.tarjeta}
                    onChange={(e) => setMontoDividido(m => ({ ...m, tarjeta: e.target.value }))}
                    size="small" sx={{ flex: 1 }} />
                </Box>
                <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: captionColor }}>
                  {captionText}
                </Typography>
              </Box>
            );
          })()}
          <Button variant="contained" color="secondary" fullWidth onClick={registrarVentaTelefono}
            disabled={!telefonoMarca || !telefonoModelo || !telefonoTipo_venta || !telefonoPrecio || !metodoPago} sx={{ mt: 2 }}>
            Registrar Venta Teléfono
          </Button>
        </>
      )}

      {!esCadenas && tipoVenta === 'plan' && (
        <>
          <TextField select label="Tipo de plan" value={planTipo}
            onChange={(e) => {
              setPlanTipo(e.target.value);
              setPlanCategoria('');
              setPlanClasificacion('');
              setPlanEquipo('');
              setPlanImei('');
              setPlanPrecio('');
              setPlanPlazo('');
            }}
            fullWidth margin="normal">
            {Object.keys(PLANES_CASCADA).map((t) => (
              <MenuItem key={t} value={t}>{t}</MenuItem>
            ))}
          </TextField>

          <TextField select label="Estatus" value={planEstatus}
            onChange={(e) => setPlanEstatus(e.target.value)}
            fullWidth margin="normal">
            <MenuItem value="ABIERTO">ABIERTO</MenuItem>
            <MenuItem value="CONTROLADO">CONTROLADO</MenuItem>
          </TextField>

          <TextField select label="Categoría" value={planCategoria}
            onChange={(e) => { setPlanCategoria(e.target.value); setPlanClasificacion(''); }}
            fullWidth margin="normal" disabled={!planTipo}>
            {planTipo && Object.keys(PLANES_CASCADA[planTipo] || {}).map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </TextField>

          <TextField select label="Clasificación" value={planClasificacion}
            onChange={(e) => setPlanClasificacion(e.target.value)}
            fullWidth margin="normal" disabled={!planCategoria}>
            {planTipo && planCategoria && (PLANES_CASCADA[planTipo]?.[planCategoria] || []).map((cl) => (
              <MenuItem key={cl} value={cl}>{cl}</MenuItem>
            ))}
          </TextField>

          {planTipo === 'FORZOSO' && (
            <>
              <Autocomplete
                options={opcionesTelefonos}
                getOptionLabel={(p) => (p.clave ? `${p.clave} - ${p.producto ?? ''}` : (p.producto ?? ''))}
                filterOptions={(opts, { inputValue }) => {
                  const q = inputValue.toLowerCase();
                  return opts.filter(
                    (p) =>
                      (p.clave ?? '').toLowerCase().includes(q) ||
                      (p.producto ?? '').toLowerCase().includes(q),
                  );
                }}
                loading={buscando}
                onInputChange={(_, v) => buscarTelefonos(v)}
                onChange={(_, obj) => { setPlanEquipo(obj ? obj.producto : ''); }}
                renderInput={(params) => (
                  <TextField {...params} label="Equipo (del inventario)" fullWidth margin="normal" />
                )}
              />

              <TextField label="IMEI" value={planImei}
                onChange={(e) => setPlanImei(e.target.value)} fullWidth margin="normal" />

              <TextField label="Precio equipo" type="number" value={planPrecio}
                onChange={(e) => setPlanPrecio(e.target.value)} fullWidth margin="normal" />

              <TextField select label="Plazo (meses)" value={planPlazo}
                onChange={(e) => setPlanPlazo(e.target.value)} fullWidth margin="normal">
                <MenuItem value="12">12 meses</MenuItem>
                <MenuItem value="18">18 meses</MenuItem>
                <MenuItem value="24">24 meses</MenuItem>
                <MenuItem value="36">36 meses</MenuItem>
              </TextField>
            </>
          )}

          <TextField label="Línea" value={planLinea}
            onChange={(e) => setPlanLinea(e.target.value)} fullWidth margin="normal" />

          <TextField label="Cuenta" value={planCuenta}
            onChange={(e) => setPlanCuenta(e.target.value)} fullWidth margin="normal" />

          <TextField select label="¿Requiere pago inicial?" value={planPagoInicial ? 'si' : 'no'}
            onChange={(e) => setPlanPagoInicial(e.target.value === 'si')}
            fullWidth margin="normal">
            <MenuItem value="no">No</MenuItem>
            <MenuItem value="si">Sí</MenuItem>
          </TextField>

          {planPagoInicial && (
            <>
              <TextField label="Monto pago inicial" type="number" value={planMontoPagoInicial}
                onChange={(e) => setPlanMontoPagoInicial(e.target.value)} fullWidth margin="normal" />
              <TextField select label="¿Cómo paga el pago inicial?" value={planMetodoPagoInicial}
                onChange={(e) => setPlanMetodoPagoInicial(e.target.value)}
                fullWidth margin="normal">
                <MenuItem value="efectivo">Efectivo</MenuItem>
                <MenuItem value="tarjeta">Tarjeta</MenuItem>
              </TextField>
            </>
          )}

          <Button variant="contained" color="primary" fullWidth sx={{ mt: 2 }} onClick={registrarPlan}>
            Registrar Plan
          </Button>
        </>
      )}
      </Box>
    </Paper>
  ) : null;

  // ════════════════════════════════════════════════════════════════════════════
  // VISTA ADMIN
  // ════════════════════════════════════════════════════════════════════════════
  console.log('ROL EN STORAGE:', localStorage.getItem('rol'));
  if (localStorage.getItem('rol') === 'admin' || localStorage.getItem('rol') === 'ADMIN') {
    return (
      <Box sx={{ mt: 2, px: { xs: 1, sm: 2 } }}>
        <Typography variant="h6" gutterBottom fontWeight={700}>Ventas Realizadas</Typography>
        <Box sx={{ mb: 2 }}>
          {user?.is_admin && modulos.length > 0 && (
            <>
              <label htmlFor="modulo-admin">Selecciona Módulo</label>
              <select
                id="modulo-admin"
                value={moduloId ?? ''}
                onChange={(e) => setModuloId(e.target.value ? Number(e.target.value) : null)}
                style={{ display: 'block', marginTop: 4, marginBottom: 12, padding: '6px 8px', borderRadius: 6, border: '1px solid #e2e8f0', width: '100%' }}
              >
                <option value="">-- Selecciona un módulo --</option>
                {modulos.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </>
          )}
          <Box display="flex" gap={1} alignItems="center">
            <TextField type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} size="small" />
            <Button variant="contained" onClick={fetchVentas}>Buscar</Button>
          </Box>
        </Box>

        <Paper sx={{ mb: 3, overflowX: 'auto' }}>
          <Box p={2} component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Nombre', 'Producto', 'Cantidad', 'Precio', 'Total', 'Fecha', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} style={{ padding: 8, borderBottom: '1px solid #e2e8f0', color: '#f97316', fontWeight: 700, background: '#f8fafc', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ventas.filter((v) => v.tipo_producto === 'accesorios')
                .slice(paginaAcc * filasPorPagina, (paginaAcc + 1) * filasPorPagina)
                .map((v) => (
                  <tr key={v.id}>
                    <td style={{ padding: 8 }}>{v.empleado?.username}</td>
                    <td style={{ padding: 8 }}>{v.producto}</td>
                    <td style={{ padding: 8 }}>{v.cantidad}</td>
                    <td style={{ padding: 8 }}>${typeof v.precio_unitario === 'number' ? v.precio_unitario.toFixed(2) : '0.00'}</td>
                    <td style={{ padding: 8 }}>${typeof v.total === 'number' ? v.total.toFixed(2) : '0.00'}</td>
                    <td style={{ padding: 8 }}>{`${v.fecha} ${v.hora}`}</td>
                    <td style={{ padding: 8 }}>{v.cancelada ? 'Cancelada' : 'Activa'}</td>
                    <td style={{ padding: 8 }}>
                      <Box display="flex" gap={1}>
                        <Button variant="outlined" size="small" color="error" disabled={v.cancelada} onClick={() => cancelarVenta(v.id)}>Cancelar</Button>
                        {(user?.rol === 'admin' || user?.rol === 'direccion') && (
                          <Button variant="outlined" size="small" disabled={v.cancelada} sx={{ borderColor: '#0d1e3a', color: '#0d1e3a' }} onClick={() => abrirEditarPrecio(v)}>Editar precio</Button>
                        )}
                      </Box>
                    </td>
                  </tr>
                ))}
              {ventas.filter((v) => v.tipo_producto === 'accesorios').length === 0 && (
                <tr><td colSpan={8} style={{ padding: 8, textAlign: 'center' }}>No hay ventas registradas</td></tr>
              )}
            </tbody>
          </Box>
        </Paper>
        <TablePagination
          component="div"
          count={ventas.filter((v) => v.tipo_producto === 'accesorios').length}
          page={paginaAcc}
          onPageChange={(_, p) => setPaginaAcc(p)}
          rowsPerPage={filasPorPagina}
          rowsPerPageOptions={[filasPorPagina]}
        />
        <Box mb={3} textAlign="right">
          <Typography variant="subtitle1" fontWeight="bold">Total Ventas Accesorios: ${totalAccesorios.toFixed(2)}</Typography>
        </Box>

        <Typography variant="h6" gutterBottom fontWeight={700} sx={{ mt: 3 }}>Ventas Teléfonos</Typography>
        <Paper sx={{ overflowX: 'auto' }}>
          <Box p={2} component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Nombre', 'Telefono', 'Chip casado', 'Tipo', 'Precio', 'Fecha', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} style={{ padding: 8, borderBottom: '1px solid #e2e8f0', color: '#f97316', fontWeight: 700, background: '#f8fafc', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ventasTelefonos.slice(paginaTel * filasPorPagina, (paginaTel + 1) * filasPorPagina).map((v) => (
                <tr key={v.id}>
                  <td style={{ padding: 8 }}>{v.empleado?.username}</td>
                  <td style={{ padding: 8 }}>{v.producto}</td>
                  <td style={{ padding: 8 }}>{v.chip_casado}</td>
                  <td style={{ padding: 8 }}>{v.tipo_venta}</td>
                  <td style={{ padding: 8 }}>${typeof v.precio_unitario === 'number' ? v.precio_unitario.toFixed(2) : '0.00'}</td>
                  <td style={{ padding: 8 }}>{new Date(v.fecha).toLocaleDateString()}</td>
                  <td style={{ padding: 8 }}>
                    <span style={{ color: v.cancelada ? '#ef4444' : '#22c55e', fontWeight: 'bold' }}>
                      {v.cancelada ? 'Cancelada' : 'Activa'}
                    </span>
                  </td>
                  <td style={{ padding: 8 }}>
                    <Box display="flex" gap={1}>
                      <Button variant="outlined" size="small" color="error" disabled={v.cancelada} onClick={() => cancelarVenta(v.id)}>Cancelar</Button>
                      {(user?.rol === 'admin' || user?.rol === 'direccion') && (
                        <Button variant="outlined" size="small" disabled={v.cancelada} sx={{ borderColor: '#0d1e3a', color: '#0d1e3a' }} onClick={() => abrirEditarPrecio(v)}>Editar precio</Button>
                      )}
                    </Box>
                  </td>
                </tr>
              ))}
              {ventasTelefonos.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 8, textAlign: 'center' }}>No hay ventas de teléfonos</td></tr>
              )}
            </tbody>
          </Box>
        </Paper>
        <TablePagination
          component="div"
          count={ventasTelefonos.length}
          page={paginaTel}
          onPageChange={(_, p) => setPaginaTel(p)}
          rowsPerPage={filasPorPagina}
          rowsPerPageOptions={[filasPorPagina]}
        />
        <Box mb={3} textAlign="right">
          <Typography variant="subtitle1" fontWeight="bold">Total Ventas Teléfonos: ${totalTelefonos.toFixed(2)}</Typography>
        </Box>

        <Button variant="contained" onClick={() => navigate('/corte')}>Corte</Button>

        <Dialog open={editPrecioOpen} onClose={() => setEditPrecioOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Editar precio de venta</DialogTitle>
          <DialogContent>
            {editPrecioVenta && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 1 }}>
                {editPrecioVenta.producto} — Cant. {editPrecioVenta.cantidad}
              </Typography>
            )}
            <TextField
              label="Nuevo precio ($)"
              type="number"
              fullWidth
              value={editPrecioValor}
              onChange={(e) => { setEditPrecioValor(e.target.value); setEditPrecioError(''); }}
              inputProps={{ min: 0.01, step: 0.01 }}
              size="small"
            />
            {editPrecioError && (
              <Alert severity="error" sx={{ mt: 1 }}>{editPrecioError}</Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditPrecioOpen(false)}>Cancelar</Button>
            <Button variant="contained" onClick={guardarPrecio}
              sx={{ bgcolor: '#f97316', '&:hover': { bgcolor: '#ea6c0a' } }}>
              Guardar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // VISTA ASESOR
  // ════════════════════════════════════════════════════════════════════════════
  if (rol === 'asesor') {
    const usuarioActual = localStorage.getItem('usuario') || '';
    const misVentasAcc = misVentasData.filter((v) => v.tipo_producto === 'accesorios' && v.empleado?.username === usuarioActual);
    const misVentasTel = misVentasData.filter((v) => v.tipo_producto === 'telefono'   && v.empleado?.username === usuarioActual);
    const totalMisVentasPesos = [...misVentasAcc, ...misVentasTel]
      .filter((v) => !v.cancelada)
      .reduce((s, v) => s + v.precio_unitario * v.cantidad, 0);
    const totalMisVentasComision =
      [...misVentasAcc, ...misVentasTel].filter((v) => !v.cancelada).reduce((s, v) => s + calcComision(v, catalogoComisiones), 0);

    const tablaComisionesItems = [
      ...catalogoComisiones.map((c) => ({
        nombre: c.producto,
        comision: c.cantidad,
        esTelefono: c.producto.toUpperCase().startsWith('TELEFONO'),
      })),
      { nombre: 'Contado',  comision: 10,  esTelefono: true },
      { nombre: 'Paguitos', comision: 110, esTelefono: true },
      { nombre: 'Pajoy',    comision: 100, esTelefono: true },
    ].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

    return (
      <Box sx={{ mt: { xs: 1, sm: 2 }, px: { xs: 1, sm: 2 } }}>
        <Tabs
          value={tabAsesor}
          onChange={(_, v) => setTabAsesor(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2, borderBottom: '1px solid #e2e8f0', minHeight: 44 }}
          TabIndicatorProps={{ style: { backgroundColor: '#f97316' } }}
        >
          <Tab
            icon={<ConfirmationNumberIcon sx={{ fontSize: { xs: 14, sm: 18 } }} />}
            iconPosition="start"
            label="TICKET"
            sx={{ fontWeight: 700, minHeight: 44, fontSize: { xs: 11, sm: 13 }, px: { xs: 1, sm: 2 }, '&.Mui-selected': { color: '#f97316' } }}
          />
          <Tab
            label="RECIBOS"
            sx={{ fontWeight: 700, minHeight: 44, fontSize: { xs: 11, sm: 13 }, px: { xs: 1, sm: 2 }, '&.Mui-selected': { color: '#f97316' } }}
          />
          <Tab
            label={esCadenas ? 'MIS ACTIVACIONES' : 'MIS VENTAS'}
            sx={{ fontWeight: 700, minHeight: 44, fontSize: { xs: 11, sm: 13 }, px: { xs: 1, sm: 2 }, '&.Mui-selected': { color: '#f97316' } }}
          />
          <Tab
            icon={<MonetizationOnIcon sx={{ fontSize: { xs: 14, sm: 18 } }} />}
            iconPosition="start"
            label={esCadenas ? 'LISTA DE COMISIONES' : 'COMISIONES'}
            sx={{ fontWeight: 700, minHeight: 44, fontSize: { xs: 11, sm: 13 }, px: { xs: 1, sm: 2 }, '&.Mui-selected': { color: '#f97316' } }}
          />
          {esCadenas && (
            <Tab
              icon={<AccountBalanceWalletIcon sx={{ fontSize: { xs: 14, sm: 18 } }} />}
              iconPosition="start"
              label="MI SEMANA"
              sx={{ fontWeight: 700, minHeight: 44, fontSize: { xs: 11, sm: 13 }, px: { xs: 1, sm: 2 }, '&.Mui-selected': { color: '#f97316' } }}
            />
          )}
        </Tabs>

        {/* ── Tab TICKET ── */}
        {tabAsesor === 0 && (
          <Grid container spacing={2}>
            {/* Columna 1: formulario (oculto para admin) */}
            {(rol as string) !== 'admin' && (
              <Grid item xs={12} md={3}>
                {formulario}
              </Grid>
            )}

            {/* Columna 2: ranking accesorios */}
            {!esCadenas && (
              <Grid item xs={12} md={3}>
                <RankingModulos solo="accesorios" />
              </Grid>
            )}

            {/* Columna 3: ranking telefonos */}
            {!esCadenas && (
              <Grid item xs={12} md={3}>
                <RankingModulos solo="telefonos" />
              </Grid>
            )}

            {/* Columna 4: ranking planes */}
            {!esCadenas && (
              <Grid item xs={12} md={3}>
                <RankingModulos solo="planes" />
              </Grid>
            )}

            {/* Fila completa: tabla del día */}
            <Grid item xs={12}>

          {esCadenas ? (
            /* ── Activaciones del día (Cadenas C.) ── */
            <Paper sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Activaciones del día
              </Typography>
              {chipsHoy.length === 0 ? (
                <Typography variant="body2" sx={{ color: '#94a3b8', textAlign: 'center', py: 2 }}>
                  Sin activaciones registradas hoy
                </Typography>
              ) : isMobile ? (
                /* Cards on mobile */
                <Box>
                  {chipsHoy.map((c: any, i: number) => (
                    <Box key={i} sx={{ p: 1.5, mb: 1, border: '1px solid #e2e8f0', borderRadius: 1.5, bgcolor: '#f8fafc' }}>
                      <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5, color: '#1e293b', fontSize: 13 }}>
                        {c.tipo_chip}
                      </Typography>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                          {c.numero_telefono}
                        </Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ color: '#16a34a', fontSize: 13 }}>
                          ${(c.monto_recarga ?? 0).toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                /* Table on desktop */
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Tipo de Chip</th>
                        <th style={thStyle}>Número</th>
                        <th style={thStyle}>Recarga</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chipsHoy.map((c: any, i: number) => (
                        <tr key={i}>
                          <td style={tdStyle}>{c.tipo_chip}</td>
                          <td style={tdStyle}>{c.numero_telefono}</td>
                          <td style={tdStyle}>${(c.monto_recarga ?? 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              )}
              {chipsHoy.length > 0 && (
                <Box mt={1.5} pt={1} sx={{ borderTop: '1px solid #e2e8f0' }}>
                  <Typography variant="body2" color="text.secondary">
                    Total: <strong>{chipsHoy.length}</strong> activación{chipsHoy.length !== 1 ? 'es' : ''}
                  </Typography>
                </Box>
              )}
            </Paper>
          ) : (
          false && (
            <>
              {/* ── Ventas del día ── */}
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Ventas del día
                </Typography>
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Tipo</th>
                        <th style={thStyle}>Descripción</th>
                        <th style={thStyle}>Precio</th>
                        <th style={thStyle}>Cant.</th>
                        <th style={thStyle}>Comisión</th>
                        <th style={thStyle}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {ventasHoyAcc.map((v) => (
                        <tr key={`acc-${v.id}`}>
                          <td style={tdStyle}><Chip label="Acc" size="small" sx={{ bgcolor: '#fff7ed', color: '#f97316', fontWeight: 700, fontSize: 11 }} /></td>
                          <td style={tdStyle}>{v.producto}</td>
                          <td style={tdStyle}>${typeof v.precio_unitario === 'number' ? v.precio_unitario.toFixed(2) : '0.00'}</td>
                          <td style={tdStyle}>{v.cantidad ?? 1}</td>
                          <td style={tdStyle}>${fmt(calcComision(v, catalogoComisiones))}</td>
                          <td style={tdStyle}>
                            <IconButton size="small" color="error" disabled={v.cancelada} onClick={() => cancelarVenta(v.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </td>
                        </tr>
                      ))}
                      {ventasHoyTel.map((v) => (
                        <tr key={`tel-${v.id}`}>
                          <td style={tdStyle}><Chip label="Tel" size="small" sx={{ bgcolor: '#eff6ff', color: '#0d1e3a', fontWeight: 700, fontSize: 11 }} /></td>
                          <td style={tdStyle}>{v.producto}</td>
                          <td style={tdStyle}>${typeof v.precio_unitario === 'number' ? v.precio_unitario.toFixed(2) : '0.00'}</td>
                          <td style={tdStyle}>{v.cantidad ?? 1}</td>
                          <td style={tdStyle}>${fmt(calcComision(v, catalogoComisiones))}</td>
                          <td style={tdStyle}>
                            <IconButton size="small" color="error" disabled={v.cancelada} onClick={() => cancelarVenta(v.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </td>
                        </tr>
                      ))}
                      {ventasHoyAcc.length === 0 && ventasHoyTel.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', padding: 20 }}>
                            Sin ventas registradas hoy
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </Box>
                <Box display="flex" justifyContent="flex-start" gap={3} mt={1.5} pt={1} sx={{ borderTop: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                  <Typography variant="body2" color="text.secondary">
                    Accesorios: <strong>{ventasHoyAcc.length}</strong> | <strong>${fmt(totalPesosAcc)}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Teléfonos: <strong>{ventasHoyTel.length}</strong> | <strong>${fmt(totalPesosTel)}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Comisión total: <strong>${fmt(totalComisionHoy)}</strong>
                  </Typography>
                </Box>
              </Paper>

              {/* ── Comisiones del día ── */}
              <Paper sx={{ p: 2.5, bgcolor: '#f97316', color: 'white', border: 'none' }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
                  Comisiones del día
                </Typography>
                {sinCiclo && (
                  <Alert severity="warning" sx={{ mb: 1.5, fontSize: 12 }}>
                    Sin ciclo de comisiones activo para hoy. Contacta al administrador.
                  </Alert>
                )}
                <Box display="flex" flexDirection="column" gap={1}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" sx={{ opacity: 0.85 }}>Accesorios</Typography>
                    <Typography variant="body2" fontWeight={600}>${comisionAccHoy.toFixed(2)}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" sx={{ opacity: 0.85 }}>Teléfonos</Typography>
                    <Typography variant="body2" fontWeight={600}>${comisionTelHoy.toFixed(2)}</Typography>
                  </Box>
                </Box>
                <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.35)' }} />
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body1" fontWeight={700}>Total comisionado</Typography>
                  <Typography variant="h5" fontWeight={800}>${totalComisionHoy.toFixed(2)}</Typography>
                </Box>
              </Paper>
            </>
          )
          )}

          </Grid>
          </Grid>
        )}

        {/* ── Tab RECIBOS (asesor) ── */}
        {tabAsesor === 1 && (
          <Box sx={{ mt: 2 }}>
            <RecibosPanel />
          </Box>
        )}

        {/* ── Tab MIS VENTAS / MIS ACTIVACIONES ── */}
        {tabAsesor === 2 && (
          <Box>
            <Box sx={{ mb: 2 }}>
              <TextField
                type="date" size="small" label="Fecha"
                value={misVentasFecha}
                onChange={(e) => setMisVentasFecha(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            {esCadenas ? (
              /* ── Mis Activaciones (Cadenas C.) ── */
              <Paper sx={{ p: { xs: 1.5, sm: 2 } }}>
                {misActivacionesData.length === 0 ? (
                  <Typography variant="body2" sx={{ color: '#94a3b8', textAlign: 'center', py: 2 }}>
                    Sin activaciones para esta fecha
                  </Typography>
                ) : isMobile ? (
                  /* Cards on mobile */
                  <Box>
                    {misActivacionesData.map((c) => (
                      <Box key={c.id} sx={{ p: 1.5, mb: 1, border: '1px solid #e2e8f0', borderRadius: 1.5, bgcolor: '#f8fafc' }}>
                        <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5, color: '#1e293b', fontSize: 13 }}>
                          {c.tipo_chip}
                        </Typography>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                            {c.numero_telefono}
                          </Typography>
                          <Typography variant="body2" fontWeight={700} sx={{ color: '#16a34a', fontSize: 13 }}>
                            ${(c.monto_recarga ?? 0).toFixed(2)}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  /* Table on desktop */
                  <Box sx={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Tipo de Chip</th>
                          <th style={thStyle}>Número</th>
                          <th style={thStyle}>Recarga</th>
                        </tr>
                      </thead>
                      <tbody>
                        {misActivacionesData.map((c) => (
                          <tr key={c.id}>
                            <td style={tdStyle}>{c.tipo_chip}</td>
                            <td style={tdStyle}>{c.numero_telefono}</td>
                            <td style={tdStyle}>${(c.monto_recarga ?? 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>
                )}
                {misActivacionesData.length > 0 && (
                  <Box mt={1.5} pt={1} sx={{ borderTop: '1px solid #e2e8f0' }}>
                    <Typography variant="body2" color="text.secondary">
                      Total: <strong>{misActivacionesData.length}</strong> activación{misActivacionesData.length !== 1 ? 'es' : ''}
                    </Typography>
                  </Box>
                )}
              </Paper>
            ) : (
              /* ── Mis Ventas (otros asesores) ── */
              <Paper sx={{ p: 2 }}>
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Tipo</th>
                        <th style={thStyle}>Descripción</th>
                        <th style={thStyle}>Precio</th>
                        <th style={thStyle}>Cant.</th>
                        <th style={thStyle}>Comisión</th>
                        <th style={thStyle}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {misVentasAcc.map((v) => (
                        <tr key={`mv-acc-${v.id}`}>
                          <td style={tdStyle}><Chip label="Acc" size="small" sx={{ bgcolor: '#fff7ed', color: '#f97316', fontWeight: 700, fontSize: 11 }} /></td>
                          <td style={tdStyle}>{v.producto}</td>
                          <td style={tdStyle}>${typeof v.precio_unitario === 'number' ? v.precio_unitario.toFixed(2) : '0.00'}</td>
                          <td style={tdStyle}>{v.cantidad ?? 1}</td>
                          <td style={tdStyle}>${fmt(calcComision(v, catalogoComisiones))}</td>
                          <td style={tdStyle}>
                            <span style={{ color: v.cancelada ? '#ef4444' : '#22c55e', fontWeight: 600, fontSize: 12 }}>
                              {v.cancelada ? 'Cancelada' : 'Activa'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {misVentasTel.map((v) => (
                        <tr key={`mv-tel-${v.id}`}>
                          <td style={tdStyle}><Chip label="Tel" size="small" sx={{ bgcolor: '#eff6ff', color: '#0d1e3a', fontWeight: 700, fontSize: 11 }} /></td>
                          <td style={tdStyle}>{v.producto}</td>
                          <td style={tdStyle}>${typeof v.precio_unitario === 'number' ? v.precio_unitario.toFixed(2) : '0.00'}</td>
                          <td style={tdStyle}>{v.cantidad ?? 1}</td>
                          <td style={tdStyle}>${fmt(calcComision(v, catalogoComisiones))}</td>
                          <td style={tdStyle}>
                            <span style={{ color: v.cancelada ? '#ef4444' : '#22c55e', fontWeight: 600, fontSize: 12 }}>
                              {v.cancelada ? 'Cancelada' : 'Activa'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {misVentasAcc.length === 0 && misVentasTel.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', padding: 20 }}>
                            Sin ventas para esta fecha
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </Box>
                <Box display="flex" justifyContent="flex-start" gap={3} mt={1.5} pt={1} sx={{ borderTop: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                  <Typography variant="body2" color="text.secondary">
                    Accesorios: <strong>{misVentasAcc.filter((v) => !v.cancelada).length}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Teléfonos: <strong>{misVentasTel.filter((v) => !v.cancelada).length}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total vendido: <strong>${fmt(totalMisVentasPesos)}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Comisión: <strong>${fmt(totalMisVentasComision)}</strong>
                  </Typography>
                </Box>
              </Paper>
            )}
          </Box>
        )}

        {/* ── Tab COMISIONES ── */}
        {tabAsesor === 3 && (
          <Box sx={{ maxWidth: { xs: '100%', sm: 680 } }}>
            {esCadenas ? (() => {
              const cadenaActual = sessionStorage.getItem('cadena_seleccionada') || '';
              const items = COMISIONES_POR_CADENA[cadenaActual];
              return (
                <Paper sx={{ overflow: 'hidden' }}>
                  <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #e2e8f0' }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Comisiones — {cadenaActual}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Comisiones por tipo de activación registrada.
                    </Typography>
                  </Box>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, width: '70%' }}>Tipo de Chip</th>
                        <th style={{ ...thStyle, width: '30%' }}>Comisión</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!items ? (
                        <tr>
                          <td colSpan={2} style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', padding: 24 }}>
                            Sin comisiones configuradas para {cadenaActual}
                          </td>
                        </tr>
                      ) : items.map((item) => (
                        <tr key={item.tipo}>
                          <td style={tdStyle}>{item.tipo}</td>
                          <td style={{ ...tdStyle, fontWeight: 700, color: '#16a34a' }}>
                            {item.comision}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Box sx={{ px: 2.5, py: 1.5, borderTop: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                    <Typography variant="body2" color="text.secondary">
                      {items?.length ?? 0} tipos de activación
                    </Typography>
                  </Box>
                </Paper>
              );
            })() : (
              <Paper sx={{ overflow: 'hidden' }}>
                <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #e2e8f0' }}>
                  <Typography variant="subtitle1" fontWeight={700}>Tasas de comisión configuradas</Typography>
                  <Typography variant="body2" color="text.secondary">Estas son las comisiones que se aplican a cada venta registrada.</Typography>
                </Box>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: '50%' }}>Producto / Tipo de venta</th>
                      <th style={{ ...thStyle, width: '25%' }}>Comisión</th>
                      <th style={{ ...thStyle, width: '25%' }}>Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tablaComisionesItems.map((item) => (
                      <tr key={item.nombre}>
                        <td style={tdStyle}>{item.nombre}</td>
                        <td style={{ ...tdStyle, fontWeight: 600, color: '#16a34a' }}>${fmt(item.comision)}</td>
                        <td style={tdStyle}>
                          {item.esTelefono
                            ? <Chip label="Teléfono" size="small" sx={{ bgcolor: '#eff6ff', color: '#0d1e3a', fontWeight: 700, fontSize: 11 }} />
                            : <Chip label="Accesorio" size="small" sx={{ bgcolor: '#fff7ed', color: '#f97316', fontWeight: 700, fontSize: 11 }} />
                          }
                        </td>
                      </tr>
                    ))}
                    {tablaComisionesItems.length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', padding: 24 }}>
                          Sin comisiones configuradas
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <Box sx={{ px: 2.5, py: 1.5, borderTop: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                  <Typography variant="body2" color="text.secondary">
                    {tablaComisionesItems.filter((i) => !i.esTelefono).length} accesorios · {tablaComisionesItems.filter((i) => i.esTelefono).length} teléfonos
                  </Typography>
                </Box>
              </Paper>
            )}
          </Box>
        )}

        {/* ── Tab NÓMINA (solo Cadenas C.) ── */}
        {tabAsesor === 4 && esCadenas && (() => {
          const ciclos = getCiclos();
          const cicloActual = ciclos[nominaCicloIdx] ?? ciclos[0];
          const activaciones = nominaChips.filter((c) => !c.es_incubadora);
          const incubadora = nominaChips.filter((c) => c.es_incubadora);
          const totalCobrar = nominaChips
            .filter((c) => c.validado && !c.es_incubadora)
            .reduce((s, c) => s + (c.comision ?? 0), 0);

          return (
            <Box>
              {/* Selector de ciclo */}
              <TextField
                select
                size="small"
                label="Ciclo"
                value={nominaCicloIdx}
                onChange={(e) => setNominaCicloIdx(Number(e.target.value))}
                sx={{ mb: 3, minWidth: { xs: '100%', sm: 360 } }}
              >
                {ciclos.map((c, i) => (
                  <MenuItem key={i} value={i}>{labelCiclo(c)}</MenuItem>
                ))}
              </TextField>

              {/* Cuadro 1: Activaciones del ciclo */}
              <Paper sx={{ mb: 3, overflow: 'hidden' }}>
                <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #e2e8f0' }}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Activaciones del ciclo {fmtDiaMes(cicloActual.inicio)} al {fmtDiaMes(cicloActual.fin)} {cicloActual.fin.getFullYear()}
                  </Typography>
                </Box>

                {activaciones.length === 0 ? (
                  <Box sx={{ px: 2.5, py: 2.5 }}>
                    <Typography color="text.secondary" variant="body2">Sin activaciones en este ciclo.</Typography>
                  </Box>
                ) : isMobile ? (
                  <Box sx={{ p: 1.5 }}>
                    {activaciones.map((c) => {
                      const est = getEstadoChip(c);
                      return (
                        <Box key={c.id} sx={{ p: 1.5, mb: 1, border: '1px solid #e2e8f0', borderRadius: 1.5, bgcolor: '#f8fafc' }}>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                            <Typography variant="body2" fontWeight={700} sx={{ fontSize: 13, color: '#1e293b' }}>
                              {c.tipo_chip}
                            </Typography>
                            <Typography variant="caption" sx={{ color: est.color, fontWeight: 700, fontSize: 11 }}>
                              {est.label}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mb: 0.5 }}>
                            {c.numero_telefono}
                          </Typography>
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="body2" sx={{ fontSize: 12, color: '#475569' }}>
                              Recarga: ${(c.monto_recarga ?? 0).toFixed(2)}
                            </Typography>
                            <Typography variant="body2" fontWeight={700} sx={{ fontSize: 12, color: '#16a34a' }}>
                              Comisión: ${(c.comision ?? 0).toFixed(2)}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                ) : (
                  <Box sx={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Tipo de Chip</th>
                          <th style={thStyle}>Número</th>
                          <th style={thStyle}>Recarga</th>
                          <th style={thStyle}>Comisión</th>
                          <th style={thStyle}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activaciones.map((c) => {
                          const est = getEstadoChip(c);
                          return (
                            <tr key={c.id}>
                              <td style={tdStyle}>{c.tipo_chip}</td>
                              <td style={tdStyle}>{c.numero_telefono}</td>
                              <td style={tdStyle}>${(c.monto_recarga ?? 0).toFixed(2)}</td>
                              <td style={{ ...tdStyle, fontWeight: 700, color: '#16a34a' }}>${(c.comision ?? 0).toFixed(2)}</td>
                              <td style={{ ...tdStyle, color: est.color, fontWeight: 600 }}>{est.label}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </Box>
                )}

                <Box sx={{ px: 2.5, py: 1.5, borderTop: '1px solid #e2e8f0', bgcolor: '#f0fdf4' }}>
                  <Typography variant="body2" fontWeight={700} sx={{ color: '#16a34a' }}>
                    Total a cobrar el {fmtDiaMes(cicloActual.pago)}: ${totalCobrar.toFixed(2)}
                  </Typography>
                </Box>
              </Paper>

              {/* Cuadro 2: Líneas en incubadora */}
              <Paper sx={{ overflow: 'hidden', mb: 2 }}>
                <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #e2e8f0' }}>
                  <Typography variant="subtitle1" fontWeight={700}>Líneas en incubadora</Typography>
                </Box>

                {incubadora.length === 0 ? (
                  <Box sx={{ px: 2.5, py: 2.5 }}>
                    <Typography color="text.secondary" variant="body2">Sin líneas en incubadora este ciclo.</Typography>
                  </Box>
                ) : isMobile ? (
                  <Box sx={{ p: 1.5 }}>
                    {incubadora.map((c) => (
                      <Box key={c.id} sx={{ p: 1.5, mb: 1, border: '1px solid #fed7aa', borderRadius: 1.5, bgcolor: '#fff7ed' }}>
                        <Typography variant="body2" fontWeight={700} sx={{ fontSize: 13, color: '#1e293b', mb: 0.5 }}>
                          {c.tipo_chip}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mb: 0.5 }}>
                          {c.numero_telefono}
                        </Typography>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2" sx={{ fontSize: 12, color: '#475569' }}>
                            Recarga: ${(c.monto_recarga ?? 0).toFixed(2)}
                          </Typography>
                          <Typography variant="body2" fontWeight={700} sx={{ fontSize: 12, color: '#f97316' }}>
                            Comisión: ${(c.comision ?? 0).toFixed(2)}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Box sx={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Tipo de Chip</th>
                          <th style={thStyle}>Número</th>
                          <th style={thStyle}>Recarga</th>
                          <th style={thStyle}>Comisión</th>
                          <th style={thStyle}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {incubadora.map((c) => (
                          <tr key={c.id}>
                            <td style={tdStyle}>{c.tipo_chip}</td>
                            <td style={tdStyle}>{c.numero_telefono}</td>
                            <td style={tdStyle}>${(c.monto_recarga ?? 0).toFixed(2)}</td>
                            <td style={{ ...tdStyle, fontWeight: 700, color: '#f97316' }}>${(c.comision ?? 0).toFixed(2)}</td>
                            <td style={{ ...tdStyle, color: '#f97316', fontWeight: 600 }}>
                              {c.descripcion_rechazo ? `Incubadora (${c.descripcion_rechazo})` : 'Incubadora'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>
                )}
              </Paper>
            </Box>
          );
        })()}
      </Box>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // VISTA ADMIN / ENCARGADO
  // ════════════════════════════════════════════════════════════════════════════

  // ── Agrupación para Resumen del Día ─────────────────────────────────────────
  type GrupoVenta = { producto: string; precio: number; cantidad: number; total: number; tipo_venta?: string };

  const agrupar = (lista: Venta[]): GrupoVenta[] => {
    const map = new Map<string, GrupoVenta>();
    lista.filter((v) => !v.cancelada).forEach((v) => {
      const key = `${v.producto}||${v.precio_unitario}||${v.tipo_venta || ''}`;
      const prev = map.get(key);
      if (prev) {
        prev.cantidad += v.cantidad;
        prev.total    += v.total;
      } else {
        map.set(key, { producto: v.producto, precio: v.precio_unitario, cantidad: v.cantidad, total: v.total, tipo_venta: v.tipo_venta });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.producto.localeCompare(b.producto));
  };

  const gruposAcc = agrupar(ventas.filter((v) => v.tipo_producto === 'accesorios'));
  const gruposTel = agrupar(ventasTelefonos);
  const subtotalAcc = gruposAcc.reduce((s, g) => s + g.total, 0);
  const subtotalTel = gruposTel.reduce((s, g) => s + g.total, 0);
  const totalGeneral = subtotalAcc + subtotalTel;

  const PanelDerechoResumen = () => (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={1}>Ventas del día de hoy</Typography>
      {/* Filtro de fecha */}
      <Box display="flex" gap={1} alignItems="center" mb={2} flexWrap="wrap">
        {user?.is_admin && modulos.length > 0 && (
          <select
            value={moduloId ?? ''}
            onChange={(e) => setModuloId(e.target.value ? Number(e.target.value) : null)}
            style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13 }}
          >
            <option value="">-- Módulo --</option>
            {modulos.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        )}
        <TextField type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} size="small" />
        <Button variant="contained" size="small" onClick={fetchVentas}
          sx={{ bgcolor: '#f97316', '&:hover': { bgcolor: '#ea6c0a' } }}>
          Buscar
        </Button>
      </Box>

      {/* Sección Accesorios */}
      <Paper sx={{ borderRadius: 2, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', mb: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.5, bgcolor: '#fff7ed', borderBottom: '1px solid #fed7aa' }}>
          <Typography fontWeight={700} fontSize={14} color="#c2410c">Accesorios</Typography>
        </Box>
        {gruposAcc.length === 0 ? (
          <Box px={2} py={2}>
            <Typography variant="body2" color="text.secondary">Sin ventas de accesorios</Typography>
          </Box>
        ) : (
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {gruposAcc.map((g, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>
                    {g.cantidad}× {g.producto}
                  </td>
                  <td style={{ ...tdStyle, color: '#64748b' }}>${g.precio.toFixed(2)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                    ${g.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </Box>
        )}
        <Box sx={{ px: 2, py: 1, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
          <Typography fontSize={13} fontWeight={700}>Subtotal: ${subtotalAcc.toFixed(2)}</Typography>
        </Box>
      </Paper>

      {/* Sección Teléfonos */}
      <Paper sx={{ borderRadius: 2, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', mb: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.5, bgcolor: '#fff7ed', borderBottom: '1px solid #fed7aa' }}>
          <Typography fontWeight={700} fontSize={14} color="#c2410c">Teléfonos</Typography>
        </Box>
        {gruposTel.length === 0 ? (
          <Box px={2} py={2}>
            <Typography variant="body2" color="text.secondary">Sin ventas de teléfonos</Typography>
          </Box>
        ) : (
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {gruposTel.map((g, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>
                    {g.cantidad}× {g.producto}
                    {g.tipo_venta && <span style={{ fontWeight: 400, color: '#64748b' }}> — {g.tipo_venta}</span>}
                  </td>
                  <td style={{ ...tdStyle, color: '#64748b' }}>${g.precio.toFixed(2)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                    ${g.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </Box>
        )}
        <Box sx={{ px: 2, py: 1, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
          <Typography fontSize={13} fontWeight={700}>Subtotal: ${subtotalTel.toFixed(2)}</Typography>
        </Box>
      </Paper>

      {/* Total General */}
      <Paper sx={{ borderRadius: 2, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#f97316', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography fontWeight={700} fontSize={15} color="#fff">Total General del Día</Typography>
          <Typography fontWeight={800} fontSize={18} color="#fff">${totalGeneral.toFixed(2)}</Typography>
        </Box>
      </Paper>
    </Box>
  );

  const PanelDerechoHistorial = () => (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={1}>Ventas del día de hoy</Typography>
      {/* Filtro de fecha */}
      <Box display="flex" gap={1} alignItems="center" mb={2} flexWrap="wrap">
        {user?.is_admin && modulos.length > 0 && (
          <select
            value={moduloId ?? ''}
            onChange={(e) => setModuloId(e.target.value ? Number(e.target.value) : null)}
            style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13 }}
          >
            <option value="">-- Módulo --</option>
            {modulos.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        )}
        <TextField type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} size="small" />
        <Button variant="contained" size="small" onClick={fetchVentas}
          sx={{ bgcolor: '#f97316', '&:hover': { bgcolor: '#ea6c0a' } }}>
          Buscar
        </Button>
      </Box>

      {/* Tabla Accesorios */}
      <Paper sx={{ borderRadius: 2, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', mb: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.5, bgcolor: '#fff7ed', borderBottom: '1px solid #fed7aa' }}>
          <Typography fontWeight={700} fontSize={14} color="#c2410c">Accesorios</Typography>
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Nombre', 'Producto', 'Cant.', 'Precio', 'Total', 'Método', 'Fecha', 'Estado', ''].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ventas.filter((v) => v.tipo_producto === 'accesorios')
                .slice(paginaAcc * filasPorPagina, (paginaAcc + 1) * filasPorPagina)
                .map((v) => (
                  <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={tdStyle}>{v.empleado?.username}</td>
                    <td style={tdStyle}>{v.producto}</td>
                    <td style={tdStyle}>{v.cantidad}</td>
                    <td style={tdStyle}>${typeof v.precio_unitario === 'number' ? v.precio_unitario.toFixed(2) : '0.00'}</td>
                    <td style={tdStyle}>${typeof v.total === 'number' ? v.total.toFixed(2) : '0.00'}</td>
                    <td style={{ ...tdStyle, color: v.metodo_pago?.toLowerCase() === 'efectivo' ? '#2e7d32' : v.metodo_pago?.toLowerCase() === 'tarjeta' ? '#1565c0' : '#64748b', fontWeight: 600 }}>
                      {v.metodo_pago ? v.metodo_pago.charAt(0).toUpperCase() + v.metodo_pago.slice(1).toLowerCase() : '—'}
                    </td>
                    <td style={tdStyle}>{`${fmtFecha(v.fecha)} ${fmtHora(v.hora)}`}</td>
                    <td style={{ ...tdStyle, color: v.cancelada ? '#ef4444' : '#22c55e', fontWeight: 600 }}>
                      {v.cancelada ? 'Cancelada' : 'Activa'}
                    </td>
                    <td style={tdStyle}>
                      <Box display="flex" gap={1}>
                        <Button variant="outlined" size="small" color="error" disabled={v.cancelada}
                          onClick={() => cancelarVenta(v.id)}>Cancelar</Button>
                        {(user?.rol === 'admin' || user?.rol === 'direccion') && (
                          <Button variant="outlined" size="small" disabled={v.cancelada}
                            sx={{ borderColor: '#0d1e3a', color: '#0d1e3a' }}
                            onClick={() => abrirEditarPrecio(v)}>Editar precio</Button>
                        )}
                      </Box>
                    </td>
                  </tr>
                ))}
              {ventas.filter((v) => v.tipo_producto === 'accesorios').length === 0 && (
                <tr><td colSpan={9} style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8' }}>Sin ventas</td></tr>
              )}
            </tbody>
          </Box>
        </Box>
        <TablePagination
          component="div"
          count={ventas.filter((v) => v.tipo_producto === 'accesorios').length}
          page={paginaAcc}
          onPageChange={(_, p) => setPaginaAcc(p)}
          rowsPerPage={filasPorPagina}
          rowsPerPageOptions={[filasPorPagina]}
        />
        <Box sx={{ px: 2, py: 1, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
          <Typography fontSize={13} fontWeight={700}>Total: ${totalAccesorios.toFixed(2)}</Typography>
        </Box>
      </Paper>

      {/* Tabla Teléfonos */}
      <Paper sx={{ borderRadius: 2, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.5, bgcolor: '#fff7ed', borderBottom: '1px solid #fed7aa' }}>
          <Typography fontWeight={700} fontSize={14} color="#c2410c">Teléfonos</Typography>
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Nombre', 'Teléfono', 'Chip casado', 'Tipo', 'Precio', 'Método', 'Fecha', 'Estado', ''].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ventasTelefonos
                .slice(paginaTel * filasPorPagina, (paginaTel + 1) * filasPorPagina)
                .map((v) => (
                  <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={tdStyle}>{v.empleado?.username}</td>
                    <td style={tdStyle}>{v.producto}</td>
                    <td style={tdStyle}>{v.chip_casado}</td>
                    <td style={tdStyle}>{v.tipo_venta}</td>
                    <td style={tdStyle}>${typeof v.precio_unitario === 'number' ? v.precio_unitario.toFixed(2) : '0.00'}</td>
                    <td style={{ ...tdStyle, color: v.metodo_pago?.toLowerCase() === 'efectivo' ? '#2e7d32' : v.metodo_pago?.toLowerCase() === 'tarjeta' ? '#1565c0' : '#64748b', fontWeight: 600 }}>
                      {v.metodo_pago ? v.metodo_pago.charAt(0).toUpperCase() + v.metodo_pago.slice(1).toLowerCase() : '—'}
                    </td>
                    <td style={tdStyle}>{`${fmtFecha(v.fecha)} ${fmtHora(v.hora)}`}</td>
                    <td style={{ ...tdStyle, color: v.cancelada ? '#ef4444' : '#22c55e', fontWeight: 600 }}>
                      {v.cancelada ? 'Cancelada' : 'Activa'}
                    </td>
                    <td style={tdStyle}>
                      <Box display="flex" gap={1}>
                        <Button variant="outlined" size="small" color="error" disabled={v.cancelada}
                          onClick={() => cancelarVenta(v.id)}>Cancelar</Button>
                        {(user?.rol === 'admin' || user?.rol === 'direccion') && (
                          <Button variant="outlined" size="small" disabled={v.cancelada}
                            sx={{ borderColor: '#0d1e3a', color: '#0d1e3a' }}
                            onClick={() => abrirEditarPrecio(v)}>Editar precio</Button>
                        )}
                      </Box>
                    </td>
                  </tr>
                ))}
              {ventasTelefonos.length === 0 && (
                <tr><td colSpan={9} style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8' }}>Sin ventas</td></tr>
              )}
            </tbody>
          </Box>
        </Box>
        <TablePagination
          component="div"
          count={ventasTelefonos.length}
          page={paginaTel}
          onPageChange={(_, p) => setPaginaTel(p)}
          rowsPerPage={filasPorPagina}
          rowsPerPageOptions={[filasPorPagina]}
        />
        <Box sx={{ px: 2, py: 1, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
          <Typography fontSize={13} fontWeight={700}>Total: ${totalTelefonos.toFixed(2)}</Typography>
        </Box>
      </Paper>

    </Box>
  );

  // ── Variables para pestañas MIS VENTAS / COMISIONES del encargado ─────────
  const usuarioActualEnc = localStorage.getItem('usuario') || '';
  const misVentasAccEnc  = misVentasData.filter((v) => v.tipo_producto === 'accesorios' && v.empleado?.username === usuarioActualEnc);
  const misVentasTelEnc  = misVentasData.filter((v) => v.tipo_producto === 'telefono'   && v.empleado?.username === usuarioActualEnc);
  const totalMisVentasPesosEnc     = [...misVentasAccEnc, ...misVentasTelEnc].filter((v) => !v.cancelada).reduce((s, v) => s + v.precio_unitario * v.cantidad, 0);
  const totalMisVentasComisionEnc  = [...misVentasAccEnc, ...misVentasTelEnc].filter((v) => !v.cancelada).reduce((s, v) => s + calcComision(v, catalogoComisiones), 0);
  const tablaComisionesItemsEnc = [
    ...catalogoComisiones.map((c) => ({ nombre: c.producto, comision: c.cantidad, esTelefono: c.producto.toUpperCase().startsWith('TELEFONO') })),
    { nombre: 'Contado',  comision: 10,  esTelefono: true },
    { nombre: 'Paguitos', comision: 110, esTelefono: true },
    { nombre: 'Pajoy',    comision: 100, esTelefono: true },
  ].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  return (
    <Box sx={{ mt: { xs: 1, sm: 2 }, px: { xs: 1, sm: 2 } }}>
      {/* ── Pestañas superiores (encargado) ── */}
      <Tabs
        value={tabAsesor}
        onChange={(_, v) => { if (v === 3) { navigate('/corte'); return; } setTabAsesor(v); }}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2, borderBottom: '1px solid #e2e8f0', minHeight: 44 }}
        TabIndicatorProps={{ style: { backgroundColor: '#f97316' } }}
      >
        <Tab
          icon={<ConfirmationNumberIcon sx={{ fontSize: { xs: 14, sm: 18 } }} />}
          iconPosition="start"
          label="TICKET"
          sx={{ fontWeight: 700, minHeight: 44, fontSize: { xs: 11, sm: 13 }, px: { xs: 1, sm: 2 }, '&.Mui-selected': { color: '#f97316' } }}
        />
        <Tab
          label="RECIBOS"
          sx={{ fontWeight: 700, minHeight: 44, fontSize: { xs: 11, sm: 13 }, px: { xs: 1, sm: 2 }, '&.Mui-selected': { color: '#f97316' } }}
        />
        <Tab
          label="MIS VENTAS"
          sx={{ fontWeight: 700, minHeight: 44, fontSize: { xs: 11, sm: 13 }, px: { xs: 1, sm: 2 }, '&.Mui-selected': { color: '#f97316' } }}
        />
        <Tab
          icon={<AssessmentIcon sx={{ fontSize: { xs: 14, sm: 18 } }} />}
          iconPosition="start"
          label="CORTE"
          sx={{ fontWeight: 700, minHeight: 44, fontSize: { xs: 11, sm: 13 }, px: { xs: 1, sm: 2 }, '&.Mui-selected': { color: '#f97316' }, color: '#f97316' }}
        />
        <Tab
          icon={<MonetizationOnIcon sx={{ fontSize: { xs: 14, sm: 18 } }} />}
          iconPosition="start"
          label="COMISIONES"
          sx={{ fontWeight: 700, minHeight: 44, fontSize: { xs: 11, sm: 13 }, px: { xs: 1, sm: 2 }, '&.Mui-selected': { color: '#f97316' } }}
        />
        <Tab
          label="RESUMEN DEL DÍA"
          sx={{ fontWeight: 700, minHeight: 44, fontSize: { xs: 11, sm: 13 }, px: { xs: 1, sm: 2 }, '&.Mui-selected': { color: '#f97316' } }}
        />
        <Tab
          label="HISTORIAL"
          sx={{ fontWeight: 700, minHeight: 44, fontSize: { xs: 11, sm: 13 }, px: { xs: 1, sm: 2 }, '&.Mui-selected': { color: '#f97316' } }}
        />
      </Tabs>

    {/* ── Tab TICKET ── */}
    {tabAsesor === 0 && (
    <Grid container spacing={2} sx={{ mt: 0 }}>
      {/* Columna 1: formulario */}
      {(rol as string) !== 'admin' && (
        <Grid item xs={12} md={3}>
          {formulario}
        </Grid>
      )}

      {/* Columna 2: ranking accesorios */}
      {!esCadenas && (
        <Grid item xs={12} md={3}>
          <RankingModulos solo="accesorios" />
        </Grid>
      )}

      {/* Columna 3: ranking telefonos */}
      {!esCadenas && (
        <Grid item xs={12} md={3}>
          <RankingModulos solo="telefonos" />
        </Grid>
      )}

      {/* Columna 4: ranking planes */}
      {!esCadenas && (
        <Grid item xs={12} md={3}>
          <RankingModulos solo="planes" />
        </Grid>
      )}

      {/* Fila completa: ventas del día + comisiones (encargado) */}
      {(rol as string) === 'encargado' && (
        <Grid item xs={12}>
              <Paper sx={{ p: 2, mb: 2, mt: 2 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>Ventas del día</Typography>
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Tipo</th>
                        <th style={thStyle}>Descripción</th>
                        <th style={thStyle}>Precio</th>
                        <th style={thStyle}>Cant.</th>
                        <th style={thStyle}>Comisión</th>
                        <th style={thStyle}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {ventasHoyAcc.map((v) => (
                        <tr key={`enc-acc-${v.id}`}>
                          <td style={tdStyle}><Chip label="Acc" size="small" sx={{ bgcolor: '#fff7ed', color: '#f97316', fontWeight: 700, fontSize: 11 }} /></td>
                          <td style={tdStyle}>{v.producto}</td>
                          <td style={tdStyle}>${typeof v.precio_unitario === 'number' ? v.precio_unitario.toFixed(2) : '0.00'}</td>
                          <td style={tdStyle}>{v.cantidad ?? 1}</td>
                          <td style={tdStyle}>${fmt(calcComision(v, catalogoComisiones))}</td>
                          <td style={tdStyle}>
                            <IconButton size="small" color="error" disabled={v.cancelada} onClick={() => cancelarVenta(v.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </td>
                        </tr>
                      ))}
                      {ventasHoyTel.map((v) => (
                        <tr key={`enc-tel-${v.id}`}>
                          <td style={tdStyle}><Chip label="Tel" size="small" sx={{ bgcolor: '#eff6ff', color: '#0d1e3a', fontWeight: 700, fontSize: 11 }} /></td>
                          <td style={tdStyle}>{v.producto}</td>
                          <td style={tdStyle}>${typeof v.precio_unitario === 'number' ? v.precio_unitario.toFixed(2) : '0.00'}</td>
                          <td style={tdStyle}>{v.cantidad ?? 1}</td>
                          <td style={tdStyle}>${fmt(calcComision(v, catalogoComisiones))}</td>
                          <td style={tdStyle}>
                            <IconButton size="small" color="error" disabled={v.cancelada} onClick={() => cancelarVenta(v.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </td>
                        </tr>
                      ))}
                      {ventasHoyAcc.length === 0 && ventasHoyTel.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', padding: 20 }}>
                            Sin ventas registradas hoy
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </Box>
                <Box display="flex" justifyContent="flex-start" gap={3} mt={1.5} pt={1} sx={{ borderTop: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                  <Typography variant="body2" color="text.secondary">
                    Accesorios: <strong>{ventasHoyAcc.length}</strong> | <strong>${fmt(totalPesosAcc)}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Teléfonos: <strong>{ventasHoyTel.length}</strong> | <strong>${fmt(totalPesosTel)}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Comisión total: <strong>${fmt(totalComisionHoy)}</strong>
                  </Typography>
                </Box>
              </Paper>

              <Paper sx={{ p: 2.5, bgcolor: '#f97316', color: 'white', border: 'none' }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>Comisiones del día</Typography>
                <Box display="flex" flexDirection="column" gap={1}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" sx={{ opacity: 0.85 }}>Accesorios</Typography>
                    <Typography variant="body2" fontWeight={600}>${comisionAccHoy.toFixed(2)}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" sx={{ opacity: 0.85 }}>Teléfonos</Typography>
                    <Typography variant="body2" fontWeight={600}>${comisionTelHoy.toFixed(2)}</Typography>
                  </Box>
                </Box>
                <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.35)' }} />
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body1" fontWeight={700}>Total comisionado</Typography>
                  <Typography variant="h5" fontWeight={800}>${totalComisionHoy.toFixed(2)}</Typography>
                </Box>
              </Paper>
        </Grid>
      )}

    </Grid>
    )} {/* fin Tab TICKET */}

    {/* ── Tab RECIBOS (encargado) ── */}
    {tabAsesor === 1 && (
      <Box sx={{ mt: 2 }}>
        <RecibosPanel />
      </Box>
    )}

    {/* ── Tab RESUMEN DEL DÍA (encargado) ── */}
    {tabAsesor === 5 && (
      <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
        <PanelDerechoResumen />
      </Box>
    )}

    {/* ── Tab HISTORIAL (encargado) ── */}
    {tabAsesor === 6 && (
      <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
        <PanelDerechoHistorial />
      </Box>
    )}

    {/* ── Tab MIS VENTAS (encargado) ── */}
    {tabAsesor === 2 && (
      <Box>
        <Box sx={{ mb: 2 }}>
          <TextField
            type="date" size="small" label="Fecha"
            value={misVentasFecha}
            onChange={(e) => setMisVentasFecha(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Box>
        <Paper sx={{ p: 2 }}>
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Tipo</th>
                  <th style={thStyle}>Descripción</th>
                  <th style={thStyle}>Precio</th>
                  <th style={thStyle}>Cant.</th>
                  <th style={thStyle}>Comisión</th>
                  <th style={thStyle}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {misVentasAccEnc.map((v) => (
                  <tr key={`enc-mv-acc-${v.id}`}>
                    <td style={tdStyle}><Chip label="Acc" size="small" sx={{ bgcolor: '#fff7ed', color: '#f97316', fontWeight: 700, fontSize: 11 }} /></td>
                    <td style={tdStyle}>{v.producto}</td>
                    <td style={tdStyle}>${typeof v.precio_unitario === 'number' ? v.precio_unitario.toFixed(2) : '0.00'}</td>
                    <td style={tdStyle}>{v.cantidad ?? 1}</td>
                    <td style={tdStyle}>${fmt(calcComision(v, catalogoComisiones))}</td>
                    <td style={tdStyle}>
                      <span style={{ color: v.cancelada ? '#ef4444' : '#22c55e', fontWeight: 600, fontSize: 12 }}>
                        {v.cancelada ? 'Cancelada' : 'Activa'}
                      </span>
                    </td>
                  </tr>
                ))}
                {misVentasTelEnc.map((v) => (
                  <tr key={`enc-mv-tel-${v.id}`}>
                    <td style={tdStyle}><Chip label="Tel" size="small" sx={{ bgcolor: '#eff6ff', color: '#0d1e3a', fontWeight: 700, fontSize: 11 }} /></td>
                    <td style={tdStyle}>{v.producto}</td>
                    <td style={tdStyle}>${typeof v.precio_unitario === 'number' ? v.precio_unitario.toFixed(2) : '0.00'}</td>
                    <td style={tdStyle}>{v.cantidad ?? 1}</td>
                    <td style={tdStyle}>${fmt(calcComision(v, catalogoComisiones))}</td>
                    <td style={tdStyle}>
                      <span style={{ color: v.cancelada ? '#ef4444' : '#22c55e', fontWeight: 600, fontSize: 12 }}>
                        {v.cancelada ? 'Cancelada' : 'Activa'}
                      </span>
                    </td>
                  </tr>
                ))}
                {misVentasAccEnc.length === 0 && misVentasTelEnc.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', padding: 20 }}>
                      Sin ventas para esta fecha
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Box>
          <Box display="flex" justifyContent="flex-start" gap={3} mt={1.5} pt={1} sx={{ borderTop: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              Accesorios: <strong>{misVentasAccEnc.filter((v) => !v.cancelada).length}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Teléfonos: <strong>{misVentasTelEnc.filter((v) => !v.cancelada).length}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total vendido: <strong>${fmt(totalMisVentasPesosEnc)}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Comisión: <strong>${fmt(totalMisVentasComisionEnc)}</strong>
            </Typography>
          </Box>
        </Paper>
      </Box>
    )}

    {/* ── Tab COMISIONES (encargado) ── */}
    {tabAsesor === 4 && (
      <Box sx={{ maxWidth: { xs: '100%', sm: 680 } }}>
        <Paper sx={{ overflow: 'hidden' }}>
          <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #e2e8f0' }}>
            <Typography variant="subtitle1" fontWeight={700}>Tasas de comisión configuradas</Typography>
            <Typography variant="body2" color="text.secondary">Estas son las comisiones que se aplican a cada venta registrada.</Typography>
          </Box>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '50%' }}>Producto / Tipo de venta</th>
                <th style={{ ...thStyle, width: '25%' }}>Comisión</th>
                <th style={{ ...thStyle, width: '25%' }}>Tipo</th>
              </tr>
            </thead>
            <tbody>
              {tablaComisionesItemsEnc.map((item) => (
                <tr key={item.nombre}>
                  <td style={tdStyle}>{item.nombre}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: '#16a34a' }}>${fmt(item.comision)}</td>
                  <td style={tdStyle}>
                    {item.esTelefono
                      ? <Chip label="Teléfono"  size="small" sx={{ bgcolor: '#eff6ff', color: '#0d1e3a', fontWeight: 700, fontSize: 11 }} />
                      : <Chip label="Accesorio" size="small" sx={{ bgcolor: '#fff7ed', color: '#f97316', fontWeight: 700, fontSize: 11 }} />
                    }
                  </td>
                </tr>
              ))}
              {tablaComisionesItemsEnc.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', padding: 24 }}>
                    Sin comisiones configuradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Box sx={{ px: 2.5, py: 1.5, borderTop: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
            <Typography variant="body2" color="text.secondary">
              {tablaComisionesItemsEnc.filter((i) => !i.esTelefono).length} accesorios · {tablaComisionesItemsEnc.filter((i) => i.esTelefono).length} teléfonos
            </Typography>
          </Box>
        </Paper>
      </Box>
    )}

      <Dialog open={editPrecioOpen} onClose={() => setEditPrecioOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Editar precio de venta</DialogTitle>
        <DialogContent>
          {editPrecioVenta && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 1 }}>
              {editPrecioVenta.producto} — Cant. {editPrecioVenta.cantidad}
            </Typography>
          )}
          <TextField
            label="Nuevo precio ($)"
            type="number"
            fullWidth
            value={editPrecioValor}
            onChange={(e) => { setEditPrecioValor(e.target.value); setEditPrecioError(''); }}
            inputProps={{ min: 0.01, step: 0.01 }}
            size="small"
          />
          {editPrecioError && (
            <Alert severity="error" sx={{ mt: 1 }}>{editPrecioError}</Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditPrecioOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={guardarPrecio}
            sx={{ bgcolor: '#f97316', '&:hover': { bgcolor: '#ea6c0a' } }}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FormularioVentaMultiple;
