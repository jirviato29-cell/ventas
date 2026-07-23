export function cerrarSesionForzado(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  localStorage.removeItem('modulo');
  localStorage.removeItem('rol');
  window.location.replace('/');
}

export function tokenExpirado(): boolean {
  const token = localStorage.getItem('token');
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

export function msHastaExpiracion(): number | null {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return null;
    return payload.exp * 1000 - Date.now();
  } catch {
    return null;
  }
}
