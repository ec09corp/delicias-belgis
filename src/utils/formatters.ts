export function formatCurrency(amount: number, currency = 'USD'): string {
  const safeAmount = Number(amount) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount);
}

/** Fecha local (YYYY-MM-DD) sin el desfase de toISOString(), que usa UTC. */
export function toLocalDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Hora local HH:mm (24 h). */
export function toLocalTimeStr(d: Date = new Date()): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Convierte una fecha guardada a Date. Las fechas "YYYY-MM-DD" se toman como
 * medianoche local (new Date('YYYY-MM-DD') las toma en UTC y en Panamá caen el día anterior).
 */
export function parseFechaLocal(val: string | any): Date {
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
    const [y, m, d] = val.trim().split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  if (val && typeof val.toDate === 'function') return val.toDate();
  return new Date(val);
}

/** Escapa un valor para CSV (comillas, comas y saltos de línea). */
export function csvCell(val: unknown): string {
  const s = val === undefined || val === null ? "" : String(val);
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, "\"\"")}"` : s;
}

/** Descarga un CSV con BOM para que Excel muestre bien los acentos. */
export function downloadCSV(filename: string, headers: string[], rows: unknown[][]): void {
  const content = [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function formatDate(dateStr: string | any): string {
  if (!dateStr) return '';
  try {
    const d = parseFechaLocal(dateStr);
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
    const d = parseFechaLocal(dateStr);
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
