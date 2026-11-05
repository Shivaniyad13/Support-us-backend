import { defineConfig } from "@prisma/config";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "ts-node src/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
