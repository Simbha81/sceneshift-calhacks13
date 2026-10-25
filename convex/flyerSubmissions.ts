import { v } from "convex/values";
import { mutation, action, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { env } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { missionVenueMatch } from "./missionVenues";
import { eventEnd } from "../src/lib/eventLifecycle";
import type { EventCategory, LocalEvent } from "../src/lib/event";

const category = v.union(
  v.literal("music-nightlife"), v.literal("arts-culture"), v.literal("markets-shopping"),
  v.literal("food-drink"), v.literal("community-causes"), v.literal("sports-outdoors"),
  v.literal("learning-hobbies"), v.literal("festivals-other"),
);
const nullableText = v.union(v.string(), v.null());
const categories = ["music-nightlife", "arts-culture", "markets-shopping", "food-drink",
  "community-causes", "sports-outdoors", "learning-hobbies", "festivals-other"] as const;
const fields = ["title", "description", "date", "startTime", "endTime", "venueName", "address", "category"] as const;
const checkModerator = (token: string) => {
  if (!env.SCENESHIFT_MODERATOR_TOKEN || token !== env.SCENESHIFT_MODERATOR_TOKEN) throw new Error("Moderator access denied");
};
function addUnresolved(values: string[], key: string) {
  if (!values.includes(key)) values.push(key);
}
function normalizeText(value: string | null, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : null;
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
}) {
  const startLocal = asLocalIso(draft.date, draft.startTime);
  const startAt = startLocal ? toUtc(startLocal) : null;
  const endLocal = asLocalIso(draft.date, draft.endTime);
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
      title: null, description: null, date: null, startTime: null, endTime: null,
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
    await ctx.db.patch(id, { eventId });
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
    const prompt = `Read this event flyer. Extract only facts visibly printed on it. Never infer a year, date, time, venue, address, or category. Use null for missing/unclear values. Return only JSON with this exact shape:
{"title":string|null,"description":string|null,"date":"YYYY-MM-DD"|null,"startTime":"HH:mm"|null,"endTime":"HH:mm"|null,"venueName":string|null,"address":string|null,"category":${JSON.stringify(categories)}|null,"unresolvedFields":string[],"notes":string}
Use unresolvedFields from title,description,date,startTime,endTime,venueName,address,category when absent or unclear. Date must include a year to return a date. Times use 24-hour local time. Description should be concise. Category must be one of the listed values.`;
    let response: Response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST",
        headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1200,
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
    const payload = await response.json() as { content?: Array<{ type?: string; text?: string }> };
    const raw = payload.content?.find(part => part.type === "text")?.text ?? "";
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? ""); }
    catch {
      await ctx.runMutation(internal.flyerSubmissions.saveExtraction, { submissionId,
        extractionStatus: "failed", extractionNotes: "Claude returned unreadable data. Correct fields manually and review." });
      return null;
    }
    const categoryValue = categories.includes(parsed.category as typeof categories[number]) ? parsed.category as typeof categories[number] : null;
    const extracted = {
      title: normalizeText(typeof parsed.title === "string" ? parsed.title : null, 300),
      description: normalizeText(typeof parsed.description === "string" ? parsed.description : null, 3000),
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(parsed.date ?? "")) ? String(parsed.date) : null,
      startTime: /^\d{2}:\d{2}$/.test(String(parsed.startTime ?? "")) ? String(parsed.startTime) : null,
      endTime: /^\d{2}:\d{2}$/.test(String(parsed.endTime ?? "")) ? String(parsed.endTime) : null,
      venueName: normalizeText(typeof parsed.venueName === "string" ? parsed.venueName : null, 300),
      address: normalizeText(typeof parsed.address === "string" ? parsed.address : null, 500),
      category: categoryValue,
    };
    const unresolvedFields = fields.filter(key => !extracted[key] || (Array.isArray(parsed.unresolvedFields) && parsed.unresolvedFields.includes(key)));
    const match = missionVenueMatch(extracted.venueName);
    if (match) { extracted.venueName = match.name; extracted.address = match.address; }
    else { addUnresolved(unresolvedFields, "venueCoordinates"); }
    await ctx.runMutation(internal.flyerSubmissions.saveExtraction, {
      submissionId, extractionStatus: "complete", ...extracted,
      latitude: match?.latitude ?? null, longitude: match?.longitude ?? null,
      unresolvedFields, extractionNotes: typeof parsed.notes === "string" ? parsed.notes.slice(0, 1000) : "",
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
      const event = eventPatch(fresh);
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
  args: { moderatorToken: v.string(), submissionId: v.id("flyerSubmissions"),
    title: nullableText, description: nullableText, date: nullableText, startTime: nullableText, endTime: nullableText,
    venueName: nullableText, address: nullableText, category: v.union(category, v.null()),
    latitude: v.union(v.number(), v.null()), longitude: v.union(v.number(), v.null()),
    unresolvedFields: v.array(v.string()), reviewedFields: v.array(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.submissionId);
    if (!row || row.status !== "pending") throw new Error("Pending flyer was not found");
    if (args.latitude !== null && (!Number.isFinite(args.latitude) || args.latitude < -90 || args.latitude > 90)) throw new Error("Invalid latitude");
    if (args.longitude !== null && (!Number.isFinite(args.longitude) || args.longitude < -180 || args.longitude > 180)) throw new Error("Invalid longitude");
    const { moderatorToken: _token, submissionId, ...values } = args;
    await ctx.db.patch(submissionId, values);
    const fresh = { ...row, ...values };
    if (fresh.eventId) await ctx.db.patch(fresh.eventId, { ...eventPatch(fresh), sourceEventId: String(submissionId) });
    return null;
  },
});

export const reviewInternal = internalMutation({
  args: { moderatorToken: v.string(), submissionId: v.id("flyerSubmissions"), decision: v.union(v.literal("approved"), v.literal("rejected")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.submissionId);
    if (!row || row.status !== "pending" || !row.eventId) throw new Error("Pending flyer was not found");
    if (args.decision === "approved") {
      if (!row.title?.trim() || !row.date || !row.startTime || !row.venueName?.trim() || !row.address?.trim() ||
          row.latitude === null || row.longitude === null || row.unresolvedFields.length > 0 || !row.reviewedFields.includes("venueCoordinates")) {
        throw new Error("Resolve or explicitly review every uncertainty and confirm a mappable location before approval");
      }
      const startAt = toUtc(asLocalIso(row.date, row.startTime)!);
      if (!startAt || Date.parse(startAt) <= Date.now()) throw new Error("Enter a valid future date and start time");
    }
    const decision = args.decision;
    await ctx.db.patch(row.eventId, { status: decision, verified: decision === "approved",
      mapEndsAt: decision === "approved" ? eventEnd(eventPatch(row))?.timestamp ?? null : null });
    await ctx.db.patch(args.submissionId, { status: decision, reviewedAt: Date.now() });
    return null;
  },
});

export const listPending = action({
  args: { moderatorToken: v.string() }, returns: v.array(v.any()),
  handler: async (ctx, { moderatorToken }) => {
    checkModerator(moderatorToken);
    return await ctx.runQuery(internal.flyerSubmissions.listPendingInternal, {});
  },
});
export const updateDraft = action({
  args: { moderatorToken: v.string(), submissionId: v.id("flyerSubmissions"),
    title: nullableText, description: nullableText, date: nullableText, startTime: nullableText, endTime: nullableText,
    venueName: nullableText, address: nullableText, category: v.union(category, v.null()),
    latitude: v.union(v.number(), v.null()), longitude: v.union(v.number(), v.null()),
    unresolvedFields: v.array(v.string()), reviewedFields: v.array(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    checkModerator(args.moderatorToken);
    return await ctx.runMutation(internal.flyerSubmissions.updateDraftInternal, args);
  },
});
export const review = action({
  args: { moderatorToken: v.string(), submissionId: v.id("flyerSubmissions"), decision: v.union(v.literal("approved"), v.literal("rejected")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    checkModerator(args.moderatorToken);
    return await ctx.runMutation(internal.flyerSubmissions.reviewInternal, args);
  },
});
