import React, { useEffect, useState } from 'react';
import {
  Container, Typography, TextField, Button, Table, TableHead, TableRow,
  TableCell, TableBody, Paper, IconButton, Box, TableContainer, Select, MenuItem
} from '@mui/material';
import { Edit, Delete, Save } from '@mui/icons-material';
import axios from 'axios';
import { InventarioGeneral, InventarioTelefono, ProductoModulo } from '../Types';
import { useNavigate } from "react-router-dom";
import RegistroPlan from "../components/RegistroPlan";

const InventarioAdmin = () => {
  const [productos, setProductos] = useState<InventarioGeneral[]>([]);
  const [telefonos, setTelefonos] = useState<InventarioTelefono[]>([]);
  const [filtro, setFiltro] = useState('');
  const [tipo, setTipo] = useState<'producto' | 'telefono'>('producto');
  const [nuevo, setNuevo] = useState({
    producto: '', clave: '', precio: '', cantidad: '', marca: '', modelo: ''
  });
  const [editando, setEditando] = useState<string | null>(null);
  const [editarData, setEditarData] = useState({ precio: '', cantidad: '' });
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [nuevaCantidad, setNuevaCantidad] = useState<string>("");

  const [previewValido, setPreviewValido] = useState<any[]>([]);
const [previewErrores, setPreviewErrores] = useState<any[]>([]);
const [archivoExcel, setArchivoExcel] = useState<File | null>(null);
const [mostrandoPreview, setMostrandoPreview] = useState(false);

  const [buscarProductoModulo, setBuscarProductoModulo] = useState("");
  const [resultadosModulo, setResultadosModulo] = useState<ProductoModulo[]>([])


  const [empleados, setEmpleados] = useState<any[]>([]);
  const [modulos, setModulos] = useState<any[]>([]);


  const buscarEnModulos = async () => {
  const res = await axios.get(
    `https://ato-appservidor-nvxt.onrender.com/inventario/inventario/buscar-modulos?producto=${buscarProductoModulo}`,
    config
  )

  setResultadosModulo(res.data)
}


  const cargarInventario = async () => {
    const resProd = await axios.get(`https://ato-appservidor-nvxt.onrender.com/inventario/inventario/general`, config);
    setProductos(resProd.data);
    const resTel = await axios.get(`https://ato-appservidor-nvxt.onrender.com/inventario_telefonos/inventario_telefonos/general`, config);
    setTelefonos(resTel.data);
  };

  const agregar = async () => {
    try {
      if (tipo === 'producto') {
        await axios.post(`https://ato-appservidor-nvxt.onrender.com/inventario/inventario/general`, {
          producto: nuevo.producto,
          clave: nuevo.clave,
          precio: parseFloat(nuevo.precio),
          cantidad: parseInt(nuevo.cantidad),
          tipo_producto: 'producto',
        }, config);
      } else {
        await axios.post(`https://ato-appservidor-nvxt.onrender.com/inventario/inventario/general`, {
          producto: nuevo.producto,
          clave: nuevo.clave,
          precio: parseFloat(nuevo.precio),
          cantidad: parseInt(nuevo.cantidad),
          tipo_producto: 'telefono',
        }, config);
      }
      setNuevo({ producto: '', clave: '', precio: '', cantidad: '', marca: '', modelo: '' });
      cargarInventario();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al agregar");
    }
  };

  const comenzarEdicion = (item: any) => {
  setEditando(`${item.tipo}-${item.id}`);
  setEditarData({
    precio: item.precio.toString(),
    cantidad: item.cantidad.toString()
  });
};

const guardarCambios = async (item: any) => {
  try {
    
      await axios.put(`https://ato-appservidor-nvxt.onrender.com/inventario/inventario/general/${item.id}`, {
        cantidad: parseInt(editarData.cantidad)
      }, config);

    setEditando(null);
    setEditarData({ precio: '', cantidad: '' });
    cargarInventario();
  } catch (err: any) {
    alert(err.response?.data?.detail || "Error al guardar cambios");
  }
};




const actualizarCantidad = async () => {
  if (!selectedItem) {
    alert("Selecciona un producto de la tabla primero");
    return;
  }

  try {
      await axios.put(
        `https://ato-appservidor-nvxt.onrender.com/inventario/inventario/general/${encodeURIComponent(selectedItem.nombre)}`,
        { cantidad: parseInt(nuevaCantidad) },
        config
      );
    

    setNuevaCantidad("");
    setSelectedItem(null);
    cargarInventario();
  } catch (err: any) {
    alert(err.response?.data?.detail || "Error al actualizar cantidad");
  }
};


const eliminarItem = async (item: any) => {
  const confirmar = window.confirm(`¿Eliminar "${item.nombre}" del inventario?`);
  if (!confirmar) return;

  try {
    if (item.tipo === 'producto') {
      await axios.delete(`https://ato-appservidor-nvxt.onrender.com/inventario/inventario/general/${item.id}`, config);
    } else {
      await axios.delete(`https://ato-appservidor-nvxt.onrender.com/inventario_telefonos/inventario_telefonos/general/${item.id}`, config);
    }

    cargarInventario();
  } catch (err: any) {
    alert(err.response?.data?.detail || "Error al eliminar");
  }
};


  const productosFiltrados = [...productos.map(p => ({
    id: p.id,
    nombre: p.producto,
    clave: p.clave,
    precio: p.precio,
    cantidad: p.cantidad,
    tipo: 'producto'
  })),
  ...telefonos.map(t => ({
    id: t.id,
    nombre: `${t.marca} ${t.modelo}`,
    clave: '',
    precio: t.precio,
    cantidad: t.cantidad,
    tipo: 'telefono'
  }))].filter((item) =>
    item.nombre.toLowerCase().includes(filtro.toLowerCase())
  );



  const manejarPreviewExcel = async (e: any) => {
  const file = e.target.files[0];
  if (!file) return;

  setArchivoExcel(file);

  const formData = new FormData();
  formData.append("archivo", file);

  const res = await axios.post(
    `https://ato-appservidor-nvxt.onrender.com/inventario/preview_excel_general`,
    formData,
    config
  );

  setPreviewValido(res.data.validas);
  setPreviewErrores(res.data.errores);
  setMostrandoPreview(true);
};


  useEffect(() => {
  const fetchExtras = async () => {
    try {
      const [resEmp, resMod] = await Promise.all([
        axios.get(`https://ato-appservidor-nvxt.onrender.com/registro/usuarios`, config),
        axios.get(`https://ato-appservidor-nvxt.onrender.com/registro/modulos`, config),
      ]);

      setEmpleados(resEmp.data);
      setModulos(resMod.data);
    } catch (err) {
      console.error(err);
    }
  };

  fetchExtras();
}, []);


const confirmarImportacion = async () => {
  if (!archivoExcel) {
    alert("Falta archivo");
    return;
  }

  const formData = new FormData();
  formData.append("archivo", archivoExcel);

  await axios.post(
    `https://ato-appservidor-nvxt.onrender.com/inventario/actualizar_inventario_excel_general`,
    formData,
    config
  );

  alert("Inventario general actualizado");
  cargarInventario();
  setMostrandoPreview(false);
};


  useEffect(() => {
    cargarInventario();
  }, []);

  return (
  <Container sx={{ mt: 4 }}>

    <Typography variant="h5" gutterBottom>
      Inventario General
    </Typography>

    {/* BUSCADOR GENERAL */}
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Buscar en inventario
      </Typography>

      <TextField
        label="Buscar producto o teléfono"
        variant="outlined"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        fullWidth
      />
    </Paper>

    {/* BUSCAR EN MODULOS */}
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Buscar producto en módulos
      </Typography>

      <Box display="flex" gap={2} alignItems="center">
        <TextField
          label="Producto"
          value={buscarProductoModulo}
          onChange={(e) => setBuscarProductoModulo(e.target.value)}
          size="small"
          sx={{ width: 300 }}
        />

        <Button
          variant="contained"
          onClick={buscarEnModulos}
        >
          Buscar
        </Button>
      </Box>
    </Paper>

    {/* IMPORTAR EXCEL */}
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Importar inventario
      </Typography>

      <TextField
        type="file"
        inputProps={{ accept: ".xlsx,.xls" }}
        onChange={manejarPreviewExcel}
      />

      {mostrandoPreview && previewValido.length > 0 && (
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mt={3}
          p={2}
          bgcolor="rgba(249,115,22,0.06)"
          borderRadius={2}
        >
          <Typography color="text.secondary">
            Se importarán {previewValido.length} productos
            {previewErrores.length > 0 &&
              ` (${previewErrores.length} con errores)`}
          </Typography>

          <Button
            variant="contained"
            color="success"
            size="large"
            onClick={confirmarImportacion}
          >
            Confirmar importación
          </Button>
        </Box>
      )}
    </Paper>

    {/* OCULTO - forma vieja de agregar producto (desincronizaba inventario). Usar "Catalogo de Productos" en su lugar.
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Agregar producto
      </Typography>

      <Box display="flex" gap={2} flexWrap="wrap">
        <Select
          value={tipo}
          onChange={(e) =>
            setTipo(e.target.value as "producto" | "telefono")
          }
        >
          <MenuItem value="producto">Producto</MenuItem>
          <MenuItem value="telefono">Teléfono</MenuItem>
        </Select>

        <TextField
          label="Producto"
          value={nuevo.producto}
          onChange={(e) =>
            setNuevo({ ...nuevo, producto: e.target.value })
          }
        />

        <TextField
          label="Clave"
          value={nuevo.clave}
          onChange={(e) =>
            setNuevo({ ...nuevo, clave: e.target.value })
          }
        />

        <TextField
          label="Precio"
          type="number"
          value={nuevo.precio}
          onChange={(e) =>
            setNuevo({ ...nuevo, precio: e.target.value })
          }
        />

        <TextField
          label="Cantidad"
          type="number"
          value={nuevo.cantidad}
          onChange={(e) =>
            setNuevo({ ...nuevo, cantidad: e.target.value })
          }
        />

        <Button variant="contained" onClick={agregar}>
          Agregar
        </Button>
      </Box>
    </Paper>
    */}


      {filtro.trim() !== "" && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Resultados de inventario
            
          </Typography>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Producto</TableCell>
                  <TableCell>Clave</TableCell>
                  <TableCell>Precio</TableCell>
                  <TableCell>Cantidad</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {productosFiltrados.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.nombre}</TableCell>
                    <TableCell>{item.clave}</TableCell>
                    <TableCell>{item.precio}</TableCell>
                    <TableCell>{item.cantidad}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    {/* RESULTADOS POR MODULO */}
    {resultadosModulo.length > 0 && (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Inventario por módulo
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Producto</TableCell>
                <TableCell>Módulo</TableCell>
                <TableCell>Cantidad</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {resultadosModulo.map((r, index) => (
                <TableRow key={index}>
                  <TableCell>{r.producto}</TableCell>
                  <TableCell>{r.modulo}</TableCell>
                  <TableCell>{r.cantidad}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    )}

    {/* BOTONES */}
    <Box display="flex" gap={2} mt={2}>
      <Button
        variant="outlined"
        color="secondary"
        onClick={() => navigate("/inventario/modulo")}
      >
        Inventario por Módulo
      </Button>

      <Button
        variant="contained"
        onClick={() => navigate("/inventario/diferencias")}
      >
        Reporte de inventarios
      </Button>
    </Box>

    <RegistroPlan empleados={empleados} modulos={modulos} />

  </Container>
)
};

export default InventarioAdmin;
