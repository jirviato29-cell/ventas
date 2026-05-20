import React, { useEffect, useState, useRef } from 'react';
import {
  Container, Typography, TextField, Button, MenuItem, Table, TableHead,
  TableRow, TableCell, TableBody, Paper, IconButton, Box, TableContainer,
  Select, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { Edit, Delete, Save } from '@mui/icons-material';
import axios from 'axios';
import { InventarioModulo, Modulo } from '../Types';
import Autocomplete from '@mui/material/Autocomplete';
import { CircularProgress } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { obtenerRolDesdeToken } from '../components/Token';



interface ConteoItem {
  producto: string;
  clave: string;
  cantidad: number;
  existencia_actual?: number;
  producto_id?: number;
}

const InventarioPorModulo = () => {
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [moduloSeleccionado, setModuloSeleccionado] = useState<number | ''>('');
  const [filtro, setFiltro] = useState('');
  const [inventario, setInventario] = useState<InventarioModulo[]>([]);
  const [nuevo, setNuevo] = useState({ producto: '', clave: '', cantidad: '', precio: '' });
  const [tipo, setTipo] = useState<'producto' | 'telefono'>('producto');
  const [nuevoTelefono, setNuevoTelefono] = useState({ producto: '', clave: '', cantidad: '', precio: '', marca: '', modelo: '' });
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [nuevaCantidad, setNuevaCantidad] = useState<string>("");
  const [editando, setEditando] = useState<string | null>(null);
  const [editarData, setEditarData] = useState({ cantidad: '', precio: '' });
  const [modificaciones, setModificaciones] = useState<{ id: number; producto: string; cantidad: number }[]>([]);

  // Conteo físico states
  const [busquedaClave, setBusquedaClave] = useState<string>("");
  const [productoEncontrado, setProductoEncontrado] = useState<any | null>(null);
  const [cantidadConteo, setCantidadConteo] = useState<string>("");
  const [conteoLista, setConteoLista] = useState<ConteoItem[]>([]);
  const [editarIndex, setEditarIndex] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  type ModoOperacion = 'normal' | 'conteo';
  const [modo, setModo] = useState<ModoOperacion>('normal');

const [productoConteo, setProductoConteo] = useState<any | null>(null);

const inputClaveRef = useRef<HTMLInputElement>(null);
const [textoBusquedaConteo, setTextoBusquedaConteo] = useState("");
const [opcionesConteo, setOpcionesConteo] = useState<any[]>([]);
const [loadingConteo, setLoadingConteo] = useState(false);


const [previewValido, setPreviewValido] = useState<any[]>([]);
const [previewErrores, setPreviewErrores] = useState<any[]>([]);
const [mostrandoPreview, setMostrandoPreview] = useState(false);
const [cargandoPreview, setCargandoPreview] = useState(false);
const [productosValidos, setProductosValidos] = useState<any[]>([]);
const [erroresExcel, setErroresExcel] = useState<any[]>([]);
const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);

const [esAdmin, setEsAdmin] = useState(false);


const inputBusquedaRef = useRef<HTMLInputElement>(null);
const inputCantidadRef = useRef<HTMLInputElement>(null);


  const token = localStorage.getItem("token");
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const cargarModulos = async () => {
    const res = await axios.get(`${process.env.REACT_APP_API_URL}/registro/modulos`, config);
    setModulos(res.data);
  };

  const cargarInventario = async () => {
    if (!moduloSeleccionado) return;
    const res = await axios.get(`${process.env.REACT_APP_API_URL}/inventario/inventario/modulo?modulo_id=${moduloSeleccionado}`, config);
    setInventario(res.data);
  };

  const agregarProducto = async () => {
    try {
      if (tipo === 'producto') {
        await axios.post(`${process.env.REACT_APP_API_URL}/inventario/inventario/modulo`, {
          producto: nuevo.producto,
          clave: nuevo.clave,
          cantidad: parseInt(nuevo.cantidad),
          precio: parseFloat(nuevo.precio),
          tipo_producto: 'accesorios',
          modulo_id: moduloSeleccionado,
        }, config);
      } else {
        await axios.post(`${process.env.REACT_APP_API_URL}/inventario/inventario/modulo`, {
          producto: nuevo.producto,
          clave: nuevo.clave,
          cantidad: parseInt(nuevo.cantidad),
          precio: parseFloat(nuevo.precio),
          tipo_producto: 'telefono',
          modulo_id: moduloSeleccionado,
        }, config);
      }

      setNuevoTelefono({ producto: '', clave: '', cantidad: '', precio: '', marca: '', modelo: '' });
      cargarInventario();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al agregar");
    }
  };
const congelarInventario = async () => {
  if (!moduloSeleccionado) {
    alert("Selecciona un módulo primero");
    return;
  }

  try {
    const response = await axios.get(
      `${process.env.REACT_APP_API_URL}/inventario/inventario/congelar/${moduloSeleccionado}`,
      {
        ...config,
        responseType: 'blob'
      }
    );

    // Descargar Excel
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');

    link.href = url;
    link.setAttribute('download', `inventario_modulo_${moduloSeleccionado}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    alert("Inventario congelado correctamente. Todo se ha puesto en 0.");

    setModo('conteo');
    
// ✅ AQUÍ SE ACTIVA EL CONTEO FÍSICO

    cargarInventario();
  } catch (err) {
    alert("Error al congelar inventario");
  }
};


const buscarProductosConteo = async (texto: string) => {
  setTextoBusquedaConteo(texto);

  if (!texto || texto.length < 2 || !moduloSeleccionado) {
    setOpcionesConteo([]);
    return;
  }

  try {
    setLoadingConteo(true);
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

    setOpcionesConteo(res.data);
  } catch (err) {
    console.error(err);
  } finally {
    setLoadingConteo(false);
  }
};


  const agregarAConteo = () => {
    if (!productoEncontrado) {
      alert("Primero busca un producto");
      return;
    }

    if (!productoEncontrado.clave) {
      alert("Producto inválido (sin clave)");
      return;
    }

    const cantidad = parseInt(cantidadConteo, 10);
    if (Number.isNaN(cantidad) || cantidad < 0) {
      alert("Ingresa una cantidad válida (>= 0)");
      return;
    }

    const nuevaFila: ConteoItem = {
      clave: productoEncontrado.clave, // ✅ CLAVE ES LA BASE
      producto: productoEncontrado.producto,
      cantidad
    };

    if (editarIndex !== null) {
      setConteoLista(prev => {
        const copy = [...prev];
        copy[editarIndex] = nuevaFila;
        return copy;
      });
      setEditarIndex(null);
    } else {
      const existingIndex = conteoLista.findIndex(
        p => p.clave === productoEncontrado.clave
      );

      if (existingIndex !== -1) {
        setConteoLista(prev => {
          const copy = [...prev];
          copy[existingIndex] = nuevaFila;
          return copy;
        });
      } else {
        setConteoLista(prev => [...prev, nuevaFila]);
      }
    }

    setProductoEncontrado(null);
    setProductoConteo(null);
    setCantidadConteo("");
    setTextoBusquedaConteo("");
    setOpcionesConteo([]);

    setTimeout(() => {
      inputBusquedaRef.current?.focus();
    }, 100);
  };


  const editarFila = (idx: number) => {
    const fila = conteoLista[idx];

    setProductoEncontrado({
      clave: fila.clave,       // ✅ ya no hay id
      producto: fila.producto
    });

  setCantidadConteo(String(fila.cantidad));
  setEditarIndex(idx);
};

  const eliminarFila = (idx: number) => {
    if (!window.confirm("Eliminar este producto del conteo?")) return;
    setConteoLista(prev => prev.filter((_, i) => i !== idx));
  };

  const guardarConteo = async () => {
    if (conteoLista.length === 0) {
      alert("No has agregado productos al conteo");
      return;
    }

    setConfirmOpen(true);
  };

  const confirmarGuardar = async () => {
  setConfirmOpen(false);
  setGuardando(true);

  try {
    const payload = {
      modulo_id: moduloSeleccionado,
      productos: conteoLista.map(p => ({
        clave: p.clave,        // ✅ CAMBIO CLAVE
        cantidad: p.cantidad
      }))
    };

    const res = await axios.post(
      `${process.env.REACT_APP_API_URL}/inventario/guardar_conteo`,
      payload,
      config
    );

    if (res.data && res.data.ok) {
      alert("Inventario actualizado con éxito");
      setConteoLista([]);
      cargarInventario();
    } else {
      alert("Respuesta inesperada del servidor");
    }
  } catch (err) {
    console.error(err);
    alert("Error al guardar conteo");
  } finally {
    setGuardando(false);
  }
};


  const manejarPreviewExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const archivo = e.target.files?.[0];
  if (!archivo) return;

  setArchivoSeleccionado(archivo); // 🔥 ESTA ES LA CLAVE

  const formData = new FormData();
  formData.append("archivo", archivo);
  formData.append("modulo_id", moduloSeleccionado.toString());

  const res = await axios.post(
    `${process.env.REACT_APP_API_URL}/inventario/preview_excel`,
    formData,
    {
      headers: {
        ...config.headers,
        "Content-Type": "multipart/form-data",
      },
    }
  );

  setPreviewValido(res.data.validas);
  setPreviewErrores(res.data.errores);
  setMostrandoPreview(true);
};



  const manejarArchivoExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!moduloSeleccionado) {
      alert("Primero selecciona un módulo.");
      return;
    }

    const archivo = e.target.files?.[0];
    if (!archivo) return;

    const formData = new FormData();
    formData.append("archivo", archivo);
    formData.append("modulo_id", moduloSeleccionado.toString());

    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/inventario/actualizar_inventario_excel`,
        formData,
        {
          headers: {
            ...config.headers,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      alert(res.data.message);
      cargarInventario(); // recargar datos actualizados
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al procesar el archivo Excel");
    }

    // Limpiar input
    e.target.value = "";
  };

  const actualizarCantidad = async () => {
    if (!selectedItem) {
      alert("Selecciona un producto de la tabla primero");
      return;
    }

    try {
      await axios.put(
        `${process.env.REACT_APP_API_URL}/inventario/inventario/modulo/${encodeURIComponent(selectedItem.producto)}`,
        { cantidad: parseInt(nuevaCantidad), modulo_id: moduloSeleccionado },
        config
      );
      setNuevaCantidad("");
      setSelectedItem(null);
      cargarInventario();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al actualizar cantidad");
    }
  };

  const guardarEdicion = async (producto: string) => {
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/inventario/inventario/modulo/${encodeURIComponent(producto)}`, {
        cantidad: parseInt(editarData.cantidad),
        precio: parseFloat(editarData.precio),
        modulo_id: moduloSeleccionado
      }, config);
      setEditando(null);
      cargarInventario();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al editar");
    }
  };

  const eliminarProducto = async (id: number) => {
    if (!window.confirm("¿Eliminar este producto del módulo?")) return;
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/inventario/inventario/modulo/${id}?modulo=${moduloSeleccionado}`, config);
      cargarInventario();
    } catch {
      alert("Error al eliminar");
    }
  };

  const productosFiltrados = inventario.filter((p) =>
    p.producto.toLowerCase().includes(filtro.toLowerCase())
  );







const descargarInventario = async () => {
  if (!moduloSeleccionado) {
    alert("Selecciona un módulo primero");
    return;
  }

  try {
    const res = await axios.get(
      `${process.env.REACT_APP_API_URL}/inventario/inventario/descargar/${moduloSeleccionado}`,
      {
        ...config,
        responseType: "blob"
      }
    );

    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute(
      "download",
      `inventario_modulo_${moduloSeleccionado}.xlsx`
    );

    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (err) {
    alert("Error al descargar inventario");
  }
};


const congelarInventarioConfirmado = () => {
  if (!window.confirm("¿Seguro que deseas congelar el inventario y descargar el Excel?")) {
    return;
  }
  congelarInventario();
};


const limpiarPreview = () => {
  setProductosValidos([]);
  setErroresExcel([]);
  setArchivoSeleccionado(null);
};


const confirmarImportacion = async () => {
  if (!archivoSeleccionado || !moduloSeleccionado) {
    alert("Falta el archivo o el módulo");
    return;
  }

  const formData = new FormData();
  formData.append("archivo", archivoSeleccionado);
  formData.append("modulo_id", moduloSeleccionado.toString());

  try {
    const res = await axios.post(
      `${process.env.REACT_APP_API_URL}/inventario/actualizar_inventario_excel`,
      formData,
      {
        headers: {
          ...config.headers,
          "Content-Type": "multipart/form-data",
        },
      }
    );

    alert(res.data.message);
    cargarInventario();   // refrescar vista
    limpiarPreview();     // opcional
  } catch (err: any) {
    alert(err.response?.data?.detail || "Error al importar inventario");
  }
};




  useEffect(() => {
    const rol = obtenerRolDesdeToken();
    setEsAdmin(rol === "admin");
  }, []);



  useEffect(() => {
    cargarModulos();
  }, []);

  useEffect(() => {
    cargarInventario();
  }, [moduloSeleccionado]);

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>Inventario por Módulo</Typography>

      <TextField
        select
        label="Selecciona Módulo"
        value={moduloSeleccionado}
        onChange={(e) => setModuloSeleccionado(e.target.value === '' ? '' : Number(e.target.value))}
        fullWidth
        sx={{ mb: 3 }}
      >
        {modulos.map((m) => (
          <MenuItem key={m.id} value={m.id}>{m.nombre}</MenuItem>
        ))}
      </TextField>

      <TextField
        label="Buscar producto o teléfono"
        variant="outlined"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        fullWidth
        sx={{ mb: 3 }}
      />
   {esAdmin && (
  <>
    <Box display="flex" gap={2} mb={3}>
      <TextField
        label="Nueva cantidad"
        type="number"
        value={nuevaCantidad}
        onChange={(e) => setNuevaCantidad(e.target.value)}
      />
      <Button variant="contained" onClick={actualizarCantidad}>
        Actualizar Cantidad
      </Button>
    </Box>

    <TextField
      type="file"
      inputProps={{ accept: ".xlsx,.xls" }}
      onChange={manejarPreviewExcel}
      variant="outlined"
      sx={{ mb: 3 }}
    />
  </>
)}


      {mostrandoPreview && (
  <><Box
    display="flex"
    justifyContent="center"
    mt={3}
    mb={4}
  >
    <Button
      variant="contained"
      color="success"
      size="large"
      startIcon={<CheckCircleIcon />}
      disabled={previewValido.length === 0}
      onClick={confirmarImportacion}
      sx={{
        px: 5,
        py: 1.5,
        fontSize: "1rem",
        borderRadius: 2,
        boxShadow: 3,
      }}
    >
      Confirmar importación
    </Button>
  </Box>

    <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Productos válidos ({previewValido.length})</Typography>

    <TableContainer component={Paper} sx={{ mb: 3 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Clave</TableCell>
            <TableCell>Producto</TableCell>
            <TableCell>Cantidad</TableCell>
            <TableCell>Precio</TableCell>
            <TableCell>Acción</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {previewValido.map((item, i) => (
            <TableRow key={i}>
              <TableCell>{item.clave}</TableCell>
              <TableCell>{item.producto}</TableCell>
              <TableCell>{item.cantidad}</TableCell>
              <TableCell>${item.precio}</TableCell>
              <TableCell>{item.accion}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
    </TableContainer>

    
  </>

  
)}



{previewErrores.length > 0 && (
  <>
    <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Errores ({previewErrores.length})</Typography>

    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Fila</TableCell>
            <TableCell>Clave</TableCell>
            <TableCell>Errores</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {previewErrores.map((err, i) => (
            <TableRow key={i}>
              <TableCell>{err.fila}</TableCell>
              <TableCell>{err.clave}</TableCell>
              <TableCell>{err.errores.join(", ")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </>
 )}



{esAdmin && (
  <Box display="flex" gap={2} mb={3}>
    <Button
      variant="contained"
      color="warning"
      onClick={congelarInventarioConfirmado}
    >
      Congelar Inventario (Descargar Excel)
    </Button>


    <Button
      variant="contained"
      color="primary"
      onClick={descargarInventario}
    >
      Descargar inventario (Excel)
    </Button>
  </Box>
)}

 <Button
  variant="outlined"
  onClick={() => {
    setModo('normal');
    setConteoLista([]);
    setProductoEncontrado(null);
    setBusquedaClave("");
  }}
>
  Volver a inventario
</Button>



{modo === 'conteo' &&  (
  <Box sx={{ border: "1px solid #ccc", borderRadius: 2, p: 2, mb: 4 }}>
    <Typography variant="h6">Conteo físico</Typography>

 <Autocomplete
  fullWidth
  options={opcionesConteo}
  loading={loadingConteo}
  value={productoConteo}
  inputValue={textoBusquedaConteo}
  onChange={(e, value) => {
    setProductoConteo(value);
    setProductoEncontrado(value);
  }}
  onInputChange={(e, value) => {
    setTextoBusquedaConteo(value);
    buscarProductosConteo(value);
  }}
  getOptionLabel={(option) =>
    `${option.clave} - ${option.producto}`
  }
  isOptionEqualToValue={(option, value) =>
    option.id === value.id
  }
            renderInput={(params) => (
  <TextField
    {...params}
    label="Buscar producto"
    fullWidth
    inputRef={inputBusquedaRef}
    onKeyDown={(e) => {
      if (e.key === "Enter" && opcionesConteo.length > 0) {
        e.preventDefault();

        const primero = opcionesConteo[0];

        setProductoConteo(primero);
        setProductoEncontrado(primero);

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
          {loadingConteo && <CircularProgress size={20} />}
          {params.InputProps.endAdornment}
        </>
      ),
    }}
  />
)}
/>








    {productoEncontrado && (
      <Box mt={2}>
        <Typography>
          <strong>Producto:</strong> {productoEncontrado.clave}{" "}
          {productoEncontrado.producto
            ? `(${productoEncontrado.producto})`
            : ""}
        </Typography>

              <TextField
                label="Cantidad contada"
                type="number"
                value={cantidadConteo}
                inputRef={inputCantidadRef}
                onChange={(e) => setCantidadConteo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    agregarAConteo();
                  }
                }}
                sx={{ mt: 2, width: 200 }}
              />

        <Button
          variant="contained"
          sx={{ ml: 2, mt: 2 }}
          onClick={agregarAConteo}
        >
          {editarIndex !== null ? "Guardar cambios" : "Agregar a lista"}
        </Button>
      </Box>
    )}

    {/* LISTA DE CONTEO */}
    {conteoLista.length > 0 && (
      <Box mt={3}>
        <Typography>
          <strong>Productos agregados:</strong>
        </Typography>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Clave</TableCell>
              <TableCell>Producto (ref)</TableCell>
              <TableCell align="right">Cantidad</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {conteoLista.map((p, idx) => (
              <TableRow key={idx}>
                <TableCell>{p.clave}</TableCell>
                <TableCell>{p.producto}</TableCell>
                <TableCell align="right">{p.cantidad}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => editarFila(idx)}>
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => eliminarFila(idx)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Box display="flex" gap={2} mt={2}>
          <Button
            variant="contained"
            color="success"
            onClick={guardarConteo}
            disabled={guardando}
          >
            Guardar inventario contado
          </Button>

          <Button
            variant="outlined"
            color="secondary"
            onClick={() => {
              if (!window.confirm("¿Limpiar lista de conteo?")) return;
              setConteoLista([]);
            }}
          >
            Limpiar lista
          </Button>
        </Box>
      </Box>
    )}
  </Box>
)}










      {moduloSeleccionado && (
        <>
          <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <Select value={tipo} onChange={(e) => setTipo(e.target.value as 'producto' | 'telefono')}>
          <MenuItem value="producto">Producto</MenuItem>
          <MenuItem value="telefono">Teléfono</MenuItem>
        </Select>
            
                <TextField label="Producto" value={nuevo.producto} onChange={(e) => setNuevo({ ...nuevo, producto: e.target.value })} />
                <TextField label="Clave" value={nuevo.clave} onChange={(e) => setNuevo({ ...nuevo, clave: e.target.value })} />
                  
            <TextField label="Cantidad" type="number" value={nuevo.cantidad} onChange={(e) => setNuevo({ ...nuevo, cantidad: e.target.value })} />
            <TextField label="Precio" type="number" value={nuevo.precio} onChange={(e) => setNuevo({ ...nuevo, precio: e.target.value })} />
            <Button variant="contained" onClick={agregarProducto}>Agregar</Button>
      </Box>


          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Producto</strong></TableCell>
                  <TableCell><strong>Clave</strong></TableCell>
                  <TableCell><strong>Precio</strong></TableCell>
                  <TableCell><strong>Cantidad</strong></TableCell>
                  <TableCell><strong>Acciones</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {productosFiltrados.map((item) => (
                  <TableRow
                    key={item.id}
                    hover
                    selected={selectedItem?.id === item.id}
                    onClick={() => setSelectedItem(item)}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell>{item.producto}</TableCell>
                    <TableCell>{item.clave}</TableCell>
                    <TableCell>
                      {editando === item.producto ? (
                        <TextField
                          value={editarData.precio}
                          onChange={(e) => setEditarData({ ...editarData, precio: e.target.value })}
                          size="small"
                          type="number"
                        />
                      ) : `$${item.precio}`}
                    </TableCell>
                    <TableCell>
                      {editando === item.producto ? (
                        <TextField
                          value={editarData.cantidad}
                          onChange={(e) => setEditarData({ ...editarData, cantidad: e.target.value })}
                          size="small"
                          type="number"
                        />
                      ) : item.cantidad}
                    </TableCell>
                    <TableCell>
                      {editando === item.producto ? (
                        <IconButton color="primary" onClick={() => guardarEdicion(item.producto)}>
                          <Save />
                        </IconButton>
                      ) : (
                        <IconButton color="info" onClick={() => {
                          setEditando(item.producto);
                          setEditarData({ cantidad: item.cantidad.toString(), precio: item.precio.toString() });
                        }}>
                          <Edit />
                        </IconButton>
                      )}
                      <IconButton color="error" onClick={() => eliminarProducto(item.id)}>
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Dialogo de confirmación antes de enviar a BD */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirmar guardado</DialogTitle>
        <DialogContent>
          <Typography>Vas a actualizar {conteoLista.length} registros en la base de datos. ¿Deseas continuar?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
          <Button onClick={confirmarGuardar} variant="contained" color="primary" disabled={guardando}>
            {guardando ? "Guardando..." : "Sí, guardar"}
          </Button>
        </DialogActions>
      </Dialog>

    </Container>
  );
};

export default InventarioPorModulo;


