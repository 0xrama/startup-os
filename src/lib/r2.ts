async function createR2Client() {
  const [
    { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand },
    { getSignedUrl },
  ] = await Promise.all([
    import("@aws-sdk/client-s3"),
    import("@aws-sdk/s3-request-presigner"),
  ]);

  const client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT!,
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

let r2Client: ReturnType<typeof createR2Client> | undefined;

function getR2Client() {
  r2Client ??= createR2Client();

  return r2Client;
}

const BUCKET = process.env.R2_BUCKET_NAME!;

export async function getUploadUrl(
  key: string,
  contentType = "application/octet-stream",
  expiresIn = 300
) {
  const { client, PutObjectCommand, getSignedUrl } = await getR2Client();

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn });
}

export async function getDownloadUrl(key: string, expiresIn = 900) {
  const { client, GetObjectCommand, getSignedUrl } = await getR2Client();

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
