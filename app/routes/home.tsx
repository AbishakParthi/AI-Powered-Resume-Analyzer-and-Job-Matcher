import type { Route } from "./+types/home";
import Navbar from "~/components/Navbar";
import ResumeCard from "~/components/ResumeCard";
import { usePuterStore } from "~/lib/puter";
import { Link, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { useHydrated } from "~/hooks/useHydrated";

type HomeResumeCard = {
  id: string;
  companyName?: string;
  jobTitle?: string;
  imagePath?: string;
  feedback?: { overallScore?: number };
  showScore?: boolean;
  linkTo?: string;
  aiPreview?: {
    name?: string;
    summary?: string;
    skills?: string[];
  };
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Resumind" },
    { name: "description", content: "Smart feedback for your dream job!" },
  ];
}

export default function Home() {
  const hydrated = useHydrated();
  const { auth, kv } = usePuterStore();
  const navigate = useNavigate();

  const [resumes, setResumes] = useState<HomeResumeCard[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(false);

  useEffect(() => {
    if (!hydrated) return;

    if (!auth.isAuthenticated) {
      navigate("/auth?next=/", { replace: true });
    }
  }, [hydrated, auth.isAuthenticated, navigate]);

  useEffect(() => {
    if (!hydrated || !auth.isAuthenticated) return;

    const loadResumes = async () => {
      setLoadingResumes(true);

      const items = (await kv.list("resume:*", true)) as KVItem[];

      const parsedResumes =
        items
          ?.map((item) => {
            const data = JSON.parse(item.value) as Record<string, unknown>;

            // AI resume builder records do not have imagePath; build a text preview.
            if (data.aiGeneratedResume && typeof data.aiGeneratedResume === "object") {
              const ai = data.aiGeneratedResume as Record<string, unknown>;
              const header = (ai.header || {}) as Record<string, unknown>;
              const skills = Array.isArray(ai.skills)
                ? ai.skills.map((skill) => String(skill))
                : [];
              const id = String(data.resumeId || data.id || "");

              return {
                id,
                companyName: "AI Resume",
                jobTitle: String(header.name || "Generated from AI Builder"),
                showScore: false,
                linkTo: `/ai-resume-builder?resumeId=${id}`,
                aiPreview: {
                  name: String(header.name || ""),
                  summary: String(ai.summary || ""),
                  skills,
                },
              } satisfies HomeResumeCard;
            }

            const legacyId = String(data.id || data.resumeId || "");
            return {
              id: legacyId,
              companyName: typeof data.companyName === "string" ? data.companyName : undefined,
              jobTitle: typeof data.jobTitle === "string" ? data.jobTitle : undefined,
              imagePath: typeof data.imagePath === "string" ? data.imagePath : undefined,
              feedback:
                data.feedback && typeof data.feedback === "object"
                  ? (data.feedback as { overallScore?: number })
                  : undefined,
              showScore: typeof (data.feedback as { overallScore?: unknown } | undefined)?.overallScore === "number",
              linkTo: `/resume/${legacyId}`,
            } satisfies HomeResumeCard;
          })
          .filter((item) => item.id) || [];

      setResumes(parsedResumes);
      setLoadingResumes(false);
    };

    loadResumes();
  }, [hydrated, auth.isAuthenticated, kv]);

  if (!hydrated) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
      <Navbar />

      <section className="main-section">
        <div className="page-heading py-16">
          <h1 className="text-gradient">Track Your Applications & Resume Ratings</h1>

          {!loadingResumes && resumes.length === 0 ? (
            <h2>No resumes found. Upload your first resume to get feedback.</h2>
          ) : (
            <h2>Review your submissions and check AI-powered feedback.</h2>
          )}
        </div>

        {loadingResumes && (
          <div className="flex flex-col items-center justify-center">
            <img src="/images/resume-scan-2.gif" className="w-[200px]" alt="Loading" />
          </div>
        )}

        {!loadingResumes && resumes.length > 0 && (
          <div className="resumes-section">
            {resumes.map((resume) => (
              <ResumeCard key={resume.id} resume={resume} />
            ))}
          </div>
        )}

        {!loadingResumes && resumes.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-10 gap-4">
            <Link to="/upload" className="primary-button w-fit text-xl font-semibold">
              Upload Resume
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
