import fs from "node:fs";
import path from "node:path";

/**
 * Load `.env.local` then `.env` for standalone scripts (Next.js does this for
 * the app automatically, but `tsx scripts/*` does not).
 */
export function loadEnv(): void {
  for (const file of [".env.local", ".env"]) {
    const filePath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(filePath)) continue;
    try {
      process.loadEnvFile(filePath);
    } catch {
      // Ignore malformed env files; the script will report what is missing.
    }
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`\n✗ ${name} is not set.`);
    console.error(`  Copy .env.example to .env.local and set ${name}, then try again.\n`);
    process.exit(1);
  }
  return value;
}
