import type { TemplateProps } from "./types";
import { spacingClassMap } from "./types";

export default function MinimalTemplate({ data, customization }: TemplateProps) {
  const spacing = spacingClassMap[customization.spacing];

  return (
    <article
      className={`bg-white text-black box-border w-full max-w-[794px] p-10 mx-auto ${spacing}`}
      style={{ fontFamily: customization.fontFamily }}
    >
      <header className="pb-4 border-b border-gray-300">
        <div className="text-3xl font-bold text-black">{data.header.name}</div>
        <p className="text-sm mt-1">{[data.header.email, data.header.phone, data.header.linkedin].filter(Boolean).join(" | ")}</p>
      </header>

      <section>
        <h2 className="font-semibold text-sm uppercase">Summary</h2>
        <p className="text-sm mt-1 leading-6">{data.summary}</p>
      </section>

      <section>
        <h2 className="font-semibold text-sm uppercase">Experience</h2>
        <div className="mt-1 space-y-2">
          {data.experience.map((item, index) => (
            <div key={`${item.title}-${index}`}>
              <p className="text-sm font-semibold">{item.title} {item.company ? `| ${item.company}` : ""}</p>
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

      <section>
        <h2 className="font-semibold text-sm uppercase">Skills</h2>
        <p className="text-sm mt-1">{data.skills.join(", ")}</p>
      </section>

      <section>
        <h2 className="font-semibold text-sm uppercase">Certifications</h2>
        <ul className="list-disc ml-5 text-sm mt-1">
          {data.certifications.map((cert, index) => (
            <li key={`${cert}-${index}`}>{cert}</li>
          ))}
        </ul>
      </section>
    </article>
  );
}
