import React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import RankingModulos from '../components/RankingModulos';
import { obtenerRolDesdeToken } from '../components/Token';

// "¿Cómo van?": ranking de módulos que antes vivía a la derecha de Registrar Venta.
// Las 3 tablas a la vez: 3 columnas en pantalla grande, una debajo de otra en celular.
// Mismas reglas que tenía ahí: asesor y encargado, nunca Cadenas.
const ComoVanPage: React.FC = () => {
  const rol = obtenerRolDesdeToken();
  const esCadenas = (localStorage.getItem('modulo') || '').toLowerCase().includes('cadena');
  if ((rol !== 'asesor' && rol !== 'encargado') || esCadenas) {
    return <Navigate to="/ventas" replace />;
  }

  return (
    <Box sx={{ px: { xs: 1.5, md: 3 }, mt: 3, mb: 6 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b', mb: 2 }}>
        ¿Cómo van?
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        <RankingModulos solo="accesorios" />
        <RankingModulos solo="telefonos" />
        <RankingModulos solo="planes" />
      </Box>
    </Box>
  );
};

export default ComoVanPage;
