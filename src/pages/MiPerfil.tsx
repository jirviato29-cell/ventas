import React, { useState } from "react";
import { Box, Container, Paper, Typography } from "@mui/material";
import { Navigate } from "react-router-dom";
import { obtenerRolDesdeToken } from "../components/Token";

const AZUL = "#0A2878";

// Meses del calendario de vacaciones (mes en base 0, como Date)
const MESES_VACACIONES = [
  { anio: 2026, mes: 9 },
  { anio: 2026, mes: 10 },
  { anio: 2026, mes: 11 },
  { anio: 2027, mes: 0 },
  { anio: 2027, mes: 1 },
  { anio: 2027, mes: 2 },
];

const NOMBRES_MES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];

// Clave YYYY-MM-DD en hora local
const claveFecha = (anio: number, mes: number, dia: number) =>
  `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

const hoyLocal = () => new Date().toLocaleDateString("en-CA");

interface MesProps {
  anio: number;
  mes: number;
  hoy: string;
  seleccionadas: Set<string>;
  onToggle: (clave: string) => void;
}

const MesCalendario: React.FC<MesProps> = ({ anio, mes, hoy, seleccionadas, onToggle }) => {
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  // getDay(): 0 = domingo; lo pasamos a 0 = lunes
  const huecosInicio = (new Date(anio, mes, 1).getDay() + 6) % 7;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography sx={{ fontWeight: 700, color: "#1e293b", textAlign: "center", mb: 1.5 }}>
        {NOMBRES_MES[mes]} {anio}
      </Typography>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5 }}>
        {DIAS_SEMANA.map((d, i) => (
          <Typography
            key={`h-${i}`}
            sx={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: "#64748b", pb: 0.5 }}
          >
            {d}
          </Typography>
        ))}

        {Array.from({ length: huecosInicio }).map((_, i) => (
          <Box key={`v-${i}`} />
        ))}

        {Array.from({ length: diasEnMes }).map((_, i) => {
          const dia = i + 1;
          const clave = claveFecha(anio, mes, dia);
          const pasado = clave < hoy;
          const esHoy = clave === hoy;
          const marcado = seleccionadas.has(clave);

          return (
            <Box
              key={clave}
              component="button"
              type="button"
              disabled={pasado}
              onClick={() => onToggle(clave)}
              sx={{
                aspectRatio: "1 / 1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "6px",
                fontSize: 14,
                fontWeight: marcado || esHoy ? 700 : 500,
                fontFamily: "inherit",
                p: 0,
                cursor: pasado ? "default" : "pointer",
                border: esHoy ? `2px solid ${AZUL}` : "1px solid #e2e8f0",
                bgcolor: marcado ? AZUL : pasado ? "#f1f5f9" : "#fff",
                color: marcado ? "#fff" : pasado ? "#cbd5e1" : "#1e293b",
                transition: "background-color 0.15s ease",
                // Solo con mouse: en celular el hover se queda pegado tras tocar
                "@media (hover: hover)": !pasado && !marcado
                  ? { "&:hover": { bgcolor: "rgba(10,40,120,0.08)" } }
                  : undefined,
              }}
            >
              {dia}
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
};

const MiPerfil = () => {
  const rol = obtenerRolDesdeToken();
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const hoy = hoyLocal();

  const toggleDia = (clave: string) => {
    if (clave < hoy) return;
    setSeleccionadas((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(clave)) nuevo.delete(clave);
      else nuevo.add(clave);
      return nuevo;
    });
  };

  if (rol !== "admin") return <Navigate to="/" replace />;

  const total = seleccionadas.size;

  return (
    <Container sx={{ mt: 4, mb: 6 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, color: "#1e293b", mb: 3 }}>
        Mi Perfil
      </Typography>

      <Typography variant="h6" sx={{ fontWeight: 700, color: "#1e293b", mb: 2 }}>
        Vacaciones
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
          gap: 2,
        }}
      >
        {MESES_VACACIONES.map(({ anio, mes }) => (
          <MesCalendario
            key={`${anio}-${mes}`}
            anio={anio}
            mes={mes}
            hoy={hoy}
            seleccionadas={seleccionadas}
            onToggle={toggleDia}
          />
        ))}
      </Box>

      <Paper sx={{ mt: 2, p: 2, textAlign: "center" }}>
        <Typography sx={{ fontWeight: 700, color: AZUL }}>
          {total} {total === 1 ? "día seleccionado" : "días seleccionados"}
        </Typography>
      </Paper>
    </Container>
  );
};

export default MiPerfil;
