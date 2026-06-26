import { useEffect, useState } from "react";
import axios from "axios";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CameraAltRoundedIcon from "@mui/icons-material/CameraAltRounded";

const API = "https://ato-appservidor-nvxt.onrender.com";
const FONT = "Inter, system-ui, -apple-system, sans-serif";

interface MarcaDia {
  hora: string;
  foto_url: string | null;
  dentro_de_zona: boolean | null;
}
interface DiaSemana {
  fecha: string;
  dia_semana: string;
  entrada: MarcaDia | null;
  salida: MarcaDia | null;
  horas: number | null;
  estado: "completo" | "en_turno" | "falta" | "pendiente";
}
interface SemanaDetalle {
  semana_inicio: string;
  semana_fin: string;
  dias: DiaSemana[];
}

const HOY = new Date().toLocaleDateString("en-CA", {
  timeZone: "America/Mexico_City",
});

function Foto({ marca }: { marca: MarcaDia | null }) {
  if (marca?.foto_url) {
    return (
      <img
        src={marca.foto_url}
        alt=""
        style={{
          width: 34,
          height: 34,
          borderRadius: 7,
          objectFit: "cover",
          border: "1px solid #e2e8f0",
        }}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: 7,
        background: "#f1f5f9",
        border: "1px dashed #cbd5e1",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <CameraAltRoundedIcon sx={{ fontSize: 16, color: "#94a3b8" }} />
    </div>
  );
}

export default function TiraAsistenciaSemana() {
  const token = localStorage.getItem("token");
  const [data, setData] = useState<SemanaDetalle | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const r = await axios.get<SemanaDetalle>(`${API}/asistencia/mi-semana`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(r.data);
      } catch {
        setData(null);
      } finally {
        setCargando(false);
      }
    };
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (cargando || !data) return null;

  const fmtRango = (ini: string, fin: string) => {
    const d = (s: string) => {
      const [, m, day] = s.split("-");
      const meses = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
      return `${parseInt(day)} ${meses[parseInt(m) - 1]}`;
    };
    return `${d(ini)} – ${d(fin)}`;
  };

  return (
    <div
      style={{
        fontFamily: FONT,
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        padding: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AccessTimeRoundedIcon sx={{ fontSize: 20, color: "#FF6600" }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: "#16213e" }}>
            Mi asistencia de la semana
          </span>
        </div>
        <span style={{ fontSize: 12, color: "#64748b" }}>
          {fmtRango(data.semana_inicio, data.semana_fin)}
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, minmax(86px, 1fr))",
            gap: 8,
          }}
        >
          {data.dias.map((dia) => {
            const esHoy = dia.fecha === HOY;
            const num = parseInt(dia.fecha.split("-")[2]);
            const enZona =
              dia.entrada?.dentro_de_zona ?? dia.salida?.dentro_de_zona ?? null;

            let borde = "1px solid #e2e8f0";
            let fondo = "#fff";
            if (esHoy) borde = "2px solid #FF6600";

            const conDatos = dia.entrada || dia.salida;

            if (!conDatos) {
              const esFalta = dia.estado === "falta";
              return (
                <div
                  key={dia.fecha}
                  style={{
                    border: esHoy ? borde : "1px dashed #cbd5e1",
                    background: "#f8fafc",
                    borderRadius: 10,
                    padding: "10px 6px",
                    textAlign: "center",
                    minHeight: 132,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: esHoy ? "#FF6600" : "#64748b" }}>
                    {dia.dia_semana}{esHoy ? " · hoy" : ""}
                  </div>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 8 }}>{num}</div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: esFalta ? "#dc2626" : "#94a3b8",
                    }}
                  >
                    {esFalta ? "Falta" : "Pendiente"}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={dia.fecha}
                style={{
                  border: borde,
                  background: fondo,
                  borderRadius: 10,
                  padding: "10px 6px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: esHoy ? "#FF6600" : "#16213e" }}>
                  {dia.dia_semana}{esHoy ? " · hoy" : ""}
                </div>
                <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 7 }}>{num}</div>

                <div style={{ display: "flex", gap: 5, justifyContent: "center", marginBottom: 7 }}>
                  <Foto marca={dia.entrada} />
                  <Foto marca={dia.salida} />
                </div>

                <div style={{ fontSize: 10, color: "#64748b", lineHeight: 1.5 }}>
                  {dia.entrada?.hora ?? "—"} · {dia.salida?.hora ?? "—"}
                </div>

                {dia.horas != null ? (
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#FF6600", marginTop: 2 }}>
                    {dia.horas} h
                  </div>
                ) : (
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginTop: 2 }}>
                    En turno
                  </div>
                )}

                {enZona != null && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      marginTop: 6,
                      background: enZona ? "#dcfce7" : "#fef3c7",
                      padding: "2px 7px",
                      borderRadius: 20,
                    }}
                  >
                    <CheckCircleRoundedIcon
                      sx={{ fontSize: 11, color: enZona ? "#16a34a" : "#d97706" }}
                    />
                    <span style={{ fontSize: 9, fontWeight: 600, color: enZona ? "#15803d" : "#b45309" }}>
                      {enZona ? "En zona" : "Fuera"}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
