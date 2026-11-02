import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import axios from "axios";

const API = "/api";
const AZUL = "#0A2878";
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` });

interface UsuarioApi {
  id: number;
  nombre_completo: string | null;
  username: string;
  rol: string;
  sueldo_base: number | null;
  modulo: { id: number; nombre: string } | null;
  forma_pago: string | null;
  cuenta_clabe: string | null;
  cuenta_interbancaria: string | null;
  nombre_englobado: string | null;
  fecha_ingreso: string | null; // "YYYY-MM-DD"
}

// Una persona = todas sus cuentas con el mismo nombre_englobado (o su username si no tiene)
interface Persona {
  clave: string; // valor crudo, solo para identificar la selección
  idVisible: string;
  nombre: string;
  englobado: string | null;
  modulos: string[];
  sueldo: number;
  formaPago: string | null;
  cuenta: string | null;
  clabe: string | null;
  fechaIngreso: string | null;
}

const ROLES_EMPLEADO = ["asesor", "encargado"];

const vacio = (v: string | null | undefined) => !v || !v.trim();

// Solo visual: mayúsculas, sin espacios al inicio/final ni repetidos. No toca la BD.
const normalizar = (v: string) => v.trim().replace(/\s+/g, " ").toUpperCase();

// Misma regla que Nómina (GET /admin/nomina): sueldo = suma de todas las cuentas;
// forma de pago, cuentas y fecha de ingreso salen de la primera cuenta (por id) con sueldo > 0.
const agruparPersonas = (usuarios: UsuarioApi[]): Persona[] => {
  const grupos = new Map<string, UsuarioApi[]>();
  usuarios
    .filter((u) => ROLES_EMPLEADO.includes(u.rol))
    .forEach((u) => {
      const clave = u.nombre_englobado || u.username;
      grupos.set(clave, [...(grupos.get(clave) ?? []), u]);
    });

  return Array.from(grupos.entries())
    .map(([clave, cuentas]) => {
      const ordenadas = [...cuentas].sort((a, b) => a.id - b.id);
      const principal = ordenadas.find((c) => (c.sueldo_base ?? 0) > 0) ?? ordenadas[0];
      const nombre = ordenadas.find((c) => !vacio(c.nombre_completo))?.nombre_completo;
      const modulos = Array.from(
        new Set(ordenadas.map((c) => c.modulo?.nombre).filter((m): m is string => !!m))
      );
      return {
        clave,
        idVisible: normalizar(clave),
        nombre: nombre ? normalizar(nombre) : "",
        englobado: ordenadas[0].nombre_englobado ? normalizar(ordenadas[0].nombre_englobado) : null,
        modulos,
        sueldo: ordenadas.reduce((s, c) => s + (c.sueldo_base ?? 0), 0),
        formaPago: principal.forma_pago,
        cuenta: principal.cuenta_clabe,
        clabe: principal.cuenta_interbancaria,
        fechaIngreso: principal.fecha_ingreso,
      };
    })
    .sort((a, b) => (a.nombre || a.idVisible).localeCompare(b.nombre || b.idVisible, "es"));
};

const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("") || "?";

const formatoDinero = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Se parte el texto a mano: new Date("YYYY-MM-DD") lo toma como UTC y en México daría el día anterior
const partesFecha = (iso: string | null): [number, number, number] | null => {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
};

const fechaCorta = (iso: string | null) => {
  const f = partesFecha(iso);
  return f ? `${String(f[2]).padStart(2, "0")}/${String(f[1]).padStart(2, "0")}/${f[0]}` : null;
};

const antiguedad = (iso: string | null) => {
  const f = partesFecha(iso);
  if (!f) return null;
  const hoy = new Date();
  const [anio, mes, dia] = f;
  let anios = hoy.getFullYear() - anio;
  if (hoy.getMonth() + 1 < mes || (hoy.getMonth() + 1 === mes && hoy.getDate() < dia)) anios -= 1;
  if (anios < 1) return "Menos de 1 año";
  return anios === 1 ? "1 año" : `${anios} años`;
};

const NARANJA = "#f97316"; // el de la línea del navbar (theme.ts)
const GRIS_ETIQUETA = "#64748b";
const GRIS_VACIO = "#94a3b8";
const TEXTO = "#1e293b";

const COLOR_FORMA_PAGO: Record<string, string> = {
  BBVA: "#004481",
  "Banco Azteca": "#15803d",
  Kids: NARANJA,
};

// Área por la primera letra del ID: A = ATO, C = Cadenas
const areaDeId = (id: string) => (id.startsWith("A") ? "ATO" : id.startsWith("C") ? "Cadenas" : null);

const SinRegistrar: React.FC = () => <Typography sx={{ fontSize: 15, color: GRIS_VACIO }}>Sin registrar</Typography>;

const Etiqueta: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography sx={{ fontSize: 12, color: GRIS_ETIQUETA, fontWeight: 600, mb: 0.5 }}>{children}</Typography>
);

const Seccion: React.FC<{ titulo: string; icono: React.ReactNode; children: React.ReactNode }> = ({
  titulo,
  icono,
  children,
}) => (
  <Box>
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: GRIS_VACIO, mb: 2 }}>
      {icono}
      <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: GRIS_VACIO }}>{titulo}</Typography>
    </Box>
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 2.5 }}>
      {children}
    </Box>
  </Box>
);

const CampoCopiable: React.FC<{ etiqueta: string; valor: string | null; onCopiar: (v: string) => void }> = ({
  etiqueta,
  valor,
  onCopiar,
}) => (
  <Box sx={{ minWidth: 0 }}>
    <Etiqueta>{etiqueta}</Etiqueta>
    {vacio(valor) ? (
      <SinRegistrar />
    ) : (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Typography sx={{ fontFamily: "monospace", fontSize: 15, color: TEXTO, wordBreak: "break-all" }}>
          {valor}
        </Typography>
        <Tooltip title="Copiar">
          <IconButton size="small" onClick={() => onCopiar(valor!.trim())} aria-label={`Copiar ${etiqueta}`}>
            <ContentCopyIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>
    )}
  </Box>
);

interface Props {
  seleccion: string | null;
  onSeleccion: (clave: string | null) => void;
}

const MisDatosPerfil: React.FC<Props> = ({ seleccion, onSeleccion }) => {
  const [usuarios, setUsuarios] = useState<UsuarioApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    axios
      .get<UsuarioApi[]>(`${API}/registro/usuarios`, { headers: authH() })
      .then((r) => vivo && setUsuarios(r.data))
      .catch(() => vivo && setError("No se pudieron cargar los empleados."))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, []);

  const personas = useMemo(() => agruparPersonas(usuarios), [usuarios]);
  const persona = personas.find((p) => p.clave === seleccion) ?? null;

  const copiar = (valor: string) => {
    navigator.clipboard
      .writeText(valor)
      .then(() => setAviso("Copiado"))
      .catch(() => setAviso("No se pudo copiar"));
  };

  const area = persona ? areaDeId(persona.englobado ?? persona.idVisible) : null;
  const anios = persona ? antiguedad(persona.fechaIngreso) : null;
  const fecha = persona ? fechaCorta(persona.fechaIngreso) : null;
  const esKids = persona?.formaPago === "Kids";
  const chipBandaSx = { bgcolor: "rgba(255,255,255,0.18)", color: "#fff", fontWeight: 600 };

  return (
    <Box>
      <Autocomplete
        options={personas}
        value={persona}
        onChange={(_, p) => onSeleccion(p?.clave ?? null)}
        loading={cargando}
        getOptionLabel={(p) => (p.nombre ? `${p.nombre} · ${p.idVisible}` : p.idVisible)}
        isOptionEqualToValue={(a, b) => a.clave === b.clave}
        noOptionsText="Sin coincidencias"
        loadingText="Cargando…"
        renderInput={(params) => (
          <TextField
            {...params}
            label="Empleado"
            size="small"
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {cargando && <CircularProgress size={18} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        sx={{ maxWidth: 480, mb: 3 }}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!persona ? (
        <Typography sx={{ color: GRIS_VACIO, textAlign: "center", py: 6 }}>Elige un empleado</Typography>
      ) : (
        <Paper elevation={0} sx={{ maxWidth: 720, borderRadius: "12px", boxShadow: "0 4px 20px rgba(15,23,42,0.08)" }}>
          {/* Encabezado: banda azul; el círculo queda montado sobre su borde inferior */}
          <Box
            sx={{
              position: "relative",
              borderRadius: "12px 12px 0 0",
              background: `linear-gradient(135deg, ${AZUL} 0%, #1e3a8a 100%)`,
              px: { xs: 2, sm: 3 },
              pt: 3,
              pb: { xs: 7, sm: 3 },
              pl: { sm: "128px" },
              minHeight: { sm: 112 },
              textAlign: { xs: "center", sm: "left" },
            }}
          >
            <Avatar
              sx={{
                position: "absolute",
                width: 80,
                height: 80,
                bottom: -40,
                left: { xs: "50%", sm: 24 },
                transform: { xs: "translateX(-50%)", sm: "none" },
                bgcolor: "#fff",
                color: AZUL,
                border: `3px solid ${NARANJA}`,
                fontSize: 28,
                fontWeight: 800,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
            >
              {iniciales(persona.nombre || persona.idVisible)}
            </Avatar>

            {vacio(persona.nombre) ? (
              <Typography sx={{ fontSize: 22, color: "rgba(255,255,255,0.7)" }}>Sin registrar</Typography>
            ) : (
              <Typography sx={{ fontSize: { xs: 20, sm: 24 }, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>
                {persona.nombre}
              </Typography>
            )}

            <Box
              sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1.5, justifyContent: { xs: "center", sm: "flex-start" } }}
            >
              <Chip size="small" label={persona.englobado ?? "ID sin registrar"} sx={chipBandaSx} />
              {area && <Chip size="small" label={area} sx={chipBandaSx} />}
              {anios && <Chip size="small" label={anios} sx={chipBandaSx} />}
            </Box>
          </Box>

          {/* Cuerpo */}
          <Box sx={{ px: { xs: 2, sm: 3 }, pt: 7, pb: 3, display: "flex", flexDirection: "column", gap: 3 }}>
            <Seccion titulo="TRABAJO" icono={<WorkOutlineIcon sx={{ fontSize: 18 }} />}>
              <Box>
                <Etiqueta>{persona.modulos.length > 1 ? "Módulos" : "Módulo"}</Etiqueta>
                {persona.modulos.length === 0 ? (
                  <SinRegistrar />
                ) : (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                    {persona.modulos.map((m) => (
                      <Chip key={m} size="small" label={m} variant="outlined" sx={{ color: AZUL, borderColor: AZUL }} />
                    ))}
                  </Box>
                )}
              </Box>
              <Box>
                <Etiqueta>Fecha de ingreso</Etiqueta>
                {fecha ? (
                  <>
                    <Typography sx={{ fontSize: 15, color: TEXTO }}>{fecha}</Typography>
                    <Typography sx={{ fontSize: 13, color: GRIS_ETIQUETA }}>{anios}</Typography>
                  </>
                ) : (
                  <SinRegistrar />
                )}
              </Box>
            </Seccion>

            <Divider />

            <Seccion titulo="PAGO" icono={<PaymentsOutlinedIcon sx={{ fontSize: 18 }} />}>
              <Box>
                <Etiqueta>Sueldo</Etiqueta>
                {persona.sueldo > 0 ? (
                  <Typography sx={{ fontSize: 28, fontWeight: 800, color: TEXTO, lineHeight: 1.1 }}>
                    {formatoDinero(persona.sueldo)}
                  </Typography>
                ) : (
                  <SinRegistrar />
                )}
              </Box>
              <Box>
                <Etiqueta>Forma de pago</Etiqueta>
                {vacio(persona.formaPago) ? (
                  <SinRegistrar />
                ) : (
                  <Chip
                    size="small"
                    label={persona.formaPago}
                    sx={{
                      bgcolor: COLOR_FORMA_PAGO[persona.formaPago!] ?? "#e2e8f0",
                      color: COLOR_FORMA_PAGO[persona.formaPago!] ? "#fff" : TEXTO,
                      fontWeight: 700,
                    }}
                  />
                )}
              </Box>
              {esKids ? (
                <Typography sx={{ fontSize: 14, color: GRIS_VACIO, gridColumn: { sm: "1 / -1" } }}>
                  Pago en efectivo (Kids)
                </Typography>
              ) : (
                <>
                  <CampoCopiable etiqueta="Número de cuenta" valor={persona.cuenta} onCopiar={copiar} />
                  <CampoCopiable etiqueta="CLABE" valor={persona.clabe} onCopiar={copiar} />
                </>
              )}
            </Seccion>
          </Box>
        </Paper>
      )}

      <Snackbar
        open={aviso !== null}
        autoHideDuration={2000}
        onClose={() => setAviso(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        message={aviso}
      />
    </Box>
  );
};

export default MisDatosPerfil;
