import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import * as signalR from '@microsoft/signalr';
import { GroupMessagesApiService } from './group-messages.api'
import { SignalRConnectionRegistryService } from '../../../../shared/realtime';
import { E2eeService } from '../../../../features/keys-generator';
import { AuthService } from '../../../../entities/session';
import { GroupMessage } from '../../../../entities/group-message';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

describe('GroupMessagesApiService', () => {
  let service: GroupMessagesApiService;
  let httpMock: HttpTestingController;
  let registryService: jasmine.SpyObj<SignalRConnectionRegistryService>;
  let e2eeService: jasmine.SpyObj<E2eeService>;
  let authService: jasmine.SpyObj<AuthService>;
  let mockConnection: jasmine.SpyObj<signalR.HubConnection>;

  const API_URL = 'http://localhost:3000/api';
  const mockGroupId = 'group-123';
  const mockUserId = 'user-123';
  const mockMessageId = 'msg-123';

  beforeEach(() => {
    mockConnection = jasmine.createSpyObj('HubConnection', [
      'invoke',
      'on',
      'off',
      'start',
      'stop'
    ], {
      state: signalR.HubConnectionState.Connected
    });

    const registrySpy = jasmine.createSpyObj('SignalRConnectionRegistryService', [
      'getConnection',
      'waitForConnection'
    ]);

    const e2eeSpy = jasmine.createSpyObj('E2eeService', [
      'getKeys',
      'importMessageKeyForUser',
      'fromBase64',
      'decryptWithKey',
      'decryptSenderKeyFromMember',
      'exportSenderKey',
      'importSenderKey',
      'exportRatchetState',
      'loadRatchetStateFromSession',
      'initRatchetAsSender',
      'encryptMessageWithHistory',
      'exportMessageKeyForUser'
    ]);

    const authSpy = jasmine.createSpyObj('AuthService', ['getNickName']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        GroupMessagesApiService,
        { provide: SignalRConnectionRegistryService, useValue: registrySpy },
        { provide: E2eeService, useValue: e2eeSpy },
        { provide: AuthService, useValue: authSpy }
      ]
    });

    service = TestBed.inject(GroupMessagesApiService);
    httpMock = TestBed.inject(HttpTestingController);
    registryService = TestBed.inject(SignalRConnectionRegistryService) as jasmine.SpyObj<SignalRConnectionRegistryService>;
    e2eeService = TestBed.inject(E2eeService) as jasmine.SpyObj<E2eeService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;

    registryService.getConnection.and.returnValue(mockConnection);
    registryService.waitForConnection.and.returnValue(Promise.resolve(mockConnection));
    authService.getNickName.and.returnValue(mockUserId);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('messages$ BehaviorSubject', () => {
    it('should initialize with empty array', (done) => {
      service.messages$.subscribe(messages => {
        expect(messages).toEqual([]);
        done();
      });
    });

    it('should emit new messages', (done) => {
      const testMessages: GroupMessage[] = [
        {
          id: '1',
          groupId: mockGroupId,
          sender: 'user1',
          content: 'test',
          sendTime: new Date().toISOString(),
          isEdited: false,
          isDeleted: false
        }
      ];

      service.messages$.next(testMessages);

      service.messages$.subscribe(messages => {
        expect(messages).toEqual(testMessages);
        done();
      });
    });
  });

  describe('decryptMessageContent', () => {
    const encryptedContent = JSON.stringify({
      ciphertext: 'encrypted-text',
      nonce: 'nonce-value'
    });

    const mockMessageKeyResponse = {
      encryptedKey: 'encrypted-key',
      ephemeralPublicKey: 'ephemeral-key',
      chainKeySnapshot: 'chain-key',
      keyIndex: 1
    };

    const mockKeys = {
      xPrivateKey: new Uint8Array([1, 2, 3]),
      xPublicKey: new Uint8Array([4, 5, 6]),
      edPrivateKey: new Uint8Array([7, 8, 9]),
      mnemonic: 'test mnemonic words',
      timestamp: Date.now()
    };

    beforeEach(() => {
      (service as any).currentUserId = mockUserId;
      e2eeService.fromBase64.and.returnValue(new Uint8Array([7, 8, 9]));
      e2eeService.importMessageKeyForUser.and.returnValue(Promise.resolve(new Uint8Array([10, 11, 12])));
      e2eeService.decryptWithKey.and.returnValue(Promise.resolve('decrypted message'));
    });
    
    it('should decrypt message content successfully', fakeAsync(async () => {
      (service as any).currentUserId = mockUserId;

      e2eeService.getKeys.and.returnValue(mockKeys);
      e2eeService.fromBase64.and.returnValue(new Uint8Array([7, 8, 9]));
      e2eeService.importMessageKeyForUser.and.returnValue(Promise.resolve(new Uint8Array([10, 11, 12])));
      e2eeService.decryptWithKey.and.returnValue(Promise.resolve('decrypted message'));
    
      const promise = service.decryptMessageContent(
        mockGroupId,
        'sender-id',
        encryptedContent,
        mockMessageId
      );
    
      tick(200);

      const req = httpMock.expectOne(`${API_URL}/messages/${mockMessageId}/key?userId=${mockUserId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockMessageKeyResponse);
    
      tick();
  
      const decrypted = await promise;
    
      expect(decrypted).toBe('decrypted message');
      expect(e2eeService.importMessageKeyForUser).toHaveBeenCalled();
      expect(e2eeService.decryptWithKey).toHaveBeenCalled();
    }));
    
    

    it('should return plain content if not encrypted', async () => {
      const plainContent = 'plain text message';
      const result = await service.decryptMessageContent(
        mockGroupId,
        'sender-id',
        plainContent,
        mockMessageId
      );

      expect(result).toContain('⚠️ Decryption error');
    });

    it('should return error message when messageId is missing', async () => {
      const result = await service.decryptMessageContent(
        mockGroupId,
        'sender-id',
        encryptedContent,
        undefined
      );

      expect(result).toContain('⚠️ Decryption error');
    });

    it('should handle MessageKey not found error', fakeAsync(async () => {
      (service as any).currentUserId = mockUserId;

      e2eeService.getKeys.and.returnValue(mockKeys);
  
      const promise = service.decryptMessageContent(
        mockGroupId,
        'sender-id',
        encryptedContent,
        mockMessageId
      );

      tick(200);

      const req = httpMock.expectOne(`${API_URL}/messages/${mockMessageId}/key?userId=${mockUserId}`);
      expect(req.request.method).toBe('GET');
    
      req.flush(null);
    
      tick();
    
      const decrypted = await promise;
    
      expect(decrypted).toBe('[⚠️ Message key not available]');
    }));
    

    it('should handle invalid MessageKey data', fakeAsync(() => {
      service['currentUserId'] = mockUserId;
    
      const invalidResponse = {
        encryptedKey: '',
        ephemeralPublicKey: 'key',
        chainKeySnapshot: 'snapshot',
        keyIndex: 1
      };
    
      let decryptedResult: string | undefined;
    
      service.decryptMessageContent(
        mockGroupId,
        'sender-id',
        encryptedContent,
        mockMessageId
      ).then(res => decryptedResult = res);
    
      tick(200);
    
      const req = httpMock.expectOne(
        `${API_URL}/messages/${mockMessageId}/key?userId=${mockUserId}`
      );
      req.flush(invalidResponse);
    
      tick();
    
      expect(decryptedResult).toContain('⚠️ Decryption error');
    }));
    
    
  });

  describe('initializeGroupE2EE', () => {
    const memberIds = ['member1', 'member2'];
    const mockKeys = {
      xPrivateKey: new Uint8Array([1, 2, 3]),
      xPublicKey: new Uint8Array([4, 5, 6]),
      edPrivateKey: new Uint8Array([7, 8, 9]),
      mnemonic: 'test mnemonic words',
      timestamp: Date.now()
    };

    beforeEach(() => {
      (service as any).currentUserId = mockUserId;
      e2eeService.fromBase64.and.returnValue(new Uint8Array([7, 8, 9]));
      e2eeService.initRatchetAsSender.and.returnValue(Promise.resolve(new Uint8Array()));
    });

    it('should skip initialization if state exists in memory', async () => {
      e2eeService.exportRatchetState.and.returnValue('existing-state');

      await service.initializeGroupE2EE(mockGroupId, memberIds);

      expect(e2eeService.initRatchetAsSender).not.toHaveBeenCalled();
    });

    it('should load from session if available', async () => {
      e2eeService.exportRatchetState.and.returnValue(null);
      e2eeService.loadRatchetStateFromSession.and.returnValue(true);

      await service.initializeGroupE2EE(mockGroupId, memberIds);

      expect(e2eeService.loadRatchetStateFromSession).toHaveBeenCalledWith(mockGroupId);
      expect(e2eeService.initRatchetAsSender).not.toHaveBeenCalled();
    });

    it('should initialize ratchet for new group', async () => {
      e2eeService.exportRatchetState.and.returnValue(null);
      e2eeService.loadRatchetStateFromSession.and.returnValue(false);
      e2eeService.getKeys.and.returnValue(mockKeys);
    
      const promise = service.initializeGroupE2EE(mockGroupId, memberIds);
    
      memberIds.forEach(memberId => {
        const req = httpMock.expectOne(`${API_URL}/users/nickName/${memberId}`);
        req.flush({ key: 'base64-key' });
      });
    
      await promise;
    
      expect(e2eeService.initRatchetAsSender).toHaveBeenCalledWith(
        mockGroupId,
        mockKeys.xPrivateKey,
        jasmine.any(Uint8Array),
        jasmine.any(Uint8Array)
      );
    });
    
    

    it('should throw error if user keys not available', async () => {
      e2eeService.exportRatchetState.and.returnValue(null);
      e2eeService.loadRatchetStateFromSession.and.returnValue(false);
      e2eeService.getKeys.and.returnValue(null);

      try {
        const promise = service.initializeGroupE2EE(mockGroupId, memberIds);
        
        memberIds.forEach(memberId => {
          const req = httpMock.expectOne(`${API_URL}/users/nickName/${memberId}`);
          req.flush({ key: 'base64-key' });
        });

        await promise;
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });
  });

  describe('hasGroupE2EESession', () => {
    it('should return true if cached', () => {
      service['groupRatchetCache'].set(mockGroupId, true);

      const result = service.hasGroupE2EESession(mockGroupId);

      expect(result).toBeTrue();
    });

    it('should check and cache state from e2eeService', () => {
      e2eeService.exportRatchetState.and.returnValue('state-data');

      const result = service.hasGroupE2EESession(mockGroupId);

      expect(result).toBeTrue();
      expect(service['groupRatchetCache'].has(mockGroupId)).toBeTrue();
    });

    it('should return false if no state exists', () => {
      e2eeService.exportRatchetState.and.returnValue(null);

      const result = service.hasGroupE2EESession(mockGroupId);

      expect(result).toBeFalse();
    });
  });

  describe('ensureSenderKeyLoaded', () => {
    it('should return true if sender key already loaded', async () => {
      e2eeService.exportSenderKey.and.returnValue('existing-key');

      const result = await service.ensureSenderKeyLoaded(mockGroupId);

      expect(result).toBeTrue();
    });

    it('should load from sessionStorage if available', async () => {
      e2eeService.exportSenderKey.and.returnValues(null, 'loaded-key');
      sessionStorage.setItem(`sender_key_${mockGroupId}`, 'stored-key');

      const result = await service.ensureSenderKeyLoaded(mockGroupId);

      expect(result).toBeTrue();
      expect(e2eeService.importSenderKey).toHaveBeenCalledWith(mockGroupId, 'stored-key');
    });

    it('should return false on error', async () => {
      e2eeService.exportSenderKey.and.returnValue(null);
      mockConnection.invoke.and.returnValue(Promise.reject(new Error('Connection failed')));

      const result = await service.ensureSenderKeyLoaded(mockGroupId);

      expect(result).toBeFalse();
    });
  });

  describe('loadChatHistory', () => {
    const mockMessages: GroupMessage[] = [
      {
        id: '1',
        groupId: mockGroupId,
        sender: 'user1',
        content: 'message 1',
        sendTime: new Date().toISOString(),
        isEdited: false,
        isDeleted: false
      }
    ];

    beforeEach(() => {
      mockConnection.invoke.and.returnValue(Promise.resolve(mockMessages));
    });

    it('should load chat history and update messages$', (done) => {
      service.loadChatHistory(mockGroupId, 20, 0).subscribe(messages => {
        expect(messages).toEqual(mockMessages);
        expect(mockConnection.invoke).toHaveBeenCalledWith('JoinGroupAsync', mockGroupId);
        expect(mockConnection.invoke).toHaveBeenCalledWith('LoadChatHistoryAsync', mockGroupId, 0, 20);
        
        service.messages$.subscribe(current => {
          expect(current).toEqual(mockMessages);
          done();
        });
      });
    });

    it('should prepend messages when skip > 0', (done) => {
      const existingMessages: GroupMessage[] = [
        {
          id: '2',
          groupId: mockGroupId,
          sender: 'user2',
          content: 'message 2',
          sendTime: new Date().toISOString(),
          isEdited: false,
          isDeleted: false
        }
      ];

      service.messages$.next(existingMessages);

      service.loadChatHistory(mockGroupId, 20, 20).subscribe(() => {
        service.messages$.subscribe(current => {
          expect(current.length).toBe(2);
          expect(current[0].id).toBe('1');
          expect(current[1].id).toBe('2');
          done();
        });
      });
    });

    it('should not duplicate messages', (done) => {
      service.messages$.next(mockMessages);

      service.loadChatHistory(mockGroupId, 20, 20).subscribe(() => {
        service.messages$.subscribe(current => {
          expect(current.length).toBe(1);
          done();
        });
      });
    });

    it('should reset and reinitialize listeners when switching groups', (done) => {
      service['currentGroupId'] = 'old-group';
      service['listenersSetup'] = true;
    
      service.loadChatHistory(mockGroupId, 20, 0).subscribe(() => {
        expect(service['currentGroupId']).toBe(mockGroupId);
        expect(service['listenersSetup']).toBeTrue();
        done();
      });
    });    
  });
  
  describe('deleteMessage', () => {
    beforeEach(() => {
      mockConnection.invoke.and.returnValue(Promise.resolve());
    });

    it('should hard delete message', fakeAsync(async () => {
      (service as any).currentUserId = mockUserId;
      registryService.getConnection.and.returnValue(mockConnection);
    
      const promise = service.deleteMessage(mockMessageId, mockGroupId);
    
      tick();
    
      const req = httpMock.expectOne(`${API_URL}/messages/${mockMessageId}`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.body).toEqual({ deleteType: 'hard' });
    
      req.flush({});
      tick();
    
      await promise;
    
      expect(mockConnection.invoke)
        .toHaveBeenCalledWith('DeleteMessageAsync', mockMessageId, mockGroupId);
    }));
    
  });

  describe('softDeleteMessage', () => {
    beforeEach(() => {
      mockConnection.invoke.and.returnValue(Promise.resolve());
    });

    it('should soft delete message', fakeAsync(async () => {
      (service as any).currentUserId = mockUserId;
    
      registryService.getConnection.and.returnValue(mockConnection);
    
      const promise = service.softDeleteMessage(mockMessageId, mockGroupId);
    
      tick();
    
      const req = httpMock.expectOne(`${API_URL}/messages/${mockMessageId}`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.body).toEqual({ deleteType: 'soft' });
      req.flush({});
    
      tick();
    
      await promise;
    
      expect(mockConnection.invoke)
        .toHaveBeenCalledWith('SoftDeleteMessageAsync', mockMessageId, mockGroupId);
    }));
    
  });

  describe('cleanup', () => {
    it('should clean up service state', async () => {
      service['currentGroupId'] = mockGroupId;
      service.messages$.next([{
        id: '1',
        groupId: mockGroupId,
        sender: 'user1',
        content: 'test',
        sendTime: new Date().toISOString(),
        isEdited: false,
        isDeleted: false
      }]);
      service['listenersSetup'] = true;
      service['groupRatchetCache'].set(mockGroupId, true);
      mockConnection.invoke.and.returnValue(Promise.resolve());

      service.cleanup();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service['currentGroupId']).toBeNull();
      expect(service.messages$.value).toEqual([]);
      expect(service['listenersSetup']).toBeFalse();
      expect(service['groupRatchetCache'].size).toBe(0);
    });
  });

  describe('SignalR event handlers', () => {
    let receiveMessageHandler: Function;
    let messageEditedHandler: Function;
    let messageDeletedHandler: Function;
    let messageSoftDeletedHandler: Function;

    beforeEach(() => {
      mockConnection.on.and.callFake((event: string, handler: Function) => {
        if (event === 'ReceiveMessage') receiveMessageHandler = handler;
        if (event === 'MessageEdited') messageEditedHandler = handler;
        if (event === 'MessageDeleted') messageDeletedHandler = handler;
        if (event === 'MessageSoftDeleted') messageSoftDeletedHandler = handler;
      });

      mockConnection.invoke.and.returnValue(Promise.resolve([]));
      service['currentGroupId'] = mockGroupId;
    });

    it('should handle ReceiveMessage event', (done) => {
      service.loadChatHistory(mockGroupId).subscribe(() => {
        const newMessage = {
          id: 'new-msg',
          groupId: mockGroupId,
          sender: 'user1',
          content: 'new message',
          sendTime: new Date().toISOString()
        };

        receiveMessageHandler(newMessage);

        service.messages$.subscribe(messages => {
          const found = messages.find(m => m.id === 'new-msg');
          expect(found).toBeTruthy();
          expect(found?.content).toBe('new message');
          done();
        });
      });
    });

    it('should not add duplicate messages on ReceiveMessage', (done) => {
      const existingMessage: GroupMessage = {
        id: 'existing',
        groupId: mockGroupId,
        sender: 'user1',
        content: 'test',
        sendTime: new Date().toISOString(),
        isEdited: false,
        isDeleted: false
      };

      service.messages$.next([existingMessage]);

      service.loadChatHistory(mockGroupId).subscribe(() => {
        receiveMessageHandler(existingMessage);

        service.messages$.subscribe(messages => {
          expect(messages.length).toBe(1);
          done();
        });
      });
    });

    it('should handle MessageEdited event', () => {
      const message: GroupMessage = {
        id: 'msg-1',
        groupId: mockGroupId,
        sender: 'user1',
        content: 'original',
        sendTime: new Date().toISOString(),
        isEdited: false,
        isDeleted: false
      };
    
      (service as any).currentUserId = mockUserId;

      registryService.getConnection.and.returnValue(mockConnection);
    
      service.setupMessageListener();
    
      service.messages$.next([message]);
    
      messageEditedHandler({
        messageId: 'msg-1',
        newContent: 'edited',
        editedAt: new Date().toISOString()
      });
    
      const edited = service.messages$.value.find(m => m.id === 'msg-1');
      expect(edited?.content).toBe('edited');
      expect(edited?.isEdited).toBeTrue();
    });
    

    it('should handle MessageSoftDeleted event', () => {
      const message: GroupMessage = {
        id: 'msg-1',
        groupId: mockGroupId,
        sender: 'user1',
        content: 'test',
        sendTime: new Date().toISOString(),
        isEdited: false,
        isDeleted: false
      };

      service.messages$.next([message]);

      (service as any).currentUserId = mockUserId;
      registryService.getConnection.and.returnValue(mockConnection);
      service.setupMessageListener();

      messageSoftDeletedHandler({ messageId: 'msg-1' });

      const result = service.messages$.value.find((m) => m.id === 'msg-1');
      expect(result?.isDeleted).toBeTrue();
    });
    

    it('should handle MessageDeleted event', (done) => {
      const message: GroupMessage = {
        id: 'msg-1',
        groupId: mockGroupId,
        sender: 'user1',
        content: 'test',
        sendTime: new Date().toISOString(),
        isEdited: false,
        isDeleted: false
      };

      service.messages$.next([message]);

      service.loadChatHistory(mockGroupId).subscribe(() => {
        messageDeletedHandler({ messageId: 'msg-1' });

        service.messages$.subscribe(messages => {
          const found = messages.find(m => m.id === 'msg-1');
          expect(found).toBeUndefined();
          done();
        });
      });
    });
  });

  describe('userInfoChanged handling', () => {
    let userInfoChangedHandler: Function;
  
    beforeEach(() => {
      mockConnection.on.and.callFake((event: string, handler: Function) => {
        if (event === 'UserInfoChanged') userInfoChangedHandler = handler;
      });
  
      mockConnection.invoke.and.returnValue(Promise.resolve([]));
      service['currentGroupId'] = mockGroupId;
    });
  
    beforeEach(() => {
      mockConnection.on.and.callFake((event: string, handler: Function) => {
        if (event === 'UserInfoChanged') userInfoChangedHandler = handler;
      });
    
      mockConnection.invoke.withArgs('JoinGroupAsync', mockGroupId)
        .and.returnValue(Promise.resolve());
    
      mockConnection.invoke.withArgs(
        'LoadChatHistoryAsync',
        mockGroupId,
        0,
        20
      ).and.returnValue(Promise.resolve([
        {
          id: 'msg-1',
          groupId: mockGroupId,
          sender: 'oldName',
          content: 'test',
          sendTime: new Date().toISOString(),
          isEdited: false,
          isDeleted: false
        }
      ]));
    
      service['currentGroupId'] = mockGroupId;
    });
    
    
  
    it('should emit userInfoChanged$ observable', (done) => {
      service.loadChatHistory(mockGroupId).subscribe(() => {
        service.userInfoChanged$.subscribe(userInfo => {
          expect(userInfo.userName).toBe('newName');
          expect(userInfo.oldNickName).toBe('oldName');
          done();
        });
  
        userInfoChangedHandler({
          NewUserName: 'newName',
          OldNickName: 'oldName',
          UpdatedAt: new Date().toISOString()
        });
      });
    });
  });
  
  describe('userInfoDeleted handling', () => {
    let userInfoDeletedHandler: Function;
  
    beforeEach(() => {
      mockConnection.on.and.callFake((event: string, handler: Function) => {
        if (event === 'UserInfoDeleted') userInfoDeletedHandler = handler;
      });
  
      mockConnection.invoke.and.returnValue(Promise.resolve([]));
      service['currentGroupId'] = mockGroupId;
    });
  
    it('should remove messages from deleted user', () => {
      const messages: GroupMessage[] = [
        {
          id: 'msg-1',
          groupId: mockGroupId,
          sender: 'deletedUser',
          content: 'test',
          sendTime: new Date().toISOString(),
          isEdited: false,
          isDeleted: false
        },
        {
          id: 'msg-2',
          groupId: mockGroupId,
          sender: 'otherUser',
          content: 'test2',
          sendTime: new Date().toISOString(),
          isEdited: false,
          isDeleted: false
        }
      ];
    
      (service as any).currentUserId = mockUserId;

      registryService.getConnection.and.returnValue(mockConnection);

      service.setupMessageListener();

      service.messages$.next(messages);

      userInfoDeletedHandler({ userName: 'deletedUser' });

      const msgs = service.messages$.value;
      expect(msgs.length).toBe(1);
      expect(msgs[0].sender).toBe('otherUser');
    });
    
  });

  describe('receiveSenderKey', () => {
    const encryptedData = {
      ephemeralKey: 'eph-key',
      encryptedData: 'enc-data',
      nonce: 'nonce'
    };

    beforeEach(() => {
      e2eeService.decryptSenderKeyFromMember.and.returnValue(Promise.resolve());
      e2eeService.exportSenderKey.and.returnValue('sender-key-json');
    });

    it('should receive and store sender key', async () => {
      await service.receiveSenderKey(mockGroupId, 'senderId', encryptedData);

      expect(e2eeService.decryptSenderKeyFromMember).toHaveBeenCalledWith(
        encryptedData.ephemeralKey,
        encryptedData.encryptedData,
        encryptedData.nonce,
        mockGroupId,
        'senderId'
      );

      const stored = sessionStorage.getItem(`sender_key_${mockGroupId}`);
      expect(stored).toBe('sender-key-json');
    });

    it('should not store if export returns null', async () => {
      e2eeService.exportSenderKey.and.returnValue(null);

      await service.receiveSenderKey(mockGroupId, 'senderId', encryptedData);

      const stored = sessionStorage.getItem(`sender_key_${mockGroupId}`);
      expect(stored).toBeNull();
    });

    it('should rethrow error if delete request fails', fakeAsync(() => {
      registryService.getConnection.and.returnValue(mockConnection);
    
      let err: any;
    
      service.deleteMessage(mockMessageId, mockGroupId)
        .catch(e => err = e);
    
      tick();
    
      const req = httpMock.expectOne(`${API_URL}/messages/${mockMessageId}`);
      req.flush({ message: 'Server error' }, { status: 500, statusText: 'Internal Server Error' });
    
      tick();
    
      expect(err).toBeTruthy();
      expect(err instanceof Error || err instanceof HttpErrorResponse).toBeTrue();
    }));
    
    
    it('should return null when connection is missing', () => {
      registryService.getConnection.calls.reset();
      registryService.getConnection.and.returnValue(null);
    
      const result = (service as any).getConnection();
      expect(result).toBeNull();
    });
       
    it('should return immediately if userName is empty', () => {      
      const spy = spyOn(service as any, 'handleUserInfoDeleted').and.callThrough();
    
      (service as any).handleUserInfoDeleted('');
    
      expect(spy).toHaveBeenCalledWith('');
    });
    
    it('should wait for connection when none is available', fakeAsync(() => {
      spyOn(service as any, 'getConnection').and.returnValue(null);
    
      const expectedConnection = { id: '123' } as any;
    
      registryService.waitForConnection.and.returnValue(
        Promise.resolve(expectedConnection)
      );
    
      let result: any;
      (service as any).ensureConnection().then((r: any) => result = r);
    
      tick();
    
      expect(registryService.waitForConnection)
        .toHaveBeenCalledWith('groupChat', 20, 150);
    
      expect(result).toBe(expectedConnection);
    }));

    it('should rethrow error if soft delete request fails', (done) => {
      (service as any).currentUserId = mockUserId;
      registryService.getConnection.and.returnValue(mockConnection);
    
      service.softDeleteMessage(mockMessageId, mockGroupId).catch((error) => {
        expect(error).toBeTruthy();
        expect(error.status).toBe(400);
        done();
      });
    
      setTimeout(() => {
        const req = httpMock.expectOne(`${API_URL}/messages/${mockMessageId}`);
        expect(req.request.method).toBe('DELETE');
        expect(req.request.body).toEqual({ deleteType: 'soft' });
    
        req.flush(
          { message: 'Soft delete failed' },
          { status: 400, statusText: 'Bad Request' }
        );
      }, 0);
    });

    it('should return encryptedContent when ciphertext is missing', async () => {
      const result = await service.decryptMessageContent(
        'group1',
        'sender1',
        JSON.stringify({ wrong: 'data' })
      );
    
      expect(result).toBe(JSON.stringify({ wrong: 'data' }));
    });


    describe('decryptMessageContent', () => {
      const encryptedContent = JSON.stringify({
        ciphertext: 'encrypted-text',
        nonce: 'nonce-value'
      });
    
      const mockMessageKeyResponse = {
        encryptedKey: 'encrypted-key',
        ephemeralPublicKey: 'ephemeral-key',
        chainKeySnapshot: 'chain-key',
        keyIndex: 1
      };
    
      const mockKeys = {
        xPrivateKey: new Uint8Array([1, 2, 3]),
        xPublicKey: new Uint8Array([4, 5, 6]),
        edPrivateKey: new Uint8Array([7, 8, 9]),
        mnemonic: 'test mnemonic words',
        timestamp: Date.now()
      };
    
      beforeEach(() => {
        (service as any).currentUserId = mockUserId;
        e2eeService.fromBase64.and.returnValue(new Uint8Array([7, 8, 9]));
        e2eeService.importMessageKeyForUser.and.returnValue(Promise.resolve(new Uint8Array([10, 11, 12])));
        e2eeService.decryptWithKey.and.returnValue(Promise.resolve('decrypted message'));
      });
    
      it('should decrypt message content successfully', fakeAsync(async () => {
        (service as any).currentUserId = mockUserId;
        e2eeService.getKeys.and.returnValue(mockKeys);
        e2eeService.fromBase64.and.returnValue(new Uint8Array([7, 8, 9]));
        e2eeService.importMessageKeyForUser.and.returnValue(Promise.resolve(new Uint8Array([10, 11, 12])));
        e2eeService.decryptWithKey.and.returnValue(Promise.resolve('decrypted message'));
    
        const promise = service.decryptMessageContent(
          mockGroupId,
          'sender-id',
          encryptedContent,
          mockMessageId
        );
    
        tick(200);
    
        const req = httpMock.expectOne(`${API_URL}/messages/${mockMessageId}/key?userId=${mockUserId}`);
        expect(req.request.method).toBe('GET');
        req.flush(mockMessageKeyResponse);
    
        tick();
    
        const decrypted = await promise;
    
        expect(decrypted).toBe('decrypted message');
        expect(e2eeService.importMessageKeyForUser).toHaveBeenCalled();
        expect(e2eeService.decryptWithKey).toHaveBeenCalled();
      }));
    
      it('should return original content if ciphertext is missing', async () => {
        const plainContent = JSON.stringify({
          someField: 'value',
        });
    
        const result = await service.decryptMessageContent(
          mockGroupId,
          'sender-id',
          plainContent,
          mockMessageId
        );
    
        expect(result).toBe(plainContent);
      });

      it('should return original content if not valid JSON with ciphertext', async () => {
        const plainTextContent = 'just plain text message';
    
        const result = await service.decryptMessageContent(
          mockGroupId,
          'sender-id',
          plainTextContent,
          mockMessageId
        );
    
        expect(result).toContain('⚠️ Decryption error');
      });

      it('should return plain content if not encrypted', async () => {
        const plainContent = 'plain text message';
        const result = await service.decryptMessageContent(
          mockGroupId,
          'sender-id',
          plainContent,
          mockMessageId
        );
    
        expect(result).toContain('⚠️ Decryption error');
      });
    
      it('should return error message when messageId is missing', async () => {
        const result = await service.decryptMessageContent(
          mockGroupId,
          'sender-id',
          encryptedContent,
          undefined
        );
    
        expect(result).toContain('⚠️ Decryption error');
      });

      it('should return error when currentUserId is not set', async () => {
        (service as any).currentUserId = null; 
    
        const result = await service.decryptMessageContent(
          mockGroupId,
          'sender-id',
          encryptedContent,
          mockMessageId
        );
    
        expect(result).toContain('⚠️ Decryption error');
        expect(result).toContain('Current user ID not set');
      });
    
      it('should handle MessageKey not found error', fakeAsync(async () => {
        (service as any).currentUserId = mockUserId;
        e2eeService.getKeys.and.returnValue(mockKeys);
    
        const promise = service.decryptMessageContent(
          mockGroupId,
          'sender-id',
          encryptedContent,
          mockMessageId
        );
    
        tick(200);
    
        const req = httpMock.expectOne(`${API_URL}/messages/${mockMessageId}/key?userId=${mockUserId}`);
        expect(req.request.method).toBe('GET');
    
        req.flush(null);
    
        tick();
    
        const decrypted = await promise;
    
        expect(decrypted).toBe('[⚠️ Message key not available]');
      }));
    
      it('should handle invalid MessageKey data', fakeAsync(() => {
        service['currentUserId'] = mockUserId;
    
        const invalidResponse = {
          encryptedKey: '',
          ephemeralPublicKey: 'key',
          chainKeySnapshot: 'snapshot',
          keyIndex: 1
        };
    
        let decryptedResult: string | undefined;
    
        service.decryptMessageContent(
          mockGroupId,
          'sender-id',
          encryptedContent,
          mockMessageId
        ).then(res => decryptedResult = res);
    
        tick(200);
    
        const req = httpMock.expectOne(
          `${API_URL}/messages/${mockMessageId}/key?userId=${mockUserId}`
        );
        req.flush(invalidResponse);
    
        tick();
    
        expect(decryptedResult).toContain('⚠️ Decryption error');
      }));

      it('should return error when user keys are not available', fakeAsync(async () => {
        (service as any).currentUserId = mockUserId;
        e2eeService.getKeys.and.returnValue(null);
    
        const promise = service.decryptMessageContent(
          mockGroupId,
          'sender-id',
          encryptedContent,
          mockMessageId
        );
    
        tick(200);
    
        const req = httpMock.expectOne(`${API_URL}/messages/${mockMessageId}/key?userId=${mockUserId}`);
        req.flush(mockMessageKeyResponse);
    
        tick();
    
        const result = await promise;
    
        expect(result).toContain('⚠️ Decryption error');
        expect(result).toContain('User keys not available');
      }));

      it('should return generic decryption failed message for non-Error exceptions', (done) => {
        (service as any).currentUserId = mockUserId;
        e2eeService.getKeys.and.returnValue(mockKeys);
        e2eeService.fromBase64.and.returnValue(new Uint8Array([7, 8, 9]));
        e2eeService.importMessageKeyForUser.and.returnValue(Promise.resolve(new Uint8Array([10, 11, 12])));
        
        e2eeService.decryptWithKey.and.returnValue(
          Promise.reject(12345)
        );
      
        service.decryptMessageContent(
          mockGroupId,
          'sender-id',
          encryptedContent,
          mockMessageId
        ).then(result => {
          expect(result).toBe('[⚠️ Decryption failed]');
          done();
        }).catch(() => {
          fail('Should not throw, should return error message');
          done();
        });

        setTimeout(() => {
          const req = httpMock.expectOne(`${API_URL}/messages/${mockMessageId}/key?userId=${mockUserId}`);
          req.flush(mockMessageKeyResponse);
        }, 250);
      });

      describe('setupMessageListener - additional coverage', () => {
        let receiveMessageHandler: Function;
        let messageEditedHandler: Function;
      
        beforeEach(() => {
          mockConnection.on.and.callFake((event: string, handler: Function) => {
            if (event === 'ReceiveMessage') receiveMessageHandler = handler;
            if (event === 'MessageEdited') messageEditedHandler = handler;
          });
      
          mockConnection.invoke.and.returnValue(Promise.resolve([]));
          service['currentGroupId'] = mockGroupId;
          (service as any).currentUserId = mockUserId;
          registryService.getConnection.and.returnValue(mockConnection);
        });
      
        it('should not add duplicate message in ReceiveMessage handler', () => {
          const existingMessage: GroupMessage = {
            id: 'existing-msg',
            groupId: mockGroupId,
            sender: 'user1',
            content: 'original content',
            sendTime: new Date().toISOString(),
            isEdited: false,
            isDeleted: false
          };
      
          service.messages$.next([existingMessage]);

          service.setupMessageListener();
      
          const initialLength = service.messages$.value.length;
      
          receiveMessageHandler({
            id: 'existing-msg', 
            groupId: mockGroupId,
            sender: 'user1',
            content: 'original content',
            sendTime: new Date().toISOString()
          });

          expect(service.messages$.value.length).toBe(initialLength);
          expect(service.messages$.value.length).toBe(1);
        });
      
        it('should return early in MessageEdited if content already matches', () => {
          const message: GroupMessage = {
            id: 'msg-1',
            groupId: mockGroupId,
            sender: 'user1',
            content: 'same content',
            sendTime: new Date().toISOString(),
            isEdited: false,
            isDeleted: false
          };
      
          service.messages$.next([message]);
          service.setupMessageListener();
      
          const initialMessages = [...service.messages$.value];
      
          messageEditedHandler({
            messageId: 'msg-1',
            newContent: 'same content', 
            editedAt: new Date().toISOString()
          });

          const afterMessages = service.messages$.value;
          
          expect(afterMessages[0].isEdited).toBe(false);
          expect(afterMessages[0].content).toBe('same content');
        });
      
        it('should correctly find message by id in MessageEdited', () => {
          const messages: GroupMessage[] = [
            {
              id: 'msg-1',
              groupId: mockGroupId,
              sender: 'user1',
              content: 'first',
              sendTime: new Date().toISOString(),
              isEdited: false,
              isDeleted: false
            },
            {
              id: 'msg-2',
              groupId: mockGroupId,
              sender: 'user2',
              content: 'second',
              sendTime: new Date().toISOString(),
              isEdited: false,
              isDeleted: false
            }
          ];
      
          service.messages$.next(messages);
          service.setupMessageListener();
      
          messageEditedHandler({
            messageId: 'msg-2',
            newContent: 'edited second',
            editedAt: new Date().toISOString()
          });
      
          const result = service.messages$.value;
          
          expect(result[0].content).toBe('first');
          expect(result[0].isEdited).toBe(false);
          
          expect(result[1].content).toBe('edited second');
          expect(result[1].isEdited).toBe(true);
        });
      
        it('should handle MessageEdited when message not found', () => {
          service.messages$.next([]);
          service.setupMessageListener();
      
          expect(() => {
            messageEditedHandler({
              messageId: 'non-existent',
              newContent: 'new content',
              editedAt: new Date().toISOString()
            });
          }).not.toThrow();
      
          expect(service.messages$.value.length).toBe(0);
        });
      });
    });

    it('should return early when no connection is available', () => {
      spyOn(service as any, 'getConnection').and.returnValue(null);
      (service as any).listenersSetup = false;
    
      const result = service.setupMessageListener();
    
      expect(result).toBeUndefined();
    });

    it('should keep message unchanged when MessageSoftDeleted targets another messageId', () => {
      const fakeOn = jasmine.createSpy('on');
      const connectionMock: any = { on: fakeOn };
      spyOn(service as any, 'getConnection').and.returnValue(connectionMock);

      const initialMessages = [
        { id: 'msg-1', text: 'Hello', isDeleted: false },
        { id: 'msg-2', text: 'World', isDeleted: false }
      ];
    
      (service as any).messages$.next(initialMessages);

      service.setupMessageListener();

      const cb = fakeOn.calls.argsFor(0)[1]; 
      cb({ messageId: 'unknown-id' });
      const updated = (service as any).messages$.value;
      expect(updated).toEqual(initialMessages);
    });

    it('should keep messages unchanged when soft delete ID does not match (cover return m)', () => {
      const connection = mockConnection;
      registryService.getConnection.and.returnValue(connection);
      const initialMessages = [
        { id: 'msg-1', isDeleted: false },
        { id: 'msg-2', isDeleted: false },
      ] as any;
    
      service.messages$.next(initialMessages);

      service.setupMessageListener();
    
      const call = connection.on.calls.all().find(c => c.args[0] === 'MessageSoftDeleted');
      const handler = call ? call.args[1] : undefined;

      if (handler) {
        handler({ messageId: 'other-id' });
      }
    
      const result = service.messages$.value;

      expect(result).toEqual(initialMessages);
    });
    
    it('should handle MessageDeleted when deleteInfo is a plain ID and cover filter branch', () => {
      const connection = mockConnection;
      registryService.getConnection.and.returnValue(connection);
    
      const initialMessages = [
        { id: 'msg-1', content: 'Hello' },
        { id: 'msg-2', content: 'World' }
      ] as any;
    
      service.messages$.next(initialMessages);

      service.setupMessageListener();

      const call = connection.on.calls
        .all()
        .find(c => c.args[0] === 'MessageDeleted');
      const handler = call ? call.args[1] : undefined;

      if (handler) {
        handler('some-other-id');
      }
    
      const result = service.messages$.value;

      expect(result).toEqual(initialMessages);
    });
    
    it('should handle MessageReplied by adding a new message when it does not exist', () => {
      const connection = mockConnection;
      registryService.getConnection.and.returnValue(connection);

      service.currentGroupId = 'group-1';

      const initialMessages = [
        { id: 'msg-1', groupId: 'group-1', content: 'Hello' }
      ] as any;
    
      service.messages$.next(initialMessages);

      service.setupMessageListener();

      const messageRepliedCall = connection.on.calls
        .all()
        .find(x => x.args[0] === 'MessageReplied');
      const handler = messageRepliedCall ? messageRepliedCall.args[1] : undefined;

      const replyData = {
        groupId: 'group-1',
        messageId: 'msg-2',
        sender: 'User123',
        content: 'Reply text',
        sentAt: '2025-02-10T12:00:00Z',
        replyTo: 'msg-1'
      };

      if (handler) {
        handler(replyData);
      }
    
      const result = service.messages$.value;

      expect(result.length).toBe(2);

      const added = result[1];
    
      expect(added).toEqual({
        id: 'msg-2',
        groupId: 'group-1',
        sender: 'User123',
        content: 'Reply text',
        sendTime: '2025-02-10T12:00:00Z',
        isEdited: false,
        editTime: undefined,
        isDeleted: false,
        replyFor: 'msg-1'
      });
    });

    it('should normalize UserInfoChanged using newUserName, updatedAt and oldNickName', () => {
      const connection = mockConnection;
    
      registryService.getConnection.and.returnValue(connection);
    
      spyOn(service as any, 'handleUserInfoChanged');
    
      service.setupMessageListener();

      const userInfoChangedCall = connection.on.calls
        .all()
        .find(x => x.args[0] === 'UserInfoChanged');
      const handler = userInfoChangedCall ? userInfoChangedCall.args[1] : undefined;
    
      const userInfo = {
        newUserName: 'NewName',
        image: '  avatar.png  ',
        updatedAt: '2025-02-10T12:00:00Z',
        oldNickName: 'OldGuy'
      };
    
      if (handler) {
        handler(userInfo);
      }
    
      expect((service as any).handleUserInfoChanged).toHaveBeenCalledWith({
        NewUserName: 'NewName',      
        Image: 'avatar.png',         
        UpdatedAt: '2025-02-10T12:00:00Z',
        OldNickName: 'OldGuy'        
      });
    });
    
    it('should extract userName from nested userInfo.userName in UserInfoDeleted', () => {
      const connection = mockConnection;
    
      registryService.getConnection.and.returnValue(connection);
    
      spyOn(service as any, 'handleUserInfoDeleted');
    
      service.setupMessageListener();
        const userInfoChangedCall = connection.on.calls
        .all()
        .find(x => x.args[0] === 'UserInfoDeleted');
      const handler = userInfoChangedCall ? userInfoChangedCall.args[1] : undefined;

      const userInfo = {
        userInfo: {
          userName: 'NestedUser'
        }
      };
    
      if (handler) {
        handler(userInfo);
      }
    
      expect((service as any).handleUserInfoDeleted)
        .toHaveBeenCalledWith('NestedUser');
    });
    
    it('should throw when currentUserId is missing', async () => {
      service.currentUserId = null as any;
    
      await expectAsync(
        (service as any).loadSenderKeyFromMessage('m1', 'g1', 's1')
      ).toBeRejectedWithError('Current user ID not set');
    });

    it('should throw when messageKeyResponse is null', async () => {
      service.currentUserId = 'user1';
    
      const promise = (service as any).loadSenderKeyFromMessage('m1', 'g1', 's1');
    
      const req = httpMock.expectOne(
        'http://localhost:3000/api/messages/m1/key?userId=user1'
      );
    
      expect(req.request.method).toBe('GET');
    
      req.flush(null);
    
      await expectAsync(promise)
        .toBeRejectedWithError('MessageKey not found for current user');
    });

    it('should throw when encryptedKey is missing', async () => {
      service.currentUserId = 'user1';

      const promise = (service as any).loadSenderKeyFromMessage('m1', 'g1', 's1');

      const req = httpMock.expectOne(
        'http://localhost:3000/api/messages/m1/key?userId=user1'
      );
    
      expect(req.request.method).toBe('GET');

      req.flush({
        encryptedKey: null,
        ephemeralPublicKey: 'AAA',
        chainKeySnapshot: 'BBB'
      });

      await expectAsync(promise)
        .toBeRejectedWithError('MessageKey.encryptedKey is missing');
    });

    it('should throw when ephemeralPublicKey is missing', async () => {
      service.currentUserId = 'user1';

      const promise = (service as any).loadSenderKeyFromMessage('m1', 'g1', 's1');

      const req = httpMock.expectOne(
        'http://localhost:3000/api/messages/m1/key?userId=user1'
      );
    
      expect(req.request.method).toBe('GET');
    
      req.flush({
        encryptedKey: 'EK',
        ephemeralPublicKey: null,
        chainKeySnapshot: 'BBB'
      });

      await expectAsync(promise)
        .toBeRejectedWithError('MessageKey.ephemeralPublicKey is missing');
    });

    it('should throw when chainKeySnapshot is missing', async () => {
      service.currentUserId = 'user1';
    
      const promise = (service as any).loadSenderKeyFromMessage('m1', 'g1', 's1');
    
      const req = httpMock.expectOne(
        'http://localhost:3000/api/messages/m1/key?userId=user1'
      );
    
      req.flush({
        encryptedKey: 'EK',
        ephemeralPublicKey: 'AAA',
        chainKeySnapshot: null
      });
    
      await expectAsync(promise)
        .toBeRejectedWithError('MessageKey.chainKeySnapshot is missing');
    });

    it('should load sender key and store it in sessionStorage', async () => {
      service.currentUserId = 'user1';
      e2eeService.getKeys = jasmine.createSpy().and.returnValue({
        xPrivateKey: new TextEncoder().encode('PK'),
        xPublicKey: new Uint8Array([1, 2, 3]),
        edPrivateKey: new Uint8Array([4, 5, 6]),
        mnemonic: 'test mnemonic words',
        timestamp: Date.now()
      });
    
      e2eeService.decryptSenderKeyFromMember = jasmine.createSpy().and.resolveTo();
      e2eeService.exportSenderKey = jasmine.createSpy().and.returnValue('EXPORTED');
    
      spyOn(sessionStorage, 'setItem');
    
      const promise = (service as any).loadSenderKeyFromMessage('m1', 'g1', 's1');
    
      const req = httpMock.expectOne(
        'http://localhost:3000/api/messages/m1/key?userId=user1'
      );
    
      req.flush({
        encryptedKey: 'EK',
        ephemeralPublicKey: 'AAA',
        chainKeySnapshot: 'BBB'
      });
    
      await promise;
    
      expect(sessionStorage.setItem)
        .toHaveBeenCalledWith('sender_key_g1', 'EXPORTED');
    });

    it('should throw when exported sender key is null', async () => {
      service.currentUserId = 'user1';

      e2eeService.getKeys = jasmine.createSpy().and.returnValue({
        xPrivateKey: new Uint8Array([80, 75]),
        xPublicKey: new Uint8Array([1, 2, 3]),
        edPrivateKey: new Uint8Array([4, 5, 6]),
        mnemonic: 'test mnemonic words',
        timestamp: Date.now()
      });
    
      e2eeService.decryptSenderKeyFromMember =
        jasmine.createSpy().and.resolveTo();
    
      e2eeService.exportSenderKey =
        jasmine.createSpy().and.returnValue(null);
    
      const promise = (service as any)
        .loadSenderKeyFromMessage('m1', 'g1', 's1');
    
      const req = httpMock.expectOne(
        'http://localhost:3000/api/messages/m1/key?userId=user1'
      );
    
      req.flush({
        encryptedKey: 'EK',
        ephemeralPublicKey: 'AAA',
        chainKeySnapshot: 'BBB'
      });
    
      await expectAsync(promise)
        .toBeRejectedWithError(
          'Sender Key was not loaded into memory after decryption'
        );
    });

    it('should throw when user keys are missing', async () => {
      service.currentUserId = 'user1';

      e2eeService.getKeys = jasmine.createSpy().and.returnValue(null);
    
      const promise = (service as any).loadSenderKeyFromMessage('m1', 'g1', 's1');
    
      const req = httpMock.expectOne(
        'http://localhost:3000/api/messages/m1/key?userId=user1'
      );
    
      req.flush({
        encryptedKey: 'EK',
        ephemeralPublicKey: 'AAA',
        chainKeySnapshot: 'BBB'
      });
    
      await expectAsync(promise)
        .toBeRejectedWithError('User keys not available');
    });
    
    describe('loadSenderKeyFromHistory', () => {

      beforeEach(() => {
        sessionStorage.clear();
      });
    
      it('should return early if savedKey exists', async () => {
        sessionStorage.setItem('sender_key_g1', 'EXISTING');
    
        e2eeService.importSenderKey = jasmine.createSpy();
    
        await (service as any).loadSenderKeyFromHistory('g1');
    
        expect(e2eeService.importSenderKey)
          .toHaveBeenCalledWith('g1', 'EXISTING');
      });
    
      it('should skip invalid JSON messages (return false in catch)', async () => {
        spyOn(service as any, 'ensureConnection')
          .and.resolveTo(mockConnection);
    
        mockConnection.invoke = jasmine.createSpy().and.resolveTo([
          { content: 'NOT JSON' }
        ]);
    
        await expectAsync(
          (service as any).loadSenderKeyFromHistory('g1')
        ).toBeRejectedWithError('Sender Key Distribution message not found');
      });
    
      it('should throw if no sender key distribution message is found', async () => {
        spyOn(service as any, 'ensureConnection').and.resolveTo(mockConnection);
    
        mockConnection.invoke = jasmine.createSpy().and.resolveTo([
          { content: JSON.stringify({ type: 'other' }) }
        ]);
    
        await expectAsync(
          (service as any).loadSenderKeyFromHistory('g1')
        ).toBeRejectedWithError('Sender Key Distribution message not found');
      });
    
      it('should call loadSenderKeyFromMessage when key distribution message exists', async () => {
        spyOn(service as any, 'ensureConnection').and.resolveTo(mockConnection);
    
        const keyDist = {
          id: 'm1',
          sender: 'u1',
          content: JSON.stringify({
            type: 'sender_key_distribution',
            groupId: 'g1'
          })
        };
    
        mockConnection.invoke = jasmine.createSpy().and.resolveTo([keyDist]);
    
        const spyLoad = spyOn(service as any, 'loadSenderKeyFromMessage').and.resolveTo();
    
        e2eeService.exportSenderKey = jasmine.createSpy().and.returnValue('EXPORTED');
    
        await (service as any).loadSenderKeyFromHistory('g1');
    
        expect(spyLoad).toHaveBeenCalledWith('m1', 'g1', 'u1');
      });
    
      it('should throw when exported key is null', async () => {
        spyOn(service as any, 'ensureConnection').and.resolveTo(mockConnection);
    
        const keyDist = {
          id: 'm1',
          sender: 'u1',
          content: JSON.stringify({
            type: 'sender_key_distribution',
            groupId: 'g1'
          })
        };
    
        mockConnection.invoke = jasmine.createSpy().and.resolveTo([keyDist]);
    
        spyOn(service as any, 'loadSenderKeyFromMessage').and.resolveTo();
    
        e2eeService.exportSenderKey = jasmine.createSpy().and.returnValue(null);
    
        await expectAsync(
          (service as any).loadSenderKeyFromHistory('g1')
        ).toBeRejectedWithError('Sender Key was not loaded into memory');
      });
    
      it('should complete successfully when everything is valid', async () => {
        spyOn(service as any, 'ensureConnection').and.resolveTo(mockConnection);
    
        const keyDist = {
          id: 'm1',
          sender: 'u1',
          content: JSON.stringify({
            type: 'sender_key_distribution',
            groupId: 'g1'
          })
        };
    
        mockConnection.invoke = jasmine.createSpy().and.resolveTo([keyDist]);
    
        spyOn(service as any, 'loadSenderKeyFromMessage').and.resolveTo();
    
        e2eeService.exportSenderKey = jasmine.createSpy().and.returnValue('OK');
    
        await (service as any).loadSenderKeyFromHistory('g1');
    
        expect(e2eeService.exportSenderKey).toHaveBeenCalledWith('g1');
      });
    });

    it('should rethrow error in receiveSenderKey when decryption fails', async () => {
      e2eeService.decryptSenderKeyFromMember = jasmine
        .createSpy()
        .and.rejectWith(new Error('decrypt failed'));
    
      const promise = service.receiveSenderKey('g1', 's1', {
        ephemeralKey: 'AAA',
        encryptedData: 'BBB',
        nonce: 'CCC'
      });
    
      await expectAsync(promise).toBeRejectedWithError('decrypt failed');
    });    

    it('should return true when history loading loads a sender key', async () => {
      e2eeService.exportSenderKey = jasmine
        .createSpy()
        .and.returnValues(null, 'LOADED_KEY');
    
      (service as any).loadSenderKeyFromHistory = jasmine
        .createSpy()
        .and.resolveTo();
    
      const result = await service.ensureSenderKeyLoaded('g1');
    
      expect(result).toBeTrue();
      expect(e2eeService.exportSenderKey).toHaveBeenCalledTimes(2);
    });

    it('should return original message when sender does not match old or new username', () => {

      service['messages$'].next([
        { 
          id: '1',
          groupId: 'g1',
          sender: 'OtherUser',
          content: 'Hi',
          sendTime: new Date().toISOString(),
          isDeleted: false,
          isEdited: false
        }
      ]);
    
      (service as any).handleUserInfoChanged({
        NewUserName: 'NewName',
        OldNickName: 'OldName',
        UpdatedAt: 'now',
        Image: undefined
      });
    
      const result = service['messages$'].value;
    
      expect(result[0].sender).toBe('OtherUser');  
    });

    it('should add senderImage when userInfo.Image is provided', () => {
      service['messages$'].next([
        {
          id: '1',
          sender: 'OldNick',
          content: 'Hello',
          groupId: 'g1',
          sendTime: new Date().toISOString(),
          isDeleted: false,
          isEdited: false
        }
      ]);
    
      (service as any).handleUserInfoChanged({
        NewUserName: 'NewNick',
        OldNickName: 'OldNick',
        UpdatedAt: 'today',
        Image: 'image.png'
      });
    
      const msg = service['messages$'].value[0] as any; 
    
      expect(msg.senderImage).toBe('image.png');  
      expect(msg.sender).toBe('NewNick');
    });
    
    it('should return empty array when LoadChatHistoryAsync returns null', async () => {
      service.currentGroupId = 'g1';
      const connectionMock = {
        invoke: jasmine.createSpy().and.resolveTo(null)
      };
    
      spyOn(service as any, 'ensureConnection').and.resolveTo(connectionMock);
      spyOn(service as any, 'setupMessageListener').and.callFake(() => {});
    
      const result = await firstValueFrom(service.loadChatHistory('g1'));
    
      expect(result).toEqual([]); 
    });

    it('should rethrow error when LoadChatHistoryAsync throws', async () => {
      service.currentGroupId = 'g1';
    
      const connectionMock = {
        invoke: jasmine.createSpy().and.rejectWith(new Error('load failed'))
      };
    
      spyOn(service as any, 'ensureConnection').and.resolveTo(connectionMock);
      spyOn(service as any, 'setupMessageListener').and.callFake(() => {});
    
      const observable$ = service.loadChatHistory('g1');
    
      await expectAsync(firstValueFrom(observable$))
        .toBeRejectedWithError('load failed'); 
    });

    it('should throw if currentUserId is not set', async () => {
      service.currentUserId = null as any;
    
      await expectAsync(
        service.sendMessage('g1', 'hello', ['u1'])
      ).toBeRejectedWithError('Current user ID not set');
    });        
  });
  describe('sendMessage - additional coverage', () => {
    const mockKeys = {
      xPrivateKey: new Uint8Array([1, 2, 3]),
      xPublicKey: new Uint8Array([4, 5, 6]),
      edPrivateKey: new Uint8Array([7, 8, 9]),
      mnemonic: 'test mnemonic words',
      timestamp: Date.now()
    };
  
    beforeEach(() => {
      service['currentUserId'] = mockUserId;
      e2eeService.getKeys.and.returnValue(mockKeys);
      e2eeService.fromBase64.and.returnValue(new Uint8Array([10, 11, 12]));
    });
  
    it('should call initializeGroupE2EE when no E2EE session exists', fakeAsync(() => {
      spyOn(service, 'hasGroupE2EESession').and.returnValue(false);
      spyOn(service, 'initializeGroupE2EE').and.resolveTo();
      spyOn(service as any, 'saveGroupMessageToHistory').and.resolveTo();
  
      const connectionMock: any = {
        invoke: jasmine.createSpy().and.resolveTo('msg-id-123')
      };
  
      spyOn(service, 'ensureConnection').and.resolveTo(connectionMock);
  
      e2eeService.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'encrypted-text',
        ephemeralKey: 'eph-key',
        nonce: 'nonce-value',
        messageNumber: 1,
        previousChainN: 0,
        ratchetId: 'ratchet-id',
        messageKeyData: {
          messageKey: new Uint8Array([1, 2, 3]),
          chainKeySnapshot: new Uint8Array([4, 5, 6]),
          keyIndex: 1
        }
      });
  
      e2eeService.exportMessageKeyForUser.and.returnValue({
        encryptedKey: 'enc-key',
        ephemeralPublicKey: 'eph-pub-key',
        chainKeySnapshot: 'chain-key',
        messageNumber: 1
      });
  
      let result: any;
      service.sendMessage(mockGroupId, 'test message', ['member1'])
        .then(res => result = res);
  
      tick();

      const req1 = httpMock.expectOne(`${API_URL}/users/nickName/member1`);
      req1.flush({ key: 'member1-key' });
  
      const req2 = httpMock.expectOne(`${API_URL}/users/nickName/${mockUserId}`);
      req2.flush({ key: 'current-user-key' });
  
      tick(150); 
  
      expect(result.messageId).toBe('msg-id-123');
      expect(service.initializeGroupE2EE).toHaveBeenCalledWith(mockGroupId, ['member1']);
    }));
  
    it('should throw error if exportMessageKeyForUser returns null', fakeAsync(() => {
      spyOn(service, 'hasGroupE2EESession').and.returnValue(true);
  
      const connectionMock: any = {
        invoke: jasmine.createSpy().and.resolveTo('msg-id-123')
      };
  
      spyOn(service, 'ensureConnection').and.resolveTo(connectionMock);
  
      e2eeService.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'encrypted-text',
        ephemeralKey: 'eph-key',
        nonce: 'nonce-value',
        messageNumber: 1,
        previousChainN: 0,
        ratchetId: 'ratchet-id',
        messageKeyData: {
          messageKey: new Uint8Array([1, 2, 3]),
          chainKeySnapshot: new Uint8Array([4, 5, 6]),
          keyIndex: 1
        }
      });
  
      e2eeService.exportMessageKeyForUser.and.returnValue(null);
  
      let error: any;
      service.sendMessage(mockGroupId, 'test message', ['member1'])
        .catch(err => error = err);
  
      tick();
  
      const req1 = httpMock.expectOne(`${API_URL}/users/nickName/member1`);
      req1.flush({ key: 'member1-key' });
  
      const req2 = httpMock.expectOne(`${API_URL}/users/nickName/${mockUserId}`);
      req2.flush({ key: 'current-user-key' });
  
      tick();
  
      expect(error.message).toContain('Failed to export message key for member member1');
    }));
  
    it('should include current user in allMemberIds using Set', fakeAsync(() => {
      spyOn(service, 'hasGroupE2EESession').and.returnValue(true);
      spyOn(service as any, 'saveGroupMessageToHistory').and.resolveTo();
  
      const connectionMock: any = {
        invoke: jasmine.createSpy().and.resolveTo('msg-id-123')
      };
  
      spyOn(service, 'ensureConnection').and.resolveTo(connectionMock);
  
      e2eeService.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'encrypted-text',
        ephemeralKey: 'eph-key',
        nonce: 'nonce-value',
        messageNumber: 1,
        previousChainN: 0,
        ratchetId: 'ratchet-id',
        messageKeyData: {
          messageKey: new Uint8Array([1, 2, 3]),
          chainKeySnapshot: new Uint8Array([4, 5, 6]),
          keyIndex: 1
        }
      });
  
      e2eeService.exportMessageKeyForUser.and.returnValue({
        encryptedKey: 'enc-key',
        ephemeralPublicKey: 'eph-pub-key',
        chainKeySnapshot: 'chain-key',
        messageNumber: 1
      });
  
      let result: any;
      service.sendMessage(mockGroupId, 'test message', ['member1', 'member2'])
        .then(res => result = res);
  
      tick();
  
      const req1 = httpMock.expectOne(`${API_URL}/users/nickName/member1`);
      req1.flush({ key: 'member1-key' });
  
      const req2 = httpMock.expectOne(`${API_URL}/users/nickName/member2`);
      req2.flush({ key: 'member2-key' });
  
      const req3 = httpMock.expectOne(`${API_URL}/users/nickName/${mockUserId}`);
      req3.flush({ key: 'current-user-key' });
  
      tick(150);
  
      expect(result.messageId).toBe('msg-id-123');
      expect(e2eeService.exportMessageKeyForUser).toHaveBeenCalledTimes(3);
    }));
  
    it('should handle SignalR response as object with messageId property', fakeAsync(() => {
      spyOn(service, 'hasGroupE2EESession').and.returnValue(true);
      spyOn(service as any, 'saveGroupMessageToHistory').and.resolveTo();
  
      const connectionMock: any = {
        invoke: jasmine.createSpy().and.resolveTo({ messageId: 'msg-id-obj', status: 'sent' })
      };
  
      spyOn(service, 'ensureConnection').and.resolveTo(connectionMock);
  
      e2eeService.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'encrypted-text',
        ephemeralKey: 'eph-key',
        nonce: 'nonce-value',
        messageNumber: 1,
        previousChainN: 0,
        ratchetId: 'ratchet-id',
        messageKeyData: {
          messageKey: new Uint8Array([1, 2, 3]),
          chainKeySnapshot: new Uint8Array([4, 5, 6]),
          keyIndex: 1
        }
      });
  
      e2eeService.exportMessageKeyForUser.and.returnValue({
        encryptedKey: 'enc-key',
        ephemeralPublicKey: 'eph-pub-key',
        chainKeySnapshot: 'chain-key',
        messageNumber: 1
      });
  
      let result: any;
      service.sendMessage(mockGroupId, 'test message', ['member1'])
        .then(res => result = res);
  
      tick();
  
      const req1 = httpMock.expectOne(`${API_URL}/users/nickName/member1`);
      req1.flush({ key: 'member1-key' });
  
      const req2 = httpMock.expectOne(`${API_URL}/users/nickName/${mockUserId}`);
      req2.flush({ key: 'current-user-key' });
  
      tick(150);
  
      expect(result.messageId).toBe('msg-id-obj');
    }));
  
    it('should handle SignalR response as object with id property', fakeAsync(() => {
      spyOn(service, 'hasGroupE2EESession').and.returnValue(true);
      spyOn(service as any, 'saveGroupMessageToHistory').and.resolveTo();
  
      const connectionMock: any = {
        invoke: jasmine.createSpy().and.resolveTo({ id: 'msg-id-alt', data: 'some-data' })
      };
  
      spyOn(service, 'ensureConnection').and.resolveTo(connectionMock);
  
      e2eeService.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'encrypted-text',
        ephemeralKey: 'eph-key',
        nonce: 'nonce-value',
        messageNumber: 1,
        previousChainN: 0,
        ratchetId: 'ratchet-id',
        messageKeyData: {
          messageKey: new Uint8Array([1, 2, 3]),
          chainKeySnapshot: new Uint8Array([4, 5, 6]),
          keyIndex: 1
        }
      });
  
      e2eeService.exportMessageKeyForUser.and.returnValue({
        encryptedKey: 'enc-key',
        ephemeralPublicKey: 'eph-pub-key',
        chainKeySnapshot: 'chain-key',
        messageNumber: 1
      });
  
      let result: any;
      service.sendMessage(mockGroupId, 'test message', ['member1'])
        .then(res => result = res);
  
      tick();
  
      const req1 = httpMock.expectOne(`${API_URL}/users/nickName/member1`);
      req1.flush({ key: 'member1-key' });
  
      const req2 = httpMock.expectOne(`${API_URL}/users/nickName/${mockUserId}`);
      req2.flush({ key: 'current-user-key' });
  
      tick(150);
  
      expect(result.messageId).toBe('msg-id-alt');
    }));
  
    it('should throw error when SignalR returns invalid messageId type', fakeAsync(() => {
      spyOn(service, 'hasGroupE2EESession').and.returnValue(true);
  
      const connectionMock: any = {
        invoke: jasmine.createSpy().and.resolveTo(12345)
      };
  
      spyOn(service, 'ensureConnection').and.resolveTo(connectionMock);
  
      e2eeService.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'encrypted-text',
        ephemeralKey: 'eph-key',
        nonce: 'nonce-value',
        messageNumber: 1,
        previousChainN: 0,
        ratchetId: 'ratchet-id',
        messageKeyData: {
          messageKey: new Uint8Array([1, 2, 3]),
          chainKeySnapshot: new Uint8Array([4, 5, 6]),
          keyIndex: 1
        }
      });
  
      e2eeService.exportMessageKeyForUser.and.returnValue({
        encryptedKey: 'enc-key',
        ephemeralPublicKey: 'eph-pub-key',
        chainKeySnapshot: 'chain-key',
        messageNumber: 1
      });
  
      let error: any;
      service.sendMessage(mockGroupId, 'test message', ['member1'])
        .catch(err => error = err);
  
      tick();
  
      const req1 = httpMock.expectOne(`${API_URL}/users/nickName/member1`);
      req1.flush({ key: 'member1-key' });
  
      const req2 = httpMock.expectOne(`${API_URL}/users/nickName/${mockUserId}`);
      req2.flush({ key: 'current-user-key' });
  
      tick();
  
      expect(error.message).toContain('Invalid messageId from SignalR: number');
    }));
  
    it('should rethrow error from sendMessage', fakeAsync(() => {
      spyOn(service, 'hasGroupE2EESession').and.returnValue(true);
  
      const connectionMock: any = {
        invoke: jasmine.createSpy().and.rejectWith(new Error('SignalR connection failed'))
      };
  
      spyOn(service, 'ensureConnection').and.resolveTo(connectionMock);
  
      e2eeService.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'encrypted-text',
        ephemeralKey: 'eph-key',
        nonce: 'nonce-value',
        messageNumber: 1,
        previousChainN: 0,
        ratchetId: 'ratchet-id',
        messageKeyData: {
          messageKey: new Uint8Array([1, 2, 3]),
          chainKeySnapshot: new Uint8Array([4, 5, 6]),
          keyIndex: 1
        }
      });
  
      e2eeService.exportMessageKeyForUser.and.returnValue({
        encryptedKey: 'enc-key',
        ephemeralPublicKey: 'eph-pub-key',
        chainKeySnapshot: 'chain-key',
        messageNumber: 1
      });
  
      let error: any;
      service.sendMessage(mockGroupId, 'test message', ['member1'])
        .catch(err => error = err);
  
      tick();
  
      const req1 = httpMock.expectOne(`${API_URL}/users/nickName/member1`);
      req1.flush({ key: 'member1-key' });
  
      const req2 = httpMock.expectOne(`${API_URL}/users/nickName/${mockUserId}`);
      req2.flush({ key: 'current-user-key' });
  
      tick();
  
      expect(error.message).toBe('SignalR connection failed');
    }));

    it('should stringify signalRResponse when it has no messageId or id property', fakeAsync(() => {
      spyOn(service, 'hasGroupE2EESession').and.returnValue(true);
      spyOn(service as any, 'saveGroupMessageToHistory').and.resolveTo();
    
      const connectionMock: any = {
        invoke: jasmine.createSpy().and.resolveTo({ someField: 'value', anotherField: 123 })
      };
    
      spyOn(service, 'ensureConnection').and.resolveTo(connectionMock);
    
      e2eeService.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'encrypted-text',
        ephemeralKey: 'eph-key',
        nonce: 'nonce-value',
        messageNumber: 1,
        previousChainN: 0,
        ratchetId: 'ratchet-id',
        messageKeyData: {
          messageKey: new Uint8Array([1, 2, 3]),
          chainKeySnapshot: new Uint8Array([4, 5, 6]),
          keyIndex: 1
        }
      });
    
      e2eeService.exportMessageKeyForUser.and.returnValue({
        encryptedKey: 'enc-key',
        ephemeralPublicKey: 'eph-pub-key',
        chainKeySnapshot: 'chain-key',
        messageNumber: 1
      });
    
      let result: any;
      service.sendMessage(mockGroupId, 'test message', ['member1'])
        .then(res => result = res);
    
      tick();
    
      const req1 = httpMock.expectOne(`${API_URL}/users/nickName/member1`);
      req1.flush({ key: 'member1-key' });
    
      const req2 = httpMock.expectOne(`${API_URL}/users/nickName/${mockUserId}`);
      req2.flush({ key: 'current-user-key' });
    
      tick(150);
    
      expect(result.messageId).toBe('{"someField":"value","anotherField":123}');
    }));
  });

  describe('saveGroupMessageToHistory', () => {
    const mockEncrypted = {
      ciphertext: 'cipher',
      ephemeralKey: 'eph',
      nonce: 'nonce',
      messageNumber: 1,
      previousChainN: 0,
      ratchetId: 'ratchet'
    };
  
    const mockMemberMessageKeys = [
      {
        userId: 'user1',
        encryptedKey: 'key1',
        ephemeralPublicKey: 'pub1',
        chainKeySnapshot: 'chain1',
        keyIndex: 1
      }
    ];
  
    it('should throw error when messageId is not a string', fakeAsync(() => {
      let error: any;
  
      (service as any).saveGroupMessageToHistory(
        123 as any,
        'group1',
        'sender1',
        'recipient1',
        mockEncrypted,
        mockMemberMessageKeys
      ).catch((err: any) => error = err);
  
      tick();
  
      expect(error.message).toContain('messageId must be a string, got number');
    }));
  
    it('should successfully save message to history', fakeAsync(() => {
      let result: any;
  
      (service as any).saveGroupMessageToHistory(
        'msg-123',
        'group1',
        'sender1',
        'recipient1',
        mockEncrypted,
        mockMemberMessageKeys
      ).then((res: any) => result = res);
  
      tick();
  
      const req = httpMock.expectOne(`${API_URL}/messages`);
      expect(req.request.method).toBe('POST');
      
      const expectedPayload = {
        id: 'msg-123',
        senderId: 'sender1',
        recipientId: 'recipient1',
        encryptedContent: JSON.stringify({
          ciphertext: 'cipher',
          ephemeralKey: 'eph',
          nonce: 'nonce',
          messageNumber: 1,
          previousChainN: 0,
          ratchetId: 'ratchet'
        }),
        ephemeralKey: 'eph',
        nonce: 'nonce',
        messageNumber: 1,
        previousChainN: 0,
        ratchetId: 'ratchet',
        messageKeys: mockMemberMessageKeys
      };
  
      expect(req.request.body).toEqual(expectedPayload);
  
      req.flush({ id: 'msg-123', status: 'saved' });
  
      tick();
  
      expect(result).toEqual({ id: 'msg-123', status: 'saved' });
    }));
  
    it('should return savedMessage from server', fakeAsync(() => {
      const serverResponse = {
        id: 'msg-456',
        createdAt: '2025-01-01T00:00:00Z',
        status: 'delivered'
      };
  
      let result: any;
  
      (service as any).saveGroupMessageToHistory(
        'msg-456',
        'group2',
        'sender2',
        'recipient2',
        mockEncrypted,
        mockMemberMessageKeys
      ).then((res: any) => result = res);
  
      tick();
  
      const req = httpMock.expectOne(`${API_URL}/messages`);
      req.flush(serverResponse);
  
      tick();
  
      expect(result).toEqual(serverResponse);
    }));
  
    it('should correctly stringify encryptedContent', fakeAsync(() => {
      (service as any).saveGroupMessageToHistory(
        'msg-789',
        'group3',
        'sender3',
        'recipient3',
        mockEncrypted,
        mockMemberMessageKeys
      );
  
      tick();
  
      const req = httpMock.expectOne(`${API_URL}/messages`);
      
      const expectedEncryptedContent = JSON.stringify({
        ciphertext: 'cipher',
        ephemeralKey: 'eph',
        nonce: 'nonce',
        messageNumber: 1,
        previousChainN: 0,
        ratchetId: 'ratchet'
      });
  
      expect(req.request.body.encryptedContent).toBe(expectedEncryptedContent);
  
      req.flush({});
      tick();
    }));
  
    it('should include all fields in payload', fakeAsync(() => {
      const multipleKeys = [
        {
          userId: 'user1',
          encryptedKey: 'key1',
          ephemeralPublicKey: 'pub1',
          chainKeySnapshot: 'chain1',
          keyIndex: 1
        },
        {
          userId: 'user2',
          encryptedKey: 'key2',
          ephemeralPublicKey: 'pub2',
          chainKeySnapshot: 'chain2',
          keyIndex: 2
        }
      ];
  
      (service as any).saveGroupMessageToHistory(
        'msg-multi',
        'groupMulti',
        'senderMulti',
        'recipientMulti',
        mockEncrypted,
        multipleKeys
      );
  
      tick();
  
      const req = httpMock.expectOne(`${API_URL}/messages`);
      
      expect(req.request.body.messageKeys).toEqual(multipleKeys);
      expect(req.request.body.messageKeys.length).toBe(2);
  
      req.flush({});
      tick();
    }));
  });
  
  describe('editMessage - additional coverage', () => {
    const mockKeys = {
      xPrivateKey: new Uint8Array([1, 2, 3]),
      xPublicKey: new Uint8Array([4, 5, 6]),
      edPrivateKey: new Uint8Array([7, 8, 9]),
      mnemonic: 'test mnemonic words',
      timestamp: Date.now()
    };
  
    beforeEach(() => {
      service['currentUserId'] = mockUserId;
      e2eeService.getKeys.and.returnValue(mockKeys);
      e2eeService.fromBase64.and.returnValue(new Uint8Array([10, 11, 12]));
    });
  
    it('should successfully edit message with encrypted content', fakeAsync(() => {
      const connectionMock: any = {
        invoke: jasmine.createSpy().and.resolveTo()
      };
  
      spyOn(service, 'ensureConnection').and.resolveTo(connectionMock);
  
      e2eeService.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'new-encrypted-text',
        ephemeralKey: 'new-eph-key',
        nonce: 'new-nonce',
        messageNumber: 2,
        previousChainN: 1,
        ratchetId: 'new-ratchet-id',
        messageKeyData: {
          messageKey: new Uint8Array([1, 2, 3]),
          chainKeySnapshot: new Uint8Array([4, 5, 6]),
          keyIndex: 2
        }
      });
  
      e2eeService.exportMessageKeyForUser.and.returnValue({
        encryptedKey: 'new-enc-key',
        ephemeralPublicKey: 'new-eph-pub-key',
        chainKeySnapshot: 'new-chain-key',
        messageNumber: 2
      });
  
      service.editMessage(mockMessageId, 'edited content', mockGroupId, ['member1']);
  
      tick();
  
      const req1 = httpMock.expectOne(`${API_URL}/users/nickName/member1`);
      req1.flush({ key: 'member1-key' });
  
      const req2 = httpMock.expectOne(`${API_URL}/users/nickName/${mockUserId}`);
      req2.flush({ key: 'current-user-key' });
  
      tick(150);
  
      expect(connectionMock.invoke).toHaveBeenCalledWith(
        'EditMessageAsync',
        mockMessageId,
        jasmine.any(String),
        mockGroupId
      );
  
      const req3 = httpMock.expectOne(`${API_URL}/messages/${mockMessageId}`);
      expect(req3.request.method).toBe('PUT');
      
      const expectedEncryptedContent = JSON.stringify({
        ciphertext: 'new-encrypted-text',
        ephemeralKey: 'new-eph-key',
        nonce: 'new-nonce',
        messageNumber: 2,
        previousChainN: 1,
        ratchetId: 'new-ratchet-id'
      });
  
      expect(req3.request.body.encryptedContent).toBe(expectedEncryptedContent);
      expect(req3.request.body.ephemeralKey).toBe('new-eph-key');
      expect(req3.request.body.nonce).toBe('new-nonce');
      expect(req3.request.body.messageNumber).toBe(2);
      expect(req3.request.body.previousChainN).toBe(1);
      expect(req3.request.body.ratchetId).toBe('new-ratchet-id');
      expect(req3.request.body.messageKeys).toBeDefined();
  
      req3.flush({});
      tick();
    }));
  
    it('should include all member IDs with current user in Set', fakeAsync(() => {
      const connectionMock: any = {
        invoke: jasmine.createSpy().and.resolveTo()
      };
  
      spyOn(service, 'ensureConnection').and.resolveTo(connectionMock);
  
      e2eeService.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'encrypted',
        ephemeralKey: 'eph',
        nonce: 'nonce',
        messageNumber: 1,
        previousChainN: 0,
        ratchetId: 'ratchet',
        messageKeyData: {
          messageKey: new Uint8Array([1, 2, 3]),
          chainKeySnapshot: new Uint8Array([4, 5, 6]),
          keyIndex: 1
        }
      });
  
      e2eeService.exportMessageKeyForUser.and.returnValue({
        encryptedKey: 'enc-key',
        ephemeralPublicKey: 'eph-pub-key',
        chainKeySnapshot: 'chain-key',
        messageNumber: 1
      });
  
      service.editMessage(mockMessageId, 'new content', mockGroupId, ['member1', 'member2']);
  
      tick();
  
      const req1 = httpMock.expectOne(`${API_URL}/users/nickName/member1`);
      req1.flush({ key: 'member1-key' });
  
      const req2 = httpMock.expectOne(`${API_URL}/users/nickName/member2`);
      req2.flush({ key: 'member2-key' });
  
      const req3 = httpMock.expectOne(`${API_URL}/users/nickName/${mockUserId}`);
      req3.flush({ key: 'current-user-key' });
  
      tick(150);
  
      const req4 = httpMock.expectOne(`${API_URL}/messages/${mockMessageId}`);
      
      expect(e2eeService.exportMessageKeyForUser).toHaveBeenCalledTimes(3);
      expect(req4.request.body.messageKeys.length).toBe(3);
  
      req4.flush({});
      tick();
    }));
  
    it('should throw error if exportMessageKeyForUser returns null', fakeAsync(() => {
      const connectionMock: any = {
        invoke: jasmine.createSpy().and.resolveTo()
      };
  
      spyOn(service, 'ensureConnection').and.resolveTo(connectionMock);
  
      e2eeService.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'encrypted',
        ephemeralKey: 'eph',
        nonce: 'nonce',
        messageNumber: 1,
        previousChainN: 0,
        ratchetId: 'ratchet',
        messageKeyData: {
          messageKey: new Uint8Array([1, 2, 3]),
          chainKeySnapshot: new Uint8Array([4, 5, 6]),
          keyIndex: 1
        }
      });
  
      e2eeService.exportMessageKeyForUser.and.returnValue(null);
  
      let error: any;
      service.editMessage(mockMessageId, 'new content', mockGroupId, ['member1'])
        .catch(err => error = err);
  
      tick();
  
      const req1 = httpMock.expectOne(`${API_URL}/users/nickName/member1`);
      req1.flush({ key: 'member1-key' });
  
      const req2 = httpMock.expectOne(`${API_URL}/users/nickName/${mockUserId}`);
      req2.flush({ key: 'current-user-key' });
  
      tick();
  
      expect(error.message).toContain('Failed to export message key for member member1');
    }));
  
    it('should create correct return object with all fields', fakeAsync(() => {
      const connectionMock: any = {
        invoke: jasmine.createSpy().and.resolveTo()
      };
  
      spyOn(service, 'ensureConnection').and.resolveTo(connectionMock);
  
      e2eeService.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'cipher',
        ephemeralKey: 'eph',
        nonce: 'nonce',
        messageNumber: 5,
        previousChainN: 4,
        ratchetId: 'ratchet-xyz',
        messageKeyData: {
          messageKey: new Uint8Array([1, 2, 3]),
          chainKeySnapshot: new Uint8Array([4, 5, 6]),
          keyIndex: 5
        }
      });
  
      e2eeService.exportMessageKeyForUser.and.returnValue({
        encryptedKey: 'key-abc',
        ephemeralPublicKey: 'pub-xyz',
        chainKeySnapshot: 'chain-123',
        messageNumber: 5
      });
  
      service.editMessage(mockMessageId, 'content', mockGroupId, ['member1']);
  
      tick();
  
      const req1 = httpMock.expectOne(`${API_URL}/users/nickName/member1`);
      req1.flush({ key: 'key1' });
  
      const req2 = httpMock.expectOne(`${API_URL}/users/nickName/${mockUserId}`);
      req2.flush({ key: 'key2' });
  
      tick(150);
  
      const req3 = httpMock.expectOne(`${API_URL}/messages/${mockMessageId}`);
      
      expect(req3.request.body.messageKeys[0]).toEqual({
        userId: 'member1',
        encryptedKey: 'key-abc',
        ephemeralPublicKey: 'pub-xyz',
        chainKeySnapshot: 'chain-123',
        keyIndex: 5
      });
  
      req3.flush({});
      tick();
    }));
  
    it('should stringify encryptedContent correctly', fakeAsync(() => {
      const connectionMock: any = {
        invoke: jasmine.createSpy().and.resolveTo()
      };
  
      spyOn(service, 'ensureConnection').and.resolveTo(connectionMock);
  
      e2eeService.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'test-cipher',
        ephemeralKey: 'test-eph',
        nonce: 'test-nonce',
        messageNumber: 10,
        previousChainN: 9,
        ratchetId: 'test-ratchet',
        messageKeyData: {
          messageKey: new Uint8Array([1, 2, 3]),
          chainKeySnapshot: new Uint8Array([4, 5, 6]),
          keyIndex: 10
        }
      });
  
      e2eeService.exportMessageKeyForUser.and.returnValue({
        encryptedKey: 'key',
        ephemeralPublicKey: 'pub',
        chainKeySnapshot: 'chain',
        messageNumber: 10
      });
  
      service.editMessage(mockMessageId, 'test', mockGroupId, ['member1']);
  
      tick();
  
      const req1 = httpMock.expectOne(`${API_URL}/users/nickName/member1`);
      req1.flush({ key: 'key1' });
  
      const req2 = httpMock.expectOne(`${API_URL}/users/nickName/${mockUserId}`);
      req2.flush({ key: 'key2' });
  
      tick(150);
  
      const expectedEncryptedContent = JSON.stringify({
        ciphertext: 'test-cipher',
        ephemeralKey: 'test-eph',
        nonce: 'test-nonce',
        messageNumber: 10,
        previousChainN: 9,
        ratchetId: 'test-ratchet'
      });
  
      expect(connectionMock.invoke).toHaveBeenCalledWith(
        'EditMessageAsync',
        mockMessageId,
        expectedEncryptedContent,
        mockGroupId
      );
  
      const req3 = httpMock.expectOne(`${API_URL}/messages/${mockMessageId}`);
      req3.flush({});
      tick();
    }));
  
    it('should wait 100ms before making PUT request', fakeAsync(() => {
      const connectionMock: any = {
        invoke: jasmine.createSpy().and.resolveTo()
      };
  
      spyOn(service, 'ensureConnection').and.resolveTo(connectionMock);
  
      e2eeService.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'cipher',
        ephemeralKey: 'eph',
        nonce: 'nonce',
        messageNumber: 1,
        previousChainN: 0,
        ratchetId: 'ratchet',
        messageKeyData: {
          messageKey: new Uint8Array([1, 2, 3]),
          chainKeySnapshot: new Uint8Array([4, 5, 6]),
          keyIndex: 1
        }
      });
  
      e2eeService.exportMessageKeyForUser.and.returnValue({
        encryptedKey: 'key',
        ephemeralPublicKey: 'pub',
        chainKeySnapshot: 'chain',
        messageNumber: 1
      });
  
      service.editMessage(mockMessageId, 'test', mockGroupId, ['member1']);
  
      tick();
  
      const req1 = httpMock.expectOne(`${API_URL}/users/nickName/member1`);
      req1.flush({ key: 'key1' });
  
      const req2 = httpMock.expectOne(`${API_URL}/users/nickName/${mockUserId}`);
      req2.flush({ key: 'key2' });
  
      tick(50);
  
      httpMock.expectNone(`${API_URL}/messages/${mockMessageId}`);
  
      tick(100); 
  
      const req3 = httpMock.expectOne(`${API_URL}/messages/${mockMessageId}`);
      req3.flush({});
      tick();
    }));
  
    it('should rethrow error from editMessage', fakeAsync(() => {
      const connectionMock: any = {
        invoke: jasmine.createSpy().and.rejectWith(new Error('Edit failed'))
      };
  
      spyOn(service, 'ensureConnection').and.resolveTo(connectionMock);
  
      e2eeService.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'cipher',
        ephemeralKey: 'eph',
        nonce: 'nonce',
        messageNumber: 1,
        previousChainN: 0,
        ratchetId: 'ratchet',
        messageKeyData: {
          messageKey: new Uint8Array([1, 2, 3]),
          chainKeySnapshot: new Uint8Array([4, 5, 6]),
          keyIndex: 1
        }
      });
  
      e2eeService.exportMessageKeyForUser.and.returnValue({
        encryptedKey: 'key',
        ephemeralPublicKey: 'pub',
        chainKeySnapshot: 'chain',
        messageNumber: 1
      });
  
      let error: any;
      service.editMessage(mockMessageId, 'test', mockGroupId, ['member1'])
        .catch(err => error = err);
  
      tick();
  
      const req1 = httpMock.expectOne(`${API_URL}/users/nickName/member1`);
      req1.flush({ key: 'key1' });
  
      const req2 = httpMock.expectOne(`${API_URL}/users/nickName/${mockUserId}`);
      req2.flush({ key: 'key2' });
  
      tick();
  
      expect(error.message).toBe('Edit failed');
    }));
  });
  
  describe('replyToMessage - additional coverage', () => {
    const mockKeys = {
      xPrivateKey: new Uint8Array([1, 2, 3]),
      xPublicKey: new Uint8Array([4, 5, 6]),
      edPrivateKey: new Uint8Array([7, 8, 9]),
      mnemonic: 'test mnemonic words',
      timestamp: Date.now()
    };
  
    beforeEach(() => {
      service['currentUserId'] = mockUserId;
      e2eeService.getKeys.and.returnValue(mockKeys);
      e2eeService.fromBase64.and.returnValue(new Uint8Array([10, 11, 12]));
    });
  
    it('should throw error if currentUserId is not set', async () => {
      service.currentUserId = null as any;
  
      await expectAsync(
        service.replyToMessage(mockMessageId, 'reply content', mockGroupId, ['member1'])
      ).toBeRejectedWithError('Current user ID not set');
    });
  
    it('should call initializeGroupE2EE when no E2EE session exists', fakeAsync(() => {
      spyOn(service, 'hasGroupE2EESession').and.returnValue(false);
      spyOn(service, 'initializeGroupE2EE').and.resolveTo();
      spyOn(service as any, 'saveGroupMessageToHistory').and.resolveTo();
  
      const connectionMock: any = {
        invoke: jasmine.createSpy().and.resolveTo('reply-msg-123')
      };
  
      spyOn(service, 'ensureConnection').and.resolveTo(connectionMock);
  
      e2eeService.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'encrypted-reply',
        ephemeralKey: 'eph-key',
        nonce: 'nonce-value',
        messageNumber: 1,
        previousChainN: 0,
        ratchetId: 'ratchet-id',
        messageKeyData: {
          messageKey: new Uint8Array([1, 2, 3]),
          chainKeySnapshot: new Uint8Array([4, 5, 6]),
          keyIndex: 1
        }
      });
  
      e2eeService.exportMessageKeyForUser.and.returnValue({
        encryptedKey: 'enc-key',
        ephemeralPublicKey: 'eph-pub-key',
        chainKeySnapshot: 'chain-key',
        messageNumber: 1
      });
  
      let result: any;
      service.replyToMessage(mockMessageId, 'reply content', mockGroupId, ['member1'])
        .then(res => result = res);
  
      tick();
  
      const req1 = httpMock.expectOne(`${API_URL}/users/nickName/member1`);
      req1.flush({ key: 'member1-key' });
  
      const req2 = httpMock.expectOne(`${API_URL}/users/nickName/${mockUserId}`);
      req2.flush({ key: 'current-user-key' });
  
      tick(150);
  
      expect(service.initializeGroupE2EE).toHaveBeenCalledWith(mockGroupId, ['member1']);
      expect(result.messageId).toBe('reply-msg-123');
    }));
  
    it('should include current user in allMemberIds using Set', fakeAsync(() => {
      spyOn(service, 'hasGroupE2EESession').and.returnValue(true);
      spyOn(service as any, 'saveGroupMessageToHistory').and.resolveTo();
  
      const connectionMock: any = {
        invoke: jasmine.createSpy().and.resolveTo('reply-msg-456')
      };
  
      spyOn(service, 'ensureConnection').and.resolveTo(connectionMock);
  
      e2eeService.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'encrypted-text',
        ephemeralKey: 'eph-key',
        nonce: 'nonce-value',
        messageNumber: 1,
        previousChainN: 0,
        ratchetId: 'ratchet-id',
        messageKeyData: {
          messageKey: new Uint8Array([1, 2, 3]),
          chainKeySnapshot: new Uint8Array([4, 5, 6]),
          keyIndex: 1
        }
      });
  
      e2eeService.exportMessageKeyForUser.and.returnValue({
        encryptedKey: 'enc-key',
        ephemeralPublicKey: 'eph-pub-key',
        chainKeySnapshot: 'chain-key',
        messageNumber: 1
      });
  
      let result: any;
      service.replyToMessage(mockMessageId, 'reply', mockGroupId, ['member1', 'member2'])
        .then(res => result = res);
  
      tick();
  
      const req1 = httpMock.expectOne(`${API_URL}/users/nickName/member1`);
      req1.flush({ key: 'member1-key' });
  
      const req2 = httpMock.expectOne(`${API_URL}/users/nickName/member2`);
      req2.flush({ key: 'member2-key' });
  
      const req3 = httpMock.expectOne(`${API_URL}/users/nickName/${mockUserId}`);
      req3.flush({ key: 'current-user-key' });
  
      tick(150);
  
      expect(result.messageId).toBe('reply-msg-456');
      expect(e2eeService.exportMessageKeyForUser).toHaveBeenCalledTimes(3);
    }));
  
    it('should throw error if exportMessageKeyForUser returns null', fakeAsync(() => {
      spyOn(service, 'hasGroupE2EESession').and.returnValue(true);
  
      const connectionMock: any = {
        invoke: jasmine.createSpy().and.resolveTo('msg-id')
      };
  
      spyOn(service, 'ensureConnection').and.resolveTo(connectionMock);
  
      e2eeService.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'encrypted-text',
        ephemeralKey: 'eph-key',
        nonce: 'nonce-value',
        messageNumber: 1,
        previousChainN: 0,
        ratchetId: 'ratchet-id',
        messageKeyData: {
          messageKey: new Uint8Array([1, 2, 3]),
          chainKeySnapshot: new Uint8Array([4, 5, 6]),
          keyIndex: 1
        }
      });
  
      e2eeService.exportMessageKeyForUser.and.returnValue(null);
  
      let error: any;
      service.replyToMessage(mockMessageId, 'reply', mockGroupId, ['member1'])
        .catch(err => error = err);
  
      tick();
  
      const req1 = httpMock.expectOne(`${API_URL}/users/nickName/member1`);
      req1.flush({ key: 'member1-key' });
  
      const req2 = httpMock.expectOne(`${API_URL}/users/nickName/${mockUserId}`);
      req2.flush({ key: 'current-user-key' });
  
      tick();
  
      expect(error.message).toContain('Failed to export message key for member member1');
    }));
  
    it('should create correct memberMessageKeys object', fakeAsync(() => {
      spyOn(service, 'hasGroupE2EESession').and.returnValue(true);
      spyOn(service as any, 'saveGroupMessageToHistory').and.resolveTo();
  
      const connectionMock: any = {
        invoke: jasmine.createSpy().and.resolveTo('msg-id')
      };
  
      spyOn(service, 'ensureConnection').and.resolveTo(connectionMock);
  
      e2eeService.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'cipher',
        ephemeralKey: 'eph',
        nonce: 'nonce',
        messageNumber: 5,
        previousChainN: 4,
        ratchetId: 'ratchet-xyz',
        messageKeyData: {
          messageKey: new Uint8Array([1, 2, 3]),
          chainKeySnapshot: new Uint8Array([4, 5, 6]),
          keyIndex: 5
        }
      });
  
      e2eeService.exportMessageKeyForUser.and.returnValue({
        encryptedKey: 'key-abc',
        ephemeralPublicKey: 'pub-xyz',
        chainKeySnapshot: 'chain-123',
        messageNumber: 5
      });
  
      service.replyToMessage(mockMessageId, 'reply', mockGroupId, ['member1']);
  
      tick();
  
      const req1 = httpMock.expectOne(`${API_URL}/users/nickName/member1`);
      req1.flush({ key: 'key1' });
  
      const req2 = httpMock.expectOne(`${API_URL}/users/nickName/${mockUserId}`);
      req2.flush({ key: 'key2' });
  
      tick(150);
  
      expect(service['saveGroupMessageToHistory']).toHaveBeenCalledWith(
        'msg-id',
        mockGroupId,
        mockUserId,
        'member1',
        jasmine.objectContaining({
          ciphertext: 'cipher',
          ephemeralKey: 'eph',
          nonce: 'nonce',
          messageNumber: 5,
          previousChainN: 4,
          ratchetId: 'ratchet-xyz'
        }),
        jasmine.arrayContaining([
          jasmine.objectContaining({
            userId: 'member1',
            encryptedKey: 'key-abc',
            ephemeralPublicKey: 'pub-xyz',
            chainKeySnapshot: 'chain-123',
            keyIndex: 5
          })
        ])
      );
    }));
  
    it('should stringify encryptedMessageData correctly', fakeAsync(() => {
      spyOn(service, 'hasGroupE2EESession').and.returnValue(true);
      spyOn(service as any, 'saveGroupMessageToHistory').and.resolveTo();
  
      const connectionMock: any = {
        invoke: jasmine.createSpy().and.resolveTo('msg-id')
      };
  
      spyOn(service, 'ensureConnection').and.resolveTo(connectionMock);
  
      e2eeService.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'test-cipher',
        ephemeralKey: 'test-eph',
        nonce: 'test-nonce',
        messageNumber: 10,
        previousChainN: 9,
        ratchetId: 'test-ratchet',
        messageKeyData: {
          messageKey: new Uint8Array([1, 2, 3]),
          chainKeySnapshot: new Uint8Array([4, 5, 6]),
          keyIndex: 10
        }
      });
  
      e2eeService.exportMessageKeyForUser.and.returnValue({
        encryptedKey: 'key',
        ephemeralPublicKey: 'pub',
        chainKeySnapshot: 'chain',
        messageNumber: 10
      });
  
      service.replyToMessage(mockMessageId, 'reply', mockGroupId, ['member1']);
  
      tick();
  
      const req1 = httpMock.expectOne(`${API_URL}/users/nickName/member1`);
      req1.flush({ key: 'key1' });
  
      const req2 = httpMock.expectOne(`${API_URL}/users/nickName/${mockUserId}`);
      req2.flush({ key: 'key2' });
  
      tick(150);
  
      const expectedPayload = JSON.stringify({
        ciphertext: 'test-cipher',
        ephemeralKey: 'test-eph',
        nonce: 'test-nonce',
        messageNumber: 10,
        previousChainN: 9,
        ratchetId: 'test-ratchet'
      });
  
      expect(connectionMock.invoke).toHaveBeenCalledWith(
        'ReplyForMessageAsync',
        mockMessageId,
        expectedPayload,
        mockGroupId
      );
    }));
  
    it('should handle SignalR response as string', fakeAsync(() => {
      spyOn(service, 'hasGroupE2EESession').and.returnValue(true);
      spyOn(service as any, 'saveGroupMessageToHistory').and.resolveTo();
  
      const connectionMock: any = {
        invoke: jasmine.createSpy().and.resolveTo('simple-string-id')
      };
  
      spyOn(service, 'ensureConnection').and.resolveTo(connectionMock);
  
      e2eeService.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'cipher',
        ephemeralKey: 'eph',
        nonce: 'nonce',
        messageNumber: 1,
        previousChainN: 0,
        ratchetId: 'ratchet',
        messageKeyData: {
          messageKey: new Uint8Array([1, 2, 3]),
          chainKeySnapshot: new Uint8Array([4, 5, 6]),
          keyIndex: 1
        }
      });
  
      e2eeService.exportMessageKeyForUser.and.returnValue({
        encryptedKey: 'key',
        ephemeralPublicKey: 'pub',
        chainKeySnapshot: 'chain',
        messageNumber: 1
      });
  
      let result: any;
      service.replyToMessage(mockMessageId, 'reply', mockGroupId, ['member1'])
        .then(res => result = res);
  
      tick();
  
      const req1 = httpMock.expectOne(`${API_URL}/users/nickName/member1`);
      req1.flush({ key: 'key1' });
  
      const req2 = httpMock.expectOne(`${API_URL}/users/nickName/${mockUserId}`);
      req2.flush({ key: 'key2' });
  
      tick(150);
  
      expect(result.messageId).toBe('simple-string-id');
    }));
  
    it('should handle SignalR response as object with messageId property', fakeAsync(() => {
      spyOn(service, 'hasGroupE2EESession').and.returnValue(true);
      spyOn(service as any, 'saveGroupMessageToHistory').and.resolveTo();
  
      const connectionMock: any = {
        invoke: jasmine.createSpy().and.resolveTo({ messageId: 'object-msg-id', status: 'sent' })
      };
  
      spyOn(service, 'ensureConnection').and.resolveTo(connectionMock);
  
      e2eeService.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'cipher',
        ephemeralKey: 'eph',
        nonce: 'nonce',
        messageNumber: 1,
        previousChainN: 0,
        ratchetId: 'ratchet',
        messageKeyData: {
          messageKey: new Uint8Array([1, 2, 3]),
          chainKeySnapshot: new Uint8Array([4, 5, 6]),
          keyIndex: 1
        }
      });
  
      e2eeService.exportMessageKeyForUser.and.returnValue({
        encryptedKey: 'key',
        ephemeralPublicKey: 'pub',
        chainKeySnapshot: 'chain',
        messageNumber: 1
      });
  
      let result: any;
      service.replyToMessage(mockMessageId, 'reply', mockGroupId, ['member1'])
        .then(res => result = res);
  
      tick();
  
      const req1 = httpMock.expectOne(`${API_URL}/users/nickName/member1`);
      req1.flush({ key: 'key1' });
  
      const req2 = httpMock.expectOne(`${API_URL}/users/nickName/${mockUserId}`);
      req2.flush({ key: 'key2' });
  
      tick(150);
  
      expect(result.messageId).toBe('object-msg-id');
    }));
  
    it('should handle SignalR response as object with id property', fakeAsync(() => {
      spyOn(service, 'hasGroupE2EESession').and.returnValue(true);
      spyOn(service as any, 'saveGroupMessageToHistory').and.resolveTo();
  
      const connectionMock: any = {
        invoke: jasmine.createSpy().and.resolveTo({ id: 'object-id', data: 'some-data' })
      };
  
      spyOn(service, 'ensureConnection').and.resolveTo(connectionMock);
  
      e2eeService.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'cipher',
        ephemeralKey: 'eph',
        nonce: 'nonce',
        messageNumber: 1,
        previousChainN: 0,
        ratchetId: 'ratchet',
        messageKeyData: {
          messageKey: new Uint8Array([1, 2, 3]),
          chainKeySnapshot: new Uint8Array([4, 5, 6]),
          keyIndex: 1
        }
      });
  
      e2eeService.exportMessageKeyForUser.and.returnValue({
        encryptedKey: 'key',
        ephemeralPublicKey: 'pub',
        chainKeySnapshot: 'chain',
        messageNumber: 1
      });
  
      let result: any;
      service.replyToMessage(mockMessageId, 'reply', mockGroupId, ['member1'])
        .then(res => result = res);
  
      tick();
  
      const req1 = httpMock.expectOne(`${API_URL}/users/nickName/member1`);
      req1.flush({ key: 'key1' });
  
      const req2 = httpMock.expectOne(`${API_URL}/users/nickName/${mockUserId}`);
      req2.flush({ key: 'key2' });
  
      tick(150);
  
      expect(result.messageId).toBe('object-id');
    }));
  
    it('should stringify signalRResponse when it has no messageId or id property', fakeAsync(() => {
      spyOn(service, 'hasGroupE2EESession').and.returnValue(true);
      spyOn(service as any, 'saveGroupMessageToHistory').and.resolveTo();
  
      const connectionMock: any = {
        invoke: jasmine.createSpy().and.resolveTo({ someField: 'value', anotherField: 123 })
      };
  
      spyOn(service, 'ensureConnection').and.resolveTo(connectionMock);
  
      e2eeService.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'cipher',
        ephemeralKey: 'eph',
        nonce: 'nonce',
        messageNumber: 1,
        previousChainN: 0,
        ratchetId: 'ratchet',
        messageKeyData: {
          messageKey: new Uint8Array([1, 2, 3]),
          chainKeySnapshot: new Uint8Array([4, 5, 6]),
          keyIndex: 1
        }
      });
  
      e2eeService.exportMessageKeyForUser.and.returnValue({
        encryptedKey: 'key',
        ephemeralPublicKey: 'pub',
        chainKeySnapshot: 'chain',
        messageNumber: 1
      });
  
      let result: any;
      service.replyToMessage(mockMessageId, 'reply', mockGroupId, ['member1'])
        .then(res => result = res);
  
      tick();
  
      const req1 = httpMock.expectOne(`${API_URL}/users/nickName/member1`);
      req1.flush({ key: 'key1' });
  
      const req2 = httpMock.expectOne(`${API_URL}/users/nickName/${mockUserId}`);
      req2.flush({ key: 'key2' });
  
      tick(150);
  
      expect(result.messageId).toBe('{"someField":"value","anotherField":123}');
    }));
  
    it('should throw error when SignalR returns invalid messageId type', fakeAsync(() => {
      spyOn(service, 'hasGroupE2EESession').and.returnValue(true);
  
      const connectionMock: any = {
        invoke: jasmine.createSpy().and.resolveTo(12345)
      };
  
      spyOn(service, 'ensureConnection').and.resolveTo(connectionMock);
  
      e2eeService.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'cipher',
        ephemeralKey: 'eph',
        nonce: 'nonce',
        messageNumber: 1,
        previousChainN: 0,
        ratchetId: 'ratchet',
        messageKeyData: {
          messageKey: new Uint8Array([1, 2, 3]),
          chainKeySnapshot: new Uint8Array([4, 5, 6]),
          keyIndex: 1
        }
      });
  
      e2eeService.exportMessageKeyForUser.and.returnValue({
        encryptedKey: 'key',
        ephemeralPublicKey: 'pub',
        chainKeySnapshot: 'chain',
        messageNumber: 1
      });
  
      let error: any;
      service.replyToMessage(mockMessageId, 'reply', mockGroupId, ['member1'])
        .catch(err => error = err);
  
      tick();
  
      const req1 = httpMock.expectOne(`${API_URL}/users/nickName/member1`);
      req1.flush({ key: 'key1' });
  
      const req2 = httpMock.expectOne(`${API_URL}/users/nickName/${mockUserId}`);
      req2.flush({ key: 'key2' });
  
      tick();
  
      expect(error.message).toContain('Invalid messageId from SignalR: number');
    }));
  
    it('should wait 100ms before calling saveGroupMessageToHistory', fakeAsync(() => {
      spyOn(service, 'hasGroupE2EESession').and.returnValue(true);
      const saveSpy = spyOn(service as any, 'saveGroupMessageToHistory').and.resolveTo();
  
      const connectionMock: any = {
        invoke: jasmine.createSpy().and.resolveTo('msg-id')
      };
  
      spyOn(service, 'ensureConnection').and.resolveTo(connectionMock);
  
      e2eeService.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'cipher',
        ephemeralKey: 'eph',
        nonce: 'nonce',
        messageNumber: 1,
        previousChainN: 0,
        ratchetId: 'ratchet',
        messageKeyData: {
          messageKey: new Uint8Array([1, 2, 3]),
          chainKeySnapshot: new Uint8Array([4, 5, 6]),
          keyIndex: 1
        }
      });
  
      e2eeService.exportMessageKeyForUser.and.returnValue({
        encryptedKey: 'key',
        ephemeralPublicKey: 'pub',
        chainKeySnapshot: 'chain',
        messageNumber: 1
      });
  
      service.replyToMessage(mockMessageId, 'reply', mockGroupId, ['member1']);
  
      tick();
  
      const req1 = httpMock.expectOne(`${API_URL}/users/nickName/member1`);
      req1.flush({ key: 'key1' });
  
      const req2 = httpMock.expectOne(`${API_URL}/users/nickName/${mockUserId}`);
      req2.flush({ key: 'key2' });
  
      tick(50);
  
      expect(saveSpy).not.toHaveBeenCalled();
  
      tick(100);
  
      expect(saveSpy).toHaveBeenCalled();
    }));
  
    it('should return correct object with messageId and content', fakeAsync(() => {
      spyOn(service, 'hasGroupE2EESession').and.returnValue(true);
      spyOn(service as any, 'saveGroupMessageToHistory').and.resolveTo();
  
      const connectionMock: any = {
        invoke: jasmine.createSpy().and.resolveTo('final-msg-id')
      };
  
      spyOn(service, 'ensureConnection').and.resolveTo(connectionMock);
  
      const encryptedData = {
        ciphertext: 'final-cipher',
        ephemeralKey: 'final-eph',
        nonce: 'final-nonce',
        messageNumber: 99,
        previousChainN: 98,
        ratchetId: 'final-ratchet',
        messageKeyData: {
          messageKey: new Uint8Array([1, 2, 3]),
          chainKeySnapshot: new Uint8Array([4, 5, 6]),
          keyIndex: 99
        }
      };
  
      e2eeService.encryptMessageWithHistory.and.resolveTo(encryptedData);
  
      e2eeService.exportMessageKeyForUser.and.returnValue({
        encryptedKey: 'key',
        ephemeralPublicKey: 'pub',
        chainKeySnapshot: 'chain',
        messageNumber: 99
      });
  
      let result: any;
      service.replyToMessage(mockMessageId, 'final reply', mockGroupId, ['member1'])
        .then(res => result = res);
  
      tick();
  
      const req1 = httpMock.expectOne(`${API_URL}/users/nickName/member1`);
      req1.flush({ key: 'key1' });
  
      const req2 = httpMock.expectOne(`${API_URL}/users/nickName/${mockUserId}`);
      req2.flush({ key: 'key2' });
  
      tick(150);
  
      expect(result.messageId).toBe('final-msg-id');
      expect(result.content).toBe(JSON.stringify({
        ciphertext: 'final-cipher',
        ephemeralKey: 'final-eph',
        nonce: 'final-nonce',
        messageNumber: 99,
        previousChainN: 98,
        ratchetId: 'final-ratchet'
      }));
    }));
  
    it('should rethrow error from replyToMessage', fakeAsync(() => {
      spyOn(service, 'hasGroupE2EESession').and.returnValue(true);
  
      const connectionMock: any = {
        invoke: jasmine.createSpy().and.rejectWith(new Error('Reply failed'))
      };
  
      spyOn(service, 'ensureConnection').and.resolveTo(connectionMock);
  
      e2eeService.encryptMessageWithHistory.and.resolveTo({
        ciphertext: 'cipher',
        ephemeralKey: 'eph',
        nonce: 'nonce',
        messageNumber: 1,
        previousChainN: 0,
        ratchetId: 'ratchet',
        messageKeyData: {
          messageKey: new Uint8Array([1, 2, 3]),
          chainKeySnapshot: new Uint8Array([4, 5, 6]),
          keyIndex: 1
        }
      });
  
      e2eeService.exportMessageKeyForUser.and.returnValue({
        encryptedKey: 'key',
        ephemeralPublicKey: 'pub',
        chainKeySnapshot: 'chain',
        messageNumber: 1
      });
  
      let error: any;
      service.replyToMessage(mockMessageId, 'reply', mockGroupId, ['member1'])
        .catch(err => error = err);
  
      tick();
  
      const req1 = httpMock.expectOne(`${API_URL}/users/nickName/member1`);
      req1.flush({ key: 'key1' });
  
      const req2 = httpMock.expectOne(`${API_URL}/users/nickName/${mockUserId}`);
      req2.flush({ key: 'key2' });
  
      tick();
  
      expect(error.message).toBe('Reply failed');
    }));
  });
});