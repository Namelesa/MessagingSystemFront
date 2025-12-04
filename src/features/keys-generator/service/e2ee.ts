import { Injectable } from '@angular/core';
import * as bip39 from 'bip39';
import sodium from 'libsodium-wrappers-sumo';

interface StoredKeys {
  edPrivateKey: Uint8Array;
  xPrivateKey: Uint8Array;
  xPublicKey: Uint8Array;
  mnemonic: string;
  timestamp: number;
}

interface RatchetState {
  rootKey: Uint8Array;
  sendingChainKey: Uint8Array;
  receivingChainKey: Uint8Array;
  sendMessageNumber: number;
  recvMessageNumber: number;
  dhRatchetPrivate: Uint8Array;
  dhRatchetPublic: Uint8Array;
  remotePublicKey?: Uint8Array;
  ratchetId?: string; 
}

interface SenderKeyState {
  chainKey: Uint8Array;
  generationId: number;
  chainIndex: number;
  senderKeyId: string;
}

interface MessageKeyData {
  messageKey: Uint8Array;
  chainKeySnapshot: Uint8Array;
  keyIndex: number;
}

@Injectable({ providedIn: 'root' })
export class E2eeService {
  private ready = false;
  private keys: StoredKeys | null = null;
  private ratchetStates = new Map<string, RatchetState>();
  private senderKeys = new Map<string, SenderKeyState>(); 
  private receivedSenderKeys = new Map<string, Map<string, SenderKeyState>>(); 
  private messageKeysCache = new Map<string, MessageKeyData[]>();

  private keysLoaded = false;


  constructor() {
    sodium.ready.then(() => {
      this.ready = true;
    });
  }

  private ensureReady() {
    if (!this.ready) throw new Error('libsodium not ready yet');
  }
  
  private generateRatchetId(): string {
    return `ratchet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async saveMessageKeyForHistory(
    contactId: string,
    messageNumber: number,
    messageKey: Uint8Array,
    chainKeySnapshot: Uint8Array
  ): Promise<MessageKeyData> {
    const keyData: MessageKeyData = {
      messageKey,
      chainKeySnapshot,
      keyIndex: messageNumber
    };
    
    const cacheKey = `${contactId}`;
    if (!this.messageKeysCache.has(cacheKey)) {
      this.messageKeysCache.set(cacheKey, []);
    }
    this.messageKeysCache.get(cacheKey)!.push(keyData);
    
    return keyData;
  }

  // Добавить в E2eeService:

exportMessageKeyForGroupMember(
  groupId: string,
  memberPublicKey: Uint8Array,
  chainIndex: number
): {
  encryptedKey: string;
  ephemeralPublicKey: string;
  chainKeySnapshot: string;
  chainIndex: number;
} | null {
  this.ensureReady();
  
  const senderKeyState = this.senderKeys.get(groupId);
  if (!senderKeyState) {
    return null;
  }
  
  // Получаем message key для этого индекса
  const messageKey = sodium.crypto_generichash(
    32,
    new Uint8Array([...senderKeyState.chainKey, chainIndex])
  );
  
  // Создаем ephemeral keypair для шифрования
  const ephemeralKeyPair = sodium.crypto_box_keypair();
  
  // Создаем shared secret
  const sharedSecret = sodium.crypto_scalarmult(
    ephemeralKeyPair.privateKey,
    memberPublicKey
  );
  
  const encryptionKey = sodium.crypto_generichash(32, sharedSecret);
  
  // Шифруем message key
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const encrypted = sodium.crypto_secretbox_easy(
    messageKey,
    nonce,
    encryptionKey
  );
  
  return {
    encryptedKey: this.toBase64(new Uint8Array([...nonce, ...encrypted])),
    ephemeralPublicKey: this.toBase64(ephemeralKeyPair.publicKey),
    chainKeySnapshot: this.toBase64(senderKeyState.chainKey),
    chainIndex: chainIndex
  };
}

  async getMessageKeyForHistory(
    contactId: string,
    messageNumber: number
  ): Promise<Uint8Array | null> {
    const cacheKey = `${contactId}`;
    const keys = this.messageKeysCache.get(cacheKey);
    
    if (!keys) return null;
    
    const keyData = keys.find(k => k.keyIndex === messageNumber);
    return keyData ? keyData.messageKey : null;
  }

  async encryptMessageWithHistory(contactId: string, plaintext: string): Promise<{
    ciphertext: string;
    ephemeralKey: string;
    nonce: string;
    messageNumber: number;
    previousChainN: number;
    ratchetId: string;
    messageKeyData: MessageKeyData;
  }> {
    this.ensureReady();

    const state = this.ratchetStates.get(contactId);
    if (!state) {
      throw new Error('Ratchet state not initialized');
    }
  
    if (!state.ratchetId) {
      state.ratchetId = this.generateRatchetId();
      this.saveRatchetStateToSession(contactId);
    }
  
    const currentMessageNumber = state.sendMessageNumber;
    const previousChainN = state.recvMessageNumber;
    const currentEphemeralKey = this.toBase64(state.dhRatchetPublic);
    const currentRatchetId = state.ratchetId;
    
    const chainKeySnapshot = new Uint8Array(state.sendingChainKey);

    const messageKey = sodium.crypto_generichash(32, 
      new Uint8Array([...state.sendingChainKey, currentMessageNumber])
    );
    
    const messageKeyData = await this.saveMessageKeyForHistory(
      contactId,
      currentMessageNumber,
      messageKey,
      chainKeySnapshot
    );
  
    state.sendingChainKey = sodium.crypto_generichash(32, state.sendingChainKey);
  
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    const cipher = sodium.crypto_secretbox_easy(plaintext, nonce, messageKey);
    
    state.sendMessageNumber++;
    if (state.sendMessageNumber > 0 && state.sendMessageNumber % 50 === 0) {
      const newDHKeyPair = sodium.crypto_box_keypair();
      
      const dhOutput = sodium.crypto_scalarmult(
        newDHKeyPair.privateKey,
        state.remotePublicKey!
      );
      
      state.rootKey = sodium.crypto_generichash(32, 
        new Uint8Array([...state.rootKey, ...dhOutput, 1])
      );
      
      state.sendingChainKey = sodium.crypto_generichash(32, 
        new Uint8Array([...state.rootKey, 3])
      );
      
      state.dhRatchetPrivate = newDHKeyPair.privateKey;
      state.dhRatchetPublic = newDHKeyPair.publicKey;
    }
    
    this.ratchetStates.set(contactId, state);
    this.saveRatchetStateToSession(contactId);
    
    return {
      ciphertext: this.toBase64(cipher),
      ephemeralKey: currentEphemeralKey,
      nonce: this.toBase64(nonce),
      messageNumber: currentMessageNumber,
      previousChainN: previousChainN,
      ratchetId: currentRatchetId,
      messageKeyData
    };
  }

  async decryptHistoricalMessage(
    contactId: string,
    ciphertext: string,
    nonce: string,
    messageNumber: number
  ): Promise<string> {
    this.ensureReady();
    
    const messageKey = await this.getMessageKeyForHistory(contactId, messageNumber);
    if (!messageKey) {
      throw new Error('Message key not found in history');
    }
    
    const cipher = this.fromBase64(ciphertext);
    const nonceBytes = this.fromBase64(nonce);
    const decrypted = sodium.crypto_secretbox_open_easy(cipher, nonceBytes, messageKey);
    
    if (!decrypted) throw new Error('Decryption failed');
    
    return new TextDecoder().decode(decrypted);
  }

  async decryptMessage(
    contactId: string,
    ciphertext: string,
    ephemeralKey: string,
    nonce: string,
    messageNumber: number,
    ratchetId?: string 
  ): Promise<string> {      
    this.ensureReady();
    let state = this.ratchetStates.get(contactId);
    if (!state) {
      throw new Error('Ratchet state not initialized');
    }
    if (!state) throw new Error('Ratchet state not initialized');
    
    const remoteEphemeralKey = this.fromBase64(ephemeralKey);
    const isNewRatchet = ratchetId && state.ratchetId && ratchetId !== state.ratchetId;
    const isKeyChanged = !state.remotePublicKey || !this.arraysEqual(state.remotePublicKey, remoteEphemeralKey);
    
    if (isNewRatchet) {
      const dhOutput = sodium.crypto_scalarmult(
        state.dhRatchetPrivate,
        remoteEphemeralKey
      );
      
      state.rootKey = sodium.crypto_generichash(32, dhOutput);
      state.receivingChainKey = sodium.crypto_generichash(32, 
        new Uint8Array([...state.rootKey, 2])
      );
      state.remotePublicKey = remoteEphemeralKey;
      state.recvMessageNumber = 0; 
      state.ratchetId = ratchetId; 
    
      const newDHKeyPair = sodium.crypto_box_keypair();
      state.dhRatchetPrivate = newDHKeyPair.privateKey;
      state.dhRatchetPublic = newDHKeyPair.publicKey;
      state.sendMessageNumber = 0;

      this.messageKeysCache.delete(contactId);      
    }
    else if (isKeyChanged) {
      const dhOutput1 = sodium.crypto_scalarmult(
        state.dhRatchetPrivate,
        remoteEphemeralKey
      );
      
      state.rootKey = sodium.crypto_generichash(32, 
        new Uint8Array([...state.rootKey, ...dhOutput1, 1])
      );
      
      state.receivingChainKey = sodium.crypto_generichash(32, 
        new Uint8Array([...state.rootKey, 2])
      );
      
      state.remotePublicKey = remoteEphemeralKey;
      state.recvMessageNumber = 0;
      
      const newDHKeyPair = sodium.crypto_box_keypair();
      const dhOutput2 = sodium.crypto_scalarmult(
        newDHKeyPair.privateKey,
        remoteEphemeralKey
      );
      
      state.rootKey = sodium.crypto_generichash(32, 
        new Uint8Array([...state.rootKey, ...dhOutput2, 1])
      );
      
      state.sendingChainKey = sodium.crypto_generichash(32, 
        new Uint8Array([...state.rootKey, 3])
      );
      
      state.dhRatchetPrivate = newDHKeyPair.privateKey;
      state.dhRatchetPublic = newDHKeyPair.publicKey;
      state.sendMessageNumber = 0;
    }

    if (messageNumber < state.recvMessageNumber) {
      const cachedKey = await this.getMessageKeyForHistory(contactId, messageNumber);
      if (!cachedKey) {
        throw new Error(`Missing key for message ${messageNumber}`);
      }
      
      const cipher = this.fromBase64(ciphertext);
      const nonceBytes = this.fromBase64(nonce);
      const decrypted = sodium.crypto_secretbox_open_easy(cipher, nonceBytes, cachedKey);
      
      if (!decrypted) throw new Error('Decryption failed');
      return new TextDecoder().decode(decrypted);
    }
  
    while (state.recvMessageNumber < messageNumber) {
      const chainKeySnapshot = new Uint8Array(state.receivingChainKey);
      const skippedMessageKey = sodium.crypto_generichash(32, 
        new Uint8Array([...state.receivingChainKey, state.recvMessageNumber])
      );
      
      await this.saveMessageKeyForHistory(
        contactId,
        state.recvMessageNumber,
        skippedMessageKey,
        chainKeySnapshot
      );
      
      state.receivingChainKey = sodium.crypto_generichash(32, state.receivingChainKey);
      state.recvMessageNumber++;
    }
  
    const chainKeySnapshot = new Uint8Array(state.receivingChainKey);
    const messageKey = sodium.crypto_generichash(32, 
      new Uint8Array([...state.receivingChainKey, messageNumber])
    );
  
    await this.saveMessageKeyForHistory(
      contactId,
      messageNumber,
      messageKey,
      chainKeySnapshot
    );

    state.receivingChainKey = sodium.crypto_generichash(32, state.receivingChainKey);
    state.recvMessageNumber++;
  
    try {
      const cipher = this.fromBase64(ciphertext);
      const nonceBytes = this.fromBase64(nonce);
      const decrypted = sodium.crypto_secretbox_open_easy(cipher, nonceBytes, messageKey);
      
      if (!decrypted) throw new Error('Decryption failed');
      
      this.ratchetStates.set(contactId, state);
      this.saveRatchetStateToSession(contactId);
      
      return new TextDecoder().decode(decrypted);
    } catch (error) {
      throw error;
    }
  }

  async cleanupOldMessageKeys(contactId: string, keepLast: number = 100): Promise<void> {
    const keys = this.messageKeysCache.get(contactId);
    if (!keys || keys.length <= keepLast) return;
    
    keys.sort((a, b) => a.keyIndex - b.keyIndex);
    const toKeep = keys.slice(-keepLast);
    this.messageKeysCache.set(contactId, toKeep);
  }

  async importMessageKeyFromServer(
    contactId: string,
    userId: string,
    encryptedKey: string,
    chainKeySnapshot: string,
    messageNumber: number
  ): Promise<void> {
    this.ensureReady();
    
    const userKeys = this.getKeys();
    if (!userKeys) throw new Error('No user keys available');
    
    const derivedKey = sodium.crypto_generichash(32, 
      new Uint8Array([...userKeys.xPrivateKey, ...new TextEncoder().encode(userId)])
    );
    
    const encryptedData = this.fromBase64(encryptedKey);
    const nonce = encryptedData.slice(0, sodium.crypto_secretbox_NONCEBYTES);
    const cipher = encryptedData.slice(sodium.crypto_secretbox_NONCEBYTES);
    
    const messageKey = sodium.crypto_secretbox_open_easy(cipher, nonce, derivedKey);
    if (!messageKey) throw new Error('Failed to decrypt message key');
    
    await this.saveMessageKeyForHistory(
      contactId,
      messageNumber,
      messageKey,
      this.fromBase64(chainKeySnapshot)
    );
  }

  exportMessageKeysForServer(contactId: string, userId: string): {
    messageNumber: number;
    encryptedKey: string;
    chainKeySnapshot: string;
  } | null {
    const keys = this.messageKeysCache.get(contactId);
    if (!keys || keys.length === 0) {
      return null;
    }
    
    const userKeys = this.getKeys();
    if (!userKeys) throw new Error('No user keys available');
    
    const lastKey = keys[keys.length - 1];
    
    const derivedKey = sodium.crypto_generichash(32, 
      new Uint8Array([...userKeys.xPrivateKey, ...new TextEncoder().encode(userId)])
    );
    
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    const encrypted = sodium.crypto_secretbox_easy(
      lastKey.messageKey,
      nonce,
      derivedKey
    );
    
    return {
      messageNumber: lastKey.keyIndex,
      encryptedKey: this.toBase64(new Uint8Array([...nonce, ...encrypted])),
      chainKeySnapshot: this.toBase64(lastKey.chainKeySnapshot)
    };
  }

  storeKeys(keys: Omit<StoredKeys, 'timestamp'>) {
    this.keys = {
      ...keys,
      timestamp: Date.now()
    };
    this.keysLoaded = true;
  }

  hasKeysLoaded(): boolean {
    return this.keysLoaded;
  }

  private saveRatchetStateToSession(contactId: string) {
    const stateJson = this.exportRatchetState(contactId);
    if (stateJson) {
      sessionStorage.setItem(`ratchet_${contactId}`, stateJson);
    }
  }

  loadRatchetStateFromSession(contactId: string): boolean {
    const stateJson = sessionStorage.getItem(`ratchet_${contactId}`);
    if (stateJson) {
      try {
        this.importRatchetState(contactId, stateJson);
        return true;
      } catch (error) {
        return false;
      }
    }
    return false;
  }

  getKeys(): StoredKeys | null {
    return this.keys;
  }

  clearKeys() {
    this.keys = null;
    this.keysLoaded = false;
    this.ratchetStates.clear();
    this.senderKeys.clear();
    this.receivedSenderKeys.clear();
    this.messageKeysCache.clear();
    
    sessionStorage.removeItem('e2ee_keys_password');
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('ratchet_')) {
        sessionStorage.removeItem(key);
      }
    });
  }

  hasKeys(): boolean {
    return this.keys !== null;
  }

  getPrivateKey(): Uint8Array | null {
    return this.keys?.xPrivateKey || null;
  }

  getPublicKey(): Uint8Array | null {
    return this.keys?.xPublicKey || null;
  }

  generateMnemonic(strength = 256): string {
    return bip39.generateMnemonic(strength);
  }

  async mnemonicToSeed32(mnemonic: string, passphrase = ''): Promise<Uint8Array> {
    this.ensureReady();
    const seed = await bip39.mnemonicToSeed(mnemonic, passphrase);
    return new Uint8Array(seed.slice(0, 32));
  }

  async keypairFromSeed32(seed32: Uint8Array) {
    await sodium.ready;
    const kp = sodium.crypto_sign_seed_keypair(seed32);
    return {
      edPublicKey: new Uint8Array(kp.publicKey),
      edPrivateKey: new Uint8Array(kp.privateKey),
    };
  }

  async convertEdToX(edPublicKey: Uint8Array, edPrivateKey: Uint8Array) {
    this.ensureReady();
    const xPublic = sodium.crypto_sign_ed25519_pk_to_curve25519(edPublicKey);
    const xPrivate = sodium.crypto_sign_ed25519_sk_to_curve25519(edPrivateKey);
    return {
      xPublicKey: new Uint8Array(xPublic),
      xPrivateKey: new Uint8Array(xPrivate),
    };
  }

  toBase64(u8: Uint8Array): string {
    return sodium.to_base64(u8, sodium.base64_variants.ORIGINAL);
  }

  fromBase64(b64: string): Uint8Array {
    return sodium.from_base64(b64, sodium.base64_variants.ORIGINAL);
  }

  async createEncryptedBackupAndDownload(
    edPrivateKey: Uint8Array, 
    mnemonic: string, 
    password: string | null
  ) {
    this.ensureReady();

    const payload = {
      version: 1,
      createdAt: new Date().toISOString(),
      mnemonic,
      edPrivateKey: this.toBase64(edPrivateKey)
    };

    const payloadStr = JSON.stringify(payload);

    const pw = password || '';
    const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
    const opslimit = sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE;
    const memlimit = sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE;

    const key = sodium.crypto_pwhash(
      sodium.crypto_secretbox_KEYBYTES,
      pw,
      salt,
      opslimit,
      memlimit,
      sodium.crypto_pwhash_ALG_DEFAULT
    );

    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    const cipher = sodium.crypto_secretbox_easy(payloadStr, nonce, key);

    const backupJson = {
      version: 1,
      salt: this.toBase64(salt),
      nonce: this.toBase64(nonce),
      opslimit,
      memlimit,
      ciphertext: this.toBase64(cipher),
    };

    const blob = new Blob([JSON.stringify(backupJson)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `e2ee-backup-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async decryptBackup(backupJson: any, password: string) {
    this.ensureReady();
    const salt = this.fromBase64(backupJson.salt);
    const nonce = this.fromBase64(backupJson.nonce);
    const cipher = this.fromBase64(backupJson.ciphertext);
    const opslimit = backupJson.opslimit;
    const memlimit = backupJson.memlimit;

    const key = sodium.crypto_pwhash(
      sodium.crypto_secretbox_KEYBYTES,
      password,
      salt,
      opslimit,
      memlimit,
      sodium.crypto_pwhash_ALG_DEFAULT
    );

    const decrypted = sodium.crypto_secretbox_open_easy(cipher, nonce, key);
    if (!decrypted) throw new Error('Invalid password or corrupted backup');

    const decoder = new TextDecoder();
    const payloadStr = decoder.decode(decrypted);
    return JSON.parse(payloadStr);
  }

  async restoreKeysFromBackup(backupJson: any, password: string) {
    try {
      const decrypted = await this.decryptBackup(backupJson, password);
      
      const mnemonic = decrypted.mnemonic;
      const seed32 = await this.mnemonicToSeed32(mnemonic);
      const ed = await this.keypairFromSeed32(seed32);
      const x = await this.convertEdToX(ed.edPublicKey, ed.edPrivateKey);
      
      this.storeKeys({
        edPrivateKey: ed.edPrivateKey,
        xPrivateKey: x.xPrivateKey,
        xPublicKey: x.xPublicKey,
        mnemonic: mnemonic
      });

    } catch (error) {
      throw error;
    }
  }

  async generateSignedPreKey(edPrivateKey: Uint8Array): Promise<{
    publicKey: string;
    privateKey: Uint8Array;
    signature: string;
  }> {
    this.ensureReady();
    const keyPair = sodium.crypto_box_keypair();
    const signature = sodium.crypto_sign_detached(keyPair.publicKey, edPrivateKey);
    
    return {
      publicKey: this.toBase64(keyPair.publicKey),
      privateKey: keyPair.privateKey,
      signature: this.toBase64(signature),
    };
  }

  async generateOneTimePreKeys(count: number): Promise<Array<{
    publicKey: string;
    privateKey: Uint8Array;
  }>> {
    this.ensureReady();
    const keys: Array<{ publicKey: string; privateKey: Uint8Array }> = [];
    for (let i = 0; i < count; i++) {
      const keyPair = sodium.crypto_box_keypair();
      keys.push({
        publicKey: this.toBase64(keyPair.publicKey),
        privateKey: keyPair.privateKey,
      });
    }
    return keys;
  }

  async initRatchetAsSender(
    contactId: string,
    myXPrivate: Uint8Array,
    theirXPublic: Uint8Array,
    theirSignedPreKey: Uint8Array
  ): Promise<Uint8Array> {
    this.ensureReady();
    
    const ephemeralKeyPair = sodium.crypto_box_keypair();
    
    const dh1 = sodium.crypto_scalarmult(myXPrivate, theirSignedPreKey);
    const dh2 = sodium.crypto_scalarmult(ephemeralKeyPair.privateKey, theirXPublic);
    const dh3 = sodium.crypto_scalarmult(ephemeralKeyPair.privateKey, theirSignedPreKey);
    
    const info = new Uint8Array([...dh1, ...dh2, ...dh3]);
    const rootKey = sodium.crypto_generichash(32, info);
    
    const sendingChainKey = sodium.crypto_generichash(32, new Uint8Array([...rootKey, 1]));
    
    const ratchetId = this.generateRatchetId();
    
    this.ratchetStates.set(contactId, {
      rootKey,
      sendingChainKey,
      receivingChainKey: new Uint8Array(32),
      sendMessageNumber: 0,
      recvMessageNumber: 0,
      dhRatchetPrivate: ephemeralKeyPair.privateKey,
      dhRatchetPublic: ephemeralKeyPair.publicKey,
      remotePublicKey: theirXPublic,
      ratchetId,
    });
    
    this.saveRatchetStateToSession(contactId);
    return ephemeralKeyPair.publicKey;
  }  

  async initRatchetAsReceiver(
    contactId: string,
    myXPrivate: Uint8Array,
    theirXPublic: Uint8Array,
    theirEphemeralKey: Uint8Array,
    mySignedPreKeyPrivate: Uint8Array
  ): Promise<void> {
    this.ensureReady();
    
    if (this.ratchetStates.has(contactId)) {
      return;
    }
    
    const dh1 = sodium.crypto_scalarmult(mySignedPreKeyPrivate, theirXPublic);
    const dh2 = sodium.crypto_scalarmult(myXPrivate, theirEphemeralKey);
    const dh3 = sodium.crypto_scalarmult(mySignedPreKeyPrivate, theirEphemeralKey);
    
    const info = new Uint8Array([...dh1, ...dh2, ...dh3]);
    const rootKey = sodium.crypto_generichash(32, info);
    
    const receivingChainKey = sodium.crypto_generichash(32, new Uint8Array([...rootKey, 1]));
    
    const newDHKeyPair = sodium.crypto_box_keypair();
    
    const ratchetId = this.generateRatchetId();
    
    this.ratchetStates.set(contactId, {
      rootKey,
      sendingChainKey: new Uint8Array(32),
      receivingChainKey,
      sendMessageNumber: 0,
      recvMessageNumber: 0,
      dhRatchetPrivate: newDHKeyPair.privateKey,
      dhRatchetPublic: newDHKeyPair.publicKey,
      remotePublicKey: theirEphemeralKey,
      ratchetId,
    });
    
    this.saveRatchetStateToSession(contactId);
  }

  async generateSenderKey(groupId: string): Promise<{
    chainKey: Uint8Array;
    senderKeyId: string;
    generationId: number;
  }> {
    this.ensureReady();
    
    const chainKey = sodium.randombytes_buf(32);
    const senderKeyId = this.generateUUID();
    const generationId = 0;
    
    const state: SenderKeyState = {
      chainKey,
      generationId,
      chainIndex: 0,
      senderKeyId,
    };
    
    this.senderKeys.set(groupId, state);    
    return { chainKey, senderKeyId, generationId };
  }

  async encryptSenderKeyForMember(
    senderKeyBundle: {
      chainKey: Uint8Array;
      senderKeyId: string;
      generationId: number;
    },
    memberPublicKey: Uint8Array
  ): Promise<{
    ephemeralKey: string;
    encryptedData: string;
    nonce: string;
  }> {
    this.ensureReady();
    
    const keys = this.getKeys();
    if (!keys) throw new Error('No keys available');
    
    const ephemeralKeyPair = sodium.crypto_box_keypair();
    
    const sharedSecret = sodium.crypto_scalarmult(
      ephemeralKeyPair.privateKey,
      memberPublicKey
    );
    
    const encKey = sodium.crypto_generichash(32, sharedSecret);
    
    const bundle = JSON.stringify({
      chainKey: this.toBase64(senderKeyBundle.chainKey),
      senderKeyId: senderKeyBundle.senderKeyId,
      generationId: senderKeyBundle.generationId,
    });
    
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    const cipher = sodium.crypto_secretbox_easy(bundle, nonce, encKey);
    
    return {
      ephemeralKey: this.toBase64(ephemeralKeyPair.publicKey),
      encryptedData: this.toBase64(cipher),
      nonce: this.toBase64(nonce),
    };
  }

  async decryptSenderKeyFromMember(
    ephemeralKey: string,
    encryptedData: string,
    nonce: string,
    groupId: string,
    senderId: string
  ): Promise<void> {
    this.ensureReady();
    
    const keys = this.getKeys();
    if (!keys) throw new Error('No keys available');
    
    const ephemeralPubKey = this.fromBase64(ephemeralKey);
    
    const sharedSecret = sodium.crypto_scalarmult(
      keys.xPrivateKey,
      ephemeralPubKey
    );
    
    const encKey = sodium.crypto_generichash(32, sharedSecret);
    
    const cipher = this.fromBase64(encryptedData);
    const nonceBytes = this.fromBase64(nonce);
    const decrypted = sodium.crypto_secretbox_open_easy(cipher, nonceBytes, encKey);
    
    if (!decrypted) throw new Error('Failed to decrypt sender key');
    
    const bundle = JSON.parse(new TextDecoder().decode(decrypted));
    
    if (!this.receivedSenderKeys.has(groupId)) {
      this.receivedSenderKeys.set(groupId, new Map());
    }
    
    this.receivedSenderKeys.get(groupId)!.set(senderId, {
      chainKey: this.fromBase64(bundle.chainKey),
      generationId: bundle.generationId,
      chainIndex: 0,
      senderKeyId: bundle.senderKeyId,
    });
  }

  async encryptGroupMessage(groupId: string, plaintext: string): Promise<{
    ciphertext: string;
    nonce: string;
    senderKeyId: string;
    chainIndex: number;
  }> {
    this.ensureReady();
    
    const state = this.senderKeys.get(groupId);
    if (!state) throw new Error('Sender key not initialized for group');
    
    const messageKey = sodium.crypto_generichash(
      32,
      new Uint8Array([...state.chainKey, state.chainIndex])
    );
    
    state.chainKey = sodium.crypto_generichash(32, state.chainKey);
    const currentIndex = state.chainIndex;
    state.chainIndex++;
    
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    const cipher = sodium.crypto_secretbox_easy(plaintext, nonce, messageKey);
    
    this.senderKeys.set(groupId, state);
    
    return {
      ciphertext: this.toBase64(cipher),
      nonce: this.toBase64(nonce),
      senderKeyId: state.senderKeyId,
      chainIndex: currentIndex,
    };
  }

  async decryptGroupMessage(
    groupId: string,
    senderId: string,
    ciphertext: string,
    nonce: string,
    senderKeyId: string,
    chainIndex: number
  ): Promise<string> {
    this.ensureReady();
    
    const groupKeys = this.receivedSenderKeys.get(groupId);
    if (!groupKeys) throw new Error('No keys for this group');
    
    const senderState = groupKeys.get(senderId);
    if (!senderState) throw new Error('No sender key from this user');
    
    if (senderState.senderKeyId !== senderKeyId) {
      throw new Error('Sender key ID mismatch - need to fetch new key');
    }
    
    const messageKey = sodium.crypto_generichash(
      32,
      new Uint8Array([...senderState.chainKey, chainIndex])
    );
  
    while (senderState.chainIndex <= chainIndex) {
      senderState.chainKey = sodium.crypto_generichash(32, senderState.chainKey);
      senderState.chainIndex++;
    }
    
    const cipher = this.fromBase64(ciphertext);
    const nonceBytes = this.fromBase64(nonce);
    const decrypted = sodium.crypto_secretbox_open_easy(cipher, nonceBytes, messageKey);
    
    if (!decrypted) throw new Error('Decryption failed');
    
    groupKeys.set(senderId, senderState);
    
    return new TextDecoder().decode(decrypted);
  }

  async rotateSenderKey(groupId: string): Promise<{
    chainKey: Uint8Array;
    senderKeyId: string;
    generationId: number;
  }> {
    const oldState = this.senderKeys.get(groupId);
    const newGenerationId = oldState ? oldState.generationId + 1 : 0;
    
    const chainKey = sodium.randombytes_buf(32);
    const senderKeyId = this.generateUUID();
    
    const state: SenderKeyState = {
      chainKey,
      generationId: newGenerationId,
      chainIndex: 0,
      senderKeyId,
    };
    
    this.senderKeys.set(groupId, state);
    
    return { chainKey, senderKeyId, generationId: newGenerationId };
  }

  exportRatchetState(contactId: string): string | null {
    const state = this.ratchetStates.get(contactId);
    if (!state) return null;
    
    return JSON.stringify({
      rootKey: this.toBase64(state.rootKey),
      sendingChainKey: this.toBase64(state.sendingChainKey),
      receivingChainKey: this.toBase64(state.receivingChainKey),
      sendMessageNumber: state.sendMessageNumber,
      recvMessageNumber: state.recvMessageNumber,
      dhRatchetPrivate: this.toBase64(state.dhRatchetPrivate),
      dhRatchetPublic: this.toBase64(state.dhRatchetPublic),
      remotePublicKey: state.remotePublicKey ? this.toBase64(state.remotePublicKey) : null,
      ratchetId: state.ratchetId || null,
    });
  }  

  importRatchetState(contactId: string, stateJson: string): void {
    const data = JSON.parse(stateJson);
    this.ratchetStates.set(contactId, {
      rootKey: this.fromBase64(data.rootKey),
      sendingChainKey: this.fromBase64(data.sendingChainKey),
      receivingChainKey: this.fromBase64(data.receivingChainKey),
      sendMessageNumber: data.sendMessageNumber,
      recvMessageNumber: data.recvMessageNumber,
      dhRatchetPrivate: this.fromBase64(data.dhRatchetPrivate),
      dhRatchetPublic: this.fromBase64(data.dhRatchetPublic),
      remotePublicKey: data.remotePublicKey ? this.fromBase64(data.remotePublicKey) : undefined,
      ratchetId: data.ratchetId || undefined,
    });
  }

  exportSenderKey(groupId: string): string | null {
    const state = this.senderKeys.get(groupId);
    if (!state) return null;
    
    return JSON.stringify({
      chainKey: this.toBase64(state.chainKey),
      generationId: state.generationId,
      chainIndex: state.chainIndex,
      senderKeyId: state.senderKeyId,
    });
  }

  importSenderKey(groupId: string, stateJson: string): void {
    const data = JSON.parse(stateJson);
    this.senderKeys.set(groupId, {
      chainKey: this.fromBase64(data.chainKey),
      generationId: data.generationId,
      chainIndex: data.chainIndex,
      senderKeyId: data.senderKeyId,
    });
  }

  private arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  async deriveSharedSecret(myXPrivate: Uint8Array, theirXPublic: Uint8Array) {
    this.ensureReady();
    const shared = sodium.crypto_scalarmult(myXPrivate, theirXPublic);
    return shared;
  }

  exportMessageKeyForUser(
    contactId: string,
    userPublicKey: Uint8Array
  ): {
    messageNumber: number;
    encryptedKey: string;
    chainKeySnapshot: string;
    ephemeralPublicKey: string;
  } | null {
    
    const keys = this.messageKeysCache.get(contactId);
        
    if (!keys || keys.length === 0) {
      return null;
    }
    
    const lastKey = keys[keys.length - 1];    
    const ephemeralKeyPair = sodium.crypto_box_keypair();

    const sharedSecret = sodium.crypto_scalarmult(
      ephemeralKeyPair.privateKey,
      userPublicKey
    );    
    const encryptionKey = sodium.crypto_generichash(32, sharedSecret);
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    const encrypted = sodium.crypto_secretbox_easy(
      lastKey.messageKey,
      nonce,
      encryptionKey
    );

    const result = {
      messageNumber: lastKey.keyIndex,
      encryptedKey: this.toBase64(new Uint8Array([...nonce, ...encrypted])),
      chainKeySnapshot: this.toBase64(lastKey.chainKeySnapshot),
      ephemeralPublicKey: this.toBase64(ephemeralKeyPair.publicKey)
    };

    return result;
  }

  async importMessageKeyForUser(
    encryptedKeyData: string,
    ephemeralPublicKey: string,
    myPrivateKey: Uint8Array
  ): Promise<Uint8Array> {
    this.ensureReady();
    
    const ephemeralPubKey = this.fromBase64(ephemeralPublicKey);
    
    const sharedSecret = sodium.crypto_scalarmult(
      myPrivateKey,
      ephemeralPubKey
    );
    
    const encryptionKey = sodium.crypto_generichash(32, sharedSecret);
    
    const encryptedData = this.fromBase64(encryptedKeyData);
    const nonce = encryptedData.slice(0, sodium.crypto_secretbox_NONCEBYTES);
    const cipher = encryptedData.slice(sodium.crypto_secretbox_NONCEBYTES);
    
    const messageKey = sodium.crypto_secretbox_open_easy(cipher, nonce, encryptionKey);
    
    if (!messageKey) throw new Error('Failed to decrypt message key');
    
    return messageKey;
  }

  async decryptWithKey(
    cipher: Uint8Array,
    nonce: Uint8Array,
    messageKey: Uint8Array
  ): Promise<string> {
    this.ensureReady();
    
    const decrypted = sodium.crypto_secretbox_open_easy(cipher, nonce, messageKey);
    
    if (!decrypted) throw new Error('Decryption failed');
    
    return new TextDecoder().decode(decrypted);
  }
}