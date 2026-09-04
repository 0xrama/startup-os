import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const MAX_FILE_SIZE_BYTES = 1024 * 1024;
const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".wrangler",
  "build",
  "coverage",
  "dist",
  "docs/reference",
  "node_modules",
]);
const ALLOWED_LARGE_FILES = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "bun.lock",
]);

async function* walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    const relativePath = path.relative(process.cwd(), absolutePath);

    if (entry.isDirectory()) {
      if (
        IGNORED_DIRECTORIES.has(relativePath) ||
        IGNORED_DIRECTORIES.has(entry.name)
      ) {
        continue;
      }
      yield* walk(absolutePath);
      continue;
    }

    yield { absolutePath, relativePath };
  }
}

const oversizedFiles = [];

for await (const file of walk(process.cwd())) {
  if (ALLOWED_LARGE_FILES.has(file.relativePath)) {
    continue;
  }

  const fileStat = await stat(file.absolutePath);
  if (fileStat.size > MAX_FILE_SIZE_BYTES) {
    oversizedFiles.push({
      path: file.relativePath,
      size: fileStat.size,
    });
  }
}

if (oversizedFiles.length > 0) {
  console.error("Oversized files detected:");
  for (const file of oversizedFiles) {
    console.error(`- ${file.path}: ${Math.round(file.size / 1024)}KB`);
  }
  process.exit(1);
}
