import React, { useState } from 'react';
import {
  CheckCircle2,
  Gamepad2,
  Gift,
  LayoutGrid,
  Map,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  Store,
  Tag,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { translations } from '../../i18n/translations';
import { backendService } from '../../services/backend';
import { Configuracion, Idioma, Stand } from '../../types';
import { InteractiveMap } from './InteractiveMap';

interface Props {
  config: Configuracion;
  stands: Stand[];
  lang: Idioma;
  loading: boolean;
  onRefresh: () => void;
}

type MainTabOption = 'solicitar' | 'plano' | 'lista';

export const PublicView: React.FC<Props> = ({
  config,
  stands,
  lang,
  loading,
  onRefresh,
}) => {
  const t = translations[lang];

  // Active public view option
  const [activeOption, setActiveOption] = useState<MainTabOption>('plano');

  // Filters & State (default to 'Comida' for clean 3-category highlighting)
  const [selectedCategory, setSelectedCategory] = useState<string>('Comida');
  const [searchQuery, setSearchQuery] = useState('');
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedStandToRequest, setSelectedStandToRequest] = useState<Stand | null>(null);

  // Form State
  const [formCategory, setFormCategory] = useState<string>('Comida');
  const [formStandNumero, setFormStandNumero] = useState<string>('');
  const [formNombre, setFormNombre] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<{
    stand: string;
    categoria: string;
    nombre: string;
    whatsappUrl: string;
  } | null>(null);

  // Available categories
  const categories = [
    { id: 'all', label: t.categoryAll, icon: LayoutGrid },
    { id: 'Comida', label: t.categoryComida, icon: UtensilsCrossed },
    { id: 'Artesanal', label: t.categoryArtesanal, icon: Gift },
    { id: 'Games', label: t.categoryGames, icon: Gamepad2 },
  ];

  // Filter stands
  const filteredStands = stands.filter((s) => {
    const sCat = (s.Categoria || s.categoria || '').toLowerCase();
    const matchesCat =
      selectedCategory === 'all' || sCat === selectedCategory.toLowerCase();
    const sNum = String(s.Numero !== undefined ? s.Numero : s.numero || '');
    const sDesc = String(s.Descripcion || s.descripcion || '').toLowerCase();
    const matchesSearch =
      searchQuery === '' ||
      sNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sDesc.includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const availableStandsForCategory = stands.filter((s) => {
    const sCat = (s.Categoria || s.categoria || '').toLowerCase();
    const sEst = (s.Estado || s.estado || '').toLowerCase();
    return sCat === formCategory.toLowerCase() && sEst === 'disponible';
  });

  const handleOpenRequest = (stand?: Stand) => {
    setSubmitError(null);
    setSubmittedData(null);
    if (stand) {
      setSelectedStandToRequest(stand);
      setFormCategory(stand.Categoria || stand.categoria || 'Comida');
      setFormStandNumero(String(stand.Numero !== undefined ? stand.Numero : stand.numero));
    } else {
      setSelectedStandToRequest(null);
      setFormCategory(selectedCategory !== 'all' ? selectedCategory : 'Comida');
      setFormStandNumero('');
    }
    setRequestModalOpen(true);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStandNumero || !formNombre || !formTelefono) {
      setSubmitError(
        lang === 'de'
          ? 'Bitte füllen Sie alle erforderlichen Felder aus.'
          : 'Por favor completa todos los campos requeridos.'
      );
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const standId = selectedStandToRequest?.StandID || selectedStandToRequest?.id;
      const res = await backendService.submitSolicitud({
        standId: standId ? String(standId).trim() : undefined,
        stand: formStandNumero,
        categoria: formCategory,
        nombre: formNombre.trim(),
        telefono: formTelefono.trim(),
        idioma: lang,
      });

      if (!res.ok) {
        throw new Error(res.error || 'No se pudo registrar la solicitud');
      }

      // Generate WhatsApp link or use the one returned by Google Apps Script
      const template =
        lang === 'de' ? config.MENSAJE_WHATSAPP_DE : config.MENSAJE_WHATSAPP_ES;
      const message = (template || 'Hola, soy {NOMBRE}. Solicité el Stand {STAND} de la categoría {CATEGORIA} para el Weihnachtsmarkt.')
        .replace('{NOMBRE}', formNombre.trim())
        .replace('{STAND}', formStandNumero)
        .replace('{CATEGORIA}', formCategory);

      const cleanPhone = (config.WHATSAPP_ADMIN || '75593587').replace(/\D/g, '');
      const defaultWhatsapp = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        message
      )}`;
      const whatsappUrl = res.whatsapp_url || res.data?.whatsapp_url || defaultWhatsapp;

      setSubmittedData({
        stand: formStandNumero,
        categoria: formCategory,
        nombre: formNombre.trim(),
        whatsappUrl,
      });
    } catch (err: any) {
      setSubmitError(err.message || 'Error al enviar solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-20">
      {/* Header Section */}
      <section className="bg-white border-b border-gray-200 pt-8 pb-8 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-red-700 tracking-tight mb-6">
            La Magia del Weihnachtsmarkt
          </h1>

          {/* Three Main Options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-3xl mx-auto">
            {/* 1. Solicitar Stand */}
            <button
              onClick={() => handleOpenRequest()}
              className="flex items-center justify-center gap-3 p-4 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold text-sm shadow-sm transition active:scale-98"
            >
              <Store className="w-5 h-5 shrink-0" />
              <span>{t.requestStand}</span>
            </button>

            {/* 2. Plano de Stands */}
            <button
              onClick={() => setActiveOption('plano')}
              className={`flex items-center justify-center gap-3 p-4 rounded-xl font-bold text-sm transition border active:scale-98 shadow-xs ${
                activeOption === 'plano'
                  ? 'bg-red-50 text-red-700 border-red-300'
                  : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Map className="w-5 h-5 shrink-0 text-red-700" />
              <span>{t.standsPlan}</span>
            </button>

            {/* 3. Lista de Stands */}
            <button
              onClick={() => setActiveOption('lista')}
              className={`flex items-center justify-center gap-3 p-4 rounded-xl font-bold text-sm transition border active:scale-98 shadow-xs ${
                activeOption === 'lista'
                  ? 'bg-red-50 text-red-700 border-red-300'
                  : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <LayoutGrid className="w-5 h-5 shrink-0 text-red-700" />
              <span>{t.standsList}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Area: Plano or Lista */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* OPTION A: PLANO INTERACTIVO DE 34 STANDS */}
        {activeOption === 'plano' && (
          <div className="space-y-4">
            {loading && stands.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-gray-50 border border-gray-200">
                <RefreshCw className="w-8 h-8 text-red-700 animate-spin mx-auto mb-3" />
                <p className="text-gray-700 text-sm font-semibold">{t.loading}</p>
                <p className="text-gray-500 text-xs mt-1">{t.loadingDetails}</p>
              </div>
            ) : (
              <InteractiveMap
                stands={stands}
                config={config}
                lang={lang}
                selectedCategory={selectedCategory === 'all' ? 'Comida' : selectedCategory}
                onSelectCategory={(cat) => setSelectedCategory(cat)}
                onRequestStand={(stand) => handleOpenRequest(stand)}
              />
            )}
          </div>
        )}

        {/* OPTION B: LISTA DE STANDS */}
        {activeOption === 'lista' && (
          <div className="space-y-6">
            {/* Search and Refresh Bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={t.search}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-gray-300 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                />
              </div>

              <button
                onClick={onRefresh}
                disabled={loading}
                className="p-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition shrink-0"
                title={t.refreshData}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-red-700' : ''}`} />
              </button>
            </div>

            {/* Categories Filter Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 border shadow-xs min-h-[42px] active:scale-98 ${
                      isActive
                        ? 'bg-red-700 text-white border-red-700 font-bold'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-center">{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* List representation */}
            {filteredStands.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredStands.map((stand) => {
                const isAvailable = stand.estado === 'disponible';
                return (
                  <div
                    key={stand.id || stand.numero}
                    className="p-5 rounded-xl bg-white border border-gray-200 shadow-xs flex flex-col justify-between hover:border-gray-300 transition"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                              isAvailable
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : 'bg-gray-100 text-gray-600 border border-gray-300'
                            }`}
                          >
                            #{stand.numero}
                          </div>
                          <span className="text-xs font-bold text-gray-800">
                            {stand.categoria}
                          </span>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isAvailable
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'bg-gray-100 text-gray-600 border border-gray-300'
                          }`}
                        >
                          {isAvailable ? t.available : t.occupied}
                        </span>
                      </div>

                      {stand.descripcion && (
                        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                          {stand.descripcion}
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 text-xs text-gray-900 mb-4 font-mono font-bold">
                        <Tag className="w-3.5 h-3.5 text-red-700" />
                        <span>
                          {stand.precio ? `${stand.precio} ${config.MONEDA || '$us'}` : 'Consultar'}
                        </span>
                      </div>
                    </div>

                    <div>
                      {isAvailable ? (
                        <button
                          onClick={() => handleOpenRequest(stand)}
                          className="w-full py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white font-semibold text-xs transition active:scale-95 shadow-xs"
                        >
                          {t.requestStand}
                        </button>
                      ) : (
                        <div className="text-center py-2 text-xs text-gray-500 font-medium bg-gray-50 rounded-lg">
                          {t.occupied}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
              /* Provisional category view if no stands published yet */
              <div className="p-8 sm:p-12 text-center rounded-2xl bg-gray-50 border border-gray-200">
                <Store className="w-10 h-10 text-red-700 mx-auto mb-3" />
                <h3 className="text-base font-bold text-gray-900 mb-1">
                  {t.noStandsAvailable}
                </h3>
                <p className="text-gray-600 text-xs sm:text-sm max-w-md mx-auto mb-6">
                  {lang === 'de'
                    ? 'Sie können sich bereits jetzt für einen Stand in der gewünschten Kategorie vormerken lassen.'
                    : 'Puedes enviar una solicitud previa seleccionando la categoría de stand deseada.'}
                </p>

                <button
                  onClick={() => handleOpenRequest()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold text-xs shadow-sm transition active:scale-95"
                >
                  <Store className="w-4 h-4" />
                  <span>{t.requestStand}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Stand Rental Request Modal */}
      {requestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-gray-200 p-6 sm:p-8 shadow-2xl text-gray-900 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-red-700" />
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  {t.requestModalTitle}
                </h3>
              </div>
              <button
                onClick={() => setRequestModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submittedData ? (
              /* Success State */
              <div className="mt-6 text-center">
                <div className="w-14 h-14 rounded-full bg-green-50 text-green-700 border border-green-200 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-1">
                  {t.requestSuccessTitle}
                </h4>
                <p className="text-xs sm:text-sm text-gray-600 mb-6 leading-relaxed">
                  {t.requestSuccessText}
                </p>

                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 mb-6 text-left text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t.standNumber}:</span>
                    <span className="font-bold text-gray-900">#{submittedData.stand}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t.standCategory}:</span>
                    <span className="text-gray-800">{submittedData.categoria}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t.fullName}:</span>
                    <span className="text-gray-800">{submittedData.nombre}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <a
                    href={submittedData.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-sm shadow-sm transition active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{t.openWhatsApp}</span>
                  </a>

                  <button
                    onClick={() => {
                      setRequestModalOpen(false);
                      setSubmittedData(null);
                    }}
                    className="w-full py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition"
                  >
                    {t.close}
                  </button>
                </div>
              </div>
            ) : (
              /* Form State */
              <form onSubmit={handleSubmitRequest} className="mt-6 space-y-4">
                <p className="text-xs text-gray-600 leading-relaxed mb-4">
                  {t.requestInstructions}
                </p>

                {submitError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                    {submitError}
                  </div>
                )}

                {/* Category Selection */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    {t.selectCategory} *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                    {[
                      { id: 'Comida', label: t.categoryComida, icon: UtensilsCrossed },
                      { id: 'Artesanal', label: t.categoryArtesanal, icon: Gift },
                      { id: 'Games', label: t.categoryGames, icon: Gamepad2 },
                    ].map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = formCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setFormCategory(cat.id);
                            setFormStandNumero('');
                          }}
                          className={`w-full py-3 px-3.5 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 border shadow-xs min-h-[46px] active:scale-98 ${
                            isSelected
                              ? 'bg-red-700 text-white border-red-700 font-bold'
                              : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="text-center">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Stand Selection */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    {t.selectStand} *
                  </label>
                  {availableStandsForCategory.length > 0 ? (
                    <select
                      value={formStandNumero}
                      onChange={(e) => setFormStandNumero(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 rounded-lg bg-white border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                    >
                      <option value="">-- {t.selectStand} --</option>
                      {availableStandsForCategory.map((s) => (
                        <option key={s.numero} value={String(s.numero)}>
                          Stand #{s.numero} {s.precio ? `(${s.precio} ${config.MONEDA})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div>
                      <input
                        type="text"
                        placeholder="Ej. Stand 1"
                        value={formStandNumero}
                        onChange={(e) => setFormStandNumero(e.target.value)}
                        required
                        className="w-full px-3 py-2.5 rounded-lg bg-white border border-gray-300 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                      />
                      <p className="text-[11px] text-gray-500 mt-1">
                        {lang === 'de'
                          ? 'Aktuell keine Stände in der Liste. Sie können die gewünschte Standnummer direkt eingeben.'
                          : 'Indica el número de stand que deseas solicitar.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Client Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    {t.fullName} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t.fullNamePlaceholder}
                    value={formNombre}
                    onChange={(e) => setFormNombre(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-white border border-gray-300 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  />
                </div>

                {/* Phone / WhatsApp */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    {t.phone} *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder={t.phonePlaceholder}
                    value={formTelefono}
                    onChange={(e) => setFormTelefono(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-white border border-gray-300 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold text-xs shadow-sm transition active:scale-95 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>{t.sending}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>{t.sendRequest}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
