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

export async function getObjectBytes(key: string) {
  const { client, GetObjectCommand } = await getR2Client();

  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  const response = await client.send(command);

  return Buffer.from(await response.Body!.transformToByteArray());
}

export async function deleteObject(key: string) {
  const { client, DeleteObjectCommand } = await getR2Client();

  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return client.send(command);
}
