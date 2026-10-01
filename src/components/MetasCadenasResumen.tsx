import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Box, CircularProgress, Collapse, Grid, Paper, Typography } from '@mui/material';
import axios from 'axios';

const API = 'https://ato-appservidor-nvxt.onrender.com';

// Misma paleta que ContadorMetasCadenas: claro = subidas, fuerte = validadas.
const DORADO = '#eab308';
const DORADO_CLARO = '#fde68a';
const AZUL = '#2563eb';
const ESMERALDA = '#059669';
const PISTA = '#e2e8f0';
const ROJO = '#dc2626';
const NARANJA = '#f97316';
const GRIS_TEXTO = '#64748b';
const GANADO_FONDO = '#ecfdf5';

const REFRESCO_MS = 2 * 60 * 1000;

type Conteo = { subidas: number; validadas: number; meta: number | null; cumplida: boolean };

type Promotor = {
  usuario_id: number;
  nombre: string;
  subidas_dia: number;
  validadas_dia: number;
  subidas_mes: number;
  validadas_mes: number;
  participacion_mes_pct: number;
  bolsa: number;
};

type SemanaTienda = { numero: number; estado: 'cerrada' | 'en_curso' | 'pendiente'; validadas: number; cumplida: boolean };

type Tienda = {
  tienda_id: number;
  tienda: string;
  cadena: string;
  dia: Conteo;
  semana: (Conteo & { numero: number }) | null;
  mes: Conteo;
  dias_cumplidos: number;
  semanas: SemanaTienda[];
  bolsa_acumulada: number;
  promotores: Promotor[];
};

type Respuesta = {
  fecha: string;
  semana: { numero: number; inicio: string; fin: string } | null;
  tiendas: Tienda[];
};

type Orden = 'cadena' | 'avance' | 'rezago';

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const aPct = (v: unknown, meta: unknown) => {
  const m = num(meta);
  return m > 0 ? Math.min(100, Math.max(0, (num(v) / m) * 100)) : 0;
};

const dinero = (v: unknown) => `$${num(v).toLocaleString('es-MX', { maximumFractionDigits: 2 })}`;

const pctTexto = (v: number) => `${Math.floor(v)}%`;

const fechaCorta = (iso?: string | null) => {
  if (!iso) return '';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
};

const mensajeError = (err: any) => {
  if (err?.response?.status === 403) return 'No tienes permiso para ver el resumen de cadenas.';
  const detail = err?.response?.data?.detail;
  return typeof detail === 'string' ? detail : 'No se pudo cargar el resumen de cadenas.';
};

/** Barra compacta de dos tonos para la tarjeta de tienda. */
function BarraMini({ titulo, conteo }: { titulo: string; conteo: Conteo | null }) {
  if (!conteo) {
    return (
      <Box>
        <Typography sx={{ fontSize: 11, fontWeight: 800, color: 'text.secondary' }}>{titulo}</Typography>
        <Typography sx={{ fontSize: 11, color: GRIS_TEXTO }}>Del 29 en adelante no hay semana</Typography>
      </Box>
    );
  }
  const subidas = num(conteo.subidas);
  const validadas = num(conteo.validadas);
  const cumplida = conteo.cumplida === true;
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Typography sx={{ fontSize: 11, fontWeight: 800, color: 'text.secondary' }}>{titulo}</Typography>
        <Typography sx={{ fontSize: 12, fontWeight: 800 }}>
          {subidas} / {conteo.meta ?? '—'}
          <Box component="span" sx={{ fontSize: 10, fontWeight: 700, color: cumplida ? ESMERALDA : GRIS_TEXTO, ml: 0.5 }}>
            ({validadas} val.)
          </Box>
        </Typography>
      </Box>
      <Box sx={{ position: 'relative', height: 10, borderRadius: 5, bgcolor: PISTA, overflow: 'hidden', mt: 0.25 }}>
        <Box sx={{ position: 'absolute', inset: 0, width: `${aPct(subidas, conteo.meta)}%`, bgcolor: DORADO_CLARO }} />
        <Box
          sx={{
            position: 'absolute', inset: 0,
            width: `${aPct(validadas, conteo.meta)}%`,
            bgcolor: cumplida ? ESMERALDA : DORADO,
          }}
        />
      </Box>
    </Box>
  );
}

function TarjetaTienda({ t, etiquetaSemana }: { t: Tienda; etiquetaSemana: string }) {
  const [abierta, setAbierta] = useState(false);
  const cumpleHoy = t.dia?.cumplida === true;
  const avanceMes = aPct(t.mes?.subidas, t.mes?.meta);
  const faltanMes = Math.max(0, num(t.mes?.meta) - num(t.mes?.validadas));
  const promotores = Array.isArray(t.promotores) ? t.promotores : [];
  const semanas = Array.isArray(t.semanas) ? t.semanas : [];

  return (
    <Paper sx={{ p: 2, height: '100%', borderTop: `4px solid ${cumpleHoy ? ESMERALDA : ROJO}` }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 16, lineHeight: 1.2, minWidth: 0 }} noWrap title={t.tienda}>
          {t.tienda}
        </Typography>
        <Typography sx={{ fontSize: 11, fontWeight: 800, color: cumpleHoy ? ESMERALDA : GRIS_TEXTO, whiteSpace: 'nowrap' }}>
          {cumpleHoy ? 'HOY ✓' : 'HOY PENDIENTE'}
        </Typography>
      </Box>
      <Typography sx={{ fontSize: 11, color: GRIS_TEXTO, fontWeight: 700 }}>{t.cadena}</Typography>

      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.75 }}>
        <Typography sx={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{pctTexto(avanceMes)}</Typography>
        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>avance del mes (subidas)</Typography>
      </Box>
      <Typography sx={{ fontSize: 13, fontWeight: 800, color: t.mes?.cumplida ? ESMERALDA : NARANJA, mt: 0.25 }}>
        {t.mes?.cumplida ? 'Meta mensual cumplida ✓' : `Faltan ${faltanMes} validadas del mes`}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 1.25 }}>
        <BarraMini titulo="DÍA" conteo={t.dia} />
        <BarraMini titulo={etiquetaSemana || 'SEMANA'} conteo={t.semana} />
        <BarraMini titulo="MES" conteo={t.mes} />
      </Box>

      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1.25 }}>
        {semanas.map((s) => {
          const ganada = s.cumplida && s.estado === 'cerrada';
          const color = ganada ? ESMERALDA : s.estado === 'en_curso' ? AZUL : s.estado === 'cerrada' ? ROJO : GRIS_TEXTO;
          return (
            <Box
              key={s.numero}
              sx={{
                px: 0.75, borderRadius: '10px', fontSize: 10, fontWeight: 800, lineHeight: 1.6,
                color, border: `1px solid ${color}`, bgcolor: ganada ? GANADO_FONDO : '#fff',
              }}
            >
              S{s.numero} {ganada ? '✓' : s.estado === 'en_curso' ? 'en curso' : s.estado === 'cerrada' ? '✗' : ''}
            </Box>
          );
        })}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.25, pt: 1, borderTop: `1px solid ${PISTA}` }}>
        <Box>
          <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>Días cumplidos</Typography>
          <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{num(t.dias_cumplidos)}</Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>Bolsa acumulada</Typography>
          <Typography sx={{ fontSize: 14, fontWeight: 800, color: num(t.bolsa_acumulada) > 0 ? ESMERALDA : 'text.secondary' }}>
            {dinero(t.bolsa_acumulada)}
          </Typography>
        </Box>
      </Box>

      <Typography
        onClick={() => setAbierta((v) => !v)}
        sx={{ fontSize: 12, fontWeight: 700, color: AZUL, cursor: 'pointer', mt: 1, userSelect: 'none' }}
      >
        {abierta ? '▲' : '▼'} Promotores ({promotores.length})
      </Typography>
      <Collapse in={abierta}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
          {promotores.length === 0 && (
            <Typography sx={{ fontSize: 11, color: GRIS_TEXTO }}>Sin promotores asignados</Typography>
          )}
          {promotores.map((p) => (
            <Box key={p.usuario_id} sx={{ px: 1, py: 0.5, borderRadius: 1, border: `1px solid ${PISTA}` }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700 }} noWrap title={p.nombre}>
                {p.nombre}
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                Hoy {num(p.subidas_dia)} ({num(p.validadas_dia)} val.) · Mes {num(p.subidas_mes)} ({num(p.validadas_mes)} val.) ·{' '}
                <Box component="span" sx={{ color: AZUL, fontWeight: 700 }}>
                  {num(p.participacion_mes_pct).toLocaleString('es-MX', { maximumFractionDigits: 1 })}%
                </Box>{' '}
                · <b>{dinero(p.bolsa)}</b>
              </Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Paper>
  );
}

const Resumen: React.FC<{ etiqueta: string; valor: string; detalle?: string; color?: string }> = ({
  etiqueta, valor, detalle, color,
}) => (
  <Paper variant="outlined" sx={{ flex: 1, minWidth: 150, p: 1.5, textAlign: 'center' }}>
    <Typography sx={{ fontSize: 22, fontWeight: 800, color: color ?? 'text.primary', lineHeight: 1.2 }}>{valor}</Typography>
    <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 700 }}>{etiqueta}</Typography>
    {detalle && <Typography sx={{ fontSize: 11, color: GRIS_TEXTO }}>{detalle}</Typography>}
  </Paper>
);

const Chip: React.FC<{ texto: string; activo: boolean; onClick: () => void }> = ({ texto, activo, onClick }) => (
  <Box
    onClick={onClick}
    sx={{
      px: 1.5, py: 0.5, borderRadius: '16px', cursor: 'pointer', userSelect: 'none',
      fontSize: 12, fontWeight: 800,
      color: activo ? '#fff' : GRIS_TEXTO,
      bgcolor: activo ? NARANJA : '#fff',
      border: `1px solid ${activo ? NARANJA : PISTA}`,
    }}
  >
    {texto}
  </Box>
);

export default function MetasCadenasResumen() {
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actualizado, setActualizado] = useState<Date | null>(null);
  const [cadena, setCadena] = useState<string>('Todas');
  const [orden, setOrden] = useState<Orden>('cadena');

  const cargar = useCallback(async () => {
    try {
      const { data } = await axios.get<Respuesta>(`${API}/metas-cadenas/resumen`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` },
      });
      setDatos(data);
      setActualizado(new Date());
      setError(null);
    } catch (err: any) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, REFRESCO_MS);
    return () => clearInterval(id);
  }, [cargar]);

  const todas = Array.isArray(datos?.tiendas) ? datos!.tiendas.filter(Boolean) : [];
  const cadenas = Array.from(new Set(todas.map((t) => t.cadena))).sort((a, b) => a.localeCompare(b));
  const visibles = (cadena === 'Todas' ? todas : todas.filter((t) => t.cadena === cadena)).slice();

  if (orden === 'avance') {
    visibles.sort((a, b) => aPct(b.mes?.subidas, b.mes?.meta) - aPct(a.mes?.subidas, a.mes?.meta));
  } else if (orden === 'rezago') {
    visibles.sort((a, b) => aPct(a.mes?.subidas, a.mes?.meta) - aPct(b.mes?.subidas, b.mes?.meta));
  }

  // Totales del filtro actual
  const cumplenHoy = visibles.filter((t) => t.dia?.cumplida).length;
  const subMes = visibles.reduce((s, t) => s + num(t.mes?.subidas), 0);
  const valMes = visibles.reduce((s, t) => s + num(t.mes?.validadas), 0);
  const metaMes = visibles.reduce((s, t) => s + num(t.mes?.meta), 0);
  const subHoy = visibles.reduce((s, t) => s + num(t.dia?.subidas), 0);
  const metaHoy = visibles.reduce((s, t) => s + num(t.dia?.meta), 0);
  const bolsa = visibles.reduce((s, t) => s + num(t.bolsa_acumulada), 0);

  const etiquetaSemana = datos?.semana ? `SEMANA ${datos.semana.numero}` : 'SEMANA';

  return (
    <>
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {datos ? `Metas de cadenas del ${fechaCorta(datos.fecha)}` : ''}
        </Typography>
        {actualizado && (
          <Typography variant="caption" color="text.secondary">
            Actualizado a las {actualizado.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} · se
            refresca cada 2 minutos
          </Typography>
        )}
      </Box>

      {error && (
        <Alert severity={datos ? 'warning' : 'error'} sx={{ mb: 2 }}>
          {datos ? `${error} Se muestran los últimos datos.` : error}
        </Alert>
      )}

      {cargando && (
        <Box display="flex" alignItems="center" gap={1} sx={{ color: 'text.secondary', mb: 2 }}>
          <CircularProgress size={20} />
          <Typography variant="body2">Cargando...</Typography>
        </Box>
      )}

      {datos && (
        <>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {['Todas', ...cadenas].map((c) => (
              <Chip key={c} texto={c} activo={cadena === c} onClick={() => setCadena(c)} />
            ))}
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            <Resumen
              etiqueta="Tiendas que cumplen hoy"
              valor={`${cumplenHoy} / ${visibles.length}`}
              color={cumplenHoy > 0 ? ESMERALDA : ROJO}
            />
            <Resumen etiqueta="Activaciones hoy" valor={`${subHoy} / ${metaHoy}`} detalle="subidas contra meta diaria" />
            <Resumen
              etiqueta="Activaciones del mes"
              valor={`${subMes} / ${metaMes}`}
              detalle={`${valMes} validadas · ${pctTexto(aPct(subMes, metaMes))}`}
              color={NARANJA}
            />
            <Resumen etiqueta="Bolsa acumulada" valor={dinero(bolsa)} detalle="suma de promotores" color={ESMERALDA} />
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>Ordenar:</Typography>
            <Chip texto="Por cadena" activo={orden === 'cadena'} onClick={() => setOrden('cadena')} />
            <Chip texto="Más avance" activo={orden === 'avance'} onClick={() => setOrden('avance')} />
            <Chip texto="Más atrasadas" activo={orden === 'rezago'} onClick={() => setOrden('rezago')} />
          </Box>

          {visibles.length === 0 && !cargando && (
            <Typography color="text.secondary">No hay tiendas con metas vigentes.</Typography>
          )}

          <Grid container spacing={2}>
            {visibles.map((t) => (
              <Grid item key={t.tienda_id} xs={12} sm={6} md={4} lg={3}>
                <TarjetaTienda t={t} etiquetaSemana={etiquetaSemana} />
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </>
  );
}
