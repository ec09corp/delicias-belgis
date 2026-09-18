import React from 'react';
import { ShoppingBag, Lock, IceCream, MessageCircle, Menu, X } from 'lucide-react';
import { ConfiguracionNegocio } from '../../types';
import { cleanWhatsAppNumber } from '../../utils/formatters';

interface NavbarProps {
  config: ConfiguracionNegocio;
  cartCount: number;
  onOpenCart: () => void;
  onGoToAdmin: () => void;
  onNavigate: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  config,
  cartCount,
  onOpenCart,
  onGoToAdmin,
  onNavigate,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleNavClick = (sectionId: string) => {
    onNavigate(sectionId);
    setMobileMenuOpen(false);
  };

  const waNumber = cleanWhatsAppNumber(config.whatsapp || '50767979141');
  const quickWaUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent('¡Hola Delicias Belgi! Quisiera hacer una consulta sobre sus productos.')}`;

  return (
    <header className="sticky top-0 z-40 bg-[#faf7f2]/95 backdrop-blur-md border-b border-amber-900/10 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <div 
            onClick={() => handleNavClick('inicio')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt={config.nombre || 'Delicias Belgi'}
                className="w-11 h-11 rounded-2xl object-cover shadow-md shadow-amber-900/20 group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-700 to-amber-900 flex items-center justify-center text-amber-50 shadow-md shadow-amber-900/20 group-hover:scale-105 transition-transform">
                <IceCream className="w-6 h-6 text-amber-100" />
              </div>
            )}
            <div>
              <span className="font-serif text-2xl font-bold tracking-tight text-amber-950 block leading-tight">
                {config.nombre || 'Delicias Belgi'}
              </span>
              <span className="text-xs font-semibold uppercase tracking-widest text-amber-700 block">
                Heladería & Repostería
              </span>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-stone-700">
            <button 
              onClick={() => handleNavClick('inicio')} 
              className="hover:text-amber-800 transition-colors py-1 cursor-pointer"
            >
              Inicio
            </button>
            <button 
              onClick={() => handleNavClick('menu')} 
              className="hover:text-amber-800 transition-colors py-1 cursor-pointer"
            >
              Menú & Categorías
            </button>
            <button 
              onClick={() => handleNavClick('nosotros')} 
              className="hover:text-amber-800 transition-colors py-1 cursor-pointer"
            >
              Sobre Nosotros
            </button>
            <button 
              onClick={() => handleNavClick('ubicacion')} 
              className="hover:text-amber-800 transition-colors py-1 cursor-pointer"
            >
              Ubicación y Horarios
            </button>
          </nav>

          {/* Actions: WhatsApp, Cart, Admin */}
          <div className="flex items-center gap-3">
            {/* Quick WhatsApp chat button */}
            <a
              href={quickWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-all cursor-pointer"
              title="Chatear por WhatsApp"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp</span>
            </a>

            {/* Cart Button */}
            <button
              id="cart-trigger-btn"
              onClick={onOpenCart}
              className="relative p-2.5 rounded-xl bg-amber-900 text-amber-50 hover:bg-amber-800 transition-all flex items-center gap-2.5 shadow-sm hover:shadow-md cursor-pointer"
              aria-label="Abrir carrito de compras"
            >
              <ShoppingBag className="w-5 h-5 text-amber-200" />
              <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">
                Carrito
              </span>
              {cartCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-extrabold bg-amber-400 text-amber-950 rounded-full animate-pulse">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Admin portal shortcut */}
            <button
              onClick={onGoToAdmin}
              className="p-2.5 rounded-xl text-stone-500 hover:text-amber-900 hover:bg-amber-100/60 transition-colors cursor-pointer"
              title="Acceso al Panel de Administración"
              aria-label="Acceso al Panel de Administración"
            >
              <Lock className="w-4 h-4" />
            </button>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2.5 rounded-xl text-stone-700 hover:bg-amber-100/60 transition-colors cursor-pointer"
              aria-label="Alternar menú móvil"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-amber-900/10 bg-[#faf7f2] space-y-2">
            <button
              onClick={() => handleNavClick('inicio')}
              className="w-full text-left px-4 py-2.5 rounded-lg text-stone-800 font-medium hover:bg-amber-100/60"
            >
              Inicio
            </button>
            <button
              onClick={() => handleNavClick('menu')}
              className="w-full text-left px-4 py-2.5 rounded-lg text-stone-800 font-medium hover:bg-amber-100/60"
            >
              Menú y Categorías
            </button>
            <button
              onClick={() => handleNavClick('nosotros')}
              className="w-full text-left px-4 py-2.5 rounded-lg text-stone-800 font-medium hover:bg-amber-100/60"
            >
              Sobre Nosotros
            </button>
            <button
              onClick={() => handleNavClick('ubicacion')}
              className="w-full text-left px-4 py-2.5 rounded-lg text-stone-800 font-medium hover:bg-amber-100/60"
            >
              Ubicación y Horarios
            </button>
            <div className="pt-2 flex flex-col gap-2">
              <a
                href={quickWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white"
              >
                <MessageCircle className="w-4 h-4" />
                Contactar por WhatsApp
              </a>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onGoToAdmin();
                }}
                className="flex items-center justify-center gap-2 py-2 text-xs font-semibold text-stone-600 hover:text-amber-900"
              >
                <Lock className="w-3.5 h-3.5" />
                Acceso al Panel Administrativo
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
