import { useEffect, useState, type FormEvent } from "react";
import { useAction, useMutation } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { CATEGORY_LABELS } from "../../lib/eventDisplay";
import { generateFlyerUploadUrl, listPendingFlyers, reviewFlyer, submitFlyer, updateFlyerDraft, type FlyerDraft } from "../../lib/api";
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
        <h3>Pending flyers ({pending.length})</h3>
        {pending.length === 0 ? <p>No pending submissions.</p> : pending.map(draft => <DraftCard key={draft._id} draft={draft} token={activeToken} onRefresh={() => loadPending({ moderatorToken: activeToken }).then(setPending)} />)}
      </div>}
      {activeToken && pending === null && <p role="status">Loading reviewer queue…</p>}
    </details>
  </section>;
}

function DraftCard({ draft, token, onRefresh }: { draft: FlyerDraft; token: string; onRefresh: () => void }) {
  const [values, setValues] = useState(() => ({
    title: draft.title ?? "", description: draft.description ?? "", date: draft.date ?? "",
    startTime: draft.startTime ?? "", endTime: draft.endTime ?? "", venueName: draft.venueName ?? "",
    address: draft.address ?? "", category: draft.category ?? "", latitude: draft.latitude?.toString() ?? "",
    longitude: draft.longitude?.toString() ?? "", unresolvedFields: [...draft.unresolvedFields],
    reviewedFields: [...draft.reviewedFields],
  }));
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const update = useAction(updateFlyerDraft);
  const review = useAction(reviewFlyer);
  function field<K extends "title" | "description" | "date" | "startTime" | "endTime" | "venueName" | "address" | "category" | "latitude" | "longitude">(key: K, value: string) {
    setValues(v => ({ ...v, [key]: value }));
  }
  async function save(): Promise<boolean> {
    setBusy(true); setNotice("");
    try {
      await update({ moderatorToken: token, submissionId: draft._id,
        title: values.title.trim() || null, description: values.description.trim() || null,
        date: values.date || null, startTime: values.startTime || null, endTime: values.endTime || null,
        venueName: values.venueName.trim() || null, address: values.address.trim() || null,
        category: values.category ? values.category as FlyerDraft["category"] : null,
        latitude: values.latitude === "" ? null : Number(values.latitude), longitude: values.longitude === "" ? null : Number(values.longitude),
        unresolvedFields: values.unresolvedFields, reviewedFields: values.reviewedFields,
      });
      setNotice("Draft saved.");
      return true;
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not save draft."); return false; }
    finally { setBusy(false); }
  }
  async function decide(decision: "approved" | "rejected") {
    if (!await save()) return;
    if (decision === "approved" && !values.reviewedFields.includes("venueCoordinates")) { setNotice("Confirm that the coordinates point to the venue."); return; }
    setBusy(true);
    try { await review({ moderatorToken: token, submissionId: draft._id, decision }); setNotice(decision === "approved" ? "Approved and published." : "Rejected."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Review action failed."); }
    finally { setBusy(false); onRefresh(); }
  }
  function markReviewed(key: string) {
    setValues(v => ({ ...v, unresolvedFields: v.unresolvedFields.filter(x => x !== key),
      reviewedFields: v.reviewedFields.includes(key) ? v.reviewedFields : [...v.reviewedFields, key] }));
  }
  const unresolved = [...new Set(values.unresolvedFields)];
  return <article className="flyer-draft">
    <div className="flyer-draft-preview">{draft.imageUrl && <a href={draft.imageUrl} target="_blank" rel="noreferrer"><img src={draft.imageUrl} alt="Submitted event flyer" /></a>}</div>
    <div className="flyer-draft-fields">
      <div className="flyer-draft-top"><h4>Flyer review</h4><span data-state={draft.extractionStatus}>{draft.extractionStatus}</span></div>
      {draft.extractionNotes && <p className="flyer-note">{draft.extractionNotes}</p>}
      {unresolved.length > 0 && <div className="flyer-unresolved"><strong>Needs confirmation</strong>
        {unresolved.map(key => <label key={key}><input type="checkbox" checked={false} onChange={() => markReviewed(key)} /> I reviewed {key}</label>)}</div>}
      <label>Title<input value={values.title} onChange={e => field("title", e.target.value)} /></label>
      <label>Description<textarea rows={3} value={values.description} onChange={e => field("description", e.target.value)} /></label>
      <div className="flyer-grid"><label>Date<input type="date" value={values.date} onChange={e => field("date", e.target.value)} /></label>
        <label>Start time<input type="time" value={values.startTime} onChange={e => field("startTime", e.target.value)} /></label>
        <label>End time <small>optional</small><input type="time" value={values.endTime} onChange={e => field("endTime", e.target.value)} /></label>
        <label>Category<select value={values.category} onChange={e => field("category", e.target.value)}><option value="">Unconfirmed</option>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
      <label>Venue name<input value={values.venueName} onChange={e => field("venueName", e.target.value)} /></label>
      <label>Street address<input value={values.address} onChange={e => field("address", e.target.value)} /></label>
      <div className="flyer-grid"><label>Latitude<input inputMode="decimal" value={values.latitude} onChange={e => field("latitude", e.target.value)} /></label>
        <label>Longitude<input inputMode="decimal" value={values.longitude} onChange={e => field("longitude", e.target.value)} /></label></div>
      <label className="flyer-location-confirm"><input type="checkbox" checked={values.reviewedFields.includes("venueCoordinates")} onChange={() => markReviewed("venueCoordinates")} /> I confirm the coordinates point to this venue.</label>
      <div className="flyer-actions"><button type="button" onClick={save} disabled={busy}>Save corrections</button>
        <button type="button" className="flyer-approve" onClick={() => decide("approved")} disabled={busy}>Approve and publish</button>
        <button type="button" className="flyer-reject" onClick={() => decide("rejected")} disabled={busy}>Reject</button></div>
      {notice && <p role="status">{notice}</p>}
    </div>
  </article>;
}
