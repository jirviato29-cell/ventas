import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Paper, Button, Table, TableHead, TableBody,
  TableRow, TableCell, TableContainer, Alert, CircularProgress,
  Checkbox, Chip,
} from "@mui/material";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import PaymentIcon from "@mui/icons-material/Payment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || "";
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || "";

const getSupabase = () => {
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
};

interface FilaTelcel {
  numero: string;
  comision_telcel: number;
  fecha: string;
  cadena: string;
}

interface FilaCruzada {
  id: number;
  numero: string;
  empleado: string;
  tipo_chip: string;
  comision_telcel: number;
  fecha: string;
}

interface Resumen {
  chips_normales_pagados: number;
  chips_incubadora_validados: number;
  chips_no_encontrados: number;
  total_pagado_normales: number;
  total_pendiente_incubadora: number;
}

const fmt = (n: number) =>
  n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CLineasPage = () => {
  const token = localStorage.getItem("token");

  const [filas, setFilas] = useState<FilaCruzada[]>([]);
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const [cargando, setCargando] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);

  const fetchData = useCallback(async () => {
    setCargando(true);
    setErrorMsg(null);
    setResumen(null);
    try {
      const sb = getSupabase();
      if (!sb) throw new Error("Configura REACT_APP_SUPABASE_URL y REACT_APP_SUPABASE_ANON_KEY");

      // Traer todos los registros de Supabase en páginas de 1000
      let allTelcel: FilaTelcel[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data: page, error } = await sb
          .from("comisiones_telcel")
          .select("numero, comision_telcel, fecha, cadena")
          .range(from, from + pageSize - 1);
        if (error) throw new Error(`Supabase: ${error.message}`);
        allTelcel = allTelcel.concat(page as FilaTelcel[]);
        if ((page as any[]).length < pageSize) break;
        from += pageSize;
      }

      const chipsRes = await axios.get(
        `https://ato-appservidor-nvxt.onrender.com/ventas/venta_chips/pendientes`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Supabase total:', allTelcel.length, 'primeros 5:', allTelcel.slice(0, 5));
      console.log('Pendientes primeros 5:', chipsRes.data?.slice(0, 5));

      const mapTelcel = new Map<string, FilaTelcel>();
      allTelcel.forEach((r) => mapTelcel.set(String(r.numero).trim(), r));

      console.log('Mapa size:', mapTelcel.size);

      const cruzadas: FilaCruzada[] = [];
      for (const chip of chipsRes.data) {
        const numeroLimpio = String(chip.numero_telefono).trim().replace(/\s+.*/, "");
        const t = mapTelcel.get(numeroLimpio);
        if (!t) continue;
        cruzadas.push({
          id: chip.id,
          numero: chip.numero_telefono,
          empleado: chip.empleado?.username ?? "—",
          tipo_chip: chip.tipo_chip,
          comision_telcel: t.comision_telcel,
          fecha: chip.fecha,
        });
      }

      setFilas(cruzadas);
    } catch (e: any) {
      setErrorMsg(e.message ?? "Error al cargar datos");
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleFila = (id: number) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const todosSeleccionados = filas.length > 0 && seleccionados.size === filas.length;

  const toggleTodos = () => {
    if (todosSeleccionados) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(filas.map((f) => f.id)));
    }
  };

  const totalSeleccionado = filas
    .filter((f) => seleccionados.has(f.id))
    .reduce((s, f) => s + f.comision_telcel, 0);

  const pagarSeleccionados = async () => {
    if (!seleccionados.size) return;
    setPagando(true);
    setErrorMsg(null);
    setResumen(null);
    try {
      const chip_ids = Array.from(seleccionados);

      const res = await axios.post(
        `https://ato-appservidor-nvxt.onrender.com/ventas/venta_chips/pagar_comisiones`,
        { chip_ids },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setResumen({
        chips_normales_pagados: res.data.chips_normales_pagados,
        chips_incubadora_validados: res.data.chips_incubadora_validados,
        chips_no_encontrados: res.data.chips_no_encontrados,
        total_pagado_normales: res.data.total_pagado_normales,
        total_pendiente_incubadora: res.data.total_pendiente_incubadora,
      });
      setSeleccionados(new Set());
      await fetchData();
    } catch (e: any) {
      setErrorMsg(e.message ?? "Error al pagar");
    } finally {
      setPagando(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1100, mx: "auto" }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5, color: "#0d1e3a" }}>
        C LÍNEAS — Pago de comisiones
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Chips pendientes de validar que tienen comisión registrada en Telcel.
      </Typography>

      {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}

      {resumen && (
        <Box sx={{ mb: 2, display: "flex", flexDirection: "column", gap: 1 }}>
          {resumen.chips_normales_pagados > 0 && (
            <Alert severity="success" icon={<CheckCircleIcon />} onClose={() => setResumen(null)}>
              ✅ <strong>{resumen.chips_normales_pagados}</strong> chip{resumen.chips_normales_pagados !== 1 ? "s" : ""} normal{resumen.chips_normales_pagados !== 1 ? "es" : ""} pagado{resumen.chips_normales_pagados !== 1 ? "s" : ""}{" "}
              (<strong>${fmt(resumen.total_pagado_normales)}</strong>)
            </Alert>
          )}
          {resumen.chips_incubadora_validados > 0 && (
            <Alert severity="info" onClose={() => setResumen(null)}>
              ⏳ <strong>{resumen.chips_incubadora_validados}</strong> chip{resumen.chips_incubadora_validados !== 1 ? "s" : ""} de incubadora validado{resumen.chips_incubadora_validados !== 1 ? "s" : ""}, en espera de Nómina de Incubadora{" "}
              (<strong>${fmt(resumen.total_pendiente_incubadora)}</strong>)
            </Alert>
          )}
          {resumen.chips_no_encontrados > 0 && (
            <Alert severity="warning" onClose={() => setResumen(null)}>
              ⚠️ <strong>{resumen.chips_no_encontrados}</strong> número{resumen.chips_no_encontrados !== 1 ? "s" : ""} no encontrado{resumen.chips_no_encontrados !== 1 ? "s" : ""} en el sistema
            </Alert>
          )}
          {resumen.chips_normales_pagados === 0 && resumen.chips_incubadora_validados === 0 && resumen.chips_no_encontrados === 0 && (
            <Alert severity="info" onClose={() => setResumen(null)}>Sin cambios registrados.</Alert>
          )}
        </Box>
      )}

      {cargando ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress sx={{ color: "#f97316" }} />
        </Box>
      ) : (
        <Paper>
          {/* Toolbar */}
          <Box
            sx={{
              px: 3, py: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid #e2e8f0",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="subtitle1" fontWeight={700}>
                {filas.length} registro{filas.length !== 1 ? "s" : ""} cruzados
              </Typography>
              {seleccionados.size > 0 && (
                <Chip
                  label={`${seleccionados.size} seleccionado${seleccionados.size !== 1 ? "s" : ""}`}
                  size="small"
                  sx={{ bgcolor: "rgba(249,115,22,0.1)", color: "#ea6c00", fontWeight: 600 }}
                />
              )}
            </Box>
            <Box display="flex" gap={1} flexWrap="wrap">
              <Button
                variant="outlined"
                size="small"
                onClick={toggleTodos}
                disabled={filas.length === 0}
                sx={{ borderColor: "#0d1e3a", color: "#0d1e3a" }}
              >
                {todosSeleccionados ? "Deseleccionar todos" : "Seleccionar todos"}
              </Button>
              <Button
                variant="contained"
                startIcon={pagando ? <CircularProgress size={16} color="inherit" /> : <PaymentIcon />}
                disabled={seleccionados.size === 0 || pagando}
                onClick={pagarSeleccionados}
                sx={{ bgcolor: "#f97316", "&:hover": { bgcolor: "#ea6c00" } }}
              >
                {pagando
                  ? "Pagando…"
                  : `Pagar seleccionados · $${fmt(totalSeleccionado)}`}
              </Button>
            </Box>
          </Box>

          {/* Tabla */}
          <TableContainer sx={{ maxHeight: 520 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={todosSeleccionados}
                      indeterminate={seleccionados.size > 0 && !todosSeleccionados}
                      onChange={toggleTodos}
                      disabled={filas.length === 0}
                    />
                  </TableCell>
                  <TableCell>Empleado</TableCell>
                  <TableCell>Número</TableCell>
                  <TableCell>Tipo chip</TableCell>
                  <TableCell align="right">Comisión Telcel</TableCell>
                  <TableCell>Fecha</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 5, color: "#94a3b8" }}>
                      No hay chips pendientes con comisión Telcel registrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filas.map((f) => (
                    <TableRow
                      key={f.id}
                      hover
                      selected={seleccionados.has(f.id)}
                      onClick={() => toggleFila(f.id)}
                      sx={{ cursor: "pointer" }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={seleccionados.has(f.id)}
                          onChange={() => toggleFila(f.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell>{f.empleado}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{f.numero}</TableCell>
                      <TableCell>{f.tipo_chip}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: "#16a34a" }}>
                        ${fmt(f.comision_telcel)}
                      </TableCell>
                      <TableCell>{f.fecha}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {filas.length > 0 && (
            <Box
              sx={{
                px: 3, py: 1.5,
                borderTop: "1px solid #e2e8f0",
                bgcolor: "#f8fafc",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Total seleccionados:{" "}
                <strong style={{ color: "#16a34a" }}>${fmt(totalSeleccionado)}</strong>
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default CLineasPage;
