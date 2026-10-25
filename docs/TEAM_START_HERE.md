# Start here: one codebase, one shared demo backend

## Team baseline

PR #3 is merged; use `main` as the shared baseline. Do not create a second application or copy files between repositories.

- Repository: https://github.com/Simbha81/sceneshift-calhacks13
- Shared development backend: `bold-lobster-565`
- Public client URL: `https://bold-lobster-565.convex.cloud`
- Dashboard: https://dashboard.convex.dev/d/bold-lobster-565
- Hosted preview: https://sceneshift-calhacks13-preview.simbhatia81.chatgpt.site/

This development deployment is the hackathon integration/demo database. Production is separate and is not the team testing target. A git pull updates code, not database contents or server secrets.

## Frontend and UI setup

Requires Node 22.12+ and pnpm 11. Clone the repository once, or use the existing checkout. Check `git status` first. If there are uncommitted changes, preserve them with Simran before switching branches; do not reset, clean, or overwrite them.

Once the working tree is clean:

```sh
git switch main
git pull --ff-only origin main
pnpm install --frozen-lockfile
git switch -c feature/YOUR-NAME-YOUR-TASK
```

Create `.env.local` if absent. If it already exists, edit the existing `VITE_CONVEX_URL` entry rather than overwriting the file or adding duplicate entries:

```dotenv
VITE_CONVEX_URL=https://bold-lobster-565.convex.cloud
```

This is a public endpoint, not a secret. Preserve other local configuration and keep `.env.local` out of Git. Stop and restart Vite after changing its environment:

```sh
pnpm dev
```

For this shared-backend UI workflow, do not run `pnpm dev:backend`, `npx convex dev`, `convex deploy`, bootstrap/import/sync commands, or database reset/import commands. The backend is already running in Convex Cloud; those commands are unnecessary for UI work and may change deployment selection or publish branch code.

Verify the app loads the shared records, source links, and map interactions. The hosted preview is a built snapshot: pushing a frontend branch does not update it automatically. Simran publishes frontend changes after merge. Backend data updates are reactive; changing records does not require rebuilding the frontend.

## Natalie's existing Convex setup

Keep the separate deployment and any work already done. No data migration or deletion is needed just to use the shared demo data. Set the browser's VITE_CONVEX_URL as above and run only the frontend. Her local CONVEX_DEPLOYMENT may still name her personal backend; it does not override the explicit browser URL, but Convex CLI commands can rewrite that URL, so check it again after any deliberate backend work.

For backend work, join Simran's Convex team/project using your own account. Use a personal deployment for isolated tests and explicitly switch the local frontend URL only when testing that personal deployment. Share backend code through a PR. Do not assume another developer's data, environment variables, or API credits are present in a personal deployment.

Simran is the only publisher to bold-lobster-565 during integration. Coordinate one backend deploy at a time, from reviewed code matching the shared baseline. Never run two convex dev watchers against the shared deployment from different branches.

## Work allocation

| Owner | Current focus | Coordination boundary |
| --- | --- | --- |
| Natalia | Figma, responsive map/cards, scene/category filters, upload/review screen UI | Own frontend feature folders; coordinate App wiring and shared styles |
| Natalie | Claude flyer ingestion, editable review, pending submissions, QA | Coordinate convex/schema.ts, generated API changes, and shared event types before editing |
| Simran | EventPulse quality, integration review, shared deployment and hosted preview | Own server secrets and final integration publishing |

Each task gets one owner and one branch. Pick a specific screen or feature before editing; avoid two agents editing the same file. Discuss dependency changes before modifying package.json or pnpm-lock.yaml. Never copy another teammate's entire checkout over yours.

## Before opening a PR

```sh
pnpm typecheck
pnpm test
pnpm test:backend
pnpm build
```

Describe what changed, tests performed, sponsor contribution, and remaining gaps. Include screenshots for UI work. Simran reviews/merges and deploys. Do not push directly to main. These are team workflow rules; branch protection enforcement has not been verified.

After each merge, teammates update a clean main with git pull --ff-only and branch for their next task. Existing feature branches bring in main deliberately; do not discard local work to synchronize.

## Instructions to give your coding agent

> Read AGENTS.md, docs/TEAM_START_HERE.md, docs/TEAM_WORKFLOW.md, and docs/SPONSOR_TRACKS.md. Work only on my assigned task and branch. Use the existing React/Vite/MapLibre/Convex project. UI work connects to https://bold-lobster-565.convex.cloud through VITE_CONVEX_URL and runs pnpm dev only. Do not scaffold another project, deploy backend code, start a Convex watcher, modify server secrets/data, expand scope, or edit another owner's files without coordination. Preserve existing work, open a PR, and report actual tests and blockers. Claude remains the in-app flyer extraction API; public accounts and social features are out of scope.

## Access

GitHub collaborators need their own GitHub accounts and repository access. UI developers can connect to the public event query without Convex dashboard access. Backend developers need a Convex team/project invitation using their own accounts; GitHub repository access does not grant Convex dashboard access. Never share login credentials, deploy keys, APIFY_TOKEN, or ANTHROPIC_API_KEY in chat or Git. Integration secrets stay on the shared server.
