import { mkdir, readFile, appendFile } from "node:fs/promises";
import path from "node:path";

export interface RequestLogEntry {
  id: string;
  timestamp: string;
  ip: string;
  method: string;
  url: string;
  status: number;
  userAgent: string;
}

const MAX_LOGS = 500;
const LOG_DIR = path.join(process.cwd(), ".request-logs");
const LOG_FILE = path.join(LOG_DIR, "requests.jsonl");

type RequestLogStore = {
  loaded: boolean;
  logs: RequestLogEntry[];
  loading?: Promise<void>;
};

const globalLogStore = globalThis as typeof globalThis & {
  __pnevmaRequestLogStore?: RequestLogStore;
};

const store = globalLogStore.__pnevmaRequestLogStore ?? {
  loaded: false,
  logs: [],
};

globalLogStore.__pnevmaRequestLogStore = store;

function requestPath(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function requestIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return headers.get("x-real-ip") || headers.get("cf-connecting-ip") || "unknown";
}

function trimLogs(logs: RequestLogEntry[]) {
  if (logs.length <= MAX_LOGS) return logs;
  return logs.slice(logs.length - MAX_LOGS);
}

async function ensureLoaded() {
  if (store.loaded) return;
  if (!store.loading) {
    const existingLogs = store.logs;
    store.loading = readFile(LOG_FILE, "utf8")
      .then((content) => {
        const loadedLogs = content
          .split(/\r?\n/)
          .filter(Boolean)
          .map((line) => JSON.parse(line) as RequestLogEntry)
          .filter((entry) => entry && typeof entry.id === "string");
        const merged = new Map<string, RequestLogEntry>();
        [...loadedLogs, ...existingLogs].forEach((entry) => merged.set(entry.id, entry));
        store.logs = trimLogs([...merged.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp)));
      })
      .catch(() => {
        store.logs = existingLogs;
      })
      .finally(() => {
        store.loaded = true;
        store.loading = undefined;
      });
  }
  await store.loading;
}

async function persistLog(entry: RequestLogEntry) {
  await mkdir(LOG_DIR, { recursive: true });
  await appendFile(LOG_FILE, `${JSON.stringify(entry)}\n`, "utf8");
}

export function recordRequest(request: Request, status: number) {
  const entry: RequestLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    timestamp: new Date().toISOString(),
    ip: requestIp(request.headers),
    method: request.method,
    url: requestPath(request.url),
    status,
    userAgent: request.headers.get("user-agent") || "",
  };

  store.logs = trimLogs([...store.logs, entry]);
  void persistLog(entry).catch(() => undefined);
}

export async function getRequestLogs(): Promise<RequestLogEntry[]> {
  await ensureLoaded();
  return [...store.logs].reverse();
}

export async function withRequestLog(request: Request, handler: () => Promise<Response> | Response) {
  try {
    const response = await handler();
    recordRequest(request, response.status);
    return response;
  } catch (error) {
    recordRequest(request, 500);
    throw error;
  }
}
