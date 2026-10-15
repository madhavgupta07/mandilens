import { loadEnv, requireEnv } from "./_env";

loadEnv();
requireEnv("MONGODB_URI");

const { connectToDatabase, disconnectFromDatabase } = await import("@/lib/db/connect");
const { User, AuditLog } = await import("@/lib/db/models");
const { hashPassword, validatePasswordStrength } = await import("@/lib/auth/password");

const args = process.argv.slice(2);
function argValue(flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

const email = (argValue("--email") ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const name = argValue("--name") ?? process.env.ADMIN_NAME ?? "MandiLens Administrator";
const password = argValue("--password") ?? process.env.ADMIN_PASSWORD ?? "";

async function main() {
  if (!email || !password) {
    console.error(
      "\n✗ Usage: pnpm admin:create -- --email you@example.com --password 'StrongPass123' [--name 'Your Name']",
    );
    console.error("  (or set ADMIN_EMAIL and ADMIN_PASSWORD in .env.local)\n");
    process.exit(1);
  }

  const strength = validatePasswordStrength(password);
  if (!strength.ok) {
    console.error(`\n✗ Password too weak: ${strength.problems.join(" ")}\n`);
    process.exit(1);
  }

  await connectToDatabase();
  const passwordHash = await hashPassword(password);

  const existing = await User.findOne({ email });
  let userId: string;

  if (existing) {
    const roles = new Set([...(existing.roles ?? []), "admin", "trader"]);
    existing.roles = [...roles] as typeof existing.roles;
    existing.passwordHash = passwordHash;
    existing.isActive = true;
    await existing.save();
    userId = String(existing._id);
    console.log(`✓ Existing user ${email} promoted to admin and password reset.`);
  } else {
    const created = await User.create({
      name,
      email,
      passwordHash,
      roles: ["admin", "trader"],
      emailVerified: true,
      isActive: true,
      isDemo: false,
    });
    userId = String(created._id);
    console.log(`✓ Admin user ${email} created.`);
  }

  await AuditLog.create({
    actorLabel: "cli",
    action: "user.admin_created",
    entityType: "User",
    entityId: userId,
    meta: { email, via: "scripts/create-admin.ts" },
  }).catch(() => undefined);

  console.log("  You can now sign in at /login and open /admin.");
}

main()
  .then(async () => {
    await disconnectFromDatabase();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("\n✗ Failed to create admin:", error instanceof Error ? error.message : error);
    await disconnectFromDatabase().catch(() => undefined);
    process.exit(1);
  });
