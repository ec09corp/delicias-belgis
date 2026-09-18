import React from 'react';
import { ArrowRight, Sparkles, MessageCircle, Heart, Star, Award, ShoppingBag, Truck } from 'lucide-react';
import { ConfiguracionNegocio } from '../../types';
import { cleanWhatsAppNumber } from '../../utils/formatters';

interface HeroSectionProps {
  config: ConfiguracionNegocio;
  onExploreMenu: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ config, onExploreMenu }) => {
  const waNumber = cleanWhatsAppNumber(config.whatsapp || '50767979141');
  const directWaUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(
    config.whatsappMensajeInicial || '¡Hola Delicias Belgi! Me gustaría conocer los postres y bolis disponibles hoy.'
  )}`;

  const heroImg =
    config.heroImagen ||
    'https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=800&q=85';

  return (
    <section id="inicio" className="relative overflow-hidden py-12 lg:py-20">
      {/* Subtle organic background glow */}
      <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-96 h-96 bg-amber-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-80 h-80 bg-orange-100/50 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Text Content */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100/80 border border-amber-300/60 text-amber-900 text-xs font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>{config.descripcion || 'Heladería, Dulcería y Repostería Artesanal en Colón'}</span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-extrabold text-stone-900 tracking-tight leading-[1.15]">
              {config.heroTitulo || 'El sabor artesanal que alegra tus mejores momentos.'}
            </h1>

            <p className="text-base sm:text-lg text-stone-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              {config.heroSubtitulo ||
                'En Delicias Belgi creamos bolis gourmet, helados cremosos, cheesecakes irresistibles y postres elaborados diariamente con ingredientes de primera calidad en Ciudad de Colón.'}
            </p>

            {/* Service Badges */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-1 text-xs">
              {config.paraLlevar && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 font-semibold">
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-700" />
                  <span>Pedidos Para Llevar</span>
                </span>
              )}
              {config.aDomicilio && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold">
                  <Truck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Entrega a Domicilio en Colón</span>
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                onClick={onExploreMenu}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-amber-900 text-amber-50 font-semibold text-sm hover:bg-amber-800 transition-all shadow-md shadow-amber-900/15 cursor-pointer"
              >
                <span>Explorar Menú</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href={directWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-500 transition-all shadow-md shadow-emerald-900/10 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Pedir por WhatsApp</span>
              </a>
            </div>

            {/* Quality badges */}
            <div className="pt-6 border-t border-stone-200/80 grid grid-cols-3 gap-4 max-w-lg mx-auto lg:mx-0 text-stone-700">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900">100% Artesanal</div>
                  <div className="text-[11px] text-stone-500">Recetas exclusivas</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
                  <Heart className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900">Frutas Frescas</div>
                  <div className="text-[11px] text-stone-500">Pura pulpa natural</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
                  <Star className="w-4 h-4 text-amber-600 fill-amber-500" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900">Atención Directa</div>
                  <div className="text-[11px] text-stone-500">Vía WhatsApp</div>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Showcase Card */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white/80 bg-stone-100">
                <img
                  src={heroImg}
                  alt={`Postres y helados artesanales ${config.nombre || 'Delicias Belgi'}`}
                  className="w-full h-80 sm:h-96 object-cover hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-stone-200/60 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                        Especialidad de la casa
                      </span>
                      <h4 className="font-serif text-base font-bold text-stone-900">
                        Bolis Gourmet & Repostería Belga
                      </h4>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900">
                      Desde $2.25
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
