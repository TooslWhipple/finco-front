"use client";

import { useCallback, useState } from "react";
import { MapContainer, type MapContainerProps } from "react-leaflet";

/**
 * `MapContainer` que crea un mapa nuevo cada vez que su pantalla vuelve a
 * mostrarse.
 *
 * Con `cacheComponents`, Next conserva las rutas visitadas dentro de `<Activity>`:
 * al ocultar una pantalla corre los cleanups (react-leaflet hace `map.remove()`)
 * pero conserva el estado y el DOM, y al volver atrás react-leaflet reutiliza la
 * instancia ya destruida (`appendChild` / `_leaflet_pos` de undefined, "Map
 * container is being reused by another instance").
 *
 * El mapa solo se pinta mientras el envoltorio está adjunto al documento: React
 * desengancha los refs al ocultar un `<Activity>` y los vuelve a enganchar al
 * mostrarlo, así que cada aparición monta un `MapContainer` limpio.
 *
 * Solo debe importarse desde módulos cargados con `dynamic(..., { ssr: false })`,
 * porque Leaflet accede a `window` al importarse.
 */
export function MapaLeaflet(props: MapContainerProps) {
  const [adjunto, setAdjunto] = useState(false);
  const engancharEnvoltorio = useCallback((nodo: HTMLDivElement | null) => {
    if (!nodo) return;
    setAdjunto(true);
    return () => setAdjunto(false);
  }, []);
  return (
    <div ref={engancharEnvoltorio} className="contents">
      {adjunto ? <MapContainer {...props} /> : null}
    </div>
  );
}
