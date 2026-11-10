// Módulos que ven el diseño nuevo de "Registrar venta" (VentasPage).
// Para darlo a más módulos, agrega su id aquí; los demás siguen con el diseño actual.
export const MODULOS_DISENO_NUEVO: number[] = [21]; // 21 = BO

export const usaDisenoNuevo = (moduloId?: number | null): boolean =>
  moduloId != null && MODULOS_DISENO_NUEVO.includes(moduloId);
