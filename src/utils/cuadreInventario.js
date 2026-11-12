/* Motor de cuadre de inventarios ATO.
 *
 * Reglas (ver claude/boton-resultado-inventario.md):
 *   - costo al encargado = 60 % del precio de lista (F100 y F200 a precio completo)
 *   - familia = texto antes del precio, sin el " DE" final
 *   - los chips no cuentan en ningun reporte
 *   - telefono, tablet y modem van por IMEI: fuera de todo el reporte
 *   - el sobrante se aplica completo, empezando por la pieza mas cara
 *
 * Probado contra el CF-127 de HA: debe dar 34 faltantes, 29 piezas cobradas,
 * 98.1 % de exactitud y $4,164.60 a pagar.
 */

/* Motor de cuadre de inventarios ATO.
   Entrada: items = [{clave, producto, cantidad_anterior, cantidad_nueva}, ...]
   Salida:  ver objeto final. */

const DESCUENTO   = 0.40;              // el encargado paga el 60 % del precio de lista
const SIN_DESC    = ['F100','F200'];   // fichas de tiempo aire: precio completo
const ES_EQUIPO   = ['TELEFONO','TABLET','MODEM'];  // se controlan por IMEI

function basePrecio(prod){
  const p = String(prod||'').trim();
  const m = p.match(/\$(\d+)\s*$/);
  if(!m) return [null,null];
  // familia: lo de antes del precio, sin el " DE" final
  const base = p.slice(0, m.index).trim().toUpperCase().replace(/\s+DE$/,'');
  return [base, parseInt(m[1],10)];
}

function clasificar(items, excluidas){
  const EXC = new Set((excluidas||[]).map(s=>String(s).toUpperCase()));
  const rows=[], sinPrecio=[];
  for(const it of items){
    const ant = Number(it.cantidad_anterior)||0;
    const nue = Number(it.cantidad_nueva)||0;
    const dif = nue - ant;
    if(dif === 0) continue;
    const up = String(it.producto||'').trim().toUpperCase();
    if(up.startsWith('CHIP')) continue;           // regla 4: los chips no cuentan
    // regla 5: telefono, tablet y modem se controlan por IMEI aparte.
    // Fuera de todo el reporte: esta hoja es de accesorios.
    if(ES_EQUIPO.some(k => up.startsWith(k))) continue;
    const [base, precio] = basePrecio(it.producto);
    if(precio === null){ sinPrecio.push({...it, dif}); continue; }
    rows.push({
      clave: it.clave, prod: it.producto, base, precio, ant, nue, dif,
      cuadre: 0, trasp: 0,
      equipo: ES_EQUIPO.some(k => up.startsWith(k)),   // regla 5
      excluida: EXC.has(String(it.clave).toUpperCase())
    });
  }
  return {rows, sinPrecio};
}

const resto = x => Math.abs(x.dif) - x.cuadre - x.trasp;

/* Empareja faltantes con sobrantes de la misma familia, del precio más parecido
   al más distinto. Los equipos nunca entran. */
function emparejar(faltas, sobras, campo){
  const pares=[];
  for(const f of faltas){
    if(f.equipo) continue;
    for(const s of sobras){
      if(s.equipo) continue;
      if(f.base === s.base) pares.push([Math.abs(f.precio-s.precio), String(f.clave), f, s]);
    }
  }
  pares.sort((a,b)=> a[0]-b[0] || (a[1]<b[1]?-1:a[1]>b[1]?1:0));
  let total=0;
  for(const [,,f,s] of pares){
    const n = Math.min(resto(f), resto(s));
    if(n>0){ f[campo]+=n; s[campo]+=n; total+=n; }
  }
  return total;
}

function costoUnit(x){
  return SIN_DESC.includes(String(x.clave).toUpperCase())
    ? Math.round(x.precio*100)/100
    : Math.round(x.precio*(1-DESCUENTO)*100)/100;
}

function calificar(e){
  if(e>=99) return {n:'10.0', t:'EXCELENTE',  bg:'#D4EDDA', fg:'#0B5A1E'};
  if(e>=97) return {n:'9.0',  t:'MUY BUENO',  bg:'#D4EDDA', fg:'#0B5A1E'};
  if(e>=95) return {n:'8.0',  t:'ACEPTABLE',  bg:'#FFF3CD', fg:'#12305C'};
  if(e>=92) return {n:'7.0',  t:'REGULAR',    bg:'#FFE5CC', fg:'#8B4000'};
  return      {n:'6.0',  t:'DEFICIENTE', bg:'#F8D7DA', fg:'#8B0000'};
}

/* modulos = [{modulo, items}, ...]  — varios solo si son del mismo encargado */
function procesar(modulos, opciones){
  const o = Object.assign({excluidas:{}, mismoEncargado:true}, opciones||{});
  const R={}, SP={};
  for(const m of modulos){
    const k = clasificar(m.items, o.excluidas[m.modulo]);
    R[m.modulo]=k.rows; SP[m.modulo]=k.sinPrecio;
  }

  // 1) cuadre dentro de cada módulo
  const nCuadre={};
  for(const mod in R)
    nCuadre[mod] = emparejar(R[mod].filter(x=>x.dif<0), R[mod].filter(x=>x.dif>0), 'cuadre');

  // 2) cruce entre módulos del mismo encargado
  const nCruce={}; const mods = modulos.map(m=>m.modulo);
  for(const a of mods) nCruce[a]=0;
  if(o.mismoEncargado && mods.length>1){
    for(const a of mods) for(const b of mods){
      if(a===b) continue;
      nCruce[a] += emparejar(R[a].filter(x=>x.dif<0), R[b].filter(x=>x.dif>0), 'trasp');
    }
  }

  const salida=[];
  for(const m of modulos){
    const rows = R[m.modulo];
    for(const x of rows){
      const t = x.cuadre + x.trasp;
      x.final = x.dif<0 ? x.dif+t : x.dif-t;
      x.costo = costoUnit(x);
      x.total = Math.round(x.costo*Math.abs(x.final)*100)/100;
    }

    const F = rows.filter(x=>x.final<0);
    const fam = new Set(rows.filter(x=>x.dif<0).map(x=>x.base));
    // el sobrante de un equipo no alimenta la bolsa
    const S = rows.filter(x=>x.final>0 && fam.has(x.base) && !x.equipo);
    const disp = rows.filter(x=>x.final>0 && !fam.has(x.base) && !x.equipo);
    const vig = rows.filter(x=>!disp.includes(x));

    const ant = vig.reduce((a,x)=>a+x.ant,0);
    const uf  = F.reduce((a,x)=>a+Math.abs(x.final),0);
    const us  = S.reduce((a,x)=>a+x.final,0);
    const tf  = F.reduce((a,x)=>a+x.total,0);

    // 3) la bolsa: sobrante vigente + sobrante suelto, todo se aplica
    let bolsa = S.reduce((a,x)=>a+x.total,0) + disp.reduce((a,x)=>a+x.total,0);
    const bolsaIni = Math.round(bolsa*100)/100;
    const nBolsa   = us + disp.reduce((a,x)=>a+x.final,0);

    // cada faltante se abre en piezas sueltas, se cubre primero lo más caro
    const piezas=[];
    for(const x of F){
      if(x.excluida) continue;                     // regla 9
      for(let i=0;i<Math.abs(x.final);i++) piezas.push(x);
    }
    piezas.sort((a,b)=> b.costo - a.costo);

    const cobradas=[]; let cubiertas=0;
    for(const p of piezas){
      if(p.equipo){ cobradas.push(p); continue; }  // regla 5: al equipo no lo cubre nadie
      if(bolsa >= p.costo){ bolsa -= p.costo; cubiertas++; }
      else cobradas.push(p);
    }

    // reagrupar por clave lo que sí se cobra
    const g={};
    for(const p of cobradas){
      if(!g[p.clave]) g[p.clave]={...p, n:0};
      g[p.clave].n++;
    }
    const cob = Object.values(g).sort((a,b)=> String(a.clave)<String(b.clave)?-1:1);
    for(const x of cob) x.importe = Math.round(x.costo*x.n*100)/100;

    const subtotal = Math.round(cob.reduce((a,x)=>a+x.importe,0)*100)/100;
    const subEq    = Math.round(cob.filter(x=>x.equipo).reduce((a,x)=>a+x.importe,0)*100)/100;
    const subAcc   = Math.round((subtotal-subEq)*100)/100;
    // el descuento corre solo sobre accesorios
    const residual = Math.round(Math.min(bolsa, subAcc)*100)/100;
    const aPagar   = Math.round((Math.max(subAcc-residual,0) + subEq)*100)/100;

    const exact = ant ? Math.round((1-(uf+us)/ant)*10000)/100 : 0;
    salida.push({
      modulo: m.modulo, cob, sinPrecio: SP[m.modulo],
      st: {
        ant, nue: vig.reduce((a,x)=>a+x.nue,0), claves: vig.length,
        uf, us, tf: Math.round(tf*100)/100,
        nCuadre: nCuadre[m.modulo], nCruce: nCruce[m.modulo],
        bolsa: bolsaIni, nBolsa, cubiertas,
        nCobradas: cobradas.length, subtotal, residual, aPagar,
        exact, idx: ant ? Math.round((uf/ant)*10000)/100 : 0,
        cal: calificar(exact)
      }
    });
  }
  return salida;
}

export { procesar, calificar, basePrecio };
