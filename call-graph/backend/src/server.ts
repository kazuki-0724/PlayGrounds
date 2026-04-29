import express from "express";
import cors from "cors";
import { z } from "zod";
import type { AnalyzeRequest } from "@call-graph/shared";
import { analyzeMarkdown } from "./analysis/analyzeMarkdown.js";

const analyzeRequestSchema = z.object({
  markdown: z.string().min(1)
});

export function createServer(): express.Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "10mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/analyze", (req, res) => {
    const parsed = analyzeRequestSchema.safeParse(req.body as AnalyzeRequest);
    if (!parsed.success) {
      res.status(400).json({
        error: "INVALID_REQUEST",
        message: "Request body must contain non-empty markdown"
      });
      return;
    }

    const result = analyzeMarkdown(parsed.data.markdown);
    res.json(result);
  });

  return app;
}
