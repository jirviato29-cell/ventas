import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Paper,
  Box,
  CircularProgress,
  TextField,
  MenuItem,
  Button
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  LineChart,
  Line,
    Legend,
  Cell
} from "recharts";
import axios from "axios";
import { MetricaEmpleado } from "../Types";
import RegistroPlan from "../components/RegistroPlan";

const COLORS = ["#f97316", "#0d1e3a", "#22c55e"];
const CHART_AXIS = { fill: "#64748b", fontSize: 11 };
const CHART_GRID = "rgba(0,0,0,0.07)";
const TOOLTIP_STYLE = { backgroundColor: "#ffffff", border: "1px solid rgba(249,115,22,0.3)", color: "#1e293b", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" };

const Metricas = () => {
  const [data, setData] = useState<MetricaEmpleado[]>([]);
  const [ventasDia, setVentasDia] = useState<any[]>([]);
  const [topProductos, setTopProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mes, setMes] = useState<string>("");

  const [chipsData, setChipsData] = useState<any[]>([]);
  const [planesData, setPlanesData] = useState<any[]>([]);

  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

 const [moduloSeleccionado, setModuloSeleccionado] = useState("");
 const [resumenModulo, setResumenModulo] = useState<any[]>([]);

  const [ventasModulo, setVentasModulo] = useState<any[]>([]);

  const API = "https://ato-appservidor.onrender.com";

  const [empleados, setEmpleados] = useState<any[]>([]);
  const [modulos, setModulos] = useState<any[]>([]);

  const token = localStorage.getItem("token");

  const [ventasDetalle, setVentasDetalle] = useState<any[]>([]);

const config = {
  headers: {
    Authorization: `Bearer ${token}`
  }
};

const fetchDataWithDates = async (inicio?: string, fin?: string) => {
  setLoading(true);

  try {
    let params = new URLSearchParams();

    if (inicio && fin) {
      params.append("fecha_inicio", inicio);
      params.append("fecha_fin", fin);
    }

    if (moduloSeleccionado) {
      params.append("modulo_id", moduloSeleccionado);
    }

    const authHeaders = { Authorization: `Bearer ${token}` };

    const [res1, res2, res3, res4, res5, res6, res7, res8] = await Promise.all([
      fetch(`${API}/dashboard/metricas/empleados?${params}`, { headers: authHeaders }),
      fetch(`${API}/dashboard/ventas-por-dia?${params}`, { headers: authHeaders }),
      fetch(`${API}/dashboard/top-productos?${params}`, { headers: authHeaders }),
      fetch(`${API}/dashboard/ventas-por-modulo?${params}`, { headers: authHeaders }),
      fetch(`${API}/dashboard/resumen-por-modulo?${params}`, { headers: authHeaders }),
      fetch(`${API}/dashboard/chips?${params}`, { headers: authHeaders }),
      fetch(`${API}/dashboard/planes?${params}`, { headers: authHeaders }),
      fetch(`${API}/dashboard/ventas-por-dia-detalle?${params}`, { headers: authHeaders }),
    ]);

    const json1 = await res1.json();
    const json2 = await res2.json();
    const json3 = await res3.json();
    const json4 = await res4.json();
    const json5 = await res5.json();
    const json6 = await res6.json();
    const json7 = await res7.json();
    const json8 = await res8.json();

    setResumenModulo(Array.isArray(json5) ? json5 : []);
    setData(Array.isArray(json1.data) ? json1.data : []);
    setVentasDia(Array.isArray(json2) ? json2 : []);
    setTopProductos(Array.isArray(json3) ? json3 : []);
    setVentasModulo(Array.isArray(json4) ? json4 : []);
    setChipsData(Array.isArray(json6) ? json6 : []);
    setPlanesData(Array.isArray(json7) ? json7 : []);
    setVentasDetalle(Array.isArray(json8) ? json8 : []);

  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};
    useEffect(() => {
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

        const format = (d: Date) => d.toISOString().split("T")[0];

        setFechaInicio(format(inicioMes));
        setFechaFin(format(hoy));

        // 👇 importante: manda fechas desde el inicio
        setTimeout(() => {
            fetchDataWithDates(format(inicioMes), format(hoy));
        }, 0);

    }, []);

  // 🔥 KPIs
  const totalAccesorios = data.reduce((a, i) => a + (i.total_accesorios || 0), 0);
  const totalTelefonos = data.reduce((a, i) => a + (i.total_telefonos || 0), 0);
  const totalGeneral = totalAccesorios + totalTelefonos;

  const ventasCount = data.reduce(
    (a, i) => a + (i.contado || 0) + (i.paguitos || 0) + (i.pajoy || 0),
    0
  );

  const ticketPromedio = ventasCount ? totalGeneral / ventasCount : 0;

  // 🔥 Gráfica empleados
  const dataGrafica = data.map((i) => ({
    empleado: i.username,
    total: (i.total_accesorios || 0) + (i.total_telefonos || 0)
  }));

  // 🔥 Pie
  const dataPie = [
    { name: "Contado", value: data.reduce((a, i) => a + (i.contado || 0), 0) },
    { name: "Paguitos", value: data.reduce((a, i) => a + (i.paguitos || 0), 0) },
    { name: "Pajoy", value: data.reduce((a, i) => a + (i.pajoy || 0), 0) }
  ];

  // 🔥 Top empleados
  const top = [...data]
    .sort(
      (a, b) =>
        (b.total_telefonos + b.total_accesorios) -
        (a.total_telefonos + a.total_accesorios)
    )
    .slice(0, 5);

  // 🔥 Formatear fechas
const ventasDiaFormateado = ventasDia.map((v) => ({
  ...v,
  fecha: new Date(v.fecha).toLocaleDateString()
}));

  const ventasDetalleFormateado = ventasDetalle.map((v) => ({
    ...v,
    fecha: new Date(v.fecha).toLocaleDateString()
  }));

  useEffect(() => {
  const fetchExtras = async () => {
    try {
      const [resEmp, resMod] = await Promise.all([
        axios.get(`${API}/registro/usuarios`, config),
        axios.get(`${API}/registro/modulos/todos`, config),
      ]);

      setEmpleados(resEmp.data);
      setModulos(resMod.data);
    } catch (err) {
      console.error(err);
    }
  };

  fetchExtras();
}, []);

  
useEffect(() => {
  const interval = setInterval(() => {
    if (document.visibilityState === "visible") {
      fetchDataWithDates(fechaInicio, fechaFin);
    }
  }, 500000);

  return () => clearInterval(interval);
}, [fechaInicio, fechaFin, moduloSeleccionado]);


  return (
    <Container maxWidth={false} sx={{ mt: 4, px: 4 }}>
      <Typography variant="h4" gutterBottom>
        Metricas de Ventas
      </Typography>

      {/* FILTROS */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <TextField
          type="date"
          label="Fecha inicio"
          InputLabelProps={{ shrink: true }}
          value={fechaInicio}
          onChange={(e) => {
            setFechaInicio(e.target.value);
            setMes("");
          }}
        />

              <TextField
                  type="date"
                  label="Fecha fin"
                  InputLabelProps={{ shrink: true }}
                  value={fechaFin}
                  onChange={(e) => {
                      setFechaFin(e.target.value);
                      setMes("");
                  }}
              />

              <TextField
                  select
                  label="Módulo"
                  value={moduloSeleccionado}
                  onChange={(e) => setModuloSeleccionado(e.target.value)}
                  sx={{ minWidth: 150 }}
              >
                  <MenuItem value="">Todos</MenuItem>

                  {ventasModulo.map((m) => (
                      <MenuItem key={m.modulo_id} value={m.modulo_id}>
                          {m.modulo}
                      </MenuItem>
                  ))}
              </TextField>
        <Button variant="contained" onClick={() => fetchDataWithDates(fechaInicio, fechaFin)}>
          Filtrar
        </Button>
      </Box>

      {/* KPIs */}
      <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(200px,1fr))" gap={2} mb={3}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2">Ventas Totales</Typography>
          <Typography variant="h6">${totalGeneral.toLocaleString()}</Typography>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2">Accesorios</Typography>
          <Typography variant="h6">${totalAccesorios.toLocaleString()}</Typography>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2">Teléfonos</Typography>
          <Typography variant="h6">${totalTelefonos.toLocaleString()}</Typography>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2">Ticket Promedio</Typography>
          <Typography variant="h6">${ticketPromedio.toFixed(2)}</Typography>
        </Paper>
      </Box>

      {/* GRÁFICAS */}
        <Paper sx={{ p: 2, mt: 3 }}>
  <Typography variant="h6" mb={2}>
    Resumen por Módulo
  </Typography>

  <Box overflow="auto">
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ background: "#f8fafc" }}>
          <th style={{ color: "#f97316", padding: "8px", fontWeight: 700 }}>Módulo</th>
          <th style={{ color: "#f97316", padding: "8px", fontWeight: 700 }}>Accesorios</th>
          <th style={{ color: "#f97316", padding: "8px", fontWeight: 700 }}>Teléfonos</th>
          <th style={{ color: "#f97316", padding: "8px", fontWeight: 700 }}>Contado</th>
          <th style={{ color: "#f97316", padding: "8px", fontWeight: 700 }}>Paguitos</th>
          <th style={{ color: "#f97316", padding: "8px", fontWeight: 700 }}>Pajoy</th>
          <th style={{ color: "#f97316", padding: "8px", fontWeight: 700 }}>Total</th>
        </tr>
      </thead>

      <tbody>
        {resumenModulo.map((m, i) => (
          <tr key={i} style={{ textAlign: "center", borderBottom: "1px solid #e2e8f0", color: "#1e293b" }}>
            <td>{m.modulo}</td>

            <td>${(m.total_accesorios || 0).toLocaleString()}</td>
            <td>${(m.total_telefonos || 0).toLocaleString()}</td>

            <td>{m.contado || 0}</td>
            <td>{m.paguitos || 0}</td>
            <td>{m.pajoy || 0}</td>

            <td>
              <strong>
                ${(m.total_general || 0).toLocaleString()}
              </strong>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </Box>
</Paper>

      <Box display="grid" gridTemplateColumns="repeat(12,1fr)" gap={2} mb={3}>

  {/* 🔵 TIPO DE VENTA */}
  <Paper sx={{ p: 3, gridColumn: "span 4", borderRadius: 3 }}>
    <Typography variant="h6" fontWeight={600} mb={1}>
      Tipo de venta
    </Typography>


    {dataPie.some(d => d.value > 0) && (
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={dataPie}
            dataKey="value"
            nameKey="name"
            outerRadius={90}
            label={({ percent }: { percent: number }) =>
              `${(percent * 100).toFixed(0)}%`
            }
          >
            {dataPie.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>

          <Tooltip formatter={(value: any, name: any) => [`${value} ventas`, name]} contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ color: "#64748b" }} />
        </PieChart>
      </ResponsiveContainer>
    )}

    <Box mt={2}>
      {dataPie.map((item, i) => (
        <Box
          key={i}
          display="flex"
          justifyContent="space-between"
          sx={{ py: 0.5 }}
        >
          <Typography>{item.name}</Typography>
          <Typography fontWeight={600}>{item.value}</Typography>
        </Box>
      ))}
    </Box>
  </Paper>

  {/* 🟢 CHIPS */}
  <Paper sx={{ p: 3, gridColumn: "span 4", borderRadius: 3 }}>
    <Typography variant="h6" fontWeight={600} mb={1}>
      Chips
    </Typography>

    <Box mt={2}>
      {chipsData.map((c, i) => (
        <Box
          key={i}
          display="flex"
          justifyContent="space-between"
          sx={{
            py: 1,
            px: 1,
            borderBottom: "1px solid rgba(249,115,22,0.08)"
          }}
        >
          <Typography>{c.tipo}</Typography>
          <Typography fontWeight={600}>{c.total}</Typography>
        </Box>
      ))}
    </Box>

    {/* TOTAL */}
    <Box mt={2} display="flex" justifyContent="space-between">
      <Typography fontWeight={600}>Total</Typography>
      <Typography fontWeight={700}>
        {chipsData.reduce((a, b) => a + b.total, 0)}
      </Typography>
    </Box>
  </Paper>

  {/* 🟣 PLANES */}
<Paper sx={{ p: 3, gridColumn: "span 4", borderRadius: 3 }}>
  <Typography variant="h6" fontWeight={600} mb={1}>
    Planes
  </Typography>

  <Typography variant="caption" color="text.secondary">
    Registros de planes capturados
  </Typography>

  <Box mt={2}>
    {planesData.length === 0 ? (
      <Typography variant="body2" color="text.secondary">
        No hay registros
      </Typography>
    ) : (
      planesData.map((p, i) => (
        <Box
          key={i}
          display="flex"
          justifyContent="space-between"
          sx={{
            py: 1,
            px: 1,
            borderBottom: "1px solid rgba(249,115,22,0.08)"
          }}
        >
          {/* 🔥 CONCATENADO */}
          <Typography>
            {p.tipo_tramite} - {p.tipo_plan}
          </Typography>

          {/* 🔥 INFO EXTRA */}
          <Typography variant="caption" color="text.secondary">
            {p.empleado} / {p.modulo}
          </Typography>
        </Box>
      ))
    )}
  </Box>

  {/* TOTAL */}
  <Box mt={2} display="flex" justifyContent="space-between">
    <Typography fontWeight={600}>Total</Typography>
    <Typography fontWeight={700}>
      {planesData.length}
    </Typography>
  </Box>
</Paper>

</Box>
      <Box display="grid" gridTemplateColumns="repeat(12,1fr)" gap={2} mb={3}>


        <Paper sx={{ p: 2, gridColumn: "span 3" }}>
          <Typography variant="h6">Top Empleados</Typography>

          {loading ? (
            <CircularProgress />
          ) : (
            top.map((e, i) => (
              <Box
                key={i}
                sx={{
                  py: 1,
                  borderBottom: "1px solid rgba(249,115,22,0.08)"
                }}
              >
                {/* Nombre + total */}
                <Box display="flex" justifyContent="space-between">
                  <Typography fontWeight={600}>{e.username}</Typography>
                  <Typography>
                    ${(e.total_accesorios + e.total_telefonos).toLocaleString()}
                  </Typography>
                </Box>

                {/* 🔥 DESGLOSE */}
                <Box display="flex" gap={2} mt={0.5}>
                  <Typography variant="caption">
                    💵 Contado: {e.contado || 0}
                  </Typography>

                  <Typography variant="caption">
                    📱 Paguitos: {e.paguitos || 0}
                  </Typography>

                  <Typography variant="caption">
                    🧾 Pajoy: {e.pajoy || 0}
                  </Typography>
                </Box>
              </Box>
            ))
          )}
        </Paper>


          {/* 🟢 ACCESORIOS */}
          <Paper sx={{ p: 2, gridColumn: "span 4" }}>
            <Typography>Accesorios por día</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={ventasDetalleFormateado}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis dataKey="fecha" tick={CHART_AXIS} stroke="transparent" />
                <YAxis tick={CHART_AXIS} stroke="transparent" />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="accesorios" stroke="#34d399" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>

          {/* 🔵 TELEFONOS */}
          <Paper sx={{ p: 2, gridColumn: "span 5" }}>
            <Typography>Teléfonos por día</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={ventasDetalleFormateado}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis dataKey="fecha" tick={CHART_AXIS} stroke="transparent" />
                <YAxis tick={CHART_AXIS} stroke="transparent" />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="telefonos" stroke="#60a5fa" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>


        
      </Box>

        <Box display="grid" gridTemplateColumns="repeat(12,1fr)" gap={3} mb={3}>
      {/* LINEA */}
      <Paper sx={{  p: 2, gridColumn: "span 6" }}>
        <Typography>Ventas por día</Typography>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={ventasDiaFormateado}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
            <XAxis dataKey="fecha" tick={CHART_AXIS} stroke="transparent" />
            <YAxis tick={CHART_AXIS} stroke="transparent" />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Line type="monotone" dataKey="total" stroke="#f97316" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Paper>

      <Paper sx={{ p: 2, gridColumn: "span 6" }}>
  <Typography>Ventas por módulo</Typography>

  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={ventasModulo}>
      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
      <XAxis dataKey="modulo" tick={CHART_AXIS} stroke="transparent" />
      <YAxis tick={CHART_AXIS} stroke="transparent" />
      <Tooltip contentStyle={TOOLTIP_STYLE} />
      <Bar dataKey="total" fill="#f97316" radius={[4, 4, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
</Paper>

 </Box>
      {/* TOP EMPLEADOS */}
      <Paper sx={{ p: 2, gridColumn: "span 6" }}>
          <Typography>Ventas por empleado</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dataGrafica}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="empleado" tick={CHART_AXIS} stroke="transparent" />
              <YAxis tick={CHART_AXIS} stroke="transparent" />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="total" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <Paper sx={{ p: 2, gridColumn: "span 5" }}>
          <Typography>Top Productos</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProductos} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis type="number" tick={CHART_AXIS} stroke="transparent" />
              <YAxis dataKey="producto" type="category" tick={CHART_AXIS} stroke="transparent" width={120} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="total_vendidos" fill="#60a5fa" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Paper>

        </Paper>

      <Box mt={3}>
        <RegistroPlan empleados={empleados} modulos={modulos} />
      </Box>
    </Container>
  );
};

export default Metricas;