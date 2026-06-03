import React, { useEffect, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Container,
  Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography,
} from "@mui/material";
import axios from "axios";

const BASE   = "https://ato-appservidor-nvxt.onrender.com";
const headSx = { py: "4px", px: "6px", fontSize: 13, fontWeight: 700 };
const cellSx = { py: "2px", px: "6px", fontSize: 13 };

interface ModuloAdmin {
  id: number;
  nombre: string;
  activo: boolean;
}

const GestionModulos = () => {
  const token  = localStorage.getItem("token");
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const [modulos, setModulos]         = useState<ModuloAdmin[]>([]);
  const [cargando, setCargando]       = useState(false);
  const [guardando, setGuardando]     = useState<number | null>(null);
  const [errorMsg, setErrorMsg]       = useState<string | null>(null);
  const [exitoMsg, setExitoMsg]       = useState<string | null>(null);

  const cargar = async () => {
    setCargando(true);
    setErrorMsg(null);
    try {
      const r = await axios.get(`${BASE}/registro/modulos`, config);
      setModulos(r.data);
    } catch {
      setErrorMsg("No se pudieron cargar los módulos.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleActivo = async (mod: ModuloAdmin) => {
    setGuardando(mod.id);
    setErrorMsg(null);
    setExitoMsg(null);
    try {
      await axios.put(
        `${BASE}/registro/modulos/${mod.id}/activo`,
        { activo: !mod.activo },
        config,
      );
      setModulos(prev =>
        prev.map(m => m.id === mod.id ? { ...m, activo: !m.activo } : m)
      );
      setExitoMsg(
        `Módulo "${mod.nombre}" ${!mod.activo ? "activado" : "desactivado"} correctamente.`
      );
    } catch {
      setErrorMsg(`No se pudo actualizar "${mod.nombre}".`);
    } finally {
      setGuardando(null);
    }
  };

  const activos   = modulos.filter(m => m.activo).length;
  const inactivos = modulos.filter(m => !m.activo).length;

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, color: "#1e293b", mb: 1 }}>
        Gestión de Módulos
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Los módulos inactivos no aparecen en ningún dropdown operativo del sistema.
        Puedes reactivarlos en cualquier momento desde aquí.
      </Typography>

      {exitoMsg && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setExitoMsg(null)}>
          {exitoMsg}
        </Alert>
      )}
      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        {/* Resumen */}
        <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
          <Typography variant="h6" sx={{ fontWeight: 700, flexGrow: 1 }}>
            Módulos ({modulos.length})
          </Typography>
          <Chip label={`${activos} activos`}   color="success" size="small" />
          <Chip label={`${inactivos} inactivos`} color="default" size="small" />
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
                  <TableCell sx={headSx}>Módulo</TableCell>
                  <TableCell sx={{ ...headSx, textAlign: "center" }}>Estado</TableCell>
                  <TableCell sx={{ ...headSx, textAlign: "center" }}>Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {modulos.map(mod => (
                  <TableRow
                    key={mod.id}
                    sx={{ opacity: mod.activo ? 1 : 0.6 }}
                  >
                    <TableCell sx={{ ...cellSx, fontWeight: mod.activo ? 600 : 400 }}>
                      {mod.nombre}
                    </TableCell>
                    <TableCell sx={{ ...cellSx, textAlign: "center" }}>
                      <Chip
                        label={mod.activo ? "Activo" : "Inactivo"}
                        size="small"
                        color={mod.activo ? "success" : "default"}
                        sx={{ fontSize: 11, minWidth: 72 }}
                      />
                    </TableCell>
                    <TableCell sx={{ ...cellSx, textAlign: "center" }}>
                      {mod.activo ? (
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          disabled={guardando === mod.id}
                          onClick={() => toggleActivo(mod)}
                          sx={{ fontSize: 11, minWidth: 100 }}
                        >
                          {guardando === mod.id
                            ? <CircularProgress size={14} />
                            : "Desactivar"}
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="contained"
                          disabled={guardando === mod.id}
                          onClick={() => toggleActivo(mod)}
                          sx={{
                            fontSize: 11, minWidth: 100,
                            bgcolor: "#f97316",
                            "&:hover": { bgcolor: "#ea6c10" },
                          }}
                        >
                          {guardando === mod.id
                            ? <CircularProgress size={14} color="inherit" />
                            : "Activar"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  );
};

export default GestionModulos;
