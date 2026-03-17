import { improveResumeFromData } from "../services/resumeImproveService.js";

export async function improveResumeController(req, res, next) {
  try {
    const { resumeId, originalResume, analysis, improvedResume, versionHistory } =
      req.body;

    const result = await improveResumeFromData({
      resumeId,
      originalResume,
      analysis,
      improvedResume,
      versionHistory,
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
