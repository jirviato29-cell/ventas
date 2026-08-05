import React, { useState, useEffect } from "react";
import {
  AppBar, Toolbar, Typography, Button, Box, MenuItem, Menu,
  IconButton, Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Divider, Collapse,
} from "@mui/material";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import MenuIcon from "@mui/icons-material/Menu";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import InventoryIcon from "@mui/icons-material/Inventory";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LogoutIcon from "@mui/icons-material/Logout";
import PaymentsIcon from "@mui/icons-material/Payments";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import BarChartIcon from "@mui/icons-material/BarChart";
import PeopleIcon from "@mui/icons-material/People";
import ListAltIcon from "@mui/icons-material/ListAlt";
import SimCardIcon from "@mui/icons-material/SimCard";
import MoveToInboxIcon from "@mui/icons-material/MoveToInbox";
import SignalCellular4BarIcon from "@mui/icons-material/SignalCellular4Bar";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import BoltIcon from "@mui/icons-material/Bolt";
import { Link, useNavigate } from "react-router-dom";
import logo from "../ATO.jpeg";
import { obtenerRolDesdeToken } from "./Token";

const navBtnSx = {
  color: "#f1f5f9",
  fontWeight: 500,
  px: 1.5,
  "&:hover": {
    color: "#f97316",
    backgroundColor: "rgba(249,115,22,0.08)",
  },
  transition: "color 0.2s ease",
};

const drawerItemSx = {
  px: 3,
  py: 1.2,
  color: "#1e293b",
  "&:hover": {
    bgcolor: "rgba(249,115,22,0.08)",
    color: "#FF6600",
    "& .MuiListItemIcon-root": { color: "#FF6600" },
  },
};

const drawerIconSx = { color: "#64748b", minWidth: 36 };

const Navbar = () => {
  const navigate = useNavigate();
  const rolToken = obtenerRolDesdeToken();

  const [usuario, setUsuario] = useState(localStorage.getItem("usuario") || "");
  const [modulo, setModulo] = useState(localStorage.getItem("modulo") || "");
  const [rolM, setRolM] = useState(localStorage.getItem("rol") || "");
  const [cadena, setCadena] = useState(sessionStorage.getItem("cadena_seleccionada") || "");

  // Desktop dropdowns
  const [anchorInventario, setAnchorInventario] = useState<null | HTMLElement>(null);
  const [anchorAdmin, setAnchorAdmin] = useState<null | HTMLElement>(null);
  const [anchorVentas, setAnchorVentas] = useState<null | HTMLElement>(null);
  const [anchorTelefonos, setAnchorTelefonos] = useState<null | HTMLElement>(null);

  // Mobile drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [ventasOpen, setVentasOpen] = useState(false);
  const [inventarioOpen, setInventarioOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  useEffect(() => {
    const actualizarDatos = () => {
      setUsuario(localStorage.getItem("usuario") || "");
      setModulo(localStorage.getItem("modulo") || "");
      setRolM(localStorage.getItem("rol") || "");
      setCadena(sessionStorage.getItem("cadena_seleccionada") || "");
    };
    window.addEventListener("storage", actualizarDatos);
    actualizarDatos();
    return () => window.removeEventListener("storage", actualizarDatos);
  }, []);

  const cerrarSesion = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`https://ato-appservidor-nvxt.onrender.com/asistencias/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok && res.status !== 400) {
        console.error("Error al registrar salida:", res.status);
      }
    } catch (error) {
      console.error("Error de red al registrar salida:", error);
    } finally {
      localStorage.clear();
      setUsuario("");
      setModulo("");
      setRolM("");
      navigate("/");
    }
  };

  const openMenu = (event: React.MouseEvent<HTMLElement>, setFn: any) => {
    setFn(event.currentTarget);
  };
  const closeMenu = (setFn: any) => setFn(null);

  const mostrarAsistencia =
    ((rolToken === "asesor" || rolToken === "encargado") && modulo && modulo !== "Cadenas") ||
    rolToken === "admin" ||
    rolToken === "direccion";

  const navegar = (ruta: string) => {
    navigate(ruta);
    setDrawerOpen(false);
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar sx={{ display: "flex", alignItems: "center", gap: 1, minHeight: 56 }}>

          {/* LEFT: menú (☰) pegado al logo de ATO */}
          <IconButton onClick={() => setDrawerOpen(true)} sx={{ color: "#f1f5f9", p: 0.5 }}>
            <MenuIcon />
          </IconButton>

          {/* LEFT: Logo + user info */}
          <Box
            display="flex"
            alignItems="center"
            gap={1.5}
            component={Link}
            to="/ventas"
            sx={{ textDecoration: "none", color: "inherit" }}
          >
            <Box
              sx={{
                bgcolor: "white",
                borderRadius: 1,
                px: 0.8,
                py: 0.3,
                display: "flex",
                alignItems: "center",
              }}
            >
              <img src={logo} alt="ATO" style={{ height: 28, display: "block" }} />
            </Box>
            {usuario && (
              <Typography
                variant="body2"
                sx={{ color: "#94a3b8", ml: 1.5, display: { xs: "none", sm: "block" } }}
              >
                {usuario} · {modulo}{cadena ? ` · ${cadena}` : ""} · {rolM}
              </Typography>
            )}
          </Box>

          {false && (
            <Box display="flex" alignItems="center" gap={0.5}>

              {rolToken === "admin" && (
                <>
                  <Button sx={navBtnSx} onClick={(e) => openMenu(e, setAnchorVentas)}>
                    Ventas
                  </Button>
                  <Menu
                    anchorEl={anchorVentas}
                    open={Boolean(anchorVentas)}
                    onClose={() => closeMenu(setAnchorVentas)}
                  >
                    <MenuItem component={Link} to="/ventas"><ConfirmationNumberIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />Ticket</MenuItem>
                    <MenuItem component={Link} to="/ventas/chips">Chips</MenuItem>
                    <MenuItem component={Link} to="/corte">Cortes</MenuItem>
                    <MenuItem component={Link} to="/lista-precios">Lista de Precios</MenuItem>
                    <MenuItem component={Link} to="/ventas/telefonos">Teléfonos</MenuItem>
                  </Menu>

                  <Button sx={navBtnSx} onClick={(e) => openMenu(e, setAnchorTelefonos)}>
                    Teléfonos
                  </Button>
                  <Menu
                    anchorEl={anchorTelefonos}
                    open={Boolean(anchorTelefonos)}
                    onClose={() => closeMenu(setAnchorTelefonos)}
                  >
                    <MenuItem component={Link} to="/telefonos/alta-imeis">Dar de alta IMEIs</MenuItem>
                  </Menu>

                  <Button sx={navBtnSx} onClick={(e) => openMenu(e, setAnchorInventario)}>
                    Inventario
                  </Button>
                  <Menu
                    anchorEl={anchorInventario}
                    open={Boolean(anchorInventario)}
                    onClose={() => closeMenu(setAnchorInventario)}
                  >
                    {/* OCULTO - pantalla vieja de inventario, generaba confusion. Usar Entrada de Mercancia / Productos.
                    <MenuItem component={Link} to="/inventario">Inventario</MenuItem>
                    */}
                    <MenuItem component={Link} to="/entrada-mercancia">Entrada de Mercancia</MenuItem>
                    <MenuItem component={Link} to="/equipos_telcel">Equipos Telcel</MenuItem>
                    <MenuItem component={Link} to="/traspasos/admin">Traspasos</MenuItem>
                    <MenuItem component={Link} to="/kardex">Kardex</MenuItem>
                    {rolToken === "admin" && (
                      <MenuItem component={Link} to="/conteos-fisicos">Conteos Físicos</MenuItem>
                    )}
                    {rolToken === "admin" && (
                      <MenuItem component={Link} to="/inventario/productos">Productos</MenuItem>
                    )}
                  </Menu>

                  <Button sx={navBtnSx} onClick={(e) => openMenu(e, setAnchorAdmin)}>
                    Administración
                  </Button>
                  <Menu
                    anchorEl={anchorAdmin}
                    open={Boolean(anchorAdmin)}
                    onClose={() => closeMenu(setAnchorAdmin)}
                  >
                    <MenuItem component={Link} to="/usuarios">Usuarios</MenuItem>
                    <MenuItem component={Link} to="/comisiones">Comisiones</MenuItem>
                    <MenuItem component={Link} to="/metricas">Métricas</MenuItem>
                    <MenuItem component={Link} to="/admin/modulos">Gestión de Módulos</MenuItem>
                    <MenuItem component={Link} to="/admin/planes">Planes</MenuItem>
                    <MenuItem component={Link} to="/admin/presion">Presión</MenuItem>
                    <MenuItem component={Link} to="/recibos">Recibos</MenuItem>
                    <MenuItem component={Link} to="/gastos">Gastos</MenuItem>
                  </Menu>

                  <Button sx={navBtnSx} component={Link} to="/admin/panel-control">
                    PANEL DE CONTROL
                  </Button>
                  <Button sx={navBtnSx} component={Link} to="/telcel">
                    TELCEL
                  </Button>
                  <Button sx={navBtnSx} component={Link} to="/clineas">
                    C LÍNEAS
                  </Button>
                  <Button sx={navBtnSx} component={Link} to="/quien-tiene">
                    QUIEN TIENE
                  </Button>
                  <Button sx={navBtnSx} component={Link} to="/tiempo-real">
                    ⚡ TIEMPO REAL
                  </Button>
                  <Button sx={navBtnSx} component={Link} to="/estadisticas">
                    ESTADÍSTICAS
                  </Button>
                  <Button sx={navBtnSx} component={Link} to="/pantalla-tv">
                    📺 PANTALLA TV
                  </Button>
                </>
              )}

              {rolToken === "contador" && (
                <>
                  <Button sx={navBtnSx} component={Link} to="/corte">Cortes</Button>
                  <Button sx={navBtnSx} component={Link} to="/comisiones">Comisiones</Button>
                  <Button sx={navBtnSx} component={Link} to="/traspasos/admin">Traspasos</Button>
                  <Button sx={navBtnSx} component={Link} to="/usuarios">Usuarios</Button>
                  {/* OCULTO - pantalla vieja de inventario, generaba confusion. Usar Entrada de Mercancia / Productos.
                  <Button sx={navBtnSx} component={Link} to="/inventario">Inventario</Button>
                  */}
                  <Button sx={navBtnSx} component={Link} to="/ventas/chips">Chips</Button>
                </>
              )}

              {rolToken === "encargado" && (
                <>
                  <Button sx={navBtnSx} component={Link} to="/kardex">Kardex</Button>
                  <Button sx={{ ...navBtnSx, color: "#a78bfa" }} component={Link} to="/mi-nomina">Mi Nómina</Button>
                  <Button sx={navBtnSx} component={Link} to="/traspasos">Traspasos</Button>
                  <Button sx={navBtnSx} component={Link} to="/ventas" startIcon={<ConfirmationNumberIcon />}>Ticket</Button>
                  <Button sx={navBtnSx} component={Link} to="/comisiones/usuario">Comisiones</Button>
                  <Button sx={navBtnSx} component={Link} to="/inventario/modulo">Inventario</Button>
                  <Button sx={navBtnSx} component={Link} to="/ventas/chips">Chips</Button>
                  <Button sx={navBtnSx} component={Link} to="/corte" startIcon={<ContentCutIcon />}>Corte</Button>
                  <Button sx={navBtnSx} component={Link} to="/ranking">ESTADÍSTICAS</Button>
                </>
              )}

              {rolToken === "asesor" && (
                <>
                  <Button sx={{ ...navBtnSx, color: "#a78bfa" }} component={Link} to="/mi-nomina">Mi Nómina</Button>
                  <Button sx={navBtnSx} component={Link} to="/ventas" startIcon={<ConfirmationNumberIcon />}>Ticket</Button>
                  <Button sx={navBtnSx} component={Link} to="/comisiones/usuario">Comisiones</Button>
                  <Button sx={navBtnSx} component={Link} to="/ventas/chips">Chips</Button>
                  {!modulo.toLowerCase().includes("cadena") && (
                    <Button sx={navBtnSx} component={Link} to="/corte" startIcon={<ContentCutIcon />}>Corte</Button>
                  )}
                  {!modulo.toLowerCase().includes("cadena") && (
                    <Button sx={navBtnSx} component={Link} to="/ranking">ESTADÍSTICAS</Button>
                  )}
                </>
              )}

              {rolToken === "direccion" && (
                <>
                  <Button sx={{ ...navBtnSx, color: "#f97316", fontWeight: 700 }} component={Link} to="/direccion">
                    Cortes
                  </Button>
                  <Button sx={navBtnSx} component={Link} to="/recargas">
                    RECARGAS
                  </Button>
                  <Button sx={navBtnSx} component={Link} to="/estadisticas">
                    ESTADÍSTICAS
                  </Button>
                  <Button sx={navBtnSx} component={Link} to="/pantalla-tv">
                    📺 PANTALLA TV
                  </Button>
                  <Button sx={navBtnSx} component={Link} to="/quien-tiene">
                    QUIEN TIENE
                  </Button>
                  <Button sx={navBtnSx} component={Link} to="/tiempo-real">
                    ⚡ TIEMPO REAL
                  </Button>
                </>
              )}

              {/* ASISTENCIA: asesor/encargado con módulo (no Cadenas) + admin/direccion */}
              {mostrarAsistencia && (
                <Button sx={navBtnSx} component={Link} to="/asistencia">
                  ASISTENCIA
                </Button>
              )}

              {rolToken === "direccion" && (
                <Button sx={navBtnSx} component={Link} to="/sueldos-encargados">
                  SUELDOS ENCARGADOS
                </Button>
              )}

              {rolToken === "direccion" && (
                <Button sx={navBtnSx} component={Link} to="/reportes-director">
                  REPORTE DIARIO
                </Button>
              )}

              {!modulo.toLowerCase().includes("cadena") && (
                <Button sx={navBtnSx} component={Link} to="/lista-precios">
                  LISTA DE PRECIOS
                </Button>
              )}

              <Button
                sx={{
                  ...navBtnSx,
                  ml: 1,
                  border: "1px solid rgba(249,115,22,0.35)",
                  borderRadius: 1,
                  "&:hover": {
                    color: "#ffffff",
                    backgroundColor: "#f97316",
                    border: "1px solid #f97316",
                  },
                }}
                onClick={cerrarSesion}
              >
                Cerrar sesión
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* ── Mobile Drawer ─────────────────────────────────────────────────────── */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 280 } }}
      >
        {/* Header con logo */}
        <Box sx={{ p: 2, bgcolor: "#1e293b", display: "flex", alignItems: "center" }}>
          <Box sx={{ bgcolor: "white", borderRadius: 1, px: 0.8, py: 0.3, display: "flex", alignItems: "center" }}>
            <img src={logo} alt="ATO" style={{ height: 28, display: "block" }} />
          </Box>
        </Box>
        <Divider />

        <List disablePadding>

          {!modulo.toLowerCase().includes("cadena") && (
            <ListItemButton sx={drawerItemSx} onClick={() => navegar("/lista-precios")}>
              <ListItemText primary="LISTA DE PRECIOS" />
            </ListItemButton>
          )}

          {/* ── ADMIN ─────────────────────────────────────────────────────────── */}
          {rolToken === "admin" && (
            <>
              {/* VENTAS expandible */}
              <ListItemButton sx={drawerItemSx} onClick={() => setVentasOpen((o) => !o)}>
                <ListItemIcon sx={drawerIconSx}><ReceiptLongIcon /></ListItemIcon>
                <ListItemText primary="VENTAS" primaryTypographyProps={{ fontWeight: 700 }} />
                {ventasOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </ListItemButton>
              <Collapse in={ventasOpen} timeout="auto" unmountOnExit>
                <List disablePadding>
                  <ListItemButton sx={{ ...drawerItemSx, pl: 6 }} onClick={() => navegar("/ventas")}>
                    <ListItemIcon sx={drawerIconSx}><ConfirmationNumberIcon /></ListItemIcon>
                    <ListItemText primary="Ticket" />
                  </ListItemButton>
                  <ListItemButton sx={{ ...drawerItemSx, pl: 6 }} onClick={() => navegar("/ventas/chips")}>
                    <ListItemIcon sx={drawerIconSx}><SimCardIcon /></ListItemIcon>
                    <ListItemText primary="Chips" />
                  </ListItemButton>
                  <ListItemButton sx={{ ...drawerItemSx, pl: 6 }} onClick={() => navegar("/lista-precios")}>
                    <ListItemIcon sx={drawerIconSx}><SimCardIcon /></ListItemIcon>
                    <ListItemText primary="Lista de Precios" />
                  </ListItemButton>
                  <ListItemButton sx={{ ...drawerItemSx, pl: 6 }} onClick={() => navegar("/corte")}>
                    <ListItemIcon sx={drawerIconSx}><ContentCutIcon /></ListItemIcon>
                    <ListItemText primary="Cortes" />
                  </ListItemButton>
                  <ListItemButton sx={{ ...drawerItemSx, pl: 6 }} onClick={() => navegar("/ventas/telefonos")}>
                    <ListItemIcon sx={drawerIconSx}><SimCardIcon /></ListItemIcon>
                    <ListItemText primary="Teléfonos" />
                  </ListItemButton>
                </List>
              </Collapse>

              {/* INVENTARIO expandible */}
              <ListItemButton sx={drawerItemSx} onClick={() => setInventarioOpen((o) => !o)}>
                <ListItemIcon sx={drawerIconSx}><InventoryIcon /></ListItemIcon>
                <ListItemText primary="INVENTARIO" primaryTypographyProps={{ fontWeight: 700 }} />
                {inventarioOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </ListItemButton>
              <Collapse in={inventarioOpen} timeout="auto" unmountOnExit>
                <List disablePadding>
                  {/* OCULTO - pantalla vieja de inventario, generaba confusion. Usar Entrada de Mercancia / Productos.
                  <ListItemButton sx={{ ...drawerItemSx, pl: 6 }} onClick={() => navegar("/inventario")}>
                    <ListItemIcon sx={drawerIconSx}><InventoryIcon /></ListItemIcon>
                    <ListItemText primary="Inventario" />
                  </ListItemButton>
                  */}
                  <ListItemButton sx={{ ...drawerItemSx, pl: 6 }} onClick={() => navegar("/entrada-mercancia")}>
                    <ListItemIcon sx={drawerIconSx}><MoveToInboxIcon /></ListItemIcon>
                    <ListItemText primary="Entrada de Mercancía" />
                  </ListItemButton>
                  <ListItemButton sx={{ ...drawerItemSx, pl: 6 }} onClick={() => navegar("/traspasos/admin")}>
                    <ListItemIcon sx={drawerIconSx}><SwapHorizIcon /></ListItemIcon>
                    <ListItemText primary="Traspasos" />
                  </ListItemButton>
                  <ListItemButton sx={{ ...drawerItemSx, pl: 6 }} onClick={() => navegar("/kardex")}>
                    <ListItemIcon sx={drawerIconSx}><ListAltIcon /></ListItemIcon>
                    <ListItemText primary="Kardex" />
                  </ListItemButton>
                  {rolToken === "admin" && (
                    <ListItemButton sx={{ ...drawerItemSx, pl: 6 }} onClick={() => navegar("/conteos-fisicos")}>
                      <ListItemIcon sx={drawerIconSx}><InventoryIcon /></ListItemIcon>
                      <ListItemText primary="Conteos Físicos" />
                    </ListItemButton>
                  )}
                  {rolToken === "admin" && (
                    <ListItemButton sx={{ ...drawerItemSx, pl: 6 }} onClick={() => navegar("/inventario/productos")}>
                      <ListItemIcon sx={drawerIconSx}><InventoryIcon /></ListItemIcon>
                      <ListItemText primary="Productos" />
                    </ListItemButton>
                  )}
                </List>
              </Collapse>

              {/* ADMINISTRACIÓN expandible */}
              <ListItemButton sx={drawerItemSx} onClick={() => setAdminOpen((o) => !o)}>
                <ListItemIcon sx={drawerIconSx}><AdminPanelSettingsIcon /></ListItemIcon>
                <ListItemText primary="ADMINISTRACIÓN" primaryTypographyProps={{ fontWeight: 700 }} />
                {adminOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </ListItemButton>
              <Collapse in={adminOpen} timeout="auto" unmountOnExit>
                <List disablePadding>
                  <ListItemButton sx={{ ...drawerItemSx, pl: 6 }} onClick={() => navegar("/usuarios")}>
                    <ListItemIcon sx={drawerIconSx}><PeopleIcon /></ListItemIcon>
                    <ListItemText primary="Usuarios" />
                  </ListItemButton>
                  <ListItemButton sx={{ ...drawerItemSx, pl: 6 }} onClick={() => navegar("/comisiones")}>
                    <ListItemIcon sx={drawerIconSx}><MonetizationOnIcon /></ListItemIcon>
                    <ListItemText primary="Comisiones" />
                  </ListItemButton>
                  <ListItemButton sx={{ ...drawerItemSx, pl: 6 }} onClick={() => navegar("/metricas")}>
                    <ListItemIcon sx={drawerIconSx}><BarChartIcon /></ListItemIcon>
                    <ListItemText primary="Métricas" />
                  </ListItemButton>
                  <ListItemButton sx={{ ...drawerItemSx, pl: 6 }} onClick={() => navegar("/admin/modulos")}>
                    <ListItemIcon sx={drawerIconSx}><AdminPanelSettingsIcon /></ListItemIcon>
                    <ListItemText primary="Gestión de Módulos" />
                  </ListItemButton>
                  <ListItemButton sx={{ ...drawerItemSx, pl: 6 }} onClick={() => navegar("/gastos")}>
                    <ListItemIcon sx={drawerIconSx}><PaymentsIcon /></ListItemIcon>
                    <ListItemText primary="Gastos" />
                  </ListItemButton>
                </List>
              </Collapse>

              <ListItemButton sx={drawerItemSx} onClick={() => navegar("/admin/panel-control")}>
                <ListItemIcon sx={drawerIconSx}><AdminPanelSettingsIcon /></ListItemIcon>
                <ListItemText primary="PANEL DE CONTROL" primaryTypographyProps={{ fontWeight: 700 }} />
              </ListItemButton>
              <ListItemButton sx={drawerItemSx} onClick={() => navegar("/telcel")}>
                <ListItemIcon sx={drawerIconSx}><SimCardIcon /></ListItemIcon>
                <ListItemText primary="TELCEL" primaryTypographyProps={{ fontWeight: 700 }} />
              </ListItemButton>

              <ListItemButton sx={drawerItemSx} onClick={() => navegar("/clineas")}>
                <ListItemIcon sx={drawerIconSx}><SignalCellular4BarIcon /></ListItemIcon>
                <ListItemText primary="C LÍNEAS" primaryTypographyProps={{ fontWeight: 700 }} />
              </ListItemButton>
              <ListItemButton sx={drawerItemSx} onClick={() => navegar("/quien-tiene")}>
                <ListItemIcon sx={drawerIconSx}><ManageSearchIcon /></ListItemIcon>
                <ListItemText primary="QUIEN TIENE" primaryTypographyProps={{ fontWeight: 700 }} />
              </ListItemButton>
              <ListItemButton sx={drawerItemSx} onClick={() => navegar("/tiempo-real")}>
                <ListItemIcon sx={drawerIconSx}><BoltIcon /></ListItemIcon>
                <ListItemText primary="⚡ TIEMPO REAL" primaryTypographyProps={{ fontWeight: 700 }} />
              </ListItemButton>
              <ListItemButton sx={drawerItemSx} onClick={() => navegar("/estadisticas")}>
                <ListItemIcon sx={drawerIconSx}><BarChartIcon /></ListItemIcon>
                <ListItemText primary="ESTADÍSTICAS" primaryTypographyProps={{ fontWeight: 700 }} />
              </ListItemButton>
              <ListItemButton sx={drawerItemSx} onClick={() => navegar("/pantalla-tv")}>
                <ListItemIcon sx={drawerIconSx}><BarChartIcon /></ListItemIcon>
                <ListItemText primary="📺 PANTALLA TV" primaryTypographyProps={{ fontWeight: 700 }} />
              </ListItemButton>
            </>
          )}

          {/* ── CONTADOR ──────────────────────────────────────────────────────── */}
          {rolToken === "contador" && (
            <>
              <ListItemButton sx={drawerItemSx} onClick={() => navegar("/corte")}>
                <ListItemIcon sx={drawerIconSx}><ContentCutIcon /></ListItemIcon>
                <ListItemText primary="Cortes" />
              </ListItemButton>
              <ListItemButton sx={drawerItemSx} onClick={() => navegar("/comisiones")}>
                <ListItemIcon sx={drawerIconSx}><MonetizationOnIcon /></ListItemIcon>
                <ListItemText primary="Comisiones" />
              </ListItemButton>
              <ListItemButton sx={drawerItemSx} onClick={() => navegar("/traspasos/admin")}>
                <ListItemIcon sx={drawerIconSx}><SwapHorizIcon /></ListItemIcon>
                <ListItemText primary="Traspasos" />
              </ListItemButton>
              <ListItemButton sx={drawerItemSx} onClick={() => navegar("/usuarios")}>
                <ListItemIcon sx={drawerIconSx}><PeopleIcon /></ListItemIcon>
                <ListItemText primary="Usuarios" />
              </ListItemButton>
              {/* OCULTO - pantalla vieja de inventario, generaba confusion. Usar Entrada de Mercancia / Productos.
              <ListItemButton sx={drawerItemSx} onClick={() => navegar("/inventario")}>
                <ListItemIcon sx={drawerIconSx}><InventoryIcon /></ListItemIcon>
                <ListItemText primary="Inventario" />
              </ListItemButton>
              */}
              <ListItemButton sx={drawerItemSx} onClick={() => navegar("/ventas/chips")}>
                <ListItemIcon sx={drawerIconSx}><SimCardIcon /></ListItemIcon>
                <ListItemText primary="Chips" />
              </ListItemButton>
            </>
          )}

          {/* ── ENCARGADO ─────────────────────────────────────────────────────── */}
          {rolToken === "encargado" && (
            <>
              <ListItemButton sx={drawerItemSx} onClick={() => navegar("/kardex")}>
                <ListItemIcon sx={drawerIconSx}><ListAltIcon /></ListItemIcon>
                <ListItemText primary="Kardex" />
              </ListItemButton>
              <ListItemButton sx={drawerItemSx} onClick={() => navegar("/mi-nomina")}>
                <ListItemIcon sx={{ ...drawerIconSx, color: "#7c3aed" }}><ReceiptLongIcon /></ListItemIcon>
                <ListItemText primary="Mi Nómina" primaryTypographyProps={{ color: "#7c3aed", fontWeight: 600 }} />
              </ListItemButton>
              <ListItemButton sx={drawerItemSx} onClick={() => navegar("/traspasos")}>
                <ListItemIcon sx={drawerIconSx}><SwapHorizIcon /></ListItemIcon>
                <ListItemText primary="Traspasos" />
              </ListItemButton>
              <ListItemButton sx={drawerItemSx} onClick={() => navegar("/ventas")}>
                <ListItemIcon sx={drawerIconSx}><ConfirmationNumberIcon /></ListItemIcon>
                <ListItemText primary="Ticket" />
              </ListItemButton>
              <ListItemButton sx={drawerItemSx} onClick={() => navegar("/comisiones/usuario")}>
                <ListItemIcon sx={drawerIconSx}><MonetizationOnIcon /></ListItemIcon>
                <ListItemText primary="Comisiones" />
              </ListItemButton>
              <ListItemButton sx={drawerItemSx} onClick={() => navegar("/inventario/modulo")}>
                <ListItemIcon sx={drawerIconSx}><InventoryIcon /></ListItemIcon>
                <ListItemText primary="Inventario" />
              </ListItemButton>
              <ListItemButton sx={drawerItemSx} onClick={() => navegar("/equipos_telcel")}>
                <ListItemIcon sx={drawerIconSx}><InventoryIcon /></ListItemIcon>
                <ListItemText primary="Equipos Telcel" />
              </ListItemButton>
              <ListItemButton sx={drawerItemSx} onClick={() => navegar("/ventas/chips")}>
                <ListItemIcon sx={drawerIconSx}><SimCardIcon /></ListItemIcon>
                <ListItemText primary="Chips" />
              </ListItemButton>
              <ListItemButton sx={drawerItemSx} onClick={() => navegar("/corte")}>
                <ListItemIcon sx={drawerIconSx}><ContentCutIcon /></ListItemIcon>
                <ListItemText primary="Corte" />
              </ListItemButton>
              <ListItemButton sx={drawerItemSx} onClick={() => navegar("/ranking")}>
                <ListItemIcon sx={drawerIconSx}><BarChartIcon /></ListItemIcon>
                <ListItemText primary="ESTADÍSTICAS" primaryTypographyProps={{ fontWeight: 700 }} />
              </ListItemButton>
            </>
          )}

          {/* ── ASESOR ────────────────────────────────────────────────────────── */}
          {rolToken === "asesor" && (
            <>
              <ListItemButton sx={drawerItemSx} onClick={() => navegar("/mi-nomina")}>
                <ListItemIcon sx={{ ...drawerIconSx, color: "#7c3aed" }}><ReceiptLongIcon /></ListItemIcon>
                <ListItemText primary="Mi Nómina" primaryTypographyProps={{ color: "#7c3aed", fontWeight: 600 }} />
              </ListItemButton>
              <ListItemButton sx={drawerItemSx} onClick={() => navegar("/ventas")}>
                <ListItemIcon sx={drawerIconSx}><ConfirmationNumberIcon /></ListItemIcon>
                <ListItemText primary="Ticket" />
              </ListItemButton>
              <ListItemButton sx={drawerItemSx} onClick={() => navegar("/comisiones/usuario")}>
                <ListItemIcon sx={drawerIconSx}><MonetizationOnIcon /></ListItemIcon>
                <ListItemText primary="Comisiones" />
              </ListItemButton>
              <ListItemButton sx={drawerItemSx} onClick={() => navegar("/ventas/chips")}>
                <ListItemIcon sx={drawerIconSx}><SimCardIcon /></ListItemIcon>
                <ListItemText primary="Chips" />
              </ListItemButton>
              {!modulo.toLowerCase().includes("cadena") && (
                <ListItemButton sx={drawerItemSx} onClick={() => navegar("/corte")}>
                  <ListItemIcon sx={drawerIconSx}><ContentCutIcon /></ListItemIcon>
                  <ListItemText primary="Corte" />
                </ListItemButton>
              )}
              {!modulo.toLowerCase().includes("cadena") && (
                <ListItemButton sx={drawerItemSx} onClick={() => navegar("/ranking")}>
                  <ListItemIcon sx={drawerIconSx}><BarChartIcon /></ListItemIcon>
                  <ListItemText primary="ESTADÍSTICAS" primaryTypographyProps={{ fontWeight: 700 }} />
                </ListItemButton>
              )}
            </>
          )}

          {/* ── DIRECCIÓN ─────────────────────────────────────────────────────── */}
          {rolToken === "direccion" && (
            <>
              <ListItemButton sx={drawerItemSx} onClick={() => navegar("/direccion")}>
                <ListItemIcon sx={{ ...drawerIconSx, color: "#f97316" }}><ContentCutIcon /></ListItemIcon>
                <ListItemText primary="Cortes" primaryTypographyProps={{ color: "#f97316", fontWeight: 700 }} />
              </ListItemButton>
              <ListItemButton sx={drawerItemSx} onClick={() => navegar("/recargas")}>
                <ListItemIcon sx={drawerIconSx}><ReceiptLongIcon /></ListItemIcon>
                <ListItemText primary="RECARGAS" primaryTypographyProps={{ fontWeight: 700 }} />
              </ListItemButton>
              <ListItemButton sx={drawerItemSx} onClick={() => navegar("/estadisticas")}>
                <ListItemIcon sx={drawerIconSx}><BarChartIcon /></ListItemIcon>
                <ListItemText primary="ESTADÍSTICAS" primaryTypographyProps={{ fontWeight: 700 }} />
              </ListItemButton>
              <ListItemButton sx={drawerItemSx} onClick={() => navegar("/pantalla-tv")}>
                <ListItemIcon sx={drawerIconSx}><BarChartIcon /></ListItemIcon>
                <ListItemText primary="📺 PANTALLA TV" primaryTypographyProps={{ fontWeight: 700 }} />
              </ListItemButton>
              <ListItemButton sx={drawerItemSx} onClick={() => navegar("/quien-tiene")}>
                <ListItemIcon sx={drawerIconSx}><ManageSearchIcon /></ListItemIcon>
                <ListItemText primary="QUIEN TIENE" primaryTypographyProps={{ fontWeight: 700 }} />
              </ListItemButton>
              <ListItemButton sx={drawerItemSx} onClick={() => navegar("/tiempo-real")}>
                <ListItemIcon sx={drawerIconSx}><BoltIcon /></ListItemIcon>
                <ListItemText primary="⚡ TIEMPO REAL" primaryTypographyProps={{ fontWeight: 700 }} />
              </ListItemButton>
            </>
          )}

          {/* ── ASISTENCIA (condicional) ───────────────────────────────────────── */}
          {mostrarAsistencia && (
            <ListItemButton sx={drawerItemSx} onClick={() => navegar("/asistencia")}>
              <ListItemIcon sx={drawerIconSx}><AccessTimeIcon /></ListItemIcon>
              <ListItemText primary="ASISTENCIA" primaryTypographyProps={{ fontWeight: 700 }} />
            </ListItemButton>
          )}

          {rolToken === "direccion" && (
            <ListItemButton sx={drawerItemSx} onClick={() => navegar("/sueldos-encargados")}>
              <ListItemIcon sx={drawerIconSx}><PaymentsIcon /></ListItemIcon>
              <ListItemText primary="SUELDOS ENCARGADOS" primaryTypographyProps={{ fontWeight: 700 }} />
            </ListItemButton>
          )}

          {rolToken === "direccion" && (
            <ListItemButton sx={drawerItemSx} onClick={() => navegar("/reportes-director")}>
              <ListItemIcon sx={drawerIconSx}><ReceiptLongIcon /></ListItemIcon>
              <ListItemText primary="REPORTE DIARIO" primaryTypographyProps={{ fontWeight: 700 }} />
            </ListItemButton>
          )}

          <Divider sx={{ my: 1 }} />

          {/* ── CERRAR SESIÓN ─────────────────────────────────────────────────── */}
          <ListItemButton
            sx={{
              ...drawerItemSx,
              color: "#dc2626",
              "&:hover": {
                bgcolor: "rgba(220,38,38,0.08)",
                color: "#dc2626",
                "& .MuiListItemIcon-root": { color: "#dc2626" },
              },
            }}
            onClick={() => { setDrawerOpen(false); cerrarSesion(); }}
          >
            <ListItemIcon sx={{ ...drawerIconSx, color: "#dc2626" }}><LogoutIcon /></ListItemIcon>
            <ListItemText primary="Cerrar sesión" primaryTypographyProps={{ fontWeight: 600 }} />
          </ListItemButton>

        </List>
      </Drawer>
    </>
  );
};

export default Navbar;
