import type { Config } from "drizzle-kit";

// Use PostgreSQL schema for production (Neon)
// Load DATABASE_URL from .env.local
import { config } from "dotenv";
config({ path: ".env.local" });

export default {
  schema: "./src/lib/db/schema-pg.ts",
  out: "./drizzle-pg",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
