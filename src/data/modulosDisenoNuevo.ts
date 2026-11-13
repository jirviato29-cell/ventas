// Módulos que NO ven el diseño nuevo de "Registrar venta" (VentasPage).
// El diseño nuevo aplica por defecto a todo módulo con id conocido; para
// dejar un módulo con el diseño actual, agrega su id aquí.
// 7 = Cadenas (ya excluido además por esCadenas en VentasPage, se repite
// aquí explícito).
export const MODULOS_SIN_DISENO_NUEVO: number[] = [5, 7, 8, 20];

export const usaDisenoNuevo = (moduloId?: number | null): boolean =>
  moduloId != null && !MODULOS_SIN_DISENO_NUEVO.includes(moduloId);
