import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../ATO.jpeg';
import './CampusPage.css';

interface Campus {
  id: number;
  nombre: string;
  activo: boolean;
  logo_url?: string;
}

const API = 'https://ato-appservidor-nvxt.onrender.com';

const isAgs = (nombre: string) =>
  nombre.toLowerCase().includes('ags') || nombre.toLowerCase().includes('aguascalientes');

function TileAgs({ logoUrl }: { logoUrl?: string }) {
  return (
    <div className="cp-tile cp-tile-ags">
      <img src={logoUrl || logo} alt="Campus Ags" />
    </div>
  );
}

function TileGdl({ logoUrl }: { logoUrl?: string }) {
  return (
    <div className="cp-tile cp-tile-gdl">
      <img src={logoUrl || logo} alt="Campus Gdl" />
    </div>
  );
}

function CampusCard({ campus, onClick }: { campus: Campus; onClick: () => void }) {
  const ags = isAgs(campus.nombre);
  return (
    <button className="cp-card" onClick={onClick}>
      {ags
        ? <TileAgs logoUrl={campus.logo_url} />
        : <TileGdl logoUrl={campus.logo_url} />}
      <div>
        <p className="cp-card-name">{campus.nombre}</p>
        <p className="cp-meta">
          <span
            className="cp-dot"
            style={{ background: ags ? '#3E6499' : '#888' }}
          />
          {ags ? 'Aguascalientes' : 'Matriz · Guadalajara'}
        </p>
      </div>
    </button>
  );
}

const CampusPage: React.FC = () => {
  const navigate = useNavigate();
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/campus`)
      .then(r => r.json())
      .then((data: Campus[]) => setCampuses(data.filter(c => c.activo)))
      .catch(() => setCampuses([]))
      .finally(() => setLoading(false));
  }, []);

  const elegirCampus = (campus: Campus) => {
    localStorage.setItem('campus_activo', String(campus.id));
    navigate('/login');
  };

  return (
    <div className="cp-root">
      <div className="cp-glow-tr" />
      <div className="cp-glow-bl" />

      <div className="cp-wrap">
        <img src={logo} alt="Origen" className="cp-logo" />

        <p className="cp-eyebrow">Origen Dashboard</p>
        <h1 className="cp-title">Elige tu campus</h1>

        {loading ? (
          <p className="cp-loading">Cargando campus…</p>
        ) : (
          <div className="cp-grid">
            {campuses.map(campus => (
              <CampusCard
                key={campus.id}
                campus={campus}
                onClick={() => elegirCampus(campus)}
              />
            ))}
          </div>
        )}

        <p className="cp-footer">Dashboard interno · Origen</p>
      </div>
    </div>
  );
};

export default CampusPage;
