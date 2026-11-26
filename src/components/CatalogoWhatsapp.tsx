import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Snackbar,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import RefreshIcon from "@mui/icons-material/Refresh";
import axios from "axios";
import { authH } from "./MisDatosPerfil";
import { mensajeError } from "./MisSolicitudesVacaciones";

// Catálogo de WhatsApp (449 102 7916): foto promo, título y descripción de cada equipo Telcel.
// Meta lee la lista pública /bot-whatsapp/catalogo/feed.csv cada día; solo salen los equipos
// con foto, activos y con precio de contado en el sistema.

const API = "/api/bot-whatsapp/catalogo";
const FOTO_MAX_MB = 5;

interface EquipoApi {
  producto: string;
  modelo: string;
  piezas: number;
  precio: number | null;
  titulo: string | null;
  descripcion: string | null;
  foto_url: string | null;
  activo: boolean;
  en_feed: boolean;
}

interface Borrador {
  titulo: string;
  descripcion: string;
}

const pesos = (n: number | null) =>
  n == null ? "Sin precio" : `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

const CatalogoWhatsapp: React.FC = () => {
  const [equipos, setEquipos] = useState<EquipoApi[] | null>(null);
  const [borradores, setBorradores] = useState<Record<string, Borrador>>({});
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);

  const cargar = useCallback(async () => {
    try {
      const r = await axios.get<EquipoApi[]>(`${API}/admin`, { headers: authH() });
      setEquipos(r.data);
      setBorradores(
        Object.fromEntries(
          r.data.map((e) => [e.producto, { titulo: e.titulo ?? "", descripcion: e.descripcion ?? "" }])
        )
      );
    } catch (e) {
      setEquipos([]);
      setAviso({ tipo: "error", texto: mensajeError(e, "No se pudo cargar el catálogo") });
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const guardarFicha = async (eq: EquipoApi, activo: boolean) => {
    const b = borradores[eq.producto] ?? { titulo: "", descripcion: "" };
    setOcupado(eq.producto);
    try {
      await axios.put(
        `${API}/admin`,
        { producto: eq.producto, titulo: b.titulo, descripcion: b.descripcion, activo },
        { headers: authH() }
      );
      setAviso({ tipo: "success", texto: "Guardado" });
      await cargar();
    } catch (e) {
      setAviso({ tipo: "error", texto: mensajeError(e, "No se pudo guardar") });
    } finally {
      setOcupado(null);
    }
  };

  const subirFoto = async (eq: EquipoApi, archivo: File | undefined) => {
    if (!archivo) return;
    if (archivo.size > FOTO_MAX_MB * 1024 * 1024) {
      setAviso({ tipo: "error", texto: `La foto pesa más de ${FOTO_MAX_MB} MB` });
      return;
    }
    const datos = new FormData();
    datos.append("producto", eq.producto);
    datos.append("foto", archivo);
    setOcupado(eq.producto);
    try {
      await axios.post(`${API}/admin/foto`, datos, { headers: authH() });
      setAviso({ tipo: "success", texto: "Foto subida" });
      await cargar();
    } catch (e) {
      setAviso({ tipo: "error", texto: mensajeError(e, "No se pudo subir la foto") });
    } finally {
      setOcupado(null);
    }
  };

  const cambiar = (producto: string, campo: keyof Borrador, valor: string) =>
    setBorradores((b) => ({
      ...b,
      [producto]: { ...(b[producto] ?? { titulo: "", descripcion: "" }), [campo]: valor },
    }));

  if (equipos === null) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  const enCatalogo = equipos.filter((e) => e.en_feed).length;

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Paper variant="outlined" sx={{ p: 2, mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
        <Box>
          <Typography fontWeight={700}>Catálogo de WhatsApp</Typography>
          <Typography variant="body2" color="text.secondary">
            Sube la foto promo de cada equipo. Sale en el catálogo del 449 102 7916 con su precio de contado y la leyenda
            "En plan desde $0 de pago inicial, sujeto a aprobación de crédito". Meta lo actualiza una vez al día.
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            <b>{enCatalogo}</b> de {equipos.length} equipos salen en el catálogo.
          </Typography>
        </Box>
        <Button startIcon={<RefreshIcon />} onClick={cargar}>
          Actualizar
        </Button>
      </Paper>

      {equipos.length === 0 && (
        <Typography color="text.secondary" sx={{ p: 2 }}>
          No hay equipos Telcel con existencia.
        </Typography>
      )}

      {equipos.map((eq) => {
        const b = borradores[eq.producto] ?? { titulo: "", descripcion: "" };
        const cambiado = b.titulo !== (eq.titulo ?? "") || b.descripcion !== (eq.descripcion ?? "");
        const trabajando = ocupado === eq.producto;
        return (
          <Paper key={eq.producto} variant="outlined" sx={{ p: 2, mb: 1.5, display: "flex", gap: 2, flexWrap: { xs: "wrap", sm: "nowrap" } }}>
            <Box
              sx={{
                width: 120,
                height: 120,
                flexShrink: 0,
                borderRadius: 1,
                bgcolor: "#f1f3f6",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {eq.foto_url ? (
                <img src={eq.foto_url} alt={eq.modelo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <Typography variant="caption" color="text.secondary">Sin foto</Typography>
              )}
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 1 }}>
                <Typography fontWeight={700}>{eq.modelo}</Typography>
                <Chip size="small" label={`${eq.piezas} pzas`} color={eq.piezas > 0 ? "default" : "warning"} />
                <Chip size="small" label={`Contado ${pesos(eq.precio)}`} />
                {eq.en_feed ? (
                  <Chip size="small" color="success" label={eq.piezas > 0 ? "En catálogo" : "En catálogo · agotado"} />
                ) : (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={!eq.foto_url ? "Falta foto" : !eq.precio ? "Falta precio" : "Desactivado"}
                  />
                )}
              </Box>

              <TextField
                fullWidth
                size="small"
                label="Título (opcional)"
                placeholder={eq.modelo}
                value={b.titulo}
                onChange={(e) => cambiar(eq.producto, "titulo", e.target.value)}
                inputProps={{ maxLength: 150 }}
                sx={{ mb: 1 }}
              />
              <TextField
                fullWidth
                size="small"
                multiline
                minRows={2}
                label="Descripción (opcional)"
                placeholder="Ej. Pantalla grande, 64 GB, batería de larga duración"
                value={b.descripcion}
                onChange={(e) => cambiar(eq.producto, "descripcion", e.target.value)}
                inputProps={{ maxLength: 2000 }}
              />

              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1, flexWrap: "wrap" }}>
                <Button component="label" variant="outlined" size="small" startIcon={<PhotoCameraIcon />} disabled={trabajando}>
                  {eq.foto_url ? "Cambiar foto" : "Subir foto"}
                  <input
                    hidden
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      subirFoto(eq, e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </Button>
                <Button variant="contained" size="small" disabled={trabajando || !cambiado} onClick={() => guardarFicha(eq, eq.activo)}>
                  Guardar
                </Button>
                <Box sx={{ flex: 1 }} />
                <Typography variant="body2" color="text.secondary">Activo</Typography>
                <Switch checked={eq.activo} disabled={trabajando} onChange={(e) => guardarFicha(eq, e.target.checked)} />
                {trabajando && <CircularProgress size={18} />}
              </Box>
            </Box>
          </Paper>
        );
      })}

      <Snackbar open={!!aviso} autoHideDuration={4000} onClose={() => setAviso(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        {aviso ? <Alert severity={aviso.tipo} onClose={() => setAviso(null)}>{aviso.texto}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
};

export default CatalogoWhatsapp;
