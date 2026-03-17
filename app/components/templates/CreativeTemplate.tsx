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

export default function CreativeTemplate({ data, customization }: TemplateProps) {
  const spacing = spacingClassMap[customization.spacing];
  const educationLines = toEducationLines(data.education);
  const certifications = data.certifications || [];
  const isHidden = (section: string) => customization.hiddenSections.includes(section);

  return (
    <article
      className={`bg-white text-black box-border w-full max-w-[794px] p-10 mx-auto ${spacing}`}
      style={{ fontFamily: customization.fontFamily }}
    >
      <header
        className="rounded-xl p-5 text-white"
        style={{ background: `linear-gradient(120deg, ${customization.themeColor}, #0f172a)` }}
      >
        <div className="text-4xl font-black text-white leading-tight">{data.header.name}</div>
        <p className="text-sm mt-2">{[data.header.email, data.header.phone, data.header.linkedin].filter(Boolean).join(" | ")}</p>
      </header>

      {!isHidden("summary") && (
        <section>
        <h2 className="font-black text-xl" style={{ color: customization.themeColor }}>Profile</h2>
        <p className="text-sm mt-1 leading-6">{data.summary}</p>
        </section>
      )}

      {!isHidden("experience") && (
        <section>
        <h2 className="font-black text-xl" style={{ color: customization.themeColor }}>Experience</h2>
        <div className="mt-2 space-y-3">
          {data.experience.map((item, index) => (
            <div key={`${item.title}-${index}`} className="rounded-lg border border-gray-200 p-3">
              <p className="font-bold text-sm">{item.title}</p>
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

      {!isHidden("skills") && (
        <section>
        <h2 className="font-black text-xl" style={{ color: customization.themeColor }}>Skills</h2>
        <ul className="mt-2 flex flex-wrap items-start">
          {data.skills.map((skill) => (
            <li key={skill} className="mr-2 mb-2">
              <span
                className="inline-flex items-center rounded-full text-xs leading-none px-3 py-1.5 border align-middle"
                style={{ borderColor: customization.themeColor }}
              >
                {skill}
              </span>
            </li>
          ))}
        </ul>
        </section>
      )}

      {!isHidden("education") && educationLines.length > 0 && (
        <section>
          <h2 className="font-black text-xl" style={{ color: customization.themeColor }}>Education</h2>
          <ul className="list-disc ml-5 mt-2 text-sm leading-6">
            {educationLines.map((line, index) => (
              <li key={`${line}-${index}`}>{line}</li>
            ))}
          </ul>
        </section>
      )}

      {!isHidden("certifications") && certifications.length > 0 && (
        <section>
          <h2 className="font-black text-xl" style={{ color: customization.themeColor }}>Certifications</h2>
          <ul className="list-disc ml-5 mt-2 text-sm leading-6">
            {certifications.map((cert, index) => (
              <li key={`${cert}-${index}`}>{cert}</li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
