import React, { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  Alert,
  TextField,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

const API = "https://ato-appservidor-nvxt.onrender.com";
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` });

const hoy = () => new Date().toISOString().slice(0, 10);

const ReportesDirector: React.FC = () => {
  const [fecha, setFecha] = useState<string>(hoy());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const descargarPDF = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `${API}/direccion/reporte-diario/pdf?fecha=${fecha}`,
        { headers: authH() },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_${fecha}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError('No se pudo generar el reporte. Verifica la fecha e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', p: { xs: 2, sm: 4 } }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Reportes Director
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Descarga el reporte diario de ventas en PDF.
      </Typography>

      <Box display="flex" flexDirection="column" gap={3}>
        <TextField
          label="Fecha del reporte"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
          sx={{
            '& .MuiOutlinedInput-root:hover fieldset': { borderColor: '#FF6600' },
            '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: '#FF6600' },
            '& label.Mui-focused': { color: '#FF6600' },
          }}
        />

        <Button
          variant="contained"
          size="large"
          startIcon={loading ? <CircularProgress size={18} sx={{ color: 'white' }} /> : <PictureAsPdfIcon />}
          onClick={descargarPDF}
          disabled={loading || !fecha}
          sx={{
            bgcolor: '#FF6600',
            fontWeight: 700,
            fontSize: 15,
            py: 1.5,
            '&:hover': { bgcolor: '#ea5c00' },
            '&:disabled': { bgcolor: '#ffb380', color: 'white' },
          }}
        >
          {loading ? 'Generando...' : 'Descargar PDF'}
        </Button>

        {error && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        )}
      </Box>
    </Box>
  );
};

export default ReportesDirector;
