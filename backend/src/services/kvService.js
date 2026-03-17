import { HttpError } from "../utils/httpError.js";

const KV_BASE_URL = process.env.PUTER_KV_BASE_URL || "https://api.puter.com/v2/kv";
const KV_API_KEY = process.env.PUTER_API_KEY || "";

function requireApiKey() {
  if (!KV_API_KEY) {
    throw new HttpError(
      500,
      "PUTER_API_KEY is not configured for backend KV access"
    );
  }
}

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function kvRequest(path, payload) {
  requireApiKey();

  const response = await fetch(`${KV_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KV_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new HttpError(
      response.status,
      `KV request failed (${path}): ${text || response.statusText}`
    );
  }

  return response.json();
}

async function kvGetRaw(key) {
  const payload = await kvRequest("/get", { key });
  return typeof payload?.value === "string" ? payload.value : null;
}

async function kvSetRaw(key, value) {
  await kvRequest("/set", { key, value });
}

async function kvListRaw(pattern) {
  const payload = await kvRequest("/list", { pattern, returnValues: true });
  return Array.isArray(payload?.items) ? payload.items : [];
}

export async function saveResume(resumeId, data) {
  if (!resumeId || typeof resumeId !== "string") {
    throw new HttpError(400, "Invalid resumeId");
  }

  const serialized = JSON.stringify(data);
  await kvSetRaw(`resume:${resumeId}`, serialized);

  const userId = data?.userId;
  if (typeof userId === "string" && userId) {
    const indexKey = `user:${userId}:resumes`;
    const existingRaw = await kvGetRaw(indexKey);
    const existing = safeJsonParse(existingRaw || "[]");
    const next = Array.isArray(existing) ? existing : [];
    if (!next.includes(resumeId)) {
      next.push(resumeId);
      await kvSetRaw(indexKey, JSON.stringify(next));
    }
  }

  return data;
}

export async function getResume(resumeId) {
  if (!resumeId || typeof resumeId !== "string") {
    throw new HttpError(400, "Invalid resumeId");
  }

  const raw = await kvGetRaw(`resume:${resumeId}`);
  if (!raw) return null;
  const parsed = safeJsonParse(raw);
  return parsed && typeof parsed === "object" ? parsed : null;
}

export async function updateResume(resumeId, patch) {
  const current = (await getResume(resumeId)) || {};
  const merged = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await saveResume(resumeId, merged);
  return merged;
}

export async function listUserResumes(userId) {
  if (!userId || typeof userId !== "string") {
    throw new HttpError(400, "Invalid userId");
  }

  const raw = await kvGetRaw(`user:${userId}:resumes`);
  const ids = safeJsonParse(raw || "[]");
  if (!Array.isArray(ids)) return [];

  const resumes = await Promise.all(
    ids.map((resumeId) => getResume(String(resumeId)))
  );

  return resumes.filter(Boolean);
}

export async function getUserContext(userId) {
  const profile = await getResume(userId);
  const resumes = await listUserResumes(userId);
  return { profile, resumes };
}

