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

// Tiendas marcadas en rojo. Lista fija por tienda_id (PK interno de la tabla
// tiendas), no es una condición calculada: no depende de garantizados ni de
// cobertura. Ojo: son tienda_id, no num_tienda (el número que se ve en la
// columna N° de la tabla).
const TIENDAS_MARCADAS = new Set([49, 50, 48, 43, 44, 45, 46, 42, 41, 14, 15, 54, 57, 56]);

type Promotor = string | { username: string; asegurado?: boolean };

type Garantizado = {
  tienda_id: number;
  num_tienda: number | null;
  cadena: string | null;
  cadena_id: number | null;
  nombre: string;
  garantizados: number;
  requeridos: number;
  promotores: Promotor[];
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

const nombrePromotor = (p: Promotor | undefined): string | undefined =>
  p == null ? undefined : typeof p === "string" ? p : p.username;

const estaAsegurado = (p: Promotor | undefined): boolean =>
  p != null && typeof p !== "string" && !!p.asegurado;

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
  const tiendasConGar = datos.filter((d) => d.garantizados > 0).length;
  const totalPlazas = datos.reduce((a, d) => a + d.garantizados, 0);
  const cubiertas = datos.reduce((a, d) => a + Math.min(d.asignados, d.garantizados), 0);
  const faltantes = Math.max(0, totalPlazas - cubiertas);
  const porcentaje = totalPlazas > 0 ? Math.round((cubiertas / totalPlazas) * 100) : 0;

  const colorPct = porcentaje >= 90 ? VERDE : porcentaje >= 70 ? NARANJA : ROJO;

  // Meta: rebasar el 80%. Se necesita superar estrictamente, por eso el +1.
  const metaCubiertos = totalPlazas * 0.8;
  const faltanMeta = Math.max(0, Math.ceil(metaCubiertos - cubiertas));
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
                    valor={totalPlazas % 1 === 0 ? totalPlazas : totalPlazas.toFixed(1)}
                    sub="0.5 cuenta como medio"
                    color={NARANJA}
                  />
                  <Contador
                    icono={<PieChartIcon />}
                    titulo="Cobertura"
                    valor={`${porcentaje}%`}
                    sub={`${cubiertas % 1 === 0 ? cubiertas : cubiertas.toFixed(1)} de ${totalPlazas % 1 === 0 ? totalPlazas : totalPlazas.toFixed(1)} cubiertos`}
                    color={colorPct}
                  />
                  <Contador
                    icono={<PersonSearchIcon />}
                    titulo="Nos faltan"
                    valor={faltantes % 1 === 0 ? faltantes : faltantes.toFixed(1)}
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
                        : `promotores para rebasar 80% (${metaCubiertos % 1 === 0 ? metaCubiertos : metaCubiertos.toFixed(1)} de ${totalPlazas % 1 === 0 ? totalPlazas : totalPlazas.toFixed(1)})`
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
                        const marcada = TIENDAS_MARCADAS.has(d.tienda_id);
                        return (
                          <TableRow
                            key={d.tienda_id}
                            hover
                            sx={{
                              bgcolor: marcada
                                ? "#ffebee"
                                : sinGar
                                ? "#fafafa"
                                : idx % 2 === 0
                                ? "#fff"
                                : "#f7f9fc",
                              opacity: sinGar ? 0.6 : 1,
                            }}
                          >
                            <TableCell
                              align="center"
                              sx={{
                                color: "#607d8b",
                                fontWeight: 600,
                                borderLeft: marcada ? `4px solid ${ROJO}` : "none",
                              }}
                            >
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
                              const p = d.promotores[i];
                              const nombre = nombrePromotor(p);
                              const asegurado = estaAsegurado(p);
                              const esHueco = !nombre && i < d.requeridos;
                              const sobrante = !!nombre && i >= d.requeridos;
                              return (
                                <TableCell
                                  key={i}
                                  align="center"
                                  title={
                                    sobrante
                                      ? "Sobrante: no cuenta para el garantizado"
                                      : asegurado
                                      ? "Asegurado"
                                      : ""
                                  }
                                  sx={{
                                    bgcolor: sobrante
                                      ? "#ffcdd2"
                                      : nombre
                                      ? "#e8f5e9"
                                      : esHueco
                                      ? "#ffebee"
                                      : "transparent",
                                    color: sobrante
                                      ? "#b71c1c"
                                      : nombre
                                      ? "#1b5e20"
                                      : "#b71c1c",
                                    fontWeight: nombre ? 600 : 400,
                                    textDecoration: sobrante ? "line-through" : "none",
                                    whiteSpace: "nowrap",
                                    fontSize: "0.7rem",
                                  }}
                                >
                                  {nombre ? (
                                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
                                      <span>{nombre}</span>
                                      {asegurado && (
                                        <Box
                                          component="span"
                                          title="Asegurado"
                                          sx={{
                                            bgcolor: "#1565c0",
                                            color: "#fff",
                                            width: 16,
                                            height: 16,
                                            borderRadius: "50%",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "0.6rem",
                                            fontWeight: 700,
                                            flexShrink: 0,
                                          }}
                                        >
                                          S
                                        </Box>
                                      )}
                                    </Box>
                                  ) : esHueco ? (
                                    "—"
                                  ) : (
                                    ""
                                  )}
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
