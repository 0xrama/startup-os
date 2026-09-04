const PBKDF2_ITERATIONS = 310_000;
const AES_ALGORITHM = "AES-GCM";
const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

export type CipherPayload = {
  version: 1;
  iv: string;
  ciphertext: string;
};

export type WrappedMasterKeyPayload = CipherPayload & {
  salt: string;
};

const SESSION_KEY = "pax.master-key.v1";

function getCrypto() {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Browser crypto is unavailable");
  }

  return window.crypto;
}

function toBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function randomBytes(length: number) {
  return getCrypto().getRandomValues(new Uint8Array(length));
}

function asBufferSource(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function importAesKey(raw: Uint8Array, usages: KeyUsage[]) {
  return getCrypto().subtle.importKey(
    "raw",
    asBufferSource(raw),
    { name: AES_ALGORITHM },
    true,
    usages
  );
}

async function exportAesKey(key: CryptoKey) {
  const raw = await getCrypto().subtle.exportKey("raw", key);
  return new Uint8Array(raw);
}

async function deriveSecretKey(secret: string, salt: Uint8Array) {
  const material = await getCrypto().subtle.importKey(
    "raw",
    TEXT_ENCODER.encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return getCrypto().subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: asBufferSource(salt),
      iterations: PBKDF2_ITERATIONS,
    },
    material,
    { name: AES_ALGORITHM, length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

async function encryptBytes(key: CryptoKey, data: Uint8Array): Promise<CipherPayload> {
  const iv = randomBytes(12);
  const ciphertext = await getCrypto().subtle.encrypt(
    { name: AES_ALGORITHM, iv },
    key,
    asBufferSource(data)
  );

  return {
    version: 1,
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
}

async function decryptBytes(key: CryptoKey, payload: CipherPayload) {
  const plaintext = await getCrypto().subtle.decrypt(
    { name: AES_ALGORITHM, iv: fromBase64(payload.iv) },
    key,
    fromBase64(payload.ciphertext)
  );

  return new Uint8Array(plaintext);
}

export function isValidPin(pin: string) {
  return /^\d{4,6}$/.test(pin);
}

export function generateRecoveryCode() {
  const bytes = randomBytes(12);
  const chars = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0").toUpperCase()).join("");
  return chars.match(/.{1,4}/g)?.join("-") ?? chars;
}

export async function generateMasterKey() {
  return getCrypto().subtle.generateKey(
    { name: AES_ALGORITHM, length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function wrapMasterKey(masterKey: CryptoKey, secret: string): Promise<WrappedMasterKeyPayload> {
  const salt = randomBytes(16);
  const wrappingKey = await deriveSecretKey(secret, salt);
  const rawMasterKey = await exportAesKey(masterKey);
  const payload = await encryptBytes(wrappingKey, rawMasterKey);

  return {
    ...payload,
    salt: toBase64(salt),
  };
}

export async function unwrapMasterKey(payload: WrappedMasterKeyPayload, secret: string) {
  const wrappingKey = await deriveSecretKey(secret, fromBase64(payload.salt));
  const rawMasterKey = await decryptBytes(wrappingKey, payload);
  return importAesKey(rawMasterKey, ["encrypt", "decrypt"]);
}

export async function encryptJson<T>(masterKey: CryptoKey, value: T): Promise<CipherPayload> {
  return encryptBytes(masterKey, TEXT_ENCODER.encode(JSON.stringify(value)));
}

export async function decryptJson<T>(masterKey: CryptoKey, payload: CipherPayload): Promise<T> {
  const plaintext = await decryptBytes(masterKey, payload);
  return JSON.parse(TEXT_DECODER.decode(plaintext)) as T;
}

export async function encryptDocumentBlob(masterKey: CryptoKey, file: File | Blob) {
  const dataKey = await generateMasterKey();
  const wrappedFileKey = await encryptBytes(masterKey, await exportAesKey(dataKey));
  const iv = randomBytes(12);
  const plaintext = new Uint8Array(await file.arrayBuffer());
  const ciphertext = await getCrypto().subtle.encrypt(
    { name: AES_ALGORITHM, iv },
    dataKey,
    plaintext
  );

  return {
    encryptedBlob: new Blob([ciphertext], { type: "application/octet-stream" }),
    wrappedFileKey,
    fileCiphertext: {
      version: 1 as const,
      iv: toBase64(iv),
    },
  };
}

export async function decryptDocumentBlob(
  masterKey: CryptoKey,
  wrappedFileKey: CipherPayload,
  iv: string,
  blob: Blob
) {
  const rawDataKey = await decryptBytes(masterKey, wrappedFileKey);
  const dataKey = await importAesKey(rawDataKey, ["encrypt", "decrypt"]);
  const ciphertext = await blob.arrayBuffer();
  const plaintext = await getCrypto().subtle.decrypt(
    { name: AES_ALGORITHM, iv: fromBase64(iv) },
    dataKey,
    ciphertext
  );

  return new Blob([plaintext]);
}

export async function persistMasterKey(masterKey: CryptoKey) {
  sessionStorage.setItem(SESSION_KEY, toBase64(await exportAesKey(masterKey)));
}

export async function restoreMasterKey() {
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (!stored) return null;

  return importAesKey(fromBase64(stored), ["encrypt", "decrypt"]);
}

export function clearPersistedMasterKey() {
  sessionStorage.removeItem(SESSION_KEY);
}
