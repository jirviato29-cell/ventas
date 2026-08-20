import React, { useEffect, useState } from "react";
import {
  TableContainer, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, Checkbox, Typography, Box, Button,
} from "@mui/material";
import axios from "axios";
import { Usuario, VentaChip } from "../Types";
import { obtenerRolDesdeToken } from "../components/Token";
import DeleteIcon from "@mui/icons-material/Delete";

const getDuplicados = (arr: VentaChip[]): Set<string> => {
  const counts: Record<string, number> = {};
  arr.forEach((c) => { counts[c.numero_telefono] = (counts[c.numero_telefono] || 0) + 1; });
  return new Set(Object.keys(counts).filter((k) => counts[k] > 1));
};

const sortConDuplicados = (arr: VentaChip[], dups: Set<string>): VentaChip[] =>
  [...arr].sort((a, b) => (dups.has(a.numero_telefono) ? 0 : 1) - (dups.has(b.numero_telefono) ? 0 : 1));

const rowDupSx  = { bgcolor: "#fee2e2" };
const cellDupSx = { color: "#b91c1c", fontWeight: 700 };

const rowIncSx  = { bgcolor: "#FAEEDA", color: "#412402", "&:hover": { bgcolor: "#F5E3C4" }, "& td:first-of-type": { borderLeft: "3px solid #BA7517" } };
const cellIncSx = { color: "#854F0B", fontWeight: 500 };

const gridHeadSx = { py: "8px", px: "10px", fontSize: 15, fontWeight: 700, textAlign: "center", bgcolor: "#f8fafc", borderBottom: "2px solid #cbd5e1", borderRight: "1px solid #e2e8f0", color: "#334155" };
const gridCellSx = { py: "7px", px: "10px", fontSize: 15, textAlign: "center", borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0" };
const gridNumSx  = { ...gridCellSx, fontWeight: 600, fontFamily: "monospace", letterSpacing: "0.5px" };

const cellSx   = { py: "2px", px: "6px", fontSize: 16 };
const headSx   = { py: "4px", px: "6px", fontSize: 16, fontWeight: 700 };
const numSx    = { ...cellSx, fontWeight: 600 };
const numDupSx = { ...numSx, color: "#b91c1c" };

// Anchos fijos — tabla admin (Empleado, Tipo, Número, IMEI, Recarga, Fecha, Validar, Rechazo, Eliminar)
const colWidthsAdmin = ["160px", "130px", "130px", "140px", "80px", "100px", "120px", "150px", "36px"];
// Anchos fijos — tabla asesor/encargado
const colWidthsUser  = ["160px", "130px", "130px", "80px", "100px", "150px", "36px"];

const COMISION_POR_TIPO: Record<string, number> = {
  "Chip Equipo":          15,
  "Chip Express":          5,
  "Portabilidad":         50,
  "Chip Cero/Libre":      25,
  "Chip Preactivado":     35,
  "Chip Coppel":          10,
  "Portabilidad Coppel":  25,
  "Porta Otras cadenas":  50,
  "Tarjetas PayJoy":      50,
};

const ChipsAdmin = () => {
  const [chips, setChips]                     = useState<VentaChip[]>([]);
  const [usuarios, setUsuarios]               = useState<Usuario[]>([]);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<number | null>(null);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<string>("");
  const token = localStorage.getItem("token");
  const rol   = obtenerRolDesdeToken();
  const [chipsAsesor, setChipsAsesor] = useState<VentaChip[]>([]);
  const [vistaAsesor, setVistaAsesor] = useState<'pendientes' | 'incubadora'>('pendientes');

  const fetchChips = async () => {
    try {
      const params: any = {};
      if (empleadoSeleccionado) params.empleado_id = empleadoSeleccionado;
      params.solo_pendientes = true;
      const res = await axios.get(`https://ato-appservidor-nvxt.onrender.com/ventas/venta_chips`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      const sinValidados = res.data
        .filter((c: VentaChip) => !c.validado && !c.es_incubadora)
        .sort((a: VentaChip, b: VentaChip) =>
          new Date(`${b.fecha}T${b.hora}`).getTime() - new Date(`${a.fecha}T${a.hora}`).getTime()
        );
      setChips(sinValidados);
    } catch (error) {
      console.error("Error al cargar chips:", error);
    }
  };

  const fetchChipsAsesor = async () => {
    try {
      const res = await axios.get<VentaChip[]>(
        `https://ato-appservidor-nvxt.onrender.com/ventas/venta_chips`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setChipsAsesor(
        res.data.sort((a, b) =>
          new Date(`${b.fecha}T${b.hora}`).getTime() - new Date(`${a.fecha}T${a.hora}`).getTime()
        )
      );
    } catch (error) {
      console.error("Error al cargar chips del asesor:", error);
    }
  };

  useEffect(() => {
    if (rol === 'asesor' || rol === 'encargado') fetchChipsAsesor();
  }, []);

  useEffect(() => {
    axios
      .get(`https://ato-appservidor-nvxt.onrender.com/registro/usuarios`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => setUsuarios(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchChips(); }, [empleadoSeleccionado]);

  const eliminarChip = async (id: number) => {
    if (!window.confirm("¿Seguro que quieres eliminar este chip?")) return;
    try {
      await axios.delete(`https://ato-appservidor-nvxt.onrender.com/ventas/eliminar_chip/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChips((prev) => prev.filter((c) => c.id !== id));
      setChipsAsesor((prev) => prev.filter((c) => c.id !== id));
    } catch {
      alert("No se pudo eliminar el chip");
    }
  };

  const validarChip = async (id: number, tipo_chip: string, comision?: number) => {
    if (
      tipo_chip === "Activacion" &&
      (comision === undefined || comision === null || isNaN(Number(comision)) || Number(comision) <= 0)
    ) {
      alert("Por favor ingresa una comisión válida para chips de tipo Activación.");
      return;
    }
    try {
      await axios.put(
        `https://ato-appservidor-nvxt.onrender.com/ventas/venta_chips/${id}/validar`,
        { comision_manual: comision },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setChips((prev) => prev.map((c) => (c.id === id ? { ...c, validado: true } : c)));
    } catch {
      alert("Error al validar chip");
    }
  };

  const tiposDisponibles = Array.from(
    new Set(chips.map((c) => c.tipo_chip).filter(Boolean))
  ).sort();

  return (
    <Box sx={{ mt: 2 }}>
      {rol === "admin" && (
        <>
          <Typography variant="h6" gutterBottom>Validación de Chips Vendidos</Typography>

          <Box sx={{ mb: 1, display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2">Empleado:</Typography>
              <select
                value={empleadoSeleccionado ?? ""}
                onChange={(e) => setEmpleadoSeleccionado(e.target.value ? Number(e.target.value) : null)}
                style={{ fontSize: 14 }}
              >
                <option value="">(Todos)</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>{u.username}</option>
                ))}
              </select>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2">Tipo:</Typography>
              <select
                value={tipoSeleccionado}
                onChange={(e) => setTipoSeleccionado(e.target.value)}
                style={{ fontSize: 14 }}
              >
                <option value="">(Todos los tipos)</option>
                {tiposDisponibles.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Box>
            <Button size="small" href="/chips_invalidos">Incubadora</Button>
            <Button size="small" href="/promos">Promociones Clientes</Button>
          </Box>

          <TableContainer component={Paper}>
            <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
              <colgroup>
                {colWidthsAdmin.map((w, i) => <col key={i} style={{ width: w }} />)}
              </colgroup>
              <TableHead>
                <TableRow>
                  <TableCell sx={headSx}>Empleado</TableCell>
                  <TableCell sx={headSx}>Tipo</TableCell>
                  <TableCell sx={headSx}>Número</TableCell>
                  <TableCell sx={headSx}>IMEI</TableCell>
                  <TableCell sx={headSx}>Recarga</TableCell>
                  <TableCell sx={headSx}>Fecha</TableCell>
                  <TableCell sx={headSx}>Validar</TableCell>
                  <TableCell sx={headSx}>Rechazo</TableCell>
                  <TableCell sx={headSx}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(() => {
                  const filtrados = chips.filter((c) => !c.validado && !c.es_incubadora && (tipoSeleccionado === "" || c.tipo_chip === tipoSeleccionado));
                  const dups = getDuplicados(filtrados);
                  return sortConDuplicados(filtrados, dups).map((chip) => {
                    const esDup = dups.has(chip.numero_telefono);
                    const dupCell = esDup ? { ...cellSx, ...cellDupSx } : cellSx;
                    return (
                      <TableRow key={chip.id} sx={esDup ? rowDupSx : {}}>
                        <TableCell sx={dupCell}>{chip.empleado?.username ?? "Eliminado"}</TableCell>
                        <TableCell sx={dupCell}>{chip.tipo_chip}</TableCell>
                        <TableCell sx={esDup ? numDupSx : numSx}>{chip.numero_telefono}</TableCell>
                        <TableCell sx={numSx}>{chip.imei || "—"}</TableCell>
                        <TableCell sx={numSx}>${chip.monto_recarga.toFixed(2)}</TableCell>
                        <TableCell sx={cellSx}>{chip.fecha}</TableCell>

                        <TableCell sx={cellSx}>
                          {chip.tipo_chip === "Activacion" && !chip.validado ? (
                            <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <input
                                type="number"
                                placeholder="$"
                                value={chip.comision || ""}
                                onChange={(e) =>
                                  setChips((prev) =>
                                    prev.map((c) =>
                                      c.id === chip.id ? { ...c, comision: parseFloat(e.target.value) } : c
                                    )
                                  )
                                }
                                style={{ width: 52, fontSize: 11, padding: "1px 4px" }}
                              />
                              <button
                                onClick={() => validarChip(chip.id, chip.tipo_chip, chip.comision)}
                                disabled={!chip.comision}
                                style={{
                                  padding: "2px 6px",
                                  fontSize: 11,
                                  backgroundColor: "#f97316",
                                  color: "white",
                                  border: "none",
                                  borderRadius: 3,
                                  cursor: "pointer",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                Validar
                              </button>
                            </Box>
                          ) : chip.validado ? (
                            <Typography sx={{ fontSize: 12, color: "green" }}>${chip.comision}</Typography>
                          ) : (
                            <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              {COMISION_POR_TIPO[chip.tipo_chip] !== undefined && (
                                <Typography sx={{ fontSize: 11, color: "#64748b" }}>
                                  ${COMISION_POR_TIPO[chip.tipo_chip]}
                                </Typography>
                              )}
                              <Checkbox
                                size="small"
                                checked={chip.validado}
                                onChange={() => validarChip(chip.id, chip.tipo_chip, chip.comision_manual)}
                                disabled={chip.validado}
                                color="success"
                              />
                            </Box>
                          )}
                        </TableCell>

                        <TableCell sx={cellSx}>
                          {chip.validado ? (
                            <Typography sx={{ fontSize: 12, color: "green" }}>${chip.comision}</Typography>
                          ) : (
                            <Button
                              size="small"
                              variant={chip.descripcion_rechazo ? "contained" : "outlined"}
                              color="warning"
                              sx={{ fontSize: 10, textTransform: "none", lineHeight: 1.2, py: 0.2 }}
                              onClick={async () => {
                                const motivo = chip.descripcion_rechazo ? "" : "Lista de Espera Incubado";
                                try {
                                  await axios.put(
                                    `https://ato-appservidor-nvxt.onrender.com/ventas/venta_chips/${chip.id}/motivo_rechazo`,
                                    { descripcion: motivo },
                                    { headers: { Authorization: `Bearer ${token}` } }
                                  );
                                  setChips((prev) =>
                                    prev.map((c) =>
                                      c.id === chip.id
                                        ? { ...c, descripcion_rechazo: motivo || null, es_incubadora: !!motivo }
                                        : c
                                    )
                                  );
                                } catch {
                                  alert("Error al enviar motivo de rechazo");
                                }
                              }}
                            >
                              {chip.descripcion_rechazo ? "Quitar" : "Lista de Espera Incubado"}
                            </Button>
                          )}
                        </TableCell>

                        <TableCell sx={cellSx}>
                          {esDup && (
                            <Button color="error" size="small" onClick={() => eliminarChip(chip.id)}>
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  });
                })()}
                {chips.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={cellSx}>
                      No hay chips registrados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {(rol === "encargado" || rol === "asesor") && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>Mis Chips Vendidos</Typography>

          {/* Botones toggle */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 2 }}>
            <Button
              fullWidth
              size="large"
              onClick={() => setVistaAsesor('pendientes')}
              sx={vistaAsesor === 'pendientes'
                ? { bgcolor: '#f97316', color: 'white', border: '2px solid #f97316', fontWeight: 700, '&:hover': { bgcolor: '#ea6c0a' } }
                : { bgcolor: 'transparent', color: '#f97316', border: '2px solid #f97316', fontWeight: 700, '&:hover': { bgcolor: 'rgba(249,115,22,0.08)' } }
              }
            >
              CHIPS PENDIENTES POR REVISAR
            </Button>
            <Button
              fullWidth
              size="large"
              onClick={() => setVistaAsesor('incubadora')}
              sx={vistaAsesor === 'incubadora'
                ? { bgcolor: '#7c3aed', color: 'white', border: '2px solid #7c3aed', fontWeight: 700, '&:hover': { bgcolor: '#6d28d9' } }
                : { bgcolor: 'transparent', color: '#7c3aed', border: '2px solid #7c3aed', fontWeight: 700, '&:hover': { bgcolor: 'rgba(124,58,237,0.08)' } }
              }
            >
              CHIPS EN INCUBADORA EN ESPERA
            </Button>
          </Box>

          {/* Tabla: Pendientes */}
          {vistaAsesor === 'pendientes' && (() => {
            const pendientes = chipsAsesor.filter((c) => !c.validado && !c.es_incubadora);
            const dups = getDuplicados(pendientes);
            return (
              <>
                <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
                  Mostrando {pendientes.length} chips
                </Typography>
                <TableContainer component={Paper}>
                  <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                      {colWidthsUser.map((w, i) => <col key={i} style={{ width: w }} />)}
                    </colgroup>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={headSx}>Empleado</TableCell>
                        <TableCell sx={headSx}>Tipo</TableCell>
                        <TableCell sx={headSx}>Número</TableCell>
                        <TableCell sx={headSx}>Recarga</TableCell>
                        <TableCell sx={headSx}>Fecha</TableCell>
                        <TableCell sx={headSx}>Estado</TableCell>
                        <TableCell sx={headSx}></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortConDuplicados(pendientes, dups).map((chip) => {
                        const esDup = dups.has(chip.numero_telefono);
                        const dupCell = esDup ? { ...cellSx, ...cellDupSx } : cellSx;
                        return (
                          <TableRow key={chip.id} sx={esDup ? rowDupSx : {}}>
                            <TableCell sx={dupCell}>{chip.empleado?.username ?? 'Eliminado'}</TableCell>
                            <TableCell sx={dupCell}>{chip.tipo_chip}</TableCell>
                            <TableCell sx={esDup ? numDupSx : numSx}>{chip.numero_telefono}</TableCell>
                            <TableCell sx={numSx}>${chip.monto_recarga.toFixed(2)}</TableCell>
                            <TableCell sx={cellSx}>{chip.fecha}</TableCell>
                            <TableCell sx={cellSx}>Pendiente</TableCell>
                            <TableCell sx={cellSx}>
                              <Button color="error" size="small" onClick={() => eliminarChip(chip.id)}>
                                <DeleteIcon sx={{ fontSize: 16 }} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {pendientes.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={cellSx}>
                            No hay chips pendientes
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            );
          })()}

          {/* Tabla: Incubadora */}
          {vistaAsesor === 'incubadora' && (() => {
            const enIncubadora = chipsAsesor
              .filter((c) => c.es_incubadora && !(c.validado && c.comision_pagada))
              .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
            return (
              <>
                <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
                  Mostrando {enIncubadora.length} chips
                </Typography>
                <TableContainer component={Paper} sx={{ maxWidth: 1000, mx: "auto", border: "1px solid #cbd5e1", borderRadius: 2, overflow: "hidden" }}>
                  <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                      {['160px', '130px', '130px', '80px', '100px', '1fr'].map((w, i) => (
                        <col key={i} style={{ width: w }} />
                      ))}
                    </colgroup>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={gridHeadSx}>Empleado</TableCell>
                        <TableCell sx={gridHeadSx}>Tipo</TableCell>
                        <TableCell sx={gridHeadSx}>Número</TableCell>
                        <TableCell sx={gridHeadSx}>Recarga</TableCell>
                        <TableCell sx={gridHeadSx}>Fecha</TableCell>
                        <TableCell sx={gridHeadSx}>Motivo</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {enIncubadora.map((chip) => (
                        <TableRow key={chip.id} sx={rowIncSx}>
                          <TableCell sx={gridCellSx}>{chip.empleado?.username ?? 'Eliminado'}</TableCell>
                          <TableCell sx={gridCellSx}>{chip.tipo_chip}</TableCell>
                          <TableCell sx={gridNumSx}>{chip.numero_telefono}</TableCell>
                          <TableCell sx={gridNumSx}>${chip.monto_recarga.toFixed(2)}</TableCell>
                          <TableCell sx={gridCellSx}>{chip.fecha}</TableCell>
                          <TableCell sx={{ ...gridCellSx, ...cellIncSx }}>
                            {chip.descripcion_rechazo ? 'Lista de Espera Incubado' : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                      {enIncubadora.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={gridCellSx}>
                            No hay chips en incubadora
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            );
          })()}
        </Box>
      )}
    </Box>
  );
};

export default ChipsAdmin;
