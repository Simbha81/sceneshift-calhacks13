# Hosted preview

URL: https://sceneshift-calhacks13-preview.simbhatia81.chatgpt.site

Deployment succeeded October 24, 2026. Access is owner-private through ChatGPT sign-in. This is not yet a team-accessible or public judging link. No new database or API secrets were added; the frontend connects directly to the existing development Convex deployment, bold-lobster-565. Production Convex was not changed.

## Source and publishing
- Canonical application source remains https://github.com/Simbha81/sceneshift-calhacks13 .
- This frontend snapshot was built from source commit `dd56698d3c972497e6d613c0503363a45e50d1e6` on `feat/map-convex-foundation` (PR #2).
- Sites stores the built `dist` assets as a separate deployment snapshot, not an independent application fork. Frontend changes require rebuilding and republishing; GitHub pushes alone do not update this preview. Convex data updates are reactive without rebuilding the frontend.
- Local deployment staging: sibling directory `sceneshift-preview`; preserve its `.openai/hosting.json` identity when republishing. Do not create a second Site for updates. Copy only built assets and source metadata, never `.env.local` or backend secrets.
- Sites project: `appgprj_6add07b7b920819184efa87477288c07`.
- Snapshot commit: `72f8bc50b305fb3a74412b0c75d4b8aaf5e870a3`.
- Saved version: `appgprj_6add07b7b920819184efa87477288c07~appgver_5b513480b7748191a4f00ad188017aeb`.
- Successful deployment: `appgdep_6add07ddd9a081919587254c9303c01d`.

## Remaining browser checks
The hosting service confirmed successful deployment. Opening the URL showed the owner sign-in gate; the automation session was not signed in. Hosted map rendering, external map resources, and Convex subscription behavior have not yet been verified through that gate.

Sign in with the owning ChatGPT account, then check map loading, current approved events, pin/details/filter interactions, and reactive changes in another client. Ended events should be absent. Do not change event dates to keep demo pins visible.

After the hosted checks, explicitly choose team/public access before distributing the link. Review and merge PR #2 to establish the shared foundation on main. Next implementation milestone remains the custom Apify EventPulse supply and protected importer, followed by the complete Claude flyer flow. The prototype still uses public OSM tiles; verify the provider configuration before broad public distribution.
