import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Container, Typography } from '@mui/material';
import axios from 'axios';
import RecibosPanel from '../components/RecibosPanel';

const API = 'https://ato-appservidor-nvxt.onrender.com';

interface Modulo {
  id: number;
  nombre: string;
}

const RecibosPage: React.FC = () => {
  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    axios
      .get<Modulo[]>(`${API}/registro/modulos`, config)
      .then((r) => setModulos(r.data))
      .catch((e) => console.error('Error cargando módulos:', e))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Container sx={{ mt: 4, mb: 6 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Recibos
      </Typography>

      {cargando ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <RecibosPanel esAdmin modulos={modulos} />
      )}
    </Container>
  );
};

export default RecibosPage;
