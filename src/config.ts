import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4001),
  DATABASE_URL: z.string().min(1),
  FRONTEND_ORIGIN: z.string().url(),
  CASHFREE_ENV: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
    z.enum(["sandbox", "production"]).default("sandbox"),
  ),
  CASHFREE_APP_ID: z.string().min(1),
  CASHFREE_SECRET_KEY: z.string().min(1),
  CASHFREE_API_VERSION: z.string().default("2023-08-01"),
  DONATION_RETURN_URL: z.string().url(),
  ADMIN_API_KEY: z.string().min(32).optional(),
});

const parsedConfig = configSchema.safeParse(process.env);
if (!parsedConfig.success) {
  throw new Error(`Invalid backend environment: ${parsedConfig.error.message}`);
}

export const config = parsedConfig.data;
