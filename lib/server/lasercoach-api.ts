import { NextResponse } from "next/server";
import {
  deleteLaserCoachItem,
  getLaserCoachItem,
  listLaserCoachItems,
  type LaserCoachCollectionName,
  type LaserCoachRecord,
  upsertLaserCoachItem,
} from "@/lib/server/lasercoach-store";
import { withRequestLog } from "@/lib/server/request-logs";
import type { ValidationResult } from "@/lib/validation/spot-validation";

type Validator<T extends LaserCoachRecord> = (input: Partial<T>) => ValidationResult<T>;

async function requestBody(request: Request): Promise<unknown> {
  return request.json().catch(() => null);
}

export async function handleLaserCoachCollectionGet(request: Request, collection: LaserCoachCollectionName) {
  return withRequestLog(request, async () => {
    const items = await listLaserCoachItems(collection);
    return NextResponse.json({ items });
  });
}

export async function handleLaserCoachCollectionPost<T extends LaserCoachRecord>(
  request: Request,
  collection: LaserCoachCollectionName,
  validate: Validator<T>,
) {
  return withRequestLog(request, async () => {
    const body = (await requestBody(request)) as Partial<T> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ errors: ["Expected a JSON object."] }, { status: 400 });
    }
    const validation = validate(body);
    if (!validation.ok || !validation.value) {
      return NextResponse.json({ errors: validation.errors }, { status: 400 });
    }
    const item = await upsertLaserCoachItem(collection, validation.value);
    return NextResponse.json({ item }, { status: 201 });
  });
}

async function getParams(context: { params: Promise<{ id: string }> | { id: string } }) {
  return Promise.resolve(context.params);
}

export async function handleLaserCoachItemGet(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
  collection: LaserCoachCollectionName,
) {
  return withRequestLog(request, async () => {
    const { id } = await getParams(context);
    const item = await getLaserCoachItem(collection, id);
    if (!item) return NextResponse.json({ errors: ["Not found."] }, { status: 404 });
    return NextResponse.json({ item });
  });
}

export async function handleLaserCoachItemPatch<T extends LaserCoachRecord>(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
  collection: LaserCoachCollectionName,
  validate: Validator<T>,
) {
  return withRequestLog(request, async () => {
    const { id } = await getParams(context);
    const existing = await getLaserCoachItem(collection, id);
    if (!existing) return NextResponse.json({ errors: ["Not found."] }, { status: 404 });
    const body = (await requestBody(request)) as Partial<T> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ errors: ["Expected a JSON object."] }, { status: 400 });
    }
    const validation = validate({ ...existing, ...body, id, updatedAt: new Date().toISOString() } as Partial<T>);
    if (!validation.ok || !validation.value) {
      return NextResponse.json({ errors: validation.errors }, { status: 400 });
    }
    const item = await upsertLaserCoachItem(collection, validation.value);
    return NextResponse.json({ item });
  });
}

export async function handleLaserCoachItemDelete(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
  collection: LaserCoachCollectionName,
) {
  return withRequestLog(request, async () => {
    const { id } = await getParams(context);
    const deleted = await deleteLaserCoachItem(collection, id);
    if (!deleted) return NextResponse.json({ errors: ["Not found."] }, { status: 404 });
    return NextResponse.json({ ok: true });
  });
}
