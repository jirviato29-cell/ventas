import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import { DiaTrabajo } from "../Types";

interface DiaState {
  dia: string;
  label: string;
  entrada: Dayjs | null;
  salida: Dayjs | null;
  descanso: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (horario: DiaTrabajo[], diaDescanso: string, totalHoras: number) => void;
  initialHorario?: DiaTrabajo[] | null;
}

const DIAS_CONFIG = [
  { dia: "lunes",     label: "Lunes"     },
  { dia: "martes",    label: "Martes"    },
  { dia: "miercoles", label: "Miércoles" },
  { dia: "jueves",    label: "Jueves"    },
  { dia: "viernes",   label: "Viernes"   },
  { dia: "sabado",    label: "Sábado"    },
  { dia: "domingo",   label: "Domingo"   },
];

const VACIO: DiaState[] = DIAS_CONFIG.map((cfg) => ({
  ...cfg, entrada: null, salida: null, descanso: false,
}));

const parseTime = (t: string | null): Dayjs | null => {
  if (!t) return null;
  const d = dayjs(`2000-01-01T${t}`);
  return d.isValid() ? d : null;
};

const calcHoras = (entrada: Dayjs | null, salida: Dayjs | null, descanso: boolean): number => {
  if (descanso || !entrada || !salida || !entrada.isValid() || !salida.isValid()) return 0;
  const diffMin = salida.diff(entrada, "minute");
  return diffMin > 0 ? diffMin / 60 : 0;
};

const HorarioDialog: React.FC<Props> = ({ open, onClose, onSave, initialHorario }) => {
  const [dias, setDias] = useState<DiaState[]>(VACIO);

  useEffect(() => {
    if (!open) return;
    if (initialHorario && initialHorario.length > 0) {
      setDias(
        DIAS_CONFIG.map((cfg) => {
          const d = initialHorario.find((x) => x.dia === cfg.dia);
          return {
            ...cfg,
            entrada: d?.entrada ? parseTime(d.entrada) : null,
            salida:  d?.salida  ? parseTime(d.salida)  : null,
            descanso: d?.descanso ?? false,
          };
        })
      );
    } else {
      setDias(VACIO);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const errores = useMemo(
    () =>
      dias.map(
        (d) =>
          !d.descanso &&
          d.entrada !== null &&
          d.salida !== null &&
          d.entrada.isValid() &&
          d.salida.isValid() &&
          !d.salida.isAfter(d.entrada)
      ),
    [dias]
  );

  const totalHoras = useMemo(
    () =>
      Math.round(
        dias.reduce((sum, d) => sum + calcHoras(d.entrada, d.salida, d.descanso), 0) * 100
      ) / 100,
    [dias]
  );

  const updDia = (i: number, patch: Partial<DiaState>) =>
    setDias((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  const limpiar = () => setDias(VACIO);

  const handleSave = () => {
    const horario: DiaTrabajo[] = dias.map((d) => ({
      dia: d.dia,
      entrada: d.descanso ? null : (d.entrada?.isValid() ? d.entrada.format("HH:mm") : null),
      salida:  d.descanso ? null : (d.salida?.isValid()  ? d.salida.format("HH:mm")  : null),
      descanso: d.descanso,
    }));
    const diaDescanso = dias.find((d) => d.descanso)?.dia ?? "";
    onSave(horario, diaDescanso, totalHoras);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Calculadora de horas semanales</DialogTitle>

        <DialogContent>
          <Table size="small" sx={{ mt: 1 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "#f8fafc" }}>
                {["Día", "Entrada", "Salida", "Horas", "Descanso"].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, color: "#FF6600" }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {dias.map((d, i) => (
                <TableRow
                  key={d.dia}
                  sx={{ bgcolor: d.descanso ? "#f1f5f9" : undefined, opacity: d.descanso ? 0.65 : 1 }}
                >
                  <TableCell sx={{ fontWeight: 600, minWidth: 90 }}>{d.label}</TableCell>

                  <TableCell>
                    <TimePicker
                      value={d.entrada}
                      onChange={(val) => updDia(i, { entrada: val })}
                      disabled={d.descanso}
                      ampm={false}
                      slotProps={{
                        textField: { size: "small", sx: { width: 120 }, error: errores[i] },
                      }}
                    />
                  </TableCell>

                  <TableCell>
                    <TimePicker
                      value={d.salida}
                      onChange={(val) => updDia(i, { salida: val })}
                      disabled={d.descanso}
                      ampm={false}
                      slotProps={{
                        textField: { size: "small", sx: { width: 120 }, error: errores[i] },
                      }}
                    />
                  </TableCell>

                  <TableCell align="center" sx={{ minWidth: 60 }}>
                    {d.descanso ? (
                      <Typography variant="body2" color="text.secondary">—</Typography>
                    ) : (
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        color={errores[i] ? "error" : "text.primary"}
                      >
                        {calcHoras(d.entrada, d.salida, d.descanso).toFixed(2)}h
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell align="center">
                    <Checkbox
                      size="small"
                      checked={d.descanso}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        updDia(i, {
                          descanso: checked,
                          ...(checked ? { entrada: null, salida: null } : {}),
                        });
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Box display="flex" justifyContent="flex-end" alignItems="center" mt={2} gap={1}>
            <Typography variant="h6" fontWeight={700}>Total semanal:</Typography>
            <Typography variant="h6" fontWeight={700} color="#FF6600">
              {totalHoras}h
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={limpiar} color="inherit" sx={{ mr: "auto" }}>
            Limpiar semana
          </Button>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={errores.some(Boolean)}
            onClick={handleSave}
            sx={{ bgcolor: "#16a34a", "&:hover": { bgcolor: "#15803d" } }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default HorarioDialog;
