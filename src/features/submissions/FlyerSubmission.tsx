import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAction, useMutation } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { CATEGORY_LABELS } from "../../lib/eventDisplay";
import { generateFlyerUploadUrl, listPendingFlyers, reviewFlyer, submitFlyer, updateFlyerDraft, type FlyerDraft, type FlyerOccurrence } from "../../lib/api";
import { clearLocationReview, publicationIssue, reviewValuesFromDraft, syncReviewValues } from "./flyerDraftState";
import { FlyerLocationPicker } from "./FlyerLocationPicker";
import "./FlyerSubmission.css";

export function FlyerSubmission() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const uploadUrl = useMutation(generateFlyerUploadUrl);
  const submit = useMutation(submitFlyer);
  async function sendFlyer(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 5_000_000) { setMessage("Choose a JPEG, PNG, WebP, or GIF under 5 MB."); return; }
    setUploading(true); setMessage("");
    try {
      const url = await uploadUrl({});
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      if (!response.ok) throw new Error("Convex could not store this image.");
      const { storageId } = await response.json() as { storageId: Id<"_storage"> };
      await submit({ storageId });
      setFile(null);
      const input = document.getElementById("flyer-file") as HTMLInputElement | null;
      if (input) input.value = "";
      setMessage("Flyer submitted. Extraction will appear in the review queue.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Flyer upload failed."); }
    finally { setUploading(false); }
  }
  const [token, setToken] = useState("");
  const [activeToken, setActiveToken] = useState("");
  const [pending, setPending] = useState<FlyerDraft[] | null>(null);
  const loadPending = useAction(listPendingFlyers);
  useEffect(() => {
    if (!activeToken) { setPending(null); return; }
    let live = true;
    setPending(null);
    loadPending({ moderatorToken: activeToken }).then(rows => { if (live) setPending(rows); })
      .catch(error => { if (live) { setPending([]); setMessage(error instanceof Error ? error.message : "Could not load review queue."); } });
    return () => { live = false; };
  }, [activeToken, loadPending]);
  useEffect(() => {
    if (!activeToken || !pending?.some(row => row.extractionStatus === "queued" || row.extractionStatus === "processing")) return;
    const timer = window.setTimeout(() => {
      loadPending({ moderatorToken: activeToken }).then(setPending).catch(() => undefined);
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [activeToken, loadPending, pending]);
  return <section className="flyer-panel" aria-labelledby="flyer-heading">
    <div className="flyer-panel-heading"><div><p className="flyer-eyebrow">Community submissions</p><h2 id="flyer-heading">Share an event flyer</h2>
      <p>Claude drafts details from the image. A reviewer confirms them before anything appears on the map.</p></div></div>
    <form className="flyer-upload" onSubmit={sendFlyer}>
      <label htmlFor="flyer-file">Flyer image <span>JPEG, PNG, WebP, or GIF · max 5 MB</span></label>
      <input id="flyer-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e => setFile(e.target.files?.[0] ?? null)} />
      <button type="submit" disabled={!file || uploading}>{uploading ? "Uploading…" : "Upload flyer"}</button>
      {message && <p role="status">{message}</p>}
    </form>
    <details className="flyer-review-access"><summary>Reviewer access</summary>
      <label htmlFor="moderator-token">Moderator token</label>
      <div className="flyer-token-row"><input id="moderator-token" type="password" autoComplete="off" value={token} onChange={e => setToken(e.target.value)} placeholder="Enter the Convex moderator token" />
        <button type="button" onClick={() => setActiveToken(token.trim())} disabled={!token.trim()}>Open review queue</button></div>
      <p>The token is held only in this tab. It is checked by Convex for every review action.</p>
      {activeToken && pending !== null && <div className="flyer-queue">
        <div className="flyer-queue-heading"><h3>Pending flyers ({pending.length})</h3><button type="button" onClick={() => loadPending({ moderatorToken: activeToken }).then(setPending)}>Refresh queue</button></div>
        {pending.length === 0 ? <p>No pending submissions.</p> : pending.map(draft => <DraftCard key={draft._id} draft={draft} token={activeToken} onRefresh={() => loadPending({ moderatorToken: activeToken }).then(setPending)} />)}
      </div>}
      {activeToken && pending === null && <p role="status">Loading reviewer queue…</p>}
    </details>
  </section>;
}

function DraftCard({ draft, token, onRefresh }: { draft: FlyerDraft; token: string; onRefresh: () => void }) {
  const dirty = useRef(false);
  const [values, setValues] = useState(() => reviewValuesFromDraft(draft));
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const update = useAction(updateFlyerDraft);
  const review = useAction(reviewFlyer);
  useEffect(() => {
    setValues(current => syncReviewValues(current, reviewValuesFromDraft(draft), dirty.current));
  }, [draft]);
  function field<K extends "title" | "description" | "venueName" | "address" | "category" | "latitude" | "longitude">(key: K, value: string) {
    dirty.current = true;
    setValues(v => ({ ...(key === "address" || key === "venueName" ? clearLocationReview(v, true) : v), [key]: value }));
  }
  function occurrenceField(index: number, key: keyof FlyerOccurrence, value: string) {
    dirty.current = true;
    setValues(v => ({ ...v, occurrences: v.occurrences.map((item, i) => i === index ? { ...item, [key]: value } : item) }));
  }
  function addOccurrence() {
    dirty.current = true;
    setValues(v => v.occurrences.length >= 20 ? v : { ...v, occurrences: [...v.occurrences, { date: "", endDate: "", startTime: "", endTime: "" }] });
  }
  function removeOccurrence(index: number) {
    dirty.current = true;
    setValues(v => v.occurrences.length <= 1 ? v : { ...v, occurrences: v.occurrences.filter((_, i) => i !== index) });
  }
  async function save(): Promise<boolean> {
    setBusy(true); setNotice("");
    try {
      await update({ moderatorToken: token, submissionId: draft._id,
        title: values.title.trim() || null, description: values.description.trim() || null,
        date: values.occurrences[0]?.date || null, startTime: values.occurrences[0]?.startTime || null, endTime: values.occurrences[0]?.endTime || null,
        occurrences: values.occurrences.map(item => ({ date: item.date || null, endDate: item.endDate || null, startTime: item.startTime || null, endTime: item.endTime || null })),
        venueName: values.venueName.trim() || null, address: values.address.trim() || null,
        category: values.category ? values.category as FlyerDraft["category"] : null,
        latitude: values.latitude === "" ? null : Number(values.latitude), longitude: values.longitude === "" ? null : Number(values.longitude),
        unresolvedFields: values.unresolvedFields, reviewedFields: values.reviewedFields,
      });
      dirty.current = false;
      setNotice("Draft saved.");
      return true;
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not save draft."); return false; }
    finally { setBusy(false); }
  }
  async function decide(decision: "approved" | "rejected") {
    if (decision === "approved") {
      const issue = publicationIssue(values);
      if (issue) { setNotice(issue); return; }
    }
    if (!await save()) return;
    setBusy(true);
    try { await review({ moderatorToken: token, submissionId: draft._id, decision }); setNotice(decision === "approved" ? "Approved and published." : "Rejected."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Review action failed."); }
    finally { setBusy(false); onRefresh(); }
  }
  function markReviewed(key: string) {
    dirty.current = true;
    setValues(v => ({ ...v, unresolvedFields: v.unresolvedFields.filter(x => x !== key),
      reviewedFields: v.reviewedFields.includes(key) ? v.reviewedFields : [...v.reviewedFields, key] }));
  }
  const unresolved = [...new Set(values.unresolvedFields)];
  const extractionPending = draft.extractionStatus === "queued" || draft.extractionStatus === "processing";
  const noteParts = draft.extractionNotes.split(/(https:\/\/[^\s)]+)/g);
  return <article className="flyer-draft">
    <div className="flyer-draft-preview">{draft.imageUrl && <a href={draft.imageUrl} target="_blank" rel="noreferrer"><img src={draft.imageUrl} alt="Submitted event flyer" /></a>}</div>
    <div className="flyer-draft-fields">
      <div className="flyer-draft-top"><h4>Flyer review</h4><span data-state={draft.extractionStatus}>{draft.extractionStatus}</span></div>
      {draft.extractionNotes && <p className="flyer-note">{noteParts.map((part, index) => part.startsWith("https://")
        ? <a key={index} href={part} target="_blank" rel="noreferrer">{part}</a> : part)}</p>}
      {extractionPending && <p role="status">Claude is still reading this flyer. Editing unlocks when extraction finishes.</p>}
      <fieldset className="flyer-editable-fields" disabled={busy || extractionPending}>
      {unresolved.length > 0 && <div className="flyer-unresolved"><strong>Needs confirmation</strong>
        {unresolved.map(key => <label key={key}><input type="checkbox" checked={false} onChange={() => markReviewed(key)} /> I reviewed {key === "date" ? "all event dates" : key}</label>)}</div>}
      <label>Title<input value={values.title} onChange={e => field("title", e.target.value)} /></label>
      <label>Description<textarea rows={3} value={values.description} onChange={e => field("description", e.target.value)} /></label>
      <section className="flyer-occurrences" aria-label="Event dates">
        <div className="flyer-occurrences-heading"><div><strong>Event dates</strong><small>Separate dates become separate event listings. Use an end date only for one continuous multi-day event.</small></div>
          <button type="button" onClick={addOccurrence} disabled={busy || values.occurrences.length >= 20}>Add a date</button></div>
        {values.occurrences.map((item, index) => <div className="flyer-occurrence" key={index}>
          <div className="flyer-occurrence-heading"><strong>{values.occurrences.length > 1 ? `Occurrence ${index + 1}` : "Date and time"}</strong>
            {values.occurrences.length > 1 && <button type="button" onClick={() => removeOccurrence(index)} disabled={busy}>Remove</button>}</div>
          <div className="flyer-grid"><label>Date<input type="date" value={item.date} onChange={e => occurrenceField(index, "date", e.target.value)} /></label>
            <label>End date <small>continuous event only</small><input type="date" value={item.endDate} min={item.date || undefined} onChange={e => occurrenceField(index, "endDate", e.target.value)} /></label>
            <label>Start time<input type="time" value={item.startTime} onChange={e => occurrenceField(index, "startTime", e.target.value)} /></label>
            <label>End time <small>optional; blank uses the clearly labeled 3-hour estimate</small><input type="time" value={item.endTime} onChange={e => occurrenceField(index, "endTime", e.target.value)} /></label></div>
        </div>)}
      </section>
      <div className="flyer-grid"><label>Category<select value={values.category} onChange={e => field("category", e.target.value)}><option value="">Unconfirmed</option>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
      <label>Venue name<input value={values.venueName} onChange={e => field("venueName", e.target.value)} /></label>
      <label>Street address<input value={values.address} onChange={e => field("address", e.target.value)} /></label>
      <FlyerLocationPicker address={values.address} token={token} disabled={busy || extractionPending}
        point={values.latitude && values.longitude ? { latitude: Number(values.latitude), longitude: Number(values.longitude) } : null}
        onSelect={point => { dirty.current = true; setValues(v => ({ ...clearLocationReview(v, false), latitude: String(point.latitude), longitude: String(point.longitude) })); }} />
      <label className="flyer-location-confirm"><input type="checkbox" disabled={!values.latitude || !values.longitude}
        checked={values.reviewedFields.includes("venueCoordinates") && !!values.latitude && !!values.longitude}
        onChange={event => { if (event.target.checked) markReviewed("venueCoordinates"); else { dirty.current = true; setValues(v => clearLocationReview(v, false)); } }} /> I confirm the pin marks this event's location.</label>
      <div className="flyer-actions"><button type="button" onClick={save} disabled={busy}>Save corrections</button>
        <button type="button" className="flyer-approve" onClick={() => decide("approved")} disabled={busy}>Approve and publish</button>
        <button type="button" className="flyer-reject" onClick={() => decide("rejected")} disabled={busy}>Reject</button></div>
      </fieldset>
      {notice && <p role="status">{notice}</p>}
    </div>
  </article>;
}
