import React, { useState, useEffect } from 'react';
import {
  Producto,
  Categoria,
  Venta,
  MovimientoInventario,
  ProduccionRegistro,
  UsuarioDoc,
  ConfiguracionNegocio,
  CartItem,
  UserAuth,
  AdminTab,
} from './types';
import { INITIAL_CONFIGURACION } from './services/initialData';

// Services
import { productosService } from './services/productosService';
import { categoriasService } from './services/categoriasService';
import { ventasService } from './services/ventasService';
import { inventarioService } from './services/inventarioService';
import { produccionService } from './services/produccionService';
import { usuariosService } from './services/usuariosService';
import { configuracionService } from './services/configuracionService';
import { authService } from './services/authService';

// Public Components
import { PublicPage } from './components/public/PublicPage';

// Admin Components
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminLayout } from './components/admin/AdminLayout';
import { DashboardView } from './components/admin/DashboardView';
import { VentasView } from './components/admin/VentasView';
import { ProductosView } from './components/admin/ProductosView';
import { InventarioView } from './components/admin/InventarioView';
import { ProduccionView } from './components/admin/ProduccionView';
import { CategoriasView } from './components/admin/CategoriasView';
import { UsuariosView } from './components/admin/UsuariosView';
import { ConfiguracionView } from './components/admin/ConfiguracionView';

const CART_STORAGE_KEY = 'delicias_belgi_cart';

export default function App() {
  // App view modes: 'public' | 'login' | 'admin'
  const [viewMode, setViewMode] = useState<'public' | 'login' | 'admin'>(() => {
    if (window.location.hash === '#admin') return 'login';
    return 'public';
  });

  const [currentAdminTab, setCurrentAdminTab] = useState<AdminTab>('dashboard');

  // Real-time collections state
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [producciones, setProducciones] = useState<ProduccionRegistro[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioDoc[]>([]);
  const [config, setConfig] = useState<ConfiguracionNegocio>(INITIAL_CONFIGURACION);

  // User Auth state
  const [currentUser, setCurrentUser] = useState<UserAuth | null>(null);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error reading cart:', e);
    }
    return [];
  });

  // Save cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.warn('Error saving cart:', e);
    }
  }, [cart]);

  // Handle hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#admin') {
        if (currentUser) {
          setViewMode('admin');
        } else {
          setViewMode('login');
        }
      } else if (hash === '#menu' || hash === '#inicio' || hash === '') {
        setViewMode('public');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentUser]);

  // Subscribe to Auth state
  useEffect(() => {
    const unsub = authService.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user && viewMode === 'login') {
        setViewMode('admin');
      }
    });
    return () => unsub();
  }, [viewMode]);

  // Real-time Subscriptions
  useEffect(() => {
    const unsubProductos = productosService.subscribeToProductos((data) => {
      setProductos(data);
      setLoadingProductos(false);
    });

    const unsubCategorias = categoriasService.subscribeToCategorias((data) => {
      setCategorias(data);
    });

    const unsubVentas = ventasService.subscribeToVentas((data) => {
      setVentas(data);
    });

    const unsubMovimientos = inventarioService.subscribeToMovimientos((data) => {
      setMovimientos(data);
    });

    const unsubProducciones = produccionService.subscribeToProducciones((data) => {
      setProducciones(data);
    });

    const unsubUsuarios = usuariosService.subscribeToUsuarios((data) => {
      setUsuarios(data);
    });

    const unsubConfig = configuracionService.subscribeToConfiguracion((data) => {
      if (data) setConfig(data);
    });

    return () => {
      unsubProductos();
      unsubCategorias();
      unsubVentas();
      unsubMovimientos();
      unsubProducciones();
      unsubUsuarios();
      unsubConfig();
    };
  }, []);

  // Cart operations
  const handleAddToCart = (producto: Producto) => {
    if (!producto.id) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.producto.id === producto.id);
      if (existing) {
        return prev.map((item) =>
          item.producto.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      return [...prev, { producto, cantidad: 1 }];
    });
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.producto.id === productId ? { ...item, cantidad: quantity } : item
      )
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.producto.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Auth actions
  const handleLoginSuccess = (user: UserAuth) => {
    setCurrentUser(user);
    setViewMode('admin');
    window.location.hash = '#admin';
  };

  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
    setViewMode('public');
    window.location.hash = '';
  };

  const handleGoToAdmin = () => {
    if (currentUser) {
      setViewMode('admin');
    } else {
      setViewMode('login');
    }
    window.location.hash = '#admin';
  };

  const handleBackToPublic = () => {
    setViewMode('public');
    window.location.hash = '';
  };

  // Render View based on mode
  if (viewMode === 'login') {
    return (
      <AdminLogin
        onLoginSuccess={handleLoginSuccess}
        onBackToPublic={handleBackToPublic}
      />
    );
  }

  if (viewMode === 'admin' && currentUser) {
    return (
      <AdminLayout
        currentTab={currentAdminTab}
        onSelectTab={setCurrentAdminTab}
        user={currentUser}
        onLogout={handleLogout}
        onBackToPublic={handleBackToPublic}
      >
        {currentAdminTab === 'dashboard' && (
          <DashboardView
            ventas={ventas}
            productos={productos}
            producciones={producciones}
            onNavigateTab={setCurrentAdminTab}
          />
        )}

        {currentAdminTab === 'ventas' && (
          <VentasView
            ventas={ventas}
            productos={productos}
            currentUser={currentUser}
          />
        )}

        {currentAdminTab === 'productos' && (
          <ProductosView
            productos={productos}
            categorias={categorias}
            currentUser={currentUser}
            onNavigateTab={setCurrentAdminTab}
          />
        )}

        {currentAdminTab === 'inventario' && (
          <InventarioView
            productos={productos}
            movimientos={movimientos}
            currentUser={currentUser}
          />
        )}

        {currentAdminTab === 'produccion' && (
          <ProduccionView
            producciones={producciones}
            productos={productos}
            currentUser={currentUser}
          />
        )}

        {currentAdminTab === 'categorias' && (
          <CategoriasView
            categorias={categorias}
            productos={productos}
          />
        )}

        {currentAdminTab === 'usuarios' && (
          <UsuariosView
            usuarios={usuarios}
            currentUser={currentUser}
          />
        )}

        {currentAdminTab === 'configuracion' && (
          <ConfiguracionView
            config={config}
            onConfigUpdated={(newCfg) => setConfig(newCfg)}
          />
        )}
      </AdminLayout>
    );
  }

  // Default: Public Storefront
  return (
    <PublicPage
      productos={productos}
      loadingProductos={loadingProductos}
      config={config}
      cart={cart}
      onAddToCart={handleAddToCart}
      onUpdateCartQuantity={handleUpdateCartQuantity}
      onRemoveFromCart={handleRemoveFromCart}
      onClearCart={handleClearCart}
      onGoToAdmin={handleGoToAdmin}
    />
  );
}
