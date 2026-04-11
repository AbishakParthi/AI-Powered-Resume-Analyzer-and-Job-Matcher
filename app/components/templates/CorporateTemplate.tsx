import type { TemplateProps } from "./types";
import { spacingClassMap } from "./types";

const toEducationLines = (education: Array<Record<string, unknown>>) => {
  const toString = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  return education
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const record = item as Record<string, unknown>;
      const parts = [
        toString(record.degree),
        toString(record.institution),
        toString(record.year),
        toString(record.details),
      ].filter(Boolean);
      return parts.join(" | ");
    })
    .filter(Boolean);
};

const toProjectCards = (projects: Array<Record<string, unknown>>) => {
  const toString = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const toStringArray = (value: unknown) =>
    Array.isArray(value)
      ? value.map((item) => toString(item)).filter(Boolean)
      : [];

  return projects
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const title = toString(record.title || record.name);
      const description = toString(record.description);
      const technologies = toStringArray(record.technologies || record.techStack);
      const bullets = toStringArray(record.bullets);
      const hasContent =
        Boolean(title) || Boolean(description) || technologies.length > 0 || bullets.length > 0;
      if (!hasContent) return null;
      return { title, description, technologies, bullets };
    })
    .filter(Boolean) as Array<{
      title: string;
      description: string;
      technologies: string[];
      bullets: string[];
    }>;
};

export default function CorporateTemplate({ data, customization }: TemplateProps) {
  const spacing = spacingClassMap[customization.spacing];
  const educationLines = toEducationLines(data.education);
  const certifications = data.certifications || [];
  const projects = toProjectCards(data.projects || []);
  const isHidden = (section: string) => customization.hiddenSections.includes(section);

  return (
    <article
      className={`bg-white text-black box-border w-full max-w-[595px] p-2 mx-auto ${spacing}`}
      style={{ fontFamily: customization.fontFamily }}
    >
      <header className="grid grid-cols-[1fr_auto] gap-2 border-b-2 pb-4" style={{ borderColor: customization.themeColor }}>
        <div>
          <div className="text-3xl font-extrabold text-black">{data.header.name}</div>
          {data.header.title && <p className="text-sm mt-1">{data.header.title}</p>}
          <p className="text-sm mt-1">{data.header.email}</p>
          <p className="text-sm">{data.header.phone}</p>
          {data.header.location && <p className="text-sm">{data.header.location}</p>}
        </div>
        <div className="text-right text-sm">
          {[data.header.linkedin, data.header.portfolio].filter(Boolean).length > 0 && (
            <p>{[data.header.linkedin, data.header.portfolio].filter(Boolean).join(" | ")}</p>
          )}
          <p className="mt-2 font-semibold">ATS: {data.estimatedATSScore}/100</p>
        </div>
      </header>

      {!isHidden("summary") && (
        <section>
        <h2 className="text-sm font-bold uppercase tracking-wide">Professional Summary</h2>
        <p className="text-sm mt-2 leading-6">{data.summary}</p>
        </section>
      )}

      {!isHidden("experience") && (
        <section>
        <h2 className="text-sm font-bold uppercase tracking-wide">Experience</h2>
        <div className="mt-2 space-y-4">
          {data.experience.map((item, index) => (
            <div key={`${item.company}-${index}`} className="border-l-2 pl-3" style={{ borderColor: customization.themeColor }}>
              <p className="font-semibold text-sm">{item.title}</p>
              <p className="text-sm">{item.company}</p>
              <p className="text-xs">{item.duration}</p>
              <ul className="list-disc ml-5 mt-1 text-sm">
                {item.bullets.map((bullet, bulletIndex) => (
                  <li key={`${index}-${bulletIndex}`}>{bullet}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        </section>
      )}

      {!isHidden("projects") && projects.length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide">Projects</h2>
          <div className="mt-2 space-y-4">
            {projects.map((project, index) => (
              <div key={`${project.title || "project"}-${index}`} className="border-l-2 pl-3" style={{ borderColor: customization.themeColor }}>
                {project.title && <p className="font-semibold text-sm">{project.title}</p>}
                {project.description && <p className="text-sm mt-1 leading-6">{project.description}</p>}
                {project.technologies.length > 0 && (
                  <p className="text-xs mt-1 text-gray-700">
                    {project.technologies.join(" | ")}
                  </p>
                )}
                {project.bullets.length > 0 && (
                  <ul className="list-disc ml-5 mt-1 text-sm">
                    {project.bullets.map((bullet, bulletIndex) => (
                      <li key={`${index}-${bulletIndex}`}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {!isHidden("skills") && (
        <section>
        <h2 className="text-sm font-bold uppercase tracking-wide">Skills</h2>
        <p className="text-sm mt-2">{data.skills.join(" | ")}</p>
        </section>
      )}

      {!isHidden("education") && educationLines.length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide">Education</h2>
          <ul className="list-disc ml-5 mt-2 text-sm">
            {educationLines.map((line, index) => (
              <li key={`${line}-${index}`}>{line}</li>
            ))}
          </ul>
        </section>
      )}

      {!isHidden("certifications") && certifications.length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide">Certifications</h2>
          <ul className="list-disc ml-5 mt-2 text-sm">
            {certifications.map((cert, index) => (
              <li key={`${cert}-${index}`}>{cert}</li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
