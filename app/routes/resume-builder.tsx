import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import type { CSSProperties } from "react";
import type { ChangeEvent } from "react";
import { toast } from "react-toastify";
import { usePuterStore } from "~/lib/puter";
import { improveResume as improveResumeApi } from "~/lib/api";
import { extractTextFromPdfFile } from "~/lib/pdf2img";
import TemplateSelector from "~/components/TemplateSelector";
import ResumeRenderer from "~/components/ResumeRenderer";
import { buildTypedResumeData, getTypingTotalLength } from "~/lib/typingResume";
import type {
  AIResumeDocument,
  ResumeCustomization,
  ResumeTemplateId,
} from "~/lib/resume-builder-types";
import { DEFAULT_CUSTOMIZATION } from "~/lib/resume-builder-types";

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
  certifications: [],
  improvedScoreEstimate: 0,
};

const emptyExperienceItem = (): ImprovedResumeExperienceItem => ({
  company: "",
  role: "",
  duration: "",
  location: "",
  bullets: [],
});

const emptyProjectItem = (): ImprovedResumeProjectItem => ({
  name: "",
  techStack: [],
  bullets: [],
  link: "",
});

const toLineText = (items: string[]) => items.join("\n");
const fromLineText = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const getUserId = (user: unknown): string => {
  if (!user || typeof user !== "object") return "";
  const candidate =
    (user as any).id || (user as any).uuid || (user as any).username || "";
  return typeof candidate === "string" ? candidate : "";
};

const toExperienceText = (items: ImprovedResumeExperienceItem[]) =>
  items
    .map((item) => {
      const header = [
        item.role || "",
        item.company || "",
        item.duration || "",
        item.location || "",
      ]
        .filter(Boolean)
        .join(" | ");
      const bullets = (item.bullets || []).map((bullet) => `- ${bullet}`);
      return [header, ...bullets].filter(Boolean).join("\n");
    })
    .filter(Boolean)
    .join("\n\n");

const fromExperienceText = (value: string): ImprovedResumeExperienceItem[] =>
  value
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      if (!lines.length) {
        return {
          company: "",
          role: "",
          duration: "",
          location: "",
          bullets: [],
        };
      }

      const [role = "", company = "", duration = "", location = ""] = lines[0]
        .split("|")
        .map((part) => part.trim());
      const bullets = lines
        .slice(1)
        .map((line) => line.replace(/^[-*]\s*/, "").trim())
        .filter(Boolean);

    return { company, role, duration, location, bullets };
  });

const reorder = (list: string[], from: number, to: number) => {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

const hasNonEmptyExperience = (items: ImprovedResumeExperienceItem[]): boolean => {
  if (!Array.isArray(items) || items.length === 0) return false;
  return items.some((item) => {
    const role = typeof item.role === "string" ? item.role.trim() : "";
    const company = typeof item.company === "string" ? item.company.trim() : "";
    const bullets = Array.isArray(item.bullets)
      ? item.bullets.filter((b) => typeof b === "string" && b.trim())
      : [];
    return Boolean(role || company || bullets.length);
  });
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });

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
  const [searchParams] = useSearchParams();
  const { auth, isLoading, kv, fs } = usePuterStore();
  const [resume, setResume] = useState<ImprovedResume>(defaultImprovedResume);
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplateId>("modern");
  const [availableTemplates, setAvailableTemplates] = useState<ResumeTemplateId[]>([
    "modern",
    "minimal",
    "corporate",
    "creative",
    "photo-pro",
  ]);

  const normalizeTemplates = (templates: string[]) =>
    templates.filter((template): template is ResumeTemplateId =>
      ["modern", "minimal", "corporate", "creative", "photo-pro"].includes(template)
    );
  const normalizeCustomization = (input?: ResumeCustomization): ResumeCustomization => {
    const base = input ?? DEFAULT_CUSTOMIZATION;
    const order =
      Array.isArray(base.sectionOrder) && base.sectionOrder.length > 0
        ? base.sectionOrder
        : DEFAULT_CUSTOMIZATION.sectionOrder;
    const normalizedOrder = Array.from(
      new Set([...order, ...DEFAULT_CUSTOMIZATION.sectionOrder])
    );
    const hidden = Array.isArray(base.hiddenSections)
      ? base.hiddenSections.filter((section) => normalizedOrder.includes(section))
      : [];
    return {
      ...DEFAULT_CUSTOMIZATION,
      ...base,
      sectionOrder: normalizedOrder,
      hiddenSections: hidden,
    };
  };
  const [skillsText, setSkillsText] = useState("");
  const [certificationsText, setCertificationsText] = useState("");
  const [experienceText, setExperienceText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [improvePendingDone, setImprovePendingDone] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingProgress, setTypingProgress] = useState(0);
  const [typingTarget, setTypingTarget] = useState<AIResumeDocument | null>(null);
  const [pageError, setPageError] = useState("");
  const [customization, setCustomization] =
    useState<ResumeCustomization>(DEFAULT_CUSTOMIZATION);
  const [dragFromSection, setDragFromSection] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const autoTypeTriggered = useRef(false);
  const autoScrollTriggered = useRef(false);
  const startAutoScroll = (target: HTMLElement | null) => {
    if (!target || typeof window === "undefined") return () => {};
    const rect = target.getBoundingClientRect();
    const startY = window.scrollY;
    const topY = rect.top + window.scrollY - 16;
    const bottomY = rect.bottom + window.scrollY - window.innerHeight + 16;
    const endY = Math.max(topY, bottomY);
    if (endY <= startY + 4) return () => {};
    const duration = Math.min(2000, Math.max(900, rect.height * 0.6));
    let rafId = 0;
    let stopped = false;
    const easeInOut = (t: number) =>
      t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const startTime = performance.now();
    const tick = (now: number) => {
      if (stopped) return;
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = easeInOut(progress);
      window.scrollTo({ top: startY + (endY - startY) * eased, behavior: "auto" });
      if (progress < 1) {
        rafId = window.requestAnimationFrame(tick);
      }
    };
    rafId = window.requestAnimationFrame(tick);
    return () => {
      stopped = true;
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  };
  const hasExperienceContent = useMemo(
    () =>
      resume.experience.some((item) => {
        const role = typeof item.role === "string" ? item.role.trim() : "";
        const company = typeof item.company === "string" ? item.company.trim() : "";
        const bullets = Array.isArray(item.bullets)
          ? item.bullets.filter((b) => typeof b === "string" && b.trim())
          : [];
        return Boolean(role || company || bullets.length);
      }),
    [resume.experience]
  );

  const updateHeaderLink = (index: number, value: string) => {
    setResume((prev) => {
      const links = Array.isArray(prev.header.links) ? [...prev.header.links] : [];
      links[index] = value;
      return { ...prev, header: { ...prev.header, links } };
    });
  };

  const handleAddExperience = () => {
    setResume((prev) => ({
      ...prev,
      experience: [...prev.experience, emptyExperienceItem()],
    }));
  };

  const handleRemoveExperience = (index: number) => {
    setResume((prev) => ({
      ...prev,
      experience: prev.experience.filter((_, idx) => idx !== index),
    }));
  };

  const handleAddProject = () => {
    setResume((prev) => ({
      ...prev,
      projects: [...prev.projects, emptyProjectItem()],
    }));
  };

  const handleRemoveProject = (index: number) => {
    setResume((prev) => ({
      ...prev,
      projects: prev.projects.filter((_, idx) => idx !== index),
    }));
  };

  const handlePhotoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile photo must be 5MB or smaller.");
      return;
    }

    try {
      setPageError("");
      const dataUrl = await fileToDataUrl(file);
      setCustomization((prev) => ({ ...prev, photoDataUrl: dataUrl }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to upload profile photo";
      setPageError(message);
    }
  };

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
      const shouldAutoType = searchParams.get("typing") === "1";
      if (shouldAutoType && !autoTypeTriggered.current) {
        const initialCustomization = normalizeCustomization(
          parsed.improvedResume.customization
        );
        const visibleSections = initialCustomization.sectionOrder.filter(
          (section) => !initialCustomization.hiddenSections.includes(section)
        );
        const autoPreview = buildPreviewData(
          parsed.improvedResume,
          visibleSections,
          parsed.improvedResume.skills || []
        );
        setTypingTarget(autoPreview);
        setTypingProgress(0);
        setIsTyping(true);
        autoTypeTriggered.current = true;
      }
      setResume(parsed.improvedResume);
      setSelectedTemplate(parsed.improvedResume.selectedTemplate || "modern");
      const loadedTemplates = parsed.improvedResume.availableTemplates?.length
        ? parsed.improvedResume.availableTemplates
        : ["modern", "minimal", "corporate", "creative", "photo-pro"];
      const normalizedTemplates = normalizeTemplates(
        Array.from(new Set([...loadedTemplates, "photo-pro"]))
      );
      setAvailableTemplates(normalizedTemplates);
      setCustomization(normalizeCustomization(parsed.improvedResume.customization));
      setSkillsText(toLineText(parsed.improvedResume.skills || []));
      setExperienceText(toExperienceText(parsed.improvedResume.experience || []));
      setCertificationsText(toLineText(parsed.improvedResume.certifications || []));
    };

    loadResume();
  }, [id, kv, searchParams]);

  const previewSkills = useMemo(() => resume.skills.filter(Boolean), [resume.skills]);
  const visibleSectionOrder = useMemo(() => {
    const effectiveHidden = customization.hiddenSections.filter(
      (section) => !(section === "experience" && hasExperienceContent)
    );
    return customization.sectionOrder.filter(
      (section) => !effectiveHidden.includes(section)
    );
  }, [customization.sectionOrder, customization.hiddenSections, hasExperienceContent]);
  const buildPreviewData = (
    source: ImprovedResume,
    visibleSections: string[],
    skills: string[]
  ): AIResumeDocument => ({
    header: {
      name: source.header.fullName,
      title: source.header.title,
      email: source.header.email,
      phone: source.header.phone,
      location: source.header.location,
      linkedin: source.header.links?.[0] || "",
      portfolio: source.header.links?.[1] || "",
    },
    summary: visibleSections.includes("summary") ? source.summary : "",
    experience: visibleSections.includes("experience")
      ? source.experience.map((item) => ({
          title: item.role,
          company: item.company,
          duration: item.duration,
          bullets: item.bullets,
        }))
      : [],
    projects: visibleSections.includes("projects")
      ? source.projects.map((item) => ({
          title: item.name,
          description: item.bullets?.[0] || "",
          technologies: item.techStack || [],
          bullets: item.bullets || [],
        }))
      : [],
    skills: visibleSections.includes("skills") ? skills : [],
    education: visibleSections.includes("education")
      ? source.education
          ? source.education
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => ({ details: line }))
          : []
      : [],
    certifications: visibleSections.includes("certifications")
      ? source.certifications || []
      : [],
    keywordsUsed: [],
    estimatedATSScore: source.improvedScoreEstimate || 0,
  });

  const previewData = useMemo<AIResumeDocument>(
    () => buildPreviewData(resume, visibleSectionOrder, previewSkills),
    [resume, previewSkills, visibleSectionOrder]
  );

  const typedPreviewData = useMemo(
    () =>
      typingTarget ? buildTypedResumeData(typingTarget, typingProgress) : previewData,
    [typingTarget, typingProgress, previewData]
  );

  useEffect(() => {
    if (!isTyping || !typingTarget) return;
    const total = getTypingTotalLength(typingTarget);
    if (total === 0) {
      setIsTyping(false);
      return;
    }
    const interval = window.setInterval(() => {
      setTypingProgress((prev) => Math.min(prev + 3, total));
    }, 20);
    return () => window.clearInterval(interval);
  }, [isTyping, typingTarget]);

  useEffect(() => {
    if (!isTyping || !typingTarget) return;
    const total = getTypingTotalLength(typingTarget);
    if (typingProgress >= total) {
      const timeout = window.setTimeout(() => setIsTyping(false), 300);
      return () => window.clearTimeout(timeout);
    }
  }, [isTyping, typingProgress, typingTarget]);

  // Keep internal preview container scrolled to bottom during typing (like ChatGPT)
  useEffect(() => {
    if (!isTyping) return;
    if (!previewScrollRef.current) return;
    
    let animationId: number;
    const scrollLoop = () => {
      if (previewScrollRef.current) {
        previewScrollRef.current.scrollTop = previewScrollRef.current.scrollHeight;
      }
      animationId = window.requestAnimationFrame(scrollLoop);
    };
    
    animationId = window.requestAnimationFrame(scrollLoop);
    return () => window.cancelAnimationFrame(animationId);
  }, [isTyping]);

  // Keep main window scrolled to preview while typing (like ChatGPT viewport following)
  useEffect(() => {
    if (!isTyping) return;
    if (!previewRef.current) return;
    
    let animationId: number;
    const scrollWindowLoop = () => {
      const rect = previewRef.current?.getBoundingClientRect();
      if (!rect) {
        animationId = window.requestAnimationFrame(scrollWindowLoop);
        return;
      }
      
      // Keep preview visible - if it's scrolled out of view, bring it back
      if (rect.bottom > window.innerHeight) {
        window.scrollBy({ top: rect.bottom - window.innerHeight + 50, behavior: "auto" });
      }
      
      animationId = window.requestAnimationFrame(scrollWindowLoop);
    };
    
    animationId = window.requestAnimationFrame(scrollWindowLoop);
    return () => window.cancelAnimationFrame(animationId);
  }, [isTyping]);

  useEffect(() => {
    if (!improvePendingDone) return;
    if (isTyping) return;
    setIsImproving(false);
    setImprovePendingDone(false);
    autoScrollTriggered.current = false;
  }, [improvePendingDone, isTyping]);

  const toggleSection = (section: string) => {
    setCustomization((prev) => {
      const hidden = prev.hiddenSections.includes(section)
        ? prev.hiddenSections.filter((item) => item !== section)
        : [...prev.hiddenSections, section];
      return { ...prev, hiddenSections: hidden };
    });
  };

  const onDropSection = (targetSection: string) => {
    if (!dragFromSection || dragFromSection === targetSection) return;
    setCustomization((prev) => {
      const from = prev.sectionOrder.indexOf(dragFromSection);
      const to = prev.sectionOrder.indexOf(targetSection);
      if (from < 0 || to < 0) return prev;
      return { ...prev, sectionOrder: reorder(prev.sectionOrder, from, to) };
    });
    setDragFromSection(null);
  };

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
    if (!id) {
      toast.error("Resume not found. Build or load a resume first.");
      return;
    }
    if (!auth.user) {
      toast.error("Please sign in to save changes.");
      return;
    }
    const hasExperience = resume.experience.some(
      (item) =>
        item.role.trim() ||
        item.company.trim() ||
        item.duration.trim() ||
        item.location.trim() ||
        item.bullets.length > 0
    );
    const hasProjects = resume.projects.some(
      (item) =>
        item.name.trim() ||
        item.link.trim() ||
        item.techStack.length > 0 ||
        item.bullets.length > 0
    );
    if (!resume.header.fullName.trim()) {
      toast.error("Full name can't be empty.");
      return;
    }
    if (!resume.header.email.trim()) {
      toast.error("Email can't be empty.");
      return;
    }
    if (!hasExperience && !hasProjects) {
      toast.error("Add at least one experience or project before saving.");
      return;
    }
    setIsSaving(true);
    try {
      const raw = await kv.get(`resume:${id}`);
      if (!raw) throw new Error("Resume record not found");
      const parsed = JSON.parse(raw) as Resume;
      const userId = getUserId(auth.user);
      const now = new Date().toISOString();
      parsed.improvedResume = {
        ...resume,
        selectedTemplate,
        availableTemplates,
        customization,
      };
      if (!parsed.id) {
        parsed.id = id;
      }
      if (userId && !(parsed as any).userId) {
        (parsed as any).userId = userId;
      }
      if (!(parsed as any).createdAt) {
        (parsed as any).createdAt = now;
      }
      (parsed as any).updatedAt = now;
      const saved = await kv.set(`resume:${id}`, JSON.stringify(parsed));
      if (!saved) {
        throw new Error("Failed to save resume");
      }
      toast.success("Resume saved.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Save failed";
      setPageError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const collectSuggestions = (analysis: Record<string, unknown>, feedback: Feedback | null) => {
    if (Array.isArray(analysis.suggestions)) {
      return analysis.suggestions;
    }

    if (!feedback) {
      return [];
    }

    const sections = ["ATS", "toneAndStyle", "content", "structure", "skills"] as const;
    const suggestions: string[] = [];

    sections.forEach((section) => {
      const sectionData = feedback[section];
      if (!sectionData || !Array.isArray(sectionData.tips)) return;
      sectionData.tips.forEach((tip) => {
        if (tip.type !== "improve") return;
        const explanation =
          "explanation" in tip && typeof tip.explanation === "string"
            ? tip.explanation
            : "";
        const line = explanation ? `${tip.tip}: ${explanation}` : tip.tip;
        if (line) suggestions.push(line);
      });
    });

    return suggestions;
  };

  const handleImproveWithAi = async () => {
    let scheduledTyping = false;
    if (!id) return;
    if (!resume.header.fullName.trim()) {
      toast.error("Full name can't be empty.");
      return;
    }
    if (!resume.header.email.trim()) {
      toast.error("Email can't be empty.");
      return;
    }
    setIsTyping(false);
    setTypingProgress(0);
    setTypingTarget(null);
    setImprovePendingDone(false);
    setIsImproving(true);
    setPageError("");

    try {
      const raw = await kv.get(`resume:${id}`);
      if (!raw) {
        throw new Error("Resume record not found");
      }

      const parsed = JSON.parse(raw) as Resume;
      if (!parsed.originalResume || typeof parsed.originalResume !== "object") {
        throw new Error("Original candidate resume data is missing");
      }

      let parsedText =
        typeof (parsed.originalResume as Record<string, unknown>).parsedText === "string"
          ? String((parsed.originalResume as Record<string, unknown>).parsedText)
          : "";

      if (!parsedText && typeof parsed.resumePath === "string" && parsed.resumePath) {
        try {
          const resumeBlob = await fs.read(parsed.resumePath);
          if (resumeBlob) {
            parsedText = await extractTextFromPdfFile(resumeBlob);
          }
        } catch {
          // Continue without parsed text; backend fallback and previous versions still apply.
        }
      }

      const analysis =
        parsed.analysis && typeof parsed.analysis === "object"
          ? (parsed.analysis as Record<string, unknown>)
          : {};

      const feedback = parsed.feedback || null;
      const suggestions = collectSuggestions(analysis, feedback);
      const analysisPayload =
        Object.keys(analysis).length > 0 || suggestions.length > 0
          ? { ...analysis, suggestions }
          : null;

      if (!analysisPayload) {
        throw new Error("Resume review feedback is missing. Re-run analysis and try again.");
      }

      const sourceFromBuilder = {
        header: resume.header,
        summary: resume.summary,
        experience: resume.experience,
        projects: resume.projects,
        skills: resume.skills,
        education: resume.education,
      };

      const result = await improveResumeApi({
        resumeId: id,
        originalResume: {
          ...(parsed.originalResume || {}),
          parsedText,
          sourceFromBuilder,
        },
        analysis: analysisPayload,
        improvedResume: parsed.improvedResume,
        versionHistory: parsed.versionHistory,
      });

      const fallbackExperience = hasNonEmptyExperience(result.improvedResume?.experience || [])
        ? result.improvedResume.experience
        : hasNonEmptyExperience(resume.experience)
        ? resume.experience
        : parsed.improvedResume?.experience || [];

      const nextImprovedResume: ImprovedResume = {
        ...result.improvedResume,
        experience: fallbackExperience,
        selectedTemplate,
        availableTemplates,
        customization: normalizeCustomization(customization),
      };

      const nextPreview = buildPreviewData(
        nextImprovedResume,
        visibleSectionOrder,
        nextImprovedResume.skills || []
      );
      setTypingTarget(nextPreview);
      setTypingProgress(0);
      setIsTyping(true);
      setImprovePendingDone(true);
      scheduledTyping = true;

      setResume(nextImprovedResume);
      setSkillsText(toLineText(nextImprovedResume.skills || []));
      setExperienceText(toExperienceText(nextImprovedResume.experience || []));
      setCertificationsText(toLineText(nextImprovedResume.certifications || []));

      parsed.improvedResume = nextImprovedResume;
      parsed.originalResume = {
        ...(parsed.originalResume || {}),
        parsedText,
      };
      parsed.versionHistory = result.versionHistory;
      await kv.set(`resume:${id}`, JSON.stringify(parsed));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to improve resume with AI";
      setPageError(message);
      setIsImproving(false);
      setImprovePendingDone(false);
    } finally {
      if (!scheduledTyping) {
        setIsImproving(false);
      }
    }
  };

  const handleDownloadPdf = async () => {
    if (!resume.header.fullName.trim()) {
      toast.error("Full name can't be empty.");
      return;
    }
    if (!resume.header.email.trim()) {
      toast.error("Email can't be empty.");
      return;
    }
    if (!previewRef.current) return;
    setIsDownloading(true);
    setPageError("");
    try {
      const sourceNode = previewRef.current;
      const exportWidth = 794;
      const a4HeightPx = Math.round(exportWidth * (297 / 210));
      const resumeContentNode = sourceNode.firstElementChild as HTMLElement | null;
      const contentHeight = Math.max(
        sourceNode.scrollHeight,
        sourceNode.clientHeight,
        a4HeightPx
      );
      const fitScale = Math.min(1, a4HeightPx / contentHeight);
      const baseScale = 1;

      const module = await import("html2pdf.js");
      const html2pdf = (module.default ?? module) as any;
      await html2pdf()
        .set({
          margin: [0, 0, 0, 0],
          filename: `${resume.header.fullName || "improved-resume"}.pdf`,
          image: { type: "png", quality: 1 },
          html2canvas: {
            scale: 3,
            useCORS: true,
            width: exportWidth,
            windowWidth: exportWidth,
            height: a4HeightPx,
            windowHeight: Math.max(contentHeight, a4HeightPx),
            scrollX: 0,
            scrollY: 0,
            x: 0,
            y: 0,
            onclone: (doc: Document) => {
              const clonedRoot = doc.querySelector(
                "[data-export-root='resume-preview']"
              ) as HTMLElement | null;
              if (!clonedRoot) return;
              clonedRoot.style.display = "block";
              clonedRoot.style.boxSizing = "border-box";
              clonedRoot.style.margin = "0 auto";
              clonedRoot.style.padding = "0";
              const clonedContent = clonedRoot.firstElementChild as HTMLElement | null;
              if (clonedContent) {
                const pageMargin = 24;
                clonedContent.style.width = `${exportWidth}px`;
                clonedContent.style.minWidth = `${exportWidth}px`;
                clonedContent.style.maxWidth = `${exportWidth}px`;
                clonedContent.style.margin = "0 auto";
                clonedContent.style.boxSizing = "border-box";
                clonedContent.style.paddingLeft = `${pageMargin}px`;
                clonedContent.style.paddingRight = `${pageMargin}px`;
                clonedContent.style.paddingTop = `${Math.round(pageMargin * 0.75)}px`;
                clonedContent.style.paddingBottom = `${Math.round(pageMargin * 0.75)}px`;
                clonedContent.style.position = "relative";
                clonedContent.style.left = "auto";
                clonedContent.style.right = "auto";
              }
              const view = doc.defaultView;
              const nodes = [
                clonedRoot,
                ...Array.from(clonedRoot.querySelectorAll("*")),
              ] as HTMLElement[];
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
          jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["avoid-all", "css", "legacy"] },
        })
        .from(previewRef.current)
        .save();

      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      let message = error instanceof Error ? error.message : "PDF generation failed";
      if (message.includes("unsupported color function") && message.includes("oklch")) {
        message =
          "PDF export failed due to an unsupported CSS color format. Refresh and try again.";
      }
      setPageError(message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <main className="bg-[linear-gradient(145deg,#f8fafc_0%,#eef2ff_42%,#fef9c3_100%)] min-h-screen p-4 sm:p-8">
      <div className="max-w-350 mx-auto flex flex-col gap-4">
        <nav className="resume-nav bg-white rounded-xl">
          <Link
            to={searchParams.get("from") === "home" ? "/" : `/resume/${id}`}
            className="back-button bg-blue-600 hover:bg-blue-700"
          >
            <img src="/icons/back.svg" alt="back" className="w-2.5 h-2.5" />
            <span className="text-white text-sm font-semibold">
              {searchParams.get("from") === "home" ? "Back to Home" : "Back to Resume Review"}
            </span>
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

            <h3 className="font-semibold text-black">Customization</h3>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm text-gray-700">
                Theme Color
                <input
                  type="color"
                  value={customization.themeColor}
                  onChange={(e) =>
                    setCustomization((prev) => ({ ...prev, themeColor: e.target.value }))
                  }
                  className="h-10 p-1"
                />
              </label>
              <label className="text-sm text-gray-700">
                Font
                <select
                  value={customization.fontFamily}
                  onChange={(e) =>
                    setCustomization((prev) => ({ ...prev, fontFamily: e.target.value }))
                  }
                >
                  <option>Inter</option>
                  <option>Georgia</option>
                  <option>Arial</option>
                  <option>Times New Roman</option>
                </select>
              </label>
            </div>

            <label className="text-sm text-gray-700">
              Spacing
              <select
                value={customization.spacing}
                onChange={(e) =>
                  setCustomization((prev) => ({
                    ...prev,
                    spacing: e.target.value as ResumeCustomization["spacing"],
                  }))
                }
              >
                <option value="compact">Compact</option>
                <option value="normal">Normal</option>
                <option value="relaxed">Relaxed</option>
              </select>
            </label>

            {selectedTemplate === "photo-pro" && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-black">Profile Photo</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="h-auto p-3"
                />
                {customization.photoDataUrl && (
                  <div className="flex items-center gap-3">
                    <img
                      src={customization.photoDataUrl}
                      alt="Profile preview"
                      className="h-14 w-14 rounded-full object-cover border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setCustomization((prev) => ({ ...prev, photoDataUrl: "" }))
                      }
                      className="text-xs underline"
                    >
                      Remove photo
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-semibold text-black">Section Order & Visibility</p>
              {customization.sectionOrder.map((section, index) => (
                <div
                  key={section}
                  draggable
                  onDragStart={() => setDragFromSection(section)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDropSection(section)}
                  className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2"
                >
                  <span className="text-sm">{index + 1}. {section}</span>
                  <button type="button" onClick={() => toggleSection(section)} className="text-xs underline">
                    {customization.hiddenSections.includes(section) ? "Show" : "Hide"}
                  </button>
                </div>
              ))}
            </div>

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
              <input
                value={resume.header.links?.[0] || ""}
                onChange={(e) => updateHeaderLink(0, e.target.value)}
                placeholder="LinkedIn"
              />
              <input
                value={resume.header.links?.[1] || ""}
                onChange={(e) => updateHeaderLink(1, e.target.value)}
                placeholder="Portfolio Website"
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
              value={certificationsText}
              onChange={(e) => {
                const value = e.target.value;
                setCertificationsText(value);
                setResume((prev) => ({ ...prev, certifications: fromLineText(value) }));
              }}
              placeholder="Certifications (one per line)"
            />
            <textarea
              rows={8}
              value={experienceText}
              onChange={(e) => {
                const value = e.target.value;
                setExperienceText(value);
                setResume((prev) => ({ ...prev, experience: fromExperienceText(value) }));
              }}
              placeholder="Experience (one block per role: Role | Company | Duration | Location, then bullet lines prefixed with -)"
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
                <button
                  type="button"
                  className="text-xs underline text-left w-fit"
                  onClick={() => handleRemoveExperience(index)}
                >
                  Remove Experience
                </button>
              </div>
            ))}

            <button type="button" className="primary-button w-fit px-6" onClick={handleAddExperience}>
              Add Experience
            </button>

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
                <button
                  type="button"
                  className="text-xs underline text-left w-fit"
                  onClick={() => handleRemoveProject(index)}
                >
                  Remove Project
                </button>
              </div>
            ))}

            <button type="button" className="primary-button w-fit px-6" onClick={handleAddProject}>
              Add Project
            </button>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className={isImproving ? "primary-button w-fit px-6 animate-pulse" : "primary-button w-fit px-6"}
                onClick={handleImproveWithAi}
                disabled={isImproving}
              >
                {isImproving ? "Improving with AI..." : "Improve with AI (ATS-friendly)"}
              </button>
              <button type="button" className={isSaving ? "primary-button w-fit px-6 animate-pulse" : "primary-button w-fit px-6"} onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                className={isDownloading ? "primary-button w-fit px-6 animate-pulse" : "primary-button w-fit px-6"}
                onClick={handleDownloadPdf}
                disabled={isDownloading}
              >
                {isDownloading ? "Generating PDF..." : "Download as PDF"}
              </button>
            </div>
          </div>

          <div
            ref={previewScrollRef}
            className="bg-white rounded-2xl shadow-sm p-3 sm:p-8 overflow-auto h-fit max-h-screen"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="relative min-h-fit">
              {isImproving && !isTyping && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm rounded-xl">
                  <div className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                    <span>Improving resume</span>
                    <span className="typing-dots" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </span>
                  </div>
                </div>
              )}
              <div
                ref={previewRef}
                data-export-root="resume-preview"
                style={exportSafeColorVars}
                className="mx-auto bg-white text-black max-w-148.75 w-full"
              >
                <ResumeRenderer
                  selectedTemplate={selectedTemplate}
                  data={isTyping ? typedPreviewData : previewData}
                  customization={customization}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
