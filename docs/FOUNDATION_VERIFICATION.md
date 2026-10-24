# Foundation verification — October 24, 2026

## Verified
- React/TypeScript/Vite foundation builds locally.
- TypeScript check, all 13 visibility/lifecycle tests, production build, and whitespace check pass.
- Native Chrome displays the SF MapLibre basemap with controls.
- The configured Convex approved-events query resolves successfully. The in-app browser was observed showing two approved market records after import.
- Simran confirmed that both pins appeared and that pin selection, event-card selection, details/source links, category filtering, and Fit events all worked. This is user-reported interaction verification, not an automated browser test.
- Simran's terminal screenshot confirmed the development deployment pushed successfully and the source-identity index was added.
- Earlier repeat-bootstrap check on October 24 returned `{ inserted: 0, existing: 1, expired: 1 }`: no new record was inserted. That was the previous start-time policy, now replaced by the end-time policy in EVENT_LIFECYCLE.md.
- Ongoing-event correction deployed and two existing records backfilled without changing their count. The browser shows Ferry Plaza "Happening now" with its 2 PM end. Direct Convex queries confirm inclusion 1 ms before its end and exclusion at the end, while retaining the upcoming Clement market.
- The updated internal bootstrap functions deployed successfully to dev:bold-lobster-565. `node scripts/verify-live.mjs` passed all three live checks: both clients received initial data, pending status removed the record from both subscriptions, and restored approval returned it to both without refresh. Script exited 0 and the record was restored. These were two independent SDK clients, not two automated browsers.
- No synthetic events or API secrets were added.
- Generated Convex API files and installed AI guidelines/skills are present locally.

## Still required
- Demonstrate a backend change in two browsers without refresh.
- Verify hosted app behavior after owner sign-in, mobile interaction, and map failure/retry behavior. The hosting service confirmed the owner-private preview deployment succeeded; browser inspection reached its sign-in gate, not the app. See HOSTED_PREVIEW.md.
- Implement protected idempotent import, Claude extraction/review, and moderator approval.
- Record actual Figma design/prototype/handoff evidence; none was created in this change.

The map is a functional foundation, not a completed sponsor demonstration. The default public OSM tiles are for the prototype; select a suitable provider/configuration before public deployment. MapLibre currently loads via a pinned CDN and needs network access and WebGL.

## Resumed-session limits
The first import and populated UI are confirmed as above. A second browser loading existing records is not proof of a live update. The two-browser acceptance test must observe the same actual backend change in both open clients without refreshing. Browser controls are unavailable in the resumed session; do not mark that check complete from earlier screenshots or user confirmation of basic interactions.

`node scripts/verify-live.mjs` provides an independent backend check with two public Convex subscription clients. It temporarily moves one unended bootstrap record from approved to pending, checks removal in both subscriptions, restores approval in a finally block, and checks reappearance in both. Its CLI writes use the internal bootstrap helper, not an application moderator endpoint. The script refuses non-dev or mismatched configuration and environment deployment overrides. Run only when the team is not editing those bootstrap records.
