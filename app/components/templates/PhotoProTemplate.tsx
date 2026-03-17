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

export default function PhotoProTemplate({ data, customization }: TemplateProps) {
  const spacing = spacingClassMap[customization.spacing];
  const photoDataUrl = customization.photoDataUrl || "";
  const educationLines = toEducationLines(data.education);
  const certifications = data.certifications || [];
  const isHidden = (section: string) => customization.hiddenSections.includes(section);

  return (
    <article
      className={`bg-white text-black box-border w-full max-w-[794px] p-10 mx-auto ${spacing}`}
      style={{ fontFamily: customization.fontFamily }}
    >
      <header className="grid grid-cols-[1fr_auto] gap-6 border-b pb-4" style={{ borderColor: customization.themeColor }}>
        <div>
          <p className="text-4xl font-black tracking-tight">{data.header.name}</p>
          <p className="text-sm mt-2">
            {[data.header.email, data.header.phone, data.header.linkedin].filter(Boolean).join(" | ")}
          </p>
        </div>
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
      </header>

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

      {!isHidden("skills") && (
        <section>
        <h2 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: customization.themeColor }}>
          Skills
        </h2>
        <p className="text-sm mt-2">{data.skills.join(" | ")}</p>
        </section>
      )}

      {!isHidden("education") && educationLines.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: customization.themeColor }}>
            Education
          </h2>
          <ul className="list-disc ml-5 mt-2 text-sm leading-6">
            {educationLines.map((line, index) => (
              <li key={`${line}-${index}`}>{line}</li>
            ))}
          </ul>
        </section>
      )}

      {!isHidden("certifications") && certifications.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: customization.themeColor }}>
            Certifications
          </h2>
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
