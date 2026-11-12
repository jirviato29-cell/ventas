/* Arma el HTML del reporte de inventario y lo manda a imprimir.
 *
 * Uso:
 *   import { procesar } from './cuadreInventario';
 *   import { imprimirReporte } from './reporteInventarioHTML';
 *
 *   const res = procesar([{ modulo: 'HA', items }], {});
 *   imprimirReporte(res[0], {
 *     folio: 'CF-127', modulo: 'HA', encargado: 'SAMANTA',
 *     corte: '10 / NOVIEMBRE / 2026', anterior: '22 / OCTUBRE / 2026', dias: 19
 *   });
 */

const AZUL = '#12305C', ROJO = '#C00000', VERDE = '#0B7A28';

const money = v => '$' + Number(v).toLocaleString('es-MX',
  { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const COLS = '<colgroup>' +
  ['14%', '30%', '9%', '9%', '9%', '14%', '15%']
    .map(w => `<col style="width:${w}">`).join('') + '</colgroup>';

const HDR = '<tr><th>CLAVE</th><th>PRODUCTO</th><th>ANT.</th><th>NVA.</th>' +
            '<th>PZAS</th><th>P. C/DESC.</th><th>A PAGAR</th></tr>';

function filas(lst) {
  return lst.map(x =>
    `<tr><td class="cl">${esc(x.clave)}</td><td class="p">${esc(x.prod)}</td>` +
    `<td>${x.ant}</td><td>${x.nue}</td><td class="falta">${x.n}</td>` +
    `<td>${money(x.costo)}</td><td class="falta">${money(x.importe)}</td></tr>`
  ).join('');
}

function tabla(titulo, cuerpo, sub) {
  const pie = sub
    ? `<tr class="subt"><td colspan="4">${sub[0]}</td>` +
      `<td class="falta">${sub[1]}</td><td></td>` +
      `<td class="falta">${sub[2]}</td></tr>`
    : '';
  return `<table class="sec">${COLS}` +
         `<tr><td class="titsec" colspan="7">${titulo}</td></tr>${HDR}${cuerpo}${pie}</table>`;
}

/* La banda verde: dice en una línea qué se hizo con el sobrante. */
function leyenda(st, hayCobro) {
  const p = [];
  if (st.nCuadre > 0)
    p.push(`<b>${st.nCuadre} pzas</b> se cuadraron con sobrante del mismo producto (no se cobran)`);
  if (st.nCruce > 0)
    p.push(`<b>${st.nCruce} pzas</b> se cubrieron con sobrante del otro módulo de la misma encargada (traspaso no registrado)`);
  if (st.bolsa > 0)
    p.push(`el sobrante restante, <b>${st.nBolsa} pzas</b> por <b>${money(st.bolsa)}</b>, ` +
           `se aplicó completo: cubrió <b>${st.cubiertas} pzas</b> de faltante` +
           (st.residual > 0 ? ` y <b>${money(st.residual)}</b> se restaron del total` : ''));
  return p.length ? p.join(' · ') + '.' : 'No hubo sobrante aplicable a este faltante.';
}

export function construirHTML(res, cfg) {
  const st = res.st, n = res.cob.length;

  let bloque;
  if (n === 0) {
    // Dice el motivo real del cero, no siempre "el sobrante cubrió todo"
    const motivo = st.cubiertas > 0
      ? 'El sobrante del módulo cubrió por completo el faltante de este conteo.'
      : 'Las piezas faltantes de este conteo no se cobran por instrucción de la gerencia.';
    bloque = `<table class="sinad"><tr><td class="lb">SIN ADEUDO</td>` +
             `<td class="tx">${motivo} <b>El encargado no debe nada.</b></td></tr></table>`;
  } else {
    const sub = ['SUBTOTAL A PAGAR', String(st.nCobradas), money(st.subtotal)];
    if (n > 8) {
      const k = Math.ceil(n / 2);
      bloque = `<table class="cols"><tr><td>` +
        tabla(`CONCEPTOS A PAGAR (${n} CLAVES)`, filas(res.cob.slice(0, k))) +
        `</td><td>` +
        tabla('CONCEPTOS A PAGAR · CONTINUACIÓN', filas(res.cob.slice(k)), sub) +
        `</td></tr></table>`;
    } else {
      bloque = tabla(`CONCEPTOS A PAGAR (${n} CLAVES)`, filas(res.cob), sub);
    }
  }

  const c = st.cal;
  const nf = new Intl.NumberFormat('es-MX');

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<title>Reporte ${esc(cfg.folio)} ${esc(cfg.modulo)}</title>
<style>
@page{ size:Letter portrait; margin:9mm 7mm; }
html,body{margin:0;padding:0;background:#fff;
  -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important}
#print,#print *{font-family:Arial,Helvetica,sans-serif;color:#111;
  -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important}
#print .wrapr{width:100%;text-align:center}
#print h1.t{font-size:24px;color:${AZUL};margin:0 0 1px;letter-spacing:.5px}
#print h2.t{font-size:13px;color:${AZUL};margin:0 0 9px;font-weight:normal}
#print table{border-collapse:collapse;table-layout:fixed;margin:0 auto}
#print .info{width:100%;margin-bottom:9px;font-size:11px}
#print .info td{border:1px solid ${AZUL};padding:5px;text-align:center}
#print .info .lbl{background:${AZUL};color:#fff;font-weight:bold;width:15%}
#print .info .val{background:#F2F5FA;width:18.33%}
#print .cols{width:100%}
#print .cols>tbody>tr>td{vertical-align:top;width:50%;padding:0 3px}
#print .sec{width:100%;font-size:var(--fs,9.5px)}
#print .sec th{background:${AZUL};color:#fff;padding:4px 1px;white-space:nowrap;
  line-height:1.15;border:1px solid ${AZUL};font-size:8.2px;letter-spacing:-.3px}
#print .sec td{border:1px solid #9aa7bb;padding:3.5px 0;text-align:center;
  word-wrap:break-word;overflow-wrap:break-word}
#print .sec td.cl{white-space:nowrap;font-size:8.2px;letter-spacing:-.3px}
#print .sec td.p{text-align:left;padding-left:2px}
#print .titsec{background:${AZUL};color:#fff;font-weight:bold;font-size:12px;
  padding:4px;letter-spacing:.5px}
#print .falta{color:${ROJO};font-weight:bold}
#print .cero{color:${AZUL};font-weight:bold}
#print .subt td{background:#DCE3EF;font-weight:bold;white-space:nowrap}
#print .sinad{width:100%;font-size:11px;margin:2px auto 0}
#print .sinad .lb{background:${VERDE};color:#fff;font-weight:bold;font-size:13px;
  letter-spacing:.5px;padding:12px 6px;width:22%;text-align:center;
  border:1px solid ${VERDE};vertical-align:middle}
#print .sinad .tx{background:#EDF6EF;border:1px solid ${VERDE};padding:12px 10px;
  text-align:left;line-height:1.45;color:#14301C;font-size:11.5px}
#print .leysob{width:100%;font-size:9.5px;margin:4px auto 0}
#print .leysob .lb{background:${VERDE};color:#fff;font-weight:bold;font-size:9px;
  letter-spacing:.3px;padding:5px 6px;width:17%;text-align:center;
  border:1px solid ${VERDE};vertical-align:middle}
#print .leysob .tx{background:#EDF6EF;border:1px solid ${VERDE};padding:5px 8px;
  text-align:left;line-height:1.35;color:#14301C}
#print .res{width:100%;font-size:10.5px;margin:5px auto 4px}
#print .res td{border:1px solid ${AZUL};padding:4.5px 7px}
#print .res .k{background:${AZUL};color:#fff;font-weight:bold;text-align:left}
#print .res .v{text-align:right;font-weight:bold;background:#F2F5FA}
#print .calif{width:100%;margin:0 auto 5px;font-size:11px}
#print .calif th{background:${AZUL};color:#fff;padding:5px;border:1px solid ${AZUL}}
#print .calif td{border:1px solid #9aa7bb;padding:7px;text-align:center;
  font-weight:bold;font-size:15px}
#print .abonos{width:100%;margin:8px auto 0;font-size:10.5px}
#print .abonos .titab{background:${AZUL};color:#fff;font-weight:bold;font-size:12px;
  padding:5px;letter-spacing:.5px;text-align:center;border:1px solid ${AZUL}}
#print .abonos th.lb{background:#5A6C8C;color:#fff;padding:4px;
  border:1px solid ${AZUL};font-size:10.5px;letter-spacing:.5px;width:11%}
#print .abonos th.lb.sal{background:${AZUL}}
#print .abonos th.tt{background:${AZUL};color:#fff;padding:4px;
  border:1px solid ${AZUL};font-size:10.5px;letter-spacing:.5px;width:15%;line-height:1.2}
#print .abonos td{border:1px solid #9aa7bb;height:26px;width:9.25%;text-align:center}
#print .abonos td.tv{background:#DCE3EF;width:15%}
#print .abonos td.deuda{background:#FDECEC;border:1px solid ${AZUL};text-align:left;
  padding:4px 9px;font-weight:bold;font-size:13px;color:${ROJO};
  letter-spacing:.3px;height:auto}
</style></head>
<body><div id="print"><div class="hoja"><div class="wrapr">
<h1 class="t">REPORTE DE INVENTARIO</h1>
<h2 class="t">Resultados de conteo físico contra sistema</h2>

<table class="info">
 <tr><td class="lbl">FOLIO</td><td class="val">${esc(cfg.folio)}</td>
     <td class="lbl">MÓDULO</td><td class="val">${esc(cfg.modulo)}</td>
     <td class="lbl">ENCARGADO</td><td class="val">${esc(cfg.encargado)}</td></tr>
 <tr><td class="lbl">FECHA DE CORTE</td><td class="val">${esc(cfg.corte)}</td>
     <td class="lbl">INV. ANTERIOR</td><td class="val">${esc(cfg.anterior)}</td>
     <td class="lbl">DÍAS TRANSCURRIDOS</td><td class="val"><b>${cfg.dias} DÍAS</b></td></tr>
</table>

<table class="cols"><tr>
<td><table class="res">
 <tr><td class="k">Piezas en sistema (anterior)</td><td class="v">${nf.format(st.ant)} pzas</td></tr>
 <tr><td class="k">Piezas contadas (físico)</td><td class="v">${nf.format(st.nue)} pzas</td></tr>
 <tr><td class="k">Claves analizadas</td><td class="v">${st.claves} claves</td></tr>
 <tr><td class="k">Días sin inventario</td><td class="v">${cfg.dias} días</td></tr>
</table></td>
<td><table class="res">
 <tr><td class="k">Piezas faltantes del conteo</td><td class="v">${st.uf} pzas</td></tr>
 <tr><td class="k">Cuadradas con sobrante del mismo producto</td><td class="v">${st.nCuadre} pzas</td></tr>
 <tr><td class="k">Cubiertas con el sobrante restante</td><td class="v">${st.cubiertas} pzas</td></tr>
 <tr><td class="k">PIEZAS QUE SE COBRAN</td><td class="v falta">${st.nCobradas} pzas</td></tr>
 <tr><td class="k">TOTAL A PAGAR POR EL ENCARGADO</td>
     <td class="v ${st.aPagar > 0 ? 'falta' : 'cero'}">${money(st.aPagar)}</td></tr>
</table></td></tr></table>

<table class="calif">
 <tr><th>DÍAS SIN INVENTARIO</th><th>EXACTITUD DE INVENTARIO</th>
     <th>ÍNDICE DE FALTANTE</th><th>CALIFICACIÓN</th></tr>
 <tr><td>${cfg.dias}</td><td>${st.exact} %</td><td class="falta">${st.idx} %</td>
     <td style="background:${c.bg};color:${c.fg}">${c.n} &nbsp;—&nbsp; ${c.t}</td></tr>
</table>

${bloque}

<table class="leysob"><tr><td class="lb">SOBRANTE APLICADO</td>
  <td class="tx">${leyenda(st, n > 0)}</td></tr></table>

<table class="abonos">
 <tr><td class="titab" colspan="10">CONTROL DE ABONOS</td></tr>
 <tr><th class="lb">ADEUDO</th><td class="deuda" colspan="8">${money(st.aPagar)}</td>
     <th class="tt">TOTAL<br>ABONADO</th></tr>
 <tr><th class="lb">FECHA</th>${'<td></td>'.repeat(8)}<td class="tv" rowspan="3"></td></tr>
 <tr><th class="lb">ABONO</th>${'<td></td>'.repeat(8)}</tr>
 <tr><th class="lb sal">SALDO</th>${'<td></td>'.repeat(8)}</tr>
</table>
</div></div></div></body></html>`;
}

/* Abre el reporte en una ventana nueva y lanza el diálogo de impresión.
   Antes de imprimir baja el tamaño de letra hasta que quepa en una hoja. */
export function imprimirReporte(res, cfg) {
  const w = window.open('', '_blank');
  if (!w) { alert('El navegador bloqueó la ventana. Permite las ventanas emergentes.'); return; }
  w.document.write(construirHTML(res, cfg));
  w.document.close();

  w.onload = () => {
    const hoja = w.document.querySelector('.hoja');
    // La hoja carta con márgenes da 763 px de ancho y 975 px de alto útiles
    for (const fs of [9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6]) {
      hoja.style.setProperty('--fs', fs + 'px');
      if (hoja.offsetHeight <= 975) break;
    }
    w.focus();
    w.print();
  };
}
