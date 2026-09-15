import { spawn } from "node:child_process";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { appendFile, link, mkdtemp, open, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import pg from "pg";

const [mode, name] = process.argv.slice(2);

const key = Buffer.from(process.env.BACKUP_ENCRYPTION_KEY ?? "", "base64");

if (!name || !["create", "restore-test"].includes(mode) || key.length !== 32) {
  throw new Error(
    "Usage: backup.mjs create|restore-test /absolute/file. Requires a 32-byte base64 BACKUP_ENCRYPTION_KEY."
  );
}

const file = resolve(name);

function run(command, args, database, stdio) {
  const address = new URL(database);

  const connection = {
    PGHOST: address.searchParams.get("host") ?? address.hostname,
    PGPORT: address.searchParams.get("port") ?? (address.port || "5432"),
    PGUSER: decodeURIComponent(address.username),
    PGPASSWORD: decodeURIComponent(address.password),
    PGDATABASE: decodeURIComponent(address.pathname.slice(1)),
    PGSSLMODE:
      address.searchParams.get("sslmode") ?? process.env.PGSSLMODE ?? "prefer",
    PGCONNECT_TIMEOUT: "10",
  };

  const child = spawn(command, args, {
    env: { ...process.env, ...connection },
    stdio,
  });

  const completed = new Promise((fulfill, reject) => {
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? fulfill()
        : reject(new Error("PostgreSQL backup command failed"))
    );
  });

  // Prevent unhandled rejection while the paired stream is being consumed.
  void completed.catch(() => undefined);

  return { child, completed };
}

if (mode === "create") {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

  const temporary = join(
    dirname(file),
    `.${basename(file)}.tmp-${randomBytes(6).toString("hex")}`
  );

  const handle = await open(temporary, "wx", 0o600);
  const iv = randomBytes(12);
  await handle.write(Buffer.concat([Buffer.from("PAXB1"), iv]));
  await handle.close();
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const dump = run(
    "pg_dump",
    ["--format=custom", "--no-owner", "--no-acl"],
    process.env.DATABASE_URL,
    ["ignore", "pipe", "ignore"]
  );

  try {
    await pipeline(
      dump.child.stdout,
      cipher,
      createWriteStream(temporary, { flags: "a", mode: 0o600 })
    );
    await dump.completed;
    await appendFile(temporary, cipher.getAuthTag());
    await link(temporary, file);
    await rm(temporary, { force: true }).catch(() => undefined);
    console.log(
      "Encrypted database backup created. Back up the object bucket and server key separately."
    );
  } catch (error) {
    dump.child.kill("SIGTERM");
    await rm(temporary, { force: true });
    throw error;
  }
} else {
  const target = process.env.RESTORE_DATABASE_URL;

  if (!target || !new URL(target).pathname.endsWith("_restore")) {
    throw new Error(
      "RESTORE_DATABASE_URL must name an empty disposable database ending in _restore."
    );
  }

  const pool = new pg.Pool({
    connectionString: target,
    connectionTimeoutMillis: 5000,
  });

  try {
    const result = await pool.query(
      "select 1 from pg_tables where schemaname not in ('pg_catalog', 'information_schema') limit 1"
    );

    if (result.rowCount)
      throw new Error("Refusing to restore over a nonempty database.");
  } finally {
    await pool.end();
  }

  const directory = await mkdtemp(join(tmpdir(), "pax-restore-"));
  const decrypted = join(directory, "verified.dump");

  try {
    const size = (await stat(file)).size;
    const handle = await open(file, "r");
    const header = Buffer.alloc(17);
    const tag = Buffer.alloc(16);

    try {
      await handle.read(header, 0, 17, 0);
      await handle.read(tag, 0, 16, size - 16);
    } finally {
      await handle.close();
    }

    if (size < 33 || header.subarray(0, 5).toString() !== "PAXB1")
      throw new Error("Invalid backup");

    const decipher = createDecipheriv("aes-256-gcm", key, header.subarray(5));
    decipher.setAuthTag(tag);
    await pipeline(
      createReadStream(file, { start: 17, end: size - 17 }),
      decipher,
      createWriteStream(decrypted, { flags: "wx", mode: 0o600 })
    );

    // Authenticate the entire archive before allowing pg_restore to write.
    const restore = run(
      "pg_restore",
      ["--exit-on-error", "--no-owner", "--no-acl", "--dbname", "", decrypted],
      target,
      "ignore"
    );

    await restore.completed;
    console.log("Authenticated backup restored to the disposable database.");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
