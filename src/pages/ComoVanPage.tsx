import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Button, Container, Typography } from '@mui/material';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import DescriptionIcon from '@mui/icons-material/Description';
import RankingModulos from '../components/RankingModulos';
import { obtenerRolDesdeToken } from '../components/Token';

// "¿Cómo van?": ranking de módulos ($ del día) que antes vivía a la derecha de
// Registrar Venta. Mismas reglas que tenía ahí: asesor y encargado, nunca Cadenas.
const ComoVanPage: React.FC = () => {
  const [rankingSel, setRankingSel] = useState<'accesorios' | 'telefonos' | 'planes'>('accesorios');

  const rol = obtenerRolDesdeToken();
  const esCadenas = (localStorage.getItem('modulo') || '').toLowerCase().includes('cadena');
  if ((rol !== 'asesor' && rol !== 'encargado') || esCadenas) {
    return <Navigate to="/ventas" replace />;
  }

  return (
    <Container maxWidth="md" sx={{ mt: 3, mb: 6 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b', mb: 2 }}>
        ¿Cómo van?
      </Typography>

      {/* Selector de ranking: una sola tarjeta, se elige cuál ver */}
      <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
        {([
          { v: 'accesorios', t: 'Accesorios', icono: <HeadphonesIcon fontSize="small" /> },
          { v: 'telefonos',  t: 'Teléfonos',  icono: <SmartphoneIcon fontSize="small" /> },
          { v: 'planes',     t: 'Planes',     icono: <DescriptionIcon fontSize="small" /> },
        ] as const).map((op) => (
          <Button
            key={op.v}
            size="small"
            startIcon={op.icono}
            variant={rankingSel === op.v ? 'contained' : 'outlined'}
            onClick={() => setRankingSel(op.v)}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            {op.t}
          </Button>
        ))}
      </Box>
      <RankingModulos solo={rankingSel} />
    </Container>
  );
};

export default ComoVanPage;
