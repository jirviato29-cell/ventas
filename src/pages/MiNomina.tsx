import React, { useEffect, useState } from "react";
import { obtenerRolDesdeToken } from "../components/Token";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import axios from "axios";

const API = "https://ato-appservidor.onrender.com";
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` });

const ORANGE = "#f97316";

interface Periodo {
  inicio: string;
  fin: string;
}

interface Periodos {
  horas_extras?: Periodo;
  asesores?: Periodo;
  encargados?: Periodo;
  cadenas?: Periodo;
  sueldos_encargados?: Periodo;
}

interface FilaRecibo {
  empleado: string;
  seccion: string;
  sueldo?: number;
  horas_extra?: number;
  pago_he?: number;
  accesorios?: number;
  telefonos?: number;
  chips?: number;
  incubadora?: number;
  planes?: number;
  pendientes?: number;
  bonos?: number;
  subtotal?: number;
  sanciones?: number;
  deposito?: number;
  [key: string]: unknown;
}

interface MiReciboData {
  etiqueta: string;
  creado_en: string;
  periodos: Periodos;
  fila: FilaRecibo;
}

const fmt = (v?: number) => `$${Number(v || 0).toFixed(2)}`;
const fmtFecha = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

const SECCION_LABEL: Record<string, string> = {
  asesor: "Asesor",
  encargado: "Encargado",
  cadena: "Cadena Comercial",
};

const Row: React.FC<{ label: string; value: string; bold?: boolean; color?: string }> = ({
  label, value, bold, color,
}) => (
  <Box display="flex" justifyContent="space-between" py={0.6} px={1}>
    <Typography fontSize={13} color="#475569" fontWeight={bold ? 700 : 400}>{label}</Typography>
    <Typography fontSize={13} fontWeight={bold ? 700 : 500} color={color || "#1e293b"}>{value}</Typography>
  </Box>
);

const MiNomina: React.FC = () => {
  const [data, setData] = useState<MiReciboData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [descargando, setDescargando] = useState(false);

  useEffect(() => {
    axios
      .get<MiReciboData>(`${API}/nomina/mi-recibo`, { headers: authH() })
      .then((r) => setData(r.data))
      .catch((e) => {
        if (e.response?.status === 404) {
          setError(e.response.data?.detail || "No apareces en la nómina publicada");
        } else {
          setError("Error al cargar tu recibo de nómina");
        }
      })
      .finally(() => setCargando(false));
  }, []);

  const descargarPdf = () => {
    setDescargando(true);
    const token = localStorage.getItem("token") ?? "";
    fetch(`${API}/nomina/mi-recibo/pdf`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => { if (!res.ok) throw new Error(); return res.blob(); })
      .then((blob) => {
        const href = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = href;
        a.download = "mi_recibo_nomina.pdf";
        a.click();
        URL.revokeObjectURL(href);
      })
      .catch(() => setError("Error al descargar el PDF"))
      .finally(() => setDescargando(false));
  };

  if (cargando) {
    return <Box textAlign="center" py={8}><CircularProgress sx={{ color: ORANGE }} /></Box>;
  }

  if (error || !data) {
    return (
      <Box maxWidth={480} mx="auto" mt={6}>
        <Alert severity="info">{error || "No hay nómina publicada actualmente"}</Alert>
      </Box>
    );
  }

  const { etiqueta, creado_en, periodos, fila } = data;
  const seccionLabel = SECCION_LABEL[fila.seccion] || fila.seccion;

  const rol = obtenerRolDesdeToken();

  const periodosPorRol: Record<string, string[]> = {
    asesor:    ["horas_extras", "asesores"],
    encargado: ["horas_extras", "encargados", "sueldos_encargados"],
    cadena:    ["horas_extras", "cadenas"],
  };

  const LABEL_PERIODO: Record<string, string> = {
    horas_extras:       "Horas Extra",
    asesores:           "Comisiones",
    encargados:         "Com. Encargados",
    cadenas:            "Com. Cadenas",
    sueldos_encargados: "Sueldos Encargados",
  };

  const clavesPermitidas = periodosPorRol[rol ?? ""] ?? [];

  const periodosOrdenados: [string, Periodo][] = clavesPermitidas
    .map((clave) => [LABEL_PERIODO[clave], periodos[clave as keyof Periodos]] as [string, Periodo | undefined])
    .filter((entry): entry is [string, Periodo] => !!entry[1]);

  return (
    <Box maxWidth={520} mx="auto" py={3}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" fontWeight={700}>Mi Recibo de Nómina</Typography>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={descargarPdf}
          disabled={descargando}
          sx={{ bgcolor: ORANGE, "&:hover": { bgcolor: "#ea6b0a" } }}
        >
          Descargar PDF
        </Button>
      </Box>

      <Paper elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 2, overflow: "hidden" }}>
        {/* Header */}
        <Box sx={{ bgcolor: ORANGE, px: 2, py: 1.5 }}>
          <Typography fontWeight={700} color="white" fontSize={15}>{etiqueta}</Typography>
          <Typography color="rgba(255,255,255,0.85)" fontSize={12}>
            Emitida: {new Date(creado_en).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </Typography>
        </Box>

        {/* Employee */}
        <Box px={2} py={1.5}>
          <Typography fontSize={11} fontWeight={700} color="#94a3b8" letterSpacing={0.5} mb={0.5}>EMPLEADO</Typography>
          <Typography fontWeight={700} fontSize={15}>{fila.empleado}</Typography>
          <Typography fontSize={13} color="#64748b">{seccionLabel}</Typography>
        </Box>

        {/* Periodos */}
        {periodosOrdenados.length > 0 && (
          <>
            <Divider />
            <Box px={2} py={1.5}>
              <Typography fontSize={11} fontWeight={700} color="#94a3b8" letterSpacing={0.5} mb={1}>PERIODOS DE PAGO</Typography>
              {periodosOrdenados.map(([label, p]) => (
                <Box key={label} display="flex" justifyContent="space-between" py={0.4}>
                  <Typography fontSize={12} color="#475569" fontWeight={600}>{label}</Typography>
                  <Typography fontSize={12} color="#1e293b">
                    {fmtFecha(p.inicio)} — {fmtFecha(p.fin)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </>
        )}

        {/* Desglose */}
        <Divider />
        <Box px={2} py={1.5}>
          <Typography fontSize={11} fontWeight={700} color="#94a3b8" letterSpacing={0.5} mb={1}>DESGLOSE</Typography>
          <Row label="Sueldo base" value={fmt(fila.sueldo)} />
          <Row label="Horas extra" value={fila.horas_extra != null ? `${Number(fila.horas_extra) > 0 ? "+" : ""}${Number(fila.horas_extra).toFixed(1)} hrs` : "—"} />
          <Row label="Pago H. Extra" value={fmt(fila.pago_he)} />
          <Row label="Accesorios" value={fmt(fila.accesorios)} />
          <Row label="Teléfonos" value={fmt(fila.telefonos)} />
          <Row label="Chips" value={fmt(fila.chips)} />
          <Row label="Incubadora" value={fmt(fila.incubadora)} />
          <Row label="Planes tarifarios" value={fmt(fila.planes)} />
          <Row label="Com. pendientes" value={fmt(fila.pendientes)} />
          <Row label="Bonos" value={fmt(fila.bonos)} />
          <Divider sx={{ my: 0.5 }} />
          <Row label="Subtotal" value={fmt(fila.subtotal)} bold />
          <Row label="Sanciones" value={`-${fmt(fila.sanciones)}`} color="#dc2626" />
        </Box>

        {/* Total */}
        <Box sx={{ bgcolor: "#f0fdf4", px: 2, py: 1.5, borderTop: "2px solid #16a34a" }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography fontWeight={700} fontSize={14} color="#166534">DEPÓSITO TOTAL</Typography>
            <Typography fontWeight={700} fontSize={20} color="#16a34a">{fmt(fila.deposito)}</Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default MiNomina;
