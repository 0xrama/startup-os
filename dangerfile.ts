import { danger, fail, message, warn } from "danger";

const changedFiles = danger.git.modified_files.concat(danger.git.created_files);
const changedSourceFiles = changedFiles.filter((file) =>
  file.startsWith("src/")
);
const changedTestFiles = changedFiles.filter((file) =>
  file.startsWith("tests/")
);

if (danger.github.pr.additions + danger.github.pr.deletions > 800) {
  warn("Large PR. Consider splitting this into smaller reviewable chunks.");
}

if (changedSourceFiles.length > 0 && changedTestFiles.length === 0) {
  warn("Source files changed without accompanying tests.");
}

if (
  changedFiles.includes(".env.example") &&
  !(danger.github.pr.body ?? "").includes("env")
) {
  message(
    "`.env.example` changed. Call out the env changes in the PR description."
  );
}

if (
  changedFiles.includes("package.json") &&
  !changedFiles.some(
    (file) =>
      file === "package-lock.json" ||
      file === "pnpm-lock.yaml" ||
      file === "bun.lock"
  )
) {
  fail("`package.json` changed without an updated lockfile.");
}
