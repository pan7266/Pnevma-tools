export type QrPayloadType =
  | "Website"
  | "Instagram"
  | "Facebook"
  | "LinkedIn"
  | "YouTube"
  | "TikTok"
  | "WhatsApp"
  | "Telegram"
  | "Map"
  | "Wifi"
  | "Email"
  | "Sms"
  | "Phone"
  | "Contact"
  | "Calendar"
  | "Product"
  | "Text";

export interface QrField {
  label: string;
  value: string;
}

export interface ParsedQrPayload {
  type: QrPayloadType;
  title: string;
  summary: string;
  fields: QrField[];
  safeUrl?: string;
  actionHref?: string;
  actionLabel?: string;
}

function compact(value: string, maxLength = 96) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}...` : normalized;
}

function decodeFormValue(value: string) {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

function parseEscapedFields(body: string) {
  const fields: Record<string, string> = {};
  let key = "";
  let value = "";
  let readingKey = true;
  let escaping = false;

  for (const char of body) {
    if (escaping) {
      if (readingKey) key += char;
      else value += char;
      escaping = false;
      continue;
    }

    if (char === "\\") {
      escaping = true;
      continue;
    }

    if (readingKey && char === ":") {
      readingKey = false;
      continue;
    }

    if (!readingKey && char === ";") {
      if (key) fields[key.toUpperCase()] = value;
      key = "";
      value = "";
      readingKey = true;
      continue;
    }

    if (readingKey) key += char;
    else value += char;
  }

  if (key && !readingKey) fields[key.toUpperCase()] = value;
  return fields;
}

function normalizeHttpUrl(raw: string) {
  const trimmed = raw.trim();
  const candidate = /^www\./i.test(trimmed) ? `https://${trimmed}` : trimmed;

  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function normalizedHost(url: URL) {
  return url.hostname.toLowerCase().replace(/^www\./, "");
}

function firstPathSegment(url: URL) {
  return decodeFormValue(url.pathname.split("/").filter(Boolean)[0] || "");
}

function linkResult(type: QrPayloadType, title: string, safeUrl: string, fields: QrField[], actionLabel = "Open link"): ParsedQrPayload {
  return {
    type,
    title,
    summary: safeUrl,
    fields: [{ label: "URL", value: safeUrl }, ...fields],
    safeUrl,
    actionHref: safeUrl,
    actionLabel,
  };
}

function parseHttpLink(raw: string): ParsedQrPayload | undefined {
  const safeUrl = normalizeHttpUrl(raw);
  if (!safeUrl) return undefined;

  const url = new URL(safeUrl);
  const host = normalizedHost(url);
  const domainField = { label: "Domain", value: host };
  const username = firstPathSegment(url);
  const usernameField = username ? [{ label: "Username", value: username }] : [];

  if (host === "instagram.com" || host.endsWith(".instagram.com")) {
    return linkResult("Instagram", "Instagram link", safeUrl, [{ label: "Platform", value: "Instagram" }, ...usernameField], "Open Instagram");
  }

  if (host === "facebook.com" || host === "fb.com" || host.endsWith(".facebook.com")) {
    return linkResult("Facebook", "Facebook link", safeUrl, [{ label: "Platform", value: "Facebook" }, ...usernameField], "Open Facebook");
  }

  if (host === "linkedin.com" || host.endsWith(".linkedin.com")) {
    return linkResult("LinkedIn", "LinkedIn link", safeUrl, [{ label: "Platform", value: "LinkedIn" }, ...usernameField], "Open LinkedIn");
  }

  if (host === "youtube.com" || host === "youtu.be" || host.endsWith(".youtube.com")) {
    return linkResult("YouTube", "YouTube link", safeUrl, [{ label: "Platform", value: "YouTube" }, ...usernameField], "Open YouTube");
  }

  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
    return linkResult("TikTok", "TikTok link", safeUrl, [{ label: "Platform", value: "TikTok" }, ...usernameField], "Open TikTok");
  }

  if (host === "wa.me" || host === "whatsapp.com" || host.endsWith(".whatsapp.com")) {
    return linkResult("WhatsApp", "WhatsApp link", safeUrl, [{ label: "Platform", value: "WhatsApp" }, ...usernameField], "Open WhatsApp");
  }

  if (host === "t.me" || host === "telegram.me" || host.endsWith(".telegram.org")) {
    return linkResult("Telegram", "Telegram link", safeUrl, [{ label: "Platform", value: "Telegram" }, ...usernameField], "Open Telegram");
  }

  if (host === "maps.google.com" || host === "goo.gl" || (host === "google.com" && url.pathname.startsWith("/maps"))) {
    return linkResult("Map", "Map link", safeUrl, [domainField], "Open map");
  }

  return linkResult("Website", "Website link", safeUrl, [domainField], "Open site");
}

function parseWifi(raw: string): ParsedQrPayload | undefined {
  if (!raw.toUpperCase().startsWith("WIFI:")) return undefined;

  const fields = parseEscapedFields(raw.slice(5));
  const security = fields.T || "nopass";
  const ssid = fields.S || "Unnamed network";
  const password = fields.P || "";
  const hidden = fields.H?.toLowerCase() === "true" ? "Yes" : "No";

  return {
    type: "Wifi",
    title: "Wi-Fi network",
    summary: `${ssid} (${security})`,
    fields: [
      { label: "Network", value: ssid },
      { label: "Security", value: security },
      ...(password ? [{ label: "Password", value: password }] : []),
      { label: "Hidden network", value: hidden },
    ],
  };
}

function parseMatMsg(raw: string): ParsedQrPayload | undefined {
  if (!raw.toUpperCase().startsWith("MATMSG:")) return undefined;

  const fields = parseEscapedFields(raw.slice(7));
  const to = fields.TO || "";
  const subject = fields.SUB || "";
  const body = fields.BODY || "";
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);

  return {
    type: "Email",
    title: "Email message",
    summary: to || subject || "Email",
    fields: [
      ...(to ? [{ label: "To", value: to }] : []),
      ...(subject ? [{ label: "Subject", value: subject }] : []),
      ...(body ? [{ label: "Body", value: body }] : []),
    ],
    actionHref: `mailto:${to}${params.size ? `?${params.toString()}` : ""}`,
    actionLabel: "Create email",
  };
}

function parseMailto(raw: string): ParsedQrPayload | undefined {
  if (!raw.toLowerCase().startsWith("mailto:")) return undefined;

  const withoutScheme = raw.slice(7);
  const [addressPart, queryPart = ""] = withoutScheme.split("?");
  const params = new URLSearchParams(queryPart);
  const to = decodeFormValue(addressPart);
  const subject = params.get("subject") || "";
  const body = params.get("body") || "";

  return {
    type: "Email",
    title: "Email address",
    summary: to || subject || "Email",
    fields: [
      ...(to ? [{ label: "To", value: to }] : []),
      ...(subject ? [{ label: "Subject", value: subject }] : []),
      ...(body ? [{ label: "Body", value: body }] : []),
    ],
    actionHref: raw,
    actionLabel: "Create email",
  };
}

function parseSms(raw: string): ParsedQrPayload | undefined {
  const upper = raw.toUpperCase();

  if (upper.startsWith("SMSTO:")) {
    const body = raw.slice(6);
    const separator = body.indexOf(":");
    const number = separator >= 0 ? body.slice(0, separator) : body;
    const message = separator >= 0 ? body.slice(separator + 1) : "";

    return {
      type: "Sms",
      title: "SMS message",
      summary: number || message || "SMS",
      fields: [
        ...(number ? [{ label: "Number", value: number }] : []),
        ...(message ? [{ label: "Message", value: message }] : []),
      ],
      actionHref: `sms:${number}${message ? `?body=${encodeURIComponent(message)}` : ""}`,
      actionLabel: "Create SMS",
    };
  }

  if (!raw.toLowerCase().startsWith("sms:")) return undefined;

  const withoutScheme = raw.slice(4);
  const [number, queryPart = ""] = withoutScheme.split("?");
  const params = new URLSearchParams(queryPart);
  const message = params.get("body") || "";

  return {
    type: "Sms",
    title: "SMS message",
    summary: number || message || "SMS",
    fields: [
      ...(number ? [{ label: "Number", value: number }] : []),
      ...(message ? [{ label: "Message", value: message }] : []),
    ],
    actionHref: raw,
    actionLabel: "Create SMS",
  };
}

function parsePhone(raw: string): ParsedQrPayload | undefined {
  if (!raw.toLowerCase().startsWith("tel:")) return undefined;

  const number = raw.slice(4);
  return {
    type: "Phone",
    title: "Phone number",
    summary: number,
    fields: [{ label: "Number", value: number }],
    actionHref: raw,
    actionLabel: "Call number",
  };
}

function cleanContactNamePart(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function compactDisplayName(parts: string[]) {
  return parts.map(cleanContactNamePart).filter(Boolean).join(" ");
}

function meCardNameFields(rawName: string): { displayName: string; fields: QrField[] } {
  const trimmed = cleanContactNamePart(rawName);
  if (!trimmed) return { displayName: "", fields: [] };

  if (!trimmed.includes(",")) {
    return { displayName: trimmed, fields: [{ label: "Name", value: trimmed }] };
  }

  const [lastName = "", firstName = "", ...rest] = trimmed.split(",").map(cleanContactNamePart);
  const extra = compactDisplayName(rest);

  if (firstName && lastName) {
    return {
      displayName: compactDisplayName([firstName, extra, lastName]),
      fields: [
        { label: "First name", value: firstName },
        { label: "Last name", value: lastName },
      ],
    };
  }

  const displayName = compactDisplayName([firstName, lastName, extra]);
  return {
    displayName,
    fields: displayName ? [{ label: "Name", value: displayName }] : [],
  };
}

function vCardNameFields(rawName: string): { displayName: string; fields: QrField[] } {
  const trimmed = cleanContactNamePart(rawName);
  if (!trimmed) return { displayName: "", fields: [] };

  if (!trimmed.includes(";")) {
    return { displayName: trimmed, fields: [{ label: "Name", value: trimmed }] };
  }

  const [lastName = "", firstName = "", additional = "", prefix = "", suffix = ""] = trimmed.split(";").map(cleanContactNamePart);
  const displayName = compactDisplayName([prefix, firstName, additional, lastName, suffix]);

  if (firstName && lastName) {
    return {
      displayName,
      fields: [
        { label: "First name", value: firstName },
        { label: "Last name", value: lastName },
      ],
    };
  }

  return {
    displayName,
    fields: displayName ? [{ label: "Name", value: displayName }] : [],
  };
}

function parseVCard(raw: string): ParsedQrPayload | undefined {
  if (!raw.toUpperCase().includes("BEGIN:VCARD")) return undefined;

  const lines = raw.split(/\r?\n/);
  const pick = (prefix: string) => {
    const line = lines.find((entry) => entry.toUpperCase().startsWith(prefix));
    return line ? line.slice(line.indexOf(":") + 1).trim() : "";
  };
  const formattedName = pick("FN:");
  const structuredName = vCardNameFields(pick("N:"));
  const name = formattedName || structuredName.displayName;
  const organization = pick("ORG:");
  const phone = pick("TEL");
  const email = pick("EMAIL");
  const website = pick("URL");
  const address = pick("ADR");

  return {
    type: "Contact",
    title: "Contact card",
    summary: name || organization || email || phone || "Contact",
    fields: [
      ...(formattedName ? [{ label: "Name", value: formattedName }, ...structuredName.fields] : structuredName.fields),
      ...(organization ? [{ label: "Organization", value: organization }] : []),
      ...(phone ? [{ label: "Phone", value: phone }] : []),
      ...(email ? [{ label: "Email", value: email }] : []),
      ...(website ? [{ label: "Website", value: website }] : []),
      ...(address ? [{ label: "Address", value: address.replace(/;/g, " ").trim() }] : []),
    ],
  };
}

function parseMeCard(raw: string): ParsedQrPayload | undefined {
  if (!raw.toUpperCase().startsWith("MECARD:")) return undefined;

  const fields = parseEscapedFields(raw.slice(7));
  const name = meCardNameFields(fields.N || "");
  const phone = fields.TEL || "";
  const email = fields.EMAIL || "";
  const website = fields.URL || "";
  const address = fields.ADR || "";

  return {
    type: "Contact",
    title: "Contact card",
    summary: name.displayName || email || phone || "Contact",
    fields: [
      ...name.fields,
      ...(phone ? [{ label: "Phone", value: phone }] : []),
      ...(email ? [{ label: "Email", value: email }] : []),
      ...(website ? [{ label: "Website", value: website }] : []),
      ...(address ? [{ label: "Address", value: address }] : []),
    ],
  };
}

function parseGeo(raw: string): ParsedQrPayload | undefined {
  if (!raw.toLowerCase().startsWith("geo:")) return undefined;

  const body = raw.slice(4);
  const [coordinatePart, queryPart = ""] = body.split("?");
  const [latitude, longitude] = coordinatePart.split(",");
  if (!latitude || !longitude) return undefined;

  const params = new URLSearchParams(queryPart);
  const query = params.get("q") || "";
  const mapUrl = `https://maps.google.com/?q=${encodeURIComponent(query || `${latitude},${longitude}`)}`;

  return {
    type: "Map",
    title: "Map location",
    summary: query || `${latitude}, ${longitude}`,
    fields: [
      { label: "Latitude", value: latitude },
      { label: "Longitude", value: longitude },
      ...(query ? [{ label: "Query", value: query }] : []),
    ],
    safeUrl: mapUrl,
    actionHref: mapUrl,
    actionLabel: "Open map",
  };
}

function parseCalendar(raw: string): ParsedQrPayload | undefined {
  const upper = raw.toUpperCase();
  if (!upper.includes("BEGIN:VEVENT")) return undefined;

  const lines = raw.split(/\r?\n/);
  const pick = (prefix: string) => {
    const line = lines.find((entry) => entry.toUpperCase().startsWith(prefix));
    return line ? line.slice(line.indexOf(":") + 1).trim() : "";
  };
  const title = pick("SUMMARY");
  const starts = pick("DTSTART");
  const ends = pick("DTEND");
  const location = pick("LOCATION");
  const description = pick("DESCRIPTION");

  return {
    type: "Calendar",
    title: "Calendar event",
    summary: title || starts || "Calendar event",
    fields: [
      ...(title ? [{ label: "Event", value: title }] : []),
      ...(starts ? [{ label: "Starts", value: starts }] : []),
      ...(ends ? [{ label: "Ends", value: ends }] : []),
      ...(location ? [{ label: "Location", value: location }] : []),
      ...(description ? [{ label: "Description", value: description }] : []),
    ],
  };
}

function parseProduct(raw: string): ParsedQrPayload | undefined {
  const trimmed = raw.trim();
  if (!/^\d{8}$|^\d{12,14}$/.test(trimmed)) return undefined;

  return {
    type: "Product",
    title: "Product code",
    summary: trimmed,
    fields: [{ label: "Code", value: trimmed }],
  };
}

export function parseQrPayload(raw: string): ParsedQrPayload {
  const trimmed = raw.trim();

  return (
    parseHttpLink(trimmed) ||
    parseWifi(trimmed) ||
    parseMatMsg(trimmed) ||
    parseMailto(trimmed) ||
    parseSms(trimmed) ||
    parsePhone(trimmed) ||
    parseVCard(trimmed) ||
    parseMeCard(trimmed) ||
    parseGeo(trimmed) ||
    parseCalendar(trimmed) ||
    parseProduct(trimmed) || {
      type: "Text",
      title: "Plain text",
      summary: compact(trimmed || raw),
      fields: [{ label: "Text", value: raw }],
    }
  );
}
