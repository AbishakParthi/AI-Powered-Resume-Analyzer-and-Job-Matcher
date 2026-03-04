import { z } from "zod";
import { HttpError } from "../utils/httpError.js";

export const improveResumeSchema = z.object({
  resumeId: z.string().trim().min(1, "resumeId is required"),
});

export function validateBody(schema) {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join(", ");
      return next(new HttpError(400, message));
    }

    req.validatedBody = parsed.data;
    next();
  };
}

