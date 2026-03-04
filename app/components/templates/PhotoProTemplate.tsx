import type { TemplateProps } from "./types";
import { spacingClassMap } from "./types";

export default function PhotoProTemplate({ data, customization }: TemplateProps) {
  const spacing = spacingClassMap[customization.spacing];
  const photoDataUrl = customization.photoDataUrl || "";

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

      <section>
        <h2 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: customization.themeColor }}>
          Summary
        </h2>
        <p className="text-sm mt-2 leading-6">{data.summary}</p>
      </section>

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

      <section>
        <h2 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: customization.themeColor }}>
          Skills
        </h2>
        <p className="text-sm mt-2">{data.skills.join(" | ")}</p>
      </section>
    </article>
  );
}
