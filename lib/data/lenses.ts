// Extracted from the old standalone HTML files. Keep values verbatim unless the source HTML changes.

export const LENS_SHAPES = {
        meniscus: { factor: 0.98, labelKey: "meniscus" },
        convex: { factor: 1.04, labelKey: "convex" },
      } as const;

export const LENS_DIAMETERS = [
        { mm: 12, label: "12 mm" },
        { mm: 18, label: "18 mm" },
        { mm: 19.05, label: "19.05 mm / 0.75 in" },
        { mm: 20, label: "20 mm" },
        { mm: 25, label: "25 mm" },
        { mm: 25.4, label: "25.4 mm / 1 in" },
        { mm: 27.94, label: "27.94 mm / 1.1 in" },
        { mm: 38.1, label: "38.1 mm / 1.5 in" },
      ] as const;

export const FOCAL_LENGTHS = [
        { mm: 25.4, label: "1.0 in / 25.4 mm" },
        { mm: 38.1, label: "1.5 in / 38.1 mm" },
        { mm: 50.8, label: "2.0 in / 50.8 mm" },
        { mm: 63.5, label: "2.5 in / 63.5 mm" },
        { mm: 76.2, label: "3.0 in / 76.2 mm" },
        { mm: 101.6, label: "4.0 in / 101.6 mm" },
        { mm: 127, label: "5.0 in / 127 mm" },
        { mm: 190.5, label: "7.5 in / 190.5 mm" },
        { mm: 228.6, label: "9.0 in / 228.6 mm" },
        { mm: 254, label: "10.0 in / 254 mm" },
        { mm: 304.8, label: "12.0 in / 304.8 mm" },
        { mm: 381, label: "15.0 in / 381 mm" },
        { mm: 508, label: "20.0 in / 508 mm" },
      ] as const;
