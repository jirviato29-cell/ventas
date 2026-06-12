# Handoff: Rediseño de la pantalla "RECIBOS" (MI NÓMINA)

## Overview
Rediseño de la pestaña **MI NÓMINA → RECIBOS** del sistema CATO: el listado de recibos/ventas del día (Accesorios y Teléfonos). La tabla actual desperdicia muchísimo espacio horizontal (la columna Folio sola ocupa ~1/6 del ancho para mostrar "V-95"), las filas son muy altas, los productos de un mismo ticket se ven como filas huérfanas y el resumen superior es un texto suelto. El rediseño compacta las columnas, agrupa los productos de cada ticket, pone el precio pegado a cada producto en una columna alineada, y convierte el resumen en tarjetas KPI.

> **Objetivo:** que un encargado o un contador lea el listado de un vistazo, sin scroll innecesario y sin espacio muerto.

---

## About the Design Files
El archivo `recibos-preview.html` de este bundle es una **referencia de diseño en HTML/CSS** — un prototipo que muestra el aspecto y comportamiento deseado, **NO código de producción para copiar tal cual**.

La tarea es **recrear este diseño dentro del codebase existente de CATO** (la pantalla se ve construida con React + Material UI, igual que el resto del sistema), usando sus componentes, patrones y librerías ya establecidos. No insertar el HTML directamente.

Conservar **toda la lógica, llamadas a API, variables, filtros y handlers** actuales del componente de Recibos. Solo cambia la **capa de presentación** (estructura JSX + estilos).

---

## Fidelity
**Alta fidelidad (hifi).** Colores, tipografía, anchos de columna, espaciado y jerarquía son finales. Los íconos del prototipo usan emoji/glyph por portabilidad; en el codebase sustituir por íconos de MUI (ver Assets).

---

## Pantalla: RECIBOS

### Purpose
Listar los recibos del día filtrados por fecha (y opcionalmente por folio), separados por tipo (Accesorios / Teléfonos), mostrando vendedor, productos, cantidad, precios, total, estado y acciones (imprimir / eliminar).

### Layout general
- Contenedor centrado, **max-width 1240px**, `margin: 0 auto`, padding `18px 24px 56px`.
- El chrome de la app (top bar azul marino `#16213e`, barra naranja de aviso, y el subnav de pestañas TICKET / RECIBOS / MIS VENTAS / CORTE / COMISIONES) **ya existe** — no se reconstruye.

### Estructura (de arriba a abajo)

#### 1. Toolbar (filtros + resumen en una sola fila) — `.toolbar`
`display:flex; gap:12px; flex-wrap:wrap`. Dos bloques:

**a) Filtros** (`.filters`, tarjeta blanca `border:1px solid #e2e8f0; border-radius:12px; padding:12px 14px; flex:1`):
- Campo **Fecha**: label uppercase 9.5px `#64748b` + `<input type="date">` (36px alto, `border:1px solid #cbd5e1; border-radius:8px`).
- Campo **Buscar folio**: igual, input de ~230px, placeholder "ej. V-123".
- Botón **BUSCAR**: naranja `#FF6600`, blanco, weight 800, uppercase, `border-radius:8px`, 36px alto. Hover `#ea5c00`.
- Focus de inputs: `border-color:#FF6600; box-shadow:0 0 0 3px rgba(255,102,0,.15)`.

**b) KPIs** (`.kpis`, `display:flex; gap:12px`): dos tarjetas
- **Accesorios** — ícono cuadrado 38×38 `border-radius:10px` bg `#F3E5F5` fg `#6A1B9A` (morado); label "ACCESORIOS" 10px uppercase `#94a3b8`; valor 19px weight 800 `tabular-nums` (ej. `$4,296.10`).
- **Teléfonos** — mismo patrón, ícono bg `#E3F2FD` fg `#1565C0` (azul); valor (ej. `$2,299.00`).

#### 2. Sección por tipo — `.section` (una por categoría: Accesorios, Teléfonos)
Tarjeta blanca `border:1px solid #e2e8f0; border-radius:14px; overflow:hidden`.
- **Header** (`.section-head`, padding `12px 18px`, `border-bottom:1px solid #eef2f7`):
  - Título: cuadrito de color (`swatch` 9×9 `border-radius:3px`) + texto uppercase 13px weight 800 `letter-spacing:0.4px`. Accesorios en morado `#6A1B9A`; Teléfonos en azul `#1565C0` (swatch del mismo color).
  - Contador a la derecha: pill `#f1f5f9`, texto `#64748b` 11.5px (ej. "7 recibos").

#### 3. Tabla — `<table>` con `<colgroup>` de anchos fijos
**Clave del rediseño: anchos apretados, sin espacio muerto.** La columna Producto se queda con el espacio sobrante.

| Columna | Ancho | Alineación | Contenido |
|---|---|---|---|
| Folio | 116px | izq | Badge de folio, weight 800, `tabular-nums` (ej. V-95) |
| Vendedor | 150px | izq | Avatar de iniciales (28×28, `border-radius:8px`, bg `#eef2ff` fg `#4338ca`) + nombre 12px weight 600 `#334155` |
| Producto | 360px | — | Lista de productos; **cada línea = grid `1fr auto`**: nombre a la izq + precio a la der, alineados en columna derechita. Precio en naranja `#FF6600` weight 700 `tabular-nums`. Precio $0.00 en gris `#cbd5e1` |
| Cant. | 58px | centro | número weight 600 `tabular-nums` |
| Total | 116px | der | total del ticket, weight 800 13px `tabular-nums` `#0f172a` |
| Estado | 96px | centro | Pill de estado (ver abajo) |
| Acciones | 78px | centro | Botones imprimir / eliminar |

**Header de tabla** (`thead th`): 10px weight 800 uppercase `#64748b`, bg `#f8fafc`, `border-bottom:1px solid #e5e7eb`, padding `9px 14px`.

**Celdas** (`tbody td`): padding `9px 14px`, 12.5px, `border-bottom:1px solid #f1f5f9`, `vertical-align:middle`. Hover de fila: bg `#fcfcfd`.

**Producto (detalle importante):**
- `.prod-list { display:flex; flex-direction:column; gap:4px }` — apila los productos del ticket.
- `.prod-line { display:grid; grid-template-columns:1fr auto; gap:0 14px; align-items:baseline }` — nombre izq, precio der.
- Esto hace que en tickets con varios productos (ej. V-95 con 3, V-178 con 2) **los precios queden alineados en una columna recta**, cada uno junto a su producto.

**Estado** (`.pill`): inline pill `border-radius:999px`, 10.5px weight 700, con punto de color (`.d` 6×6 redondo):
- **Activa**: bg `#ecfdf5`, texto `#047857`, punto `#10b981`.
- **Cancelada**: bg `#fef2f2`, texto `#b91c1c`, punto `#ef4444`.

**Acciones** (`.iconbtn`): botón 28×28 `border-radius:7px; border:1px solid #e2e8f0`, ícono `#64748b`. Hover normal: bg `#f8fafc`. Hover en eliminar (`.del`): borde `#fecaca`, bg `#fef2f2`, ícono `#dc2626`.

**Fila cancelada** (`tr.is-cancel`): bg `#fffafa`; folio, nombres de producto, precios, total, cantidad y nombre de vendedor en `#c4757c` con `text-decoration:line-through` (color tenue); avatar en bg `#fde8e8` fg `#c4757c`; botones de acción atenuados (`opacity:.4`) y sin interacción.

---

## Interactions & Behavior
- **Buscar**: filtra los recibos por la fecha seleccionada y, si se escribe, por folio. Mantener el handler/endpoint actual.
- **Imprimir** (🖨 → `PrintIcon`): dispara la impresión del recibo (handler actual).
- **Eliminar** (🗑 → `DeleteIcon`): elimina/cancela el recibo (handler actual, con su confirmación si ya existe).
- **Recibos cancelados**: solo lectura, acciones deshabilitadas.
- **Tickets multi-producto**: todos los productos del recibo se muestran apilados en la misma fila (un `<tr>` por ticket, no uno por producto). La columna Cant. muestra la suma de unidades del ticket y Total el total del ticket.
- **Responsive**: en pantallas angostas la tabla puede hacer scroll horizontal dentro de su tarjeta; los KPIs y filtros se envuelven (`flex-wrap`).
- Sin animaciones críticas; solo hovers sutiles.

---

## State Management
No introduce estado nuevo. Usa los datos que el componente ya consulta. Estructura esperada (nombres ilustrativos — mapear a los reales):

- `filtros`: `{ fecha: "2026-06-11", folio: "" }`
- `resumen`: `{ accesorios: 4296.10, telefonos: 2299.00 }`
- `recibos`: arreglo, cada recibo:
  ```
  {
    folio: "V-95",
    vendedor: "A46RO-JUANA",
    iniciales: "JU",
    tipo: "accesorios" | "telefono",
    estado: "Activa" | "Cancelada",
    cantidad: 3,                // suma de unidades del ticket
    total: 598.05,
    productos: [
      { nombre: "PROTECTOR $299", precio: 299.00 },
      { nombre: "MICA DE HIDROGEL $299", precio: 299.00 },
      { nombre: "MICA DE HIDROGEL $199", precio: 0.05 }
    ]
  }
  ```
- Agrupar `recibos` por `tipo` para renderizar una `.section` por categoría.
- `iniciales`: derivar del nombre del vendedor si el backend no las manda (primeras 2 letras del nombre tras el guion, ej. "A46RO-JUANA" → "JU").

---

## Design Tokens

### Colores
| Token | Hex | Uso |
|---|---|---|
| Fondo página | `#eef1f5` | body |
| Azul marino | `#16213e` | top bar (existe) |
| Naranja marca | `#FF6600` | botón Buscar, precios, acentos, focus |
| Morado Accesorios | `#6A1B9A` / bg `#F3E5F5` | título + KPI Accesorios |
| Azul Teléfonos | `#1565C0` / bg `#E3F2FD` | título + KPI Teléfonos |
| Avatar vendedor | fg `#4338ca` / bg `#eef2ff` | iniciales |
| Verde Activa | texto `#047857` / bg `#ecfdf5` / punto `#10b981` | pill estado |
| Rojo Cancelada | texto `#b91c1c` / bg `#fef2f2` / punto `#ef4444` | pill estado |
| Cancelada (fila) | `#c4757c` / bg `#fffafa` | texto tachado |
| Texto principal | `#0f172a` | folio, total, nombres |
| Texto secundario | `#334155` / `#475569` / `#64748b` | vendedor, labels |
| Texto tenue | `#94a3b8` | sublabels |
| Cero / inactivo | `#cbd5e1` | precios $0.00 |
| Bordes | `#e2e8f0` / `#eef2f7` / `#f1f5f9` | tarjetas y separadores |

### Tipografía
- Familia: **Inter** (system-ui fallback). Pesos: 400/500/600/700/800.
- Escala: 19 (KPI valor) · 13 (folio, total, títulos sección) · 12.5 (celdas, producto) · 12 (precio, vendedor) · 11.5 (contador) · 10–10.5 (labels/pills).
- Montos y números: `font-variant-numeric: tabular-nums`.

### Radios / espaciado
- Border-radius: 14 (sección) · 12 (KPI, filtros) · 10 (ícono KPI) · 8 (avatar, inputs, botón) · 7 (iconbtn) · 999 (pills).
- Padding celda: `9px 14px`. Filas compactas (~38–40px de alto efectivo).
- Anchos de columna fijos vía `<colgroup>` (ver tabla).

---

## Assets
- **Fuente:** Inter (Google Fonts) o la del design system si ya existe.
- **Íconos (sustituir emoji del prototipo por MUI Icons):**
  - Buscar → `SearchIcon`
  - Imprimir → `PrintIcon`
  - Eliminar → `DeleteOutlineIcon`
  - (Subnav y logo CATO ya existen en la app.)
- No hay imágenes/fotos.

## Files
- `recibos-preview.html` — prototipo hifi completo (incluye chrome de la app solo como contexto; lo relevante es el `.toolbar` y la `.section` con la tabla).

## Notas finales para quien implementa
- Conservar intactos: lógica, fetch/API, filtros, nombres de variables y handlers actuales. Solo se reescribe la presentación.
- El corazón del rediseño: **(1)** anchos de columna apretados con `<colgroup>` para eliminar el espacio muerto, **(2)** un solo `<tr>` por ticket con sus productos apilados, **(3)** precio pegado a cada producto en columna alineada (grid `1fr auto`), **(4)** resumen como tarjetas KPI. No volver a la tabla de columnas regadas y filas altas.
- Las dos secciones (Accesorios morado / Teléfonos azul) comparten la misma estructura de tabla; solo cambia el color del swatch/título y los datos.
