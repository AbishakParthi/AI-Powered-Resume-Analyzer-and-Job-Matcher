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

export default function PhotoProTemplate({ data, customization }: TemplateProps) {
  const spacing = spacingClassMap[customization.spacing];
  const photoDataUrl = customization.photoDataUrl || "";
  const educationLines = toEducationLines(data.education);
  const certifications = data.certifications || [];
  const projects = toProjectCards(data.projects || []);
  const isHidden = (section: string) => customization.hiddenSections.includes(section);

  return (
    <article
      className={`bg-white text-black box-border w-full max-w-[595px] p-2 mx-auto ${spacing}`}
      style={{ fontFamily: customization.fontFamily }}
    >
      <header className="grid grid-cols-[auto_1fr] items-center gap-2 border-b pb-4" style={{ borderColor: customization.themeColor }}>
        {photoDataUrl ? (
          <img
            src={photoDataUrl}
            alt="Profile"
            className="h-28 w-28 rounded-full object-cover border-4"
            style={{ borderColor: customization.themeColor }}
          />
        ) : (
          <div
            className="h-28 w-28 rounded-full flex items-center justify-center text-xs font-semibold border-4"
            style={{ borderColor: customization.themeColor, color: customization.themeColor }}
          >
            NO PHOTO
          </div>
        )}
        <div className="text-center">
          <p className="text-4xl font-semibold tracking-[0.18em]">{data.header.name}</p>
          {data.header.title && <p className="text-xs mt-2 uppercase tracking-[0.2em]">{data.header.title}</p>}
        </div>
      </header>

      <div className="grid grid-cols-[1fr_2fr] gap-2 pt-4">
        <aside className="pr-6 border-r" style={{ borderColor: customization.themeColor }}>
          <div className={spacing}>
            <section>
              <h2 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: customization.themeColor }}>
                Contact
              </h2>
              <ul className="mt-2 space-y-1 text-sm leading-6">
                {data.header.phone && <li>{data.header.phone}</li>}
                {data.header.email && <li>{data.header.email}</li>}
                {data.header.location && <li>{data.header.location}</li>}
                {data.header.linkedin && <li>{data.header.linkedin}</li>}
                {data.header.portfolio && <li>{data.header.portfolio}</li>}
              </ul>
            </section>

            {!isHidden("education") && educationLines.length > 0 && (
              <section>
                <h2 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: customization.themeColor }}>
                  Education
                </h2>
                <ul className="mt-2 space-y-1 text-sm leading-6">
                  {educationLines.map((line, index) => (
                    <li key={`${line}-${index}`}>{line}</li>
                  ))}
                </ul>
              </section>
            )}

            {!isHidden("skills") && data.skills.length > 0 && (
              <section>
                <h2 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: customization.themeColor }}>
                  Skills
                </h2>
                <ul className="mt-2 space-y-1 text-sm leading-6">
                  {data.skills.map((skill, index) => (
                    <li key={`${skill}-${index}`}>{skill}</li>
                  ))}
                </ul>
              </section>
            )}

            {!isHidden("certifications") && certifications.length > 0 && (
              <section>
                <h2 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: customization.themeColor }}>
                  Certifications
                </h2>
                <ul className="mt-2 space-y-1 text-sm leading-6">
                  {certifications.map((cert, index) => (
                    <li key={`${cert}-${index}`}>{cert}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </aside>

        <div className={`pl-6 ${spacing}`}>
          {!isHidden("summary") && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: customization.themeColor }}>
                Summary
              </h2>
              <p className="text-sm mt-2 leading-6">{data.summary}</p>
            </section>
          )}

          {!isHidden("experience") && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: customization.themeColor }}>
                Experience
              </h2>
              <div className="mt-2 space-y-3">
                {data.experience.map((item, index) => (
                  <div key={`${item.company}-${index}`}>
                    <div className="flex justify-between gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{item.title} {item.company ? `| ${item.company}` : ""}</p>
                      <p className="text-sm">{item.duration}</p>
                    </div>
                    <ul className="list-disc ml-5 mt-1 text-sm leading-6">
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
              <h2 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: customization.themeColor }}>
                Projects
              </h2>
              <div className="mt-2 space-y-3">
                {projects.map((project, index) => (
                  <div key={`${project.title || "project"}-${index}`}>
                    {project.title && <p className="font-semibold text-sm">{project.title}</p>}
                    {project.description && <p className="text-sm mt-1 leading-6">{project.description}</p>}
                    {project.technologies.length > 0 && (
                      <p className="text-xs mt-1 text-gray-700">
                        {project.technologies.join(" | ")}
                      </p>
                    )}
                    {project.bullets.length > 0 && (
                      <ul className="list-disc ml-5 mt-1 text-sm leading-6">
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
        </div>
      </div>
    </article>
  );
}
