// Prueba piloto de "Mi Perfil" para usuarios que no son admin.
// Va por username (el que el login guarda en localStorage "usuario").
export const PILOTO_MI_PERFIL = ["A55BO-EVELYN"];

// Sin diferencia de mayúsculas ni de espacios al inicio/final
export const esPilotoMiPerfil = (usuario: string | null | undefined) => {
  const limpio = (usuario ?? "").trim().toUpperCase();
  return limpio !== "" && PILOTO_MI_PERFIL.some((u) => u.trim().toUpperCase() === limpio);
};
