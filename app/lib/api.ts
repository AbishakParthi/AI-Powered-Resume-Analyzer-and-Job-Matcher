interface ImproveResumeApiResponse {
  improvedResume: ImprovedResume;
  versionHistory: {
    improvedResume: ImprovedResume;
    createdAt: string;
  }[];
  versionHistoryCount: number;
}

export async function improveResume(payload: {
  resumeId: string;
  originalResume?: Record<string, unknown>;
  analysis?: Record<string, unknown>;
  improvedResume?: ImprovedResume;
  versionHistory?: {
    improvedResume: ImprovedResume;
    createdAt: string;
  }[];
}): Promise<ImproveResumeApiResponse> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

  const response = await fetch(`${baseUrl}/api/resume/improve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "Failed to improve resume";
    try {
      const data = await response.json();
      if (data?.message) {
        message = String(data.message);
      }
    } catch {
      // no-op
    }
    throw new Error(message);
  }

  return response.json() as Promise<ImproveResumeApiResponse>;
}
