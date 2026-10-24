import { useEffect, useRef, useState } from "react";
import type { LocalEvent } from "../../lib/event";
import { eventKey, hasCoordinates } from "../../lib/eventDisplay";
import { DEFAULT_STYLE, loadMapLibre, SF_CENTER, type MapInstance } from "./maplibre";
import { eventAvailability, eventPhase, eventStateLabel } from "../../lib/eventLifecycle";

export function EventMap({ events, selected, onSelect, now }: {
  events: LocalEvent[]; selected: LocalEvent | null; onSelect: (event: LocalEvent) => void; now: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapInstance | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let instance: MapInstance | null = null;
    let resize: ResizeObserver | undefined;
    setReady(false); setError(null);
    void loadMapLibre().then((library) => {
      if (cancelled || !container.current) return;
      instance = new library.Map({ container: container.current,
        style: import.meta.env.VITE_MAP_STYLE_URL?.trim() || DEFAULT_STYLE,
        center: SF_CENTER, zoom: 11.5, minZoom: 8, maxZoom: 18, renderWorldCopies: false });
      map.current = instance;
      instance.addControl(new library.NavigationControl(), "top-right");
      instance.on("load", () => { if (!cancelled) { setReady(true); setError(null); } });
      instance.on("error", () => { if (!cancelled) setError("Some map resources could not load. Event details remain available below."); });
      resize = new ResizeObserver(() => instance?.resize());
      resize.observe(container.current);
    }).catch(() => { if (!cancelled) setError("The map could not start. Check your connection and WebGL support. Event details remain available below."); });
    return () => { cancelled = true; resize?.disconnect(); instance?.remove(); map.current = null; };
  }, [attempt]);
  useEffect(() => {
    if (!ready || !map.current) return;
    let cancelled = false;
    const markers: { remove(): void }[] = [];
    void loadMapLibre().then((library) => {
      if (cancelled || !map.current) return;
      for (const event of events) {
        if (!hasCoordinates(event)) continue;
        const button = document.createElement("button");
        const phase = eventPhase(event, now);
        const availability = eventAvailability(event, now);
        button.type = "button"; button.className = "event-pin";
        button.dataset.phase = phase; button.dataset.availability = availability;
        button.textContent = availability === "sold-out" ? "×" : phase === "ending-soon" ? "◷" : "●";
        const label = `View ${event.title} · ${eventStateLabel(event, now)}${availability === "sold-out" ? " · Reported sold out" : ""}`;
        button.setAttribute("aria-label", label); button.title = label;
        button.setAttribute("aria-pressed", String(selected !== null && eventKey(event) === eventKey(selected)));
        button.addEventListener("click", () => onSelectRef.current(event));
        markers.push(new library.Marker({ element: button, anchor: "center" }).setLngLat([event.longitude, event.latitude]).addTo(map.current));
      }
    });
    return () => { cancelled = true; markers.forEach((marker) => marker.remove()); };
  }, [events, ready, selected, now]);
  const selectedKey = selected ? eventKey(selected) : null;
  const latitude = selected?.latitude;
  const longitude = selected?.longitude;
  useEffect(() => {
    if (ready && typeof latitude === "number" && typeof longitude === "number") map.current?.easeTo({ center: [longitude, latitude], zoom: 14 });
  }, [selectedKey, latitude, longitude, ready]);
  function fitEvents() {
    const located = events.filter(hasCoordinates);
    if (located.length === 1) map.current?.easeTo({ center: [located[0].longitude, located[0].latitude], zoom: 14 });
    else if (located.length > 1) map.current?.fitBounds([
      [Math.min(...located.map(e => e.longitude)), Math.min(...located.map(e => e.latitude))],
      [Math.max(...located.map(e => e.longitude)), Math.max(...located.map(e => e.latitude))],
    ], { padding: 60, maxZoom: 15 });
    else map.current?.easeTo({ center: SF_CENTER, zoom: 11.5 });
  }
  return <div className="map-panel">
    <div className="map-toolbar"><span>San Francisco</span><button type="button" disabled={!ready} onClick={fitEvents}>Fit events</button></div>
    <div ref={container} className="event-map" role="region" aria-label="San Francisco event map" />
    {!ready && !error && <p className="map-notice" role="status">Loading map…</p>}
    {error && <div className="map-notice" role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt(v => v + 1)}>Retry map</button></div>}
  </div>;
}
