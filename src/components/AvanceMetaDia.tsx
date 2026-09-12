import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, LinearProgress, Paper, Typography } from '@mui/material';
import axios from 'axios';

const API = 'https://ato-appservidor-nvxt.onrender.com';

// Esta semana corre como simulacion, con el equipo ya enterado del modelo.
// El pago real arranca el 15 de septiembre: ese dia se quita la leyenda
// cambiando este true por false, sin tocar nada mas.
const SEMANA_PRUEBA = true;

// Paleta propia para no confundirse con el azul marino y el naranja del resto de la app.
const DORADO = '#eab308';
const AZUL = '#2563eb';
const ESMERALDA = '#059669';
const PISTA = '#e2e8f0';

// Colores de la tira semanal.
const TIRA_APAGADO_FONDO = '#f8fafc';
const TIRA_APAGADO_TEXTO = '#cbd5e1';
const TIRA_GANADO_FONDO = '#ecfdf5';
const TIRA_TOTAL_FONDO = '#eff6ff';

// Un color fijo por tramo, de menor a mayor. No dependen de si el tramo se
// alcanzo: cada tramo siempre es de su color y solo se pinta lo cubierto.
const COLORES_TRAMO = ['#fbbf24', '#f59e0b', '#ea580c', '#dc2626'];
const colorTramo = (nivel: number) => COLORES_TRAMO[nivel - 1] ?? COLORES_TRAMO[COLORES_TRAMO.length - 1];

const BRILLO = 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 100%)';

const REFRESCO_MS = 60 * 1000;
const GROSOR_BARRA = 26;
const ALTO_ETIQUETA = 15;
const FUENTE = "'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif";

type Escalon = { nivel: number; meta: number | null; bolsa: number | null };

// me_toca se muestra como "Bono ganado": es la parte que le toca a esta persona.
// bolsa y las bolsas de la escalera NO se muestran: son del modulo completo.
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
  me_toca: number;
};

// Tira semanal: los 7 dias salen siempre, tengan bono o no. "cuenta" es false
// en los dias anteriores a que existieran las metas; se pintan apagados.
type DiaSemana = {
  fecha: string;
  dia: string;
  bono: number;
  nivel: number;
  cuenta: boolean;
};

type MiSemana = {
  lunes: string;
  domingo: string;
  dias: DiaSemana[];
  total: number;
};

type Etiqueta = {
  nivel: number;
  meta: number;
  pos: number;
  monto: string;
  final: boolean;
  fila: number;
  izq: number | null;
  ancho: number;
};

const dinero = (v: number | null | undefined) =>
  `$${Math.round(Number(v ?? 0)).toLocaleString('es-MX')}`;

// Debajo de este ancho de barra las cuatro etiquetas no caben con el monto
// completo, asi que se acortan para que sigan en un solo renglon.
const ANCHO_CORTO = 480;

/** "$450", "$2.7k", "$3k". Un decimal, sin comas, y sin el .0 cuando sobra. */
const dineroCorto = (v: number | null | undefined) => {
  const n = Math.round(Number(v ?? 0));
  if (Math.abs(n) < 1000) return `$${n}`;
  return `$${Math.round(n / 100) / 10}k`;
};

const porcentaje = (v: number | null | undefined) =>
  `${Number(v ?? 0).toLocaleString('es-MX', { maximumFractionDigits: 1 })}%`;

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Parte un "2026-09-07" a mano: new Date() lo leeria como UTC y correria el dia. */
const partes = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number);
  return { anio: a, mes: m - 1, dia: d };
};

/** "Semana del 7 al 13 de septiembre", o con los dos meses si la semana los cruza. */
function rangoSemana(lunes: string, domingo: string) {
  const l = partes(lunes);
  const d = partes(domingo);
  if (!MESES[l.mes] || !MESES[d.mes]) return '';
  return l.mes === d.mes
    ? `Semana del ${l.dia} al ${d.dia} de ${MESES[d.mes]}`
    : `Semana del ${l.dia} de ${MESES[l.mes]} al ${d.dia} de ${MESES[d.mes]}`;
}

let lienzo: CanvasRenderingContext2D | null = null;

/** Tamano de la etiqueta. En modo corto baja 1px para ganar espacio. */
const fuenteEtiqueta = (grande: boolean, corto: boolean) =>
  corto ? (grande ? 11 : 10) : grande ? 12 : 11;

/** Ancho real del texto en la fuente del tema; si no hay canvas, una estimacion. */
function anchoTexto(texto: string, grande: boolean, corto: boolean) {
  const px = fuenteEtiqueta(grande, corto);
  if (!lienzo) lienzo = document.createElement('canvas').getContext('2d');
  if (!lienzo) return texto.length * px * 0.63;
  lienzo.font = `700 ${px}px ${FUENTE}`;
  return lienzo.measureText(texto).width;
}

/**
 * Etiquetas de las metas. La del nivel maximo va pegada al extremo derecho de
 * la barra y se coloca primero, para que siempre se quede en el renglon de
 * arriba: si choca con la del nivel anterior, baja la otra.
 */
function acomodarEtiquetas(
  escalones: Escalon[],
  tope: number,
  anchoBarra: number,
  corto: boolean
): Etiqueta[] {
  if (!escalones.length) return [];
  const ultimo = escalones.length - 1;

  const etiquetas: Etiqueta[] = escalones.map((m, i) => {
    const meta = Number(m.meta);
    const final = i === ultimo;
    const pos = tope > 0 ? (meta / tope) * 100 : 0;
    const monto = corto ? dineroCorto(meta) : dinero(meta);
    const ancho = Math.ceil(anchoTexto(monto, final, corto)) + 6;
    const izq = anchoBarra <= 0
      ? null
      : final
        ? anchoBarra - ancho
        : Math.max(0, Math.min((pos / 100) * anchoBarra - ancho / 2, anchoBarra - ancho));
    return { nivel: m.nivel, meta, pos, monto, final, fila: 0, izq, ancho };
  });

  if (anchoBarra <= 0) return etiquetas;

  // Se compara contra todo lo ya colocado en cada renglon, no solo contra la
  // ultima: la del nivel maximo ocupa el extremo derecho antes que las demas.
  const filas: { desde: number; hasta: number }[][] = [];
  const orden = [ultimo, ...etiquetas.map((_, i) => i).filter((i) => i !== ultimo)];
  orden.forEach((i) => {
    const e = etiquetas[i];
    const desde = e.izq as number;
    const hasta = desde + e.ancho;
    let fila = filas.findIndex((ocupadas) =>
      ocupadas.every((o) => hasta + 4 <= o.desde || desde >= o.hasta + 4)
    );
    if (fila === -1) {
      fila = filas.length;
      filas.push([]);
    }
    filas[fila].push({ desde, hasta });
    e.fila = fila;
  });

  return etiquetas;
}

export default function AvanceMetaDia({ refrescar = 0 }: { refrescar?: number }) {
  const [data, setData] = useState<MiAvance | null>(null);
  const [semana, setSemana] = useState<MiSemana | null>(null);
  const [anchoBarra, setAnchoBarra] = useState(0);
  const observador = useRef<ResizeObserver | null>(null);

  // Las dos peticiones van juntas y se resuelven por separado: un fallo de
  // mi-semana solo quita la tira, nunca tumba el resto de la franja.
  const cargar = useCallback(async () => {
    const token = localStorage.getItem('token');
    const cabeceras = { headers: { Authorization: `Bearer ${token}` } };

    const [avance, tira] = await Promise.allSettled([
      axios.get<MiAvance | ''>(`${API}/api/metas/mi-avance`, cabeceras),
      axios.get<MiSemana | ''>(`${API}/api/metas/mi-semana`, cabeceras),
    ]);

    // 204: sin modulo o sin meta vigente hoy. No se muestra nada.
    // Si falla se quedan los ultimos datos visibles, sin alertas.
    if (avance.status === 'fulfilled') {
      const res = avance.value;
      setData(res.status === 204 || !res.data ? null : (res.data as MiAvance));
    }

    // 204 o error: sin tira. El resto del componente sigue igual.
    setSemana(
      tira.status === 'fulfilled' && tira.value.status !== 204 && tira.value.data
        ? (tira.value.data as MiSemana)
        : null
    );
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

  // Tramo = de la meta anterior a la siguiente, con su color fijo. Se pinta
  // solo la parte cubierta por la venta; el relleno corta en la venta actual.
  const tramos = escalera.map((e, i) => {
    const desde = i === 0 ? 0 : Number(escalera[i - 1].meta);
    const hasta = Number(e.meta);
    return {
      nivel: e.nivel,
      izq: aPct(desde),
      ancho: venta > desde ? aPct(Math.min(venta, hasta)) - aPct(desde) : 0,
      color: colorTramo(e.nivel),
    };
  });

  // Todas las metas llevan etiqueta; la marca vertical solo va de la 1 a la 3,
  // porque la del nivel maximo cae en el borde y se veria cortada.
  // anchoBarra 0 es "todavia sin medir": se asume ancho normal hasta que el
  // ResizeObserver responde, un solo frame despues.
  const corto = anchoBarra > 0 && anchoBarra < ANCHO_CORTO;
  const etiquetas = acomodarEtiquetas(escalera, tope, anchoBarra, corto);
  const filas = etiquetas.reduce((max, e) => Math.max(max, e.fila + 1), 1);

  const miParte = venta > 0 ? Math.min(100, (Number(data.mi_venta ?? 0) / venta) * 100) : 0;

  // Lo que le toca a esta persona, no la bolsa del modulo.
  const bono = Number(data.me_toca ?? 0);

  const nivelAlcanzado = data.nivel >= 4 ? 'Nivel 4 - Récord' : `Nivel ${data.nivel} alcanzado`;

  // Con nivel 0 el "Faltan" ya es el estado; el detalle solo va con nivel > 0.
  const detalleNivel = !gana
    ? null
    : data.siguiente_nivel == null
      ? 'Nivel máximo alcanzado'
      : `Faltan ${dinero(data.falta_siguiente)} para el nivel ${data.siguiente_nivel}`;

  const tamanoEstado = { xs: 15, md: 16 };

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
        {/* Izquierda: modulo, venta del dia, estado y bono */}
        <Box
          sx={{
            gridArea: 'modulo', minWidth: 0,
            pr: { md: 2.5 }, pb: { xs: 1, md: 0 },
            borderRight: { xs: 'none', md: '1px solid #cbd5e1' },
            borderBottom: { xs: '1px solid #cbd5e1', md: 'none' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: 18, md: 20 }, whiteSpace: 'nowrap' }}>
              {data.modulo}
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: 26, md: 30 }, lineHeight: 1.1, whiteSpace: 'nowrap' }}>
              {dinero(venta)}
            </Typography>
          </Box>

          {gana ? (
            <Typography
              sx={{
                mt: 0.25, fontWeight: 800, fontSize: tamanoEstado, lineHeight: 1.25,
                whiteSpace: { xs: 'normal', sm: 'nowrap' }, color: ESMERALDA,
              }}
            >
              {nivelAlcanzado}
            </Typography>
          ) : (
            <Box sx={{ mt: 0.25 }}>
              <Typography
                sx={{ fontWeight: 800, fontSize: tamanoEstado, lineHeight: 1.25, whiteSpace: 'nowrap', color: DORADO }}
              >
                Faltan {dinero(data.falta_siguiente)}
              </Typography>
              <Typography
                sx={{ fontSize: 12, fontWeight: 700, lineHeight: 1.25, color: 'text.secondary' }}
              >
                para llegar a la primera meta
              </Typography>
            </Box>
          )}

          {detalleNivel && (
            <Typography
              sx={{
                fontSize: 12, fontWeight: 700, lineHeight: 1.25,
                whiteSpace: { xs: 'normal', sm: 'nowrap' },
                color: data.siguiente_nivel == null ? ESMERALDA : 'text.secondary',
              }}
            >
              {detalleNivel}
            </Typography>
          )}

          {/* Bono: me_toca, no la bolsa del modulo. En 0 se muestra en gris, no se esconde */}
          <Box sx={{ mt: 0.75 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2, color: 'text.secondary' }}>
              Bono ganado
            </Typography>
            <Typography
              sx={{
                fontWeight: 800, fontSize: { xs: 20, md: 22 }, lineHeight: 1.15,
                color: bono > 0 ? ESMERALDA : 'text.secondary',
              }}
            >
              {dinero(bono)}
            </Typography>
            {SEMANA_PRUEBA && (
              <Typography sx={{ fontSize: 10, lineHeight: 1.2, color: 'text.secondary' }}>
                Simulación - arranca la próxima semana
              </Typography>
            )}
          </Box>
        </Box>

        {/* Derecha: barra del modulo con sus etiquetas y, debajo, la participacion propia */}
        <Box sx={{ gridArea: 'barras', minWidth: 0, pt: { md: 0.75 } }}>
          <div ref={medirBarra} style={{ position: 'relative' }}>
            {/* Pista con los tramos de color y su brillo */}
            <Box
              sx={{
                position: 'relative', height: GROSOR_BARRA, borderRadius: GROSOR_BARRA / 2,
                bgcolor: PISTA, overflow: 'hidden',
              }}
            >
              {tramos.map((t) =>
                t.ancho > 0 ? (
                  <Box
                    key={t.nivel}
                    sx={{
                      position: 'absolute', top: 0, bottom: 0,
                      left: `${t.izq}%`, width: `${t.ancho}%`,
                      bgcolor: t.color, backgroundImage: BRILLO,
                    }}
                  />
                ) : null
              )}
            </Box>
            {etiquetas.filter((e) => !e.final).map((e) => (
              <Box
                key={`marca-${e.nivel}`}
                sx={{
                  position: 'absolute', top: -4, height: GROSOR_BARRA + 8, width: 3, ml: '-1.5px',
                  left: `${e.pos}%`, bgcolor: '#1e293b', borderRadius: 1,
                }}
              />
            ))}
            <Box sx={{ position: 'relative', height: filas * ALTO_ETIQUETA, mt: 0.75 }}>
              {etiquetas.map((e) => (
                <Typography
                  key={`etiqueta-${e.nivel}`}
                  sx={{
                    position: 'absolute',
                    top: e.fila * ALTO_ETIQUETA,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    fontSize: fuenteEtiqueta(e.final, corto),
                    fontWeight: 700,
                    lineHeight: 1.15,
                    color: venta >= e.meta ? colorTramo(e.nivel) : 'text.primary',
                    ...(e.izq === null
                      ? (e.final ? { right: 0 } : { left: `${e.pos}%`, transform: 'translateX(-50%)' })
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
              <Box component="span" sx={{ color: AZUL }}>— {porcentaje(data.mi_participacion_pct)} del módulo</Box>
            </Typography>
            <LinearProgress
              variant="determinate"
              value={miParte}
              sx={{ height: 8, borderRadius: 4, mt: 0.4, bgcolor: PISTA, '& .MuiLinearProgress-bar': { bgcolor: AZUL, borderRadius: 4 } }}
            />
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.3 }}>
              Participantes hoy: {data.n_participantes}
            </Typography>

            {/* Tira semanal: informacion secundaria, por eso va compacta y en letra chica */}
            {semana && (
              <Box sx={{ mt: 0.6 }}>
                <Typography sx={{ fontSize: 9, lineHeight: 1.3, color: 'text.secondary' }}>
                  {rangoSemana(semana.lunes, semana.domingo)}
                </Typography>
                <Box sx={{ display: 'flex', gap: '4px', mt: 0.3 }}>
                  {semana.dias.map((d) => {
                    const monto = Number(d.bono ?? 0);
                    const ganado = d.cuenta && monto > 0;
                    // data.fecha es el hoy del backend, en hora de Mexico.
                    const esHoy = d.fecha === data.fecha;
                    return (
                      <Box
                        key={d.fecha}
                        sx={{
                          flex: 1, minWidth: 0, textAlign: 'center',
                          py: '2px', borderRadius: '4px', boxSizing: 'border-box',
                          bgcolor: !d.cuenta ? TIRA_APAGADO_FONDO : ganado ? TIRA_GANADO_FONDO : '#fff',
                          border: esHoy
                            ? `2px solid ${AZUL}`
                            : `1px solid ${ganado ? ESMERALDA : PISTA}`,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: 9, lineHeight: 1.3,
                            color: d.cuenta ? 'text.secondary' : TIRA_APAGADO_TEXTO,
                          }}
                        >
                          {d.dia}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: 11, fontWeight: 800, lineHeight: 1.3,
                            color: !d.cuenta ? TIRA_APAGADO_TEXTO : ganado ? ESMERALDA : 'text.secondary',
                          }}
                        >
                          {d.cuenta ? dinero(monto) : '—'}
                        </Typography>
                      </Box>
                    );
                  })}
                  <Box
                    sx={{
                      flex: 1.4, minWidth: 0, textAlign: 'center',
                      py: '2px', borderRadius: '4px', boxSizing: 'border-box',
                      bgcolor: TIRA_TOTAL_FONDO, border: `1px solid ${AZUL}`,
                    }}
                  >
                    <Typography sx={{ fontSize: 9, lineHeight: 1.3, color: 'text.secondary' }}>
                      Total
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 12, fontWeight: 800, lineHeight: 1.3,
                        color: Number(semana.total ?? 0) > 0 ? ESMERALDA : 'text.secondary',
                      }}
                    >
                      {dinero(semana.total)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}
