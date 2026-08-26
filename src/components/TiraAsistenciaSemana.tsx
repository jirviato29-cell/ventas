import { useEffect, useState } from "react";
import axios from "axios";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CameraAltRoundedIcon from "@mui/icons-material/CameraAltRounded";
import useMediaQuery from "@mui/material/useMediaQuery";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";

const API = "https://ato-appservidor-nvxt.onrender.com";
const FONT = "Inter, system-ui, -apple-system, sans-serif";

interface MarcaDia { hora: string; foto_url: string | null; dentro_de_zona: boolean | null; }
interface DiaSemana {
  fecha: string; dia_semana: string;
  entrada: MarcaDia | null; salida: MarcaDia | null;
  horas: number | null;
  estado: "completo" | "en_turno" | "falta" | "pendiente";
}
interface SemanaDetalle { semana_inicio: string; semana_fin: string; dias: DiaSemana[]; }

const HOY = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

function Foto({ marca }: { marca: MarcaDia | null }) {
  if (marca?.foto_url) {
    return (
      <img src={marca.foto_url} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", border: "1px solid #e2e8f0" }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
    );
  }
  return (
    <div style={{ width: 44, height: 44, borderRadius: 8, background: "#f1f5f9", border: "1px dashed #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <CameraAltRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} />
    </div>
  );
}

export default function TiraAsistenciaSemana() {
  const token = localStorage.getItem("token");
  const [data, setData] = useState<SemanaDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [offset, setOffset] = useState(0);
  const esMovil = useMediaQuery("(max-width:600px)");

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      try {
        const r = await axios.get<SemanaDetalle>(`${API}/asistencia/mi-semana`, { params: { offset }, headers: { Authorization: `Bearer ${token}` } });
        setData(r.data);
      } catch { /* conserva la semana previa visible */ }
      finally { setCargando(false); }
    };
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset]);

  if (!data) return null;

  const fmtRango = (ini: string, fin: string) => {
    const meses = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
    const d = (s: string) => { const [, m, day] = s.split("-"); return `${parseInt(day)} ${meses[parseInt(m) - 1]}`; };
    return `${d(ini)} – ${d(fin)}`;
  };

  return (
    <div style={{ fontFamily: FONT, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AccessTimeRoundedIcon sx={{ fontSize: 20, color: "#FF6600" }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: "#16213e" }}>Mi asistencia de la semana</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            onClick={() => setOffset(offset - 1)}
            disabled={cargando || offset <= -52}
            style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 8,
                     width: 30, height: 30, display: "flex", alignItems: "center",
                     justifyContent: "center", cursor: "pointer", padding: 0 }}
            aria-label="Semana anterior"
          >
            <ChevronLeftRoundedIcon sx={{ fontSize: 18, color: "#64748b" }} />
          </button>
          <span style={{ fontSize: 12, color: "#64748b", minWidth: 92, textAlign: "center",
                         opacity: cargando ? 0.5 : 1 }}>
            {fmtRango(data.semana_inicio, data.semana_fin)}
          </span>
          <button
            onClick={() => setOffset(offset + 1)}
            disabled={cargando || offset >= 0}
            style={{ border: "1px solid #e2e8f0",
                     background: offset >= 0 ? "#f8fafc" : "#fff", borderRadius: 8,
                     width: 30, height: 30, display: "flex", alignItems: "center",
                     justifyContent: "center",
                     cursor: offset >= 0 ? "default" : "pointer", padding: 0 }}
            aria-label="Semana siguiente"
          >
            <ChevronRightRoundedIcon sx={{ fontSize: 18, color: offset >= 0 ? "#cbd5e1" : "#64748b" }} />
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: esMovil ? "1fr" : "repeat(7, 1fr)", gap: 10 }}>
        {data.dias.map((dia) => {
          const esHoy = dia.fecha === HOY;
          const num = parseInt(dia.fecha.split("-")[2]);
          const enZona = dia.entrada?.dentro_de_zona ?? dia.salida?.dentro_de_zona ?? null;
          const conDatos = dia.entrada || dia.salida;
          const esFalta = dia.estado === "falta";

          let cardBg = "#fff";
          let cardBorder = "1px solid #e2e8f0";
          if (dia.estado === "completo") { cardBg = "#f0fdf6"; cardBorder = "1px solid #16a34a"; }
          else if (dia.estado === "falta") { cardBg = "#fef2f2"; cardBorder = "1px solid #dc2626"; }
          else if (dia.estado === "en_turno") { cardBg = "#fff7ed"; cardBorder = "1px solid #FF6600"; }
          else { cardBg = "#f8fafc"; cardBorder = "1px dashed #cbd5e1"; }
          if (esHoy) cardBorder = "2px solid #FF6600";

          return (
            <div key={dia.fecha} style={{
              border: cardBorder,
              background: cardBg,
              borderRadius: 12,
              padding: esMovil ? "10px 14px" : "12px 8px",
              minHeight: esMovil ? 0 : 150,
              gap: esMovil ? 12 : 0,
              display: "flex",
              flexDirection: esMovil ? "row" : "column",
              alignItems: "center",
              justifyContent: esMovil ? "flex-start" : "space-between",
            }}>
              <div style={{ textAlign: esMovil ? "left" : "center", minWidth: esMovil ? 62 : "auto" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: esHoy ? "#FF6600" : "#16213e" }}>
                  {dia.dia_semana}{esHoy ? " · hoy" : ""}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{num}</div>
              </div>

              {conDatos ? (
                <>
                  <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                    <Foto marca={dia.entrada} />
                    <Foto marca={dia.salida} />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      {dia.entrada?.hora ?? "—"} · {dia.salida?.hora ?? "—"}
                    </div>
                    {dia.horas != null ? (
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#FF6600", marginTop: 2 }}>{dia.horas} h</div>
                    ) : (
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", marginTop: 2 }}>En turno</div>
                    )}
                  </div>
                  {enZona != null ? (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 3, background: enZona ? "#dcfce7" : "#fef3c7", padding: "2px 8px", borderRadius: 20 }}>
                      <CheckCircleRoundedIcon sx={{ fontSize: 12, color: enZona ? "#16a34a" : "#d97706" }} />
                      <span style={{ fontSize: 10, fontWeight: 600, color: enZona ? "#15803d" : "#b45309" }}>{enZona ? "En zona" : "Fuera"}</span>
                    </div>
                  ) : <div />}
                </>
              ) : (
                <>
                  <div style={{ fontSize: 22, color: "#cbd5e1", lineHeight: 1 }}>—</div>
                  <div style={{
                    fontSize: 12, fontWeight: 700,
                    color: esFalta ? "#dc2626" : "#94a3b8",
                    background: esFalta ? "#fef2f2" : "#f1f5f9",
                    padding: "3px 10px", borderRadius: 20,
                  }}>
                    {esFalta ? "Falta" : "Pendiente"}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
