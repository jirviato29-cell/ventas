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
    font-family: 'Trebuchet MS', 'Segoe UI', Verdana, sans-serif;
    font-size: 12px;
    font-weight: bold;
    color: #000;
    -webkit-print-color-adjust: exact;
  }
  .logo { width: 42mm; display: block; margin: 0 auto; }
  .sep-logo { height: 7px; }
  .eslogan { font-size: 9px; text-align: center; line-height: 1.3; }
  .empresa { font-size: 13px; text-align: center; margin-top: 4px; }
  .div { border-top: 1px dashed #000; margin: 5px 0; }
  .info { word-break: break-word; margin: 2px 0; }
  .prod-nombre { margin-top: 2px; word-break: break-word; }
  .prod-detalle { font-size: 10px; }
  .prod-precio { font-size: 14px; }
  .total-row { display: flex; justify-content: space-between; font-size: 15px; }
  .pago { word-break: break-word; margin: 2px 0; }
  .pie { margin-top: 6px; text-align: center; }
  .promo { margin-top: 6px; text-align: center; font-size: 10px; line-height: 1.3; }
</style>
</head>
<body>
  <img src="/logo-ticket.png" class="logo" alt="ATO">
  <div class="sep-logo"></div>
  <div class="eslogan">TODO LO QUE NECESITAS PARA COMUNICARTE<br>Accesorios · Equipos · Gadgets</div>
  <div class="empresa">Comercializadora Axcel</div>
  <div class="div"></div>
  <div class="info">Fecha: ${fecha}</div>
  ${data.modulo ? `<div class="info">Modulo: ${data.modulo}</div>` : ''}
  ${data.vendedor ? `<div class="info">Vendedor: ${data.vendedor}</div>` : ''}
  ${data.folio ? `<div class="info">Folio: ${data.folio}</div>` : ''}
  <div class="div"></div>
  ${data.productos.map((p) => `
    <div class="prod-nombre">${p.nombre}</div>
    <div class="prod-detalle">${p.cantidad} x ${fmt(p.precio_unitario)}</div>
    <div class="prod-precio">${fmt(p.cantidad * p.precio_unitario)}</div>
  `).join('<div style="height:5px"></div>')}
  <div class="div"></div>
  <div class="total-row"><span>TOTAL</span><span>${fmt(data.total)}</span></div>
  <div class="div"></div>
  <div class="pago">Pago: ${pagoTxt}</div>
  ${data.telefono ? `<div class="info">Tel: ${data.telefono}</div>` : ''}
  <div class="div"></div>
  <div class="pie">¡Gracias por tu compra!</div>
  <div class="promo">Presenta este ticket en tu siguiente compra y recibe 10% de descuento en: protectores, micas de hidrogel, cargadores, bocinas, power bank y manos libres.</div>
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
