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
} catch (error) {
  console.error('Error applying migrations:', error);   
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const {
      id,            
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

    if (!id) {
      return res.status(400).json({ error: 'messageId is required' });
    }

    if (!senderId || !recipientId || !encryptedContent) {
      return res.status(400).json({ 
        error: 'Missing required fields: senderId, recipientId, encryptedContent' 
      });
    }

    if (!messageKeys || messageKeys.length === 0) {
      return res.status(400).json({ 
        error: 'messageKeys array is required and cannot be empty' 
      });
    }

    const senderHash = hashNickName(senderId);
    const recipientHash = hashNickName(recipientId);
    
    const sender = await prisma.user.findUnique({
      where: { nickName: senderHash }
    });

    const recipient = await prisma.user.findUnique({
      where: { nickName: recipientHash }
    });

    if (!sender) {
      return res.status(404).json({ error: 'Sender not found' });
    }

    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const messageKeysData = [];
    const notFoundUsers = [];

    for (const mk of messageKeys) {
      const targetNickname = mk.userId;
      
      if (!targetNickname) {
        continue;
      }
      
      const targetHash = hashNickName(targetNickname);
      
      const targetUser = await prisma.user.findUnique({
        where: { nickName: targetHash }
      });
      
      if (!targetUser) {
        notFoundUsers.push(targetNickname);
        continue;
      }
      
      messageKeysData.push({
        userId: targetUser.id,
        encryptedKey: mk.encryptedKey,
        ephemeralPublicKey: mk.ephemeralPublicKey,
        chainKeySnapshot: mk.chainKeySnapshot,
        keyIndex: mk.keyIndex
      });
    }

    if (notFoundUsers.length > 0) {
      return res.status(404).json({ 
        error: 'Some users not found',
        notFoundUsers: notFoundUsers
      });
    }

    if (messageKeysData.length === 0) {
      return res.status(400).json({ 
        error: 'No valid messageKeys processed. All users might be invalid.' 
      });
    }

    const existingMessage = await prisma.message.findUnique({
      where: { id }
    });

    if (existingMessage) {
      return res.status(409).json({ 
        error: 'Message with this ID already exists',
        message: existingMessage 
      });
    }

    const message = await prisma.message.create({
      data: {
        id: id,
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

    return res.status(201).json(message);
    
  } catch (error) {
    return res.status(500).json({ 
      error: 'Failed to save message',
      details: error.message 
    });
  }
});

app.put('/api/messages/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const {
      encryptedContent,
      ephemeralKey,
      nonce,
      messageNumber,
      previousChainN,
      ratchetId,
      messageKeys
    } = req.body;

    const existingMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: { messageKeys: true }
    });

    if (!existingMessage) {
      return res.status(404).json({ error: 'Message not found' });
    }

    await prisma.messageKey.deleteMany({
      where: { messageId }
    });

    const messageKeysData = [];
    const notFoundUsers = [];

    for (const mk of messageKeys || []) {
      const nickNameHash = hashNickName(mk.userId);
      const user = await prisma.user.findUnique({
        where: { nickName: nickNameHash }
      });

      if (user) {
        messageKeysData.push({
          userId: user.id,
          encryptedKey: mk.encryptedKey,
          ephemeralPublicKey: mk.ephemeralPublicKey,
          chainKeySnapshot: mk.chainKeySnapshot,
          keyIndex: mk.keyIndex
        });
      } else {
        notFoundUsers.push(mk.userId);
      }
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        encryptedContent,
        ephemeralKey,
        nonce,
        messageNumber,
        previousChainN,
        isEdited: true,
        editedAt: new Date(),
        messageKeys: {
          create: messageKeysData
        }
      },
      include: {
        messageKeys: true
      }
    });

    res.json(updatedMessage);
  } catch (error) {
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

app.delete('/api/messages/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { deleteType } = req.body;

    if (!['soft', 'hard'].includes(deleteType)) {
      return res.status(400).json({ error: 'Invalid deleteType. Must be "soft" or "hard"' });
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { messageKeys: true }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (deleteType === 'hard') {
      await prisma.messageKey.deleteMany({
        where: { messageId }
      });

      await prisma.message.delete({
        where: { id: messageId }
      });

      res.json({ message: 'Message permanently deleted', deleteType: 'hard' });
    } else {
      const updatedMessage = await prisma.message.update({
        where: { id: messageId },
        data: {
          deleteType: 'soft',
          deletedAt: new Date()
        }
      });

      res.json({ 
        message: 'Message marked as deleted', 
        deleteType: 'soft', 
        data: updatedMessage 
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete message' });
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
    res.status(500).json({ error: 'Failed to save ratchet state' });
  }
});

app.get('/api/messages/:messageId/key', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.query;
        
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    const nickNameHash = hashNickName(userId);
    const user = await prisma.user.findUnique({
      where: { nickName: nickNameHash }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
   
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { messageKeys: true }
    });
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    const messageKey = message.messageKeys.find(mk => mk.userId === user.id);
    
    if (!messageKey) {
      return res.status(404).json({ error: 'MessageKey not found for this user' });
    }
    
    res.json(messageKey);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});


const PORT = process.env['PORT'] || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));