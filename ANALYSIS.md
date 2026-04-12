# Resume Builder - Download & View State Analysis

## Overview
The Resume Builder application has two main builder routes: `ai-resume-builder.tsx` and `resume-builder.tsx`. Both implement similar download functionality with view state management for PDF export.

---

## 1. Download Functionality Implementation

### Location & Files
- **AI Resume Builder**: [app/routes/ai-resume-builder.tsx](app/routes/ai-resume-builder.tsx#L698-L883)
- **Resume Builder**: [app/routes/resume-builder.tsx](app/routes/resume-builder.tsx#L776-L982)

### Function: `handleDownload` / `handleDownloadPdf`

#### Entry Point
```typescript
// ai-resume-builder.tsx, line 698
const handleDownload = async () => {
  if (!resumeId) {
    toast.error("Create a resume before downloading.");
    return;
  }
  if (!previewRef.current) return;
  setIsDownloading(true);
  setError("");
  // ... PDF generation logic
}
```

#### Download Process Flow
1. **Validation**: Check if resume exists (AI) or required fields filled (Resume Builder)
2. **Set Loading State**: `setIsDownloading(true)` - triggers UI feedback
3. **Auto-Scroll**: Initiates scroll to the preview section
4. **Style Capture**: Save all existing inline styles from preview ref
5. **Dynamic Styling**: Apply export-optimized styles to preview element
6. **PDF Generation**: Use html2pdf library to convert DOM to PDF
7. **Style Restoration**: Restore all previous styles from capture
8. **State Reset**: `setIsDownloading(false)` after 1 second delay

#### Key Parameters

**Export Dimensions (A4 Standard)**:
```typescript
const exportWidth = 794;  // A4 width in pixels
const a4HeightPx = Math.round(exportWidth * (297 / 210));  // ~1123px
```

**Page Margins**:
```typescript
const pageMargin = 24;  // 24px margins on left/right
const topBottomMargin = Math.round(pageMargin * 0.75);  // 18px top/bottom
```

**Scale Calculation**:
```typescript
const contentHeight = Math.max(
  sourceNode.scrollHeight,
  sourceNode.clientHeight,
  a4HeightPx
);
const fitScale = Math.min(1, a4HeightPx / contentHeight);
// Scales down content if it exceeds A4 height
```

---

## 2. Preview Section View Modification

### Dynamic Style Application During Download

#### Container Styles Applied to `previewRef` (`sourceNode`)
```typescript
sourceNode.style.width = "100%";
sourceNode.style.maxWidth = "100%";
sourceNode.style.margin = "0";
sourceNode.style.padding = "0";
sourceNode.style.backgroundColor = "#ffffff";
sourceNode.style.boxSizing = "border-box";
sourceNode.style.minHeight = `${a4HeightPx}px`;  // Force A4 height
sourceNode.style.display = "flex";
sourceNode.style.flexDirection = "column";
sourceNode.style.justifyContent = "flex-start";
sourceNode.style.alignItems = "stretch";
```

#### Content Styles Applied to Child Element
```typescript
resumeContentNode.style.width = `${exportWidth}px`;         // 794px
resumeContentNode.style.maxWidth = `${exportWidth}px`;
resumeContentNode.style.margin = "0 auto";                  // Center
resumeContentNode.style.boxSizing = "border-box";
resumeContentNode.style.paddingLeft = `${pageMargin}px`;    // 24px
resumeContentNode.style.paddingRight = `${pageMargin}px`;   // 24px
resumeContentNode.style.paddingTop = `${topBottomMargin}px`;    // 18px
resumeContentNode.style.paddingBottom = `${topBottomMargin}px`; // 18px
resumeContentNode.style.position = "relative";
resumeContentNode.style.left = "0";
resumeContentNode.style.right = "0";
resumeContentNode.style.transform = "none";
resumeContentNode.style.transformOrigin = "top center";
resumeContentNode.style.fontSize = "";  // Clear inline size
```

#### Scale Transform
```typescript
const appliedScale = fitScale < 1 ? fitScale * baseScale : baseScale;
resumeContentNode.style.transform = `scale(${appliedScale.toFixed(3)})`;
// Example: scale(0.95) if content is slightly too tall
```

### HTML2PDF Configuration
```typescript
await html2pdf()
  .set({
    margin: [0, 0, 0, 0],                         // No additional margins
    filename: `${resumeData.header.name}.pdf`,    // Use resume name
    image: { type: "png", quality: 1 },
    html2canvas: {
      scale: 3,                    // 3x resolution for sharp text
      useCORS: true,
      backgroundColor: "#ffffff",
      width: exportWidth,          // 794px
      windowWidth: exportWidth,
      height: a4HeightPx,          // ~1123px
      windowHeight: Math.max(contentHeight, a4HeightPx),
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      onclone: (doc: Document) => {
        // Apply same styles to cloned DOM used for rendering
        const clonedRoot = doc.querySelector("[data-export-root='resume-preview']");
        // ... (same style application as above)
      }
    },
    jsPDF: { 
      unit: "pt",          // Points
      format: "a4",        // A4 paper size
      orientation: "portrait"
    },
    pagebreak: { 
      mode: ["avoid-all", "css", "legacy"]  // Prevent content splitting
    }
  })
  .from(sourceNode)
  .save();
```

### CSS Color Safety Override
```typescript
const exportSafeColorVars: CSSProperties = {
  // html2canvas doesn't support oklch() color functions (Tailwind v4 tokens)
  // Override tokens with hex colors only inside export subtree
  ["--color-white" as any]: "#ffffff",
  ["--color-black" as any]: "#000000",
  ["--color-gray-200" as any]: "#e5e7eb",
  ["--color-gray-300" as any]: "#d1d5db",
  ["--color-gray-600" as any]: "#4b5563",
  ["--color-gray-700" as any]: "#374151",
  backgroundColor: "#ffffff",
  color: "#000000",
};

// Applied to preview container: style={exportSafeColorVars}
```

### Style Restoration in Finally Block
```typescript
finally {
  stopAutoScroll();
  // Restore all original styles captured before download started
  sourceNode.style.width = previousStyles.width;
  sourceNode.style.maxWidth = previousStyles.maxWidth;
  sourceNode.style.margin = previousStyles.margin;
  // ... (all properties restored)
  
  if (resumeContentNode && previousContentStyles) {
    resumeContentNode.style.width = previousContentStyles.width;
    resumeContentNode.style.maxWidth = previousContentStyles.maxWidth;
    // ... (all properties restored)
  }
  
  setIsDownloading(false);
}
```

---

## 3. View State Changes During Download

### State Variables Involved
```typescript
const [isDownloading, setIsDownloading] = useState(false);        // Main download flag
const [isTyping, setIsTyping] = useState(false);                  // Typing animation state
const [typingProgress, setTypingProgress] = useState(0);          // Typing progress %
const [typingTarget, setTypingTarget] = useState<AIResumeDocument | null>(null); // Target data
```

### UI Feedback During Download

#### Button State Change
```typescript
// ai-resume-builder.tsx, line 1319-1320
<button
  type="button"
  className={isDownloading ? "primary-button w-fit px-6 animate-pulse" : "primary-button w-fit px-6"}
  onClick={handleDownload}
  disabled={isDownloading}
>
  {isDownloading ? "Generating PDF..." : "Download Resume"}
</button>
```

**Changes**:
- Text: "Download Resume" → "Generating PDF..."
- Style: Added `animate-pulse` class (CSS animation)
- Interaction: `disabled={true}` prevents multiple clicks

#### Text Styling
```css
/* Tailwind animate-pulse applies opacity animation */
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
```

### Timeline of State Changes

```
1. User clicks "Download Resume"
   ↓
2. isDownloading = true
   - Button state changes immediately
   - Button gets disabled
   - Button text becomes "Generating PDF..."
   - Button gets animate-pulse class
   ↓
3. DOM styles are captured and modified
   - Preview section styles are transformed for PDF rendering
   ↓
4. html2pdf processes the DOM
   - Takes ~500-1000ms depending on complexity
   ↓
5. await new Promise(resolve => setTimeout(resolve, 1000))
   - Waits 1 second to ensure browser processes download
   ↓
6. Finally block executes
   - All styles are restored to original values
   - setIsDownloading(false) called
   ↓
7. Button returns to original state
   - Text: "Generating PDF..." → "Download Resume"
   - animate-pulse class removed
   - disabled attribute removed
   - Button is clickable again
```

### No Preview Content Hiding
**Important**: The preview content is NOT hidden during download. It remains visible with:
- `data-export-root="resume-preview"` attribute for element targeting
- `exportSafeColorVars` inline styles to prevent CSS color function errors
- Original responsive styling remains visible to user

---

## 4. ResumeRenderer Component & View Modes

### Component Location
[app/components/ResumeRenderer.tsx](app/components/ResumeRenderer.tsx)

### Component Definition
```typescript
interface ResumeRendererProps {
  selectedTemplate: ResumeTemplateId;  // Template choice: "modern" | "minimal" | "corporate" | "creative" | "photo-pro"
  data: AIResumeDocument;              // Resume content data
  customization: ResumeCustomization;  // Styling options (spacing, colors, etc.)
}

export default function ResumeRenderer({
  selectedTemplate,
  data,
  customization,
}: ResumeRendererProps) {
  // Route to appropriate template based on selectedTemplate
}
```

### Template Routing Logic
```typescript
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

// Default to Modern
return <ModernTemplate data={data} customization={customization} />;
```

### Template Props Interface
```typescript
// app/components/templates/types.ts
interface TemplateProps {
  data: AIResumeDocument;
  customization: ResumeCustomization;
}

export const spacingClassMap = {
  compact: "space-y-3",
  normal: "space-y-5",
  relaxed: "space-y-7",
} as const;
```

### Data Flow to ResumeRenderer

#### In AI Resume Builder
```typescript
// Calculates visible sections based on customization
const visibleSectionOrder = useMemo(
  () =>
    customization.sectionOrder.filter(
      (section) => !customization.hiddenSections.includes(section)
    ),
  [customization.sectionOrder, customization.hiddenSections]
);

// Builds preview data with only visible sections
const buildPreviewData = (
  source: AIResumeDocument,
  visibleSections: string[]
): AIResumeDocument => ({
  ...source,
  experience: visibleSections.includes("experience") ? source.experience : [],
  projects: visibleSections.includes("projects") ? source.projects : [],
  skills: visibleSections.includes("skills") ? source.skills : [],
  education: visibleSections.includes("education") ? source.education : [],
  certifications: visibleSections.includes("certifications") ? source.certifications : [],
  summary: visibleSections.includes("summary") ? source.summary : "",
});

const previewData = useMemo(
  () => buildPreviewData(resumeData, visibleSectionOrder),
  [resumeData, visibleSectionOrder]
);

// Handle typing animation - gradually reveals content
const typedPreviewData = useMemo(
  () => typingTarget ? buildTypedResumeData(typingTarget, typingProgress) : previewData,
  [typingTarget, typingProgress, previewData]
);
```

#### Render Call
```typescript
// Passes appropriate data based on typing state
<ResumeRenderer
  selectedTemplate={selectedTemplate}
  data={isTyping ? typedPreviewData : previewData}  // Toggle between typed/full
  customization={customization}
/>
```

### View Modes Summary

| Mode | Data Used | Trigger | Purpose |
|------|-----------|---------|---------|
| **Normal Preview** | `previewData` | Default | Shows all visible sections |
| **Typing Animation** | `typedPreviewData` | After AI build | Gradual content reveal |
| **PDF Export** | Same data | Download button | Used for PDF rendering |
| **Hidden Sections** | Filtered in data | Customization | User-selected hidden sections |

---

## 5. Complete Download Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER CLICKS DOWNLOAD                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Validation     │
                    │  - Resume ID?   │
                    │  - Preview ref? │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ setIsDownloading│
                    │    (true)       │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │ UI State Changes:  │                    │
        │ • Button disabled  │                    │
        │ • Text → "Gen..." │                    │
        │ • animate-pulse   │                    │
        └────────────────────┘                    │
                             ▼
                    ┌─────────────────┐
                    │  Capture All    │
                    │  Original Styles│
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Apply Export   │
                    │  Optimized      │
                    │  Styles         │
                    └────────┬────────┘
                             │
                ┌────────────┼────────────┐
                │ Dimensions: A4 (794px)  │
                │ Margins: 24px           │
                │ Scale: fitScale         │
                │ Colors: Safe hex        │
                └────────────┼────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  html2pdf       │
                    │  Render Process │
                    │  (500-1000ms)   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Wait 1 second   │
                    │ for browser     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Restore ALL    │
                    │  Original Styles│
                    └────────┬────────┘
                             │
                ┌────────────┼────────────┐
                │ Reset state:            │
                │ setIsDownloading(false) │
                │ stopAutoScroll()        │
                └────────────┼────────────┘
                             │
                    ┌────────▼────────┐
                    │ UI Returns To   │
                    │ Normal State    │
                    │ • Button enabled│
                    │ • Text restored │
                    │ • animate-pulse │
                    │   removed       │
                    └─────────────────┘
```

---

## 6. Key Implementation Details

### Auto-Scroll During Download
```typescript
const startAutoScroll = (target: HTMLElement | null) => {
  // Scrolls download button/preview into view with easing animation
  // Returns cleanup function to stop scroll
  const easeInOut = (t: number) =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  
  // Animate scroll over 900-2000ms depending on distance
};
```

### Error Handling
```typescript
try {
  // PDF generation
  await html2pdf()...
} catch (err) {
  // Resume-builder specific error message for oklch color issue
  let message = err instanceof Error ? err.message : "PDF generation failed";
  if (message.includes("unsupported color function") && message.includes("oklch")) {
    message = "PDF export failed due to unsupported CSS color format...";
  }
  setError(message);
} finally {
  // Cleanup always happens
  stopAutoScroll();
  // Restore styles
  setIsDownloading(false);
}
```

### Difference: AI Resume Builder vs Resume Builder

| Aspect | AI Resume Builder | Resume Builder |
|--------|---|---|
| **Function Name** | `handleDownload` | `handleDownloadPdf` |
| **Validation** | Check `resumeId` | Check `fullName` & `email` |
| **Button Text** | "Download Resume" | "Download as PDF" |
| **Additional State** | `isBuilding` | `isImproving` |
| **Style Restoration** | Uses `previousStyles` object | Uses empty string "" for reset |
| **onclone callback** | Has filter removal logic | Same filter removal logic |

---

## Summary

**Download Flow**:
1. Set `isDownloading = true` → UI feedback starts
2. Capture current styles → Create export-optimized versions
3. Apply A4-compliant dimensions & styling to preview
4. Use html2pdf to render DOM to PDF with high quality
5. Restore all captured styles → UI returns to normal
6. Set `isDownloading = false` → Download button re-enabled

**View State Changes**:
- Button becomes disabled and pulsing during download
- Preview content remains visible but with modified styling
- No content is hidden from user view
- Typing animation state is independent of download state

**ResumeRenderer Role**:
- Routes to correct template component based on `selectedTemplate`
- Accepts `data` (may be typed/animated or full) and `customization`
- Templates control final visual presentation
- No direct involvement in download process
