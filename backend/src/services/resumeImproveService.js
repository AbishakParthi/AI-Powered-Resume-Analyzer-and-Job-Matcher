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

function hasNonEmptyEducation(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasNonEmptySkills(value) {
  return Array.isArray(value) && value.some((item) => typeof item === "string" && item.trim());
}

function hasNonEmptyExperience(value) {
  if (!Array.isArray(value) || value.length === 0) return false;
  return value.some((item) => {
    if (!item || typeof item !== "object") return false;
    const role = typeof item.role === "string" ? item.role.trim() : "";
    const company = typeof item.company === "string" ? item.company.trim() : "";
    const bullets = Array.isArray(item.bullets)
      ? item.bullets.filter((b) => typeof b === "string" && b.trim())
      : [];
    return Boolean(role || company || bullets.length);
  });
}

function mergeMissingSections(primary, fallback) {
  if (!fallback || typeof fallback !== "object") return primary;
  const merged = { ...primary };

  if (!hasNonEmptyExperience(merged.experience) && hasNonEmptyExperience(fallback.experience)) {
    merged.experience = fallback.experience;
  }

  if (!hasNonEmptySkills(merged.skills) && hasNonEmptySkills(fallback.skills)) {
    merged.skills = fallback.skills;
  }

  if (!hasNonEmptyEducation(merged.education) && hasNonEmptyEducation(fallback.education)) {
    merged.education = fallback.education;
  }

  if ((!merged.projects || merged.projects.length === 0) && Array.isArray(fallback.projects) && fallback.projects.length > 0) {
    merged.projects = fallback.projects;
  }

  return merged;
}

function hasCoreSections(resume) {
  if (!resume || typeof resume !== "object") return false;
  return (
    Boolean(typeof resume.summary === "string" && resume.summary.trim()) &&
    hasNonEmptyExperience(resume.experience) &&
    hasNonEmptySkills(resume.skills) &&
    hasNonEmptyEducation(resume.education)
  );
}

function extractExperienceFromParsedText(parsedText) {
  if (typeof parsedText !== "string" || !parsedText.trim()) return [];
  const lines = parsedText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const headingLabels = [
    "EXPERIENCE",
    "WORK EXPERIENCE",
    "PROFESSIONAL EXPERIENCE",
    "INTERNSHIP",
    "INTERNSHIPS",
    "ACADEMIC PROJECTS",
    "PROJECTS",
  ];

  const normalize = (value) =>
    value
      .toUpperCase()
      .replace(/[^A-Z\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const normalizedHeadings = headingLabels.map((h) => normalize(h));
  const normalizedLines = lines.map((line) => normalize(line));
  const sectionIndex = normalizedLines.findIndex((line) =>
    normalizedHeadings.includes(line)
  );
  if (sectionIndex === -1) return [];

  const isHeadingLine = (line) => {
    const normalized = normalize(line);
    if (!normalized) return false;
    if (normalizedHeadings.includes(normalized)) return true;
    return line === line.toUpperCase() && line.length <= 40;
  };

  const sectionLines = [];
  for (let i = sectionIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (isHeadingLine(line)) break;
    sectionLines.push(line);
  }

  const bullets = sectionLines
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);

  if (bullets.length === 0) return [];

  const heading = normalizedLines[sectionIndex];
  const role =
    heading.includes("PROJECT") || heading.includes("ACADEMIC")
      ? "Academic Projects"
      : "Experience";

  return [
    {
      company: "",
      role,
      duration: "",
      location: "",
      bullets: bullets.slice(0, 6),
    },
  ];
}

function buildExperienceFallback(resume, parsedText) {
  const extracted = extractExperienceFromParsedText(parsedText);
  if (extracted.length) return extracted;

  const projects = Array.isArray(resume?.projects) ? resume.projects : [];
  const skills = Array.isArray(resume?.skills) ? resume.skills : [];
  const education = typeof resume?.education === "string" ? resume.education.trim() : "";

  const bulletsFromProjects = [];
  for (const project of projects) {
    if (!project || typeof project !== "object") continue;
    const name = typeof project.name === "string" ? project.name.trim() : "";
    const techStack = Array.isArray(project.techStack)
      ? project.techStack.filter((t) => typeof t === "string" && t.trim())
      : [];
    const bullets = Array.isArray(project.bullets)
      ? project.bullets.filter((b) => typeof b === "string" && b.trim())
      : [];

    if (bullets.length) {
      bulletsFromProjects.push(...bullets);
    } else if (name || techStack.length) {
      const techLabel = techStack.length ? ` (${techStack.join(", ")})` : "";
      bulletsFromProjects.push(`${name || "Project"}${techLabel}`);
    }
  }

  if (bulletsFromProjects.length) {
    return [
      {
        company: "",
        role: "Project Experience",
        duration: "",
        location: "",
        bullets: bulletsFromProjects.slice(0, 6),
      },
    ];
  }

  if (skills.length) {
    return [
      {
        company: "",
        role: "Skills-Based Experience",
        duration: "",
        location: "",
        bullets: [`Skills: ${skills.slice(0, 12).join(", ")}`],
      },
    ];
  }

  if (education) {
    return [
      {
        company: "",
        role: "Academic Experience",
        duration: "",
        location: "",
        bullets: [`Education: ${education}`],
      },
    ];
  }

  return [];
}

function normalizeFallbackFromOriginal(originalResume) {
  if (!originalResume || typeof originalResume !== "object") {
    return normalizeImprovedResume({});
  }

  const source = originalResume.sourceFromBuilder || {};
  const header = source.header || originalResume.header || {};

  return normalizeImprovedResume({
    header: {
      fullName: header.fullName || header.name || "",
      title: header.title || originalResume.jobTitle || "",
      email: header.email || "",
      phone: header.phone || "",
      location: header.location || "",
      links: Array.isArray(header.links)
        ? header.links
        : [header.linkedin].filter(Boolean),
    },
    summary: source.summary || originalResume.summary || "",
    experience:
      source.experience ||
      originalResume.experience ||
      originalResume.workExperience ||
      [],
    projects: source.projects || originalResume.projects || [],
    skills: source.skills || originalResume.skills || originalResume.keySkills || [],
    education:
      source.education ||
      originalResume.education ||
      originalResume.educationDetails ||
      "",
    improvedScoreEstimate: 50,
  });
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
    previousImprovedResume,
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
  const normalizedPreviousResume = normalizeImprovedResume(previousImprovedResume || {});
  const normalizedOriginalFallback = normalizeFallbackFromOriginal(originalResume);
  const withPreviousFallback = mergeMissingSections(
    normalizedImprovedResume,
    normalizedPreviousResume
  );
  let improvedResumeMerged = mergeMissingSections(
    withPreviousFallback,
    normalizedOriginalFallback
  );

  // Retry once with stricter instruction when core sections are still incomplete.
  if (
    !hasCoreSections(improvedResumeMerged) &&
    typeof originalResume?.parsedText === "string" &&
    originalResume.parsedText.trim()
  ) {
    try {
      const repairResponse = await groq.chat.completions.create({
        model,
        temperature: 0.1,
        max_tokens: 1700,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `${userPrompt}

You returned an incomplete resume previously.
Return a COMPLETE improved resume JSON including non-empty summary, experience, skills, and education.
Preserve facts from raw resume text and existing data.
Previous incomplete JSON:
${modelText}`,
          },
        ],
      });

      const retryText = repairResponse?.choices?.[0]?.message?.content;
      if (typeof retryText === "string" && retryText.trim()) {
        const retryParsed = parseJsonFromModelOutput(retryText);
        const retryNormalized = normalizeImprovedResume(retryParsed);
        const retryWithPrev = mergeMissingSections(retryNormalized, normalizedPreviousResume);
        improvedResumeMerged = mergeMissingSections(retryWithPrev, normalizedOriginalFallback);
      }
    } catch {
      // Keep first-pass result with fallbacks if retry fails.
    }
  }

  if (!hasNonEmptyExperience(improvedResumeMerged.experience)) {
    const parsedText =
      typeof originalResume?.parsedText === "string" ? originalResume.parsedText : "";
    const fallbackExperience = buildExperienceFallback(improvedResumeMerged, parsedText);
    if (fallbackExperience.length) {
      improvedResumeMerged = { ...improvedResumeMerged, experience: fallbackExperience };
    }
  }
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
    ...improvedResumeMerged,
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
