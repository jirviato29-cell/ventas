import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  MenuItem,
  CircularProgress
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import Autocomplete from "@mui/material/Autocomplete";
import axios from "axios";

interface ItemEntrada {
  producto_id: number;
  producto: string;
  clave: string;
  cantidad: number;
  existencia_actual: number;
}

const EntradaMercancia = () => {

  // 🔐 AUTH
  const token = localStorage.getItem("token");
  const config = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };

  // 🏪 MODULOS
  const [modulos, setModulos] = useState<any[]>([]);
  const [moduloSeleccionado, setModuloSeleccionado] = useState<number | "">("");

  // 🔍 BUSQUEDA
  const [busquedaEntrada, setBusquedaEntrada] = useState("");
  const [productoEntrada, setProductoEntrada] = useState<any | null>(null);
  const [opcionesProductos, setOpcionesProductos] = useState<any[]>([]);
  const [loadingBusqueda, setLoadingBusqueda] = useState(false);

  // 📦 ENTRADA
  const [cantidadEntrada, setCantidadEntrada] = useState("");
  const [entradaLista, setEntradaLista] = useState<ItemEntrada[]>([]);
  const [guardandoEntrada, setGuardandoEntrada] = useState(false);
  const [existenciaActual, setExistenciaActual] = useState<number>(0);

  const inputCantidadRef = useRef<HTMLInputElement>(null);
  const inputBusquedaRef = useRef<HTMLInputElement>(null);

  // 📥 CARGAR MODULOS
  const cargarModulos = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/registro/modulos`,
        config
      );
      setModulos(res.data);
    } catch (err) {
      alert("Error al cargar módulos");
    }
  };

  useEffect(() => {
    cargarModulos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔍 BUSCAR PRODUCTOS
  const buscarProductosEntrada = async (texto: string) => {
    setBusquedaEntrada(texto);

    if (!texto || texto.length < 2) {
      setOpcionesProductos([]);
      return;
    }

    if (!moduloSeleccionado) {
      return;
    }

    try {
      setLoadingBusqueda(true);

      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/inventario/inventario/buscar-autocomplete`,
        {
          params: {
            modulo_id: moduloSeleccionado,
            q: texto
          },
          ...config
        }
      );

      setOpcionesProductos(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBusqueda(false);
    }
  };

  // 📊 EXISTENCIA ACTUAL
  const obtenerExistenciaModulo = async (clave: string) => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/inventario/inventario/modulo/${moduloSeleccionado}/existencia`,
        {
          params: { clave },
          ...config
        }
      );

      return res.data.existencia_actual;
    } catch {
      return 0;
    }
  };

  // ➕ AGREGAR A LISTA
  const agregarEntrada = () => {
    if (!moduloSeleccionado) {
      alert("Selecciona un módulo");
      return;
    }

    if (!productoEntrada) {
      alert("Selecciona un producto");
      return;
    }

    const cantidad = parseInt(cantidadEntrada, 10);

    if (isNaN(cantidad) || cantidad <= 0) {
      alert("Cantidad inválida");
      return;
    }

    setEntradaLista(prev => {
      const index = prev.findIndex(p => p.clave === productoEntrada.clave);

      const nuevoItem: ItemEntrada = {
        producto_id: productoEntrada.id,
        producto: productoEntrada.producto,
        clave: productoEntrada.clave,
        cantidad,
        existencia_actual: existenciaActual
      };

      if (index !== -1) {
        const copy = [...prev];
        copy[index].cantidad += cantidad;
        return copy;
      }

      return [...prev, nuevoItem];
    });

    setProductoEntrada(null);
    setCantidadEntrada("");
    setBusquedaEntrada("");

    setTimeout(() => {
   inputBusquedaRef.current?.focus();
   inputBusquedaRef.current?.click();
}, 100);
  };

  // 💾 GUARDAR EN BD
  const guardarEntradaMercancia = async () => {
    if (!moduloSeleccionado) {
      alert("Selecciona un módulo");
      return;
    }

    if (entradaLista.length === 0) {
      alert("No hay productos en la lista");
      return;
    }

    setGuardandoEntrada(true);

    try {
      const payload = {
        modulo_id: moduloSeleccionado,
        productos: entradaLista.map(p => ({
          producto_id: p.producto_id,
          cantidad: p.cantidad
        }))
      };

      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/inventario/inventario/entrada_mercancia`,
        payload,
        config
      );

      if (res.data.ok) {
        alert("Entrada registrada correctamente");
        setEntradaLista([]);
      } else {
        alert("Error inesperado");
      }
    } catch (err) {
      alert("Error al guardar entrada");
    } finally {
      setGuardandoEntrada(false);
    }
  };

  const opcionesOrdenadas = [...opcionesProductos].sort((a, b) =>
    a.clave.localeCompare(b.clave, "es", { numeric: true, sensitivity: "base" })
  );
  if (opcionesOrdenadas.length > 0) {
    console.log("[EntradaMercancia] opciones:", opcionesOrdenadas.map((o) => o.clave));
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" mb={3}>
        Entrada de mercancía
      </Typography>

      {/* 🏪 MODULO */}
      <TextField
        select
        label="Selecciona módulo"
        value={moduloSeleccionado}
        onChange={(e) =>
          setModuloSeleccionado(
            e.target.value === "" ? "" : Number(e.target.value)
          )
        }
        fullWidth
        sx={{ mb: 3 }}
      >
        {modulos.map((m) => (
          <MenuItem key={m.id} value={m.id}>
            {m.nombre}
          </MenuItem>
        ))}
      </TextField>

      {/* 🔍 AUTOCOMPLETE */}
      <Autocomplete
        options={opcionesOrdenadas}
        filterOptions={(x) => x}
        loading={loadingBusqueda}
        value={productoEntrada}
        inputValue={busquedaEntrada}
        onChange={async (e, value) => {
          setProductoEntrada(value);

          if (!value) return;

          const existencia = await obtenerExistenciaModulo(value.clave);
          setExistenciaActual(existencia);

          setTimeout(() => {
            inputCantidadRef.current?.focus();
            
          }, 100);
        }}
        onInputChange={(e, value) => {
          buscarProductosEntrada(value);
        }}
        getOptionLabel={(option) =>
          `${option.clave} - ${option.producto}`
        }
        renderInput={(params) => (
  <TextField
    {...params}
    label="Buscar producto"
    fullWidth
    inputRef={inputBusquedaRef}
    onKeyDown={(e) => {
      if (e.key === "Enter" && opcionesOrdenadas.length > 0) {
        e.preventDefault();

        const primero = opcionesOrdenadas[0];

        setProductoEntrada(primero);

        // cargar existencia
        obtenerExistenciaModulo(primero.clave).then((existencia) => {
          setExistenciaActual(existencia);
        });

        // mover foco a cantidad
        setTimeout(() => {
          inputCantidadRef.current?.focus();
        }, 100);
      }
    }}
    InputProps={{
      ...params.InputProps,
      endAdornment: (
        <>
          {loadingBusqueda && <CircularProgress size={20} />}
          {params.InputProps.endAdornment}
        </>
      ),
    }}
  />
)}
      />

      {/* ➕ AGREGAR */}
      {productoEntrada && (
        <Box mt={2}>
          <Typography>
            <strong>Producto:</strong> {productoEntrada.clave} ({productoEntrada.producto})
          </Typography>

          <Typography>
            <strong>Existencia actual:</strong> {existenciaActual}
          </Typography>

          <TextField
            label="Cantidad recibida"
            type="number"
            value={cantidadEntrada}
            inputRef={inputCantidadRef}
            onChange={(e) => setCantidadEntrada(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                agregarEntrada();
              }
            }}
            sx={{ mt: 2, width: 200 }}
          />

          <Button
            variant="contained"
            sx={{ ml: 2, mt: 2 }}
            onClick={agregarEntrada}
          >
            Agregar
          </Button>
        </Box>
      )}

      {/* 📋 TABLA */}
      {entradaLista.length > 0 && (
        <Box mt={4} id="area-impresion">
          <Typography><strong>Productos agregados:</strong></Typography>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Clave</TableCell>
                <TableCell>Producto</TableCell>
                <TableCell align="right">Cantidad</TableCell>
                <TableCell align="right">Existencia actual</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {entradaLista.map((p, idx) => (
                <TableRow key={idx}>
                  <TableCell>{p.clave}</TableCell>
                  <TableCell>{p.producto}</TableCell>
                  <TableCell align="right">{p.cantidad}</TableCell>
                  <TableCell align="right">{p.existencia_actual}</TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() =>
                        setEntradaLista(prev => prev.filter((_, i) => i !== idx))
                      }
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Box mt={2}>
            <Button
              variant="contained"
              color="success"
              onClick={guardarEntradaMercancia}
              disabled={guardandoEntrada}
            >
              Guardar entrada
            </Button>
          </Box>
          <Box mt={2}>
            <Button
              variant="outlined"
              sx={{ ml: 2 }}
              onClick={() => window.print()}
            >
              Imprimir
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default EntradaMercancia;