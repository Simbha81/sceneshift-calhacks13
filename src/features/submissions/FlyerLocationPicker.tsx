import { useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import { lookupFlyerAddress, type FlyerAddressMatch } from "../../lib/api";
import { DEFAULT_STYLE, SF_CENTER, loadMapLibre, type MapInstance, type MapLibreModule, type MarkerInstance } from "../map/maplibre";

type Point = { latitude: number; longitude: number };
export function FlyerLocationPicker({ address, token, point, disabled, onSelect }: {
  address: string; token: string; point: Point | null; disabled: boolean; onSelect: (point: Point) => void;
}) {
  const lookup = useAction(lookupFlyerAddress);
  const [matches, setMatches] = useState<FlyerAddressMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState("");
  const [mapError, setMapError] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapInstance | null>(null);
  const library = useRef<MapLibreModule | null>(null);
  const marker = useRef<MarkerInstance | null>(null);
  const current = useRef({ point, disabled, onSelect, address });
  current.current = { point, disabled, onSelect, address };
  const [mapReady, setMapReady] = useState(false);
  useEffect(() => { setMatches([]); setNotice(""); }, [address]);
  useEffect(() => {
    let disposed = false;
    let observer: ResizeObserver | undefined;
    loadMapLibre().then(lib => {
      if (disposed || !container.current) return;
      library.current = lib;
      const initial = current.current.point;
      const instance = new lib.Map({ container: container.current, style: import.meta.env.VITE_MAP_STYLE_URL || DEFAULT_STYLE,
        center: initial ? [initial.longitude, initial.latitude] : SF_CENTER, zoom: initial ? 16 : 12 });
      map.current = instance;
      instance.addControl(new lib.NavigationControl(), "top-right");
      instance.on("click", event => {
        if (current.current.disabled) return;
        const { lat: latitude, lng: longitude } = event.lngLat;
        if (latitude < 37.70 || latitude > 37.84 || longitude < -122.53 || longitude > -122.34) {
          setNotice("Choose a location in San Francisco."); return;
        }
        current.current.onSelect({ latitude, longitude });
        setNotice("Pin placed. Check the location, then confirm below.");
      });
      observer = new ResizeObserver(() => instance.resize());
      observer.observe(container.current);
      setMapReady(true);
    }).catch(() => { if (!disposed) setMapError("The location map could not load. Refresh to try again."); });
    return () => { disposed = true; observer?.disconnect(); marker.current?.remove(); marker.current = null; map.current?.remove(); map.current = null; };
  }, []);
  useEffect(() => {
    marker.current?.remove(); marker.current = null;
    if (!point || !mapReady || !map.current || !library.current) return;
    const element = document.createElement("div");
    element.className = "flyer-location-pin";
    element.textContent = "📍";
    element.setAttribute("aria-label", "Selected event location");
    marker.current = new library.current.Marker({ element, anchor: "bottom" }).setLngLat([point.longitude, point.latitude]).addTo(map.current);
    map.current.easeTo({ center: [point.longitude, point.latitude], zoom: 16 });
  }, [point?.latitude, point?.longitude, mapReady]);
  async function search() {
    const requestedAddress = address;
    setSearching(true); setNotice(""); setMatches([]);
    try {
      const results = await lookup({ moderatorToken: token, address: requestedAddress });
      if (current.current.address !== requestedAddress) return;
      setMatches(results);
      setNotice(results.length ? "Choose a match, then check its pin on the map." : "No street-address match found. Zoom in and tap the event's location on the map.");
    } catch { if (current.current.address === requestedAddress) setNotice("Address search could not complete. Try again or zoom in and tap the map to place a pin."); }
    finally { setSearching(false); }
  }
  return <section className="flyer-location-picker" aria-label="Event location">
    <strong>Find the event on the map</strong>
    <p>Search the street address above, or zoom in and tap the map to place or adjust the pin. For a street fair, choose its entrance or meeting point.</p>
    <button type="button" onClick={search} disabled={disabled || searching || !address.trim()}>{searching ? "Finding address…" : "Find address"}</button>
    {matches.map((match, i) => <button className="flyer-address-match" key={i} type="button" disabled={disabled} onClick={() => { onSelect(match); setNotice("Address selected. Check the pin, then confirm below."); }}>{match.label}</button>)}
    <div ref={container} className="flyer-location-map" aria-label="Tap map to choose event location" />
    {mapError && <p role="alert">{mapError}</p>}
    {notice && <p role="status">{notice}</p>}
    <small>Address matches: U.S. Census Bureau. Matches are approximate; confirm the venue on the map. Map data © OpenStreetMap contributors.</small>
  </section>;
}
