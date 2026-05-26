import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import axios from "axios";

const API = process.env.REACT_APP_API_URL ?? "";
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` });

const ORANGE = "#f97316";
const BLUE   = "#3b82f6";
const GREEN  = "#16a34a";
const PURPLE = "#9333ea";

interface ItemDatos {
  seccion?: string;
  empleado: string;
  nombre_completo: string;
  pago_horas_extras?: number;
  horas_extra_redondeo?: number | null;
  pago_total: number;
  comisiones_accesorios?: number;
  comisiones_telefonos?: number;
  comisiones_chips?: number;
  comisiones_total?: number;
}

interface NominaResponse {
  id: number;
  etiqueta: string;
  ciclo_horas_extras_id: number | null;
  fecha_inicio_asesores: string | null;
  fecha_fin_asesores: string | null;
  fecha_inicio_encargados: string | null;
  fecha_fin_encargados: string | null;
  fecha_inicio_cadenas: string | null;
  fecha_fin_cadenas: string | null;
  total_pago: number;
  datos: ItemDatos[];
  creado_por: string;
  creado_en: string;
}

interface Props {
  nominaId: number | null;
  onClose: () => void;
  onDescargar: (id: number, tipo: "excel" | "pdf") => void;
}

const SeccionHorasExtras: React.FC<{ rows: ItemDatos[] }> = ({ rows }) => {
  const subtotal = rows.reduce((s, e) => s + e.pago_total, 0);
  return (
    <>
      <Typography variant="subtitle2" fontWeight={700} mb={1} sx={{ color: ORANGE }}>
        Horas Extras
      </Typography>
      <Table size="small" sx={{ mb: 1 }}>
        <TableHead>
          <TableRow sx={{ bgcolor: "#f8fafc" }}>
            {["Empleado", "Nombre completo", "H. Extra", "Pago H. Extras", "Total"].map((h) => (
              <TableCell key={h} sx={{ fontWeight: 700, color: ORANGE, fontSize: 11 }}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((e, i) => {
            const he = e.horas_extra_redondeo ?? null;
            const heColor = he == null ? undefined : he > 0 ? GREEN : he < 0 ? "#ef4444" : undefined;
            const heLabel = he == null ? "—" : `${he > 0 ? "+" : ""}${he}h`;
            return (
              <TableRow key={i} sx={{ bgcolor: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{e.empleado}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>{e.nombre_completo}</TableCell>
                <TableCell sx={{ fontSize: 12, fontWeight: 600, color: heColor }}>{heLabel}</TableCell>
                <TableCell sx={{ fontSize: 12, color: (e.pago_horas_extras ?? 0) >= 0 ? GREEN : "#ef4444", fontWeight: 600 }}>
                  {(e.pago_horas_extras ?? 0) >= 0 ? "+" : ""}${Math.abs(e.pago_horas_extras ?? 0).toFixed(2)}
                </TableCell>
                <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>${e.pago_total.toFixed(2)}</TableCell>
              </TableRow>
            );
          })}
          <TableRow sx={{ bgcolor: "#f1f5f9" }}>
            <TableCell colSpan={4} sx={{ fontWeight: 700, fontSize: 13 }}>Subtotal</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: 13, color: ORANGE }}>${subtotal.toFixed(2)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </>
  );
};

const SeccionComisionesVer: React.FC<{ rows: ItemDatos[]; label: string; color: string }> = ({ rows, label, color }) => {
  const subtotal = rows.reduce((s, e) => s + e.pago_total, 0);
  const conComisiones = rows.filter((e) => (e.comisiones_total ?? 0) > 0).length;
  return (
    <>
      <Typography variant="subtitle2" fontWeight={700} mb={0.5} sx={{ color }}>
        {label}
      </Typography>
      <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
        {conComisiones} empleado{conComisiones !== 1 ? "s" : ""} con comisiones
      </Typography>
      <Table size="small" sx={{ mb: 1 }}>
        <TableHead>
          <TableRow sx={{ bgcolor: "#f8fafc" }}>
            {["Empleado", "Nombre completo", "Accesorios", "Teléfonos", "Chips", "Total"].map((h) => (
              <TableCell key={h} sx={{ fontWeight: 700, color, fontSize: 11 }}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((e, i) => (
            <TableRow key={i} sx={{ bgcolor: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
              <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{e.empleado}</TableCell>
              <TableCell sx={{ fontSize: 12 }}>{e.nombre_completo}</TableCell>
              <TableCell sx={{ fontSize: 12 }}>${(e.comisiones_accesorios ?? 0).toFixed(2)}</TableCell>
              <TableCell sx={{ fontSize: 12 }}>${(e.comisiones_telefonos ?? 0).toFixed(2)}</TableCell>
              <TableCell sx={{ fontSize: 12 }}>${(e.comisiones_chips ?? 0).toFixed(2)}</TableCell>
              <TableCell sx={{ fontSize: 12, fontWeight: 700, color: GREEN }}>${e.pago_total.toFixed(2)}</TableCell>
            </TableRow>
          ))}
          <TableRow sx={{ bgcolor: "#f1f5f9" }}>
            <TableCell colSpan={5} sx={{ fontWeight: 700, fontSize: 13 }}>Subtotal</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: 13, color }}>${subtotal.toFixed(2)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </>
  );
};

const VerNominaDialog: React.FC<Props> = ({ nominaId, onClose, onDescargar }) => {
  const [nomina, setNomina] = useState<NominaResponse | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!nominaId) { setNomina(null); return; }
    setCargando(true);
    axios
      .get<NominaResponse>(`${API}/admin/nominas/${nominaId}`, { headers: authH() })
      .then(({ data }) => setNomina(data))
      .catch(() => setNomina(null))
      .finally(() => setCargando(false));
  }, [nominaId]);

  const formatFecha = (iso: string) =>
    new Date(iso).toLocaleDateString("es-MX", {
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  const rowsPorSeccion = (key: string) =>
    (nomina?.datos ?? []).filter((d) => (d.seccion ?? "horas_extras") === key);

  const horasExtras   = rowsPorSeccion("horas_extras");
  const asesores      = rowsPorSeccion("comisiones_asesores");
  const encargados    = rowsPorSeccion("comisiones_encargados");
  const cadenas       = rowsPorSeccion("comisiones_cadenas");

  return (
    <Dialog open={nominaId !== null} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {nomina ? nomina.etiqueta : "Cargando…"}
      </DialogTitle>
      <DialogContent dividers>
        {cargando && <Box textAlign="center" py={4}><CircularProgress sx={{ color: ORANGE }} /></Box>}

        {!cargando && nomina && (
          <>
            <Box display="flex" gap={4} mb={2}>
              <Typography variant="body2" color="text.secondary">
                Creado por: <strong>{nomina.creado_por}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Fecha: <strong>{formatFecha(nomina.creado_en)}</strong>
              </Typography>
            </Box>

            {horasExtras.length > 0 && <SeccionHorasExtras rows={horasExtras} />}

            {asesores.length > 0 && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <SeccionComisionesVer rows={asesores} label="Comisiones Asesores" color={BLUE} />
              </>
            )}

            {encargados.length > 0 && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <SeccionComisionesVer rows={encargados} label="Comisiones Encargados" color={GREEN} />
              </>
            )}

            {cadenas.length > 0 && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <SeccionComisionesVer rows={cadenas} label="Comisiones Cadenas" color={PURPLE} />
              </>
            )}

            <Divider sx={{ my: 1.5 }} />
            <Box display="flex" justifyContent="flex-end" pr={1}>
              <Typography variant="body1" fontWeight={700}>
                Total nómina: <span style={{ color: ORANGE }}>${Number(nomina.total_pago).toFixed(2)}</span>
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} color="inherit">Cerrar</Button>
        {nomina && (
          <>
            <Button
              variant="outlined"
              color="success"
              startIcon={<DownloadIcon />}
              onClick={() => onDescargar(nomina.id, "excel")}
            >
              Excel
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<PictureAsPdfIcon />}
              onClick={() => onDescargar(nomina.id, "pdf")}
            >
              PDF
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default VerNominaDialog;
