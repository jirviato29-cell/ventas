import { useEffect, useState } from "react";
import {
  Container, Paper, Box, Typography, Tabs, Tab, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, CircularProgress,
  LinearProgress,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import StorefrontIcon from "@mui/icons-material/Storefront";
import GroupsIcon from "@mui/icons-material/Groups";
import PieChartIcon from "@mui/icons-material/PieChart";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import FlagIcon from "@mui/icons-material/Flag";
import axios from "axios";

const API = "https://ato-appservidor-nvxt.onrender.com";

const AZUL = "#0d2b5e";
const NARANJA = "#f57c00";
const VERDE = "#2e7d32";
const ROJO = "#c62828";

type Garantizado = {
  tienda_id: number;
  num_tienda: number | null;
  cadena: string | null;
  cadena_id: number | null;
  nombre: string;
  garantizados: number;
  requeridos: number;
  promotores: string[];
  asignados: number;
  cumple: boolean;
};

function Contador({
  icono, titulo, valor, sub, color,
}: {
  icono: React.ReactNode; titulo: string; valor: string | number;
  sub?: string; color: string;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        flex: "1 1 200px",
        p: 1.8,
        borderRadius: 2,
        border: "1px solid #e0e0e0",
        borderLeft: `5px solid ${color}`,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
      }}
    >
      <Box
        sx={{
          bgcolor: `${color}18`,
          color,
          width: 42, height: 42, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {icono}
      </Box>
      <Box>
        <Typography sx={{ fontSize: "0.7rem", color: "#666", fontWeight: 600, letterSpacing: 0.4 }}>
          {titulo.toUpperCase()}
        </Typography>
        <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.1, color }}>
          {valor}
        </Typography>
        {sub && (
          <Typography sx={{ fontSize: "0.68rem", color: "#888" }}>{sub}</Typography>
        )}
      </Box>
    </Paper>
  );
}

export default function Cadenas() {
  const [tab, setTab] = useState(0);
  const [datos, setDatos] = useState<Garantizado[]>([]);
  const [cargando, setCargando] = useState(true);

  const token = localStorage.getItem("token");
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const cargar = async () => {
    setCargando(true);
    try {
      const res = await axios.get(`${API}/registro/garantizados`, config);
      setDatos(res.data);
    } catch (e) {
      console.error("Error cargando garantizados", e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalTiendas = datos.length;
  const tiendasConGar = datos.filter((d) => d.requeridos > 0).length;
  const totalPlazas = datos.reduce((a, d) => a + d.requeridos, 0);
  const cubiertas = datos.reduce((a, d) => a + Math.min(d.asignados, d.requeridos), 0);
  const faltantes = totalPlazas - cubiertas;
  const porcentaje = totalPlazas > 0 ? Math.round((cubiertas / totalPlazas) * 100) : 0;

  const colorPct = porcentaje >= 90 ? VERDE : porcentaje >= 70 ? NARANJA : ROJO;

  // Meta: rebasar el 80%. Se necesita superar estrictamente, por eso el +1.
  const metaCubiertos = Math.floor(totalPlazas * 0.8) + 1;
  const faltanMeta = Math.max(0, metaCubiertos - cubiertas);
  const metaLograda = faltanMeta === 0;

  return (
    <Container maxWidth={false} sx={{ mt: 3, mb: 4 }}>
      <Paper sx={{ p: 2.5, borderRadius: 2 }}>
        <Typography variant="h5" sx={{ mb: 0.5, fontWeight: 700, color: AZUL }}>
          Cadenas
        </Typography>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 2.5, borderBottom: "1px solid #e0e0e0" }}
        >
          <Tab label="Garantizados" sx={{ fontWeight: 700 }} />
        </Tabs>

        {tab === 0 && (
          <>
            {cargando ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 2.5 }}>
                  <Contador
                    icono={<StorefrontIcon />}
                    titulo="Tiendas"
                    valor={totalTiendas}
                    sub={`${tiendasConGar} con garantizado`}
                    color={AZUL}
                  />
                  <Contador
                    icono={<GroupsIcon />}
                    titulo="Garantizados totales"
                    valor={totalPlazas}
                    sub="0.5 cuenta como 1"
                    color={NARANJA}
                  />
                  <Contador
                    icono={<PieChartIcon />}
                    titulo="Cobertura"
                    valor={`${porcentaje}%`}
                    sub={`${cubiertas} de ${totalPlazas} cubiertos`}
                    color={colorPct}
                  />
                  <Contador
                    icono={<PersonSearchIcon />}
                    titulo="Nos faltan"
                    valor={faltantes}
                    sub={faltantes === 1 ? "promotor por asignar" : "promotores por asignar"}
                    color={faltantes === 0 ? VERDE : ROJO}
                  />
                  <Contador
                    icono={<FlagIcon />}
                    titulo="Meta 80%"
                    valor={metaLograda ? "¡Lograda!" : faltanMeta}
                    sub={
                      metaLograda
                        ? `Vas en ${porcentaje}%`
                        : `promotores para rebasar 80% (${metaCubiertos} de ${totalPlazas})`
                    }
                    color={metaLograda ? VERDE : "#6a1b9a"}
                  />
                </Box>

                <Box sx={{ mb: 2.5 }}>
                  <LinearProgress
                    variant="determinate"
                    value={porcentaje}
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      bgcolor: "#eceff1",
                      "& .MuiLinearProgress-bar": { bgcolor: colorPct, borderRadius: 5 },
                    }}
                  />
                </Box>

                <TableContainer sx={{ border: "1px solid #cfd8dc", borderRadius: 1 }}>
                  <Table
                    size="small"
                    sx={{
                      "& td, & th": {
                        fontSize: "0.73rem",
                        border: "1px solid #cfd8dc",
                        py: 0.7,
                      },
                    }}
                  >
                    <TableHead>
                      <TableRow>
                        {["N°", "CADENA", "NOMBRE DE TIENDA", "GAR.",
                          "PROMOTOR 1", "PROMOTOR 2", "PROMOTOR 3", "PROMOTOR 4",
                          "ESTADO"].map((h) => (
                          <TableCell
                            key={h}
                            align="center"
                            sx={{
                              bgcolor: AZUL,
                              color: "#fff",
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                              letterSpacing: 0.3,
                              borderColor: "#1c3f7d !important",
                            }}
                          >
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {datos.map((d, idx) => {
                        const sinGar = d.requeridos === 0;
                        const falta = d.requeridos - d.asignados;
                        return (
                          <TableRow
                            key={d.tienda_id}
                            hover
                            sx={{
                              bgcolor: sinGar
                                ? "#fafafa"
                                : idx % 2 === 0
                                ? "#fff"
                                : "#f7f9fc",
                              opacity: sinGar ? 0.6 : 1,
                            }}
                          >
                            <TableCell align="center" sx={{ color: "#607d8b", fontWeight: 600 }}>
                              {d.num_tienda ?? "-"}
                            </TableCell>
                            <TableCell align="center">
                              <Box
                                component="span"
                                sx={{
                                  bgcolor: AZUL,
                                  color: "#fff",
                                  px: 0.9, py: 0.25,
                                  borderRadius: 1,
                                  fontSize: "0.66rem",
                                  fontWeight: 700,
                                }}
                              >
                                {d.cadena ?? "-"}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, color: "#263238" }}>
                              {d.nombre}
                            </TableCell>
                            <TableCell
                              align="center"
                              sx={{
                                bgcolor: sinGar ? "#eceff1" : "#ffb74d",
                                fontWeight: 800,
                                color: sinGar ? "#90a4ae" : "#5d3a00",
                              }}
                            >
                              {d.garantizados}
                            </TableCell>
                            {[0, 1, 2, 3].map((i) => {
                              const nombre = d.promotores[i];
                              const esHueco = !nombre && i < d.requeridos;
                              return (
                                <TableCell
                                  key={i}
                                  align="center"
                                  sx={{
                                    bgcolor: nombre
                                      ? "#e8f5e9"
                                      : esHueco
                                      ? "#ffebee"
                                      : "transparent",
                                    color: nombre ? "#1b5e20" : "#b71c1c",
                                    fontWeight: nombre ? 600 : 400,
                                    whiteSpace: "nowrap",
                                    fontSize: "0.7rem",
                                  }}
                                >
                                  {nombre ?? (esHueco ? "—" : "")}
                                </TableCell>
                              );
                            })}
                            <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                              {sinGar ? (
                                <Typography sx={{ fontSize: "0.65rem", color: "#90a4ae" }}>
                                  N/A
                                </Typography>
                              ) : d.cumple ? (
                                <CheckCircleIcon sx={{ color: VERDE, fontSize: 19 }} />
                              ) : (
                                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.4 }}>
                                  <CancelIcon sx={{ color: ROJO, fontSize: 19 }} />
                                  <Typography sx={{ fontSize: "0.65rem", color: ROJO, fontWeight: 700 }}>
                                    -{falta}
                                  </Typography>
                                </Box>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </>
        )}
      </Paper>
    </Container>
  );
}
