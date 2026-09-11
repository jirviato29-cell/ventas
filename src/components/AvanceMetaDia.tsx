import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, LinearProgress, Paper, Typography } from '@mui/material';
import axios from 'axios';

const API = 'https://ato-appservidor-nvxt.onrender.com';

// Paleta propia para no confundirse con el azul marino y el naranja del resto de la app.
const ESMERALDA = '#059669';
const AMBAR = '#d97706';
const TEAL = '#0d9488';
const PISTA = '#e2e8f0';

const REFRESCO_MS = 60 * 1000;
const GROSOR_BARRA = 20;
const ALTO_ETIQUETA = 15;
const FUENTE = "'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif";

type Escalon = { nivel: number; meta: number | null; bolsa: number | null };

// me_toca, bolsa y las bolsas de la escalera tambien llegan en la respuesta,
// pero no se muestran: esta semana es de prueba y no se paga. El asesor no
// debe ver montos de comision en esta pantalla.
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
  fila: number;
  izq: number | null;
  ancho: number;
};

const dinero = (v: number | null | undefined) =>
  `$${Math.round(Number(v ?? 0)).toLocaleString('es-MX')}`;

const porcentaje = (v: number | null | undefined) =>
  `${Number(v ?? 0).toLocaleString('es-MX', { maximumFractionDigits: 1 })}%`;

let lienzo: CanvasRenderingContext2D | null = null;

/** Ancho real del texto en la fuente del tema; si no hay canvas, una estimacion. */
function anchoTexto(texto: string) {
  if (!lienzo) lienzo = document.createElement('canvas').getContext('2d');
  if (!lienzo) return texto.length * 7;
  lienzo.font = `700 11px ${FUENTE}`;
  return lienzo.measureText(texto).width;
}

/** Coloca cada etiqueta bajo su marca; solo baja a otro renglon si chocaria con la anterior. */
function acomodarEtiquetas(marcas: Escalon[], tope: number, anchoBarra: number): Etiqueta[] {
  const finPorFila: number[] = [];
  return marcas.map((m) => {
    const meta = Number(m.meta);
    const pos = tope > 0 ? (meta / tope) * 100 : 0;
    const monto = dinero(meta);
    const ancho = Math.ceil(anchoTexto(monto)) + 6;
    if (anchoBarra <= 0) return { nivel: m.nivel, meta, pos, monto, fila: 0, izq: null, ancho };

    const izq = Math.max(0, Math.min((pos / 100) * anchoBarra - ancho / 2, anchoBarra - ancho));
    let fila = finPorFila.findIndex((fin) => izq >= fin + 4);
    if (fila === -1) {
      fila = finPorFila.length;
      finPorFila.push(0);
    }
    finPorFila[fila] = izq + ancho;
    return { nivel: m.nivel, meta, pos, monto, fila, izq, ancho };
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

  // Carga inicial y cada vez que VentasPage registra o cancela una venta.
  useEffect(() => {
    cargar();
  }, [refrescar, cargar]);

  useEffect(() => {
    const id = setInterval(cargar, REFRESCO_MS);
    return () => clearInterval(id);
  }, [cargar]);

  // Mide el ancho de la barra para acomodar las etiquetas (sobre todo en movil).
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

  // Relleno de 0 a la venta, con tope en el nivel 4. Siempre en esmeralda.
  const llenado = aPct(venta);

  // Marcas solo en los niveles 1 a 3: el nivel 4 es el final de la barra.
  const etiquetas = acomodarEtiquetas(escalera.slice(0, -1), tope, anchoBarra);
  const filas = etiquetas.reduce((max, e) => Math.max(max, e.fila + 1), 1);

  const miParte = venta > 0 ? Math.min(100, (Number(data.mi_venta ?? 0) / venta) * 100) : 0;

  // Sin montos de comision: solo el nivel alcanzado.
  const estado = gana
    ? (data.nivel >= 4 ? 'Nivel 4 - Récord' : `Nivel ${data.nivel} alcanzado`)
    : `Faltan ${dinero(data.falta_siguiente)} para la primera meta`;

  // Con nivel 0 el "Faltan" ya es el estado; el detalle solo va con nivel > 0.
  const detalleNivel = !gana
    ? null
    : data.siguiente_nivel == null
      ? 'Nivel máximo alcanzado'
      : `Faltan ${dinero(data.falta_siguiente)} para el nivel ${data.siguiente_nivel}`;

  return (
    <Paper sx={{ px: { xs: 1.5, md: 2.5 }, py: 1.5, mt: { xs: 0.5, sm: 1 }, mb: 1.5, borderRadius: 2 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'auto minmax(0, 1fr)' },
          gridTemplateAreas: { xs: '"modulo" "barras"', md: '"modulo barras"' },
          columnGap: 3,
          rowGap: 1,
          alignItems: 'start',
        }}
      >
        {/* Izquierda: modulo, venta del dia y estado */}
        <Box sx={{ gridArea: 'modulo', minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: 18, md: 20 }, whiteSpace: 'nowrap' }}>
              {data.modulo}
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: 26, md: 30 }, lineHeight: 1.1, whiteSpace: 'nowrap' }}>
              {dinero(venta)}
            </Typography>
          </Box>

          <Typography
            sx={{
              mt: 0.25,
              fontWeight: 800,
              fontSize: { xs: 15, md: 16 },
              lineHeight: 1.25,
              whiteSpace: { xs: 'normal', sm: 'nowrap' },
              color: gana ? ESMERALDA : AMBAR,
            }}
          >
            {estado}
          </Typography>

          {detalleNivel && (
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 700,
                lineHeight: 1.25,
                whiteSpace: { xs: 'normal', sm: 'nowrap' },
                color: data.siguiente_nivel == null ? ESMERALDA : 'text.secondary',
              }}
            >
              {detalleNivel}
            </Typography>
          )}
        </Box>

        {/* Derecha: barra del modulo con sus etiquetas y, debajo, la participacion propia */}
        <Box sx={{ gridArea: 'barras', minWidth: 0, pt: { md: 0.75 } }}>
          <div ref={medirBarra} style={{ position: 'relative' }}>
            <Box
              sx={{
                position: 'relative', height: GROSOR_BARRA, borderRadius: GROSOR_BARRA / 2,
                bgcolor: PISTA, overflow: 'hidden',
              }}
            >
              <Box sx={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${llenado}%`, bgcolor: ESMERALDA }} />
            </Box>
            {etiquetas.map((e) => (
              <Box
                key={`marca-${e.nivel}`}
                sx={{
                  position: 'absolute', top: -3, height: GROSOR_BARRA + 6, width: 2, ml: '-1px',
                  left: `${e.pos}%`, bgcolor: '#0f172a', opacity: 0.55, borderRadius: 1,
                }}
              />
            ))}
            <Box sx={{ position: 'relative', height: filas * ALTO_ETIQUETA, mt: 0.5 }}>
              {etiquetas.map((e) => (
                <Typography
                  key={`etiqueta-${e.nivel}`}
                  sx={{
                    position: 'absolute',
                    top: e.fila * ALTO_ETIQUETA,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    fontSize: 11,
                    fontWeight: 700,
                    lineHeight: 1.15,
                    color: venta >= e.meta ? ESMERALDA : 'text.primary',
                    ...(e.izq === null
                      ? { left: `${e.pos}%`, transform: 'translateX(-50%)' }
                      : { left: e.izq, width: e.ancho }),
                  }}
                >
                  {e.monto}
                </Typography>
              ))}
            </Box>
          </div>

          <Box sx={{ mt: 0.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
              Tu participación es de {dinero(data.mi_venta)}{' '}
              <Box component="span" sx={{ color: TEAL }}>— {porcentaje(data.mi_participacion_pct)} del módulo</Box>
            </Typography>
            <LinearProgress
              variant="determinate"
              value={miParte}
              sx={{ height: 8, borderRadius: 4, mt: 0.4, bgcolor: PISTA, '& .MuiLinearProgress-bar': { bgcolor: TEAL, borderRadius: 4 } }}
            />
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.3 }}>
              Participantes hoy: {data.n_participantes}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}
