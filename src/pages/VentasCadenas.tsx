import { useCallback, useEffect, useState } from "react";
import {
  Container, Paper, Box, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, Alert, Button,
  Chip, FormControl, Select, MenuItem,
} from "@mui/material";
import axios from "axios";

const API = "https://ato-appservidor-nvxt.onrender.com";

const AZUL = "#0d2b5e";
const NARANJA = "#f57c00";

type Ciclo = {
  inicio: string;
  fin: string;
  etiqueta: string;
  actual: boolean;
};

type Conteos = {
  tel_activado: number;
  chip_express: number;
  chip_cero: number;
  preactivado: number;
  portabilidad: number;
  boletin63: number;
  total: number;
};

type Fila = Conteos & {
  promotor: string;
  nombre: string;
  tienda: string;
};

type Resumen = {
  ciclo: Ciclo;
  filas: Fila[];
  totales: Conteos;
};

// Orden unico para chips y columnas: header es la version de tabla,
// etiqueta es la del chip.
const COLUMNAS: { clave: keyof Conteos; header: string; etiqueta: string }[] = [
  { clave: "tel_activado", header: "TEL. ACTIVADO",   etiqueta: "Tel. Activado" },
  { clave: "chip_express", header: "CHIP EXPRESS",    etiqueta: "Chip Express" },
  { clave: "chip_cero",    header: "CHIP CERO/LIBRE", etiqueta: "Chip Cero/Libre" },
  { clave: "preactivado",  header: "PREACTIVADO",     etiqueta: "Preactivado" },
  { clave: "portabilidad", header: "PORTABILIDAD",    etiqueta: "Portabilidad" },
  { clave: "boletin63",    header: "BOLETIN 63",      etiqueta: "Boletin 63" },
  { clave: "total",        header: "TOTAL",           etiqueta: "TOTAL" },
];

const authConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

const MSG_403 = "No tienes permisos para ver esta pantalla.";

const es403 = (e: unknown) =>
  (e as { response?: { status?: number } })?.response?.status === 403;

// Celda de la fila de totales: queda pegada al fondo del contenedor.
const celdaTotalSx = {
  position: "sticky" as const,
  bottom: 0,
  zIndex: 2,
  bgcolor: AZUL,
  color: "#fff",
  fontWeight: 700,
  borderColor: "#1c3f7d !important",
};

function VentasCadenas() {
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [seleccion, setSeleccion] = useState("");
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prohibido, setProhibido] = useState(false);

  const cargarInicial = useCallback(async () => {
    setCargando(true);
    setError(null);
    setProhibido(false);
    try {
      const config = authConfig();
      const resCiclos = await axios.get<Ciclo[]>(`${API}/ventas-cadenas/ciclos`, config);
      const lista = resCiclos.data;
      setCiclos(lista);

      const actual = lista.find((c) => c.actual) ?? lista[0];
      const url = actual
        ? `${API}/ventas-cadenas/resumen?inicio=${actual.inicio}`
        : `${API}/ventas-cadenas/resumen`;
      const resResumen = await axios.get<Resumen>(url, config);
      setResumen(resResumen.data);
      setSeleccion(resResumen.data.ciclo.inicio);
    } catch (e) {
      console.error("Error cargando ventas cadenas", e);
      if (es403(e)) {
        setProhibido(true);
        setError(MSG_403);
      } else {
        setError("No se pudieron cargar las ventas de cadenas.");
      }
    } finally {
      setCargando(false);
    }
  }, []);

  const cambiarCiclo = useCallback(async (inicio: string) => {
    setSeleccion(inicio);
    setCargando(true);
    setError(null);
    setProhibido(false);
    try {
      const res = await axios.get<Resumen>(
        `${API}/ventas-cadenas/resumen?inicio=${inicio}`,
        authConfig()
      );
      setResumen(res.data);
    } catch (e) {
      console.error("Error cargando resumen del ciclo", e);
      if (es403(e)) {
        setProhibido(true);
        setError(MSG_403);
      } else {
        setError("No se pudo cargar el resumen de este ciclo.");
      }
    } finally {
      setCargando(false);
    }
  }, []);

  const reintentar = useCallback(() => {
    if (seleccion) cambiarCiclo(seleccion);
    else cargarInicial();
  }, [seleccion, cambiarCiclo, cargarInicial]);

  useEffect(() => {
    cargarInicial();
  }, [cargarInicial]);

  const filas = resumen?.filas ?? [];
  const totales = resumen?.totales;

  return (
    <Container maxWidth={false}>
      <Paper sx={{ p: 2 }}>
        {/* Encabezado */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography sx={{ fontWeight: 700, color: AZUL, fontSize: "1.15rem" }}>
              VENTAS CADENAS
            </Typography>
            {resumen && (
              <Typography sx={{ fontSize: "0.75rem", color: "#78909c", mt: 0.3 }}>
                Ciclo: {resumen.ciclo.etiqueta}
              </Typography>
            )}
          </Box>

          <FormControl size="small" sx={{ minWidth: 240 }}>
            <Select
              value={ciclos.some((c) => c.inicio === seleccion) ? seleccion : ""}
              displayEmpty
              disabled={cargando || ciclos.length === 0}
              onChange={(e) => cambiarCiclo(e.target.value as string)}
              sx={{ fontSize: "0.8rem" }}
            >
              <MenuItem value="" disabled>
                Selecciona un ciclo
              </MenuItem>
              {ciclos.map((c) => (
                <MenuItem key={c.inicio} value={c.inicio} sx={{ fontSize: "0.8rem" }}>
                  {c.etiqueta}
                  {c.actual ? "  (vigente)" : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Totales del ciclo */}
        {totales && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2 }}>
            {COLUMNAS.map((col) => {
              const esActivado = col.clave === "tel_activado";
              const esTotal = col.clave === "total";
              return (
                <Chip
                  key={col.clave}
                  size="small"
                  label={`${col.etiqueta}: ${totales[col.clave]}`}
                  sx={{
                    fontSize: "0.72rem",
                    ...(esActivado && { bgcolor: AZUL, color: "#fff", fontWeight: 700 }),
                    ...(esTotal && { bgcolor: NARANJA, color: "#fff", fontWeight: 700 }),
                  }}
                />
              );
            })}
          </Box>
        )}

        {error && (
          <Alert
            severity="error"
            sx={{ mt: 2 }}
            action={
              prohibido ? undefined : (
                <Button color="inherit" size="small" onClick={reintentar}>
                  Reintentar
                </Button>
              )
            }
          >
            {error}
          </Alert>
        )}

        {cargando ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          !error && (
            <TableContainer sx={{ mt: 2, maxHeight: "calc(100vh - 300px)" }}>
              <Table
                size="small"
                stickyHeader
                sx={{
                  "& .MuiTableCell-root": {
                    fontSize: "0.73rem",
                    border: "1px solid #cfd8dc",
                    py: 0.7,
                  },
                }}
              >
                <TableHead>
                  <TableRow>
                    {["#", "PROMOTOR", "TIENDA", ...COLUMNAS.map((c) => c.header)].map((h) => (
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
                  {filas.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={3 + COLUMNAS.length}
                        align="center"
                        sx={{ color: "#78909c", py: 3 }}
                      >
                        Sin ventas en este ciclo
                      </TableCell>
                    </TableRow>
                  )}

                  {filas.map((f, idx) => (
                    <TableRow
                      key={f.promotor}
                      hover
                      sx={{ bgcolor: idx % 2 === 1 ? "#fafafa" : "inherit" }}
                    >
                      <TableCell align="center" sx={{ color: "#90a4ae" }}>
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: "0.73rem", fontWeight: 600 }}>
                          {f.promotor}
                        </Typography>
                        <Typography sx={{ fontSize: "0.65rem", color: "#607d8b" }}>
                          {f.nombre}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{f.tienda}</TableCell>

                      {COLUMNAS.map((col) => {
                        const valor = f[col.clave];
                        if (col.clave === "tel_activado") {
                          return (
                            <TableCell
                              key={col.clave}
                              align="center"
                              sx={{
                                bgcolor: "#e3f0ff",
                                fontSize: "0.85rem",
                                color: valor === 0 ? "#90a4ae" : AZUL,
                                fontWeight: valor === 0 ? 400 : 700,
                              }}
                            >
                              {valor}
                            </TableCell>
                          );
                        }
                        return (
                          <TableCell
                            key={col.clave}
                            align="center"
                            sx={{ fontWeight: col.clave === "total" ? 700 : 400 }}
                          >
                            {valor}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}

                  {totales && (
                    <TableRow>
                      <TableCell align="center" sx={celdaTotalSx} />
                      <TableCell sx={celdaTotalSx}>TOTAL</TableCell>
                      <TableCell sx={celdaTotalSx} />
                      {COLUMNAS.map((col) => (
                        <TableCell key={col.clave} align="center" sx={celdaTotalSx}>
                          {totales[col.clave]}
                        </TableCell>
                      ))}
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )
        )}
      </Paper>
    </Container>
  );
}

export default VentasCadenas;
