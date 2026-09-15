import { DOCUMENT_MAX_TEXT_CHARS } from "@/lib/ai-limits";

// Only the Node worker calls this adapter. HTTP and Workers requests enqueue jobs.
export async function extractDocumentText(
  bytes: Buffer,
  fileType: string,
  signal: AbortSignal
): Promise<string> {
  const { spawn } = await import("node:child_process");
  const { resolve } = await import("node:path");

  return new Promise((resolveResult, reject) => {
    const child = spawn(
      process.execPath,
      [
        "--max-old-space-size=128",
        "--import",
        "tsx",
        resolve(process.cwd(), "scripts/document-parser.mjs"),
        fileType,
      ],
      {
        stdio: ["pipe", "pipe", "ignore"],
        env: { PATH: process.env.PATH, NODE_ENV: "production" },
      }
    );

    const chunks: Buffer[] = [];
    let length = 0;

    const stop = () => child.kill("SIGKILL");
    const timeout = setTimeout(stop, 30_000);
    signal.addEventListener("abort", stop, { once: true });

    child.stdout.on("data", (chunk: Buffer) => {
      length += chunk.length;

      if (length > DOCUMENT_MAX_TEXT_CHARS * 4) stop();
      else chunks.push(chunk);
    });

    child.on("error", reject);
    child.stdin.on("error", () => undefined);

    child.on("close", (code) => {
      clearTimeout(timeout);
      signal.removeEventListener("abort", stop);

      if (code !== 0 || signal.aborted)
        reject(
          new Error("Document parser failed or exceeded its resource limit")
        );
      else
        resolveResult(
          Buffer.concat(chunks)
            .toString("utf8")
            .slice(0, DOCUMENT_MAX_TEXT_CHARS)
        );
    });

    child.stdin.end(bytes);

    if (signal.aborted) stop();
  });
}
