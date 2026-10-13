"use client";

/**
 * On-device storage. Everything — surveys, their photos, and branding — lives
 * in this browser's IndexedDB, so the app needs no account and no server.
 * IndexedDB rather than localStorage because a survey with photos easily
 * outgrows localStorage's ~5 MB quota.
 */

const DB_NAME = "sitewalksurvey";
const DB_VERSION = 1;
const SURVEYS = "surveys";
const SETTINGS = "settings";
const BRAND_KEY = "brand";

export interface SurveyRow {
  id: string;
  opp_number: string | null;
  site_name: string | null;
  customer_name: string | null;
  updated_at: string;
}

interface SurveyRecord extends SurveyRow {
  data: Record<string, unknown>;
}

export interface StoredBrand {
  name: string;
  logo: string;
  tagline: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(SURVEYS)) db.createObjectStore(SURVEYS, { keyPath: "id" });
        if (!db.objectStoreNames.contains(SETTINGS)) db.createObjectStore(SETTINGS);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error ?? new Error("Could not open local storage"));
      };
    });
  }
  return dbPromise;
}

async function run<T>(
  store: string,
  mode: IDBTransactionMode,
  op: (s: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = op(db.transaction(store, mode).objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Local storage error"));
  });
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);

/** Create or overwrite a survey. Returns its id. */
export async function saveSurvey(id: string | null, data: Record<string, unknown>): Promise<string> {
  const record: SurveyRecord = {
    id: id ?? newId(),
    opp_number: text(data.opp),
    site_name: text(data.projectName),
    customer_name: text(data.customerName),
    updated_at: new Date().toISOString(),
    data,
  };
  await run(SURVEYS, "readwrite", s => s.put(record));
  return record.id;
}

export async function listSurveys(): Promise<SurveyRow[]> {
  const all = await run<SurveyRecord[]>(SURVEYS, "readonly", s => s.getAll());
  return all
    .map(({ id, opp_number, site_name, customer_name, updated_at }) => ({ id, opp_number, site_name, customer_name, updated_at }))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function loadSurvey(id: string): Promise<Record<string, unknown>> {
  const rec = await run<SurveyRecord | undefined>(SURVEYS, "readonly", s => s.get(id));
  if (!rec) throw new Error("Survey not found");
  return rec.data;
}

export async function deleteSurvey(id: string): Promise<void> {
  await run(SURVEYS, "readwrite", s => s.delete(id));
}

export async function loadBrand(): Promise<StoredBrand> {
  const b = await run<StoredBrand | undefined>(SETTINGS, "readonly", s => s.get(BRAND_KEY));
  return { name: b?.name ?? "", logo: b?.logo ?? "", tagline: b?.tagline ?? "" };
}

export async function saveBrand(brand: StoredBrand): Promise<void> {
  await run(SETTINGS, "readwrite", s => s.put(brand, BRAND_KEY));
}
