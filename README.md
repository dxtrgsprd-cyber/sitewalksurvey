# SiteWalkSurvey

Door, camera and infrastructure site walk surveys for physical security
integrators. Scope it right the first time. White-label, runs on iPhone, Android
and desktop as an installable PWA, and works offline in the field.

## Features

- **6 survey sections**: Project, CCTV, Access Control, Site/Infrastructure, Additional, Photos
- **Multi-camera cards**: Per-camera location, type, mount, view, height, interior/exterior, photos
- **Multi-door cards**: Per-door location, type, frame, lock style, hardware, ADA, reader side, photos
- **Photo capture**: Device camera integration + file upload, per-item photo attachment
- **Signature capture**: Touch/mouse canvas-based sign-off
- **PDF export**: Formatted report with logo, all data, photos, signature
- **Text/JSON export**: Plain text report + raw JSON data
- **Share**: Native share sheet (mobile) or clipboard copy
- **White-label branding**: Company logo, name and tagline, saved on the device
- **Offline-capable**: Service worker caches app for field use
- **Auto-save**: saved on the device, survives browser close
- **Documentation checklist**: CCTV, Access Control, and General photo checklists

## Free and standalone

No account, no sign-in, no subscription. Each person's surveys, photos and
branding are stored in their own browser on their own device (IndexedDB), and
nothing is sent to a server. Data does not sync between devices, and clearing
the browser's site data deletes it — use **Export → Download JSON** to keep a
copy.

## Tech Stack

- Next.js 15.1 / React 19 / TypeScript
- IndexedDB for on-device survey, photo and branding storage
- jsPDF (CDN) for PDF generation
- Service Worker for offline caching
- localStorage for the in-progress draft

## Development

```bash
npm install
npm run dev
```

No environment variables are required.

## Deployment (Cloudflare — free)

`npm run build` writes a fully static site to `out/` (`output: "export"` in
`next.config.ts`); `wrangler.jsonc` serves that folder as Cloudflare static
assets. No server code, secrets or environment variables are involved.

Git-connected (deploys on every push to `main`): Cloudflare dashboard →
**Workers & Pages → Create → Import a repository**, pick this repo, then set

- **Build command**: `npm run build`
- **Deploy command**: `npx wrangler deploy`

Or deploy from a terminal:

```bash
npx wrangler login
npm run deploy
```

## PWA Install

Visit the deployed URL on any device. On mobile, tap "Add to Home Screen" from the browser menu.
