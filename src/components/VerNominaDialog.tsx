import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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

interface NominaEmpleado {
  empleado: string;
  nombre_completo: string;
  pago_horas_extras: number;
  pago_total: number;
}

interface NominaResponse {
  id: number;
  etiqueta: string;
  ciclo_horas_extras_id: number | null;
  total_pago: number;
  datos: NominaEmpleado[];
  creado_por: string;
  creado_en: string;
}

interface Props {
  nominaId: number | null;
  onClose: () => void;
  onDescargar: (id: number, tipo: "excel" | "pdf") => void;
}

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

  return (
    <Dialog open={nominaId !== null} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {nomina ? nomina.etiqueta : "Cargando…"}
      </DialogTitle>
      <DialogContent dividers>
        {cargando && <Box textAlign="center" py={4}><CircularProgress sx={{ color: "#f97316" }} /></Box>}

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

            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#f8fafc" }}>
                  {["Empleado", "Nombre completo", "Pago H. Extras", "Total Pago"].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, color: "#f97316", fontSize: 11 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {nomina.datos.map((e, i) => (
                  <TableRow key={i} sx={{ bgcolor: i % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{e.empleado}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{e.nombre_completo}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: e.pago_horas_extras >= 0 ? "#16a34a" : "#ef4444", fontWeight: 600 }}>
                      {e.pago_horas_extras >= 0 ? "+" : ""}${Math.abs(e.pago_horas_extras).toFixed(2)}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>
                      ${e.pago_total.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                  <TableCell colSpan={3} sx={{ fontWeight: 700, fontSize: 13 }}>TOTAL</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 13, color: "#f97316" }}>
                    ${Number(nomina.total_pago).toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
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
