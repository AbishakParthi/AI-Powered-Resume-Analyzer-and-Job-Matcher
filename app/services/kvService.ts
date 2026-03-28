import type { ResumeRecord } from "~/lib/resume-builder-types";

type KVClient = {
  get: (key: string) => Promise<string | null | undefined>;
  set: (key: string, value: string) => Promise<boolean | undefined>;
  list: (
    pattern: string,
    returnValues?: boolean
  ) => Promise<string[] | KVItem[] | undefined>;
};

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function upsertUserResumeIndex(kv: KVClient, userId: string, resumeId: string) {
  const key = `user:${userId}:resumes`;
  const current = parseJson<string[]>(await kv.get(key), []);
  if (!current.includes(resumeId)) {
    current.push(resumeId);
    await kv.set(key, JSON.stringify(current));
  }
}

export async function saveResume(
  kv: KVClient,
  resumeId: string,
  data: ResumeRecord
): Promise<ResumeRecord> {
  await kv.set(`resume:${resumeId}`, JSON.stringify(data));
  await upsertUserResumeIndex(kv, data.userId, resumeId);
  return data;
}

export async function getResume(
  kv: KVClient,
  resumeId: string
): Promise<ResumeRecord | null> {
  const raw = await kv.get(`resume:${resumeId}`);
  return parseJson<ResumeRecord | null>(raw, null);
}

export async function updateResume(
  kv: KVClient,
  resumeId: string,
  data: Partial<ResumeRecord>
): Promise<ResumeRecord | null> {
  const current = await getResume(kv, resumeId);
  if (!current) return null;
  const merged: ResumeRecord = {
    ...current,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  await saveResume(kv, resumeId, merged);
  return merged;
}

export async function listUserResumes(
  kv: KVClient,
  userId: string
): Promise<ResumeRecord[]> {
  const index = parseJson<string[]>(await kv.get(`user:${userId}:resumes`), []);
  if (index.length > 0) {
    const records = await Promise.all(index.map((resumeId) => getResume(kv, resumeId)));
    return records.filter(Boolean) as ResumeRecord[];
  }

  // Fallback for older data where the user index was never created.
  const items = await kv.list("resume:*", true);
  const normalizedItems = await Promise.all(
    (Array.isArray(items) ? items : []).map(async (item) => {
      if (typeof item === "string") {
        const value = await kv.get(item);
        if (!value) return null;
        return { key: item, value } as KVItem;
      }
      if (item && typeof item === "object" && "value" in item) {
        return item as KVItem;
      }
      return null;
    })
  );

  const records = normalizedItems
    .filter((item): item is KVItem => Boolean(item?.value))
    .map((item) => parseJson<ResumeRecord | null>(item.value, null))
    .filter((record): record is ResumeRecord => Boolean(record?.resumeId));

  const filtered = userId
    ? records.filter((record) => record.userId === userId)
    : records;

  return filtered;
}

export async function ensureTemplates(kv: KVClient): Promise<string[]> {
  const key = "resume_templates";
  const existing = parseJson<string[] | null>(await kv.get(key), null);
  if (Array.isArray(existing) && existing.length > 0) {
    return existing;
  }

  const templates = ["modern", "minimal", "corporate", "creative", "photo-pro"];
  await kv.set(key, JSON.stringify(templates));
  return templates;
}
