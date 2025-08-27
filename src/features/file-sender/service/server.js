const express = require('express');
const cors = require('cors');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const redis = new Redis({ host: 'localhost', port: 6379 });

/**
 * POST /api/mapping
 * Добавление новой версии
 */
app.post('/api/mapping', async (req, res) => {
  const { originalName, uniqueFileName, uploadedAt, userId } = req.body;
  console.log('\n--- POST /api/mapping ---');
  console.log('Body:', req.body);

  if (!originalName || !uniqueFileName || !uploadedAt || !userId) {
    console.error('❌ Missing fields');
    return res.status(400).json({ error: 'Missing fields' });
  }

  const key = `${originalName}:${userId}`;
  console.log('Redis key:', key);

  const existing = await redis.get(key);
  console.log('Existing in Redis:', existing);

  let versions = existing ? JSON.parse(existing) : [];
  const version = versions.length + 1;

  const newVersion = {
    originalName,
    uniqueFileName,
    uploadedAt,
    version,
    userId
  };

  versions.push(newVersion);
  await redis.set(key, JSON.stringify(versions));

  console.log('✅ Saved to Redis:', versions);
  res.json(newVersion);
});

/**
 * GET /api/mapping/:originalName/:userId
 * Получение всех версий файла
 */
app.get('/api/mapping/:originalName/:userId', async (req, res) => {
  console.log('\n--- GET /api/mapping/:originalName/:userId ---');
  console.log('Params:', req.params);

  const { originalName, userId } = req.params;
  const key = `${originalName}:${userId}`;

  const data = await redis.get(key);
  console.log('Redis key:', key, 'Data:', data);

  if (!data) {
    console.error('❌ Not found');
    return res.status(404).json({ error: 'Not found' });
  }

  const parsed = JSON.parse(data);
  console.log('✅ Returning:', parsed);
  res.json(parsed);
});

/**
 * DELETE /api/mapping/:originalName/:userId/:uniqueFileName
 * Удаление конкретной версии
 */
app.delete('/api/mapping/:originalName/:userId/:uniqueFileName', async (req, res) => {
  console.log('\n--- DELETE /api/mapping/:originalName/:userId/:uniqueFileName ---');
  console.log('Params:', req.params);

  const { originalName, userId, uniqueFileName } = req.params;
  const key = `${originalName}:${userId}`;

  const data = await redis.get(key);
  console.log('Redis key:', key, 'Data before delete:', data);

  if (!data) {
    console.error('❌ Not found');
    return res.status(404).json({ error: 'Not found' });
  }

  let versions = JSON.parse(data);
  versions = versions.filter(v => v.uniqueFileName !== uniqueFileName);

  if (versions.length === 0) {
    await redis.del(key);
    console.log('✅ Deleted key:', key);
  } else {
    await redis.set(key, JSON.stringify(versions));
    console.log('✅ Updated Redis:', versions);
  }

  res.json({ success: true });
});

/**
 * POST /api/mapping/batch
 * Получение списка originalName/uniqueFileName для нескольких файлов
 */
app.post('/api/mapping/batch', async (req, res) => {
  console.log('\n--- POST /api/mapping/batch ---');
  console.log('Body:', req.body);

  const { fileNames, userId } = req.body;
  if (!fileNames || !Array.isArray(fileNames) || !userId) {
    console.error('❌ Invalid body');
    return res.status(400).json({ error: 'fileNames[] and userId are required' });
  }

  const result = [];

  for (const originalName of fileNames) {
    const key = `${originalName}:${userId}`;
    const data = await redis.get(key);
    console.log('Checking key:', key, 'Value:', data);

    if (data) {
      const versions = JSON.parse(data);
      result.push(...versions);
    }
  }

  console.log('✅ Returning batch result:', result);
  res.json(result);
});

app.listen(4000, () => console.log('Local DB API running on port 4000'));
