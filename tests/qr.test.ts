import { describe, expect, it } from "vitest";
import QRCode from "qrcode";
import { parseQrPayload } from "../lib/calculators/qr";

describe("QR payload parser", () => {
  it("normalizes safe web links and exposes an explicit open action", () => {
    const parsed = parseQrPayload("www.pnevmagifts.gr/tools");

    expect(parsed.type).toBe("Website");
    expect(parsed.safeUrl).toBe("https://www.pnevmagifts.gr/tools");
    expect(parsed.actionLabel).toBe("Open site");
    expect(parsed.fields).toContainEqual({ label: "Domain", value: "pnevmagifts.gr" });
  });

  it("classifies common social links", () => {
    const parsed = parseQrPayload("https://www.instagram.com/pnevma_gifts/");

    expect(parsed.type).toBe("Instagram");
    expect(parsed.fields).toContainEqual({ label: "Platform", value: "Instagram" });
    expect(parsed.fields).toContainEqual({ label: "Username", value: "pnevma_gifts" });
  });

  it("does not mark non-http URLs as safe links", () => {
    const parsed = parseQrPayload("javascript:alert(1)");

    expect(parsed.type).toBe("Text");
    expect(parsed.safeUrl).toBeUndefined();
    expect(parsed.actionHref).toBeUndefined();
  });

  it("extracts Wi-Fi network fields with escaped separators", () => {
    const parsed = parseQrPayload("WIFI:T:WPA;S:Shop\\;Guest;P:pass\\:123;H:true;;");

    expect(parsed.type).toBe("Wifi");
    expect(parsed.fields).toContainEqual({ label: "Network", value: "Shop;Guest" });
    expect(parsed.fields).toContainEqual({ label: "Password", value: "pass:123" });
    expect(parsed.fields).toContainEqual({ label: "Hidden network", value: "Yes" });
  });

  it("parses email, SMS, phone, contact, map, calendar, and product payloads", () => {
    expect(parseQrPayload("mailto:hello@example.com?subject=Hi").type).toBe("Email");
    expect(parseQrPayload("SMSTO:+306900000000:Hello").type).toBe("Sms");
    expect(parseQrPayload("tel:+306900000000").type).toBe("Phone");
    expect(parseQrPayload("BEGIN:VCARD\nFN:Pan Markosian\nEMAIL:pan@example.com\nEND:VCARD").type).toBe("Contact");
    expect(parseQrPayload("MECARD:N:Pan Markosian;TEL:+306900000000;EMAIL:pan@example.com;;").type).toBe("Contact");
    expect(parseQrPayload("geo:37.98,23.72?q=Athens").type).toBe("Map");
    expect(parseQrPayload("BEGIN:VEVENT\nSUMMARY:Demo\nDTSTART:20260612T090000Z\nEND:VEVENT").type).toBe("Calendar");
    expect(parseQrPayload("5201234567890").type).toBe("Product");
  });

  it("can regenerate decoded content as SVG", async () => {
    const parsed = parseQrPayload("https://www.instagram.com/pnevma_gifts/");
    const svg = await QRCode.toString(parsed.safeUrl || parsed.summary, { type: "svg", width: 512, margin: 2 });

    expect(parsed.type).toBe("Instagram");
    expect(svg).toContain("<svg");
    expect(svg).toContain("<path");
  });
});
