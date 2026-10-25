import { v } from "convex/values";
import { mutation, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { env } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { missionVenueMatch } from "./missionVenues";
import { eventEnd } from "../src/lib/eventLifecycle";
import { isMapVisible } from "../src/lib/eventValidation";
import type { EventCategory, LocalEvent } from "../src/lib/event";

const category = v.union(
  v.literal("music-nightlife"), v.literal("arts-culture"), v.literal("markets-shopping"),
  v.literal("food-drink"), v.literal("community-causes"), v.literal("sports-outdoors"),
  v.literal("learning-hobbies"), v.literal("festivals-other"),
);
const nullableText = v.union(v.string(), v.null());
const flyerOccurrence = v.object({ date: nullableText, endDate: nullableText, startTime: nullableText, endTime: nullableText });
type FlyerOccurrence = { date: string | null; endDate: string | null; startTime: string | null; endTime: string | null };
const categories = ["music-nightlife", "arts-culture", "markets-shopping", "food-drink",
  "community-causes", "sports-outdoors", "learning-hobbies", "festivals-other"] as const;
const fields = ["title", "description", "date", "startTime", "endTime", "venueName", "address", "category"] as const;
function addUnresolved(values: string[], key: string) {
  if (!values.includes(key)) values.push(key);
}
function normalizeText(value: string | null, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : null;
}
function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  return month >= 1 && month <= 12 && day >= 1 && day <= 31 && new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === value;
}
function validTime(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour, minute] = value.split(":").map(Number);
  return hour <= 23 && minute <= 59;
}
function asLocalIso(date: string | null, time: string | null): string | null {
  if (!date || !time || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31 || h > 23 || min > 59) return null;
  if (new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10) !== date) return null;
  return `${date}T${time}:00`;
}
function toUtc(local: string): string | null {
  const [datePart, clock] = local.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [h, min, sec] = clock.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, h, min, sec);
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", year: "numeric",
    month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  const localAt = (ms: number) => {
    const p = Object.fromEntries(formatter.formatToParts(ms).map(x => [x.type, x.value]));
    return Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
  };
  const candidates = new Set<number>();
  for (const hours of [-24, -12, 0, 12, 24]) {
    const probe = wall + hours * 3600000;
    const candidate = wall - (localAt(probe) - probe);
    if (localAt(candidate) === wall) candidates.add(candidate);
  }
  return candidates.size === 1 ? new Date([...candidates][0]).toISOString() : null;
}
function eventPatch(draft: {
  title: string | null; description: string | null; date: string | null; startTime: string | null;
  endTime: string | null; venueName: string | null; address: string | null; category: EventCategory | null;
  latitude: number | null; longitude: number | null; unresolvedFields: string[]; imageStorageId: Id<"_storage">;
}, occurrence?: FlyerOccurrence) {
  const date = occurrence ? occurrence.date : draft.date;
  const endDate = occurrence ? occurrence.endDate ?? occurrence.date : date;
  const startTime = occurrence ? occurrence.startTime : draft.startTime;
  const endTime = occurrence ? occurrence.endTime : draft.endTime;
  const startLocal = asLocalIso(date, startTime);
  const startAt = startLocal ? toUtc(startLocal) : null;
  const endLocal = asLocalIso(endDate, endTime);
  const endAt = endLocal ? toUtc(endLocal) : null;
  const event: LocalEvent = {
    title: draft.title ?? "", description: draft.description ?? "", startAt: startAt ?? "",
    endAt: endAt && startAt && endAt > startAt ? endAt : null, timezone: "America/Los_Angeles",
    venueName: draft.venueName, address: draft.address, latitude: draft.latitude, longitude: draft.longitude,
    categories: draft.category ? [draft.category] : [], tags: [], priceType: "unknown" as const,
    sourceType: "flyer" as const, sourceUrl: null, sourceEventId: null,
    status: "pending" as const, verified: false, availability: "unknown" as const,
  };
  return { ...event, mapEndsAt: eventEnd(event)?.timestamp ?? null,
    extra: { flyer: { imageStorageId: draft.imageStorageId, unresolvedFields: draft.unresolvedFields } } };
}

export const generateUploadUrl = mutation({
  args: {}, returns: v.string(),
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

export const submit = mutation({
  args: { storageId: v.id("_storage") },
  returns: v.id("flyerSubmissions"),
  handler: async (ctx, { storageId }) => {
    const image = await ctx.db.system.get(storageId);
    if (!image) throw new Error("Uploaded flyer image was not found");
    const id = await ctx.db.insert("flyerSubmissions", {
      imageStorageId: storageId, status: "pending", extractionStatus: "queued",
      title: null, description: null, date: null, startTime: null, endTime: null, occurrences: [],
      venueName: null, address: null, category: null, latitude: null, longitude: null,
      unresolvedFields: [...fields], reviewedFields: [], extractionNotes: "",
      createdAt: Date.now(),
    });
    const eventId = await ctx.db.insert("events", {
      title: "", description: "", startAt: "", endAt: null, timezone: "America/Los_Angeles",
      venueName: null, address: null, latitude: null, longitude: null, categories: [], tags: [],
      priceType: "unknown", sourceType: "flyer", sourceUrl: null, sourceEventId: String(id),
      status: "pending", verified: false, availability: "unknown", mapEndsAt: null,
      extra: { flyer: { submissionId: id, imageStorageId: storageId, unresolvedFields: [...fields] } },
    });
    await ctx.db.patch(id, { eventId, eventIds: [eventId] });
    await ctx.scheduler.runAfter(0, internal.flyerSubmissions.extract, { submissionId: id });
    return id;
  },
});

export const extract = internalAction({
  args: { submissionId: v.id("flyerSubmissions") }, returns: v.null(),
  handler: async (ctx, { submissionId }) => {
    const draft = await ctx.runQuery(internal.flyerSubmissions.getForExtraction, { submissionId });
    if (!draft) return null;
    const blob = await ctx.storage.get(draft.imageStorageId);
    if (!blob) {
      await ctx.runMutation(internal.flyerSubmissions.saveExtraction, { submissionId,
        extractionStatus: "failed", extractionNotes: "Stored image is unavailable." });
      return null;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(blob.type) || blob.size > 5_000_000) {
      await ctx.runMutation(internal.flyerSubmissions.saveExtraction, { submissionId,
        extractionStatus: "failed", extractionNotes: "Use a JPEG, PNG, WebP, or GIF flyer smaller than 5 MB." });
      return null;
    }
    if (!env.ANTHROPIC_API_KEY) {
      await ctx.runMutation(internal.flyerSubmissions.saveExtraction, { submissionId,
        extractionStatus: "failed", extractionNotes: "ANTHROPIC_API_KEY is not set in Convex." });
      return null;
    }
    await ctx.runMutation(internal.flyerSubmissions.markProcessing, { submissionId });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    const image = btoa(binary);
    const prompt = `Read this event flyer and extract its details. When the event identity or venue is identifiable, make one web search for a matching online event listing. Search using distinctive flyer details (event/artist, venue, and printed month/day). Use an online result only if it is a clear match for this same event, preferably from the venue, promoter, or ticketing provider. Do not use unrelated listings or general web knowledge. Keep the flyer as the primary source and do not override clear printed details without strong evidence.

Date rule: if a printed occurrence has a month and day but omits the year, use 2026 and return the date as YYYY-MM-DD. Mention in notes when you used this default, but do not mark the date unresolved just because the year was omitted. If the flyer provides no month/day and no clear matching listing provides a date, leave that occurrence date null and unresolved. Never invent a month or day.

Represent separately scheduled dates as separate objects in occurrences. A continuous multi-day event is one occurrence with date as its first day and endDate as its last day. Do not turn a continuous date range into multiple events. Include each occurrence's startTime and endTime when shown; use null when missing. Return no more than 20 distinct occurrences. If the flyer has only one event date, return one occurrence.

Return exactly one valid JSON object in this shape, using null for unknown values:
{"title":null,"description":null,"date":null,"startTime":null,"endTime":null,"occurrences":[{"date":null,"endDate":null,"startTime":null,"endTime":null}],"venueName":null,"address":null,"category":null,"unresolvedFields":[],"notes":""}
Allowed categories: ${categories.join(", ")}. Use unresolvedFields from title,description,date,startTime,endTime,venueName,address,category when absent or unclear. Dates must be YYYY-MM-DD; use 2026 when a printed month/day omits the year. Times use 24-hour local time. Write a concise, inviting 1-2 sentence description that turns the printed details into readable event copy rather than a bare list. Use only details visible on the flyer or supported by a clear matching listing; do not invent genre, mood, amenities, schedule, or other claims. Category must be one of the listed values. In notes, briefly state which details came from a matching listing and which fields remain uncertain.`;
    let response: Response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST",
        headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1600,
          tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 1,
            user_location: { type: "approximate", city: "San Francisco", region: "California", country: "US", timezone: "America/Los_Angeles" } }],
          messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: blob.type, data: image } },
            { type: "text", text: prompt }] }] }),
      });
    } catch {
      await ctx.runMutation(internal.flyerSubmissions.saveExtraction, { submissionId,
        extractionStatus: "failed", extractionNotes: "Claude could not be reached. Correct the fields manually and review." });
      return null;
    }
    if (!response.ok) {
      await ctx.runMutation(internal.flyerSubmissions.saveExtraction, { submissionId,
        extractionStatus: "failed", extractionNotes: `Claude request failed (${response.status}). Correct the fields manually and review.` });
      return null;
    }
    const payload = await response.json() as { content?: Array<{ type?: string; text?: string; content?: Array<{ title?: string; url?: string }> }> };
    const raw = payload.content?.find(part => part.type === "text")?.text ?? "";
    const sources = [...new Map((payload.content ?? [])
      .filter(part => part.type === "web_search_tool_result")
      .flatMap(part => Array.isArray(part.content) ? part.content : [])
      .filter((source): source is { title: string; url: string } => typeof source.title === "string" && typeof source.url === "string" && source.url.startsWith("https://"))
      .map(source => [source.url, { title: source.title.slice(0, 200), url: source.url.slice(0, 1000) }] as const)).values()];
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? ""); }
    catch {
      await ctx.runMutation(internal.flyerSubmissions.saveExtraction, { submissionId,
        extractionStatus: "failed", extractionNotes: "Claude returned unreadable data. Correct fields manually and review." });
      return null;
    }
    const categoryValue = categories.includes(parsed.category as typeof categories[number]) ? parsed.category as typeof categories[number] : null;
    const rawOccurrences = Array.isArray(parsed.occurrences) && parsed.occurrences.length ? parsed.occurrences.slice(0, 20) : [parsed];
    const occurrences: FlyerOccurrence[] = rawOccurrences.map((value, index) => {
      const item = value && typeof value === "object" ? value as Record<string, unknown> : {};
      const date = validDate(item.date) ? item.date : index === 0 && validDate(parsed.date) ? parsed.date : null;
      const endDate = validDate(item.endDate) ? item.endDate : index === 0 && validDate(parsed.endDate) ? parsed.endDate : null;
      const startTime = validTime(item.startTime) ? item.startTime : index === 0 && validTime(parsed.startTime) ? parsed.startTime : null;
      const endTime = validTime(item.endTime) ? item.endTime : index === 0 && validTime(parsed.endTime) ? parsed.endTime : null;
      return { date, endDate: endDate && date && endDate >= date ? endDate : null, startTime, endTime };
    });
    const uniqueOccurrences = [...new Map(occurrences.map(item => [
      `${item.date ?? ""}|${item.endDate ?? ""}|${item.startTime ?? ""}|${item.endTime ?? ""}`, item,
    ])).values()];
    if (uniqueOccurrences.length === 0) uniqueOccurrences.push({ date: null, endDate: null, startTime: null, endTime: null });
    const firstOccurrence = uniqueOccurrences[0];
    const extracted = {
      title: normalizeText(typeof parsed.title === "string" ? parsed.title : null, 300),
      description: normalizeText(typeof parsed.description === "string" ? parsed.description : null, 3000),
      date: firstOccurrence.date,
      startTime: firstOccurrence.startTime,
      endTime: firstOccurrence.endTime,
      occurrences: uniqueOccurrences,
      venueName: normalizeText(typeof parsed.venueName === "string" ? parsed.venueName : null, 300),
      address: normalizeText(typeof parsed.address === "string" ? parsed.address : null, 500),
      category: categoryValue,
    };
    const unresolvedFields = fields.filter(key => {
      if (key === "date") return uniqueOccurrences.some(item => !item.date);
      if (key === "startTime") return uniqueOccurrences.some(item => !item.startTime) || (Array.isArray(parsed.unresolvedFields) && parsed.unresolvedFields.includes(key));
      return !extracted[key] || (Array.isArray(parsed.unresolvedFields) && parsed.unresolvedFields.includes(key));
    });
    const match = missionVenueMatch(extracted.venueName);
    if (match) { extracted.venueName = match.name; extracted.address = match.address; }
    else { addUnresolved(unresolvedFields, "venueCoordinates"); }
    await ctx.runMutation(internal.flyerSubmissions.saveExtraction, {
      submissionId, extractionStatus: "complete", ...extracted,
      latitude: match?.latitude ?? null, longitude: match?.longitude ?? null,
      unresolvedFields, extractionNotes: [typeof parsed.notes === "string" ? parsed.notes.slice(0, 700) : "",
        ...(uniqueOccurrences.length > 1 ? [`${uniqueOccurrences.length} separate date/time occurrences detected; each will be reviewed and published as its own event.`] : []),
        ...(sources.length ? [`Online sources to verify: ${sources.map(source => `${source.title} (${source.url})`).join("; ")}`] : [])].filter(Boolean).join("\n").slice(0, 2000),
    });
    return null;
  },
});

export const getForExtraction = internalQuery({
  args: { submissionId: v.id("flyerSubmissions") },
  returns: v.union(v.null(), v.object({ imageStorageId: v.id("_storage") })),
  handler: async (ctx, { submissionId }) => {
    const row = await ctx.db.get(submissionId);
    return row ? { imageStorageId: row.imageStorageId } : null;
  },
});

export const markProcessing = internalMutation({
  args: { submissionId: v.id("flyerSubmissions") }, returns: v.null(),
  handler: async (ctx, { submissionId }) => {
    const row = await ctx.db.get(submissionId);
    if (row?.status === "pending") await ctx.db.patch(submissionId, { extractionStatus: "processing" });
    return null;
  },
});

export const saveExtraction = internalMutation({
  args: { submissionId: v.id("flyerSubmissions"), extractionStatus: v.union(v.literal("complete"), v.literal("failed")),
    title: v.optional(nullableText), description: v.optional(nullableText), date: v.optional(nullableText),
    startTime: v.optional(nullableText), endTime: v.optional(nullableText), venueName: v.optional(nullableText),
    address: v.optional(nullableText), category: v.optional(v.union(category, v.null())),
    occurrences: v.optional(v.array(flyerOccurrence)),
    latitude: v.optional(v.union(v.number(), v.null())), longitude: v.optional(v.union(v.number(), v.null())),
    unresolvedFields: v.optional(v.array(v.string())), extractionNotes: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.submissionId);
    if (!row || row.status !== "pending") return null;
    const patch = {
      extractionStatus: args.extractionStatus, extractionNotes: args.extractionNotes,
      ...(args.title !== undefined ? { title: args.title } : {}),
      ...(args.description !== undefined ? { description: args.description } : {}),
      ...(args.date !== undefined ? { date: args.date } : {}),
      ...(args.startTime !== undefined ? { startTime: args.startTime } : {}),
      ...(args.endTime !== undefined ? { endTime: args.endTime } : {}),
      ...(args.occurrences !== undefined ? { occurrences: args.occurrences } : {}),
      ...(args.venueName !== undefined ? { venueName: args.venueName } : {}),
      ...(args.address !== undefined ? { address: args.address } : {}),
      ...(args.category !== undefined ? { category: args.category } : {}),
      ...(args.latitude !== undefined ? { latitude: args.latitude } : {}),
      ...(args.longitude !== undefined ? { longitude: args.longitude } : {}),
      ...(args.unresolvedFields !== undefined ? { unresolvedFields: args.unresolvedFields } : {}),
    };
    await ctx.db.patch(args.submissionId, patch);
    const fresh = { ...row, ...patch };
    if (fresh.eventId) {
      const event = eventPatch(fresh, args.occurrences?.[0]);
      await ctx.db.patch(fresh.eventId, { ...event, sourceEventId: String(args.submissionId) });
    }
    return null;
  },
});

export const listPendingInternal = internalQuery({
  args: {}, returns: v.array(v.any()),
  handler: async (ctx) => {
    const rows = await ctx.db.query("flyerSubmissions").withIndex("by_status_createdAt", q => q.eq("status", "pending")).order("desc").take(50);
    return await Promise.all(rows.map(async row => ({ ...row, imageUrl: await ctx.storage.getUrl(row.imageStorageId) })));
  },
});

export const updateDraftInternal = internalMutation({
  args: { submissionId: v.id("flyerSubmissions"),
    title: nullableText, description: nullableText, date: nullableText, startTime: nullableText, endTime: nullableText,
    occurrences: v.array(flyerOccurrence),
    venueName: nullableText, address: nullableText, category: v.union(category, v.null()),
    latitude: v.union(v.number(), v.null()), longitude: v.union(v.number(), v.null()),
    unresolvedFields: v.array(v.string()), reviewedFields: v.array(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.submissionId);
    if (!row || row.status !== "pending") throw new Error("Pending flyer was not found");
    if (args.latitude !== null && (!Number.isFinite(args.latitude) || args.latitude < -90 || args.latitude > 90)) throw new Error("Invalid latitude");
    if (args.longitude !== null && (!Number.isFinite(args.longitude) || args.longitude < -180 || args.longitude > 180)) throw new Error("Invalid longitude");
    if (args.occurrences.length < 1 || args.occurrences.length > 20) throw new Error("A flyer must have between 1 and 20 event dates");
    const occurrenceKeys = new Set<string>();
    for (const occurrence of args.occurrences) {
      if (occurrence.date !== null && !validDate(occurrence.date)) throw new Error("Enter valid event dates");
      if (occurrence.endDate !== null && (!validDate(occurrence.endDate) || !occurrence.date || occurrence.endDate < occurrence.date)) throw new Error("A date range must end on or after its start date");
      if (occurrence.startTime !== null && !validTime(occurrence.startTime)) throw new Error("Enter valid start times");
      if (occurrence.endTime !== null && !validTime(occurrence.endTime)) throw new Error("Enter valid end times");
      const key = `${occurrence.date ?? ""}|${occurrence.endDate ?? ""}|${occurrence.startTime ?? ""}|${occurrence.endTime ?? ""}`;
      if (occurrenceKeys.has(key)) throw new Error("Remove duplicate event dates");
      occurrenceKeys.add(key);
    }
    const first = args.occurrences[0];
    const { submissionId, ...input } = args;
    const values = { ...input, date: first.date, startTime: first.startTime, endTime: first.endTime };
    await ctx.db.patch(submissionId, values);
    const fresh = { ...row, ...values };
    if (fresh.eventId) await ctx.db.patch(fresh.eventId, { ...eventPatch(fresh, first), sourceEventId: `${String(submissionId)}:1` });
    return null;
  },
});

export const reviewInternal = internalMutation({
  args: { submissionId: v.id("flyerSubmissions"), decision: v.union(v.literal("approved"), v.literal("rejected")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.submissionId);
    if (!row || row.status !== "pending" || !row.eventId) throw new Error("Pending flyer was not found");
    if (args.decision === "approved") {
      const occurrences = row.occurrences?.length ? row.occurrences : [{ date: row.date, endDate: null, startTime: row.startTime, endTime: row.endTime }];
      if (!row.title?.trim() || !row.venueName?.trim() || !row.address?.trim() ||
          row.latitude === null || row.longitude === null || row.unresolvedFields.length > 0 || !row.reviewedFields.includes("venueCoordinates")) {
        throw new Error("Resolve or explicitly review every uncertainty and confirm a mappable location before approval");
      }
      if (occurrences.length < 1 || occurrences.length > 20) throw new Error("A flyer must have between 1 and 20 event dates");
      for (const occurrence of occurrences) {
        if (!occurrence.date || !validDate(occurrence.date) || !occurrence.startTime || !validTime(occurrence.startTime)) throw new Error("Add a valid date and start time for every event occurrence.");
        if (occurrence.endDate && (!validDate(occurrence.endDate) || occurrence.endDate < occurrence.date)) throw new Error("Check the end date for each multi-day event.");
        const candidate = { ...eventPatch(row, occurrence), status: "approved" as const, verified: true };
        if (!isMapVisible(candidate, Date.now())) throw new Error("Every occurrence needs valid timing and confirmed coordinates before publishing.");
      }
      const existingIds = row.eventIds ?? [row.eventId];
      const eventIds: Id<"events">[] = [];
      for (let index = 0; index < occurrences.length; index++) {
        const occurrence = occurrences[index];
        const event = eventPatch(row, occurrence);
        const sourceEventId = `${String(args.submissionId)}:${index + 1}`;
        const approvedEvent = { ...event, sourceEventId, status: "approved" as const, verified: true };
        const existingId = existingIds[index];
        if (existingId) {
          await ctx.db.patch(existingId, approvedEvent);
          eventIds.push(existingId);
        } else {
          const eventId = await ctx.db.insert("events", approvedEvent);
          eventIds.push(eventId);
        }
      }
      await ctx.db.patch(args.submissionId, { status: "approved", reviewedAt: Date.now(), eventId: eventIds[0], eventIds });
      return null;
    }
    const existingIds = row.eventIds ?? [row.eventId];
    for (const eventId of existingIds) {
      await ctx.db.patch(eventId, { status: "rejected", verified: false, mapEndsAt: null });
    }
    await ctx.db.patch(args.submissionId, { status: "rejected", reviewedAt: Date.now() });
    return null;
  },
});

