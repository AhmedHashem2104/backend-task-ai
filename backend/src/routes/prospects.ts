import { Router, Request, Response, NextFunction } from "express";
import { db, schema } from "../db";
import { eq } from "drizzle-orm";
import { AppError } from "../middleware/error-handler";

export const prospectsRouter = Router();

/**
 * GET /api/prospects/:id
 * Get a prospect's stored profile data
 */
prospectsRouter.get("/:id", (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const prospect = db
      .select()
      .from(schema.prospects)
      .where(eq(schema.prospects.id, id))
      .get();

    if (!prospect) {
      throw new AppError(404, "Prospect not found");
    }

    res.json({
      success: true,
      data: {
        ...prospect,
        profile_data: prospect.profile_data ? JSON.parse(prospect.profile_data) : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/prospects
 * List all cached prospects
 */
prospectsRouter.get("/", (_req: Request, res: Response, next: NextFunction) => {
  try {
    const prospects = db
      .select({
        id: schema.prospects.id,
        linkedin_url: schema.prospects.linkedin_url,
        full_name: schema.prospects.full_name,
        headline: schema.prospects.headline,
        current_company: schema.prospects.current_company,
        current_position: schema.prospects.current_position,
        location: schema.prospects.location,
        created_at: schema.prospects.created_at,
      })
      .from(schema.prospects)
      .all();

    res.json({
      success: true,
      data: prospects,
    });
  } catch (error) {
    next(error);
  }
});
