// Extracted from the old standalone HTML files. Keep values verbatim unless the source HTML changes.

import type { AxisInputs } from '@/types';

export const spotDefaultValues = {
        family: "all",
        sourceId: "",
        manualRatedWatt: "",
        manualSourceBeamMm: "",
        manualM2: "",
        measuredWatt: "",
        peakWatt: "",
        powerPercent: 65,
        ampValue: "",
        ampMeterType: "digital",
        hz: 20000,
        lensDiameter: 20,
        focalLength: 50.8,
        lensShape: "meniscus",
        finish: "CVD",
        cvdMaker: "generic",
        mirrorFinish: "enhancedCopper",
        mirrorDiameter: 25,
        mirrorCount: 3,
        mirrorTempC: "",
        smokePresent: false,
        extractorOn: true,
        extractorStrength: "normal",
        imperfectAlignment: true,
        alignmentLossPercent: 4,
        useExpander: false,
        expanderMultiplier: 2,
        beamCombinerPosition: "none",
        beamCombinerTransmission: 97,
        beamCombinerDiameter: 20,
      } as const;

export function axisDefaults(dualMotorMode: AxisInputs['axes']['x']['dualMotorMode']): AxisInputs['axes']['x'] {
  return {
    motorPresetId: "generic-nema17-09",
    driveType: 'belt',
    motorAngle: 0.9,
    microstepping: 16,
    beltPitch: 2.032,
    pulleyTeeth: 20,
    screwPitch: 2,
    threadStarts: 4,
    directTravelPerRev: 40.64,
    controllerStepsPerMm: null,
    dualMotorMode,
    secondMotorAngle: 0.9,
    secondPulleyTeeth: 20,
    secondMicrostepping: 16,
  };
}

export const axisDefaultValues: AxisInputs = {
  language: 'en',
  theme: 'light',
  unitSystem: 'metric',
  scanMode: 'horizontal',
  lineInterval: 0.06,
  dpi: 423.33333333333337,
  spotDiameter: 0.12,
  liveCalculation: true,
  axes: {
    x: axisDefaults('none'),
    y: axisDefaults('none'),
  },
};
