import { Router, Request, Response } from "express";
import { db, schema } from "../db";
import { sql } from "drizzle-orm";

export const healthRouter = Router();

healthRouter.get("/", (_req: Request, res: Response) => {
  try {
    // Test DB connection
    const result = db.select({ count: sql<number>`count(*)` }).from(schema.prospects).get();

    res.json({
      success: true,
      data: {
        status: "healthy",
        timestamp: new Date().toISOString(),
        database: "connected",
        prospects_count: result?.count || 0,
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: {
        message: "Service unhealthy",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
});
