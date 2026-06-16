import React, { useEffect, useState } from "react";
import { Box, Container, MenuItem, Select, Typography } from "@mui/material";
import { Navigate } from "react-router-dom";
import axios from "axios";
import { obtenerRolDesdeToken } from "../components/Token";
import RankingModulos from "../components/RankingModulos";

const BASE = "https://ato-appservidor-nvxt.onrender.com";

interface Modulo {
  id: number;
  nombre: string;
}

const PresionAdmin = () => {
  const rol = obtenerRolDesdeToken();
  const token = localStorage.getItem("token");
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [moduloSel, setModuloSel] = useState<string>("");

  useEffect(() => {
    const cargar = async () => {
      try {
        const r = await axios.get(`${BASE}/registro/modulos`, config);
        const lista: Modulo[] = (r.data || []).filter((m: Modulo) => m.nombre);
        setModulos(lista);
        if (lista.length > 0) setModuloSel(lista[0].nombre);
      } catch {
        // sin módulos, el selector queda vacío
      }
    };
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (rol !== "admin") return <Navigate to="/" replace />;

  return (
    <Container maxWidth={false} sx={{ py: 3, px: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: "#1e293b" }}>
          Presión por módulo
        </Typography>
        <Select
          size="small"
          value={moduloSel}
          onChange={(e) => setModuloSel(e.target.value)}
          sx={{ minWidth: 180, height: 38, borderRadius: "8px", fontSize: 14 }}
        >
          {modulos.map((m) => (
            <MenuItem key={m.id} value={m.nombre}>{m.nombre}</MenuItem>
          ))}
        </Select>
      </Box>

      {moduloSel && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 2 }}>
          <RankingModulos solo="accesorios" moduloOverride={moduloSel} />
          <RankingModulos solo="telefonos" moduloOverride={moduloSel} />
          <RankingModulos solo="planes" moduloOverride={moduloSel} />
        </Box>
      )}
    </Container>
  );
};

export default PresionAdmin;
