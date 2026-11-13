import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, LinearProgress, Paper, Typography } from '@mui/material';
import axios from 'axios';

const API = '/api';

// Esta semana corre como simulacion, con el equipo ya enterado del modelo.
// El pago real arranca el 15 de septiembre: ese dia se quita la leyenda
// cambiando este true por false, sin tocar nada mas.
const SEMANA_PRUEBA = false;

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

// La escalera se dibuja como cuatro escalones del mismo ancho, no como una
// barra corrida: en pesos los niveles pueden estar muy juntos (en Buen Fin van
// de 4,100 a 5,000) y una barra proporcional gastaria casi todo su largo en el
// tramo que todavia no paga nada.
const MARINO = '#0f2847';
const NARANJA = '#ea580c';
const ESCALON_SEPARACION = 3;

const REFRESCO_MS = 60 * 1000;
const GROSOR_BARRA = 26;
const GROSOR_BARRA_XS = 22;

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

type MiPendiente = {
  lunes: string;
  domingo: string;
  paga_el: string;
  claves: number;
  bono_pendiente: number;
};

const dinero = (v: number | null | undefined) =>
  `$${Math.round(Number(v ?? 0)).toLocaleString('es-MX')}`;

// Debajo de este ancho los cuatro montos no caben completos dentro de su
// escalon, asi que se acortan.
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

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "miércoles 18 nov" */
function diaDePago(iso: string) {
  const { anio, mes, dia } = partes(iso);
  if (!MES_CORTO[mes]) return '';
  const nombre = DIAS_SEMANA[new Date(anio, mes, dia).getDay()];
  return `${nombre} ${dia} ${MES_CORTO[mes]}`;
}

/**
 * Un escalon por nivel, todos del mismo ancho. `lleno` es el avance DENTRO de
 * ese escalon: 100 cuando el nivel ya se gano, 0 cuando la venta ni siquiera
 * llego al nivel anterior, y la proporcion del tramo cuando va a medias.
 */
function armarEscalones(escalones: Escalon[], venta: number, corto: boolean) {
  return escalones.map((e, i) => {
    const meta = Number(e.meta);
    const desde = i === 0 ? 0 : Number(escalones[i - 1].meta);
    const tramo = meta - desde;
    const lleno = venta >= meta
      ? 100
      : venta <= desde || tramo <= 0
        ? 0
        : ((venta - desde) / tramo) * 100;
    return {
      nivel: e.nivel,
      meta,
      bolsa: e.bolsa,
      lleno,
      ganado: venta >= meta,
      monto: corto ? dineroCorto(meta) : dinero(meta),
    };
  });
}

export default function AvanceMetaDia({ refrescar = 0 }: { refrescar?: number }) {
  const [data, setData] = useState<MiAvance | null>(null);
  const [semana, setSemana] = useState<MiSemana | null>(null);
  const [pendiente, setPendiente] = useState<MiPendiente | null>(null);
  const [anchoBarra, setAnchoBarra] = useState(0);
  const observador = useRef<ResizeObserver | null>(null);

  // Las tres peticiones van juntas y se resuelven por separado: un fallo de
  // mi-semana o mi-pendiente solo quita su parte, nunca tumba el resto de la franja.
  const cargar = useCallback(async () => {
    const token = localStorage.getItem('token');
    const cabeceras = { headers: { Authorization: `Bearer ${token}` } };

    const [avance, tira, deuda] = await Promise.allSettled([
      axios.get<MiAvance | ''>(`${API}/api/metas/mi-avance`, cabeceras),
      axios.get<MiSemana | ''>(`${API}/api/metas/mi-semana`, cabeceras),
      axios.get<MiPendiente | ''>(`${API}/api/metas/mi-pendiente`, cabeceras),
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

    // 204 o error: no se pinta el renglon del pendiente. El resto sigue igual.
    setPendiente(
      deuda.status === 'fulfilled' && deuda.value.status !== 204 && deuda.value.data
        ? (deuda.value.data as MiPendiente)
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
  const venta = Number(data.venta_modulo ?? 0);
  const gana = data.nivel > 0;

  // anchoBarra 0 es "todavia sin medir": se asume ancho normal hasta que el
  // ResizeObserver responde, un solo frame despues.
  const corto = anchoBarra > 0 && anchoBarra < ANCHO_CORTO;
  const escalones = armarEscalones(escalera, venta, corto);

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

  // Mismo bloque en los dos sitios: en md cierra la columna izquierda y en xs
  // encabeza el bloque de la semana. Se pinta una vez y se elige por CSS.
  const bloqueBono = (tamanoMonto: number) => (
    <>
      <Typography sx={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2, color: 'text.secondary' }}>
        Bono ganado
      </Typography>
      <Typography
        sx={{
          fontWeight: 800, fontSize: tamanoMonto, lineHeight: 1.15,
          color: bono > 0 ? ESMERALDA : 'text.secondary',
        }}
      >
        {dinero(bono)}
      </Typography>
      {pendiente && Number(pendiente.bono_pendiente) > 0 && (
        <Box sx={{ mt: 0.5 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2, color: 'text.secondary' }}>
            Bono de la semana pasada
            {Number(pendiente.claves) > 1 && ` · tus ${pendiente.claves} claves`}
          </Typography>
          <Typography
            sx={{
              fontWeight: 800, fontSize: Math.round(tamanoMonto * 0.72),
              lineHeight: 1.15, color: DORADO,
            }}
          >
            {dinero(pendiente.bono_pendiente)}
          </Typography>
          <Typography sx={{ fontSize: 10.5, fontWeight: 700, lineHeight: 1.2, color: 'text.secondary' }}>
            Se paga el {diaDePago(pendiente.paga_el)}
          </Typography>
        </Box>
      )}
      {SEMANA_PRUEBA && (
        <Typography sx={{ fontSize: 10, lineHeight: 1.2, color: 'text.secondary' }}>
          Simulación - arranca la próxima semana
        </Typography>
      )}
    </>
  );

  return (
    <Paper sx={{ px: { xs: 2, md: 2.5 }, py: { xs: 2, md: 1.5 }, mt: { xs: 0.5, sm: 1 }, mb: 1.5, borderRadius: 2 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'auto minmax(0, 1fr)' },
          gridTemplateAreas: { xs: '"modulo" "barras"', md: '"modulo barras"' },
          columnGap: 3,
          rowGap: { xs: 0, md: 1 },
          alignItems: 'start',
        }}
      >
        {/* Izquierda: modulo, venta del dia, estado y bono */}
        <Box
          sx={{
            gridArea: 'modulo', minWidth: 0,
            pr: { md: 2.5 },
            // En movil no hay divisoria: los bloques se separan con aire.
            borderRight: { xs: 'none', md: '1px solid #cbd5e1' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: 18, md: 20 }, whiteSpace: 'nowrap' }}>
              {data.modulo}
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: 28, md: 30 }, lineHeight: 1.1, whiteSpace: 'nowrap' }}>
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

          {/* Bono: me_toca, no la bolsa del modulo. En 0 se muestra en gris, no se
              esconde. En movil no va aqui: baja al bloque de la semana. */}
          <Box sx={{ mt: 0.75, display: { xs: 'none', md: 'block' } }}>
            {bloqueBono(22)}
          </Box>
        </Box>

        {/* Derecha: la escalera del modulo y, debajo, la participacion propia */}
        <Box sx={{ gridArea: 'barras', minWidth: 0, mt: { xs: 1.5, md: 0 }, pt: { md: 0.75 } }}>
          <div ref={medirBarra}>
            {/* Un escalon por nivel, todos del mismo ancho. El marino es lo que
                falta y el naranja lo avanzado dentro de ese escalon. */}
            <Box sx={{ display: 'flex', gap: `${ESCALON_SEPARACION}px` }}>
              {escalones.map((e, i) => {
                const primero = i === 0;
                const ultimo = i === escalones.length - 1;
                const radio = { xs: GROSOR_BARRA_XS / 2, md: GROSOR_BARRA / 2 };
                return (
                  <Box
                    key={`escalon-${e.nivel}`}
                    sx={{
                      flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden',
                      display: 'grid', placeItems: 'center',
                      height: { xs: GROSOR_BARRA_XS, md: GROSOR_BARRA },
                      bgcolor: MARINO,
                      borderTopLeftRadius: primero ? radio : '4px',
                      borderBottomLeftRadius: primero ? radio : '4px',
                      borderTopRightRadius: ultimo ? radio : '4px',
                      borderBottomRightRadius: ultimo ? radio : '4px',
                    }}
                  >
                    {e.lleno > 0 && (
                      <Box
                        sx={{
                          position: 'absolute', top: 0, bottom: 0, left: 0,
                          width: `${e.lleno}%`, bgcolor: NARANJA,
                        }}
                      />
                    )}
                    <Typography
                      sx={{
                        position: 'relative', whiteSpace: 'nowrap',
                        fontSize: { xs: 10, md: 11 }, fontWeight: 700,
                        lineHeight: 1.15, color: 'rgba(255,255,255,0.92)',
                      }}
                    >
                      {e.monto}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
            {/* Lo que paga cada escalon, alineado debajo del suyo */}
            <Box sx={{ display: 'flex', gap: `${ESCALON_SEPARACION}px`, mt: 0.6 }}>
              {escalones.map((e, i) => (
                <Typography
                  key={`bolsa-${e.nivel}`}
                  sx={{
                    flex: 1, minWidth: 0, textAlign: 'center', whiteSpace: 'nowrap',
                    fontSize: { xs: 9, md: 9.5 }, fontWeight: 700, lineHeight: 1.15,
                    color: e.ganado ? NARANJA : 'text.secondary',
                  }}
                >
                  {i === 0 && !corto ? `paga ${dinero(e.bolsa)}` : dinero(e.bolsa)}
                </Typography>
              ))}
            </Box>
          </div>

          <Box sx={{ mt: { xs: 1.5, md: 0.5 } }}>
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
          </Box>

          {/* Bloque 4: en movil arranca con el bono; en md solo la semana y la
              tira, que es informacion secundaria y va compacta. El bono queda
              fuera del {semana} para que no desaparezca si mi-semana no responde. */}
          <Box sx={{ mt: { xs: 1.5, md: 0.6 } }}>
            <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 1 }}>
              {bloqueBono(24)}
            </Box>

            {semana && (
              <>
                <Typography sx={{ fontSize: { xs: 10, md: 9 }, lineHeight: 1.3, color: 'text.secondary' }}>
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
                          py: { xs: '4px', md: '2px' }, borderRadius: '4px', boxSizing: 'border-box',
                          bgcolor: !d.cuenta ? TIRA_APAGADO_FONDO : ganado ? TIRA_GANADO_FONDO : '#fff',
                          border: esHoy
                            ? `2px solid ${AZUL}`
                            : `1px solid ${ganado ? ESMERALDA : PISTA}`,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: { xs: 10, md: 9 }, lineHeight: 1.3,
                            color: d.cuenta ? 'text.secondary' : TIRA_APAGADO_TEXTO,
                          }}
                        >
                          {d.dia}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: { xs: 12, md: 11 }, fontWeight: 800, lineHeight: 1.3,
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
                      py: { xs: '4px', md: '2px' }, borderRadius: '4px', boxSizing: 'border-box',
                      bgcolor: TIRA_TOTAL_FONDO, border: `1px solid ${AZUL}`,
                    }}
                  >
                    <Typography sx={{ fontSize: { xs: 10, md: 9 }, lineHeight: 1.3, color: 'text.secondary' }}>
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
              </>
            )}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}
