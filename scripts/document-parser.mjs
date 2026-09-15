import mammoth from "mammoth";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

import {
  PDF_MAX_PAGES,
  validateDocxArchive,
} from "../src/lib/document-parser-limits.ts";

const chunks = [];

let size = 0;

for await (const chunk of process.stdin) {
  size += chunk.length;

  if (size > 25 * 1024 * 1024) process.exit(1);

  chunks.push(chunk);
}

const bytes = Buffer.concat(chunks);

try {
  let text;

  if (process.argv[2] === "application/pdf") {
    const parsed = await pdfParse(bytes, { max: PDF_MAX_PAGES });

    text = parsed.text;
  } else {
    validateDocxArchive(bytes);

    const parsed = await mammoth.extractRawText({ buffer: bytes });

    text = parsed.value;
  }

  process.stdout.write(text.slice(0, 120_000));
} catch {
  process.exitCode = 1;
}
