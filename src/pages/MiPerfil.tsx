import React, { useState } from "react";
import { Alert, Box, Button, Container, Paper, Snackbar, Typography } from "@mui/material";
import { Navigate } from "react-router-dom";
import { obtenerRolDesdeToken } from "../components/Token";

const AZUL = "#0A2878";
const ROJO_FONDO = "#FDE2E2";
const ROJO_TEXTO = "#B91C1C";

// Periodos en los que no se pueden pedir vacaciones (fechas YYYY-MM-DD, ambos días incluidos).
// Se comparan como texto, así no intervienen horas ni zona horaria.
const PERIODOS_BLOQUEADOS = [
  {
    inicio: "2026-11-13",
    fin: "2026-11-16",
    motivo: "Periodo de ventas del Buen Fin: no se pueden ingresar vacaciones.",
  },
  {
    inicio: "2026-12-07",
    fin: "2027-01-07",
    motivo: "Periodo de ventas navideñas: no se pueden ingresar vacaciones.",
  },
];

const periodoBloqueado = (clave: string) =>
  PERIODOS_BLOQUEADOS.find((p) => clave >= p.inicio && clave <= p.fin);

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

const MAX_DIAS_POR_BLOQUE = 6;
// Días libres mínimos entre bloques: si uno termina el 28 feb, el siguiente puede empezar el 16 mar
const DIAS_ENTRE_BLOQUES = 15;

// Suma n días a una clave YYYY-MM-DD; se calcula en UTC para que no influya la zona horaria
const sumarDias = (clave: string, n: number) => {
  const [anio, mes, dia] = clave.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + n)).toISOString().slice(0, 10);
};

interface Bloque {
  mes: string; // YYYY-MM
  inicio: string;
  fin: string;
  dias: number;
}

// Cada mes tiene a lo sumo un bloque de días seguidos, así que basta con agrupar por mes
const agruparBloques = (seleccionadas: Set<string>): Bloque[] => {
  const porMes = new Map<string, Bloque>();
  Array.from(seleccionadas).sort().forEach((clave) => {
    const mes = clave.slice(0, 7);
    const b = porMes.get(mes);
    if (b) {
      b.fin = clave;
      b.dias++;
    } else {
      porMes.set(mes, { mes, inicio: clave, fin: clave, dias: 1 });
    }
  });
  return Array.from(porMes.values());
};

// ¿Quedan al menos DIAS_ENTRE_BLOQUES días libres entre la fecha y el bloque?
const respetaSeparacion = (clave: string, b: Bloque) =>
  clave > sumarDias(b.fin, DIAS_ENTRE_BLOQUES) || clave < sumarDias(b.inicio, -DIAS_ENTRE_BLOQUES);

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
          // Un día pasado queda gris aunque caiga en un periodo bloqueado
          const bloqueado = !pasado && !!periodoBloqueado(clave);

          return (
            <Box
              key={clave}
              component="button"
              type="button"
              disabled={pasado}
              aria-disabled={bloqueado || undefined}
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
                cursor: pasado ? "default" : bloqueado ? "not-allowed" : "pointer",
                border: esHoy ? `2px solid ${AZUL}` : "1px solid #e2e8f0",
                bgcolor: marcado ? AZUL : bloqueado ? ROJO_FONDO : pasado ? "#f1f5f9" : "#fff",
                color: marcado ? "#fff" : bloqueado ? ROJO_TEXTO : pasado ? "#cbd5e1" : "#1e293b",
                transition: "background-color 0.15s ease",
                // Solo con mouse: en celular el hover se queda pegado tras tocar
                "@media (hover: hover)": !pasado && !marcado && !bloqueado
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
  const [aviso, setAviso] = useState<string | null>(null);
  const hoy = hoyLocal();

  const toggleDia = (clave: string) => {
    if (clave < hoy) return;
    const periodo = periodoBloqueado(clave);
    if (periodo) {
      setAviso(periodo.motivo);
      return;
    }

    const bloques = agruparBloques(seleccionadas);
    const mes = clave.slice(0, 7);
    const bloqueMes = bloques.find((b) => b.mes === mes);
    const otrosBloques = bloques.filter((b) => b.mes !== mes);

    if (seleccionadas.has(clave)) {
      if (clave !== bloqueMes!.inicio && clave !== bloqueMes!.fin) {
        setAviso("Solo puedes quitar el primer o el último día para que sigan siendo seguidos.");
        return;
      }
      setSeleccionadas((prev) => {
        const nuevo = new Set(prev);
        nuevo.delete(clave);
        return nuevo;
      });
      return;
    }

    if (bloqueMes) {
      if (clave !== sumarDias(bloqueMes.inicio, -1) && clave !== sumarDias(bloqueMes.fin, 1)) {
        setAviso("Tus vacaciones deben ser días seguidos.");
        return;
      }
      if (bloqueMes.dias >= MAX_DIAS_POR_BLOQUE) {
        setAviso("Máximo 6 días seguidos por mes.");
        return;
      }
    }
    if (!otrosBloques.every((b) => respetaSeparacion(clave, b))) {
      setAviso("Debe haber al menos 15 días entre un periodo de vacaciones y otro.");
      return;
    }

    setSeleccionadas((prev) => new Set(prev).add(clave));
  };

  if (rol !== "admin") return <Navigate to="/" replace />;

  const total = seleccionadas.size;
  const bloques = agruparBloques(seleccionadas);

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

      <Box sx={{ mt: 1.5, display: "flex", flexWrap: "wrap", gap: 2 }}>
        {[
          { texto: "Seleccionado", fondo: AZUL, borde: AZUL },
          { texto: "No disponible", fondo: "#f1f5f9", borde: "#e2e8f0" },
          { texto: "Periodo bloqueado por ventas", fondo: ROJO_FONDO, borde: ROJO_TEXTO },
        ].map(({ texto, fondo, borde }) => (
          <Box key={texto} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box sx={{ width: 14, height: 14, borderRadius: "3px", bgcolor: fondo, border: `1px solid ${borde}` }} />
            <Typography sx={{ fontSize: 12, color: "#64748b" }}>{texto}</Typography>
          </Box>
        ))}
      </Box>

      <Paper sx={{ mt: 2, p: 2, textAlign: "center" }}>
        <Typography sx={{ fontWeight: 700, color: AZUL }}>
          {total} {total === 1 ? "día seleccionado" : "días seleccionados"} en total
        </Typography>
        {bloques.map((b) => (
          <Typography key={b.mes} sx={{ fontSize: 14, color: "#475569", mt: 0.5 }}>
            {b.dias === 1
              ? `${NOMBRES_MES[Number(b.mes.slice(5)) - 1]}: ${Number(b.inicio.slice(8))} (1 día)`
              : `${NOMBRES_MES[Number(b.mes.slice(5)) - 1]}: ${Number(b.inicio.slice(8))} al ${Number(b.fin.slice(8))} (${b.dias} días)`}
          </Typography>
        ))}
        <Button
          variant="outlined"
          size="small"
          disabled={total === 0}
          onClick={() => setSeleccionadas(new Set())}
          sx={{ mt: 1.5 }}
        >
          Limpiar selección
        </Button>
      </Paper>

      <Snackbar
        open={aviso !== null}
        autoHideDuration={4000}
        // Ignora clickaway: si no, tocar otro día rojo cerraría el aviso que acaba de abrir
        onClose={(_, razon) => razon !== "clickaway" && setAviso(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" variant="filled" onClose={() => setAviso(null)} sx={{ width: "100%" }}>
          {aviso}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default MiPerfil;
