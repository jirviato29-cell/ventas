import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Checkbox,
  CircularProgress,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import axios from 'axios';
import { Navigate } from 'react-router-dom';

const API = "https://ato-appservidor-nvxt.onrender.com";
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` });

const fmt$ = (n: number) =>
  n > 0 ? `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
const fmtFecha = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

// ─── Styles (mismo patrón que DireccionPage) ─────────────────────────────────
const thStyle: React.CSSProperties = {
  padding: '2px 6px',
  borderBottom: '1px solid #eef2f7',
  color: '#475569',
  fontWeight: 700,
  background: '#f8fafc',
  fontSize: 10,
  letterSpacing: '0.3px',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};
const tdStyle: React.CSSProperties = {
  padding: '3px 6px',
  borderBottom: '1px solid #f1f5f9',
  fontSize: 12,
  color: '#334155',
  whiteSpace: 'nowrap',
};
const tdR: React.CSSProperties = { ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

interface RecargaItem {
  id: number;
  modulo_id: number;
  modulo_nombre: string;
  fecha: string;
  adicional_recargas: number;
  adicional_transporte: number;
  adicional_otros: number;
  adicional_mayoreo: number;
  adicional_mayoreo_para?: string | null;
  recarga_revisada: boolean;
}

// ─── Tabla compartida ────────────────────────────────────────────────────────
const TablaRecargas: React.FC<{
  items: RecargaItem[];
  cargando: boolean;
  revisadas: boolean;
  onToggle: (id: number, revisada: boolean) => void;
}> = ({ items, cargando, revisadas, onToggle }) => {
  if (cargando) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }
  if (items.length === 0) {
    return (
      <Typography sx={{ py: 3, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
        {revisadas ? 'No hay recargas revisadas.' : 'No hay recargas pendientes.'}
      </Typography>
    );
  }
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small" sx={{ minWidth: 560 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={thStyle}>Fecha</TableCell>
            <TableCell sx={thStyle}>Módulo</TableCell>
            <TableCell sx={{ ...thStyle, textAlign: 'right' }}>Telcel</TableCell>
            <TableCell sx={{ ...thStyle, textAlign: 'right' }}>YOVOY</TableCell>
            <TableCell sx={{ ...thStyle, textAlign: 'right' }}>C. Pagos</TableCell>
            <TableCell sx={{ ...thStyle, textAlign: 'right' }}>Mayoreo</TableCell>
            <TableCell sx={{ ...thStyle, textAlign: 'center' }}>
              {revisadas ? 'Revisada' : 'Marcar'}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((r) => (
            <TableRow key={r.id} hover>
              <TableCell sx={tdStyle}>{fmtFecha(r.fecha)}</TableCell>
              <TableCell sx={{ ...tdStyle, fontWeight: 600, color: '#0f172a' }}>
                {r.modulo_nombre}
              </TableCell>
              <TableCell sx={tdR}>{fmt$(r.adicional_recargas)}</TableCell>
              <TableCell sx={tdR}>{fmt$(r.adicional_transporte)}</TableCell>
              <TableCell sx={tdR}>{fmt$(r.adicional_otros)}</TableCell>
              <TableCell sx={tdR}>
                {fmt$(r.adicional_mayoreo)}
                {r.adicional_mayoreo_para && (
                  <Box component="div" sx={{ fontSize: 10, color: '#94a3b8', fontWeight: 400, mt: '1px' }}>
                    para: {r.adicional_mayoreo_para}
                  </Box>
                )}
              </TableCell>
              <TableCell sx={{ ...tdStyle, textAlign: 'center', padding: '0 6px' }}>
                <Tooltip title={revisadas ? 'Desmarcar (regresa a pendientes)' : 'Marcar como revisada'}>
                  <Checkbox
                    checked={revisadas}
                    size="small"
                    onChange={() => onToggle(r.id, revisadas)}
                    sx={{
                      color: '#94a3b8',
                      '&.Mui-checked': { color: '#16a34a' },
                      padding: '2px',
                    }}
                  />
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};

// ─── Página principal ────────────────────────────────────────────────────────
const RecargasPage: React.FC = () => {
  // 1️⃣ TODOS los hooks primero — sin excepción
  const [tab, setTab] = useState(0);
  const [pendientes, setPendientes] = useState<RecargaItem[]>([]);
  const [revisadas, setRevisadas] = useState<RecargaItem[]>([]);
  const [cargandoPend, setCargandoPend] = useState(false);
  const [cargandoRev, setCargandoRev] = useState(false);

  const cargarPendientes = useCallback(async () => {
    setCargandoPend(true);
    try {
      const { data } = await axios.get<RecargaItem[]>(
        `${API}/direccion/recargas-pendientes`,
        { headers: authH() },
      );
      setPendientes(data);
    } finally {
      setCargandoPend(false);
    }
  }, []);

  const cargarRevisadas = useCallback(async () => {
    setCargandoRev(true);
    try {
      const { data } = await axios.get<RecargaItem[]>(
        `${API}/direccion/recargas-revisadas`,
        { headers: authH() },
      );
      setRevisadas(data);
    } finally {
      setCargandoRev(false);
    }
  }, []);

  useEffect(() => { cargarPendientes(); }, [cargarPendientes]);
  useEffect(() => { cargarRevisadas(); }, [cargarRevisadas]);

  // 2️⃣ Guard de rol DESPUÉS de todos los hooks
  const rol = localStorage.getItem('rol') ?? '';
  if (rol !== 'direccion') return <Navigate to="/" replace />;

  const handleToggle = async (id: number, estaRevisada: boolean) => {
    const endpoint = estaRevisada
      ? `${API}/direccion/cortes/${id}/desmarcar-recarga-revisada`
      : `${API}/direccion/cortes/${id}/marcar-recarga-revisada`;
    try {
      await axios.put(endpoint, {}, { headers: authH() });
      // Recargar ambas listas para que el ítem se mueva
      await Promise.all([cargarPendientes(), cargarRevisadas()]);
    } catch {
      // silencioso — el ítem no se mueve si falla
    }
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: 2, py: 3 }}>
      {/* Encabezado */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <ReceiptLongIcon sx={{ color: '#f97316', fontSize: 22 }} />
        <Typography fontWeight={700} fontSize={16} color="#0f172a" letterSpacing={0.3}>
          RECARGAS
        </Typography>
      </Box>

      {/* Tabs internos */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          mb: 1,
          '& .MuiTab-root': { fontSize: 12, fontWeight: 700, minHeight: 36, padding: '6px 16px' },
          '& .Mui-selected': { color: '#f97316 !important' },
          '& .MuiTabs-indicator': { backgroundColor: '#f97316' },
        }}
      >
        <Tab
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              Pendientes
              {pendientes.length > 0 && (
                <Box
                  component="span"
                  sx={{
                    ml: 0.5, px: 0.8, py: 0.1, borderRadius: 10,
                    background: '#f97316', color: '#fff', fontSize: 10, fontWeight: 700,
                  }}
                >
                  {pendientes.length}
                </Box>
              )}
            </Box>
          }
        />
        <Tab label="Revisadas" />
      </Tabs>

      <Box
        sx={{
          border: '1px solid #e2e8f0',
          borderRadius: 1,
          bgcolor: '#fff',
          overflow: 'hidden',
        }}
      >
        {tab === 0 && (
          <TablaRecargas
            items={pendientes}
            cargando={cargandoPend}
            revisadas={false}
            onToggle={handleToggle}
          />
        )}
        {tab === 1 && (
          <TablaRecargas
            items={revisadas}
            cargando={cargandoRev}
            revisadas={true}
            onToggle={handleToggle}
          />
        )}
      </Box>
    </Box>
  );
};

export default RecargasPage;
