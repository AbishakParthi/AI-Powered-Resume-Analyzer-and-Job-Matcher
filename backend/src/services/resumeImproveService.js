import OpenAI from "openai";
import { HttpError } from "../utils/httpError.js";
import { buildImproveResumePrompt } from "./aiPromptService.js";

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
  const baseURL = process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";

  if (!apiKey) {
    throw new HttpError(500, "GROQ_API_KEY is not configured");
  }

  return new OpenAI({ apiKey, baseURL });
}

function toHttpErrorFromOpenAI(err) {
  const status = typeof err?.status === "number" ? err.status : 502;
  const apiMessage =
    typeof err?.error?.message === "string"
      ? err.error.message
      : typeof err?.message === "string"
      ? err.message
      : "Failed to generate improved resume";

  if (status === 429) {
    return new HttpError(
      429,
      "Groq quota/rate limit exceeded. Check your API key plan and limits, then try again."
    );
  }

  if (status >= 400 && status < 500) {
    return new HttpError(status, apiMessage);
  }

  return new HttpError(502, apiMessage);
}

function parseJsonFromModelOutput(rawContent) {
  if (typeof rawContent !== "string") {
    throw new HttpError(502, "Invalid model response format");
  }

  const trimmed = rawContent.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new HttpError(502, "Model did not return valid JSON");
    }

    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

function normalizeImprovedResume(payload) {
  const toString = (v) => (typeof v === "string" ? v.trim() : "");
  const toStringArray = (v) =>
    Array.isArray(v)
      ? v.map((item) => toString(item)).filter(Boolean).slice(0, 50)
      : [];

  const boundedScore = Math.min(
    100,
    Math.max(1, Number(payload?.improvedScoreEstimate || 50))
  );

  return {
    header: {
      fullName: toString(payload?.header?.fullName),
      title: toString(payload?.header?.title),
      email: toString(payload?.header?.email),
      phone: toString(payload?.header?.phone),
      location: toString(payload?.header?.location),
      links: toStringArray(payload?.header?.links),
    },
    summary: toString(payload?.summary),
    experience: Array.isArray(payload?.experience)
      ? payload.experience.slice(0, 20).map((item) => ({
          company: toString(item?.company),
          role: toString(item?.role),
          duration: toString(item?.duration),
          location: toString(item?.location),
          bullets: toStringArray(item?.bullets),
        }))
      : [],
    projects: Array.isArray(payload?.projects)
      ? payload.projects.slice(0, 20).map((item) => ({
          name: toString(item?.name),
          techStack: toStringArray(item?.techStack),
          bullets: toStringArray(item?.bullets),
          link: toString(item?.link),
        }))
      : [],
    skills: toStringArray(payload?.skills),
    education: toString(payload?.education),
    improvedScoreEstimate: boundedScore,
  };
}

export async function improveResumeFromData({
  resumeId,
  originalResume,
  analysis,
  improvedResume: previousImprovedResume,
  versionHistory: previousVersionHistory,
}) {
  if (!resumeId || typeof resumeId !== "string") {
    throw new HttpError(400, "Invalid resume ID");
  }

  if (!originalResume || typeof originalResume !== "object") {
    throw new HttpError(400, "originalResume is required");
  }

  if (!analysis || typeof analysis !== "object") {
    throw new HttpError(400, "analysis is required");
  }

  const { systemPrompt, userPrompt } = buildImproveResumePrompt({
    originalResume,
    analysis,
    existingSuggestions: analysis?.suggestions,
  });

  const groq = getGroqClient();
  const model =
    process.env.GROQ_MODEL ||
    (process.env.GROQ_API_KEY ? "llama-3.3-70b-versatile" : null) ||
    process.env.OPENAI_MODEL ||
    "llama-3.3-70b-versatile";

  let response;
  try {
    response = await groq.chat.completions.create({
      model,
      temperature: 0.2,
      max_tokens: 1400,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
  } catch (err) {
    throw toHttpErrorFromOpenAI(err);
  }

  const modelText = response?.choices?.[0]?.message?.content;

  if (!modelText || typeof modelText !== "string") {
    throw new HttpError(502, "AI did not return output");
  }

  const parsed = parseJsonFromModelOutput(modelText);
  const normalizedImprovedResume = normalizeImprovedResume(parsed);
  const versionHistory = Array.isArray(previousVersionHistory)
    ? [...previousVersionHistory]
    : [];

  if (
    previousImprovedResume &&
    typeof previousImprovedResume === "object" &&
    Object.keys(previousImprovedResume).length > 0
  ) {
    versionHistory.push({
      improvedResume: previousImprovedResume,
      createdAt: new Date().toISOString(),
    });
  }

  const improvedResume = {
    ...normalizedImprovedResume,
    generatedAt: new Date().toISOString(),
    model,
  };

  return {
    resumeId,
    improvedResume,
    versionHistory,
    versionHistoryCount: versionHistory.length,
  };
}
