import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DownloadIcon from "@mui/icons-material/Download";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import axios from "axios";
import CrearNominaDialog from "../components/CrearNominaDialog";
import VerNominaDialog from "../components/VerNominaDialog";

const API = process.env.REACT_APP_API_URL ?? "";
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` });

interface NominaListItem {
  id: number;
  etiqueta: string;
  total_pago: number;
  creado_en: string;
}

const Salarios: React.FC = () => {
  const [nominas, setNominas] = useState<NominaListItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [crearOpen, setCrearOpen] = useState(false);
  const [verId, setVerId] = useState<number | null>(null);
  const [snack, setSnack] = useState<{ msg: string; sev: "success" | "error" } | null>(null);

  const cargarNominas = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await axios.get<NominaListItem[]>(`${API}/admin/nominas`, { headers: authH() });
      setNominas(data);
    } catch {
      setSnack({ msg: "Error al cargar nóminas", sev: "error" });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarNominas(); }, [cargarNominas]);

  const descargar = (id: number, tipo: "excel" | "pdf") => {
    const url = `${API}/admin/nominas/${id}/${tipo}`;
    const token = localStorage.getItem("token") ?? "";
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.blob();
      })
      .then((blob) => {
        const ext = tipo === "excel" ? "xlsx" : "pdf";
        const href = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = href;
        a.download = `nomina_${id}.${ext}`;
        a.click();
        URL.revokeObjectURL(href);
      })
      .catch(() => setSnack({ msg: `Error al descargar ${tipo.toUpperCase()}`, sev: "error" }));
  };

  const formatFecha = (iso: string) =>
    new Date(iso).toLocaleDateString("es-MX", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" fontWeight={700}>
          Salarios
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCrearOpen(true)}
          sx={{ bgcolor: "#f97316", "&:hover": { bgcolor: "#ea6b0a" } }}
        >
          Crear Nómina
        </Button>
      </Box>

      {cargando ? (
        <Box textAlign="center" py={6}><CircularProgress sx={{ color: "#f97316" }} /></Box>
      ) : nominas.length === 0 ? (
        <Alert severity="info">No hay nóminas guardadas todavía.</Alert>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#f8fafc" }}>
                {["Etiqueta", "Fecha de creación", "Total", "Acciones"].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, color: "#f97316", fontSize: 12 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {nominas.map((n) => (
                <TableRow key={n.id} hover>
                  <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>{n.etiqueta}</TableCell>
                  <TableCell sx={{ fontSize: 12, color: "#64748b" }}>{formatFecha(n.creado_en)}</TableCell>
                  <TableCell sx={{ fontSize: 13, fontWeight: 700, color: "#16a34a" }}>
                    ${Number(n.total_pago).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5}>
                      <Tooltip title="Ver detalle">
                        <IconButton size="small" onClick={() => setVerId(n.id)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Descargar Excel">
                        <IconButton size="small" color="success" onClick={() => descargar(n.id, "excel")}>
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Descargar PDF">
                        <IconButton size="small" color="error" onClick={() => descargar(n.id, "pdf")}>
                          <PictureAsPdfIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <CrearNominaDialog
        open={crearOpen}
        onClose={() => setCrearOpen(false)}
        onCreated={() => { setCrearOpen(false); cargarNominas(); }}
      />

      <VerNominaDialog
        nominaId={verId}
        onClose={() => setVerId(null)}
        onDescargar={descargar}
      />

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)}>
        <Alert severity={snack?.sev} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default Salarios;
