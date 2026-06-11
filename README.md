# Pnevma Tools

Modern Next.js TypeScript migration of the original standalone Pnevma Tools HTML calculators.

Owner: Pnevma.

## Tools

- CO2 Laser Spot Diameter Calculator: source presets, lens shape, finish comparison, mirror path losses, alignment, smoke/extraction, beam expander checks, and inline SVG graphs.
- Laser Axis Line Interval Calculator: motor microsteps, controller steps/mm, linked DPI/line interval inputs, clean interval checks, spot overlap, and inline SVG interval graph.
- CO2 Laser Kerf & Focus Depth Advisor: imports the saved optical profile from the Spot calculator, recommends focus depth by material/operation/quality goal, explains optical beam-through-material behavior, supports kerf calibration, and saves custom material profiles in localStorage.
- Triple Factor Laser Coach: analyzes SVG vector geometry, combines material presets with absolute machine motion and optics values, recommends speed/power/passes, and learns machine/material corrections from user feedback without mutating machine motion settings.

## Install

```powershell
npm install
```

## Development

```powershell
npm run dev
```

Open the local URL printed by Next.js, configured as `http://localhost:3001` because port 3000 is commonly occupied.

## Build

```powershell
npm run build
npm run start
```

## Tests

```powershell
npm run test
```

## REST Endpoints

- `POST /api/spot/calculate`: accepts `SpotInputs`, validates the payload, calls `calculateSpot`, and returns `SpotResult`.
- `POST /api/axis/calculate`: accepts `AxisInputs`, validates the payload, calls `calculateAxis`, and returns `AxisResult`.
- `GET /api/config`: returns static UI config, defaults, source presets, lens/mirror/finish presets, labels, options, and notices.
- `GET /api/spot/sources`: returns the CO2 source preset library.
- `GET /api/spot/options`: returns Spot calculator defaults and optical option presets.
- `GET /api/axis/motors`: returns structured axis motor presets.
- `GET /api/kerf/materials`: returns Kerf Advisor material, operation, quality-goal, calibration, and default optical-profile data.
- `GET /api/lasercoach/options`: returns Triple Factor Laser Coach seed machine, motion, material, operation, quality, air assist, and feedback options.
- `GET|POST /api/lasercoach/machines`: lists or creates/updates laser machines.
- `GET|PATCH|DELETE /api/lasercoach/machines/:id`: reads, updates, or deletes a laser machine.
- `GET|POST /api/lasercoach/motion-profiles`: lists or creates/updates machine motion profiles.
- `GET|PATCH|DELETE /api/lasercoach/motion-profiles/:id`: reads, updates, or deletes a motion profile.
- `GET|POST /api/lasercoach/materials`: lists or creates/updates materials.
- `GET|PATCH|DELETE /api/lasercoach/materials/:id`: reads, updates, or deletes a material.
- `GET|POST /api/lasercoach/operation-presets`: lists or creates/updates operation presets.
- `GET|PATCH|DELETE /api/lasercoach/operation-presets/:id`: reads, updates, or deletes an operation preset.
- `POST /api/lasercoach/vector/analyze`: accepts SVG text, stores a sanitized server-runtime copy, and returns a vector job plus analysis.
- `POST /api/lasercoach/recommendations`: creates a deterministic recommendation from stored machine, motion, material, preset, analysis, and correction data.
- `POST /api/lasercoach/feedback`: stores job feedback and updates only `MachineMaterialCorrection`.
- `GET /api/lasercoach/corrections`: reads correction profiles, optionally filtered by machine/material/operation.
- `GET /api/lasercoach/export` and `POST /api/lasercoach/import`: export/import machine profiles, material presets, and corrections as JSON.
- `POST /api/admin/logs`: authenticated read-only request-log view used by `/admin`.

The API routes are thin wrappers. Calculator math lives in `lib/calculators`.

## Admin Request Logs

Open `/admin` on a Next.js runtime to view recent request logs. The panel is read-only and shows timestamp, IP, method, status, URL, and user-agent.

Default admin credentials are intended for the project owner. The password is stored in source as a SHA-256 hash, and deployments may override credentials with `ADMIN_USERNAME`, `ADMIN_PASSWORD`, or `ADMIN_PASSWORD_SHA256`.

Request logs are stored server-side in `.request-logs/requests.jsonl` plus a rolling in-memory buffer. This is intentionally ignored by Git.

## Static Export / GitHub Pages

Next.js static export is attempted with:

```powershell
npx next export
```

For current Next.js versions, static export is configured through `output: "export"` and `next build`. This app also includes REST route handlers; GitHub Pages can serve the static pages and static GET JSON endpoints, while the client falls back to the same pure calculator functions when POST calculation routes are unavailable. The `/admin` page shell is exported, but authenticated request logs require a full Next.js runtime because GitHub Pages cannot run server-side route handlers or write log files.

## Migration Notes

- Source HTML files used for this migration were the standalone `index.html`, `co2-spot-calculator.html`, and `axis-line-interval-calculator.html`.
- Static source, finish, lens, mirror, option, label, default, and notice data were extracted into typed modules under `lib/data`.
- The old iframe and `postMessage` workspace was replaced with direct React routes and shared settings context.
- Graphs remain inline SVG. No charting library is used.
- No GraphQL, database, Tailwind, shadcn/ui, browser Babel, UMD React scripts, iframe, or charting package is included. Authentication is limited to the read-only `/admin` request-log panel.
- Triple Factor Laser Coach server routes use a local `.lasercoach-store` JSON file when a Next.js runtime is available; the browser UI also keeps data in localStorage for static-export compatibility.
- CO2 lamp/source detail links now prefer official manufacturer pages, manuals, or datasheets where available, including RECI, SPT, EFR, LaserLife, Novanta SYNRAD, Coherent, and Luxinar sources.
- The Spot calculator includes live calculation, sticky readouts, collapsible graph sections, optical-path visualization, focal-length presets up to 228.6 mm plus custom focal length input, and a rough spot-temperature estimate shown as a thermal index.
- The Kerf Advisor imports the Spot optical profile, explains measured spot/kerf, Rayleigh range, focus depth, taper tendency, confidence, and calibration workflows with inline SVG diagrams.
- Privacy, terms, and contact pages are available from the compact footer. Business contact email is `pan@pnevmagifts.gr`.

## Important Notice

These calculators are workshop planning aids. They are not certified metrology, safety, medical, legal, or compliance tools. Validate important machine settings with real measurements, test cuts, burn tests, manufacturer documentation, and normal laser safety procedures.

Pnevma provides the tools without warranty.
