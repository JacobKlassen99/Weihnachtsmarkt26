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
  Flame,
  X,
  ChevronRight,
  AlertCircle,
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

  // Filters & State (starts at 'all' so visitor can choose rubro or browse full plan)
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [selectedStandToRequest, setSelectedStandToRequest] = useState<Stand | null>(null);

  // Form State
  const [formCategory, setFormCategory] = useState<string>('Comida');
  const [formParrilla, setFormParrilla] = useState<'si' | 'no'>('no');
  const [formStandNumero, setFormStandNumero] = useState<string>('');
  const [formNombre, setFormNombre] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [formObservacion, setFormObservacion] = useState('');
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

  // Canonical blueprint grill stands: 6, 8, 11, 14, 15
  const GRILL_STAND_NUMBERS = [6, 8, 11, 14, 15];

  const availableStandsForCategory = stands.filter((s) => {
    const sCat = (s.Categoria || s.categoria || '').toLowerCase();
    const sEst = (s.Estado || s.estado || '').toLowerCase();
    if (sEst !== 'disponible') return false;
    if (sCat !== formCategory.toLowerCase()) return false;

    if (formCategory === 'Comida') {
      const num = Number(s.Numero !== undefined ? s.Numero : s.numero);
      const rawParrilla = s.TieneParrilla !== undefined ? s.TieneParrilla : s.tiene_parrilla;
      const hasParrilla = rawParrilla !== undefined && rawParrilla !== ''
        ? String(rawParrilla).toUpperCase() === 'SI' || rawParrilla === true
        : GRILL_STAND_NUMBERS.includes(num);

      if (formParrilla === 'si') return hasParrilla;
      if (formParrilla === 'no') return !hasParrilla;
    }

    return true;
  });

  // Check if a stand is compatible with the given category and grill modality
  const isStandCompatibleWithForm = (standObj: Stand, cat: string, parr: 'si' | 'no') => {
    const sCat = (standObj.Categoria || standObj.categoria || '').toLowerCase();
    if (cat.toLowerCase() === 'comida') {
      if (sCat !== 'comida') return false;
      const num = Number(standObj.Numero !== undefined ? standObj.Numero : standObj.numero);
      const rawP = standObj.TieneParrilla !== undefined ? standObj.TieneParrilla : standObj.tiene_parrilla;
      const hasP = rawP !== undefined && rawP !== ''
        ? String(rawP).toUpperCase() === 'SI' || rawP === true
        : GRILL_STAND_NUMBERS.includes(num);
      return parr === 'si' ? hasP : !hasP;
    } else if (cat.toLowerCase() === 'artesanal') {
      return sCat === 'artesanal';
    } else if (cat.toLowerCase() === 'games' || cat.toLowerCase() === 'juegos') {
      return sCat === 'games' || sCat === 'juegos';
    }
    return false;
  };

  // Change category in form: clear previous stand if incompatible (Requirement 3)
  const handleFormCategoryChange = (newCat: string) => {
    setFormCategory(newCat);
    if (selectedStandToRequest) {
      if (!isStandCompatibleWithForm(selectedStandToRequest, newCat, formParrilla)) {
        setSelectedStandToRequest(null);
        setFormStandNumero('');
      }
    } else if (formStandNumero) {
      const standObj = stands.find((s) => String(s.Numero !== undefined ? s.Numero : s.numero) === String(formStandNumero));
      if (standObj && !isStandCompatibleWithForm(standObj, newCat, formParrilla)) {
        setFormStandNumero('');
      }
    }
  };

  // Change grill modality in form: clear previous stand if incompatible (Requirement 3)
  const handleFormParrillaChange = (newParr: 'si' | 'no') => {
    setFormParrilla(newParr);
    if (selectedStandToRequest) {
      if (!isStandCompatibleWithForm(selectedStandToRequest, 'Comida', newParr)) {
        setSelectedStandToRequest(null);
        setFormStandNumero('');
      }
    } else if (formStandNumero) {
      const standObj = stands.find((s) => String(s.Numero !== undefined ? s.Numero : s.numero) === String(formStandNumero));
      if (standObj && !isStandCompatibleWithForm(standObj, 'Comida', newParr)) {
        setFormStandNumero('');
      }
    }
  };

  const handleOpenRequest = (stand?: Stand, categoryOverride?: string, grillOverride?: 'si' | 'no') => {
    setSubmitError(null);
    setSubmittedData(null);
    setIsConfirming(false);
    setFormObservacion('');

    if (stand) {
      setSelectedStandToRequest(stand);
      const numStr = String(stand.Numero !== undefined ? stand.Numero : stand.numero);
      setFormStandNumero(numStr);

      let cat = stand.Categoria || stand.categoria || 'Comida';
      let parr: 'si' | 'no' = 'no';

      if (categoryOverride) {
        if (categoryOverride === 'Comida-Parrilla') {
          cat = 'Comida';
          parr = 'si';
        } else if (categoryOverride === 'Comida-SinParrilla') {
          cat = 'Comida';
          parr = 'no';
        } else if (categoryOverride === 'Artesanal') {
          cat = 'Artesanal';
        } else if (categoryOverride === 'Games') {
          cat = 'Games';
        }
      } else {
        const num = Number(numStr);
        const rawP = stand.TieneParrilla !== undefined ? stand.TieneParrilla : stand.tiene_parrilla;
        const hasP = rawP !== undefined && rawP !== ''
          ? String(rawP).toUpperCase() === 'SI' || rawP === true
          : GRILL_STAND_NUMBERS.includes(num);
        parr = hasP ? 'si' : 'no';
      }

      if (grillOverride) {
        parr = grillOverride;
      }

      setFormCategory(cat);
      setFormParrilla(parr);
    } else {
      setSelectedStandToRequest(null);
      setFormStandNumero('');
      if (selectedCategory === 'Comida-Parrilla') {
        setFormCategory('Comida');
        setFormParrilla('si');
      } else if (selectedCategory === 'Comida-SinParrilla') {
        setFormCategory('Comida');
        setFormParrilla('no');
      } else if (selectedCategory === 'Artesanal') {
        setFormCategory('Artesanal');
      } else if (selectedCategory === 'Games') {
        setFormCategory('Games');
      } else {
        setFormCategory('Comida');
        setFormParrilla('no');
      }
    }
    setRequestModalOpen(true);
  };

  // Step 1 validation before showing confirmation screen (Requirement 5)
  const handleReviewAndConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!formStandNumero) {
      setSubmitError(
        lang === 'de'
          ? 'Bitte wählen Sie einen verfügbaren Stand.'
          : 'Por favor selecciona un stand disponible.'
      );
      return;
    }

    const standObj = stands.find(
      (s) => String(s.Numero !== undefined ? s.Numero : s.numero) === String(formStandNumero)
    );

    if (!standObj) {
      setSubmitError(
        lang === 'de'
          ? 'Der ausgewählte Stand ist ungültig.'
          : 'El stand seleccionado no es válido.'
      );
      return;
    }

    const sEst = String(standObj.Estado || standObj.estado || '').toLowerCase();
    if (sEst !== 'disponible') {
      setSubmitError(
        lang === 'de'
          ? 'Dieser Stand ist nicht mehr verfügbar.'
          : 'Este stand ya no se encuentra disponible.'
      );
      return;
    }

    if (!isStandCompatibleWithForm(standObj, formCategory, formParrilla)) {
      setSubmitError(
        lang === 'de'
          ? 'Dieser Stand gehört zu einer anderen Kategorie. Ändern Sie Ihre Auswahl, um ihn anzufragen.'
          : 'Este stand pertenece a otra categoría. Cambia tu selección para solicitarlo.'
      );
      return;
    }

    if (!formNombre.trim() || formNombre.trim().length < 2) {
      setSubmitError(
        lang === 'de'
          ? 'Bitte geben Sie Ihren vollständigen Namen ein.'
          : 'Por favor introduce tu nombre completo.'
      );
      return;
    }

    if (!formTelefono.trim() || formTelefono.trim().length < 6) {
      setSubmitError(
        lang === 'de'
          ? 'Bitte geben Sie eine gültige Telefonnummer ein.'
          : 'Por favor introduce un teléfono o WhatsApp válido.'
      );
      return;
    }

    if (!formObservacion.trim() || formObservacion.trim().length < 5) {
      setSubmitError(
        lang === 'de'
          ? 'Bitte beschreiben Sie kurz, was Sie an Ihrem Stand anbieten möchten (mindestens 5 Zeichen).'
          : 'Por favor describe qué venderás u ofrecerás en tu stand (mínimo 5 caracteres).'
      );
      return;
    }

    setIsConfirming(true);
  };

  // Step 2 final submission after confirmation
  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const standObj = stands.find(
        (s) => String(s.Numero !== undefined ? s.Numero : s.numero) === String(formStandNumero)
      );
      const standId = standObj?.StandID || standObj?.id;
      const hasParrilla = formCategory === 'Comida' ? formParrilla === 'si' : false;
      const modalidad = formCategory === 'Comida'
        ? (formParrilla === 'si' ? 'con_parrilla' : 'sin_parrilla')
        : 'estandar';

      const res = await backendService.submitSolicitud({
        standId: standId && !String(standId).startsWith('virtual-') ? String(standId).trim() : undefined,
        stand: formStandNumero,
        categoria: formCategory,
        tieneParrilla: hasParrilla,
        modalidad,
        nombre: formNombre.trim(),
        telefono: formTelefono.trim(),
        observacion: formObservacion.trim(),
        idioma: lang,
      });

      if (!res.ok) {
        throw new Error(res.error || 'No se pudo registrar la solicitud');
      }

      const template =
        lang === 'de' ? config.MENSAJE_WHATSAPP_DE : config.MENSAJE_WHATSAPP_ES;
      const categoryLabel = formCategory === 'Comida'
        ? `${formCategory} (${formParrilla === 'si' ? (lang === 'de' ? 'mit Grill' : 'Con parrilla') : (lang === 'de' ? 'ohne Grill' : 'Sin parrilla')})`
        : formCategory;

      const message = (template || 'Hola, soy {NOMBRE}. Solicité el Stand {STAND} de la categoría {CATEGORIA} para el Weihnachtsmarkt.')
        .replace('{NOMBRE}', formNombre.trim())
        .replace('{STAND}', formStandNumero)
        .replace('{CATEGORIA}', categoryLabel);

      const adminPhone = config?.WHATSAPP_ADMIN;
      if (!adminPhone || !String(adminPhone).trim()) {
        throw new Error(
          lang === 'de'
            ? 'Die Administrator-WhatsApp-Nummer ist nicht konfiguriert. Bitte überprüfen Sie die Parameter.'
            : 'El número de WhatsApp del administrador no está configurado. Por favor, verifica los parámetros en Administración.'
        );
      }

      const cleanPhone = String(adminPhone).replace(/\D/g, '');
      const defaultWhatsapp = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        message
      )}`;
      const whatsappUrl = res.whatsapp_url || res.data?.whatsapp_url || defaultWhatsapp;

      setSubmittedData({
        stand: formStandNumero,
        categoria: categoryLabel,
        nombre: formNombre.trim(),
        whatsappUrl,
      });
      setIsConfirming(false);
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
                selectedCategory={selectedCategory}
                onSelectCategory={(cat) => setSelectedCategory(cat)}
                onRequestStand={(stand, catOverride, grillOverride) =>
                  handleOpenRequest(stand, catOverride, grillOverride)
                }
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
                  {isConfirming
                    ? (t.confirmRequestTitle || 'Confirmar Solicitud de Stand')
                    : (t.requestModalTitle || 'Solicitud de Alquiler de Stand')}
                </h3>
              </div>
              <button
                onClick={() => {
                  setRequestModalOpen(false);
                  setIsConfirming(false);
                  setSubmitError(null);
                }}
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
            ) : isConfirming ? (
              /* Confirmation State (Requirement 5) */
              <div className="mt-5 space-y-4 animate-in fade-in duration-150">
                {/* Advice banner */}
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">
                      {lang === 'de' ? 'Stand-Auswahl bestätigen' : 'Confirma tu selección antes de enviar'}
                    </p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      {lang === 'de'
                        ? 'Bitte überprüfen Sie sorgfältig die Angaben zu Ihrem Stand und Ihren Kontaktdaten.'
                        : 'Por favor revisa cuidadosamente los detalles del stand y tus datos de contacto antes de enviar.'}
                    </p>
                  </div>
                </div>

                {/* Highlight banner in the prompt's exact format: "Stand 8 – Comida con parrilla – $us 100" */}
                {(() => {
                  const standObj = stands.find(
                    (s) => String(s.Numero !== undefined ? s.Numero : s.numero) === String(formStandNumero)
                  );
                  const precioVal = standObj && (standObj.Precio || standObj.precio)
                    ? `${standObj.Precio || standObj.precio} ${config.MONEDA || '$us'}`
                    : (lang === 'de' ? 'Nach Vereinbarung' : 'A coordinar');

                  const categoriaFormatText = formCategory === 'Comida'
                    ? (formParrilla === 'si'
                        ? (lang === 'de' ? 'Essen mit Grill' : 'Comida con parrilla')
                        : (lang === 'de' ? 'Essen ohne Grill' : 'Comida sin parrilla'))
                    : formCategory === 'Artesanal'
                    ? (lang === 'de' ? 'Handwerk' : 'Productos artesanales')
                    : (lang === 'de' ? 'Spiele' : 'Juegos y entretenimiento');

                  const headline = `Stand ${formStandNumero} – ${categoriaFormatText} – ${precioVal}`;

                  return (
                    <>
                      <div className="p-4 rounded-xl bg-gradient-to-r from-red-50 via-orange-50 to-amber-50 border-2 border-red-300 shadow-sm text-center space-y-1">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-red-700 block">
                          {lang === 'de' ? 'Ausgewählter Stand' : 'Resumen del Stand'}
                        </span>
                        <div className="text-base sm:text-lg font-black text-gray-900 font-mono">
                          {headline}
                        </div>
                      </div>

                      {/* Detailed Summary Table */}
                      <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-200 text-xs">
                        <div className="p-3 flex justify-between items-center">
                          <span className="text-gray-500 font-medium">{t.summaryStand || 'Número de stand'}:</span>
                          <span className="font-bold text-gray-900 font-mono">Stand #{formStandNumero}</span>
                        </div>
                        <div className="p-3 flex justify-between items-center">
                          <span className="text-gray-500 font-medium">{t.summaryCategory || 'Categoría'}:</span>
                          <span className="font-bold text-gray-900">
                            {formCategory === 'Comida'
                              ? (lang === 'de' ? 'Essen' : 'Comida')
                              : formCategory === 'Artesanal'
                              ? (lang === 'de' ? 'Handwerk' : 'Productos artesanales')
                              : (lang === 'de' ? 'Spiele' : 'Juegos y entretenimiento')}
                          </span>
                        </div>
                        {formCategory === 'Comida' && (
                          <div className="p-3 flex justify-between items-center">
                            <span className="text-gray-500 font-medium">{t.summaryModality || 'Modalidad'}:</span>
                            <span className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                              formParrilla === 'si' ? 'bg-orange-100 text-orange-800 border border-orange-200' : 'bg-sky-100 text-sky-800 border border-sky-200'
                            }`}>
                              {formParrilla === 'si'
                                ? (lang === 'de' ? 'Mit Grill (orange)' : 'Con parrilla (naranja)')
                                : (lang === 'de' ? 'Ohne Grill (hellblau)' : 'Sin parrilla (celeste)')}
                            </span>
                          </div>
                        )}
                        <div className="p-3 flex justify-between items-center">
                          <span className="text-gray-500 font-medium">{t.summaryPrice || 'Precio'}:</span>
                          <span className="font-black text-red-700 font-mono">{precioVal}</span>
                        </div>
                        <div className="p-3 flex justify-between items-center">
                          <span className="text-gray-500 font-medium">{t.summaryApplicant || 'Nombre del solicitante'}:</span>
                          <span className="font-bold text-gray-900">{formNombre}</span>
                        </div>
                        <div className="p-3 flex justify-between items-center">
                          <span className="text-gray-500 font-medium">{t.summaryPhone || 'Teléfono / WhatsApp'}:</span>
                          <span className="font-bold text-gray-900 font-mono">{formTelefono}</span>
                        </div>
                        <div className="p-3 flex flex-col gap-1">
                          <span className="text-gray-500 font-medium">{t.summaryOffer || 'Productos a ofrecer'}:</span>
                          <span className="text-gray-800 italic bg-white p-2 rounded-lg border border-gray-200">
                            "{formObservacion}"
                          </span>
                        </div>
                      </div>
                    </>
                  );
                })()}

                {submitError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                    {submitError}
                  </div>
                )}

                {/* Confirmation Actions */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setIsConfirming(false)}
                    className="w-full py-3 px-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs transition"
                  >
                    {t.modifyData || 'Modificar datos'}
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleFinalSubmit}
                    className="w-full py-3 px-4 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{t.sending}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{t.confirmAndSend || 'Confirmar y Enviar Solicitud'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Form State */
              <form onSubmit={handleReviewAndConfirm} className="mt-6 space-y-4">
                <p className="text-xs text-gray-600 leading-relaxed mb-4">
                  {t.requestInstructions}
                </p>

                {submitError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                    {submitError}
                  </div>
                )}

                {/* Preselected Stand Notice if opened from map */}
                {selectedStandToRequest && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between text-xs">
                    <span className="text-gray-700">
                      Stand seleccionado:{' '}
                      <strong className="text-red-700 font-bold">
                        Stand #{formStandNumero}
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStandToRequest(null);
                        setFormStandNumero('');
                      }}
                      className="text-[11px] text-red-700 hover:underline font-bold"
                    >
                      {lang === 'de' ? 'Anderen Stand wählen' : 'Cambiar stand'}
                    </button>
                  </div>
                )}

                {/* Category Selection: Comida, Artesanal, Juegos */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    {lang === 'de' ? '¿Was möchten Sie verkaufen oder anbieten?' : '¿Qué quieres vender u ofrecer?'} *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                    {[
                      { id: 'Comida', label: lang === 'de' ? 'Essen' : 'Comida', icon: UtensilsCrossed },
                      { id: 'Artesanal', label: lang === 'de' ? 'Handwerk' : 'Productos artesanales', icon: Gift },
                      { id: 'Games', label: lang === 'de' ? 'Spiele' : 'Juegos y entretenimiento', icon: Gamepad2 },
                    ].map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = formCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleFormCategoryChange(cat.id)}
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

                {/* Mandatory Grill Question when category is Comida */}
                {formCategory === 'Comida' && (
                  <div className="p-3.5 rounded-xl bg-orange-50/70 border border-orange-200 space-y-2 animate-in fade-in duration-150">
                    <label className="block text-xs font-bold text-gray-900">
                      {t.grillQuestion} *
                    </label>
                    <p className="text-[11px] text-gray-600 leading-snug">
                      {lang === 'de'
                        ? 'Wählen Sie, ob Sie einen Stand mit Holzkohle-/Gasgrill benötigen.'
                        : 'Los stands con parrilla están delimitados y autorizados en el plano para uso de humo y calor.'}
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {/* Sí, con parrilla */}
                      <button
                        type="button"
                        onClick={() => handleFormParrillaChange('si')}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                          formParrilla === 'si'
                            ? 'bg-orange-600 text-white border-orange-700 shadow-sm ring-2 ring-orange-200'
                            : 'bg-white hover:bg-orange-50 text-gray-700 border-gray-300'
                        }`}
                      >
                        <Flame className="w-4 h-4 text-amber-200" />
                        <span>{t.withGrill}</span>
                      </button>

                      {/* No, sin parrilla */}
                      <button
                        type="button"
                        onClick={() => handleFormParrillaChange('no')}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                          formParrilla === 'no'
                            ? 'bg-sky-600 text-white border-sky-700 shadow-sm ring-2 ring-sky-200'
                            : 'bg-white hover:bg-sky-50 text-gray-700 border-gray-300'
                        }`}
                      >
                        <UtensilsCrossed className="w-4 h-4 text-sky-200" />
                        <span>{t.withoutGrill}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Stand Selection */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    {t.selectStand} *
                  </label>
                  {selectedStandToRequest ? (
                    <div className="w-full px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-300 text-xs font-bold text-gray-900 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                        <span>Stand #{formStandNumero}</span>
                        {selectedStandToRequest.precio ? (
                          <span className="text-gray-500 font-mono font-normal">
                            ({selectedStandToRequest.precio} {config.MONEDA || '$us'})
                          </span>
                        ) : null}
                      </div>
                      <span className="text-[11px] text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                        {lang === 'de' ? 'Vom Plan gewählt' : 'Elegido en plano'}
                      </span>
                    </div>
                  ) : availableStandsForCategory.length > 0 ? (
                    <select
                      value={formStandNumero}
                      onChange={(e) => setFormStandNumero(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 rounded-lg bg-white border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                    >
                      <option value="">-- {t.selectStand} --</option>
                      {availableStandsForCategory.map((s) => (
                        <option key={s.numero} value={String(s.numero)}>
                          Stand #{s.numero} {s.precio ? `(${s.precio} ${config.MONEDA || '$us'})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                      <div className="flex items-center gap-2 font-bold text-amber-900">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>
                          {lang === 'de'
                            ? 'Keine Stände in dieser Kategorie verfügbar'
                            : 'No hay stands disponibles para esta selección'}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-700">
                        {lang === 'de'
                          ? 'Wählen Sie eine andere Kategorie oder warten Sie auf die Freigabe durch die Administration.'
                          : 'Solo se pueden solicitar stands habilitados y con estado disponible.'}
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

                {/* What will you sell / Observacion */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {t.whatWillYouSell} *
                  </label>
                  <p className="text-[11px] text-gray-500 mb-1.5 leading-relaxed">
                    {t.whatWillYouSellSubtitle}
                  </p>
                  <textarea
                    required
                    rows={3}
                    placeholder={t.whatWillYouSellPlaceholder}
                    value={formObservacion}
                    onChange={(e) => setFormObservacion(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-white border border-gray-300 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 resize-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={!formStandNumero}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold text-xs shadow-sm transition active:scale-95 disabled:opacity-50"
                  >
                    <span>{t.reviewAndConfirm || 'Revisar y Confirmar'}</span>
                    <ChevronRight className="w-4 h-4" />
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
