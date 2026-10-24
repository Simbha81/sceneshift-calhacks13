# Foundation verification — October 24, 2026

## Verified
- React/TypeScript/Vite foundation builds locally.
- TypeScript check, four existing event-visibility tests, production build, and whitespace check pass.
- Native Chrome displays the SF MapLibre basemap with controls.
- The configured Convex approved-events query resolves successfully with zero records.
- No synthetic events or API secrets were added.
- Generated Convex API files and installed AI guidelines/skills are present locally.

## Still required
- Insert/import genuine reviewed events and verify marker selection, source links, category filtering, and fit-to-events against populated data.
- Demonstrate a backend change in two browsers without refresh.
- Verify a hosted preview, mobile interaction, and map failure/retry behavior.
- Implement protected idempotent import, Claude extraction/review, and moderator approval.
- Record actual Figma design/prototype/handoff evidence; none was created in this change.

The map is a functional foundation, not a completed sponsor demonstration. The default public OSM tiles are for the prototype; select a suitable provider/configuration before public deployment. MapLibre currently loads via a pinned CDN and needs network access and WebGL.
