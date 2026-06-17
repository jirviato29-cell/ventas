import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Paper } from '@mui/material';
import axios from "axios";
import { useNavigate } from 'react-router-dom';
import logo from '../ATO.jpeg';

const LoginPage: React.FC = () => {
  const [nombre, setNombre] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navegacion = useNavigate();
  

  const handleLogin = async () => {
    const formData = new URLSearchParams();
    formData.append('username', nombre);
    formData.append('password', password);

    try {
      const response = await axios.post(`https://ato-appservidor-nvxt.onrender.com/auth/token`, formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem("token", response.data.access_token);
      localStorage.setItem("usuario", response.data.usuario || "");
      localStorage.setItem("modulo", response.data.modulo || "");
      localStorage.setItem("rol", response.data.rol || "");

      window.dispatchEvent(new Event("storage"));

      const modulo = response.data.modulo || "";
      const rol = response.data.rol || "";

      sessionStorage.removeItem("cadena_seleccionada");

      if (rol === "direccion") {
        navegacion("/direccion");
      } else if (rol === "check") {
        navegacion("/checkin");
      } else {
        const esCadenasAsesor =
          modulo?.toLowerCase().includes("cadena") &&
          rol?.toLowerCase().includes("asesor");
        navegacion(esCadenasAsesor ? "/seleccionar-cadena" : "/ventas");
      }
    } catch (err) {
      setError('Credenciales inválidas. Intenta nuevamente.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 59px)',
        bgcolor: '#f1f5f9',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          bgcolor: 'white',
          borderRadius: 2,
          px: 3,
          py: 1.5,
          mb: 3,
          display: 'inline-flex',
          alignItems: 'center',
          boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0',
        }}
      >
        <img src={logo} alt="ATO" style={{ height: 52, display: 'block' }} />
      </Box>

      <Typography
        variant="body2"
        sx={{ color: '#64748b', mb: 3, letterSpacing: 1 }}
      >
        Sistema de Gestión
      </Typography>

      <Paper
        elevation={0}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 420,
          borderRadius: 2,
        }}
      >
        <Typography
          variant="h6"
          gutterBottom
          sx={{ color: '#1e293b', mb: 2, fontWeight: 600 }}
        >
          Iniciar Sesión
        </Typography>

        {error && (
          <Typography
            sx={{
              color: '#ef4444',
              mb: 1.5,
              fontSize: 14,
              bgcolor: 'rgba(239,68,68,0.08)',
              p: 1,
              borderRadius: 1,
              border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            {error}
          </Typography>
        )}

        <TextField
          fullWidth
          label="Usuario"
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={handleKeyDown}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          margin="normal"
        />

        <Button
          variant="contained"
          fullWidth
          sx={{ mt: 2.5, py: 1.4, fontWeight: 700, fontSize: 15 }}
          onClick={handleLogin}
        >
          Iniciar sesión
        </Button>
      </Paper>
    </Box>
  );
};

export default LoginPage;
