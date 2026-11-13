import { ProductoEnVenta } from '../Types';

// Vista previa de promociones del Buen Fin. Replica la lógica del backend
// (ato-backend/app/routers/promociones.py: calcular_precios_promo). El backend
// recalcula todo al registrar; esto solo sirve para mostrar y bloquear antes.

export interface PromoActiva {
  codigo: string;
  nombre: string;
  claves: string[];
}

export interface RenglonPromo {
  idx: number;                    // índice del producto en el carrito
  cantidad: number;
  precio_unitario: number;        // ya con descuento
  precio_original: number | null; // null si el producto no lleva promo
  promocion: string | null;
}

export interface VistaPromo {
  renglones: RenglonPromo[];
  total: number;
  avisos: string[];
  bloquea: boolean;
}

const LIMITE_PIEZA_CARA = 1000;

// 3X2: la pieza gratis debe ser estrictamente más barata que las otras dos,
// salvo que sea un protector o una mica (por tipo de producto, no por precio).
export const MENSAJE_3X2_IGUAL =
  'En el 3x2 la pieza gratis debe ser de menor precio que las otras dos (excepto protectores y micas). Cambia una pieza o usa 2.ª pieza al 30%.';

const esProtectorMica = (nombre?: string | null) => {
  const u = (nombre ?? '').trim().toUpperCase();
  return u.startsWith('PROTECTOR') || u.startsWith('MICA');
};

export const ETIQUETA_PROMO: Record<string, string> = {
  '3X2': '3x2',
  '2DA30': '2.ª pieza al 30%',
  FUNDAS30: 'Fundas 30%',
  MICA_GRATIS: 'Mica gratis',
};

// MICA_GRATIS: 1 mica de hidrogel en $0 por cada teléfono participante
// (clave en la promo) vendido de Contado y pagado en Efectivo.
export const MICA_GRATIS = 'MICA_GRATIS';
export const CLAVE_MICA_GRATIS = 'MICHIDRO199';
// Promos que se calculan aparte y no cuentan para 3X2 / 2DA30.
export const PROMOS_APARTE = ['FUNDAS30', MICA_GRATIS];
export const esMicaGratis = (p: { promocion?: string | null }) => (p.promocion ?? '').toUpperCase() === MICA_GRATIS;

export const etiquetaPromo = (codigo?: string | null) =>
  codigo ? ETIQUETA_PROMO[codigo.toUpperCase()] ?? codigo : '';

const r2 = (n: number) => Math.round(n * 100) / 100;

export const normClave = (c?: string | null) => (c ?? '').trim().toUpperCase();

export function calcularPromos(carrito: ProductoEnVenta[]): VistaPromo {
  const avisos: string[] = [];
  const conPromo = carrito
    .map((p, idx) => ({ p, idx }))
    .filter(({ p }) => !!p.promocion);

  const codigos = Array.from(new Set(conPromo.map(({ p }) => p.promocion!.toUpperCase())));
  // FUNDAS30 es independiente (30% automático sobre sus propias piezas, no
  // acumula). 3X2 y 2DA30 sí se excluyen entre sí. Por eso permitimos que
  // FUNDAS30 conviva con 3X2 o 2DA30 en el mismo ticket.
  const codigosGrupo = codigos.filter((c) => !PROMOS_APARTE.includes(c));
  if (codigosGrupo.length > 1) {
    avisos.push('No se pueden combinar dos promociones distintas en la misma venta.');
  }
  const codigoGrupo = codigosGrupo.length === 1 ? codigosGrupo[0] : null;
  const tieneFundas30 = codigos.includes('FUNDAS30');

  // idx -> lista de [precio, piezas]
  const porIdx = new Map<number, Map<number, number>>();
  const sumar = (idx: number, precio: number, piezas: number) => {
    const m = porIdx.get(idx) ?? new Map<number, number>();
    m.set(precio, (m.get(precio) ?? 0) + piezas);
    porIdx.set(idx, m);
  };

  if (tieneFundas30) {
    conPromo
      .filter(({ p }) => p.promocion!.toUpperCase() === 'FUNDAS30')
      .forEach(({ p, idx }) => sumar(idx, r2(p.precio_unitario * 0.7), p.cantidad));
  }

  // Mica gratis: va en $0; sus reglas se validan en VentasPage y en el backend.
  conPromo
    .filter(({ p }) => esMicaGratis(p))
    .forEach(({ p, idx }) => sumar(idx, 0, p.cantidad));

  if (codigoGrupo === '3X2' || codigoGrupo === '2DA30') {
    const grupo = codigoGrupo === '3X2' ? 3 : 2;
    const factor = codigoGrupo === '3X2' ? 0 : 0.7;
    const piezas = conPromo
      .filter(({ p }) => p.promocion!.toUpperCase() === codigoGrupo)
      .flatMap(({ p, idx }) => Array.from({ length: p.cantidad }, () => ({
        precio: p.precio_unitario,
        idx,
        nombre: p.producto || p.nombre || '',
      })))
      .sort((a, b) => {
        if (a.precio !== b.precio) return a.precio - b.precio;
        // En 3x2, cuando hay empate de precio preferimos que la pieza gratis
        // sea un protector/mica para aprovechar la excepción.
        if (codigoGrupo === '3X2') {
          const ap = esProtectorMica(a.nombre);
          const bp = esProtectorMica(b.nombre);
          if (ap !== bp) return ap ? -1 : 1;
        }
        return a.idx - b.idx;
      });
    const n = piezas.length;
    // El candado por promo en VentasPage impide dejar un grupo incompleto,
    // así que no empujamos "llevas X de GRUPO piezas" como aviso.
    const grupos = Math.ceil(n / grupo);
    const caras = piezas.filter((x) => x.precio > LIMITE_PIEZA_CARA).length;
    if (caras > grupos) {
      avisos.push(`${etiquetaPromo(codigoGrupo)}: máximo 1 pieza de más de $1,000 por cada ${grupo} piezas (llevas ${caras}).`);
    }
    const conDescuento = Math.floor(n / grupo);
    if (codigoGrupo === '3X2' && conDescuento > 0 && n > conDescuento) {
      const precioBorde = piezas[conDescuento].precio;
      const violacion = piezas
        .slice(0, conDescuento)
        .some((x) => x.precio === precioBorde && !esProtectorMica(x.nombre));
      if (violacion) avisos.push(MENSAJE_3X2_IGUAL);
    }
    piezas.forEach((x, i) => sumar(x.idx, i < conDescuento ? r2(x.precio * factor) : r2(x.precio), 1));
  } else if (codigoGrupo) {
    avisos.push(`La promoción ${codigoGrupo} no está soportada.`);
  }

  const renglones: RenglonPromo[] = [];
  carrito.forEach((p, idx) => {
    const precios = porIdx.get(idx);
    if (!precios) {
      renglones.push({ idx, cantidad: p.cantidad, precio_unitario: p.precio_unitario, precio_original: null, promocion: null });
      return;
    }
    Array.from(precios.entries())
      .sort((a, b) => b[0] - a[0])
      .forEach(([precio, cantidad]) =>
        renglones.push({ idx, cantidad, precio_unitario: precio, precio_original: p.precio_unitario, promocion: p.promocion! }),
      );
  });

  const total = r2(renglones.reduce((s, r) => s + r.cantidad * r.precio_unitario, 0));
  return { renglones, total, avisos, bloquea: avisos.length > 0 };
}
