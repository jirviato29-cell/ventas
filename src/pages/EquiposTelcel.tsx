import React, { useState } from "react";
import { Box, Container, Typography, TextField } from "@mui/material";
import axios from "axios";

const BASE = "https://ato-appservidor-nvxt.onrender.com";

const EquiposTelcel = () => {
  const [subiendo, setSubiendo] = useState(false);

  const token = localStorage.getItem("token");
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const manejarArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setSubiendo(true);

    const formData = new FormData();
    formData.append("archivo", archivo);

    try {
      const res = await axios.post(
        `${BASE}/equipos_telcel/upload/`,
        formData,
        {
          headers: {
            ...config.headers,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      alert(
        `Carga terminada. Insertados: ${res.data.insertados}. Saltados por repetidos: ${res.data.saltados_repetidos}.`
      );
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al procesar el archivo Excel");
    } finally {
      setSubiendo(false);
      e.target.value = "";
    }
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Carga de Equipos Telcel (IMEI)
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          El Excel debe contener las columnas: <strong>imei</strong>,{" "}
          <strong>clave</strong>, <strong>producto</strong>,{" "}
          <strong>fecha_compra</strong>.
        </Typography>

        <TextField
          type="file"
          inputProps={{ accept: ".xlsx,.xls" }}
          onChange={manejarArchivo}
          disabled={subiendo}
          variant="outlined"
          sx={{ mb: 3 }}
        />
      </Box>
    </Container>
  );
};

export default EquiposTelcel;
