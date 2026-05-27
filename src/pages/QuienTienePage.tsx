import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import BarChartIcon from '@mui/icons-material/BarChart';
import axios from 'axios';

const API = "https://ato-appservidor.onrender.com";
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` });

interface ModuloItem {
  modulo: string;
  cantidad: number;
}

interface ProductoResult {
  producto: string;
  total: number;
  modulos: ModuloItem[];
}

interface StockModulo {
  modulo: string;
  total_productos: number;
  tipos_distintos: number;
}

const QuienTienePage: React.FC = () => {
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<ProductoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [stockModulos, setStockModulos] = useState<StockModulo[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingStock, setLoadingStock] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setResultados([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await axios.get<ProductoResult[]>(
          `${API}/direccion/buscar-producto`,
          { headers: authH(), params: { q: q.trim() } },
        );
        setResultados(data);
      } catch {
        setResultados([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const abrirStock = async () => {
    setDialogOpen(true);
    if (stockModulos.length > 0) return;
    setLoadingStock(true);
    try {
      const { data } = await axios.get<StockModulo[]>(
        `${API}/direccion/stock-por-modulo`,
        { headers: authH() },
      );
      setStockModulos(data);
    } catch {
      setStockModulos([]);
    } finally {
      setLoadingStock(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      {/* Título */}
      <Typography variant="h4" fontWeight={700} gutterBottom>
        🔍 ¿Quién tiene?
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Busca un producto para ver en qué módulos hay stock
      </Typography>

      {/* Barra de búsqueda + botón stock */}
      <Box
        display="flex"
        gap={1.5}
        mb={3}
        flexDirection={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
      >
        <TextField
          fullWidth
          placeholder="Ej: iPhone 14, mica, cable usb, protector..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#94a3b8' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            flex: 1,
            '& .MuiOutlinedInput-root:hover fieldset': { borderColor: '#FF6600' },
            '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: '#FF6600' },
          }}
        />
        <Button
          variant="outlined"
          startIcon={<BarChartIcon />}
          onClick={abrirStock}
          sx={{
            borderColor: '#FF6600',
            color: '#FF6600',
            fontWeight: 700,
            fontSize: 13,
            whiteSpace: 'nowrap',
            minHeight: 48,
            px: 2,
            '&:hover': { bgcolor: '#fff3e0', borderColor: '#FF6600' },
          }}
        >
          📊 STOCK POR MÓDULO
        </Button>
      </Box>

      {/* Estado de carga */}
      {loading && (
        <Box textAlign="center" py={4}>
          <CircularProgress sx={{ color: '#FF6600' }} />
        </Box>
      )}

      {/* Mensaje inicial */}
      {!loading && q.trim().length < 2 && (
        <Typography color="text.secondary" textAlign="center" mt={6} fontSize={15}>
          Escribe el nombre del producto para empezar a buscar
        </Typography>
      )}

      {/* Sin resultados */}
      {!loading && q.trim().length >= 2 && resultados.length === 0 && (
        <Typography color="text.secondary" textAlign="center" mt={4} fontSize={15}>
          Sin coincidencias para "<strong>{q}</strong>"
        </Typography>
      )}

      {/* Resultados */}
      {!loading &&
        resultados.map((r) => (
          <Paper
            key={r.producto}
            elevation={0}
            sx={{
              mb: 1.5,
              p: { xs: 1.5, sm: 2 },
              border: '1.5px solid #FF6600',
              borderRadius: 2,
            }}
          >
            {/* Encabezado: nombre + total */}
            <Box
              display="flex"
              alignItems="flex-start"
              gap={1}
              mb={1}
              flexWrap="wrap"
            >
              <Typography
                fontWeight={700}
                fontSize={{ xs: 14, sm: 15 }}
                sx={{ flex: 1, minWidth: 0, wordBreak: 'break-word', lineHeight: 1.4 }}
              >
                {r.producto}
              </Typography>
              <Chip
                label={`${r.total} en stock`}
                size="small"
                sx={{
                  bgcolor: '#FF6600',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 12,
                  flexShrink: 0,
                }}
              />
            </Box>

            {/* Módulos con cantidad */}
            <Box display="flex" flexWrap="wrap" gap={0.75}>
              {r.modulos.map((m) => (
                <Chip
                  key={m.modulo}
                  label={`${m.modulo}: ${m.cantidad}`}
                  size="small"
                  variant="outlined"
                  sx={{
                    borderColor: '#e2e8f0',
                    color: '#444',
                    fontSize: 12,
                    height: 26,
                  }}
                />
              ))}
            </Box>
          </Paper>
        ))}

      {/* Dialog: stock por módulo */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>📊 Stock total por módulo</DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {loadingStock ? (
            <Box textAlign="center" py={4}>
              <CircularProgress sx={{ color: '#FF6600' }} />
            </Box>
          ) : (
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: '#FF6600', bgcolor: '#f8fafc' }}>
                    Módulo
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: 700, color: '#FF6600', bgcolor: '#f8fafc' }}
                  >
                    Total productos
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: 700, color: '#FF6600', bgcolor: '#f8fafc' }}
                  >
                    Tipos distintos
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stockModulos.map((s) => (
                  <TableRow key={s.modulo} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{s.modulo}</TableCell>
                    <TableCell align="right">
                      {s.total_productos.toLocaleString('es-MX')}
                    </TableCell>
                    <TableCell align="right">{s.tipos_distintos}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button
            onClick={() => setDialogOpen(false)}
            variant="contained"
            sx={{ bgcolor: '#FF6600', '&:hover': { bgcolor: '#ea5c00' }, fontWeight: 700 }}
          >
            CERRAR
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuienTienePage;
