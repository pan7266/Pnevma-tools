export type ToolDocSlug = "spot" | "axis" | "kerf" | "lasercoach";

export interface ToolDoc {
  slug: ToolDocSlug;
  title: string;
  shortName: string;
  href: string;
  summary: string;
  solves: string[];
  inputs: string[];
  outputs: string[];
  everydayUse: string[];
  limits: string[];
}

export const TOOL_DOCS: ToolDoc[] = [
  {
    slug: "spot",
    title: "CO2 Laser Spot Diameter",
    shortName: "Spot Diameter",
    href: "/spot",
    summary: "This calculator estimates the focused laser spot from the source, optics, losses, lens, mirrors, alignment, and selected power.",
    solves: [
      "Shows whether a lens and mirror setup is likely to clip the beam.",
      "Estimates delivered watt at the material instead of assuming tube watt is the same as usable watt.",
      "Gives a practical spot diameter to reuse in focus, kerf, and engraving interval tools.",
    ],
    inputs: [
      "Laser source or manual tube values so the calculator knows the starting beam and watt basis.",
      "Lens and mirror sizes so it can check clear aperture and focus behavior.",
      "Power, current, Hz, smoke, extraction, and alignment loss so the result reflects real workshop conditions.",
    ],
    outputs: [
      "Estimated spot diameter and beam stability.",
      "Delivered watt, path loss, mirror loss, pulse energy, and power density.",
      "Warnings when the beam is clipped, over-stressed, or based on weak assumptions.",
    ],
    everydayUse: [
      "Pick the closest source preset, then enter your lens and mirror setup.",
      "Use measured watt/current when you have it; otherwise treat the result as a first estimate.",
      "Save the optical profile and use it in Kerf & Focus Depth or Triple Factor Laser Coach.",
    ],
    limits: [
      "It does not measure your machine; dirty optics, bad alignment, cooling, and tube age can change the result.",
      "Use scrap tests before production settings.",
    ],
  },
  {
    slug: "axis",
    title: "Axis Line Interval",
    shortName: "Axis Interval",
    href: "/axis",
    summary: "This calculator checks whether engraving line interval or DPI lands cleanly on real motor microsteps and controller steps.",
    solves: [
      "Helps avoid uneven engraving lines caused by impossible or awkward mechanical intervals.",
      "Compares your controller steps with the calculated axis mechanics.",
      "Finds nearby clean intervals that land on whole microstep counts.",
    ],
    inputs: [
      "Scan direction so the tool knows which axis controls line spacing.",
      "Requested line interval or DPI so it can compare the target against the mechanics.",
      "Motor angle, microstepping, pulley/belt/screw values, and controller steps so the axis resolution is known.",
    ],
    outputs: [
      "Clean/not-clean status for the selected interval.",
      "Nearest clean interval and matching DPI.",
      "Controller comparison and spot overlap guidance.",
    ],
    everydayUse: [
      "Choose the scan direction used in your engraving job.",
      "Enter the DPI or line interval you want to use.",
      "Use the nearest clean interval when the selected value does not land well mechanically.",
    ],
    limits: [
      "It checks geometry and steps only; belts, wheels, backlash, vibration, and controller tuning still matter.",
      "Use a real engraving test to confirm banding and visual quality.",
    ],
  },
  {
    slug: "kerf",
    title: "Kerf & Focus Depth",
    shortName: "Kerf & Focus",
    href: "/kerf",
    summary: "This advisor uses an optical profile, material, thickness, operation, and calibration data to recommend a practical focus depth.",
    solves: [
      "Chooses where to place focus through the material instead of always focusing on the surface.",
      "Connects optical spot behavior with material thickness, kerf, and quality goals.",
      "Produces LightBurn-ready notes so setup details travel with the job.",
    ],
    inputs: [
      "Optical profile from the Spot Diameter tool so the beam size and Rayleigh range are known.",
      "Material, subtype, thickness, operation, and quality goal so the advice matches the job.",
      "Optional kerf calibration values so the recommendation uses measured fit data.",
    ],
    outputs: [
      "Recommended focus depth and acceptable range.",
      "Expected kerf behavior, risks, benefits, and confidence.",
      "Suggested calibration test and LightBurn notes.",
    ],
    everydayUse: [
      "Start with a saved optical profile.",
      "Select the real material and operation, then enter sheet thickness.",
      "Run a focus ladder or kerf coupon before saving production offsets.",
    ],
    limits: [
      "It does not make unknown materials safe. Confirm material identity before laser cutting.",
      "Coatings, glue, moisture, airflow, and fixturing can dominate the result.",
    ],
  },
  {
    slug: "lasercoach",
    title: "Triple Factor Laser Coach",
    shortName: "Triple Factor Coach",
    href: "/lasercoach",
    summary: "This wizard recommends laser job settings from three main factors: machine motion, optics/material preset, and vector geometry with feedback correction.",
    solves: [
      "Turns a vector file and material choice into starting speed, power, passes, focus, and air assist.",
      "Stores absolute machine speed and acceleration values so recommendations respect real motion limits.",
      "Learns cautiously from feedback without changing machine motion settings automatically.",
    ],
    inputs: [
      "Machine and motion profile so the recommendation is capped by real speed and acceleration limits.",
      "Optics, source power, material, operation, and quality mode so the energy model starts from the right context.",
      "SVG vector geometry and later job feedback so the tool can adjust future correction factors.",
    ],
    outputs: [
      "Recommended speed, min/max power, passes, focus offset, air assist, risk, and estimated time.",
      "Three-factor reasoning for machine motion, optics/material, and vector/feedback.",
      "Correction profile and motion snapshot for audit and repeatability.",
    ],
    everydayUse: [
      "Set or confirm the machine and motion profile first.",
      "Upload an SVG, check the recommendation, then test on scrap.",
      "After the real job, enter what happened so the correction profile improves over time.",
    ],
    limits: [
      "SVG analysis is implemented now; DXF, AI, and PDF upload are accepted in the workflow but need later parsers for analysis.",
      "The recommendation is not universal truth and must be verified on the real machine.",
    ],
  },
];

export function getToolDoc(slug: string): ToolDoc | undefined {
  return TOOL_DOCS.find((doc) => doc.slug === slug);
}
