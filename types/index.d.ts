interface Resume {
    id: string;
    companyName?: string;
    jobTitle?: string;
    imagePath: string;
    resumePath: string;
    feedback: Feedback;
    originalResume?: Record<string, unknown>;
    analysis?: Record<string, unknown>;
    improvedResume?: ImprovedResume;
    versionHistory?: {
        improvedResume: ImprovedResume;
        createdAt: string;
    }[];
}

interface Feedback {
    overallScore: number;
    ATS: {
        score: number;
        tips: {
            type: "good" | "improve";
            tip: string;
        }[];
    };
    toneAndStyle: {
        score: number;
        tips: {
            type: "good" | "improve";
            tip: string;
            explanation: string;
        }[];
    };
    content: {
        score: number;
        tips: {
            type: "good" | "improve";
            tip: string;
            explanation: string;
        }[];
    };
    structure: {
        score: number;
        tips: {
            type: "good" | "improve";
            tip: string;
            explanation: string;
        }[];
    };
    skills: {
        score: number;
        tips: {
            type: "good" | "improve";
            tip: string;
            explanation: string;
        }[];
    };
}

interface ImprovedResumeHeader {
    fullName: string;
    title: string;
    email: string;
    phone: string;
    location: string;
    links: string[];
}

interface ImprovedResumeExperienceItem {
    company: string;
    role: string;
    duration: string;
    location: string;
    bullets: string[];
}

interface ImprovedResumeProjectItem {
    name: string;
    techStack: string[];
    bullets: string[];
    link: string;
}

interface ImprovedResume {
    header: ImprovedResumeHeader;
    summary: string;
    experience: ImprovedResumeExperienceItem[];
    projects: ImprovedResumeProjectItem[];
    skills: string[];
    education: string;
    certifications: string[];
    improvedScoreEstimate: number;
    selectedTemplate?: "modern" | "minimal" | "corporate" | "creative" | "photo-pro";
    availableTemplates?: ("modern" | "minimal" | "corporate" | "creative" | "photo-pro")[];
    customization?: {
        themeColor: string;
        fontFamily: string;
        spacing: "compact" | "normal" | "relaxed";
        sectionOrder: string[];
        hiddenSections: string[];
        photoDataUrl?: string;
    };
    generatedAt?: string;
    model?: string;
}

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
