import React from 'react';
import { MapPin, Clock, Phone, MessageCircle, Navigation, Instagram, ExternalLink } from 'lucide-react';
import { ConfiguracionNegocio, HorariosSemana } from '../../types';
import { cleanWhatsAppNumber } from '../../utils/formatters';

interface LocationHoursSectionProps {
  config: ConfiguracionNegocio;
}

const DIAS_ORDER: { key: keyof HorariosSemana; label: string }[] = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
];

const formatHora12 = (time24: string) => {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'p.m.' : 'a.m.';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
};

export const LocationHoursSection: React.FC<LocationHoursSectionProps> = ({ config }) => {
  const waNumber = cleanWhatsAppNumber(config.whatsapp || '50767979141');
  const directWaUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(
    '¡Hola Delicias Belgi! Me gustaría consultar cómo llegar al local en PH Bahía Limón o pedir a domicilio.'
  )}`;

  const horarios = config.horarios || {
    lunes: { activo: true, apertura: '09:00', cierre: '19:30' },
    martes: { activo: true, apertura: '09:00', cierre: '19:30' },
    miercoles: { activo: true, apertura: '09:00', cierre: '19:30' },
    jueves: { activo: true, apertura: '09:00', cierre: '19:30' },
    viernes: { activo: true, apertura: '09:00', cierre: '19:30' },
    sabado: { activo: true, apertura: '09:00', cierre: '19:30' },
    domingo: { activo: false, apertura: '09:00', cierre: '19:30' },
  };

  return (
    <section id="ubicacion" className="py-16 bg-white border-t border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-800 block mb-1">
            Visítanos o Solicita a Domicilio
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">
            Ubicación, Horarios y Contacto
          </h2>
          <p className="text-sm text-stone-500 mt-2">
            {config.contactoTexto ||
              'Estamos listos para endulzar tu día. Ven a conocernos en Ciudad de Colón o pide desde la comodidad de tu casa.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Ubicación */}
          <div className="p-6 rounded-2xl bg-[#faf7f2] border border-amber-900/10 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-stone-900 mb-2">
                Nuestra Dirección
              </h3>
              <p className="text-sm text-stone-700 font-medium leading-relaxed">
                {config.direccion || 'Ciudad de Colón, Calle 2 ave. Bolívar, PH Bahía Limón'}
              </p>
              <p className="text-xs text-stone-500 mt-2">
                Zona comercial céntrica en Colón, accesible con estacionamiento cercano para retiros rápidos.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-amber-900/10 space-y-2">
              {config.googleMaps && (
                <a
                  href={config.googleMaps}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-bold text-amber-900 hover:text-amber-700"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Abrir ubicación en Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {/* Horarios Dinámicos */}
          <div className="p-6 rounded-2xl bg-[#faf7f2] border border-amber-900/10 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-stone-900 mb-2">
                Horarios de Atención
              </h3>
              
              <div className="space-y-1.5 text-xs text-stone-600 mt-3">
                {DIAS_ORDER.map(({ key, label }) => {
                  const dia = horarios[key];
                  const isOpen = dia && dia.activo;
                  return (
                    <div key={key} className="flex justify-between py-1 border-b border-stone-200/50 last:border-none">
                      <span className="font-medium text-stone-800">{label}:</span>
                      {isOpen ? (
                        <span className="font-semibold text-stone-700">
                          {formatHora12(dia.apertura)} - {formatHora12(dia.cierre)}
                        </span>
                      ) : (
                        <span className="text-stone-400 italic">Cerrado</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-amber-900/10 flex items-center gap-2 text-xs text-emerald-700 font-medium">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Abierto de Lunes a Sábado para pedidos y despacho</span>
            </div>
          </div>

          {/* Contacto Directo */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-900 to-stone-900 text-white flex flex-col justify-between shadow-lg">
            <div>
              <div className="w-12 h-12 rounded-xl bg-white/10 text-amber-300 flex items-center justify-center mb-4 backdrop-blur-sm">
                <Phone className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-white mb-2">
                Contacto Directo
              </h3>
              <p className="text-xs text-stone-300 leading-relaxed mb-4">
                {config.descripcion || 'Heladería, dulcería y repostería artesanal en Colón. Contáctanos para pedidos especiales.'}
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-stone-400">Teléfono:</span>
                  <a href={`tel:${config.telefono || '6797-9141'}`} className="font-semibold text-white hover:underline">
                    {config.telefono || '6797-9141'}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-stone-400">WhatsApp:</span>
                  <span className="font-semibold text-emerald-400">+{waNumber}</span>
                </div>
                {config.instagram && (
                  <div className="flex items-center gap-2 pt-1">
                    <Instagram className="w-3.5 h-3.5 text-rose-400" />
                    <a
                      href={config.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-stone-300 hover:text-white underline text-[11px]"
                    >
                      @dulzurasdebelgis
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 space-y-2">
              <a
                href={directWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Escribir por WhatsApp</span>
              </a>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
