import { useCallback, useEffect, useState } from 'react';
import { Box, LinearProgress, Paper, Typography } from '@mui/material';
import axios from 'axios';

const API = 'https://ato-appservidor-nvxt.onrender.com';

// Misma paleta que AvanceMetaDia (accesorios) para que las dos franjas se lean igual.
const DORADO = '#eab308';
const DORADO_CLARO = '#fde68a';
const AZUL = '#2563eb';
const ESMERALDA = '#059669';
const PISTA = '#e2e8f0';
const ROJO = '#dc2626';

const TIRA_GANADO_FONDO = '#ecfdf5';
const AVISO_FONDO = '#fef2f2';

const BRILLO = 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 100%)';

const REFRESCO_MS = 60 * 1000;
const GROSOR_BARRA = 22;
const GROSOR_BARRA_XS = 18;

// Participacion minima en validadas de la tienda para cobrar la bolsa semanal.
const PARTICIPACION_SEMANAL_MIN = 30;

type Conteo = {
  subidas: number;
  validadas: number;
  meta: number | null;
  cumplida: boolean;
};

type DiaSemana = {
  fecha: string;
  dia: string;
  subidas: number;
  validadas: number;
  cumplida: boolean;
};

type Promotor = {
  usuario_id: number;
  nombre: string;
  subidas_dia: number;
  validadas_dia: number;
  subidas_semana: number;
  validadas_semana: number;
  subidas_mes: number;
  validadas_mes: number;
  participacion_semana_pct: number;
  participacion_mes_pct: number;
};

type MiAvanceCadenas = {
  aplica: true;
  tienda: { id: number; nombre: string };
  metas: { diaria: number | null; semanal: number | null; mensual: number | null };
  montos: { diaria: number; semanal: number; mensual: number };
  dia: Conteo & { fecha: string };
  semana: Conteo & { inicio: string; fin: string; dias: DiaSemana[] };
  mes: Conteo & { inicio: string; fin: string };
  promotores: Promotor[];
  mi_bolsa: {
    diaria_acumulada: number;
    dias_ganados: number;
    semanal_acumulada: number;
    semanas_ganadas: number;
    semana_en_curso_califica: boolean;
    mensual_estimada: number;
    total_acumulado: number;
  };
};

type Respuesta = MiAvanceCadenas | { aplica: false };

const dinero = (v: number | null | undefined) =>
  `$${num(v).toLocaleString('es-MX', { maximumFractionDigits: 2 })}`;

const porcentaje = (v: number | null | undefined) =>
  `${Number(v ?? 0).toLocaleString('es-MX', { maximumFractionDigits: 1 })}%`;

/** Numero finito o 0: undefined, null, NaN e Infinity no llegan a la pantalla. */
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Ancho de barra 0..100. Sin meta (null o 0) la barra queda vacia. */
const aPct = (v: unknown, meta: unknown) => {
  const m = num(meta);
  return m > 0 ? Math.min(100, Math.max(0, (num(v) / m) * 100)) : 0;
};

const SIN_CONTEO: Conteo = { subidas: 0, validadas: 0, meta: null, cumplida: false };

/** Una barra con dos tonos: claro = subidas, fuerte = validadas encima. */
function BarraMeta({ titulo, conteo: c }: { titulo: string; conteo?: Partial<Conteo> | null }) {
  const conteo = { ...SIN_CONTEO, ...(c ?? {}) };
  const subidas = num(conteo.subidas);
  const validadas = num(conteo.validadas);
  const cumplida = conteo.cumplida === true;
  const faltan = Math.max(0, num(conteo.meta) - validadas);
  return (
    <Box sx={{ minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.5, color: 'text.secondary' }}>
          {titulo}
        </Typography>
        <Typography sx={{ fontSize: { xs: 15, md: 16 }, fontWeight: 800, whiteSpace: 'nowrap' }}>
          {subidas} / {conteo.meta ?? '—'}
        </Typography>
      </Box>
      <Box
        sx={{
          position: 'relative', mt: 0.4,
          height: { xs: GROSOR_BARRA_XS, md: GROSOR_BARRA },
          borderRadius: { xs: GROSOR_BARRA_XS / 2, md: GROSOR_BARRA / 2 },
          bgcolor: PISTA, overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute', top: 0, bottom: 0, left: 0,
            width: `${aPct(subidas, conteo.meta)}%`, bgcolor: DORADO_CLARO,
          }}
        />
        <Box
          sx={{
            position: 'absolute', top: 0, bottom: 0, left: 0,
            width: `${aPct(validadas, conteo.meta)}%`,
            bgcolor: cumplida ? ESMERALDA : DORADO, backgroundImage: BRILLO,
          }}
        />
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mt: 0.3 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>
          Validadas: {validadas}
        </Typography>
        <Typography
          sx={{ fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap', color: cumplida ? ESMERALDA : DORADO }}
        >
          {cumplida ? 'Meta cumplida ✓' : `Faltan ${faltan} validadas`}
        </Typography>
      </Box>
    </Box>
  );
}

export default function ContadorMetasCadenas({
  refrescar = 0,
  usuarioId,
}: {
  refrescar?: number;
  usuarioId?: number | null;
}) {
  const [data, setData] = useState<MiAvanceCadenas | null>(null);

  // Cualquier fallo (500, 401, red) esconde el contador, sin alertas; la
  // pagina sigue funcionando y el siguiente refresco lo vuelve a intentar.
  const cargar = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get<Respuesta>(`${API}/metas-cadenas/mi-avance`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data && res.data.aplica === true ? res.data : null);
    } catch {
      setData(null);
    }
  }, []);

  // Carga inicial y cada vez que VentasPage registra una activacion.
  useEffect(() => {
    cargar();
  }, [refrescar, cargar]);

  useEffect(() => {
    const id = setInterval(cargar, REFRESCO_MS);
    return () => clearInterval(id);
  }, [cargar]);

  if (!data) return null;

  // La respuesta puede venir incompleta: todo se lee con valores por defecto.
  const bolsa: Partial<MiAvanceCadenas['mi_bolsa']> = data.mi_bolsa ?? {};
  const diasGanados = num(bolsa.dias_ganados);
  const semanasGanadas = num(bolsa.semanas_ganadas);
  const promotores = Array.isArray(data.promotores) ? data.promotores.filter(Boolean) : [];
  const diasSemana = Array.isArray(data.semana?.dias) ? data.semana.dias.filter(Boolean) : [];
  const hoy = data.dia?.fecha;
  const yo = promotores.find((p) => p.usuario_id === usuarioId) ?? null;
  const avisoSemanal = yo !== null && num(yo.participacion_semana_pct) < PARTICIPACION_SEMANAL_MIN;

  return (
    <Paper sx={{ px: { xs: 2, md: 2.5 }, py: { xs: 2, md: 1.5 }, mt: { xs: 0.5, sm: 1 }, mb: 1.5, borderRadius: 2 }}>
      {/* Encabezado: tienda y bolsa acumulada del mes */}
      <Box
        sx={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'baseline',
          justifyContent: 'space-between', columnGap: 2, rowGap: 0.5,
        }}
      >
        <Typography sx={{ fontWeight: 800, fontSize: { xs: 18, md: 20 }, minWidth: 0 }}>
          {data.tienda?.nombre ?? ''}
        </Typography>
        <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: 16, md: 18 }, lineHeight: 1.2 }}>
            Bolsa acumulada del mes:{' '}
            <Box component="span" sx={{ color: num(bolsa.total_acumulado) > 0 ? ESMERALDA : 'text.secondary' }}>
              {dinero(bolsa.total_acumulado)}
            </Box>
          </Typography>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', lineHeight: 1.3 }}>
            Diaria {dinero(bolsa.diaria_acumulada)} ({diasGanados} {diasGanados === 1 ? 'día' : 'días'})
            {' · '}Semanal {dinero(bolsa.semanal_acumulada)} ({semanasGanadas}{' '}
            {semanasGanadas === 1 ? 'semana' : 'semanas'})
            {' · '}Mensual estimada {dinero(bolsa.mensual_estimada)}
          </Typography>
        </Box>
      </Box>

      {/* Tres barras: en movil una debajo de otra, en md lado a lado */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(3, minmax(0, 1fr))' },
          columnGap: 3, rowGap: 1.5, mt: 1.5, alignItems: 'start',
        }}
      >
        <BarraMeta titulo="DIARIA" conteo={data.dia} />

        <Box sx={{ minWidth: 0 }}>
          <BarraMeta titulo="SEMANAL" conteo={data.semana} />
          {/* Tira Lun..Dom: validadas grandes, subidas abajo; hoy con borde azul */}
          <Box sx={{ display: 'flex', gap: '4px', mt: 0.75 }}>
            {diasSemana.map((d) => {
              const esHoy = d.fecha === hoy;
              return (
                <Box
                  key={d.fecha}
                  sx={{
                    flex: 1, minWidth: 0, textAlign: 'center',
                    py: { xs: '4px', md: '2px' }, borderRadius: '4px', boxSizing: 'border-box',
                    bgcolor: d.cumplida ? TIRA_GANADO_FONDO : '#fff',
                    border: esHoy ? `2px solid ${AZUL}` : `1px solid ${d.cumplida ? ESMERALDA : PISTA}`,
                  }}
                >
                  <Typography sx={{ fontSize: { xs: 10, md: 9 }, lineHeight: 1.3, color: 'text.secondary' }}>
                    {d.dia}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: { xs: 12, md: 11 }, fontWeight: 800, lineHeight: 1.3,
                      color: d.cumplida ? ESMERALDA : 'text.secondary',
                    }}
                  >
                    {num(d.validadas)}
                  </Typography>
                  <Typography sx={{ fontSize: { xs: 9, md: 8 }, lineHeight: 1.2, color: 'text.secondary' }}>
                    de {num(d.subidas)}
                  </Typography>
                </Box>
              );
            })}
          </Box>
          <Typography sx={{ fontSize: { xs: 10, md: 9 }, mt: 0.3, color: 'text.secondary' }}>
            Validadas de subidas por día
          </Typography>
        </Box>

        <BarraMeta titulo="MENSUAL" conteo={data.mes} />
      </Box>

      {/* Participacion de cada promotor de la tienda */}
      <Box sx={{ mt: 2 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 800 }}>Participación</Typography>

        {avisoSemanal && (
          <Typography
            sx={{
              mt: 0.5, px: 1, py: 0.5, borderRadius: 1, fontSize: 12, fontWeight: 700,
              color: ROJO, bgcolor: AVISO_FONDO,
            }}
          >
            Necesitas mínimo {PARTICIPACION_SEMANAL_MIN}% para la bolsa semanal
          </Typography>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 0.75 }}>
          {promotores.map((p) => {
            const esYo = p.usuario_id === usuarioId;
            return (
              <Box
                key={p.usuario_id}
                sx={{
                  px: 1, py: 0.6, borderRadius: 1,
                  border: esYo ? `2px solid ${AZUL}` : `1px solid ${PISTA}`,
                  bgcolor: esYo ? '#eff6ff' : '#fff',
                }}
              >
                <Typography
                  sx={{
                    fontSize: 13, fontWeight: esYo ? 800 : 700, lineHeight: 1.3,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {p.nombre}{esYo ? ' (tú)' : ''}
                </Typography>
                <Box
                  sx={{
                    display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    columnGap: 2, mt: 0.3,
                  }}
                >
                  {[
                    { etiqueta: 'Mes', validadas: p.validadas_mes, pct: p.participacion_mes_pct },
                    { etiqueta: 'Semana', validadas: p.validadas_semana, pct: p.participacion_semana_pct },
                  ].map((c) => (
                    <Box key={c.etiqueta} sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                        {c.etiqueta}: <b>{num(c.validadas)}</b> val.{' '}
                        <Box component="span" sx={{ color: AZUL, fontWeight: 700 }}>
                          {porcentaje(num(c.pct))}
                        </Box>
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, Math.max(0, num(c.pct)))}
                        sx={{
                          height: 6, borderRadius: 3, mt: 0.25, bgcolor: PISTA,
                          '& .MuiLinearProgress-bar': { bgcolor: AZUL, borderRadius: 3 },
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Paper>
  );
}
