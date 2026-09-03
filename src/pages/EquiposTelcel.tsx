import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box, Container, Typography, TextField, Button, Select, MenuItem,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Paper,
  Autocomplete, Checkbox,
} from "@mui/material";
import axios from "axios";

const BASE = "https://ato-appservidor-nvxt.onrender.com";

const infoClasificacionVenta = (clasificacion: string | null | undefined): { label: string; color: string } | null => {
  if (clasificacion === "linea_nueva") return { label: "Línea nueva", color: "#1976d2" };
  if (clasificacion === "boletin_63") return { label: "Boletín 63", color: "#9c27b0" };
  if (clasificacion === "chip_ato") return { label: "Chip ATO", color: "#ed6c02" };
  if (clasificacion === "chip_promo") return { label: "Chip Promo", color: "#0288d1" };
  return null;
};

const ESTADOS_ACTIVACION = ['no_activado', 'activado', 'libre', 'bloqueado'] as const;

const ESTILO_ESTADO: Record<string, { label: string; bg: string; hover: string; color: string }> = {
  no_activado: { label: 'No activado', bg: '#9e9e9e', hover: '#757575', color: '#fff' },
  activado:    { label: 'Activado',    bg: '#2e7d32', hover: '#1b5e20', color: '#fff' },
  libre:       { label: 'Libre',       bg: '#f9a825', hover: '#f57f17', color: '#000' },
  bloqueado:   { label: 'Bloqueado',   bg: '#c62828', hover: '#8e0000', color: '#fff' },
};

// Fallback: si el backend aun no manda estado_activacion, se deriva del booleano
const obtenerEstado = (eq: any): string => {
  const e = eq?.estado_activacion;
  if (typeof e === 'string' && ESTADOS_ACTIVACION.includes(e as any)) return e;
  return eq?.activado ? 'activado' : 'no_activado';
};

const siguienteEstado = (actual: string): string => {
  const i = ESTADOS_ACTIVACION.indexOf(actual as any);
  return ESTADOS_ACTIVACION[(i + 1) % ESTADOS_ACTIVACION.length];
};

const EquiposTelcel = () => {
  const [subiendo, setSubiendo] = useState(false);

  const [equipos, setEquipos] = useState<any[]>([]);
  const [fEstatus, setFEstatus] = useState("");
  const [fProducto, setFProducto] = useState("");
  const [fInicio, setFInicio] = useState("");
  const [fFin, setFFin] = useState("");
  const [fActivacion, setFActivacion] = useState<string>(""); // "", "activado", "no_activado", "libre", "bloqueado"
  const [fTipo, setFTipo] = useState<string>(""); // "", "TELCEL", "LIBRE"
  const [fModulo, setFModulo] = useState<string>("");
  const [modulos, setModulos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [prioridadInicial, setPrioridadInicial] = useState<Record<number, number>>({});

  const tipoEquipo = (producto: string): "TELCEL" | "LIBRE" =>
    (producto || "").toUpperCase().startsWith("TELEFONO LIBRE") ? "LIBRE" : "TELCEL";

  const [aImei, setAImei] = useState("");
  const [aProducto, setAProducto] = useState<any | null>(null);
  const [aOpciones, setAOpciones] = useState<any[]>([]);
  const [aBuscando, setABuscando] = useState(false);
  const [aFecha, setAFecha] = useState("");
  const [altaGuardando, setAltaGuardando] = useState(false);

  const token = localStorage.getItem("token");
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const cargarEquipos = useCallback(async () => {
    setCargando(true);

    const params = new URLSearchParams();
    if (fEstatus) params.append("estatus", fEstatus);
    if (fProducto) params.append("producto", fProducto);
    if (fInicio) params.append("fecha_inicio", fInicio);
    if (fFin) params.append("fecha_fin", fFin);

    try {
      const res = await axios.get(
        `${BASE}/equipos_telcel/?${params.toString()}`,
        config
      );
      setEquipos(res.data);
      const snap: Record<number, number> = {};
      (res.data || []).forEach((eq: any) => {
        const e = obtenerEstado(eq);
        snap[eq.id] = e === 'no_activado' ? 0 : e === 'activado' ? 2 : 1;
      });
      setPrioridadInicial(snap);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al cargar equipos");
    } finally {
      setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fEstatus, fProducto, fInicio, fFin]);

  useEffect(() => {
    cargarEquipos();
  }, [cargarEquipos]);

  useEffect(() => {
    const cargarModulos = async () => {
      try {
        const res = await axios.get(`${BASE}/registro/modulos`, config);
        setModulos(res.data);
      } catch (err) {
        console.error("Error al cargar modulos:", err);
      }
    };
    cargarModulos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Con el filtro de estatus en "Todos" no se muestran los equipos vendidos:
  // solo aparecen cuando se selecciona "Vendido" explicitamente.
  const equiposSinVendidos = useMemo(() => {
    if (fEstatus) return equipos;
    return equipos.filter((e: any) =>
      String(e?.estatus ?? '').toLowerCase() !== 'vendido'
    );
  }, [equipos, fEstatus]);

  // Con el filtro en "Vendido" sobran Estatus (ya se sabe) y Fecha surtido (no
  // interesa ahi), y su lugar lo ocupa Vendedor: queda donde el ojo buscaba el
  // estatus. Por eso la tabla pasa de 13 a 12 columnas.
  const esVendido = fEstatus === "vendido";
  const numColumnas = esVendido ? 12 : 13;

  const manejarArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setSubiendo(true);

    const formData = new FormData();
    formData.append("archivo", archivo);

    try {
      const res = await axios.post(
        `${BASE}/equipos_telcel/upload/`,
        formData,
        {
          headers: {
            ...config.headers,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      let msg = `Carga terminada.\nInsertados: ${res.data.insertados}\nSaltados por repetidos: ${res.data.saltados_repetidos}`;
      if (res.data.rechazados_clave && res.data.rechazados_clave > 0) {
        msg += `\nRechazados por clave no reconocida: ${res.data.rechazados_clave}`;
        msg += `\nClaves no reconocidas: ${res.data.claves_no_reconocidas.join(", ")}`;
      }
      alert(msg);
      cargarEquipos();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al procesar el archivo Excel");
    } finally {
      setSubiendo(false);
      e.target.value = "";
    }
  };

  const cambiarActivacion = async (eq: any) => {
    const actual = obtenerEstado(eq);
    const nuevo = siguienteEstado(actual);
    try {
      await axios.post(
        `${BASE}/equipos_telcel/activar/${eq.id}`,
        { estado_activacion: nuevo },
        config
      );

      let fechaAuto: string | null = null;
      if (
        nuevo === 'libre' &&
        !eq.fecha_activacion &&
        !eq.fecha_estatus_inicial &&
        eq.fecha_salida
      ) {
        const candidata = String(eq.fecha_salida).slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(candidata)) {
          try {
            await axios.post(
              `${BASE}/equipos_telcel/fecha-estatus-inicial/${eq.id}`,
              { fecha_estatus_inicial: candidata },
              config
            );
            fechaAuto = candidata;
          } catch (e: any) {
            alert(
              e.response?.data?.detail ||
                "No se pudo guardar la fecha de estatus inicial automática"
            );
          }
        }
      }

      setEquipos(prev =>
        prev.map(x =>
          x.id === eq.id
            ? {
                ...x,
                estado_activacion: nuevo,
                activado: nuevo === 'activado',
                ...(fechaAuto ? { fecha_estatus_inicial: fechaAuto } : {}),
              }
            : x
        )
      );
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al cambiar activación");
    }
  };

  const guardarFechaActivacion = async (eq: any, valor: string) => {
    try {
      await axios.post(`${BASE}/equipos_telcel/fecha-activacion/${eq.id}`, { fecha_activacion: valor || null }, config);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al guardar la fecha de activación");
    }
  };

  const guardarFechaEstatusInicial = async (eq: any, valor: string) => {
    try {
      await axios.post(`${BASE}/equipos_telcel/fecha-estatus-inicial/${eq.id}`, { fecha_estatus_inicial: valor || null }, config);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al guardar la fecha de estatus inicial");
    }
  };

  const guardarCumpleArl = async (eq: any, nuevo: boolean) => {
    try {
      await axios.post(`${BASE}/equipos_telcel/cumple-arl/${eq.id}`, { cumple_arl: nuevo }, config);
      setEquipos(prev => prev.map(x => x.id === eq.id ? { ...x, cumple_arl: nuevo } : x));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al guardar");
    }
  };

  const buscarProductoAlta = async (texto: string) => {
    if (!texto || texto.length < 2) { setAOpciones([]); return; }
    setABuscando(true);
    try {
      const res = await axios.get(`${BASE}/inventario/buscar-catalogo?query=${encodeURIComponent(texto)}`, config);
      setAOpciones(res.data || []);
    } catch { setAOpciones([]); }
    finally { setABuscando(false); }
  };

  const darDeAltaBodega = async () => {
    const imei = aImei.trim();
    if (!imei) { alert("Escribe el IMEI"); return; }
    if (!aProducto) { alert("Selecciona el producto"); return; }
    if (!aFecha) { alert("Selecciona la fecha de compra"); return; }
    setAltaGuardando(true);
    try {
      await axios.post(`${BASE}/equipos_telcel/alta-bodega`, {
        imei,
        clave: aProducto.clave,
        producto: aProducto.producto,
        fecha_compra: aFecha,
      }, config);
      alert("Equipo dado de alta en bodega");
      setAImei(""); setAProducto(null); setAOpciones([]); setAFecha("");
      cargarEquipos();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al dar de alta el equipo");
    } finally {
      setAltaGuardando(false);
    }
  };

  const fechaOrden = (eq: any): number => {
    const f = eq.fecha_venta || eq.fecha_salida || eq.fecha_compra;
    if (!f) return 0;
    const t = new Date(f).getTime();
    return isNaN(t) ? 0 : t;
  };

  const prioridadEstado = (eq: any): number => {
    const e = obtenerEstado(eq);
    if (e === 'no_activado') return 0;
    if (e === 'activado') return 2;
    return 1;
  };

  const equiposVisibles = equiposSinVendidos
    .filter(eq => {
      if (fActivacion && obtenerEstado(eq) !== fActivacion) return false;
      if (fTipo && tipoEquipo(eq.producto) !== fTipo) return false;
      if (fModulo && String(eq.modulo_id) !== fModulo) return false;
      return true;
    })
    .sort((a, b) => {
      if (fEstatus === "vendido") {
        const pa = prioridadInicial[a.id] ?? prioridadEstado(a);
        const pb = prioridadInicial[b.id] ?? prioridadEstado(b);
        const p = pa - pb;
        if (p !== 0) return p;
      }
      const diff = fechaOrden(b) - fechaOrden(a);
      if (diff !== 0) return diff;
      return (b.id || 0) - (a.id || 0);
    });

  return (
    <Container maxWidth={false} sx={{ mt: 4 }}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Carga de Equipos Telcel (IMEI)
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          El Excel debe contener las columnas: <strong>imei</strong>,{" "}
          <strong>clave</strong>, <strong>producto</strong>,{" "}
          <strong>fecha_compra</strong>.
        </Typography>

        <TextField
          type="file"
          inputProps={{ accept: ".xlsx,.xls" }}
          onChange={manejarArchivo}
          disabled={subiendo}
          variant="outlined"
          sx={{ mb: 3 }}
        />

        {/* ── Alta manual de equipo (bodega) ──────────────────── */}
        <Box sx={{ mt: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Alta manual de equipo (bodega)</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField label="IMEI" value={aImei} onChange={(e) => setAImei(e.target.value)} size="small" />
            <Autocomplete
              sx={{ minWidth: 320 }}
              options={aOpciones}
              filterOptions={(x) => x}
              loading={aBuscando}
              value={aProducto}
              getOptionLabel={(p: any) => (p?.clave ? `${p.clave} - ${p.producto}` : (p?.producto || ''))}
              onInputChange={(_, v, reason) => { if (reason === 'input') buscarProductoAlta(v); }}
              onChange={(_, obj) => setAProducto(obj)}
              renderInput={(params) => <TextField {...params} label="Producto (clave o nombre)" size="small" />}
            />
            <TextField label="Fecha de compra" type="date" value={aFecha} onChange={(e) => setAFecha(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
            <Button variant="contained" onClick={darDeAltaBodega} disabled={altaGuardando}>
              {altaGuardando ? 'Guardando...' : 'Dar de alta'}
            </Button>
          </Box>
        </Box>

        {/* ── Sección de consulta ─────────────────────────────── */}
        <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
          Equipos registrados
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            alignItems: "center",
            mb: 3,
          }}
        >
          <Select
            value={fEstatus}
            onChange={(e) => setFEstatus(e.target.value)}
            displayEmpty
            size="small"
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="en_bodega">En bodega</MenuItem>
            <MenuItem value="surtido">Surtido</MenuItem>
            <MenuItem value="vendido">Vendido</MenuItem>
          </Select>

          <Select
            value={fModulo}
            onChange={(e) => setFModulo(e.target.value)}
            displayEmpty
            size="small"
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">Todos los módulos</MenuItem>
            {modulos.map((m: any) => (
              <MenuItem key={m.id} value={String(m.id)}>{m.nombre}</MenuItem>
            ))}
          </Select>

          <TextField
            label="Modelo/Producto"
            value={fProducto}
            onChange={(e) => setFProducto(e.target.value)}
            size="small"
          />

          <TextField
            label="Desde"
            type="date"
            value={fInicio}
            onChange={(e) => setFInicio(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />

          <TextField
            label="Hasta"
            type="date"
            value={fFin}
            onChange={(e) => setFFin(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />

          <Select
            value={fActivacion}
            onChange={(e) => setFActivacion(e.target.value)}
            displayEmpty
            size="small"
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="activado">Activados</MenuItem>
            <MenuItem value="no_activado">No activados</MenuItem>
            <MenuItem value="libre">Libres</MenuItem>
            <MenuItem value="bloqueado">Bloqueados</MenuItem>
          </Select>

          <Select
            value={fTipo}
            onChange={(e) => setFTipo(e.target.value)}
            displayEmpty
            size="small"
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">Todos (Telcel/Libre)</MenuItem>
            <MenuItem value="TELCEL">Telcel</MenuItem>
            <MenuItem value="LIBRE">Libre</MenuItem>
          </Select>

          <Button variant="contained" onClick={cargarEquipos}>
            Buscar
          </Button>
        </Box>

        <TableContainer component={Paper} sx={{ width: '100%', overflowX: 'auto' }}>
          <Table size="small" sx={{ '& td, & th': { border: '1px solid #e0e0e0' } }}>
            <TableHead>
              <TableRow>
                <TableCell>IMEI</TableCell>
                <TableCell>Producto</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Módulo</TableCell>
                {esVendido ? (
                  <TableCell>Vendedor</TableCell>
                ) : (
                  <>
                    <TableCell>Estatus</TableCell>
                    <TableCell>Fecha surtido</TableCell>
                  </>
                )}
                <TableCell>Fecha venta</TableCell>
                <TableCell>Activación</TableCell>
                <TableCell>Fecha activación</TableCell>
                <TableCell>Fecha Estatus inicial</TableCell>
                <TableCell>Número</TableCell>
                <TableCell>Qué fue</TableCell>
                <TableCell>Cumple ARL</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cargando ? (
                <TableRow>
                  <TableCell colSpan={numColumnas} align="center">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : equiposVisibles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={numColumnas} align="center">
                    Sin resultados
                  </TableCell>
                </TableRow>
              ) : (
                equiposVisibles.map((eq) => {
                  const bloqueadoEstatusInicial = !!eq.fecha_activacion;
                  const infoClasif = infoClasificacionVenta(eq.clasificacion_venta);
                  const filaAlertaRoja =
                    eq.activado === false &&
                    eq.estatus === "vendido" &&
                    !!eq.fecha_estatus_inicial &&
                    ["linea_nueva", "boletin_63", "chip_ato", "chip_promo"].includes(eq.clasificacion_venta);
                  const filaAlertaAzul =
                    eq.activado === false &&
                    !!eq.fecha_estatus_inicial &&
                    eq.estatus !== "vendido";
                  const filaOk = eq.cumple_arl === true;
                  const bgAlerta = filaAlertaRoja
                    ? '#ffcdd2'
                    : (filaAlertaAzul ? '#bbdefb' : (filaOk ? '#c8e6c9' : undefined));
                  return (
                    <TableRow
                      key={eq.id}
                      sx={bgAlerta ? {
                        backgroundColor: bgAlerta,
                        '& > td': { backgroundColor: bgAlerta },
                      } : undefined}
                    >
                      <TableCell>{eq.imei}</TableCell>
                      <TableCell>{eq.producto}</TableCell>
                      <TableCell>
                        <Box
                          component="span"
                          sx={{
                            display: 'inline-block',
                            px: 1,
                            py: '2px',
                            borderRadius: 1,
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#fff',
                            backgroundColor: tipoEquipo(eq.producto) === 'TELCEL' ? '#FF6600' : '#64748b',
                          }}
                        >
                          {tipoEquipo(eq.producto)}
                        </Box>
                      </TableCell>
                      <TableCell>{eq.modulo_nombre || "—"}</TableCell>
                      {esVendido ? (
                        <TableCell>{eq.vendedor || "—"}</TableCell>
                      ) : (
                        <>
                          <TableCell>{eq.estatus}</TableCell>
                          <TableCell>{eq.fecha_salida ? String(eq.fecha_salida).split(' ')[0] : "—"}</TableCell>
                        </>
                      )}
                      <TableCell>{eq.fecha_venta ? String(eq.fecha_venta).split(' ')[0] : "—"}</TableCell>
                      <TableCell>
                        {(() => {
                          const est = obtenerEstado(eq);
                          const st = ESTILO_ESTADO[est];
                          return (
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => cambiarActivacion(eq)}
                              sx={{
                                backgroundColor: st.bg,
                                color: st.color,
                                minWidth: 110,
                                '&:hover': { backgroundColor: st.hover },
                              }}
                            >
                              {st.label}
                            </Button>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="date"
                          size="small"
                          value={eq.fecha_activacion || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEquipos(prev => prev.map(x => x.id === eq.id ? { ...x, fecha_activacion: val || null } : x));
                          }}
                          onBlur={(e) => guardarFechaActivacion(eq, e.target.value)}
                          InputLabelProps={{ shrink: true }}
                        />
                      </TableCell>
                      <TableCell>
                        {bloqueadoEstatusInicial ? (
                          <Box
                            component="span"
                            sx={{
                              display: 'inline-block',
                              px: 1,
                              py: '2px',
                              borderRadius: 1,
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#fff',
                              backgroundColor: '#2e7d32',
                            }}
                          >
                            IMEI activo
                          </Box>
                        ) : (
                          <TextField
                            type="date"
                            size="small"
                            value={eq.fecha_estatus_inicial || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEquipos(prev => prev.map(x => x.id === eq.id ? { ...x, fecha_estatus_inicial: val || null } : x));
                            }}
                            onBlur={(e) => guardarFechaEstatusInicial(eq, e.target.value)}
                            InputLabelProps={{ shrink: true }}
                          />
                        )}
                      </TableCell>
                      <TableCell>{eq.numero_linea || "—"}</TableCell>
                      <TableCell>
                        {infoClasif ? (
                          <Box
                            component="span"
                            sx={{
                              display: 'inline-block',
                              px: 1,
                              py: '2px',
                              borderRadius: 1,
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#fff',
                              backgroundColor: infoClasif.color,
                            }}
                          >
                            {infoClasif.label}
                          </Box>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={eq.cumple_arl === true}
                          onChange={(e) => guardarCumpleArl(eq, e.target.checked)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Container>
  );
};

export default EquiposTelcel;
