import crypto from "node:crypto";
import { NextResponse } from "next/server";

const DEFAULT_ADMIN_USERNAME = "Fistikaki";
const DEFAULT_ADMIN_PASSWORD_SHA256 = "bdf40012486785e903ba1ddfc5b66eda66bd6f86bde2fde0e0f47cc136783fc9";

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function parseBasicAuth(header: string | null): { username: string; password: string } | null {
  if (!header?.startsWith("Basic ")) return null;
  try {
    const decoded = Buffer.from(header.slice("Basic ".length), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 0) return null;
    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

export function isAdminAuthorized(headers: Headers): boolean {
  const credentials = parseBasicAuth(headers.get("authorization"));
  if (!credentials) return false;

  const expectedUsername = process.env.ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME;
  const configuredPassword = process.env.ADMIN_PASSWORD;
  const expectedPasswordHash = process.env.ADMIN_PASSWORD_SHA256 || DEFAULT_ADMIN_PASSWORD_SHA256;

  const usernameOk = safeEqual(credentials.username, expectedUsername);
  const passwordOk = configuredPassword
    ? safeEqual(credentials.password, configuredPassword)
    : safeEqual(sha256(credentials.password), expectedPasswordHash);

  return usernameOk && passwordOk;
}

export function unauthorizedAdminResponse() {
  return NextResponse.json(
    { error: "Unauthorized" },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Pnevma Admin", charset="UTF-8"',
      },
    },
  );
}
