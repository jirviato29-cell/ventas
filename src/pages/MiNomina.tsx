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
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import HeadphonesIcon from "@mui/icons-material/Headphones";
import DescriptionIcon from "@mui/icons-material/Description";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import SimCardIcon from "@mui/icons-material/SimCard";
import axios from "axios";

const API = "https://ato-appservidor-nvxt.onrender.com";
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` });

const ORANGE = "#f97316";
const GREEN = "#16a34a";

/* ── Tokens de diseño ───────────────────────────────────────────── */
const FONT = "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const NUM = { fontVariantNumeric: "tabular-nums" as const };

const BP_TABLET = "@media (max-width:1000px)";
const BP_MOVIL = "@media (max-width:640px)";

interface Paleta {
  txt: string;
  sw: string;
  bg: string;
  bd: string;
}

const P_ACC: Paleta = { txt: "#6D28D9", sw: "#8B5CF6", bg: "#F5F3FF", bd: "#E9E4FF" };
const P_PLN: Paleta = { txt: "#B45309", sw: "#F59E0B", bg: "#FFFBEB", bd: "#FDE9C0" };
const P_TEL: Paleta = { txt: "#0E7490", sw: "#22B8CF", bg: "#ECFEFF", bd: "#CFF3F8" };
const P_CHP: Paleta = { txt: "#047857", sw: "#10B981", bg: "#ECFDF5", bd: "#CBF3E0" };

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
  fecha?: string;
  numero_telefono?: string;
  numeros?: { fecha: string; numero: string }[];
}

interface DetalleData {
  disponible: boolean;
  motivo: string | null;
  periodo: { inicio: string; fin: string } | null;
  accesorios: ItemDesglose[];
  telefonos: ItemDesglose[];
  chips: ItemDesglose[];
}

/* Formato contable con separador de miles (el diseño pide $2,500.00, no $2500.00). */
const fmt = (v?: number) =>
  `$${Number(v || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
const fmtCorto = (v?: number) =>
  `$${Number(v || 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
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

/** Badge de conteo: siempre el número de renglones que la caja pinta. */
const contar = (n: number, singular: string, plural: string) =>
  `${n} ${n === 1 ? singular : plural}`;

/* ── Renglón del resumen ────────────────────────────────────────── */
const Renglon: React.FC<{
  label: string;
  value?: number;
  fuerte?: boolean;
  color?: string;
  negativo?: boolean;
}> = ({ label, value, fuerte, color, negativo }) => {
  const activo = Number(value || 0) > 0;
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      gap={1.25}
      sx={{ py: "6px", borderBottom: "1px solid #f1f5f9" }}
    >
      <Typography
        fontSize={12}
        fontWeight={activo ? (fuerte ? 700 : 500) : 400}
        color={activo ? "#334155" : "#b6bfca"}
        noWrap
      >
        {label}
      </Typography>
      <Typography
        fontSize={12.5}
        fontWeight={activo ? 700 : 500}
        color={activo ? color || "#0f172a" : "#cbd5e1"}
        whiteSpace="nowrap"
        sx={NUM}
      >
        {negativo ? "−" : ""}
        {fmt(value)}
      </Typography>
    </Box>
  );
};

/* ── Renglón de item dentro de una caja ─────────────────────────── */
const ItemCaja: React.FC<{ nombre: string; nota?: string; monto: number; titulo?: string }> = ({
  nombre,
  nota,
  monto,
  titulo,
}) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: "1fr auto",
      alignItems: "baseline",
      gap: "8px",
      px: "12px",
      py: "5px",
      borderBottom: "1px solid #f8fafc",
      minWidth: 0,
    }}
  >
    <Box minWidth={0}>
      <Typography
        fontSize={11.5}
        fontWeight={600}
        color="#0f172a"
        lineHeight={1.22}
        noWrap
        title={titulo ?? nombre}
      >
        {nombre}
      </Typography>
      {!!nota && (
        <Typography fontSize={9.5} fontWeight={600} color="#94a3b8" mt="1px" noWrap sx={NUM}>
          {nota}
        </Typography>
      )}
    </Box>
    <Typography fontSize={12} fontWeight={800} color="#0f172a" whiteSpace="nowrap" sx={NUM}>
      {fmt(monto)}
    </Typography>
  </Box>
);

/* ── Grupo de chips con su lista de activaciones ────────────────── */
const GrupoChips: React.FC<{ it: ItemDesglose; paleta: Paleta }> = ({ it, paleta }) => (
  <Box sx={{ borderBottom: "1px solid #f1f5f9", "&:last-of-type": { borderBottom: "none" } }}>
    <Box display="flex" alignItems="baseline" gap={1.1} sx={{ px: "12px", pt: "8px", pb: "5px" }}>
      <Typography fontSize={12.5} fontWeight={800} color="#0f172a" noWrap>
        {it.tipo_chip} {fmtCorto(it.monto_recarga)}
      </Typography>
      <Typography
        fontSize={10}
        fontWeight={700}
        color="#94a3b8"
        sx={{
          bgcolor: "#f6f8fa",
          borderRadius: "5px",
          px: "7px",
          py: "2px",
          whiteSpace: "nowrap",
          flexShrink: 0,
          ...NUM,
        }}
      >
        {it.piezas} × {fmtCorto(it.comision_unitaria)}
      </Typography>
      <Typography fontSize={13} fontWeight={900} color="#0f172a" ml="auto" whiteSpace="nowrap" sx={NUM}>
        {fmt(it.subtotal)}
      </Typography>
    </Box>
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill,minmax(158px,1fr))",
        gap: "5px",
        px: "12px",
        pb: "10px",
        /* En celular caben 2 por renglón: la lista mide la mitad y no deja media pantalla vacía. */
        [BP_MOVIL]: { gridTemplateColumns: "repeat(auto-fill,minmax(128px,1fr))" },
      }}
    >
      {(it.numeros ?? []).map((n, j) => (
        <Box
          key={j}
          display="flex"
          alignItems="center"
          gap="7px"
          minWidth={0}
          sx={{
            border: "1px solid #eef2f7",
            borderRadius: "7px",
            bgcolor: "#fcfdfe",
            px: "8px",
            py: "5px",
          }}
        >
          <Typography
            fontSize={9.5}
            fontWeight={800}
            color={paleta.txt}
            flexShrink={0}
            sx={{ bgcolor: paleta.bg, borderRadius: "4px", px: "5px", py: "2px" }}
          >
            {fmtFecha(n.fecha)}
          </Typography>
          <Typography fontSize={11} fontWeight={600} color="#475569" noWrap sx={NUM}>
            {n.numero}
          </Typography>
        </Box>
      ))}
    </Box>
  </Box>
);

/* ── Caja de categoría ──────────────────────────────────────────── */
const Columna: React.FC<{
  titulo: string;
  total: number;
  items: ItemDesglose[];
  vacioTxt: string;
  esChip?: boolean;
  extras?: { label: string; monto: number; nota?: string }[];
  paleta: Paleta;
  badge: string;
  icono: React.ReactNode;
  ancha?: boolean;
}> = ({ titulo, total, items, vacioTxt, esChip, extras, paleta, badge, icono, ancha }) => {
  const vacia = items.length === 0 && !extras?.length;
  const sumaItems =
    items.reduce((a, it) => a + Number(it.subtotal || 0), 0) +
    (extras ?? []).reduce((a, ex) => a + Number(ex.monto || 0), 0);
  const descuadre = !vacia && Math.abs(sumaItems - Number(total || 0)) >= 0.01;
  const agrupado = !!esChip && items.some((it) => !!it.numeros?.length);
  const dosColumnas = !!ancha && !agrupado && !vacia;

  return (
    <Box
      sx={{
        border: `1px solid ${paleta.bd}`,
        borderRadius: "11px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        gap={1}
        minWidth={0}
        sx={{ bgcolor: paleta.bg, borderBottom: `1px solid ${paleta.bd}`, px: "12px", py: "8px" }}
      >
        <Box sx={{ width: 8, height: 8, borderRadius: "2px", bgcolor: paleta.sw, flexShrink: 0 }} />
        <Typography fontSize={12} fontWeight={800} color={paleta.txt} noWrap>
          {titulo}
        </Typography>
        <Typography
          component="span"
          fontSize={9}
          fontWeight={800}
          color={paleta.txt}
          flexShrink={0}
          sx={{
            bgcolor: "#fff",
            border: `1px solid ${paleta.bd}`,
            borderRadius: "999px",
            px: "7px",
            py: "1px",
            whiteSpace: "nowrap",
            ...NUM,
          }}
        >
          {badge}
        </Typography>
        <Typography
          fontSize={14}
          fontWeight={900}
          color={paleta.txt}
          ml="auto"
          letterSpacing="-0.3px"
          whiteSpace="nowrap"
          sx={NUM}
        >
          {fmt(total)}
        </Typography>
      </Box>

      {vacia ? (
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          gap={0.9}
          sx={{ px: "12px", py: "14px" }}
        >
          <Box sx={{ color: "#cbd5e1", display: "flex", "& svg": { fontSize: 16 } }}>{icono}</Box>
          <Typography fontSize={11.5} fontWeight={600} color="#94a3b8">
            {vacioTxt}
          </Typography>
        </Box>
      ) : (
        <Box
          sx={
            dosColumnas
              ? {
                  py: "1px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  "& > *:nth-of-type(odd)": { borderRight: "1px solid #f1f5f9" },
                  [BP_MOVIL]: {
                    gridTemplateColumns: "1fr",
                    "& > *:nth-of-type(odd)": { borderRight: "none" },
                  },
                }
              : { py: "1px" }
          }
        >
          {items.map((it, i) =>
            esChip && it.numeros?.length ? (
              <GrupoChips key={i} it={it} paleta={paleta} />
            ) : (
              <ItemCaja
                key={i}
                nombre={esChip ? `${it.tipo_chip} ${fmtCorto(it.monto_recarga)}` : it.producto ?? ""}
                titulo={esChip ? it.tipo_chip : it.producto}
                nota={[
                  `${it.piezas} × ${fmtCorto(it.comision_unitaria)}`,
                  it.tipo_venta || "",
                  esChip && it.fecha ? fmtFecha(it.fecha) : "",
                  esChip && it.numero_telefono ? it.numero_telefono : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
                monto={Number(it.subtotal || 0)}
              />
            )
          )}

          {extras?.map((ex) => (
            <ItemCaja key={ex.label} nombre={ex.label} nota={ex.nota} monto={Number(ex.monto || 0)} />
          ))}
        </Box>
      )}

      {descuadre && (
        <Typography
          fontSize={9.5}
          fontWeight={700}
          color="#c2410c"
          sx={{ bgcolor: "#fff7ed", px: "12px", py: "5px" }}
        >
          El detalle suma {fmt(sumaItems)} y el resumen reporta {fmt(total)} — revisar con
          administración.
        </Typography>
      )}

      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap={1}
        sx={{
          mt: "auto",
          px: "12px",
          py: "6px",
          borderTop: "1px solid #f1f5f9",
          bgcolor: "#fcfdfe",
        }}
      >
        <Typography
          fontSize={9.5}
          fontWeight={800}
          color="#64748b"
          letterSpacing="0.4px"
          textTransform="uppercase"
          noWrap
        >
          {ancha ? `Subtotal ${titulo}` : "Subtotal"}
        </Typography>
        <Typography fontSize={12.5} fontWeight={900} color={paleta.txt} whiteSpace="nowrap" sx={NUM}>
          {fmt(total)}
        </Typography>
      </Box>
    </Box>
  );
};

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

  /* Caja "Planes": los mismos conceptos de `otros`, que antes sólo salían en el resumen. */
  const NOTA_PLANES: Record<string, string> = {
    "Planes tarifarios": "Comisión del periodo",
    "Com. pendientes": "Liberadas este periodo",
  };
  const conceptosPlanes = otros
    .filter((o) => Number(o.value || 0) > 0)
    .map((o) => ({ label: o.label, monto: Number(o.value || 0), nota: NOTA_PLANES[o.label] }));
  const totalPlanes = conceptosPlanes.reduce((a, c) => a + c.monto, 0);

  /* Renglones que cada caja pinta: alimentan el badge de conteo y el reparto del layout. */
  const filasChips = detalle?.disponible
    ? detalle.chips.reduce((a, it) => a + (it.numeros?.length || 1), 0) + extrasChips.length
    : 0;

  const cajas = [
    !esCadena &&
      detalle?.disponible && {
        key: "acc",
        peso: detalle.accesorios.length,
        props: {
          titulo: "Accesorios",
          total: Number(fila.accesorios || 0),
          items: detalle.accesorios,
          vacioTxt: "Sin accesorios con comisión",
          paleta: P_ACC,
          badge: contar(detalle.accesorios.length, "producto", "productos"),
          icono: <HeadphonesIcon />,
        },
      },
    conceptosPlanes.length > 0 && {
      key: "pln",
      peso: conceptosPlanes.length,
      props: {
        titulo: "Planes",
        total: totalPlanes,
        items: [] as ItemDesglose[],
        vacioTxt: "Sin planes en el periodo",
        extras: conceptosPlanes,
        paleta: P_PLN,
        badge: contar(conceptosPlanes.length, "concepto", "conceptos"),
        icono: <DescriptionIcon />,
      },
    },
    !esCadena &&
      detalle?.disponible && {
        key: "tel",
        peso: detalle.telefonos.length,
        props: {
          titulo: "Teléfonos",
          total: Number(fila.telefonos || 0),
          items: detalle.telefonos,
          vacioTxt: "Sin teléfonos con comisión",
          paleta: P_TEL,
          badge: contar(detalle.telefonos.length, "equipo", "equipos"),
          icono: <SmartphoneIcon />,
        },
      },
    detalle?.disponible && {
      key: "chp",
      peso: filasChips,
      props: {
        titulo: "Chips",
        total: Number(fila.chips || 0) + montoIncubadora,
        items: detalle.chips,
        vacioTxt: "Sin chips validados",
        esChip: true,
        extras: extrasChips,
        paleta: P_CHP,
        badge: contar(filasChips, "activación", "activaciones"),
        icono: <SimCardIcon />,
      },
    },
  ].filter(Boolean) as {
    key: string;
    peso: number;
    props: React.ComponentProps<typeof Columna>;
  }[];

  /* La categoría con más renglones va a ancho completo; las cortas comparten la fila de abajo. */
  const iAncha = cajas.reduce((mejor, c, i) => (c.peso > cajas[mejor].peso ? i : mejor), 0);
  const cajasCortas = cajas.filter((_, i) => i !== iAncha);

  return (
    <Box
      sx={{
        fontFamily: FONT,
        maxWidth: 1300,
        mx: "auto",
        p: "14px 16px 24px",
        [BP_MOVIL]: { p: "10px 10px 22px" },
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap={1.5}
        mb={1.25}
        sx={{ [BP_MOVIL]: { flexDirection: "column", alignItems: "stretch" } }}
      >
        <Typography
          component="h1"
          fontSize={19}
          fontWeight={800}
          color="#0f172a"
          letterSpacing="-0.3px"
          m={0}
        >
          Mi recibo de nómina
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<DownloadIcon />}
          onClick={descargarPdf}
          disabled={descargando}
          sx={{
            fontFamily: FONT,
            bgcolor: "#fff",
            color: "#334155",
            borderColor: "#d8dee9",
            textTransform: "none",
            fontWeight: 700,
            fontSize: 12,
            borderRadius: "9px",
            px: "13px",
            py: "8px",
            whiteSpace: "nowrap",
            "&:hover": { bgcolor: "#fff", borderColor: "#FF6600", color: "#FF6600" },
          }}
        >
          Descargar PDF
        </Button>
      </Box>

      <Paper
        elevation={0}
        sx={{
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          overflow: "hidden",
          bgcolor: "#fff",
          boxShadow: "0 8px 26px -18px rgba(15,23,42,.25)",
        }}
      >
        {/* ── Banda superior ── */}
        <Box
          display="flex"
          alignItems="center"
          gap={1.6}
          sx={{
            background: `linear-gradient(135deg,#1e2a4a,#16213e)`,
            color: "#fff",
            px: "18px",
            py: "13px",
            [BP_MOVIL]: { flexWrap: "wrap", px: "13px", py: "11px" },
          }}
        >
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: "11px",
              background: "linear-gradient(135deg,#FF8a3d,#FF6600)",
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            {iniciales(fila.empleado)}
          </Box>
          <Box minWidth={0}>
            <Typography component="h2" fontSize={16} fontWeight={800} letterSpacing="-0.2px" m={0} noWrap>
              {etiqueta}
            </Typography>
            <Typography fontSize={10.5} color="#94a3b8" mt="2px" noWrap>
              {fila.empleado} · {seccionLabel}
              {periodoPrincipal
                ? ` · ${fmtFecha(periodoPrincipal.inicio)} al ${fmtFecha(periodoPrincipal.fin)}`
                : ""}
            </Typography>
          </Box>
          <Box
            display="inline-flex"
            alignItems="center"
            justifyContent="center"
            gap="4px"
            sx={{
              ml: "auto",
              bgcolor: "rgba(34,197,94,.16)",
              color: "#4ade80",
              border: "1px solid rgba(74,222,128,.4)",
              px: "11px",
              py: "4px",
              borderRadius: "999px",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.5px",
              whiteSpace: "nowrap",
              flexShrink: 0,
              "& svg": { fontSize: 12 },
              [BP_MOVIL]: { ml: 0, order: 3, width: "100%" },
            }}
          >
            <CheckCircleIcon /> PAGADA
          </Box>
        </Box>

        {/* ── Cuerpo ── */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "270px 1fr",
            [BP_TABLET]: { gridTemplateColumns: "1fr" },
          }}
        >
          {/* Resumen */}
          <Box
            sx={{
              bgcolor: "#fcfdfe",
              borderRight: "1px solid #eef2f7",
              px: "16px",
              py: "13px",
              minWidth: 0,
              [BP_TABLET]: { borderRight: "none", borderBottom: "1px solid #eef2f7" },
              [BP_MOVIL]: { px: "13px", py: "11px" },
            }}
          >
            <Typography
              fontSize={10}
              fontWeight={800}
              letterSpacing="0.6px"
              textTransform="uppercase"
              color="#94a3b8"
              mb="9px"
            >
              Resumen
            </Typography>

            <Renglon label="Sueldo base" value={fila.sueldo} fuerte />

            {fila.sueldo_detalle && fila.sueldo_detalle.length > 0 && (
              <Box
                sx={{
                  pl: "10px",
                  pt: "5px",
                  pb: "6px",
                  ml: "2px",
                  my: "2px",
                  borderLeft: "2px solid #eef2f7",
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                {fila.sueldo_detalle.map((d) => (
                  <Box
                    key={d.modulo}
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    gap={1.25}
                    sx={{ py: "2px" }}
                  >
                    <Typography fontSize={11} fontWeight={500} color="#64748b" noWrap>
                      {d.modulo}
                    </Typography>
                    <Typography
                      fontSize={11}
                      fontWeight={600}
                      color="#475569"
                      whiteSpace="nowrap"
                      sx={NUM}
                    >
                      {fmt(d.monto)}
                    </Typography>
                  </Box>
                ))}

                {fila.sueldo_minimo_aplicado === true && (
                  <>
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      gap={1.25}
                      sx={{ py: "2px" }}
                    >
                      <Typography fontSize={11} fontWeight={800} color="#334155" noWrap>
                        Suma módulos
                      </Typography>
                      <Typography
                        fontSize={11}
                        fontWeight={800}
                        color="#0f172a"
                        whiteSpace="nowrap"
                        sx={NUM}
                      >
                        {fmt(fila.sueldo_suma_modulos ?? 0)}
                      </Typography>
                    </Box>
                    <Box
                      display="inline-flex"
                      alignItems="center"
                      gap="5px"
                      sx={{
                        mt: "5px",
                        fontSize: 9.5,
                        fontWeight: 700,
                        color: "#c2410c",
                        bgcolor: "#fff7ed",
                        border: "1px solid #fed7aa",
                        borderRadius: "6px",
                        px: "7px",
                        py: "2px",
                        "& svg": { fontSize: 11 },
                      }}
                    >
                      <ArrowUpwardIcon /> Mínimo garantizado aplicado
                    </Box>
                  </>
                )}
              </Box>
            )}

            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              gap={1.25}
              sx={{ py: "6px", borderBottom: "1px solid #f1f5f9" }}
            >
              <Typography
                fontSize={12}
                fontWeight={horasNum !== 0 ? 500 : 400}
                color={horasNum !== 0 ? "#334155" : "#b6bfca"}
                noWrap
              >
                Horas extra
              </Typography>
              <Typography
                fontSize={12.5}
                fontWeight={horasNum !== 0 ? 700 : 500}
                color={horasNum > 0 ? GREEN : horasNum < 0 ? "#dc2626" : "#cbd5e1"}
                whiteSpace="nowrap"
                sx={NUM}
              >
                {horasTxt}
              </Typography>
            </Box>
            <Renglon label="Pago horas extra" value={fila.pago_he} />

            <Renglon label="Comisiones" value={totalComisiones} color={GREEN} fuerte />

            <Renglon label="Bonos" value={fila.bonos} />
            <Renglon label="Sanciones" value={fila.sanciones} color="#dc2626" negativo />

            {/* Depósito total */}
            <Box
              sx={{
                mt: "11px",
                pt: "11px",
                borderTop: "2px dashed #e2e8f0",
                [BP_TABLET]: {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                },
                [BP_MOVIL]: { flexDirection: "column", alignItems: "flex-start", gap: "2px" },
              }}
            >
              <Box minWidth={0}>
                <Typography
                  fontSize={10.5}
                  fontWeight={800}
                  letterSpacing="0.6px"
                  textTransform="uppercase"
                  color="#15803d"
                >
                  Depósito total
                </Typography>
                <Typography fontSize={10.5} color="#94a3b8" mt="2px">
                  Lo que recibes esta semana
                </Typography>
              </Box>
              <Typography
                fontWeight={900}
                color="#15803d"
                letterSpacing="-1.2px"
                lineHeight={1.05}
                whiteSpace="nowrap"
                sx={{
                  ...NUM,
                  fontSize: 30,
                  mt: "3px",
                  [BP_TABLET]: { fontSize: 26, mt: 0 },
                  [BP_MOVIL]: { fontSize: 30, mt: "3px" },
                }}
              >
                {fmt(fila.deposito)}
              </Typography>
            </Box>
          </Box>

          {/* Detalle de comisiones */}
          <Box
            sx={{
              px: "16px",
              py: "13px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              minWidth: 0,
              [BP_MOVIL]: { px: "13px", py: "11px" },
            }}
          >
            <Typography
              fontSize={10}
              fontWeight={800}
              letterSpacing="0.6px"
              textTransform="uppercase"
              color="#94a3b8"
              sx={NUM}
            >
              Detalle de comisiones · {fmt(totalComisiones)}
            </Typography>

            {cajas.length > 0 && <Columna {...cajas[iAncha].props} ancha />}

            {cajasCortas.length > 0 && (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${Math.min(cajasCortas.length, 3)},1fr)`,
                  gap: "10px",
                  alignItems: "start",
                  [BP_TABLET]: {
                    gridTemplateColumns: `repeat(${Math.min(cajasCortas.length, 2)},1fr)`,
                    /* Con conteo impar la última caja ocuparía media fila: la estiramos para no dejar hueco. */
                    ...(cajasCortas.length > 1 && cajasCortas.length % 2 === 1
                      ? { "& > *:last-of-type": { gridColumn: "span 2" } }
                      : {}),
                  },
                  [BP_MOVIL]: {
                    gridTemplateColumns: "1fr",
                    "& > *:last-of-type": { gridColumn: "auto" },
                  },
                }}
              >
                {cajasCortas.map((c) => (
                  <Columna key={c.key} {...c.props} />
                ))}
              </Box>
            )}

            {!detalle?.disponible && (
              <Box
                sx={{
                  border: "1px dashed #e2e8f0",
                  borderRadius: "11px",
                  bgcolor: "#fcfdfe",
                  px: "16px",
                  py: "18px",
                  textAlign: "center",
                }}
              >
                <Typography fontSize={11.5} fontWeight={600} color="#94a3b8">
                  {detalle?.motivo || "Detalle de comisiones no disponible para esta nómina"}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* ── Ecuación de auditoría ── */}
        <Box
          sx={{
            bgcolor: "#f8fafc",
            borderTop: "1px solid #eef2f7",
            px: "18px",
            py: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: "9px",
            fontSize: 11.5,
            color: "#64748b",
            [BP_MOVIL]: { gap: "6px 8px", fontSize: 11 },
          }}
        >
          <Box component="span" display="inline-flex" alignItems="baseline" gap="5px">
            Base
            <Box component="b" sx={{ color: "#334155", fontWeight: 800, ...NUM }}>
              {fmt(fila.sueldo)}
            </Box>
          </Box>
          <Box component="span" sx={{ color: "#cbd5e1", fontWeight: 800 }}>
            +
          </Box>
          <Box component="span" display="inline-flex" alignItems="baseline" gap="5px">
            Comisiones
            <Box component="b" sx={{ color: "#334155", fontWeight: 800, ...NUM }}>
              {fmt(totalComisiones)}
            </Box>
          </Box>
          <Box component="span" sx={{ color: "#cbd5e1", fontWeight: 800 }}>
            +
          </Box>
          <Box component="span" display="inline-flex" alignItems="baseline" gap="5px">
            Bonos
            <Box component="b" sx={{ color: "#334155", fontWeight: 800, ...NUM }}>
              {fmt(fila.bonos)}
            </Box>
          </Box>
          <Box component="span" sx={{ color: "#cbd5e1", fontWeight: 800 }}>
            −
          </Box>
          <Box component="span" display="inline-flex" alignItems="baseline" gap="5px">
            Sanciones
            <Box component="b" sx={{ color: "#334155", fontWeight: 800, ...NUM }}>
              {fmt(fila.sanciones)}
            </Box>
          </Box>
          <Box component="span" sx={{ color: "#cbd5e1", fontWeight: 800 }}>
            =
          </Box>
          <Box
            component="span"
            display="inline-flex"
            alignItems="baseline"
            gap="5px"
            sx={{ color: "#15803d", fontWeight: 700 }}
          >
            Depósito
            <Box component="b" sx={{ color: "#15803d", fontWeight: 800, ...NUM }}>
              {fmt(fila.deposito)}
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default MiNomina;
