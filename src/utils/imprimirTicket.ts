interface ProductoTicket {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
}

interface TicketData {
  productos: ProductoTicket[];
  total: number;
  metodoPago: string;
  montoDividido?: { efectivo: string; tarjeta: string };
  telefono?: string;
  folio?: string | number;
  modulo?: string;
  vendedor?: string;
}

const fmt = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

export function imprimirTicket(data: TicketData): void {
  const fecha = new Date().toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  let pagoTxt = '';
  if (data.metodoPago === 'dividido' && data.montoDividido) {
    pagoTxt =
      `Efectivo: ${fmt(Number(data.montoDividido.efectivo) || 0)}<br>` +
      `Tarjeta: ${fmt(Number(data.montoDividido.tarjeta) || 0)}`;
  } else {
    pagoTxt = data.metodoPago.charAt(0).toUpperCase() + data.metodoPago.slice(1);
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { size: 58mm auto; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 58mm;
    padding: 2mm 3mm;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    color: #000;
    -webkit-print-color-adjust: exact;
  }
  .center { text-align: center; }
  .logo { width: 42mm; display: block; margin: 0 auto 3px; }
  .eslogan { font-size: 9px; text-align: center; line-height: 1.2; }
  .empresa { font-size: 12px; font-weight: bold; text-align: center; margin-top: 4px; }
  .div { border-top: 1px dashed #000; margin: 5px 0; }
  .row { display: flex; justify-content: space-between; }
  .item-nombre { font-weight: bold; margin-top: 4px; }
  .item-precio { font-weight: bold; font-size: 13px; }
  .total { font-size: 15px; font-weight: bold; }
  .pie { margin-top: 6px; text-align: center; }
</style>
</head>
<body>
  <img src="/logo-ticket.png" class="logo" alt="ATO">
  <div class="eslogan">TODO LO QUE NECESITAS PARA COMUNICARTE<br>Accesorios · Equipos · Gadgets</div>
  <div class="empresa">Comercializadora Axcel</div>
  <div class="div"></div>
  <div class="row"><span>Fecha:</span><span>${fecha}</span></div>
  ${data.modulo ? `<div class="row"><span>Modulo:</span><span>${data.modulo}</span></div>` : ''}
  ${data.vendedor ? `<div class="row"><span>Vendedor:</span><span>${data.vendedor}</span></div>` : ''}
  ${data.folio ? `<div class="row"><span>Folio:</span><span>${data.folio}</span></div>` : ''}
  <div class="div"></div>
  ${data.productos.map((p) => `
    <div class="item-nombre">${p.nombre}</div>
    <div class="item-precio">${fmt(p.cantidad * p.precio_unitario)}</div>
    <div style="font-size:9px">${p.cantidad} x ${fmt(p.precio_unitario)}</div>
  `).join('')}
  <div class="div"></div>
  <div class="row total"><span>TOTAL</span><span>${fmt(data.total)}</span></div>
  <div class="div"></div>
  <div class="row"><span>Pago:</span><span style="text-align:right">${pagoTxt}</span></div>
  ${data.telefono ? `<div class="row"><span>Tel:</span><span>${data.telefono}</span></div>` : ''}
  <div class="div"></div>
  <div class="pie">¡Gracias por su compra!</div>
  <div style="height:12mm"></div>
</body>
</html>`;

  console.log('[ticket] imprimirTicket llamado', data);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow!.document;
  doc.open();
  doc.write(html);
  doc.close();

  const win = iframe.contentWindow!;
  const disparar = () => {
    console.log('[ticket] disparando print');
    win.focus();
    win.print();
    setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe);
    }, 1000);
  };

  const img = doc.querySelector('img');
  if (img && !img.complete) {
    img.onload = disparar;
    img.onerror = disparar;
  } else {
    setTimeout(disparar, 200);
  }
}
