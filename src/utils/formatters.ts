export function formatCurrency(amount: number, currency = 'USD'): string {
  const safeAmount = Number(amount) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount);
}

export function formatDate(dateStr: string | any): string {
  if (!dateStr) return '';
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr.toDate ? dateStr.toDate() : new Date(dateStr);
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return String(dateStr);
  }
}

export function formatDateShort(dateStr: string | any): string {
  if (!dateStr) return '';
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr.toDate ? dateStr.toDate() : new Date(dateStr);
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  } catch {
    return String(dateStr);
  }
}

export function cleanWhatsAppNumber(phone: string, defaultCode = '507'): string {
  if (!phone) return '50767979141';
  // Remove spaces, parentheses, dashes, plus signs
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (!cleaned) return '50767979141';
  // If it's an 8-digit number (Panama mobile/landline), prepend 507
  if (cleaned.length === 8) {
    return `${defaultCode}${cleaned}`;
  }
  return cleaned;
}

export function buildWhatsAppOrderMessage({
  negocioNombre,
  numeroPedido,
  cliente,
  telefono,
  tipoPedido,
  direccion,
  productos,
  subtotal,
  total,
  notas,
  moneda = 'USD',
}: {
  negocioNombre: string;
  numeroPedido?: string;
  cliente?: string;
  telefono?: string;
  tipoPedido?: string;
  direccion?: string;
  productos: { nombre: string; cantidad: number; precio: number; subtotal: number }[];
  subtotal: number;
  total: number;
  notas?: string;
  moneda?: string;
}): string {
  const lines: string[] = [];
  lines.push(`🧁 *NUEVO PEDIDO - ${negocioNombre ? negocioNombre.toUpperCase() : 'DELICIAS BELGI'}!*`);
  if (numeroPedido) {
    lines.push(`📋 *Orden:* #${numeroPedido}`);
  }
  lines.push('');
  if (cliente && cliente.trim()) lines.push(`👤 *Cliente:* ${cliente.trim()}`);
  if (telefono && telefono.trim()) lines.push(`📱 *Teléfono:* ${telefono.trim()}`);

  const tipoStr =
    tipoPedido === 'a_domicilio' || tipoPedido === 'delivery'
      ? '🛵 A Domicilio'
      : tipoPedido === 'en_mesa' || tipoPedido === 'consumo_local'
      ? '🍽️ En Mesa'
      : '🛍️ Para Llevar';
  lines.push(`📦 *Modalidad:* ${tipoStr}`);

  if (direccion && direccion.trim()) {
    lines.push(`📍 *Dirección de entrega:* ${direccion.trim()}`);
  }
  lines.push('');
  lines.push('🛒 *DETALLE DEL PEDIDO:*');
  productos.forEach((item) => {
    lines.push(
      `• *${item.cantidad}x* ${item.nombre} — ${formatCurrency(item.precio, moneda)} c/u = *${formatCurrency(item.subtotal, moneda)}*`
    );
  });
  lines.push('');
  if (subtotal !== total) {
    lines.push(`Subtotal: ${formatCurrency(subtotal, moneda)}`);
  }
  lines.push(`💰 *TOTAL A PAGAR: ${formatCurrency(total, moneda)}*`);
  if (notas && notas.trim()) {
    lines.push('');
    lines.push(`📝 *Notas especiales:* ${notas.trim()}`);
  }
  lines.push('');
  lines.push('Por favor confírmenme el pedido para coordinar. ¡Muchas gracias!');
  return lines.join('\n');
}
