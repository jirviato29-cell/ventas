import React from "react";
import { Box, Container, Paper, Typography } from "@mui/material";
import VisorImagen from "../components/VisorImagen";

// Imágenes servidas desde public/ofertas/
const OFERTAS = [
  { titulo: "Boletín 63", src: "/ofertas/boletin-63.jpg" },
  { titulo: "Amigo Kit", src: "/ofertas/amigo-kit.jpg" },
  { titulo: "Paquetes Amigo Sin Límite", src: "/ofertas/paquetes-amigo-sin-limite.jpg" },
  { titulo: "Paquetes de Internet Amigo", src: "/ofertas/paquetes-internet-amigo.jpg" },
  { titulo: "Portabilidad", src: "/ofertas/portabilidad.jpg" },
  { titulo: "Planes Telcel Libre", src: "/ofertas/planes-telcel-libre.jpg" },
  { titulo: "Planes Telcel Ultra", src: "/ofertas/planes-telcel-ultra.jpg" },
];

const OfertasComercialesPage: React.FC = () => {
  return (
    <Container sx={{ mt: 4, mb: 6 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, color: "#1e293b", mb: 3 }}>
        Ofertas comerciales
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
          gap: 2,
        }}
      >
        {OFERTAS.map((o) => (
          <Paper key={o.src} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#1e293b", mb: 1.5 }}>
              {o.titulo}
            </Typography>
            <VisorImagen src={o.src} alt={o.titulo} />
          </Paper>
        ))}
      </Box>
    </Container>
  );
};

export default OfertasComercialesPage;
