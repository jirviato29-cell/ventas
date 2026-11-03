import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Typography, IconButton, MenuItem,
  Table, TableHead, TableRow, TableCell, TableBody, Paper, TableContainer,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Snackbar, Alert, Chip, InputAdornment, CircularProgress, Collapse,
} from "@mui/material";
import {
  Edit, Delete, Close, AccessTime, Visibility, VisibilityOff,
  KeyboardArrowDown, KeyboardArrowRight, Search, Add,
} from "@mui/icons-material";
import axios from "axios";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { obtenerRolDesdeToken } from "../components/Token";
import { DiaTrabajo, Usuario } from "../Types";
import HorarioDialog from "../components/HorarioDialog";
import EditarPersonaDialog from "../components/EditarPersonaDialog";

const API = "/api";

const roles = ["admin", "encargado", "asesor", "contador", "check"];

interface FormEdicion {
  nombre_completo: string;
  username: string;
  rol: string;
  modulo_id: string;
  is_admin: boolean;
  password: string;
  sueldo_base: string;
  forma_pago: string;
  cuenta_clabe: string;
  cuenta_interbancaria: string;
  nombre_englobado: string;
  cadena_id: string;
  tienda_id: string;
  asegurado: boolean;
}

// ── Agrupación visual por persona ────────────────────────────────────
// Solo cambia cómo se ve la tabla: cada cuenta conserva su módulo, login y ventas.

type EstadoAsegurado = "todas" | "ninguna" | "parcial";

interface PersonaUsuarios {
  clave: string;
  tieneEnglobado: boolean;
  id: string; // nombre_englobado normalizado, o el username si no tiene
  nombre: string;
  roles: string;
  asegurado: EstadoAsegurado;
  modulos: string[];
  sueldo: number;
  jornada: number;
  principalId: number;
  formaPago: string | null;
  cuentaClabe: string | null;
  cuentaInterbancaria: string | null;
  fechaIngreso: string | null;
  cuentas: Usuario[];
  textoBusqueda: string;
}

// Clave de agrupación: nombre_englobado sin espacios y en mayúsculas
const claveEnglobado = (u: Usuario) => {
  const e = (u.nombre_englobado ?? "").replace(/\s+/g, "").toUpperCase();
  return e || null;
};

const sinAcentos = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const fechaDDMMAAAA = (iso?: string | null) => {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : null;
};

const agruparPorPersona = (usuarios: Usuario[]): PersonaUsuarios[] => {
  // Map respeta el orden de inserción: las personas salen en el orden que manda el backend
  const grupos = new Map<string, Usuario[]>();
  usuarios.forEach((u) => {
    const clave = claveEnglobado(u) ?? `__cuenta_${u.id}`;
    grupos.set(clave, [...(grupos.get(clave) ?? []), u]);
  });

  return Array.from(grupos.entries()).map(([clave, lista]) => {
    const cuentas = [...lista].sort((a, b) => a.id - b.id);
    // Misma regla que Nómina y Mis datos: la principal es la primera (por id) con sueldo > 0
    const principal = cuentas.find((c) => (c.sueldo_base ?? 0) > 0) ?? cuentas[0];
    const nombre = (cuentas.find((c) => (c.nombre_completo ?? "").trim())?.nombre_completo ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();
    const id = claveEnglobado(cuentas[0]) ?? cuentas[0].username;
    const aseguradas = cuentas.filter((c) => c.asegurado).length;
    // Jornada de la persona: la de la cuenta principal; si es 0, la mayor de sus cuentas (no se suman)
    const jornadaPrincipal = Number(principal.jornada_fija ?? 0) || 0;
    const jornada = jornadaPrincipal > 0
      ? jornadaPrincipal
      : Math.max(0, ...cuentas.map((c) => Number(c.jornada_fija ?? 0) || 0));
    return {
      clave,
      tieneEnglobado: !clave.startsWith("__cuenta_"),
      id,
      nombre,
      roles: Array.from(new Set(cuentas.map((c) => c.rol))).join(", "),
      asegurado: aseguradas === cuentas.length ? "todas" : aseguradas === 0 ? "ninguna" : "parcial",
      modulos: Array.from(new Set(cuentas.map((c) => c.modulo?.nombre).filter((m): m is string => !!m))),
      sueldo: cuentas.reduce((s, c) => s + (c.sueldo_base ?? 0), 0),
      jornada,
      principalId: principal.id,
      formaPago: principal.forma_pago ?? null,
      cuentaClabe: principal.cuenta_clabe ?? null,
      cuentaInterbancaria: principal.cuenta_interbancaria ?? null,
      fechaIngreso: principal.fecha_ingreso ?? null,
      cuentas,
      textoBusqueda: sinAcentos([nombre, id, ...cuentas.map((c) => c.username)].join(" ")),
    };
  });
};

const formVacio: FormEdicion = {
  nombre_completo: "",
  username: "",
  rol: "",
  modulo_id: "",
  is_admin: false,
  password: "",
  sueldo_base: "",
  forma_pago: "",
  cuenta_clabe: "",
  cuenta_interbancaria: "",
  nombre_englobado: "",
  cadena_id: "",
  tienda_id: "",
  asegurado: false,
};

const UsuariosAdmin = () => {
  const esAdmin = obtenerRolDesdeToken() === "admin";
  const navigate = useNavigate();
  const location = useLocation();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [modulos, setModulos] = useState<{ id: number; nombre: string }[]>([]);
  const [cadenas, setCadenas] = useState<any[]>([]);
  const [tiendas, setTiendas] = useState<any[]>([]);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<FormEdicion>(formVacio);
  const [horarioOpen, setHorarioOpen] = useState(false);
  const [horarioUserId, setHorarioUserId] = useState<number | null>(null);
  // Mensaje que manda "Crear Nuevo Usuario" al regresar con éxito
  const [savedMsg, setSavedMsg] = useState<string | null>(
    () => (location.state as { mensaje?: string } | null)?.mensaje ?? null
  );
  // La contraseña solo se edita tras dar clic en el lápiz, para que el
  // autollenado del navegador no la cambie sin querer al guardar.
  const [editarPassword, setEditarPassword] = useState(false);
  const [verPassword, setVerPassword] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  // Contraseña actual descifrada por el backend (undefined = aún no se pide)
  const [passwordActual, setPasswordActual] = useState<string | null | undefined>(undefined);
  const [avisoPassword, setAvisoPassword] = useState("");
  const [cargandoPassword, setCargandoPassword] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  // "Editar acceso": el diálogo de siempre, pero solo usuario, contraseña y módulo/tienda
  const [modoAcceso, setModoAcceso] = useState(false);
  // Copia fija de las cuentas al abrir "Editar persona" (no cambia si la tabla se recarga)
  const [cuentasPersona, setCuentasPersona] = useState<Usuario[] | null>(null);

  const personas = useMemo(() => agruparPorPersona(usuarios), [usuarios]);
  const personasVisibles = useMemo(() => {
    const q = sinAcentos(busqueda.trim());
    return q ? personas.filter((p) => p.textoBusqueda.includes(q)) : personas;
  }, [personas, busqueda]);

  const token = localStorage.getItem("token");
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const mostrarCuentas = form.forma_pago === "BBVA" || form.forma_pago === "Banco Azteca";

  const cargarModulos = async () => {
    try {
      const res = await axios.get(`/api/registro/modulos`, config);
      setModulos(res.data);
    } catch {
      console.error("Error al cargar módulos");
    }
  };

  const cargarCadenasYTiendas = async () => {
    try {
      const [rc, rt] = await Promise.all([
        axios.get(`${API}/registro/cadenas`, config),
        axios.get(`${API}/registro/tiendas`, config),
      ]);
      setCadenas(rc.data);
      setTiendas(rt.data);
    } catch (e) {
      console.error("Error cargando cadenas/tiendas", e);
    }
  };

  const cargarUsuarios = async () => {
    try {
      const res = await axios.get(`/api/registro/usuarios`, config);
      setUsuarios(res.data);
    } catch {
      alert("Error al cargar usuarios");
    }
  };

  useEffect(() => {
    if (!esAdmin) return;
    // Limpia el mensaje del historial para que no reaparezca al recargar
    if ((location.state as { mensaje?: string } | null)?.mensaje) {
      navigate(location.pathname, { replace: true, state: null });
    }
    cargarUsuarios();
    cargarModulos();
    cargarCadenasYTiendas();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const abrirDialog = (u: Usuario, acceso = false) => {
    setModoAcceso(acceso);
    setEditandoId(u.id);
    setForm({
      nombre_completo: u.nombre_completo ?? "",
      username: u.username,
      rol: u.rol,
      modulo_id: u.modulo?.id?.toString() ?? "",
      is_admin: u.is_admin,
      password: "",
      sueldo_base: u.sueldo_base?.toString() ?? "0",
      forma_pago: u.forma_pago ?? "",
      cuenta_clabe: u.cuenta_clabe ?? "",
      cuenta_interbancaria: u.cuenta_interbancaria ?? "",
      nombre_englobado: u.nombre_englobado ?? "",
      cadena_id: u.tienda?.cadena_id?.toString() ?? "",
      tienda_id: u.tienda?.id?.toString() ?? "",
      asegurado: !!u.asegurado,
    });
    setEditarPassword(false);
    setVerPassword(false);
    setPasswordActual(undefined);
    setAvisoPassword("");
    setDialogAbierto(true);
  };

  const cerrarDialog = () => {
    setDialogAbierto(false);
    setModoAcceso(false);
    setEditandoId(null);
    setForm(formVacio);
    setEditarPassword(false);
    setVerPassword(false);
    setPasswordActual(undefined);
    setAvisoPassword("");
  };

  const alternarEditarPassword = () => {
    setForm((f) => ({ ...f, password: "" }));
    setVerPassword(false);
    setAvisoPassword("");
    if (editarPassword) {
      setEditarPassword(false);
    } else {
      setEditarPassword(true);
      setTimeout(() => passwordRef.current?.focus(), 0);
    }
  };

  const alternarVerPassword = async () => {
    // Con el lápiz activo el ojito solo muestra lo que se escribe
    if (editarPassword || verPassword) {
      setVerPassword((v) => !v);
      return;
    }
    if (passwordActual) {
      setVerPassword(true);
      return;
    }
    if (editandoId === null) return;
    setCargandoPassword(true);
    setAvisoPassword("");
    try {
      const res = await axios.get(
        `/api/registro/usuarios/${editandoId}/password`,
        config
      );
      setPasswordActual(res.data.password ?? null);
      if (res.data.password) {
        setVerPassword(true);
      } else {
        setAvisoPassword("Sin contraseña visible: asígnale una nueva con el lápiz");
      }
    } catch (err: any) {
      setAvisoPassword(err.response?.data?.detail || "No se pudo obtener la contraseña");
    } finally {
      setCargandoPassword(false);
    }
  };

  const guardarCambios = async () => {
    if (editandoId === null) return;
    if (modoAcceso) {
      // Solo acceso: los datos de la persona se editan desde "Editar persona"
      try {
        const payload: Record<string, unknown> = {};
        if (form.username) payload.username = form.username;
        if (form.modulo_id) payload.modulo_id = parseInt(form.modulo_id);
        if (editarPassword && form.password) payload.password = form.password;
        payload.tienda_id = form.tienda_id ? parseInt(form.tienda_id) : null;
        await axios.put(`/api/registro/usuarios/${editandoId}`, payload, config);
        cerrarDialog();
        cargarUsuarios();
        setSavedMsg("Acceso actualizado");
      } catch (err: any) {
        alert(err.response?.data?.detail || "Error al editar el acceso");
      }
      return;
    }
    try {
      const payload: Record<string, unknown> = {
        nombre_completo: form.nombre_completo || null,
        is_admin: form.is_admin,
        sueldo_base: parseFloat(form.sueldo_base) || 0,
        forma_pago: form.forma_pago || null,
        cuenta_clabe: mostrarCuentas ? (form.cuenta_clabe || null) : null,
        cuenta_interbancaria: mostrarCuentas ? (form.cuenta_interbancaria || null) : null,
        nombre_englobado: form.nombre_englobado || null,
      };
      if (form.username) payload.username = form.username;
      if (form.rol) payload.rol = form.rol;
      if (form.modulo_id) payload.modulo_id = parseInt(form.modulo_id);
      if (editarPassword && form.password) payload.password = form.password;
      payload.tienda_id = form.tienda_id ? parseInt(form.tienda_id) : null;
      payload.asegurado = form.asegurado;

      await axios.put(
        `/api/registro/usuarios/${editandoId}`,
        payload,
        config
      );
      cerrarDialog();
      cargarUsuarios();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al editar usuario");
    }
  };

  const eliminarUsuario = async (id: number) => {
    if (!window.confirm("¿Estás seguro de eliminar este usuario?")) return;
    try {
      await axios.delete(`/api/registro/usuarios/${id}`, config);
      cargarUsuarios();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al eliminar usuario");
    }
  };

  const abrirHorario = (userId: number) => {
    setHorarioUserId(userId);
    setHorarioOpen(true);
  };

  const guardarHorario = async (
    horario: DiaTrabajo[],
    diaDescanso: string,
    totalHoras: number
  ) => {
    if (horarioUserId === null) return;

    const perfilBase = usuarios.find((u) => u.id === horarioUserId);
    const englobado = perfilBase?.nombre_englobado;

    const afectados = englobado
      ? usuarios.filter((u) => u.nombre_englobado === englobado)
      : perfilBase ? [perfilBase] : [];

    if (afectados.length === 0) return;

    try {
      await Promise.all(
        afectados.map((p) =>
          axios.put(
            `/api/admin/usuarios/${p.id}/horario`,
            { horario_semanal: horario, dia_descanso: diaDescanso || null },
            config
          )
        )
      );

      const idsAfectados = new Set(afectados.map((p) => p.id));
      setUsuarios((prev) =>
        prev.map((u) =>
          idsAfectados.has(u.id)
            ? { ...u, jornada_fija: totalHoras, horario_semanal: horario, dia_descanso: diaDescanso || null }
            : u
        )
      );

      setSavedMsg(
        afectados.length > 1
          ? `Horario actualizado en ${afectados.length} perfiles de ${englobado}`
          : "Horario actualizado"
      );
    } catch {
      // no-op
    } finally {
      setHorarioOpen(false);
      setHorarioUserId(null);
    }
  };

  const setF = (campo: keyof FormEdicion, valor: string | boolean) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  const fmtMoneda = (v?: number | null) =>
    `$${(v ?? 0).toFixed(2)}`;

  if (!esAdmin) return <Navigate to="/" replace />;

  return (
    <Box sx={{ mt: 4, px: 2 }}>
      <Typography variant="h5" gutterBottom>Gestión de Usuarios</Typography>

      {(() => {
        const aseguradas = personas.filter((p) => p.asegurado === "todas").length;
        return (
          <Box sx={{ mb: 1.5, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
            <Chip
              size="small"
              color={aseguradas === personas.length ? "success" : "warning"}
              label={`Asegurados: ${aseguradas} de ${personas.length}`}
            />
            <TextField
              size="small"
              placeholder="Buscar por nombre, ID o usuario"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              sx={{ width: { xs: "100%", sm: 320 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate("/usuarios/nuevo")}
              sx={{
                ml: { sm: "auto" },
                width: { xs: "100%", sm: "auto" },
                bgcolor: "#f97316",
                fontWeight: 700,
                "&:hover": { bgcolor: "#ea580c" },
              }}
            >
              Nuevo usuario
            </Button>
          </Box>
        );
      })()}

      <TableContainer component={Paper} sx={{ width: "100%", overflowX: "auto" }}>
        <Table size="small" sx={{ tableLayout: "fixed", minWidth: 1230 }}>
          <colgroup>
            <col style={{ width: "3%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "8%" }} />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell sx={{ fontSize: "0.75rem", fontWeight: 700 }}>ID</TableCell>
              <TableCell sx={{ fontSize: "0.75rem", fontWeight: 700 }}>Nombre completo</TableCell>
              <TableCell sx={{ fontSize: "0.75rem", fontWeight: 700 }}>Rol</TableCell>
              <TableCell sx={{ fontSize: "0.75rem", fontWeight: 700 }}>Asegurado</TableCell>
              <TableCell sx={{ fontSize: "0.75rem", fontWeight: 700 }}>Módulos</TableCell>
              <TableCell sx={{ fontSize: "0.75rem", fontWeight: 700 }}>Sueldo</TableCell>
              <TableCell sx={{ fontSize: "0.75rem", fontWeight: 700 }}>Jornada (h)</TableCell>
              <TableCell sx={{ fontSize: "0.75rem", fontWeight: 700 }}>Forma de pago</TableCell>
              <TableCell sx={{ fontSize: "0.75rem", fontWeight: 700 }}>Cuenta CLABE</TableCell>
              <TableCell sx={{ fontSize: "0.75rem", fontWeight: 700 }}>Cuenta interbancaria</TableCell>
              <TableCell sx={{ fontSize: "0.75rem", fontWeight: 700 }}>Fecha de ingreso</TableCell>
              <TableCell sx={{ fontSize: "0.75rem", fontWeight: 700 }}>Cuentas</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {personasVisibles.map((p) => {
              const abierto = abiertos.has(p.clave);
              const alternar = () =>
                setAbiertos((prev) => {
                  const nuevo = new Set(prev);
                  if (nuevo.has(p.clave)) nuevo.delete(p.clave);
                  else nuevo.add(p.clave);
                  return nuevo;
                });
              return (
                <React.Fragment key={p.clave}>
                  <TableRow
                    hover
                    onClick={alternar}
                    sx={{ cursor: "pointer", "& > td": { borderBottom: abierto ? "none" : undefined } }}
                  >
                    <TableCell sx={{ px: "4px" }}>
                      <IconButton
                        size="small"
                        aria-label={abierto ? "Ocultar cuentas" : "Ver cuentas"}
                        onClick={(e) => {
                          e.stopPropagation();
                          alternar();
                        }}
                      >
                        {abierto ? <KeyboardArrowDown fontSize="small" /> : <KeyboardArrowRight fontSize="small" />}
                      </IconButton>
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.75rem", fontWeight: 700, wordBreak: "break-word" }}>{p.id}</TableCell>
                    <TableCell sx={{ fontSize: "0.75rem", wordBreak: "break-word" }}>{p.nombre || "-"}</TableCell>
                    <TableCell sx={{ fontSize: "0.75rem", wordBreak: "break-word" }}>{p.roles}</TableCell>
                    <TableCell align="center" sx={{ fontSize: "0.75rem" }}>
                      {p.asegurado === "todas" ? (
                        <span style={{ color: "#2e7d32", fontWeight: 700 }}>✓</span>
                      ) : p.asegurado === "ninguna" ? (
                        <span style={{ color: "#c62828", fontWeight: 700 }}>✗</span>
                      ) : (
                        <span style={{ color: "#ea580c", fontWeight: 700, whiteSpace: "nowrap" }}>⚠ parcial</span>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.75rem" }}>
                      {p.modulos.length === 0 ? (
                        "-"
                      ) : (
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                          {p.modulos.map((m) => (
                            <Chip key={m} label={m} size="small" sx={{ height: 20, fontSize: "0.7rem" }} />
                          ))}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.75rem" }}>{fmtMoneda(p.sueldo)}</TableCell>
                    <TableCell sx={{ py: "2px", px: "4px" }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AccessTime sx={{ fontSize: "13px !important" }} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirHorario(p.principalId);
                        }}
                        sx={{ fontSize: 11, py: "2px", px: "5px", minWidth: 0, whiteSpace: "nowrap" }}
                      >
                        {p.jornada > 0 ? `${p.jornada}h` : "—"}
                      </Button>
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.75rem" }}>{p.formaPago || "-"}</TableCell>
                    <TableCell sx={{ fontSize: "0.75rem", wordBreak: "break-all" }}>{p.cuentaClabe || "-"}</TableCell>
                    <TableCell sx={{ fontSize: "0.75rem", wordBreak: "break-all" }}>
                      {p.cuentaInterbancaria || "-"}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.75rem" }}>{fechaDDMMAAAA(p.fechaIngreso) ?? "-"}</TableCell>
                    <TableCell sx={{ fontSize: "0.75rem", whiteSpace: "nowrap", py: 0 }}>
                      {p.cuentas.length} {p.cuentas.length === 1 ? "cuenta" : "cuentas"}
                      <IconButton
                        size="small"
                        color="info"
                        aria-label="Editar persona"
                        sx={{ ml: 0.5 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Sin englobado (Zadmin, ZIsrael…): la edición completa de siempre
                          if (p.tieneEnglobado) setCuentasPersona(p.cuentas);
                          else abrirDialog(p.cuentas[0]);
                        }}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>

                  {/* Detalle: una fila por cuenta, con editar y borrar de siempre */}
                  <TableRow>
                    <TableCell colSpan={13} sx={{ p: 0, borderBottom: abierto ? undefined : "none" }}>
                      <Collapse in={abierto} timeout="auto" unmountOnExit>
                        <Box sx={{ bgcolor: "#f8fafc", px: 2, py: 1.5, pl: 6 }}>
                          <Table size="small" sx={{ maxWidth: 760 }}>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b" }}>Usuario</TableCell>
                                <TableCell sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b" }}>Módulo</TableCell>
                                <TableCell sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b" }}>Acciones</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {p.cuentas.map((u) => (
                                <TableRow key={u.id}>
                                  <TableCell sx={{ fontSize: "0.75rem" }}>{u.username}</TableCell>
                                  <TableCell sx={{ fontSize: "0.75rem" }}>
                                    {u.modulo?.nombre || "-"}
                                    {u.tienda && (
                                      <div style={{ fontSize: "0.65rem", color: "#888", marginTop: 2 }}>
                                        {u.tienda.nombre}
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                                    <IconButton
                                      size="small"
                                      color="info"
                                      aria-label={p.tieneEnglobado ? "Editar acceso" : "Editar usuario"}
                                      onClick={() => abrirDialog(u, p.tieneEnglobado)}
                                    >
                                      <Edit fontSize="small" />
                                    </IconButton>
                                    <IconButton size="small" color="error" onClick={() => eliminarUsuario(u.id)}>
                                      <Delete fontSize="small" />
                                    </IconButton>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
            {personasVisibles.length === 0 && (
              <TableRow>
                <TableCell colSpan={13} align="center">
                  {usuarios.length === 0 ? "No hay usuarios" : "Sin coincidencias"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Dialog de edición ─────────────────────────────────────────── */}
      <Dialog open={dialogAbierto} onClose={cerrarDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pr: 6 }}>
          {modoAcceso ? `Editar acceso · ${form.username}` : "Editar usuario"}
          <IconButton
            onClick={cerrarDialog}
            size="small"
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {!modoAcceso && (
          <TextField
            label="Nombre completo"
            value={form.nombre_completo}
            onChange={(e) => setF("nombre_completo", e.target.value)}
            fullWidth
            margin="normal"
            size="small"
          />
          )}

          <TextField
            label="Nombre de usuario"
            value={form.username}
            onChange={(e) => setF("username", e.target.value)}
            fullWidth
            margin="normal"
            size="small"
          />

          {!modoAcceso && (
          <TextField
            select
            label="Rol"
            value={form.rol}
            onChange={(e) => setF("rol", e.target.value)}
            fullWidth
            margin="normal"
            size="small"
          >
            {roles.map((r) => (
              <MenuItem key={r} value={r}>{r}</MenuItem>
            ))}
          </TextField>
          )}

          {form.rol !== "admin" && (
            <TextField
              select
              label="Módulo asignado"
              value={form.modulo_id}
              onChange={(e) => setF("modulo_id", e.target.value)}
              fullWidth
              margin="normal"
              size="small"
            >
              {modulos.map((m) => (
                <MenuItem key={m.id} value={m.id.toString()}>{m.nombre}</MenuItem>
              ))}
            </TextField>
          )}

          {(!modoAcceso ||
            !!form.cadena_id ||
            (modulos.find((m) => m.id.toString() === form.modulo_id)?.nombre ?? "").toLowerCase().includes("cadena")) && (
          <>
          <TextField
            select
            label="Cadena"
            value={form.cadena_id}
            onChange={(e) => {
              setF("cadena_id", e.target.value);
              setF("tienda_id", "");
            }}
            fullWidth
            margin="normal"
            size="small"
          >
            <MenuItem value="">— Sin cadena —</MenuItem>
            {cadenas.map((c) => (
              <MenuItem key={c.id} value={c.id.toString()}>{c.nombre}</MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Tienda"
            value={form.tienda_id}
            onChange={(e) => setF("tienda_id", e.target.value)}
            disabled={!form.cadena_id}
            fullWidth
            margin="normal"
            size="small"
            helperText={!form.cadena_id ? "Selecciona primero una cadena" : ""}
          >
            <MenuItem value="">— Sin tienda —</MenuItem>
            {tiendas
              .filter((t) => t.cadena_id?.toString() === form.cadena_id)
              .map((t) => (
                <MenuItem key={t.id} value={t.id.toString()}>{t.nombre}</MenuItem>
              ))}
          </TextField>
          </>
          )}

          {!modoAcceso && (
          <>
          <TextField
            select
            label="Admin"
            value={form.is_admin ? "true" : "false"}
            onChange={(e) => setF("is_admin", e.target.value === "true")}
            fullWidth
            margin="normal"
            size="small"
          >
            <MenuItem value="true">Sí</MenuItem>
            <MenuItem value="false">No</MenuItem>
          </TextField>

          <TextField
            select
            label="¿Está asegurado?"
            value={form.asegurado ? "si" : "no"}
            onChange={(e) => setF("asegurado", e.target.value === "si")}
            fullWidth margin="normal" size="small"
          >
            <MenuItem value="si">Sí</MenuItem>
            <MenuItem value="no">No</MenuItem>
          </TextField>
          </>
          )}

          <TextField
            label="Contraseña"
            type={!editarPassword || verPassword ? "text" : "password"}
            name="nueva_contrasena_usuario"
            autoComplete="new-password"
            value={editarPassword ? form.password : (verPassword && passwordActual ? passwordActual : "••••••••")}
            onChange={(e) => setF("password", e.target.value)}
            disabled={!editarPassword}
            inputRef={passwordRef}
            fullWidth
            margin="normal"
            size="small"
            placeholder={editarPassword ? "Escribe la nueva contraseña" : undefined}
            helperText={avisoPassword || undefined}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={alternarVerPassword} disabled={cargandoPassword} aria-label="Mostrar u ocultar contraseña">
                    {cargandoPassword
                      ? <CircularProgress size={16} />
                      : verPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                  <IconButton size="small" onClick={alternarEditarPassword} aria-label={editarPassword ? "Cancelar cambio de contraseña" : "Cambiar contraseña"}>
                    {editarPassword ? <Close fontSize="small" /> : <Edit fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {!modoAcceso && (
          <>
          <TextField
            label="Sueldo base"
            type="number"
            value={form.sueldo_base}
            onChange={(e) => setF("sueldo_base", e.target.value)}
            fullWidth
            margin="normal"
            size="small"
            inputProps={{ min: 0, step: 0.01 }}
          />

          <TextField
            select
            label="Forma de pago"
            value={form.forma_pago}
            onChange={(e) => setF("forma_pago", e.target.value)}
            fullWidth
            margin="normal"
            size="small"
          >
            <MenuItem value="">(Sin forma de pago)</MenuItem>
            <MenuItem value="BBVA">BBVA</MenuItem>
            <MenuItem value="Banco Azteca">Banco Azteca</MenuItem>
            <MenuItem value="Kids">Kids</MenuItem>
          </TextField>

          {mostrarCuentas && (
            <>
              <TextField
                label="Cuenta CLABE"
                value={form.cuenta_clabe}
                onChange={(e) => setF("cuenta_clabe", e.target.value)}
                fullWidth
                margin="normal"
                size="small"
                inputProps={{ maxLength: 18 }}
              />
              <TextField
                label="Cuenta interbancaria"
                value={form.cuenta_interbancaria}
                onChange={(e) => setF("cuenta_interbancaria", e.target.value)}
                fullWidth
                margin="normal"
                size="small"
              />
            </>
          )}

          <TextField
            label="Nombre englobado"
            value={form.nombre_englobado}
            onChange={(e) => setF("nombre_englobado", e.target.value)}
            fullWidth
            margin="normal"
            size="small"
            placeholder="Ej. A21-KATIA (igual en todos los perfiles del grupo)"
          />
          </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={cerrarDialog}>Cancelar</Button>
          <Button variant="contained" onClick={guardarCambios}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {cuentasPersona && (
        <EditarPersonaDialog
          open
          cuentas={cuentasPersona}
          onClose={() => setCuentasPersona(null)}
          onGuardado={(msg) => setSavedMsg(msg)}
          onRecargar={cargarUsuarios}
        />
      )}

      <HorarioDialog
        open={horarioOpen}
        onClose={() => { setHorarioOpen(false); setHorarioUserId(null); }}
        onSave={guardarHorario}
        initialHorario={
          horarioUserId !== null
            ? (usuarios.find((u) => u.id === horarioUserId)?.horario_semanal ?? null)
            : null
        }
        initialDiaDescanso={
          horarioUserId !== null
            ? (usuarios.find((u) => u.id === horarioUserId)?.dia_descanso ?? null)
            : null
        }
      />

      <Snackbar
        open={savedMsg !== null}
        autoHideDuration={2000}
        onClose={() => setSavedMsg(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setSavedMsg(null)} sx={{ width: "100%" }}>
          {savedMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UsuariosAdmin;
