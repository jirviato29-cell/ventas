import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import TiraAsistenciaSemana from '../components/TiraAsistenciaSemana';
import CheckInBES from '../components/CheckInBES';

const MiAsistenciaPage: React.FC = () => {
  return (
    <Container sx={{ mt: 4, mb: 6 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Check-in / Check-out
      </Typography>

      <Box sx={{ mt: 2 }}>
        <TiraAsistenciaSemana />
      </Box>

      {/* CheckInBES trae su propio Paper y titulo: si no aplica devuelve null
          y no queda ningun recuadro vacio en la pagina. */}
      <Box sx={{ mt: 3 }}>
        <CheckInBES />
      </Box>
    </Container>
  );
};

export default MiAsistenciaPage;
