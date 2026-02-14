import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().default("./data/sqlite.db"),
  OLLAMA_BASE_URL: z.string().default("http://localhost:11434/v1"),
  OLLAMA_MODEL: z.string().default("llama3.2"),
  OPENAI_API_KEY: z.string().default("ollama"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
