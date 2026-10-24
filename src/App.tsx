import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { listApproved } from "./lib/api";
import type { LocalEvent } from "./lib/event";
import { CATEGORY_LABELS, eventKey, eventTime, hasCoordinates, listingUrl } from "./lib/eventDisplay";
import { EventMap } from "./features/map/EventMap";
export function App({ connected }: { connected: boolean }) {
  return <main><header><span>CAL HACKS 13 · SCENESHIFT</span><h1>Find your next scene.</h1>
    <p>Explore San Francisco’s local culture, one event at a time.</p></header>
    {connected ? <LiveEvents /> : <Explore events={[]} loading={false} connected={false} />}
  </main>;
}
function LiveEvents() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const events = useQuery(listApproved, { now });
  return <Explore events={events ?? []} loading={events === undefined} connected />;
}
function Explore({ events, loading, connected }: { events: LocalEvent[]; loading: boolean; connected: boolean }) {
  const [category, setCategory] = useState("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const visible = useMemo(() => events.filter(event => hasCoordinates(event) &&
    (category === "all" || event.categories.some(value => value === category))), [events, category]);
  const selected = visible.find(event => eventKey(event) === selectedKey) ?? null;
  return <>
    <p className="badge" role="status">{!connected ? "Local preview · Convex not configured" : loading ? "Connecting to Convex…" : "Convex connected · approved events"}</p>
    <section className="explore" aria-labelledby="explore-heading">
      <div className="explore-toolbar"><div><h2 id="explore-heading">Explore nearby</h2>
        <p aria-live="polite">{loading ? "Loading events…" : `${visible.length} approved ${visible.length === 1 ? "event" : "events"}`}</p></div>
        <label>Category<select value={category} onChange={event => { setCategory(event.target.value); setSelectedKey(null); }}>
          <option value="all">All categories</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label></div>
      <EventMap events={visible} selected={selected} onSelect={event => setSelectedKey(eventKey(event))} />
      <div className="event-content"><div><h3>Events</h3>
        {!loading && visible.length === 0 && <p>{events.length === 0 ? "No approved events yet. Real listings will appear here after collection and review." : "No events match this category. Try another category."}</p>}
        <ul className="event-list">{visible.map(event => <li key={eventKey(event)}>
          <button type="button" className="event-card" aria-pressed={selectedKey === eventKey(event)} onClick={() => setSelectedKey(eventKey(event))}>
            <strong>{event.title}</strong><span>{eventTime(event)}</span><span>{event.venueName || event.address || "Venue unconfirmed"}</span>
          </button></li>)}</ul></div>
        <aside className="event-details" aria-live="polite"><h3>Event details</h3>
          {selected ? <EventDetails event={selected} /> : <p>Select a pin or an event to see its details and original source.</p>}
        </aside></div>
    </section>
  </>;
}
function EventDetails({ event }: { event: LocalEvent }) {
  const source = listingUrl(event.sourceUrl);
  return <><h4>{event.title}</h4><p>{event.description}</p><p>{eventTime(event)}</p>
    <p>{event.venueName}{event.venueName && event.address ? " · " : ""}{event.address}</p>
    <p>{event.priceType === "free" ? "Free" : event.priceType === "paid" ? "Paid · check original listing" : "Price unconfirmed"}</p>
    {source ? <a href={source} target="_blank" rel="noopener noreferrer">View original listing ↗</a> : <p>Original listing unavailable.</p>}</>;
}
