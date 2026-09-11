import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, LinearProgress, Paper, Typography } from '@mui/material';
import axios from 'axios';

const API = 'https://ato-appservidor-nvxt.onrender.com';

const VERDE = '#16a34a';
const NARANJA = '#f97316';
const AZUL = '#1e3a5f';
const PISTA = '#e2e8f0';

const REFRESCO_MS = 60 * 1000;
const ALTO_ETIQUETA = 24;

type Escalon = { nivel: number; meta: number | null; bolsa: number | null };

// me_toca tambien llega en la respuesta, pero no se muestra: esta semana es de
// prueba y no se paga.
type MiAvance = {
  fecha: string;
  modulo: string;
  venta_modulo: number;
  nivel: number;
  bolsa: number;
  falta_siguiente: number;
  siguiente_nivel: number | null;
  escalera: Escalon[];
  mi_venta: number;
  mi_participacion_pct: number;
  n_participantes: number;
};

type Etiqueta = {
  nivel: number;
  meta: number;
  pos: number;
  monto: string;
  bolsa: string;
  fila: number;
  izq: number | null;
  ancho: number;
};

const dinero = (v: number | null | undefined) =>
  `$${Math.round(Number(v ?? 0)).toLocaleString('es-MX')}`;

const porcentaje = (v: number | null | undefined) =>
  `${Number(v ?? 0).toLocaleString('es-MX', { maximumFractionDigits: 1 })}%`;

/** Reparte las etiquetas de las marcas en renglones para que no se encimen cuando las metas estan juntas. */
function acomodarEtiquetas(marcas: Escalon[], tope: number, anchoBarra: number): Etiqueta[] {
  const finPorFila: number[] = [];
  return marcas.map((m) => {
    const meta = Number(m.meta);
    const pos = tope > 0 ? (meta / tope) * 100 : 0;
    const monto = dinero(meta);
    const bolsa = `+${dinero(m.bolsa)}`;
    const ancho = Math.max(monto.length, bolsa.length) * 6.5 + 6;
    if (anchoBarra <= 0) return { nivel: m.nivel, meta, pos, monto, bolsa, fila: 0, izq: null, ancho };

    const izq = Math.max(0, Math.min((pos / 100) * anchoBarra - ancho / 2, anchoBarra - ancho));
    let fila = finPorFila.findIndex((fin) => izq >= fin + 4);
    if (fila === -1) {
      fila = finPorFila.length;
      finPorFila.push(0);
    }
    finPorFila[fila] = izq + ancho;
    return { nivel: m.nivel, meta, pos, monto, bolsa, fila, izq, ancho };
  });
}

export default function AvanceMetaDia({ refrescar = 0 }: { refrescar?: number }) {
  const [data, setData] = useState<MiAvance | null>(null);
  const [anchoBarra, setAnchoBarra] = useState(0);
  const observador = useRef<ResizeObserver | null>(null);

  const cargar = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get<MiAvance | ''>(`${API}/api/metas/mi-avance`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // 204: sin modulo o sin meta vigente hoy. No se muestra nada.
      setData(res.status === 204 || !res.data ? null : (res.data as MiAvance));
    } catch {
      // Si falla se quedan los ultimos datos visibles, sin alertas.
    }
  }, []);

  // Carga inicial y cada vez que VentasPage registra una venta.
  useEffect(() => {
    cargar();
  }, [refrescar, cargar]);

  useEffect(() => {
    const id = setInterval(cargar, REFRESCO_MS);
    return () => clearInterval(id);
  }, [cargar]);

  const medirBarra = useCallback((el: HTMLDivElement | null) => {
    observador.current?.disconnect();
    observador.current = null;
    if (!el) return;
    setAnchoBarra(el.getBoundingClientRect().width);
    observador.current = new ResizeObserver((entradas) => setAnchoBarra(entradas[0].contentRect.width));
    observador.current.observe(el);
  }, []);

  if (!data) return null;

  const escalera = (data.escalera ?? [])
    .filter((e) => e.meta != null)
    .sort((a, b) => a.nivel - b.nivel);
  const tope = Number(escalera[escalera.length - 1]?.meta ?? 0);
  const venta = Number(data.venta_modulo ?? 0);
  const aPct = (v: number) => (tope > 0 ? Math.min(100, Math.max(0, (v / tope) * 100)) : 0);
  const gana = data.nivel > 0;

  // Tramo = de la meta anterior a la siguiente. Superado en verde, en curso en naranja.
  const tramos = escalera.map((e, i) => {
    const desde = i === 0 ? 0 : Number(escalera[i - 1].meta);
    const hasta = Number(e.meta);
    return {
      nivel: e.nivel,
      izq: aPct(desde),
      ancho: venta > desde ? aPct(Math.min(venta, hasta)) - aPct(desde) : 0,
      color: venta >= hasta ? VERDE : NARANJA,
    };
  });

  // Marcas solo en los niveles 1 a 3: el nivel 4 es el final de la barra.
  const etiquetas = acomodarEtiquetas(escalera.slice(0, -1), tope, anchoBarra);
  const filas = etiquetas.reduce((max, e) => Math.max(max, e.fila + 1), 1);

  const miParte = venta > 0 ? Math.min(100, (Number(data.mi_venta ?? 0) / venta) * 100) : 0;

  return (
    <Paper sx={{ p: 1.25, mb: 1.5, borderRadius: 2 }}>
      {/* 1. Modulo, venta del dia y estado */}
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 15 }}>{data.modulo}</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: 22, lineHeight: 1.1 }}>{dinero(venta)}</Typography>
        </Box>
        <Typography sx={{ fontWeight: 800, fontSize: 13, color: gana ? VERDE : NARANJA }}>
          {gana ? `Ganando ${dinero(data.bolsa)}` : `Faltan ${dinero(data.falta_siguiente)} para la primera meta`}
        </Typography>
      </Box>

      {/* 2. Barra del modulo: de 0 al nivel 4, con marcas en los niveles 1, 2 y 3 */}
      <div ref={medirBarra} style={{ position: 'relative', marginTop: 8 }}>
        <Box sx={{ position: 'relative', height: 14, borderRadius: 7, bgcolor: PISTA, overflow: 'hidden' }}>
          {tramos.map((t) =>
            t.ancho > 0 ? (
              <Box
                key={t.nivel}
                sx={{ position: 'absolute', top: 0, bottom: 0, left: `${t.izq}%`, width: `${t.ancho}%`, bgcolor: t.color }}
              />
            ) : null
          )}
        </Box>
        {etiquetas.map((e) => (
          <Box
            key={`marca-${e.nivel}`}
            sx={{
              position: 'absolute', top: -2, height: 18, width: 2, ml: '-1px',
              left: `${e.pos}%`, bgcolor: '#0f172a', opacity: 0.55, borderRadius: 1,
            }}
          />
        ))}
        <Box sx={{ position: 'relative', height: filas * ALTO_ETIQUETA, mt: 0.5 }}>
          {etiquetas.map((e) => (
            <Box
              key={`etiqueta-${e.nivel}`}
              sx={{
                position: 'absolute',
                top: e.fila * ALTO_ETIQUETA,
                textAlign: 'center',
                whiteSpace: 'nowrap',
                ...(e.izq === null
                  ? { left: `${e.pos}%`, transform: 'translateX(-50%)' }
                  : { left: e.izq, width: e.ancho }),
              }}
            >
              <Typography sx={{ fontSize: 10, fontWeight: 700, lineHeight: 1.15, color: venta >= e.meta ? VERDE : 'text.primary' }}>
                {e.monto}
              </Typography>
              <Typography sx={{ fontSize: 10, lineHeight: 1.15, color: 'text.secondary' }}>{e.bolsa}</Typography>
            </Box>
          ))}
        </Box>
      </div>

      {/* 3. Cuanto falta para el siguiente nivel. Con nivel 0 ya lo dice el renglon de arriba. */}
      {gana && (
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: data.siguiente_nivel == null ? VERDE : 'text.primary' }}>
          {data.siguiente_nivel == null
            ? 'Nivel máximo alcanzado'
            : `Faltan ${dinero(data.falta_siguiente)} para el nivel ${data.siguiente_nivel}`}
        </Typography>
      )}

      {/* 4. Participacion propia en la venta del modulo */}
      <Box sx={{ mt: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700 }}>Tu venta: {dinero(data.mi_venta)}</Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: AZUL }}>
            {porcentaje(data.mi_participacion_pct)} del módulo
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={miParte}
          sx={{ height: 6, borderRadius: 3, mt: 0.4, bgcolor: PISTA, '& .MuiLinearProgress-bar': { bgcolor: AZUL, borderRadius: 3 } }}
        />
        <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.3 }}>
          Participantes hoy: {data.n_participantes}
        </Typography>
      </Box>
    </Paper>
  );
}
