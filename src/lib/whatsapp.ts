// Armado del mensaje de WhatsApp con emojis.
// El número SIEMPRE viene de la configuración del panel (base de
// datos) — nunca está hardcodeado en el código.

export interface WaCustomer {
  name: string;
  phone: string;
  address: string;
  location: string;
  reference: string;
  payment_method: string;
  notes: string;
}

export interface WaItem {
  name: string;
  unit: string;
  quantity: number;
  price: number;
}

export function waUrl(phone: string, text: string): string {
  const clean = String(phone || '').replace(/[^\d]/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}

export function buildOrderMessage(opts: {
  businessName: string;
  orderNumber: string;
  customer: WaCustomer;
  items: WaItem[];
  total: number;
}): string {
  const { businessName, orderNumber, customer, items, total } = opts;
  const lines: string[] = [];

  lines.push(`🛒 *NUEVO PEDIDO* — ${businessName}`);
  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push(`📋 *Pedido:* ${orderNumber}`);
  lines.push(`👤 *Cliente:* ${customer.name}`);
  lines.push(`📞 *Teléfono:* ${customer.phone}`);
  lines.push(`📍 *Dirección:* ${customer.address}`);
  lines.push(`🏙️ *Localidad:* ${customer.location}`);
  if (customer.reference) lines.push(`📌 *Referencia:* ${customer.reference}`);
  lines.push(`💳 *Método de pago:* ${customer.payment_method}`);
  if (customer.notes) lines.push(`📝 *Observaciones:* ${customer.notes}`);
  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push('🧾 *DETALLE DEL PEDIDO:*');
  for (const it of items) {
    const unitLabel = it.unit && it.unit !== 'Unidad' ? ` (${it.unit})` : '';
    lines.push(`▫️ ${it.quantity} x ${it.name}${unitLabel} — $${(it.price * it.quantity).toLocaleString('es-AR')}`);
  }
  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push(`💰 *TOTAL: $${total.toLocaleString('es-AR')}*`);
  lines.push('');
  lines.push('¡Gracias por su compra! 🙌');

  return lines.join('\n');
}
