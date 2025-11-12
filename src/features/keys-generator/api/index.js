import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { PrismaClient } from '../../generated/prisma/client.js';
import { execSync } from 'child_process';

dotenv.config();
const prisma = new PrismaClient();
const app = express();

app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());

try {
  console.log('🛠 Applying pending migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  console.log('✅ Migrations applied');
} catch (error) {
  console.error('❌ Migration failed:', error);
}

app.get('/api/users/nickName/:nickName', async (req, res) => {
  const { nickName } = req.params;
  const user = await prisma.user.findUnique({ where: { nickName } });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json(user);
});

app.post('/api/users', async (req, res) => {
  try {
    const { nickName, key } = req.body;
    const newUser = await prisma.user.create({ data: { nickName, key } });
    res.status(201).json(newUser);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Error with creating user' });
  }
});

app.put('/api/users/nickName/:nickName', async (req, res) => {
  try {
    // Need to do 
    const { nickName } = req.params;
    const { newName } = req.body;
    const updatedUser = await prisma.user.update({
      where: { nickName },
      data: { nickName: newName },
    });
    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Error with editing info' });
  }
});

app.delete('/api/users/nickName/:nickName', async (req, res) => {
  try {
    const { nickName } = req.params;
    const lowerNickName = nickName.toLowerCase();

    const nickNameHash = crypto
      .createHash('sha256')
      .update(lowerNickName)
      .digest('base64');

    const user = await prisma.user.findUnique({
      where: { nickName: nickNameHash },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.user.delete({
      where: { id: user.id },
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env['PORT'] || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));