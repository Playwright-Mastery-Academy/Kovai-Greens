// Disposable HTTP integration harness; never connects to production data.
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { readFile, readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { randomBytes, randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { fileURLToPath } from "node:url";
const cwd = fileURLToPath(new URL("../", import.meta.url));
const pg = await PGlite.create();
const sampleTest = process.argv.includes("--sample");
let api;
let log = "";
const socket = new PGLiteSocketServer({
  db: pg,
  port: 0,
  host: "127.0.0.1",
  maxConnections: 1,
});
function child(command, args, env) {
  return new Promise((resolve) => {
    const p = spawn(command, args, { cwd, env, stdio: "inherit" });
    p.on("exit", (code) => resolve(code ?? 1));
  });
}
async function freePort() {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.on("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const port = s.address().port;
      s.close(() => resolve(port));
    });
  });
}
try {
  for (const dir of (await readdir(cwd + "prisma/migrations"))
    .filter((x) => /^\d/.test(x))
    .sort())
    await pg.exec(
      await readFile(cwd + `prisma/migrations/${dir}/migration.sql`, "utf8"),
    );
  const username = "owner@isolated.example.test",
    password = randomBytes(24).toString("hex");
  if (!sampleTest)
    await pg.query(
      'INSERT INTO "User" (id,name,username,"passwordHash",role) VALUES ($1,$2,$3,$4,$5)',
      [
        randomUUID(),
        "Isolated test owner",
        username,
        await hash(password, 12),
        "OWNER",
      ],
    );
  await socket.start();
  const port = await freePort();
  const env = {
    ...process.env,
    DATABASE_URL:
      "postgresql://postgres:postgres@" +
      socket.getServerConn() +
      "/postgres?connection_limit=1&pool_timeout=20",
    JWT_SECRET: randomBytes(48).toString("hex"),
    NODE_ENV: "test",
    APP_ENV: "training",
    WEB_ORIGIN: `http://localhost:${port}`,
    PORT: String(port),
  };
  if (sampleTest) {
    const seeded = await child(process.execPath, ["dist/seed.js"], {
      ...env,
      OWNER_USERNAME: "Aravind",
      OWNER_PASSWORD: password,
    });
    if (seeded) throw new Error("Sample import failed");
    await pg.exec("DEALLOCATE ALL"); // PGlite wire adapter shares one backend session across clients.
    const repeated = await child(process.execPath, ["dist/seed.js"], {
      ...env,
      OWNER_USERNAME: "Aravind",
      OWNER_PASSWORD: password,
    });
    if (repeated) throw new Error("Repeated sample import failed");
    await pg.exec("DEALLOCATE ALL");
  }
  api = spawn(
    process.execPath,
    [sampleTest ? "scripts/serve-vercel.cjs" : "dist/main.js"],
    {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  api.stdout.on("data", (b) => {
    log += b.toString();
  });
  api.stderr.on("data", (b) => {
    log += b.toString();
  });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    if (api.exitCode !== null) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!ready) throw new Error("API did not start: " + log.slice(-4000));
  process.exitCode = await child(
    process.execPath,
    [
      "--import",
      "tsx",
      "--test",
      sampleTest ? "src/sample.test.ts" : process.argv.includes("--store") ? "src/storefront.test.ts" : "src/integration.test.ts",
    ],
    {
      ...env,
      TEST_API_URL: `http://127.0.0.1:${port}`,
      TEST_OWNER_USERNAME: sampleTest ? "Aravind" : username,
      TEST_OWNER_PASSWORD: password,
    },
  );
  if (process.exitCode) console.error(log.slice(-6000));
} finally {
  if (api && api.exitCode === null) {
    api.kill("SIGTERM");
    await new Promise((r) => api.once("exit", r));
  }
  await socket.stop();
  await new Promise((r) => setImmediate(() => setImmediate(r)));
  await pg.close();
}
