import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const inputs = process.argv.slice(2);
const ignoredDirectories = new Set(["docs/reference"]);

if (inputs.length === 0) {
  console.error("Provide at least one file path or directory to scan.");
  process.exit(1);
}

async function* walk(targetPath) {
  const absolutePath = path.resolve(targetPath);
  const stats = await stat(absolutePath);

  if (stats.isFile()) {
    yield absolutePath;
    return;
  }

  for (const entry of await readdir(absolutePath, { withFileTypes: true })) {
    const entryPath = path.join(absolutePath, entry.name);
    const relativePath = path.relative(process.cwd(), entryPath);

    if (entry.isDirectory()) {
      if (ignoredDirectories.has(relativePath)) {
        continue;
      }

      yield* walk(entryPath);
      continue;
    }

    yield entryPath;
  }
}

const matches = [];

for (const input of inputs) {
  for await (const absolutePath of walk(input)) {
    const filePath = path.relative(process.cwd(), absolutePath);
    const content = await readFile(absolutePath, "utf8");
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      if (/\b(TODO|FIXME)\b/.test(line)) {
        matches.push(`${filePath}:${index + 1}: ${line.trim()}`);
      }
    });
  }
}

if (matches.length > 0) {
  console.error("Technical debt markers found:");
  for (const match of matches) {
    console.error(`- ${match}`);
  }
  process.exit(1);
}
