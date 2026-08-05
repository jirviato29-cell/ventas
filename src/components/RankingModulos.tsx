import { useState, useEffect, useCallback } from 'react';
import { Box, Grid, Paper, Typography, Avatar } from '@mui/material';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import DescriptionIcon from '@mui/icons-material/Description';
import axios from 'axios';

type Fila = { modulo: string; valor: number };
type Data = { actualizado: string; accesorios: Fila[]; telefonos: Fila[]; planes: Fila[]; accesorios_mes?: Fila[]; telefonos_mes?: Fila[] };

const API = 'https://ato-appservidor-nvxt.onrender.com';

const COLORS = {
  acc: { main: '#7c3aed', light: '#ede9fe', banner: 'linear-gradient(90deg, #fb923c 0%, #f97316 60%, #ea580c 100%)', accent: '#f97316' },
  tel: { main: '#0891b2', light: '#cffafe', banner: 'linear-gradient(90deg, #22d3ee 0%, #06b6d4 60%, #0891b2 100%)', accent: '#0891b2' },
  pln: { main: '#16a34a', light: '#dcfce7', banner: 'linear-gradient(90deg, #4ade80 0%, #22c55e 60%, #16a34a 100%)', accent: '#16a34a' },
};

function medalla(pos: number) {
  if (pos === 1) return '#f59e0b';
  if (pos === 2) return '#9ca3af';
  if (pos === 3) return '#d97706';
  return null;
}

function Tarjeta({
  titulo, icono, sufijo, filas, miModulo, color, formato, unidad,
}: {
  titulo: string;
  icono: React.ReactNode;
  sufijo: string;
  filas: Fila[];
  miModulo: string;
  color: { main: string; light: string; banner: string; accent: string };
  formato: (v: number) => string;
  unidad: string;
}) {
  const max = Math.max(1, ...filas.map((f) => f.valor));
  const miIndex = filas.findIndex((f) => f.modulo === miModulo);
  const miFila = miIndex >= 0 ? filas[miIndex] : null;

  return (
    <Paper sx={{ p: 0, overflow: 'hidden', borderRadius: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, py: 0.6 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ color: color.main, display: 'flex' }}>{icono}</Box>
          <Typography sx={{ fontWeight: 700 }}>{titulo}</Typography>
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {sufijo}
        </Typography>
      </Box>

      {/* Banner "Vas en el lugar X de N" */}
      {miFila && (
        <Box sx={{ mx: 1.5, mb: 0.8, borderRadius: 2, px: 1.5, py: 0.6, background: color.banner, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 18 }}>#{miIndex + 1}</Typography>
            <Box>
              <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', textTransform: 'uppercase', fontWeight: 700, fontSize: 9 }}>
                Tu sucursal · {miModulo}
              </Typography>
              <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                Vas en el lugar {miIndex + 1} de {filas.length}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontWeight: 800, fontSize: 15 }}>{formato(miFila.valor)}</Typography>
            <Typography sx={{ fontSize: 9, opacity: 0.9, fontWeight: 600, mt: -0.3 }}>{unidad}</Typography>
          </Box>
        </Box>
      )}

      <Box sx={{ borderTop: '1px solid #eef0f3', mx: 2, mb: 1 }} />

      {/* Filas del ranking */}
      <Box sx={{ px: 1.5, pb: 1 }}>
        {filas.map((f, i) => {
          const esMio = f.modulo === miModulo;
          const colorMedalla = medalla(i + 1);
          return (
            <Box
              key={f.modulo}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.8, py: 0.15, px: esMio ? 0.8 : 0,
                position: 'relative',
                borderRadius: 1.5,
                border: esMio ? `2px solid ${color.accent}` : '2px solid transparent',
                mb: 0.1,
              }}
            >
              {/* Posición / medalla */}
              {colorMedalla ? (
                <Avatar sx={{ width: 17, height: 17, fontSize: 10, fontWeight: 700, bgcolor: colorMedalla, color: '#fff' }}>
                  {i + 1}
                </Avatar>
              ) : (
                <Typography sx={{ width: 17, textAlign: 'center', fontWeight: 600, color: 'text.secondary', fontSize: 11 }}>
                  {i + 1}
                </Typography>
              )}

              {/* Nombre */}
              <Typography sx={{ width: 32, fontWeight: 700, fontSize: 11 }}>{f.modulo}</Typography>

              {/* Barra */}
              <Box sx={{ flex: 1, height: 6, borderRadius: 5, bgcolor: '#eef0f3', overflow: 'hidden' }}>
                <Box sx={{ width: `${(f.valor / max) * 100}%`, height: '100%', borderRadius: 5, background: esMio ? color.accent : color.main }} />
              </Box>

              {/* Valor */}
              <Typography sx={{ minWidth: 48, textAlign: 'right', fontWeight: 700, fontSize: 11, color: f.valor === 0 ? 'text.disabled' : 'text.primary' }}>
                {formato(f.valor)}
              </Typography>

              {/* Etiqueta TÚ */}
              {esMio && (
                <Box sx={{ position: 'absolute', top: -8, right: 6, background: color.accent, color: '#fff', fontSize: 9, fontWeight: 800, px: 0.8, py: 0.1, borderRadius: 1 }}>
                  TÚ
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}

export default function RankingModulos({ solo, moduloOverride, fecha }: { solo?: 'accesorios' | 'telefonos' | 'planes' | 'accesorios_mes' | 'telefonos_mes'; moduloOverride?: string; fecha?: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);
  const miModulo = (moduloOverride ?? localStorage.getItem('modulo') ?? '').trim();

  const cargar = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/estadisticas/ranking-modulos-hoy`, {
        headers: { Authorization: `Bearer ${token}` },
        params: fecha ? { fecha } : {},
      });
      setData(res.data);
      setError(false);
    } catch {
      setError(true);
    }
  }, [fecha]);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [cargar]);

  if (error || !data) return null;

  return (
    <Box sx={{ mb: 2 }}>
      <Grid container spacing={2}>
        {solo !== 'telefonos' && solo !== 'planes' && solo !== 'accesorios_mes' && solo !== 'telefonos_mes' && (
          <Grid item xs={12} md={solo ? 12 : 6}>
            <Tarjeta
              titulo="Accesorios"
              icono={<HeadphonesIcon />}
              sufijo="$ del día"
              filas={data.accesorios}
              miModulo={miModulo}
              color={COLORS.acc}
              formato={(v) => `$${Math.round(v).toLocaleString('es-MX')}`}
              unidad="vendido"
            />
          </Grid>
        )}
        {solo !== 'accesorios' && solo !== 'planes' && solo !== 'accesorios_mes' && solo !== 'telefonos_mes' && (
          <Grid item xs={12} md={solo ? 12 : 6}>
            <Tarjeta
              titulo="Teléfonos"
              icono={<SmartphoneIcon />}
              sufijo="cantidad del día"
              filas={data.telefonos}
              miModulo={miModulo}
              color={COLORS.tel}
              formato={(v) => `${v}`}
              unidad="equipos"
            />
          </Grid>
        )}
        {solo === 'planes' && (
          <Grid item xs={12}>
            <Tarjeta
              titulo="Planes"
              icono={<DescriptionIcon />}
              sufijo="planes del mes"
              filas={data.planes}
              miModulo={miModulo}
              color={COLORS.pln}
              formato={(v) => `${v}`}
              unidad="planes"
            />
          </Grid>
        )}
        {solo === 'accesorios_mes' && (
          <Grid item xs={12}>
            <Tarjeta
              titulo="Accesorios"
              icono={<HeadphonesIcon />}
              sufijo="$ del mes"
              filas={data.accesorios_mes || []}
              miModulo={miModulo}
              color={COLORS.acc}
              formato={(v) => `$${Math.round(v).toLocaleString('es-MX')}`}
              unidad="vendido"
            />
          </Grid>
        )}
        {solo === 'telefonos_mes' && (
          <Grid item xs={12}>
            <Tarjeta
              titulo="Teléfonos"
              icono={<SmartphoneIcon />}
              sufijo="cantidad del mes"
              filas={data.telefonos_mes || []}
              miModulo={miModulo}
              color={COLORS.tel}
              formato={(v) => `${v}`}
              unidad="equipos"
            />
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
