import React, { useRef, useState } from "react";
import { Box, Button, MenuItem, Paper, TextField, Typography } from "@mui/material";
import axios from "axios";

interface Props {
  empleados: any[];
  modulos: any[];
}

const RegistroPlan: React.FC<Props> = ({ empleados, modulos }) => {
  const inputRefs = {
    tramite: useRef<HTMLInputElement>(null),
    plan: useRef<HTMLInputElement>(null),
    empleado: useRef<HTMLInputElement>(null),
    modulo: useRef<HTMLInputElement>(null),
  };

  const [plan, setPlan] = useState({
    tipo_tramite: "",
    tipo_plan: "",
    empleado_id: "",
    modulo_id: "",
  });

  const token = localStorage.getItem("token");
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const guardarPlan = async () => {
    try {
      await axios.post(
        `https://ato-appservidor-nvxt.onrender.com/dashboard/planes`,
        {
          ...plan,
          empleado_id: Number(plan.empleado_id),
          modulo_id: Number(plan.modulo_id),
        },
        config
      );
      setPlan({ tipo_tramite: "", tipo_plan: "", empleado_id: "", modulo_id: "" });
      inputRefs.tramite.current?.focus();
    } catch (err) {
      alert("Error al guardar");
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" mb={2}>
        Registro de Plan
      </Typography>
      <Box display="grid" gridTemplateColumns="repeat(2,1fr)" gap={2}>
        <TextField
          label="Tipo de trámite"
          value={plan.tipo_tramite}
          inputRef={inputRefs.tramite}
          onChange={(e) => setPlan({ ...plan, tipo_tramite: e.target.value })}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); inputRefs.plan.current?.focus(); } }}
          fullWidth
        />
        <TextField
          label="Tipo de plan"
          value={plan.tipo_plan}
          inputRef={inputRefs.plan}
          onChange={(e) => setPlan({ ...plan, tipo_plan: e.target.value })}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); inputRefs.empleado.current?.focus(); } }}
          fullWidth
        />
        <TextField
          select
          label="Empleado"
          value={plan.empleado_id}
          inputRef={inputRefs.empleado}
          onChange={(e) => setPlan({ ...plan, empleado_id: e.target.value })}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); inputRefs.modulo.current?.focus(); } }}
          fullWidth
        >
          {empleados.map((emp) => (
            <MenuItem key={emp.id} value={emp.id}>{emp.username}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Módulo"
          value={plan.modulo_id}
          inputRef={inputRefs.modulo}
          onChange={(e) => setPlan({ ...plan, modulo_id: e.target.value })}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); guardarPlan(); } }}
          fullWidth
        >
          {modulos.map((m) => (
            <MenuItem key={m.id} value={m.id}>{m.nombre}</MenuItem>
          ))}
        </TextField>
      </Box>
      <Button variant="contained" sx={{ mt: 3 }} fullWidth onClick={guardarPlan}>
        Guardar registro
      </Button>
    </Paper>
  );
};

export default RegistroPlan;
