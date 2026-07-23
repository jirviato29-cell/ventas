import axios from 'axios';
import { cerrarSesionForzado } from './sesion';

// Excluir el login: un 401 ahi es "credenciales incorrectas",
// no sesion expirada.
const RUTAS_EXCLUIDAS = ['/auth/'];   // AJUSTA si el path del login es otro

export function instalarInterceptor(): void {
  axios.interceptors.response.use(
    (res) => res,
    (error) => {
      const status = error?.response?.status;
      const url: string = error?.config?.url || '';
      const esExcluida = RUTAS_EXCLUIDAS.some((r) => url.includes(r));
      if (status === 401 && !esExcluida && localStorage.getItem('token')) {
        cerrarSesionForzado();
      }
      return Promise.reject(error);
    }
  );
}
