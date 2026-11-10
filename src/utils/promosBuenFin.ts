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

export const ETIQUETA_PROMO: Record<string, string> = {
  '3X2': '3x2',
  '2DA30': '2.ª pieza al 30%',
  FUNDAS30: 'Fundas 30%',
};

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
  if (codigos.length > 1) {
    avisos.push('No se pueden combinar dos promociones distintas en la misma venta.');
  }
  // Con dos códigos distintos no se calcula nada: la venta queda bloqueada.
  const codigo = codigos.length === 1 ? codigos[0] : null;

  // idx -> lista de [precio, piezas]
  const porIdx = new Map<number, Map<number, number>>();
  const sumar = (idx: number, precio: number, piezas: number) => {
    const m = porIdx.get(idx) ?? new Map<number, number>();
    m.set(precio, (m.get(precio) ?? 0) + piezas);
    porIdx.set(idx, m);
  };

  if (codigo === 'FUNDAS30') {
    conPromo.forEach(({ p, idx }) => sumar(idx, r2(p.precio_unitario * 0.7), p.cantidad));
  } else if (codigo === '3X2' || codigo === '2DA30') {
    const grupo = codigo === '3X2' ? 3 : 2;
    const factor = codigo === '3X2' ? 0 : 0.7;
    const piezas = conPromo
      .flatMap(({ p, idx }) => Array.from({ length: p.cantidad }, () => ({ precio: p.precio_unitario, idx })))
      .sort((a, b) => a.precio - b.precio || a.idx - b.idx);
    const n = piezas.length;
    const resto = n % grupo;
    if (resto !== 0) {
      avisos.push(`${etiquetaPromo(codigo)}: llevas ${resto} de ${grupo} piezas`);
    }
    const grupos = Math.ceil(n / grupo);
    const caras = piezas.filter((x) => x.precio > LIMITE_PIEZA_CARA).length;
    if (caras > grupos) {
      avisos.push(`${etiquetaPromo(codigo)}: máximo 1 pieza de más de $1,000 por cada ${grupo} piezas (llevas ${caras}).`);
    }
    const conDescuento = Math.floor(n / grupo);
    piezas.forEach((x, i) => sumar(x.idx, i < conDescuento ? r2(x.precio * factor) : r2(x.precio), 1));
  } else if (codigo) {
    avisos.push(`La promoción ${codigo} no está soportada.`);
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
