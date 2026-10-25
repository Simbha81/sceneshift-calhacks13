import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { EventCategory, LocalEvent } from "../../lib/event";
import { CATEGORY_LABELS, eventKey, eventTime, hasCoordinates, listingUrl } from "../../lib/eventDisplay";
import { eventAvailability, eventEnd, eventPhase, eventStateLabel } from "../../lib/eventLifecycle";
import { isMapVisible } from "../../lib/eventValidation";
import { EventMap } from "../map/EventMap";
import { useStoredList } from "./useStoredList";
import { CATEGORY_COLORS, CATEGORY_ICON_PATHS } from "./categoryIcons";
import { NICHES, SAMPLE_MESSAGES, SAMPLE_NOTIFICATIONS, SAMPLE_PEOPLE, SAMPLE_SPOTS } from "./sampleData";
import "./sceneshift.css";

type Tab = "map" | "discover" | "saved" | "profile" | "add";
const NAV: Tab[] = ["map", "discover", "saved", "profile"];
const CATEGORIES = Object.keys(CATEGORY_LABELS) as EventCategory[];
const SHORT_LABELS: Record<EventCategory, string> = {
  "music-nightlife": "Music", "arts-culture": "Art", "markets-shopping": "Markets", "food-drink": "Food",
  "community-causes": "Community", "sports-outdoors": "Outdoors", "learning-hobbies": "Learn", "festivals-other": "Festivals",
};
const ICONS: Record<string, string> = {
  map: "M12 21C7 15.5 5 12.5 5 9.5a7 7 0 0 1 14 0c0 3-2 6-7 11.5ZM10 9.5a2 2 0 1 0 4 0a2 2 0 1 0-4 0",
  discover: "M4 10.5a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0-13 0M16 15.5L20.5 20",
  saved: "M6.5 3.5h11v17L12 16.5l-5.5 4Z",
  profile: "M8 8a4 4 0 1 0 8 0a4 4 0 1 0-8 0M4.5 20c.8-3.6 3.8-5.5 7.5-5.5s6.7 1.9 7.5 5.5",
  chat: "M4 5h16v11H9l-5 4Z",
  sliders: "M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6",
  bell: "M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15ZM10 21h4",
  plus: "M12 5v14M5 12h14",
};
const TAB_LABELS: Record<string, string> = { map: "Map", discover: "Discover", saved: "Saved", profile: "Profile" };
const SUGGESTIONS = ["free", "music", "market", "food", "art", "outdoors"];
const CHILL: EventCategory[] = ["arts-culture", "learning-hobbies", "food-drink", "markets-shopping", "community-causes"];

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
  const [nicheList, setNicheList] = useStoredList("sceneshift.niche");
  const [following, setFollowing] = useStoredList("sceneshift.sample.following");
  const [seen, setSeen] = useState<string[]>(saved);
  const [query, setQuery] = useState("");
  const [moreNiches, setMoreNiches] = useState(false);
  const [layer, setLayer] = useState<"events" | "spots">("events");
  const [heat, setHeat] = useState(true);
  const [account, setAccount] = useStoredList("sceneshift.account");
  const [theme, setTheme] = useStoredList("sceneshift.theme");
  const [nOff, setNOff] = useStoredList("sceneshift.sample.notif-off");
  const [linked, setLinked] = useStoredList("sceneshift.sample.linked");
  const [interests, setInterests] = useStoredList("sceneshift.interests");
  const [ratings, setRatings] = useStoredList("sceneshift.ratings");
  const [photos, setPhotos] = useStoredList("sceneshift.photos");
  const [phase, setPhase] = useState<"splash" | "onboard" | "app">("splash");
  const [obMode, setObMode] = useState<"signup" | "login">("signup");
  const [obType, setObType] = useState<"personal" | "business">("personal");
  const [obName, setObName] = useState("");
  const [obUser, setObUser] = useState("");
  const [overlay, setOverlay] = useState<null | "settings" | "dm">(null);
  const [thread, setThread] = useState<string | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [plan, setPlan] = useState<{ energy?: "chill" | "lively"; budget?: "free" | "any" }>({});

  useEffect(() => { const id = window.setTimeout(() => setPhase(account.length ? "app" : "onboard"), 1100); return () => window.clearTimeout(id); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const acct = { type: account[0] ?? "", name: account[1] ?? "", user: account[2] ?? "", bio: account[3] ?? "", vis: account[4] ?? "public" };
  const patchAccount = (patch: Partial<typeof acct>) => { const next = { ...acct, ...patch }; setAccount([next.type || "personal", next.name, next.user, next.bio, next.vis]); };
  const themeValue = theme[0] ?? "dark";
  const niche = NICHES.find(item => item.key === nicheList[0]) ?? null;
  const live = useMemo(() => events.filter(event => isMapVisible(event, now) && hasCoordinates(event)), [events, now]);
  const visible = useMemo(() => category === "all" ? live : live.filter(event => event.categories.includes(category)), [live, category]);
  const selected = visible.find(event => eventKey(event) === selectedKey) ?? null;
  const rank = (event: LocalEvent) => { const phase = eventPhase(event, now); return phase === "ending-soon" ? 0 : phase === "live" ? 1 : 2; };
  const byNext = (list: LocalEvent[]) => [...list].sort((a, b) => rank(a) - rank(b) || Date.parse(a.startAt) - Date.parse(b.startAt));
  const upNext = useMemo(() => byNext(visible), [visible, now]); // eslint-disable-line react-hooks/exhaustive-deps
  const savedEvents = useMemo(() => live.filter(event => saved.includes(eventKey(event)))
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt)), [live, saved]);
  const newSaves = tab === "saved" ? 0 : saved.filter(key => !seen.includes(key)).length;
  const nicheEvents = niche ? byNext(live.filter(event => event.categories.some(value => niche.categories.includes(value)))) : [];
  const needle = query.trim().toLowerCase();
  const searched = needle ? live.filter(event => [event.title, event.venueName ?? "", event.address ?? "", event.priceType === "free" ? "free" : "", ...event.tags, ...event.categories.map(value => CATEGORY_LABELS[value])]
    .some(text => text.toLowerCase().includes(needle.replace(/^#/, "")))) : [];
  const planned = plan.energy && plan.budget ? byNext(live.filter(event => {
    const chill = event.categories.some(value => CHILL.includes(value));
    return (plan.energy === "chill" ? chill : !chill || event.categories.includes("music-nightlife")) && (plan.budget === "any" || event.priceType === "free");
  })).slice(0, 3) : [];
  const orderedNiches = niche ? [niche, ...NICHES.filter(item => item.key !== niche.key)] : NICHES;
  const shownNiches = moreNiches ? orderedNiches : orderedNiches.slice(0, 3);

  function goTo(next: Tab) { setTab(next); setNotifOpen(false); if (next === "saved") setSeen(saved); }
  function toggleSave(event: LocalEvent) {
    const key = eventKey(event);
    const next = saved.includes(key) ? saved.filter(item => item !== key) : [...saved, key];
    setSaved(next);
    if (tab === "saved") setSeen(next);
  }
  function showOnMap(event: LocalEvent) { setCategory("all"); setSelectedKey(eventKey(event)); setSheetOpen(true); setTab("map"); }
  function saveRating(key: string, stars: number, tags: string[]) {
    const rest = ratings.filter(item => !item.startsWith(`${key}::`));
    setRatings(stars > 0 ? [...rest, `${key}::${stars}::${tags.join(",")}`] : rest);
  }
  async function addPhoto(id: string, file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const url = await shrinkImage(file);
      setPhotos([...photos, `${id}||${url}`].slice(-24));
    } catch { /* storage full or unreadable image: ignore */ }
  }
  function removePhoto(entry: string) { setPhotos(photos.filter(item => item !== entry)); }
  const photoProps = (id: string) => ({ id, entries: photos.filter(item => item.startsWith(`${id}||`)), onAdd: (file: File | undefined) => void addPhoto(id, file), onRemove: removePhoto });
  function pickNiche(key: string) { setNicheList(niche?.key === key ? [] : [key]); }
  function toggleFollow(id: string) { setFollowing(following.includes(id) ? following.filter(item => item !== id) : [...following, id]); }

  const status = !connected ? "Local preview · Convex not configured" : loading ? "Connecting to Convex…"
    : `${live.length} live ${live.length === 1 ? "event" : "events"}`;
  const rowProps = (event: LocalEvent) => ({ event, now, saved: saved.includes(eventKey(event)), onOpen: () => showOnMap(event), onSave: () => toggleSave(event) });
  const savedDays = new Map<string, LocalEvent[]>();
  for (const event of savedEvents) { const day = eventTime(event).split(",").slice(0, 2).join(","); savedDays.set(day, [...(savedDays.get(day) ?? []), event]); }
  const bell = <button type="button" className="sb ss-ic" aria-label="Notifications (sample)" onClick={() => setNotifOpen(true)}><Svg d={ICONS.bell} /><span className="ss-nbadge" /></button>;

  if (phase === "splash") return <div className="ss ss-splash" data-theme={themeValue} role="status" aria-label="Loading SceneShift">
    <svg viewBox="0 0 120 140" width="64" height="75" aria-hidden="true"><path d="M60 8C30 8 12 30 12 54c0 32 48 74 48 74s48-42 48-74C108 30 90 8 60 8Z" fill="#FFD84D" /><circle cx="60" cy="54" r="30" fill="#FFF6D0" /><path d="M38 60Q49 48 60 60T82 60" stroke="#2BB3A3" strokeWidth="7" fill="none" strokeLinecap="round" /><circle cx="60" cy="40" r="8" fill="#FF9F43" /></svg></div>;
  if (phase === "onboard") {
    const ready = obMode === "login" ? obUser.trim().length > 1 : obName.trim().length > 0 && obUser.trim().length > 1;
    const handle = (value: string) => value.trim().replace(/^@?/, "@");
    return <div className="ss ss-onb" data-theme={themeValue}><div className="ss-onb-in">
      <h1>SceneShift</h1><p className="ss-sub">Find what is happening in San Francisco.</p>
      <div className="ss-seg" role="group" aria-label="Sign up or log in">
        <button type="button" className="sb" aria-pressed={obMode === "signup"} onClick={() => setObMode("signup")}>Sign up</button>
        <button type="button" className="sb" aria-pressed={obMode === "login"} onClick={() => setObMode("login")}>Log in</button></div>
      {obMode === "signup" && <><p className="ss-lbl">I am joining as</p>
        <div className="ss-opts">
          <button type="button" className="sb ss-opt" aria-pressed={obType === "personal"} style={{ background: "#CFE6BE" }} onClick={() => setObType("personal")}>Personal<small>Find and host events</small></button>
          <button type="button" className="sb ss-opt" aria-pressed={obType === "business"} style={{ background: "#FFE7A6" }} onClick={() => setObType("business")}>Business<small>Venue or organizer</small></button></div></>}
      {obMode === "signup" && <input className="ss-fld" value={obName} onChange={event => setObName(event.target.value)} placeholder={obType === "business" ? "Business or organization name" : "Your name"} aria-label="Name" />}
      <input className="ss-fld" value={obUser} onChange={event => setObUser(event.target.value)} placeholder="@username" aria-label="Username" autoCapitalize="none" />
      <button type="button" className="sb ss-primary" disabled={!ready} onClick={() => { setAccount([obMode === "login" ? "personal" : obType, obName.trim() || handle(obUser).slice(1), handle(obUser), "", "public"]); setPhase("app"); }}>
        {obMode === "login" ? "Log in" : "Create account"}</button>
      <button type="button" className="sb ss-ghost" onClick={() => { setAccount(["guest", "Guest", "", "", "private"]); setPhase("app"); }}>Continue as guest</button>
      <p className="ss-note ss-concept-block">Concept preview · no password, email or server. Your choices stay on this device. The working app needs no login, so guests can use everything.</p>
    </div></div>;
  }

  return <div className="ss" data-tab={tab} data-theme={themeValue}>
    <section className="ss-tab ss-map-tab" hidden={tab !== "map"} aria-label="Map">
      <div className="ss-chips" role="group" aria-label="Scene filter">
        <button type="button" className="sb ss-chip" aria-pressed={category === "all"} style={{ "--cc": "#7ED6C9" } as React.CSSProperties} onClick={() => { setCategory("all"); setSelectedKey(null); }}>
          <Svg d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" size={18} /> All</button>
        {CATEGORIES.map(value => <button key={value} type="button" className="sb ss-chip" aria-pressed={category === value} style={{ "--cc": CATEGORY_COLORS[value] } as React.CSSProperties}
          onClick={() => { setCategory(value); setSelectedKey(null); }}><CatIcon category={value} />{SHORT_LABELS[value]}</button>)}
      </div>
      <div className="ss-controls">
        <div className="ss-seg" role="group" aria-label="Map layer">
          <button type="button" className="sb" aria-pressed={layer === "events"} onClick={() => setLayer("events")}>Events</button>
          <button type="button" className="sb" aria-pressed={layer === "spots"} onClick={() => setLayer("spots")}>Spots</button></div>
        <button type="button" className="sb ss-heat" aria-pressed={heat} aria-label="Glow on map: shows where events cluster. Tap to turn on or off" onClick={() => setHeat(on => !on)}><span className="ss-heatdot" /></button>
        <button type="button" className="sb ss-pillbtn" onClick={() => goTo("add")}><Svg d={ICONS.plus} size={16} /> Add event</button>
      </div>
      <div className="ss-map" data-heat={heat} data-layer={layer}><EventMap events={layer === "events" ? visible : []} selected={selected} onSelect={event => { setSelectedKey(eventKey(event)); setSheetOpen(true); }} now={now} /><Weather /></div>
      <aside className="ss-sheet" data-open={sheetOpen} aria-live="polite">
        <button type="button" className="sb ss-grab" aria-expanded={sheetOpen} onClick={() => setSheetOpen(open => !open)}>
          <span className="ss-grab-bar" aria-hidden="true" /><span>{layer === "spots" ? "Photo and sunset spots" : selected ? selected.title : "Trending events right now"}</span><span aria-hidden="true">{sheetOpen ? "Hide ▾" : "Show ▴"}</span>
        </button>
        {sheetOpen && (layer === "spots" ? <div><p className="ss-note"><span className="ss-concept">Sample</span> Spots are a concept preview. Pins for spots come later; here are example places.</p>
          <div className="ss-hs ss-flush">{SAMPLE_SPOTS.map(spot => <SpotCard key={spot.name} spot={spot} photo={photoProps(`spot:${spot.name}`)} />)}</div></div> : selected ? <div className="ss-detail">
          <button type="button" className="sb ss-back" onClick={() => setSelectedKey(null)}>‹ Back to list</button>
          <Details event={selected} now={now} rating={parseRating(ratings, eventKey(selected))} onRate={(stars, tags) => saveRating(eventKey(selected), stars, tags)} photo={photoProps(`event:${eventKey(selected)}`)} />
          <button type="button" className="sb ss-primary" aria-pressed={saved.includes(eventKey(selected))} onClick={() => toggleSave(selected)}>
            {saved.includes(eventKey(selected)) ? "Saved ✓ (tap to remove)" : "Save"}</button>
        </div> : <div>
          {loading && <p className="ss-note">Loading events…</p>}
          {!loading && upNext.length === 0 && <p className="ss-note">{events.length === 0 ? "No approved events yet. Real listings will appear here after collection and review." : "No events match this scene. Try another one."}</p>}
          {upNext.map(event => <EventRow key={eventKey(event)} {...rowProps(event)} />)}
          <p className="ss-legend">{status} · Pin glow: pink = happening now · amber = ending within 30 min · yellow = upcoming · grey × = reported sold out</p>
        </div>)}
      </aside>
    </section>

    <section className="ss-tab ss-scroll" hidden={tab !== "discover"} aria-label="Discover">
      <div className="ss-pgh"><div><h1>Discover</h1><p>Search, tune your niche, plan a night</p></div></div>
      <label className="ss-sbar"><Svg d={ICONS.discover} size={18} />
        <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search events, venues, scenes…" aria-label="Search events" /></label>
      <div className="ss-hs" role="group" aria-label="Search suggestions">
        {SUGGESTIONS.map(word => <button key={word} type="button" className="sb ss-chip ss-chip-plain" onClick={() => setQuery(word)}>{word === "free" ? "#free" : word}</button>)}</div>
      {needle ? <div className="ss-sec"><h2>{searched.length ? `${searched.length} result${searched.length > 1 ? "s" : ""}` : "No matches"}</h2>
        {searched.length === 0 && <p className="ss-sub">Try free, music, market or a venue name.</p>}
        {searched.map(event => <EventRow key={eventKey(event)} {...rowProps(event)} />)}</div> : <>
        <div className="ss-sec"><h2>Your niche</h2><p className="ss-sub">Pick one and this page retunes for you. Saved on this device only.</p></div>
        <div className={moreNiches ? "ss-hs ss-grid" : "ss-hs"}>
          {shownNiches.map(item => <button key={item.key} type="button" className="sb ss-nc" aria-pressed={niche?.key === item.key} onClick={() => pickNiche(item.key)}>
            <span className="ss-em" style={{ background: CATEGORY_COLORS[item.icon] }}><CatIcon category={item.icon} size={20} /></span>{item.label}</button>)}
          <button type="button" className="sb ss-nc ss-more" aria-expanded={moreNiches} onClick={() => setMoreNiches(open => !open)}>
            <span className="ss-em ss-em-more"><span aria-hidden="true">•••</span></span>{moreNiches ? "Show less" : "More"}</button>
        </div>
        <div className="ss-sec"><h2>{niche ? `Picked for ${niche.label}` : "Trending events right now"}</h2>
          <p className="ss-sub">{niche ? `${niche.why}. Tap a card to see it on the map.` : "Choose a niche above to personalize this list."}</p>
          {(niche ? nicheEvents : byNext(live)).slice(0, niche ? 6 : 3).map(event => <EventRow key={eventKey(event)} {...rowProps(event)} />)}
          {live.length === 0 && <p className="ss-note">No live events yet.</p>}
          {niche && nicheEvents.length === 0 && live.length > 0 && <p className="ss-note">No live events match this niche right now.</p>}</div>
        <div className="ss-sec"><h2>Plan my night</h2><p className="ss-sub">Two taps. Matches real listings by scene and price.</p>
          <div className="ss-card">
            {!plan.energy ? <><h3>Energy tonight?</h3><div className="ss-opts">
              <button type="button" className="sb ss-opt" style={{ background: "#CFE6BE" }} onClick={() => setPlan({ energy: "chill" })}>Chill<small>Easy and mellow</small></button>
              <button type="button" className="sb ss-opt" style={{ background: "#FFC9C2" }} onClick={() => setPlan({ energy: "lively" })}>Lively<small>Loud and social</small></button></div></>
            : !plan.budget ? <><h3>Budget?</h3><div className="ss-opts">
              <button type="button" className="sb ss-opt" style={{ background: "#CFE6BE" }} onClick={() => setPlan({ ...plan, budget: "free" })}>Free only<small>Listed as free</small></button>
              <button type="button" className="sb ss-opt" style={{ background: "#FFE7A6" }} onClick={() => setPlan({ ...plan, budget: "any" })}>Any price<small>Show everything</small></button></div></>
            : <><h3>Your night: {plan.energy} · {plan.budget === "free" ? "free" : "any price"}</h3>
              {planned.length === 0 ? <p className="ss-note">Nothing live matches yet. Try different answers.</p> : planned.map(event => <EventRow key={eventKey(event)} {...rowProps(event)} />)}
              <button type="button" className="sb ss-primary" onClick={() => setPlan({})}>Start over</button></>}
          </div></div>
        <div className="ss-sec"><h2>Find friends <span className="ss-concept">Sample</span></h2><p className="ss-sub">Concept preview. There are no accounts yet, so these are example people.</p></div>
        <div className="ss-hs">{SAMPLE_PEOPLE.slice(3).map(person => <div key={person.id} className="ss-fcard">
          <span className="ss-avs" style={{ background: person.color }}>{person.name[0]}</span><b>{person.name}</b><small>{person.interests}</small>
          <button type="button" className="sb ss-fb" aria-pressed={following.includes(person.id)} onClick={() => toggleFollow(person.id)}>{following.includes(person.id) ? "Following" : "Follow"}</button></div>)}</div>
        <div className="ss-sec"><h2>Photo and sunset spots <span className="ss-concept">Sample</span></h2><p className="ss-sub">Illustrations are placeholders for real photos.</p></div>
        <div className="ss-hs">{SAMPLE_SPOTS.map(spot => <SpotCard key={spot.name} spot={spot} photo={photoProps(`spot:${spot.name}`)} />)}</div>
        <div style={{ height: 16 }} /></>}
    </section>

    <section className="ss-tab ss-scroll" hidden={tab !== "saved"} aria-label="Saved">
      <div className="ss-pgh"><div><h1>Saved</h1><p>Your week in San Francisco</p></div>{bell}</div>
      {savedEvents.length === 0
        ? <p className="ss-empty">Nothing saved yet.<br />Save events from the map or Discover and your week builds itself here.<br /><button type="button" className="sb ss-primary" onClick={() => goTo("discover")}>Find something</button></p>
        : <>{[...savedDays.entries()].map(([day, list]) => <div key={day} className="ss-sec"><h2>{day}</h2>{list.map(event => <EventRow key={eventKey(event)} {...rowProps(event)} />)}</div>)}
          <div className="ss-sec"><p className="ss-note">Saved events leave this list once they end. Your list lives on this device only.</p></div></>}
    </section>

    <section className="ss-tab ss-scroll" hidden={tab !== "profile"} aria-label="Profile">
      <div className="ss-pgh"><div><h1>Profile</h1></div><div className="ss-tb">{bell}
        <button type="button" className="sb ss-ic" aria-label="Messages (sample)" onClick={() => { setThread(null); setOverlay("dm"); }}><Svg d={ICONS.chat} /><span className="ss-nbadge" /></button>
        <button type="button" className="sb ss-ic" aria-label="Settings" onClick={() => setOverlay("settings")}><Svg d={ICONS.sliders} /></button></div></div>
      <p className="ss-concept ss-concept-block">Concept preview · profiles, messages and friends are not built yet</p>
      <div className="ss-hero"><span className="ss-av"><Svg d={ICONS.profile} size={40} /></span><h2>{acct.name || "Your name"}</h2>
        {acct.type === "business" && <span className="ss-concept">Business account</span>}
        <p>{acct.user || "@username"}</p><p>{acct.bio || "Add a short bio in settings."}</p></div>
      <div className="ss-stats"><div className="ss-stat"><b>{saved.length}</b><small>Saved</small></div>
        <div className="ss-stat"><b>{new Set(savedEvents.flatMap(event => event.categories)).size}</b><small>Scenes</small></div>
        <div className="ss-stat"><b>{ratings.length}</b><small>Rated</small></div></div>
      <div className="ss-sec"><h2>Friends going this week <span className="ss-concept">Sample</span></h2><p className="ss-sub">See what people you follow are up to. We never show follower counts.</p></div>
      <div className="ss-hs">{SAMPLE_PEOPLE.slice(0, 3).map(person => <div key={person.id} className="ss-fcard">
        <span className="ss-avs" style={{ background: person.color }}>{person.name[0]}</span><b>{person.name}</b><small>{person.interests}</small>
        <small className="ss-go">Going to an event (sample)</small></div>)}</div>
      <div className="ss-sec"><h2>People you may know <span className="ss-concept">Sample</span></h2>
        {SAMPLE_PEOPLE.slice(3).map(person => <div key={person.id} className="ss-li"><span className="ss-avs" style={{ background: person.color }}>{person.name[0]}</span>
          <span className="ss-grow"><b>{person.name}</b><small>{person.interests}</small></span>
          <button type="button" className="sb ss-fb" aria-pressed={following.includes(person.id)} onClick={() => toggleFollow(person.id)}>{following.includes(person.id) ? "Following" : "Follow"}</button></div>)}</div>
      <div className="ss-sec"><div className="ss-card"><h3>Hosting something? <span className="ss-concept">Concept</span></h3>
        <p className="ss-note">{acct.type === "business" ? "Business accounts will get venue pages, repeat events and a verified badge." : "Personal accounts can host too, like a neighborhood cat parade. Add the event with a flyer and a reviewer approves it before it reaches the map."}</p>
        <button type="button" className="sb ss-primary" onClick={() => goTo("add")}>Add an event with a flyer</button></div></div>
    </section>

    <section className="ss-tab ss-scroll ss-add" hidden={tab !== "add"} aria-label="Add event">
      <button type="button" className="sb ss-back" onClick={() => goTo("map")}>‹ Back to map</button>
      {addSlot ?? <p className="ss-note">Flyer upload needs a Convex connection. Set VITE_CONVEX_URL and restart the dev server.</p>}
    </section>

    {notifOpen && <section className="ss-ovl" aria-label="Notifications">
      <div className="ss-ovh"><button type="button" className="sb ss-back" onClick={() => setNotifOpen(false)}>‹ Back</button><span>Notifications</span><span style={{ width: 60 }} /></div>
      <div className="ss-ovb"><p className="ss-concept ss-concept-block">Sample notifications · concept. Real time changes and cancellations will come from approved-event updates later.</p>
        {SAMPLE_NOTIFICATIONS.filter(item => !nOff.includes(item.kind === "follow" ? "follow" : item.title.includes("cancel") ? "cancel" : "time")).map(item => <div key={item.id} className="ss-nit"><span className="ss-dt" aria-hidden="true" /><span className="ss-grow"><b>{item.title}</b><small>{item.sub}</small>
          {item.kind === "follow" && item.person && <button type="button" className="sb ss-fb" aria-pressed={following.includes(item.person)} onClick={() => toggleFollow(item.person!)}>{following.includes(item.person) ? "Accepted" : "Accept"}</button>}</span></div>)}</div>
    </section>}

    {overlay === "settings" && <section className="ss-ovl" aria-label="Settings">
      <div className="ss-ovh"><button type="button" className="sb ss-back" onClick={() => setOverlay(null)}>‹ Profile</button><span>Settings</span><span style={{ width: 60 }} /></div>
      <div className="ss-ovb ss-form">
        <input className="ss-fld" value={acct.name} onChange={event => patchAccount({ name: event.target.value })} placeholder="Your name" aria-label="Name" />
        <input className="ss-fld" value={acct.user} onChange={event => patchAccount({ user: event.target.value })} placeholder="@username" aria-label="Username" autoCapitalize="none" />
        <textarea className="ss-fld" rows={2} value={acct.bio} onChange={event => patchAccount({ bio: event.target.value })} placeholder="Short bio" aria-label="Bio" />
        <h3 className="ss-h3">WHO CAN SEE YOUR PROFILE</h3>
        <div className="ss-seg ss-seg-full" role="group" aria-label="Profile visibility">
          {(["public", "private"] as const).map(value => <button key={value} type="button" className="sb" aria-pressed={acct.vis === value} onClick={() => patchAccount({ vis: value })}>{value === "public" ? "Public" : "Private"}</button>)}</div>
        <p className="ss-note">{acct.vis === "public" ? "Public: anyone can find you and see your interests and saved events." : "Private: only people you approve can see your interests and saved events."} (Concept)</p>
        <h3 className="ss-h3">INTERESTS</h3>
        <div className="ss-wrapchips">{CATEGORIES.map(value => <button key={value} type="button" className="sb ss-chip" aria-pressed={interests.includes(value)} style={{ "--cc": CATEGORY_COLORS[value] } as React.CSSProperties}
          onClick={() => setInterests(interests.includes(value) ? interests.filter(item => item !== value) : [...interests, value])}><CatIcon category={value} />{SHORT_LABELS[value]}</button>)}</div>
        <h3 className="ss-h3">LINKED SOCIALS</h3>
        {["Instagram", "TikTok", "X", "LinkedIn"].map(name => <div key={name} className="ss-li"><span className="ss-grow"><b>{name}</b></span>
          <button type="button" className="sb ss-fb ss-green" aria-pressed={linked.includes(name)} onClick={() => setLinked(linked.includes(name) ? linked.filter(item => item !== name) : [...linked, name])}>{linked.includes(name) ? "Linked" : "Link"}</button></div>)}
        <h3 className="ss-h3">CONNECT WITH PEOPLE</h3>
        {SAMPLE_PEOPLE.slice(0, 3).map(person => <div key={person.id} className="ss-li"><span className="ss-avs" style={{ background: "#FFE9A8" }}><Svg d={ICONS.profile} size={22} /></span>
          <span className="ss-grow"><b>{person.name}</b><small>{person.interests.replace(" · ", ", ")}</small></span>
          <button type="button" className="sb ss-fb" aria-pressed={following.includes(person.id)} onClick={() => toggleFollow(person.id)}>{following.includes(person.id) ? "Connected" : "Connect"}</button></div>)}
        <h3 className="ss-h3">NOTIFICATIONS</h3>
        {([["follow", "Follow requests"], ["time", "Time changes"], ["cancel", "Cancellations"]] as const).map(([key, label]) => <div key={key} className="ss-li"><span className="ss-grow"><b>{label}</b></span>
          <button type="button" className="sb ss-fb" aria-pressed={!nOff.includes(key)} onClick={() => setNOff(nOff.includes(key) ? nOff.filter(item => item !== key) : [...nOff, key])}>{nOff.includes(key) ? "Off" : "On"}</button></div>)}
        <p className="ss-note">Choose which in-app alerts reach you. Event changes only come from events you saved. (Concept)</p>
        <h3 className="ss-h3">APPEARANCE</h3>
        <div className="ss-seg ss-seg-full" role="group" aria-label="Appearance">
          {(["light", "dark", "auto"] as const).map(value => <button key={value} type="button" className="sb" aria-pressed={themeValue === value} onClick={() => setTheme([value])}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div>
        <p className="ss-note">{themeValue === "dark" ? "Always dark." : themeValue === "light" ? "Always light." : "Follows your device setting."}</p>
        <button type="button" className="sb ss-ghost" onClick={() => { setAccount([]); setOverlay(null); setPhase("onboard"); }}>Sign out</button>
        <div style={{ height: 16 }} />
      </div></section>}

    {overlay === "dm" && <section className="ss-ovl" aria-label="Messages">
      <div className="ss-ovh"><button type="button" className="sb ss-back" onClick={() => thread ? setThread(null) : setOverlay(null)}>‹ {thread ? "Back" : "Profile"}</button>
        <span>{thread ? SAMPLE_PEOPLE.find(person => person.id === thread)?.name : "Messages"}</span><span style={{ width: 60 }} /></div>
      <div className="ss-ovb"><p className="ss-concept ss-concept-block">Sample messages · concept. Direct messages are not built.</p>
        {!thread ? SAMPLE_PEOPLE.slice(0, 3).map(person => { const last = SAMPLE_MESSAGES[person.id].at(-1); return <button key={person.id} type="button" className="sb ss-li ss-msg" onClick={() => setThread(person.id)}>
          <span className="ss-avs" style={{ background: person.color }}>{person.name[0]}</span><span className="ss-grow"><b>{person.name}</b><small>{last?.[1]}</small></span></button>; })
        : SAMPLE_MESSAGES[thread].map(([who, text], index) => <div key={index} className={who === "me" ? "ss-bub ss-me" : "ss-bub"}>{text}</div>)}
        {thread && <p className="ss-note">Replying is disabled in this preview.</p>}</div></section>}

    <nav className="ss-nav" aria-label="Main">
      {NAV.map(value => <button key={value} type="button" className="sb ss-nav-btn" aria-current={tab === value ? "page" : undefined} onClick={() => goTo(value)}>
        <span className="ss-nav-ic"><Svg d={ICONS[value]} size={22} />
          {value === "saved" && newSaves > 0 && <span className="ss-count">{newSaves}</span>}</span>{TAB_LABELS[value]}</button>)}
    </nav>
  </div>;
}

/** Real current conditions for San Francisco from Open-Meteo (no key, no account). Hidden if the request fails. */
function Weather() {
  const [wx, setWx] = useState<{ temp: number; aqi: number | null } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const get = (url: string) => fetch(url).then(response => response.ok ? response.json() as Promise<{ current?: Record<string, number> }> : Promise.reject(new Error("weather")));
    Promise.all([
      get("https://api.open-meteo.com/v1/forecast?latitude=37.7749&longitude=-122.4194&current=temperature_2m&temperature_unit=fahrenheit"),
      get("https://air-quality-api.open-meteo.com/v1/air-quality?latitude=37.7749&longitude=-122.4194&current=us_aqi").catch(() => null),
    ]).then(([forecast, air]) => {
      const temp = forecast.current?.temperature_2m;
      if (!cancelled && typeof temp === "number") setWx({ temp: Math.round(temp), aqi: typeof air?.current?.us_aqi === "number" ? Math.round(air.current.us_aqi) : null });
    }).catch(() => { /* weather is optional */ });
    return () => { cancelled = true; };
  }, []);
  if (!wx) return null;
  return <div className="ss-wx" aria-label={`Weather in San Francisco ${wx.temp} degrees${wx.aqi !== null ? `, air quality index ${wx.aqi}` : ""}`}>
    <Svg d="M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" size={16} /> <b>{wx.temp}°</b>{wx.aqi !== null && <span>AQI {wx.aqi}</span>}</div>;
}

function Svg({ d, size = 20 }: { d: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
}
function CatIcon({ category, size = 18 }: { category: string; size?: number }) {
  return <svg className="ss-ci" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={CATEGORY_ICON_PATHS[category]} /></svg>;
}

function Status({ event, now }: { event: LocalEvent; now: number }) {
  const availability = eventAvailability(event, now);
  return <span className="ss-status-row"><span className="ss-status" data-phase={eventPhase(event, now)}>{eventStateLabel(event, now)}</span>
    {availability === "sold-out" && <span className="ss-status ss-sold">Reported sold out</span>}</span>;
}

function EventRow({ event, now, saved, onOpen, onSave }: { event: LocalEvent; now: number; saved: boolean; onOpen: () => void; onSave: () => void }) {
  const category = event.categories[0];
  return <div className="ss-row" data-availability={eventAvailability(event, now)}>
    <button type="button" className="sb ss-row-main" onClick={onOpen}>
      <span className="ss-em" style={{ background: CATEGORY_COLORS[category] ?? "#8CC8FF" }}><CatIcon category={category} size={20} /></span>
      <span className="ss-row-text"><strong>{event.title}</strong><small>{eventTime(event)}</small>
        <small>{event.venueName || event.address || "Venue unconfirmed"}</small><Status event={event} now={now} /></span>
    </button>
    <button type="button" className="sb ss-save" aria-pressed={saved} aria-label={saved ? `Remove ${event.title} from saved` : `Save ${event.title}`} onClick={onSave}>{saved ? "★" : "☆"}</button>
  </div>;
}

type PhotoProps = { id: string; entries: string[]; onAdd: (file: File | undefined) => void; onRemove: (entry: string) => void };
function shrinkImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image(); const url = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, 480 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas"); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
    image.src = url;
  });
}
const photoSrc = (entry: string) => entry.slice(entry.indexOf("||") + 2);

function AddPhoto({ photo, label }: { photo: PhotoProps; label: string }) {
  return <label className="ss-addphoto"><Svg d="M4 8h3l2-3h6l2 3h3v11H4ZM9 13a3 3 0 1 0 6 0a3 3 0 1 0-6 0" size={16} /> {label}
    <input type="file" accept="image/*" onChange={event => { photo.onAdd(event.target.files?.[0]); event.target.value = ""; }} /></label>;
}
function PhotoStrip({ photo }: { photo: PhotoProps }) {
  return <div className="ss-photos"><div className="ss-ph-row">{photo.entries.map(entry => <span key={entry} className="ss-ph"><img src={photoSrc(entry)} alt="Your photo" />
    <button type="button" className="sb" aria-label="Remove this photo" onClick={() => photo.onRemove(entry)}>×</button></span>)}</div>
    <AddPhoto photo={photo} label="Add your photo" />
    <small className="ss-concept">Preview: photos stay on this device. Sharing photos with everyone comes with moderated uploads.</small></div>;
}
function SpotCard({ spot, photo }: { spot: (typeof SAMPLE_SPOTS)[number]; photo: PhotoProps }) {
  const mine = photo.entries.at(-1);
  return <div className="ss-spot" style={mine ? { backgroundImage: `url(${photoSrc(mine)})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: `linear-gradient(160deg,${spot.from},${spot.to})` }}>
    <span className="ss-cap">{spot.name}<small>{spot.sub}</small><AddPhoto photo={photo} label={mine ? "Change photo" : "Add photo"} /></span></div>;
}

const RATING_TAGS = ["Great vibe", "Worth it", "Easy to find", "Too crowded"];
type Rating = { stars: number; tags: string[] };
function parseRating(list: string[], key: string): Rating {
  const hit = list.find(item => item.startsWith(`${key}::`));
  if (!hit) return { stars: 0, tags: [] };
  const [, stars, tags] = hit.split("::");
  return { stars: Number(stars) || 0, tags: tags ? tags.split(",") : [] };
}

function RatingBox({ event, now, rating, onRate }: { event: LocalEvent; now: number; rating: Rating; onRate: (stars: number, tags: string[]) => void }) {
  const phase = eventPhase(event, now);
  const open = phase !== "ended";
  return <div className="ss-rate"><div className="ss-rh"><b>{rating.stars ? `Your rating: ★ ${rating.stars}` : "Rate this event"}</b>
    <span>Saved to your profile on this device</span></div>
    <div className="ss-stars" role="group" aria-label="Star rating">{[1, 2, 3, 4, 5].map(value => <button key={value} type="button" className={value <= rating.stars ? "sb on" : "sb"} disabled={!open}
      aria-label={`${value} star${value > 1 ? "s" : ""}`} aria-pressed={value === rating.stars} onClick={() => onRate(value === rating.stars ? 0 : value, rating.tags)}>★</button>)}</div>
    {open && rating.stars > 0 && <div className="ss-wrapchips">{RATING_TAGS.map(tag => <button key={tag} type="button" className="sb ss-rtg" aria-pressed={rating.tags.includes(tag)}
      onClick={() => onRate(rating.stars, rating.tags.includes(tag) ? rating.tags.filter(item => item !== tag) : [...rating.tags, tag])}>{tag}</button>)}</div>}
    <small className="ss-concept">Preview: ratings are not shared with other people yet. That comes with a real account system.</small></div>;
}

function Details({ event, now, rating, onRate, photo }: { event: LocalEvent; now: number; rating: Rating; onRate: (stars: number, tags: string[]) => void; photo: PhotoProps }) {
  const source = listingUrl(event.sourceUrl);
  const end = eventEnd(event);
  const availability = eventAvailability(event, now);
  const availabilitySource = listingUrl(event.availabilitySourceUrl);
  return <div className="ss-facts"><Status event={event} now={now} /><RatingBox event={event} now={now} rating={rating} onRate={onRate} /><PhotoStrip photo={photo} /><p>{event.description}</p><p>Starts {eventTime(event)}</p>
    {end && <p>{end.estimated ? "Estimated end" : "Ends"}: {eventTime({ ...event, startAt: new Date(end.timestamp).toISOString() })}
      {end.estimated && !event.estimatedEndAt ? " · based on a 3-hour duration; confirm with organizer" : ""}</p>}
    <p>{event.venueName}{event.venueName && event.address ? " · " : ""}{event.address}</p>
    <p>{event.priceType === "free" ? "Free" : event.priceType === "paid" ? "Paid · check original listing" : "Price unconfirmed"}</p>
    <p>{availability === "sold-out" ? "Reported sold out. Check the listing for waitlist or door availability." : availability === "available" ? "Tickets last reported available; check before traveling." : "Ticket availability unconfirmed."}</p>
    {availability !== "unknown" && availabilitySource && <p><a href={availabilitySource} target="_blank" rel="noopener noreferrer">Ticket status source ↗</a><br />
      <small>Checked {eventTime({ ...event, startAt: event.availabilityCheckedAt! })}</small></p>}
    {source ? <a href={source} target="_blank" rel="noopener noreferrer">View original listing ↗</a> : <p>Original listing unavailable.</p>}</div>;
}
