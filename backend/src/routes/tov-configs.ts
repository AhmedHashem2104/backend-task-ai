import { Router, Request, Response, NextFunction } from "express";
import { db, schema } from "../db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { validate } from "../middleware/validate";
import { createTovConfigSchema, updateTovConfigSchema } from "../types";
import { AppError } from "../middleware/error-handler";

export const tovConfigsRouter = Router();

/**
 * POST /api/tov-configs
 * Create a new TOV config
 */
tovConfigsRouter.post(
  "/",
  validate(createTovConfigSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const now = new Date().toISOString();
      const id = nanoid();

      db.insert(schema.tovConfigs)
        .values({
          id,
          name: req.body.name,
          formality: req.body.formality,
          warmth: req.body.warmth,
          directness: req.body.directness,
          humor: req.body.humor ?? 0.3,
          enthusiasm: req.body.enthusiasm ?? 0.5,
          custom_instructions: req.body.custom_instructions || null,
          created_at: now,
          updated_at: now,
        })
        .run();

      const config = db.select().from(schema.tovConfigs).where(eq(schema.tovConfigs.id, id)).get();

      res.status(201).json({
        success: true,
        data: config,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/tov-configs
 * List all TOV configs
 */
tovConfigsRouter.get("/", (_req: Request, res: Response, next: NextFunction) => {
  try {
    const configs = db.select().from(schema.tovConfigs).all();
    res.json({
      success: true,
      data: configs,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tov-configs/:id
 * Get a specific TOV config
 */
tovConfigsRouter.get("/:id", (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const config = db
      .select()
      .from(schema.tovConfigs)
      .where(eq(schema.tovConfigs.id, id))
      .get();

    if (!config) {
      throw new AppError(404, "TOV config not found");
    }

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tov-configs/:id
 * Update a TOV config
 */
tovConfigsRouter.put(
  "/:id",
  validate(updateTovConfigSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const existing = db
        .select()
        .from(schema.tovConfigs)
        .where(eq(schema.tovConfigs.id, id))
        .get();

      if (!existing) {
        throw new AppError(404, "TOV config not found");
      }

      db.update(schema.tovConfigs)
        .set({
          ...req.body,
          updated_at: new Date().toISOString(),
        })
        .where(eq(schema.tovConfigs.id, id))
        .run();

      const updated = db
        .select()
        .from(schema.tovConfigs)
        .where(eq(schema.tovConfigs.id, id))
        .get();

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/tov-configs/:id
 * Delete a TOV config
 */
tovConfigsRouter.delete("/:id", (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const existing = db
      .select()
      .from(schema.tovConfigs)
      .where(eq(schema.tovConfigs.id, id))
      .get();

    if (!existing) {
      throw new AppError(404, "TOV config not found");
    }

    db.delete(schema.tovConfigs).where(eq(schema.tovConfigs.id, id)).run();

    res.json({
      success: true,
      data: { message: "TOV config deleted" },
    });
  } catch (error) {
    next(error);
  }
});
