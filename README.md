# KinCircle — interactive portfolio demo

An isolated, browser-only demonstration of the original KinCircle messenger UI, prepared for potential employers. It uses fictional people, emails under demo.example, sample conversations, and two original illustrated landscapes. No production database, family media, authentication credentials, or live messaging services are included.

## Experience

Open the demo and select **Open interactive demo**. Explore as fictional sample admin Alex Morgan. Send messages; reply, edit, delete, and react; create or rename a group; customize avatars and wallpapers; view the gallery; and approve or reject the sample pending member. **Simulate reply** adds a visibly labeled fictional reply. **Reset demo** restores the original sample data for this browser only.

Changes are saved under kincircle-demo-v1 in the visitor's local storage. Visitors do not share data. Images are read locally as data URLs, limited to supported raster types and 1 MB each. The sample state is bounded to 200 messages and 12 gallery photos. Storage-quota errors retain the current in-memory session and show a notice.

Live Socket.IO delivery between people, email, notifications, invitations, and voice/video calls are disabled. This demo shows the frontend interaction design; it does not claim to demonstrate the production backend or real authentication. The full application uses React, TypeScript, Express, PostgreSQL, and Socket.IO; this separate build is React/TypeScript with a local demo adapter and a static Node.js file server.

## Run

- `npm ci`
- `npm run build`
- `node server.mjs` — http://127.0.0.1:4320
- `npm test -- --run src/__tests__/demo-engine.test.ts`

## Deployment

The Dockerfile builds the frontend from this sanitized source folder and serves only dist/. fly.toml targets a **separate** Fly.io application, kincircle-demo-rusetochka. It needs no secrets, database, persistent volume, or production network access. A single 256 MB shared VM can stop when idle and restart on requests. Fly.io compute charges can apply while it runs.

Original messenger source, its existing uncommitted changes, and its Fly.io application are unaffected. The demo is maintained as a separate copy at C:/Users/User/Documents/KinCircleDemo.

Published demo: https://kincircle-demo-rusetochka.fly.dev/ (18 November 2026). Homepage and health checks returned HTTP 200; source and API paths returned HTTP 404. Public app: kincircle-demo-rusetochka; no secrets, database, or volumes were created.

