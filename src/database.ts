import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "./config";

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
});

export const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});
