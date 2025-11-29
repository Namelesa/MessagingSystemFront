import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { PrismaClient } from '../generated/prisma/client.js';
import { execSync } from 'child_process';

dotenv.config({ path: '../prisma/.env' });
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
  execSync('npx prisma migrate deploy --schema=schema.prisma', {
    cwd: '../prisma',
    stdio: 'inherit'
  });  
  console.log('✅ Migrations applied');
} catch (error) {
  console.error('❌ Migration failed:', error);
}

function hashNickName(nickName) {
  const lowerNickName = nickName.toLowerCase();
  return crypto
    .createHash('sha256')
    .update(lowerNickName, 'utf8')
    .digest('base64');
}

app.get('/api/users/nickName/:nickName', async (req, res) => {
  try {
    const { nickName } = req.params;
    const nickNameHash = hashNickName(nickName);
    
    const user = await prisma.user.findUnique({ 
      where: { nickName: nickNameHash } 
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { nickName, key } = req.body;
        
    const newUser = await prisma.user.create({ 
      data: { nickName: nickName, key } 
    });
    
    res.status(201).json(newUser);
  } catch (err) {
    res.status(400).json({ error: 'Error with creating user' });
  }
});

app.put('/api/users/nickName/:nickName', async (req, res) => {
  try {
    const { nickName } = req.params;
    const { newName } = req.body;

    if (!newName) {
      return res.status(400).json({ error: 'newName is required' });
    }

    const oldNickNameHash = hashNickName(nickName);

    const user = await prisma.user.findUnique({
      where: { nickName: oldNickNameHash },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newNickNameHash = hashNickName(newName);

    const existingUser = await prisma.user.findUnique({
      where: { nickName: newNickNameHash }
    });

    if (existingUser && existingUser.id !== user.id) {
      return res.status(409).json({ error: 'Nickname already taken' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { nickName: newNickNameHash },
    });

    res.json({ 
      message: 'Nickname updated successfully',
      user: updatedUser 
    });
  } catch (err) {
    console.error('Error updating nickname:', err);
    res.status(500).json({ error: 'Error with editing nickname' });
  }
});

app.delete('/api/users/nickName/:nickName', async (req, res) => {
  try {
    const { nickName } = req.params;
    const nickNameHash = hashNickName(nickName);

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

app.post('/api/messages', async (req, res) => {
  try {
    const {
      senderId,
      recipientId,
      encryptedContent,
      ephemeralKey,
      nonce,
      messageNumber,
      previousChainN,
      ratchetId,
      messageKeys
    } = req.body;

    const senderHash = hashNickName(senderId);
    const recipientHash = hashNickName(recipientId);
    
    const sender = await prisma.user.findUnique({
      where: { nickName: senderHash }
    });

    const recipient = await prisma.user.findUnique({
      where: { nickName: recipientHash }
    });

    if (!sender) {
      console.error('❌ Sender not found:', senderId);
      return res.status(404).json({ error: 'Sender not found' });
    }

    if (!recipient) {
      console.error('❌ Recipient not found:', recipientId);
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const messageKeysData = messageKeys?.map((mk, index) => {
      const targetNickname = mk.userId;
      
      if (!targetNickname) {
        console.error(`❌ messageKey[${index}]: missing userId`, mk);
        return null;
      }
      
      const targetHash = hashNickName(targetNickname);
      
      let targetUUID;
      if (targetHash === senderHash) {
        targetUUID = sender.id;
      } else if (targetHash === recipientHash) {
        targetUUID = recipient.id;
      } else {
        return null;
      }
      
      return {
        userId: targetUUID,
        encryptedKey: mk.encryptedKey,
        ephemeralPublicKey: mk.ephemeralPublicKey,
        chainKeySnapshot: mk.chainKeySnapshot,
        keyIndex: mk.keyIndex
      };
    }).filter(Boolean) || [];

    if (messageKeysData.length === 0 && messageKeys?.length > 0) {
      console.error('⚠️ All messageKeys were filtered out! Check userId values.');
      return res.status(400).json({ error: 'Invalid messageKeys: no valid userId found' });
    }
    
    const message = await prisma.message.create({
      data: {
        senderId: sender.id,
        recipientId: recipient.id,
        encryptedContent,
        ephemeralKey,
        nonce,
        messageNumber,
        previousChainN,
        messageKeys: {
          create: messageKeysData
        }
      },
      include: {
        messageKeys: true
      }
    });
    
  } catch (error) {
    console.error('❌ Error saving message:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

app.get('/api/messages/history/:userId/:contactId', async (req, res) => {
  try {
    const { userId, contactId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, recipientId: contactId },
          { senderId: contactId, recipientId: userId }
        ],
        deleteType: { not: 'hard' }
      },
      include: {
        messageKeys: {
          where: { userId }
        },
        replyTo: true
      },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching message history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

app.post('/api/ratchet-state', async (req, res) => {
  try {
    const {
      userId,
      contactId,
      rootKey,
      sendingChainKey,
      receivingChainKey,
      sendMessageNumber,
      recvMessageNumber,
      dhRatchetPrivate,
      dhRatchetPublic,
      remotePublicKey
    } = req.body;

    const ratchetState = await prisma.ratchetState.upsert({
      where: {
        userId_contactId: { userId, contactId }
      },
      update: {
        rootKey,
        sendingChainKey,
        receivingChainKey,
        sendMessageNumber,
        recvMessageNumber,
        dhRatchetPrivate,
        dhRatchetPublic,
        remotePublicKey
      },
      create: {
        userId,
        contactId,
        rootKey,
        sendingChainKey,
        receivingChainKey,
        sendMessageNumber,
        recvMessageNumber,
        dhRatchetPrivate,
        dhRatchetPublic,
        remotePublicKey
      }
    });

    res.json(ratchetState);
  } catch (error) {
    console.error('Error saving ratchet state:', error);
    res.status(500).json({ error: 'Failed to save ratchet state' });
  }
});

app.get('/api/messages/:messageId/key', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.query;
    
    const nickNameHash = hashNickName(userId);
    const user = await prisma.user.findUnique({
      where: { nickName: nickNameHash }
    });
    
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { messageKeys: true }
    });
    
    if (!message) {
      console.error('❌ Message not found:', messageId);
      return res.status(404).json({ error: 'Message not found' });
    }
    
    const messageKey = message.messageKeys.find(mk => mk.userId === user.id);
    
    if (!messageKey) {
      console.error('❌ MessageKey not found for user:', user.id);
      console.error('Available MessageKeys:', message.messageKeys.map(mk => ({
        userId: mk.userId,
        keyIndex: mk.keyIndex
      })));
      return res.status(404).json({ error: 'MessageKey not found for this user' });
    }
    res.json(messageKey);
  } catch (error) {
    console.error('❌ Error fetching MessageKey:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env['PORT'] || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));