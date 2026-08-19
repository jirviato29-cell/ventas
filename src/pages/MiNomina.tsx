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
  sueldo_suma_modulos?: number | null;
  sueldo_minimo_aplicado?: boolean | null;
  sueldo_periodo?: { inicio: string; fin: string };
  [key: string]: unknown;
}

interface MiReciboData {
  etiqueta: string;
  creado_en: string;
  periodos: Periodos;
  fila: FilaRecibo;
}

interface ItemDesglose {
  producto?: string;
  tipo_chip?: string;
  monto_recarga?: number;
  tipo_venta?: string;
  comision_unitaria: number;
  piezas: number;
  subtotal: number;
}

interface DetalleData {
  disponible: boolean;
  motivo: string | null;
  periodo: { inicio: string; fin: string } | null;
  accesorios: ItemDesglose[];
  telefonos: ItemDesglose[];
  chips: ItemDesglose[];
}

const fmt = (v?: number) => `$${Number(v || 0).toFixed(2)}`;
const fmtCorto = (v?: number) => `$${Number(v || 0).toFixed(0)}`;
const fmtFecha = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short" });

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

const Renglon: React.FC<{
  label: string;
  value?: number;
  fuerte?: boolean;
  color?: string;
  negativo?: boolean;
}> = ({ label, value, fuerte, color, negativo }) => {
  const activo = Number(value || 0) > 0;
  return (
    <Box display="flex" justifyContent="space-between" alignItems="baseline" gap={1} py={0.35}>
      <Typography fontSize={12} color={activo ? "#475569" : "#94a3b8"} noWrap>
        {label}
      </Typography>
      <Typography
        fontSize={12.5}
        fontWeight={fuerte || activo ? 600 : 400}
        color={activo ? color || "#1e293b" : "#94a3b8"}
        whiteSpace="nowrap"
      >
        {negativo ? "-" : ""}
        {fmt(value)}
      </Typography>
    </Box>
  );
};

const Columna: React.FC<{
  titulo: string;
  total: number;
  items: ItemDesglose[];
  vacioTxt: string;
  esChip?: boolean;
  extras?: { label: string; monto: number }[];
}> = ({ titulo, total, items, vacioTxt, esChip, extras }) => (
  <Box
    sx={{
      bgcolor: "#f8fafc",
      borderRadius: 2,
      p: 1.5,
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
    }}
  >
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="baseline"
      gap={1}
      pb={0.75}
      mb={0.75}
      borderBottom="1px solid #e2e8f0"
    >
      <Typography fontSize={12} fontWeight={700} color="#334155" noWrap>
        {titulo}
      </Typography>
      <Typography fontSize={13} fontWeight={700} color={total > 0 ? GREEN : "#94a3b8"} whiteSpace="nowrap">
        {fmt(total)}
      </Typography>
    </Box>

    {items.length === 0 && !extras?.length ? (
      <Typography fontSize={11.5} color="#94a3b8" py={0.5}>
        {vacioTxt}
      </Typography>
    ) : (
      items.map((it, i) => (
        <Box key={i} display="flex" justifyContent="space-between" alignItems="baseline" gap={1} py={0.3}>
          <Box minWidth={0} flex={1}>
            <Typography fontSize={11.5} color="#334155" noWrap title={esChip ? it.tipo_chip : it.producto}>
              {esChip ? `${it.tipo_chip} ${fmtCorto(it.monto_recarga)}` : it.producto}
            </Typography>
            <Typography fontSize={10.5} color="#94a3b8" noWrap>
              {it.piezas} x {fmtCorto(it.comision_unitaria)}
              {it.tipo_venta ? ` · ${it.tipo_venta}` : ""}
            </Typography>
          </Box>
          <Typography fontSize={11.5} fontWeight={600} color="#1e293b" whiteSpace="nowrap">
            {fmt(it.subtotal)}
          </Typography>
        </Box>
      ))
    )}

    {extras?.map((ex) => (
      <Box
        key={ex.label}
        display="flex"
        justifyContent="space-between"
        alignItems="baseline"
        gap={1}
        py={0.3}
      >
        <Typography fontSize={11.5} color="#334155" noWrap>
          {ex.label}
        </Typography>
        <Typography fontSize={11.5} fontWeight={600} color="#1e293b" whiteSpace="nowrap">
          {fmt(ex.monto)}
        </Typography>
      </Box>
    ))}
  </Box>
);

const MiNomina: React.FC = () => {
  const [data, setData] = useState<MiReciboData | null>(null);
  const [detalle, setDetalle] = useState<DetalleData | null>(null);
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

  useEffect(() => {
    axios
      .get<DetalleData>(`${API}/nomina/mi-recibo/detalle`, { headers: authH() })
      .then((r) => setDetalle(r.data))
      .catch(() => setDetalle(null));
  }, []);

  const descargarPdf = () => {
    setDescargando(true);
    const token = localStorage.getItem("token") ?? "";
    fetch(`${API}/nomina/mi-recibo/pdf`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.blob();
      })
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
    return (
      <Box textAlign="center" py={8}>
        <CircularProgress sx={{ color: ORANGE }} />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box maxWidth={480} mx="auto" mt={6}>
        <Alert severity="info">{error || "No hay nómina publicada actualmente"}</Alert>
      </Box>
    );
  }

  const { etiqueta, periodos, fila } = data;
  const seccionLabel = SECCION_LABEL[fila.seccion] || fila.seccion;
  const rol = obtenerRolDesdeToken();

  const periodosPorRol: Record<string, string[]> = {
    asesor: ["asesores", "horas_extras"],
    encargado: ["encargados", "horas_extras", "sueldos_encargados"],
    cadena: ["cadenas", "horas_extras"],
  };

  const clavesPermitidas = periodosPorRol[rol ?? ""] ?? [];
  const periodoPrincipal =
    clavesPermitidas.map((c) => periodos[c as keyof Periodos]).find((p) => !!p) ?? null;

  const esCadena = fila.seccion === "cadena";

  const totalComisiones =
    Number(fila.accesorios || 0) +
    Number(fila.telefonos || 0) +
    Number(fila.chips || 0) +
    Number(fila.incubadora || 0) +
    Number(fila.planes || 0) +
    Number(fila.pendientes || 0);

  const horasNum = Number(fila.horas_extra || 0);
  const horasTxt =
    fila.horas_extra == null
      ? "Sin registro de horas"
      : `${horasNum > 0 ? "+" : ""}${horasNum.toFixed(1)} hrs extra`;

  const otros: { label: string; value?: number }[] = [
    { label: "Planes tarifarios", value: fila.planes },
    { label: "Com. pendientes", value: fila.pendientes },
  ];

  const montoIncubadora = Number(fila.incubadora || 0);
  const extrasChips = montoIncubadora > 0 ? [{ label: "Incubadora", monto: montoIncubadora }] : [];

  return (
    <Box maxWidth={{ xs: 600, lg: 1280 }} mx="auto" py={2} px={2}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5} flexWrap="wrap" gap={1}>
        <Typography variant="h6" fontWeight={800} color="#0f172a">
          Mi recibo de nómina
        </Typography>
        <Button
          variant="outlined"
          size="small"
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
        <Box
          sx={{ bgcolor: NAVY, px: 2.5, py: 1.5 }}
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          gap={1.5}
          flexWrap="wrap"
        >
          <Box display="flex" alignItems="center" gap={1.5} minWidth={0}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                bgcolor: ORANGE,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              {iniciales(fila.empleado)}
            </Box>
            <Box minWidth={0}>
              <Typography fontWeight={800} fontSize={16} color="#fff" lineHeight={1.25} noWrap>
                {etiqueta}
              </Typography>
              <Typography fontSize={11.5} color="rgba(255,255,255,0.65)" noWrap>
                {fila.empleado} · {seccionLabel}
                {periodoPrincipal
                  ? ` · ${fmtFecha(periodoPrincipal.inicio)} al ${fmtFecha(periodoPrincipal.fin)}`
                  : ""}
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              bgcolor: "rgba(34,197,94,0.15)",
              color: "#4ade80",
              border: "1px solid rgba(74,222,128,0.4)",
              px: 1.25,
              py: 0.4,
              borderRadius: 5,
              fontSize: 11,
              fontWeight: 700,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            ✓ PAGADA
          </Box>
        </Box>

        <Box
          sx={{
            p: 1.5,
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "1fr 1fr",
              lg: "0.95fr 1.15fr 1fr 1fr",
            },
            gap: 1.5,
            alignItems: "start",
          }}
        >
          <Box sx={{ bgcolor: "#f1f5f9", borderRadius: 2, p: 1.5, minWidth: 0 }}>
            <Typography
              fontSize={12}
              fontWeight={700}
              color="#334155"
              pb={0.75}
              mb={0.75}
              borderBottom="1px solid #e2e8f0"
            >
              Resumen
            </Typography>

            <Renglon label="Sueldo base" value={fila.sueldo} fuerte />

            {fila.sueldo_detalle && fila.sueldo_detalle.length > 0 && (
              <Box pl={1} mb={0.3}>
                {fila.sueldo_detalle.map((d) => (
                  <Box key={d.modulo} display="flex" justifyContent="space-between" gap={1} py={0.2}>
                    <Typography fontSize={10.5} color="#94a3b8" noWrap>
                      {d.modulo}
                    </Typography>
                    <Typography fontSize={10.5} color="#94a3b8" whiteSpace="nowrap">
                      {fmt(d.monto)}
                    </Typography>
                  </Box>
                ))}

                {fila.sueldo_minimo_aplicado === true && (
                  <>
                    <Box display="flex" justifyContent="space-between" gap={1} py={0.2}>
                      <Typography fontSize={10.5} color="#94a3b8" noWrap>
                        Suma módulos
                      </Typography>
                      <Typography fontSize={10.5} color="#94a3b8" whiteSpace="nowrap">
                        {fmt(fila.sueldo_suma_modulos ?? 0)}
                      </Typography>
                    </Box>
                    <Typography fontSize={10.5} color="#94a3b8" py={0.2}>
                      Mínimo garantizado aplicado
                    </Typography>
                  </>
                )}
              </Box>
            )}

            <Box display="flex" justifyContent="space-between" alignItems="baseline" gap={1} py={0.35}>
              <Typography fontSize={12} color={horasNum !== 0 ? "#475569" : "#94a3b8"} noWrap>
                Horas extra
              </Typography>
              <Typography
                fontSize={12.5}
                fontWeight={horasNum !== 0 ? 600 : 400}
                color={horasNum > 0 ? GREEN : horasNum < 0 ? "#dc2626" : "#94a3b8"}
                whiteSpace="nowrap"
              >
                {horasTxt}
              </Typography>
            </Box>
            <Renglon label="Pago horas extra" value={fila.pago_he} />

            <Renglon label="Comisiones" value={totalComisiones} color={GREEN} fuerte />

            {otros.map((o) => (
              <Renglon key={o.label} label={o.label} value={o.value} />
            ))}

            <Renglon label="Bonos" value={fila.bonos} />
            <Renglon label="Sanciones" value={fila.sanciones} color="#dc2626" negativo />

            <Box mt={1} pt={1} borderTop="1px dashed #cbd5e1">
              <Typography fontSize={11} fontWeight={800} color="#15803d" letterSpacing={0.3}>
                DEPÓSITO TOTAL
              </Typography>
              <Typography fontSize={24} fontWeight={800} color={GREEN} lineHeight={1.2}>
                {fmt(fila.deposito)}
              </Typography>
              <Typography fontSize={10.5} color="#94a3b8">
                Lo que recibes esta semana
              </Typography>
            </Box>
          </Box>

          {detalle?.disponible ? (
            <>
              {!esCadena && (
                <Columna
                  titulo="Accesorios"
                  total={Number(fila.accesorios || 0)}
                  items={detalle.accesorios}
                  vacioTxt="Sin accesorios con comisión"
                />
              )}
              {!esCadena && (
                <Columna
                  titulo="Teléfonos"
                  total={Number(fila.telefonos || 0)}
                  items={detalle.telefonos}
                  vacioTxt="Sin teléfonos con comisión"
                />
              )}
              <Columna
                titulo="Chips"
                total={Number(fila.chips || 0) + montoIncubadora}
                items={detalle.chips}
                vacioTxt="Sin chips validados"
                esChip
                extras={extrasChips}
              />
            </>
          ) : (
            <Box
              sx={{
                gridColumn: { lg: "span 3" },
                bgcolor: "#f8fafc",
                borderRadius: 2,
                p: 2,
                textAlign: "center",
              }}
            >
              <Typography fontSize={12} color="#94a3b8">
                {detalle?.motivo || "Detalle de comisiones no disponible para esta nómina"}
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ px: 2, py: 1.25, borderTop: "1px solid #f1f5f9", bgcolor: "#fafafa" }}>
          <Typography fontSize={11.5} color="#94a3b8" textAlign="center">
            Base {fmt(fila.sueldo)} &nbsp;+&nbsp; Comisiones {fmt(totalComisiones)} &nbsp;+&nbsp; Bonos{" "}
            {fmt(fila.bonos)} &nbsp;−&nbsp; Sanciones {fmt(fila.sanciones)} &nbsp;=&nbsp;{" "}
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
