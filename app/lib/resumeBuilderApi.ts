import type { ResumeRecord, ResumeTemplateId } from "./resume-builder-types";

export interface BuildAIResumeInput {
  userId: string;
  template: ResumeTemplateId;
  targetRole: string;
  jobDescription: string;
}

export async function buildAIResume(
  payload: BuildAIResumeInput
): Promise<ResumeRecord> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
  const response = await fetch(`${baseUrl}/api/resume/build-ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "Failed to build resume with AI";
    try {
      const data = await response.json();
      if (data?.message) message = String(data.message);
    } catch {
      // no-op
    }
    throw new Error(message);
  }

  return response.json() as Promise<ResumeRecord>;
}

