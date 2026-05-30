
export interface DiaTrabajo {
  dia: string;
  entrada: string | null;
  salida: string | null;
  descanso: boolean;
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
  }



export interface Venta {
  id: number;
  producto: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  comision: number;
  tipo_venta: string;
  fecha: string;
  hora: string;
  cancelada: boolean;
  tipo_producto:"accesorios" | "telefono";
  chip_casado: string;
  metodo_pago?: string;
  empleado?: {
    username: string;
  };
}

export interface VentaTelefono {
  id: number;
  marca: string;
  modelo: string;
  tipo?: string;
  precio_venta: number;
  total: number;
  comision: number;
  metodo_pago: string;
  fecha: string;
  hora: string;
  cancelada?: boolean;
}
  
export interface Traspaso {
  id: number;
  producto: string;
  cantidad: number;
  modulo_origen: string;
  modulo_destino: string;
  estado: "pendiente" | "aprobado" | "rechazado";
  fecha: string;
  visible_en_pendientes: boolean;
  folio: string | null;
}

export interface AjusteItem {
  id: number;
  clave: string;
  producto: string;
  cantidad_anterior: number;
  cantidad_nueva: number;
  delta: number;
}

export interface AjusteInventario {
  id: number;
  folio: string;
  modulo_id: number;
  modulo_nombre: string;
  usuario_id: number;
  usuario_nombre: string;
  fecha: string;
  motivo: string | null;
  items: AjusteItem[];
}


export interface Modulo {
  id: number;
  nombre: string;
}



export interface Usuario {
  id: number;
  nombre_completo?: string | null;
  username: string;
  rol: "admin" | "encargado" | "asesor" | "contador";
  modulo: {
    id: number;
    nombre: string;
  } | null;
  is_admin: boolean;
  sueldo_base: number;
  forma_pago?: string | null;
  cuenta_clabe?: string | null;
  cuenta_interbancaria?: string | null;
  nombre_englobado?: string | null;
  jornada_fija?: number | null;
  horario_semanal?: DiaTrabajo[] | null;
  dia_descanso?: string | null;
}


export interface InventarioGeneral {
  id: number;
  producto: string;
  clave: string
  precio: number;
  cantidad: number;
}

export interface InventarioTelefono {
  id: number;
  marca: string;
  modelo: string;
  clave: string;  
  precio: number;
  cantidad: number;
}

export interface InventarioModulo {
  id: number;
  producto: string;
  clave: string;
  precio: number;
  cantidad: number;
  modulo: string;
}

export interface InventarioTelefonoModulo {
  id: number;
  marca: string;
  modelo: string;
  clave: string;  
  precio: number;
  cantidad: number;
}



export interface ProductoEnVenta {
  id: number;
  nombre: string;
  producto: string;
  clave: string;
  cantidad: number;
  precio_unitario: number;
  tipo_producto: "accesorios" | "telefono";
}

export interface VentaChip {
  id: number;
  tipo_chip: string;
  numero_telefono: string;
  monto_recarga: number;
  fecha: string;
  hora: string;
  validado: boolean;
  comision_pagada: boolean;
  comision: number;
  comision_manual: number;
  cvip: boolean;
  descripcion_rechazo: string | null;
  es_incubadora: boolean;
  empleado?: {
    username: string;
  };
}



export interface ComisionData {
  inicio_ciclo: string;
  fin_ciclo: string;
  fecha_pago: string;
  total_accesorios: number;
  total_telefonos: number;
  total_chips: number;
  total_general: number;
  
  ventas_accesorios: {
    id?: number;
    producto: string;
    cantidad: number;
    comision: number;
    tipo_venta: string;
    comision_total: number;
    fecha: string;
    hora: string;
  }[];
  ventas_telefonos: {
    id?: number;
    producto: string;
    cantidad: number;
    comision: number;
    tipo_venta: string;
    comision_total: number;
    fecha: string;
    hora: string;
  }[];
  ventas_chips: {
    id?: number;
    tipo_chip: string;
    numero_telefono: string;
    comision: number;
    comision_manual: number;
    es_incubadora: boolean;
    fecha: string;
    hora: string;
  }[];
}


export interface Diferencia {
  marca?: string;
  modelo?: string;
  producto?: string;
  tipo?: string;
  clave: string;
  sistema: number;
  fisico: number;
  diferencia: number;
}

export type EntradaItem = {
  producto_id: number;
  clave: string;
  producto?: string;
  cantidad: number;
   // cantidad RECIBIDA
};


// types/nomina.ts
export interface NominaPeriodo {
  id: number;
  fecha_inicio: string;
  fecha_fin: string;
  activa: boolean;
  estado: string;
}

export interface NominaEmpleado {
  usuario_id: number;
  username: string;

  rol: "asesor" | "encargado";
  comisiones: number;
  comisiones_accesorios: number;
  comisiones_telefonos: number;
  comisiones_chips: number;
  sueldo_base: number;
  horas_extra: number;
  pago_horas_extra: number;
  total_pagar: number;
  precio_hora_extra: number;
  sanciones: number;
  comisiones_pendientes: number;
}


export interface PeriodoNomina {
  inicio: string; // YYYY-MM-DD
  fin: string;    // YYYY-MM-DD
}

export interface ComisionesNomina {
  accesorios: number;
  telefonos: number;
  chips: number;
  total: number;
}

export interface SueldoNomina {
  base: number;
  horas_extra: number;
  pago_horas_extra: number;
  sanciones?: number;
  comisiones_pendientes?: number;
}

export interface EmpleadoNomina {
  id: number;
  username: string;
  modulo: number | null;

}

export interface MiNominaResponse {
  empleado: EmpleadoNomina;
  periodo: PeriodoNomina;
  comisiones: ComisionesNomina;
  sueldo: SueldoNomina;
  total_pagar: number;
}


export interface ProductoModulo {
  producto: string
  modulo: string
  cantidad: number
}

export interface MetricaEmpleado {
  empleado_id: number;
  username: string;
  total_accesorios: number;
  total_telefonos: number;
  contado: number;
  paguitos: number;
  pajoy: number;
}