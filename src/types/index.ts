export type AdminTab =
  | 'dashboard'
  | 'ventas'
  | 'productos'
  | 'inventario'
  | 'produccion'
  | 'categorias'
  | 'usuarios'
  | 'configuracion';

export type UserRole = 'admin' | 'caja';

export interface UserAuth {
  uid: string;
  email: string | null;
  displayName?: string | null;
  role?: UserRole;
}

export interface UsuarioDoc {
  uid: string;
  email: string;
  nombre?: string;
  role: UserRole;
  rol?: UserRole;
  activo?: boolean;
  id?: string;
  createdAt?: string;
}

export interface Usuario {
  id: string;
  uid?: string;
  email: string;
  nombre: string;
  rol: UserRole;
  role?: UserRole;
  activo: boolean;
  createdAt?: string;
}

export interface Producto {
  id?: string;
  nombre: string;
  descripcion: string;
  precio: number;
  costo?: number;
  categoria: string;
  imagen: string;
  activo?: boolean;
  disponible?: boolean;
  destacado?: boolean;
  // English field aliases matching products collection
  name?: string;
  description?: string;
  price?: number;
  image?: string;
  category?: string;
  available?: boolean;
  stock?: number;
  stockMinimo?: number;
  totalProducido?: number;
  totalVendido?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Categoria {
  id?: string;
  nombre: string;
  descripcion?: string;
  imagen?: string;
  activa?: boolean;
  activo?: boolean;
  orden?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type TipoMovimientoInventario = 'entrada' | 'salida' | 'ajuste' | 'desperdicio';

export interface MovimientoInventario {
  id?: string;
  productoId: string;
  producto: string;
  productoNombre?: string;
  cantidad?: number;
  cantidadAnterior: number;
  cantidadNueva: number;
  diferencia: number;
  tipo: TipoMovimientoInventario;
  motivo: string;
  fecha: string;
  usuario?: string;
  usuarioEmail?: string;
  createdAt?: string;
}

export type MetodoPago = 'Efectivo' | 'Yappy' | 'Tarjeta' | 'Otro';

export interface VentaItem {
  productoId: string;
  nombre: string;
  cantidad: number;
  precio: number;
  subtotal: number;
  categoria?: string;
}

export interface Venta {
  id?: string;
  numeroVenta?: string;
  items?: VentaItem[];
  producto?: string;
  cantidad?: number;
  precioUnitario?: number;
  total: number;
  subtotal?: number;
  metodoPago?: MetodoPago;
  fecha: string;
  hora?: string;
  cliente?: string;
  observacion?: string;
  observaciones?: string;
  anulada?: boolean;
  motivoAnulacion?: string;
  fechaAnulacion?: string;
  usuarioAnulacion?: string;
  usuario?: string;
  permitirStockNegativo?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProduccionRegistro {
  id?: string;
  productoId?: string;
  producto: string;
  cantidad: number;
  fecha: string;
  usuario?: string;
  observacion?: string;
  costo?: number;
  stockAnterior?: number;
  stockNuevo?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Cliente {
  id?: string;
  nombre: string;
  telefono: string;
  direccion?: string;
  cantidadPedidos: number;
  totalGastado: number;
  ultimoPedido?: string;
  fechaUltimoPedido?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type PedidoEstado = 'pendiente' | 'aceptado' | 'preparando' | 'listo' | 'entregado' | 'cancelado';

export type TipoPedido =
  | 'para_recoger'
  | 'delivery'
  | 'consumo_local'
  | 'para_llevar'
  | 'en_mesa'
  | 'a_domicilio';

export interface PedidoProductoItem {
  id?: string;
  nombre: string;
  name?: string;
  cantidad: number;
  quantity?: number;
  precio: number;
  price?: number;
  subtotal: number;
}

export interface Pedido {
  id?: string;
  numeroPedido: string;
  cliente: string;
  telefono: string;
  tipoPedido: TipoPedido;
  tipoEntrega?: string;
  direccion?: string;
  productos: PedidoProductoItem[];
  subtotal: number;
  total: number;
  notas?: string;
  estado: PedidoEstado;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:mm
  // English collection aliases matching 'orders' specification
  customerName?: string;
  customerPhone?: string;
  orderType?: TipoPedido;
  address?: string;
  items?: PedidoProductoItem[];
  notes?: string;
  status?: PedidoEstado;
  ventaContabilizada?: boolean;
  inventarioDescontado?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VentaResumenDia {
  fecha: string;
  total: number;
  cantidad: number;
  entregados: number;
  pendientes: number;
  cancelados: number;
  ticketPromedio: number;
  pedidos: Pedido[];
}

export type GastoCategoria = 'Ingredientes' | 'Servicios' | 'Transporte' | 'Equipos' | 'Otros' | string;

export interface Gasto {
  id?: string;
  descripcion: string;
  categoria: GastoCategoria;
  monto: number;
  fecha: string | any;
}

export interface InventarioItem {
  id?: string;
  producto: string;
  stockActual: number;
  stockMinimo: number;
  unidad: string;
  actualizadoEn?: string | any;
}

export interface DiaHorario {
  activo: boolean;
  apertura: string;
  cierre: string;
}

export interface HorariosSemana {
  lunes: DiaHorario;
  martes: DiaHorario;
  miercoles: DiaHorario;
  jueves: DiaHorario;
  viernes: DiaHorario;
  sabado: DiaHorario;
  domingo: DiaHorario;
}

export interface ConfiguracionNegocio {
  // Información General
  nombre: string;
  eslogan?: string;
  descripcion: string;
  telefono: string;
  direccion: string;
  whatsapp: string; // 50767979141
  moneda: string; // USD
  simboloMoneda?: string;
  costoEnvioPorDefecto?: number;
  montoMinimoPedido?: number;
  // Redes
  instagram: string; // https://www.instagram.com/dulzurasdebelgis/?hl=es-la
  googleMaps: string; // https://maps.app.goo.gl/cpq63XcE3vPFfuRz5
  // Horarios
  horarios: HorariosSemana;
  horario?: string;
  // Servicios
  paraLlevar: boolean;
  aDomicilio: boolean;
  // Imágenes
  logoUrl?: string;
  heroImagen?: string;
  // Textos
  heroTitulo?: string;
  heroSubtitulo?: string;
  presentacionTexto?: string;
  contactoTexto?: string;
  // WhatsApp
  whatsappMensajeInicial?: string;
  actualizadoEn?: string | any;
}

export interface CartItem {
  producto: Producto;
  cantidad: number;
}
