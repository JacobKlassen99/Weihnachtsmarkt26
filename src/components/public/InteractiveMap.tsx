import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Store,
  Info,
  CheckCircle2,
  UtensilsCrossed,
  Gift,
  Gamepad2,
  HelpCircle,
  AlertCircle,
  X,
  ChevronRight,
} from 'lucide-react';
import { Stand, Configuracion, Idioma } from '../../types';

interface InteractiveMapProps {
  stands: Stand[];
  config: Configuracion;
  lang: Idioma;
  selectedCategory: string; // 'Comida' | 'Artesanal' | 'Games' | 'all'
  onSelectCategory: (cat: string) => void;
  onRequestStand: (stand: Stand) => void;
}

// Canonical layout coordinates for the 34 reference stalls in a 1000x1000 viewBox.
// Left column: Stands 1 to 17 (top to bottom)
// Right column: Stands 18 to 34 (top to bottom)
export interface SlotCoord {
  numero: number;
  col: 'left' | 'right';
  x: number;
  y: number;
  width: number;
  height: number;
}

export const REFERENCE_SLOTS: SlotCoord[] = (() => {
  const slots: SlotCoord[] = [];
  const width = 38;
  const height = 36;
  const startY = 126;
  const endY = 786;
  const totalSlotsPerCol = 17;
  const stepY = (endY - startY) / (totalSlotsPerCol - 1); // 41.25px step

  // Left column: 1 to 17
  const leftX = 162;
  for (let i = 0; i < totalSlotsPerCol; i++) {
    slots.push({
      numero: i + 1,
      col: 'left',
      x: leftX,
      y: Math.round(startY + i * stepY),
      width,
      height,
    });
  }

  // Right column: 18 to 34
  const rightX = 642;
  for (let i = 0; i < totalSlotsPerCol; i++) {
    slots.push({
      numero: 18 + i,
      col: 'right',
      x: rightX,
      y: Math.round(startY + i * stepY),
      width,
      height,
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
  const [selectedSlotInfo, setSelectedSlotInfo] = useState<SlotCoord | null>(null);
  const [confirmPromptOpen, setConfirmPromptOpen] = useState(false);

  // Map real stands by their number (e.g. 1 -> Stand object)
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

  // Check how many real stands exist
  const existingRealStandsCount = stands.length;

  // Zoom handlers
  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.3, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.3, 0.8));
  };

  const handleResetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  // Mouse pan controls
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag with left click
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

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch gesture support: pan and pinch-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    } else if (e.touches.length === 2) {
      // Pinch to zoom start
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

  // Click on a stand / slot
  const handleSlotClick = useCallback(
    (slot: SlotCoord, stand?: Stand) => {
      setSelectedSlotInfo(slot);
      if (stand) {
        setActiveStand(stand);
        const isDisponible =
          String(stand.Estado || stand.estado).toUpperCase() === 'DISPONIBLE' ||
          String(stand.estado).toLowerCase() === 'disponible';
        const matchesCategory =
          selectedCategory === 'all' ||
          String(stand.Categoria || stand.categoria).toLowerCase() ===
            selectedCategory.toLowerCase();

        // If it's disponible and matches category, prepare confirm prompt
        if (isDisponible && matchesCategory) {
          setConfirmPromptOpen(true);
        } else {
          setConfirmPromptOpen(false);
        }
      } else {
        setActiveStand(null);
        setConfirmPromptOpen(false);
      }
    },
    [selectedCategory]
  );

  // Close modals
  const handleCloseModal = () => {
    setActiveStand(null);
    setSelectedSlotInfo(null);
    setConfirmPromptOpen(false);
  };

  const handleProceedRequest = () => {
    if (activeStand) {
      const standToRequest = activeStand;
      handleCloseModal();
      onRequestStand(standToRequest);
    }
  };

  // Helper to get color status of a real stand
  const getStandVisualStatus = useCallback(
    (stand: Stand) => {
      const estadoRaw = String(stand.Estado || stand.estado || '').toUpperCase();
      const isAlquilado =
        estadoRaw === 'ALQUILADO' ||
        estadoRaw === 'OCUPADO' ||
        estadoRaw === 'RESERVADO';

      if (isAlquilado) {
        return {
          type: 'alquilado',
          colorClass: 'bg-red-600 text-white border-red-700 shadow-sm',
          svgFill: '#DC2626',
          svgStroke: '#B91C1C',
          label: lang === 'de' ? 'Vermietet' : 'Alquilado',
        };
      }

      const standCat = String(stand.Categoria || stand.categoria || 'Comida').toLowerCase();
      const currentCat = selectedCategory.toLowerCase();
      const matchesCategory = selectedCategory === 'all' || standCat === currentCat;

      if (matchesCategory) {
        return {
          type: 'disponible',
          colorClass:
            'bg-green-600 text-white border-green-700 ring-2 ring-green-400 ring-offset-1 animate-pulse shadow-md',
          svgFill: '#16A34A',
          svgStroke: '#15803D',
          label: lang === 'de' ? 'Verfügbar' : 'Disponible',
        };
      } else {
        return {
          type: 'otra_categoria',
          colorClass: 'bg-gray-400 text-white border-gray-500 opacity-90',
          svgFill: '#9CA3AF',
          svgStroke: '#6B7280',
          label:
            lang === 'de'
              ? `Kategorie: ${stand.Categoria || stand.categoria}`
              : `Otra categoría (${stand.Categoria || stand.categoria})`,
        };
      }
    },
    [selectedCategory, lang]
  );

  return (
    <div className="space-y-4">
      {/* 1. Category Selector Toolbar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Store className="w-4 h-4 text-red-700" />
              <span>{lang === 'de' ? 'Kategorie auswählen' : 'Selecciona una categoría'}</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {lang === 'de'
                ? 'Wähle deine Kategorie, um verfügbare Stände hervorzuheben'
                : 'Filtra para ver los stands disponibles en color verde'}
            </p>
          </div>

          {/* Quick counts */}
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-800 font-semibold border border-red-200">
              {existingRealStandsCount === 1
                ? '1 stand confirmado'
                : `${existingRealStandsCount} stands confirmados`}
            </span>
          </div>
        </div>

        {/* Categories Button Row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'Comida', label: lang === 'de' ? 'Essen & Trinken' : 'Comida', icon: UtensilsCrossed },
            { id: 'Artesanal', label: lang === 'de' ? 'Handwerk' : 'Artesanal', icon: Gift },
            { id: 'Games', label: lang === 'de' ? 'Spiele' : 'Games', icon: Gamepad2 },
          ].map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory.toLowerCase() === cat.id.toLowerCase();
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition border active:scale-98 ${
                  isSelected
                    ? 'bg-red-700 text-white border-red-700 shadow-sm ring-2 ring-red-200'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* 2. Color Legend */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-3.5 h-3.5 rounded bg-green-600 border border-green-700 shadow-xs inline-block" />
              <span className="text-gray-800 font-semibold">
                {lang === 'de' ? 'Verfügbar' : 'Verde: Disponible'} ({selectedCategory})
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-3.5 h-3.5 rounded bg-red-600 border border-red-700 shadow-xs inline-block" />
              <span>{lang === 'de' ? 'Vermietet' : 'Rojo: Alquilado'}</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-3.5 h-3.5 rounded bg-gray-400 border border-gray-500 shadow-xs inline-block" />
              <span>{lang === 'de' ? 'Andere Kategorie' : 'Gris: Otra categoría'}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-gray-500">
            <Info className="w-3.5 h-3.5 text-gray-400" />
            <span>34 espacios de referencia</span>
          </div>
        </div>
      </div>

      {/* 3. Interactive Plan Canvas Container */}
      <div className="relative rounded-2xl border border-gray-200 bg-gray-100 overflow-hidden shadow-inner select-none">
        {/* Floating Zoom & Pan Controls */}
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5 bg-white/90 backdrop-blur-md p-1.5 rounded-xl border border-gray-200 shadow-md">
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

        {/* Distribution Indicator Tag */}
        <div className="absolute top-3 left-3 z-20 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-gray-200 text-xs text-gray-700 shadow-xs pointer-events-none flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          <span className="font-semibold text-gray-800">
            {lang === 'de' ? 'Plano Interactivo' : 'Plano de Stands'}
          </span>
          <span className="text-gray-400">|</span>
          <span className="text-[11px] text-gray-500">
            Izq: 1-17 · Der: 18-34
          </span>
        </div>

        {/* Viewport for pan & zoom */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-full aspect-square max-h-[750px] cursor-grab active:cursor-grabbing flex items-center justify-center overflow-hidden touch-none"
        >
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            }}
            className="w-full h-full relative"
          >
            {/* SVG Interactive Map */}
            <svg
              viewBox="0 0 1000 1000"
              className="w-full h-full block"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Grass gradient */}
                <linearGradient id="lawnGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7EAE32" />
                  <stop offset="50%" stopColor="#8EBD3A" />
                  <stop offset="100%" stopColor="#6C9A27" />
                </linearGradient>

                {/* Road gradient */}
                <linearGradient id="roadGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#55585B" />
                  <stop offset="100%" stopColor="#484A4D" />
                </linearGradient>

                {/* Path sand gradient */}
                <linearGradient id="sandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#E9D9BF" />
                  <stop offset="100%" stopColor="#DEC7A7" />
                </linearGradient>

                {/* Tree drop shadow */}
                <filter id="treeShadow" x="-20%" y="-20%" width="150%" height="150%">
                  <feDropShadow dx="3" dy="5" stdDeviation="4" floodOpacity="0.35" />
                </filter>

                {/* Booth drop shadow */}
                <filter id="boothShadow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="1" dy="2" stdDeviation="2.5" floodOpacity="0.25" />
                </filter>

                {/* Active Stand Glow */}
                <filter id="activeGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#22C55E" floodOpacity="0.8" />
                </filter>
              </defs>

              {/* 1. Surrounding Paved Street Frame */}
              <rect x="0" y="0" width="1000" height="1000" fill="url(#roadGradient)" />
              {/* Street curbs / crosswalks */}
              <rect x="0" y="0" width="1000" height="50" fill="#696D71" opacity="0.6" />
              <rect x="0" y="950" width="1000" height="50" fill="#696D71" opacity="0.6" />
              <rect x="0" y="0" width="50" height="1000" fill="#696D71" opacity="0.6" />
              <rect x="950" y="0" width="50" height="1000" fill="#696D71" opacity="0.6" />

              {/* Pedestrian crossing marks at corners */}
              <path d="M 85,115 L 115,85 M 95,125 L 125,95 M 105,135 L 135,105" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity="0.75" />
              <path d="M 885,85 L 915,115 M 875,95 L 905,125 M 865,105 L 895,135" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity="0.75" />

              {/* 2. Main Park Paved Perimeter with Rounded Corners */}
              <rect
                x="65"
                y="65"
                width="870"
                height="870"
                rx="60"
                ry="60"
                fill="#E8E5DD"
                stroke="#C6C1B5"
                strokeWidth="3"
              />

              {/* 3. Main Central Park Lawn */}
              <path
                d="M 120,120 Q 500,80 880,120 Q 920,500 880,880 Q 500,920 120,880 Q 80,500 120,120 Z"
                fill="url(#lawnGradient)"
              />

              {/* 4. Organic Winding Sandy Paths */}
              {/* Top winding path */}
              <path
                d="M 90,135 C 140,85 240,140 380,125 C 500,110 650,80 770,110 C 830,125 870,100 900,125"
                fill="none"
                stroke="url(#sandGradient)"
                strokeWidth="24"
                strokeLinecap="round"
              />
              {/* Bottom winding path */}
              <path
                d="M 100,860 C 180,900 320,860 480,880 C 620,895 760,860 880,875"
                fill="none"
                stroke="url(#sandGradient)"
                strokeWidth="26"
                strokeLinecap="round"
              />
              {/* Left outer winding path */}
              <path
                d="M 115,140 C 75,300 120,500 80,680 C 70,780 110,840 130,860"
                fill="none"
                stroke="url(#sandGradient)"
                strokeWidth="20"
                strokeLinecap="round"
              />
              {/* Right Vertical Avenue dividing left lawn & right lawn */}
              <path
                d="M 708,110 L 708,890"
                fill="none"
                stroke="url(#sandGradient)"
                strokeWidth="18"
                strokeLinecap="round"
              />
              {/* Right eastern curved path */}
              <path
                d="M 708,160 C 760,130 860,160 885,250 C 900,450 860,700 870,820 C 850,870 780,880 708,870"
                fill="none"
                stroke="url(#sandGradient)"
                strokeWidth="18"
                strokeLinecap="round"
              />

              {/* 5. Eastern Lawn Island (Far Right) */}
              <path
                d="M 722,180 C 780,170 860,190 870,300 C 880,500 870,720 860,830 C 800,845 740,830 722,810 Z"
                fill="#82B034"
                opacity="0.95"
              />

              {/* 6. Perimeter Trees & Foliage (Layered with drop shadows) */}
              {/* Top trees */}
              <g filter="url(#treeShadow)">
                <circle cx="295" cy="100" r="28" fill="#365C17" />
                <circle cx="340" cy="105" r="34" fill="#4B7722" />
                <circle cx="425" cy="160" r="22" fill="#5E8C2B" />
                <circle cx="525" cy="100" r="25" fill="#3D6419" />
                <circle cx="505" cy="135" r="22" fill="#517E23" />
                <circle cx="800" cy="135" r="30" fill="#375D18" />
                <circle cx="845" cy="175" r="38" fill="#497520" />
                <circle cx="865" cy="195" r="24" fill="#63932D" />
              </g>

              {/* Left trees */}
              <g filter="url(#treeShadow)">
                <circle cx="100" cy="335" r="32" fill="#355815" />
                <circle cx="115" cy="385" r="26" fill="#4C7821" />
                <circle cx="95" cy="480" r="28" fill="#588527" />
                <circle cx="105" cy="590" r="32" fill="#385F17" />
                <circle cx="85" cy="640" r="24" fill="#4B7722" />
                <circle cx="125" cy="720" r="26" fill="#64942E" />
                <circle cx="105" cy="880" r="36" fill="#3F681C" />
              </g>

              {/* Right trees */}
              <g filter="url(#treeShadow)">
                <circle cx="895" cy="340" r="30" fill="#365C17" />
                <circle cx="885" cy="390" r="26" fill="#4B7722" />
                <circle cx="895" cy="580" r="32" fill="#345714" />
                <circle cx="880" cy="650" r="24" fill="#528026" />
                <circle cx="905" cy="820" r="28" fill="#3C631A" />
                <circle cx="880" cy="860" r="25" fill="#4A7621" />
              </g>

              {/* Bottom trees */}
              <g filter="url(#treeShadow)">
                <circle cx="230" cy="900" r="30" fill="#375D18" />
                <circle cx="280" cy="895" r="26" fill="#4A7520" />
                <circle cx="400" cy="895" r="24" fill="#528126" />
                <circle cx="435" cy="905" r="27" fill="#335613" />
                <circle cx="510" cy="900" r="24" fill="#4D7922" />
                <circle cx="740" cy="895" r="32" fill="#365C17" />
                <circle cx="795" cy="890" r="26" fill="#4E7C25" />
              </g>

              {/* 7. Column Layout Title Headers (Clean Architectural Markers) */}
              <text
                x="181"
                y="108"
                textAnchor="middle"
                fontSize="11"
                fontWeight="bold"
                fill="#374151"
                letterSpacing="1"
              >
                STANDS 1 - 17
              </text>
              <text
                x="661"
                y="108"
                textAnchor="middle"
                fontSize="11"
                fontWeight="bold"
                fill="#374151"
                letterSpacing="1"
              >
                STANDS 18 - 34
              </text>

              {/* 8. RENDER THE 34 SLOTS (Stands 1 to 34) */}
              {REFERENCE_SLOTS.map((slot) => {
                const stand = standsByNumber.get(slot.numero);
                const hasRealRecord = Boolean(stand);
                const visual = stand ? getStandVisualStatus(stand) : null;
                const isSelected = selectedSlotInfo?.numero === slot.numero;

                return (
                  <g
                    key={`slot-${slot.numero}`}
                    onClick={() => handleSlotClick(slot, stand)}
                    className="cursor-pointer transition-transform duration-100"
                    style={{ outline: 'none' }}
                  >
                    {/* A. Reference Stall Base (Drawn on park ground) */}
                    <rect
                      x={slot.x}
                      y={slot.y}
                      width={slot.width}
                      height={slot.height}
                      rx="4"
                      ry="4"
                      fill="#F7F4EC"
                      stroke="#C8C0B2"
                      strokeWidth="1.5"
                      filter="url(#boothShadow)"
                    />

                    {/* Subtle roof ridge / booth frame accent */}
                    <rect
                      x={slot.x + 3}
                      y={slot.y + 3}
                      width={slot.width - 6}
                      height={slot.height - 6}
                      rx="2"
                      ry="2"
                      fill="#FFFFFF"
                      stroke="#E5E0D5"
                      strokeWidth="1"
                    />

                    {/* B. If REAL RECORD exists in Google Sheets: Render Interactive Colored Layer */}
                    {hasRealRecord && visual && (
                      <g filter={visual.type === 'disponible' ? 'url(#activeGlow)' : undefined}>
                        {/* Interactive Colored Tile */}
                        <rect
                          x={slot.x - 1}
                          y={slot.y - 1}
                          width={slot.width + 2}
                          height={slot.height + 2}
                          rx="5"
                          ry="5"
                          fill={visual.svgFill}
                          stroke={visual.svgStroke}
                          strokeWidth="2"
                        />

                        {/* Top decorative awning stripe */}
                        <rect
                          x={slot.x}
                          y={slot.y}
                          width={slot.width}
                          height="6"
                          rx="2"
                          fill="#FFFFFF"
                          opacity="0.3"
                        />

                        {/* Stand Number (Bold White) */}
                        <text
                          x={slot.x + slot.width / 2}
                          y={slot.y + slot.height / 2 + 5}
                          textAnchor="middle"
                          fontSize="13"
                          fontWeight="900"
                          fill="#FFFFFF"
                          fontFamily="ui-monospace, monospace"
                        >
                          {slot.numero}
                        </text>
                      </g>
                    )}

                    {/* C. If NO REAL RECORD in Google Sheets: Render clean reference placeholder */}
                    {!hasRealRecord && (
                      <g>
                        {/* Faint reference number */}
                        <text
                          x={slot.x + slot.width / 2}
                          y={slot.y + slot.height / 2 + 4}
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight="600"
                          fill="#A49D90"
                          fontFamily="ui-monospace, monospace"
                        >
                          {slot.numero}
                        </text>

                        {/* Subtle dash outline */}
                        <rect
                          x={slot.x}
                          y={slot.y}
                          width={slot.width}
                          height={slot.height}
                          rx="4"
                          ry="4"
                          fill="transparent"
                          stroke="#B8B0A2"
                          strokeWidth="1"
                          strokeDasharray="2,2"
                        />
                      </g>
                    )}

                    {/* D. Selection Highlight Ring */}
                    {isSelected && (
                      <rect
                        x={slot.x - 4}
                        y={slot.y - 4}
                        width={slot.width + 8}
                        height={slot.height + 8}
                        rx="7"
                        ry="7"
                        fill="transparent"
                        stroke="#B91C1C"
                        strokeWidth="3"
                        strokeDasharray="4,2"
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Informative Footer Bar inside the map */}
        <div className="p-3 bg-white border-t border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
            <span className="font-semibold text-gray-800">
              {lang === 'de' ? 'Tippe auf einen Stand' : 'Toca cualquier stand en el plano'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-gray-500">
            <span>Stand 1 confirmado en Sheets</span>
            <span>·</span>
            <span>Usa zoom o arrastra para mover</span>
          </div>
        </div>
      </div>

      {/* 4. MODAL / POPUP: DETALLES DEL STAND Y CONFIRMACIÓN DE SOLICITUD */}
      {selectedSlotInfo && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-red-700 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-sm font-mono">
                  #{selectedSlotInfo.numero}
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">
                    {activeStand
                      ? activeStand.Nombre || activeStand.nombre || `Stand ${selectedSlotInfo.numero}`
                      : `Espacio de Referencia #${selectedSlotInfo.numero}`}
                  </h3>
                  <p className="text-xs text-red-100">
                    {selectedSlotInfo.col === 'left' ? 'Columna Izquierda (1-17)' : 'Columna Derecha (18-34)'}
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

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* CASE A: Real Stand registered in Sheets */}
              {activeStand ? (
                <>
                  {/* Status Banner */}
                  {(() => {
                    const visual = getStandVisualStatus(activeStand);
                    return (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                        <span className="text-xs text-gray-600 font-medium">
                          {lang === 'de' ? 'Status' : 'Estado actual'}:
                        </span>
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                            visual.type === 'disponible'
                              ? 'bg-green-100 text-green-800 border border-green-300'
                              : visual.type === 'alquilado'
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : 'bg-gray-200 text-gray-700 border border-gray-300'
                          }`}
                        >
                          {visual.label}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Attributes Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                      <span className="text-gray-500 block mb-1">
                        {lang === 'de' ? 'Kategorie' : 'Categoría'}
                      </span>
                      <span className="font-bold text-gray-900 text-sm">
                        {activeStand.Categoria || activeStand.categoria}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                      <span className="text-gray-500 block mb-1">
                        {lang === 'de' ? 'Preis' : 'Precio'}
                      </span>
                      <span className="font-bold text-red-700 text-sm">
                        {activeStand.Precio !== undefined
                          ? `${activeStand.Precio} ${config.MONEDA || '$us'}`
                          : activeStand.precio !== undefined
                          ? `${activeStand.precio} ${config.MONEDA || '$us'}`
                          : '-'}
                      </span>
                    </div>
                  </div>

                  {/* Description if present */}
                  {(activeStand.Descripcion || activeStand.descripcion) && (
                    <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-200">
                      {activeStand.Descripcion || activeStand.descripcion}
                    </p>
                  )}

                  {/* PROMPT DE SOLICITUD REQUERIDO:
                      «¿Quieres solicitar el alquiler de este stand?» */}
                  {confirmPromptOpen ? (
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
                          ? 'Sie werden zum Anfrageformular weitergeleitet, um Ihren vollständigen Namen und Ihre Telefonnummer anzugeben.'
                          : 'Al continuar, se abrirá el formulario para ingresar tu nombre completo y teléfono.'}
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
                          <span>{lang === 'de' ? 'Stand anfragen' : 'Solicitar stand'}</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Explanation if stand cannot be requested */
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="font-semibold">
                          {String(activeStand.Estado || activeStand.estado).toUpperCase() === 'DISPONIBLE'
                            ? lang === 'de'
                              ? `Dieser Stand gehört zur Kategorie "${activeStand.Categoria || activeStand.categoria}". Wähle diese Kategorie aus, um ihn anzufragen.`
                              : `Este stand pertenece a "${activeStand.Categoria || activeStand.categoria}". Selecciona esa categoría arriba para solicitarlo.`
                            : lang === 'de'
                            ? 'Dieser Stand ist bereits vermietet und steht nicht zur Verfügung.'
                            : 'Este stand ya se encuentra alquilado o reservado.'}
                        </span>
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={handleCloseModal}
                          className="py-1.5 px-3 rounded-lg bg-white border border-amber-300 font-bold text-amber-900 text-xs hover:bg-amber-100 transition"
                        >
                          {lang === 'de' ? 'Schließen' : 'Entendido'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* CASE B: Reference slot not yet configured in Google Sheets */
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-center space-y-2">
                    <HelpCircle className="w-8 h-8 text-gray-400 mx-auto" />
                    <h4 className="text-sm font-bold text-gray-800">
                      {lang === 'de' ? 'Referenzplatz im Park' : 'Ubicación física en el parque'}
                    </h4>
                    <p className="text-xs text-gray-600">
                      {lang === 'de'
                        ? `Platz #${selectedSlotInfo.numero} ist im Masterplan eingezeichnet, wurde jedoch von der Administration in Google Sheets noch nicht aktiviert.`
                        : `El espacio #${selectedSlotInfo.numero} está delimitado en el plano físico del parque, pero aún no ha sido habilitado por Administración en Google Sheets.`}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>
                      {lang === 'de'
                        ? 'Sobald die Administration diesen Stand registriert, wird er automatisch mit seiner Kategorie und seinem Preis interaktiv verfügbar.'
                        : 'Cuando Administración cree este stand en el panel de control, aparecerá automáticamente con su categoría y precio listos para alquilar.'}
                    </span>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleCloseModal}
                      className="py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition"
                    >
                      {lang === 'de' ? 'Schließen' : 'Cerrar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
