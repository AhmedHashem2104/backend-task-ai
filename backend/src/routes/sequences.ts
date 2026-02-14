import { Router, Request, Response, NextFunction } from "express";
import { db, schema } from "../db";
import { eq, desc, sql } from "drizzle-orm";
import { validate } from "../middleware/validate";
import { generateSequenceSchema } from "../types";
import { generateSequence, buildSequenceResponse } from "../services/sequence-generator";

export const sequencesRouter = Router();

/**
 * POST /api/sequences/generate
 * Main endpoint: generate a personalized messaging sequence
 */
sequencesRouter.post(
  "/generate",
  validate(generateSequenceSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await generateSequence(req.body);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/sequences
 * List all sequences with pagination
 */
sequencesRouter.get("/", (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const offset = (page - 1) * limit;

    const sequences = db
      .select({
        id: schema.messageSequences.id,
        status: schema.messageSequences.status,
        company_context: schema.messageSequences.company_context,
        sequence_length: schema.messageSequences.sequence_length,
        overall_confidence: schema.messageSequences.overall_confidence,
        created_at: schema.messageSequences.created_at,
        prospect_name: schema.prospects.full_name,
        prospect_headline: schema.prospects.headline,
        prospect_company: schema.prospects.current_company,
        prospect_url: schema.prospects.linkedin_url,
        tov_name: schema.tovConfigs.name,
      })
      .from(schema.messageSequences)
      .leftJoin(schema.prospects, eq(schema.messageSequences.prospect_id, schema.prospects.id))
      .leftJoin(
        schema.tovConfigs,
        eq(schema.messageSequences.tov_config_id, schema.tovConfigs.id)
      )
      .orderBy(desc(schema.messageSequences.created_at))
      .limit(limit)
      .offset(offset)
      .all();

    const totalResult = db
      .select({ count: sql<number>`count(*)` })
      .from(schema.messageSequences)
      .get();
    const total = totalResult?.count || 0;

    res.json({
      success: true,
      data: {
        sequences,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sequences/:id
 * Get full sequence detail with messages and AI metadata
 */
sequencesRouter.get("/:id", (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const result = buildSequenceResponse(id);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});
