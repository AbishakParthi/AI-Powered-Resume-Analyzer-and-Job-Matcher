import express from "express";
import {
  improveResumeController,
} from "../controllers/resumeController.js";
import { buildAIResumeController } from "../controllers/resumeBuilderController.js";

const router = express.Router();

router.post("/improve", improveResumeController);
router.post("/build-ai", buildAIResumeController);

export default router;
