import { useEffect, useState } from "react";
import {
  Container, Paper, Box, Typography, Tabs, Tab, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, CircularProgress, Chip,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import axios from "axios";

const API = "https://ato-appservidor-nvxt.onrender.com";

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

  const conGarantizado = datos.filter((d) => d.garantizados > 0);
  const totalCumple = conGarantizado.filter((d) => d.cumple).length;

  return (
    <Container maxWidth={false} sx={{ mt: 3, mb: 4 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
          Cadenas
        </Typography>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Garantizados" />
        </Tabs>

        {tab === 0 && (
          <>
            {cargando ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Box sx={{ mb: 1.5, display: "flex", gap: 1 }}>
                  <Chip
                    size="small"
                    color="success"
                    label={`Cubiertas: ${totalCumple}`}
                  />
                  <Chip
                    size="small"
                    color="error"
                    label={`Pendientes: ${conGarantizado.length - totalCumple}`}
                  />
                  <Chip size="small" label={`Con garantizado: ${conGarantizado.length}`} />
                </Box>

                <TableContainer>
                  <Table size="small" sx={{ "& td, & th": { fontSize: "0.75rem" } }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#1a237e" }}>
                        {["N°", "CADENA", "NOMBRE DE TIENDA", "GARANTIZADOS",
                          "PROMOTOR 1", "PROMOTOR 2", "PROMOTOR 3", "PROMOTOR 4",
                          "GARANTIZADO"].map((h) => (
                          <TableCell
                            key={h}
                            align="center"
                            sx={{ color: "#fff", fontWeight: 700, whiteSpace: "nowrap" }}
                          >
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {datos.map((d) => (
                        <TableRow
                          key={d.tienda_id}
                          hover
                          sx={{ opacity: d.garantizados === 0 ? 0.55 : 1 }}
                        >
                          <TableCell align="center">{d.num_tienda ?? "-"}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600 }}>
                            {d.cadena ?? "-"}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{d.nombre}</TableCell>
                          <TableCell
                            align="center"
                            sx={{
                              bgcolor: d.garantizados > 0 ? "#ffb74d" : "transparent",
                              fontWeight: 700,
                            }}
                          >
                            {d.garantizados}
                          </TableCell>
                          {[0, 1, 2, 3].map((i) => (
                            <TableCell
                              key={i}
                              align="center"
                              sx={{
                                bgcolor: d.promotores[i] ? "#fff3e0" : "transparent",
                                color: d.promotores[i] ? "#e65100" : "inherit",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {d.promotores[i] ?? ""}
                            </TableCell>
                          ))}
                          <TableCell align="center">
                            {d.cumple ? (
                              <CheckCircleIcon sx={{ color: "#2e7d32", fontSize: 18 }} />
                            ) : (
                              <CancelIcon sx={{ color: "#c62828", fontSize: 18 }} />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
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
