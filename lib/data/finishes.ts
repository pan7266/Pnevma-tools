// Extracted from the old standalone HTML files. Keep values verbatim unless the source HTML changes.

export const FINISHES = {
        PVD: {
          key: "PVD",
          quality: 1.07,
          thermal: 0.0018,
          transmission: 0.92,
          color: "#e2434b",
        },
        CVD: {
          key: "CVD",
          quality: 1.02,
          thermal: 0.0011,
          transmission: 0.95,
          color: "#1f6feb",
        },
        PRO: {
          key: "PRO",
          quality: 0.97,
          thermal: 0.0007,
          transmission: 0.98,
          color: "#0b8f6a",
        },
      } as const;

export const MIRROR_FINISHES = {
        enhancedCopper: {
          label: "Enhanced copper HR",
          reflectivity: 0.997,
          absorption: 0.003,
          thermalCoefficient: 0.0008,
        },
        protectedGold: {
          label: "Protected gold / Si",
          reflectivity: 0.99,
          absorption: 0.01,
          thermalCoefficient: 0.0012,
        },
        molybdenum: {
          label: "Molybdenum",
          reflectivity: 0.981,
          absorption: 0.019,
          thermalCoefficient: 0.0016,
        },
        standardSi: {
          label: "Standard silicon mirror",
          reflectivity: 0.985,
          absorption: 0.015,
          thermalCoefficient: 0.0014,
        },
      } as const;
