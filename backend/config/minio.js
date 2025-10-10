const { Client: MinioClient } = require('minio');

const MINIO_ENDPOINT_RAW = process.env.MINIO_ENDPOINT || 'minio';
const MINIO_PORT = parseInt(process.env.MINIO_PORT || '9000');
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'admin';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || 'adminadmin';
const MINIO_USE_SSL = false;
const DRIVE_BUCKET = process.env.DRIVE_BUCKET || 'drive';

async function initMinioClient(withRetry) {
  let MINIO_ENDPOINT = MINIO_ENDPOINT_RAW;
  let minioClient;

  async function initMinio(endpoint) {
    return new MinioClient({
      endPoint: endpoint,
      port: MINIO_PORT,
      useSSL: MINIO_USE_SSL,
      accessKey: MINIO_ACCESS_KEY,
      secretKey: MINIO_SECRET_KEY
    });
  }

  try {
    minioClient = await initMinio(MINIO_ENDPOINT_RAW);
    // quick ping (bucketExists on a dummy name just to resolve DNS)
    await withRetry(() => minioClient.listBuckets());
    console.log(`MinIO primary endpoint OK: ${MINIO_ENDPOINT_RAW}`);
  } catch (e) {
    if (['EAI_AGAIN', 'ENOTFOUND'].includes(e.code)) {
      console.warn(`MinIO DNS resolution failed for '${MINIO_ENDPOINT_RAW}', falling back to localhost`);
      MINIO_ENDPOINT = 'localhost';
      minioClient = await initMinio(MINIO_ENDPOINT);
    } else {
      console.warn('MinIO initial connection issue:', e.message);
      minioClient = await initMinio(MINIO_ENDPOINT_RAW); // still keep original
    }
  }

  // Ensure bucket exists
  try {
    const exists = await withRetry(() => minioClient.bucketExists(DRIVE_BUCKET).catch(() => false));
    if (!exists) {
      await withRetry(() => minioClient.makeBucket(DRIVE_BUCKET, 'eu-west-1'));
      console.log(`Created MinIO bucket '${DRIVE_BUCKET}'`);
    }
  } catch (e) {
    console.warn('MinIO bucket init error (after retries):', e.message);
  }

  return { minioClient, DRIVE_BUCKET, MINIO_ENDPOINT, MINIO_PORT };
}

module.exports = { initMinioClient, DRIVE_BUCKET };