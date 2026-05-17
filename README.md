# Pnevma Tools

Modern Next.js TypeScript migration of the original standalone Pnevma Tools HTML calculators.

Owner: Pnevma.

## Tools

- CO2 Laser Spot Diameter Calculator: source presets, lens shape, finish comparison, mirror path losses, alignment, smoke/extraction, beam expander checks, and inline SVG graphs.
- Laser Axis Line Interval Calculator: motor microsteps, controller steps/mm, linked DPI/line interval inputs, clean interval checks, spot overlap, and inline SVG interval graph.
- CO2 Laser Kerf & Focus Depth Advisor: imports the saved optical profile from the Spot calculator, recommends focus depth by material/operation/quality goal, explains optical beam-through-material behavior, supports kerf calibration, and saves custom material profiles in localStorage.

## Install

```powershell
npm install
```

## Development

```powershell
npm run dev
```

Open the local URL printed by Next.js, usually `http://localhost:3000`.

If port 3000 is busy:

```powershell
npm run dev -- --port 3001
```

The current development checks were run on `http://localhost:3001`.

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

The API routes are thin wrappers. Calculator math lives in `lib/calculators`.

## Static Export / GitHub Pages

Next.js static export is attempted with:

```powershell
npx next export
```

For current Next.js versions, static export is configured through `output: "export"` and `next build`. This app also includes REST route handlers; GitHub Pages can serve the static pages and static GET JSON endpoints, while the client falls back to the same pure calculator functions when POST calculation routes are unavailable. A full Next.js runtime is still preferred when API-backed calculation logging or server-side validation is required.

## Migration Notes

- Source HTML files used for this migration were the standalone `index.html`, `co2-spot-calculator.html`, and `axis-line-interval-calculator.html`.
- Static source, finish, lens, mirror, option, label, default, and notice data were extracted into typed modules under `lib/data`.
- The old iframe and `postMessage` workspace was replaced with direct React routes and shared settings context.
- Graphs remain inline SVG. No charting library is used.
- No GraphQL, database, authentication, Tailwind, shadcn/ui, browser Babel, UMD React scripts, iframe, or charting package is included.
- CO2 lamp/source detail links now prefer official manufacturer pages, manuals, or datasheets where available, including RECI, SPT, EFR, LaserLife, Novanta SYNRAD, Coherent, and Luxinar sources.
- The Spot calculator includes live calculation, sticky readouts, collapsible graph sections, optical-path visualization, focal-length presets up to 228.6 mm plus custom focal length input, and a rough spot-temperature estimate shown as a thermal index.
- The Kerf Advisor imports the Spot optical profile, explains micrometres, measured spot/kerf, Rayleigh range, focus depth, taper tendency, confidence, and calibration workflows with inline SVG diagrams.

## Important Notice

These calculators are workshop planning aids. They are not certified metrology, safety, medical, legal, or compliance tools. Validate important machine settings with real measurements, test cuts, burn tests, manufacturer documentation, and normal laser safety procedures.

Pnevma provides the tools without warranty.
