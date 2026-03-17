import { z } from "zod";
import { HttpError } from "../utils/httpError.js";
import { buildAIResume } from "../services/aiResumeBuilderService.js";

const buildAIInputSchema = z.object({
  userId: z.string().min(1),
  template: z.enum(["modern", "minimal", "corporate", "creative"]),
  targetRole: z.string().min(1).max(160),
  jobDescription: z.string().min(1).max(5000),
});

export async function buildAIResumeController(req, res, next) {
  try {
    const parsed = buildAIInputSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, "Invalid payload for /api/resume/build-ai");
    }

    const result = await buildAIResume(parsed.data);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

