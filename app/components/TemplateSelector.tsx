import { TEMPLATE_LIBRARY, type ResumeTemplateId } from "~/lib/resume-builder-types";

interface TemplateSelectorProps {
  selectedTemplate: ResumeTemplateId;
  onSelect: (template: ResumeTemplateId) => void;
  allowedTemplates?: ResumeTemplateId[];
}

export default function TemplateSelector({
  selectedTemplate,
  onSelect,
  allowedTemplates,
}: TemplateSelectorProps) {
  const visibleTemplates = allowedTemplates?.length
    ? TEMPLATE_LIBRARY.filter((template) => allowedTemplates.includes(template.id))
    : TEMPLATE_LIBRARY;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {visibleTemplates.map((template) => {
        const active = template.id === selectedTemplate;
        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template.id)}
            className={`rounded-xl border p-3 text-left transition ${
              active ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white"
            }`}
          >
            <p className="text-sm font-semibold text-black">{template.name}</p>
            <p className="text-xs text-gray-600 mt-1">{template.description}</p>
          </button>
        );
      })}
    </div>
  );
}
