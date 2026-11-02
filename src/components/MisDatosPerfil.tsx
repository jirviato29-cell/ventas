import React, { useEffect, useMemo, useState } from "react";
import { Alert, Autocomplete, Avatar, Box, CircularProgress, Paper, TextField, Typography } from "@mui/material";
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
}

// Una persona = todas sus cuentas con el mismo nombre_englobado (o su username si no tiene)
interface Persona {
  clave: string;
  nombre: string;
  englobado: string | null;
  modulos: string[];
  sueldo: number;
  formaPago: string | null;
  cuenta: string | null;
  clabe: string | null;
}

const ROLES_EMPLEADO = ["asesor", "encargado"];

const vacio = (v: string | null | undefined) => !v || !v.trim();

// Misma regla que Nómina (GET /admin/nomina): sueldo = suma de todas las cuentas;
// forma de pago y cuentas salen de la primera cuenta (por id) con sueldo > 0.
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
      const nombre = ordenadas.find((c) => !vacio(c.nombre_completo))?.nombre_completo?.trim() ?? "";
      const modulos = Array.from(
        new Set(ordenadas.map((c) => c.modulo?.nombre).filter((m): m is string => !!m))
      );
      return {
        clave,
        nombre,
        englobado: ordenadas[0].nombre_englobado,
        modulos,
        sueldo: ordenadas.reduce((s, c) => s + (c.sueldo_base ?? 0), 0),
        formaPago: principal.forma_pago,
        cuenta: principal.cuenta_clabe,
        clabe: principal.cuenta_interbancaria,
      };
    })
    .sort((a, b) => (a.nombre || a.clave).localeCompare(b.nombre || b.clave, "es"));
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

const Dato: React.FC<{ etiqueta: string; valor: string | null | undefined }> = ({ etiqueta, valor }) => (
  <Box>
    <Typography sx={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{etiqueta}</Typography>
    {vacio(valor) ? (
      <Typography sx={{ fontSize: 15, color: "#94a3b8" }}>Sin registrar</Typography>
    ) : (
      <Typography sx={{ fontSize: 15, color: "#1e293b", wordBreak: "break-all" }}>{valor}</Typography>
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

  return (
    <Box>
      <Autocomplete
        options={personas}
        value={persona}
        onChange={(_, p) => onSeleccion(p?.clave ?? null)}
        loading={cargando}
        getOptionLabel={(p) => (p.nombre ? `${p.nombre} · ${p.clave}` : p.clave)}
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
        <Typography sx={{ color: "#94a3b8", textAlign: "center", py: 6 }}>Elige un empleado</Typography>
      ) : (
        <Paper sx={{ p: { xs: 2, sm: 3 }, maxWidth: 720 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <Avatar sx={{ width: 64, height: 64, bgcolor: AZUL, fontSize: 24, fontWeight: 700 }}>
              {iniciales(persona.nombre || persona.clave)}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              {vacio(persona.nombre) ? (
                <Typography sx={{ fontSize: 20, color: "#94a3b8" }}>Sin registrar</Typography>
              ) : (
                <Typography sx={{ fontSize: 20, fontWeight: 700, color: "#1e293b" }}>{persona.nombre}</Typography>
              )}
            </Box>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
              gap: 2,
            }}
          >
            <Dato etiqueta="ID" valor={persona.englobado} />
            <Dato etiqueta={persona.modulos.length > 1 ? "Módulos" : "Módulo"} valor={persona.modulos.join(", ")} />
            <Dato etiqueta="Sueldo" valor={persona.sueldo > 0 ? formatoDinero(persona.sueldo) : null} />
            <Dato etiqueta="Forma de pago" valor={persona.formaPago} />
            {persona.formaPago !== "Kids" && (
              <>
                <Dato etiqueta="Número de cuenta" valor={persona.cuenta} />
                <Dato etiqueta="CLABE" valor={persona.clabe} />
              </>
            )}
            <Dato etiqueta="Fecha de ingreso" valor="Pendiente" />
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default MisDatosPerfil;
