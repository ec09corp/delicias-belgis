import React, { useState } from 'react';
import {
  LayoutDashboard,
  BadgeDollarSign,
  Package,
  Boxes,
  Factory,
  FolderTree,
  Shield,
  Settings,
  LogOut,
  ExternalLink,
  Menu,
  X,
  IceCream,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import { UserAuth, AdminTab } from '../../types';
import { isFirebaseConfigured } from '../../services/firebase';

interface AdminLayoutProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  user: UserAuth;
  onLogout: () => void;
  onBackToPublic: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentTab,
  onSelectTab,
  user,
  onLogout,
  onBackToPublic,
  children,
}) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const firebaseReady = isFirebaseConfigured();
  const isAdmin = user.role !== 'caja';

  // Navigation Items: Dashboard, Ventas, Productos, Inventario, Producción, Categorías, Usuarios, Configuración
  const allNavItems: { id: AdminTab; label: string; icon: React.FC<{ className?: string }>; adminOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'ventas', label: 'Ventas', icon: BadgeDollarSign },
    { id: 'productos', label: 'Productos', icon: Package },
    { id: 'inventario', label: 'Inventario', icon: Boxes },
    { id: 'produccion', label: 'Producción', icon: Factory },
    { id: 'categorias', label: 'Categorías', icon: FolderTree, adminOnly: true },
    { id: 'usuarios', label: 'Usuarios', icon: Shield, adminOnly: true },
    { id: 'configuracion', label: 'Configuración', icon: Settings, adminOnly: true },
  ];

  const visibleNavItems = allNavItems.filter((item) => !item.adminOnly || isAdmin);

  const handleTabClick = (tab: AdminTab) => {
    onSelectTab(tab);
    setMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f5f3ef] flex flex-col md:flex-row text-stone-800">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-stone-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white">
            <IceCream className="w-4 h-4" />
          </div>
          <span className="font-serif font-bold text-base tracking-tight">
            Delicias Belgi • {isAdmin ? 'Admin' : 'Caja'}
          </span>
        </div>
        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="p-2 rounded-lg bg-stone-800 text-stone-300 cursor-pointer"
          aria-label="Abrir menú"
        >
          {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-stone-900 text-stone-300 flex flex-col justify-between border-r border-stone-800 transition-transform md:translate-x-0 md:static ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="p-6 border-b border-stone-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-amber-50 shadow-md">
                <IceCream className="w-6 h-6" />
              </div>
              <div>
                <span className="font-serif text-lg font-bold text-white block leading-tight">
                  Delicias Belgi
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-amber-500 block">
                  {isAdmin ? 'Panel de Administración' : 'Terminal de Caja'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setMobileNavOpen(false)}
              className="md:hidden text-stone-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1.5">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-950/30'
                      : 'text-stone-400 hover:text-white hover:bg-stone-800/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-stone-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User & System Status Bottom */}
        <div className="p-4 border-t border-stone-800/80 space-y-3">
          {/* Firebase connection status badge */}
          <div className="p-2.5 rounded-xl bg-stone-800/70 border border-stone-700/60 flex items-center gap-2 text-[11px]">
            {firebaseReady ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-emerald-300 font-medium truncate">Firebase Conectado</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-amber-300 font-medium truncate">Modo Local</span>
              </>
            )}
          </div>

          {/* User profile & Role Badge */}
          <div className="px-2 space-y-1">
            <div className="text-[11px] text-stone-300 font-medium truncate">
              {user.email || 'usuario@deliciasbelgi.com'}
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                isAdmin
                  ? 'bg-amber-900/60 text-amber-300 border border-amber-700/50'
                  : 'bg-blue-900/60 text-blue-300 border border-blue-700/50'
              }`}>
                <UserCheck className="w-3 h-3" />
                {isAdmin ? 'Rol: Admin' : 'Rol: Caja'}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-1 pt-1">
            <button
              id="back-to-public-btn"
              onClick={onBackToPublic}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ver Tienda Pública</span>
            </button>
            <button
              id="admin-logout-btn"
              onClick={onLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
