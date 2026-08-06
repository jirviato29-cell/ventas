import React, { useEffect, useState } from "react";
import {
  Box, Button, Container, MenuItem, TextField, Typography, Alert, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import HorarioDialog from "../components/HorarioDialog";
import { DiaTrabajo } from "../Types";


const CrearUsuario = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("");
  const [modulo, setModulo] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [modulos, setModulos] = useState<{ id: number; nombre: string }[]>([]);
  const [tiendas, setTiendas] = useState<{ id: number; nombre: string }[]>([]);
  const [tiendaId, setTiendaId] = useState<number | "">("");
  const [nuevaTiendaOpen, setNuevaTiendaOpen] = useState(false);
  const [nuevaTiendaNombre, setNuevaTiendaNombre] = useState("");
  const [tiendaError, setTiendaError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);
  const navigate = useNavigate();
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [formaPago, setFormaPago] = useState("");
  const [cuentaClabe, setCuentaClabe] = useState("");
  const [cuentaInterbancaria, setCuentaInterbancaria] = useState("");
  const [nombreEnglobado, setNombreEnglobado] = useState("");
  const [jornadaFija, setJornadaFija] = useState(0);
  const [horarioLocal, setHorarioLocal] = useState<DiaTrabajo[]>([]);
  const [horarioOpen, setHorarioOpen] = useState(false);
  const token = localStorage.getItem("token");
  const config = {
    headers: { Authorization: `Bearer ${token}` },
  };

  useEffect(() => {
    const localToken = localStorage.getItem("token");
    const cfg = { headers: { Authorization: `Bearer ${localToken}` } };
    const fetchModulos = async () => {
      try {
        const res = await axios.get(`https://ato-appservidor-nvxt.onrender.com/registro/modulos`, cfg);
        setModulos(res.data);
      } catch {
        console.error("Error al cargar módulos");
      }
    };
    const fetchTiendas = async () => {
      try {
        const res = await axios.get(`https://ato-appservidor-nvxt.onrender.com/registro/tiendas`, cfg);
        setTiendas(res.data);
      } catch {
        console.error("Error al cargar tiendas");
      }
    };
    fetchModulos();
    fetchTiendas();
  }, []);

  const mostrarCuentas = formaPago === "BBVA" || formaPago === "Banco Azteca";

  const moduloSeleccionado = modulos.find((m) => m.id === Number(modulo));
  const esCadenas = !!moduloSeleccionado && /cadena/i.test(moduloSeleccionado.nombre);

  const guardarNuevaTienda = async () => {
    const nombre = nuevaTiendaNombre.trim();
    if (!nombre) {
      setTiendaError("Escribe el nombre de la tienda");
      return;
    }
    try {
      const res = await axios.post(
        `https://ato-appservidor-nvxt.onrender.com/registro/tiendas`,
        { nombre },
        config
      );
      setTiendas((prev) =>
        [...prev, res.data].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
      );
      setTiendaId(res.data.id);
      setNuevaTiendaOpen(false);
      setNuevaTiendaNombre("");
      setTiendaError(null);
    } catch (err: any) {
      setTiendaError(err?.response?.data?.detail || "No se pudo crear la tienda");
    }
  };

  const handleSubmit = async () => {
    try {
      await axios.post(
        `https://ato-appservidor-nvxt.onrender.com/registro/registro`,
        {
          nombre_completo: nombreCompleto,
          username,
          password,
          rol,
          modulo_id: rol !== "admin" ? modulo : null,
          is_admin: isAdmin,
          forma_pago: formaPago || null,
          cuenta_clabe: mostrarCuentas ? (cuentaClabe || null) : null,
          cuenta_interbancaria: mostrarCuentas ? (cuentaInterbancaria || null) : null,
          nombre_englobado: nombreEnglobado || null,
          jornada_fija: jornadaFija,
          horario_semanal: horarioLocal.length > 0 ? horarioLocal : [],
          tienda_id: esCadenas ? (tiendaId || null) : null,
        },
        config
      );
      setMensaje({ tipo: "success", texto: "Usuario creado correctamente" });
      setNombreCompleto("");
      setUsername("");
      setPassword("");
      setRol("");
      setModulo("");
      setIsAdmin(false);
      setFormaPago("");
      setCuentaClabe("");
      setCuentaInterbancaria("");
      setNombreEnglobado("");
      setJornadaFija(0);
      setHorarioLocal([]);
      setTiendaId("");
    } catch (err: any) {
      const detalle = err?.response?.data?.detail || "Error al crear usuario";
      setMensaje({ tipo: "error", texto: detalle });
    }
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Paper sx={{ p: 4, maxWidth: 600, mx: "auto" }}>
        <Typography variant="h5" gutterBottom>
          Crear Nuevo Usuario
        </Typography>

        {mensaje && <Alert severity={mensaje.tipo}>{mensaje.texto}</Alert>}

        <TextField
          label="Nombre completo"
          value={nombreCompleto}
          onChange={(e) => setNombreCompleto(e.target.value)}
          fullWidth
          margin="normal"
        />

        <TextField
          label="Nombre de usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          margin="normal"
        />

        <TextField
          select
          label="Rol"
          value={rol}
          onChange={(e) => {
            setRol(e.target.value);
            setIsAdmin(e.target.value === "admin");
          }}
          fullWidth
          margin="normal"
        >
          <MenuItem value="admin">Admin</MenuItem>
          <MenuItem value="encargado">Encargado</MenuItem>
          <MenuItem value="asesor">Asesor</MenuItem>
          <MenuItem value="contador">Contador</MenuItem>
          <MenuItem value="check">Check</MenuItem>
        </TextField>

        {rol !== "admin" && (
          <TextField
            select
            label="Módulo asignado"
            value={modulo}
            onChange={(e) => setModulo(e.target.value)}
            fullWidth
            margin="normal"
          >
            {modulos.map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.nombre}
              </MenuItem>
            ))}
          </TextField>
        )}

        {rol !== "admin" && esCadenas && (
          <Box>
            <TextField
              select
              label="Tienda"
              value={tiendaId}
              onChange={(e) =>
                setTiendaId(e.target.value === "" ? "" : Number(e.target.value))
              }
              fullWidth
              margin="normal"
              helperText="Tienda de la cadena para este usuario"
            >
              <MenuItem value="">(Sin tienda)</MenuItem>
              {tiendas.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.nombre}
                </MenuItem>
              ))}
            </TextField>
            <Button
              size="small"
              onClick={() => {
                setTiendaError(null);
                setNuevaTiendaOpen(true);
              }}
              sx={{ textTransform: "none" }}
            >
              ＋ Nueva tienda
            </Button>
          </Box>
        )}

        <TextField
          select
          label="Forma de pago"
          value={formaPago}
          onChange={(e) => setFormaPago(e.target.value)}
          fullWidth
          margin="normal"
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
              value={cuentaClabe}
              onChange={(e) => setCuentaClabe(e.target.value)}
              fullWidth
              margin="normal"
              inputProps={{ maxLength: 18 }}
            />
            <TextField
              label="Cuenta interbancaria"
              value={cuentaInterbancaria}
              onChange={(e) => setCuentaInterbancaria(e.target.value)}
              fullWidth
              margin="normal"
            />
          </>
        )}

        <TextField
          label="Nombre englobado"
          value={nombreEnglobado}
          onChange={(e) => setNombreEnglobado(e.target.value)}
          fullWidth
          margin="normal"
          placeholder="Ej. A21-KATIA (igual en todos los perfiles del grupo)"
          helperText="Opcional. Agrupa varios perfiles de la misma persona en nómina."
        />

        <Box mt={1} mb={0.5}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Jornada semanal
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AccessTimeIcon />}
            onClick={() => setHorarioOpen(true)}
          >
            {jornadaFija > 0 ? `${jornadaFija}h configuradas` : "Configurar horario"}
          </Button>
          {jornadaFija > 0 && (
            <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>
              Total: {jornadaFija}h semanales
            </Typography>
          )}
        </Box>

        <HorarioDialog
          open={horarioOpen}
          onClose={() => setHorarioOpen(false)}
          onSave={(horario, _, total) => {
            setHorarioLocal(horario);
            setJornadaFija(total);
            setHorarioOpen(false);
          }}
          initialHorario={horarioLocal.length > 0 ? horarioLocal : null}
        />

        <Dialog open={nuevaTiendaOpen} onClose={() => setNuevaTiendaOpen(false)} fullWidth maxWidth="xs">
          <DialogTitle>Nueva tienda</DialogTitle>
          <DialogContent>
            {tiendaError && <Alert severity="error" sx={{ mb: 1 }}>{tiendaError}</Alert>}
            <TextField
              autoFocus
              label="Nombre de la tienda"
              value={nuevaTiendaNombre}
              onChange={(e) => setNuevaTiendaNombre(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") guardarNuevaTienda(); }}
              fullWidth
              margin="dense"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNuevaTiendaOpen(false)}>Cancelar</Button>
            <Button variant="contained" onClick={guardarNuevaTienda}>Guardar</Button>
          </DialogActions>
        </Dialog>

        <Box mt={2}>
          <Button variant="contained" color="primary" onClick={handleSubmit} fullWidth>
            Crear Usuario
          </Button>
        </Box>
        <Button 
  variant="outlined" 
  color="secondary" 
  sx={{ mt: 2, ml: 1 }}
  onClick={() => navigate("/usuarios/admin")}
>
  Ver usuarios
</Button>
      </Paper>
    </Container>
  );
};

export default CrearUsuario;
