import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Snackbar,
  Typography,
} from "@mui/material";
import PhotoCameraBackIcon from "@mui/icons-material/PhotoCameraBack";
import axios from "axios";

const API = "https://ato-appservidor-nvxt.onrender.com";
const token = () => localStorage.getItem("token") ?? "";
const authH = () => ({ Authorization: `Bearer ${token()}` });

const MAX_LADO = 1200;
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

type Tipo = "apertura" | "cierre";

interface CapturaResponse {
  id: number;
  username: string;
  fecha: string;
  tipo: string;
  clave: string;
  hora_entrada: string | null;
  hora_salida: string | null;
  duracion_minutos: number | null;
  foto_url: string;
}

const formatFecha = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const formatHora = (hhmmss: string | null) => {
  if (!hhmmss) return "—";
  return hhmmss.slice(0, 5);
};

/** Redimensiona a lado mayor MAX_LADO y devuelve el base64 sin el prefijo data:. */
const comprimir = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("El archivo no es una imagen válida."));
      img.onload = () => {
        const lado = Math.max(img.width, img.height);
        const factor = lado > MAX_LADO ? MAX_LADO / lado : 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * factor);
        canvas.height = Math.round(img.height * factor);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo procesar la imagen."));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8).split(",")[1]);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

const CheckInBES: React.FC = () => {
  const [aplica, setAplica] = useState<boolean | null>(null);
  const [subiendo, setSubiendo] = useState<Tipo | null>(null);
  const [resultado, setResultado] = useState<CapturaResponse | null>(null);
  const [snack, setSnack] = useState<
    { msg: string; sev: "success" | "error" | "warning"; autoHide?: boolean } | null
  >(null);

  const inputApertura = useRef<HTMLInputElement>(null);
  const inputCierre = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let vivo = true;
    axios
      .get<{ aplica: boolean }>(`${API}/capturas-telcel/aplica`, { headers: authH() })
      .then(({ data }) => { if (vivo) setAplica(!!data.aplica); })
      // Falla cerrado: ante cualquier error la seccion no se muestra
      .catch(() => { if (vivo) setAplica(false); });
    return () => { vivo = false; };
  }, []);

  const subir = useCallback(async (tipo: Tipo, file: File) => {
    if (!file.type.startsWith("image/")) {
      setSnack({ msg: "Ese archivo no es una imagen. Elige la captura de pantalla.", sev: "error" });
      return;
    }
    if (file.size > MAX_BYTES) {
      setSnack({ msg: "La imagen pesa más de 10 MB. Toma la captura de nuevo.", sev: "error" });
      return;
    }

    setSubiendo(tipo);
    setResultado(null);
    try {
      const b64 = await comprimir(file);
      const { data } = await axios.post<CapturaResponse>(
        `${API}/capturas-telcel/subir`,
        { tipo, foto_base64: b64 },
        { headers: authH() }
      );
      setResultado(data);
      setSnack({ msg: `Captura de ${tipo} registrada ✓`, sev: "success" });
    } catch (err: any) {
      // comprimir() rechaza con un Error normal, sin respuesta HTTP
      if (!err?.response) {
        setSnack({
          msg: err?.message || "No se pudo procesar la imagen. Intenta de nuevo.",
          sev: "error",
        });
        return;
      }
      const detail = err?.response?.data?.detail;
      if (detail && typeof detail === "object" && detail.codigo) {
        setSnack({ msg: detail.mensaje, sev: "warning", autoHide: false });
      } else {
        setSnack({
          msg: typeof detail === "string" ? detail : "No se pudo subir la captura. Intenta de nuevo.",
          sev: "error",
          autoHide: true,
        });
      }
    } finally {
      setSubiendo(null);
    }
  }, []);

  const onArchivo = useCallback(
    (tipo: Tipo) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Se limpia para que elegir el mismo archivo dos veces vuelva a disparar onChange
      e.target.value = "";
      if (file) subir(tipo, file);
    },
    [subir]
  );

  // Todos los hooks quedaron arriba; a partir de aqui ya se puede cortar el render.
  // Mientras no se sepa (null) o no aplique (false) no se pinta nada, ni un parpadeo.
  if (aplica !== true) return null;

  const cargando = subiendo !== null;
  const botonSx = { flex: 1, py: 2.5, fontSize: 16, fontWeight: 700 };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <input
        ref={inputApertura}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={onArchivo("apertura")}
      />
      <input
        ref={inputCierre}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={onArchivo("cierre")}
      />

      <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
        Check In BES
      </Typography>
      <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
        Sube la pantalla completa de Check In/Out de la app de Telcel, sin recortar.
      </Typography>

      <Box display="flex" gap={2} mb={2}>
        <Button
          variant="contained"
          size="large"
          disabled={cargando}
          onClick={() => inputApertura.current?.click()}
          startIcon={
            subiendo === "apertura"
              ? <CircularProgress size={18} color="inherit" />
              : <PhotoCameraBackIcon />
          }
          sx={{ ...botonSx, bgcolor: "#16a34a", "&:hover": { bgcolor: "#15803d" } }}
        >
          SUBIR APERTURA
        </Button>
        <Button
          variant="contained"
          size="large"
          disabled={cargando}
          onClick={() => inputCierre.current?.click()}
          startIcon={
            subiendo === "cierre"
              ? <CircularProgress size={18} color="inherit" />
              : <PhotoCameraBackIcon />
          }
          sx={{ ...botonSx, bgcolor: "#FF6600", "&:hover": { bgcolor: "#ea5c00" } }}
        >
          SUBIR CIERRE
        </Button>
      </Box>

      {cargando && (
        <Box display="flex" alignItems="center" gap={1} mb={2} sx={{ color: "text.secondary" }}>
          <CircularProgress size={18} />
          <Typography variant="body2">
            Leyendo la captura... tarda unos segundos, no cierres la pantalla.
          </Typography>
        </Box>
      )}

      {resultado && (
        <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
          <Typography fontWeight={700} sx={{ color: "#16a34a", mb: 1 }}>
            Esto fue lo que se leyó
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "120px auto",
              columnGap: 2,
              rowGap: 0.75,
            }}
          >
            <Typography variant="body2" color="text.secondary">Fecha</Typography>
            <Typography variant="body2" fontWeight={600}>{formatFecha(resultado.fecha)}</Typography>

            <Typography variant="body2" color="text.secondary">Clave</Typography>
            <Typography variant="body2" fontWeight={600}>{resultado.clave}</Typography>

            <Typography variant="body2" color="text.secondary">Entrada</Typography>
            <Typography variant="body2" fontWeight={600}>{formatHora(resultado.hora_entrada)}</Typography>

            {resultado.tipo === "cierre" && (
              <>
                <Typography variant="body2" color="text.secondary">Salida</Typography>
                <Typography variant="body2" fontWeight={600}>{formatHora(resultado.hora_salida)}</Typography>
              </>
            )}
          </Box>
        </Paper>
      )}

      <Snackbar
        open={!!snack}
        autoHideDuration={snack?.autoHide === false ? null : 5000}
        onClose={() => setSnack(null)}
      >
        <Alert
          severity={snack?.sev}
          variant="filled"
          onClose={() => setSnack(null)}
          sx={{ width: "100%", fontSize: 15 }}
        >
          {snack?.msg}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default CheckInBES;
