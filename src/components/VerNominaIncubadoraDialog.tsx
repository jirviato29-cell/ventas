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

const API = "https://ato-appservidor.onrender.com";
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` });

const PURPLE = "#7C3AED";
const GREEN  = "#16a34a";

interface ChipDetalle {
  chip_id: number;
  tipo_chip: string;
  numero_telefono: string;
  comision: number;
  fecha_venta: string;
}

interface DatoEmpleado {
  empleado: string;
  nombre_completo: string;
  chips_count: number;
  total_chips_incubadora: number;
  pago_total: number;
  detalle: ChipDetalle[];
}

interface NominaIncubadoraResponse {
  id: number;
  etiqueta: string;
  total_pago: number;
  datos: DatoEmpleado[];
  creado_por: string;
  creado_en: string;
}

interface Props {
  nominaId: number | null;
  onClose: () => void;
  onDescargar: (id: number, tipo: "excel" | "pdf") => void;
}

const VerNominaIncubadoraDialog: React.FC<Props> = ({ nominaId, onClose, onDescargar }) => {
  const [nomina, setNomina] = useState<NominaIncubadoraResponse | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!nominaId) { setNomina(null); return; }
    setCargando(true);
    axios
      .get<NominaIncubadoraResponse>(`${API}/admin/nominas-incubadora/${nominaId}`, { headers: authH() })
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
      <DialogTitle sx={{ fontWeight: 700, color: PURPLE }}>
        {nomina ? nomina.etiqueta : "Cargando…"}
      </DialogTitle>
      <DialogContent dividers>
        {cargando && (
          <Box textAlign="center" py={4}><CircularProgress sx={{ color: PURPLE }} /></Box>
        )}

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
                <TableRow sx={{ bgcolor: "#f5f3ff" }}>
                  {["Empleado", "Nombre completo", "# Chips", "Total"].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, color: PURPLE, fontSize: 11 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {nomina.datos.map((e, i) => (
                  <TableRow key={i} sx={{ bgcolor: i % 2 === 0 ? "#fff" : "#faf5ff" }}>
                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{e.empleado}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{e.nombre_completo}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{e.chips_count}</TableCell>
                    <TableCell sx={{ fontSize: 12, fontWeight: 700, color: GREEN }}>
                      ${Number(e.pago_total).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Divider sx={{ my: 1.5 }} />
            <Box display="flex" justifyContent="flex-end" pr={1}>
              <Typography variant="body1" fontWeight={700}>
                Total nómina:{" "}
                <span style={{ color: PURPLE }}>${Number(nomina.total_pago).toFixed(2)}</span>
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

export default VerNominaIncubadoraDialog;
