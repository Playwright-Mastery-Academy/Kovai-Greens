import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const databaseUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl)
  throw new Error(
    "Set DATABASE_URL (and optional DIRECT_DATABASE_URL) securely before database setup.",
  );
const env = { ...process.env, DATABASE_URL: databaseUrl };
function run(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
run([
  resolve(root, "node_modules/prisma/build/index.js"),
  "migrate",
  "deploy",
  "--schema",
  "apps/api/prisma/schema.prisma",
]);
if (process.argv.includes("--sample"))
  run(["--import", "tsx", "apps/api/src/seed.ts"]);
