import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import type { CSSProperties } from "react";
import { usePuterStore } from "~/lib/puter";
import TemplateSelector from "~/components/TemplateSelector";
import ResumeRenderer from "~/components/ResumeRenderer";
import type {
  AIResumeDocument,
  ResumeCustomization,
  ResumeTemplateId,
} from "~/lib/resume-builder-types";

const defaultImprovedResume: ImprovedResume = {
  header: {
    fullName: "",
    title: "",
    email: "",
    phone: "",
    location: "",
    links: [],
  },
  summary: "",
  experience: [],
  projects: [],
  skills: [],
  education: "",
  improvedScoreEstimate: 0,
};

const toLineText = (items: string[]) => items.join("\n");
const fromLineText = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const exportSafeColorVars: CSSProperties = {
  // html2canvas/html2pdf does not support oklch() color functions used by Tailwind v4 tokens.
  // Override relevant tokens with hex colors only inside the printable preview subtree.
  ["--color-white" as any]: "#ffffff",
  ["--color-black" as any]: "#000000",
  ["--color-gray-200" as any]: "#e5e7eb",
  ["--color-gray-300" as any]: "#d1d5db",
  ["--color-gray-600" as any]: "#4b5563",
  ["--color-gray-700" as any]: "#374151",
  backgroundColor: "#ffffff",
  color: "#000000",
};

export default function ResumeBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { auth, isLoading, kv } = usePuterStore();
  const [resume, setResume] = useState<ImprovedResume>(defaultImprovedResume);
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplateId>("modern");
  const [availableTemplates, setAvailableTemplates] = useState<ResumeTemplateId[]>([
    "modern",
    "minimal",
    "corporate",
    "creative",
  ]);
  const [skillsText, setSkillsText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pageError, setPageError] = useState("");
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated) {
      navigate(`/auth?next=/resume-builder/${id}`);
    }
  }, [isLoading, auth.isAuthenticated, id, navigate]);

  useEffect(() => {
    const loadResume = async () => {
      const raw = await kv.get(`resume:${id}`);
      if (!raw) {
        setPageError("Resume data not found.");
        return;
      }

      const parsed = JSON.parse(raw) as Resume;
      if (!parsed.improvedResume) {
        setPageError("No improved resume available. Build it from Resume Review first.");
        return;
      }
      setResume(parsed.improvedResume);
      setSelectedTemplate(parsed.improvedResume.selectedTemplate || "modern");
      setAvailableTemplates(
        parsed.improvedResume.availableTemplates?.length
          ? parsed.improvedResume.availableTemplates
          : ["modern", "minimal", "corporate", "creative"]
      );
      setSkillsText(toLineText(parsed.improvedResume.skills || []));
    };

    loadResume();
  }, [id, kv]);

  const previewSkills = useMemo(() => resume.skills.filter(Boolean), [resume.skills]);
  const previewData = useMemo<AIResumeDocument>(
    () => ({
      header: {
        name: resume.header.fullName,
        email: resume.header.email,
        phone: resume.header.phone,
        linkedin: resume.header.links?.[0] || "",
      },
      summary: resume.summary,
      experience: resume.experience.map((item) => ({
        title: item.role,
        company: item.company,
        duration: item.duration,
        bullets: item.bullets,
      })),
      projects: resume.projects.map((item) => ({
        title: item.name,
        description: item.bullets?.[0] || "",
        technologies: item.techStack || [],
        bullets: item.bullets || [],
      })),
      skills: previewSkills,
      education: resume.education
        ? resume.education
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => ({ details: line }))
        : [],
      certifications: [],
      keywordsUsed: [],
      estimatedATSScore: resume.improvedScoreEstimate || 0,
    }),
    [resume, previewSkills]
  );
  const previewCustomization = useMemo<ResumeCustomization>(
    () => ({
      themeColor: "#2563eb",
      fontFamily: "Inter",
      spacing: "normal",
      sectionOrder: ["summary", "experience", "projects", "skills", "education", "certifications"],
      hiddenSections: [],
      photoDataUrl: "",
    }),
    []
  );

  const updateExperienceBullets = (index: number, value: string) => {
    setResume((prev) => {
      const next = [...prev.experience];
      next[index] = { ...next[index], bullets: fromLineText(value) };
      return { ...prev, experience: next };
    });
  };

  const updateProjectBullets = (index: number, value: string) => {
    setResume((prev) => {
      const next = [...prev.projects];
      next[index] = { ...next[index], bullets: fromLineText(value) };
      return { ...prev, projects: next };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const raw = await kv.get(`resume:${id}`);
      if (!raw) throw new Error("Resume record not found");
      const parsed = JSON.parse(raw) as Resume;
      parsed.improvedResume = {
        ...resume,
        selectedTemplate,
        availableTemplates,
      };
      await kv.set(`resume:${id}`, JSON.stringify(parsed));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Save failed";
      setPageError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!previewRef.current) return;
    setIsDownloading(true);
    setPageError("");
    try {
      const module = await import("html2pdf.js");
      const html2pdf = (module.default ?? module) as any;
      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: `${resume.header.fullName || "improved-resume"}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            onclone: (doc: Document) => {
              const clonedRoot = doc.querySelector("[data-export-root='resume-preview']") as HTMLElement | null;
              if (!clonedRoot) return;
              const view = doc.defaultView;
              const nodes = [clonedRoot, ...Array.from(clonedRoot.querySelectorAll("*"))] as HTMLElement[];
              nodes.forEach((node) => {
                node.style.filter = "none";
                node.style.backdropFilter = "none";
                const computed = view?.getComputedStyle(node);
                if (computed?.backgroundImage?.includes("gradient")) {
                  node.style.backgroundImage = "none";
                }
              });
            },
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["avoid-all", "css", "legacy"] },
        })
        .from(previewRef.current)
        .save();
    } catch (error) {
      let message = error instanceof Error ? error.message : "PDF generation failed";
      if (message.includes("unsupported color function") && message.includes("oklch")) {
        message = "PDF export failed due to an unsupported CSS color format. Refresh and try again.";
      }
      setPageError(message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <main className="bg-[linear-gradient(145deg,_#f8fafc_0%,_#eef2ff_42%,_#fef9c3_100%)] min-h-screen p-4 sm:p-8">
      <div className="max-w-[1400px] mx-auto flex flex-col gap-4">
        <nav className="resume-nav bg-white rounded-xl">
          <Link to={`/resume/${id}`} className="back-button">
            <img src="/icons/back.svg" alt="back" className="w-2.5 h-2.5" />
            <span className="text-gray-800 text-sm font-semibold">Back to Resume Review</span>
          </Link>
          AI Resume Builder
        </nav>

        {pageError && (
          <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3">
            {pageError}
          </div>
        )}

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm flex flex-col gap-4">
            <h2 className="text-xl text-black! font-bold">Editable Fields</h2>
            <TemplateSelector
              selectedTemplate={selectedTemplate}
              onSelect={(template) => setSelectedTemplate(template)}
              allowedTemplates={availableTemplates}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                value={resume.header.fullName}
                onChange={(e) =>
                  setResume((prev) => ({
                    ...prev,
                    header: { ...prev.header, fullName: e.target.value },
                  }))
                }
                placeholder="Full Name"
              />
              <input
                value={resume.header.title}
                onChange={(e) =>
                  setResume((prev) => ({
                    ...prev,
                    header: { ...prev.header, title: e.target.value },
                  }))
                }
                placeholder="Professional Title"
              />
              <input
                value={resume.header.email}
                onChange={(e) =>
                  setResume((prev) => ({
                    ...prev,
                    header: { ...prev.header, email: e.target.value },
                  }))
                }
                placeholder="Email"
              />
              <input
                value={resume.header.phone}
                onChange={(e) =>
                  setResume((prev) => ({
                    ...prev,
                    header: { ...prev.header, phone: e.target.value },
                  }))
                }
                placeholder="Phone"
              />
              <input
                value={resume.header.location}
                onChange={(e) =>
                  setResume((prev) => ({
                    ...prev,
                    header: { ...prev.header, location: e.target.value },
                  }))
                }
                placeholder="Location"
                className="sm:col-span-2"
              />
            </div>

            <textarea
              rows={4}
              value={resume.summary}
              onChange={(e) => setResume((prev) => ({ ...prev, summary: e.target.value }))}
              placeholder="Summary"
            />
            <textarea
              rows={3}
              value={skillsText}
              onChange={(e) => {
                const value = e.target.value;
                setSkillsText(value);
                setResume((prev) => ({ ...prev, skills: fromLineText(value) }));
              }}
              placeholder="Skills (one per line)"
            />
            <textarea
              rows={3}
              value={resume.education}
              onChange={(e) => setResume((prev) => ({ ...prev, education: e.target.value }))}
              placeholder="Education"
            />

            {resume.experience.map((item, index) => (
              <div key={`${item.company}-${index}`} className="rounded-xl border border-gray-200 p-3 flex flex-col gap-2">
                <h3 className="font-semibold text-black">{`Experience ${index + 1}`}</h3>
                <input
                  value={item.role}
                  onChange={(e) =>
                    setResume((prev) => {
                      const next = [...prev.experience];
                      next[index] = { ...next[index], role: e.target.value };
                      return { ...prev, experience: next };
                    })
                  }
                  placeholder="Role"
                />
                <input
                  value={item.company}
                  onChange={(e) =>
                    setResume((prev) => {
                      const next = [...prev.experience];
                      next[index] = { ...next[index], company: e.target.value };
                      return { ...prev, experience: next };
                    })
                  }
                  placeholder="Company"
                />
                <input
                  value={item.duration}
                  onChange={(e) =>
                    setResume((prev) => {
                      const next = [...prev.experience];
                      next[index] = { ...next[index], duration: e.target.value };
                      return { ...prev, experience: next };
                    })
                  }
                  placeholder="Duration"
                />
                <textarea
                  rows={4}
                  value={toLineText(item.bullets)}
                  onChange={(e) => updateExperienceBullets(index, e.target.value)}
                  placeholder="Bullets (one per line)"
                />
              </div>
            ))}

            {resume.projects.map((item, index) => (
              <div key={`${item.name}-${index}`} className="rounded-xl border border-gray-200 p-3 flex flex-col gap-2">
                <h3 className="font-semibold text-black">{`Project ${index + 1}`}</h3>
                <input
                  value={item.name}
                  onChange={(e) =>
                    setResume((prev) => {
                      const next = [...prev.projects];
                      next[index] = { ...next[index], name: e.target.value };
                      return { ...prev, projects: next };
                    })
                  }
                  placeholder="Project Name"
                />
                <textarea
                  rows={4}
                  value={toLineText(item.bullets)}
                  onChange={(e) => updateProjectBullets(index, e.target.value)}
                  placeholder="Project bullets (one per line)"
                />
              </div>
            ))}

            <div className="flex flex-wrap gap-3">
              <button type="button" className="primary-button w-fit px-6" onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                className="primary-button w-fit px-6"
                onClick={handleDownloadPdf}
                disabled={isDownloading}
              >
                {isDownloading ? "Generating PDF..." : "Download as PDF"}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-3 sm:p-8 overflow-auto">
            <div
              ref={previewRef}
              data-export-root="resume-preview"
              style={exportSafeColorVars}
              className="mx-auto bg-white text-black max-w-[794px]"
            >
              <ResumeRenderer
                selectedTemplate={selectedTemplate}
                data={previewData}
                customization={previewCustomization}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
