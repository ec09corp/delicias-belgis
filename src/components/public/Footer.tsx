import React from 'react';
import { IceCream, Lock, MessageCircle, Instagram, MapPin } from 'lucide-react';
import { ConfiguracionNegocio } from '../../types';
import { cleanWhatsAppNumber } from '../../utils/formatters';

interface FooterProps {
  config: ConfiguracionNegocio;
  onGoToAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ config, onGoToAdmin }) => {
  const currentYear = new Date().getFullYear();
  const waNumber = cleanWhatsAppNumber(config.whatsapp || '50767979141');

  return (
    <footer className="bg-stone-900 text-stone-300 py-12 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-stone-800">
          
          {/* Brand */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white">
                <IceCream className="w-5 h-5" />
              </div>
              <span className="font-serif text-2xl font-bold text-white tracking-tight">
                {config.nombre || 'Delicias Belgi'}
              </span>
            </div>
            <p className="text-xs text-stone-400 max-w-sm leading-relaxed">
              {config.descripcion ||
                'Heladería, dulcería y repostería artesanal en Ciudad de Colón. Bolis gourmet, postres finos y repostería horneada diariamente con pasión.'}
            </p>
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>{config.direccion || 'Ciudad de Colón, Calle 2 ave. Bolívar, PH Bahía Limón'}</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Navegación
            </h4>
            <ul className="space-y-1.5 text-xs text-stone-400">
              <li><a href="#inicio" className="hover:text-amber-400 transition-colors">Inicio</a></li>
              <li><a href="#menu" className="hover:text-amber-400 transition-colors">Menú de Productos</a></li>
              <li><a href="#nosotros" className="hover:text-amber-400 transition-colors">Sobre Nosotros</a></li>
              <li><a href="#ubicacion" className="hover:text-amber-400 transition-colors">Horarios y Ubicación</a></li>
            </ul>
          </div>

          {/* Business Contact & Social */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Pedidos & WhatsApp
            </h4>
            <p className="text-xs text-stone-400">
              WhatsApp Oficial: <br />
              <span className="font-semibold text-emerald-400">+{waNumber}</span>
            </p>
            <div className="pt-1 flex flex-col gap-2">
              <a
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Chatear por WhatsApp</span>
              </a>
              {config.instagram && (
                <a
                  href={config.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-semibold"
                >
                  <Instagram className="w-3.5 h-3.5" />
                  <span>Instagram @dulzurasdebelgis</span>
                </a>
              )}
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div className="flex items-center gap-1">
            <span>© {currentYear} {config.nombre || 'Delicias Belgi'}. Todos los derechos reservados.</span>
          </div>

          {/* Admin entrance link */}
          <button
            onClick={onGoToAdmin}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Acceso Administración</span>
          </button>
        </div>
      </div>
    </footer>
  );
};
