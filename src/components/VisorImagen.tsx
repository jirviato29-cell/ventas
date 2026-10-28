import React, { useState } from "react";
import { Box, Dialog, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

// ── VisorImagen: miniatura clicable que abre la imagen a pantalla completa ────

interface VisorImagenProps {
  src: string;
  alt: string;
}

const VisorImagen: React.FC<VisorImagenProps> = ({ src, alt }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Box
        component="img"
        src={src}
        alt={alt}
        onClick={() => setOpen(true)}
        sx={{
          width: "100%",
          height: 220,
          objectFit: "contain",
          bgcolor: "#f8fafc",
          borderRadius: 1,
          border: "1px solid #e2e8f0",
          cursor: "zoom-in",
          display: "block",
        }}
      />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullScreen
        PaperProps={{ sx: { bgcolor: "#0f172a" } }}
      >
        <IconButton
          aria-label="Cerrar"
          onClick={() => setOpen(false)}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 1,
            color: "#f1f5f9",
            bgcolor: "rgba(15,23,42,0.6)",
            "&:hover": { bgcolor: "rgba(249,115,22,0.8)" },
          }}
        >
          <CloseIcon />
        </IconButton>
        <Box
          onClick={() => setOpen(false)}
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: 1,
          }}
        >
          <Box
            component="img"
            src={src}
            alt={alt}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            sx={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
          />
        </Box>
      </Dialog>
    </>
  );
};

export default VisorImagen;
