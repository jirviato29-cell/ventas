import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import TiraAsistenciaSemana from '../components/TiraAsistenciaSemana';

const MiAsistenciaPage: React.FC = () => {
  return (
    <Container sx={{ mt: 4, mb: 6 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Check-in / Check-out
      </Typography>

      <Box sx={{ mt: 2 }}>
        <TiraAsistenciaSemana />
      </Box>
    </Container>
  );
};

export default MiAsistenciaPage;
