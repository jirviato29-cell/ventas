import { useState, useEffect, useCallback } from 'react';
import { Box, Grid, Paper, Typography, LinearProgress } from '@mui/material';
import axios from 'axios';

type Fila = { modulo: string; valor: number };
type Data = { actualizado: string; accesorios: Fila[]; telefonos: Fila[] };

const API = 'https://ato-appservidor-nvxt.onrender.com';

function ListaRanking({
  titulo, filas, formato,
}: { titulo: string; filas: Fila[]; formato: (v: number) => string }) {
  const max = Math.max(1, ...filas.map((f) => f.valor));
  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
        {titulo}
      </Typography>
      {filas.map((f, i) => (
        <Box key={f.modulo} sx={{ mb: 1.2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {i + 1}. {f.modulo}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {formato(f.valor)}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(f.valor / max) * 100}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      ))}
    </Paper>
  );
}

export default function RankingModulos() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/estadisticas/ranking-modulos-hoy`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 60 * 60 * 1000); // refresco cada hora
    return () => clearInterval(id);
  }, [cargar]);

  if (error || !data) return null;

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Ranking del día · actualizado {data.actualizado}
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <ListaRanking
            titulo="Accesorios ($ del día)"
            filas={data.accesorios}
            formato={(v) => `$${v.toLocaleString('es-MX')}`}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <ListaRanking
            titulo="Teléfonos (cantidad del día)"
            filas={data.telefonos}
            formato={(v) => `${v}`}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
