-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nickName" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "encryptedContent" TEXT NOT NULL,
    "ephemeralKey" TEXT,
    "nonce" TEXT,
    "messageNumber" INTEGER,
    "previousChainN" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "deleteType" TEXT,
    "deletedAt" TIMESTAMP(3),
    "replyToId" TEXT,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageKey" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "ephemeralPublicKey" TEXT,
    "chainKeySnapshot" TEXT NOT NULL,
    "keyIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RatchetState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "rootKey" TEXT NOT NULL,
    "sendingChainKey" TEXT NOT NULL,
    "receivingChainKey" TEXT NOT NULL,
    "sendMessageNumber" INTEGER NOT NULL,
    "recvMessageNumber" INTEGER NOT NULL,
    "dhRatchetPrivate" TEXT NOT NULL,
    "dhRatchetPublic" TEXT NOT NULL,
    "remotePublicKey" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RatchetState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_nickName_key" ON "User"("nickName");

-- CreateIndex
CREATE UNIQUE INDEX "User_key_key" ON "User"("key");

-- CreateIndex
CREATE INDEX "Message_senderId_recipientId_timestamp_idx" ON "Message"("senderId", "recipientId", "timestamp");

-- CreateIndex
CREATE INDEX "MessageKey_userId_createdAt_idx" ON "MessageKey"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MessageKey_messageId_userId_key" ON "MessageKey"("messageId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "RatchetState_userId_contactId_key" ON "RatchetState"("userId", "contactId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageKey" ADD CONSTRAINT "MessageKey_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageKey" ADD CONSTRAINT "MessageKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
