import {Link} from "react-router";
import ScoreCircle from "~/components/ScoreCircle";
import {useEffect, useState} from "react";
import {usePuterStore} from "~/lib/puter";

type ResumeCardData = {
    id: string;
    companyName?: string;
    jobTitle?: string;
    feedback?: { overallScore?: number };
    showScore?: boolean;
    imagePath?: string;
    linkTo?: string;
    aiPreview?: {
        name?: string;
        summary?: string;
        skills?: string[];
    };
};

const ResumeCard = ({ resume }: { resume: ResumeCardData }) => {
    const { id, companyName, jobTitle, feedback, showScore = true, imagePath, linkTo, aiPreview } = resume;
    const { fs } = usePuterStore();
    const [resumeUrl, setResumeUrl] = useState('');
    const overallScore = typeof feedback?.overallScore === "number" ? feedback.overallScore : 0;

    useEffect(() => {
        if (!imagePath) return;
        const loadResume = async () => {
            const blob = await fs.read(imagePath);
            if(!blob) return;
            const url = URL.createObjectURL(blob);
            setResumeUrl(url);
        }

        loadResume();
    }, [imagePath]);

    return (
        <Link to={linkTo || `/resume/${id}`} className="resume-card animate-in fade-in duration-1000 hover:shadow-[0_0_20px_rgba(0,255,0,1)] hover:-translate-y-5 hover:bg-blue-600 group">
            <div className="resume-card-header">
                <div className="flex flex-col gap-2">
                    {companyName && <h2 className="text-black! font-bold wrap-break-word group-hover:text-white!">{companyName}</h2>}
                    {jobTitle && <h3 className="text-lg wrap-break-word text-gray-500 group-hover:text-white!">{jobTitle}</h3>}
                    {!companyName && !jobTitle && <h2 className="text-black! font-bold group-hover:text-white!">Resume</h2>}
                </div>
                {showScore && (
                    <div className="shrink-0">
                        <ScoreCircle score={overallScore} />
                    </div>
                )}
            </div>
            {resumeUrl && (
                <div className="gradient-border animate-in fade-in duration-1000">
                    <div className="w-full h-full">
                        <img
                            src={resumeUrl}
                            alt="resume"
                            className="w-full h-87.5 max-sm:h-50 object-cover object-top"
                        />
                    </div>
                </div>
            )}
            {!resumeUrl && aiPreview && (
                <div className="gradient-border animate-in fade-in duration-1000">
                    <div className="bg-white rounded-xl p-4 h-87.5 max-sm:h-50 overflow-hidden border border-gray-100">
                        <p className="text-sm font-bold text-black">{aiPreview.name || "AI Resume"}</p>
                        {aiPreview.summary && (
                            <p className="text-xs text-gray-600 mt-2 line-clamp-5">{aiPreview.summary}</p>
                        )}
                        {Array.isArray(aiPreview.skills) && aiPreview.skills.length > 0 && (
                            <p className="text-xs text-gray-700 mt-3 line-clamp-4">
                                {aiPreview.skills.slice(0, 12).join(" | ")}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </Link>
    )
}
export default ResumeCard
