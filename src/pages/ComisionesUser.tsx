import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box, Typography, Paper, Divider, Button,
  Table, TableBody, TableCell, TableHead, TableRow, ToggleButtonGroup, ToggleButton
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { ComisionData } from "../Types";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

const ComisionesUsuario = () => {
  const [data, setData] = useState<ComisionData | null>(null);
  const [modo, setModo] = useState<"actual" | "personalizado">("actual");
  const [inicio, setInicio] = useState<any>(null);
  const [fin, setFin] = useState<any>(null);
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const fetchCicloActual = async () => {
    try {
      const res = await axios.get(`https://ato-appservidor.onrender.com/comisiones/comisiones/ciclo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
    } catch (error) {
      console.error("Error al obtener ciclo actual:", error);
      setData(null);
    }
  };

  const fetchCicloPorFechas = async () => {
    if (!inicio || !fin) return;
    const params: any = {
        inicio: dayjs(inicio).format("YYYY-MM-DD"),
        fin: dayjs(fin).format("YYYY-MM-DD"),
      };
    try {
    const res = await axios.get(`https://ato-appservidor.onrender.com/comisiones/ciclo_por_fechas`, {
      params,
      headers: { Authorization: `Bearer ${token}` },
    });
    setData(res.data);
  } catch (err: any) {
    if (err.response?.status === 404) {
      // No hay comisiones, mostramos datos vacíos
      setData({
        inicio_ciclo: params.inicio,
        fin_ciclo: params.fin,
        fecha_pago: "-",
        total_accesorios: 0,
        total_telefonos: 0,
        total_chips: 0,
        total_general: 0,
        ventas_accesorios: [],
        ventas_telefonos: [],
        ventas_chips: [],
      });
    } else {
      console.error("Error al obtener comisiones por fechas:", err);
      setData(null);
    } 
  }
  };

  useEffect(() => {
    if (modo === "actual") fetchCicloActual();
  }, [modo]);

  const handleBuscar = () => {
    if (modo === "personalizado") fetchCicloPorFechas();
  };

  return (
    <Paper sx={{ p: 4, mt: 4 }}>
      <ToggleButtonGroup
        value={modo}
        exclusive
        onChange={(_, v) => v && setModo(v)}
        sx={{ mb: 2 }}
      >
        <ToggleButton value="actual">Ciclo Actual</ToggleButton>
        <ToggleButton value="personalizado">Buscar por Fechas</ToggleButton>
      </ToggleButtonGroup>

      {modo === "personalizado" && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker label="Inicio del ciclo" value={inicio} onChange={setInicio} />
          <DatePicker label="Fin del ciclo" value={fin} onChange={setFin} />
          </LocalizationProvider>
          <Button variant="contained" onClick={handleBuscar}>Buscar</Button>
        </Box>
      )}

      {!data ? <Typography>Cargando...</Typography> : (
        <>
          
          <Typography variant="subtitle1">
            Pago programado para el: <strong>{data.fecha_pago}</strong>
          </Typography>
          <Divider sx={{ my: 2 }} />

          {/* ACCESORIOS */}
          <Typography variant="subtitle1">🧩 Accesorios: ${data.total_accesorios.toFixed(2)}</Typography>
          <Table size="small" sx={{ mb: 2 }}>
            <TableHead>
              <TableRow>
                <TableCell>Producto</TableCell>
                <TableCell>Cantidad</TableCell>
                <TableCell>Comisión</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Hora</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.ventas_accesorios.filter(v => !v.producto.toUpperCase().startsWith("TELEFONO")).sort((a, b) => new Date(`${b.fecha} ${b.hora}`).getTime() - new Date(`${a.fecha} ${a.hora}`).getTime()).map((v, i) => (
                <TableRow key={i}>
                  <TableCell>{v.producto}</TableCell>
                  <TableCell>{v.cantidad}</TableCell>
                  <TableCell>${(v.comision * v.cantidad).toFixed(2)}</TableCell>
                  <TableCell>{v.fecha}</TableCell>
                  <TableCell>{v.hora}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* TELÉFONOS */}
          <Typography variant="subtitle1">📱 Teléfonos: ${data.total_telefonos.toFixed(2)}</Typography>
          <Table size="small" sx={{ mb: 2 }}>
            <TableHead>
              <TableRow>
                <TableCell>Telefono</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Comisión</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Hora</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.ventas_telefonos
                .sort((a, b) => new Date(`${b.fecha} ${b.hora}`).getTime() - new Date(`${a.fecha} ${a.hora}`).getTime())
              .map((v, i) => (
                <TableRow key={i}>
                  <TableCell>{v.producto || "N/A"}</TableCell>
                  <TableCell>{v.tipo_venta}</TableCell>
                  <TableCell>
                    ${((v.comision_total ?? (v.comision * v.cantidad)) || 0).toFixed(2)}
                  </TableCell>
                  <TableCell>{v.fecha}</TableCell>
                  <TableCell>{v.hora}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* CHIPS */}
          <Typography variant="subtitle1">🔌 Chips: ${data.total_chips.toFixed(2)}</Typography>
          <Table size="small" sx={{ mb: 2 }}>
            <TableHead>
              <TableRow>
                <TableCell>Tipo</TableCell>
                <TableCell>Número</TableCell>
                <TableCell>Comisión</TableCell>
                <TableCell>Incubadora</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Hora</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.ventas_chips &&
                [...data.ventas_chips]
                  .sort((a, b) => {
                    const fechaA = new Date(`${a.fecha} ${a.hora}`);
                    const fechaB = new Date(`${b.fecha} ${b.hora}`);
                    return fechaB.getTime() - fechaA.getTime(); // Descendente
                  }).map((v, i) => (
                <TableRow key={i}>
                  <TableCell>{v.tipo_chip}</TableCell>
                  <TableCell>{v.numero_telefono}</TableCell>
                  <TableCell>${v.comision.toFixed(2)}</TableCell>
                      <TableCell>
                        {v.es_incubadora ? "🧪 Incubadora" : "-"}
                      </TableCell>
                  <TableCell>{v.fecha}</TableCell>
                  <TableCell>{v.hora}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Divider sx={{ my: 2 }} />
          <Typography variant="h6">💵 Total: ${data.total_general.toFixed(2)}</Typography>

          <Button
            variant="outlined"
            color="secondary"
            sx={{ mt: 2 }}
            onClick={() => navigate("/comisiones")}
          >
            Lista de comisiones
          </Button>
        </>
      )}
    </Paper>
  );
};

export default ComisionesUsuario;
