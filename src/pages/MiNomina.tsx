import React, { useEffect, useState } from "react";
import { obtenerRolDesdeToken } from "../components/Token";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import axios from "axios";

const API = "https://ato-appservidor-nvxt.onrender.com";
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` });

const ORANGE = "#f97316";
const NAVY = "#1e293b";
const GREEN = "#16a34a";

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

interface SueldoDetalle {
  modulo: string;
  monto: number;
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
  sueldo_detalle?: SueldoDetalle[];
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

const iniciales = (clave: string): string => {
  const limpio = clave.replace(/[^A-Za-zÁÉÍÓÚÑ\s-]/g, " ");
  const partes = limpio.split(/[\s-]+/).filter(Boolean);
  const ultima = partes[partes.length - 1] ?? clave;
  return ultima.slice(0, 2).toUpperCase();
};

const ComItem: React.FC<{ label: string; value?: number }> = ({ label, value }) => {
  const activo = Number(value || 0) > 0;
  return (
    <Box display="flex" justifyContent="space-between" alignItems="center" py={0.4}>
      <Box display="flex" alignItems="center" gap={0.75}>
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            bgcolor: activo ? GREEN : "#cbd5e1",
            flexShrink: 0,
          }}
        />
        <Typography fontSize={12.5} color={activo ? "#334155" : "#94a3b8"}>{label}</Typography>
      </Box>
      <Typography fontSize={12.5} fontWeight={activo ? 600 : 400} color={activo ? "#1e293b" : "#94a3b8"}>
        {fmt(value)}
      </Typography>
    </Box>
  );
};

const Tarjeta: React.FC<{
  icon: string;
  iconBg: string;
  iconColor: string;
  titulo: string;
  subtitulo: string;
  monto: string;
  montoColor?: string;
  children?: React.ReactNode;
}> = ({ icon, iconBg, iconColor, titulo, subtitulo, monto, montoColor, children }) => (
  <Box sx={{ px: 2.5, py: 1.75, borderTop: "1px solid #f1f5f9" }}>
    <Box display="flex" alignItems="center" justifyContent="space-between" gap={1.5}>
      <Box display="flex" alignItems="center" gap={1.5} minWidth={0}>
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: 2,
            bgcolor: iconBg,
            color: iconColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box minWidth={0}>
          <Typography fontWeight={700} fontSize={14} color="#1e293b" noWrap>{titulo}</Typography>
          <Typography fontSize={12} color="#94a3b8" noWrap>{subtitulo}</Typography>
        </Box>
      </Box>
      <Typography fontWeight={700} fontSize={16} color={montoColor || "#1e293b"} whiteSpace="nowrap">
        {monto}
      </Typography>
    </Box>
    {children}
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

  const periodoPrincipal = periodosOrdenados.length > 0 ? periodosOrdenados[0][1] : null;

  const conceptosCom: { label: string; value?: number }[] = [
    { label: "Accesorios",        value: fila.accesorios },
    { label: "Teléfonos",         value: fila.telefonos },
    { label: "Chips",             value: fila.chips },
    { label: "Incubadora",        value: fila.incubadora },
    { label: "Planes tarifarios", value: fila.planes },
    { label: "Com. pendientes",   value: fila.pendientes },
  ];
  const totalComisiones =
    Number(fila.accesorios || 0) +
    Number(fila.telefonos || 0) +
    Number(fila.chips || 0) +
    Number(fila.incubadora || 0) +
    Number(fila.planes || 0) +
    Number(fila.pendientes || 0);
  const numConMonto = conceptosCom.filter((c) => Number(c.value || 0) > 0).length;

  const horasTxt =
    fila.horas_extra != null
      ? `${Number(fila.horas_extra).toFixed(1)} hrs extra`
      : "Semana completa";

  return (
    <Box maxWidth={560} mx="auto" py={3} px={2}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
        <Typography variant="h6" fontWeight={800} color="#0f172a">Mi recibo de nómina</Typography>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={descargarPdf}
          disabled={descargando}
          sx={{
            color: "#334155",
            borderColor: "#cbd5e1",
            textTransform: "none",
            fontWeight: 600,
            "&:hover": { borderColor: "#94a3b8", bgcolor: "#f8fafc" },
          }}
        >
          Descargar PDF
        </Button>
      </Box>

      <Paper
        elevation={0}
        sx={{ border: "1px solid #e2e8f0", borderRadius: 3, overflow: "hidden", bgcolor: "#fff" }}
      >
        <Box sx={{ bgcolor: NAVY, px: 2.5, py: 2.25 }}>
          <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1}>
            <Box>
              <Typography fontSize={10.5} fontWeight={700} color={ORANGE} letterSpacing={1} mb={0.5}>
                SEMANA DE PAGO
              </Typography>
              <Typography fontWeight={800} fontSize={19} color="#fff" lineHeight={1.2}>
                {etiqueta}
              </Typography>
              <Typography fontSize={11.5} color="rgba(255,255,255,0.6)" mt={0.5}>
                Emitida {new Date(creado_en).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </Typography>
            </Box>
            <Box
              sx={{
                bgcolor: "rgba(34,197,94,0.15)",
                color: "#4ade80",
                border: "1px solid rgba(74,222,128,0.4)",
                px: 1.25,
                py: 0.5,
                borderRadius: 5,
                fontSize: 11.5,
                fontWeight: 700,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              ✓ PAGADA
            </Box>
          </Box>
        </Box>

        <Box px={2.5} py={1.75} display="flex" alignItems="center" justifyContent="space-between" gap={1.5}>
          <Box display="flex" alignItems="center" gap={1.5} minWidth={0}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: ORANGE,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              {iniciales(fila.empleado)}
            </Box>
            <Box minWidth={0}>
              <Typography fontWeight={700} fontSize={14.5} color="#0f172a" noWrap>{fila.empleado}</Typography>
              <Typography fontSize={12.5} color="#94a3b8" noWrap>{seccionLabel}</Typography>
            </Box>
          </Box>
          {periodoPrincipal && (
            <Box textAlign="right" flexShrink={0}>
              <Typography fontSize={10} fontWeight={700} color="#cbd5e1" letterSpacing={0.5}>PERIODO</Typography>
              <Typography fontSize={12} color="#475569" whiteSpace="nowrap">
                {fmtFecha(periodoPrincipal.inicio)} — {fmtFecha(periodoPrincipal.fin)}
              </Typography>
            </Box>
          )}
        </Box>

        <Tarjeta
          icon="$"
          iconBg="#eef2ff"
          iconColor="#4f46e5"
          titulo="Sueldo base"
          subtitulo={horasTxt}
          monto={fmt(fila.sueldo)}
        />

        <Tarjeta
          icon="%"
          iconBg="#ecfdf5"
          iconColor={GREEN}
          titulo="Comisiones"
          subtitulo={`${numConMonto} de ${conceptosCom.length} conceptos con monto`}
          monto={fmt(totalComisiones)}
          montoColor={GREEN}
        >
          <Box
            mt={1}
            ml={6.25}
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              columnGap: 2.5,
            }}
          >
            {conceptosCom.map((c) => (
              <ComItem key={c.label} label={c.label} value={c.value} />
            ))}
          </Box>
        </Tarjeta>

        <Tarjeta
          icon="★"
          iconBg="#fffbeb"
          iconColor="#d97706"
          titulo="Bonos"
          subtitulo={Number(fila.bonos || 0) > 0 ? "Bono asignado" : "Sin bonos esta semana"}
          monto={fmt(fila.bonos)}
          montoColor={Number(fila.bonos || 0) > 0 ? "#1e293b" : "#94a3b8"}
        />

        <Tarjeta
          icon="−"
          iconBg="#fef2f2"
          iconColor="#dc2626"
          titulo="Sanciones"
          subtitulo={Number(fila.sanciones || 0) > 0 ? "Descuento aplicado" : "Sin descuentos"}
          monto={`-${fmt(fila.sanciones)}`}
          montoColor={Number(fila.sanciones || 0) > 0 ? "#dc2626" : "#94a3b8"}
        />

        <Box sx={{ borderTop: "1px dashed #cbd5e1", px: 2.5, py: 2.25, bgcolor: "#f0fdf4" }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
            <Box>
              <Typography fontWeight={800} fontSize={14} color="#15803d">DEPÓSITO TOTAL</Typography>
              <Typography fontSize={11.5} color="#64748b">Lo que recibes esta semana</Typography>
            </Box>
            <Typography fontWeight={800} fontSize={26} color={GREEN} whiteSpace="nowrap">
              {fmt(fila.deposito)}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ px: 2.5, py: 1.5, borderTop: "1px solid #f1f5f9" }}>
          <Typography fontSize={11.5} color="#94a3b8" textAlign="center">
            Base {fmt(fila.sueldo)} &nbsp;+&nbsp; Comisiones {fmt(totalComisiones)} &nbsp;−&nbsp; Sanciones {fmt(fila.sanciones)} &nbsp;=&nbsp;{" "}
            <Box component="span" sx={{ color: GREEN, fontWeight: 700 }}>
              Depósito {fmt(fila.deposito)}
            </Box>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default MiNomina;
