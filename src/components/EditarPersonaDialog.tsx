import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import axios from "axios";
import { Usuario } from "../Types";

const ROLES = ["admin", "encargado", "asesor", "contador", "check"];
const MIXTO = "__mixto__"; // valor del select cuando las cuentas no coinciden: no se cambia
const TALLAS = ["CH", "M", "G", "XG", "XXG"];

// Deja solo dígitos y corta al máximo permitido
const soloDigitos = (valor: string, max: number) => valor.replace(/\D/g, "").slice(0, max);

interface FormPersona {
  nombre_completo: string;
  rol: string;
  asegurado: string; // "si" | "no" | MIXTO
  forma_pago: string;
  whatsapp: string;
  talla: string;
  cuenta_clabe: string;
  cuenta_interbancaria: string;
  nombre_englobado: string;
  sueldo_total: string;
}

interface ResultadoCuenta {
  username: string;
  ok: boolean;
  error?: string;
}

// Misma regla que Nómina: la principal es la primera (por id) con sueldo > 0
const cuentaPrincipal = (cuentas: Usuario[]) => {
  const ordenadas = [...cuentas].sort((a, b) => a.id - b.id);
  return ordenadas.find((c) => (c.sueldo_base ?? 0) > 0) ?? ordenadas[0];
};

const sumaSueldos = (cuentas: Usuario[]) =>
  Math.round(cuentas.reduce((s, c) => s + (c.sueldo_base ?? 0), 0) * 100) / 100;

const formInicial = (cuentas: Usuario[]): FormPersona => {
  const principal = cuentaPrincipal(cuentas);
  const roles = new Set(cuentas.map((c) => c.rol));
  const aseguradas = cuentas.filter((c) => c.asegurado).length;
  // Valores crudos de la BD (no en mayúsculas): las mayúsculas de la tabla son solo visuales
  const nombre = cuentas.find((c) => (c.nombre_completo ?? "").trim())?.nombre_completo ?? "";
  return {
    nombre_completo: nombre,
    rol: roles.size === 1 ? cuentas[0].rol : MIXTO,
    asegurado: aseguradas === cuentas.length ? "si" : aseguradas === 0 ? "no" : MIXTO,
    forma_pago: principal.forma_pago ?? "",
    whatsapp: principal.whatsapp ?? "",
    talla: principal.talla ?? "",
    cuenta_clabe: principal.cuenta_clabe ?? "",
    cuenta_interbancaria: principal.cuenta_interbancaria ?? "",
    nombre_englobado: principal.nombre_englobado ?? "",
    sueldo_total: sumaSueldos(cuentas).toString(),
  };
};

// ¿Las cuentas tienen hoy valores distintos en este campo?
const varia = (cuentas: Usuario[], campo: keyof Usuario) =>
  new Set(cuentas.map((c) => ((c[campo] as string | null | undefined) ?? "").toString().trim())).size > 1;

interface Props {
  open: boolean;
  cuentas: Usuario[];
  onClose: () => void;
  onGuardado: (mensaje: string) => void;
  onRecargar: () => void;
}

const EditarPersonaDialog: React.FC<Props> = ({ open, cuentas, onClose, onGuardado, onRecargar }) => {
  const [form, setForm] = useState<FormPersona>(() => formInicial(cuentas));
  const [inicial, setInicial] = useState<FormPersona>(() => formInicial(cuentas));
  const [guardando, setGuardando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoCuenta[] | null>(null);

  // Al abrir (o cambiar de persona) se recargan los valores
  useEffect(() => {
    if (!open) return;
    const f = formInicial(cuentas);
    setForm(f);
    setInicial(f);
    setResultados(null);
  }, [open, cuentas]);

  const setF = (campo: keyof FormPersona, valor: string) => setForm((prev) => ({ ...prev, [campo]: valor }));

  const conCuentas = form.forma_pago === "BBVA" || form.forma_pago === "Banco Azteca";
  const sueldoNum = parseFloat(form.sueldo_total);
  const sueldoInvalido = form.sueldo_total.trim() !== "" && (isNaN(sueldoNum) || sueldoNum < 0);

  // Solo se mandan los campos que cambiaron; cada uno se aplica a TODAS las cuentas
  const camposComunes = (): Record<string, unknown> => {
    const p: Record<string, unknown> = {};
    if (form.nombre_completo !== inicial.nombre_completo) p.nombre_completo = form.nombre_completo.trim() || null;
    if (form.rol !== inicial.rol && form.rol !== MIXTO) p.rol = form.rol;
    if (form.asegurado !== inicial.asegurado && form.asegurado !== MIXTO) p.asegurado = form.asegurado === "si";
    if (form.forma_pago !== inicial.forma_pago) p.forma_pago = form.forma_pago || null;
    if (form.whatsapp !== inicial.whatsapp) p.whatsapp = form.whatsapp.trim() || null;
    if (form.talla !== inicial.talla) p.talla = form.talla || null;
    if (conCuentas) {
      if (form.cuenta_clabe !== inicial.cuenta_clabe || form.forma_pago !== inicial.forma_pago)
        p.cuenta_clabe = form.cuenta_clabe.trim() || null;
      if (form.cuenta_interbancaria !== inicial.cuenta_interbancaria || form.forma_pago !== inicial.forma_pago)
        p.cuenta_interbancaria = form.cuenta_interbancaria.trim() || null;
    } else if (form.forma_pago !== inicial.forma_pago) {
      // Igual que el diálogo de siempre: sin BBVA/Azteca no hay cuentas
      p.cuenta_clabe = null;
      p.cuenta_interbancaria = null;
    }
    if (form.nombre_englobado !== inicial.nombre_englobado)
      p.nombre_englobado = form.nombre_englobado.trim() || null;
    return p;
  };

  const sueldoCambio = form.sueldo_total.trim() !== "" && !sueldoInvalido && sueldoNum !== parseFloat(inicial.sueldo_total);

  const guardar = async () => {
    const comunes = camposComunes();
    if (Object.keys(comunes).length === 0 && !sueldoCambio) {
      onClose();
      return;
    }
    const principal = cuentaPrincipal(cuentas);
    const config = { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } };

    setGuardando(true);
    setResultados(null);
    const res: ResultadoCuenta[] = [];
    // Uno tras otro para saber exactamente cuál falla
    for (const c of [...cuentas].sort((a, b) => a.id - b.id)) {
      const payload: Record<string, unknown> = { ...comunes };
      // Regla del Panel de Nómina: el total va a la principal y 0 a las demás
      if (sueldoCambio) payload.sueldo_base = c.id === principal.id ? sueldoNum : 0;
      try {
        await axios.put(`/api/registro/usuarios/${c.id}`, payload, config);
        res.push({ username: c.username, ok: true });
      } catch (err: any) {
        res.push({ username: c.username, ok: false, error: err.response?.data?.detail || err.message || "Error" });
      }
    }
    setGuardando(false);
    onRecargar();

    if (res.every((r) => r.ok)) {
      onGuardado(res.length > 1 ? `Persona actualizada en sus ${res.length} cuentas` : "Persona actualizada");
      onClose();
    } else {
      setResultados(res);
    }
  };

  const fallidas = resultados?.filter((r) => !r.ok) ?? [];
  const exitosas = resultados?.filter((r) => r.ok) ?? [];

  return (
    <Dialog open={open} onClose={guardando ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        Editar persona
        <Typography sx={{ fontSize: 13, color: "#64748b" }}>
          Se aplica a {cuentas.length === 1 ? "su cuenta" : `sus ${cuentas.length} cuentas`}:{" "}
          {cuentas.map((c) => c.username).join(", ")}
        </Typography>
        <IconButton onClick={onClose} disabled={guardando} size="small" sx={{ position: "absolute", right: 8, top: 8 }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {resultados && fallidas.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <strong>Los cambios quedaron a medias.</strong>
            {exitosas.length > 0 && (
              <Box sx={{ mt: 0.5 }}>Se guardaron en: {exitosas.map((r) => r.username).join(", ")}.</Box>
            )}
            <Box sx={{ mt: 0.5 }}>
              No se guardaron en:
              {fallidas.map((r) => (
                <div key={r.username}>
                  • {r.username}: {r.error}
                </div>
              ))}
            </Box>
            <Box sx={{ mt: 0.5 }}>Corrige y vuelve a dar Guardar para reintentar en todas.</Box>
          </Alert>
        )}

        <TextField
          label="Nombre completo"
          value={form.nombre_completo}
          onChange={(e) => setF("nombre_completo", e.target.value)}
          fullWidth
          margin="normal"
          size="small"
          helperText={varia(cuentas, "nombre_completo") ? "Hoy varía entre cuentas; solo se unifica si lo cambias" : undefined}
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
          {inicial.rol === MIXTO && (
            <MenuItem value={MIXTO}>
              Varía ({Array.from(new Set(cuentas.map((c) => c.rol))).join(", ")}) — no cambiar
            </MenuItem>
          )}
          {ROLES.map((r) => (
            <MenuItem key={r} value={r}>
              {r}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="¿Está asegurado?"
          value={form.asegurado}
          onChange={(e) => setF("asegurado", e.target.value)}
          fullWidth
          margin="normal"
          size="small"
        >
          {inicial.asegurado === MIXTO && <MenuItem value={MIXTO}>⚠ Parcial — no cambiar</MenuItem>}
          <MenuItem value="si">Sí</MenuItem>
          <MenuItem value="no">No</MenuItem>
        </TextField>

        <TextField
          label="Sueldo total"
          type="number"
          value={form.sueldo_total}
          onChange={(e) => setF("sueldo_total", e.target.value)}
          fullWidth
          margin="normal"
          size="small"
          inputProps={{ min: 0, step: 0.01 }}
          error={sueldoInvalido}
          helperText={
            sueldoInvalido
              ? "Debe ser un número mayor o igual a 0"
              : cuentas.length > 1
              ? `Suma de sus cuentas. Si lo cambias, va completo a ${cuentaPrincipal(cuentas).username} y las demás quedan en $0`
              : undefined
          }
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

        <TextField
          label="WhatsApp"
          value={form.whatsapp}
          onChange={(e) => setF("whatsapp", soloDigitos(e.target.value, 10))}
          fullWidth
          margin="normal"
          size="small"
          inputProps={{ inputMode: "numeric", maxLength: 10 }}
          helperText={varia(cuentas, "whatsapp") ? "Hoy varía entre cuentas; solo se unifica si lo cambias" : undefined}
        />

        <TextField
          select
          label="Talla"
          value={form.talla}
          onChange={(e) => setF("talla", e.target.value)}
          fullWidth
          margin="normal"
          size="small"
          helperText={varia(cuentas, "talla") ? "Hoy varía entre cuentas; solo se unifica si la cambias" : undefined}
        >
          <MenuItem value="">(Sin talla)</MenuItem>
          {/* Si en la BD hay una talla fuera de la lista, se muestra para no perderla */}
          {inicial.talla && !TALLAS.includes(inicial.talla) && (
            <MenuItem value={inicial.talla}>{inicial.talla}</MenuItem>
          )}
          {TALLAS.map((t) => (
            <MenuItem key={t} value={t}>
              {t}
            </MenuItem>
          ))}
        </TextField>

        {conCuentas && (
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
              onChange={(e) => setF("cuenta_interbancaria", soloDigitos(e.target.value, 18))}
              fullWidth
              margin="normal"
              size="small"
              inputProps={{ inputMode: "numeric", maxLength: 18 }}
            />
          </>
        )}

        <TextField
          label="Nombre englobado (ID)"
          value={form.nombre_englobado}
          onChange={(e) => setF("nombre_englobado", e.target.value)}
          fullWidth
          margin="normal"
          size="small"
          placeholder="Ej. A21-KATIA"
          helperText={
            form.nombre_englobado.trim() === "" && inicial.nombre_englobado !== ""
              ? "Si lo dejas vacío, sus cuentas se separan en filas distintas"
              : varia(cuentas, "nombre_englobado")
              ? "Hoy varía entre cuentas; solo se unifica si lo cambias"
              : undefined
          }
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={guardando}>
          {resultados ? "Cerrar" : "Cancelar"}
        </Button>
        <Button
          variant="contained"
          onClick={guardar}
          disabled={guardando || sueldoInvalido}
          startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {guardando ? "Guardando…" : "Guardar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditarPersonaDialog;
