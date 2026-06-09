import React, { useEffect, useState } from "react";
import {
  Alert, Box, CircularProgress, Container,
  Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography,
} from "@mui/material";
import { Navigate } from "react-router-dom";
import axios from "axios";
import { obtenerRolDesdeToken } from "../components/Token";

const BASE   = "https://ato-appservidor-nvxt.onrender.com";
const headSx = { py: "4px", px: "6px", fontSize: 13, fontWeight: 700 };
const cellSx = { py: "2px", px: "6px", fontSize: 13 };

interface PlanTarifario {
  id: number;
  fecha: string | null;
  empleado_id: number | null;
  modulo_id: number | null;
  tipo_plan: string | null;
  estatus: string | null;
  categoria: string | null;
  clasificacion: string | null;
  equipo: string | null;
  imei: string | null;
  precio_equipo: number | null;
  plazo: number | null;
  linea: string | null;
  cuenta: string | null;
  pago_inicial: boolean;
  monto_pago_inicial: number | null;
}

const nil = (v: string | number | null | undefined): string =>
  v === null || v === undefined || v === "" ? "-" : String(v);

const PlanesAdmin = () => {
  const rol    = obtenerRolDesdeToken();
  const token  = localStorage.getItem("token");
  const config = { headers: { Authorization: `Bearer ${token}` } };

  // ── Hooks (todos antes de cualquier return condicional) ───────────────────
  const [planes, setPlanes]     = useState<PlanTarifario[]>([]);
  const [claves, setClaves]     = useState<Record<number, string>>({});
  const [modulos, setModulos]   = useState<Record<number, string>>({});
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cargar = async () => {
    setCargando(true);
    setErrorMsg(null);
    try {
      const r = await axios.get(`${BASE}/planes-tarifarios`, config);
      setPlanes(r.data);
      try {
        const ru = await axios.get(`${BASE}/registro/usuarios`, config);
        const mapa: Record<number, string> = {};
        for (const u of ru.data) {
          if (u.id != null) mapa[u.id] = u.nombre_englobado ?? "";
        }
        setClaves(mapa);
        const rm = await axios.get(`${BASE}/registro/modulos`, config);
        const mapaMod: Record<number, string> = {};
        for (const m of rm.data) {
          if (m.id != null) mapaMod[m.id] = m.nombre ?? "";
        }
        setModulos(mapaMod);
      } catch {
        // si falla, la columna cae al empleado_id numérico
      }
    } catch {
      setErrorMsg("No se pudieron cargar los planes tarifarios.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Protección por rol (después de todos los hooks) ───────────────────────
  if (rol !== "admin") return <Navigate to="/" replace />;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, color: "#1e293b", mb: 3 }}>
        Planes Tarifarios
      </Typography>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, flexGrow: 1 }}>
            Registros ({planes.length})
          </Typography>
        </Box>

        {cargando ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={headSx}>Fecha</TableCell>
                  <TableCell sx={headSx}>Empleado ID</TableCell>
                  <TableCell sx={headSx}>Módulo ID</TableCell>
                  <TableCell sx={headSx}>Tipo plan</TableCell>
                  <TableCell sx={headSx}>Estatus</TableCell>
                  <TableCell sx={headSx}>Categoría</TableCell>
                  <TableCell sx={headSx}>Clasificación</TableCell>
                  <TableCell sx={headSx}>Equipo</TableCell>
                  <TableCell sx={headSx}>IMEI</TableCell>
                  <TableCell sx={headSx}>Precio equipo</TableCell>
                  <TableCell sx={headSx}>Plazo</TableCell>
                  <TableCell sx={headSx}>Línea</TableCell>
                  <TableCell sx={headSx}>Cuenta</TableCell>
                  <TableCell sx={headSx}>Pago inicial</TableCell>
                  <TableCell sx={headSx}>Monto PI</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {planes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={15} sx={{ ...cellSx, textAlign: "center", color: "#94a3b8" }}>
                      No hay planes registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  planes.map(p => (
                    <TableRow key={p.id}>
                      <TableCell sx={cellSx}>
                        {p.fecha ? new Date(p.fecha).toLocaleDateString("es-MX") : "-"}
                      </TableCell>
                      <TableCell sx={cellSx}>
                        {p.empleado_id != null ? (claves[p.empleado_id] || nil(p.empleado_id)) : "-"}
                      </TableCell>
                      <TableCell sx={cellSx}>
                        {p.modulo_id != null ? (modulos[p.modulo_id] || nil(p.modulo_id)) : "-"}
                      </TableCell>
                      <TableCell sx={cellSx}>{nil(p.tipo_plan)}</TableCell>
                      <TableCell sx={cellSx}>{nil(p.estatus)}</TableCell>
                      <TableCell sx={cellSx}>{nil(p.categoria)}</TableCell>
                      <TableCell sx={cellSx}>{nil(p.clasificacion)}</TableCell>
                      <TableCell sx={cellSx}>{nil(p.equipo)}</TableCell>
                      <TableCell sx={cellSx}>{nil(p.imei)}</TableCell>
                      <TableCell sx={cellSx}>{nil(p.precio_equipo)}</TableCell>
                      <TableCell sx={cellSx}>{nil(p.plazo)}</TableCell>
                      <TableCell sx={cellSx}>{nil(p.linea)}</TableCell>
                      <TableCell sx={cellSx}>{nil(p.cuenta)}</TableCell>
                      <TableCell sx={cellSx}>{p.pago_inicial ? "Sí" : "No"}</TableCell>
                      <TableCell sx={cellSx}>{nil(p.monto_pago_inicial)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  );
};

export default PlanesAdmin;
