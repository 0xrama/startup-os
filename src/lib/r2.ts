import { DOCUMENT_MAX_BYTES } from "./ai-limits";

async function createR2Client(endpoint: string) {
  const [
    { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand },
    { getSignedUrl },
  ] = await Promise.all([
    import("@aws-sdk/client-s3"),
    import("@aws-sdk/s3-request-presigner"),
  ]);

  const client = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: process.env.R2_FORCE_PATH_STYLE === "true",
  });

  return {
    client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    getSignedUrl,
  };
}

const r2Clients = new Map<string, ReturnType<typeof createR2Client>>();

function getR2Client(endpoint = process.env.R2_ENDPOINT!) {
  const existingClient = r2Clients.get(endpoint);

  if (existingClient) return existingClient;

  const client = createR2Client(endpoint);
  r2Clients.set(endpoint, client);

  return client;
}

function getSigningR2Client() {
  return getR2Client(
    process.env.R2_PUBLIC_ENDPOINT || process.env.R2_ENDPOINT!
  );
}

const BUCKET = process.env.R2_BUCKET_NAME!;

export async function getUploadUrl(
  key: string,
  contentType = "application/octet-stream",
  expiresIn = 300
) {
  const { client, PutObjectCommand, getSignedUrl } = await getSigningR2Client();

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn });
}

export async function getDownloadUrl(key: string, expiresIn = 900) {
  const { client, GetObjectCommand, getSignedUrl } = await getSigningR2Client();

  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn });
}

export async function getObjectBytes(
  key: string,
  maxBytes = DOCUMENT_MAX_BYTES,
  abortSignal?: AbortSignal
) {
  const { client, GetObjectCommand } = await getR2Client();

  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Range: `bytes=0-${maxBytes}`,
  });

  const response = await client.send(command, { abortSignal });

  if (!response.Body) throw new Error("Document body is missing");

  if (response.ContentLength && response.ContentLength > maxBytes) {
    // Drain no oversized payload into memory.
    if ("destroy" in response.Body) response.Body.destroy();
    throw new Error("File too large for analysis");
  }

  const bytes = await response.Body.transformToByteArray();

  if (bytes.byteLength > maxBytes)
    throw new Error("File too large for analysis");

  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

export async function deleteObject(key: string, signal?: AbortSignal) {
  const { client, DeleteObjectCommand } = await getR2Client();

  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return client.send(command, {
    abortSignal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(30_000)])
      : AbortSignal.timeout(30_000),
  });
}

export async function putObjectBytes(key: string, body: Uint8Array) {
  const { client, PutObjectCommand } = await getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: "application/octet-stream",
    }),
    { abortSignal: AbortSignal.timeout(30_000) }
  );
}

export async function checkObjectStorage() {
  const { client } = await getR2Client();
  const { HeadBucketCommand } = await import("@aws-sdk/client-s3");
  await client.send(new HeadBucketCommand({ Bucket: BUCKET }), {
    abortSignal: AbortSignal.timeout(5_000),
  });
}
