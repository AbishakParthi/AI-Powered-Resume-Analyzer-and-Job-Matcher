export type ResumeTemplateId = "modern" | "minimal" | "corporate" | "creative" | "photo-pro";

export interface AIResumeHeader {
  name: string;
  title?: string;
  email: string;
  phone: string;
  location?: string;
  linkedin: string;
  portfolio?: string;
}

export interface AIResumeExperienceItem {
  title: string;
  company: string;
  duration: string;
  bullets: string[];
}

export interface AIResumeDocument {
  header: AIResumeHeader;
  summary: string;
  experience: AIResumeExperienceItem[];
  projects: Array<Record<string, unknown>>;
  skills: string[];
  education: Array<Record<string, unknown>>;
  certifications: string[];
  keywordsUsed: string[];
  estimatedATSScore: number;
}

export interface ResumeCustomization {
  themeColor: string;
  fontFamily: string;
  spacing: "compact" | "normal" | "relaxed";
  sectionOrder: string[];
  hiddenSections: string[];
  photoDataUrl?: string;
}

export interface ResumeRecord {
  resumeId: string;
  userId: string;
  selectedTemplate: ResumeTemplateId;
  aiGeneratedResume: AIResumeDocument;
  customization: ResumeCustomization;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateMeta {
  id: ResumeTemplateId;
  name: string;
  description: string;
}

export const TEMPLATE_LIBRARY: TemplateMeta[] = [
  { id: "modern", name: "Modern", description: "Balanced visual hierarchy" },
  { id: "minimal", name: "Minimal", description: "Simple ATS-safe layout" },
  { id: "corporate", name: "Corporate", description: "Traditional enterprise style" },
  { id: "creative", name: "Creative", description: "Distinct visual identity" },
  { id: "photo-pro", name: "Photo Pro", description: "Professional layout with profile photo" },
];

export const DEFAULT_AI_RESUME: AIResumeDocument = {
  header: { name: "", title: "", email: "", phone: "", location: "", linkedin: "", portfolio: "" },
  summary: "",
  experience: [],
  projects: [],
  skills: [],
  education: [],
  certifications: [],
  keywordsUsed: [],
  estimatedATSScore: 0,
};

export const DEFAULT_CUSTOMIZATION: ResumeCustomization = {
  themeColor: "#2563eb",
  fontFamily: "Inter",
  spacing: "normal",
  sectionOrder: [
    "summary",
    "experience",
    "projects",
    "skills",
    "education",
    "certifications",
  ],
  hiddenSections: [],
  photoDataUrl: "",
};
