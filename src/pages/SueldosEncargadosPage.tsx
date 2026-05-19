import React from "react";
import { Box, Typography } from "@mui/material";
import ConstructionIcon from "@mui/icons-material/Construction";

const SueldosEncargadosPage: React.FC = () => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="60vh"
      gap={2}
    >
      <ConstructionIcon sx={{ fontSize: 64, color: "#f97316" }} />
      <Typography variant="h4" fontWeight={700} color="#1e293b">
        Sueldos Encargados
      </Typography>
      <Typography variant="body1" color="text.secondary">
        En construcción
      </Typography>
    </Box>
  );
};

export default SueldosEncargadosPage;
