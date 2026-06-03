import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import CalculateIcon from "@mui/icons-material/Calculate";
import axios from "axios";

const API = "https://ato-appservidor-nvxt.onrender.com";
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` });

export interface EmpleadoComision {
  seccion: string;
  empleado: string;
  nombre_completo: string;
  usuario_ids?: number[];
  sueldo_base: number;
  comisiones_accesorios: number;
  comisiones_telefonos: number;
  comisiones_chips: number;
  comisiones_total: number;
  pago_total: number;
  tiene_comisiones: boolean;
}

interface Props {
  grupo: "asesores" | "encargados" | "cadenas";
  label: string;
  color: string;
  fechaInicio: string;
  fechaFin: string;
  onFechaInicioChange: (v: string) => void;
  onFechaFinChange: (v: string) => void;
  onDatosCalculados: (rows: EmpleadoComision[]) => void;
  datosCalculados: EmpleadoComision[];
}

const SeccionComisiones: React.FC<Props> = ({
  grupo,
  label,
  color,
  fechaInicio,
  fechaFin,
  onFechaInicioChange,
  onFechaFinChange,
  onDatosCalculados,
  datosCalculados,
}) => {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calcular = async () => {
    if (!fechaInicio || !fechaFin) return;
    setCargando(true);
    setError(null);
    try {
      const { data } = await axios.get<EmpleadoComision[]>(
        `${API}/admin/comisiones-por-grupo`,
        { params: { grupo, fecha_inicio: fechaInicio, fecha_fin: fechaFin }, headers: authH() }
      );
      onDatosCalculados(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Error al calcular comisiones");
      onDatosCalculados([]);
    } finally {
      setCargando(false);
    }
  };

  const preview = datosCalculados.filter((e) => e.comisiones_total > 0);
  const canCalc = Boolean(fechaInicio && fechaFin);

  return (
    <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 2, p: 2, mb: 2 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={1.5} sx={{ color }}>
        {label}
      </Typography>

      <Box display="flex" gap={1.5} alignItems="center" mb={1.5} flexWrap="wrap">
        <TextField
          label="Desde"
          type="date"
          size="small"
          value={fechaInicio}
          onChange={(e) => { onFechaInicioChange(e.target.value); onDatosCalculados([]); }}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />
        <TextField
          label="Hasta"
          type="date"
          size="small"
          value={fechaFin}
          onChange={(e) => { onFechaFinChange(e.target.value); onDatosCalculados([]); }}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />
        <Button
          variant="outlined"
          size="small"
          onClick={calcular}
          disabled={!canCalc || cargando}
          startIcon={cargando ? <CircularProgress size={14} color="inherit" /> : <CalculateIcon />}
          sx={{ borderColor: color, color, "&:hover": { borderColor: color, bgcolor: `${color}10` } }}
        >
          Calcular
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}

      {datosCalculados.length > 0 && (
        <>
          <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
            {preview.length} empleado{preview.length !== 1 ? "s" : ""} con comisiones
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#f8fafc" }}>
                {["Empleado", "Accesorios", "Teléfonos", "Chips", "Total"].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, color, fontSize: 11 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {preview.map((e, i) => (
                <TableRow key={i} sx={{ bgcolor: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                  <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{e.empleado}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>${e.comisiones_accesorios.toFixed(2)}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>${e.comisiones_telefonos.toFixed(2)}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>${e.comisiones_chips.toFixed(2)}</TableCell>
                  <TableCell sx={{ fontSize: 12, fontWeight: 700, color: "#16a34a" }}>
                    ${e.comisiones_total.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Box display="flex" justifyContent="flex-end" pr={1} mt={0.5}>
            <Typography variant="body2" fontWeight={700}>
              Subtotal:{" "}
              <span style={{ color }}>
                ${datosCalculados.reduce((s, e) => s + e.pago_total, 0).toFixed(2)}
              </span>
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
};

export default SeccionComisiones;
