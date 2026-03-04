import type {
  AIResumeDocument,
  ResumeCustomization,
} from "~/lib/resume-builder-types";

export interface TemplateProps {
  data: AIResumeDocument;
  customization: ResumeCustomization;
}

export const spacingClassMap = {
  compact: "space-y-3",
  normal: "space-y-5",
  relaxed: "space-y-7",
} as const;

