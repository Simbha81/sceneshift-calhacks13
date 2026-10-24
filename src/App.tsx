import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { listApproved } from "./lib/api";
import type { LocalEvent } from "./lib/event";
import { CATEGORY_LABELS, eventKey, eventTime, hasCoordinates, listingUrl } from "./lib/eventDisplay";
import { EventMap } from "./features/map/EventMap";
import { isMapVisible } from "./lib/eventValidation";
import { ENDING_SOON_MS, eventAvailability, eventEnd, eventPhase, eventStateLabel } from "./lib/eventLifecycle";
export function App({ connected }: { connected: boolean }) {
  return <main><header><span>CAL HACKS 13 · SCENESHIFT</span><h1>Find your next scene.</h1>
    <p>Explore San Francisco’s local culture, one event at a time.</p></header>
    {connected ? <LiveEvents /> : <Explore events={[]} loading={false} connected={false} now={Date.now()} />}
  </main>;
}
function LiveEvents() {
  const [now, setNow] = useState(Date.now);
  const events = useQuery(listApproved, { now });
  useEffect(() => {
    const boundaries = (events ?? []).flatMap(event => {
      const end = eventEnd(event);
      return end ? [Date.parse(event.startAt), end.timestamp - ENDING_SOON_MS, end.timestamp] : [];
    }).filter(time => time > now);
    const next = Math.min(now + 60000, ...boundaries);
    const timer = setTimeout(() => setNow(Date.now()), Math.max(1, next - Date.now()));
    return () => clearTimeout(timer);
  }, [events, now]);
  useEffect(() => {
    const update = () => setNow(Date.now());
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => { window.removeEventListener("focus", update); document.removeEventListener("visibilitychange", update); };
  }, []);
  return <Explore events={events ?? []} loading={events === undefined} connected now={now} />;
}
function Explore({ events, loading, connected, now }: { events: LocalEvent[]; loading: boolean; connected: boolean; now: number }) {
  const [category, setCategory] = useState("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const visible = useMemo(() => events.filter(event => isMapVisible(event, now) && hasCoordinates(event) &&
    (category === "all" || event.categories.some(value => value === category))), [events, category, now]);
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
      <EventMap events={visible} selected={selected} onSelect={event => setSelectedKey(eventKey(event))} now={now} />
      <p className="map-legend">● Upcoming or live · ◷ Ending within 30 min · × Reported sold out (still selectable)</p>
      <div className="event-content"><div><h3>Events</h3>
        {!loading && visible.length === 0 && <p>{events.length === 0 ? "No approved events yet. Real listings will appear here after collection and review." : "No events match this category. Try another category."}</p>}
        <ul className="event-list">{visible.map(event => <li key={eventKey(event)}>
          <button type="button" className="event-card" data-availability={eventAvailability(event, now)} aria-pressed={selectedKey === eventKey(event)} onClick={() => setSelectedKey(eventKey(event))}>
            <strong>{event.title}</strong><span>{eventTime(event)}</span><span>{event.venueName || event.address || "Venue unconfirmed"}</span>
            <EventStatus event={event} now={now} />
          </button></li>)}</ul></div>
        <aside className="event-details" aria-live="polite"><h3>Event details</h3>
          {selected ? <EventDetails event={selected} now={now} /> : <p>Select a pin or an event to see its details and original source.</p>}
        </aside></div>
    </section>
  </>;
}
function EventStatus({ event, now }: { event: LocalEvent; now: number }) {
  const availability = eventAvailability(event, now);
  return <span className="status-row"><span className="event-status" data-phase={eventPhase(event, now)}>{eventStateLabel(event, now)}</span>
    {availability === "sold-out" && <span className="event-status sold-out-status">Reported sold out</span>}</span>;
}
function EventDetails({ event, now }: { event: LocalEvent; now: number }) {
  const source = listingUrl(event.sourceUrl);
  const end = eventEnd(event);
  const availability = eventAvailability(event, now);
  const availabilitySource = listingUrl(event.availabilitySourceUrl);
  return <><h4>{event.title}</h4><EventStatus event={event} now={now} /><p>{event.description}</p><p>Starts {eventTime(event)}</p>
    {end && <p>{end.estimated ? "Estimated end" : "Ends"}: {eventTime({ ...event, startAt: new Date(end.timestamp).toISOString() })}
      {end.estimated && !event.estimatedEndAt ? " · based on a 3-hour duration; confirm with organizer" : ""}</p>}
    <p>{event.venueName}{event.venueName && event.address ? " · " : ""}{event.address}</p>
    <p>{event.priceType === "free" ? "Free" : event.priceType === "paid" ? "Paid · check original listing" : "Price unconfirmed"}</p>
    <p>{availability === "sold-out" ? "Reported sold out. Check the listing for waitlist or door availability." : availability === "available" ? "Tickets last reported available; check before traveling." : "Ticket availability unconfirmed."}</p>
    {availability !== "unknown" && availabilitySource && <p><a href={availabilitySource} target="_blank" rel="noopener noreferrer">Ticket status source ↗</a><br />
      <small>Checked {eventTime({ ...event, startAt: event.availabilityCheckedAt! })}</small></p>}
    {source ? <a href={source} target="_blank" rel="noopener noreferrer">View original listing ↗</a> : <p>Original listing unavailable.</p>}</>;
}
