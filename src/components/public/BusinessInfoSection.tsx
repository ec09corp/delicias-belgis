import React from 'react';
import { Sparkles, ChefHat, CheckCircle2 } from 'lucide-react';
import { ConfiguracionNegocio } from '../../types';

interface BusinessInfoSectionProps {
  config: ConfiguracionNegocio;
}

export const BusinessInfoSection: React.FC<BusinessInfoSectionProps> = ({ config }) => {
  return (
    <section id="nosotros" className="py-16 bg-[#faf7f2] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Visual Showcase */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="rounded-3xl overflow-hidden shadow-md">
                <img
                  src="https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=500&q=80"
                  alt="Cheesecake artesanal Delicias Belgi"
                  className="w-full h-48 sm:h-60 object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="rounded-3xl overflow-hidden shadow-md">
                <img
                  src="https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=500&q=80"
                  alt="Alfajores y dulces finos"
                  className="w-full h-40 sm:h-52 object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>

            <div className="space-y-4 pt-6">
              <div className="rounded-3xl overflow-hidden shadow-md">
                <img
                  src="https://images.unsplash.com/photo-1505394033641-40c6ad1178d7?auto=format&fit=crop&w=500&q=80"
                  alt="Bolis y helados frutales"
                  className="w-full h-40 sm:h-52 object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="rounded-3xl overflow-hidden shadow-md">
                <img
                  src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=500&q=80"
                  alt="Torta de chocolate belga"
                  className="w-full h-48 sm:h-60 object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>
          </div>

          {/* Story & Philosophy */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Nuestra Historia & Pasión</span>
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 leading-tight">
              Tradición artesanal, recetas auténticas y amor por los detalles.
            </h2>

            <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
              {config.presentacionTexto || (
                <>
                  En <strong className="font-semibold text-amber-950">{config.nombre || 'Delicias Belgi'}</strong> nos apasiona crear momentos dulces inolvidables. Nacimos con la visión de rescatar el sabor tradicional de los bolis y helados caseros, elevándolos con técnicas reposteras refinadas y chocolate puro.
                </>
              )}
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-stone-700">
                  <strong className="font-semibold">Elaboración Diaria:</strong> Productos horneados y preparados en pequeños lotes para garantizar máxima frescura.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-stone-700">
                  <strong className="font-semibold">Ingredientes Seleccionados:</strong> Cacao fino, lácteos de primera calidad y pulpas de frutas naturales sin saborizantes artificiales.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-stone-700">
                  <strong className="font-semibold">Servicio Cálido y Personalizado:</strong> Recibimos tus pedidos directamente en WhatsApp para coordinar tu entrega o retiro con total comodidad.
                </p>
              </div>
            </div>

            <div className="pt-4 flex items-center gap-4 border-t border-stone-200">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-900">
                <ChefHat className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-stone-900 text-sm">
                  Maestría Repostera & Heladera
                </h4>
                <p className="text-xs text-stone-500">
                  Cada receta ha sido probada y perfeccionada para brindarte una textura y sabor excepcionales.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
