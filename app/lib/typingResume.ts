import type { AIResumeDocument } from "./resume-builder-types";

type MutableEducation = Array<Record<string, unknown>>;

const toString = (value: unknown) => (typeof value === "string" ? value : "");
const toStringArray = (value: unknown) =>
  Array.isArray(value) ? value.map((item) => toString(item)).filter(Boolean) : [];

export const getTypingTotalLength = (data: AIResumeDocument): number => {
  let total = 0;
  const add = (text: string) => {
    total += text.length;
  };

  const header = data.header || {};
  add(toString(header.name));
  add(toString(header.title));
  add(toString(header.email));
  add(toString(header.phone));
  add(toString(header.location));
  add(toString(header.linkedin));
  add(toString(header.portfolio));

  add(toString(data.summary));

  (data.experience || []).forEach((item) => {
    add(toString(item.title));
    add(toString(item.company));
    add(toString(item.duration));
    (item.bullets || []).forEach((bullet) => add(toString(bullet)));
  });

  (data.projects || []).forEach((item) => {
    if (!item || typeof item !== "object") return;
    const record = item as Record<string, unknown>;
    add(toString(record.title ?? record.name));
    add(toString(record.description));
    toStringArray(record.technologies || record.techStack).forEach((tech) => add(tech));
    toStringArray(record.bullets).forEach((bullet) => add(bullet));
  });

  toStringArray(data.skills).forEach((skill) => add(skill));

  (data.education || []).forEach((item) => {
    if (!item || typeof item !== "object") return;
    const record = item as Record<string, unknown>;
    add(toString(record.degree));
    add(toString(record.institution));
    add(toString(record.year));
    add(toString(record.details));
  });

  toStringArray(data.certifications).forEach((cert) => add(cert));

  return total;
};

export const buildTypedResumeData = (
  data: AIResumeDocument,
  progress: number
): AIResumeDocument => {
  let remaining = Math.max(0, progress);
  const take = (value: string) => {
    if (remaining <= 0) return "";
    const count = Math.min(value.length, remaining);
    remaining -= count;
    return value.slice(0, count);
  };

  const header = data.header || {};
  const typedHeader = {
    name: take(toString(header.name)),
    title: take(toString(header.title)),
    email: take(toString(header.email)),
    phone: take(toString(header.phone)),
    location: take(toString(header.location)),
    linkedin: take(toString(header.linkedin)),
    portfolio: take(toString(header.portfolio)),
  };

  const typedSummary = take(toString(data.summary));

  const typedExperience = (data.experience || [])
    .map((item) => {
      const title = take(toString(item.title));
      const company = take(toString(item.company));
      const duration = take(toString(item.duration));
      const bullets = (item.bullets || [])
        .map((bullet) => take(toString(bullet)))
        .filter(Boolean);

      if (!title && !company && !duration && bullets.length === 0) {
        return null;
      }

      return { ...item, title, company, duration, bullets };
    })
    .filter(Boolean) as AIResumeDocument["experience"];

  const typedProjects = (data.projects || [])
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const title = take(toString(record.title ?? record.name));
      const description = take(toString(record.description));
      const technologies = toStringArray(record.technologies || record.techStack)
        .map((tech) => take(tech))
        .filter(Boolean);
      const bullets = toStringArray(record.bullets)
        .map((bullet) => take(bullet))
        .filter(Boolean);
      const hasContent =
        Boolean(title) ||
        Boolean(description) ||
        technologies.length > 0 ||
        bullets.length > 0;

      if (!hasContent) return null;

      return {
        ...record,
        title,
        description,
        technologies,
        bullets,
      } as Record<string, unknown>;
    })
    .filter(Boolean) as AIResumeDocument["projects"];

  const typedSkills = toStringArray(data.skills)
    .map((skill) => take(skill))
    .filter(Boolean);

  const typedEducation = (data.education || [])
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const degree = take(toString(record.degree));
      const institution = take(toString(record.institution));
      const year = take(toString(record.year));
      const details = take(toString(record.details));
      if (!degree && !institution && !year && !details) return null;
      return {
        ...record,
        degree,
        institution,
        year,
        details,
      };
    })
    .filter(Boolean) as MutableEducation;

  const typedCertifications = toStringArray(data.certifications)
    .map((cert) => take(cert))
    .filter(Boolean);

  return {
    ...data,
    header: typedHeader,
    summary: typedSummary,
    experience: typedExperience,
    projects: typedProjects,
    skills: typedSkills,
    education: typedEducation,
    certifications: typedCertifications,
  };
};
