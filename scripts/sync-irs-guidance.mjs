import { createHash } from "node:crypto";
import pdfParse from "pdf-parse";
import pg from "pg";

const { Client } = pg;

const SOURCES = [
  {
    form: "Form 5472",
    revision: "2024-12",
    title: "IRS Instructions for Form 5472",
    url: "https://www.irs.gov/pub/irs-pdf/i5472.pdf",
  },
  {
    form: "Form 1120",
    revision: "2025",
    title: "IRS Instructions for Form 1120",
    url: "https://www.irs.gov/pub/irs-pdf/i1120.pdf",
  },
  {
    form: "Form 1065",
    revision: "2025",
    title: "IRS Instructions for Form 1065",
    url: "https://www.irs.gov/pub/irs-pdf/i1065.pdf",
  },
  {
    form: "Schedules K-2 and K-3 (Form 1065)",
    revision: "2025",
    title: "IRS Partnership Instructions for Schedules K-2 and K-3",
    url: "https://www.irs.gov/pub/irs-pdf/i1065s23.pdf",
  },
  {
    form: "Forms 8804, 8805, and 8813",
    revision: "2026-01",
    title: "IRS Instructions for Forms 8804, 8805, and 8813",
    url: "https://www.irs.gov/pub/irs-pdf/i8804.pdf",
  },
  {
    form: "Form W-8BEN",
    revision: "2021-10",
    title: "IRS Instructions for Form W-8BEN",
    url: "https://www.irs.gov/pub/irs-pdf/iw8ben.pdf",
  },
  {
    form: "Form W-8BEN-E",
    revision: "2021-10",
    title: "IRS Instructions for Form W-8BEN-E",
    url: "https://www.irs.gov/pub/irs-pdf/iw8bene.pdf",
  },
  {
    form: "Forms W-8 requester guidance",
    revision: "2022-06",
    title: "IRS Instructions for the Requester of Forms W-8",
    url: "https://www.irs.gov/pub/irs-pdf/iw8.pdf",
  },
  {
    form: "Form 1042",
    revision: "2025",
    title: "IRS Instructions for Form 1042",
    url: "https://www.irs.gov/pub/irs-pdf/i1042.pdf",
  },
  {
    form: "Form 1042-S",
    revision: "2026",
    title: "IRS Instructions for Form 1042-S",
    url: "https://www.irs.gov/pub/irs-pdf/i1042s.pdf",
  },
  {
    form: "Form W-7",
    revision: "2024-12",
    title: "IRS Instructions for Form W-7",
    url: "https://www.irs.gov/pub/irs-pdf/iw7.pdf",
  },
  {
    form: "Form SS-4",
    revision: "2025-12",
    title: "IRS Instructions for Form SS-4",
    url: "https://www.irs.gov/pub/irs-pdf/iss4.pdf",
  },
];

function normalizeText(value) {
  return value
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitLongParagraph(paragraph, maxLength) {
  const sentences = paragraph.split(/(?<=[.!?])\s+/);
  const parts = [];
  let current = "";

  for (const sentence of sentences) {
    if (current && current.length + sentence.length + 1 > maxLength) {
      parts.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }

  if (current) parts.push(current);

  return parts.flatMap((part) => {
    if (part.length <= maxLength) return [part];

    const slices = [];

    for (let index = 0; index < part.length; index += maxLength) {
      slices.push(part.slice(index, index + maxLength));
    }

    return slices;
  });
}

function chunkInstructions(text, maxLength = 2200) {
  const paragraphs = normalizeText(text)
    .split(/\n\s*\n/)
    .flatMap((paragraph) => splitLongParagraph(paragraph.trim(), maxLength))
    .filter(Boolean);

  const chunks = [];

  let current = "";

  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length + 2 > maxLength) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }

  if (current) chunks.push(current);

  return chunks;
}

function chunkId(sourceId, index, content) {
  const hash = createHash("sha256").update(content).digest("hex").slice(0, 12);

  return `${sourceId}:${index + 1}:${hash}`;
}

async function downloadInstructions(source) {
  const response = await fetch(source.url, {
    headers: { "user-agent": "Pax tax guidance sync/1.0" },
  });

  if (!response.ok) {
    throw new Error(`Failed to download ${source.url}: ${response.status}`);
  }

  const parsed = await pdfParse(Buffer.from(await response.arrayBuffer()));

  return chunkInstructions(parsed.text);
}

async function syncSource(client, source) {
  const formSlug = source.form.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const sourcePrefix = `irs-full:${formSlug}:`;
  const sourceId = `${sourcePrefix}${source.revision}`;
  const chunks = await downloadInstructions(source);
  const retrievedAt = new Date().toISOString();

  await client.query("BEGIN");

  try {
    await client.query("DELETE FROM knowledge_chunks WHERE source_id LIKE $1", [
      `${sourcePrefix}%`,
    ]);

    for (const [index, content] of chunks.entries()) {
      const metadata = {
        kind: "irs",
        title: source.title,
        form: source.form,
        revision: source.revision,
        sourceUrl: source.url,
        retrievedAt,
        section: `Full official instructions · chunk ${index + 1}`,
      };

      await client.query(
        `INSERT INTO knowledge_chunks (id, source, source_id, content, metadata)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [
          chunkId(sourceId, index, content),
          source.title,
          sourceId,
          content,
          JSON.stringify(metadata),
        ]
      );
    }

    await client.query("COMMIT");
    console.log(`Synced ${source.title}: ${chunks.length} chunks`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    for (const source of SOURCES) {
      await syncSource(client, source);
    }
  } finally {
    await client.end();
  }
}

await main();
