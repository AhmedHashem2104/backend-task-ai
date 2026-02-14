import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const dbPath = path.resolve(process.env.DATABASE_URL || "./data/sqlite.db");
const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

console.log("Running migrations...");

migrate(db, { migrationsFolder: path.resolve(__dirname, "../../drizzle") });

console.log("Migrations complete!");
sqlite.close();
