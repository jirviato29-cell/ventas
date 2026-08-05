import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';

const API = 'https://ato-appservidor-nvxt.onrender.com';

const Marquesina: React.FC = () => {
  const [texto, setTexto] = useState('');

  const cargar = async () => {
    try {
      const res = await fetch(`${API}/config/marquesina`);
      if (res.ok) {
        const data = await res.json();
        setTexto(data.texto ?? '');
      }
    } catch {
      // silencioso — la franja simplemente no aparece
    }
  };

  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, 5 * 60 * 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!texto.trim()) return null;

  return (
    <Box
      sx={{
        bgcolor: '#f97316',
        height: 22,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Box
        component="span"
        sx={{
          color: '#fff',
          fontWeight: 700,
          fontSize: 12,
          whiteSpace: 'nowrap',
          display: 'inline-block',
          animation: 'marquee 35s linear infinite',
          '@keyframes marquee': {
            '0%':   { transform: 'translateX(100vw)' },
            '100%': { transform: 'translateX(-100%)' },
          },
        }}
      >
        {texto}
      </Box>
    </Box>
  );
};

export default Marquesina;
