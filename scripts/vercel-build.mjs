import { spawnSync } from 'node:child_process';
function run(args, cwd = process.cwd()) {
  const result = spawnSync(process.execPath, args, { cwd, stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
run(['node_modules/prisma/build/index.js', 'generate', '--schema', 'apps/api/prisma/schema.prisma']);
run(['node_modules/typescript/bin/tsc', '-p', 'apps/api/tsconfig.json']);
run(['node_modules/typescript/bin/tsc', '-b', 'apps/web']);
run(['../../node_modules/vite/bin/vite.js', 'build'], 'apps/web');
// Only the production deployment applies reviewed migrations; preview builds never alter the production database.
if (process.env.VERCEL_ENV === 'production') run(['scripts/prepare-database.mjs']);
