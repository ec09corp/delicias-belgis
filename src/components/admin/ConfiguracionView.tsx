import React, { useState } from 'react';
import {
  Settings,
  Save,
  CheckCircle2,
  Store,
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  Instagram,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { ConfiguracionNegocio, HorariosSemana, DiaHorario } from '../../types';
import { configuracionService } from '../../services/configuracionService';

interface ConfiguracionViewProps {
  config: ConfiguracionNegocio;
  onConfigUpdated: (newConfig: ConfiguracionNegocio) => void;
}

const DIAS_KEYS: { key: keyof HorariosSemana; label: string }[] = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
];

export const ConfiguracionView: React.FC<ConfiguracionViewProps> = ({
  config,
  onConfigUpdated,
}) => {
  const [formData, setFormData] = useState<ConfiguracionNegocio>({ ...config });
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleTextChange = (field: keyof ConfiguracionNegocio, val: any) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleHorarioChange = (
    diaKey: keyof HorariosSemana,
    field: keyof DiaHorario,
    value: any
  ) => {
    setFormData((prev) => {
      const currentHorarios = prev.horarios || {
        lunes: { activo: true, apertura: '09:00', cierre: '19:30' },
        martes: { activo: true, apertura: '09:00', cierre: '19:30' },
        miercoles: { activo: true, apertura: '09:00', cierre: '19:30' },
        jueves: { activo: true, apertura: '09:00', cierre: '19:30' },
        viernes: { activo: true, apertura: '09:00', cierre: '19:30' },
        sabado: { activo: true, apertura: '09:00', cierre: '19:30' },
        domingo: { activo: false, apertura: '09:00', cierre: '19:30' },
      };
      const diaObj = currentHorarios[diaKey] || { activo: true, apertura: '09:00', cierre: '19:30' };

      return {
        ...prev,
        horarios: {
          ...currentHorarios,
          [diaKey]: {
            ...diaObj,
            [field]: value,
          },
        },
      };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await configuracionService.updateConfiguracion(formData);
      onConfigUpdated(formData);
      setSuccessMsg('¡Configuración guardada exitosamente y sincronizada!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar configuración.');
    } finally {
      setIsSaving(false);
    }
  };

  const horarios = formData.horarios || {
    lunes: { activo: true, apertura: '09:00', cierre: '19:30' },
    martes: { activo: true, apertura: '09:00', cierre: '19:30' },
    miercoles: { activo: true, apertura: '09:00', cierre: '19:30' },
    jueves: { activo: true, apertura: '09:00', cierre: '19:30' },
    viernes: { activo: true, apertura: '09:00', cierre: '19:30' },
    sabado: { activo: true, apertura: '09:00', cierre: '19:30' },
    domingo: { activo: false, apertura: '09:00', cierre: '19:30' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-amber-700" />
            <span>Configuración del Negocio</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Personaliza el nombre, contacto de WhatsApp para pedidos, horarios comerciales y canales de atención.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>Guardar Cambios</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* General Business Info */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
          <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2 pb-2 border-b border-stone-100">
            <Store className="w-4 h-4 text-amber-600" />
            <span>Identidad & Presentación</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Nombre del Negocio *
              </label>
              <input
                type="text"
                required
                value={formData.nombre || ''}
                onChange={(e) => handleTextChange('nombre', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-800"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Moneda Oficial
              </label>
              <input
                type="text"
                value={formData.moneda || 'USD'}
                onChange={(e) => handleTextChange('moneda', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-800 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">
              Eslogan / Descripción Breve
            </label>
            <input
              type="text"
              value={formData.descripcion || ''}
              onChange={(e) => handleTextChange('descripcion', e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-800"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">
              Texto de Historia / Presentación ("Sobre Nosotros")
            </label>
            <textarea
              rows={3}
              value={formData.presentacionTexto || ''}
              onChange={(e) => handleTextChange('presentacionTexto', e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-800"
            />
          </div>
        </div>

        {/* Contacto & WhatsApp */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
          <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2 pb-2 border-b border-stone-100">
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>Canales de Pedidos & WhatsApp</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Número de WhatsApp para Pedidos *
              </label>
              <input
                type="text"
                required
                placeholder="6797-9141 o 50767979141"
                value={formData.whatsapp || ''}
                onChange={(e) => handleTextChange('whatsapp', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-800 font-mono"
              />
              <span className="text-[11px] text-stone-400 mt-0.5 block">
                Los clientes enviarán el pedido directamente a este número.
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Teléfono Fijo / Celular Local
              </label>
              <input
                type="text"
                value={formData.telefono || ''}
                onChange={(e) => handleTextChange('telefono', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-800 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Dirección Física
              </label>
              <input
                type="text"
                value={formData.direccion || ''}
                onChange={(e) => handleTextChange('direccion', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-800"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Enlace a Google Maps
              </label>
              <input
                type="url"
                value={formData.googleMaps || ''}
                onChange={(e) => handleTextChange('googleMaps', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-800"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">
              Perfil de Instagram
            </label>
            <input
              type="url"
              placeholder="https://instagram.com/dulzurasdebelgis"
              value={formData.instagram || ''}
              onChange={(e) => handleTextChange('instagram', e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-800"
            />
          </div>
        </div>

        {/* Horarios Comerciales */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
          <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2 pb-2 border-b border-stone-100">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Horarios de Atención Semanal</span>
          </h3>

          <div className="space-y-2.5">
            {DIAS_KEYS.map(({ key, label }) => {
              const dia = horarios[key] || { activo: true, apertura: '09:00', cierre: '19:30' };

              return (
                <div
                  key={key}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl border border-stone-100 hover:bg-stone-50 transition-colors gap-2"
                >
                  <div className="flex items-center gap-3 w-32">
                    <input
                      type="checkbox"
                      id={`horario-${key}`}
                      checked={dia.activo}
                      onChange={(e) => handleHorarioChange(key, 'activo', e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-stone-300"
                    />
                    <label htmlFor={`horario-${key}`} className="text-xs font-bold text-stone-800 cursor-pointer">
                      {label}
                    </label>
                  </div>

                  {dia.activo ? (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-stone-400">Apertura:</span>
                      <input
                        type="time"
                        value={dia.apertura}
                        onChange={(e) => handleHorarioChange(key, 'apertura', e.target.value)}
                        className="px-2 py-1 border border-stone-200 rounded-lg text-xs font-mono font-semibold"
                      />
                      <span className="text-stone-400">Cierre:</span>
                      <input
                        type="time"
                        value={dia.cierre}
                        onChange={(e) => handleHorarioChange(key, 'cierre', e.target.value)}
                        className="px-2 py-1 border border-stone-200 rounded-lg text-xs font-mono font-semibold"
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-stone-400 italic">Cerrado todo el día</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Guardar Toda la Configuración</span>
          </button>
        </div>

      </form>
    </div>
  );
};
