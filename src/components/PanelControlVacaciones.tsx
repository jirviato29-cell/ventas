import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Collapse,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import SearchIcon from "@mui/icons-material/Search";
import axios from "axios";
import { authH } from "./MisDatosPerfil";

// Panel de control de vacaciones (solo admin): GET /api/vacaciones/panel, solo lectura.
// Las reglas (LFT, fin de semana ÷ 3, cada periodo en el ciclo donde empieza) viven en el backend.

const VERDE = "#15803D";
const ROJO = "#B91C1C";

type EstadoCiclo = "Cerrado" | "Actual" | "Siguiente";

interface CicloPanel {
  estado: EstadoCiclo;
  ciclo_inicio: string;
  ciclo_fin: string;
  anios: number;
  dias_corresponden: number;
  dias_tomados: number;
  dias_descuentos: number;
  dias_solicitados_pendientes: number;
  dias_quedan: number;
  dias_perdidos: number | null; // solo ciclos cerrados y ya caducados
  caduca?: string | null; // aniversario + 18 meses − 1 día (LFT arts. 81 y 516)
}

interface PersonaPanel {
  clave: string;
  nombre_completo: string | null;
  modulos: string[];
  fecha_ingreso: string | null;
  // null sin fecha de ingreso
  anios: number | null;
  dias_para_aniversario: number | null;
  dias_corresponden: number | null;
  dias_tomados: number | null;
  dias_descuentos: number | null;
  dias_solicitados_pendientes: number | null;
  dias_quedan: number | null;
  ciclo_inicio: string | null;
  ciclo_fin: string | null;
  ciclos: CicloPanel[];
}

const fechaCorta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const rango = (inicio: string, fin: string) => `${fechaCorta(inicio)} – ${fechaCorta(fin)}`;
const numero = (n: number) => n.toLocaleString("es-MX", { maximumFractionDigits: 1 });

// Para buscar sin importar mayúsculas ni acentos
const sinAcentos = (texto: string) =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();

// Mismo estilo que Mis solicitudes / Gestión de Usuarios: títulos naranjas, líneas y hover del tema
const celdaEncabezadoSx = { fontSize: 13, px: 1, whiteSpace: "nowrap" };
const celdaSx = { fontSize: 13, px: 1, py: 0.75 };
const subEncabezadoSx = { fontSize: 12, px: 1, fontWeight: 700, color: "#64748b", whiteSpace: "nowrap" };
const COLUMNAS = 14;

// GET /api/vacaciones/dias-extra/panel: solo las personas con días extra otorgados
interface DiasExtraPanel {
  clave: string;
  dias_disponibles: number;
  vence: string | null;
  dias_usados: number;
  dias_pendientes: number;
}
// Con 30 días o menos para que caduquen (y días por usar), los días van en rojo
const AVISO_CADUCAN = 30;

// Hoy (YYYY-MM-DD, hora de México) y días entre dos fechas sin que influya la zona horaria
const hoyMx = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
const diasEntre = (desde: string, hasta: string) => {
  const utc = (c: string) => Date.UTC(Number(c.slice(0, 4)), Number(c.slice(5, 7)) - 1, Number(c.slice(8, 10)));
  return Math.round((utc(hasta) - utc(desde)) / 86400000);
};

// Caducidad más cercana de los años vigentes hoy que todavía tienen días (el atrasado o el actual),
// igual que el aviso de Mis vacaciones. null si no hay días por caducar.
const proximaCaducidad = (ciclos: CicloPanel[], hoy: string) =>
  ciclos
    .filter((c) => c.anios > 0 && c.caduca && c.ciclo_inicio <= hoy && hoy <= c.caduca && c.dias_quedan > 0)
    .sort((a, b) => a.anios - b.anios)[0] ?? null;

const ESTILO_ESTADO: Record<EstadoCiclo, { fondo: string; color: string; borde: string }> = {
  Cerrado: { fondo: "#f1f5f9", color: "#475569", borde: "#cbd5e1" },
  Actual: { fondo: "#DCFCE7", color: VERDE, borde: "#16A34A" },
  Siguiente: { fondo: "#DBEAFE", color: "#1D4ED8", borde: "#60A5FA" },
};

const Ciclos: React.FC<{ ciclos: CicloPanel[] }> = ({ ciclos }) => (
  <Box sx={{ py: 1.5, px: { xs: 1, md: 4 }, bgcolor: "#f8fafc" }}>
    <Table size="small" sx={{ maxWidth: 900, bgcolor: "#fff" }}>
      <TableHead>
        <TableRow>
          <TableCell sx={subEncabezadoSx}>Ciclo</TableCell>
          <TableCell align="center" sx={subEncabezadoSx}>Años</TableCell>
          <TableCell align="center" sx={subEncabezadoSx}>Le corresponden</TableCell>
          <TableCell align="center" sx={subEncabezadoSx}>Tomados</TableCell>
          <TableCell align="center" sx={subEncabezadoSx}>Descuentos</TableCell>
          <TableCell align="center" sx={subEncabezadoSx}>Perdidos</TableCell>
          <TableCell align="center" sx={subEncabezadoSx}>Estado</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {ciclos.map((c) => {
          const estilo = ESTILO_ESTADO[c.estado];
          return (
            <TableRow key={c.ciclo_inicio}>
              <TableCell sx={{ ...celdaSx, whiteSpace: "nowrap" }}>{rango(c.ciclo_inicio, c.ciclo_fin)}</TableCell>
              <TableCell align="center" sx={celdaSx}>{c.anios}</TableCell>
              <TableCell align="center" sx={celdaSx}>{numero(c.dias_corresponden)}</TableCell>
              <TableCell align="center" sx={celdaSx}>{numero(c.dias_tomados)}</TableCell>
              <TableCell align="center" sx={celdaSx}>{numero(c.dias_descuentos)}</TableCell>
              <TableCell
                align="center"
                sx={{ ...celdaSx, fontWeight: 700, color: c.dias_perdidos ? ROJO : "#94a3b8" }}
              >
                {c.dias_perdidos == null ? "—" : numero(c.dias_perdidos)}
              </TableCell>
              <TableCell align="center" sx={celdaSx}>
                <Chip
                  size="small"
                  label={c.estado}
                  sx={{
                    fontWeight: 600,
                    fontSize: 12,
                    height: 22,
                    bgcolor: estilo.fondo,
                    color: estilo.color,
                    border: `1px solid ${estilo.borde}`,
                  }}
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </Box>
);

const PanelControlVacaciones: React.FC = () => {
  const [personas, setPersonas] = useState<PersonaPanel[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [abierta, setAbierta] = useState<string | null>(null);
  const [diasExtra, setDiasExtra] = useState<Record<string, DiasExtraPanel>>({});

  useEffect(() => {
    let vivo = true;
    axios
      .get<PersonaPanel[]>("/api/vacaciones/panel", { headers: authH() })
      .then((r) => vivo && setPersonas(r.data))
      .catch(() => vivo && setError("No se pudo cargar el panel de vacaciones."))
      .finally(() => vivo && setCargando(false));
    // Columna "Días extra": consulta aparte; si falla, la columna queda con guiones
    axios
      .get<DiasExtraPanel[]>("/api/vacaciones/dias-extra/panel", { headers: authH() })
      .then((r) => vivo && setDiasExtra(Object.fromEntries(r.data.map((d) => [d.clave.trim().toUpperCase(), d]))))
      .catch(() => vivo && setDiasExtra({}));
    return () => {
      vivo = false;
    };
  }, []);

  const hoy = hoyMx();
  const filas = useMemo(() => {
    const filtro = sinAcentos(busqueda);
    return personas.filter(
      (p) => !filtro || sinAcentos(p.clave).includes(filtro) || sinAcentos(p.nombre_completo ?? "").includes(filtro)
    );
  }, [personas, busqueda]);

  // Todos los hooks van arriba: este return no puede quedar antes de ninguno
  if (cargando) {
    return (
      <Box sx={{ textAlign: "center", py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  const guion = <Typography component="span" sx={{ fontSize: 13, color: "#94a3b8" }}>—</Typography>;

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 1.5, mb: 2 }}>
        <TextField
          size="small"
          placeholder="Buscar por nombre o ID"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          sx={{ width: { xs: "100%", sm: 320 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <Typography sx={{ fontSize: 12, color: "#64748b" }}>
          Da clic en una persona para ver sus ciclos. Los días no se acumulan de un ciclo a otro.
        </Typography>
      </Box>

      {/* En computadora las columnas se reparten el ancho; solo en celular se desliza de lado */}
      <TableContainer component={Paper} sx={{ width: "100%", overflowX: "auto" }}>
        <Table size="small" sx={{ width: "100%", minWidth: { xs: 1100, md: 0 } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...celdaEncabezadoSx, width: 32, px: 0.5 }} aria-label="Ver ciclos" />
              <TableCell sx={celdaEncabezadoSx}>ID</TableCell>
              <TableCell sx={celdaEncabezadoSx}>Módulo</TableCell>
              <TableCell sx={celdaEncabezadoSx}>Fecha de ingreso</TableCell>
              <TableCell align="center" sx={celdaEncabezadoSx}>Años en la empresa</TableCell>
              <TableCell align="center" sx={celdaEncabezadoSx}>Faltan para cumplir año</TableCell>
              <TableCell align="center" sx={celdaEncabezadoSx}>Le corresponden</TableCell>
              <TableCell align="center" sx={celdaEncabezadoSx}>Tomados</TableCell>
              <TableCell align="center" sx={celdaEncabezadoSx}>Descuentos</TableCell>
              <TableCell align="center" sx={celdaEncabezadoSx}>Solicitados</TableCell>
              <TableCell align="center" sx={celdaEncabezadoSx}>Le quedan</TableCell>
              <TableCell align="center" sx={celdaEncabezadoSx}>Días extra</TableCell>
              <TableCell align="center" sx={celdaEncabezadoSx}>Caducan en</TableCell>
              <TableCell sx={celdaEncabezadoSx}>Ciclo actual</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMNAS} align="center" sx={{ py: 4, fontSize: 14, color: "#94a3b8" }}>
                  {personas.length === 0 ? "Sin personas activas" : "Sin coincidencias"}
                </TableCell>
              </TableRow>
            ) : (
              filas.map((p) => {
                const conIngreso = p.anios != null;
                const expandible = p.ciclos.length > 0;
                const abiertaFila = abierta === p.clave;
                const extra = diasExtra[p.clave.trim().toUpperCase()];
                // Regla de 18 meses: cada año caduca en su aniversario + 18 meses − 1 día; se muestra el más
                // cercano que todavía tiene días. Sin días, sin fecha de ingreso o sin su primer año: nada caduca.
                const proximo = conIngreso ? proximaCaducidad(p.ciclos, hoy) : null;
                const diasCaducan = proximo?.caduca ? diasEntre(hoy, proximo.caduca) : null;
                return (
                  <React.Fragment key={p.clave}>
                    <TableRow
                      hover
                      onClick={() => expandible && setAbierta(abiertaFila ? null : p.clave)}
                      sx={{
                        cursor: expandible ? "pointer" : "default",
                        "& > td": { borderBottom: abiertaFila ? "none" : undefined },
                      }}
                    >
                      <TableCell sx={{ ...celdaSx, px: 0.5, color: "#64748b" }}>
                        {expandible &&
                          (abiertaFila ? (
                            <KeyboardArrowDownIcon fontSize="small" sx={{ display: "block" }} />
                          ) : (
                            <KeyboardArrowRightIcon fontSize="small" sx={{ display: "block" }} />
                          ))}
                      </TableCell>
                      <TableCell sx={{ ...celdaSx, whiteSpace: "nowrap" }}>
                        <Tooltip arrow title={p.nombre_completo?.trim().toUpperCase() || "Sin nombre"}>
                          <Typography component="span" sx={{ fontSize: 13, fontWeight: 700, cursor: "help" }}>
                            {p.clave}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ ...celdaSx, color: "#475569" }}>
                        {p.modulos.length > 0 ? p.modulos.join(", ") : "—"}
                      </TableCell>
                      <TableCell sx={{ ...celdaSx, whiteSpace: "nowrap" }}>
                        {p.fecha_ingreso ? (
                          fechaCorta(p.fecha_ingreso)
                        ) : (
                          <Typography component="span" sx={{ fontSize: 12, color: "#94a3b8" }}>
                            Sin fecha de ingreso
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center" sx={celdaSx}>{conIngreso ? p.anios : guion}</TableCell>
                      <TableCell align="center" sx={{ ...celdaSx, whiteSpace: "nowrap" }}>
                        {p.dias_para_aniversario != null
                          ? `${p.dias_para_aniversario} ${p.dias_para_aniversario === 1 ? "día" : "días"}`
                          : guion}
                      </TableCell>
                      <TableCell align="center" sx={celdaSx}>
                        {!conIngreso ? (
                          guion
                        ) : p.anios === 0 ? (
                          <>
                            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>0</Typography>
                            <Typography sx={{ fontSize: 11, color: "#64748b", lineHeight: 1.2 }}>
                              Aún no cumple su primer año
                            </Typography>
                          </>
                        ) : (
                          <Typography component="span" sx={{ fontSize: 13, fontWeight: 700 }}>
                            {numero(p.dias_corresponden ?? 0)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center" sx={celdaSx}>{conIngreso ? numero(p.dias_tomados ?? 0) : guion}</TableCell>
                      <TableCell align="center" sx={celdaSx}>{conIngreso ? numero(p.dias_descuentos ?? 0) : guion}</TableCell>
                      <TableCell align="center" sx={celdaSx}>
                        {conIngreso ? numero(p.dias_solicitados_pendientes ?? 0) : guion}
                      </TableCell>
                      <TableCell align="center" sx={celdaSx}>
                        {conIngreso ? (
                          <Typography
                            component="span"
                            sx={{ fontSize: 15, fontWeight: 800, color: (p.dias_quedan ?? 0) < 0 ? ROJO : VERDE }}
                          >
                            {numero(p.dias_quedan ?? 0)}
                          </Typography>
                        ) : (
                          guion
                        )}
                      </TableCell>
                      <TableCell align="center" sx={{ ...celdaSx, whiteSpace: "nowrap" }}>
                        {extra ? (
                          <Tooltip
                            arrow
                            title={`Vigentes ${extra.dias_disponibles} · Usados ${extra.dias_usados} · Pedidos ${
                              extra.dias_pendientes
                            }${extra.vence ? ` · Vence ${fechaCorta(extra.vence)}` : ""}`}
                          >
                            <Typography component="span" sx={{ fontSize: 14, fontWeight: 700, color: "#EF6C00", cursor: "help" }}>
                              {extra.dias_disponibles} / {extra.dias_usados}
                            </Typography>
                          </Tooltip>
                        ) : (
                          guion
                        )}
                      </TableCell>
                      <TableCell align="center" sx={{ ...celdaSx, whiteSpace: "nowrap" }}>
                        {diasCaducan != null && proximo?.caduca ? (
                          <>
                            <Typography sx={{ fontSize: 13 }}>{fechaCorta(proximo.caduca)}</Typography>
                            <Typography
                              sx={{
                                fontSize: 11,
                                lineHeight: 1.2,
                                color: diasCaducan <= AVISO_CADUCAN ? ROJO : "#64748b",
                                fontWeight: diasCaducan <= AVISO_CADUCAN ? 700 : 400,
                              }}
                            >
                              {diasCaducan === 0 ? "Hoy" : `${diasCaducan} ${diasCaducan === 1 ? "día" : "días"}`}
                            </Typography>
                            <Typography sx={{ fontSize: 11, lineHeight: 1.2, color: "#64748b" }}>
                              {`${numero(proximo.dias_quedan)} del año ${proximo.anios}`}
                            </Typography>
                          </>
                        ) : (
                          guion
                        )}
                      </TableCell>
                      <TableCell sx={{ ...celdaSx, whiteSpace: "nowrap" }}>
                        {p.ciclo_inicio && p.ciclo_fin ? rango(p.ciclo_inicio, p.ciclo_fin) : guion}
                      </TableCell>
                    </TableRow>
                    {expandible && (
                      <TableRow>
                        <TableCell colSpan={COLUMNAS} sx={{ p: 0, borderBottom: abiertaFila ? undefined : "none" }}>
                          <Collapse in={abiertaFila} timeout="auto" unmountOnExit>
                            <Ciclos ciclos={p.ciclos} />
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default PanelControlVacaciones;
