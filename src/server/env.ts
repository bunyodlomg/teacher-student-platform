// Loads .env / .env.local for processes started outside Next (custom server,
// seed script) so MONGODB_URI, JWT_SECRET, etc. are available at module load.
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

export {};
