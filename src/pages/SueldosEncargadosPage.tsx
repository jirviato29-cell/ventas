import React, { useState } from "react";
import { Box, Button, Paper, Typography } from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import type { Dayjs } from "dayjs";
import "dayjs/locale/es";

const MODULOS = [
  "V2", "Cadenas C.", "MI2", "BO", "M1", "M2", "VI", "MF",
  "AL", "DR", "HA", "VL", "R1", "GI", "PS", "WA", "SA", "Uni", "U2", "RO",
];

const fmtDia = (d: Dayjs) => d.locale("es").format("D MMM");

const SueldosEncargadosPage: React.FC = () => {
  const [fechaInicio, setFechaInicio] = useState<Dayjs | null>(null);
  const [moduloSel, setModuloSel] = useState<string | null>(null);

  const fechaFin = fechaInicio ? fechaInicio.add(6, "day") : null;
  const labelCiclo =
    fechaInicio && fechaFin
      ? `${fmtDia(fechaInicio)} → ${fmtDia(fechaFin)}`
      : null;

  return (
    <Box sx={{ p: 3, maxWidth: 960, mx: "auto" }}>
      <Typography variant="h5" fontWeight={700} color="#1e293b" mb={3}>
        Sueldos Encargados
      </Typography>

      {/* ── Filtros ─────────────────────────────────────────────────── */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        {/* Date picker + label ciclo */}
        <Box display="flex" alignItems="center" gap={2} mb={2.5} flexWrap="wrap">
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
            <DatePicker
              label="Inicio del ciclo (viernes)"
              value={fechaInicio}
              onChange={(val) => setFechaInicio(val)}
              shouldDisableDate={(d) => d.day() !== 5}
              slotProps={{ textField: { size: "small" } }}
            />
          </LocalizationProvider>

          {labelCiclo && (
            <Typography fontWeight={600} color="#f97316" fontSize={15}>
              Ciclo:&nbsp;{labelCiclo}
            </Typography>
          )}
        </Box>

        {/* Botones de módulo */}
        <Box display="flex" flexWrap="wrap" gap={1}>
          {MODULOS.map((m) => {
            const activo = moduloSel === m;
            return (
              <Button
                key={m}
                size="small"
                variant={activo ? "contained" : "outlined"}
                onClick={() => setModuloSel(m)}
                sx={{
                  borderColor: "#f97316",
                  color: activo ? "#fff" : "#f97316",
                  bgcolor: activo ? "#f97316" : "transparent",
                  fontWeight: 700,
                  minWidth: 0,
                  px: 1.5,
                  "&:hover": {
                    bgcolor: activo
                      ? "#ea6c00"
                      : "rgba(249,115,22,0.08)",
                    borderColor: "#f97316",
                  },
                }}
              >
                {m}
              </Button>
            );
          })}
        </Box>
      </Paper>

      {/* ── Preview de selección ────────────────────────────────────── */}
      {(moduloSel !== null || labelCiclo !== null) && (
        <Typography color="text.secondary" fontSize={14}>
          Módulo seleccionado:{" "}
          <Box component="span" fontWeight={700} color="#1e293b">
            {moduloSel ?? "—"}
          </Box>
          {labelCiclo && (
            <>
              {" — Ciclo: "}
              <Box component="span" fontWeight={700} color="#1e293b">
                {labelCiclo}
              </Box>
            </>
          )}
        </Typography>
      )}
    </Box>
  );
};

export default SueldosEncargadosPage;
