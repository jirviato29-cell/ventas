import React from 'react';
import { Container } from '@mui/material';
import CheckInBES from '../components/CheckInBES';

const CheckInBESPage: React.FC = () => {
  return (
    <Container sx={{ mt: 4, mb: 6 }}>
      {/* CheckInBES trae su titulo, su Paper y su propio gate: si no aplica
          devuelve null y la pagina queda completamente vacia, sin titulo huerfano. */}
      <CheckInBES />
    </Container>
  );
};

export default CheckInBESPage;
