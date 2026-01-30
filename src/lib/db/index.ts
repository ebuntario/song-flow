/**
 * Database connection with conditional SQLite (dev) / PostgreSQL (prod) support.
 * 
 * - Local development: Uses SQLite with better-sqlite3
 * - Production (Vercel): Uses Neon serverless PostgreSQL
 */

import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schemaPg from "./schema-pg";
import * as schemaSqlite from "./schema";

// Re-export schema (use SQLite schema as the canonical type - they're compatible)
export * from "./schema";

// Determine environment
const databaseUrl = process.env.DATABASE_URL;

// Create database connection based on environment
function createDb() {
  if (databaseUrl) {
    // Production: Use Neon PostgreSQL
    const sql = neon(databaseUrl);
    return drizzleNeon(sql, { schema: schemaPg });
  } else {
    // Development: Use SQLite (dynamic import to avoid loading on Vercel)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require("better-sqlite3");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle: drizzleSqlite } = require("drizzle-orm/better-sqlite3");
    const sqlite = new Database("dev.db");
    return drizzleSqlite(sqlite, { schema: schemaSqlite });
  }
}

export const db = createDb();
