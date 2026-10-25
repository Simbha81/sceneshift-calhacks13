# Sponsor targets and evidence

## Team intent
Win every track we enter, including Claude's. Each integration must solve a real product need, be shown in the working demo, and satisfy the exact challenge we apply for. This file is the durable checkpoint for coding assistants and teammates.

Foundation checkpoint October 24 (before EventPulse integration): local React/Vite + MapLibre foundation renders the SF basemap and reads the connected Convex approved-events query. Two manually reviewed recurring market occurrences were imported. Simran confirmed pin/card selection, details/source links, category filtering, and Fit events work. Repeat-bootstrap duplicate prevention and live status changes in two independent SDK subscription clients passed. Browser-specific two-session verification, Actor ingestion, Claude extraction, hosted deployment, and Figma workflow evidence remain outstanding.

Latest quality checkpoint: candidate Actor build 0.1.2 and its six-record cloud run succeeded across Eventbrite, Luma and DoTheBay. Repeat import inserted zero duplicates; six current records are returned by the approved map query after documented source review. Thirty tests pass. See EVENTPULSE_QUALITY_CHECKPOINT.md for evidence and gaps; live Actor latest remains on the previous build pending release. Claude and Figma evidence remain outstanding.

Previous integration checkpoint: EventPulse REST start/poll/pagination and URL-keyed import passed against real cloud data. Reimport inserted zero duplicate records; an admin-reviewed imported Luma record is returned by the live map query. See APIFY_INTEGRATION.md for run IDs and pending data-quality gaps. Claude runtime and Figma evidence are still outstanding.

## Sources and verification
- Official event overview: https://cal-hacks-13-0.devpost.com/ (checked October 23, 2026).
- Supplied Figma guide: Cal Hacks __ Figma.docx.
- Latest product scope: SceneShift_Project_Brief.docx and the team's scope corrections.

The official overview lists Best use of Apify, Best Actor sponsored by Apify, Best use of Convex, and several Figma categories. It identifies Anthropic as a presenting sponsor but does not publish a detailed Claude prize rubric in the retrieved overview. Confirm Claude's exact category, criteria, entry method, and deadline from the sponsor or official challenge materials. An absent rubric is not proof that there is no prize.

Figma's listed categories include Best Use Case of Figma, Best Use Case of Figma Agent, Most Creative Use Case of Figma Agent, Best Design, and Most Creative. Choose categories supported by actual work. Agent categories require confirmation of their exact criteria and substantive agent use; ordinary Figma screens alone do not demonstrate that.

Detailed Apify and Convex sponsor criteria also remain to be verified. The engineering gates below are our proposed quality standard, not an official judging rubric or a guarantee of winning.

## Engineering quality gates and planned evidence

### Apify
Role: EventPulse supplies real event information to the app.
- Reusable custom Actor with documented inputs and normalized output.
- Successful cloud run against two tested public sources.
- Validate dates, resolve locations, deduplicate records, retain source URLs and collection times, and report failed/uncertain records.
- Repeat import does not create duplicate map events.
Evidence to retain: Actor URL, run ID, dataset sample, original source comparisons, and successful import result.
Current evidence: public Actor build 0.0.13; new cloud run ieoWQtqh2UjhguSoG succeeded and imported 3 records; reimport inserted 0 duplicates. An earlier owner dataset adds 3 additional distinct URLs across Eventbrite, Luma, and DoTheBay. One organizer-checked Luma record is approved and returned by the live map query; unresolved data stays pending. See APIFY_INTEGRATION.md for IDs, source comparisons, transport/normalization fixes, and remaining gaps. Browser pin rendering, Partiful/Funcheap coverage, full Actor quality, and exact judging requirements remain unverified.
Open: verify Best use of Apify and Best Actor requirements, submission visibility, entry method, and deadlines.

### Claude
Development tools: Simran and Natalie use Codex. Simran reports $50 in Claude API credits; active balance, expiry/restrictions, and a successful image request remain unverified. The chat plan is separate from API access. Official billing/account references: https://support.claude.com/en/articles/8977456-how-do-i-pay-for-my-claude-api-usage and https://support.claude.com/en/articles/8987223-can-i-have-a-claude-account-and-a-console-account .

Role: turn a flyer into a reviewable event that can be published to the map.
- Real server-side Claude extraction from the uploaded image; preserve original flyer.
- Editable structured details, explicit missing/ambiguous fields, and no invented data.
- Resolve/confirm coordinates and dates before authorized approval.
- Demonstrate the complete path to a new map pin, including a second browser.
- Test multiple real flyers, including a missing-detail case; record actual extraction errors and corrections. Set an acceptance threshold after seeing the test set.
Evidence to retain: example flyers with permission to use them, extraction outputs, correction examples, test notes, model configuration, and live demo.
Current evidence: none implemented.
Open: exact Claude/Anthropic category and rubric, and whether the challenge specifically requires Claude Code or another product. ChatGPT/Claude coding assistance is separate from the in-app API integration.

### Convex
Role: shared event state, ingestion, review, approval, and reactive map delivery.
- Approved-events queries, pending submissions, protected approval/rejection, and an idempotent import.
- Public browsing requires no personalized account; moderator/import authorization remains protected.
- Approval produces a live pin in another browser without manual refresh.
Evidence to retain: schema/function links, duplicate-import test, unauthorized-approval test, and two-session demo.
Current evidence: schema, bounded approved-events query, and internal-only bootstrap implemented; two records appeared after import, and Simran confirmed the map interactions work. Repeat bootstrap inserted zero new records. Two independent public SDK clients observed removal on pending status and reappearance on restored approval without refresh. The general importer and protected application moderator workflow are not implemented; the status changes used an admin-only helper restricted to the bootstrap records. Browser-specific two-session publication still needs demonstration.
Open: exact Best use of Convex criteria and entry requirements.

### Figma
Role: intentionally design/prototype and hand off the actual discovery and flyer-review experience.
- Build usable screens/prototypes tied to the shipped interface and record real iterations.
- Keep the supplied guide's stage log: ideation, prototyping, handoff, code generation; record which Figma tools and why, approximate minutes, effectiveness 1–5, and how output entered the project. Keep each stage within 200 words.
- Deliver Figma Slides with the workflow, embedded Figma files/prototypes, code/repository link, and a demo video no longer than three minutes.
- Complete Edu verification and make required Figma files accessible to Anyone.
Evidence to retain: file/prototype links, stage entries, handoff examples, Slides, and video.
Current evidence: none recorded in the repository.
Open: select exact Figma categories and verify any additional category-specific rules.

## Final release review
For every target, answer: What user need does the tool solve? What actually works? What evidence can judges inspect? Which exact criterion does it satisfy? What remains weak or unverified?

If a core integration is unreliable or only superficial, prioritize fixing it over boosts and extra polish. Do not mark a track ready while required eligibility checks or core evidence are missing.

## Deadline correction
The official overview lists October 25, 2026 at 9:00 AM Pacific for submission. The brief's Sunday-afternoon target is too late for submission and needs correction. Reconfirm timing with official announcements, finish the deployable demo before the deadline, and check separate sponsor cutoffs. The overview also requires a project image, GitHub repository, and a live or recorded demo.
