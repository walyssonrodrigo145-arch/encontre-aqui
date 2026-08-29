"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, Marker, TileLayer } from "leaflet";
import { Maximize2, Minimize2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Footprints, Map as MapIcon, Satellite } from "lucide-react";

const DEFAULT_CENTER: [number, number] = [-18.9123, -41.9496]; // Teófilo Otoni - MG

const PIN_HTML =
  '<div style="font-size:26px;line-height:1;filter:drop-shadow(0 3px 4px rgba(0,0,0,.35));">📍</div>';

function pinIcon(L: typeof import("leaflet")) {
  return L.divIcon({
    html: PIN_HTML,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

interface MapCanvasProps {
  lat: number;
  lng: number;
  /** se true, o pin pode ser arrastado e o mapa é clicável (seletor de local) */
  interactivePin?: boolean;
  onChange?: (lat: number, lng: number) => void;
  heightClass?: string;
}

/**
 * Canvas Leaflet compartilhado com:
 * - alternância de camada Mapa (OSM) ⇄ Satélite (Esri World Imagery)
 * - botão de tela cheia
 */
function MapCanvas({ lat, lng, interactivePin = false, onChange, heightClass = "h-64" }: MapCanvasProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const layersRef = useRef<{ osm: TileLayer; sat: TileLayer } | null>(null);
  const onChangeRef = useRef(onChange);

  const [satellite, setSatellite] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [streetView, setStreetView] = useState(false);
  const [svUrl, setSvUrl] = useState<string>();

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // inicialização única do mapa
  useEffect(() => {
    let disposed = false;
    void (async () => {
      const L = (await import("leaflet")).default;
      if (disposed || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, { scrollWheelZoom: false, keyboard: true }).setView([lat, lng], 15);

      const osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const sat = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Imagens &copy; Esri, Maxar, Earthstar Geographics",
          // a Esri não tem imagens acima do zoom 18 na maior parte do Brasil —
          // acima disso ela devolve "Map data not yet available". O Leaflet
          // amplia os tiles do zoom 18 (maxNativeZoom) em vez de pedir os que não existem.
          maxNativeZoom: 18,
          maxZoom: 19,
        },
      );

      layersRef.current = { osm, sat };

      const marker = L.marker([lat, lng], {
        draggable: interactivePin,
        interactive: interactivePin,
        icon: pinIcon(L),
      }).addTo(map);

      if (interactivePin) {
        const commit = (la: number, ln: number) => onChangeRef.current?.(la, ln);
        marker.on("dragend", () => {
          const p = marker.getLatLng();
          commit(p.lat, p.lng);
        });
        map.on("click", (e) => {
          marker.setLatLng(e.latlng);
          commit(e.latlng.lat, e.latlng.lng);
        });
      }

      mapRef.current = map;
      markerRef.current = marker;
    })();

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      layersRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // troca de camada (mapa/satélite)
  useEffect(() => {
    const layers = layersRef.current;
    const map = mapRef.current;
    if (!layers || !map) return;
    if (satellite) {
      map.removeLayer(layers.osm);
      layers.sat.addTo(map);
    } else {
      map.removeLayer(layers.sat);
      layers.osm.addTo(map);
    }
  }, [satellite]);

  // sincroniza posição externa (ex: "usar minha localização")
  useEffect(() => {
    mapRef.current?.setView([lat, lng], mapRef.current.getZoom() || 15);
    markerRef.current?.setLatLng([lat, lng]);
  }, [lat, lng]);

  // tela cheia
  useEffect(() => {
    setCanFullscreen(typeof shellRef.current?.requestFullscreen === "function");
    const onFsChange = () => {
      const active = document.fullscreenElement === shellRef.current;
      setIsFullscreen(active);
      // na tela cheia o scroll do mouse pode dar zoom (não há página para rolar)
      if (active) mapRef.current?.scrollWheelZoom?.enable();
      else mapRef.current?.scrollWheelZoom?.disable();
      // o layout muda de tamanho ao entrar/sair da tela cheia: recalcula o mapa
      // por vários frames até estabilizar e força o redesenho dos tiles
      const t0 = performance.now();
      const tick = () => {
        mapRef.current?.invalidateSize();
        if (performance.now() - t0 < 800) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      setTimeout(() => {
        mapRef.current?.eachLayer((l) => {
          if (typeof (l as TileLayer).redraw === "function") (l as TileLayer).redraw();
        });
      }, 300);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  /** "Andar" pelo mapa: frente/trás/lados com animação suave (estilo Google Maps) */
  const walk = (dx: number, dy: number) => {
    mapRef.current?.panBy([dx, dy], { animate: true, duration: 0.4 });
  };

  /** Street View do Google na posição atual do mapa.
   *  Usa a chave oficial (NEXT_PUBLIC_GOOGLE_MAPS_KEY) se configurada;
   *  sem chave, cai no embed clássico keyless. */
  const toggleStreetView = () => {
    if (streetView) {
      setStreetView(false);
      return;
    }
    const c = mapRef.current?.getCenter();
    const la = c ? c.lat : lat;
    const ln = c ? c.lng : lng;
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    setSvUrl(
      key
        ? `https://www.google.com/maps/embed/v1/streetview?key=${key}&location=${la},${ln}&language=pt-BR`
        : `https://maps.google.com/maps?q=&layer=c&cbll=${la},${ln}&cbp=11,0,0,0,0&output=svembed&hl=pt-BR`,
    );
    setStreetView(true);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void shellRef.current?.requestFullscreen().catch(() => {});
    }
  };

  const pill = (active: boolean) =>
    `inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow transition-all ${
      active
        ? "bg-[var(--primary)] text-white shadow-[var(--primary)]/30"
        : "bg-white/95 text-slate-600 hover:bg-white"
    }`;

  return (
    <div ref={shellRef} className={`relative z-0 ${isFullscreen ? "flex h-full w-full items-stretch bg-black p-2" : ""}`}>
      {/* ATENÇÃO: a className do container do Leaflet é estática de propósito — o React
          reescreve className em cada mudança e apagaria as classes que o Leaflet
          adiciona em tempo de execução (leaflet-container etc.), quebrando o mapa.
          O dimensionamento (h-56/h-64 vs h-full) fica nos wrappers. */}
      <div className={`relative w-full overflow-hidden rounded-xl border border-[var(--border)] ${isFullscreen ? "h-full" : heightClass}`}>
        <div ref={containerRef} className="h-full w-full" />

        {/* Street View do Google sobreposto ao mapa */}
        {streetView && svUrl && (
          <>
            <iframe
              src={svUrl}
              title="Street View"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 z-[15] h-full w-full border-0"
            />
            <span className="absolute bottom-1.5 right-2 z-[16] rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
              Street View &copy; Google · use as setas do Google para andar
            </span>
          </>
        )}

        {/* controles sobre o mapa */}
        <div className="absolute right-2 top-2 z-[20] flex flex-wrap items-center gap-1.5">
          <div className="flex overflow-hidden rounded-full border border-black/5 shadow">
            <button type="button" onClick={() => setSatellite(false)} className={pill(!satellite)} title="Mapa de ruas">
              <MapIcon size={12} /> Mapa
            </button>
            <button type="button" onClick={() => setSatellite(true)} className={pill(satellite)} title="Imagens de satélite">
              <Satellite size={12} /> Satélite
            </button>
          </div>
          <button
            type="button"
            onClick={toggleStreetView}
            className={pill(streetView)}
            title="Ver no Street View do Google (na posição atual do mapa)"
          >
            <Footprints size={12} /> Street View
          </button>
          {canFullscreen && (
            <button
              type="button"
              onClick={toggleFullscreen}
              className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white/95 text-slate-600 shadow transition hover:bg-white"
              title={isFullscreen ? "Sair da tela cheia" : "Ver em tela cheia"}
              aria-label={isFullscreen ? "Sair da tela cheia" : "Ver em tela cheia"}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          )}
        </div>

        {/* direcional: "andar" para frente/trás/lados */}
        <div className="absolute bottom-3 left-3 z-[20] grid grid-cols-3 gap-0.5 rounded-xl bg-white/95 p-1 shadow-lg">
          <span />
          <button
            type="button"
            onClick={() => walk(0, -140)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] active:scale-90"
            title="Andar para frente"
            aria-label="Andar para frente"
          >
            <ChevronUp size={16} />
          </button>
          <span />
          <button
            type="button"
            onClick={() => walk(-140, 0)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] active:scale-90"
            title="Andar para a esquerda"
            aria-label="Andar para a esquerda"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => walk(0, 140)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] active:scale-90"
            title="Andar para trás"
            aria-label="Andar para trás"
          >
            <ChevronDown size={16} />
          </button>
          <button
            type="button"
            onClick={() => walk(140, 0)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] active:scale-90"
            title="Andar para a direita"
            aria-label="Andar para a direita"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Mapa interativo para o prestador posicionar o ponto fixo (clique ou arraste o pin). */
export function MapPicker(props: { lat: number; lng: number; onChange: (lat: number, lng: number) => void }) {
  return <MapCanvas {...props} interactivePin heightClass="h-64" />;
}

/** Visualização pública somente-leitura do ponto fixo (com satélite e tela cheia). */
export function StaticMap({ lat, lng }: { lat: number; lng: number }) {
  return <MapCanvas lat={lat} lng={lng} interactivePin={false} heightClass="h-56" />;
}

export { DEFAULT_CENTER };
