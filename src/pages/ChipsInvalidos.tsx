import React, { useEffect, useState } from "react";
import axios from "axios";
import { Usuario, VentaChip } from "../Types";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, TextField, Checkbox, Box, IconButton, Button } from "@mui/material";
import { Delete, FileDownload } from "@mui/icons-material";
import * as XLSX from "xlsx";
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

      params.solo_incubadora = true;

      const res = await axios.get(
        `/api/ventas/venta_chips`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params,
        }
      );

      setRechazados(
        (res.data as VentaChip[])
          .filter((c) => c.es_incubadora && !(c.validado && c.comision_pagada))
          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      );
    } catch (err) {
      console.error("Error al obtener chips en incubadora:", err);
    }
  };

  useEffect(() => {
    if (rolToken !== "admin") return;
    axios
      .get(`/api/registro/usuarios`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => setUsuarios(r.data))
      .catch(() => {});
  }, [rolToken, token]);

const validarChip = async (id: number, comision_manual?: number) => {
  try {
    await axios.put(
      `/api/ventas/validar_chip_incubadora/${id}`,
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
      await axios.delete(`/api/ventas/eliminar_chip/${id}`, {
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

  const descargarExcel = () => {
    const filas = rechazados.map((chip) => ({
      Empleado: chip.empleado?.username ?? "Empleado eliminado",
      "Número": chip.numero_telefono,
      "Tipo Chip": chip.tipo_chip,
      Fecha: chip.fecha,
      "Motivo de Rechazo": chip.descripcion_rechazo ? "Lista de Espera Incubado" : "",
    }));
    const ws = XLSX.utils.json_to_sheet(filas);
    ws["!cols"] = [{ wch: 22 }, { wch: 14 }, { wch: 20 }, { wch: 12 }, { wch: 26 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Incubadora");
    const empleado = usuarios.find((u) => u.id === empleadoSeleccionado)?.username;
    const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
    XLSX.writeFile(wb, `Incubadora_${empleado ? empleado + "_" : ""}${hoy}.xlsx`);
  };

  return (
    <TableContainer component={Paper} sx={{ mt: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 2 }}>
        <Typography variant="h6">INCUBADORA</Typography>
        <Button
          variant="contained"
          color="success"
          startIcon={<FileDownload />}
          onClick={descargarExcel}
          disabled={rechazados.length === 0}
        >
          Descargar Excel
        </Button>
      </Box>
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
              <TableCell sx={{ ...cellSx, color: '#f97316', fontWeight: 600 }}>{chip.descripcion_rechazo ? 'Lista de Espera Incubado' : ''}</TableCell>
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
      <TextField
        size="small"
        type="number"
        placeholder="$"
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
    </TableCell>

    <TableCell sx={cellSx}>
      <Checkbox
        checked={chip.validado}
        disabled={chip.validado}
        onChange={() => {
          if (chip.validado) return;
          if (!chip.comision_manual || chip.comision_manual <= 0) {
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
