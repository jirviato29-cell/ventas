import React, { useEffect, useState } from "react";
import axios from "axios";
import { Usuario, VentaChip } from "../Types";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, TextField, Checkbox, Box, IconButton } from "@mui/material";
import { Delete } from "@mui/icons-material";
import { obtenerRolDesdeToken } from "../components/Token";

const headSx = { py: "4px", px: "6px", fontSize: 16, fontWeight: 700 };
const cellSx = { py: "2px", px: "6px", fontSize: 16 };

const ChipsRechazados = () => {
  const [rechazados, setRechazados] = useState<VentaChip[]>([]);
  
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<number | null>(null);
  const token = localStorage.getItem("token");

  const usuarioRaw = localStorage.getItem("usuario") || "{}";
  const usuario = usuarioRaw.startsWith("{") ? JSON.parse(usuarioRaw) : { nombre: usuarioRaw };
  const rolToken = obtenerRolDesdeToken();

  const fetchRechazados = async () => {
    try {
      const params: any = {};
      if (empleadoSeleccionado) {
        params.empleado_id = empleadoSeleccionado;
      }

      const res = await axios.get(
        `https://ato-appservidor.onrender.com/ventas/venta_chips`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params,
        }
      );

      setRechazados(
        (res.data as VentaChip[])
          .filter((c) => c.es_incubadora)
          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      );
    } catch (err) {
      console.error("Error al obtener chips en incubadora:", err);
    }
  };

  useEffect(() => {
    if (rolToken !== "admin") return;
    axios
      .get(`https://ato-appservidor.onrender.com/registro/usuarios`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => setUsuarios(r.data))
      .catch(() => {});
  }, [rolToken, token]);

const validarChip = async (id: number, comision_manual?: number) => {
  try {
    await axios.put(
      `https://ato-appservidor.onrender.com/ventas/validar_chip_incubadora/${id}`,
      { comision_manual }, // 🔥 importante
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    setRechazados(prev => prev.filter(c => c.id !== id));

  } catch (error) {
    console.error("Error al validar chip", error);
    alert((error as any).response?.data?.detail || "Error al validar el chip");
  }
};

const eliminarChip = async (id: number) => {
    try {
      await axios.delete(`https://ato-appservidor.onrender.com/ventas/eliminar_chip/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRechazados(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error("Error al eliminar chip", error);
    }
  };

  useEffect(() => {
    fetchRechazados();
  }, [empleadoSeleccionado]);

  return (
    <TableContainer component={Paper} sx={{ mt: 4 }}>
      <Typography variant="h6" sx={{ p: 2 }}>INCUBADORA</Typography>
      <Box sx={{ mb: 2 }}>
        {rolToken === "admin" && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1">Filtrar por empleado:</Typography>
            <select
              value={empleadoSeleccionado ?? ""}
              onChange={(e) =>
                setEmpleadoSeleccionado(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">(Todos los empleados)</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username}
                </option>
              ))}
            </select>
          </Box>
        )}
      </Box>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={headSx}>Empleado</TableCell>
            <TableCell sx={headSx}>Número</TableCell>
            <TableCell sx={headSx}>Tipo Chip</TableCell>
            <TableCell sx={headSx}>Fecha</TableCell>
            <TableCell sx={headSx}>Motivo de Rechazo</TableCell>
            {rolToken === "admin" && <TableCell sx={headSx}>Eliminar</TableCell>}
            {rolToken === "admin" && <TableCell sx={headSx}>Validar</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {rechazados.map((chip) => (
            <TableRow key={chip.id}>
              <TableCell sx={cellSx}>{chip.empleado?.username ?? "Empleado eliminado"}</TableCell>
              <TableCell sx={cellSx}>{chip.numero_telefono}</TableCell>
              <TableCell sx={cellSx}>{chip.tipo_chip}</TableCell>
              <TableCell sx={cellSx}>{chip.fecha}</TableCell>
              <TableCell sx={{ ...cellSx, color: '#f97316', fontWeight: 600 }}>{chip.descripcion_rechazo}</TableCell>
              {rolToken === "admin" && (
                <TableCell sx={cellSx}>
                  <IconButton
                    color="error"
                    onClick={() => eliminarChip(chip.id)}
                  >
                    <Delete />
                  </IconButton>
                </TableCell>
              )}

              {rolToken === "admin" && (
  <>
    <TableCell sx={cellSx}>
      {chip.tipo_chip === "Activacion" ? (
        <TextField
          size="small"
          type="number"
          value={chip.comision_manual ?? ""}
          onChange={(e) =>
            setRechazados(prev =>
              prev.map(c =>
                c.id === chip.id
                  ? { ...c, comision_manual: Number(e.target.value) }
                  : c
              )
            )
          }
          sx={{ width: 80 }}
        />
      ) : (
        "$" + (chip.comision ?? 0)
      )}
    </TableCell>

    <TableCell sx={cellSx}>
      <Checkbox
        checked={chip.validado}
        disabled={chip.validado}
        onChange={() => {
          if (chip.validado) return;
          if (chip.tipo_chip === "Activacion" && !chip.comision_manual) {
            alert("Debes capturar la comisión");
            return;
          }

          validarChip(chip.id, chip.comision_manual);
        }}
        color="success"
      />
    </TableCell>
  </>
)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ChipsRechazados;
