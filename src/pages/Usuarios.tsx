import React, { useEffect, useState } from "react";
import {
  Box, Typography, IconButton, MenuItem,
  Table, TableHead, TableRow, TableCell, TableBody, Paper, TableContainer,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from "@mui/material";
import { Edit, Delete, Close } from "@mui/icons-material";
import axios from "axios";
import { Usuario } from "../Types";

const roles = ["admin", "encargado", "asesor", "contador"];

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
}

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
};

const UsuariosAdmin = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [modulos, setModulos] = useState<{ id: number; nombre: string }[]>([]);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<FormEdicion>(formVacio);

  const token = localStorage.getItem("token");
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const mostrarCuentas = form.forma_pago === "BBVA" || form.forma_pago === "Banco Azteca";

  const cargarModulos = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/registro/modulos`, config);
      setModulos(res.data);
    } catch {
      console.error("Error al cargar módulos");
    }
  };

  const cargarUsuarios = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/registro/usuarios`, config);
      setUsuarios(res.data);
    } catch {
      alert("Error al cargar usuarios");
    }
  };

  useEffect(() => {
    cargarUsuarios();
    cargarModulos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const abrirDialog = (u: Usuario) => {
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
    });
    setDialogAbierto(true);
  };

  const cerrarDialog = () => {
    setDialogAbierto(false);
    setEditandoId(null);
    setForm(formVacio);
  };

  const guardarCambios = async () => {
    if (editandoId === null) return;
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
      if (form.password) payload.password = form.password;

      await axios.put(
        `${process.env.REACT_APP_API_URL}/registro/usuarios/${editandoId}`,
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
      await axios.delete(`${process.env.REACT_APP_API_URL}/registro/usuarios/${id}`, config);
      cargarUsuarios();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al eliminar usuario");
    }
  };

  const setF = (campo: keyof FormEdicion, valor: string | boolean) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  const fmtMoneda = (v?: number | null) =>
    `$${(v ?? 0).toFixed(2)}`;

  return (
    <Box sx={{ mt: 4, px: 2 }}>
      <Typography variant="h5" gutterBottom>Gestión de Usuarios</Typography>

      <TableContainer component={Paper} sx={{ width: "100%", overflowX: "auto" }}>
        <Table size="small" sx={{ tableLayout: "fixed", minWidth: 1050 }}>
          <colgroup>
            <col style={{ width: "9%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "9%" }} />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontSize: "0.75rem", fontWeight: 700 }}>ID</TableCell>
              <TableCell sx={{ fontSize: "0.75rem", fontWeight: 700 }}>Nombre completo</TableCell>
              <TableCell sx={{ fontSize: "0.75rem", fontWeight: 700 }}>Rol</TableCell>
              <TableCell sx={{ fontSize: "0.75rem", fontWeight: 700 }}>Módulo</TableCell>
              <TableCell sx={{ fontSize: "0.75rem", fontWeight: 700 }}>Sueldo base</TableCell>
              <TableCell sx={{ fontSize: "0.75rem", fontWeight: 700 }}>Forma de pago</TableCell>
              <TableCell sx={{ fontSize: "0.75rem", fontWeight: 700 }}>Cuenta CLABE</TableCell>
              <TableCell sx={{ fontSize: "0.75rem", fontWeight: 700 }}>Cuenta interbancaria</TableCell>
              <TableCell sx={{ fontSize: "0.75rem", fontWeight: 700 }}>Englobado</TableCell>
              <TableCell sx={{ fontSize: "0.75rem", fontWeight: 700 }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {usuarios.map((u) => (
              <TableRow key={u.id}>
                <TableCell sx={{ fontSize: "0.75rem" }}>{u.username}</TableCell>
                <TableCell sx={{ fontSize: "0.75rem", wordBreak: "break-word" }}>
                  {u.nombre_completo || "-"}
                </TableCell>
                <TableCell sx={{ fontSize: "0.75rem" }}>{u.rol}</TableCell>
                <TableCell sx={{ fontSize: "0.75rem" }}>{u.modulo?.nombre || "-"}</TableCell>
                <TableCell sx={{ fontSize: "0.75rem" }}>{fmtMoneda(u.sueldo_base)}</TableCell>
                <TableCell sx={{ fontSize: "0.75rem" }}>{u.forma_pago || "-"}</TableCell>
                <TableCell sx={{ fontSize: "0.75rem", wordBreak: "break-all" }}>
                  {u.cuenta_clabe || "-"}
                </TableCell>
                <TableCell sx={{ fontSize: "0.75rem", wordBreak: "break-all" }}>
                  {u.cuenta_interbancaria || "-"}
                </TableCell>
                <TableCell sx={{ fontSize: "0.75rem" }}>
                  {u.nombre_englobado || "-"}
                </TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>
                  <IconButton size="small" color="info" onClick={() => abrirDialog(u)}>
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => eliminarUsuario(u.id)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {usuarios.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} align="center">No hay usuarios</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Dialog de edición ─────────────────────────────────────────── */}
      <Dialog open={dialogAbierto} onClose={cerrarDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pr: 6 }}>
          Editar usuario
          <IconButton
            onClick={cerrarDialog}
            size="small"
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <TextField
            label="Nombre completo"
            value={form.nombre_completo}
            onChange={(e) => setF("nombre_completo", e.target.value)}
            fullWidth
            margin="normal"
            size="small"
          />

          <TextField
            label="Nombre de usuario"
            value={form.username}
            onChange={(e) => setF("username", e.target.value)}
            fullWidth
            margin="normal"
            size="small"
          />

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
            label="Nueva contraseña"
            type="password"
            value={form.password}
            onChange={(e) => setF("password", e.target.value)}
            fullWidth
            margin="normal"
            size="small"
            placeholder="Dejar vacío para no cambiar"
          />

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
        </DialogContent>

        <DialogActions>
          <Button onClick={cerrarDialog}>Cancelar</Button>
          <Button variant="contained" onClick={guardarCambios}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsuariosAdmin;
