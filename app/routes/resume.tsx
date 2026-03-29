import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import ATS from "~/components/ATS";
import Details from "~/components/Details";
import Summary from "~/components/Summary";
import { usePuterStore } from "~/lib/puter";
import { IMPROVE_RESUME_SYSTEM_PROMPT } from "../../constants";
import type { ResumeTemplateId } from "~/lib/resume-builder-types";

export const meta = () => ([
    { title: 'Resumind | Review' },
    { name: 'description', content: 'Detailed overview of your resume' },
])

const resume = () => {
  const { auth, isLoading, fs, kv, ai } = usePuterStore();
  const { id } = useParams();
  const [imageUrl, setImageUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const navigate = useNavigate();
  const [jobTitle, setJobTitle] = useState("");
  const [isImproving, setIsImproving] = useState(false);
  const [improveError, setImproveError] = useState("");
  const allowedTemplates: ResumeTemplateId[] = ["modern", "minimal", "corporate", "creative"];

  const parseJsonFromAiResponse = (value: unknown): Record<string, unknown> => {
    if (typeof value !== "string") {
      throw new Error("AI returned an invalid response format");
    }

    const trimmed = value.trim();

    try {
      return JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      const start = trimmed.indexOf("{");
      const end = trimmed.lastIndexOf("}");
      if (start === -1 || end === -1 || end <= start) {
        throw new Error("AI did not return valid JSON");
      }
      return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
    }
  };

  const normalizeImprovedResume = (payload: Record<string, unknown>): ImprovedResume => {
    const toString = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    const toStringArray = (v: unknown) =>
      Array.isArray(v)
        ? v.map((item) => toString(item)).filter(Boolean).slice(0, 50)
        : [];
    const toEducationString = (v: unknown) => {
      if (typeof v === "string") return v.trim();
      if (!Array.isArray(v)) return "";
      return v
        .map((item) => {
          if (typeof item === "string") return item.trim();
          if (!item || typeof item !== "object") return "";
          const record = item as Record<string, unknown>;
          return [
            toString(record.degree),
            toString(record.institution),
            toString(record.year),
          ]
            .filter(Boolean)
            .join(" | ");
        })
        .filter(Boolean)
        .join("\n");
    };

    const asRecord = (v: unknown) =>
      v && typeof v === "object" ? (v as Record<string, unknown>) : {};

    const header = asRecord(payload.header);
    const experience = Array.isArray(payload.experience) ? payload.experience : [];
    const projects = Array.isArray(payload.projects) ? payload.projects : [];
    const selectedTemplateRaw = toString(payload.selectedTemplate);
    const selectedTemplate = (allowedTemplates.includes(selectedTemplateRaw as ResumeTemplateId)
      ? (selectedTemplateRaw as ResumeTemplateId)
      : "modern");
    const availableTemplates = Array.isArray(payload.availableTemplates)
      ? payload.availableTemplates
          .map((item) => toString(item))
          .filter((item): item is ResumeTemplateId => allowedTemplates.includes(item as ResumeTemplateId))
      : allowedTemplates;

    return {
      header: {
        fullName: toString(header.fullName) || toString(header.name),
        title: toString(header.title),
        email: toString(header.email),
        phone: toString(header.phone),
        location: toString(header.location),
        links: toStringArray(header.links).length
          ? toStringArray(header.links)
          : [toString(header.linkedin)].filter(Boolean),
      },
      summary: toString(payload.summary),
      experience: experience.slice(0, 20).map((item) => {
        const record = asRecord(item);
        return {
          company: toString(record.company),
          role: toString(record.role) || toString(record.title),
          duration: toString(record.duration),
          location: toString(record.location),
          bullets: toStringArray(record.bullets),
        };
      }),
      projects: projects.slice(0, 20).map((item) => {
        const record = asRecord(item);
        return {
          name: toString(record.name) || toString(record.title),
          techStack: toStringArray(record.techStack).length
            ? toStringArray(record.techStack)
            : toStringArray(record.technologies),
          bullets: toStringArray(record.bullets).length
            ? toStringArray(record.bullets)
            : [toString(record.description)].filter(Boolean),
          link: toString(record.link),
        };
      }),
      skills: toStringArray(payload.skills),
      education: toEducationString(payload.education),
      certifications: toStringArray(payload.certifications ?? payload.certification),
      improvedScoreEstimate: Math.min(
        100,
        Math.max(
          1,
          Number(payload.improvedScoreEstimate || payload.estimatedNewATSScore || 50)
        )
      ),
      selectedTemplate,
      availableTemplates: availableTemplates.length ? availableTemplates : allowedTemplates,
      generatedAt: new Date().toISOString(),
      model: "gpt-4.1",
    };
  };

  useEffect(() => {
    if(!isLoading && !auth.isAuthenticated) navigate(`/auth?next=/resume/${id}`);
  }, [isLoading])

  useEffect(() => {
    const loadResume = async () => {
        const resume  = await kv.get(`resume:${id}`);
        if(!resume) return;
        const data = JSON.parse(resume);
        setJobTitle(data.jobTitle);
        const resumeBlob = await fs.read(data.resumePath);
        if(!resumeBlob) return;
        const pdfBlob = new Blob([resumeBlob], { type: 'application/pdf'});
        const resumeUrl = URL.createObjectURL(pdfBlob);
        setResumeUrl(resumeUrl);
        const imageBlob = await fs.read(data.imagePath);
        if(!imageBlob) return;
        const imageUrl = URL.createObjectURL(imageBlob);
        setImageUrl(imageUrl);
        setFeedback(data.feedback);
        console.log({ resumeUrl, imageUrl, feedback: data.feedback });
    }
    loadResume();
  }, [id]);

  const handleBuildImprovedResume = async () => {
    if (!id) return;
    setImproveError("");
    setIsImproving(true);

    try {
      const existing = await kv.get(`resume:${id}`);
      if (!existing) throw new Error("Resume not found in KV store");
      const parsed = JSON.parse(existing) as Resume;
      if (!parsed.originalResume || (!parsed.analysis && !parsed.feedback)) {
        throw new Error("Missing original resume or review feedback in KV store");
      }
      const feedbackRecord =
        parsed.feedback && typeof parsed.feedback === "object"
          ? (parsed.feedback as unknown as Record<string, unknown>)
          : {};
      const analysisRecord =
        parsed.analysis && typeof parsed.analysis === "object"
          ? (parsed.analysis as Record<string, unknown>)
          : {};

      const toNumber = (value: unknown, fallback = 0) =>
        typeof value === "number" && Number.isFinite(value) ? value : fallback;

      const overallScore = toNumber(
        feedbackRecord.overallScore ?? analysisRecord.overallScore,
        0
      );
      const atsScore = toNumber(
        (feedbackRecord.ATS as Record<string, unknown> | undefined)?.score ??
          (analysisRecord.ATS as Record<string, unknown> | undefined)?.score,
        0
      );
      const toneScore = toNumber(
        (feedbackRecord.toneAndStyle as Record<string, unknown> | undefined)?.score ??
          (analysisRecord.toneAndStyle as Record<string, unknown> | undefined)?.score,
        0
      );
      const contentScore = toNumber(
        (feedbackRecord.content as Record<string, unknown> | undefined)?.score ??
          (analysisRecord.content as Record<string, unknown> | undefined)?.score,
        0
      );
      const structureScore = toNumber(
        (feedbackRecord.structure as Record<string, unknown> | undefined)?.score ??
          (analysisRecord.structure as Record<string, unknown> | undefined)?.score,
        0
      );
      const skillsScore = toNumber(
        (feedbackRecord.skills as Record<string, unknown> | undefined)?.score ??
          (analysisRecord.skills as Record<string, unknown> | undefined)?.score,
        0
      );

      const feedbackText = JSON.stringify(parsed.feedback || parsed.analysis || {}, null, 2);
      const atsSuggestions = JSON.stringify(
        analysisRecord.suggestions ??
          (feedbackRecord.ATS as Record<string, unknown> | undefined)?.tips ??
          [],
        null,
        2
      );

      const aiResponse = await ai.chat(
        [
          { role: "system", content: IMPROVE_RESUME_SYSTEM_PROMPT },
          {
            role: "user",
            content: `ACTION: BUILD IMPROVED RESUME

OLD RESUME DATA:
${JSON.stringify(parsed.originalResume, null, 2)}

RESUME REVIEW RESULTS:
Overall Score: ${overallScore}
ATS Score: ${atsScore}

SECTION SCORES:
Tone & Style: ${toneScore}
Content: ${contentScore}
Structure: ${structureScore}
Skills: ${skillsScore}

DETAILED FEEDBACK:
${feedbackText}

ATS SUGGESTIONS:
${atsSuggestions}

INSTRUCTIONS:

1. Analyze weaknesses from the review.
2. Improve the resume content accordingly.
3. Strengthen weak sections.
4. Optimize for ATS keywords.
5. Keep original facts.
6. Prepare resume for professional template rendering.
7. Set selectedTemplate as "modern" by default.
8. Include availableTemplates array.

Return ONLY valid JSON.`,
          },
        ],
        { model: "gpt-4.1", temperature: 0.2 }
      );

      const content = aiResponse?.message?.content;
      const rawText =
        typeof content === "string"
          ? content
          : Array.isArray(content)
          ? String(content[0]?.text || "")
          : "";

      const normalized = normalizeImprovedResume(parseJsonFromAiResponse(rawText));

      parsed.versionHistory = parsed.versionHistory || [];
      if (parsed.improvedResume) {
        parsed.versionHistory.push({
          improvedResume: parsed.improvedResume,
          createdAt: new Date().toISOString(),
        });
      }
      parsed.improvedResume = normalized;

      await kv.set(`resume:${id}`, JSON.stringify(parsed));

      navigate(`/resume-builder/${id}?typing=1`);
    } catch (error) {
      setImproveError(error instanceof Error ? error.message : "Failed to build improved resume");
    } finally {
      setIsImproving(false);
    }
  };

  return (
    <main className="pt-0!">
        <nav className="resume-nav rn">
            <Link to="/" className="back-button bg-blue-600 hover:bg-blue-700">
                <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
                <span className="text-white text-sm font-semibold">Back to HomePage</span>
            </Link>
            {jobTitle} &gt; Resume Review
        </nav>
        <div className="flex flex-row w-full max-lg:flex-col-reverse">
            <section className="feedback-section bg-[url('/images/bg-small.svg')] bg-cover h-screen sticky top-0 items-center justify-center">
                {imageUrl && resumeUrl && (
                    <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-wxl:h-fit w-fit hover:bg-blue-600 hover:scale-105">
                        <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                            <img src={imageUrl} className="w-full h-full object-contain rounded-2xl" title="resume" />
                        </a>
                    </div>
                )}
            </section>
            <section className="feedback-section">
                <h2 className="text-4xl text-black! font-bold">Resume Review</h2>
                <div className="flex flex-col gap-3">
                    <button
                        type="button"
                        className={isImproving ? "primary-button max-w-fit px-6 animate-pulse" : "primary-button max-w-fit px-6"}
                        onClick={handleBuildImprovedResume}
                        disabled={isImproving}
                    >
                        {isImproving ? "Building Improved Resume..." : "Build Improved Resume with AI"}
                    </button>
                    {improveError && (
                        <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            {improveError}
                        </p>
                    )}
                    {isImproving && (
                        <div className="flex flex-row items-center gap-3">
                            <img src="/images/resume-scan-2.gif" alt="Improving resume" className="w-14 h-14 object-contain" />
                            <span className="text-sm text-gray-600">Optimizing structure, bullets, and ATS alignment...</span>
                        </div>
                    )}
                </div>
                {feedback ? (
                    <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
                        <Summary feedback={feedback} />
                        <ATS score={feedback.ATS.score || 0} suggestions={feedback.ATS.tips || []} />
                        <Details feedback={feedback} />
                    </div>
                ) : (
                    <img src="/images/resume-scan-2.gif" alt="searching" className="w-full" />
                )}
            </section>
        </div>
    </main>
  )
}

export default resume
