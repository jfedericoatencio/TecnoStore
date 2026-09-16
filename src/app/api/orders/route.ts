// POST /api/orders — registra el pedido de un cliente (público).
// Los precios se recalculan del lado del servidor (nunca se
// confía en el frontend) y se descuenta stock atómicamente.
import { qAll, qRun, tx, lastId } from '@/db';
import type { Product, SettingsMap } from '@/lib/types';
import { finalPrice } from '@/lib/format';

export const dynamic = 'force-dynamic';

interface IncomingItem {
  productId: number;
  quantity: number;
}

function generateOrderNumber(orderId: number): string {
  return 'PED-' + String(orderId).padStart(6, '0');
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const c = body?.customer ?? {};
  const items: IncomingItem[] = Array.isArray(body?.items) ? body.items : [];

  const name = String(c.name ?? '').trim();
  const phone = String(c.phone ?? '').trim();
  const address = String(c.address ?? '').trim();
  const location = String(c.location ?? '').trim();
  const reference = String(c.reference ?? '').trim();
  const payment = String(c.payment_method ?? '').trim();
  const notes = String(c.notes ?? '').trim().slice(0, 500);

  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = 'Ingresá tu nombre';
  if (phone.replace(/\D/g, '').length < 6) errors.phone = 'Ingresá un teléfono válido';
  if (address.length < 3) errors.address = 'Ingresá la dirección de entrega';
  if (location.length < 2) errors.location = 'Ingresá la localidad';
  if (!payment) errors.payment_method = 'Seleccioná un método de pago';
  if (items.length === 0) errors.items = 'El carrito está vacío';
  if (Object.keys(errors).length > 0) {
    return Response.json({ error: 'Faltan datos del pedido', errors }, { status: 400 });
  }

  // Recalcular precios con la base de datos
  const ids = items.map((i) => Number(i.productId)).filter((n) => Number.isInteger(n) && n > 0);
  const products = await qAll<Product>(
    `SELECT * FROM products WHERE available = 1 AND id IN (${ids.map(() => '?').join(',')})`,
    ...ids
  );
  const byId = new Map(products.map((p) => [Number(p.id), p]));

  const orderItems: { productId: number; name: string; unit: string; price: number; quantity: number }[] = [];
  for (const it of items) {
    const p = byId.get(Number(it.productId));
    const qty = Math.floor(Number(it.quantity));
    if (!p) {
      return Response.json({ error: `Un producto del carrito ya no está disponible` }, { status: 409 });
    }
    if (!Number.isInteger(qty) || qty < 1) {
      return Response.json({ error: `Cantidad inválida para ${p.name}` }, { status: 400 });
    }
    if (qty > Number(p.stock)) {
      return Response.json(
        { error: `Stock insuficiente de "${p.name}" (disponible: ${p.stock})` },
        { status: 409 }
      );
    }
    orderItems.push({
      productId: Number(p.id),
      name: p.name,
      unit: p.unit,
      price: finalPrice(p),
      quantity: qty,
    });
  }

  const total = orderItems.reduce((s, i) => s + i.price * i.quantity, 0);

  // Pedido mínimo
  const settingsRows = await qAll<{ key: string; value: string }>('SELECT key, value FROM settings');
  const settings: SettingsMap = {};
  for (const r of settingsRows) settings[r.key] = r.value;
  const minOrder = Number(settings.min_order || 0);
  if (minOrder > 0 && total < minOrder) {
    return Response.json(
      { error: `El pedido mínimo es de $${minOrder.toLocaleString('es-AR')}` },
      { status: 400 }
    );
  }

  try {
    const result = await tx(async () => {
      const tempNumber = 'TEMP-' + Date.now();
      const ins = await qRun(
        `INSERT INTO orders (number, customer_name, phone, address, location, reference, payment_method, notes, total, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'nuevo')`,
        tempNumber, name, phone, address, location, reference, payment, notes, total
      );
      const orderId = lastId(ins);
      const number = generateOrderNumber(orderId);
      await qRun('UPDATE orders SET number = ? WHERE id = ?', number, orderId);
      for (const it of orderItems) {
        await qRun(
          `INSERT INTO order_items (order_id, product_id, name, unit, price, quantity) VALUES (?, ?, ?, ?, ?, ?)`,
          orderId, it.productId, it.name, it.unit, it.price, it.quantity
        );
        const upd = await qRun(
          'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
          it.quantity, it.productId, it.quantity
        );
        if (upd.changes !== 1) {
          throw new Error(`STOCK:${it.name}`);
        }
      }
      return { id: orderId, number };
    });
    return Response.json({ ok: true, ...result, total });
  } catch (e: any) {
    if (String(e?.message ?? '').startsWith('STOCK:')) {
      return Response.json(
        { error: `Stock insuficiente de "${String(e.message).slice(6)}" al confirmar. Actualizá el carrito.` },
        { status: 409 }
      );
    }
    console.error(e);
    return Response.json({ error: 'No se pudo registrar el pedido' }, { status: 500 });
  }
}
