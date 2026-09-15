import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function encryptionKey() {
  const key = Buffer.from(process.env.DATA_ENCRYPTION_KEY ?? "", "base64");

  if (key.length !== 32)
    throw new Error("Set DATA_ENCRYPTION_KEY to a base64-encoded 32-byte key.");

  return key;
}

export function sealBytes(bytes: Uint8Array) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);

  return Buffer.concat([
    Buffer.from("PAX1"),
    iv,
    cipher.getAuthTag(),
    ciphertext,
  ]);
}

export function openBytes(bytes: Buffer) {
  if (bytes.length < 32 || bytes.subarray(0, 4).toString() !== "PAX1") {
    throw new Error("Invalid encrypted server payload");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    bytes.subarray(4, 16)
  );

  decipher.setAuthTag(bytes.subarray(16, 32));

  return Buffer.concat([decipher.update(bytes.subarray(32)), decipher.final()]);
}

export function sealText(text: string) {
  return `sealed:v1:${sealBytes(Buffer.from(text)).toString("base64")}`;
}

export function isSealedText(text: string) {
  return text.startsWith("sealed:v1:");
}

export function openText(text: string) {
  if (!isSealedText(text)) throw new Error("Stored value is not encrypted");

  return openBytes(Buffer.from(text.slice(10), "base64")).toString("utf8");
}
