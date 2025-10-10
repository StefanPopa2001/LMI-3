const express = require('express');
const multer = require('multer');
const prisma = require('../config/database');
const { verifyAdminToken } = require('../middleware/auth');
const { normalizePrefix, inferTextLike, withRetry } = require('../utils/helpers');
const { minioClient, DRIVE_BUCKET } = require('../config/minio');

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// List files & folders at a given prefix ("virtual directory")
router.get("/", verifyAdminToken, async (req, res) => {
  const prefix = normalizePrefix(req.query.prefix || '');
  const diagnostics = req.query.diagnostics === '1';
  try {
    await withRetry(() => new Promise((resolve, reject) => {
      const rawObjects = [];
      const stream = minioClient.listObjectsV2(DRIVE_BUCKET, prefix, true);
      stream.on('data', obj => { if (obj && obj.name) rawObjects.push(obj); });
      stream.on('error', err => reject(err));
      stream.on('end', () => {
        const seenFolders = new Set();
        const files = [];
        for (const o of rawObjects) {
          const remainder = o.name.substring(prefix.length);
          // Treat explicit zero-byte marker objects (ending with '/') as folders so empty folders show up
          if (remainder.endsWith('/') && o.size === 0) {
            const markerFolder = remainder.slice(0, -1); // drop trailing '/'
            if (markerFolder && !seenFolders.has(markerFolder)) seenFolders.add(markerFolder);
            continue; // don't process further as file
          }
          if (remainder.includes('/')) {
            const folderName = remainder.split('/')[0];
            if (folderName && !seenFolders.has(folderName)) seenFolders.add(folderName);
          } else if (remainder) {
            files.push({
              name: remainder,
              path: prefix + remainder,
              size: o.size,
              lastModified: o.lastModified
            });
          }
        }
        const payload = {
          prefix,
          folders: Array.from(seenFolders).sort(),
          files
        };
        if (diagnostics) {
          payload._diag = {
            objectCount: rawObjects.length,
            bucket: DRIVE_BUCKET,
            prefix,
            folderCount: payload.folders.length
          }; // lightweight diag
        }
        res.json(payload);
        resolve();
      });
    }));
  } catch (err) {
    console.error('Drive listing failed', err);
    const code = err.code || err.errno || 'UNKNOWN';
    let suggestion;
    if (code === 'ECONNREFUSED') {
      suggestion = `Connection refused to MinIO at ${process.env.MINIO_ENDPOINT || 'minio'}:${process.env.MINIO_PORT || '9000'}. Ensure MinIO is running (docker compose up -d minio) and port ${process.env.MINIO_PORT || '9000'} is published. If running backend outside Docker, MINIO_ENDPOINT should generally be 'localhost'.`;
    } else if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
      suggestion = `DNS resolution failed for MinIO host '${process.env.MINIO_ENDPOINT || 'minio'}'. If backend runs outside Docker, set MINIO_ENDPOINT=localhost. Inside docker-compose, it should match the service name 'minio'.`;
    }
    res.status(500).json({ error: 'Drive listing failed', code, message: err.message, bucket: DRIVE_BUCKET, prefix, suggestion });
  }
});

// Upload file (optionally to a prefix / folder path)
router.post('/upload', verifyAdminToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const rawPath = req.body.path || req.query.path || '';
    const prefix = normalizePrefix(rawPath);
    const objectName = prefix + req.file.originalname;
    await withRetry(() => minioClient.putObject(
        DRIVE_BUCKET,
        objectName,
        req.file.buffer,
        req.file.size,
        { 'Content-Type': req.file.mimetype }
      ));
    res.json({ message: 'Uploaded', name: req.file.originalname, path: objectName });
  } catch (err) {
    console.error('Upload error', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Create folder (stores a zero-byte object ending with '/')
router.post('/folder', verifyAdminToken, async (req, res) => {
  try {
    const { path = '', name } = req.body || {};
    if (!name || /[\\]/.test(name) || name.includes('/')) return res.status(400).json({ error: 'Invalid folder name' });
    const prefix = normalizePrefix(path) + name + '/';
    // zero byte marker object
    await withRetry(() => minioClient.putObject(DRIVE_BUCKET, prefix, Buffer.from(''), 0));
    res.json({ message: 'Folder created', prefix });
  } catch (err) {
    console.error('Create folder error', err);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Delete folder recursively
router.delete('/folder', verifyAdminToken, async (req, res) => {
  const rawPrefix = req.query.prefix || req.body?.prefix;
  if (!rawPrefix) return res.status(400).json({ error: 'Missing prefix' });
  const prefix = normalizePrefix(rawPrefix);
  try {
    const toDelete = [];
    const stream = minioClient.listObjectsV2(DRIVE_BUCKET, prefix, true);
    stream.on('data', obj => { if (obj && obj.name) toDelete.push(obj.name); });
    stream.on('end', async () => {
      if (toDelete.length === 0) return res.json({ message: 'Nothing to delete', deleted: 0 });
      // MinIO removeObjects expects stream or array of objects {name}
      const objects = toDelete.map(n => ({ name: n }));
      try {
        await withRetry(() => new Promise((resolve, reject) => {
            minioClient.removeObjects(DRIVE_BUCKET, objects, function(errs) {
              if (errs && errs.length) return reject(errs[0]);
              resolve();
            });
          })
        );
        res.json({ message: 'Folder deleted', deleted: toDelete.length });
      } catch (e) {
        console.error('Recursive delete error', e);
        res.status(500).json({ error: 'Failed to delete folder' });
      }
    });
    stream.on('error', err => {
      console.error('List for delete error', err);
      res.status(500).json({ error: 'Failed to enumerate folder' });
    });
  } catch (err) {
    console.error('Delete folder error', err);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// Get presigned download URL (also provide proxy path)
router.get('/download/:name', verifyAdminToken, async (req, res) => {
  try {
    const { name } = req.params;
    let url = null;
    try {
      url = await withRetry(() => minioClient.presignedGetObject(DRIVE_BUCKET, name, 60 * 60)); // 1h
    } catch (e) {
      console.warn('Presigned URL generation failed, relying on proxy', e.message);
    }
    res.json({ url, proxy: `/admin/drive/proxy/${encodeURIComponent(name)}` });
  } catch (err) {
    console.error('Download URL error', err);
    res.status(500).json({ error: 'Failed to get download URL' });
  }
});

// File preview endpoint
router.get('/preview', verifyAdminToken, async (req, res) => {
  const key = req.query.key;
  if (!key || typeof key !== 'string') return res.status(400).json({ error: 'Missing key' });
  const ext = key.split('.').pop();
  try {
    if (inferTextLike(ext)) {
      const limit = Math.min(parseInt(req.query.textLimit || '200000'), 500000); // safeguard
      const objStream = await withRetry(() => minioClient.getObject(DRIVE_BUCKET, key));
      const chunks = [];
      let total = 0;
      await new Promise((resolve, reject) => {
        objStream.on('data', d => {
          total += d.length;
          if (total <= limit) chunks.push(d);
          if (total > limit) objStream.destroy();
        });
        objStream.on('end', resolve);
        objStream.on('error', reject);
      });
      const content = Buffer.concat(chunks).toString('utf8');
      return res.json({ type: 'text', truncated: total > limit, content });
    }
    // For non-text we just return a presigned URL so the frontend can stream it (image/pdf/etc)
    let url = null;
    try {
      url = await withRetry(() => minioClient.presignedGetObject(DRIVE_BUCKET, key, 60 * 15)); // 15 min
    } catch (e) {
      console.warn('Preview presigned URL failed, using proxy only', e.message);
    }
    res.json({ type: 'binary', url, proxy: `/admin/drive/proxy/${encodeURIComponent(key)}` });
  } catch (err) {
    console.error('Preview error', err);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

// Proxy streaming endpoint for MinIO objects
router.get('/proxy/:name', verifyAdminToken, async (req, res) => {
  const { name } = req.params;
  try {
    const objStream = await withRetry(() => minioClient.getObject(DRIVE_BUCKET, name));
    // Simple content-type inference
    const ext = (name.split('.').pop() || '').toLowerCase();
    const map = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', txt: 'text/plain', json: 'application/json' };
    if (map[ext]) res.setHeader('Content-Type', map[ext]);
    objStream.on('error', err => {
      console.error('Proxy stream error', err);
      if (!res.headersSent) res.status(500).json({ error: 'Stream error' });
    });
    objStream.pipe(res);
  } catch (err) {
    console.error('Proxy fetch error', err);
    res.status(500).json({ error: 'Failed to stream object' });
  }
});

// Simple storage health endpoint (admin only) to diagnose connectivity
router.get('/health', verifyAdminToken, async (req, res) => {
  try {
    const exists = await withRetry(() => minioClient.bucketExists(DRIVE_BUCKET));
    if (!exists) return res.status(500).json({ status: 'error', bucket: DRIVE_BUCKET, message: 'Bucket missing' });
    // Attempt a tiny list (limit by early destroy)
    let firstObject = null; let count = 0;
    await withRetry(() => new Promise((resolve, reject) => {
      const stream = minioClient.listObjectsV2(DRIVE_BUCKET, '', true);
      stream.on('data', obj => {
        if (!firstObject && obj && obj.name) firstObject = { name: obj.name, size: obj.size };
        if (++count >= 5) stream.destroy();
      });
      stream.on('error', reject);
      stream.on('end', resolve);
      stream.on('close', resolve);
    }));
    res.json({ status: 'ok', bucket: DRIVE_BUCKET, sample: firstObject, scanned: count });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message, code: e.code || e.errno });
  }
});

// Delete file
router.delete('/:name', verifyAdminToken, async (req, res) => {
  try {
    const { name } = req.params;
    await minioClient.removeObject(DRIVE_BUCKET, name);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Delete error', err);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;