import React, { useState, useEffect, useCallback } from 'react';
import { Box } from '@mui/material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import axios from 'axios';

const API = "/api";
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` });

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface CM { cantidad: number; monto: number; }
interface EstData {
  mes: string;
  periodo_texto: string;
  resumen_general: {
    total_telefonos: number;
    total_chips: number;
    total_accesorios: number;
    total_planes: number;
  };
  telefonos: { total: number; contado: CM; payjoy: CM; paguitos: CM; plan?: CM; };
  accesorios: { total_unidades: number; top_5_productos: { producto: string; cantidad: number }[]; top_10_productos: { producto: string; cantidad: number; monto: number }[]; };
  chips: { total: number; por_tipo: { tipo_chip: string; cantidad: number }[]; };
  planes: { total: number; por_plan: { plan: string; cantidad: number }[]; contratos_pendientes: number; contratos_listos: number; };
  por_modulo: { modulo: string; telefonos_total: number; planes: number }[];
  telefonos_top: { modelo: string; cantidad: number }[];
  telefonos_por_dia: { dia: number; cantidad: number }[];
  accesorios_por_dia: { dia: number; promedio: number; total: number }[];
}

interface VentaHoyItem {
  hora: string;
  modulo: string;
  asesor: string;
  producto: string;
  tipo: string;
  cantidad: number;
  hora_raw: string;
}
interface HoyData {
  fecha_texto: string;
  resumen_general: { total_ventas_mxn: number; total_telefonos: number; total_chips: number; total_accesorios: number; };
  accesorios: { monto_total: number };
  por_modulo: any[];
  total_planes_hoy: number;
  ultimas_ventas: VentaHoyItem[];
}

// ── Paleta / constantes ─────────────────────────────────────────────────────────

const BG = '#0d1526';
const CARD = '#16213e';
const ORANGE = '#FF6600';
const GREEN = '#22c55e';
const BLUE = '#3b82f6';
const PURPLE = '#a855f7';
const TEXT_DIM = '#94a3b8';
const MONO = '"Roboto Mono","SF Mono",Menlo,Consolas,monospace';

const N_SCREENS = 8;
const ROTATE_MS = 5000;
const DIRECTOR_MS = 60000; // la pantalla de resumen del director se queda 1 minuto
const RED = '#ef4444';
const duracionPantalla = (i: number) => (i === 0 ? DIRECTOR_MS : ROTATE_MS);
const REFRESH_MS = 60000;

const SCREEN_TITLES = [
  '📱 Teléfonos vendidos',
  '📲 Chips activados',
  '📋 Planes Telcel',
  '📊 Totales del mes',
  '📈 Teléfonos por día',
  '🎧 Accesorios por día',
];

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtN = (n: number) => n.toLocaleString('es-MX');
const fmt$ = (n: number) =>
  `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmt$k = (n: number) => `$${(n / 1000).toFixed(1)}k`;

const weekdayFor = (mes: string, dia: number) => {
  const [y, m] = mes.split('-').map(Number);
  return WEEKDAYS[new Date(y, m - 1, dia).getDay()];
};

// Eje X con número de día arriba y día de la semana abajo
const makeDayTick = (mes: string) =>
  // eslint-disable-next-line react/display-name
  (props: any) => {
    const { x, y, payload } = props;
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={16} textAnchor="middle" fill="#cbd5e1" fontSize={15} fontFamily={MONO}>
          {payload.value}
        </text>
        <text x={0} y={0} dy={34} textAnchor="middle" fill={TEXT_DIM} fontSize={12}>
          {weekdayFor(mes, payload.value)}
        </text>
      </g>
    );
  };

// ── Sub-componentes de presentación ─────────────────────────────────────────────

const ScreenShell: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Box
    sx={{
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      px: '4vw',
      py: '2vh',
    }}
  >
    <Box
      sx={{
        fontSize: 'clamp(22px, 3.2vw, 52px)',
        fontWeight: 800,
        color: ORANGE,
        mb: '2vh',
        letterSpacing: '-0.02em',
        flexShrink: 0,
      }}
    >
      {title}
    </Box>
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      {children}
    </Box>
  </Box>
);

const BigStat: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color = '#fff' }) => (
  <Box sx={{ textAlign: 'center' }}>
    <Box sx={{ fontSize: 'clamp(16px, 1.8vw, 30px)', color: TEXT_DIM, fontWeight: 700, letterSpacing: '0.08em' }}>
      {label}
    </Box>
    <Box
      sx={{
        fontFamily: MONO,
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 800,
        color,
        lineHeight: 1,
        fontSize: 'clamp(60px, 12vw, 220px)',
      }}
    >
      {value}
    </Box>
  </Box>
);

// Barra horizontal (para tops)
const HBar: React.FC<{ label: string; value: number; max: number; color: string; compact?: boolean }> = ({ label, value, max, color, compact = false }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: '1.5vw', mb: compact ? 'clamp(6px, 1vh, 14px)' : '1.4vh' }}>
    <Box
      sx={{
        width: '30%',
        flexShrink: 0,
        fontSize: compact ? 'clamp(13px, 1.4vw, 26px)' : 'clamp(15px, 1.7vw, 30px)',
        fontWeight: 600,
        color: '#e2e8f0',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {label}
    </Box>
    <Box sx={{ flex: 1, height: compact ? 'clamp(20px, 2.6vh, 38px)' : 'clamp(26px, 3.6vh, 48px)', bgcolor: '#0b1220', borderRadius: 1.5, overflow: 'hidden' }}>
      <Box
        sx={{
          height: '100%',
          width: max > 0 ? `${Math.max((value / max) * 100, 2)}%` : '2%',
          bgcolor: color,
          borderRadius: 1.5,
          transition: 'width 0.6s ease',
        }}
      />
    </Box>
    <Box
      sx={{
        width: '3.5ch',
        flexShrink: 0,
        textAlign: 'right',
        fontFamily: MONO,
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 800,
        color,
        fontSize: 'clamp(20px, 2.4vw, 42px)',
      }}
    >
      {fmtN(value)}
    </Box>
  </Box>
);

// Promedio diario de una serie hasta el día `d` (incluye días en cero)
const promedioHasta = (serie: { dia: number }[], d: number, campo: string) => {
  if (d <= 0) return 0;
  const suma = serie.filter((x) => x.dia <= d).reduce((t, x: any) => t + Number(x[campo] ?? 0), 0);
  return suma / d;
};

// Flechita: compara el promedio de días cerrados (hasta ayer) contra el de anteayer
const Tendencia: React.FC<{ actual: number; anterior: number | null; dinero?: boolean }> = ({ actual, anterior, dinero = false }) => {
  if (anterior === null) {
    return <Box sx={{ fontSize: 'clamp(12px,1.2vw,22px)', color: TEXT_DIM }}>sin día anterior</Box>;
  }
  const diff = actual - anterior;
  const igual = Math.abs(diff) < 0.05;
  const color = igual ? TEXT_DIM : diff > 0 ? GREEN : RED;
  const flecha = igual ? '＝' : diff > 0 ? '▲' : '▼';
  const txt = dinero ? fmt$(Math.abs(diff)) : Math.abs(diff).toFixed(1);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5vw', color, fontWeight: 800 }}>
      <Box sx={{ fontSize: 'clamp(20px,2.4vw,46px)', lineHeight: 1 }}>{flecha}</Box>
      <Box sx={{ fontFamily: MONO, fontSize: 'clamp(14px,1.5vw,28px)' }}>
        {igual ? 'igual' : `${diff > 0 ? '+' : '-'}${txt}`}
      </Box>
      <Box sx={{ fontSize: 'clamp(11px,1.1vw,20px)', color: TEXT_DIM, fontWeight: 600 }}>vs día anterior</Box>
    </Box>
  );
};

// ── Componente principal ─────────────────────────────────────────────────────────

const PantallaTVPage: React.FC = () => {
  const [mes] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [data, setData] = useState<EstData | null>(null);
  const [dataHoy, setDataHoy] = useState<HoyData | null>(null);
  const [screen, setScreen] = useState(0);
  const [reloj, setReloj] = useState<Date>(() => new Date());

  const cargar = useCallback(async (mesParam: string) => {
    try {
      const { data: resp } = await axios.get<EstData>(
        `${API}/direccion/estadisticas`,
        { headers: authH(), params: { mes: mesParam } },
      );
      setData(resp);
    } catch {
      /* mantiene los datos previos en pantalla si falla el refresco */
    }
    try {
      const { data: respHoy } = await axios.get<HoyData>(
        `${API}/direccion/tiempo-real`,
        { headers: authH() },
      );
      setDataHoy(respHoy);
    } catch {
      /* idem: conserva lo anterior si el refresco de hoy falla */
    }
  }, []);

  // Carga inicial + refresco cada 60s
  useEffect(() => {
    cargar(mes);
    const id = setInterval(() => cargar(mes), REFRESH_MS);
    return () => clearInterval(id);
  }, [mes, cargar]);

  // Rotación: el resumen del director dura 1 min, las demás 5s
  useEffect(() => {
    const id = setTimeout(() => setScreen((s) => (s + 1) % N_SCREENS), duracionPantalla(screen));
    return () => clearTimeout(id);
  }, [screen]);

  // Reloj
  useEffect(() => {
    const id = setInterval(() => setReloj(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Pantalla 0 · VENTAS DE HOY (tiempo real) ──────────────────────────────
  const renderHoy = () => {
    if (!dataHoy) {
      return (
        <ScreenShell title="🟢 VENTAS DE HOY">
          <BigStat label="CONECTANDO" value="…" color={TEXT_DIM} />
        </ScreenShell>
      );
    }
    const rg = dataHoy.resumen_general;
    const uv = dataHoy.ultimas_ventas ?? [];
    const metricas: { l: string; v: string; c: string; sub?: string }[] = [
      { l: 'TELÉFONOS', v: fmtN(rg.total_telefonos), c: ORANGE },
      { l: 'CHIPS', v: fmtN(rg.total_chips), c: BLUE },
      { l: 'ACCESORIOS', v: fmt$(dataHoy.accesorios.monto_total), c: '#a855f7' },
      { l: 'PLANES', v: fmtN(dataHoy.total_planes_hoy), c: GREEN },
      { l: 'MÓDULOS', v: fmtN(dataHoy.por_modulo?.length ?? 0), c: '#22d3ee', sub: 'vendieron hoy' },
    ];

    const mins = (() => {
      if (uv.length === 0 || !uv[0].hora_raw) return null;
      const p = uv[0].hora_raw.split(':').map(Number);
      const v = new Date(reloj);
      v.setHours(p[0] || 0, p[1] || 0, p[2] || 0, 0);
      const diff = Math.floor((reloj.getTime() - v.getTime()) / 60000);
      return diff < 0 ? 0 : diff;
    })();
    const desdeTxt =
      mins === null ? 'sin ventas aún'
      : mins < 60 ? `hace ${mins} min`
      : `hace ${Math.floor(mins / 60)}h ${mins % 60}m`;

    return (
      <ScreenShell title={`🟢 VENTAS DE HOY · ${dataHoy.fecha_texto}`}>
        {/* MÉTRICAS */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.2vw' }}>
          {metricas.map((m) => (
            <Box
              key={m.l}
              sx={{
                textAlign: 'center',
                bgcolor: CARD,
                border: `2px solid ${m.c}44`,
                borderRadius: 3,
                py: '2.2vh',
                px: '0.3vw',
                overflow: 'hidden',
              }}
            >
              <Box sx={{ fontSize: 'clamp(12px, 1.4vw, 28px)', color: m.c, fontWeight: 700, letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
                {m.l}
              </Box>
              <Box
                sx={{
                  fontFamily: MONO,
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 800,
                  color: m.c,
                  fontSize: 'clamp(30px, 4.3vw, 88px)',
                  lineHeight: 1.05,
                  whiteSpace: 'nowrap',
                }}
              >
                {m.v}
              </Box>
              <Box sx={{ fontSize: 'clamp(10px, 1vw, 18px)', color: TEXT_DIM, whiteSpace: 'nowrap' }}>
                {m.sub ?? ' '}
              </Box>
            </Box>
          ))}
        </Box>

        {/* EN VIVO + tiempo desde la última venta */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.4vw', mt: '3vh', mb: '2vh', flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.6vw' }}>
            <Box
              sx={{
                width: 'clamp(12px,1.1vw,20px)',
                height: 'clamp(12px,1.1vw,20px)',
                borderRadius: '50%',
                bgcolor: GREEN,
                boxShadow: `0 0 12px ${GREEN}`,
                '@keyframes tvpulse2': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } },
                animation: 'tvpulse2 1.6s ease-in-out infinite',
              }}
            />
            <Box sx={{ fontSize: 'clamp(14px,1.5vw,28px)', fontWeight: 800, color: GREEN, letterSpacing: '0.06em' }}>EN VIVO</Box>
          </Box>
          <Box sx={{ fontFamily: MONO, fontWeight: 800, color: '#fff', fontSize: 'clamp(24px, 3.4vw, 68px)', lineHeight: 1 }}>
            {desdeTxt}
          </Box>
          <Box sx={{ fontSize: 'clamp(12px,1.3vw,24px)', color: TEXT_DIM }}>desde la última venta</Box>
        </Box>

        {/* ÚLTIMAS VENTAS */}
        <Box>
          <Box sx={{ fontSize: 'clamp(13px,1.5vw,28px)', color: TEXT_DIM, fontWeight: 700, mb: '1vh', letterSpacing: '0.06em' }}>
            ÚLTIMAS VENTAS
          </Box>
          {uv.length === 0 && (
            <Box sx={{ textAlign: 'center', color: TEXT_DIM, fontSize: 'clamp(16px,2vw,30px)' }}>Aún no hay ventas hoy</Box>
          )}
          {uv.slice(0, 5).map((v, i) => {
            const esTel = v.tipo === 'telefono';
            const acc = esTel ? ORANGE : '#a855f7';
            return (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.4vw',
                  bgcolor: CARD,
                  borderLeft: `7px solid ${acc}`,
                  borderRadius: 2,
                  px: '1.4vw',
                  py: '1vh',
                  mb: '0.9vh',
                }}
              >
                <Box sx={{ fontFamily: MONO, fontVariantNumeric: 'tabular-nums', color: acc, fontWeight: 800, fontSize: 'clamp(16px,1.9vw,36px)', flexShrink: 0 }}>
                  {v.hora}
                </Box>
                <Box sx={{ fontWeight: 800, fontSize: 'clamp(14px,1.6vw,32px)', color: '#fff', flexShrink: 0, minWidth: '7ch' }}>
                  {v.modulo}
                </Box>
                <Box sx={{ flex: 1, fontSize: 'clamp(13px,1.5vw,30px)', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {v.producto}
                </Box>
                <Box sx={{ fontSize: 'clamp(12px,1.3vw,26px)', color: TEXT_DIM, flexShrink: 0 }}>
                  {v.asesor}
                </Box>
                <Box sx={{ fontSize: 'clamp(10px,1.1vw,20px)', fontWeight: 800, color: acc, bgcolor: `${acc}22`, borderRadius: 1, px: '0.7vw', py: '0.3vh', flexShrink: 0, textTransform: 'uppercase' }}>
                  {esTel ? 'Tel' : 'Acc'}
                </Box>
              </Box>
            );
          })}
        </Box>
      </ScreenShell>
    );
  };

  // ── Pantalla 0 · RESUMEN DEL DIRECTOR (fija 1 minuto) ──────────────────────
  const renderDirector = () => {
    if (!data) {
      return (
        <ScreenShell title="📊 RESUMEN DEL MES">
          <BigStat label="CONECTANDO" value="…" color={TEXT_DIM} />
        </ScreenShell>
      );
    }
    const hoy = new Date().getDate();
    const cerrados = hoy - 1; // días completos (sin contar hoy)
    const telDia = data.telefonos_por_dia ?? [];
    const accDia = data.accesorios_por_dia ?? [];

    const telProm = promedioHasta(telDia, cerrados, 'cantidad');
    const telPromAnt = cerrados >= 2 ? promedioHasta(telDia, cerrados - 1, 'cantidad') : null;
    const accProm = promedioHasta(accDia, cerrados, 'total');
    const accPromAnt = cerrados >= 2 ? promedioHasta(accDia, cerrados - 1, 'total') : null;
    const accMonto = accDia.reduce((t, x) => t + Number(x.total ?? 0), 0);

    const tipos = [...(data.chips.por_tipo ?? [])].sort((a, b) => b.cantidad - a.cantidad);

    const desglose = [
      { l: 'CONTADO', v: data.telefonos.contado.cantidad, c: GREEN },
      { l: 'PAYJOY', v: data.telefonos.payjoy.cantidad, c: ORANGE },
      { l: 'PAGUITOS', v: data.telefonos.paguitos.cantidad, c: BLUE },
      { l: 'PLANES', v: data.telefonos.plan?.cantidad ?? 0, c: PURPLE },
    ];

    const card = (c: string) => ({
      bgcolor: CARD,
      border: `2px solid ${c}55`,
      borderRadius: 3,
      textAlign: 'center' as const,
      py: '1.6vh',
      px: '0.8vw',
    });
    const etiqueta = (c: string) => ({ fontSize: 'clamp(13px,1.4vw,26px)', color: c, fontWeight: 700, letterSpacing: '0.05em' });
    const numero = (c: string, size: string) => ({
      fontFamily: MONO,
      fontVariantNumeric: 'tabular-nums',
      fontWeight: 800,
      color: c,
      lineHeight: 1.05,
      fontSize: size,
    });

    return (
      <ScreenShell title="📊 RESUMEN DEL MES">
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1.8vh', height: '100%', justifyContent: 'center' }}>
          {/* FILA 1 · TELÉFONOS */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1.4fr repeat(4, 1fr)', gap: '1vw' }}>
            <Box sx={card(ORANGE)}>
              <Box sx={etiqueta(ORANGE)}>📱 TELÉFONOS</Box>
              <Box sx={numero('#fff', 'clamp(44px,6.5vw,130px)')}>{fmtN(data.telefonos.total)}</Box>
              <Box sx={{ fontSize: 'clamp(12px,1.2vw,22px)', color: TEXT_DIM, mt: '0.5vh' }}>
                Promedio diario: <b style={{ color: '#fff' }}>{telProm.toFixed(1)}</b>
              </Box>
              <Tendencia actual={telProm} anterior={telPromAnt} />
            </Box>
            {desglose.map((d) => (
              <Box key={d.l} sx={{ ...card(d.c), display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Box sx={etiqueta(d.c)}>{d.l}</Box>
                <Box sx={numero(d.c, 'clamp(36px,5vw,100px)')}>{fmtN(d.v)}</Box>
              </Box>
            ))}
          </Box>

          {/* FILA 2 · ACCESORIOS */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1vw' }}>
            <Box sx={card(PURPLE)}>
              <Box sx={etiqueta(PURPLE)}>🎧 ACCESORIOS · VENTA DEL MES</Box>
              <Box sx={numero(PURPLE, 'clamp(36px,5vw,100px)')}>{fmt$(accMonto)}</Box>
            </Box>
            <Box sx={card(PURPLE)}>
              <Box sx={etiqueta(PURPLE)}>PIEZAS</Box>
              <Box sx={numero('#fff', 'clamp(36px,5vw,100px)')}>{fmtN(data.accesorios.total_unidades)}</Box>
            </Box>
            <Box sx={card(PURPLE)}>
              <Box sx={etiqueta(PURPLE)}>PROMEDIO DIARIO</Box>
              <Box sx={numero('#fff', 'clamp(32px,4.4vw,88px)')}>{fmt$(accProm)}</Box>
              <Tendencia actual={accProm} anterior={accPromAnt} dinero />
            </Box>
          </Box>

          {/* FILA 3 · CHIPS (informativo) */}
          <Box sx={{ ...card(BLUE), display: 'flex', alignItems: 'center', gap: '1.5vw', textAlign: 'left', flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '0.8vw', flexShrink: 0 }}>
              <Box sx={etiqueta(BLUE)}>📲 CHIPS</Box>
              <Box sx={numero(BLUE, 'clamp(30px,4vw,80px)')}>{fmtN(data.chips.total)}</Box>
            </Box>
            <Box sx={{ display: 'flex', gap: '0.8vw', flexWrap: 'wrap' }}>
              {tipos.map((t) => (
                <Box
                  key={t.tipo_chip}
                  sx={{
                    bgcolor: `${BLUE}22`,
                    border: `1px solid ${BLUE}55`,
                    borderRadius: 2,
                    px: '0.9vw',
                    py: '0.6vh',
                    fontSize: 'clamp(13px,1.4vw,26px)',
                    color: '#e2e8f0',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.tipo_chip}: <b style={{ color: '#fff', fontFamily: MONO }}>{fmtN(t.cantidad)}</b>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </ScreenShell>
    );
  };

  const renderScreen = () => {
    if (screen === 0) return renderDirector();
    if (screen === 1) return renderHoy();

    if (!data) {
      return (
        <ScreenShell title="Cargando…">
          <BigStat label="CONECTANDO" value="…" color={TEXT_DIM} />
        </ScreenShell>
      );
    }

    switch (screen - 2) {
      // 1 · TELÉFONOS
      case 0:
        return (
          <ScreenShell title={SCREEN_TITLES[0]}>
            <BigStat label="TOTAL DEL MES" value={fmtN(data.telefonos.total)} color="#fff" />
            <Box sx={{ display: 'flex', gap: '1.4vw', mt: '3.5vh', justifyContent: 'center' }}>
              {[
                { l: 'Contado', v: data.telefonos.contado.cantidad, c: GREEN },
                { l: 'PayJoy', v: data.telefonos.payjoy.cantidad, c: ORANGE },
                { l: 'Paguitos', v: data.telefonos.paguitos.cantidad, c: BLUE },
                { l: 'Planes', v: data.telefonos.plan?.cantidad ?? 0, c: PURPLE },
              ].map((s) => (
                <Box
                  key={s.l}
                  sx={{
                    flex: 1,
                    maxWidth: '23%',
                    textAlign: 'center',
                    bgcolor: CARD,
                    border: `2px solid ${s.c}55`,
                    borderRadius: 3,
                    py: '2.6vh',
                  }}
                >
                  <Box sx={{ fontSize: 'clamp(14px, 1.5vw, 27px)', color: s.c, fontWeight: 700 }}>{s.l}</Box>
                  <Box
                    sx={{
                      fontFamily: MONO,
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 800,
                      color: s.c,
                      fontSize: 'clamp(36px, 5.4vw, 100px)',
                      lineHeight: 1,
                    }}
                  >
                    {fmtN(s.v)}
                  </Box>
                </Box>
              ))}
            </Box>
          </ScreenShell>
        );

      // 2 · CHIPS
      case 1: {
        const tipos = data.chips.por_tipo ?? [];
        const maxT = tipos.reduce((m, t) => Math.max(m, t.cantidad), 0);
        return (
          <ScreenShell title={SCREEN_TITLES[1]}>
            <BigStat label="CHIPS ACTIVADOS" value={fmtN(data.chips.total)} color={BLUE} />
            <Box sx={{ mt: '4vh' }}>
              {tipos.length === 0 && (
                <Box sx={{ textAlign: 'center', color: TEXT_DIM, fontSize: 'clamp(18px,2vw,32px)' }}>Sin datos</Box>
              )}
              {tipos.map((t) => (
                <HBar key={t.tipo_chip} label={t.tipo_chip} value={t.cantidad} max={maxT} color={BLUE} />
              ))}
            </Box>
          </ScreenShell>
        );
      }

      // 3 · PLANES
      case 2: {
        const find = (kw: string) =>
          (data.planes.por_plan ?? []).find((p) => p.plan.toLowerCase().includes(kw))?.cantidad ?? 0;
        const libre = find('libre');
        const forzoso = find('forzoso');
        const pendientes = data.planes.contratos_pendientes ?? 0;
        const cuadros: { l: string; v: number; c: string; sub?: string }[] = [
          { l: 'LIBRE', v: libre, c: GREEN },
          { l: 'FORZOSO', v: forzoso, c: ORANGE },
          { l: 'CONTRATOS PENDIENTES', v: pendientes, c: '#ff4d4f', sub: 'por enviar' },
        ];
        return (
          <ScreenShell title={SCREEN_TITLES[2]}>
            <BigStat label="PLANES DEL MES" value={fmtN(data.planes.total)} color={ORANGE} />
            <Box sx={{ display: 'flex', gap: '2vw', mt: '5vh', justifyContent: 'center' }}>
              {cuadros.map((s) => (
                <Box
                  key={s.l}
                  sx={{
                    flex: 1,
                    maxWidth: '32%',
                    textAlign: 'center',
                    bgcolor: CARD,
                    border: `2px solid ${s.c}55`,
                    borderRadius: 3,
                    py: '4vh',
                  }}
                >
                  <Box sx={{ fontSize: 'clamp(16px, 1.8vw, 34px)', color: s.c, fontWeight: 700, letterSpacing: '0.06em', minHeight: '2.4em', display: 'flex', alignItems: 'center', justifyContent: 'center', px: '0.5vw' }}>
                    {s.l}
                  </Box>
                  <Box
                    sx={{
                      fontFamily: MONO,
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 800,
                      color: s.c,
                      fontSize: 'clamp(56px, 10vw, 170px)',
                      lineHeight: 1,
                    }}
                  >
                    {fmtN(s.v)}
                  </Box>
                  {s.sub && (
                    <Box sx={{ fontSize: 'clamp(13px, 1.4vw, 26px)', color: s.c, fontWeight: 600, mt: '1vh' }}>
                      {s.sub}
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          </ScreenShell>
        );
      }

      // 4 · TOTALES DEL MES
      case 3:
        return (
          <ScreenShell title={SCREEN_TITLES[3]}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '2.5vw',
                alignContent: 'center',
                height: '100%',
              }}
            >
              {[
                { l: 'TELÉFONOS', v: data.resumen_general.total_telefonos, c: ORANGE },
                { l: 'CHIPS', v: data.resumen_general.total_chips, c: BLUE },
                { l: 'PLANES', v: data.resumen_general.total_planes, c: GREEN },
                { l: 'ACCESORIOS (u)', v: data.accesorios.total_unidades, c: '#a855f7' },
              ].map((s) => (
                <Box
                  key={s.l}
                  sx={{
                    textAlign: 'center',
                    bgcolor: CARD,
                    border: `2px solid ${s.c}44`,
                    borderRadius: 3,
                    py: '3vh',
                  }}
                >
                  <Box sx={{ fontSize: 'clamp(16px, 1.8vw, 32px)', color: s.c, fontWeight: 700, letterSpacing: '0.06em' }}>
                    {s.l}
                  </Box>
                  <Box
                    sx={{
                      fontFamily: MONO,
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 800,
                      color: '#fff',
                      fontSize: 'clamp(50px, 9vw, 150px)',
                      lineHeight: 1,
                    }}
                  >
                    {fmtN(s.v)}
                  </Box>
                </Box>
              ))}
            </Box>
          </ScreenShell>
        );

      // 5 · TELÉFONOS POR DÍA
      case 4: {
        const hoy = new Date().getDate();
        const serie = (data.telefonos_por_dia ?? []).filter((x) => x.dia <= hoy);
        const cantidadHoy = serie.find((x) => x.dia === hoy)?.cantidad ?? 0;
        return (
          <ScreenShell title={SCREEN_TITLES[4]}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '1vw', flexShrink: 0, mb: '1vh' }}>
              <Box
                sx={{
                  fontFamily: MONO,
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 800,
                  color: ORANGE,
                  lineHeight: 1,
                  fontSize: 'clamp(34px, 5vw, 96px)',
                }}
              >
                {fmtN(cantidadHoy)}
              </Box>
              <Box sx={{ fontSize: 'clamp(16px, 1.8vw, 30px)', color: TEXT_DIM, fontWeight: 700, letterSpacing: '0.08em' }}>
                hoy
              </Box>
            </Box>
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={serie} margin={{ top: 42, right: 30, left: 10, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="dia" tick={makeDayTick(data.mes)} interval={0} height={50} stroke="#334155" />
                  <YAxis tick={{ fontSize: 15, fill: '#cbd5e1', fontFamily: MONO }} stroke="#334155" allowDecimals={false} />
                  <Line
                    type="monotone"
                    dataKey="cantidad"
                    stroke={ORANGE}
                    strokeWidth={4}
                    dot={{ fill: ORANGE, r: 4 }}
                    activeDot={{ r: 8 }}
                    isAnimationActive={false}
                    label={{ position: "top", fill: "#fff", fontSize: 20, fontWeight: 800, offset: 16 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </ScreenShell>
        );
      }

      // 6 · ACCESORIOS POR DÍA
      case 5: {
        const hoy = new Date().getDate();
        const serie = (data.accesorios_por_dia ?? []).filter((x) => x.dia <= hoy);
        const totalHoy = serie.find((x) => x.dia === hoy)?.total ?? 0;
        return (
          <ScreenShell title={SCREEN_TITLES[5]}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '1vw', flexShrink: 0 }}>
              <Box
                sx={{
                  fontFamily: MONO,
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 800,
                  color: '#a855f7',
                  lineHeight: 1,
                  fontSize: 'clamp(34px, 5vw, 96px)',
                }}
              >
                {fmt$k(totalHoy)}
              </Box>
              <Box sx={{ fontSize: 'clamp(16px, 1.8vw, 30px)', color: TEXT_DIM, fontWeight: 700, letterSpacing: '0.08em' }}>
                hoy
              </Box>
            </Box>
            <Box sx={{ mb: '1vh', fontSize: 'clamp(14px,1.5vw,26px)', color: TEXT_DIM }}>
              Total por día
            </Box>
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={serie} margin={{ top: 42, right: 30, left: 20, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="dia" tick={makeDayTick(data.mes)} interval={0} height={50} stroke="#334155" />
                  <YAxis
                    tick={{ fontSize: 15, fill: '#cbd5e1', fontFamily: MONO }}
                    stroke="#334155"
                    tickFormatter={(v) => fmt$(Number(v))}
                    width={90}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#a855f7"
                    strokeWidth={4}
                    dot={{ fill: '#a855f7', r: 4 }}
                    activeDot={{ r: 8 }}
                    isAnimationActive={false}
                    label={{ position: "top", fill: "#fff", fontSize: 19, fontWeight: 800, offset: 16,
                             formatter: (v: any) => fmt$k(Number(v)) }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </ScreenShell>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        bgcolor: BG,
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <Box
        sx={{
          flexShrink: 0,
          height: '10vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: '4vw',
          borderBottom: `2px solid ${CARD}`,
          bgcolor: '#0b1220',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '1.2vw' }}>
          <Box sx={{ fontSize: 'clamp(30px, 4vw, 70px)', fontWeight: 900, color: ORANGE, letterSpacing: '0.04em' }}>
            ATO
          </Box>
          {data && (
            <Box sx={{ fontSize: 'clamp(14px, 1.6vw, 28px)', color: TEXT_DIM, fontWeight: 600 }}>
              {data.periodo_texto}
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: '2vw' }}>
          {/* EN VIVO */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.6vw' }}>
            <Box
              sx={{
                width: 'clamp(12px, 1.2vw, 22px)',
                height: 'clamp(12px, 1.2vw, 22px)',
                borderRadius: '50%',
                bgcolor: GREEN,
                boxShadow: `0 0 12px ${GREEN}`,
                '@keyframes tvpulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } },
                animation: 'tvpulse 1.6s ease-in-out infinite',
              }}
            />
            <Box sx={{ fontSize: 'clamp(14px, 1.6vw, 28px)', fontWeight: 800, color: GREEN, letterSpacing: '0.06em' }}>
              EN VIVO
            </Box>
          </Box>
          {/* Reloj */}
          <Box
            sx={{
              fontFamily: MONO,
              fontVariantNumeric: 'tabular-nums',
              fontSize: 'clamp(22px, 2.6vw, 48px)',
              fontWeight: 700,
              color: '#fff',
            }}
          >
            {reloj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </Box>
        </Box>
      </Box>

      {/* ── CONTENIDO ──────────────────────────────────────────────────────── */}
      {renderScreen()}

      {/* ── FOOTER: progreso + indicadores ─────────────────────────────────── */}
      <Box sx={{ flexShrink: 0, bgcolor: '#0b1220', borderTop: `2px solid ${CARD}` }}>
        {/* Barra de progreso (1 min en el resumen, 5s en las demás; se reinicia con la key) */}
        <Box sx={{ height: 'clamp(5px, 0.7vh, 9px)', bgcolor: '#111a2e', overflow: 'hidden' }}>
          <Box
            key={screen}
            sx={{
              height: '100%',
              bgcolor: ORANGE,
              '@keyframes tvprogress': { from: { width: '0%' }, to: { width: '100%' } },
              animation: `tvprogress ${duracionPantalla(screen)}ms linear`,
            }}
          />
        </Box>
        {/* Puntos indicadores */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1vw', py: '1.4vh' }}>
          {Array.from({ length: N_SCREENS }).map((_, i) => (
            <Box
              key={i}
              sx={{
                width: i === screen ? 'clamp(22px, 2.4vw, 44px)' : 'clamp(10px, 1vw, 18px)',
                height: 'clamp(10px, 1vw, 18px)',
                borderRadius: 999,
                bgcolor: i === screen ? ORANGE : '#334155',
                transition: 'width 0.3s ease, background-color 0.3s ease',
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default PantallaTVPage;
