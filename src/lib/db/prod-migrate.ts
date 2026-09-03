import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" }); // Fallback to local if running manually
config();

async function runProductionMigration() {
  console.log("Starting production database migration procedure...");

  const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  
  // Guard against accidental execution
  if (isProd && process.env.ALLOW_PROD_MIGRATION !== "true") {
    console.error("ERROR: ALLOW_PROD_MIGRATION=true is required to run migrations in production.");
    console.error("Please set this environment variable in Vercel or locally before running this script.");
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("ERROR: DATABASE_URL is not set.");
    process.exit(1);
  }

  try {
    const sqlQuery = neon(databaseUrl);
    const db = drizzle(sqlQuery);
    
    console.log("Applying migrations...");
    // This expects drizzle-kit to have generated migrations in drizzle/ folder
    await migrate(db, { migrationsFolder: "drizzle" });
    
    console.log("Production migrations completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Production migration failed:", error);
    process.exit(1);
  }
}

runProductionMigration();
