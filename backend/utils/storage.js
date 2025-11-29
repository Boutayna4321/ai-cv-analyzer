const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs').promises;
const path = require('path');

const s3Configured = () => {
  return !!(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);
};

const createS3Client = () => {
  if (!s3Configured()) return null;

  const region = process.env.S3_REGION || 'us-east-1';
  const endpoint = process.env.S3_ENDPOINT || undefined;
  const forcePathStyle = (process.env.S3_FORCE_PATH_STYLE || 'false') === 'true';

  const config = {
    region,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
    }
  };

  if (endpoint) {
    config.endpoint = endpoint;
    // allow using self-hosted S3 compatible services like MinIO
    config.forcePathStyle = forcePathStyle;
  }

  return new S3Client(config);
};

async function uploadFileToS3(localFilePath, key) {
  const bucket = process.env.S3_BUCKET;
  if (!s3Configured()) {
    throw new Error('S3 non configuré');
  }

  const client = createS3Client();
  const body = await fs.readFile(localFilePath);
  const contentType = getContentTypeByFile(localFilePath);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType
  });

  await client.send(command);

  // Construct a URL that works for most S3-compatible endpoints.
  const endpoint = process.env.S3_ENDPOINT;
  if (endpoint) {
    // If endpoint provided (MinIO, Backblaze), return full URL
    return `${endpoint.replace(/\/$/, '')}/${bucket}/${encodeURIComponent(key)}`;
  }

  // Default S3 URL
  return `https://${bucket}.s3.${process.env.S3_REGION}.amazonaws.com/${encodeURIComponent(key)}`;
}

function getContentTypeByFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.pdf':
      return 'application/pdf';
    case '.txt':
      return 'text/plain';
    case '.doc':
    case '.docx':
      return 'application/msword';
    default:
      return 'application/octet-stream';
  }
}

module.exports = {
  s3Configured,
  uploadFileToS3
};
