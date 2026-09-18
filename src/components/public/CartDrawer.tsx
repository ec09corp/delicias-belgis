import React, { useState } from 'react';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  Phone,
  MapPin,
  FileText,
  User,
  Store,
  Bike,
  Utensils,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import { CartItem, ConfiguracionNegocio, TipoPedido } from '../../types';
import { formatCurrency, cleanWhatsAppNumber, buildWhatsAppOrderMessage } from '../../utils/formatters';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  config: ConfiguracionNegocio;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
}

interface SentWhatsAppOrder {
  cliente: string;
  telefono: string;
  tipoPedido: TipoPedido;
  direccion: string;
  notas: string;
  productos: {
    nombre: string;
    cantidad: number;
    precio: number;
    subtotal: number;
  }[];
  subtotal: number;
  total: number;
  waUrl: string;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  config,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryType, setDeliveryType] = useState<TipoPedido>('para_recoger');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sentWhatsAppOrder, setSentWhatsAppOrder] = useState<SentWhatsAppOrder | null>(null);

  if (!isOpen) return null;

  // Calculate totals
  const subtotal = cart.reduce((acc, item) => acc + item.producto.precio * item.cantidad, 0);
  const total = subtotal;
  const targetWhatsAppNumber = cleanWhatsAppNumber(config.whatsapp || '50767979141');

  /**
   * Send order directly to WhatsApp.
   * Does not send to Caja.
   */
  const handleEnviarWhatsApp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (cart.length === 0) {
      setErrorMessage('Tu carrito de compras está vacío.');
      return;
    }
    if ((deliveryType === 'delivery' || deliveryType === 'a_domicilio') && !deliveryAddress.trim()) {
      setErrorMessage('Por favor especifica la dirección exacta para la entrega a domicilio.');
      return;
    }

    const items = cart.map((item) => ({
      nombre: item.producto.nombre,
      cantidad: item.cantidad,
      precio: item.producto.precio,
      subtotal: item.producto.precio * item.cantidad,
    }));

    const messageText = buildWhatsAppOrderMessage({
      negocioNombre: config.nombre || 'Delicias Belgi',
      cliente: customerName.trim() || undefined,
      telefono: customerPhone.trim() || undefined,
      tipoPedido: deliveryType,
      direccion: (deliveryType === 'delivery' || deliveryType === 'a_domicilio') ? deliveryAddress.trim() : undefined,
      productos: items,
      subtotal,
      total,
      notas: customerNotes.trim() || undefined,
      moneda: config.moneda || 'USD',
    });

    const waUrl = `https://wa.me/${targetWhatsAppNumber}?text=${encodeURIComponent(messageText)}`;

    // Open WhatsApp directly
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    // Save summary for confirmation view
    setSentWhatsAppOrder({
      cliente: customerName.trim() || 'Cliente',
      telefono: customerPhone.trim(),
      tipoPedido: deliveryType,
      direccion: deliveryAddress.trim(),
      notas: customerNotes.trim(),
      productos: items,
      subtotal,
      total,
      waUrl,
    });

    // Clear cart
    onClearCart();
  };

  const handleResetForNewOrder = () => {
    setSentWhatsAppOrder(null);
    setCustomerNotes('');
    setErrorMessage(null);
    onClose();
  };

  const getTipoPedidoLabel = (tipo: TipoPedido) => {
    switch (tipo) {
      case 'delivery':
      case 'a_domicilio':
        return 'Delivery a Domicilio';
      case 'consumo_local':
      case 'en_mesa':
        return 'Consumo en el Local';
      default:
        return 'Para Recoger';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" id="cart-drawer">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#faf7f2] shadow-2xl flex flex-col">
          
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-stone-200 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-800" />
              <h2 className="font-serif text-lg font-bold text-stone-900">
                {sentWhatsAppOrder ? 'Pedido para WhatsApp' : 'Carrito de Compras'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Conditional View: WhatsApp Sent Confirmation vs Shopping Cart */}
          {sentWhatsAppOrder ? (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* Success Badge */}
              <div className="text-center py-4 space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <MessageCircle className="w-9 h-9 fill-current" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-stone-900">
                    ¡Pedido Preparado para WhatsApp!
                  </h3>
                  <p className="text-xs text-stone-600 max-w-xs mx-auto mt-1">
                    Se preparó tu mensaje con el detalle completo del pedido para <strong className="text-stone-800">{config.nombre || 'Delicias Belgi'}</strong>.
                  </p>
                </div>
              </div>

              {/* Direct Reopen Button */}
              <a
                href={sentWhatsAppOrder.waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 fill-white" />
                <span>Abrir WhatsApp (+{targetWhatsAppNumber})</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              {/* Order Ticket Card */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3.5">
                {/* Modalidad */}
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                    Modalidad
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{getTipoPedidoLabel(sentWhatsAppOrder.tipoPedido)}</span>
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-xs text-stone-600">
                  {sentWhatsAppOrder.cliente && (
                    <div className="flex justify-between">
                      <span className="text-stone-500">Cliente:</span>
                      <strong className="text-stone-900">{sentWhatsAppOrder.cliente}</strong>
                    </div>
                  )}
                  {sentWhatsAppOrder.telefono && (
                    <div className="flex justify-between">
                      <span className="text-stone-500">Teléfono:</span>
                      <strong className="text-stone-900">{sentWhatsAppOrder.telefono}</strong>
                    </div>
                  )}
                  {sentWhatsAppOrder.direccion && (
                    <div className="flex justify-between">
                      <span className="text-stone-500">Dirección:</span>
                      <strong className="text-stone-900 text-right max-w-[200px] truncate">{sentWhatsAppOrder.direccion}</strong>
                    </div>
                  )}
                  {sentWhatsAppOrder.notas && (
                    <div className="pt-1.5 text-stone-500 italic bg-stone-50 p-2 rounded-lg text-[11px]">
                      Notas: "{sentWhatsAppOrder.notas}"
                    </div>
                  )}
                </div>

                {/* Items Summary */}
                <div className="pt-3 border-t border-stone-100">
                  <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block mb-1.5">
                    Productos Solicitados
                  </span>
                  <div className="space-y-1 text-xs">
                    {sentWhatsAppOrder.productos.map((prod, idx) => (
                      <div key={idx} className="flex justify-between py-0.5">
                        <span className="text-stone-800">
                          {prod.cantidad}x {prod.nombre}
                        </span>
                        <span className="font-semibold text-stone-900">
                          {formatCurrency(prod.subtotal, config.moneda || 'USD')}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 mt-2 border-t border-stone-200 flex justify-between items-baseline">
                    <span className="text-xs font-bold text-stone-700">Total:</span>
                    <span className="font-serif text-lg font-extrabold text-amber-950">
                      {formatCurrency(sentWhatsAppOrder.total, config.moneda || 'USD')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  id="new-order-btn"
                  onClick={handleResetForNewOrder}
                  className="w-full py-3 px-4 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ShoppingBag className="w-4 h-4 text-amber-800" />
                  <span>Volver al Menú / Hacer Otro Pedido</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center py-16 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-amber-100/70 text-amber-800 flex items-center justify-center mx-auto">
                      <ShoppingBag className="w-8 h-8 opacity-60" />
                    </div>
                    <h3 className="font-serif text-base font-bold text-stone-800">
                      Tu carrito está vacío
                    </h3>
                    <p className="text-xs text-stone-500 max-w-xs mx-auto">
                      Explora el menú y agrega tus delicias favoritas para realizar tu pedido en tiempo real.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Item list */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                          Productos seleccionados ({cart.length})
                        </span>
                        <button
                          onClick={onClearCart}
                          className="text-[11px] text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          Vaciar carrito
                        </button>
                      </div>

                      {cart.map((item) => {
                        const itemSubtotal = item.producto.precio * item.cantidad;
                        return (
                          <div
                            key={item.producto.id}
                            className="bg-white p-3 rounded-2xl border border-stone-200 shadow-xs flex items-center gap-3"
                          >
                            <img
                              src={item.producto.imagen}
                              alt={item.producto.nombre}
                              className="w-14 h-14 rounded-xl object-cover border border-stone-100 bg-stone-50 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-serif text-xs font-bold text-stone-900 truncate">
                                {item.producto.nombre}
                              </h4>
                              <p className="text-[11px] text-stone-500">
                                {formatCurrency(item.producto.precio, config.moneda || 'USD')} c/u
                              </p>
                              {/* Quantity controls */}
                              <div className="flex items-center gap-2 mt-1.5">
                                <button
                                  type="button"
                                  onClick={() => onUpdateQuantity(item.producto.id!, item.cantidad - 1)}
                                  className="w-6 h-6 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-xs font-bold text-stone-800 w-4 text-center">
                                  {item.cantidad}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onUpdateQuantity(item.producto.id!, item.cantidad + 1)}
                                  className="w-6 h-6 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-col items-end justify-between h-14 py-0.5">
                              <button
                                type="button"
                                onClick={() => onRemoveItem(item.producto.id!)}
                                className="text-stone-300 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                                title="Eliminar producto"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <span className="text-xs font-extrabold text-amber-950 font-serif">
                                {formatCurrency(itemSubtotal, config.moneda || 'USD')}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Order Details Form for WhatsApp */}
                    <form onSubmit={handleEnviarWhatsApp} className="pt-4 border-t border-stone-200/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-950 block">
                          Datos de Contacto
                        </span>
                        <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          Envío directo por WhatsApp
                        </span>
                      </div>

                      {errorMessage && (
                        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                          {errorMessage}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[11px] font-semibold text-stone-700 block mb-1 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-amber-800" />
                            <span>Nombre del cliente</span>
                          </label>
                          <input
                            id="order-customer-name"
                            type="text"
                            placeholder="Tu nombre (opcional)"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-800 text-stone-800"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-stone-700 block mb-1 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-amber-800" />
                            <span>Teléfono</span>
                          </label>
                          <input
                            id="order-customer-phone"
                            type="tel"
                            placeholder="Tu teléfono (opcional)"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-800 text-stone-800"
                          />
                        </div>
                      </div>

                      {/* Delivery Type Selector */}
                      <div>
                        <label className="text-[11px] font-semibold text-stone-700 block mb-1.5">
                          Tipo de pedido
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDeliveryType('para_recoger')}
                            className={`py-2 px-1.5 rounded-xl text-[11px] font-semibold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                              deliveryType === 'para_recoger' || deliveryType === 'para_llevar'
                                ? 'bg-amber-900 border-amber-900 text-white font-bold shadow-xs'
                                : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                            }`}
                          >
                            <Store className="w-4 h-4" />
                            <span>Para recoger</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeliveryType('delivery')}
                            className={`py-2 px-1.5 rounded-xl text-[11px] font-semibold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                              deliveryType === 'delivery' || deliveryType === 'a_domicilio'
                                ? 'bg-amber-900 border-amber-900 text-white font-bold shadow-xs'
                                : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                            }`}
                          >
                            <Bike className="w-4 h-4" />
                            <span>Delivery</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeliveryType('consumo_local')}
                            className={`py-2 px-1.5 rounded-xl text-[11px] font-semibold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                              deliveryType === 'consumo_local' || deliveryType === 'en_mesa'
                                ? 'bg-amber-900 border-amber-900 text-white font-bold shadow-xs'
                                : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                            }`}
                          >
                            <Utensils className="w-4 h-4" />
                            <span>Consumo local</span>
                          </button>
                        </div>
                      </div>

                      {/* Delivery Address (only if delivery is selected) */}
                      {(deliveryType === 'delivery' || deliveryType === 'a_domicilio') && (
                        <div>
                          <label className="text-[11px] font-semibold text-stone-700 block mb-1 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-amber-800" />
                            <span>Dirección de entrega *</span>
                          </label>
                          <input
                            id="order-customer-address"
                            type="text"
                            required
                            placeholder="Calle, # de casa, PH, referencia..."
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-800 text-stone-800"
                          />
                        </div>
                      )}

                      {/* Additional notes */}
                      <div>
                        <label className="text-[11px] font-semibold text-stone-700 block mb-1 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-stone-400" />
                          <span>Comentarios adicionales (opcional)</span>
                        </label>
                        <input
                          id="order-customer-notes"
                          type="text"
                          placeholder="Ej. Servilletas extra, cucharitas, alérgenos..."
                          value={customerNotes}
                          onChange={(e) => setCustomerNotes(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-800 text-stone-800"
                        />
                      </div>
                    </form>
                  </>
                )}
              </div>

              {/* Footer & Order Submission */}
              {cart.length > 0 && (
                <div className="p-4 sm:p-5 border-t border-stone-200 bg-white space-y-3">
                  <div className="space-y-1.5 text-xs text-stone-600">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-semibold text-stone-900">{formatCurrency(subtotal, config.moneda || 'USD')}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-stone-900 pt-2 border-t border-stone-100">
                      <span>Total del Pedido:</span>
                      <span className="font-serif text-xl text-amber-950 font-extrabold">
                        {formatCurrency(total, config.moneda || 'USD')}
                      </span>
                    </div>
                  </div>

                  {/* Submit Button to WhatsApp */}
                  <button
                    id="submit-order-btn"
                    onClick={() => handleEnviarWhatsApp()}
                    className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/25 transition-all active:scale-[0.99] cursor-pointer"
                  >
                    <MessageCircle className="w-5 h-5 fill-white" />
                    <span>Enviar Pedido por WhatsApp ({formatCurrency(total, config.moneda || 'USD')})</span>
                  </button>
                  <p className="text-[11px] text-center text-stone-500 leading-tight">
                    Tu pedido se enviará directamente por <span className="font-semibold text-emerald-700">WhatsApp</span> al (+{targetWhatsAppNumber}).
                  </p>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};
