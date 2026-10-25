// Pinned CDN module: https://maplibre.org/maplibre-gl-js/docs/examples/display-a-map/
const version = "6.15.0";
const moduleUrl = `https://unpkg.com/maplibre-gl@${version}/dist/maplibre-gl.mjs`;
export type Coordinates = [number, number];
export interface MapInstance {
  remove(): void;
  getZoom(): number;
  on(event: "click", callback: (event: { lngLat: { lat: number; lng: number } }) => void): void;
  on(event: string, callback: () => void): void;
  addControl(control: unknown, position: string): void;
  easeTo(options: { center: Coordinates; zoom?: number }): void;
  fitBounds(bounds: Coordinates[], options: { padding: number; maxZoom: number }): void;
  resize(): void;
}
export interface MarkerInstance {
  setLngLat(coordinates: Coordinates): MarkerInstance;
  addTo(map: MapInstance): MarkerInstance;
  remove(): void;
}
export interface MapLibreModule {
  Map: new (options: Record<string, unknown>) => MapInstance;
  NavigationControl: new () => unknown;
  Marker: new (options: { element: HTMLElement; anchor: string }) => MarkerInstance;
}
let pending: Promise<MapLibreModule> | undefined;
export function loadMapLibre(): Promise<MapLibreModule> {
  if (!pending) {
    pending = Promise.all([
      new Promise<void>((resolve, reject) => {
        let link = document.querySelector<HTMLLinkElement>('link[data-maplibre-css]');
        if (link?.sheet) { resolve(); return; }
        if (!link) {
          link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = `https://unpkg.com/maplibre-gl@${version}/dist/maplibre-gl.css`;
          link.dataset.maplibreCss = "true";
          document.head.append(link);
        }
        link.addEventListener("load", () => resolve(), { once: true });
        link.addEventListener("error", () => { link?.remove(); reject(new Error("Map CSS failed")); }, { once: true });
      }),
      import(/* @vite-ignore */ moduleUrl) as Promise<MapLibreModule>,
    ]).then(([, library]) => library).catch((error: unknown) => { pending = undefined; throw error; });
  }
  return pending;
}
export const SF_CENTER: Coordinates = [-122.4194, 37.7749];
export const DEFAULT_STYLE = {
  version: 8,
  sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256,
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>', maxzoom: 19 } },
  layers: [{ id: "streets", type: "raster", source: "osm" }],
};
