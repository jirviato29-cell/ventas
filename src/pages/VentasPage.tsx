import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Box, TextField, Button, Typography, Autocomplete, Alert, Paper,
  TableContainer, MenuItem, FormControlLabel,
  TablePagination, Table, TableHead, TableRow,
  TableCell, TableBody, Divider, Chip, IconButton, Tabs, Tab, useMediaQuery,
  CircularProgress, InputAdornment, Checkbox,
  Dialog, DialogTitle, DialogContent, DialogActions,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SimCardIcon from '@mui/icons-material/SimCard';
import DescriptionIcon from '@mui/icons-material/Description';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Grid from '@mui/material/Grid';
import axios from 'axios';
import { InventarioGeneral, ProductoEnVenta, Usuario, Venta, VentaChip } from '../Types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PLANES_CASCADA } from '../data/planesCascada';
import { usaDisenoNuevo } from '../data/modulosDisenoNuevo';
import { imprimirTicket } from '../utils/imprimirTicket';
import { calcularPromos, etiquetaPromo, normClave, PromoActiva } from '../utils/promosBuenFin';
import { calcComision } from '../utils/calcComision';
import RecibosPanel from '../components/RecibosPanel';
import AvanceMetaDia from '../components/AvanceMetaDia';
import ContadorMetasCadenas from '../components/ContadorMetasCadenas';
import MiCheckinSemana from '../components/MiCheckinSemana';
import MiSemanaPasada from '../components/MiSemanaPasada';
import TiraAsistenciaSemana from '../components/TiraAsistenciaSemana';

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

const ESTADOS_ACT = ['no_activado', 'activado', 'libre', 'bloqueado'] as const;

const estadoEquipo = (eq: any): string => {
  const e = eq?.estado_activacion;
  if (typeof e === 'string' && ESTADOS_ACT.includes(e as any)) return e;
  return eq?.activado ? 'activado' : 'no_activado';
};

const estiloEstado = (e: string) => {
  if (e === 'activado')  return { label: 'ACTIVADO',    bg: '#2e7d32' };
  if (e === 'libre')     return { label: 'LIBRE',       bg: '#ed6c02' };
  if (e === 'bloqueado') return { label: 'BLOQUEADO',   bg: '#d32f2f' };
  return { label: 'NO ACTIVADO', bg: '#9e9e9e' };
};

const reglaClasificacion = (estado: string) => {
  if (estado === 'no_activado') return {
    permitidas: ['linea_nueva', 'boletin_63'],
    leyenda: 'Este equipo tienes que activarlo en el portal de Telcel o hacer un Boletín 63',
  };
  if (estado === 'activado') return {
    permitidas: ['chip_ato', 'chip_promo'],
    leyenda: 'En este equipo tienes que regalar un Chip ATO o un Promo',
  };
  if (estado === 'libre') return {
    permitidas: ['chip_ato'],
    leyenda: 'En este equipo regala un Chip ATO',
  };
  return { permitidas: ['linea_nueva', 'boletin_63', 'chip_ato', 'chip_promo'], leyenda: '' };
};

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
  { value: 'Boletin 63',          label: 'Boletin 63 / ATO' },
];

const CHIP_OPCIONES_EKT = [
  { value: 'Activacion',          label: 'Telefono Activado de Cadenas' },
  { value: 'Chip Cero/Libre',     label: 'Chip Cero / Libre / EKT' },
  { value: 'Chip Preactivado',    label: 'Chip Preactivado / Otras Cadenas' },
  { value: 'Porta Otras cadenas', label: 'Portabilidad / EKT / Otras Cadenas' },
  { value: 'Boletin 63',          label: 'Boletin 63 / ATO' },
];

const CHIP_OPCIONES_COPPEL = [
  { value: 'Activacion',          label: 'Telefono Activado de Cadenas' },
  { value: 'Chip Coppel',         label: 'Chip Express Coppel' },
  { value: 'Portabilidad Coppel', label: 'Portabilidad Coppel' },
  { value: 'Boletin 63',          label: 'Boletin 63 / ATO' },
];

const CHIP_OPCIONES_OTRAS_CADENAS = [
  { value: 'Activacion',          label: 'Telefono Activado de Cadenas' },
  { value: 'Chip Preactivado',    label: 'Chip Preactivado / Otras Cadenas' },
  { value: 'Porta Otras cadenas', label: 'Portabilidad / EKT / Otras Cadenas' },
  { value: 'Boletin 63',          label: 'Boletin 63 / ATO' },
];

const CHIP_OPCIONES_POR_CADENA: Record<string, typeof CHIP_OPCIONES_TODAS> = {
  EKT:       CHIP_OPCIONES_EKT,
  COPPEL:    CHIP_OPCIONES_COPPEL,
  CHEDRAUI:  CHIP_OPCIONES_OTRAS_CADENAS,
  SUBURBIA:  CHIP_OPCIONES_OTRAS_CADENAS,
  LIVERPOOL: CHIP_OPCIONES_OTRAS_CADENAS,
  AURRERA:   CHIP_OPCIONES_OTRAS_CADENAS,
  SAMS:      CHIP_OPCIONES_OTRAS_CADENAS,
  WALMART:   CHIP_OPCIONES_OTRAS_CADENAS,
};

// Cadenas: captura CURP/ICCID/NIP al vender, el tramite se sigue despues.
const TIPOS_CON_CURP_NIP = ['Porta Otras cadenas'];
// Modulos: el asesor registra la venta cuando el tramite YA se hizo, asi que
// en vez de esos datos captura la fecha en que se realizo.
const TIPOS_CON_FECHA_PORTA = ['Portabilidad'];

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
  EKT:       COMISIONES_EKT,
  COPPEL:    COMISIONES_COPPEL,
  CHEDRAUI:  COMISIONES_OTRAS_CADENAS,
  SUBURBIA:  COMISIONES_OTRAS_CADENAS,
  LIVERPOOL: COMISIONES_OTRAS_CADENAS,
  AURRERA:   COMISIONES_OTRAS_CADENAS,
  SAMS:      COMISIONES_OTRAS_CADENAS,
  WALMART:   COMISIONES_OTRAS_CADENAS,
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

// Navegación desde el menú lateral: /ventas?tab=<clave> abre la pestaña interna.
// Los números difieren entre la vista de asesor y la de encargado.
const TABS_ASESOR: Record<string, number> = { tickets: 1, 'mis-ventas': 2, tasas: 3 };
const TABS_ENCARGADO: Record<string, number> = { tickets: 1, 'mis-ventas': 2, tasas: 4, resumen: 5, historial: 6 };

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
  const [imei, setImei] = useState('');
  const [iccid, setIccid] = useState('');
  const [curp, setCurp] = useState('');
  const [nip, setNip] = useState('');
  const [fechaPorta, setFechaPorta] = useState('');
  const [cambioChip, setCambioChip] = useState(false);
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [precioEquipo, setPrecioEquipo] = useState('');
  // Cadenas: en estos chips se vende un equipo y se captura marca, modelo y precio.
  const pideEquipo = esCadenas && (tipoChip === 'Activacion' || tipoChip === 'Boletin 63');
  // Clave impresa del chip (ej. A16-3): si se valida, fija número e ICCID
  const [claveChip, setClaveChip] = useState('');
  const [chipDesdeClave, setChipDesdeClave] = useState(false);
  const [errorClave, setErrorClave] = useState('');
  const [buscandoClave, setBuscandoClave] = useState(false);
  const recargaRef = useRef<HTMLInputElement>(null);

  const [telefonoOrigen, setTelefonoOrigen] = useState<'' | 'telcel' | 'libre'>('telcel');
  const [telefonoImei, setTelefonoImei] = useState('');
  const [telefonoEstadoAct, setTelefonoEstadoAct] = useState<string>('');
  const [telefonoClasificacion, setTelefonoClasificacion] = useState<'' | 'linea_nueva' | 'boletin_63' | 'chip_ato' | 'chip_promo'>('');
  const [telefonoMarca, setTelefonoMarca] = useState('');
  const [telefonoModelo, setTelefonoModelo] = useState('');
  const [telefonoClave, setTelefonoClave] = useState('');
  const [telefonoTipo_venta, setTelefonoTipo_venta] = useState('');
  const [telefonoPrecio, setTelefonoPrecio] = useState('');
  const [Chip_casado, setChip_casado] = useState('');
  // Recarga del chip casado: va al registro de venta_chips que crea el backend.
  const [telefonoRecarga, setTelefonoRecarga] = useState('');

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
  const [planMontoDividido, setPlanMontoDividido] = useState({ efectivo: '', tarjeta: '' });

  const [fecha, setFecha] = useState(HOY);
  const [opcionesTelefonos, setOpcionesTelefonos] = useState<{ clave: string; producto: string }[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [moduloId, setModuloId] = useState<number | null>(null);
  const [rol, setRol] = useState<Usuario['rol'] | null>(localStorage.getItem('rol') as Usuario['rol'] | null);
  const [modulos, setModulos] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const nombreModuloActual = (user?.modulo?.nombre || moduloLocal || '').trim().toLowerCase();
  const imeiObligatorio = true;
  const navigate = useNavigate();
  // Sube tras cada venta registrada para que AvanceMetaDia recargue al instante.
  const [refrescoAvance, setRefrescoAvance] = useState(0);
  const [totalAccesorios, setTotalAccesorios] = useState(0);
  const [totalTelefonos, setTotalTelefonos] = useState(0);
  const [paginaAcc, setPaginaAcc] = useState(0);
  const [paginaTel, setPaginaTel] = useState(0);
  const filasPorPagina = 10;

  // ── Estado asesor ────────────────────────────────────────────────────────
  const [chipsDelDia, setChipsDelDia] = useState<VentaChip[]>([]);
  const [misActivacionesData, setMisActivacionesData] = useState<VentaChip[]>([]);
  const [comisionesHoy, setComisionesHoy] = useState<any>(null);
  const [sinCiclo, setSinCiclo] = useState(false);
  const [tabAsesor, setTabAsesor] = useState(0);
  // Menú lateral: /ventas?tab=<clave> abre la pestaña (ver TABS_ASESOR / TABS_ENCARGADO);
  // /ventas sin parámetro regresa a "💰 REGISTRAR VENTA". El asesor de Cadenas navega con
  // sus pestañas dentro del menú lateral, no con parámetros.
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  useEffect(() => {
    if (rol === 'asesor' && esCadenas) { setTabAsesor(0); return; }
    const mapa = rol === 'asesor' ? TABS_ASESOR : TABS_ENCARGADO;
    setTabAsesor((tabParam && mapa[tabParam]) || 0);
  }, [tabParam, esCadenas, rol]);
  // Ya no hay pestañas en la barra superior: toda la navegación está en el menú lateral.
  // Solo el asesor de Cadenas proyecta sus pestañas dentro del menú lateral (Drawer).
  const tabsEnDrawer = rol === 'asesor' && esCadenas;
  const [tabsSlot, setTabsSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setTabsSlot(tabsEnDrawer ? document.getElementById('drawer-tabs-slot') : null);
  }, [tabsEnDrawer]);
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
  // Promos Buen Fin
  const [promosActivas, setPromosActivas] = useState<PromoActiva[]>([]);
  const [promoSel, setPromoSel] = useState<null | '3X2' | '2DA30'>(null);

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  // ── Fetches ──────────────────────────────────────────────────────────────
  const fetchVentas = async () => {
    try {
      const res = await axios.get(`/api/ventas/ventas`, {
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
      const res = await axios.get(`/api/comisiones/comisiones`, config);
      setCatalogoComisiones(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchMisVentas = async (fecha: string) => {
    try {
      const res = await axios.get(`/api/ventas/ventas`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { fecha },
      });
      setMisVentasData(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchComisionesPorFecha = async (fecha: string) => {
    try {
      const res = await axios.get(
        `/api/comisiones/ciclo_por_fechas`,
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
        `/api/ventas/venta_chips`,
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
        `/api/ventas/venta_chips`,
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
        `/api/ventas/venta_chips`,
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
        `/api/comisiones/ciclo_por_fechas`,
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
          `/api/inventario/inventario/general`,
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
            `/api/auth/usuarios/me`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          setUser(resUser.data);
          setRol(resUser.data.rol);
          const resModulos = await axios.get(
            `/api/registro/modulos`,
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

  // Promos Buen Fin: si falla o no hay, queda [] sin mostrar error. Cadenas no aplica.
  useEffect(() => {
    if (esCadenas) { setPromosActivas([]); return; }
    axios.get<PromoActiva[]>(
      `/api/promociones/activas`,
      { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } },
    )
      .then((res) => setPromosActivas(
        Array.isArray(res.data)
          ? res.data.map((p) => ({ codigo: String(p.codigo).trim().toUpperCase(), nombre: p.nombre, claves: p.claves ?? [] }))
          : [],
      ))
      .catch(() => setPromosActivas([]));
  }, [esCadenas]);

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

  // Diseño nuevo: el error rojo se borra solo en cuanto el asesor corrige algo
  // (carrito, pago o datos del teléfono). El ref se llena más abajo con disenoNuevo.
  const disenoNuevoRef = useRef(false);
  useEffect(() => {
    if (!disenoNuevoRef.current) return;
    setMensaje((m) => (m?.tipo === 'error' ? null : m));
  }, [carrito, montoDividido, metodoPago, producto, precio, cantidad,
      telefonoImei, telefonoMarca, telefonoModelo, telefonoPrecio, telefonoTipo_venta, telefonoClasificacion, Chip_casado, telefonoRecarga]);

  // ── Acciones ─────────────────────────────────────────────────────────────
  // ── Promos Buen Fin (valores derivados, sin hooks) ─────────────────────
  const promosBoton = (['3X2', '2DA30'] as const).filter((c) => promosActivas.some((p) => p.codigo === c));
  const fundas30 = promosActivas.find((p) => p.codigo === 'FUNDAS30');
  const promoParaProducto = (clave: string): string | null => {
    if (promoSel && promosBoton.includes(promoSel)) return promoSel;
    if (fundas30 && clave && fundas30.claves.some((c) => normClave(c) === normClave(clave))) return 'FUNDAS30';
    return null;
  };
  const precioInventario = (clave: string): number | null =>
    productos.find((p) => normClave(p.clave) === normClave(clave))?.precio ?? null;
  // Diseño nuevo: venta de contado → el precio del teléfono se llena con el
  // precio de lista del inventario (por clave; si no hay clave, por nombre).
  // El asesor lo puede seguir editando. En el diseño actual no hace nada.
  const llenarPrecioContado = (clave: string, nombre: string, tipo: string) => {
    if (!disenoNuevoRef.current || tipo !== 'Contado' || !nombre.trim()) return;
    const lista = (clave ? precioInventario(clave) : null)
      ?? productos.find((p) => String(p.producto ?? '').trim().toLowerCase() === nombre.trim().toLowerCase())?.precio
      ?? null;
    if (lista != null && lista > 0) setTelefonoPrecio(String(lista));
  };
  const promoProductoActual = producto ? promoParaProducto(productoClave) : null;
  const carritoConPromo = carrito.some((p) => !!p.promocion);
  const vistaPromo = calcularPromos(carrito);

  // Renglones del ticket: con promo usa los renglones ya partidos por precio
  // (precios del backend si la respuesta coincide); sin promo, igual que siempre.
  const productosTicket = (respuesta: any) => {
    if (!carritoConPromo) {
      return carrito.map(p => ({
        nombre: (p as any).producto || p.nombre,
        cantidad: p.cantidad,
        precio_unitario: p.precio_unitario,
      }));
    }
    const filas = Array.isArray(respuesta) && respuesta.length === vistaPromo.renglones.length ? respuesta : null;
    return vistaPromo.renglones.map((r, i) => ({
      nombre: carrito[r.idx].producto || carrito[r.idx].nombre,
      cantidad: filas ? Number(filas[i].cantidad) : r.cantidad,
      precio_unitario: filas ? Number(filas[i].precio_unitario) : r.precio_unitario,
      precio_original: r.precio_original,
      promocion: r.promocion ? etiquetaPromo(r.promocion) : null,
    }));
  };

  const agregarAlCarrito = () => {
    if (!producto || precio === null || cantidad <= 0) return;
    const promo = promoParaProducto(productoClave);
    let precioFinal = precio;
    if (promo) {
      const codigoEnCarrito = carrito.find((p) => p.promocion)?.promocion;
      if (codigoEnCarrito && codigoEnCarrito !== promo) {
        setMensaje({ tipo: 'error', texto: `No se pueden combinar promociones: el carrito ya trae ${etiquetaPromo(codigoEnCarrito)} y este producto entraría con ${etiquetaPromo(promo)}.` });
        return;
      }
      const pInv = precioInventario(productoClave);
      if (pInv === null) {
        setMensaje({ tipo: 'error', texto: `No se encontró el precio de inventario de ${producto}; no se puede aplicar la promoción.` });
        return;
      }
      precioFinal = pInv;
      if (metodoPago === 'dividido') { setMetodoPago(''); setMontoDividido({ efectivo: '', tarjeta: '' }); }
    }
    setCarrito([...carrito, { producto, clave: productoClave, cantidad, precio_unitario: precioFinal, id: 0, nombre: '', tipo_producto: 'accesorios', ...(promo ? { promocion: promo } : {}) }]);
    setProducto('');
    setProductoClave('');
    setCantidad(1);
    setPrecio(null);
  };

  const enviarCarrito = async () => {
    if (carrito.length === 0) return;
    const totalCarrito = carrito.reduce((a, p) => a + p.precio_unitario * p.cantidad, 0);

    if (vistaPromo.bloquea) {
      setMensaje({ tipo: 'error', texto: vistaPromo.avisos[0] });
      return;
    }

    if (metodoPago === 'dividido') {
      if (carritoConPromo) {
        setMensaje({ tipo: 'error', texto: 'Las promociones no aplican con pago dividido.' });
        return;
      }
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
          // La parte en tarjeta no vuelve a descontar inventario: ya salió en la de efectivo.
          skip_inventario: skip,
        }));
      try {
        const resEf = await axios.post(
          `/api/ventas/ventas/multiples`,
          { productos: makeItems(pctEf, false), metodo_pago: 'efectivo' },
          config,
        );
        const folioCompartido = resEf?.data?.[0]?.folio;

        let okTa = true;
        try {
          await axios.post(
            `/api/ventas/ventas/multiples`,
            { productos: makeItems(pctTa, true), metodo_pago: 'tarjeta', folio: folioCompartido },
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
            folio: folioCompartido,
            clasificacion: 'Accesorios',
            modulo: user?.modulo?.nombre || moduloLocal || '',
            vendedor: localStorage.getItem('usuario') || '',
          });
          setCarrito([]); setMetodoPago(''); setMontoDividido({ efectivo: '', tarjeta: '' });
          setRefrescoAvance((n) => n + 1);
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
        `/api/ventas/ventas/multiples`,
        { productos: carrito, metodo_pago: metodoPago },
        config,
      );
      const folioVenta = res?.data?.[0]?.folio;
      setMensaje({ tipo: 'success', texto: 'Venta registrada con éxito.' });
      const ticketProds = productosTicket(res?.data);
      imprimirTicket({
        productos: ticketProds,
        total: ticketProds.reduce((a, p) => a + p.precio_unitario * p.cantidad, 0),
        metodoPago,
        montoDividido,
        folio: folioVenta,
        clasificacion: 'Accesorios',
        modulo: user?.modulo?.nombre || moduloLocal || '',
        vendedor: localStorage.getItem('usuario') || '',
      });
      setCarrito([]); setMetodoPago(''); setMontoDividido({ efectivo: '', tarjeta: '' });
      setPromoSel(null);
      setRefrescoAvance((n) => n + 1);
      if (rol === 'asesor') { fetchVentas(); fetchComisionesHoy(); }
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err?.response?.data?.detail || 'Error al registrar la venta' });
    }
  };

  const cancelarVenta = async (id: number) => {
    if (!window.confirm('¿Estás seguro de cancelar esta venta?')) return;
    try {
      await axios.put(`/api/ventas/ventas/${id}/cancelar`, {}, config);
      alert('Venta cancelada');
      fetchVentas();
      setRefrescoAvance((n) => n + 1);
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
        `/api/ventas/ventas/${editPrecioVenta.id}/precio`,
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
    const url = `/api/ventas/venta_chips/verificar_numero/${encodeURIComponent(num)}`;
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

  const liberarClaveChip = () => {
    setChipDesdeClave(false);
    setNumero('');
    setIccid('');
  };

  const buscarClaveChip = async () => {
    const clave = claveChip.trim();
    if (!clave || chipDesdeClave || buscandoClave) return;
    setBuscandoClave(true);
    setErrorClave('');
    try {
      const res = await axios.get(
        `/api/inventario/inventario/chips/clave/${encodeURIComponent(clave)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setTipoChip('Chip Express');
      setTadDevice(''); setCurp(''); setNip(''); setFechaPorta('');
      setNumero(res.data.numero || '');
      setIccid(res.data.iccid || '');
      setNumeroDuplicado(false);
      setChipDesdeClave(true);
      setTimeout(() => recargaRef.current?.focus(), 0);
    } catch (err: any) {
      setErrorClave(err?.response?.data?.detail || 'No se pudo validar la clave');
      liberarClaveChip();
    } finally {
      setBuscandoClave(false);
    }
  };

  const handleSubmit = async () => {
    const esPayJoy = tipoChip === 'Tarjetas PayJoy';
    setRegistrando(true);
    try {
      await axios.post(
        `/api/ventas/venta_chips`,
        {
          tipo_chip: tipoChip,
          numero_telefono: esPayJoy ? tadDevice : numero,
          monto_recarga: (esPayJoy || TIPOS_CON_CURP_NIP.includes(tipoChip) || TIPOS_CON_FECHA_PORTA.includes(tipoChip)) ? 0 : parseFloat(recarga),
          cvip: false,
          imei: tipoChip === 'Boletin 63' ? (imei || null) : null,
          iccid: chipDesdeClave
            ? (iccid || null)
            : TIPOS_CON_CURP_NIP.includes(tipoChip)
            ? (iccid || null)
            : (tipoChip === 'Boletin 63' && cambioChip ? (iccid || null) : null),
          curp: TIPOS_CON_CURP_NIP.includes(tipoChip) ? (curp || null) : null,
          nip: TIPOS_CON_CURP_NIP.includes(tipoChip) ? (nip || null) : null,
          // El input type="date" ya entrega YYYY-MM-DD: se manda tal cual, sin
          // pasar por Date, que desplazaria el dia por zona horaria.
          fecha_portabilidad: TIPOS_CON_FECHA_PORTA.includes(tipoChip) ? (fechaPorta || null) : null,
          cambio_chip: tipoChip === 'Boletin 63' ? cambioChip : false,
          marca: pideEquipo ? marca.trim() : null,
          modelo: pideEquipo ? modelo.trim() : null,
          precio: pideEquipo ? parseFloat(precioEquipo) : null,
        },
        { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } },
      );
      setMensaje({ tipo: 'success', texto: 'Venta de chip registrada correctamente' });
      setTipoChip(''); setNumero(''); setRecarga(''); setTadDevice(''); setImei(''); setIccid(''); setCambioChip(false); setCurp(''); setNip(''); setFechaPorta('');
      setMarca(''); setModelo(''); setPrecioEquipo('');
      setClaveChip(''); setChipDesdeClave(false); setErrorClave('');
      setRefrescoAvance((n) => n + 1);
      if (rol === 'asesor') { fetchVentas(); fetchComisionesHoy(); fetchChipsDelDia(); }
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err?.response?.data?.detail || 'Error al registrar la venta' });
    } finally {
      setRegistrando(false);
    }
  };

  // Recarga: obligatoria salvo en Boletín 63 (ahí es opcional).
  const recargaObligatoria = ['linea_nueva', 'chip_ato', 'chip_promo'].includes(telefonoClasificacion);
  const montoRecargaTel = telefonoRecarga ? Number(telefonoRecarga) : null;
  // Chip ATO se valida como Chip Express, cuya tabla de comisión llega hasta $150.
  const TOPE_RECARGA_CHIP_ATO = 150;
  const recargaPasaTope = telefonoClasificacion === 'chip_ato' && (montoRecargaTel ?? 0) > TOPE_RECARGA_CHIP_ATO;
  const recargaEnCero = recargaObligatoria && montoRecargaTel === 0;

  // Validaciones del teléfono, compartidas por los dos diseños. null = todo bien.
  const validarTelefono = (): string | null => {
    if (imeiObligatorio && !telefonoImei.trim()) return 'El IMEI es obligatorio en este módulo.';
    if (imeiObligatorio && (!telefonoMarca || !telefonoModelo)) return 'Captura el IMEI y presiona Enter para cargar el equipo antes de guardar.';
    if (imeiObligatorio && !telefonoClasificacion) return 'Selecciona una clasificación: Línea Nueva, Boletín 63 o Chip ATO.';
    if (imeiObligatorio && !Chip_casado.trim()) return 'El Número es obligatorio en este módulo.';
    if (recargaObligatoria && !telefonoRecarga) return 'La Recarga es obligatoria para Línea Nueva, Chip ATO y Chip Promo.';
    if (recargaEnCero) return 'La Recarga debe ser mayor a $0.';
    if (recargaPasaTope) return `La Recarga de Chip ATO no puede pasar de $${TOPE_RECARGA_CHIP_ATO}.`;
    if (!telefonoMarca || !telefonoModelo || !telefonoPrecio || !telefonoTipo_venta) return 'Faltan datos del teléfono.';
    const p = Number(telefonoPrecio);
    if (isNaN(p) || p <= 0) return 'Precio inválido.';
    return null;
  };

  const registrarVentaTelefono = async () => {
    const errorTelefono = validarTelefono();
    if (errorTelefono) { setMensaje({ tipo: 'error', texto: errorTelefono }); return; }
    const p = Number(telefonoPrecio);
    const productoBase = {
      producto: `${telefonoMarca} ${telefonoModelo}`,
      cantidad: 1, tipo_producto: 'telefono', tipo_venta: telefonoTipo_venta,
      chip_casado: Chip_casado || null,
      imei: telefonoImei || null,
      clasificacion: telefonoClasificacion || null,
      monto_recarga: montoRecargaTel,
    };
    const resetTel = () => {
      setTelefonoMarca(''); setTelefonoModelo(''); setTelefonoClave(''); setTelefonoTipo_venta('');
      setMetodoPago(''); setTelefonoPrecio(''); setChip_casado(''); setTelefonoRecarga('');
      setMontoDividido({ efectivo: '', tarjeta: '' });
      setTelefonoOrigen('telcel');
      setTelefonoImei('');
      setTelefonoClasificacion('');
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
          `/api/ventas/ventas`,
          { productos: [{ ...productoBase, precio_unitario: ef, skip_comision: false }], metodo_pago: 'efectivo' },
          config,
        );
        const folioCompartido = resEf?.data?.[0]?.folio;

        let okTa = true;
        try {
          await axios.post(
            `/api/ventas/ventas`,
            { productos: [{ ...productoBase, imei: null, precio_unitario: ta, skip_comision: true, skip_inventario: true }], metodo_pago: 'tarjeta', folio: folioCompartido },
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
            modulo: user?.modulo?.nombre || moduloLocal || '',
            vendedor: localStorage.getItem('usuario') || '',
            folio: folioCompartido,
            clasificacion: 'Telefono',
          });
          resetTel();
          setRefrescoAvance((n) => n + 1);
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
        `/api/ventas/ventas`,
        { productos: [{ ...productoBase, precio_unitario: p }], metodo_pago: metodoPago },
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
        modulo: user?.modulo?.nombre || moduloLocal || '',
        vendedor: localStorage.getItem('usuario') || '',
        folio: folioVenta,
        clasificacion: 'Telefono',
      });
      resetTel();
      setRefrescoAvance((n) => n + 1);
      if (rol === 'asesor') { fetchVentas(); fetchComisionesHoy(); }
    } catch (err: any) {
      let msg = 'Error al registrar la venta de teléfono';
      if (Array.isArray(err?.response?.data?.detail)) msg = err.response.data.detail.map((e: any) => e.msg).join(' | ');
      else if (typeof err?.response?.data?.detail === 'string') msg = err.response.data.detail;
      setMensaje({ tipo: 'error', texto: msg });
    }
  };

  // ── Diseño nuevo: el teléfono va al carrito junto con los accesorios ──
  const telefonoEnCarrito = carrito.some((p) => p.tipo_producto === 'telefono');

  const agregarTelefonoAlCarrito = () => {
    if (telefonoEnCarrito) {
      setMensaje({ tipo: 'error', texto: 'Solo se permite 1 teléfono por ticket. Quita el que está en el carrito para cambiarlo.' });
      return;
    }
    const errorTelefono = validarTelefono();
    if (errorTelefono) { setMensaje({ tipo: 'error', texto: errorTelefono }); return; }
    setCarrito([...carrito, {
      id: 0, nombre: '', clave: '',
      producto: `${telefonoMarca} ${telefonoModelo}`,
      cantidad: 1,
      precio_unitario: Number(telefonoPrecio),
      tipo_producto: 'telefono',
      imei: telefonoImei.trim() || null,
      chip_casado: Chip_casado.trim() || null,
      clasificacion: telefonoClasificacion || null,
      monto_recarga: montoRecargaTel,
      tipo_venta: telefonoTipo_venta,
    }]);
    setTelefonoMarca(''); setTelefonoModelo(''); setTelefonoClave(''); setTelefonoTipo_venta('');
    setTelefonoPrecio(''); setChip_casado(''); setTelefonoRecarga(''); setTelefonoImei(''); setTelefonoClasificacion('');
    setTelefonoEstadoAct(''); setTelefonoOrigen('telcel');
  };

  // Un solo POST con accesorios y teléfono; si es dividido, el backend parte cada renglón.
  const enviarCarritoNuevo = async () => {
    if (carrito.length === 0) return;
    if (vistaPromo.bloquea) { setMensaje({ tipo: 'error', texto: vistaPromo.avisos[0] }); return; }
    if (!metodoPago) { setMensaje({ tipo: 'error', texto: 'Elige cómo paga el cliente.' }); return; }

    let pagoDividido: { efectivo: number; tarjeta: number } | null = null;
    if (metodoPago === 'dividido') {
      if (carritoConPromo) {
        setMensaje({ tipo: 'error', texto: 'Las promociones no aplican con pago dividido.' });
        return;
      }
      const totalCarrito = carrito.reduce((a, p) => a + p.precio_unitario * p.cantidad, 0);
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
      pagoDividido = { efectivo: ef, tarjeta: ta };
    }

    try {
      const res = await axios.post(
        `/api/ventas/ventas/multiples`,
        {
          productos: carrito,
          metodo_pago: metodoPago,
          ...(pagoDividido ? { pago_dividido: pagoDividido } : {}),
        },
        config,
      );
      const folioVenta = res?.data?.[0]?.folio;
      const ticketProds = productosTicket(res?.data);
      const hayAccesorios = carrito.some((p) => p.tipo_producto !== 'telefono');
      setMensaje({ tipo: 'success', texto: 'Venta registrada con éxito.' });
      imprimirTicket({
        productos: ticketProds,
        total: ticketProds.reduce((a, p) => a + p.precio_unitario * p.cantidad, 0),
        metodoPago,
        montoDividido,
        folio: folioVenta,
        clasificacion: telefonoEnCarrito ? (hayAccesorios ? 'Accesorios y Teléfono' : 'Telefono') : 'Accesorios',
        modulo: user?.modulo?.nombre || moduloLocal || '',
        vendedor: localStorage.getItem('usuario') || '',
      });
      setCarrito([]); setMetodoPago(''); setMontoDividido({ efectivo: '', tarjeta: '' });
      setPromoSel(null);
      setRefrescoAvance((n) => n + 1);
      if (rol === 'asesor') { fetchVentas(); fetchComisionesHoy(); }
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const texto = Array.isArray(detail) ? detail.map((e: any) => e.msg).join(' | ')
        : typeof detail === 'string' ? detail : 'Error al registrar la venta.';
      setMensaje({ tipo: 'error', texto });
    }
  };

  const resetPlan = () => {
    setPlanTipo(''); setPlanEstatus(''); setPlanCategoria(''); setPlanClasificacion('');
    setPlanEquipo(''); setPlanImei(''); setPlanPrecio(''); setPlanPlazo('');
    setPlanLinea(''); setPlanCuenta(''); setPlanPagoInicial(false); setPlanMontoPagoInicial(''); setPlanMetodoPagoInicial('efectivo');
    setPlanMontoDividido({ efectivo: '', tarjeta: '' });
  };

  const registrarPlan = async () => {
    if (!planTipo || !planEstatus || !planCategoria || !planClasificacion) {
      setMensaje({ tipo: 'error', texto: 'Completa Tipo, Estatus, Categoría y Clasificación' });
      return;
    }
    if (imeiObligatorio && planTipo === 'FORZOSO' && !planImei.trim()) {
      setMensaje({ tipo: 'error', texto: 'El IMEI es obligatorio en este módulo.' });
      return;
    }
    if (imeiObligatorio && planTipo === 'FORZOSO' && !planEquipo) {
      setMensaje({ tipo: 'error', texto: 'Captura el IMEI y presiona Enter para cargar el equipo antes de guardar.' });
      return;
    }
    if (planPagoInicial && planMetodoPagoInicial === 'dividido') {
      const ef = parseFloat(planMontoDividido.efectivo);
      const ta = parseFloat(planMontoDividido.tarjeta);
      const total = parseFloat(planMontoPagoInicial);
      if (isNaN(ef) || ef <= 0 || isNaN(ta) || ta <= 0) {
        setMensaje({ tipo: 'error', texto: 'Ambos montos deben ser mayores a $0.' });
        return;
      }
      if (Math.abs((ef + ta) - total) >= 0.01) {
        setMensaje({ tipo: 'error', texto: 'La suma de efectivo y tarjeta debe ser igual al pago inicial.' });
        return;
      }
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
        monto_inicial_efectivo: planPagoInicial && planMetodoPagoInicial === 'dividido' ? parseFloat(planMontoDividido.efectivo) : 0,
        monto_inicial_tarjeta: planPagoInicial && planMetodoPagoInicial === 'dividido' ? parseFloat(planMontoDividido.tarjeta) : 0,
      };
      await axios.post('/api/planes-tarifarios', payload, config);
      setMensaje({ tipo: 'success', texto: 'Plan registrado correctamente' });
      resetPlan();
      setRefrescoAvance((n) => n + 1);
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
        `/api/inventario/buscar?query=${encodeURIComponent(texto)}`,
        config,
      );
      setOpcionesTelefonos(res.data);
    } catch { setOpcionesTelefonos([]); }
    finally { setBuscando(false); }
  };

  const buscarEquipoPorImeiVenta = async () => {
    const imei = telefonoImei.trim();
    if (!imei) return;
    try {
      const res = await axios.get(
        `https://ato-appservidor-nvxt.onrender.com/equipos_telcel/?estatus=surtido`,
        config
      );
      const lista = res.data || [];
      const eq = lista.find((e: any) => String(e.imei).trim() === imei);
      if (!eq) {
        alert("Ese IMEI no está disponible para venta (no está surtido a un módulo).");
        setTelefonoMarca(''); setTelefonoModelo(''); setTelefonoClave('');
        setTelefonoEstadoAct('');
        setTelefonoClasificacion('');
        return;
      }
      // Llenar marca+modelo y clave desde el equipo
      const parts = String(eq.producto).split(' ');
      setOpcionesTelefonos([{ clave: eq.clave || '', producto: String(eq.producto) }]);
      setTelefonoMarca(parts[0] || '');
      setTelefonoModelo(parts.slice(1).join(' ') || '');
      setTelefonoClave(eq.clave || '');
      llenarPrecioContado(eq.clave || '', String(eq.producto), telefonoTipo_venta);
      const nuevoEstado = estadoEquipo(eq);
      setTelefonoEstadoAct(nuevoEstado);
      setTelefonoClasificacion((prev) =>
        prev && !reglaClasificacion(nuevoEstado).permitidas.includes(prev) ? '' : prev
      );
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al buscar el IMEI");
    }
  };

  const buscarEquipoPorImeiPlan = async () => {
    const imei = planImei.trim();
    if (!imei) return;
    try {
      const res = await axios.get(
        `https://ato-appservidor-nvxt.onrender.com/equipos_telcel/?estatus=surtido`,
        config
      );
      const lista = res.data || [];
      const eq = lista.find((e: any) => String(e.imei).trim() === imei);
      if (!eq) {
        alert("Ese IMEI no está disponible para venta (no está surtido a un módulo).");
        setPlanEquipo('');
        return;
      }
      setOpcionesTelefonos([{ clave: eq.clave || '', producto: String(eq.producto) }]);
      setPlanEquipo(String(eq.producto));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al buscar el IMEI");
    }
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
  // Franja de avance de meta: ancho completo arriba de la pestaña TICKET.
  // Una sola definicion para las dos vistas (asesor y encargado); Cadenas ve
  // en su lugar el contador de metas de activaciones de su tienda.
  const franjaAvance = tabAsesor !== 0
    ? null
    : esCadenas
      ? <ContadorMetasCadenas refrescar={refrescoAvance} usuarioId={user?.id} />
      : <AvanceMetaDia refrescar={refrescoAvance} />;

  // ── Piezas del formulario compartidas por el diseño actual y el nuevo (BO) ──
  // Solo JSX: la lógica vive en los handlers de arriba; cada diseño las acomoda distinto.
  const botonesPromo = (
        <ToggleButtonGroup
          exclusive fullWidth size="small" value={promoSel}
          onChange={(_, v: '3X2' | '2DA30' | null) => setPromoSel(v)}
          sx={{ mb: 1 }}
        >
          {promosBoton.map((c) => (
            <ToggleButton key={c} value={c}
              sx={{ textTransform: 'none', fontWeight: 700, py: 0.4, fontSize: 12.5,
                '&.Mui-selected, &.Mui-selected:hover': { bgcolor: '#fff7ed', color: '#ea580c', borderColor: '#f97316' } }}>
              {etiquetaPromo(c)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
  );
  const selectorProducto = (
          <Autocomplete<InventarioGeneral>
            size="small"
            options={productos
              .filter((p) => !p.producto.toLowerCase().includes('telefono'))
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
  );
  const avisosPromo = 
          vistaPromo.avisos.map((a) => (
            <Alert key={a} severity="warning" sx={{ mt: 0.5, py: 0, fontSize: 12.5 }}>{a}</Alert>
          ))
  ;
  const divididoCarrito = 
          metodoPago === 'dividido' && carrito.length > 0 && (() => {
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
          })()
  ;
  const bloqueChip = (
        <>
          {!esCadenas && (
            <TextField
              label="Clave del chip (ej. A16-3)" value={claveChip} fullWidth size="small" margin="dense"
              onChange={(e) => {
                setClaveChip(e.target.value);
                setErrorClave('');
                if (chipDesdeClave) liberarClaveChip();
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscarClaveChip(); } }}
              onBlur={buscarClaveChip}
              error={!!errorClave}
              helperText={errorClave || (buscandoClave ? 'Buscando…' : '')}
              InputProps={{ endAdornment: buscandoClave ? <InputAdornment position="end"><CircularProgress size={16} /></InputAdornment> : undefined }}
            />
          )}
          <TextField select label="Chip" value={tipoChip} onChange={(e) => {
            setTipoChip(e.target.value); setTadDevice(''); setIccid(''); setCurp(''); setNip(''); setFechaPorta('');
            setMarca(''); setModelo(''); setPrecioEquipo('');
            if (chipDesdeClave) { setClaveChip(''); setChipDesdeClave(false); setNumero(''); }
          }} fullWidth size="small" margin="dense">
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
                label="Número" type="tel" value={numero} fullWidth size="small" margin="dense"
                disabled={chipDesdeClave}
                required={tipoChip === 'Boletin 63' || TIPOS_CON_CURP_NIP.includes(tipoChip) || TIPOS_CON_FECHA_PORTA.includes(tipoChip)}
                onChange={(e) => { setNumero(e.target.value); setNumeroDuplicado(false); }}
                onBlur={() => verificarNumero(numero)}
                error={numeroDuplicado || (tipoChip === 'Boletin 63' && !numero.trim())}
                helperText={
                  numeroDuplicado
                    ? 'Este número ya fue registrado'
                    : verificandoNumero
                    ? 'Verificando…'
                    : (tipoChip === 'Boletin 63' && !numero.trim())
                    ? 'Obligatorio para Boletín 63'
                    : ''
                }
                InputProps={{ endAdornment: verificandoNumero ? <InputAdornment position="end"><CircularProgress size={16} /></InputAdornment> : undefined }}
              />
              {TIPOS_CON_FECHA_PORTA.includes(tipoChip) && (
                <TextField
                  required label="Fecha de la portabilidad" type="date"
                  value={fechaPorta} fullWidth size="small" margin="dense"
                  InputLabelProps={{ shrink: true }}
                  onChange={(e) => setFechaPorta(e.target.value)}
                />
              )}
              {!(TIPOS_CON_CURP_NIP.includes(tipoChip) || TIPOS_CON_FECHA_PORTA.includes(tipoChip)) && (
                <TextField label="Recarga" type="number" inputRef={recargaRef} value={recarga} onChange={(e) => setRecarga(e.target.value)} fullWidth size="small" margin="dense" />
              )}
              {TIPOS_CON_CURP_NIP.includes(tipoChip) && (
                <>
                  <TextField
                    required label="CURP" value={curp} fullWidth size="small" margin="dense"
                    onChange={(e) => setCurp(e.target.value)}
                  />
                  <TextField
                    required label="ICCID" value={iccid} fullWidth size="small" margin="dense"
                    onChange={(e) => setIccid(e.target.value)}
                  />
                  <TextField
                    required label="NIP" value={nip} fullWidth size="small" margin="dense"
                    onChange={(e) => setNip(e.target.value)}
                  />
                </>
              )}
                {tipoChip === 'Boletin 63' && (
                  <>
                    <TextField
                      label="IMEI" value={imei} fullWidth size="small" margin="dense"
                      required
                      error={!imei.trim()}
                      helperText={!imei.trim() ? 'Obligatorio para Boletín 63' : ''}
                      onChange={(e) => setImei(e.target.value)}
                    />
                    <FormControlLabel
                      control={<Checkbox checked={cambioChip} onChange={(e) => { setCambioChip(e.target.checked); if (!e.target.checked) setIccid(''); }} />}
                      label="¿Se cambió el chip?"
                      sx={{ mt: 1 }}
                    />
                    {cambioChip && (
                      <TextField
                        label="ICCID" value={iccid} fullWidth size="small" margin="dense"
                        onChange={(e) => setIccid(e.target.value)}
                      />
                    )}
                  </>
                )}
              {pideEquipo && (
                <>
                  <TextField
                    label="Marca" value={marca} fullWidth size="small" margin="dense"
                    required
                    error={!marca.trim()}
                    helperText={!marca.trim() ? 'Obligatorio para este chip' : ''}
                    onChange={(e) => setMarca(e.target.value)}
                  />
                  <TextField
                    label="Modelo" value={modelo} fullWidth size="small" margin="dense"
                    required
                    error={!modelo.trim()}
                    helperText={!modelo.trim() ? 'Obligatorio para este chip' : ''}
                    onChange={(e) => setModelo(e.target.value)}
                  />
                  <TextField
                    label="Precio" value={precioEquipo} fullWidth size="small" margin="dense"
                    required
                    error={!precioEquipo.trim()}
                    helperText={!precioEquipo.trim() ? 'Obligatorio para este chip' : ''}
                    inputProps={{ inputMode: 'decimal' }}
                    onChange={(e) => { const v = e.target.value; if (/^\d*\.?\d*$/.test(v)) setPrecioEquipo(v); }}
                  />
                </>
              )}
            </>
          )}
          {tipoChip === 'Tarjetas PayJoy' && (
            <TextField label="TAD DEVICE" value={tadDevice} onChange={(e) => setTadDevice(e.target.value)} fullWidth size="small" margin="dense" />
          )}
          <Button
            variant="contained" fullWidth onClick={handleSubmit}
            disabled={registrando || !tipoChip || (
              tipoChip === 'Tarjetas PayJoy'
                ? !tadDevice
                : TIPOS_CON_CURP_NIP.includes(tipoChip)
                  ? (!numero || !curp || !iccid || !nip || numeroDuplicado || verificandoNumero)
                  : TIPOS_CON_FECHA_PORTA.includes(tipoChip)
                    ? (!numero || !fechaPorta || numeroDuplicado || verificandoNumero)
                    : (!numero || !recarga || numeroDuplicado || verificandoNumero || (tipoChip === 'Boletin 63' && !imei))
            ) || (pideEquipo && (!marca.trim() || !modelo.trim() || !(parseFloat(precioEquipo) > 0)))}
            sx={{ mt: 2 }}
          >Registrar Venta de Chip</Button>
        </>
  );
  const telefonoEquipo = (
    <>
          <TextField
            label={imeiObligatorio ? "IMEI (obligatorio)" : "IMEI (opcional)"}
            value={telefonoImei}
            onChange={(e) => { setTelefonoImei(e.target.value); setTelefonoEstadoAct(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscarEquipoPorImeiVenta(); } }}
            onBlur={() => buscarEquipoPorImeiVenta()}
            fullWidth
            size="small" margin="dense"
            required={imeiObligatorio}
            error={imeiObligatorio && !telefonoImei.trim()}
          />
          {telefonoEstadoAct && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Estado del equipo:
              </Typography>
              <Chip
                label={estiloEstado(telefonoEstadoAct).label}
                size="small"
                sx={{
                  bgcolor: estiloEstado(telefonoEstadoAct).bg,
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 11,
                }}
              />
            </Box>
          )}
          {imeiObligatorio ? (
            <TextField
              label="Teléfono (marca + modelo)"
              value={`${telefonoMarca} ${telefonoModelo}`.trim()}
              fullWidth
              size="small" margin="dense"
              InputProps={{ readOnly: true }}
              placeholder="Se llena automáticamente con el IMEI"
            />
          ) : (
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
              onInputChange={(_, v, reason) => { if (reason === 'input') buscarTelefonos(v); }}
              onChange={(_, obj) => {
                if (obj) {
                  const parts = obj.producto.split(' ');
                  setTelefonoMarca(parts[0] || '');
                  setTelefonoModelo(parts.slice(1).join(' ') || '');
                  setTelefonoClave(obj.clave ?? '');
                  llenarPrecioContado(obj.clave ?? '', obj.producto, telefonoTipo_venta);
                } else {
                  setTelefonoMarca('');
                  setTelefonoModelo('');
                  setTelefonoClave('');
                }
              }}
              renderInput={(params) => <TextField {...params} label="Teléfono (marca + modelo)" fullWidth size="small" margin="dense" />}
            />
          )}
    </>
  );
  const telefonoClasifNumero = (
    <>
          {imeiObligatorio && telefonoEstadoAct && reglaClasificacion(telefonoEstadoAct).leyenda && (
            <Typography variant="body2" sx={{ display: 'block', mt: 1, fontWeight: 600, color: '#1565c0' }}>
              {reglaClasificacion(telefonoEstadoAct).leyenda}
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 2, mt: 1, mb: 1 }}>
            {([
              { v: 'linea_nueva', t: 'Línea Nueva' },
              { v: 'boletin_63',  t: 'Boletín 63' },
              { v: 'chip_ato',    t: 'Chip ATO' },
              { v: 'chip_promo',  t: 'Chip Promo' },
            ] as const)
              .filter((b) => reglaClasificacion(telefonoEstadoAct).permitidas.includes(b.v))
              .map((b) => (
                <Button
                  key={b.v}
                  variant={telefonoClasificacion === b.v ? 'contained' : 'outlined'}
                  onClick={() => setTelefonoClasificacion(b.v)}
                  fullWidth
                >
                  {b.t}
                </Button>
              ))}
          </Box>
          <TextField
            label={imeiObligatorio ? "Número (obligatorio)" : "Número"}
            value={Chip_casado}
            onChange={(e) => setChip_casado(e.target.value)}
            fullWidth
            size="small" margin="dense"
            required={imeiObligatorio}
            error={imeiObligatorio && !Chip_casado.trim()}
          />
          <TextField
            label={recargaObligatoria ? 'Recarga (obligatoria)' : 'Recarga'}
            value={telefonoRecarga}
            onChange={(e) => setTelefonoRecarga(e.target.value.replace(/\D/g, ''))}
            fullWidth
            size="small" margin="dense"
            required={recargaObligatoria}
            error={(recargaObligatoria && !telefonoRecarga) || recargaEnCero || recargaPasaTope}
            helperText={telefonoClasificacion === 'chip_ato' ? `Máximo $${TOPE_RECARGA_CHIP_ATO}` : undefined}
            inputProps={{ inputMode: 'numeric' }}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
          />
    </>
  );
  const divididoTelefono = 
          metodoPago === 'dividido' && telefonoPrecio && Number(telefonoPrecio) > 0 && (() => {
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
          })()
  ;
  const bloquePlan = (
        <>
          <Box sx={{ display: 'flex', gap: 1 }}>
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
            fullWidth size="small" margin="dense" sx={{ flex: 1 }}>
            {Object.keys(PLANES_CASCADA).map((t) => (
              <MenuItem key={t} value={t}>{t}</MenuItem>
            ))}
          </TextField>

          <TextField select label="Estatus" value={planEstatus}
            onChange={(e) => setPlanEstatus(e.target.value)}
            fullWidth size="small" margin="dense" sx={{ flex: 1 }}>
            <MenuItem value="ABIERTO">ABIERTO</MenuItem>
            <MenuItem value="CONTROLADO">CONTROLADO</MenuItem>
          </TextField>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField select label="Categoría" value={planCategoria}
            onChange={(e) => { setPlanCategoria(e.target.value); setPlanClasificacion(''); }}
            fullWidth size="small" margin="dense" disabled={!planTipo} sx={{ flex: 1 }}>
            {planTipo && Object.keys(PLANES_CASCADA[planTipo] || {}).map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </TextField>

          <TextField select label="Clasificación" value={planClasificacion}
            onChange={(e) => setPlanClasificacion(e.target.value)}
            fullWidth size="small" margin="dense" disabled={!planCategoria} sx={{ flex: 1 }}>
            {planTipo && planCategoria && (PLANES_CASCADA[planTipo]?.[planCategoria] || []).map((cl) => (
              <MenuItem key={cl} value={cl}>{cl}</MenuItem>
            ))}
          </TextField>
          </Box>

          {planTipo === 'FORZOSO' && (
            <>
              <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label={imeiObligatorio ? "IMEI (obligatorio)" : "IMEI"}
                value={planImei}
                onChange={(e) => setPlanImei(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (imeiObligatorio) buscarEquipoPorImeiPlan(); } }}
                onBlur={() => { if (imeiObligatorio) buscarEquipoPorImeiPlan(); }}
                fullWidth
                size="small" margin="dense" sx={{ flex: 1 }}
                required={imeiObligatorio}
                error={imeiObligatorio && !planImei.trim()}
              />
              <Box sx={{ flex: 1 }}>
              {imeiObligatorio ? (
                <TextField
                  label="Equipo (del inventario)"
                  value={planEquipo}
                  fullWidth
                  size="small" margin="dense"
                  InputProps={{ readOnly: true }}
                  placeholder="Se llena automáticamente con el IMEI"
                />
              ) : (
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
                    <TextField {...params} label="Equipo (del inventario)" fullWidth size="small" margin="dense" />
                  )}
                />
              )}
              </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField label="Precio equipo" type="number" value={planPrecio}
                onChange={(e) => setPlanPrecio(e.target.value)} fullWidth size="small" margin="dense" sx={{ flex: 1 }} />

              <TextField select label="Plazo (meses)" value={planPlazo}
                onChange={(e) => setPlanPlazo(e.target.value)} fullWidth size="small" margin="dense" sx={{ flex: 1 }}>
                <MenuItem value="12">12 meses</MenuItem>
                <MenuItem value="18">18 meses</MenuItem>
                <MenuItem value="24">24 meses</MenuItem>
                <MenuItem value="36">36 meses</MenuItem>
              </TextField>
              </Box>
            </>
          )}

          <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField label="Línea" value={planLinea}
            onChange={(e) => setPlanLinea(e.target.value)} fullWidth size="small" margin="dense" sx={{ flex: 1 }} />

          <TextField label="Cuenta" value={planCuenta}
            onChange={(e) => setPlanCuenta(e.target.value)} fullWidth size="small" margin="dense" sx={{ flex: 1 }} />
          </Box>

          <TextField select label="¿Requiere pago inicial?" value={planPagoInicial ? 'si' : 'no'}
            onChange={(e) => setPlanPagoInicial(e.target.value === 'si')}
            fullWidth size="small" margin="dense">
            <MenuItem value="no">No</MenuItem>
            <MenuItem value="si">Sí</MenuItem>
          </TextField>

          {planPagoInicial && (
            <>
              <TextField label="Monto pago inicial" type="number" value={planMontoPagoInicial}
                onChange={(e) => setPlanMontoPagoInicial(e.target.value)} fullWidth size="small" margin="dense" />
              <TextField select label="¿Cómo paga el pago inicial?" value={planMetodoPagoInicial}
                onChange={(e) => { setPlanMetodoPagoInicial(e.target.value); setPlanMontoDividido({ efectivo: '', tarjeta: '' }); }}
                fullWidth size="small" margin="dense">
                <MenuItem value="efectivo">Efectivo</MenuItem>
                <MenuItem value="tarjeta">Tarjeta</MenuItem>
                <MenuItem value="dividido">Dividido 💳💵</MenuItem>
              </TextField>
              {planMetodoPagoInicial === 'dividido' && (() => {
                const totalPI = parseFloat(planMontoPagoInicial);
                const total = isNaN(totalPI) ? 0 : totalPI;
                const efRaw = parseFloat(planMontoDividido.efectivo);
                const taRaw = parseFloat(planMontoDividido.tarjeta);
                const ef = isNaN(efRaw) ? 0 : efRaw;
                const ta = isNaN(taRaw) ? 0 : taRaw;
                const eitherZero = (planMontoDividido.efectivo !== '' && efRaw <= 0) || (planMontoDividido.tarjeta !== '' && taRaw <= 0);
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
                      <TextField label="Efectivo 💵" type="number" value={planMontoDividido.efectivo}
                        onChange={(e) => setPlanMontoDividido(m => ({ ...m, efectivo: e.target.value }))}
                        size="small" sx={{ flex: 1 }} />
                      <TextField label="Tarjeta 💳" type="number" value={planMontoDividido.tarjeta}
                        onChange={(e) => setPlanMontoDividido(m => ({ ...m, tarjeta: e.target.value }))}
                        size="small" sx={{ flex: 1 }} />
                    </Box>
                    <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: captionColor }}>
                      {captionText}
                    </Typography>
                  </Box>
                );
              })()}
            </>
          )}

          <Button variant="contained" color="primary" fullWidth sx={{ mt: 2 }} onClick={registrarPlan}>
            Registrar Plan
          </Button>
        </>
  );

  // ── Diseño nuevo de "Registrar venta" (solo módulos en MODULOS_DISENO_NUEVO) ──
  // Mismos estados, handlers y llamadas al backend que el diseño actual; solo
  // cambia el acomodo y el estilo. Valores derivados, sin hooks.
  // /auth/usuarios/me no trae el módulo; el login solo guarda su nombre en
  // localStorage 'modulo'. El id se busca por nombre en /registro/modulos.
  const moduloIdActual: number | null = user?.modulo?.id
    ?? modulos.find((m) => String(m?.nombre ?? '').trim().toLowerCase() === nombreModuloActual)?.id
    ?? null;
  const disenoNuevo = !esCadenas
    && localStorage.getItem('rol') !== 'admin'
    && usaDisenoNuevo(moduloIdActual);
  disenoNuevoRef.current = disenoNuevo;

  // Paleta y tipografía del diseño nuevo (solo esta sección).
  const FUENTE_NUEVA = '"Plus Jakarta Sans", "Inter", system-ui, sans-serif';
  const NAVY = '#0f1f3d';
  const AZUL_FOCO = '#2563eb';
  const NARANJA = '#f97316';
  const GRIS_ETIQUETA = '#5b6b85';
  const BORDE_CAMPO = '#e1e6f0';
  const FONDO_CAMPO = '#f8f9fc';
  const TIPOS_NUEVO = {
    accesorio: { label: 'Accesorio', sub: 'Al carrito',         color: '#7c3aed', fondo: '#ede9fe', borde: '#c4b5fd' },
    telefono:  { label: 'Teléfono',  sub: 'Con IMEI',           color: '#0891b2', fondo: '#cffafe', borde: '#67e8f9' },
    plan:      { label: 'Plan',      sub: 'Plan tarifario',     color: '#ea580c', fondo: '#ffedd5', borde: '#fdba74' },
    chip:      { label: 'Chip',      sub: 'Venta por separado', color: '#16a34a', fondo: '#dcfce7', borde: '#86efac' },
  } as const;
  const ORDEN_TIPOS = ['accesorio', 'telefono', 'plan', 'chip'] as const;

  // Íconos de línea (stroke 2.2) por tipo de venta.
  const iconoTipo = (v: keyof typeof TIPOS_NUEVO, size = 22) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {v === 'accesorio' && (<>
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
        <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
      </>)}
      {v === 'telefono' && (<>
        <rect x="5" y="2" width="14" height="20" rx="2.5" />
        <path d="M11 18h2" />
      </>)}
      {v === 'plan' && <path d="M4 20v-3M9.33 20v-7M14.67 20V9M20 20V4" />}
      {v === 'chip' && (<>
        <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
        <rect x="8" y="11" width="8" height="7" rx="1.2" />
      </>)}
    </svg>
  );

  const tarjetaSx = {
    bgcolor: '#fff', borderRadius: '24px', p: { xs: '22px', sm: '24px' },
    boxShadow: '0 2px 12px rgba(15,27,51,.06)', minWidth: 0,
  };
  const tituloTarjeta = (texto: string) => (
    <Typography sx={{ fontSize: 15, fontWeight: 800, color: NAVY }}>{texto}</Typography>
  );
  const etiqueta = (texto: string) => (
    <Typography sx={{ fontSize: 13, fontWeight: 700, color: GRIS_ETIQUETA, mb: '6px' }}>{texto}</Typography>
  );
  const aviso = (texto: React.ReactNode, key?: string) => (
    <Box key={key} sx={{ bgcolor: '#fff7ed', color: '#9a3412', borderRadius: '14px', px: '14px', py: '12px', fontSize: 13, fontWeight: 600, mt: 1.5 }}>
      {texto}
    </Box>
  );
  const botonSegmento = (activo: boolean, color = AZUL_FOCO) => ({
    height: 44, minWidth: 0, borderRadius: '12px', border: 0, fontSize: 14, fontWeight: 800, textTransform: 'none',
    bgcolor: activo ? color : 'transparent', color: activo ? '#fff' : '#334155',
    boxShadow: activo ? `0 6px 14px -6px ${color}` : 'none',
    '&:hover': { bgcolor: activo ? color : '#e8ecf4' },
    '&.Mui-disabled': { color: '#b4bccb', bgcolor: 'transparent' },
  });
  const segmentado = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', bgcolor: '#f3f5fb', borderRadius: '16px', p: '5px' };
  const botonGrande = (habilitado: boolean, color: string, alto: number, fuente: number) => ({
    height: alto, borderRadius: '999px', fontSize: fuente, fontWeight: 800, textTransform: 'none',
    bgcolor: color, color: '#fff', boxShadow: habilitado ? `0 10px 22px -10px ${color}` : 'none',
    '&:hover': { bgcolor: color, filter: 'brightness(.95)', boxShadow: `0 10px 22px -10px ${color}` },
    '&.Mui-disabled': { bgcolor: '#eceff4', color: '#9aa5b8', boxShadow: 'none' },
  });
  // Estilo de campos MUI dentro de la sección: etiqueta arriba, 52px, radio 16.
  const camposSx = {
    '& .MuiFormLabel-root.MuiInputLabel-root': {
      position: 'relative', transform: 'none', maxWidth: 'none', whiteSpace: 'normal',
      fontSize: 13, fontWeight: 700, color: GRIS_ETIQUETA, mb: '6px', lineHeight: 1.3,
    },
    '& .MuiFormLabel-root.MuiInputLabel-root.Mui-error': { color: '#dc2626' },
    '& .MuiOutlinedInput-root': {
      minHeight: 52, borderRadius: '16px', bgcolor: FONDO_CAMPO, fontSize: 15, fontWeight: 600,
      transition: 'background-color .15s',
    },
    '& .MuiOutlinedInput-root.Mui-focused': { bgcolor: '#fff' },
    '& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': { top: 0, border: `1.5px solid ${BORDE_CAMPO}`, borderRadius: '16px' },
    '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd3e1' },
    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: AZUL_FOCO, borderWidth: '1.5px' },
    '& .MuiOutlinedInput-root.Mui-error .MuiOutlinedInput-notchedOutline': { borderColor: '#dc2626' },
    '& .MuiOutlinedInput-root.Mui-disabled': { bgcolor: '#eef1f6' },
    '& .MuiOutlinedInput-notchedOutline legend': { display: 'none' },
    '& .MuiOutlinedInput-input': { outline: 'none' },
    '& .MuiSelect-icon': { right: 12, color: GRIS_ETIQUETA },
    '& .MuiFormHelperText-root': { fontWeight: 600, mx: 0.5 },
  };

  const esVentaCarrito = tipoVenta === 'accesorio';
  const esVentaTelefono = tipoVenta === 'telefono';
  const colorTipoActual = TIPOS_NUEVO[tipoVenta].color;
  const precioMostrado = promoProductoActual ? precioInventario(productoClave) : precio;
  const totalAgregar = (precioMostrado ?? 0) * (Number.isFinite(cantidad) ? cantidad : 0);
  const totalCarritoBruto = carrito.reduce((a, p) => a + p.precio_unitario * p.cantidad, 0);
  const articulosCarrito = carrito.reduce((a, p) => a + (Number.isFinite(p.cantidad) ? p.cantidad : 0), 0);
  const precioTelefonoNum = Number(telefonoPrecio) || 0;
  const puedeAgregar = !!producto && precio !== null && cantidad > 0;
  const puedeAgregarTelefono = !telefonoEnCarrito && !!telefonoMarca && !!telefonoModelo
    && precioTelefonoNum > 0 && !!telefonoTipo_venta;

  // Mismas validaciones que el diseño actual, en texto para el asesor.
  const sumaDividida = (m: { efectivo: string; tarjeta: string }, total: number) => {
    const ef = parseFloat(m.efectivo);
    const ta = parseFloat(m.tarjeta);
    return !isNaN(ef) && ef > 0 && !isNaN(ta) && ta > 0 && Math.abs(ef + ta - total) < 0.01;
  };
  // Accesorios y teléfono se cobran juntos: un solo carrito y un solo pago.
  const ayudaRegistrar = carrito.length === 0
    ? (esVentaTelefono ? 'Agrega el teléfono al carrito.' : 'Agrega al menos un producto al carrito.')
    : vistaPromo.bloquea ? vistaPromo.avisos[0]
    : !metodoPago ? 'Elige cómo paga el cliente.'
    : metodoPago === 'dividido' && !sumaDividida(montoDividido, totalCarritoBruto) ? 'Efectivo y tarjeta deben sumar el total.'
    : 'Todo listo: registra la venta.';
  const puedeRegistrar = carrito.length > 0 && !!metodoPago && !vistaPromo.bloquea;
  const etiquetaTipoVentaTel: Record<string, string> = { Contado: 'Contado', Paguitos: 'Paguitos', Pajoy: 'PayJoy' };

  const formularioNuevo = disenoNuevo ? (
    <Box sx={{
      fontFamily: FUENTE_NUEVA, bgcolor: '#f3f5fb', borderRadius: '28px', p: { xs: '14px', sm: '22px' },
      '& .MuiTypography-root, & .MuiButtonBase-root, & .MuiInputBase-root, & .MuiFormLabel-root, & .MuiFormHelperText-root, & .MuiAlert-message, & .MuiChip-label, & .MuiFormControlLabel-label': { fontFamily: 'inherit' },
      ...camposSx,
    }}>
      {/* Encabezado */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: '18px' }}>
        <Typography sx={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.6px', whiteSpace: 'nowrap', color: NAVY, lineHeight: 1.15 }}>
          Registrar venta
        </Typography>
        <Box component="span" sx={{ bgcolor: '#fff1e6', color: '#ea580c', fontSize: 12, fontWeight: 800, px: '12px', py: '5px', borderRadius: '999px' }}>
          Nueva
        </Box>
      </Box>

      {mensaje && <Alert severity={mensaje.tipo} sx={{ mb: '18px', borderRadius: '14px' }}>{mensaje.texto}</Alert>}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'flex-start' }}>
        {/* ── Izquierda: ¿qué vendes? ── */}
        <Box sx={{ ...tarjetaSx, flex: '1 1 560px' }}>
          {tituloTarjeta('¿Qué vendes?')}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', mt: 1.5 }}>
            {ORDEN_TIPOS.map((v) => {
              const t = TIPOS_NUEVO[v];
              const activo = tipoVenta === v;
              const elegir = () => { setTipoVenta(v); setMensaje(null); setTelefonoOrigen('telcel'); };
              return (
                <Box key={v} role="button" tabIndex={0} aria-pressed={activo}
                  onClick={elegir}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegir(); } }}
                  sx={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '14px', textAlign: 'left',
                    p: '16px', borderRadius: '20px', border: '2px solid', cursor: 'pointer', userSelect: 'none',
                    transition: 'transform .15s, box-shadow .15s, background-color .15s',
                    bgcolor: activo ? t.color : t.fondo,
                    borderColor: activo ? t.color : t.borde,
                    transform: activo ? 'translateY(-2px)' : 'none',
                    boxShadow: activo ? `0 10px 22px -8px ${t.color}` : 'none',
                    outline: 'none',
                    '&:focus-visible': { boxShadow: `0 0 0 3px ${AZUL_FOCO}55` },
                  }}>
                  <Box sx={{
                    width: 42, height: 42, borderRadius: '14px', display: 'grid', placeItems: 'center',
                    bgcolor: activo ? '#fff' : t.color, color: activo ? t.color : '#fff',
                  }}>{iconoTipo(v)}</Box>
                  <Box>
                    <Typography sx={{ fontSize: 16, fontWeight: 800, color: activo ? '#fff' : t.color, lineHeight: 1.2 }}>{t.label}</Typography>
                    <Typography sx={{ fontSize: 12, color: activo ? 'rgba(255,255,255,.85)' : '#334155', mt: '2px' }}>{t.sub}</Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>

          {esVentaCarrito && promosBoton.length > 0 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', mt: 1.5 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {promosBoton.map((c) => {
                  const activa = promoSel === c;
                  return (
                    <Box key={c} component="button" type="button" aria-pressed={activa}
                      onClick={() => setPromoSel(activa ? null : c)}
                      sx={{
                        fontFamily: 'inherit', cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        width: '100%', height: 56, px: '10px', borderRadius: '14px',
                        fontSize: 16, fontWeight: 800,
                        textAlign: 'center', whiteSpace: 'normal', lineHeight: 1.15,
                        color: activa ? '#fff' : '#C00000',
                        background: activa
                          ? 'linear-gradient(90deg, #C00000 0%, #F97316 100%)'
                          : '#fff',
                        border: activa ? '2px solid transparent' : '2px solid #F97316',
                        boxShadow: activa ? '0 6px 16px rgba(192,0,0,0.45)' : 'none',
                        transition: 'box-shadow 120ms, transform 120ms',
                        '&:active': { transform: 'translateY(1px)' },
                        '& svg': { fontSize: 20, color: activa ? '#fff' : '#C00000', flexShrink: 0 },
                      }}>
                      {activa ? <CheckCircleIcon /> : <LocalOfferIcon />}
                      {etiquetaPromo(c)}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}

          {esVentaCarrito && (
            <Box sx={{ mt: 2.5 }}>
              {selectorProducto}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start', mt: 1 }}>
                <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
                  <TextField label="Precio unitario" type="number" fullWidth size="small" margin="dense"
                    value={promoProductoActual ? (precioInventario(productoClave) ?? '') : (precio ?? '')}
                    disabled={!!promoProductoActual}
                    helperText={promoProductoActual ? `Precio de inventario · ${etiquetaPromo(promoProductoActual)}` : undefined}
                    onChange={promoProductoActual ? undefined : (e) => setPrecio(e.target.value === '' ? null : Number(e.target.value))}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Box component="span" sx={{ fontSize: 17, fontWeight: 800, color: NAVY }}>$</Box></InputAdornment> }}
                    sx={{ '& .MuiOutlinedInput-input': { fontSize: 17, fontWeight: 800 } }} />
                </Box>
                <Box sx={{ flex: '0 1 auto', mt: '8px' }}>
                  {etiqueta('Cantidad')}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', height: 52, boxSizing: 'border-box', px: '5px', borderRadius: '16px', bgcolor: FONDO_CAMPO, border: `1.5px solid ${BORDE_CAMPO}` }}>
                    <Box component="button" type="button" aria-label="Quitar uno" disabled={!(cantidad > 1)}
                      onClick={() => setCantidad((c) => Math.max(1, (Number.isFinite(c) ? c : 1) - 1))}
                      sx={{ width: 40, height: 40, borderRadius: '12px', border: 0, bgcolor: '#fff', color: NAVY, fontSize: 20, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 1px 3px rgba(15,27,51,.08)', '&:disabled': { opacity: 0.45, cursor: 'default' } }}>
                      −
                    </Box>
                    <Box component="input" type="number" aria-label="Cantidad"
                      value={Number.isFinite(cantidad) ? cantidad : ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCantidad(parseInt(e.target.value))}
                      sx={{ width: 48, border: 0, outline: 0, textAlign: 'center', fontFamily: 'inherit', fontWeight: 800, fontSize: 17, color: NAVY, bgcolor: 'transparent',
                        MozAppearance: 'textfield', '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': { WebkitAppearance: 'none', m: 0 } }} />
                    <Box component="button" type="button" aria-label="Agregar uno"
                      onClick={() => setCantidad((c) => (Number.isFinite(c) ? c : 0) + 1)}
                      sx={{ width: 40, height: 40, borderRadius: '12px', border: 0, bgcolor: NAVY, color: '#fff', fontSize: 20, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                      +
                    </Box>
                  </Box>
                </Box>
              </Box>
              <Button fullWidth onClick={agregarAlCarrito} disabled={!puedeAgregar}
                sx={{ ...botonGrande(puedeAgregar, colorTipoActual, 56, 16), mt: 2.5 }}>
                Agregar al carrito · ${fmt(totalAgregar)}
              </Button>
            </Box>
          )}

          {esVentaTelefono && telefonoOrigen !== '' && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ mb: 1 }}>
                {etiqueta('Tipo de venta')}
                <Box sx={segmentado}>
                  {([
                    { v: 'Contado',  t: 'Contado' },
                    { v: 'Paguitos', t: 'Paguitos' },
                    { v: 'Pajoy',    t: 'PayJoy' },
                  ] as const).map((tv) => (
                    <Button key={tv.v} sx={botonSegmento(telefonoTipo_venta === tv.v)}
                      onClick={() => {
                        // Paguitos / PayJoy: el asesor escribe el precio, se vacía al cambiar.
                        if (tv.v !== 'Contado' && tv.v !== telefonoTipo_venta) setTelefonoPrecio('');
                        setTelefonoTipo_venta(tv.v);
                        llenarPrecioContado(telefonoClave, `${telefonoMarca} ${telefonoModelo}`, tv.v);
                      }}>
                      {tv.t}
                    </Button>
                  ))}
                </Box>
              </Box>
              {telefonoEquipo}
              <TextField label="Precio" type="number" value={telefonoPrecio} onChange={(e) => setTelefonoPrecio(e.target.value)}
                fullWidth size="small" margin="dense"
                InputProps={{ startAdornment: <InputAdornment position="start"><Box component="span" sx={{ fontSize: 17, fontWeight: 800, color: NAVY }}>$</Box></InputAdornment> }}
                sx={{ '& .MuiOutlinedInput-input': { fontSize: 17, fontWeight: 800 } }} />
              {telefonoClasifNumero}
              {imeiObligatorio && !telefonoImei.trim() && aviso('El IMEI es obligatorio en este módulo: captúralo y presiona Enter para cargar el equipo.')}
              {telefonoEnCarrito && aviso('Ya hay un teléfono en el carrito: solo se permite 1 por ticket. Quítalo con la × para cambiarlo.')}
              <Button fullWidth onClick={agregarTelefonoAlCarrito} disabled={!puedeAgregarTelefono}
                sx={{ ...botonGrande(puedeAgregarTelefono, colorTipoActual, 56, 16), mt: 2.5 }}>
                Agregar al carrito{precioTelefonoNum > 0 ? ` · $${fmt(precioTelefonoNum)}` : ''}
              </Button>
            </Box>
          )}

          {tipoVenta === 'chip' && <Box sx={{ mt: 2 }}>{bloqueChip}</Box>}
          {tipoVenta === 'plan' && <Box sx={{ mt: 2 }}>{bloquePlan}</Box>}
        </Box>

        {/* ── Derecha: carrito + pago ── */}
        <Box sx={{ flex: '1 1 380px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {(esVentaCarrito || esVentaTelefono) ? (
            <>
              <Box sx={tarjetaSx}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
                  {tituloTarjeta('Carrito')}
                  <Box component="span" sx={{ bgcolor: NAVY, color: '#fff', fontSize: 12, fontWeight: 800, px: '10px', py: '4px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
                    {articulosCarrito} artículo{articulosCarrito === 1 ? '' : 's'}
                  </Box>
                </Box>

                {carrito.length === 0 ? (
                  <Box sx={{ border: `2px dashed ${BORDE_CAMPO}`, borderRadius: '18px', textAlign: 'center', py: 3, px: 2 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 800, color: NAVY }}>Tu carrito está vacío</Typography>
                    <Typography sx={{ fontSize: 12.5, color: GRIS_ETIQUETA, mt: '2px' }}>Elige qué vendes y agrégalo</Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {carrito.map((p, i) => {
                      const original = p.precio_unitario * p.cantidad;
                      const conDescuento = vistaPromo.renglones
                        .filter((r) => r.idx === i)
                        .reduce((s, r) => s + r.cantidad * r.precio_unitario, 0);
                      const tipoRenglon = p.tipo_producto === 'telefono' ? 'telefono' : 'accesorio';
                      return (
                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.2, bgcolor: FONDO_CAMPO, borderRadius: '16px', p: '10px' }}>
                          <Box sx={{ width: 38, height: 38, flexShrink: 0, borderRadius: '12px', display: 'grid', placeItems: 'center', bgcolor: TIPOS_NUEVO[tipoRenglon].color, color: '#fff' }}>
                            {iconoTipo(tipoRenglon, 19)}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: NAVY, wordBreak: 'break-word', lineHeight: 1.25 }}>
                              {p.clave ? `${p.clave} - ` : ''}{p.producto}
                            </Typography>
                            <Typography component="div" sx={{ fontSize: 12, color: GRIS_ETIQUETA }}>
                              {p.cantidad} × ${p.precio_unitario.toFixed(2)}
                              {p.tipo_producto === 'telefono' && p.tipo_venta && ` · ${etiquetaTipoVentaTel[p.tipo_venta] ?? p.tipo_venta}`}
                              {p.tipo_producto === 'telefono' && p.imei && ` · IMEI ${p.imei}`}
                              {p.tipo_producto === 'telefono' && p.monto_recarga != null && ` · Recarga $${p.monto_recarga}`}
                              {p.promocion && (
                                <Chip label={etiquetaPromo(p.promocion)} size="small"
                                  sx={{ height: 18, ml: 0.5, fontSize: 10.5, fontWeight: 800, bgcolor: '#fef3c7', color: '#92400e' }} />
                              )}
                            </Typography>
                          </Box>
                          <Typography component="div" sx={{ fontSize: 14, whiteSpace: 'nowrap', textAlign: 'right', color: NAVY }}>
                            {p.promocion && conDescuento < original - 0.005
                              ? <><s style={{ color: '#94a3b8', fontSize: 12 }}>${original.toFixed(2)}</s><br /><b>${conDescuento.toFixed(2)}</b></>
                              : <b>${original.toFixed(2)}</b>}
                          </Typography>
                          <Box component="button" type="button" aria-label="Quitar del carrito"
                            onClick={() => setCarrito(carrito.filter((_, j) => j !== i))}
                            sx={{ width: 30, height: 30, flexShrink: 0, borderRadius: '10px', border: 0, bgcolor: '#fff', color: '#dc2626', fontSize: 16, fontWeight: 800, cursor: 'pointer', lineHeight: 1, fontFamily: 'inherit', boxShadow: '0 1px 3px rgba(15,27,51,.08)' }}>
                            ×
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                )}
                {vistaPromo.avisos.map((a) => aviso(a, a))}

                <Box sx={{ position: 'relative', overflow: 'hidden', bgcolor: NAVY, borderRadius: '18px', px: '20px', py: '18px', mt: 2 }}>
                  <Box sx={{ position: 'absolute', right: -30, top: -30, width: 110, height: 110, borderRadius: '50%', bgcolor: NARANJA }} />
                  <Box sx={{ position: 'relative' }}>
                    <Typography sx={{ fontSize: 14, color: '#c3cbe0', fontWeight: 600 }}>Total</Typography>
                    <Typography sx={{ fontSize: 30, fontWeight: 800, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.5px' }}>
                      ${fmt(vistaPromo.total)}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={tarjetaSx}>
                {tituloTarjeta('Pago')}
                <Box sx={{ mt: 1.5 }}>
                  {etiqueta('¿Cómo paga el cliente?')}
                  <Box sx={segmentado}>
                    {([
                      { v: 'efectivo', t: 'Efectivo' },
                      { v: 'tarjeta',  t: 'Tarjeta' },
                      { v: 'dividido', t: 'Dividido' },
                    ] as const).map((m) => (
                      <Button key={m.v} disabled={m.v === 'dividido' && carritoConPromo}
                        onClick={() => { setMetodoPago(m.v); setMontoDividido({ efectivo: '', tarjeta: '' }); }}
                        sx={botonSegmento(metodoPago === m.v)}>
                        {m.t}
                      </Button>
                    ))}
                  </Box>
                  {carritoConPromo && (
                    <Typography sx={{ fontSize: 12, color: GRIS_ETIQUETA, mt: 0.75 }}>Dividido no aplica con promociones.</Typography>
                  )}
                </Box>
                {divididoCarrito && <Box sx={{ mt: 1.5 }}>{divididoCarrito}</Box>}

                <Button fullWidth disabled={!puedeRegistrar}
                  onClick={enviarCarritoNuevo}
                  sx={{ ...botonGrande(puedeRegistrar, NARANJA, 60, 17), mt: 2.5, boxShadow: puedeRegistrar ? `0 12px 26px -10px ${NARANJA}` : 'none' }}>
                  Registrar venta
                </Button>
                <Typography sx={{ fontSize: 12, color: GRIS_ETIQUETA, textAlign: 'center', mt: 1 }}>
                  {ayudaRegistrar}
                </Typography>
              </Box>
            </>
          ) : (
            <Box sx={tarjetaSx}>
              {tituloTarjeta('Venta por separado')}
              <Typography sx={{ fontSize: 13, color: GRIS_ETIQUETA, mt: 1 }}>
                {tipoVenta === 'chip' ? 'El chip' : 'El plan'} se registra con su propio botón y no se mezcla con el carrito.
              </Typography>
              {carrito.length > 0 && aviso(<>Tienes {articulosCarrito} artículo{articulosCarrito === 1 ? '' : 's'} en el carrito. Regresa a <b>Accesorio</b> para cobrarlos.</>)}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  ) : null;

  const formularioActual = localStorage.getItem('rol') !== 'admin' ? (
    <Paper sx={{ borderRadius: 2, p: 0, overflow: 'hidden' }}>
      <Box sx={{ px: 2, py: 0.7 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
          {esCadenas ? 'Activaciones' : 'Registrar Venta'}
        </Typography>
      </Box>

      <Box sx={{ borderTop: '1px solid #eef0f3' }} />

      <Box sx={{ px: 2, pt: 1, pb: 2 }}>
      {mensaje && <Alert severity={mensaje.tipo} sx={{ mb: 1.2 }}>{mensaje.texto}</Alert>}

      {!esCadenas && (
        <Grid container spacing={0.8} sx={{ mb: 1, mt: 0.5 }}>
          {[
            { v: 'accesorio', label: 'Accesorio', icon: <HeadphonesIcon />, color: '#7c3aed' },
            { v: 'chip',      label: 'Chip',      icon: <SimCardIcon />,    color: '#16a34a' },
            { v: 'telefono',  label: 'Teléfono',  icon: <SmartphoneIcon />, color: '#0891b2' },
            { v: 'plan',      label: 'Plan',      icon: <DescriptionIcon />, color: '#d97706' },
          ].map((t) => (
            <Grid item xs={3} key={t.v}>
              <Box
                onClick={() => { setTipoVenta(t.v as any); setMensaje(null); setTelefonoOrigen('telcel'); }}
                sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.4,
                  py: 0.8, px: 0.3, borderRadius: 2, cursor: 'pointer', fontWeight: 600,
                  fontSize: { xs: 11, sm: 12.5 }, whiteSpace: 'nowrap',
                  border: tipoVenta === t.v ? '2px solid #7c3aed' : '1px solid #e5e7eb',
                  bgcolor: tipoVenta === t.v ? '#f5f3ff' : '#fff',
                  color: tipoVenta === t.v ? '#7c3aed' : '#374151',
                  transition: 'all .15s',
                  userSelect: 'none',
                  '&:hover': { borderColor: '#7c3aed' },
                }}
              >
                <Box component="span" sx={{ color: t.color, display: 'flex', '& svg': { fontSize: 18 } }}>{t.icon}</Box>
                {t.label}
              </Box>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ── Promos Buen Fin (solo si hay 3X2 / 2DA30 activas) ── */}
      {!esCadenas && tipoVenta === 'accesorio' && promosBoton.length > 0 && botonesPromo}

      {/* ── Accesorio ── */}
      {!esCadenas && tipoVenta === 'accesorio' && (
        <>
          {selectorProducto}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {promoProductoActual
              ? <TextField label="Precio Unitario" type="number" value={precioInventario(productoClave) ?? ''} disabled
                  helperText={`Precio de inventario · ${etiquetaPromo(promoProductoActual)}`} size="small" margin="dense" sx={{ flex: 1 }} />
              : <TextField label="Precio Unitario" type="number" value={precio ?? ''} onChange={(e) => setPrecio(e.target.value === '' ? null : Number(e.target.value))} size="small" margin="dense" sx={{ flex: 1 }} />}
            <TextField label="Cantidad" type="number" value={cantidad} onChange={(e) => setCantidad(parseInt(e.target.value))} size="small" margin="dense" sx={{ width: 110 }} />
          </Box>
          <Button variant="outlined" fullWidth onClick={agregarAlCarrito} disabled={!producto || precio === null || cantidad <= 0}
            sx={{ mt: 0.5, borderRadius: 2, border: '1.5px dashed #c4b5fd', bgcolor: '#faf5ff', color: '#7c3aed', fontWeight: 700, py: 0.7, textTransform: 'none', '&:hover': { bgcolor: '#f3e8ff', border: '1.5px dashed #a78bfa' } }}>
            Agregar al Carrito
          </Button>
          <Box mt={0.5}>
            <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Carrito</Typography>
            {carrito.length === 0
              ? (
                <Box sx={{ textAlign: 'center', py: 0.5, color: '#9ca3af' }}>
                  <ShoppingBagIcon sx={{ fontSize: 26, color: '#cbd5e1', mb: 0.2 }} />
                  <Typography sx={{ fontSize: 12 }}>No hay productos agregados</Typography>
                </Box>
              )
              : <ul style={{ paddingLeft: 16, margin: 0 }}>{carrito.map((p, i) => {
                  const original = p.precio_unitario * p.cantidad;
                  const conDescuento = vistaPromo.renglones
                    .filter((r) => r.idx === i)
                    .reduce((s, r) => s + r.cantidad * r.precio_unitario, 0);
                  return (
                    <li key={i} style={{ marginBottom: 2, fontSize: 13 }}>
                      {p.clave ? `${p.clave} - ` : ''}{p.producto} — {p.cantidad} × ${p.precio_unitario.toFixed(2)}
                      {p.promocion && (
                        <>
                          <Chip label={etiquetaPromo(p.promocion)} size="small"
                            sx={{ height: 18, ml: 0.5, fontSize: 10.5, fontWeight: 700, bgcolor: '#fff7ed', color: '#ea580c' }} />
                          {conDescuento < original - 0.005
                            ? <> <s style={{ color: '#94a3b8' }}>${original.toFixed(2)}</s> <b>${conDescuento.toFixed(2)}</b></>
                            : <> <b>${original.toFixed(2)}</b></>}
                        </>
                      )}
                    </li>
                  );
                })}</ul>}
          </Box>
          {avisosPromo}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc', borderRadius: 2, px: 2, py: 0.5, mt: 0.5 }}>
            <Typography sx={{ fontWeight: 700, color: '#64748b', fontSize: 13, letterSpacing: 0.5 }}>TOTAL</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: 17 }}>${vistaPromo.total.toFixed(2)}</Typography>
          </Box>
          <Divider sx={{ my: 0.5 }} />
          <TextField select label="¿Cómo paga el cliente?" value={metodoPago}
            onChange={(e) => { setMetodoPago(e.target.value); setMontoDividido({ efectivo: '', tarjeta: '' }); }}
            fullWidth size="small" margin="dense" required
            error={carrito.length > 0 && !metodoPago}
            helperText={carrito.length > 0 && !metodoPago ? 'Selecciona el método de pago' : ''}>
            <MenuItem value="efectivo">Efectivo 💵</MenuItem>
            <MenuItem value="tarjeta">Tarjeta 💳</MenuItem>
            <MenuItem value="dividido" disabled={carritoConPromo}>
              {carritoConPromo ? 'Dividido — No aplica con promociones' : 'Dividido 💳💵'}
            </MenuItem>
          </TextField>
          {divididoCarrito}
          <Button variant="contained" fullWidth onClick={enviarCarrito} disabled={carrito.length === 0 || !metodoPago || vistaPromo.bloquea}
            sx={{ mt: 1, borderRadius: 3, bgcolor: '#f97316', color: '#fff', fontWeight: 800, py: 0.9, fontSize: 14, textTransform: 'uppercase', boxShadow: 'none', '&:hover': { bgcolor: '#ea580c' }, '&.Mui-disabled': { bgcolor: '#e5e7eb', color: '#9ca3af' } }}>
            Registrar Venta
          </Button>
        </>
      )}

      {/* ── Chip ── */}
      {(esCadenas || tipoVenta === 'chip') && bloqueChip}

      {/* ── Teléfono ── */}
      {!esCadenas && tipoVenta === 'telefono' && (
        <>
          {telefonoOrigen !== '' && (
          <>
          {telefonoEquipo}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField select label="Tipo" value={telefonoTipo_venta} onChange={(e) => setTelefonoTipo_venta(e.target.value)} fullWidth size="small" margin="dense" sx={{ flex: 1 }}>
              <MenuItem value="Contado">Contado</MenuItem>
              <MenuItem value="Pajoy">Pajoy</MenuItem>
              <MenuItem value="Paguitos">Paguitos</MenuItem>
            </TextField>
            <TextField label="Precio" type="number" value={telefonoPrecio} onChange={(e) => setTelefonoPrecio(e.target.value)} fullWidth size="small" margin="dense" sx={{ flex: 1 }} />
          </Box>
          {telefonoClasifNumero}
          <Divider sx={{ my: 2 }} />
          <TextField select label="¿Cómo paga el cliente?" value={metodoPago}
            onChange={(e) => { setMetodoPago(e.target.value); setMontoDividido({ efectivo: '', tarjeta: '' }); }}
            fullWidth size="small" margin="dense" required>
            <MenuItem value="efectivo">💵 Efectivo</MenuItem>
            <MenuItem value="tarjeta">💳 Tarjeta</MenuItem>
            <MenuItem value="dividido">Dividido 💳💵</MenuItem>
          </TextField>
          {divididoTelefono}
          <Button variant="contained" color="secondary" fullWidth onClick={registrarVentaTelefono}
            disabled={!telefonoMarca || !telefonoModelo || !telefonoTipo_venta || !telefonoPrecio || !metodoPago} sx={{ mt: 2 }}>
            Registrar Venta Teléfono
          </Button>
          </>
          )}
        </>
      )}

      {!esCadenas && tipoVenta === 'plan' && bloquePlan}
      </Box>
    </Paper>
  ) : null;
  const formulario = disenoNuevo ? formularioNuevo : formularioActual;

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
      <Box sx={{ mt: { xs: 1, sm: 1.5 }, px: { xs: 1, sm: 2 } }}>
        {/* Pestañas del asesor proyectadas DENTRO del navbar */}
        {tabsSlot && createPortal(
        <Tabs
          value={tabAsesor}
          onChange={(_, v) => { setTabAsesor(v); if (tabsEnDrawer) window.dispatchEvent(new Event('ato-close-drawer')); }}
          orientation={tabsEnDrawer ? 'vertical' : 'horizontal'}
          variant={tabsEnDrawer ? 'standard' : 'scrollable'}
          scrollButtons={tabsEnDrawer ? false : 'auto'}
          sx={tabsEnDrawer ? {
            '& .MuiTab-root': {
              color: '#334155',
              minHeight: 44,
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              textAlign: 'left',
            },
            '& .MuiTab-root.Mui-selected': { color: '#f97316' },
          } : {
            minHeight: 44,
            '& .MuiTab-root': { color: '#cbd5e1', minHeight: 44 },
            '& .MuiTabs-scrollButtons': { color: '#cbd5e1' },
          }}
          TabIndicatorProps={{ style: { backgroundColor: '#f97316' } }}
        >
          <Tab
            value={0}
            icon={esCadenas ? <ConfirmationNumberIcon sx={{ fontSize: { xs: 14, sm: 18 } }} /> : undefined}
            iconPosition="start"
            label={esCadenas ? 'CAPTURA' : '💰 REGISTRAR VENTA'}
            sx={{ fontWeight: 700, minHeight: 36, fontSize: { xs: 11, sm: 13 }, px: { xs: 1, sm: 2 }, '&.Mui-selected': { color: '#f97316' } }}
          />
          {!esCadenas && (
            <Tab
              value={1}
              label="🧾 TICKETS DE VENTA"
              sx={{ fontWeight: 700, minHeight: 36, fontSize: { xs: 11, sm: 13 }, px: { xs: 1, sm: 2 }, '&.Mui-selected': { color: '#f97316' } }}
            />
          )}
          <Tab
            value={2}
            label={esCadenas ? 'MIS ACTIVACIONES' : 'MIS VENTAS'}
            sx={{ fontWeight: 700, minHeight: 36, fontSize: { xs: 11, sm: 13 }, px: { xs: 1, sm: 2 }, '&.Mui-selected': { color: '#f97316' } }}
          />
          <Tab
            value={3}
            icon={<MonetizationOnIcon sx={{ fontSize: { xs: 14, sm: 18 } }} />}
            iconPosition="start"
            label={esCadenas ? 'LISTA DE COMISIONES' : 'COMISIONES'}
            sx={{ fontWeight: 700, minHeight: 36, fontSize: { xs: 11, sm: 13 }, px: { xs: 1, sm: 2 }, '&.Mui-selected': { color: '#f97316' } }}
          />
          {esCadenas && (
            <Tab
              value={4}
              icon={<AccountBalanceWalletIcon sx={{ fontSize: { xs: 14, sm: 18 } }} />}
              iconPosition="start"
              label="MI SEMANA"
              sx={{ fontWeight: 700, minHeight: 36, fontSize: { xs: 11, sm: 13 }, px: { xs: 1, sm: 2 }, '&.Mui-selected': { color: '#f97316' } }}
            />
          )}
        </Tabs>
        , tabsSlot)}

        {franjaAvance}

        {/* ── Tab TICKET ── */}
        {tabAsesor === 0 && (
          esCadenas ? (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '360px 1.4fr 1.6fr' }, gap: 2, alignItems: 'stretch' }}>
                {(rol as string) !== 'admin' && (
                  <Box>{formulario}</Box>
                )}
                <MiCheckinSemana />
                <MiSemanaPasada />
              </Box>
              {false && (
              <Box sx={{ mt: 2 }}>
            {/* ── Activaciones del día (Cadenas C.) ── */}
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
              </Box>
              )}
            </>
          ) : (
            <Grid container spacing={2} justifyContent="center">
              {(rol as string) !== 'admin' && (
                <Grid item xs={12} md={disenoNuevo ? 12 : 5}>
                  {formulario}
                </Grid>
              )}
              {/* El ranking de módulos se movió a la página ¿CÓMO VAN? (/como-van) */}
              <Grid item xs={12}>
                {false && (
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
                )}
              </Grid>
            </Grid>
          )
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
    <Box sx={{ mt: 0.25, px: { xs: 1, sm: 2 }, maxWidth: '100%', overflowX: 'hidden' }}>
      {/* ── Pestañas del encargado proyectadas DENTRO del navbar ── */}
      {/* Pestañas de encargado: ahora están en el menú lateral (/ventas?tab=...). */}

    {franjaAvance}

    {/* ── Tab TICKET ── */}
    {tabAsesor === 0 && (
    <Grid container spacing={2} justifyContent="center" sx={{ mt: 0 }}>
      {/* Formulario centrado; el ranking vive en ¿CÓMO VAN? */}
      {(rol as string) !== 'admin' && (
        <Grid item xs={12} md={disenoNuevo ? 12 : 9} sx={{ minWidth: 0 }}>
          {formulario}
        </Grid>
      )}

      {/* El ranking de módulos se movió a la página ¿CÓMO VAN? (/como-van) */}

      {/* Fila completa: ventas del día + comisiones (encargado) */}
      {(rol as string) === 'encargado' && (
        <Grid item xs={12}>
              {false && (
              <>
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
              </>
              )}
        </Grid>
      )}

    </Grid>
    )} {/* fin Tab TICKET */}

    {/* ── Tab ASISTENCIA (encargado) ── */}
    {tabAsesor === 7 && !esCadenas && (
      <Box sx={{ mt: 2 }}>
        <TiraAsistenciaSemana />
      </Box>
    )}

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
