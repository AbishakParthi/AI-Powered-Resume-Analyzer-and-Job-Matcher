import type {
  AIResumeDocument,
  ResumeCustomization,
  ResumeTemplateId,
} from "~/lib/resume-builder-types";
import ModernTemplate from "./templates/ModernTemplate";
import MinimalTemplate from "./templates/MinimalTemplate";
import CorporateTemplate from "./templates/CorporateTemplate";
import CreativeTemplate from "./templates/CreativeTemplate";
import PhotoProTemplate from "./templates/PhotoProTemplate";

interface ResumeRendererProps {
  selectedTemplate: ResumeTemplateId;
  data: AIResumeDocument;
  customization: ResumeCustomization;
}

export default function ResumeRenderer({
  selectedTemplate,
  data,
  customization,
}: ResumeRendererProps) {
  if (selectedTemplate === "minimal") {
    return <MinimalTemplate data={data} customization={customization} />;
  }

  if (selectedTemplate === "corporate") {
    return <CorporateTemplate data={data} customization={customization} />;
  }

  if (selectedTemplate === "creative") {
    return <CreativeTemplate data={data} customization={customization} />;
  }

  if (selectedTemplate === "photo-pro") {
    return <PhotoProTemplate data={data} customization={customization} />;
  }

  return <ModernTemplate data={data} customization={customization} />;
}
