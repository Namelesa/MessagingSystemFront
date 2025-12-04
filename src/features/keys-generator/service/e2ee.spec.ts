import { Buffer } from 'buffer';
(window as any).Buffer = Buffer;

import { TestBed } from '@angular/core/testing';
import { E2eeService } from './e2ee';
import sodium from 'libsodium-wrappers-sumo';
import * as bip39 from 'bip39';

describe('E2eeService', () => {
  let service: E2eeService;

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(E2eeService);
    await sodium.ready;
  });

  afterEach(() => {
    service.clearKeys();
    sessionStorage.clear();
  });

  describe('Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should throw error when libsodium not ready', () => {
      const newService = new E2eeService();
      (newService as any).ready = false;
      expect(() => (newService as any).ensureReady()).toThrowError('libsodium not ready yet');
    });

    it('should generate ratchet ID', () => {
      const ratchetId = (service as any).generateRatchetId();
      expect(ratchetId).toContain('ratchet_');
    });
  });

  describe('Key Management', () => {
    it('should store keys', () => {
      const keys = {
        edPrivateKey: new Uint8Array(64),
        xPrivateKey: new Uint8Array(32),
        xPublicKey: new Uint8Array(32),
        mnemonic: 'test mnemonic'
      };
      service.storeKeys(keys);
      expect(service.hasKeys()).toBe(true);
      expect(service.hasKeysLoaded()).toBe(true);
    });

    it('should get stored keys', () => {
      const keys = {
        edPrivateKey: new Uint8Array(64),
        xPrivateKey: new Uint8Array(32),
        xPublicKey: new Uint8Array(32),
        mnemonic: 'test mnemonic'
      };
      service.storeKeys(keys);
      const retrieved = service.getKeys();
      expect(retrieved).toBeTruthy();
      expect(retrieved?.mnemonic).toBe('test mnemonic');
    });

    it('should get private key', () => {
      const keys = {
        edPrivateKey: new Uint8Array(64),
        xPrivateKey: new Uint8Array(32).fill(1),
        xPublicKey: new Uint8Array(32),
        mnemonic: 'test'
      };
      service.storeKeys(keys);
      const pk = service.getPrivateKey();
      expect(pk).toEqual(keys.xPrivateKey);
    });

    it('should get public key', () => {
      const keys = {
        edPrivateKey: new Uint8Array(64),
        xPrivateKey: new Uint8Array(32),
        xPublicKey: new Uint8Array(32).fill(2),
        mnemonic: 'test'
      };
      service.storeKeys(keys);
      const pubKey = service.getPublicKey();
      expect(pubKey).toEqual(keys.xPublicKey);
    });

    it('should return null for private key when no keys', () => {
      expect(service.getPrivateKey()).toBeNull();
    });

    it('should return null for public key when no keys', () => {
      expect(service.getPublicKey()).toBeNull();
    });

    it('should clear all keys and states', () => {
      const keys = {
        edPrivateKey: new Uint8Array(64),
        xPrivateKey: new Uint8Array(32),
        xPublicKey: new Uint8Array(32),
        mnemonic: 'test'
      };
      service.storeKeys(keys);
      sessionStorage.setItem('ratchet_contact1', 'data');
      service.clearKeys();
      expect(service.hasKeys()).toBe(false);
      expect(service.hasKeysLoaded()).toBe(false);
      expect(sessionStorage.getItem('ratchet_contact1')).toBeNull();
    });
  });

  describe('Base64 Encoding', () => {
    it('should convert Uint8Array to base64', () => {
      const data = new Uint8Array([1, 2, 3, 4]);
      const b64 = service.toBase64(data);
      expect(typeof b64).toBe('string');
      expect(b64.length).toBeGreaterThan(0);
    });

    it('should convert base64 to Uint8Array', () => {
      const data = new Uint8Array([1, 2, 3, 4]);
      const b64 = service.toBase64(data);
      const decoded = service.fromBase64(b64);
      expect(decoded).toEqual(data);
    });
  });

  describe('Backup and Restore', () => {
    it('should create encrypted backup', async () => {
      const edPrivateKey = new Uint8Array(64).fill(1);
      const mnemonic = 'test mnemonic phrase';
      spyOn(document.body, 'appendChild');
      spyOn(document.body, 'removeChild');
      await service.createEncryptedBackupAndDownload(edPrivateKey, mnemonic, 'password123');
      expect(document.body.appendChild).toHaveBeenCalled();
    });

    it('should create encrypted backup without password', async () => {
      const edPrivateKey = new Uint8Array(64).fill(1);
      const mnemonic = 'test mnemonic phrase';
      spyOn(document.body, 'appendChild');
      await service.createEncryptedBackupAndDownload(edPrivateKey, mnemonic, null);
      expect(document.body.appendChild).toHaveBeenCalled();
    });

    it('should throw error on invalid password', async () => {
      const backupJson = {
        version: 1,
        salt: service.toBase64(sodium.randombytes_buf(16)),
        nonce: service.toBase64(sodium.randombytes_buf(24)),
        opslimit: sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        memlimit: sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        ciphertext: service.toBase64(new Uint8Array(32))
      };
      
      await expectAsync(service.decryptBackup(backupJson, 'wrong')).toBeRejected();
    });

    it('should throw error when restoring with wrong password', async () => {
      const backupJson = {
        version: 1,
        salt: service.toBase64(sodium.randombytes_buf(16)),
        nonce: service.toBase64(sodium.randombytes_buf(24)),
        opslimit: sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        memlimit: sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        ciphertext: service.toBase64(new Uint8Array(32))
      };
      
      await expectAsync(service.restoreKeysFromBackup(backupJson, 'wrong')).toBeRejected();
    });
  });

  describe('Pre-Keys', () => {
    it('should generate signed pre-key', async () => {
      const edPrivateKey = sodium.crypto_sign_keypair().privateKey;
      const preKey = await service.generateSignedPreKey(edPrivateKey);
      expect(preKey.publicKey).toBeTruthy();
      expect(preKey.privateKey).toBeTruthy();
      expect(preKey.signature).toBeTruthy();
    });

    it('should generate one-time pre-keys', async () => {
      const keys = await service.generateOneTimePreKeys(5);
      expect(keys.length).toBe(5);
      keys.forEach(key => {
        expect(key.publicKey).toBeTruthy();
        expect(key.privateKey).toBeTruthy();
      });
    });
  });

  describe('Ratchet Initialization', () => {
    let myXPrivate: Uint8Array;
    let myXPublic: Uint8Array;
    let theirXPrivate: Uint8Array;
    let theirXPublic: Uint8Array;

    beforeEach(() => {
      const myKeyPair = sodium.crypto_box_keypair();
      myXPrivate = myKeyPair.privateKey;
      myXPublic = myKeyPair.publicKey;
      
      const theirKeyPair = sodium.crypto_box_keypair();
      theirXPrivate = theirKeyPair.privateKey;
      theirXPublic = theirKeyPair.publicKey;
    });

    it('should initialize ratchet as sender', async () => {
      const signedPreKey = sodium.crypto_box_keypair();
      const ephemeral = await service.initRatchetAsSender(
        'contact1',
        myXPrivate,
        theirXPublic,
        signedPreKey.publicKey
      );
      expect(ephemeral).toBeTruthy();
      expect(ephemeral.length).toBe(32);
    });

    it('should initialize ratchet as receiver', async () => {
      const signedPreKeyPair = sodium.crypto_box_keypair();
      const ephemeralKey = sodium.crypto_box_keypair().publicKey;
      
      await service.initRatchetAsReceiver(
        'contact1',
        myXPrivate,
        theirXPublic,
        ephemeralKey,
        signedPreKeyPair.privateKey
      );
      
      const state = (service as any).ratchetStates.get('contact1');
      expect(state).toBeTruthy();
    });

    it('should not reinitialize existing ratchet as receiver', async () => {
      const signedPreKeyPair = sodium.crypto_box_keypair();
      const ephemeralKey = sodium.crypto_box_keypair().publicKey;
      
      await service.initRatchetAsReceiver(
        'contact1',
        myXPrivate,
        theirXPublic,
        ephemeralKey,
        signedPreKeyPair.privateKey
      );
      
      const stateBefore = (service as any).ratchetStates.get('contact1');
      
      await service.initRatchetAsReceiver(
        'contact1',
        myXPrivate,
        theirXPublic,
        ephemeralKey,
        signedPreKeyPair.privateKey
      );
      
      const stateAfter = (service as any).ratchetStates.get('contact1');
      expect(stateAfter).toBe(stateBefore);
    });
  });

  describe('Message Encryption and Decryption', () => {
    beforeEach(async () => {
      const myKeyPair = sodium.crypto_box_keypair();
      const theirKeyPair = sodium.crypto_box_keypair();
      const signedPreKey = sodium.crypto_box_keypair();
      
      await service.initRatchetAsSender(
        'contact1',
        myKeyPair.privateKey,
        theirKeyPair.publicKey,
        signedPreKey.publicKey
      );
    });

    it('should encrypt message with history', async () => {
      const result = await service.encryptMessageWithHistory('contact1', 'Hello');
      expect(result.ciphertext).toBeTruthy();
      expect(result.ephemeralKey).toBeTruthy();
      expect(result.nonce).toBeTruthy();
      expect(result.messageNumber).toBe(0);
      expect(result.ratchetId).toBeTruthy();
    });

    it('should generate ratchet ID on first encryption', async () => {
      const state = (service as any).ratchetStates.get('contact1');
      delete state.ratchetId;
      
      const result = await service.encryptMessageWithHistory('contact1', 'Hello');
      expect(result.ratchetId).toBeTruthy();
    });

    it('should throw error when encrypting without ratchet state', async () => {
      await expectAsync(
        service.encryptMessageWithHistory('unknown', 'Hello')
      ).toBeRejectedWithError('Ratchet state not initialized');
    });

    it('should perform DH ratchet after 50 messages', async () => {
      const state = (service as any).ratchetStates.get('contact1');
      state.sendMessageNumber = 49;
      state.remotePublicKey = sodium.crypto_box_keypair().publicKey;
      
      await service.encryptMessageWithHistory('contact1', 'Message 50');
      expect(state.sendMessageNumber).toBe(50);
    });

    it('should decrypt message with same ratchet ID', async () => {
      const myKeyPair = sodium.crypto_box_keypair();
      const theirKeyPair = sodium.crypto_box_keypair();
      const signedPreKeyPair = sodium.crypto_box_keypair();
      
      const ephemeral = await service.initRatchetAsSender(
        'sender',
        myKeyPair.privateKey,
        theirKeyPair.publicKey,
        signedPreKeyPair.publicKey
      );
      
      const encrypted = await service.encryptMessageWithHistory('sender', 'Test');
      
      await service.initRatchetAsReceiver(
        'receiver',
        theirKeyPair.privateKey,
        myKeyPair.publicKey,
        ephemeral,
        signedPreKeyPair.privateKey
      );
      
      const receiverState = (service as any).ratchetStates.get('receiver');
      receiverState.ratchetId = encrypted.ratchetId;
      
      const decrypted = await service.decryptMessage(
        'receiver',
        encrypted.ciphertext,
        encrypted.ephemeralKey,
        encrypted.nonce,
        encrypted.messageNumber,
        encrypted.ratchetId
      );
      
      expect(decrypted).toBe('Test');
    });

    it('should handle out-of-order messages', async () => {
      const myKeyPair = sodium.crypto_box_keypair();
      const theirKeyPair = sodium.crypto_box_keypair();
      const signedPreKeyPair = sodium.crypto_box_keypair();
      
      await service.initRatchetAsSender(
        'contact1',
        myKeyPair.privateKey,
        theirKeyPair.publicKey,
        signedPreKeyPair.publicKey
      );
      
      const msg1 = await service.encryptMessageWithHistory('contact1', 'First');
      const msg2 = await service.encryptMessageWithHistory('contact1', 'Second');
      
      await service.initRatchetAsReceiver(
        'receiver',
        theirKeyPair.privateKey,
        myKeyPair.publicKey,
        service.fromBase64(msg1.ephemeralKey),
        signedPreKeyPair.privateKey
      );
      
      const receiverState = (service as any).ratchetStates.get('receiver');
      receiverState.ratchetId = msg1.ratchetId;
      
      const decrypted2 = await service.decryptMessage(
        'receiver',
        msg2.ciphertext,
        msg2.ephemeralKey,
        msg2.nonce,
        msg2.messageNumber,
        msg2.ratchetId
      );
      
      const decrypted1 = await service.decryptMessage(
        'receiver',
        msg1.ciphertext,
        msg1.ephemeralKey,
        msg1.nonce,
        msg1.messageNumber,
        msg1.ratchetId
      );
      
      expect(decrypted2).toBe('Second');
      expect(decrypted1).toBe('First');
    });

    it('should throw error when missing key for old message', async () => {
      const myKeyPair = sodium.crypto_box_keypair();
      const theirKeyPair = sodium.crypto_box_keypair();
      const signedPreKeyPair = sodium.crypto_box_keypair();
      
      await service.initRatchetAsSender(
        'contact1',
        myKeyPair.privateKey,
        theirKeyPair.publicKey,
        signedPreKeyPair.publicKey
      );
      
      const state = (service as any).ratchetStates.get('contact1');
      state.recvMessageNumber = 10;
      
      await expectAsync(
        service.decryptMessage(
          'contact1',
          'cipher',
          service.toBase64(theirKeyPair.publicKey),
          'nonce',
          5
        )
      ).toBeRejectedWithError('Missing key for message 5');
    });

    it('should throw error when decryption fails', async () => {
      const myKeyPair = sodium.crypto_box_keypair();
      const theirKeyPair = sodium.crypto_box_keypair();
      const signedPreKeyPair = sodium.crypto_box_keypair();
      
      await service.initRatchetAsSender(
        'contact1',
        myKeyPair.privateKey,
        theirKeyPair.publicKey,
        signedPreKeyPair.publicKey
      );
      
      const state = (service as any).ratchetStates.get('contact1');
      state.ratchetId = 'test';
      
      await expectAsync(
        service.decryptMessage(
          'contact1',
          service.toBase64(new Uint8Array(32)),
          service.toBase64(theirKeyPair.publicKey),
          service.toBase64(new Uint8Array(24)),
          0,
          'test'
        )
      ).toBeRejected();
    });

    it('should throw error when ratchet not initialized for decryption', async () => {
      await expectAsync(
        service.decryptMessage('unknown', 'cipher', 'key', 'nonce', 0)
      ).toBeRejectedWithError('Ratchet state not initialized');
    });
  });

  describe('Historical Messages', () => {
    it('should save message key for history', async () => {
      const messageKey = new Uint8Array(32).fill(1);
      const chainKey = new Uint8Array(32).fill(2);
      
      const saved = await service.saveMessageKeyForHistory(
        'contact1',
        0,
        messageKey,
        chainKey
      );
      
      expect(saved.messageKey).toEqual(messageKey);
      expect(saved.chainKeySnapshot).toEqual(chainKey);
      expect(saved.keyIndex).toBe(0);
    });

    it('should retrieve message key from history', async () => {
      const messageKey = new Uint8Array(32).fill(1);
      const chainKey = new Uint8Array(32).fill(2);
      
      await service.saveMessageKeyForHistory('contact1', 5, messageKey, chainKey);
      const retrieved = await service.getMessageKeyForHistory('contact1', 5);
      
      expect(retrieved).toEqual(messageKey);
    });

    it('should return null when message key not found', async () => {
      const result = await service.getMessageKeyForHistory('contact1', 999);
      expect(result).toBeNull();
    });

    it('should decrypt historical message', async () => {
      const myKeyPair = sodium.crypto_box_keypair();
      const theirKeyPair = sodium.crypto_box_keypair();
      const signedPreKey = sodium.crypto_box_keypair();
      
      await service.initRatchetAsSender(
        'contact1',
        myKeyPair.privateKey,
        theirKeyPair.publicKey,
        signedPreKey.publicKey
      );
      
      const encrypted = await service.encryptMessageWithHistory('contact1', 'Historical');
      
      const decrypted = await service.decryptHistoricalMessage(
        'contact1',
        encrypted.ciphertext,
        encrypted.nonce,
        encrypted.messageNumber
      );
      
      expect(decrypted).toBe('Historical');
    });

    it('should throw error when historical key not found', async () => {
      await expectAsync(
        service.decryptHistoricalMessage('contact1', 'cipher', 'nonce', 999)
      ).toBeRejectedWithError('Message key not found in history');
    });

    it('should cleanup old message keys', async () => {
      for (let i = 0; i < 150; i++) {
        await service.saveMessageKeyForHistory(
          'contact1',
          i,
          new Uint8Array(32),
          new Uint8Array(32)
        );
      }
      
      await service.cleanupOldMessageKeys('contact1', 100);
      const keys = (service as any).messageKeysCache.get('contact1');
      expect(keys.length).toBe(100);
    });

    it('should not cleanup when below threshold', async () => {
      for (let i = 0; i < 50; i++) {
        await service.saveMessageKeyForHistory(
          'contact1',
          i,
          new Uint8Array(32),
          new Uint8Array(32)
        );
      }
      
      await service.cleanupOldMessageKeys('contact1', 100);
      const keys = (service as any).messageKeysCache.get('contact1');
      expect(keys.length).toBe(50);
    });
  });

  describe('Message Key Export/Import', () => {
    beforeEach(() => {
      const keys = {
        edPrivateKey: new Uint8Array(64),
        xPrivateKey: new Uint8Array(32).fill(1),
        xPublicKey: new Uint8Array(32).fill(2),
        mnemonic: 'test'
      };
      service.storeKeys(keys);
    });

    it('should export message keys for server', async () => {
      await service.saveMessageKeyForHistory(
        'contact1',
        0,
        new Uint8Array(32).fill(1),
        new Uint8Array(32).fill(2)
      );
      
      const exported = service.exportMessageKeysForServer('contact1', 'user123');
      expect(exported).toBeTruthy();
      expect(exported?.messageNumber).toBe(0);
      expect(exported?.encryptedKey).toBeTruthy();
      expect(exported?.chainKeySnapshot).toBeTruthy();
    });

    it('should return null when no keys to export', () => {
      const exported = service.exportMessageKeysForServer('contact1', 'user123');
      expect(exported).toBeNull();
    });

    it('should import message key from server', async () => {
      const messageKey = new Uint8Array(32).fill(5);
      const userId = 'user123';
      const userKeys = service.getKeys()!;
      
      const derivedKey = sodium.crypto_generichash(32,
        new Uint8Array([...userKeys.xPrivateKey, ...new TextEncoder().encode(userId)])
      );
      
      const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
      const encrypted = sodium.crypto_secretbox_easy(messageKey, nonce, derivedKey);
      
      const encryptedKey = service.toBase64(new Uint8Array([...nonce, ...encrypted]));
      const chainKeySnapshot = service.toBase64(new Uint8Array(32));
      
      await service.importMessageKeyFromServer(
        'contact1',
        userId,
        encryptedKey,
        chainKeySnapshot,
        10
      );
      
      const retrieved = await service.getMessageKeyForHistory('contact1', 10);
      expect(retrieved).toEqual(messageKey);
    });

    it('should throw error when importing without user keys', async () => {
      service.clearKeys();
      
      await expectAsync(
        service.importMessageKeyFromServer('contact1', 'user', 'key', 'chain', 0)
      ).toBeRejectedWithError('No user keys available');
    });
    });

    describe('Group Message Key Export', () => {
        beforeEach(async () => {
          const myKeyPair = sodium.crypto_box_keypair();
          service.storeKeys({
            edPrivateKey: new Uint8Array(64),
            xPrivateKey: myKeyPair.privateKey,
            xPublicKey: myKeyPair.publicKey,
            mnemonic: 'test'
          });
        });
      
        describe('exportMessageKeyForGroupMember', () => {
          it('should export message key for group member', async () => {
            const groupId = 'group1';
            await service.generateSenderKey(groupId);
            const memberPublicKey = sodium.crypto_box_keypair().publicKey;
            const chainIndex = 5;
      
            const result = service.exportMessageKeyForGroupMember(
              groupId,
              memberPublicKey,
              chainIndex
            );
      
            expect(result).toBeTruthy();
            expect(result?.encryptedKey).toBeTruthy();
            expect(result?.ephemeralPublicKey).toBeTruthy();
            expect(result?.chainKeySnapshot).toBeTruthy();
            expect(result?.chainIndex).toBe(chainIndex);
            expect(typeof result?.encryptedKey).toBe('string');
            expect(typeof result?.ephemeralPublicKey).toBe('string');
            expect(typeof result?.chainKeySnapshot).toBe('string');
          });
      
          it('should return null when sender key not initialized', () => {
            const groupId = 'nonexistent-group';
            const memberPublicKey = sodium.crypto_box_keypair().publicKey;
    
            const result = service.exportMessageKeyForGroupMember(
              groupId,
              memberPublicKey,
              0
            );
      
            expect(result).toBeNull();
          });
      
          it('should generate different ephemeral keys for each export', async () => {
            const groupId = 'group1';
            await service.generateSenderKey(groupId);
            const memberPublicKey = sodium.crypto_box_keypair().publicKey;
      
            const result1 = service.exportMessageKeyForGroupMember(
              groupId,
              memberPublicKey,
              0
            );
            const result2 = service.exportMessageKeyForGroupMember(
              groupId,
              memberPublicKey,
              0
            );
      
            expect(result1?.ephemeralPublicKey).not.toBe(result2?.ephemeralPublicKey);
            expect(result1?.encryptedKey).not.toBe(result2?.encryptedKey);
          });
      
          it('should handle different chain indices correctly', async () => {
            const groupId = 'group1';
            await service.generateSenderKey(groupId);
            const memberPublicKey = sodium.crypto_box_keypair().publicKey;
      
            const result1 = service.exportMessageKeyForGroupMember(
              groupId,
              memberPublicKey,
              0
            );
            const result2 = service.exportMessageKeyForGroupMember(
              groupId,
              memberPublicKey,
              10
            );
      
            expect(result1?.chainIndex).toBe(0);
            expect(result2?.chainIndex).toBe(10);
            expect(result1?.chainKeySnapshot).toBe(result2?.chainKeySnapshot);
          });
      
          it('should produce decryptable encrypted keys', async () => {
            const groupId = 'group1';
            await service.generateSenderKey(groupId);
            const memberKeyPair = sodium.crypto_box_keypair();
            const chainIndex = 3;
      
            const exported = service.exportMessageKeyForGroupMember(
              groupId,
              memberKeyPair.publicKey,
              chainIndex
            );
      
            expect(exported).toBeTruthy();
            
            const ephemeralPubKey = service.fromBase64(exported!.ephemeralPublicKey);
            const encryptedData = service.fromBase64(exported!.encryptedKey);
            
            const nonce = encryptedData.slice(0, sodium.crypto_secretbox_NONCEBYTES);
            const cipher = encryptedData.slice(sodium.crypto_secretbox_NONCEBYTES);
            
            const sharedSecret = sodium.crypto_scalarmult(
              memberKeyPair.privateKey,
              ephemeralPubKey
            );
            
            const encryptionKey = sodium.crypto_generichash(32, sharedSecret);

            expect(() => {
              const decrypted = sodium.crypto_secretbox_open_easy(
                cipher,
                nonce,
                encryptionKey
              );
              expect(decrypted).toBeTruthy();
              expect(decrypted?.length).toBe(32);
            }).not.toThrow();
          });
      
          it('should maintain same chain key snapshot for multiple exports before chain advance', async () => {
            const groupId = 'group1';
            await service.generateSenderKey(groupId);
            const member1PublicKey = sodium.crypto_box_keypair().publicKey;
            const member2PublicKey = sodium.crypto_box_keypair().publicKey;
      
            const result1 = service.exportMessageKeyForGroupMember(
              groupId,
              member1PublicKey,
              0
            );
            const result2 = service.exportMessageKeyForGroupMember(
              groupId,
              member2PublicKey,
              0
            );

            expect(result1?.chainKeySnapshot).toBe(result2?.chainKeySnapshot);
          });
      
          it('should handle maximum chain index', async () => {
            const groupId = 'group1';
            await service.generateSenderKey(groupId);
            const memberPublicKey = sodium.crypto_box_keypair().publicKey;
            const maxChainIndex = 999999;

            const result = service.exportMessageKeyForGroupMember(
              groupId,
              memberPublicKey,
              maxChainIndex
            );

            expect(result).toBeTruthy();
            expect(result?.chainIndex).toBe(maxChainIndex);
          });
      
          it('should export for multiple groups independently', async () => {
            const group1 = 'group1';
            const group2 = 'group2';
            await service.generateSenderKey(group1);
            await service.generateSenderKey(group2);
            const memberPublicKey = sodium.crypto_box_keypair().publicKey;
            const result1 = service.exportMessageKeyForGroupMember(
              group1,
              memberPublicKey,
              0
            );
            const result2 = service.exportMessageKeyForGroupMember(
              group2,
              memberPublicKey,
              0
            );

            expect(result1).toBeTruthy();
            expect(result2).toBeTruthy();
            expect(result1?.chainKeySnapshot).not.toBe(result2?.chainKeySnapshot);
          });
        });
      });

      describe('Message Key Import and Decryption', () => {
        let myKeyPair: any;
        let userKeyPair: any;
      
        beforeEach(async () => {
          myKeyPair = sodium.crypto_box_keypair();
          userKeyPair = sodium.crypto_box_keypair();
          
          service.storeKeys({
            edPrivateKey: new Uint8Array(64),
            xPrivateKey: myKeyPair.privateKey,
            xPublicKey: myKeyPair.publicKey,
            mnemonic: 'test'
          });
        });
      
        describe('importMessageKeyForUser', () => {
          it('should successfully import and decrypt message key', async () => {
            const messageKey = sodium.randombytes_buf(32);
            const ephemeralKeyPair = sodium.crypto_box_keypair();
            
            const sharedSecret = sodium.crypto_scalarmult(
              ephemeralKeyPair.privateKey,
              userKeyPair.publicKey
            );
            const encryptionKey = sodium.crypto_generichash(32, sharedSecret);
            
            const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
            const encrypted = sodium.crypto_secretbox_easy(messageKey, nonce, encryptionKey);
            const encryptedData = service.toBase64(new Uint8Array([...nonce, ...encrypted]));
            
            const imported = await service.importMessageKeyForUser(
              encryptedData,
              service.toBase64(ephemeralKeyPair.publicKey),
              userKeyPair.privateKey
            );

            expect(imported).toEqual(messageKey);
            expect(imported.length).toBe(32);
          });
      
          it('should throw error when decryption fails', async () => {
            const wrongKeyPair = sodium.crypto_box_keypair();
            const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
            const cipher = sodium.randombytes_buf(32);
            const encryptedData = service.toBase64(new Uint8Array([...nonce, ...cipher]));

            await expectAsync(
              service.importMessageKeyForUser(
                encryptedData,
                service.toBase64(wrongKeyPair.publicKey),
                userKeyPair.privateKey
              )
            ).toBeRejected();
          });
      
          it('should work end-to-end with exportMessageKeyForUser', async () => {
            await service.saveMessageKeyForHistory(
              'contact1',
              0,
              new Uint8Array(32).fill(5),
              new Uint8Array(32).fill(2)
            );

            const exported = service.exportMessageKeyForUser('contact1', userKeyPair.publicKey);
            expect(exported).toBeTruthy();

            const imported = await service.importMessageKeyForUser(
              exported!.encryptedKey,
              exported!.ephemeralPublicKey,
              userKeyPair.privateKey
            );

            expect(imported).toEqual(new Uint8Array(32).fill(5));
          });
        });
      
        describe('decryptWithKey', () => {
          it('should decrypt message with provided key', async () => {
            const plaintext = 'Test message';
            const messageKey = sodium.randombytes_buf(32);
            const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
            const cipher = sodium.crypto_secretbox_easy(plaintext, nonce, messageKey);
            
            const decrypted = await service.decryptWithKey(cipher, nonce, messageKey);
 
            expect(decrypted).toBe(plaintext);
          });
      
          it('should throw error when decryption fails with wrong key', async () => {
            const plaintext = 'Test message';
            const correctKey = sodium.randombytes_buf(32);
            const wrongKey = sodium.randombytes_buf(32);
            const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
            const cipher = sodium.crypto_secretbox_easy(plaintext, nonce, correctKey);

            await expectAsync(
              service.decryptWithKey(cipher, nonce, wrongKey)
            ).toBeRejected();
          });
      
          it('should throw error with invalid nonce', async () => {
            const messageKey = sodium.randombytes_buf(32);
            const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
            const cipher = sodium.crypto_secretbox_easy('test', nonce, messageKey);
            const wrongNonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);

            await expectAsync(
              service.decryptWithKey(cipher, wrongNonce, messageKey)
            ).toBeRejected();
          });
        });
      });

      describe('Message Decryption - Additional Coverage', () => {
        let myKeyPair: any;
        let theirKeyPair: any;
        let signedPreKeyPair: any;
      
        beforeEach(async () => {
          myKeyPair = sodium.crypto_box_keypair();
          theirKeyPair = sodium.crypto_box_keypair();
          signedPreKeyPair = sodium.crypto_box_keypair();
        });
      
        it('should handle new ratchet ID (isNewRatchet branch) - coverage test', async () => {
          const ratchetId = 'old_ratchet_id';
          const newRatchetId = 'new_ratchet_id';
 
          const receiverDHKeyPair = sodium.crypto_box_keypair();
          const state: any = {
            rootKey: sodium.randombytes_buf(32),
            sendingChainKey: sodium.randombytes_buf(32),
            receivingChainKey: sodium.randombytes_buf(32),
            sendMessageNumber: 0,
            recvMessageNumber: 0,
            dhRatchetPrivate: receiverDHKeyPair.privateKey,
            dhRatchetPublic: receiverDHKeyPair.publicKey,
            remotePublicKey: theirKeyPair.publicKey,
            ratchetId: ratchetId
          };
          
          (service as any).ratchetStates.set('contact1', state);
          
          const senderEphemeralKeyPair = sodium.crypto_box_keypair();

          const dhOutput = sodium.crypto_scalarmult(
            receiverDHKeyPair.privateKey,
            senderEphemeralKeyPair.publicKey
          );
          const newRootKey = sodium.crypto_generichash(32, dhOutput);
          const newReceivingChainKey = sodium.crypto_generichash(32, 
            new Uint8Array([...newRootKey, 2])
          );
        
          const messageKey = sodium.crypto_generichash(32, 
            new Uint8Array([...newReceivingChainKey, 0])
          );
          
          const plaintext = 'Test message';
          const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
          const cipher = sodium.crypto_secretbox_easy(plaintext, nonce, messageKey);

          const decrypted = await service.decryptMessage(
            'contact1',
            service.toBase64(cipher),
            service.toBase64(senderEphemeralKeyPair.publicKey),
            service.toBase64(nonce),
            0,
            newRatchetId 
          );
          
          expect(decrypted).toBe(plaintext);
          expect(state.ratchetId).toBe(newRatchetId);
          expect(state.recvMessageNumber).toBe(1);
        });
      
        it('should handle key change without ratchet ID change (isKeyChanged branch)', async () => {
          const ratchetId = 'same_ratchet_id';

          const receiverDHKeyPair = sodium.crypto_box_keypair();
          const oldSenderEphemeralKey = sodium.crypto_box_keypair().publicKey;
          
          const state: any = {
            rootKey: sodium.randombytes_buf(32),
            sendingChainKey: sodium.randombytes_buf(32),
            receivingChainKey: sodium.randombytes_buf(32),
            sendMessageNumber: 0,
            recvMessageNumber: 0,
            dhRatchetPrivate: receiverDHKeyPair.privateKey,
            dhRatchetPublic: receiverDHKeyPair.publicKey,
            remotePublicKey: oldSenderEphemeralKey, 
            ratchetId: ratchetId
          };
          
          (service as any).ratchetStates.set('contact1', state);

          const newSenderEphemeralKeyPair = sodium.crypto_box_keypair();

          const dhOutput1 = sodium.crypto_scalarmult(
            receiverDHKeyPair.privateKey,
            newSenderEphemeralKeyPair.publicKey
          );
          let tempRootKey = sodium.crypto_generichash(32, 
            new Uint8Array([...state.rootKey, ...dhOutput1, 1])
          );
          let tempReceivingChainKey = sodium.crypto_generichash(32, 
            new Uint8Array([...tempRootKey, 2])
          );

          const newReceiverDHKeyPair = sodium.crypto_box_keypair();
          const dhOutput2 = sodium.crypto_scalarmult(
            newReceiverDHKeyPair.privateKey,
            newSenderEphemeralKeyPair.publicKey
          );
          tempRootKey = sodium.crypto_generichash(32, 
            new Uint8Array([...tempRootKey, ...dhOutput2, 1])
          );
          tempReceivingChainKey = sodium.crypto_generichash(32, 
            new Uint8Array([...tempRootKey, 2])
          );

          const dhOutput1_actual = sodium.crypto_scalarmult(
            state.dhRatchetPrivate,
            newSenderEphemeralKeyPair.publicKey
          );
          const newRootKey1 = sodium.crypto_generichash(32, 
            new Uint8Array([...state.rootKey, ...dhOutput1_actual, 1])
          );
          const newReceivingChainKey = sodium.crypto_generichash(32, 
            new Uint8Array([...newRootKey1, 2])
          );

          const messageKey = sodium.crypto_generichash(32, 
            new Uint8Array([...newReceivingChainKey, 0])
          );
          
          const plaintext = 'Test with key change';
          const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
          const cipher = sodium.crypto_secretbox_easy(plaintext, nonce, messageKey);

          const decrypted = await service.decryptMessage(
            'contact1',
            service.toBase64(cipher),
            service.toBase64(newSenderEphemeralKeyPair.publicKey),
            service.toBase64(nonce),
            0,
            ratchetId
          );
          
          expect(decrypted).toBe(plaintext);
        });
      
        it('should throw error when decryption fails in main try block', async () => {
          await service.initRatchetAsSender(
            'contact1',
            myKeyPair.privateKey,
            theirKeyPair.publicKey,
            signedPreKeyPair.publicKey
          );
          
          const state = (service as any).ratchetStates.get('contact1');
          state.ratchetId = 'test-ratchet';
          
          const invalidCipher = service.toBase64(new Uint8Array(16).fill(255));
          const validNonce = service.toBase64(sodium.randombytes_buf(24));
          
          await expectAsync(
            service.decryptMessage(
              'contact1',
              invalidCipher,
              service.toBase64(state.dhRatchetPublic),
              validNonce,
              0,
              'test-ratchet'
            )
          ).toBeRejected();
        });
      
        it('should throw error when decrypting old message fails', async () => {
          await service.initRatchetAsSender(
            'contact1',
            myKeyPair.privateKey,
            theirKeyPair.publicKey,
            signedPreKeyPair.publicKey
          );
          
          const state = (service as any).ratchetStates.get('contact1');
          state.ratchetId = 'test';
          state.recvMessageNumber = 10;
          
          await service.saveMessageKeyForHistory(
            'contact1',
            5,
            new Uint8Array(32).fill(99),
            new Uint8Array(32)
          );
          
          const invalidCipher = service.toBase64(new Uint8Array(48));
          const validNonce = service.toBase64(sodium.randombytes_buf(24));
          
          await expectAsync(
            service.decryptMessage(
              'contact1',
              invalidCipher,
              service.toBase64(theirKeyPair.publicKey),
              validNonce,
              5,
              'test'
            )
          ).toBeRejected();
        });
      });

      describe('Ratchet State Session Storage', () => {
        beforeEach(async () => {
          const myKeyPair = sodium.crypto_box_keypair();
          const theirKeyPair = sodium.crypto_box_keypair();
          const signedPreKey = sodium.crypto_box_keypair();
          
          await service.initRatchetAsSender(
            'contact1',
            myKeyPair.privateKey,
            theirKeyPair.publicKey,
            signedPreKey.publicKey
          );
        });
      
        it('should load ratchet state from session storage', () => {
          const contactId = 'contact1';
          
          service['saveRatchetStateToSession'](contactId);

          (service as any).ratchetStates.delete(contactId);

          const result = service.loadRatchetStateFromSession(contactId);
          
          expect(result).toBe(true);
          expect((service as any).ratchetStates.has(contactId)).toBe(true);
        });
      
        it('should return false when loading non-existent ratchet state', () => {
          const result = service.loadRatchetStateFromSession('nonexistent');
          
          expect(result).toBe(false);
        });
      
        it('should return false when loading invalid JSON from session', () => {
          const contactId = 'invalid-contact';
          sessionStorage.setItem(`ratchet_${contactId}`, 'invalid json {{{');
          
          const result = service.loadRatchetStateFromSession(contactId);
          
          expect(result).toBe(false);
        });
      });
      
      describe('Key Management - Additional Coverage', () => {
        it('should return keys when they exist', () => {
          const keys = {
            edPrivateKey: new Uint8Array(64),
            xPrivateKey: new Uint8Array(32),
            xPublicKey: new Uint8Array(32),
            mnemonic: 'test mnemonic'
          };
          
          service.storeKeys(keys);
          const retrieved = service.getKeys();
          
          expect(retrieved).toBeTruthy();
          expect(retrieved?.mnemonic).toBe('test mnemonic');
        });
      
        it('should return null when no keys are stored', () => {
          service.clearKeys();
          const retrieved = service.getKeys();
          
          expect(retrieved).toBeNull();
        });
      });

      describe('Mnemonic and Key Conversion', () => {
        const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      
        describe('keypairFromSeed32', () => {
          it('should generate Ed25519 keypair from seed', async () => {
            const seed = new Uint8Array(32).fill(5);
            const keypair = await service.keypairFromSeed32(seed);
            
            expect(keypair.edPublicKey).toBeTruthy();
            expect(keypair.edPrivateKey).toBeTruthy();
            expect(keypair.edPublicKey.length).toBe(32);
            expect(keypair.edPrivateKey.length).toBe(64);
          });
      
          it('should produce same keypair from same seed', async () => {
            const seed = new Uint8Array(32).fill(7);
            const keypair1 = await service.keypairFromSeed32(seed);
            const keypair2 = await service.keypairFromSeed32(seed);
            
            expect(keypair1.edPublicKey).toEqual(keypair2.edPublicKey);
            expect(keypair1.edPrivateKey).toEqual(keypair2.edPrivateKey);
          });
        });
      
        describe('convertEdToX', () => {
          it('should convert Ed25519 keys to Curve25519', async () => {
            const seed = new Uint8Array(32).fill(3);
            const edKeys = await service.keypairFromSeed32(seed);
            const xKeys = await service.convertEdToX(edKeys.edPublicKey, edKeys.edPrivateKey);
            
            expect(xKeys.xPublicKey).toBeTruthy();
            expect(xKeys.xPrivateKey).toBeTruthy();
            expect(xKeys.xPublicKey.length).toBe(32);
            expect(xKeys.xPrivateKey.length).toBe(32);
          });
      
          it('should produce consistent conversion', async () => {
            const seed = new Uint8Array(32).fill(4);
            const edKeys = await service.keypairFromSeed32(seed);
            const xKeys1 = await service.convertEdToX(edKeys.edPublicKey, edKeys.edPrivateKey);
            const xKeys2 = await service.convertEdToX(edKeys.edPublicKey, edKeys.edPrivateKey);
            
            expect(xKeys1.xPublicKey).toEqual(xKeys2.xPublicKey);
            expect(xKeys1.xPrivateKey).toEqual(xKeys2.xPrivateKey);
          });
        });
      
        describe('Full key derivation flow', () => {
          it('should derive complete key set from seed', async () => {
            const seed = new Uint8Array(32).fill(9);
            const edKeys = await service.keypairFromSeed32(seed);
            const xKeys = await service.convertEdToX(edKeys.edPublicKey, edKeys.edPrivateKey);
            
            service.storeKeys({
              edPrivateKey: edKeys.edPrivateKey,
              xPrivateKey: xKeys.xPrivateKey,
              xPublicKey: xKeys.xPublicKey,
              mnemonic: TEST_MNEMONIC
            });
            
            expect(service.hasKeys()).toBe(true);
            expect(service.getKeys()?.mnemonic).toBe(TEST_MNEMONIC);
            expect(service.getKeys()?.edPrivateKey).toEqual(edKeys.edPrivateKey);
            expect(service.getKeys()?.xPublicKey).toEqual(xKeys.xPublicKey);
          });
        });

        it('should return null if the messageNumber is not found', async () => {
          (service as any).messageKeysCache.set('contact1', [
            { messageKey: new Uint8Array([1, 2, 3]), chainKeySnapshot: new Uint8Array([9]), keyIndex: 1 },
            { messageKey: new Uint8Array([4, 5, 6]), chainKeySnapshot: new Uint8Array([8]), keyIndex: 2 }
          ]);
        
          const result = await service.getMessageKeyForHistory('contact1', 99);
        
          expect(result).toBeNull();
        });

        it('should throw "Decryption failed" when sodium fails to decrypt', async () => {
          const contactId = 'user1';
          const messageNumber = 1;
        
          spyOn(sodium, 'crypto_secretbox_open_easy').and.returnValue(null);

          (service as any).messageKeysCache.set(contactId, [
            {
              messageKey: new Uint8Array(32).fill(9),
              chainKeySnapshot: new Uint8Array([1]),
              keyIndex: messageNumber
            }
          ]);

          const badCipher = sodium.to_base64(new Uint8Array(24));
          const badNonce = sodium.to_base64(new Uint8Array(24));
        
          await expectAsync(
            service.decryptHistoricalMessage(contactId, badCipher, badNonce, messageNumber)
          ).toBeRejectedWithError('Decryption failed');
        });

        it('throws "Ratchet state not initialized" when ratchet state is missing (forced ready + cleared map)', async () => {
          const contactId = 'missing_contact';

          (service as any).ready = true;

          (service as any).ratchetStates = new Map();

          expect((service as any).ratchetStates.has(contactId)).toBeFalse();
        
          const fakeCipher = sodium.to_base64(new Uint8Array(24));
          const fakeEphemeral = sodium.to_base64(new Uint8Array(32));
          const fakeNonce = sodium.to_base64(new Uint8Array(24));
        
          await expectAsync(
            service.decryptMessage(
              contactId,
              fakeCipher,
              fakeEphemeral,
              fakeNonce,
              1
            )
          ).toBeRejectedWithError('Ratchet state not initialized');
        });
      });
      describe('decryptWithKey', () => {
        it('should throw "Decryption failed" when secretbox returns null', async () => {
          (service as any).isReady = true;

          const messageKey = new Uint8Array(sodium.crypto_secretbox_KEYBYTES);
          const nonce = new Uint8Array(sodium.crypto_secretbox_NONCEBYTES);
          const cipher = new Uint8Array(48);

          spyOn(sodium, 'crypto_secretbox_open_easy').and.returnValue(null);
      
          await expectAsync(
            service.decryptWithKey(cipher, nonce, messageKey)
          ).toBeRejectedWithError('Decryption failed');
        });
      });
      describe('importMessageKeyForUser', () => {
        it('should throw "Failed to decrypt message key" when secretbox returns null', async () => {
          (service as any).isReady = true;
      
          const myPrivateKey = sodium.crypto_kx_keypair().privateKey;
          const ephemeralPubKey = sodium.crypto_kx_keypair().publicKey;
      
          const encryptedKeyData = service.toBase64(new Uint8Array(48));
          const ephemeralPublicKeyBase64 = service.toBase64(ephemeralPubKey);

          spyOn(sodium, 'crypto_secretbox_open_easy').and.returnValue(null);
      
          await expectAsync(
            service.importMessageKeyForUser(
              encryptedKeyData,
              ephemeralPublicKeyBase64,
              myPrivateKey
            )
          ).toBeRejectedWithError('Failed to decrypt message key');
        });
      });
      
      describe('deriveSharedSecret', () => {
        it('should derive shared secret with valid keys', async () => {
          (service as any).isReady = true;

          const myPair = sodium.crypto_kx_keypair();
          const theirPair = sodium.crypto_kx_keypair();
      
          const shared = await service.deriveSharedSecret(
            myPair.privateKey,
            theirPair.publicKey
          );
      
          expect(shared).toBeTruthy();
          expect(shared instanceof Uint8Array).toBeTrue();
          expect(shared.length).toBe(32);
        });
      
        it('should throw when keys are invalid (crypto_scalarmult error)', async () => {
          (service as any).isReady = true;
      
          const badPrivate = new Uint8Array([1, 2, 3]);
          const badPublic = new Uint8Array([4, 5, 6]); 
      
          await expectAsync(
            service.deriveSharedSecret(badPrivate, badPublic)
          ).toBeRejected();
        });
      });
      
      describe('exportMessageKeyForUser', () => {
        it('should return null when no message keys exist for contact', () => {
          const contactId = 'user123';
      
          const result = service.exportMessageKeyForUser(
            contactId,
            new Uint8Array(32)
          );
      
          expect(result).toBeNull();
        });
      });      

      describe('arraysEqual', () => {
        it('should return false when arrays have different lengths', () => {
          const a = new Uint8Array([1, 2, 3]);
          const b = new Uint8Array([1, 2]);
      
          const result = (service as any).arraysEqual(a, b);
      
          expect(result).toBeFalse();
        });
      });

      describe('importSenderKey', () => {
        it('should store sender key state in senderKeys map', () => {
          const groupId = 'group123';
      
          const stateJson = JSON.stringify({
            chainKey: btoa(String.fromCharCode(...new Uint8Array([1, 2, 3, 4]))),
            generationId: 5,
            chainIndex: 10,
            senderKeyId: 77,
          });
      
          service.importSenderKey(groupId, stateJson);
      
          const stored = (service as any).senderKeys.get(groupId);
      
          expect(stored).toBeTruthy();
          expect(stored.chainKey instanceof Uint8Array).toBeTrue();
          expect(stored.generationId).toBe(5);
          expect(stored.chainIndex).toBe(10);
          expect(stored.senderKeyId).toBe(77);
        });
      });
      
      describe('exportSenderKey', () => {
        it('should return null when no sender key exists for the group', () => {
          const result = service.exportSenderKey('ghostGroup');
      
          expect(result).toBeNull();
        });

        it('should export sender key when state exists', () => {
          const groupId = 'group123';
        
          const state = {
            chainKey: new Uint8Array([1, 2, 3, 4]),
            generationId: 5,
            chainIndex: 10,
            senderKeyId: 20,
          };
        
          (service as any).senderKeys.set(groupId, state);
          const result = service.exportSenderKey(groupId);
          expect(result).toBeTruthy();
          const parsed = JSON.parse(result!);
          expect(parsed.chainKey).toBe(service.toBase64(state.chainKey));
          expect(parsed.generationId).toBe(5);
          expect(parsed.chainIndex).toBe(10);
          expect(parsed.senderKeyId).toBe(20);
        });        
      });

      describe('importRatchetState', () => {
        it('should set undefined for remotePublicKey and ratchetId when they are missing', () => {
          const contactId = 'user123';
          const stateJson = JSON.stringify({
            rootKey: btoa('aaa'),
            sendingChainKey: btoa('bbb'),
            receivingChainKey: btoa('ccc'),
            sendMessageNumber: 5,
            recvMessageNumber: 7,
            dhRatchetPrivate: btoa('ddd'),
            dhRatchetPublic: btoa('eee')
          });
      
          service.importRatchetState(contactId, stateJson);
      
          const state = (service as any).ratchetStates.get(contactId);
      
          expect(state).toBeTruthy();
      
          expect(state.remotePublicKey).toBeUndefined();
          expect(state.ratchetId).toBeUndefined();
        });

        it('should return null when ratchet state does not exist', () => {
          const result = service.exportRatchetState('unknownUser');
        
          expect(result).toBeNull();
        });

        it('should export ratchet state with remotePublicKey and ratchetId set to null when missing', () => {
          const contactId = 'user123';
        
          const mockState = {
            rootKey: new Uint8Array([1]),
            sendingChainKey: new Uint8Array([2]),
            receivingChainKey: new Uint8Array([3]),
            sendMessageNumber: 10,
            recvMessageNumber: 20,
            dhRatchetPrivate: new Uint8Array([4]),
            dhRatchetPublic: new Uint8Array([5]),
          };
        
          (service as any).ratchetStates.set(contactId, mockState);
        
          const res = service.exportRatchetState(contactId);
          expect(res).toBeTruthy();
        
          const parsed = JSON.parse(res!);
        
          expect(parsed.remotePublicKey).toBeNull(); 
          expect(parsed.ratchetId).toBeNull();       
        });
      });      
      
      it('should rotate sender key for a new group (generationId = 0)', async () => {
        const groupId = 'groupA';
      
        spyOn(service as any, 'generateUUID').and.returnValue('uuid-123');
        spyOn(sodium, 'randombytes_buf').and.returnValue(new Uint8Array(32));
      
        const result = await service.rotateSenderKey(groupId);
      
        expect(result).toBeTruthy();
        expect(result.generationId).toBe(0);
        expect(result.senderKeyId).toBe('uuid-123');
        expect(result.chainKey.length).toBe(32);
      
        const state = (service as any).senderKeys.get(groupId);
        expect(state).toBeTruthy();
        expect(state.generationId).toBe(0);
        expect(state.chainIndex).toBe(0);
      });

      it('should rotate sender key again and increment generationId', async () => {
        const groupId = 'groupA';

        (service as any).senderKeys.set(groupId, {
          chainKey: new Uint8Array([1,2,3]),
          generationId: 5,
          chainIndex: 0,
          senderKeyId: 'old-id'
        });
      
        spyOn(service as any, 'generateUUID').and.returnValue('uuid-999');
        spyOn(sodium, 'randombytes_buf').and.returnValue(new Uint8Array(32));
      
        const result = await service.rotateSenderKey(groupId);
      
        expect(result.generationId).toBe(6);
        expect(result.senderKeyId).toBe('uuid-999');
        expect(result.chainKey.length).toBe(32);
        const updated = (service as any).senderKeys.get(groupId);
        expect(updated.generationId).toBe(6);
        expect(updated.chainIndex).toBe(0);
      });
    
      describe('decryptMessage – decryption failed (history branch)', () => {
        it('should throw "Decryption failed" for old message', async () => {
          const contactId = 'c1';
      
          (service as any).ratchetStates.set(contactId, {
            rootKey: new Uint8Array(32),
            sendingChainKey: new Uint8Array(32),
            receivingChainKey: new Uint8Array(32),
            sendMessageNumber: 0,
            recvMessageNumber: 5,
            dhRatchetPrivate: new Uint8Array(32),
            dhRatchetPublic: new Uint8Array(32),
            remotePublicKey: new Uint8Array(32),
            ratchetId: '1',
          });
      
          spyOn(service as any, 'getMessageKeyForHistory')
            .and.returnValue(Promise.resolve(new Uint8Array(32)));
      
          spyOn(sodium, 'crypto_secretbox_open_easy').and.returnValue(null);
      
          await expectAsync(
            service.decryptMessage(
              contactId,
              service.toBase64(new Uint8Array(32)),
              service.toBase64(new Uint8Array(32)),
              service.toBase64(new Uint8Array(24)),
              1                                    
            )
          ).toBeRejectedWithError('Decryption failed');
        });
      });

      describe('decryptMessage – decryption failed (normal branch)', () => {
        it('should throw "Decryption failed" in final decrypt step', async () => {
          const contactId = 'c2';
      
          (service as any).ratchetStates.set(contactId, {
            rootKey: new Uint8Array(32),
            sendingChainKey: new Uint8Array(32),
            receivingChainKey: new Uint8Array(32),
            sendMessageNumber: 0,
            recvMessageNumber: 0,
            dhRatchetPrivate: new Uint8Array(32),
            dhRatchetPublic: new Uint8Array(32),
            remotePublicKey: new Uint8Array(32),
            ratchetId: '1',
          });
      
          spyOn(sodium, 'crypto_secretbox_open_easy').and.returnValue(null);
      
          await expectAsync(
            service.decryptMessage(
              contactId,
              service.toBase64(new Uint8Array(32)),   
              service.toBase64(new Uint8Array(32)),   
              service.toBase64(new Uint8Array(24)),   
              0                                       
            )
          ).toBeRejectedWithError('Decryption failed');
        });
      });

      describe('cleanupOldMessageKeys', () => {
        it('should return early when keys.length <= keepLast (default 100)', async () => {
          const contactId = 'test-contact';
      
          const hundredKeys = Array.from({ length: 100 }, (_, i) => ({
            keyIndex: i,
            key: new Uint8Array([i]),
            chainKeySnapshot: new Uint8Array([i])
          }));
      
          (service as any).messageKeysCache.set(contactId, hundredKeys);

          const setSpy = spyOn((service as any).messageKeysCache, 'set');
      
          await service.cleanupOldMessageKeys(contactId);
      
          expect(setSpy).not.toHaveBeenCalled();        
          expect((service as any).messageKeysCache.get(contactId))
            .toBe(hundredKeys);                       
        });
      });

      it('should throw "Failed to decrypt message key" when decryption fails', async () => {
        const contactId = 'contact1';
        const userId = 'user1';
      
        spyOn(service, 'getKeys').and.returnValue({
          xPrivateKey: new Uint8Array([1, 2, 3, 4]),
          edPrivateKey: new Uint8Array([5, 6, 7, 8]),
          xPublicKey: new Uint8Array([9, 10, 11, 12]),
          mnemonic: 'test mnemonic',
          timestamp: Date.now()
        });
      
        const encryptedKey = btoa("AAAAAAAAAAAAAAAAAAAAAAAABBBBBBBBBBBBBBBBBBBB"); 
        const chainKeySnapshot = btoa("xyz");
      
        spyOn(sodium, 'crypto_secretbox_open_easy').and.returnValue(null);
      
        await expectAsync(
          service.importMessageKeyFromServer(
            contactId,
            userId,
            encryptedKey,
            chainKeySnapshot,
            5
          )
        ).toBeRejectedWithError('Failed to decrypt message key');
      });

      it('should throw "No user keys available" when user keys are missing', () => {
        const contactId = 'contact1';
        const userId = 'user123';
    
        service.messageKeysCache.set(contactId, [
          { keyIndex: 0, messageKey: new Uint8Array([1, 2, 3]), chainKeySnapshot: new Uint8Array([9, 9, 9]) }
        ]);
      
        spyOn(service, 'getKeys').and.returnValue(null);
      
        expect(() => service.exportMessageKeysForServer(contactId, userId))
          .toThrowError('No user keys available');
      });
      
      describe('decryptGroupMessage', () => {
        const groupId = 'group1';
        const senderId = 'userA';
      
        beforeEach(() => {
          service.receivedSenderKeys.clear();
        });
      
        it('should throw "No keys for this group" when no group keys exist', async () => {
          await expectAsync(
            service.decryptGroupMessage(groupId, senderId, 'aaa', 'bbb', 'id1', 0)
          ).toBeRejectedWithError('No keys for this group');
        });
      
        it('should throw "No sender key from this user" when group exists but sender missing', async () => {
          service.receivedSenderKeys.set(groupId, new Map());
      
          await expectAsync(
            service.decryptGroupMessage(groupId, senderId, 'aaa', 'bbb', 'id1', 0)
          ).toBeRejectedWithError('No sender key from this user');
        });
      
        it('should throw "Sender key ID mismatch - need to fetch new key"', async () => {
          const groupKeys = new Map();
          groupKeys.set(senderId, {
            senderKeyId: 'correct-id',
            chainKey: new Uint8Array([1, 1, 1]),
            chainIndex: 0
          });
          service.receivedSenderKeys.set(groupId, groupKeys);
      
          await expectAsync(
            service.decryptGroupMessage(groupId, senderId, 'aaa', 'bbb', 'wrong-id', 0)
          ).toBeRejectedWithError('Sender key ID mismatch - need to fetch new key');
        });
      
        it('should throw "Decryption failed" when secretbox_open_easy returns null', async () => {
          const groupKeys = new Map();
          groupKeys.set(senderId, {
            senderKeyId: 'key-1',
            chainKey: new Uint8Array([1, 2, 3]),
            chainIndex: 0
          });
          service.receivedSenderKeys.set(groupId, groupKeys);
      
          spyOn(sodium, 'crypto_secretbox_open_easy').and.returnValue(null);
      
          spyOn(service, 'fromBase64').and.returnValue(new Uint8Array([9, 9, 9]));
      
          await expectAsync(
            service.decryptGroupMessage(groupId, senderId, 'ccc', 'ddd', 'key-1', 0)
          ).toBeRejectedWithError('Decryption failed');
        });
      
        it('should decrypt successfully and update chainKey/chainIndex', async () => {
          const initialChainKey = new Uint8Array([10, 10, 10]);
          const groupKeys = new Map();
          groupKeys.set(senderId, {
            senderKeyId: 'key-123',
            chainKey: initialChainKey,
            chainIndex: 0
          });
          service.receivedSenderKeys.set(groupId, groupKeys);
      
          const decryptedContent = new Uint8Array([100, 101, 102]);
      
          spyOn(service, 'fromBase64').and.returnValue(new Uint8Array([9, 9, 9]));
          spyOn(sodium, 'crypto_secretbox_open_easy').and.returnValue(decryptedContent);
      
          const result = await service.decryptGroupMessage(
            groupId,
            senderId,
            'cipher',
            'nonce',
            'key-123',
            2
          );
      
          expect(result).toBe('def');
      
          const updated = service.receivedSenderKeys.get(groupId)!.get(senderId);
      
          expect(updated).toBeDefined(); 
          expect(updated?.chainIndex).toBe(3);
          expect(updated?.chainKey).toBeTruthy();
        });
      });      

      describe('encryptGroupMessage', () => {
        const groupId = 'group-123';
      
        beforeEach(() => {
          service.senderKeys.clear();
        });
      
        it('should throw "Sender key not initialized for group" when no sender key exists', async () => {
          await expectAsync(
            service.encryptGroupMessage(groupId, 'hello')
          ).toBeRejectedWithError('Sender key not initialized for group');
        });
      
        it('should encrypt message, update chainKey and chainIndex, and return valid structure', async () => {
          const initialState = {
            chainKey: new Uint8Array([1, 2, 3]),
            generationId: 0,
            chainIndex: 5,
            senderKeyId: 'sender-key-xyz'
          };
      
          service.senderKeys.set(groupId, { ...initialState });
      
          const fakeMessageKey = new Uint8Array([9, 9, 9, 9]);
          spyOn(sodium, 'crypto_generichash').and.callFake((len: number, data: Uint8Array) => {
            if (data.length === initialState.chainKey.length + 1) {
              return fakeMessageKey;
            }
            return new Uint8Array([7, 7, 7]);
          });
      
          const fakeNonce = new Uint8Array([4, 4, 4]);
          const fakeCipher = new Uint8Array([5, 5, 5]);
      
          spyOn(sodium, 'randombytes_buf').and.returnValue(fakeNonce);
          spyOn(sodium, 'crypto_secretbox_easy').and.returnValue(fakeCipher);
          spyOn(service, 'toBase64').and.callFake(arr => `b64(${Array.from(arr).join(',')})`);
      
          const result = await service.encryptGroupMessage(groupId, 'hello');
      
          expect(result).toEqual({
            ciphertext: 'b64(5,5,5)',
            nonce: 'b64(4,4,4)',
            senderKeyId: initialState.senderKeyId,
            chainIndex: initialState.chainIndex
          });
      
          const updated = service.senderKeys.get(groupId)!;
          expect(updated.chainKey).toEqual(new Uint8Array([7, 7, 7])); 
          expect(updated.chainIndex).toBe(initialState.chainIndex + 1);
        });
      });   
      
      describe('decryptSenderKeyFromMember', () => {
        const groupId = 'group-1';
        const senderId = 'user-123';
      
        beforeEach(() => {
          service.receivedSenderKeys.clear();
          spyOn(service as any, 'ensureReady').and.callFake(() => {});
        });
      
        it('should throw "No keys available" when user has no keys', async () => {
          spyOn(service, 'getKeys').and.returnValue(null);
      
          await expectAsync(
            service.decryptSenderKeyFromMember('a', 'b', 'c', groupId, senderId)
          ).toBeRejectedWithError('No keys available');
        });
      
        it('should throw "Failed to decrypt sender key" when decryption fails', async () => {
          spyOn(service, 'getKeys').and.returnValue({
            xPrivateKey: new Uint8Array([1]),
            edPrivateKey: new Uint8Array([2, 3, 4, 5]),
            xPublicKey: new Uint8Array([6, 7, 8, 9]), 
            mnemonic: 'test mnemonic', 
            timestamp: Date.now() 
          });
      
          spyOn(service, 'fromBase64').and.returnValue(new Uint8Array([9, 9, 9]));
          spyOn(sodium, 'crypto_scalarmult').and.returnValue(new Uint8Array([5, 5, 5]));
          spyOn(sodium, 'crypto_generichash').and.returnValue(new Uint8Array([7, 7, 7]));
          spyOn(sodium, 'crypto_secretbox_open_easy').and.returnValue(null);
      
          await expectAsync(
            service.decryptSenderKeyFromMember('ek', 'ed', 'n', groupId, senderId)
          ).toBeRejectedWithError('Failed to decrypt sender key');
        });
      
        it('should create group map if not exists and store sender key', async () => {
          spyOn(service, 'getKeys').and.returnValue({
            xPrivateKey: new Uint8Array([1]),
            edPrivateKey: new Uint8Array([2, 3, 4, 5]),
            xPublicKey: new Uint8Array([6, 7, 8, 9]),
            mnemonic: 'test mnemonic', 
            timestamp: Date.now()
          });
      
          spyOn(service, 'fromBase64').and.callFake(b64 => {
            if (b64 === 'chain') return new Uint8Array([8, 8, 8]);
            return new Uint8Array([3, 3, 3]);
          });
      
          spyOn(sodium, 'crypto_scalarmult').and.returnValue(new Uint8Array([4, 4, 4]));
          spyOn(sodium, 'crypto_generichash').and.returnValue(new Uint8Array([2, 2, 2]));
      
          const decryptedJson = JSON.stringify({
            chainKey: 'chain',
            generationId: 12,
            senderKeyId: 'SK-999'
          });
      
          spyOn(sodium, 'crypto_secretbox_open_easy').and.returnValue(
            new TextEncoder().encode(decryptedJson)
          );
      
          await service.decryptSenderKeyFromMember('ek', 'ed', 'n', groupId, senderId);
      
          expect(service.receivedSenderKeys.has(groupId)).toBeTrue();
      
          const senderState =
            service.receivedSenderKeys.get(groupId)!.get(senderId)!;
      
          expect(senderState).toEqual({
            chainKey: new Uint8Array([8, 8, 8]),
            generationId: 12,
            chainIndex: 0,
            senderKeyId: 'SK-999'
          });
        });
      });      

      describe('encryptSenderKeyForMember', () => {
        const senderKeyBundle = {
          chainKey: new Uint8Array([1, 2, 3]),
          senderKeyId: 'SK-123',
          generationId: 5
        };
      
        const memberPublicKey = new Uint8Array([9, 9, 9]);
      
        beforeEach(() => {
          spyOn(service as any, 'ensureReady').and.callFake(() => {});
        });
      
        it('should throw "No keys available" if getKeys returns null', async () => {
          spyOn(service, 'getKeys').and.returnValue(null);
      
          await expectAsync(
            service.encryptSenderKeyForMember(senderKeyBundle, memberPublicKey)
          ).toBeRejectedWithError('No keys available');
        });
      
        it('should generate ephemeral keypair, derive sharedSecret, encrypt and return data', async () => {
          spyOn(service, 'getKeys').and.returnValue({
            xPrivateKey: new Uint8Array([1]),
            edPrivateKey: new Uint8Array([2, 3, 4, 5]), 
            xPublicKey: new Uint8Array([6, 7, 8, 9]), 
            mnemonic: 'test mnemonic', 
            timestamp: Date.now()
          });

          const fakePriv = new Uint8Array([10, 10, 10]);
          const fakePub = new Uint8Array([11, 11, 11]);
      
          spyOn(sodium, 'crypto_box_keypair').and.returnValue({
            privateKey: fakePriv,
            publicKey: fakePub
          });

          spyOn(sodium, 'crypto_scalarmult').and.returnValue(
            new Uint8Array([5, 5, 5])
          );

          spyOn(sodium, 'crypto_generichash').and.returnValue(
            new Uint8Array([6, 6, 6])
          );
      
          spyOn(service, 'toBase64').and.callFake((value: Uint8Array) => {
            if (value === fakePub) return 'PUB';
            if (value[0] === 50) return 'CIPHER'; 
            if (value[0] === 77) return 'NONCE';
            if (value[0] === 1) return 'CHAINKEY';
            return 'BASE64';
          });

          const fakeNonce = new Uint8Array([77, 77, 77]);
      
          spyOn(sodium, 'randombytes_buf').and.returnValue(fakeNonce);
          const fakeCipher = new Uint8Array([50, 50, 50]); 
      
          spyOn(sodium, 'crypto_secretbox_easy').and.returnValue(fakeCipher);
      
          const result = await service.encryptSenderKeyForMember(
            senderKeyBundle,
            memberPublicKey
          );

          expect(sodium.crypto_box_keypair).toHaveBeenCalled();
          expect(sodium.crypto_scalarmult).toHaveBeenCalledWith(fakePriv, memberPublicKey);
          expect(sodium.crypto_generichash).toHaveBeenCalled();
          expect(sodium.crypto_secretbox_easy).toHaveBeenCalled();
          expect(sodium.randombytes_buf).toHaveBeenCalled();
          expect(result).toEqual({
            ephemeralKey: 'PUB',
            encryptedData: 'CIPHER',
            nonce: 'NONCE'
          });
        });
      });      

      describe('decryptBackup', () => {
        beforeEach(() => {
          spyOn(service as any, 'ensureReady').and.callFake(() => {});
        });
      
        it('should throw "Invalid password or corrupted backup" when decrypted = null', async () => {
          const mockBackup = {
            salt: 'AAA',
            nonce: 'BBB',
            ciphertext: 'CCC',
            opslimit: 2,
            memlimit: 3
          };
      
          spyOn(service, 'fromBase64').and.returnValues(
            new Uint8Array([1]),
            new Uint8Array([2]),
            new Uint8Array([3])
          );
      
          spyOn(sodium, 'crypto_pwhash').and.returnValue(new Uint8Array([9]));
          spyOn(sodium, 'crypto_secretbox_open_easy').and.returnValue(null);
      
          await expectAsync(
            service.decryptBackup(mockBackup, 'password123')
          ).toBeRejectedWithError('Invalid password or corrupted backup');
        });
      
        it('should return parsed JSON when decrypt succeeds', async () => {
          const mockBackup = {
            salt: 'AAA',
            nonce: 'BBB',
            ciphertext: 'CCC',
            opslimit: 2,
            memlimit: 3
          };
      
          spyOn(service, 'fromBase64').and.returnValues(
            new Uint8Array([1]),
            new Uint8Array([2]),
            new Uint8Array([3])
          );
      
          spyOn(sodium, 'crypto_pwhash').and.returnValue(new Uint8Array([9]));
      
          const decryptedPayload = new TextEncoder().encode(
            JSON.stringify({ mnemonic: 'test seed phrase' })
          );
      
          spyOn(sodium, 'crypto_secretbox_open_easy').and.returnValue(decryptedPayload);
      
          const result = await service.decryptBackup(mockBackup, 'password123');
      
          expect(result).toEqual({ mnemonic: 'test seed phrase' });
        });
      });

      describe('restoreKeysFromBackup', () => {
        beforeEach(() => {
          spyOn(service as any, 'ensureReady').and.callFake(() => {});
        });
      
        it('should restore keys when backup is valid', async () => {
          const mockBackup = { salt: 'S', nonce: 'N', ciphertext: 'C' };
      
          spyOn(service, 'decryptBackup').and.returnValue(
            Promise.resolve({ mnemonic: 'mn test phrase' })
          );
      
          spyOn(service, 'mnemonicToSeed32').and.returnValue(
            Promise.resolve(new Uint8Array([1, 2, 3]))
          );
          spyOn(service, 'keypairFromSeed32').and.returnValue(
            Promise.resolve({
              edPublicKey: new Uint8Array([9]),
              edPrivateKey: new Uint8Array([8])
            })
          );
          spyOn(service, 'convertEdToX').and.returnValue(
            Promise.resolve({
              xPrivateKey: new Uint8Array([7]),
              xPublicKey: new Uint8Array([6])
            })
          );
      
          const storeSpy = spyOn(service, 'storeKeys').and.callFake(() => {});
      
          await service.restoreKeysFromBackup(mockBackup, 'password123');
      
          expect(storeSpy).toHaveBeenCalledWith({
            edPrivateKey: new Uint8Array([8]),
            xPrivateKey: new Uint8Array([7]),
            xPublicKey: new Uint8Array([6]),
            mnemonic: 'mn test phrase'
          });
        });
      
        it('should rethrow error from decryptBackup', async () => {
          spyOn(service, 'decryptBackup').and.throwError('WRONG');
      
          await expectAsync(
            service.restoreKeysFromBackup({}, 'pass')
          ).toBeRejectedWithError('WRONG');
        });
      });  

      it('generateMnemonic(256) should return a valid 24-word mnemonic', () => {
        const mnemonic = service.generateMnemonic(256);
        expect(typeof mnemonic).toBe('string');
        const words = mnemonic.trim().split(/\s+/);
        expect(words.length).toBe(24);
        words.forEach(w => {
          expect(/^[a-z]+$/i.test(w)).toBeTrue();
        });
        expect(bip39.validateMnemonic(mnemonic)).toBeTrue();
      });
      
      it('should use default strength = 256 when no argument is provided', () => {
        const mnemonic = service.generateMnemonic();
      
        expect(mnemonic).toBeTruthy();
      
        const words = mnemonic.trim().split(/\s+/);
        expect(words.length).toBe(24);
      });
    
      it('mnemonicToSeed32 should derive a correct 32-byte seed', async () => {
        await sodium.ready;
        const mnemonic =
          'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      
        const seed32 = await service.mnemonicToSeed32(mnemonic);
        expect(seed32 instanceof Uint8Array).toBeTrue();
        expect(seed32.length).toBe(32);
        const hex = Array.from(seed32)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        expect(hex.startsWith('5eb00b')).toBeTrue();

        const seedAgain = await service.mnemonicToSeed32(mnemonic);
        expect(Array.from(seedAgain)).toEqual(Array.from(seed32));
      });       
});
