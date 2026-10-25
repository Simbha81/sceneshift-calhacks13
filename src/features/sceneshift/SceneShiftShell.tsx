import { useMemo, useState, type ReactNode } from "react";
import type { EventCategory, LocalEvent } from "../../lib/event";
import { CATEGORY_LABELS, eventKey, eventTime, hasCoordinates, listingUrl } from "../../lib/eventDisplay";
import { eventAvailability, eventEnd, eventPhase, eventStateLabel } from "../../lib/eventLifecycle";
import { isMapVisible } from "../../lib/eventValidation";
import { EventMap } from "../map/EventMap";
import { useStoredList } from "./useStoredList";
import "./sceneshift.css";

type Tab = "map" | "discover" | "saved" | "add";
type DiscoverView = "interests" | "foryou" | "all";
const CATEGORIES = Object.keys(CATEGORY_LABELS) as EventCategory[];
const SHORT_LABELS: Record<EventCategory, string> = {
  "music-nightlife": "Music", "arts-culture": "Art", "markets-shopping": "Markets", "food-drink": "Food",
  "community-causes": "Community", "sports-outdoors": "Outdoors", "learning-hobbies": "Learn", "festivals-other": "Festivals",
};
const ICONS: Record<Tab, string> = {
  map: "M12 21C7 15.5 5 12.5 5 9.5a7 7 0 0 1 14 0c0 3-2 6-7 11.5ZM10 9.5a2 2 0 1 0 4 0a2 2 0 1 0-4 0",
  discover: "M4 10.5a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0-13 0M16 15.5L20.5 20",
  saved: "M6.5 3.5h11v17L12 16.5l-5.5 4Z",
  add: "M12 5v14M5 12h14",
};
const TAB_LABELS: Record<Tab, string> = { map: "Map", discover: "Discover", saved: "Saved", add: "Add event" };

export type SceneShiftShellProps = {
  events: LocalEvent[]; loading: boolean; connected: boolean; now: number;
  /** Flyer upload and moderator review. Passed in by App so it only mounts when Convex is connected. */
  addSlot?: ReactNode;
};

export function SceneShiftShell({ events, loading, connected, now, addSlot }: SceneShiftShellProps) {
  const [tab, setTab] = useState<Tab>("map");
  const [category, setCategory] = useState<"all" | EventCategory>("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(true);
  const [saved, setSaved] = useStoredList("sceneshift.saved");
  const [interests, setInterests] = useStoredList("sceneshift.interests");
  const [seen, setSeen] = useState<string[]>(saved);
  const [view, setView] = useState<DiscoverView>("foryou");
  const [query, setQuery] = useState("");

  const live = useMemo(() => events.filter(event => isMapVisible(event, now) && hasCoordinates(event)), [events, now]);
  const visible = useMemo(() => category === "all" ? live : live.filter(event => event.categories.includes(category)), [live, category]);
  const selected = visible.find(event => eventKey(event) === selectedKey) ?? null;
  const upNext = useMemo(() => {
    const rank = (event: LocalEvent) => { const phase = eventPhase(event, now); return phase === "ending-soon" ? 0 : phase === "live" ? 1 : 2; };
    return [...visible].sort((a, b) => rank(a) - rank(b) || Date.parse(a.startAt) - Date.parse(b.startAt));
  }, [visible, now]);
  const savedEvents = useMemo(() => live.filter(event => saved.includes(eventKey(event)))
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt)), [live, saved]);
  const newSaves = tab === "saved" ? 0 : saved.filter(key => !seen.includes(key)).length;

  function goTo(next: Tab) { setTab(next); if (next === "saved") setSeen(saved); }
  function toggleSave(event: LocalEvent) {
    const key = eventKey(event);
    const next = saved.includes(key) ? saved.filter(item => item !== key) : [...saved, key];
    setSaved(next);
    if (tab === "saved") setSeen(next);
  }
  function showOnMap(event: LocalEvent) { setCategory("all"); setSelectedKey(eventKey(event)); setSheetOpen(true); setTab("map"); }
  function toggleInterest(value: EventCategory) { setInterests(interests.includes(value) ? interests.filter(item => item !== value) : [...interests, value]); }

  const status = !connected ? "Local preview · Convex not configured" : loading ? "Connecting to Convex…"
    : `${live.length} live ${live.length === 1 ? "event" : "events"}`;
  const rowProps = (event: LocalEvent) => ({ event, now, saved: saved.includes(eventKey(event)), onOpen: () => showOnMap(event), onSave: () => toggleSave(event) });
  const forYou = live.filter(event => event.categories.some(value => interests.includes(value)));
  const needle = query.trim().toLowerCase();
  const searched = needle ? live.filter(event => [event.title, event.venueName ?? "", event.address ?? "", ...event.tags, ...event.categories.map(value => CATEGORY_LABELS[value])]
    .some(text => text.toLowerCase().includes(needle))) : live;

  return <div className="ss">
    <header className="ss-head"><h1>SceneShift</h1><p className="ss-pill" role="status">{status}</p></header>

    <section className="ss-tab ss-map-tab" hidden={tab !== "map"} aria-label="Map">
      <div className="ss-chips" role="group" aria-label="Scene filter">
        <button type="button" className="sb ss-chip" aria-pressed={category === "all"} onClick={() => { setCategory("all"); setSelectedKey(null); }}>All</button>
        {CATEGORIES.map(value => <button key={value} type="button" className="sb ss-chip" aria-pressed={category === value}
          onClick={() => { setCategory(value); setSelectedKey(null); }}>{SHORT_LABELS[value]}</button>)}
      </div>
      <div className="ss-map"><EventMap events={visible} selected={selected} onSelect={event => { setSelectedKey(eventKey(event)); setSheetOpen(true); }} now={now} /></div>
      <aside className="ss-sheet" data-open={sheetOpen} aria-live="polite">
        <button type="button" className="sb ss-grab" aria-expanded={sheetOpen} onClick={() => setSheetOpen(open => !open)}>
          <span className="ss-grab-bar" aria-hidden="true" /><span>{selected ? selected.title : "Happening now and next up"}</span><span aria-hidden="true">{sheetOpen ? "Hide ▾" : "Show ▴"}</span>
        </button>
        {sheetOpen && (selected ? <div className="ss-detail">
          <button type="button" className="sb ss-back" onClick={() => setSelectedKey(null)}>‹ Back to list</button>
          <Details event={selected} now={now} />
          <button type="button" className="sb ss-primary" aria-pressed={saved.includes(eventKey(selected))} onClick={() => toggleSave(selected)}>
            {saved.includes(eventKey(selected)) ? "Saved ✓ (tap to remove)" : "Save"}</button>
        </div> : <div>
          {loading && <p className="ss-note">Loading events…</p>}
          {!loading && upNext.length === 0 && <p className="ss-note">{events.length === 0 ? "No approved events yet. Real listings will appear here after collection and review." : "No events match this scene. Try another one."}</p>}
          {upNext.map(event => <EventRow key={eventKey(event)} {...rowProps(event)} />)}
          <p className="ss-legend">Pin glow: pink = happening now · amber = ending within 30 min · yellow = upcoming · grey × = reported sold out</p>
        </div>)}
      </aside>
    </section>

    <section className="ss-tab ss-scroll" hidden={tab !== "discover"} aria-label="Discover">
      <h2>Discover</h2>
      <div className="ss-seg" role="group" aria-label="Discover view">
        {([["interests", "My interests"], ["foryou", "For you"], ["all", "Explore all"]] as const).map(([value, label]) =>
          <button key={value} type="button" className="sb ss-seg-btn" aria-pressed={view === value} onClick={() => setView(value)}>{label}</button>)}
      </div>
      {view === "interests" && <div>
        <p className="ss-note">Pick the scenes you like. Saved on this device only, no account needed.</p>
        <div className="ss-chips ss-wrap">{CATEGORIES.map(value => <button key={value} type="button" className="sb ss-chip" aria-pressed={interests.includes(value)}
          onClick={() => toggleInterest(value)}>{CATEGORY_LABELS[value]}</button>)}</div>
        <button type="button" className="sb ss-primary" onClick={() => setView("foryou")}>See events for me</button>
      </div>}
      {view === "foryou" && <div>
        {interests.length === 0
          ? <p className="ss-note">Choose a few scenes first and this page will match events to them.<br /><button type="button" className="sb ss-primary" onClick={() => setView("interests")}>Pick my scenes</button></p>
          : forYou.length === 0 ? <p className="ss-note">No live events match your scenes right now. Check Explore all.</p>
          : <><p className="ss-note">Matched to: {interests.map(value => CATEGORY_LABELS[value as EventCategory] ?? value).join(", ")}</p>
            {forYou.map(event => <EventRow key={eventKey(event)} {...rowProps(event)} />)}</>}
      </div>}
      {view === "all" && <div>
        <input className="ss-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search events, venues, scenes…" aria-label="Search events" />
        {searched.length === 0 ? <p className="ss-note">{live.length === 0 ? "No live events yet." : "No matches. Try a venue or scene name."}</p>
          : searched.map(event => <EventRow key={eventKey(event)} {...rowProps(event)} />)}
      </div>}
    </section>

    <section className="ss-tab ss-scroll" hidden={tab !== "saved"} aria-label="Saved">
      <h2>Saved</h2>
      {savedEvents.length === 0
        ? <p className="ss-note">Nothing saved yet. Save events from the map or Discover and they will wait here.<br /><button type="button" className="sb ss-primary" onClick={() => goTo("discover")}>Find something</button></p>
        : <>{savedEvents.map(event => <EventRow key={eventKey(event)} {...rowProps(event)} />)}
          <p className="ss-note">Saved events leave this list once they end. Your list lives on this device only.</p></>}
    </section>

    <section className="ss-tab ss-scroll ss-add" hidden={tab !== "add"} aria-label="Add event">
      {addSlot ?? <p className="ss-note">Flyer upload needs a Convex connection. Set VITE_CONVEX_URL and restart the dev server.</p>}
    </section>

    <nav className="ss-nav" aria-label="Main">
      {(Object.keys(TAB_LABELS) as Tab[]).map(value => <button key={value} type="button" className="sb ss-nav-btn" aria-current={tab === value ? "page" : undefined} onClick={() => goTo(value)}>
        <span className="ss-nav-ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[value]} /></svg>
          {value === "saved" && newSaves > 0 && <span className="ss-count">{newSaves}</span>}</span>{TAB_LABELS[value]}</button>)}
    </nav>
  </div>;
}

function Status({ event, now }: { event: LocalEvent; now: number }) {
  const availability = eventAvailability(event, now);
  return <span className="ss-status-row"><span className="ss-status" data-phase={eventPhase(event, now)}>{eventStateLabel(event, now)}</span>
    {availability === "sold-out" && <span className="ss-status ss-sold">Reported sold out</span>}</span>;
}

function EventRow({ event, now, saved, onOpen, onSave }: { event: LocalEvent; now: number; saved: boolean; onOpen: () => void; onSave: () => void }) {
  return <div className="ss-row" data-availability={eventAvailability(event, now)}>
    <button type="button" className="sb ss-row-main" onClick={onOpen}>
      <span className="ss-dot" data-phase={eventPhase(event, now)} aria-hidden="true" />
      <span className="ss-row-text"><strong>{event.title}</strong><small>{eventTime(event)}</small>
        <small>{event.venueName || event.address || "Venue unconfirmed"}</small><Status event={event} now={now} /></span>
    </button>
    <button type="button" className="sb ss-save" aria-pressed={saved} aria-label={saved ? `Remove ${event.title} from saved` : `Save ${event.title}`} onClick={onSave}>{saved ? "★" : "☆"}</button>
  </div>;
}

function Details({ event, now }: { event: LocalEvent; now: number }) {
  const source = listingUrl(event.sourceUrl);
  const end = eventEnd(event);
  const availability = eventAvailability(event, now);
  const availabilitySource = listingUrl(event.availabilitySourceUrl);
  return <div className="ss-facts"><Status event={event} now={now} /><p>{event.description}</p><p>Starts {eventTime(event)}</p>
    {end && <p>{end.estimated ? "Estimated end" : "Ends"}: {eventTime({ ...event, startAt: new Date(end.timestamp).toISOString() })}
      {end.estimated && !event.estimatedEndAt ? " · based on a 3-hour duration; confirm with organizer" : ""}</p>}
    <p>{event.venueName}{event.venueName && event.address ? " · " : ""}{event.address}</p>
    <p>{event.priceType === "free" ? "Free" : event.priceType === "paid" ? "Paid · check original listing" : "Price unconfirmed"}</p>
    <p>{availability === "sold-out" ? "Reported sold out. Check the listing for waitlist or door availability." : availability === "available" ? "Tickets last reported available; check before traveling." : "Ticket availability unconfirmed."}</p>
    {availability !== "unknown" && availabilitySource && <p><a href={availabilitySource} target="_blank" rel="noopener noreferrer">Ticket status source ↗</a><br />
      <small>Checked {eventTime({ ...event, startAt: event.availabilityCheckedAt! })}</small></p>}
    {source ? <a href={source} target="_blank" rel="noopener noreferrer">View original listing ↗</a> : <p>Original listing unavailable.</p>}</div>;
}
