import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";

// Neon's serverless driver for Neon URLs, plain node-postgres for anything
// else (a local Docker Postgres, Supabase, RDS, ...). Set DATABASE_DRIVER to
// "neon" or "pg" to force one.
export function createDbAdapter(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  }
  const forced = process.env.DATABASE_DRIVER?.toLowerCase();
  const useNeon = forced ? forced === "neon" : /\.neon\.tech/i.test(connectionString);
  return useNeon ? new PrismaNeon({ connectionString }) : new PrismaPg({ connectionString });
}
