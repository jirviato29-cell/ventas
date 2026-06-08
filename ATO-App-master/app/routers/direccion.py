from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date

from app import models, schemas
from app.config import get_current_user
from app.database import get_db

router = APIRouter()


def _verificar_rol(user: models.Usuario):
    if user.is_admin:
        return
    if user.rol not in (models.RolEnum.direccion, models.RolEnum.admin):
        raise HTTPException(status_code=403, detail="Sin permiso para este recurso")


@router.get("/cortes", response_model=Optional[schemas.DireccionCorteResponse])
def obtener_corte_direccion(
    modulo_id: int = Query(...),
    fecha: date = Query(...),
    user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verificar_rol(user)
    print(f"[direccion/cortes] modulo_id={modulo_id!r} ({type(modulo_id).__name__}) fecha={fecha!r}")

    corte = (
        db.query(models.CorteDia)
        .filter(
            models.CorteDia.fecha == fecha,
            models.CorteDia.modulo_id == modulo_id,
        )
        .first()
    )

    print(f"[direccion/cortes] corte encontrado: {corte.id if corte else None}")
    if corte is None:
        return None

    # chips del módulo y fecha
    chips = (
        db.query(models.VentaChip)
        .join(models.Usuario, models.VentaChip.empleado_id == models.Usuario.id)
        .filter(
            models.Usuario.modulo_id == modulo_id,
            models.VentaChip.fecha == fecha,
            models.VentaChip.cancelada == False,
        )
        .all()
    )

    chips_por_tipo: dict = {}
    for chip in chips:
        tipo = chip.tipo_chip or "Sin tipo"
        chips_por_tipo[tipo] = chips_por_tipo.get(tipo, 0) + 1

    # ventas del módulo y fecha — mismo filtro que GET /ventas/ventas/cortes
    ventas_db = (
        db.query(models.Venta)
        .filter(
            func.date(models.Venta.fecha) == fecha,
            models.Venta.modulo_id == modulo_id,
            models.Venta.cancelada == False,
        )
        .all()
    )

    ventas_list = [
        schemas.VentaResumenItem(
            id=v.id,
            producto=v.producto,
            tipo_producto=v.tipo_producto,
            tipo_venta=v.tipo_venta,
            precio_unitario=v.precio_unitario,
            cantidad=v.cantidad,
            total=v.total,
            metodo_pago=v.metodo_pago,
            empleado_username=v.empleado.username if v.empleado else None,
            cancelada=v.cancelada or False,
        )
        for v in ventas_db
    ]

    print(f"[direccion/cortes] ventas encontradas: {len(ventas_list)} | chips: {len(chips)}")
    base = schemas.CorteDiaResponse.model_validate(corte)
    return schemas.DireccionCorteResponse(
        **base.model_dump(),
        chips_count=len(chips),
        chips_por_tipo=chips_por_tipo,
        ventas=ventas_list,
    )


# ─────────────────────────────────────────────────────────────────────────────
# GET /direccion/reporte-diario/pdf
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/reporte-diario/pdf")
def reporte_diario_pdf(
    fecha: date = Query(...),
    user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from io import BytesIO
    from fastapi.responses import StreamingResponse
    from reportlab.pdfgen import canvas as rl_canvas
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.colors import HexColor, white, black

    _verificar_rol(user)

    # ── 1. Recopilar datos por módulo ─────────────────────────────────────────
    EXCLUIR      = {21, 7}
    EFECTIVO_SET = {"efectivo", "cash"}

    modulos = (
        db.query(models.Modulo)
        .filter(~models.Modulo.id.in_(EXCLUIR))
        .order_by(models.Modulo.nombre)
        .all()
    )

    resultados = []
    for mod in modulos:
        corte = obtener_corte_direccion(modulo_id=mod.id, fecha=fecha, user=user, db=db)

        tel_por_prod: dict = {}
        acc_por_prod: dict = {}
        tel_ef  = 0.0
        tel_tar = 0.0

        if corte and corte.ventas:
            for v in corte.ventas:
                tipo  = (v.tipo_producto or "").lower().strip()
                monto = float(v.total or 0)
                if tipo == "telefono":
                    pago = (v.metodo_pago or "").lower().strip()
                    if pago in EFECTIVO_SET:
                        tel_ef  += monto
                    else:
                        tel_tar += monto
                    ent = tel_por_prod.setdefault(v.producto or "Sin nombre", {"cant": 0, "total": 0.0})
                    ent["cant"]  += v.cantidad
                    ent["total"] += monto
                elif tipo == "accesorios":
                    ent = acc_por_prod.setdefault(v.producto or "Sin nombre", {"cant": 0, "total": 0.0})
                    ent["cant"]  += v.cantidad
                    ent["total"] += monto

        tel_tot = tel_ef + tel_tar
        acc_ef  = float(corte.accesorios_efectivo) if corte else 0.0
        acc_tar = float(corte.accesorios_tarjeta)  if corte else 0.0
        acc_tot = float(corte.accesorios_total)    if corte else 0.0
        mod_ef  = acc_ef + tel_ef
        mod_tar = acc_tar + tel_tar
        mod_tot = acc_tot + tel_tot

        resultados.append({
            "nombre":       mod.nombre,
            "sin_ventas":   corte is None or (acc_tot == 0 and tel_tot == 0),
            "tel_por_prod": tel_por_prod,
            "acc_por_prod": acc_por_prod,
            "tel_ef": tel_ef,  "tel_tar": tel_tar,  "tel_tot": tel_tot,
            "acc_ef": acc_ef,  "acc_tar": acc_tar,  "acc_tot": acc_tot,
            "mod_ef": mod_ef,  "mod_tar": mod_tar,  "mod_tot": mod_tot,
        })

    # ── 2. Resumen general ────────────────────────────────────────────────────
    res_tel = sum(r["tel_tot"] for r in resultados)
    res_acc = sum(r["acc_tot"] for r in resultados)
    res_ef  = sum(r["mod_ef"]  for r in resultados)
    res_tar = sum(r["mod_tar"] for r in resultados)
    res_tot = sum(r["mod_tot"] for r in resultados)

    # ── 3. Generar PDF ────────────────────────────────────────────────────────
    AZUL     = HexColor("#16264a")
    AMARILLO = HexColor("#f5c542")
    GRIS_F   = HexColor("#f0f4fa")
    GRIS_T   = HexColor("#dde5f0")

    W, H    = letter          # 612 × 792 pt
    MARGEN  = 30
    ancho   = W - 2 * MARGEN  # 552 pt

    # Columnas fijas para las tablas de productos
    CP = MARGEN + 4      # Producto — left
    CC = MARGEN + 335    # Cant.    — right-align
    CM = MARGEN + 440    # P. Prom. — right-align
    CT = W - MARGEN - 4  # Total    — right-align

    def fp(v: float) -> str:
        return f"${v:,.2f}"

    buf       = BytesIO()
    c         = rl_canvas.Canvas(buf, pagesize=letter)
    fecha_str = fecha.strftime("%d / %m / %Y")

    # ── helpers de dibujo ─────────────────────────────────────────────────────
    def hdr() -> None:
        c.setFillColor(AZUL)
        c.rect(0, H - 70, W, 70, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 18)
        c.drawString(MARGEN, H - 32, "ATO Sistema")
        c.setFont("Helvetica", 11)
        c.drawString(MARGEN, H - 52, "Reporte de ventas")
        c.setFillColor(AMARILLO)
        c.setFont("Helvetica-Bold", 14)
        c.drawRightString(W - MARGEN, H - 40, fecha_str)

    def chk(y: float, needed: float) -> float:
        """Nueva página si no hay espacio; retorna el nuevo cursor y."""
        if y < MARGEN + needed:
            c.showPage()
            hdr()
            return float(H - 82)
        return y

    def tabla_hdr(y: float, titulo: str) -> float:
        c.setFillColor(GRIS_T)
        c.rect(MARGEN, y - 16, ancho, 16, fill=1, stroke=0)
        c.setFillColor(AZUL)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(CP, y - 12, titulo)
        c.drawRightString(CC, y - 12, "Cant.")
        c.drawRightString(CM, y - 12, "P. Prom.")
        c.drawRightString(CT, y - 12, "Total")
        return y - 16

    def tabla_row(y: float, prod: str, datos: dict, idx: int) -> float:
        c.setFillColor(GRIS_F if idx % 2 == 0 else white)
        c.rect(MARGEN, y - 14, ancho, 14, fill=1, stroke=0)
        c.setFillColor(black)
        c.setFont("Helvetica", 8)
        prom = datos["total"] / datos["cant"] if datos["cant"] else 0.0
        c.drawString(CP, y - 10, prod[:58])
        c.drawRightString(CC, y - 10, str(datos["cant"]))
        c.drawRightString(CM, y - 10, fp(prom))
        c.drawRightString(CT, y - 10, fp(datos["total"]))
        return y - 14

    # ── Encabezado y resumen general ──────────────────────────────────────────
    hdr()
    y = float(H - 82)

    y -= 14
    c.setFillColor(AZUL)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(MARGEN, y, "RESUMEN GENERAL DEL DÍA")
    y -= 10

    BOX_W = (ancho - 15) / 4
    BOX_H = 52.0
    for i, (lbl, val) in enumerate([
        ("Teléfonos", res_tel), ("Accesorios", res_acc),
        ("Efectivo",  res_ef),  ("Tarjeta",    res_tar),
    ]):
        bx = MARGEN + i * (BOX_W + 5)
        by = y - BOX_H
        c.setFillColor(GRIS_F)
        c.rect(bx, by, BOX_W, BOX_H, fill=1, stroke=0)
        c.setFillColor(AZUL)
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(bx + BOX_W / 2, by + BOX_H - 16, lbl)
        c.setFont("Helvetica-Bold", 13)
        c.drawCentredString(bx + BOX_W / 2, by + 12, fp(val))
    y -= BOX_H + 6

    c.setFillColor(AMARILLO)
    c.rect(MARGEN, y - 24, ancho, 24, fill=1, stroke=0)
    c.setFillColor(AZUL)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(MARGEN + 8, y - 16, "TOTAL GENERAL DEL DÍA")
    c.drawRightString(CT, y - 16, fp(res_tot))
    y -= 36

    # ── Sección por módulo ────────────────────────────────────────────────────
    for r in resultados:
        y = chk(y, 72)

        # Banda azul — nombre del módulo
        c.setFillColor(AZUL)
        c.rect(MARGEN, y - 20, ancho, 20, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(MARGEN + 6, y - 14, r["nombre"].upper())
        y -= 24

        if r["sin_ventas"]:
            c.setFillColor(black)
            c.setFont("Helvetica-Oblique", 9)
            c.drawString(MARGEN + 8, y - 10, "Sin ventas")
            y -= 20
            continue

        # Sub-tabla TELÉFONOS
        if r["tel_por_prod"]:
            y = chk(y, 62)
            y = tabla_hdr(y, "TELÉFONOS")
            for idx, (prod, datos) in enumerate(sorted(r["tel_por_prod"].items())):
                y = chk(y, 34)
                y = tabla_row(y, prod, datos, idx)

        # Sub-tabla ACCESORIOS
        if r["acc_por_prod"]:
            y = chk(y, 62)
            y = tabla_hdr(y, "ACCESORIOS")
            for idx, (prod, datos) in enumerate(sorted(r["acc_por_prod"].items())):
                y = chk(y, 34)
                y = tabla_row(y, prod, datos, idx)

        # Línea de subtotales del módulo
        y = chk(y, 28)
        c.setFillColor(GRIS_T)
        c.rect(MARGEN, y - 18, ancho, 18, fill=1, stroke=0)
        c.setFillColor(AZUL)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(MARGEN + 4,   y - 13, "Efectivo:")
        c.setFillColor(black)
        c.setFont("Helvetica", 8)
        c.drawString(MARGEN + 54,  y - 13, fp(r["mod_ef"]))
        c.setFillColor(AZUL)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(MARGEN + 170, y - 13, "Tarjeta:")
        c.setFillColor(black)
        c.setFont("Helvetica", 8)
        c.drawString(MARGEN + 218, y - 13, fp(r["mod_tar"]))
        c.setFillColor(AZUL)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(MARGEN + 330, y - 13, "Subtotal:")
        c.setFillColor(black)
        c.setFont("Helvetica-Bold", 8)
        c.drawRightString(CT, y - 13, fp(r["mod_tot"]))
        y -= 24

    c.save()
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="reporte_{fecha}.pdf"'},
    )
