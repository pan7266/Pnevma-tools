# Triple Factor Laser Coach Developer Notes

Triple Factor Laser Coach is the fourth Pnevma Tools module. The internal route, API, and storage namespace remain `lasercoach`. It follows the existing pattern: typed data in `types`, deterministic calculator logic in `lib/calculators`, seed data in `lib/data`, thin route handlers in `app/api`, and browser-local state in the React tool.

## Data Model

Core entities are `LaserMachine`, `MachineMotionProfile`, `LaserMaterial`, `LaserOperationPreset`, `VectorJob`, `VectorAnalysis`, `LaserRecommendation`, `LaserJobFeedback`, `MachineMaterialCorrection`, and `CorrectionHistory`.

Machine speed is stored in `mm/s`, acceleration in `mm/s^2`, dimensions in `mm`, and power as percent. Optional real watt output is stored on `LaserMachine.realMeasuredMaxPowerW`.

The machine motion profile stores absolute motion values:

- `maxSpeedMmSec`
- `maxAccelerationMmSec2`
- `idleSpeedMmSec`
- `idleAccelerationMmSec2`
- `cutAccelerationMmSec2`
- nullable scan, engrave, jump-off, start, and corner speeds/accelerations
- controller factors from 0 to 200 percent

Feedback never mutates `MachineMotionProfile`. Machine motion settings require explicit user edits.

## Wizard Flow

The browser tool is organized as Setup, Upload, Results, and Feedback. Setup selects the machine, motion profile, job material/operation, and editable optics/source values. Optics are pulled from the CO2 Laser Spot Diameter localStorage key `pnevma.opticalProfiles.v1` when profiles exist. Those values are copied into editable inputs for the current recommendation and can be applied back to the selected machine defaults explicitly.

The upload step accepts SVG, DXF, AI, and PDF file extensions at the UI boundary. SVG is the only parser implemented today; DXF/AI/PDF remain behind the file-type abstraction until parser support is added.

## Recommendation Formula

`createLaserRecommendation` starts from `LaserOperationPreset`, applies `MachineMaterialCorrection`, applies geometry and desired-quality multipliers, then clamps:

```text
speed = baseSpeed * correction.speedMultiplier * geometrySpeedMultiplier * desiredQualityMultiplier
maxPower = baseMaxPower + correction.maxPowerBiasPercent + geometryPowerBiasPercent
minPower = baseMinPower + correction.minPowerBiasPercent
passes = basePasses + correction.passBias + geometryPassBias
```

Speed is capped by `maxSpeedMmSec`, `speedFactorPercent`, and an operation-specific limit. Power is clamped to 0-100 percent. Passes are clamped to the configured safe maximum.

Absolute motion values are used for the motion snapshot, speed caps, estimated job time, travel moves using `idleSpeedMmSec`, acceleration penalties using cut/idle acceleration, and warnings for small geometry or aggressive G0 acceleration.

## Feedback Rules

`processLaserJobFeedback` updates only `MachineMaterialCorrection`.

- Cut-through failures increase max-power bias or reduce speed if already near high power.
- Melting, charring, and dark engraving reduce energy and may raise speed.
- Burned corners reduce min-power bias and warn about acceleration/corner heat.
- Smoke staining adds process warnings and only a small speed adjustment.
- Banding and wrong scale do not adjust energy corrections.
- Lost steps add motion-profile warnings but do not change machine settings.
- Successful jobs increase confidence.

Each update creates a `CorrectionHistory` record with before/after JSON.

## SVG Analysis

SVG support lives in `lib/calculators/lasercoach-svg.ts`.

Uploaded SVG is treated as untrusted. The sanitizer rejects active content, event handlers, `foreignObject`, scripts, styles, embedded objects, JavaScript URLs, and remote references. The analyzer does not render uploaded SVG inline.

Supported measurable elements:

- `path`
- `rect`
- `circle`
- `ellipse`
- `line`
- `polyline`
- `polygon`

The parser estimates path length, open/closed paths, duplicate lines, tiny features, bounds, curve segment count, sharp corners, and warnings.

## Adding Materials

Add a `LaserMaterial` seed in `lib/data/lasercoach.ts`, then add one or more `LaserOperationPreset` entries with conservative editable values. Use notes that identify the preset as an editable starting point, not universal truth.

## Adding DXF Later

Keep the SVG analyzer contract and add a sibling parser that returns the same `SvgAnalysisResult`-shaped geometry data without SVG-specific fields. The upload route should dispatch by `fileType`, store the original file by the same secure storage path, and keep `VectorAnalysis` unchanged.

## Safety Limitations

Triple Factor Laser Coach provides deterministic workshop estimates, not certified settings. Material chemistry, tube age, optics, alignment, smoke, air assist, controller behavior, and fixturing can dominate results. Every recommendation must be verified on scrap material with normal laser safety procedures.
