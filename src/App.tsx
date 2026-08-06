import React, { useEffect } from 'react';
import { useRoutes, Navigate } from 'react-router-dom';
import { cerrarSesionForzado, tokenExpirado, msHastaExpiracion } from './utils/sesion';
import LoginPage from './pages/LoginPages';
import VentasPage from './pages/VentasPage';
import ComisionesPage from './pages/ComisionesPage';
import TraspasosPage from './pages/TraspasosPage';
import TraspasosAdmin from './pages/TraspasosAdmin';
import CrearUsuario from './pages/CrearUsuarios';
import UsuariosAdmin from './pages/Usuarios';
import AdminTiendas from './pages/AdminTiendas';
import InventarioAdmin from './pages/Inventario';
import InventarioPorModulo from './pages/InventarioModulo';
import ChipsAdmin from './pages/ChipsAdmin';
import CortePage from './pages/CortePage';
import InventarioTelefonosGeneral from './pages/InventariosTelefonos';
import ComisionesUser from './pages/ComisionesUser';
import ChipsRechazados from './pages/ChipsInvalidos';
import DiferenciasInventario from './pages/InventarioDiferencias';
import Nomina from './pages/Nomina';
import NominaEmpleado from './pages/NominaEmpleado';
import Kardex from './pages/Kardex';
import Metricas from './pages/Metricas';
import CampañasVIP from "./pages/CampañasVip";
import SeleccionCadena from "./pages/SeleccionCadena";
import TelcelPage from "./pages/TelcelPage";
import CLineasPage from "./pages/CLineasPage";
import EntradaMercancia from './pages/EntradaMercancia';
import DireccionPage from './pages/DireccionPage';
import QuienTienePage from './pages/QuienTienePage';
import AsistenciaPage from './pages/AsistenciaPage';
import EstadisticasPage from './pages/EstadisticasPage';
import RankingModulosPage from './pages/RankingModulosPage';
import TiempoRealPage from './pages/TiempoRealPage';
import RecargasPage from './pages/RecargasPage';
import SueldosEncargadosPage from './pages/SueldosEncargadosPage';
import PanelControlNominaPage from './pages/PanelControlNominaPage';
import MiNomina from './pages/MiNomina';
import AjustesInventarioPage from './pages/AjustesInventario';
import ConteosFisicos from './pages/ConteosFisicos';
import GestionModulos from './pages/GestionModulos';
import ProductosPage from './pages/ProductosPage';
import ReportesDirector from './pages/ReportesDirector';
import PlanesAdmin from './pages/PlanesAdmin';
import PresionAdmin from './pages/PresionAdmin';
import RecibosPage from './pages/RecibosPage';
import CheckinPage from './pages/CheckinPage';
import GastosPage from './pages/GastosPage';
import EquiposTelcel from './pages/EquiposTelcel';
import ListaPrecios from './pages/ListaPrecios';
import VentasTelcel from './pages/VentasTelcel';
import AltaImeis from './pages/AltaImeis';
import PantallaTVPage from './pages/PantallaTVPage';

const RutaProtegida: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (token && tokenExpirado()) {
      cerrarSesionForzado();
      return;
    }
    const ms = msHastaExpiracion();
    if (ms === null || ms <= 0) return;
    const id = setTimeout(() => cerrarSesionForzado(), ms + 1000);
    return () => clearTimeout(id);
  }, [token]);

  if (!token || tokenExpirado()) return <Navigate to="/" replace />;
  return children;
};

const App: React.FC = () => {
  const routes = useRoutes([
    { path: '/', element: <LoginPage /> },
    { path: '/ventas', element: <RutaProtegida><VentasPage /></RutaProtegida> },
    { path: '/comisiones', element: <RutaProtegida><ComisionesPage /></RutaProtegida> },
    { path: '/comisiones/usuario', element: <RutaProtegida><ComisionesUser /></RutaProtegida> },
    { path: '/traspasos', element: <RutaProtegida><TraspasosPage /></RutaProtegida> },
    { path: '/traspasos/admin', element: <RutaProtegida><TraspasosAdmin /></RutaProtegida> },
    { path: '/usuarios', element: <RutaProtegida><CrearUsuario /></RutaProtegida> },
    { path: '/usuarios/admin', element: <RutaProtegida><UsuariosAdmin /></RutaProtegida> },
    { path: '/tiendas/admin', element: <RutaProtegida><AdminTiendas /></RutaProtegida> },
    { path: '/inventario', element: <RutaProtegida><InventarioAdmin /></RutaProtegida> },
    { path: '/inventario/modulo', element: <RutaProtegida><InventarioPorModulo /></RutaProtegida> },
    { path: '/ventas/chips', element: <RutaProtegida><ChipsAdmin /></RutaProtegida> },
    { path: '/lista-precios', element: <RutaProtegida><ListaPrecios /></RutaProtegida> },
    { path: '/ventas/telefonos', element: <RutaProtegida><VentasTelcel /></RutaProtegida> },
    { path: '/telefonos/alta-imeis', element: <RutaProtegida><AltaImeis /></RutaProtegida> },
    { path: '/corte', element: <RutaProtegida><CortePage /></RutaProtegida> },
    { path: '/inventario_telefonos', element: <RutaProtegida><InventarioTelefonosGeneral /></RutaProtegida> },
    { path: '/chips_invalidos', element: <RutaProtegida><ChipsRechazados /></RutaProtegida> },
    { path: '/inventario/diferencias', element: <RutaProtegida><DiferenciasInventario /></RutaProtegida> },
    { path: '/nomina', element: <RutaProtegida><Nomina /></RutaProtegida> },
    { path: '/nominaEmpleado', element: <RutaProtegida><NominaEmpleado /></RutaProtegida> },
    { path: '/kardex', element: <RutaProtegida><Kardex /></RutaProtegida> },
    { path: '/metricas', element: <RutaProtegida><Metricas /></RutaProtegida> },
    { path: '/promos', element: <RutaProtegida><CampañasVIP /></RutaProtegida> },
    { path: '/seleccionar-cadena', element: <RutaProtegida><SeleccionCadena /></RutaProtegida> },
    { path: '/telcel', element: <RutaProtegida><TelcelPage /></RutaProtegida> },
    { path: '/clineas', element: <RutaProtegida><CLineasPage /></RutaProtegida> },
    { path: '/entrada-mercancia', element: <RutaProtegida><EntradaMercancia/></RutaProtegida> },
    { path: '/direccion', element: <RutaProtegida><DireccionPage /></RutaProtegida> },
    { path: '/quien-tiene', element: <RutaProtegida><QuienTienePage /></RutaProtegida> },
    { path: '/asistencia', element: <RutaProtegida><AsistenciaPage /></RutaProtegida> },
    { path: '/estadisticas', element: <RutaProtegida><EstadisticasPage /></RutaProtegida> },
    { path: '/ranking', element: <RutaProtegida><RankingModulosPage /></RutaProtegida> },
    { path: '/tiempo-real', element: <RutaProtegida><TiempoRealPage /></RutaProtegida> },
    { path: '/recargas', element: <RutaProtegida><RecargasPage /></RutaProtegida> },
    { path: '/sueldos-encargados', element: <RutaProtegida><SueldosEncargadosPage /></RutaProtegida> },
    { path: '/admin/panel-control', element: <RutaProtegida><PanelControlNominaPage /></RutaProtegida> },
    { path: '/mi-nomina', element: <RutaProtegida><MiNomina /></RutaProtegida> },
    { path: '/ajustes-inventario', element: <RutaProtegida><AjustesInventarioPage /></RutaProtegida> },
    { path: '/conteos-fisicos', element: <RutaProtegida><ConteosFisicos /></RutaProtegida> },
    { path: '/admin/modulos', element: <RutaProtegida><GestionModulos /></RutaProtegida> },
    { path: '/admin/planes', element: <RutaProtegida><PlanesAdmin /></RutaProtegida> },
    { path: '/admin/presion', element: <RutaProtegida><PresionAdmin /></RutaProtegida> },
    { path: '/inventario/productos', element: <RutaProtegida><ProductosPage /></RutaProtegida> },
    { path: '/reportes-director', element: <RutaProtegida><ReportesDirector /></RutaProtegida> },
    { path: '/recibos', element: <RutaProtegida><RecibosPage /></RutaProtegida> },
    { path: '/checkin', element: <RutaProtegida><CheckinPage /></RutaProtegida> },
    { path: '/gastos', element: <RutaProtegida><GastosPage /></RutaProtegida> },
    { path: '/equipos_telcel', element: <RutaProtegida><EquiposTelcel /></RutaProtegida> },
    { path: '/pantalla-tv', element: <RutaProtegida><PantallaTVPage /></RutaProtegida> },
  ]);

  return routes;
};

export default App;
