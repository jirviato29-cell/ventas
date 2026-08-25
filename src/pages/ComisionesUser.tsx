import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box, Typography, Paper, Button, Chip, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { ComisionData } from "../Types";
import dayjs from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

const AZUL = "#1D4ED8";
const AZUL_OSC = "#1E3A8A";
const AZUL_CLARO = "#EFF6FF";
const NARANJA = "#F26F21";

const fmtFecha = (f?: string) => {
  if (!f) return "-";
  const d = dayjs(f);
  return d.isValid() ? d.format("DD/MM/YYYY") : f;
};

const fmtHora = (h?: string) => (h ? h.slice(0, 5) : "-");

const Seccion = ({
  icono, titulo, monto, children,
}: { icono: string; titulo: string; monto: number; children: React.ReactNode }) => (
  <Box sx={{ border: "1px solid #E5E7EB", borderRadius: 2, overflow: "hidden", mb: 2.5, bgcolor: "#fff" }}>
    <Box sx={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      px: 2, py: 1.25, bgcolor: "#FAFAFA", borderBottom: "1px solid #E5E7EB",
    }}>
      <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{icono} {titulo}</Typography>
      <Typography sx={{ fontWeight: 700, fontSize: 15, color: NARANJA }}>${monto.toFixed(2)}</Typography>
    </Box>
    {children}
  </Box>
);

const SinRegistros = ({ cols }: { cols: number }) => (
  <TableRow>
    <TableCell colSpan={cols} align="center" sx={{ py: 3, color: "#9CA3AF" }}>
      Sin registros en este periodo
    </TableCell>
  </TableRow>
);

const thSx = {
  fontWeight: 700, fontSize: 12, textTransform: "uppercase",
  letterSpacing: 0.4, color: "#6B7280", whiteSpace: "nowrap",
};

const ComisionesUsuario = () => {
  const [data, setData] = useState<ComisionData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [inicio, setInicio] = useState<any>(null);
  const [fin, setFin] = useState<any>(null);
  const token = localStorage.getItem("token");

  const modulo = localStorage.getItem("modulo") || "";
  const esCadenas = modulo.toLowerCase().includes("cadena");

  const fetchCicloActual = async () => {
    setCargando(true);
    try {
      const res = await axios.get(
        `https://ato-appservidor-nvxt.onrender.com/comisiones/comisiones/ciclo`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(res.data);
    } catch (error) {
      console.error("Error al obtener ciclo actual:", error);
      setData(null);
    } finally {
      setCargando(false);
    }
  };

  const fetchCicloPorFechas = async () => {
    if (!inicio || !fin) return;
    const params: any = {
      inicio: dayjs(inicio).format("YYYY-MM-DD"),
      fin: dayjs(fin).format("YYYY-MM-DD"),
    };
    setCargando(true);
    try {
      const res = await axios.get(
        `https://ato-appservidor-nvxt.onrender.com/comisiones/ciclo_por_fechas`,
        { params, headers: { Authorization: `Bearer ${token}` } }
      );
      setData(res.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
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
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchCicloActual();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chipsOrdenados = data
    ? [...(data.ventas_chips || [])].sort((a, b) =>
        new Date(`${b.fecha} ${b.hora}`).getTime() - new Date(`${a.fecha} ${a.hora}`).getTime())
    : [];

  const totalMostrado = esCadenas ? (data?.total_chips ?? 0) : (data?.total_general ?? 0);

  return (
    <Box sx={{ p: { xs: 1.25, md: 3 }, maxWidth: 1200, mx: "auto" }}>
      <Paper elevation={0} sx={{ p: { xs: 1.5, md: 3 }, border: "1px solid #E5E7EB", borderRadius: 3 }}>

        {/* ENCABEZADO */}
        <Box sx={{
          background: `linear-gradient(135deg, ${AZUL} 0%, ${AZUL_OSC} 100%)`,
          borderRadius: 3, p: { xs: 2.5, md: 3 }, mb: 2.5, color: "#fff",
        }}>
          <Typography sx={{ fontSize: 12, letterSpacing: 1, opacity: 0.85, fontWeight: 600 }}>
            {esCadenas ? "MIS ACTIVACIONES" : "MIS COMISIONES"}
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: 40, md: 48 }, lineHeight: 1.05, mt: 0.5 }}>
            ${totalMostrado.toFixed(2)}
          </Typography>
          {data && (
            <Typography sx={{ fontSize: 13, opacity: 0.85, mt: 0.75 }}>
              {fmtFecha(data.inicio_ciclo)} — {fmtFecha(data.fin_ciclo)}
            </Typography>
          )}
          {esCadenas && data && (
            <Typography sx={{ fontSize: 13, opacity: 0.85, mt: 0.25 }}>
              {chipsOrdenados.length} activacion{chipsOrdenados.length === 1 ? "" : "es"} en el periodo
            </Typography>
          )}
        </Box>

        {/* FILTRO DE FECHAS */}
        <Box sx={{
          display: "flex", flexWrap: "wrap", gap: 1.25, alignItems: "center",
          p: { xs: 1.5, md: 2 }, mb: 2.5, bgcolor: "#F9FAFB",
          border: "1px solid #E5E7EB", borderRadius: 2,
        }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Desde" value={inicio} onChange={setInicio} format="DD/MM/YYYY"
              slotProps={{ textField: { size: "small", sx: { bgcolor: "#fff", flex: "1 1 150px", minWidth: 145 } } }}
            />
            <DatePicker
              label="Hasta" value={fin} onChange={setFin} format="DD/MM/YYYY"
              slotProps={{ textField: { size: "small", sx: { bgcolor: "#fff", flex: "1 1 150px", minWidth: 145 } } }}
            />
          </LocalizationProvider>
          <Button
            variant="contained" onClick={fetchCicloPorFechas} disabled={!inicio || !fin}
            sx={{ bgcolor: AZUL, fontWeight: 700, "&:hover": { bgcolor: AZUL_OSC } }}
          >
            Buscar
          </Button>
          <Button
            variant="text"
            onClick={() => { setInicio(null); setFin(null); fetchCicloActual(); }}
            sx={{ color: "#6B7280", fontWeight: 600 }}
          >
            Limpiar
          </Button>
        </Box>

        {cargando ? (
          <Typography sx={{ color: "#6B7280" }}>Cargando...</Typography>
        ) : !data ? (
          <Typography sx={{ color: "#B91C1C" }}>No se pudieron cargar las comisiones.</Typography>
        ) : esCadenas ? (
          /* ===== VISTA CADENAS: SOLO ACTIVACIONES, EN RECUADROS ===== */
          <Box>
            {chipsOrdenados.length === 0 ? (
              <Box sx={{
                textAlign: "center", py: 6, color: "#9CA3AF",
                border: "1px dashed #D1D5DB", borderRadius: 2,
              }}>
                <Typography sx={{ fontSize: 40, mb: 1 }}>📭</Typography>
                <Typography>Sin activaciones en este periodo</Typography>
              </Box>
            ) : (
              <Box sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
                gap: 1.5,
              }}>
                {chipsOrdenados.map((v, i) => (
                  <Box key={i} sx={{
                    border: "1px solid #DBEAFE",
                    borderLeft: `5px solid ${AZUL}`,
                    borderRadius: 2.5,
                    p: 2,
                    bgcolor: "#fff",
                    boxShadow: "0 1px 3px rgba(30,58,138,0.08)",
                    transition: "box-shadow .2s, transform .2s",
                    "&:hover": { boxShadow: "0 6px 16px rgba(30,58,138,0.14)", transform: "translateY(-2px)" },
                  }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                      <Box>
                        <Typography sx={{
                          fontFamily: "monospace", fontSize: 19, fontWeight: 700,
                          color: AZUL_OSC, letterSpacing: 0.5,
                        }}>
                          {v.numero_telefono}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: "#6B7280", mt: 0.25 }}>
                          {v.tipo_chip}
                        </Typography>
                      </Box>
                      <Box sx={{
                        bgcolor: AZUL_CLARO, color: AZUL_OSC,
                        px: 1.5, py: 0.6, borderRadius: 1.5,
                        fontWeight: 800, fontSize: 16, whiteSpace: "nowrap",
                      }}>
                        ${v.comision.toFixed(2)}
                      </Box>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography sx={{ fontSize: 12.5, color: "#374151", fontWeight: 600 }}>
                        {fmtFecha(v.fecha)}
                      </Typography>
                      <Typography sx={{ fontSize: 12.5, color: "#9CA3AF" }}>
                        {fmtHora(v.hora)}
                      </Typography>
                      {v.es_incubadora && (
                        <Chip label="Incubadora" size="small" color="warning" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
                      )}
                    </Stack>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        ) : (
          /* ===== VISTA NORMAL: LOS OTROS MODULOS ===== */
          <>
            <Seccion icono="🧩" titulo="Accesorios" monto={data.total_accesorios}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={thSx}>Producto</TableCell>
                      <TableCell sx={thSx} align="center">Cant.</TableCell>
                      <TableCell sx={thSx} align="right">Comisión</TableCell>
                      <TableCell sx={thSx}>Fecha</TableCell>
                      <TableCell sx={thSx}>Hora</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(() => {
                      const filas = data.ventas_accesorios
                        .filter(v => !v.producto.toUpperCase().startsWith("TELEFONO"))
                        .sort((a, b) =>
                          new Date(`${b.fecha} ${b.hora}`).getTime() -
                          new Date(`${a.fecha} ${a.hora}`).getTime());
                      if (filas.length === 0) return <SinRegistros cols={5} />;
                      return filas.map((v, i) => (
                        <TableRow key={i} hover>
                          <TableCell>{v.producto}</TableCell>
                          <TableCell align="center">{v.cantidad}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            ${(v.comision * v.cantidad).toFixed(2)}
                          </TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtFecha(v.fecha)}</TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap", color: "#6B7280" }}>{fmtHora(v.hora)}</TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </TableContainer>
            </Seccion>

            <Seccion icono="📱" titulo="Teléfonos" monto={data.total_telefonos}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={thSx}>Teléfono</TableCell>
                      <TableCell sx={thSx}>Tipo</TableCell>
                      <TableCell sx={thSx} align="right">Comisión</TableCell>
                      <TableCell sx={thSx}>Fecha</TableCell>
                      <TableCell sx={thSx}>Hora</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(() => {
                      const filas = [...data.ventas_telefonos].sort((a, b) =>
                        new Date(`${b.fecha} ${b.hora}`).getTime() -
                        new Date(`${a.fecha} ${a.hora}`).getTime());
                      if (filas.length === 0) return <SinRegistros cols={5} />;
                      return filas.map((v, i) => (
                        <TableRow key={i} hover>
                          <TableCell>{v.producto || "N/A"}</TableCell>
                          <TableCell>{v.tipo_venta}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            ${((v.comision_total ?? (v.comision * v.cantidad)) || 0).toFixed(2)}
                          </TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtFecha(v.fecha)}</TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap", color: "#6B7280" }}>{fmtHora(v.hora)}</TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </TableContainer>
            </Seccion>

            <Seccion icono="🔌" titulo="Chips" monto={data.total_chips}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={thSx}>Tipo</TableCell>
                      <TableCell sx={thSx}>Número</TableCell>
                      <TableCell sx={thSx} align="right">Comisión</TableCell>
                      <TableCell sx={thSx} align="center">Incubadora</TableCell>
                      <TableCell sx={thSx}>Fecha</TableCell>
                      <TableCell sx={thSx}>Hora</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {chipsOrdenados.length === 0 ? <SinRegistros cols={6} /> :
                      chipsOrdenados.map((v, i) => (
                        <TableRow key={i} hover>
                          <TableCell>{v.tipo_chip}</TableCell>
                          <TableCell sx={{ fontFamily: "monospace" }}>{v.numero_telefono}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>${v.comision.toFixed(2)}</TableCell>
                          <TableCell align="center">
                            {v.es_incubadora
                              ? <Chip label="Incubadora" size="small" color="warning" variant="outlined" />
                              : <span style={{ color: "#D1D5DB" }}>—</span>}
                          </TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtFecha(v.fecha)}</TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap", color: "#6B7280" }}>{fmtHora(v.hora)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Seccion>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default ComisionesUsuario;
