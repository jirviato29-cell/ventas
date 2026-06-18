import { Navigate } from 'react-router-dom';
import { obtenerRolDesdeToken } from '../components/Token';

export default function CheckinPage() {
  const rol = obtenerRolDesdeToken();
  if (rol !== 'check') return <Navigate to="/" replace />;

  return (
    <iframe
      title="Sistema Check In"
      src="/checkin_page.html"
      style={{ width: '100%', height: '100vh', border: 'none', display: 'block' }}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
    />
  );
}
