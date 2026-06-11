import { LASERCOACH_MAX_UPLOAD_BYTES } from "@/lib/data/lasercoach";
import type { VectorAnalysis } from "@/types";

type Point = { x: number; y: number };
type Segment = { a: Point; b: Point };
type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

export interface SvgAnalysisInput {
  vectorJobId?: string;
  fileName: string;
  svgText: string;
  declaredWidthMm?: number | null;
  declaredHeightMm?: number | null;
  tinyFeatureThresholdMm?: number;
}

export interface SvgSanitizeResult {
  ok: boolean;
  sanitizedSvg: string;
  errors: string[];
  warnings: string[];
}

export interface SvgAnalysisResult extends Omit<VectorAnalysis, "id" | "vectorJobId" | "createdAt"> {
  detectedWidthMm: number | null;
  detectedHeightMm: number | null;
  scaleFactor: number | null;
  sanitizedSvg: string;
}

const ALLOWED_ELEMENTS = new Set([
  "svg",
  "g",
  "defs",
  "title",
  "desc",
  "metadata",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
]);

const DANGEROUS_ELEMENT_PATTERN = /<\s*(script|foreignObject|iframe|object|embed|link|style)\b/i;
const EVENT_HANDLER_PATTERN = /\s+on[a-z]+\s*=/i;
const REMOTE_REFERENCE_PATTERN = /\b(?:href|xlink:href|src)\s*=\s*["']\s*(?:https?:|\/\/|data:text\/html|javascript:)/i;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, decimals = 4): number {
  return Number(value.toFixed(decimals));
}

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function emptyBounds(): Bounds {
  return {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };
}

function addPoint(bounds: Bounds, point: Point) {
  bounds.minX = Math.min(bounds.minX, point.x);
  bounds.minY = Math.min(bounds.minY, point.y);
  bounds.maxX = Math.max(bounds.maxX, point.x);
  bounds.maxY = Math.max(bounds.maxY, point.y);
}

function addBounds(bounds: Bounds, other: Bounds) {
  if (!Number.isFinite(other.minX)) return;
  addPoint(bounds, { x: other.minX, y: other.minY });
  addPoint(bounds, { x: other.maxX, y: other.maxY });
}

function boundsWidth(bounds: Bounds): number {
  return Number.isFinite(bounds.minX) ? bounds.maxX - bounds.minX : 0;
}

function boundsHeight(bounds: Bounds): number {
  return Number.isFinite(bounds.minY) ? bounds.maxY - bounds.minY : 0;
}

function parseAttributes(raw = ""): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrPattern = /([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;
  while ((match = attrPattern.exec(raw))) {
    attrs[match[1]] = match[2] ?? match[3] ?? "";
  }
  return attrs;
}

function parseNumber(value: unknown, fallback = 0): number {
  const parsed = Number(String(value ?? "").trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseSvgLengthToMm(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)(px|mm|cm|in|pt)?$/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = (match[2] || "px").toLowerCase();
  if (!Number.isFinite(amount)) return null;
  if (unit === "mm") return amount;
  if (unit === "cm") return amount * 10;
  if (unit === "in") return amount * 25.4;
  if (unit === "pt") return amount * 25.4 / 72;
  return amount * 25.4 / 96;
}

function parseViewBox(value: string | undefined): { x: number; y: number; width: number; height: number } | null {
  if (!value) return null;
  const parts = value
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter(Number.isFinite);
  if (parts.length !== 4 || parts[2] <= 0 || parts[3] <= 0) return null;
  return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
}

function pointsFromString(value: string | undefined): Point[] {
  if (!value) return [];
  const nums = value.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number).filter(Number.isFinite) || [];
  const points: Point[] = [];
  for (let index = 0; index + 1 < nums.length; index += 2) {
    points.push({ x: nums[index], y: nums[index + 1] });
  }
  return points;
}

function transformPoint(point: Point, scaleX: number, scaleY: number): Point {
  return { x: point.x * scaleX, y: point.y * scaleY };
}

function normalizeSegmentKey(segment: Segment, toleranceMm: number): string {
  const a = segment.a;
  const b = segment.b;
  const leftFirst = a.x < b.x || (Math.abs(a.x - b.x) <= toleranceMm && a.y <= b.y);
  const p1 = leftFirst ? a : b;
  const p2 = leftFirst ? b : a;
  const quantize = (value: number) => Math.round(value / toleranceMm);
  return `${quantize(p1.x)},${quantize(p1.y)}:${quantize(p2.x)},${quantize(p2.y)}`;
}

function sanitizeTag(rawTag: string): string {
  return rawTag
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*')/gi, "")
    .replace(/\s+(?:href|xlink:href|src)\s*=\s*(?:"\s*(?:https?:|\/\/|javascript:|data:text\/html)[^"]*"|'\s*(?:https?:|\/\/|javascript:|data:text\/html)[^']*')/gi, "");
}

export function sanitizeSvgForAnalysis(svgText: string): SvgSanitizeResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const byteLength = new TextEncoder().encode(svgText).byteLength;

  if (byteLength > LASERCOACH_MAX_UPLOAD_BYTES) {
    errors.push(`SVG file is too large. Limit is ${LASERCOACH_MAX_UPLOAD_BYTES} bytes.`);
  }
  if (!/<\s*svg\b/i.test(svgText)) errors.push("File does not contain an SVG root element.");
  if (DANGEROUS_ELEMENT_PATTERN.test(svgText)) {
    errors.push("SVG contains a blocked active or embedded element.");
  }
  if (EVENT_HANDLER_PATTERN.test(svgText)) {
    errors.push("SVG contains event handler attributes.");
  }
  if (REMOTE_REFERENCE_PATTERN.test(svgText)) {
    errors.push("SVG contains remote or executable references.");
  }

  const sanitizedSvg = svgText
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\s*(script|foreignObject|iframe|object|embed|link|style)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|foreignObject|iframe|object|embed|link|style)\b[^>]*\/?>/gi, "")
    .replace(/<[^>]+>/g, sanitizeTag);

  const tagPattern = /<\s*\/?\s*([a-zA-Z][\w:-]*)\b[^>]*>/g;
  let match: RegExpExecArray | null;
  while ((match = tagPattern.exec(sanitizedSvg))) {
    const tag = match[1].toLowerCase();
    if (!ALLOWED_ELEMENTS.has(tag)) {
      warnings.push(`Unsupported SVG element ignored: ${tag}`);
    }
  }

  return { ok: errors.length === 0, sanitizedSvg, errors, warnings };
}

function cubicPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt ** 3 * p0.x + 3 * mt ** 2 * t * p1.x + 3 * mt * t ** 2 * p2.x + t ** 3 * p3.x,
    y: mt ** 3 * p0.y + 3 * mt ** 2 * t * p1.y + 3 * mt * t ** 2 * p2.y + t ** 3 * p3.y,
  };
}

function quadraticPoint(p0: Point, p1: Point, p2: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt ** 2 * p0.x + 2 * mt * t * p1.x + t ** 2 * p2.x,
    y: mt ** 2 * p0.y + 2 * mt * t * p1.y + t ** 2 * p2.y,
  };
}

function tokenizePath(d: string): string[] {
  return d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?/g) || [];
}

function parsePathGeometry(d: string, scaleX: number, scaleY: number) {
  const tokens = tokenizePath(d);
  let index = 0;
  let command = "";
  let current: Point = { x: 0, y: 0 };
  let start: Point = { x: 0, y: 0 };
  let length = 0;
  let open = true;
  let curveSegments = 0;
  let sharpCornerCount = 0;
  const bounds = emptyBounds();
  const segments: Segment[] = [];
  const featureLengths: number[] = [];
  let previousVector: Point | null = null;

  function hasNumber() {
    return index < tokens.length && !/^[a-zA-Z]$/.test(tokens[index]);
  }

  function readNumber() {
    return Number(tokens[index++]);
  }

  function recordLine(toRaw: Point, includeDuplicateSegment = true) {
    const from = transformPoint(current, scaleX, scaleY);
    const to = transformPoint(toRaw, scaleX, scaleY);
    const segmentLength = distance(from, to);
    if (segmentLength > 0) {
      length += segmentLength;
      featureLengths.push(segmentLength);
      addPoint(bounds, from);
      addPoint(bounds, to);
      if (includeDuplicateSegment) segments.push({ a: from, b: to });
      const vector = { x: to.x - from.x, y: to.y - from.y };
      if (previousVector) {
        const dot = previousVector.x * vector.x + previousVector.y * vector.y;
        const mag = Math.hypot(previousVector.x, previousVector.y) * Math.hypot(vector.x, vector.y);
        const angle = mag > 0 ? Math.acos(clamp(dot / mag, -1, 1)) : 0;
        if (angle > Math.PI * 0.7) sharpCornerCount += 1;
      }
      previousVector = vector;
    }
    current = toRaw;
  }

  function recordCurve(points: Point[]) {
    let previous = current;
    for (const point of points) {
      recordLine(point, false);
      previous = point;
    }
    current = previous;
    curveSegments += points.length;
  }

  while (index < tokens.length) {
    if (/^[a-zA-Z]$/.test(tokens[index])) command = tokens[index++];
    if (!command) break;
    const relative = command === command.toLowerCase();
    const cmd = command.toUpperCase();

    if (cmd === "M") {
      if (!hasNumber()) break;
      const x = readNumber();
      const y = readNumber();
      current = relative ? { x: current.x + x, y: current.y + y } : { x, y };
      start = current;
      addPoint(bounds, transformPoint(current, scaleX, scaleY));
      command = relative ? "l" : "L";
      continue;
    }

    if (cmd === "Z") {
      recordLine(start);
      open = false;
      command = "";
      continue;
    }

    if (cmd === "L") {
      while (hasNumber()) {
        const x = readNumber();
        const y = readNumber();
        recordLine(relative ? { x: current.x + x, y: current.y + y } : { x, y });
      }
      continue;
    }

    if (cmd === "H") {
      while (hasNumber()) {
        const x = readNumber();
        recordLine(relative ? { x: current.x + x, y: current.y } : { x, y: current.y });
      }
      continue;
    }

    if (cmd === "V") {
      while (hasNumber()) {
        const y = readNumber();
        recordLine(relative ? { x: current.x, y: current.y + y } : { x: current.x, y });
      }
      continue;
    }

    if (cmd === "C") {
      while (hasNumber()) {
        const p0 = current;
        const p1 = relative ? { x: current.x + readNumber(), y: current.y + readNumber() } : { x: readNumber(), y: readNumber() };
        const p2 = relative ? { x: current.x + readNumber(), y: current.y + readNumber() } : { x: readNumber(), y: readNumber() };
        const p3 = relative ? { x: current.x + readNumber(), y: current.y + readNumber() } : { x: readNumber(), y: readNumber() };
        recordCurve(Array.from({ length: 10 }, (_, i) => cubicPoint(p0, p1, p2, p3, (i + 1) / 10)));
      }
      continue;
    }

    if (cmd === "Q") {
      while (hasNumber()) {
        const p0 = current;
        const p1 = relative ? { x: current.x + readNumber(), y: current.y + readNumber() } : { x: readNumber(), y: readNumber() };
        const p2 = relative ? { x: current.x + readNumber(), y: current.y + readNumber() } : { x: readNumber(), y: readNumber() };
        recordCurve(Array.from({ length: 8 }, (_, i) => quadraticPoint(p0, p1, p2, (i + 1) / 8)));
      }
      continue;
    }

    if (cmd === "A") {
      while (hasNumber()) {
        readNumber();
        readNumber();
        readNumber();
        readNumber();
        readNumber();
        const x = readNumber();
        const y = readNumber();
        recordLine(relative ? { x: current.x + x, y: current.y + y } : { x, y }, false);
        curveSegments += 1;
      }
      continue;
    }

    if (cmd === "S" || cmd === "T") {
      while (hasNumber()) {
        const numbersPerPoint = cmd === "S" ? 4 : 2;
        const values = Array.from({ length: numbersPerPoint }, readNumber);
        const x = values[values.length - 2];
        const y = values[values.length - 1];
        recordLine(relative ? { x: current.x + x, y: current.y + y } : { x, y }, false);
        curveSegments += 1;
      }
      continue;
    }

    break;
  }

  return {
    length,
    open,
    bounds,
    segments,
    featureLengths,
    curveSegments,
    sharpCornerCount,
  };
}

function polylineGeometry(points: Point[], closed: boolean, scaleX: number, scaleY: number) {
  const bounds = emptyBounds();
  const segments: Segment[] = [];
  let length = 0;
  const featureLengths: number[] = [];
  const scaled = points.map((point) => transformPoint(point, scaleX, scaleY));
  scaled.forEach((point) => addPoint(bounds, point));
  for (let index = 1; index < scaled.length; index += 1) {
    const segmentLength = distance(scaled[index - 1], scaled[index]);
    length += segmentLength;
    featureLengths.push(segmentLength);
    segments.push({ a: scaled[index - 1], b: scaled[index] });
  }
  if (closed && scaled.length > 2) {
    const segmentLength = distance(scaled[scaled.length - 1], scaled[0]);
    length += segmentLength;
    featureLengths.push(segmentLength);
    segments.push({ a: scaled[scaled.length - 1], b: scaled[0] });
  }
  return { length, bounds, segments, featureLengths };
}

export function analyzeSvgVector(input: SvgAnalysisInput): SvgAnalysisResult {
  const sanitized = sanitizeSvgForAnalysis(input.svgText);
  if (!sanitized.ok) {
    throw new Error(sanitized.errors.join(" "));
  }

  const svgMatch = sanitized.sanitizedSvg.match(/<\s*svg\b([^>]*)>/i);
  const svgAttrs = parseAttributes(svgMatch?.[1] || "");
  const viewBox = parseViewBox(svgAttrs.viewBox);
  const rawWidthMm = parseSvgLengthToMm(svgAttrs.width);
  const rawHeightMm = parseSvgLengthToMm(svgAttrs.height);
  const userWidth = viewBox?.width || rawWidthMm || 1;
  const userHeight = viewBox?.height || rawHeightMm || 1;
  const detectedWidthMm = rawWidthMm ?? null;
  const detectedHeightMm = rawHeightMm ?? null;
  const declaredWidthMm = input.declaredWidthMm && input.declaredWidthMm > 0 ? input.declaredWidthMm : detectedWidthMm;
  const declaredHeightMm = input.declaredHeightMm && input.declaredHeightMm > 0 ? input.declaredHeightMm : detectedHeightMm;
  const scaleX = declaredWidthMm && userWidth > 0 ? declaredWidthMm / userWidth : 1;
  const scaleY = declaredHeightMm && userHeight > 0 ? declaredHeightMm / userHeight : scaleX;
  const scaleFactor = Number.isFinite(scaleX) && Number.isFinite(scaleY) ? (scaleX + scaleY) / 2 : null;
  const tinyThreshold = input.tinyFeatureThresholdMm ?? 1;
  const allBounds = emptyBounds();
  const segments: Segment[] = [];
  const featureLengths: number[] = [];
  const warnings = [...sanitized.warnings];
  let pathCount = 0;
  let openPathCount = 0;
  let closedPathCount = 0;
  let totalLength = 0;
  let estimatedEngraveAreaMm2 = 0;
  let sharpCornerCount = 0;
  let curveSegmentCount = 0;
  let hasUnsupportedElements = sanitized.warnings.length > 0;

  const tagPattern = /<\s*([a-zA-Z][\w:-]*)\b([^>]*)>/g;
  let match: RegExpExecArray | null;
  while ((match = tagPattern.exec(sanitized.sanitizedSvg))) {
    const tag = match[1].toLowerCase();
    const attrs = parseAttributes(match[2] || "");
    if (!ALLOWED_ELEMENTS.has(tag)) {
      hasUnsupportedElements = true;
      continue;
    }

    if (tag === "path") {
      const d = attrs.d || "";
      if (!d.trim()) continue;
      const geometry = parsePathGeometry(d, scaleX, scaleY);
      pathCount += 1;
      if (geometry.open) openPathCount += 1;
      else closedPathCount += 1;
      totalLength += geometry.length;
      sharpCornerCount += geometry.sharpCornerCount;
      curveSegmentCount += geometry.curveSegments;
      addBounds(allBounds, geometry.bounds);
      segments.push(...geometry.segments);
      featureLengths.push(...geometry.featureLengths);
      continue;
    }

    if (tag === "rect") {
      const x = parseNumber(attrs.x);
      const y = parseNumber(attrs.y);
      const width = Math.max(parseNumber(attrs.width), 0);
      const height = Math.max(parseNumber(attrs.height), 0);
      const bounds = emptyBounds();
      addPoint(bounds, transformPoint({ x, y }, scaleX, scaleY));
      addPoint(bounds, transformPoint({ x: x + width, y: y + height }, scaleX, scaleY));
      const w = Math.abs(width * scaleX);
      const h = Math.abs(height * scaleY);
      totalLength += 2 * (w + h);
      estimatedEngraveAreaMm2 += w * h;
      pathCount += 1;
      closedPathCount += 1;
      addBounds(allBounds, bounds);
      featureLengths.push(w, h);
      const p = [
        transformPoint({ x, y }, scaleX, scaleY),
        transformPoint({ x: x + width, y }, scaleX, scaleY),
        transformPoint({ x: x + width, y: y + height }, scaleX, scaleY),
        transformPoint({ x, y: y + height }, scaleX, scaleY),
      ];
      segments.push({ a: p[0], b: p[1] }, { a: p[1], b: p[2] }, { a: p[2], b: p[3] }, { a: p[3], b: p[0] });
      continue;
    }

    if (tag === "circle" || tag === "ellipse") {
      const cx = parseNumber(attrs.cx);
      const cy = parseNumber(attrs.cy);
      const rx = tag === "circle" ? parseNumber(attrs.r) : parseNumber(attrs.rx);
      const ry = tag === "circle" ? parseNumber(attrs.r) : parseNumber(attrs.ry);
      const rxMm = Math.abs(rx * scaleX);
      const ryMm = Math.abs(ry * scaleY);
      const h = ((rxMm - ryMm) ** 2) / Math.max((rxMm + ryMm) ** 2, 0.0001);
      totalLength += Math.PI * (rxMm + ryMm) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
      estimatedEngraveAreaMm2 += Math.PI * rxMm * ryMm;
      pathCount += 1;
      closedPathCount += 1;
      const bounds = emptyBounds();
      addPoint(bounds, transformPoint({ x: cx - rx, y: cy - ry }, scaleX, scaleY));
      addPoint(bounds, transformPoint({ x: cx + rx, y: cy + ry }, scaleX, scaleY));
      addBounds(allBounds, bounds);
      featureLengths.push(rxMm * 2, ryMm * 2);
      curveSegmentCount += 4;
      continue;
    }

    if (tag === "line") {
      const p1 = transformPoint({ x: parseNumber(attrs.x1), y: parseNumber(attrs.y1) }, scaleX, scaleY);
      const p2 = transformPoint({ x: parseNumber(attrs.x2), y: parseNumber(attrs.y2) }, scaleX, scaleY);
      const segmentLength = distance(p1, p2);
      totalLength += segmentLength;
      pathCount += 1;
      openPathCount += 1;
      addPoint(allBounds, p1);
      addPoint(allBounds, p2);
      segments.push({ a: p1, b: p2 });
      featureLengths.push(segmentLength);
      continue;
    }

    if (tag === "polyline" || tag === "polygon") {
      const closed = tag === "polygon";
      const geometry = polylineGeometry(pointsFromString(attrs.points), closed, scaleX, scaleY);
      totalLength += geometry.length;
      pathCount += 1;
      if (closed) closedPathCount += 1;
      else openPathCount += 1;
      addBounds(allBounds, geometry.bounds);
      segments.push(...geometry.segments);
      featureLengths.push(...geometry.featureLengths);
    }
  }

  const duplicateBuckets = new Map<string, number>();
  segments.forEach((segment) => {
    if (distance(segment.a, segment.b) <= 0.0001) return;
    const key = normalizeSegmentKey(segment, 0.05);
    duplicateBuckets.set(key, (duplicateBuckets.get(key) || 0) + 1);
  });
  const duplicateLineCount = [...duplicateBuckets.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0);
  const positiveFeatures = featureLengths.filter((value) => value > 0.0001);
  const smallestFeatureMm = positiveFeatures.length ? Math.min(...positiveFeatures) : null;
  const tinyFeatureCount = positiveFeatures.filter((value) => value < tinyThreshold).length;
  const endpoints = segments.flatMap((segment) => [segment.a, segment.b]);
  let smallestGapMm: number | null = null;
  for (let i = 0; i < endpoints.length; i += 1) {
    for (let j = i + 1; j < Math.min(endpoints.length, i + 160); j += 1) {
      const gap = distance(endpoints[i], endpoints[j]);
      if (gap > 0.001 && (smallestGapMm === null || gap < smallestGapMm)) smallestGapMm = gap;
    }
  }

  if (duplicateLineCount > 0) warnings.push(`${duplicateLineCount} duplicate or near-duplicate line(s) detected.`);
  if (tinyFeatureCount > 0) warnings.push(`${tinyFeatureCount} feature(s) are below ${tinyThreshold} mm.`);
  if (openPathCount > 0) warnings.push(`${openPathCount} open path(s) detected.`);
  if (!pathCount) warnings.push("No measurable SVG geometry was found.");

  return {
    totalCutLengthMm: round(totalLength),
    totalScoreLengthMm: null,
    estimatedEngraveAreaMm2: estimatedEngraveAreaMm2 > 0 ? round(estimatedEngraveAreaMm2) : null,
    pathCount,
    openPathCount,
    closedPathCount,
    duplicateLineCount,
    tinyFeatureCount,
    smallestFeatureMm: smallestFeatureMm === null ? null : round(smallestFeatureMm),
    smallestGapMm: smallestGapMm === null ? null : round(smallestGapMm),
    sharpCornerCount,
    curveSegmentCount,
    boundingBoxWidthMm: round(boundsWidth(allBounds)),
    boundingBoxHeightMm: round(boundsHeight(allBounds)),
    hasUnsupportedElements,
    warningsJson: warnings,
    detectedWidthMm,
    detectedHeightMm,
    scaleFactor: scaleFactor === null ? null : round(scaleFactor, 6),
    sanitizedSvg: sanitized.sanitizedSvg,
  };
}
