import { TestBed } from '@angular/core/testing';
import { OtoMessagesService } from './oto-messages.api';
import { SignalRConnectionRegistryService } from '../../../../shared/realtime';
import { E2eeService } from '../../../../features/keys-generator';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import * as signalR from '@microsoft/signalr';

describe('OtoMessagesService', () => {
  let service: OtoMessagesService;
  let registrySpy: jasmine.SpyObj<SignalRConnectionRegistryService>;
  let e2eeSpy: jasmine.SpyObj<E2eeService>;
  let httpSpy: jasmine.SpyObj<HttpClient>;
  let connectionSpy: jasmine.SpyObj<signalR.HubConnection>;

  beforeEach(() => {
    connectionSpy = jasmine.createSpyObj('HubConnection', ['invoke'], { state: signalR.HubConnectionState.Connected });

    registrySpy = jasmine.createSpyObj('SignalRConnectionRegistryService', ['getConnection', 'waitForConnection']);
    registrySpy.getConnection.and.returnValue(connectionSpy);
    registrySpy.waitForConnection.and.returnValue(Promise.resolve(connectionSpy));

    e2eeSpy = jasmine.createSpyObj('E2eeService', [
      'exportRatchetState',
      'loadRatchetStateFromSession',
      'getKeys',
      'fromBase64',
      'initRatchetAsSender',
      'encryptMessageWithHistory',
      'exportMessageKeyForUser',
      'importMessageKeyForUser',
      'decryptWithKey'
    ]);

    httpSpy = jasmine.createSpyObj('HttpClient', ['get', 'post']);

    TestBed.configureTestingModule({
      providers: [
        OtoMessagesService,
        { provide: SignalRConnectionRegistryService, useValue: registrySpy },
        { provide: E2eeService, useValue: e2eeSpy },
        { provide: HttpClient, useValue: httpSpy }
      ]
    });

    service = TestBed.inject(OtoMessagesService);
    service.setCurrentUserId('user1');
  });

  it('should create service', () => {
    expect(service).toBeTruthy();
  });

  describe('initializeE2EESession', () => {
    it('returns if state exists in memory', async () => {
      e2eeSpy.exportRatchetState.and.returnValue('fakeState');
      await service.initializeE2EESession('nick');
      expect(e2eeSpy.initRatchetAsSender).not.toHaveBeenCalled();
    });
    
    it('loads from session if memory empty', async () => {
      e2eeSpy.exportRatchetState.and.returnValue(null);
      e2eeSpy.loadRatchetStateFromSession.and.returnValue(true);
      await service.initializeE2EESession('nick');
      expect(e2eeSpy.initRatchetAsSender).not.toHaveBeenCalled();
    });

    it('initializes ratchet if no state', async () => {
      e2eeSpy.exportRatchetState.and.returnValue(null);
      e2eeSpy.loadRatchetStateFromSession.and.returnValue(false);
      httpSpy.get.and.returnValue(of({ key: 'theirKey' }));
    
      e2eeSpy.getKeys.and.returnValue({ 
        xPrivateKey: new Uint8Array([1,2,3]), 
        edPrivateKey: new Uint8Array([4,5,6]), 
        xPublicKey: new Uint8Array([7,8,9]), 
        mnemonic: 'someMnemonic', 
        timestamp: Date.now() 
      });
    
      e2eeSpy.fromBase64.and.returnValue(new Uint8Array([4,5,6]));
    
      await service.initializeE2EESession('nick');
    
      expect(e2eeSpy.initRatchetAsSender).toHaveBeenCalled();
    });     
  });

  describe('decryptMessageContent', () => {
    it('returns original if no ciphertext', async () => {
      const content = JSON.stringify({ text: 'hi' });
      const result = await service.decryptMessageContent('sender', content, 'msg1');
      expect(result).toBe(content);
    });

    it('throws if no messageId', async () => {
      const content = JSON.stringify({ ciphertext: 'c', nonce: 'n' });
      await expectAsync(service.decryptMessageContent('sender', content)).toBeRejectedWithError('messageId is required');
    });

    it('decrypts message successfully', async () => {
      const content = JSON.stringify({ ciphertext: 'c', nonce: 'n' });
      httpSpy.get.and.returnValue(of({ encryptedKey: 'ek', ephemeralPublicKey: 'ep', chainKeySnapshot: 'cs', keyIndex: 1 }));
      e2eeSpy.getKeys.and.returnValue({ 
        xPrivateKey: new Uint8Array([1,2,3]), 
        edPrivateKey: new Uint8Array([4,5,6]), 
        xPublicKey: new Uint8Array([7,8,9]), 
        mnemonic: 'someMnemonic', 
        timestamp: Date.now() 
      });
      e2eeSpy.fromBase64.and.returnValue(new Uint8Array([1, 2, 3]));
      e2eeSpy.importMessageKeyForUser.and.resolveTo(new Uint8Array([1, 2, 3]));
      e2eeSpy.decryptWithKey.and.resolveTo('decrypted');
      const result = await service.decryptMessageContent('sender', content, 'msg1');
      expect(result).toBe('decrypted');
    });
  });

  describe('sendMessage', () => {
    it('throws if currentUserId not set', async () => {
      service.setCurrentUserId('');
      await expectAsync(service.sendMessage('r', 'c')).toBeRejectedWithError('Current user ID not set');
    });    
  });

  describe('editMessage', () => {
    it('calls invoke', async () => {
      connectionSpy.invoke.and.resolveTo(true);
      await service.editMessage('id', 'c');
      expect(connectionSpy.invoke).toHaveBeenCalledWith('EditMessageAsync', 'id', 'c');
    });
  });

  describe('deleteMessage', () => {
    it('calls invoke', async () => {
      connectionSpy.invoke.and.resolveTo(true);
      await service.deleteMessage('id', 'soft');
      expect(connectionSpy.invoke).toHaveBeenCalledWith('DeleteMessageAsync', 'id', 'soft');
    });
  });

  describe('replyToMessage', () => {
    it('initializes session if none', async () => {
      e2eeSpy.exportRatchetState.and.returnValue(null);
      spyOn(service, 'initializeE2EESession').and.returnValue(Promise.resolve());
      connectionSpy.invoke.and.resolveTo(true);
      await service.replyToMessage('id', 'c', 'r');
      expect(service['initializeE2EESession']).toHaveBeenCalledWith('r');
    });

    it('calls invoke', async () => {
      e2eeSpy.exportRatchetState.and.returnValue('');
      connectionSpy.invoke.and.resolveTo(true);
      await service.replyToMessage('id', 'c', 'r');
      expect(connectionSpy.invoke).toHaveBeenCalledWith('ReplyToMessageAsync', 'r', 'c', 'id');
    });
  });

  describe('getConnection', () => {
    it('returns null if no connection', () => {
      registrySpy.getConnection.and.returnValue(null);
      const result = (service as any).getConnection();
      expect(result).toBeNull();
    });
  
    it('returns null if connection is not connected', () => {
      const fakeConnection = { state: signalR.HubConnectionState.Disconnected } as signalR.HubConnection;
      registrySpy.getConnection.and.returnValue(fakeConnection);
      const result = (service as any).getConnection();
      expect(result).toBeNull();
    });
  
    it('returns connection if connected', () => {
      const fakeConnection = { state: signalR.HubConnectionState.Connected } as signalR.HubConnection;
      registrySpy.getConnection.and.returnValue(fakeConnection);
      const result = (service as any).getConnection();
      expect(result).toBe(fakeConnection);
    });

    it('throws if user keys are not available', async () => {
      e2eeSpy.exportRatchetState.and.returnValue(null);
      e2eeSpy.loadRatchetStateFromSession.and.returnValue(false);
      httpSpy.get.and.returnValue(of({ key: 'theirKey' }));
      e2eeSpy.getKeys.and.returnValue(null);
    
      await expectAsync(service.initializeE2EESession('nick'))
        .toBeRejectedWithError('User keys not available');
    });
    
    it('throws if user keys are not available during decryption', async () => {
      const content = JSON.stringify({ ciphertext: 'c', nonce: 'n' });
      
      httpSpy.get.and.returnValue(of({
        encryptedKey: 'ek',
        ephemeralPublicKey: 'ep',
        chainKeySnapshot: 'cs',
        keyIndex: 1
      }));
    
      e2eeSpy.getKeys.and.returnValue(null);
    
      await expectAsync(
        service.decryptMessageContent('sender', content, 'msg1')
      ).toBeRejectedWithError('User keys not available');
    });

    it('rethrows error if invoke fails', async () => {
      spyOn<any>(service, 'getConnection').and.returnValue(null);
    
      const fakeConnection = { invoke: jasmine.createSpy().and.callFake(() => Promise.reject(new Error('fail'))) };
      registrySpy.waitForConnection.and.returnValue(Promise.resolve(fakeConnection as any));
    
      await expectAsync(service.editMessage('msg1', 'content'))
        .toBeRejectedWithError('fail');
    });
    
    it('rethrows error if invoke fails', async () => {
      spyOn<any>(service, 'getConnection').and.returnValue(null);
    
      const fakeConnection = { invoke: jasmine.createSpy().and.callFake(() => Promise.reject(new Error('fail'))) };
      registrySpy.waitForConnection.and.returnValue(Promise.resolve(fakeConnection as any));
    
      await expectAsync(service.deleteMessage('msg1', 'hard'))
        .toBeRejectedWithError('fail');
    });
    
    it('rethrows error if invoke fails', async () => {
      spyOn<any>(service, 'getConnection').and.returnValue(null);
      spyOn(service, 'hasE2EESession').and.returnValue(true);
    
      const fakeConnection = { invoke: jasmine.createSpy().and.callFake(() => Promise.reject(new Error('fail'))) };
      registrySpy.waitForConnection.and.returnValue(Promise.resolve(fakeConnection as any));
    
      await expectAsync(service.replyToMessage('msg1', 'content', 'recipient'))
        .toBeRejectedWithError('fail');
    });

    it('throws if currentUserId is not set', async () => {
      service.setCurrentUserId('');
      await expectAsync(service.sendMessage('recipient', 'content'))
        .toBeRejectedWithError('Current user ID not set');
    });
    
    it('initializes E2EE session if none', async () => {
      spyOn(service, 'hasE2EESession').and.returnValue(false);
      const initSpy = spyOn(service, 'initializeE2EESession').and.returnValue(Promise.resolve());
      spyOn(service as any, 'getConnection').and.returnValue({ invoke: jasmine.createSpy().and.resolveTo('msgId') });
    
      e2eeSpy.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'c',
        ephemeralKey: 'e',
        nonce: 'n',
        messageNumber: 1,
        previousChainN: 0,
        ratchetId: 'r',
        messageKeyData: {} as any
      });
    
      e2eeSpy.fromBase64.and.returnValue(new Uint8Array([1,2,3]));
      e2eeSpy.exportMessageKeyForUser.and.returnValue({ encryptedKey: 'ek', ephemeralPublicKey: 'ep', chainKeySnapshot: 'cs', messageNumber: 1 });
      httpSpy.get.and.returnValue(of({ key: 'k' }));
      httpSpy.post.and.returnValue(of({ id: 'saved' }));
    
      const result = await service.sendMessage('recipient', 'content');
    
      expect(initSpy).toHaveBeenCalledWith('recipient');
      expect(result).toEqual({ id: 'saved' });
    });
    

    it('throws if recipientMessageKey is not available', async () => {
      spyOn(service, 'hasE2EESession').and.returnValue(true);
      spyOn(service as any, 'getConnection').and.returnValue({ invoke: jasmine.createSpy().and.resolveTo('msgId') });
    
      e2eeSpy.encryptMessageWithHistory.and.resolveTo({
        ciphertext:'c',
        ephemeralKey:'e',
        nonce:'n',
        messageNumber:1,
        previousChainN:0,
        ratchetId:'r',
        messageKeyData: {} as any  
      });
    
      e2eeSpy.fromBase64.and.returnValue(new Uint8Array([1,2,3]));
      e2eeSpy.exportMessageKeyForUser.and.returnValue(null);
      httpSpy.get.and.returnValue(of({ key: 'k' }));
    
      await expectAsync(service.sendMessage('recipient', 'content'))
        .toBeRejectedWithError('Failed to export message key for recipient');
    });
    
    it('throws if senderMessageKey is not available', async () => {
      spyOn(service, 'hasE2EESession').and.returnValue(true);
      spyOn(service as any, 'getConnection').and.returnValue({ invoke: jasmine.createSpy().and.resolveTo('msgId') });
    
      e2eeSpy.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'c',
        ephemeralKey: 'e',
        nonce: 'n',
        messageNumber: 1,
        previousChainN: 0,
        ratchetId: 'r',
        messageKeyData: { encryptedKey: 'ek', ephemeralPublicKey: 'ep', chainKeySnapshot: 'cs', keyIndex: 1 } as any
      });
    
      e2eeSpy.fromBase64.and.returnValue(new Uint8Array([1,2,3]));
    
      let callCount = 0;
      e2eeSpy.exportMessageKeyForUser.and.callFake(() => {
        callCount++;
        return callCount === 1
          ? { encryptedKey:'ek', ephemeralPublicKey:'ep', chainKeySnapshot:'cs', messageNumber:1 }
          : null;
      });
    
      httpSpy.get.and.returnValue(of({ key: 'k' }));
      httpSpy.post.and.returnValue(of({ id: 'saved' }));
    
      await expectAsync(service.sendMessage('recipient', 'content'))
        .toBeRejectedWithError('Failed to export message key for sender');
    });
    
    it('calls waitForConnection if getConnection returns null', async () => {
      spyOn<any>(service, 'getConnection').and.returnValue(null);
      const fakeConnection = { invoke: jasmine.createSpy().and.resolveTo('msgId') };
      registrySpy.waitForConnection.and.returnValue(Promise.resolve(fakeConnection as any));
  
      e2eeSpy.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'c',
        ephemeralKey: 'e',
        nonce: 'n',
        messageNumber: 1,
        previousChainN: 0,
        ratchetId: 'r',
        messageKeyData: {} as any
      });
      e2eeSpy.fromBase64.and.returnValue(new Uint8Array([1,2,3]));
      e2eeSpy.exportMessageKeyForUser.and.returnValue({ encryptedKey:'ek', ephemeralPublicKey:'ep', chainKeySnapshot:'cs', messageNumber:1 });
    
      httpSpy.get.and.returnValue(of({ key: 'k' }));
      httpSpy.post.and.returnValue(of({ id: 'saved' }));
    
      const result = await service.sendMessage('recipient', 'content');
    
      expect(registrySpy.waitForConnection).toHaveBeenCalledWith('otoChat', 20, 150);
      expect(result).toEqual({ id: 'saved' });
    });
    
    it('throws if messageId is not a string', async () => {
      const encrypted = { ciphertext: 'c', ephemeralKey: 'e', nonce: 'n', messageNumber: 1, previousChainN: 0, ratchetId: 'r' };
    
      const recipientMessageKey = { encryptedKey:'ek', ephemeralPublicKey:'ep', chainKeySnapshot:'cs', messageNumber:1 };
      const senderMessageKey = { encryptedKey:'ek', ephemeralPublicKey:'ep', chainKeySnapshot:'cs', messageNumber:1 };
    
      await expectAsync(
        (service as any).saveMessageToHistory(
          123,         
          'recipient',
          encrypted,
          recipientMessageKey,
          senderMessageKey
        )
      ).toBeRejectedWithError('messageId must be a string, got number');
    });

    it('uses messageId from object if signalRResponse is object', async () => {
      spyOn(service, 'hasE2EESession').and.returnValue(true);
    
      const fakeConnection = { 
        invoke: jasmine.createSpy().and.resolveTo({ messageId: 'msgObjId' }) 
      };
      spyOn<any>(service, 'getConnection').and.returnValue(fakeConnection);
    
      e2eeSpy.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'c', ephemeralKey: 'e', nonce: 'n',
        messageNumber: 1, previousChainN: 0, ratchetId: 'r',
        messageKeyData: {} as any
      });
      e2eeSpy.fromBase64.and.returnValue(new Uint8Array([1,2,3]));
      e2eeSpy.exportMessageKeyForUser.and.returnValue({ encryptedKey:'ek', ephemeralPublicKey:'ep', chainKeySnapshot:'cs', messageNumber:1 });
    
      httpSpy.get.and.returnValue(of({ key: 'k' }));
      httpSpy.post.and.returnValue(of({ id: 'saved' }));
    
      const result = await service.sendMessage('recipient', 'content');
    
      expect(fakeConnection.invoke).toHaveBeenCalledWith('SendMessageAsync', 'recipient', jasmine.any(String));
      expect(result).toEqual({ id: 'saved' });
    });

    it('throws if signalRResponse is invalid type', async () => {
      spyOn(service, 'hasE2EESession').and.returnValue(true);
    
      const fakeConnection = { 
        invoke: jasmine.createSpy().and.resolveTo(42)
      };
      spyOn<any>(service, 'getConnection').and.returnValue(fakeConnection);
    
      e2eeSpy.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'c', ephemeralKey: 'e', nonce: 'n',
        messageNumber: 1, previousChainN: 0, ratchetId: 'r',
        messageKeyData: {} as any
      });
      e2eeSpy.fromBase64.and.returnValue(new Uint8Array([1,2,3]));
      e2eeSpy.exportMessageKeyForUser.and.returnValue({ encryptedKey:'ek', ephemeralPublicKey:'ep', chainKeySnapshot:'cs', messageNumber:1 });
    
      httpSpy.get.and.returnValue(of({ key: 'k' }));
      httpSpy.post.and.returnValue(of({ id: 'saved' }));
    
      await expectAsync(service.sendMessage('recipient', 'content'))
        .toBeRejectedWithError('Invalid messageId type from SignalR: number');
    });

    it('uses id from object if messageId is missing', async () => {
      spyOn(service, 'hasE2EESession').and.returnValue(true);
    
      const fakeConnection = { 
        invoke: jasmine.createSpy().and.resolveTo({ id: 'msgIdFromId' })
      };
      spyOn<any>(service, 'getConnection').and.returnValue(fakeConnection);
      e2eeSpy.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'c', ephemeralKey: 'e', nonce: 'n',
        messageNumber: 1, previousChainN: 0, ratchetId: 'r',
        messageKeyData: {} as any
      });
      e2eeSpy.fromBase64.and.returnValue(new Uint8Array([1,2,3]));
      e2eeSpy.exportMessageKeyForUser.and.returnValue({ encryptedKey:'ek', ephemeralPublicKey:'ep', chainKeySnapshot:'cs', messageNumber:1 });
    
      httpSpy.get.and.returnValue(of({ key: 'k' }));
      httpSpy.post.and.returnValue(of({ id: 'saved' }));
    
      const result = await service.sendMessage('recipient', 'content');
    
      expect(fakeConnection.invoke).toHaveBeenCalledWith('SendMessageAsync', 'recipient', jasmine.any(String));
      expect(result).toEqual({ id: 'saved' });
    });

    
    it('stringifies object if messageId and id are missing', async () => {
      spyOn(service, 'hasE2EESession').and.returnValue(true);
    
      const objResponse = { foo: 'bar' };
      const fakeConnection = { 
        invoke: jasmine.createSpy().and.resolveTo(objResponse)
      };
      spyOn<any>(service, 'getConnection').and.returnValue(fakeConnection);

      e2eeSpy.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'c', ephemeralKey: 'e', nonce: 'n',
        messageNumber: 1, previousChainN: 0, ratchetId: 'r',
        messageKeyData: {} as any
      });
      e2eeSpy.fromBase64.and.returnValue(new Uint8Array([1,2,3]));
      e2eeSpy.exportMessageKeyForUser.and.returnValue({ encryptedKey:'ek', ephemeralPublicKey:'ep', chainKeySnapshot:'cs', messageNumber:1 });
    
      httpSpy.get.and.returnValue(of({ key: 'k' }));
      httpSpy.post.and.returnValue(of({ id: 'saved' }));
    
      const result = await service.sendMessage('recipient', 'content');
    
      expect(fakeConnection.invoke).toHaveBeenCalledWith('SendMessageAsync', 'recipient', jasmine.any(String));
      expect(result).toEqual({ id: 'saved' });
    });
  });  
});
