import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cloneLaserCoachSeeds } from "@/lib/data/lasercoach";
import type {
  CorrectionHistory,
  LaserJobFeedback,
  LaserMachine,
  LaserMaterial,
  LaserOperationPreset,
  LaserRecommendation,
  MachineMaterialCorrection,
  MachineMotionProfile,
  VectorAnalysis,
  VectorJob,
} from "@/types";

export interface LaserCoachStoreData {
  machines: LaserMachine[];
  motionProfiles: MachineMotionProfile[];
  materials: LaserMaterial[];
  operationPresets: LaserOperationPreset[];
  vectorJobs: VectorJob[];
  vectorAnalyses: VectorAnalysis[];
  recommendations: LaserRecommendation[];
  feedback: LaserJobFeedback[];
  corrections: MachineMaterialCorrection[];
  correctionHistory: CorrectionHistory[];
}

export type LaserCoachCollectionName = keyof LaserCoachStoreData;
export type LaserCoachRecord = LaserCoachStoreData[LaserCoachCollectionName][number] & { id: string; updatedAt?: string };

const STORE_DIR = path.join(process.cwd(), ".lasercoach-store");
const STORE_FILE = path.join(STORE_DIR, "data.json");
const UPLOAD_DIR = path.join(STORE_DIR, "uploads");

type LaserCoachStoreState = {
  loaded: boolean;
  data: LaserCoachStoreData;
  loading?: Promise<void>;
};

const globalStore = globalThis as typeof globalThis & {
  __pnevmaLaserCoachStore?: LaserCoachStoreState;
};

const state = globalStore.__pnevmaLaserCoachStore ?? {
  loaded: false,
  data: cloneLaserCoachSeeds() as LaserCoachStoreData,
};

globalStore.__pnevmaLaserCoachStore = state;

let persistQueue: Promise<void> = Promise.resolve();

function mergeSeeds(data: Partial<LaserCoachStoreData>): LaserCoachStoreData {
  const seeds = cloneLaserCoachSeeds() as LaserCoachStoreData;
  return {
    machines: data.machines?.length ? data.machines : seeds.machines,
    motionProfiles: data.motionProfiles?.length ? data.motionProfiles : seeds.motionProfiles,
    materials: data.materials?.length ? data.materials : seeds.materials,
    operationPresets: data.operationPresets?.length ? data.operationPresets : seeds.operationPresets,
    vectorJobs: data.vectorJobs || [],
    vectorAnalyses: data.vectorAnalyses || [],
    recommendations: data.recommendations || [],
    feedback: data.feedback || [],
    corrections: data.corrections || [],
    correctionHistory: data.correctionHistory || [],
  };
}

async function ensureLoaded() {
  if (state.loaded) return;
  if (!state.loading) {
    state.loading = readFile(STORE_FILE, "utf8")
      .then((content) => {
        state.data = mergeSeeds(JSON.parse(content) as Partial<LaserCoachStoreData>);
      })
      .catch(() => {
        state.data = cloneLaserCoachSeeds() as LaserCoachStoreData;
      })
      .finally(() => {
        state.loaded = true;
        state.loading = undefined;
      });
  }
  await state.loading;
}

async function persistStore() {
  await ensureLoaded();
  await mkdir(STORE_DIR, { recursive: true });
  await writeFile(STORE_FILE, JSON.stringify(state.data, null, 2), "utf8");
}

function schedulePersist() {
  persistQueue = persistQueue
    .catch(() => undefined)
    .then(() => persistStore())
    .catch(() => undefined);
  void persistQueue;
}

export async function getLaserCoachData(): Promise<LaserCoachStoreData> {
  await ensureLoaded();
  return JSON.parse(JSON.stringify(state.data)) as LaserCoachStoreData;
}

export async function replaceLaserCoachData(data: Partial<LaserCoachStoreData>): Promise<LaserCoachStoreData> {
  await ensureLoaded();
  state.data = mergeSeeds(data);
  schedulePersist();
  return getLaserCoachData();
}

export async function listLaserCoachItems(collection: LaserCoachCollectionName): Promise<LaserCoachRecord[]> {
  await ensureLoaded();
  return JSON.parse(JSON.stringify(state.data[collection])) as LaserCoachRecord[];
}

export async function getLaserCoachItem(collection: LaserCoachCollectionName, id: string): Promise<LaserCoachRecord | null> {
  await ensureLoaded();
  return (state.data[collection] as LaserCoachRecord[]).find((item) => item.id === id) ?? null;
}

export async function upsertLaserCoachItem<T extends LaserCoachRecord>(collection: LaserCoachCollectionName, item: T): Promise<T> {
  await ensureLoaded();
  const items = state.data[collection] as LaserCoachRecord[];
  const index = items.findIndex((existing) => existing.id === item.id);
  if (index >= 0) items[index] = item;
  else items.unshift(item);
  schedulePersist();
  return item;
}

export async function deleteLaserCoachItem(collection: LaserCoachCollectionName, id: string): Promise<boolean> {
  await ensureLoaded();
  const items = state.data[collection] as LaserCoachRecord[];
  const next = items.filter((item) => item.id !== id);
  if (next.length === items.length) return false;
  (state.data[collection] as LaserCoachRecord[]) = next;
  schedulePersist();
  return true;
}

export async function storeLaserCoachUpload(fileName: string, content: string): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const safeBase = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "upload.svg";
  const storedName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeBase}`;
  const filePath = path.join(UPLOAD_DIR, storedName);
  await writeFile(filePath, content, "utf8");
  return filePath;
}
