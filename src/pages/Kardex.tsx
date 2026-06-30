import axios from "axios";
import * as XLSX from "xlsx";
import {
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Typography,
  TextField, Button, Box, MenuItem, FormControl, InputLabel, Select, TablePagination,
  Autocomplete
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { obtenerRolDesdeToken } from "../components/Token";
import { InventarioGeneral } from "../Types";

interface Kardex {
  id: number;
  producto: string;
  tipo_producto: string;
  cantidad: number;
  tipo_movimiento: string;
  modulo_origen?: string;
  modulo_destino?: string;
  modulo_origen_id?: number | null;
  modulo_destino_id?: number | null;
  fecha: string;
}

const Kardex = () => {

  const [data, setData] = useState<Kardex[]>([]);
  const token = localStorage.getItem('token');

  // Solo etiqueta visual: el valor real sigue siendo CONTEO_FISICO
  const etiquetaMovimiento = (m: string) =>
    m === "CONTEO_FISICO" ? "HICIERON INVENTARIO" : m;


  // filtros
  const [producto, setProducto] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [modulos, setModulos] = useState<any[]>([]);
  const [moduloId, setModuloId] = useState("");
  const [tipoMovimiento, setTipoMovimiento] = useState("");
  const [productosCatalogo, setProductosCatalogo] = useState<InventarioGeneral[]>([]);
  const [existenciaActual, setExistenciaActual] = useState<number | null>(null);
  // snapshot del producto/modulo con que se hizo la ultima carga (no los filtros vivos)
  const [productoCargado, setProductoCargado] = useState("");
  const [moduloCargado, setModuloCargado] = useState("");

  // modo saldo: derivado del SNAPSHOT de la carga, no de los filtros vivos
  const modoSaldo = !!(productoCargado && moduloCargado && existenciaActual != null);

  // const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
  const rolToken = obtenerRolDesdeToken();
  const [pagina, setPagina] = useState(0);
  const filasPorPagina = 20;

  const config = {
    headers: { Authorization: `Bearer ${token}` }
  };

  const cargarKardex = async () => {

    let params: any = {};

    if (producto) params.producto = producto;
    if (fechaInicio) params.fecha_inicio = fechaInicio;
    if (fechaFin) params.fecha_fin = fechaFin;
    if (moduloId) params.modulo_id = moduloId;
    if (tipoMovimiento) params.tipo_movimiento = tipoMovimiento;
    if (producto) params.limit = 100000; // histórico completo en modo saldo

    const res = await axios.get(
      `https://ato-appservidor-nvxt.onrender.com/kardex/kardex`,
      { ...config, params }
    );

    setData(res.data);

    // saldo corriente: existencia de HOY del producto en el modulo.
    // Encargado no tiene selector de modulo: el backend lo resuelve y lo devuelve.
    if (producto && (moduloId || rolToken === "encargado")) {
      try {
        const paramsEx: any = { producto };
        if (moduloId) paramsEx.modulo_id = moduloId; // admin manda modulo; encargado lo deja al backend
        const resEx = await axios.get(
          `https://ato-appservidor-nvxt.onrender.com/kardex/existencia`,
          { ...config, params: paramsEx }
        );
        setExistenciaActual(resEx.data?.existencia ?? null);
        // snapshot: usa el modulo REAL que devolvio el backend (sirve para admin y encargado)
        setModuloCargado(String(resEx.data?.modulo_id ?? ""));
        setProductoCargado(producto);
      } catch {
        setExistenciaActual(null);
        setProductoCargado("");
        setModuloCargado("");
      }
    } else {
      setExistenciaActual(null);
      setProductoCargado("");
      setModuloCargado("");
    }
  };

  const cargarModulos = async () => {
  const res = await axios.get(
    `https://ato-appservidor-nvxt.onrender.com/registro/modulos`,
    config
  );
  setModulos(res.data);
};

  const cargarProductosCatalogo = async () => {
    const res = await axios.get(
      `https://ato-appservidor-nvxt.onrender.com/inventario/inventario/general`,
      config
    );
    setProductosCatalogo(res.data);
  };

  useEffect(() => {
    cargarKardex();
    cargarModulos();
    cargarProductosCatalogo();
  }, []);

  // Vista de saldo (formato Admipaq): orden cronologico ascendente, con
  // entrada/salida y saldo corriente reconstruido hacia ARRIBA desde la
  // existencia real de hoy (ultima fila = mas nueva = existenciaActual).
  const vistaSaldo = useMemo(() => {
    if (!modoSaldo || existenciaActual == null) return null;

    const modSel = Number(moduloCargado);

    const deltaDe = (row: Kardex): number => {
      if (row.tipo_movimiento === "CONTEO_FISICO" && row.modulo_origen_id === modSel) {
        return row.cantidad; // cantidad ya viene firmada
      }
      if (row.modulo_destino_id === modSel) return row.cantidad;
      if (row.modulo_origen_id === modSel) return -row.cantidad;
      return 0;
    };

    // data viene DESC del backend; invertimos para orden cronologico ascendente
    const filas = [...data].reverse();
    const n = filas.length;

    // saldo DESPUES de cada movimiento, reconstruido de abajo hacia arriba
    const saldoDespues: number[] = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
      saldoDespues[i] =
        i === n - 1 ? existenciaActual : saldoDespues[i + 1] - deltaDe(filas[i + 1]);
    }

    // saldo antes del primer movimiento (con cuantos inicias)
    const saldoInicial = n > 0 ? saldoDespues[0] - deltaDe(filas[0]) : existenciaActual;

    let totalEntradas = 0;
    let totalSalidas = 0;
    const rows = filas.map((row, i) => {
      const d = deltaDe(row);
      if (d > 0) totalEntradas += d;
      if (d < 0) totalSalidas += Math.abs(d);
      return {
        row,
        entrada: d > 0 ? d : null,
        salida: d < 0 ? Math.abs(d) : null,
        saldo: saldoDespues[i],
      };
    });

    return { rows, saldoInicial, totalEntradas, totalSalidas };
  }, [data, existenciaActual, moduloCargado, modoSaldo]);

  // Cuadre del periodo filtrado: suma cantidad por tipo_movimiento respetando el modulo
  const resumen = useMemo(() => {
    if (!modoSaldo) return null;
    const modSel = Number(moduloCargado);
    const afectaModulo = (row: Kardex) =>
      row.modulo_origen_id === modSel || row.modulo_destino_id === modSel;

    let entradas = 0, ventas = 0, cancelaciones = 0;
    let traspasosRecibidos = 0, traspasosEnviados = 0;
    let ajustesPos = 0, ajustesNeg = 0, conteo = 0;

    for (const row of data) {
      switch (row.tipo_movimiento) {
        case "ENTRADA":
          if (row.modulo_destino_id === modSel) entradas += row.cantidad;
          break;
        case "VENTA":
          if (row.modulo_origen_id === modSel) ventas += row.cantidad;
          break;
        case "CANCELACION_VENTA":
          if (afectaModulo(row)) cancelaciones += row.cantidad;
          break;
        case "TRASPASO_ENTRADA":
          if (row.modulo_destino_id === modSel) traspasosRecibidos += row.cantidad;
          break;
        case "TRASPASO_SALIDA":
          if (row.modulo_origen_id === modSel) traspasosEnviados += row.cantidad;
          break;
        case "AJUSTE_POSITIVO":
          if (afectaModulo(row)) ajustesPos += row.cantidad;
          break;
        case "AJUSTE_NEGATIVO":
          if (afectaModulo(row)) ajustesNeg += row.cantidad;
          break;
        case "CONTEO_FISICO":
          // suma firmada: cantidad ya viene con signo
          if (row.modulo_origen_id === modSel) conteo += row.cantidad;
          break;
      }
    }

    return {
      entradas, ventas, cancelaciones, traspasosRecibidos,
      traspasosEnviados, ajustesPos, ajustesNeg, conteo,
    };
  }, [data, moduloCargado, modoSaldo]);

  // Nombre legible del modulo cargado (para titulo del cuadro y del Excel)
  const nombreModuloCargado = useMemo(
    () => modulos.find((m) => String(m.id) === String(moduloCargado))?.nombre ?? moduloCargado,
    [modulos, moduloCargado]
  );

  // Exporta a .xlsx exactamente lo que se ve en la tabla Admipaq (sin endpoint nuevo)
  const descargarExcel = () => {
    if (!vistaSaldo) return;
    const encabezado = ["Fecha", "Producto", "Movimiento", "Entrada", "Salida", "Existencia"];
    const filas: (string | number)[][] = [];
    filas.push(["Con cuántos inicias", "", "", "", "", vistaSaldo.saldoInicial]);
    for (const { row, entrada, salida, saldo } of vistaSaldo.rows) {
      filas.push([
        new Date(row.fecha).toLocaleDateString("es-MX"),
        row.producto,
        etiquetaMovimiento(row.tipo_movimiento),
        entrada ?? "",
        salida ?? "",
        saldo,
      ]);
    }
    filas.push(["Totales", "", "", vistaSaldo.totalEntradas, vistaSaldo.totalSalidas, ""]);

    const ws = XLSX.utils.aoa_to_sheet([encabezado, ...filas]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kardex");
    const nombre =
      `Kardex_${productoCargado}_${nombreModuloCargado}_${fechaInicio || "inicio"}_${fechaFin || "fin"}.xlsx`;
    XLSX.writeFile(wb, nombre);
  };

  // Lineas divisorias tipo Admipaq (solo modo saldo)
  const sxBorde = { border: "1px solid #ddd" };

  return (
    <>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Filtros</Typography>

        <Box display="flex" gap={2} mt={2} flexWrap="wrap">

          {rolToken === "admin" && (
            <TextField
              select
              label="Módulo"
              value={moduloId}
              onChange={(e) => setModuloId(e.target.value)}
              size="small"
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">Todos</MenuItem>

              {modulos.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.nombre}
                </MenuItem>
              ))}
            </TextField>
          )}
          <Autocomplete<InventarioGeneral>
            sx={{ minWidth: 240 }}
            options={[...productosCatalogo].sort((a, b) =>
              a.producto.localeCompare(b.producto, "es")
            )}
            value={productosCatalogo.find((p) => p.producto === producto) ?? null}
            filterOptions={(opts, { inputValue }) => {
              const q = inputValue.toLowerCase();
              return opts.filter(
                (p) =>
                  (p.clave ?? "").toLowerCase().includes(q) ||
                  p.producto.toLowerCase().includes(q)
              );
            }}
            getOptionLabel={(p) => (p.clave ? `${p.clave} - ${p.producto}` : p.producto)}
            onChange={(_, obj) => {
              if (obj) {
                setProducto(obj.producto);
              } else {
                setProducto("");
              }
            }}
            renderInput={(params) => (
              <TextField {...params} label="Producto" size="small" />
            )}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Movimiento</InputLabel>

            <Select
              value={tipoMovimiento}
              label="Movimiento"
              onChange={(e) => setTipoMovimiento(e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="ENTRADA">Entrada</MenuItem>
              <MenuItem value="VENTA">Venta</MenuItem>
              <MenuItem value="TRASPASO_ENTRADA">Traspaso Entrada</MenuItem>
              <MenuItem value="TRASPASO_SALIDA">Traspaso Salida</MenuItem>
              <MenuItem value="CANCELACION_VENTA">Cancelación</MenuItem>
            </Select>

          </FormControl>

          <TextField
            label="Fecha inicio"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            size="small"
          />

          <TextField
            label="Fecha fin"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            size="small"
          />

          <Button
            variant="contained"
            onClick={cargarKardex}
          >
            Buscar
          </Button>

        </Box>
      </Paper>

      {modoSaldo && resumen && vistaSaldo && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Typography variant="h6">
              Cuadre del periodo — {productoCargado} / {nombreModuloCargado}
            </Typography>
            <Button variant="outlined" onClick={descargarExcel}>
              Descargar Excel
            </Button>
          </Box>

          <Box mt={2} sx={{ maxWidth: 360 }}>
            {[
              ["Iniciaste con:", vistaSaldo.saldoInicial],
              ["Entraron (entradas):", resumen.entradas],
              ["Vendiste (ventas):", resumen.ventas],
              ["Cancelaste (cancelaciones):", resumen.cancelaciones],
              ["Traspasos recibidos:", resumen.traspasosRecibidos],
              ["Traspasos enviados:", resumen.traspasosEnviados],
              ["Ajustes (+):", resumen.ajustesPos],
              ["Ajustes (−):", resumen.ajustesNeg],
              ["Inventarios (conteo):", resumen.conteo],
              ["Deberías tener:", existenciaActual],
            ].map(([etiqueta, valor]) => (
              <Box
                key={etiqueta as string}
                display="flex"
                justifyContent="space-between"
                sx={{ py: 0.25 }}
              >
                <span>{etiqueta}</span>
                <strong>{valor as number}</strong>
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      <TableContainer component={Paper}>
        <Typography variant="h6" sx={{ p: 2 }}>
          Historial Kardex
        </Typography>

        <Table size="small">
          <TableHead>
            <TableRow>
              {modoSaldo ? (
                <>
                  <TableCell sx={sxBorde}>Fecha</TableCell>
                  <TableCell sx={sxBorde}>Producto</TableCell>
                  <TableCell sx={sxBorde}>Movimiento</TableCell>
                  <TableCell sx={sxBorde}>Entrada</TableCell>
                  <TableCell sx={sxBorde}>Salida</TableCell>
                  <TableCell sx={sxBorde}>Existencia</TableCell>
                </>
              ) : (
                <>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Producto</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Movimiento</TableCell>
                  <TableCell>Cantidad</TableCell>
                </>
              )}
            </TableRow>
          </TableHead>

          <TableBody>
            {modoSaldo && vistaSaldo ? (
              <>
                {/* Con cuantos inicias */}
                <TableRow>
                  <TableCell sx={sxBorde}>Con cuántos inicias</TableCell>
                  <TableCell sx={sxBorde} />
                  <TableCell sx={sxBorde} />
                  <TableCell sx={sxBorde} />
                  <TableCell sx={sxBorde} />
                  <TableCell sx={sxBorde}>{vistaSaldo.saldoInicial}</TableCell>
                </TableRow>

                {vistaSaldo.rows.map(({ row, entrada, salida, saldo }) => (
                  <TableRow key={row.id}>
                    <TableCell sx={sxBorde}>
                      {new Date(row.fecha).toLocaleDateString("es-MX")}
                    </TableCell>
                    <TableCell sx={sxBorde}>{row.producto}</TableCell>
                    <TableCell sx={sxBorde}>{etiquetaMovimiento(row.tipo_movimiento)}</TableCell>
                    <TableCell sx={sxBorde}>{entrada ?? ""}</TableCell>
                    <TableCell sx={sxBorde}>{salida ?? ""}</TableCell>
                    <TableCell sx={sxBorde}>{saldo}</TableCell>
                  </TableRow>
                ))}

                {/* Totales */}
                <TableRow>
                  <TableCell sx={sxBorde}>Totales</TableCell>
                  <TableCell sx={sxBorde} />
                  <TableCell sx={sxBorde} />
                  <TableCell sx={sxBorde}>{vistaSaldo.totalEntradas}</TableCell>
                  <TableCell sx={sxBorde}>{vistaSaldo.totalSalidas}</TableCell>
                  <TableCell sx={sxBorde} />
                </TableRow>
              </>
            ) : (
              data.slice(pagina * filasPorPagina, pagina * filasPorPagina + filasPorPagina).map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    {new Date(row.fecha).toLocaleDateString("es-MX")}
                  </TableCell>

                  <TableCell>{row.producto}</TableCell>
                  <TableCell>{row.tipo_producto}</TableCell>
                  <TableCell>{etiquetaMovimiento(row.tipo_movimiento)}</TableCell>
                  <TableCell>{row.cantidad}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

      </TableContainer>
      {!modoSaldo && (
        <TablePagination
          component="div"
          count={data.length}
          page={pagina}
          onPageChange={(_, p) => setPagina(p)}
          rowsPerPage={filasPorPagina}
          rowsPerPageOptions={[filasPorPagina]}
        />
      )}
    </>
  );
};

export default Kardex;