import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Store,
  Info,
  CheckCircle2,
  UtensilsCrossed,
  Flame,
  Gift,
  Gamepad2,
  HelpCircle,
  AlertCircle,
  X,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Stand, Configuracion, Idioma } from '../../types';

interface InteractiveMapProps {
  stands: Stand[];
  config: Configuracion;
  lang: Idioma;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  onRequestStand: (stand: Stand, categoryOverride?: string, grillOverride?: 'si' | 'no') => void;
}

export type BlueprintCategory = 'Comida-Parrilla' | 'Comida-SinParrilla' | 'Artesanal' | 'Games' | 'Blanco';

export interface BlueprintSlot {
  numero: number;
  type: 'row' | 'col';
  x: number;
  y: number;
  width: number;
  height: number;
  labelX: number;
  labelY: number;
  defaultCat: BlueprintCategory;
  hasParrilla?: boolean;
}

// Canonical Blueprint mapping according to the reference blueprint image:
// Stands 1 to 20: Bottom horizontal row, RIGHT to LEFT (Stand 1 rightmost, Stand 20 leftmost)
// Stands 21 to 40: Left vertical column, BOTTOM to TOP (Stand 21 bottom, Stand 40 top)
export const BLUEPRINT_SLOTS: BlueprintSlot[] = (() => {
  const slots: BlueprintSlot[] = [];

  // Bottom row (Stands 1 to 20): from x = 840 down to x = 135, y = 880
  const rowStartX = 840;
  const rowEndX = 145;
  const rowY = 880;
  const rowW = 28;
  const rowH = 34;
  const stepX = (rowStartX - rowEndX) / 19;

  // Canonical categories for 1 to 20 from image:
  // 1-5: Red in image -> Blanco in app unless reserved
  // 6: Comida con parrilla (Naranja)
  // 7: Artesanal (Amarillo)
  // 8: Comida con parrilla (Naranja)
  // 9: Artesanal (Amarillo)
  // 10: Juegos (Verde)
  // 11: Comida con parrilla (Naranja)
  // 12: Artesanal (Amarillo)
  // 13: Artesanal (Amarillo)
  // 14: Comida con parrilla (Naranja)
  // 15: Comida con parrilla (Naranja)
  // 16: Juegos (Verde)
  // 17: Juegos (Verde)
  // 18: Comida sin parrilla (Celeste)
  // 19: Artesanal (Amarillo)
  // 20: Comida sin parrilla (Celeste)
  const defaultCats1to20: Record<number, { cat: BlueprintCategory; parrilla?: boolean }> = {
    1: { cat: 'Blanco' },
    2: { cat: 'Blanco' },
    3: { cat: 'Blanco' },
    4: { cat: 'Blanco' },
    5: { cat: 'Blanco' },
    6: { cat: 'Comida-Parrilla', parrilla: true },
    7: { cat: 'Artesanal' },
    8: { cat: 'Comida-Parrilla', parrilla: true },
    9: { cat: 'Artesanal' },
    10: { cat: 'Games' },
    11: { cat: 'Comida-Parrilla', parrilla: true },
    12: { cat: 'Artesanal' },
    13: { cat: 'Artesanal' },
    14: { cat: 'Comida-Parrilla', parrilla: true },
    15: { cat: 'Comida-Parrilla', parrilla: true },
    16: { cat: 'Games' },
    17: { cat: 'Games' },
    18: { cat: 'Comida-SinParrilla', parrilla: false },
    19: { cat: 'Artesanal' },
    20: { cat: 'Comida-SinParrilla', parrilla: false },
  };

  for (let i = 0; i < 20; i++) {
    const num = 1 + i;
    const x = Math.round(rowStartX - i * stepX);
    const def = defaultCats1to20[num];
    slots.push({
      numero: num,
      type: 'row',
      x,
      y: rowY,
      width: rowW,
      height: rowH,
      labelX: x + rowW / 2,
      labelY: rowY + rowH + 18,
      defaultCat: def.cat,
      hasParrilla: def.parrilla,
    });
  }

  // Left column (Stands 21 to 40): from y = 825 up to y = 145, x = 145
  const colStartY = 825;
  const colEndY = 145;
  const colX = 145;
  const colW = 34;
  const colH = 28;
  const stepY = (colStartY - colEndY) / 19;

  // Canonical categories for 21 to 40 from image:
  // 21: Artesanal (Amarillo)
  // 22: Comida sin parrilla (Celeste)
  // 23: Artesanal (Amarillo)
  // 24: Comida sin parrilla (Celeste)
  // 25: Comida sin parrilla (Celeste)
  // 26: Artesanal (Amarillo)
  // 27: Comida sin parrilla (Celeste)
  // 28: Juegos (Verde)
  // 29: Comida sin parrilla (Celeste)
  // 30: Comida sin parrilla (Celeste)
  // 31: Artesanal (Amarillo)
  // 32: Comida sin parrilla (Celeste)
  // 33: Artesanal (Amarillo)
  // 34: Comida sin parrilla (Celeste)
  // 35: Juegos (Verde)
  // 36-40: Red in image -> Blanco in app unless reserved
  const defaultCats21to40: Record<number, { cat: BlueprintCategory; parrilla?: boolean }> = {
    21: { cat: 'Artesanal' },
    22: { cat: 'Comida-SinParrilla', parrilla: false },
    23: { cat: 'Artesanal' },
    24: { cat: 'Comida-SinParrilla', parrilla: false },
    25: { cat: 'Comida-SinParrilla', parrilla: false },
    26: { cat: 'Artesanal' },
    27: { cat: 'Comida-SinParrilla', parrilla: false },
    28: { cat: 'Games' },
    29: { cat: 'Comida-SinParrilla', parrilla: false },
    30: { cat: 'Comida-SinParrilla', parrilla: false },
    31: { cat: 'Artesanal' },
    32: { cat: 'Comida-SinParrilla', parrilla: false },
    33: { cat: 'Artesanal' },
    34: { cat: 'Comida-SinParrilla', parrilla: false },
    35: { cat: 'Games' },
    36: { cat: 'Blanco' },
    37: { cat: 'Blanco' },
    38: { cat: 'Blanco' },
    39: { cat: 'Blanco' },
    40: { cat: 'Blanco' },
  };

  for (let i = 0; i < 20; i++) {
    const num = 21 + i;
    const y = Math.round(colStartY - i * stepY);
    const def = defaultCats21to40[num];
    slots.push({
      numero: num,
      type: 'col',
      x: colX,
      y,
      width: colW,
      height: colH,
      labelX: colX - 16,
      labelY: y + colH / 2 + 5,
      defaultCat: def.cat,
      hasParrilla: def.parrilla,
    });
  }

  return slots;
})();

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  stands,
  config,
  lang,
  selectedCategory,
  onSelectCategory,
  onRequestStand,
}) => {
  // Zoom & Pan state
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartDist = useRef<number | null>(null);

  // Selected stand for popup inspection / confirmation
  const [activeStand, setActiveStand] = useState<Stand | null>(null);
  const [selectedSlotInfo, setSelectedSlotInfo] = useState<BlueprintSlot | null>(null);
  const [confirmPromptOpen, setConfirmPromptOpen] = useState(false);

  // Warning when tapping a stand of another category (Requirement 3)
  const [mismatchedNotice, setMismatchedNotice] = useState<{
    slotNumber: number;
    actualCategory: string;
  } | null>(null);

  // Map real stands by their number
  const standsByNumber = useMemo(() => {
    const map = new Map<number, Stand>();
    for (const stand of stands) {
      const num = Number(stand.Numero !== undefined ? stand.Numero : stand.numero);
      if (!isNaN(num) && num > 0) {
        map.set(num, stand);
      }
    }
    return map;
  }, [stands]);

  // Zoom handlers
  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.3, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.3, 0.8));
  const handleResetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  // Mouse pan controls
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch gesture support: pan and pinch-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      touchStartDist.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      setPan({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    } else if (e.touches.length === 2 && touchStartDist.current !== null) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      const factor = dist / touchStartDist.current;
      setScale((prev) => Math.min(Math.max(prev * (1 + (factor - 1) * 0.1), 0.8), 3));
      touchStartDist.current = dist;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchStartDist.current = null;
  };

  // Resolve visual presentation of any slot
  const getSlotVisual = useCallback(
    (slot: BlueprintSlot, stand?: Stand) => {
      // 1. If real record exists in Google Sheets and is reserved/rented -> RED
      const estadoRaw = stand ? String(stand.Estado || stand.estado || '').toUpperCase() : '';
      const isAlquilado =
        estadoRaw === 'ALQUILADO' ||
        estadoRaw === 'OCUPADO' ||
        estadoRaw === 'RESERVADO';

      if (isAlquilado) {
        return {
          fill: '#DC2626',
          stroke: '#991B1B',
          textFill: '#FFFFFF',
          badgeText: lang === 'de' ? 'Reserviert' : 'Alquilado',
          status: 'alquilado',
          isRequestable: false,
        };
      }

      // 2. Determine effective category and grill modality
      let effectiveCat: BlueprintCategory = slot.defaultCat;
      let hasParrilla = slot.hasParrilla;

      if (stand) {
        const catClean = String(stand.Categoria || stand.categoria || '').trim();
        const parrillaVal = stand.TieneParrilla !== undefined
          ? stand.TieneParrilla
          : stand.tiene_parrilla;
        const hasP = parrillaVal !== undefined
          ? String(parrillaVal).toUpperCase() === 'SI' || parrillaVal === true
          : slot.hasParrilla;

        if (catClean.toLowerCase() === 'comida') {
          effectiveCat = hasP ? 'Comida-Parrilla' : 'Comida-SinParrilla';
          hasParrilla = hasP;
        } else if (catClean.toLowerCase() === 'artesanal') {
          effectiveCat = 'Artesanal';
        } else if (catClean.toLowerCase() === 'games' || catClean.toLowerCase() === 'juegos') {
          effectiveCat = 'Games';
        }
      }

      // 3. Category color palette according to user blueprint specs:
      // Celeste: Comida sin parrilla (#38BDF8)
      // Naranja: Comida con parrilla (#F97316)
      // Amarillo: Artesanal (#FACC15)
      // Verde: Juegos (#4ADE80)
      // Blanco: Stands 1-5, 36-40 o libres (#FFFFFF)
      let fill = '#FFFFFF';
      let stroke = '#64748B';
      let textFill = '#0F172A';
      let badgeText = lang === 'de' ? 'Verfügbar' : 'Disponible';

      if (effectiveCat === 'Comida-Parrilla') {
        fill = '#F97316';
        stroke = '#C2410C';
        textFill = '#FFFFFF';
        badgeText = lang === 'de' ? 'Essen mit Grill' : 'Comida con parrilla';
      } else if (effectiveCat === 'Comida-SinParrilla') {
        fill = '#38BDF8';
        stroke = '#0284C7';
        textFill = '#0F172A';
        badgeText = lang === 'de' ? 'Essen ohne Grill' : 'Comida sin parrilla';
      } else if (effectiveCat === 'Artesanal') {
        fill = '#FACC15';
        stroke = '#CA8A04';
        textFill = '#713F12';
        badgeText = lang === 'de' ? 'Handwerk' : 'Artesanal';
      } else if (effectiveCat === 'Games') {
        fill = '#4ADE80';
        stroke = '#16A34A';
        textFill = '#14532D';
        badgeText = lang === 'de' ? 'Spiele' : 'Juegos';
      } else {
        fill = '#FFFFFF';
        stroke = '#475569';
        textFill = '#0F172A';
        badgeText = lang === 'de' ? 'Frei' : 'Libre / Disponible';
      }

      // Check if slot matches current filter
      let matchesFilter = true;
      if (selectedCategory && selectedCategory !== 'all') {
        if (selectedCategory === 'Comida') {
          matchesFilter = effectiveCat === 'Comida-Parrilla' || effectiveCat === 'Comida-SinParrilla';
        } else if (selectedCategory === 'Comida-Parrilla') {
          matchesFilter = effectiveCat === 'Comida-Parrilla';
        } else if (selectedCategory === 'Comida-SinParrilla') {
          matchesFilter = effectiveCat === 'Comida-SinParrilla';
        } else if (selectedCategory === 'Artesanal') {
          matchesFilter = effectiveCat === 'Artesanal';
        } else if (selectedCategory === 'Games') {
          matchesFilter = effectiveCat === 'Games';
        }
      }

      return {
        fill,
        stroke,
        textFill,
        badgeText,
        effectiveCat,
        hasParrilla,
        status: 'disponible',
        matchesFilter,
        isRequestable: Boolean(stand && !isAlquilado),
      };
    },
    [lang, selectedCategory]
  );

  // Click on a stand / slot
  const handleSlotClick = useCallback(
    (slot: BlueprintSlot, stand?: Stand) => {
      const visual = getSlotVisual(slot, stand);

      // Requirement 3: If category filter is active and slot belongs to another category
      if (selectedCategory && selectedCategory !== 'all' && !visual.matchesFilter) {
        setMismatchedNotice({
          slotNumber: slot.numero,
          actualCategory: visual.badgeText,
        });
        return;
      }

      setSelectedSlotInfo(slot);
      if (stand) {
        setActiveStand(stand);
        const estadoRaw = String(stand.Estado || stand.estado || '').toUpperCase();
        const isDisponible = estadoRaw === 'DISPONIBLE' || String(stand.estado).toLowerCase() === 'disponible';
        if (isDisponible) {
          setConfirmPromptOpen(true);
        } else {
          setConfirmPromptOpen(false);
        }
      } else {
        // Stand is NOT in Google Sheets yet -> NOT requestable!
        setActiveStand(null);
        setConfirmPromptOpen(false);
      }
    },
    [getSlotVisual, selectedCategory]
  );

  const handleCloseModal = () => {
    setActiveStand(null);
    setSelectedSlotInfo(null);
    setConfirmPromptOpen(false);
  };

  const handleProceedRequest = () => {
    if (activeStand && selectedSlotInfo) {
      const standToRequest = activeStand;
      const visual = getSlotVisual(selectedSlotInfo, activeStand);
      handleCloseModal();
      onRequestStand(
        standToRequest,
        visual.effectiveCat,
        visual.hasParrilla ? 'si' : 'no'
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. SELECCIÓN DE CATEGORÍA Y MODALIDAD (Paso 1) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-800 text-[11px] font-extrabold uppercase">
                {lang === 'de' ? 'Schritt 1' : 'Paso 1'}
              </span>
              <h3 className="text-sm sm:text-base font-extrabold text-gray-900">
                {lang === 'de' ? 'Was möchten Sie verkaufen oder anbieten?' : '¿Qué quieres vender u ofrecer?'}
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {lang === 'de'
                ? 'Wählen Sie Ihren Bereich, um passende Stände im Plan hervorzuheben.'
                : 'Elige tu rubro para ver y solicitar los stands compatibles en el plano.'}
            </p>
          </div>

          {selectedCategory !== 'all' && (
            <button
              type="button"
              onClick={() => onSelectCategory('all')}
              className="text-xs text-gray-500 hover:text-red-700 underline font-semibold transition"
            >
              {lang === 'de' ? 'Alle Stände anzeigen' : 'Ver todos sin filtrar'}
            </button>
          )}
        </div>

        {/* 3 Main Category Options: Comida, Artesanal, Juegos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* 1. Comida */}
          <button
            type="button"
            onClick={() => {
              if (selectedCategory !== 'Comida-Parrilla' && selectedCategory !== 'Comida-SinParrilla') {
                onSelectCategory('Comida-SinParrilla');
              }
            }}
            className={`p-3.5 rounded-xl border text-left transition flex items-center gap-3 active:scale-98 ${
              selectedCategory === 'Comida-Parrilla' || selectedCategory === 'Comida-SinParrilla'
                ? 'bg-red-50/80 border-red-500 text-red-950 ring-2 ring-red-200 shadow-xs'
                : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              selectedCategory === 'Comida-Parrilla' || selectedCategory === 'Comida-SinParrilla'
                ? 'bg-red-700 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}>
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs sm:text-sm text-gray-900 truncate">
                {lang === 'de' ? 'Essen' : 'Comida'}
              </div>
              <div className="text-[11px] text-gray-500 truncate">
                {lang === 'de' ? 'Gastronomie & Snacks' : 'Gastronomía y alimentos'}
              </div>
            </div>
          </button>

          {/* 2. Productos artesanales */}
          <button
            type="button"
            onClick={() => onSelectCategory('Artesanal')}
            className={`p-3.5 rounded-xl border text-left transition flex items-center gap-3 active:scale-98 ${
              selectedCategory === 'Artesanal'
                ? 'bg-yellow-50 border-yellow-500 text-yellow-950 ring-2 ring-yellow-200 shadow-xs'
                : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              selectedCategory === 'Artesanal' ? 'bg-yellow-500 text-gray-900' : 'bg-gray-100 text-gray-600'
            }`}>
              <Gift className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs sm:text-sm text-gray-900 truncate">
                {lang === 'de' ? 'Handwerk' : 'Productos artesanales'}
              </div>
              <div className="text-[11px] text-gray-500 truncate">
                {lang === 'de' ? 'Kunst, Deko & Geschenke' : 'Regalos y decoraciones'}
              </div>
            </div>
          </button>

          {/* 3. Juegos y entretenimiento */}
          <button
            type="button"
            onClick={() => onSelectCategory('Games')}
            className={`p-3.5 rounded-xl border text-left transition flex items-center gap-3 active:scale-98 ${
              selectedCategory === 'Games'
                ? 'bg-green-50 border-green-500 text-green-950 ring-2 ring-green-200 shadow-xs'
                : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              selectedCategory === 'Games' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}>
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs sm:text-sm text-gray-900 truncate">
                {lang === 'de' ? 'Spiele' : 'Juegos y entretenimiento'}
              </div>
              <div className="text-[11px] text-gray-500 truncate">
                {lang === 'de' ? 'Attraktionen & Spaß' : 'Atracciones familiares'}
              </div>
            </div>
          </button>
        </div>

        {/* Mandatory Grill Question when category is Comida */}
        {(selectedCategory === 'Comida-Parrilla' || selectedCategory === 'Comida-SinParrilla' || selectedCategory === 'Comida') && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-orange-50/70 border border-orange-200 space-y-2.5 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-600 shrink-0" />
              <span className="text-xs font-bold text-gray-900">
                {lang === 'de' ? 'Benötigen Sie einen Grill?' : '¿Necesitas parrilla?'} *
              </span>
            </div>
            <p className="text-[11px] text-gray-600 leading-snug">
              {lang === 'de'
                ? 'Stände mit Grill verfügen über die erforderliche Belüftung und Genehmigung für Kohle/Gas.'
                : 'Los stands con parrilla están delimitados y autorizados en el plano para uso de humo y calor.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* Sí, con parrilla */}
              <button
                type="button"
                onClick={() => onSelectCategory('Comida-Parrilla')}
                className={`py-3 px-3.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border active:scale-98 ${
                  selectedCategory === 'Comida-Parrilla'
                    ? 'bg-orange-600 text-white border-orange-700 shadow-sm ring-2 ring-orange-200'
                    : 'bg-white hover:bg-orange-50 text-gray-700 border-gray-300'
                }`}
              >
                <Flame className="w-4 h-4 text-amber-200" />
                <span>{lang === 'de' ? 'Ja, mit Grill (orange)' : 'Sí, con parrilla (naranjas)'}</span>
              </button>

              {/* No, sin parrilla */}
              <button
                type="button"
                onClick={() => onSelectCategory('Comida-SinParrilla')}
                className={`py-3 px-3.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border active:scale-98 ${
                  selectedCategory === 'Comida-SinParrilla'
                    ? 'bg-sky-600 text-white border-sky-700 shadow-sm ring-2 ring-sky-200'
                    : 'bg-white hover:bg-sky-50 text-gray-700 border-gray-300'
                }`}
              >
                <UtensilsCrossed className="w-4 h-4 text-sky-200" />
                <span>{lang === 'de' ? 'Nein, ohne Grill (hellblau)' : 'No, sin parrilla (celestes)'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Clear Guidance Banner above map (Requirement 2) */}
      <div className="space-y-1">
        {selectedCategory === 'Comida-Parrilla' && (
          <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-300 text-orange-950 flex items-center gap-3 text-xs sm:text-sm font-bold shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <span className="block text-gray-500 text-[11px] font-semibold uppercase">Paso 2: Selecciona tu stand</span>
              <span>{lang === 'de' ? 'Wählen Sie einen der verfügbaren orangefarbenen Stände.' : 'Selecciona uno de los stands naranjas disponibles.'}</span>
            </div>
          </div>
        )}

        {selectedCategory === 'Comida-SinParrilla' && (
          <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-300 text-sky-950 flex items-center gap-3 text-xs sm:text-sm font-bold shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-sky-500 text-white flex items-center justify-center shrink-0">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <span className="block text-gray-500 text-[11px] font-semibold uppercase">Paso 2: Selecciona tu stand</span>
              <span>{lang === 'de' ? 'Wählen Sie einen der verfügbaren hellblauen Stände.' : 'Selecciona uno de los stands celestes disponibles.'}</span>
            </div>
          </div>
        )}

        {selectedCategory === 'Artesanal' && (
          <div className="p-3.5 rounded-xl bg-yellow-50 border border-yellow-300 text-yellow-950 flex items-center gap-3 text-xs sm:text-sm font-bold shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-yellow-400 text-gray-900 flex items-center justify-center shrink-0">
              <Gift className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <span className="block text-gray-500 text-[11px] font-semibold uppercase">Paso 2: Selecciona tu stand</span>
              <span>{lang === 'de' ? 'Wählen Sie einen der verfügbaren gelben Stände.' : 'Selecciona uno de los stands amarillos disponibles.'}</span>
            </div>
          </div>
        )}

        {selectedCategory === 'Games' && (
          <div className="p-3.5 rounded-xl bg-green-50 border border-green-300 text-green-950 flex items-center gap-3 text-xs sm:text-sm font-bold shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-green-600 text-white flex items-center justify-center shrink-0">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <span className="block text-gray-500 text-[11px] font-semibold uppercase">Paso 2: Selecciona tu stand</span>
              <span>{lang === 'de' ? 'Wählen Sie einen der verfügbaren grünen Stände.' : 'Selecciona uno de los stands verdes disponibles.'}</span>
            </div>
          </div>
        )}

        {selectedCategory === 'all' && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 flex items-center gap-3 text-xs sm:text-sm font-medium shadow-xs">
            <Info className="w-5 h-5 text-slate-500 shrink-0" />
            <span>{lang === 'de' ? 'Wählen Sie oben Ihre Kategorie oder tippen Sie direkt auf einen verfügbaren Stand im Plan.' : 'Paso 1: Elige arriba qué quieres vender u ofrecer para ver los stands disponibles, o toca un stand del plano.'}</span>
          </div>
        )}
      </div>

      {/* 2. Interactive SVG Canvas */}
      <div className="relative rounded-2xl border border-gray-200 bg-[#FAF7EE] overflow-hidden shadow-inner select-none">
        {/* Floating Zoom & Reset Buttons */}
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-gray-200 shadow-md">
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition"
            title="Acercar (Zoom In)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition"
            title="Alejar (Zoom Out)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition"
            title="Centrar / Restablecer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Top-left Indicator */}
        <div className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-gray-200 text-xs text-gray-700 shadow-xs pointer-events-none flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
          <span className="font-bold text-gray-900">Weihnachtsmarkt 2026</span>
          <span className="text-gray-300">|</span>
          <span className="text-[11px] text-gray-600">40 Stands</span>
        </div>

        {/* Viewport container */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-full aspect-square max-h-[760px] cursor-grab active:cursor-grabbing flex items-center justify-center overflow-hidden touch-none"
        >
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.12s ease-out',
            }}
            className="w-full h-full relative"
          >
            <svg
              viewBox="0 0 1000 1000"
              className="w-full h-full block"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Background grid pattern */}
                <pattern id="wmGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E6DFCE" strokeWidth="1" strokeDasharray="3,3" />
                </pattern>

                {/* Booth drop shadow */}
                <filter id="boothShadow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.25" />
                </filter>

                {/* Stand selection glow */}
                <filter id="selectionGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#DC2626" floodOpacity="0.85" />
                </filter>
              </defs>

              {/* 1. Base Cream Canvas */}
              <rect x="0" y="0" width="1000" height="1000" fill="#FAF7EE" />
              <rect x="20" y="20" width="960" height="960" fill="url(#wmGrid)" />

              {/* Outer decorative perimeter border */}
              <rect
                x="20"
                y="20"
                width="960"
                height="960"
                fill="none"
                stroke="#475569"
                strokeWidth="2.5"
                rx="8"
              />

              {/* 2. FESTIVE BANNER & TITLE (WIENACHTSMARKT) */}
              <g id="topBanner">
                {/* Pine branch decorations on top */}
                <path
                  d="M 280,60 Q 400,30 500,45 Q 600,30 720,60"
                  fill="none"
                  stroke="#166534"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <circle cx="350" cy="50" r="5" fill="#DC2626" />
                <circle cx="430" cy="42" r="5" fill="#EAB308" />
                <circle cx="500" cy="38" r="7" fill="#DC2626" />
                <circle cx="570" cy="42" r="5" fill="#EAB308" />
                <circle cx="650" cy="50" r="5" fill="#DC2626" />

                {/* Main Festive Ribbon Frame */}
                <rect
                  x="300"
                  y="60"
                  width="400"
                  height="45"
                  rx="10"
                  fill="#B91C1C"
                  stroke="#7F1D1D"
                  strokeWidth="2"
                  filter="url(#boothShadow)"
                />
                <text
                  x="500"
                  y="92"
                  textAnchor="middle"
                  fontSize="24"
                  fontWeight="900"
                  letterSpacing="4"
                  fill="#FFFFFF"
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  WEIHNACHTSMARKT
                </text>
              </g>

              {/* 3. DIAGONAL "TRIBUNA" (Exact original reproduction: single diagonal line and text from image) */}
              <g id="tribuna" pointerEvents="none">
                <line
                  x1="288"
                  y1="392"
                  x2="512"
                  y2="648"
                  stroke="#153E2C"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <text
                  x="396"
                  y="508"
                  transform="rotate(48.8 396 508)"
                  textAnchor="middle"
                  fontSize="14"
                  fontWeight="900"
                  letterSpacing="3"
                  fill="#153E2C"
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  TRIBUNA
                </text>
              </g>

              {/* 4. LEGEND BOX (Upper Right) */}
              <g id="legendBox" transform="translate(730, 130)">
                <rect
                  x="0"
                  y="0"
                  width="225"
                  height="265"
                  rx="12"
                  fill="#FFFFFF"
                  stroke="#CBD5E1"
                  strokeWidth="2"
                  filter="url(#boothShadow)"
                />
                <text
                  x="112"
                  y="26"
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="bold"
                  fill="#1E293B"
                  letterSpacing="1"
                >
                  REFERENCIA DEL PLANO
                </text>
                <line x1="15" y1="36" x2="210" y2="36" stroke="#E2E8F0" strokeWidth="1" />

                {/* Item 1: Comida sin parrilla (Celeste) */}
                <rect x="20" y="50" width="22" height="22" rx="4" fill="#38BDF8" stroke="#0284C7" strokeWidth="1.5" />
                <text x="52" y="66" fontSize="11" fontWeight="bold" fill="#0F172A">
                  Comida sin parrilla
                </text>

                {/* Item 2: Comida con parrilla (Naranja) */}
                <rect x="20" y="84" width="22" height="22" rx="4" fill="#F97316" stroke="#C2410C" strokeWidth="1.5" />
                <text x="52" y="100" fontSize="11" fontWeight="bold" fill="#0F172A">
                  Comida con parrilla
                </text>

                {/* Item 3: Artesanal (Amarillo) */}
                <rect x="20" y="118" width="22" height="22" rx="4" fill="#FACC15" stroke="#CA8A04" strokeWidth="1.5" />
                <text x="52" y="134" fontSize="11" fontWeight="bold" fill="#0F172A">
                  Artesanal
                </text>

                {/* Item 4: Juegos (Verde) */}
                <rect x="20" y="152" width="22" height="22" rx="4" fill="#4ADE80" stroke="#16A34A" strokeWidth="1.5" />
                <text x="52" y="168" fontSize="11" fontWeight="bold" fill="#0F172A">
                  Juegos
                </text>

                {/* Item 5: Libre / Disponible (Blanco) */}
                <rect x="20" y="186" width="22" height="22" rx="4" fill="#FFFFFF" stroke="#475569" strokeWidth="1.5" />
                <text x="52" y="202" fontSize="11" fontWeight="bold" fill="#0F172A">
                  Libre / Disponible
                </text>

                {/* Item 6: Reservado (Rojo) */}
                <rect x="20" y="220" width="22" height="22" rx="4" fill="#DC2626" stroke="#991B1B" strokeWidth="1.5" />
                <text x="52" y="236" fontSize="11" fontWeight="bold" fill="#DC2626">
                  Reservado
                </text>
              </g>

              {/* 5. DIRECTIONAL GUIDE LABELS */}
              <g id="directionalLabels">
                {/* Stand 20 -> Stand 1 Indicator */}
                <text
                  x="500"
                  y="960"
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="bold"
                  fill="#475569"
                  letterSpacing="1.5"
                >
                  ← STANDS 20 AL 1 (FILA HORIZONTAL INFERIOR)
                </text>

                {/* Stand 21 -> Stand 40 Indicator */}
                <text
                  x="60"
                  y="490"
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="bold"
                  fill="#475569"
                  letterSpacing="1.5"
                  transform="rotate(-90 60 490)"
                >
                  STANDS 21 AL 40 (COLUMNA VERTICAL) →
                </text>
              </g>

              {/* 7. RENDER THE 40 STAND SLOTS */}
              {BLUEPRINT_SLOTS.map((slot) => {
                const stand = standsByNumber.get(slot.numero);
                const visual = getSlotVisual(slot, stand);
                const isSelected = selectedSlotInfo?.numero === slot.numero;
                const isDimmed = selectedCategory !== 'all' && !visual.matchesFilter;

                return (
                  <g
                    key={`slot-${slot.numero}`}
                    onClick={() => handleSlotClick(slot, stand)}
                    className="cursor-pointer transition-opacity duration-150"
                    opacity={isDimmed ? 0.28 : 1}
                    filter={isSelected ? 'url(#selectionGlow)' : (isDimmed ? 'none' : 'url(#boothShadow)')}
                  >
                    {/* Stand Rectangle */}
                    <rect
                      x={slot.x}
                      y={slot.y}
                      width={slot.width}
                      height={slot.height}
                      rx="3.5"
                      ry="3.5"
                      fill={visual.fill}
                      stroke={isSelected ? '#DC2626' : visual.stroke}
                      strokeWidth={isSelected ? 3 : 1.5}
                    />

                    {/* Subtle internal booth roof stripe */}
                    <rect
                      x={slot.x + 2}
                      y={slot.y + 2}
                      width={slot.width - 4}
                      height={Math.max(4, Math.floor(slot.height * 0.22))}
                      rx="1.5"
                      fill="#FFFFFF"
                      opacity="0.35"
                    />

                    {/* Number printed inside stand if large enough */}
                    <text
                      x={slot.x + slot.width / 2}
                      y={slot.y + slot.height / 2 + 4}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="900"
                      fill={visual.textFill}
                      fontFamily="ui-monospace, monospace"
                    >
                      {slot.numero}
                    </text>

                    {/* Stand Number Label alongside stand (exact blueprint numbering) */}
                    <text
                      x={slot.labelX}
                      y={slot.labelY}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight={isSelected ? '900' : 'bold'}
                      fill={isSelected ? '#DC2626' : '#1E293B'}
                      fontFamily="ui-monospace, monospace"
                    >
                      {slot.numero}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Footer info bar */}
        <div className="p-3 bg-white border-t border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-700">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
            <span className="font-semibold text-gray-900">
              {lang === 'de' ? 'Tippen Sie auf einen Stand, um Details zu sehen oder ihn anzufragen' : 'Toca cualquier stand para ver detalles o solicitar su alquiler'}
            </span>
          </div>
          <div className="text-[11px] text-gray-500">
            {lang === 'de' ? 'Offizieller Standplan' : 'Plano oficial'}
          </div>
        </div>
      </div>

      {/* 3. MODAL / POPUP: DETALLES DEL STAND Y CONFIRMACIÓN */}
      {selectedSlotInfo && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-red-700 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-sm font-mono">
                  #{selectedSlotInfo.numero}
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">
                    {activeStand?.Nombre || activeStand?.nombre || `Stand ${selectedSlotInfo.numero}`}
                  </h3>
                  <p className="text-xs text-red-100">
                    {selectedSlotInfo.type === 'row'
                      ? 'Fila horizontal inferior (Stands 1 - 20)'
                      : 'Columna vertical izquierda (Stands 21 - 40)'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleCloseModal}
                className="p-1 rounded-lg text-red-100 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {!activeStand ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center space-y-2">
                    <HelpCircle className="w-8 h-8 text-amber-500 mx-auto" />
                    <h4 className="text-sm font-bold text-gray-900">
                      {lang === 'de' ? 'Stand noch nicht aktiviert' : 'Stand aún no habilitado'}
                    </h4>
                    <p className="text-xs text-gray-700 leading-relaxed">
                      {lang === 'de'
                        ? `Platz #${selectedSlotInfo.numero} ist im Masterplan eingezeichnet, wurde jedoch von der Administration noch nicht freigegeben.`
                        : `El espacio #${selectedSlotInfo.numero} está contemplado en el plano físico del Weihnachtsmarkt, pero aún no ha sido habilitado por la administración.`}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>
                      {lang === 'de'
                        ? 'Nur verfügbare Stände können zur Miete angefragt werden.'
                        : 'Solo los stands disponibles pueden solicitarse para alquiler.'}
                    </span>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleCloseModal}
                      className="w-full py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition"
                    >
                      {lang === 'de' ? 'Schließen' : 'Cerrar'}
                    </button>
                  </div>
                </div>
              ) : (
                (() => {
                  const visual = getSlotVisual(selectedSlotInfo, activeStand || undefined);
                  const isAlquilado = visual.status === 'alquilado';

                  return (
                    <>
                      {/* Status Badge */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                        <span className="text-xs text-gray-600 font-medium">
                          {lang === 'de' ? 'Status' : 'Estado'}:
                        </span>
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                            isAlquilado
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : 'bg-green-100 text-green-800 border border-green-300'
                          }`}
                        >
                          {isAlquilado
                            ? lang === 'de' ? 'Reserviert' : 'Alquilado'
                            : lang === 'de' ? 'Verfügbar' : 'Disponible'}
                        </span>
                      </div>

                    {/* Category & Grill Info */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                        <span className="text-gray-500 block mb-1">
                          {lang === 'de' ? 'Kategorie' : 'Categoría'}
                        </span>
                        <span className="font-bold text-gray-900 text-sm">
                          {activeStand?.Categoria || activeStand?.categoria || (
                            selectedSlotInfo.defaultCat === 'Comida-Parrilla' || selectedSlotInfo.defaultCat === 'Comida-SinParrilla'
                              ? 'Comida'
                              : selectedSlotInfo.defaultCat === 'Artesanal'
                              ? 'Artesanal'
                              : selectedSlotInfo.defaultCat === 'Games'
                              ? 'Juegos'
                              : 'Libre'
                          )}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                        <span className="text-gray-500 block mb-1">
                          {lang === 'de' ? 'Modalität' : 'Modalidad'}
                        </span>
                        <div className="flex items-center gap-1 font-bold text-gray-900 text-xs">
                          {selectedSlotInfo.hasParrilla || activeStand?.tiene_parrilla ? (
                            <>
                              <Flame className="w-4 h-4 text-orange-600" />
                              <span className="text-orange-700">Con parrilla</span>
                            </>
                          ) : (
                            <span className="text-gray-700">Sin parrilla</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between text-xs">
                      <span className="text-gray-600 font-medium">{lang === 'de' ? 'Preis' : 'Precio'}:</span>
                      <span className="font-bold text-red-700 text-sm">
                        {activeStand && (activeStand.Precio || activeStand.precio)
                          ? `${activeStand.Precio || activeStand.precio} ${config.MONEDA || '$us'}`
                          : lang === 'de' ? 'Nach Vereinbarung' : 'A coordinar'}
                      </span>
                    </div>

                    {/* Prompt to request */}
                    {!isAlquilado ? (
                      <div className="p-4 rounded-xl bg-green-50 border border-green-200 space-y-3">
                        <div className="flex items-center gap-2 text-green-800">
                          <CheckCircle2 className="w-5 h-5 shrink-0 text-green-600" />
                          <h4 className="text-sm font-bold">
                            {lang === 'de'
                              ? 'Möchten Sie diesen Stand anfragen?'
                              : '¿Quieres solicitar el alquiler de este stand?'}
                          </h4>
                        </div>
                        <p className="text-xs text-green-700">
                          {lang === 'de'
                            ? 'Sie werden zum Anfrageformular mit diesem Stand weitergeleitet.'
                            : 'Al continuar se abrirá el formulario fijando este stand y su categoría correspondiente.'}
                        </p>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={handleCloseModal}
                            className="flex-1 py-2.5 px-4 rounded-xl bg-white hover:bg-gray-100 text-gray-700 font-bold text-xs border border-gray-300 transition"
                          >
                            {lang === 'de' ? 'Abbrechen' : 'Cancelar'}
                          </button>
                          <button
                            onClick={handleProceedRequest}
                            className="flex-1 py-2.5 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs shadow-sm transition active:scale-98 flex items-center justify-center gap-1.5"
                          >
                            <span>
                              {selectedCategory === 'all'
                                ? (lang === 'de' ? 'Mit dieser Kategorie fortfahren und anfragen' : 'Continuar con esta categoría y solicitar')
                                : (lang === 'de' ? 'Stand anfragen' : 'Solicitar este stand')}
                            </span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                        {lang === 'de'
                          ? 'Dieser Stand ist bereits vergeben.'
                          : 'Este stand ya se encuentra alquilado o reservado.'}
                      </div>
                    )}
                  </>
                );
              })())}
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL DE AVISO: STAND DE OTRA CATEGORÍA (Requisito 3) */}
      {mismatchedNotice && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-gray-200 overflow-hidden p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-2">
              <h4 className="text-sm font-bold text-gray-900 leading-snug">
                {lang === 'de'
                  ? 'Dieser Stand gehört zu einer anderen Kategorie. Ändern Sie Ihre Auswahl, um ihn anzufragen.'
                  : 'Este stand pertenece a otra categoría. Cambia tu selección para solicitarlo.'}
              </h4>
              <p className="text-xs text-gray-600">
                {lang === 'de'
                  ? `Stand #${mismatchedNotice.slotNumber} ist für "${mismatchedNotice.actualCategory}" eingeteilt.`
                  : `El Stand #${mismatchedNotice.slotNumber} corresponde a "${mismatchedNotice.actualCategory}".`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMismatchedNotice(null)}
              className="w-full py-2.5 px-4 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs transition active:scale-98"
            >
              {lang === 'de' ? 'Verstanden' : 'Entendido'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
