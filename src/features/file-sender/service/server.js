const express = require('express');
const cors = require('cors');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const redis = new Redis({ host: 'localhost', port: 6379 });

function decodeUrlParam(param) {
  try {
    return decodeURIComponent(param);
  } catch {
    return param;
  }
}

app.post('/api/mapping', async (req, res) => {
  const { originalName, uniqueFileName, uploadedAt, userId } = req.body;
  console.log('\n--- POST /api/mapping ---');
  console.log('Body:', req.body);

  if (!originalName || !uniqueFileName || !uploadedAt || !userId) {
    console.error('❌ Missing fields');
    return res.status(400).json({ error: 'Missing fields' });
  }

  const key = `file:${uniqueFileName}`;
  
  console.log('Redis key:', key);

  const existingKeys = await redis.keys('file:*');
  let maxVersion = 0;
  
  for (const existingKey of existingKeys) {
    const existingData = await redis.get(existingKey);
    if (existingData) {
      try {
        const existingVersion = JSON.parse(existingData);
        if (existingVersion.originalName === originalName && existingVersion.userId === userId) {
          maxVersion = Math.max(maxVersion, existingVersion.version || 0);
        }
      } catch (parseError) {
        console.warn('⚠️ Error parsing existing data:', parseError);
      }
    }
  }

  const versionData = {
    originalName,
    uniqueFileName,
    uploadedAt,
    version: maxVersion + 1,
    userId,
    timestamp: new Date(uploadedAt).getTime()
  };

  await redis.set(key, JSON.stringify(versionData));

  console.log('✅ Saved version to Redis:', versionData);
  res.json(versionData);
});

app.get('/api/mapping/:originalName', async (req, res) => {
  const { originalName } = req.params;
  
  console.log('\n--- GET /api/mapping/:originalName ---');
  console.log('OriginalName:', originalName);

  if (!originalName) {
    return res.status(400).json({ error: 'originalName is required' });
  }

  try {
    const pattern = 'file:*';
    const keys = await redis.keys(pattern);
    
    console.log('Found keys:', keys);

    const allVersions = [];

    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        try {
          const version = JSON.parse(data);
          if (version.originalName === originalName) {
            allVersions.push(version);
          }
        } catch (parseError) {
          console.warn('⚠️ Error parsing data for key:', key, parseError);
        }
      }
    }

    if (allVersions.length === 0) {
      return res.status(404).json({ 
        error: 'File mapping not found',
        originalName
      });
    }

    allVersions.sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());

    console.log('✅ Found versions:', allVersions);
    res.json(allVersions);
  } catch (error) {
    console.error('❌ Error getting file versions:', error);
    res.status(500).json({ error: 'Error retrieving file versions' });
  }
});

app.get('/api/mapping/:originalName/:userId', async (req, res) => {
  const { originalName, userId } = req.params;
  
  console.log('\n--- GET /api/mapping/:originalName/:userId ---');
  console.log('Params:', req.params);

  if (!originalName || !userId) {
    return res.status(400).json({ error: 'originalName and userId are required' });
  }

  const key = `${originalName}:${userId}`;
  console.log('Looking for key:', key);
  
  const data = await redis.get(key);
  
  if (!data) {
    console.log('❌ No data found for key:', key);
    return res.status(404).json({ 
      error: 'File mapping not found',
      originalName,
      userId 
    });
  }

  try {
    const versions = JSON.parse(data);
    console.log('✅ Found versions:', versions);
    res.json(versions);
  } catch (parseError) {
    console.error('❌ Error parsing data:', parseError);
    return res.status(500).json({ error: 'Error parsing file mapping data' });
  }
});

app.delete('/api/mapping/:originalName/:userId/:uniqueFileName', async (req, res) => {
  const { originalName, userId, uniqueFileName } = req.params;
  const key = `file:${uniqueFileName}`;

  console.log('\n--- DELETE /api/mapping/:originalName/:userId/:uniqueFileName ---');
  console.log('Params:', req.params);
  console.log('OriginalName:', originalName);
  console.log('UserId:', userId);
  console.log('UniqueFileName:', uniqueFileName);
  console.log('Redis key:', key);

  try {
    const data = await redis.get(key);
    
    if (!data) {
      return res.status(404).json({ error: 'File mapping not found' });
    }

    const version = JSON.parse(data);
    if (version.userId !== userId || version.originalName !== originalName) {
      return res.status(404).json({ error: 'File mapping not found' });
    }

    await redis.del(key);
    console.log('✅ Deleted file mapping:', key);

    res.json({ 
      success: true, 
      deletedVersion: uniqueFileName,
      remainingVersions: 0 
    });
  } catch (error) {
    console.error('❌ Error deleting version:', error);
    return res.status(500).json({ error: 'Error deleting file version' });
  }
});

app.post('/api/mapping/batch', async (req, res) => {
  const { fileNames, userId } = req.body;
  
  console.log('\n--- POST /api/mapping/batch ---');
  console.log('Body:', req.body);

  if (!fileNames || !Array.isArray(fileNames)) {
    console.error('❌ Missing or invalid fileNames');
    return res.status(400).json({ error: 'fileNames[] is required and must be an array' });
  }

  console.log('🔍 Searching for files:', fileNames);

  const mappings = [];

  try {
    const pattern = 'file:*';
    const keys = await redis.keys(pattern);
    
    console.log('Found keys:', keys);

    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        try {
          const version = JSON.parse(data);
          if (fileNames.includes(version.originalName)) {
            console.log(`📄 Found file "${version.originalName}":`, version);
            mappings.push(version);
          }
        } catch (parseError) {
          console.warn('⚠️ Error parsing data for key:', key, parseError);
        }
      }
    }

    mappings.sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());

    console.log('✅ Found mappings total:', mappings.length, mappings);
    
    res.json({
      mappings: mappings,
      total: mappings.length
    });

  } catch (error) {
    console.error('❌ Error in batch mapping:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/mapping/files/all', async (req, res) => {
  console.log('\n--- GET /api/mapping/files/all ---');

  try {
    const keys = await redis.keys('file:*');
    
    console.log('Found keys:', keys);

    const allFiles = [];

    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        try {
          const version = JSON.parse(data);
          allFiles.push(version);
        } catch (parseError) {
          console.warn('⚠️ Error parsing data for key:', key, parseError);
        }
      }
    }

    const groupedFiles = {};
    allFiles.forEach(file => {
      if (!groupedFiles[file.originalName]) {
        groupedFiles[file.originalName] = [];
      }
      groupedFiles[file.originalName].push(file);
    });

    Object.keys(groupedFiles).forEach(fileName => {
      groupedFiles[fileName].sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());
    });

    console.log('✅ All files:', groupedFiles);

    res.json({
      files: groupedFiles,
      total: Object.keys(groupedFiles).length
    });

  } catch (error) {
    console.error('❌ Error getting all files:', error);
    res.status(500).json({ error: 'Error retrieving all files' });
  }
});

app.get('/api/mapping/user/:userId', async (req, res) => {
  let { userId } = req.params;
  
  userId = decodeUrlParam(userId);
  
  console.log('\n--- GET /api/mapping/user/:userId ---');
  console.log('Original userId param:', req.params.userId);
  console.log('Decoded userId:', userId);

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const keys = await redis.keys('file:*');
    
    console.log('Found keys for user:', keys);

    const allFiles = [];

    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        try {
          const version = JSON.parse(data);
          if (version.userId === userId) {
            allFiles.push(version);
          }
        } catch (parseError) {
          console.warn('⚠️ Error parsing data for key:', key, parseError);
        }
      }
    }

    const groupedFiles = {};
    allFiles.forEach(file => {
      if (!groupedFiles[file.originalName]) {
        groupedFiles[file.originalName] = [];
      }
      groupedFiles[file.originalName].push(file);
    });

    Object.keys(groupedFiles).forEach(fileName => {
      groupedFiles[fileName].sort((a, b) => a.version - b.version);
    });

    console.log('✅ User files:', groupedFiles);

    res.json({
      files: groupedFiles,
      total: Object.keys(groupedFiles).length
    });

  } catch (error) {
    console.error('❌ Error getting user files:', error);
    res.status(500).json({ error: 'Error retrieving user files' });
  }
});

app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(4000, () => console.log('Local DB API running on port 4000'));