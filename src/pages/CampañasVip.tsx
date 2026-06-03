import React, { useEffect, useState } from "react";
import { Box, TextField, Button, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";

interface Cliente {
  telefono: string;
}

const CampañasVIP = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [mensaje, setMensaje] = useState(
    "Hola, 🎉 tienes una promoción especial"
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`https://ato-appservidor-nvxt.onrender.com/ventas/clientes_vip`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setClientes(data));
  }, []);

  const generarLink = (telefono: string) => {
    const mensajeCodificado = encodeURIComponent(mensaje);

    return `https://wa.me/${telefono}?text=${mensajeCodificado}`;
  };

  return (
    <Box p={2}>
      {/* INPUT MENSAJE */}
      <TextField
        fullWidth
        label="Mensaje de campaña"
        multiline
        rows={3}
        value={mensaje}
        onChange={(e) => setMensaje(e.target.value)}
      />

      {/* TABLA */}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Teléfono</TableCell>
            <TableCell>Acción</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {clientes.map((cliente, index) => (
            <TableRow key={index}>
              <TableCell>{cliente.telefono}</TableCell>
              <TableCell>
                <Button
                  onClick={() =>
                    window.open(
                      generarLink(cliente.telefono),
                      "_blank"
                    )
                  }
                >
                  Enviar WhatsApp
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

export default CampañasVIP;
