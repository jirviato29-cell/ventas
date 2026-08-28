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
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import axios from "axios";

const API = "https://ato-appservidor-nvxt.onrender.com";
const token = () => localStorage.getItem("token") ?? "";
const authH = () => ({ Authorization: `Bearer ${token()}` });

const MAX_LADO = 1200;
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const VERDE = "#16a34a";
const VERDE_HOVER = "#15803d";
const NARANJA = "#FF6600";
const NARANJA_HOVER = "#ea5c00";

type Tipo = "apertura" | "cierre";

interface CapturaItem {
  id: number;
  clave: string;
  hora_entrada: string | null;
  hora_salida: string | null;
  duracion_minutos: number | null;
  foto_url: string;
  subido_at: string | null;
}

interface MisCapturas {
  fecha: string;
  apertura: CapturaItem | null;
  cierre: CapturaItem | null;
}

const formatDuracion = (minutos: number | null) => {
  if (minutos == null) return "—";
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${h}h ${m}m`;
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
  const [capturas, setCapturas] = useState<MisCapturas | null>(null);
  const [subiendo, setSubiendo] = useState<Tipo | null>(null);
  const [fotoFallo, setFotoFallo] = useState<Record<Tipo, boolean>>({
    apertura: false,
    cierre: false,
  });
  const [snack, setSnack] = useState<
    { msg: string; sev: "success" | "error" | "warning"; autoHide?: boolean } | null
  >(null);

  const inputApertura = useRef<HTMLInputElement>(null);
  const inputCierre = useRef<HTMLInputElement>(null);

  const cargarCapturas = useCallback(async () => {
    try {
      const { data } = await axios.get<MisCapturas>(
        `${API}/capturas-telcel/mis-capturas`,
        { headers: authH() }
      );
      setCapturas(data);
      // Al traer datos frescos se reintenta cargar la imagen
      setFotoFallo({ apertura: false, cierre: false });
    } catch {
      // No rompe la pantalla: se cae al estado "Pendiente" con los botones
      setCapturas(null);
    }
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      let ok = false;
      try {
        const { data } = await axios.get<{ aplica: boolean }>(
          `${API}/capturas-telcel/aplica`,
          { headers: authH() }
        );
        ok = !!data.aplica;
      } catch {
        // Falla cerrado: ante cualquier error la seccion no se muestra
        ok = false;
      }
      if (!vivo) return;
      setAplica(ok);
      if (ok) cargarCapturas();
    })();
    return () => { vivo = false; };
  }, [cargarCapturas]);

  const subir = useCallback(
    async (tipo: Tipo, file: File) => {
      if (!file.type.startsWith("image/")) {
        setSnack({ msg: "Ese archivo no es una imagen. Elige la captura de pantalla.", sev: "error" });
        return;
      }
      if (file.size > MAX_BYTES) {
        setSnack({ msg: "La imagen pesa más de 10 MB. Toma la captura de nuevo.", sev: "error" });
        return;
      }

      setSubiendo(tipo);
      try {
        const b64 = await comprimir(file);
        await axios.post(
          `${API}/capturas-telcel/subir`,
          { tipo, foto_base64: b64 },
          { headers: authH() }
        );
        // La pantalla siempre refleja lo guardado en el backend, no lo que creemos
        await cargarCapturas();
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
    },
    [cargarCapturas]
  );

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

  const tarjeta = (tipo: Tipo) => {
    const esApertura = tipo === "apertura";
    const color = esApertura ? VERDE : NARANJA;
    const colorHover = esApertura ? VERDE_HOVER : NARANJA_HOVER;
    const item = esApertura ? capturas?.apertura : capturas?.cierre;
    const inputRef = esApertura ? inputApertura : inputCierre;

    return (
      <Paper
        variant="outlined"
        sx={{ flex: 1, p: 2, borderColor: item ? color : "divider" }}
      >
        <Typography variant="subtitle2" fontWeight={700} sx={{ color, mb: 1.5 }}>
          {esApertura ? "APERTURA" : "CIERRE"}
        </Typography>

        {item ? (
          <>
            {fotoFallo[tipo] ? (
              <Box
                sx={{
                  height: 280,
                  mb: 1.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "#f1f5f9",
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Foto no disponible
                </Typography>
              </Box>
            ) : (
              <Box
                component="a"
                href={item.foto_url}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ display: "block", mb: 1.5 }}
              >
                <Box
                  component="img"
                  src={item.foto_url}
                  alt={`Captura de ${tipo}`}
                  onError={() => setFotoFallo((prev) => ({ ...prev, [tipo]: true }))}
                  sx={{
                    height: 280,
                    width: "100%",
                    objectFit: "contain",
                    bgcolor: "#f8fafc",
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: "divider",
                    display: "block",
                  }}
                />
              </Box>
            )}

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                columnGap: 1.5,
                rowGap: 0.5,
                mb: 1.5,
              }}
            >
              <Typography variant="body2" color="text.secondary">Clave</Typography>
              <Typography variant="body2" fontWeight={600}>{item.clave}</Typography>

              <Typography variant="body2" color="text.secondary">Entrada</Typography>
              <Typography variant="body2" fontWeight={600}>{item.hora_entrada ?? "—"}</Typography>

              {!esApertura && (
                <>
                  <Typography variant="body2" color="text.secondary">Salida</Typography>
                  <Typography variant="body2" fontWeight={600}>{item.hora_salida ?? "—"}</Typography>

                  <Typography variant="body2" color="text.secondary">Duración</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatDuracion(item.duracion_minutos)}
                  </Typography>
                </>
              )}
            </Box>

            <Box display="flex" alignItems="center" gap={0.5}>
              <CheckCircleIcon sx={{ fontSize: 18, color: VERDE }} />
              <Typography variant="body2" fontWeight={600} sx={{ color: VERDE }}>
                Subida
              </Typography>
            </Box>
          </>
        ) : (
          <>
            <Button
              fullWidth
              variant="contained"
              disabled={cargando}
              onClick={() => inputRef.current?.click()}
              startIcon={
                subiendo === tipo
                  ? <CircularProgress size={18} color="inherit" />
                  : <PhotoCameraBackIcon />
              }
              sx={{
                py: 2,
                fontSize: 14,
                fontWeight: 700,
                mb: 1,
                bgcolor: color,
                "&:hover": { bgcolor: colorHover },
              }}
            >
              {esApertura ? "SUBIR APERTURA" : "SUBIR CIERRE"}
            </Button>
            <Typography variant="body2" sx={{ color: "text.disabled" }}>
              Pendiente
            </Typography>
          </>
        )}
      </Paper>
    );
  };

  return (
    <>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Check In BES
      </Typography>

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

        <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
          Sube la pantalla completa de Check In/Out de la app de Telcel, sin recortar.
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
            mb: 2,
          }}
        >
          {tarjeta("apertura")}
          {tarjeta("cierre")}
        </Box>

        {cargando && (
          <Box display="flex" alignItems="center" gap={1} sx={{ color: "text.secondary" }}>
            <CircularProgress size={18} />
            <Typography variant="body2">
              Leyendo la captura... tarda unos segundos, no cierres la pantalla.
            </Typography>
          </Box>
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
    </>
  );
};

export default CheckInBES;
